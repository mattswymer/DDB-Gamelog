import { MODULE_ID } from "./module.js";

// Fetch and sync character stats from D&D Beyond via the local bridge
export async function syncCharacterFromDDB(actor, ddbCharacterId) {
  if (!actor || !ddbCharacterId) return;

  const hpSyncEnabled = game.settings.get(MODULE_ID, "hpSync");
  if (!hpSyncEnabled) return;

  const bridgeUrl = game.settings.get(MODULE_ID, "bridgeUrl")
    .replace("ws://", "http://").replace("wss://", "https://").replace("/ws", "");
  const cobaltCookie = game.settings.get(MODULE_ID, "cobaltCookie");

  if (!cobaltCookie) {
    console.warn(`${MODULE_ID} | Cannot sync character: Cobalt Session cookie is not configured.`);
    return;
  }

  try {
    const res = await fetch(`${bridgeUrl}/api/character/${ddbCharacterId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${cobaltCookie}`
      }
    });

    if (!res.ok) {
      throw new Error(`Bridge returned HTTP ${res.status}`);
    }

    const ddb = await res.json();
    if (ddb.error) {
      throw new Error(ddb.error);
    }

    await performActorSync(actor, ddb);
  } catch (err) {
    console.error(`${MODULE_ID} | Failed to sync character ${actor.name} (${ddbCharacterId}):`, err.message);
  }
}

// Compare and update actor attributes natively in Foundry
async function performActorSync(actor, ddb) {
  const updates = {};
  const currentHp = actor.system?.attributes?.hp?.value ?? 0;
  const maxHp = actor.system?.attributes?.hp?.max ?? 0;
  const tempHp = actor.system?.attributes?.hp?.temp ?? 0;
  const inspiration = actor.system?.attributes?.inspiration ?? false;
  const exhaustion = actor.system?.attributes?.exhaustion ?? 0;
  const xp = actor.system?.details?.xp?.value ?? 0;
  const deathSaves = actor.system?.attributes?.death || {};
  const deathSuccess = deathSaves.success ?? 0;
  const deathFailure = deathSaves.failure ?? 0;

  // 1. Sync Hit Points
  let hpUpdated = false;
  if (ddb.maxHp !== undefined && ddb.maxHp !== maxHp) {
    updates["system.attributes.hp.max"] = ddb.maxHp;
    hpUpdated = true;
  }
  if (ddb.currentHp !== undefined && ddb.currentHp !== currentHp) {
    updates["system.attributes.hp.value"] = ddb.currentHp;
    hpUpdated = true;
  }
  if (ddb.tempHp !== undefined && ddb.tempHp !== tempHp) {
    updates["system.attributes.hp.temp"] = ddb.tempHp;
    hpUpdated = true;
  }

  // 2. Sync Inspiration
  let inspirationUpdated = false;
  if (ddb.inspiration !== undefined && ddb.inspiration !== inspiration) {
    updates["system.attributes.inspiration"] = ddb.inspiration;
    inspirationUpdated = true;
  }

  // 3. Sync Exhaustion
  let exhaustionUpdated = false;
  if (ddb.exhaustion !== undefined && ddb.exhaustion !== exhaustion) {
    updates["system.attributes.exhaustion"] = ddb.exhaustion;
    exhaustionUpdated = true;
  }

  // 4. Sync Death Saves
  let deathSavesUpdated = false;
  if (ddb.deathSaves) {
    if (ddb.deathSaves.successes !== undefined && ddb.deathSaves.successes !== deathSuccess) {
      updates["system.attributes.death.success"] = ddb.deathSaves.successes;
      deathSavesUpdated = true;
    }
    if (ddb.deathSaves.failures !== undefined && ddb.deathSaves.failures !== deathFailure) {
      updates["system.attributes.death.failure"] = ddb.deathSaves.failures;
      deathSavesUpdated = true;
    }
  }

  // 5. Sync Experience Points (XP)
  let xpUpdated = false;
  if (ddb.xp !== undefined && ddb.xp !== xp) {
    updates["system.details.xp.value"] = ddb.xp;
    xpUpdated = true;
  }

  // Perform the actual update if there are changes
  if (Object.keys(updates).length > 0) {
    console.log(`${MODULE_ID} | Syncing attributes for ${actor.name}:`, updates);
    await actor.update(updates);
    
    // Notify the user in the UI
    const changeLogs = [];
    if (hpUpdated) changeLogs.push(`HP: ${ddb.currentHp}/${ddb.maxHp} (temp: ${ddb.tempHp})`);
    if (inspirationUpdated) changeLogs.push(`Inspiration: ${ddb.inspiration ? "Yes" : "No"}`);
    if (exhaustionUpdated) changeLogs.push(`Exhaustion: ${ddb.exhaustion}`);
    if (deathSavesUpdated) changeLogs.push(`Death Saves: ${ddb.deathSaves.successes}S / ${ddb.deathSaves.failures}F`);
    if (xpUpdated) changeLogs.push(`XP: ${ddb.xp}`);

    ui.notifications.info(`DDB Gamelog | Synced ${actor.name} updates: ${changeLogs.join(", ")}`);
  }
}
