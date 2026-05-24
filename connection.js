import { MODULE_ID } from "./module.js";
import { handleRoll } from "./roll-handler.js";

let socket = null;
let reconnectTimer = null;
let isConnecting = false;

export function connectBridge(url) {
  if (socket) {
    disconnectBridge();
  }

  isConnecting = true;
  console.log(`${MODULE_ID} | Connecting to local DDB Gamelog bridge at ${url}`);
  
  try {
    socket = new WebSocket(url);
  } catch (err) {
    console.error(`${MODULE_ID} | Connection failed:`, err);
    isConnecting = false;
    scheduleReconnect(url);
    return;
  }

  socket.onopen = () => {
    isConnecting = false;
    console.log(`${MODULE_ID} | Connected to local bridge.`);
    
    // Send initialization payload to the bridge
    const config = {
      cobalt: game.settings.get(MODULE_ID, "cobaltCookie"),
      gameId: game.settings.get(MODULE_ID, "campaignId"),
      userId: game.settings.get(MODULE_ID, "userId")
    };

    if (!config.cobalt || !config.gameId || !config.userId) {
      ui.notifications.warn("DDB Gamelog: Please configure your D&D Beyond credentials in the settings dashboard.");
      return;
    }

    socket.send(JSON.stringify({
      type: "init",
      config: config
    }));
  };

  socket.onmessage = async (event) => {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch (e) {
      console.error(`${MODULE_ID} | Failed to parse socket message:`, event.data);
      return;
    }

    if (data.type === "bridge-status") {
      if (data.status === "connected") {
        ui.notifications.info(`DDB Gamelog: ${data.message}`);
      } else if (data.status === "disconnected") {
        ui.notifications.warn(`DDB Gamelog: ${data.message}`);
      } else if (data.status === "error") {
        ui.notifications.error(`DDB Gamelog: ${data.message}`);
      }
    } else if (data.type === "ddb-roll") {
      try {
        await handleRoll(data);
      } catch (err) {
        console.error(`${MODULE_ID} | Error handling DDB roll:`, err);
      }
    }
  };

  socket.onclose = () => {
    console.warn(`${MODULE_ID} | Connection to local bridge closed.`);
    socket = null;
    if (!isConnecting) {
      scheduleReconnect(url);
    }
  };

  socket.onerror = (err) => {
    console.error(`${MODULE_ID} | WebSocket error:`, err);
  };
}

export function disconnectBridge() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (socket) {
    socket.close();
    socket = null;
  }
  isConnecting = false;
  console.log(`${MODULE_ID} | Disconnected from local bridge.`);
}

function scheduleReconnect(url) {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    connectBridge(url);
  }, 5000);
}
