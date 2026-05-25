import { connectBridge } from "./connection.js";
import { registerSettings, DDBGameLogSettingsForm } from "./settings-form.js";

export const MODULE_ID = "ddb-game-log";

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initializing D&D Beyond Gamelog module`);
  registerSettings();
});

Hooks.once("ready", () => {
  // Only the GM connects to the local bridge to coordinate rolls and syncs
  if (game.user.isGM) {
    const bridgeUrl = game.settings.get(MODULE_ID, "bridgeUrl");
    if (bridgeUrl) {
      connectBridge(bridgeUrl);
    }
  }
});
