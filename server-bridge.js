/**
 * DDB Gamelog Standalone Server Bridge
 * 
 * Runs on the host machine. Connects to D&D Beyond and relays events to
 * the Foundry VTT client. Bypasses CORS and Origin header checks.
 */

const http = require("http");
const https = require("https");
const { execSync } = require("child_process");

// 1. Auto-install 'ws' dependency if missing
let WebSocket;
try {
  WebSocket = require("ws");
} catch (e) {
  console.log(">> Installing required dependency 'ws'...");
  try {
    execSync("npm install ws", { stdio: "inherit" });
    WebSocket = require("ws");
    console.log(">> Dependency 'ws' successfully installed!");
  } catch (err) {
    console.error("CRITICAL ERROR: Failed to install 'ws' library. Please run 'npm install ws' manually.", err);
    process.exit(1);
  }
}

const PORT = 8765;

// Helper to make HTTPS requests easily
function httpsRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ body, statusCode: res.statusCode, headers: res.headers });
        } else {
          reject(new Error(`Request failed with status ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on("error", (err) => reject(err));

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// 2. Fetch Cobalt Token for D&D Beyond WebSocket authentication
async function getCobaltToken(cobaltSession, userId) {
  const options = {
    hostname: "auth-service.dndbeyond.com",
    path: "/v1/cobalt-token",
    method: "POST",
    headers: {
      "Cookie": `CobaltSession=${cobaltSession}; User.ID=${userId};`,
      "Content-Length": 0
    }
  };

  try {
    const res = await httpsRequest(options);
    const data = JSON.parse(res.body);
    if (!data.token) {
      throw new Error("No token returned in response");
    }
    return data.token;
  } catch (err) {
    console.error(">> Failed to fetch Cobalt Token:", err.message);
    throw err;
  }
}

// 3. Setup HTTP Server to handle API requests (e.g. Character Sheet data)
const server = http.createServer(async (req, res) => {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // Route: /api/character/:id
  const match = req.url.match(/^\/api\/character\/(\d+)$/);
  if (match && req.method === "GET") {
    const characterId = match[1];
    
    // Extract Cobalt cookie from headers or use default
    let cobaltSession = "";
    const authHeader = req.headers["authorization"];
    if (authHeader && authHeader.startsWith("Bearer ")) {
      cobaltSession = authHeader.substring(7);
    }

    if (!cobaltSession) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Missing Cobalt cookie in Authorization header" }));
      return;
    }

    try {
      const options = {
        hostname: "character-service.dndbeyond.com",
        path: `/character/v5/character/${characterId}`,
        method: "GET",
        headers: {
          "Cookie": `CobaltSession=${cobaltSession};`
        }
      };

      const ddbRes = await httpsRequest(options);
      const payload = JSON.parse(ddbRes.body);
      const data = payload.data || {};

      // Parse HP stats
      const stats = {};
      const bonusStats = {};
      const overrideStats = {};
      (data.stats || []).forEach(s => stats[s.id] = s.value || 0);
      (data.bonusStats || []).forEach(s => bonusStats[s.id] = s.value || 0);
      (data.overrideStats || []).forEach(s => {
        if (s.value !== null && s.value !== undefined) overrideStats[s.id] = s.value;
      });

      // Constitution is stat ID 3
      const con = overrideStats[3] !== undefined ? overrideStats[3] : (stats[3] + bonusStats[3]);
      const conMod = Math.floor((con - 10) / 2);

      const hpPerLevel = data.baseHitPoints || 0;
      const bonusHp = data.bonusHitPoints || 0;
      const overrideHp = data.overrideHitPoints;
      const level = (data.classes || []).reduce((sum, c) => sum + (c.level || 0), 0);

      // Parse HP modifiers (Tough feat, etc.)
      let modifierHp = 0;
      const modifiers = data.modifiers || {};
      Object.values(modifiers).forEach(sourceMods => {
        sourceMods.forEach(mod => {
          const sub = mod.subType || "";
          const val = (mod.dice && mod.dice.fixedValue) || mod.value || 0;
          if (sub === "hit-points-per-level") {
            modifierHp += val * level;
          } else if (sub === "hit-points") {
            modifierHp += val;
          }
        });
      });

      const maxHp = overrideHp || (hpPerLevel + (conMod * level) + bonusHp + modifierHp);
      const currentHp = (data.removedHitPoints !== undefined) ? (maxHp - data.removedHitPoints) : maxHp;

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        name: data.name,
        level: level,
        maxHp: maxHp,
        currentHp: currentHp,
        tempHp: data.temporaryHitPoints || 0,
        ac: data.overrideArmorClass || null,
        inspiration: data.inspiration || false,
        exhaustion: (data.conditions || []).filter(c => c.id === 4).length, // Exhaustion condition ID
        xp: data.currentXp || 0,
        deathSaves: {
          successes: data.deathSaves?.successes || 0,
          failures: data.deathSaves?.failures || 0
        }
      }));
    } catch (err) {
      console.error(`>> Error fetching character sheet ${characterId}:`, err.message);
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: `DDB Character sheet fetch failed: ${err.message}` }));
    }
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  }
});

// 4. Setup WebSocket Server to bridge Foundry clients
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  console.log(">> Foundry client connected to local bridge.");
  
  let ddbSocket = null;
  let ddbReconnectTimer = null;
  let currentConfig = null;

  // Cleanup helper
  function closeDdbConnection() {
    if (ddbReconnectTimer) {
      clearTimeout(ddbReconnectTimer);
      ddbReconnectTimer = null;
    }
    if (ddbSocket) {
      ddbSocket.terminate();
      ddbSocket = null;
    }
  }

  // Connects to D&D Beyond Game Log WebSocket
  async function connectDDB(config) {
    closeDdbConnection();
    currentConfig = config;

    console.log(`>> Connecting to D&D Beyond Game Log for Game ID: ${config.gameId}...`);
    
    let token;
    try {
      token = await getCobaltToken(config.cobalt, config.userId);
    } catch (err) {
      console.error(">> DDB Authentication failed, retrying in 10s...", err.message);
      ws.send(JSON.stringify({ type: "bridge-status", status: "error", message: `Auth failed: ${err.message}` }));
      ddbReconnectTimer = setTimeout(() => connectDDB(config), 10000);
      return;
    }

    const ddbUrl = `wss://game-log-api-live.dndbeyond.com/v1?gameId=${config.gameId}&userId=${config.userId}&stt=${token}`;
    
    // Setting Origin to dndbeyond.com is required by Wizards of the Coast backend
    ddbSocket = new WebSocket(ddbUrl, {
      headers: {
        Origin: "https://www.dndbeyond.com"
      }
    });

    ddbSocket.on("open", () => {
      console.log(`>> Successfully connected to D&D Beyond Game Log!`);
      ws.send(JSON.stringify({ type: "bridge-status", status: "connected", message: "Connected to D&D Beyond" }));
    });

    ddbSocket.on("message", (rawMessage) => {
      try {
        const payload = JSON.parse(rawMessage.toString());
        if (payload.eventType === "dice/roll/fulfilled") {
          console.log(`>> Roll event received from DDB for character: ${payload.data?.context?.name || "Unknown"}`);
          
          // Re-map and parse rolls for Foundry client consumption
          const rollData = payload.data.rolls[0];
          const context = payload.data.context;
          const notation = rollData.diceNotation || {};
          
          const parsedDice = [];
          (notation.set || []).forEach(dieSet => {
            (dieSet.dice || []).forEach(die => {
              const dieType = die.dieType || "d20";
              const faces = parseInt(dieType.replace("d", "")) || 20;
              parsedDice.push({
                faces: faces,
                result: die.dieValue || 0
              });
            });
          });

          const rollMsg = {
            type: "ddb-roll",
            character: context.name || "Unknown",
            entity_id: context.entityId || null,
            entity_type: context.entityType || "",
            action: payload.data.action || "",
            rollType: rollData.rollType || "check",
            total: rollData.result.total || 0,
            text: rollData.result.text || "",
            constant: notation.constant || 0,
            dice: parsedDice
          };

          ws.send(JSON.stringify(rollMsg));
        }
      } catch (err) {
        console.error(">> Error parsing DDB WebSocket message:", err.message);
      }
    });

    ddbSocket.on("close", (code, reason) => {
      console.log(`>> DDB connection closed (${code}): ${reason || "No reason"}. Reconnecting in 5s...`);
      ws.send(JSON.stringify({ type: "bridge-status", status: "disconnected", message: "DDB connection closed, reconnecting..." }));
      closeDdbConnection();
      ddbReconnectTimer = setTimeout(() => connectDDB(config), 5000);
    });

    ddbSocket.on("error", (err) => {
      console.error(">> DDB WebSocket error:", err.message);
      ws.send(JSON.stringify({ type: "bridge-status", status: "error", message: `DDB error: ${err.message}` }));
    });
  }

  // Handle messages from Foundry client
  ws.on("message", async (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === "init") {
        await connectDDB(msg.config);
      } else if (msg.type === "ping") {
        ws.send(JSON.stringify({ type: "pong" }));
      }
    } catch (err) {
      console.error(">> Error handling Foundry client message:", err.message);
    }
  });

  ws.on("close", () => {
    console.log(">> Foundry client disconnected from bridge.");
    closeDdbConnection();
  });
});

server.listen(PORT, () => {
  console.log("=================================================");
  console.log(`  DDB Gamelog Standalone Bridge listening on :${PORT}`);
  console.log("  Securely routing Cobalt cookie data locally.");
  console.log("=================================================");
});
