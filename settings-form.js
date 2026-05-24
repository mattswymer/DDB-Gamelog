import { MODULE_ID } from "./module.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class DDBGameLogSettingsForm extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "ddb-game-log-settings",
    tag: "form",
    classes: ["ddb-settings-form", "sheet"],
    position: { width: 500, height: "auto" },
    window: {
      title: "D&D Beyond Gamelog Settings",
      resizable: true,
      icon: "fas fa-cogs"
    },
    form: {
      handler: DDBGameLogSettingsForm.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: true
    }
  };

  static PARTS = {
    form: {
      template: "modules/ddb-game-log/templates/settings-form.hbs"
    }
  };

  static TABS = {
    main: {
      navigation: ".sheet-tabs",
      content: ".content",
      initial: "connection"
    }
  };

  // Prepares the template rendering context
  async _prepareContext(options) {
    const actorMapping = game.settings.get(MODULE_ID, "actorMapping") || {};
    
    // Map existing PC actors for UI mapping list
    const pcActors = game.actors.filter(a => a.type === "character").map(actor => {
      return {
        id: actor.id,
        name: actor.name,
        img: actor.img,
        ddbId: actorMapping[actor.id] || ""
      };
    });

    return {
      bridgeUrl: game.settings.get(MODULE_ID, "bridgeUrl"),
      campaignId: game.settings.get(MODULE_ID, "campaignId"),
      cobaltCookie: game.settings.get(MODULE_ID, "cobaltCookie"),
      userId: game.settings.get(MODULE_ID, "userId"),
      rollMode: game.settings.get(MODULE_ID, "rollMode"),
      showDiceSoNice: game.settings.get(MODULE_ID, "showDiceSoNice"),
      autoInitiative: game.settings.get(MODULE_ID, "autoInitiative"),
      hpSync: game.settings.get(MODULE_ID, "hpSync"),
      damageConfirm: game.settings.get(MODULE_ID, "damageConfirm"),
      floatingNumbers: game.settings.get(MODULE_ID, "floatingNumbers"),
      autoAnimations: game.settings.get(MODULE_ID, "autoAnimations"),
      actors: pcActors,
      tabs: this._prepareTabs("main")
    };
  }

  // Handle saving configurations upon form submission
  static async #onSubmit(event, form, formData) {
    const rawData = formData.object;
    const data = foundry.utils.expandObject(rawData);

    // Save individual settings
    await game.settings.set(MODULE_ID, "bridgeUrl", data.bridgeUrl);
    await game.settings.set(MODULE_ID, "campaignId", data.campaignId);
    await game.settings.set(MODULE_ID, "userId", data.userId);
    await game.settings.set(MODULE_ID, "cobaltCookie", data.cobaltCookie);
    await game.settings.set(MODULE_ID, "rollMode", data.rollMode);
    await game.settings.set(MODULE_ID, "showDiceSoNice", !!data.showDiceSoNice);
    await game.settings.set(MODULE_ID, "autoInitiative", !!data.autoInitiative);
    await game.settings.set(MODULE_ID, "hpSync", !!data.hpSync);
    await game.settings.set(MODULE_ID, "damageConfirm", !!data.damageConfirm);
    await game.settings.set(MODULE_ID, "floatingNumbers", !!data.floatingNumbers);
    await game.settings.set(MODULE_ID, "autoAnimations", !!data.autoAnimations);

    // Parse and save actor mapping list
    const actorMapping = {};
    if (data.actorMap) {
      for (const [actorId, ddbId] of Object.entries(data.actorMap)) {
        if (ddbId.trim()) {
          actorMapping[actorId] = ddbId.trim();
        }
      }
    }
    await game.settings.set(MODULE_ID, "actorMapping", actorMapping);

    ui.notifications.info("D&D Beyond Gamelog settings saved successfully.");

    // Trigger local WebSocket bridge connection reload
    const { connectBridge } = await import("./connection.js");
    connectBridge(data.bridgeUrl);
  }
}

export function registerSettings() {
  game.settings.register(MODULE_ID, "bridgeUrl", {
    name: "Local Bridge URL",
    scope: "world",
    config: false,
    type: String,
    default: "ws://localhost:8765/ws"
  });

  game.settings.register(MODULE_ID, "campaignId", {
    name: "D&D Beyond Campaign ID",
    scope: "world",
    config: false,
    type: String,
    default: ""
  });

  game.settings.register(MODULE_ID, "userId", {
    name: "D&D Beyond User ID",
    scope: "world",
    config: false,
    type: String,
    default: ""
  });

  game.settings.register(MODULE_ID, "cobaltCookie", {
    name: "Cobalt Session Cookie",
    scope: "world",
    config: false,
    type: String,
    default: ""
  });

  game.settings.register(MODULE_ID, "rollMode", {
    name: "Roll Mode",
    scope: "world",
    config: false,
    type: String,
    default: "publicroll"
  });

  game.settings.register(MODULE_ID, "showDiceSoNice", {
    name: "Show Dice So Nice",
    scope: "world",
    config: false,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "autoInitiative", {
    name: "Auto Initiative",
    scope: "world",
    config: false,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "hpSync", {
    name: "HP Sync",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

  game.settings.register(MODULE_ID, "damageConfirm", {
    name: "Damage Confirmation",
    scope: "world",
    config: false,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "floatingNumbers", {
    name: "Floating Numbers",
    scope: "world",
    config: false,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "autoAnimations", {
    name: "Automated Animations",
    scope: "world",
    config: false,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "actorMapping", {
    name: "Actor Mapping",
    scope: "world",
    config: false,
    type: Object,
    default: {}
  });

  game.settings.registerMenu(MODULE_ID, "settingsMenu", {
    name: "DDB Gamelog Setup",
    label: "Configure Settings",
    hint: "Configure connection credentials, actor mapping, and feature toggles.",
    icon: "fas fa-cogs",
    type: DDBGameLogSettingsForm,
    restricted: true
  });
}
