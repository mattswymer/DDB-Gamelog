import { MODULE_ID } from "./module.js";
import { syncCharacterFromDDB } from "./character-sync.js";

const DND5E_API = "https://www.dnd5eapi.co/api";

const ACTION_LABELS = {
  str: "Strength", dex: "Dexterity", con: "Constitution",
  int: "Intelligence", wis: "Wisdom", cha: "Charisma",
  acrobatics: "Acrobatics", animalhandling: "Animal Handling",
  arcana: "Arcana", athletics: "Athletics", deception: "Deception",
  history: "History", insight: "Insight", intimidation: "Intimidation",
  investigation: "Investigation", medicine: "Medicine", nature: "Nature",
  perception: "Perception", performance: "Performance", persuasion: "Persuasion",
  religion: "Religion", sleightofhand: "Sleight of Hand", stealth: "Stealth",
  survival: "Survival", initiative: "Initiative", death: "Death Save",
};

const ROLL_TYPE_LABELS = {
  check: "Check", save: "Saving Throw", "to hit": "Attack Roll",
  attack: "Attack Roll", damage: "Damage", initiative: "Initiative",
  heal: "Healing", death: "Death Save",
};

const DAMAGE_TYPE_ICONS = {
  acid: "🟢", bludgeoning: "⚫", cold: "❄️", fire: "🔥", force: "🔵",
  lightning: "⚡", necrotic: "💀", piercing: "🗡️", poison: "🟣",
  psychic: "🧠", radiant: "✨", slashing: "⚔️", thunder: "💥",
};

// Map DDB roll payload action/type to labels
function getRollLabel(action, rollType) {
  const a = action.toLowerCase();
  const t = rollType.toLowerCase();
  const actionLabel = ACTION_LABELS[a] ?? action;

  if (a === "initiative") return "Initiative";
  if (a === "death") return "Death Saving Throw";
  if (t === "to hit" || t === "attack") return `${action} — Attack Roll`;
  if (t === "damage") return `${action} — Damage`;
  if (a === t) return actionLabel;
  return `${actionLabel} ${ROLL_TYPE_LABELS[t] ?? rollType}`;
}

// Get the CSS class name for roll type styling
function getRollTypeClass(rollType, action = "") {
  const t = rollType.toLowerCase();
  const a = action.toLowerCase();
  if (a === "initiative" || t === "initiative") return "initiative";
  if (t === "to hit" || t === "attack") return "attack";
  if (t === "damage") return "damage";
  if (t === "heal") return "heal";
  if (t === "save") return "save";
  if (t === "check") return "check";
  return "other";
}

function isCriticalHit(dice, rollType) {
  const t = rollType.toLowerCase();
  if (t !== "to hit" && t !== "attack") return false;
  return dice.some(d => d.faces === 20 && d.result === 20);
}

function formatBreakdown(text) {
  return text.replace(/\+\s*-/g, " - ").replace(/^\+/, "").trim();
}

// Map D&D Beyond Character ID/Name to a Foundry Actor
export function getActorForDDBCharacter(ddbName, ddbId) {
  const mapping = game.settings.get(MODULE_ID, "actorMapping") || {};
  
  if (ddbId && mapping[ddbId]) {
    const actor = game.actors.get(mapping[ddbId]);
    if (actor) return actor;
  }
  
  if (mapping[ddbName]) {
    const actor = game.actors.get(mapping[ddbName]);
    if (actor) return actor;
  }

  let actor = game.actors.find(a => a.name.toLowerCase() === ddbName.toLowerCase());
  if (actor) return actor;

  const token = canvas.tokens?.placeables?.find(t => t.name.toLowerCase() === ddbName.toLowerCase());
  if (token?.actor) return token.actor;

  return null;
}

// Retrieve Spell/Equipment tags & description from DND5e API
const spellCache = new Map();
const equipCache = new Map();

async function lookupApiInfo(actionName, rollType) {
  const t = rollType.toLowerCase();
  if (t !== "to hit" && t !== "damage" && t !== "attack") return null;

  const index = actionName.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim().replace(/\s+/g, "-");

  // Spell check
  if (!spellCache.has(index)) {
    try {
      const res = await fetch(`${DND5E_API}/spells/${index}`);
      spellCache.set(index, res.ok ? await res.json() : null);
    } catch {
      spellCache.set(index, null);
    }
  }
  
  const spell = spellCache.get(index);
  if (spell) {
    const levelLabel = spell.level === 0 ? "Cantrip" : `${spell.level} Level`;
    const school = spell.school?.name || "";
    const dmgType = spell.damage?.damage_type?.name || "";
    const dmgIcon = dmgType ? (DAMAGE_TYPE_ICONS[dmgType.toLowerCase()] ?? "🎲") : "";
    const saveType = spell.dc?.dc_type?.name || "";

    const tags = [[levelLabel, school].filter(Boolean).join(" ")];
    if (dmgType) tags.push(`${dmgIcon} ${dmgType}`);
    if (saveType && t !== "damage") tags.push(`${saveType} Save`);

    return { tags, desc: spell.desc?.[0]?.split(".")[0] + "." || "" };
  }

  // Equipment/Weapon check
  if (!equipCache.has(index)) {
    try {
      const res = await fetch(`${DND5E_API}/equipment/${index}`);
      equipCache.set(index, res.ok ? await res.json() : null);
    } catch {
      equipCache.set(index, null);
    }
  }

  const equip = equipCache.get(index);
  if (equip && equip.equipment_category?.index === "weapon") {
    const dmgType = equip.damage?.damage_type?.name || "";
    const dmgDice = equip.damage?.damage_dice || "";
    const dmgIcon = dmgType ? (DAMAGE_TYPE_ICONS[dmgType.toLowerCase()] ?? "⚔️") : "⚔️";
    const category = equip.weapon_category || "";
    const props = (equip.properties || []).map(p => p.name).slice(0, 3);

    const tags = [];
    if (category) tags.push(category);
    if (dmgType) tags.push(`${dmgIcon} ${dmgType}${dmgDice ? ` (${dmgDice})` : ""}`);
    tags.push(...props);

    return { tags, desc: equip.desc?.[0]?.split(".")[0] + "." || "" };
  }

  return null;
}

// Stores attack rolls mapping for damage roll targets
const pendingDamageTargets = new Map();

// Main entry point for processing rolls relayed from the bridge
export async function handleRoll(data) {
  const { character, action, rollType, total, text, dice = [], constant = 0, entity_id } = data;
  const label = getRollLabel(action, rollType);
  const crit = isCriticalHit(dice, rollType);

  const t = rollType.toLowerCase();
  const isAttack = t === "to hit" || t === "attack";
  const isDamage = t === "damage";
  const isHeal = t === "heal";
  const isInitiative = action.toLowerCase() === "initiative";

  const actor = getActorForDDBCharacter(character, entity_id);

  // Sync character sheet stats in the background if enabled
  if (actor && entity_id) {
    syncCharacterFromDDB(actor, entity_id).catch(err => console.warn(`${MODULE_ID} | Stats sync failed:`, err));
  }

  // Process initiative update natively
  if (isInitiative && actor) {
    await updateInitiative(actor, total);
  }

  // Resolve external API info
  const apiInfo = await lookupApiInfo(action, rollType);

  // 1. Attack Target Selection
  let targetResult = null;
  if (isAttack) {
    targetResult = await pickTargetsDialog(character, total, crit);
    if (targetResult) {
      const hitTargets = targetResult.filter(tr => tr.hit);
      if (hitTargets.length > 0) {
        pendingDamageTargets.set(character, hitTargets);
      } else {
        pendingDamageTargets.delete(character);
      }
    }
  }

  // 2. Heal Target Picker & Action
  let healResults = null;
  if (isHeal) {
    const healTargets = await pickHealTargetsDialog(character, total);
    if (healTargets) {
      healResults = await applyHealing(healTargets, total);
    }
  }

  // 3. Damage Confirmation & Action
  let damageResults = null;
  if (isDamage) {
    const storedHits = pendingDamageTargets.get(character) || [];
    const preSelectedIds = storedHits.map(sh => sh.tokenId);
    pendingDamageTargets.delete(character);

    const confirmed = await pickAndConfirmDamageDialog(character, total, crit, preSelectedIds);
    if (confirmed) {
      damageResults = await applyDamage(confirmed.targets, confirmed.amount);
    }
  }

  // Sequencer / AA integrations
  if (damageResults) triggerAnimations(character, action, damageResults, false, crit);
  if (healResults) triggerAnimations(character, action, healResults, true, false);

  // Construct native Roll
  const roll = await buildRoll(dice, constant, total);

  // Create Chat Message
  const speaker = actor ? ChatMessage.getSpeaker({ actor }) : { alias: character };
  const flavor = buildFlavor({
    label,
    text: formatBreakdown(text),
    rollType,
    isCrit: crit,
    apiInfo,
    targetResults: targetResult,
    damageResults,
    healResults
  });

  const rollMode = game.settings.get(MODULE_ID, "rollMode");
  const showDSN = game.settings.get(MODULE_ID, "showDiceSoNice");

  if (!showDSN && game.dice3d) game.dice3d.messageHookDisabled = true;
  await roll.toMessage({ speaker, flavor }, { rollMode });
  if (!showDSN && game.dice3d) game.dice3d.messageHookDisabled = false;
}

// Dialog for choosing target and beating AC
async function pickTargetsDialog(character, total, isCrit) {
  const allTokens = (canvas.tokens?.placeables || []).filter(t => t.actor && t.actor.name !== character);
  if (allTokens.length === 0) return null;

  const manualTargetIds = new Set([...game.user.targets].map(t => t.id));

  return new Promise(resolve => {
    const rows = allTokens.map(t => {
      const ac = t.actor.system?.attributes?.ac?.value ?? "?";
      const img = t.document.texture?.src || "icons/svg/mystery-man.svg";
      const preChecked = manualTargetIds.has(t.id) ? "checked" : "";
      return `
        <label class="ddb-target-select-row" style="display:flex;align-items:center;gap:8px;padding:6px;margin-bottom:4px;cursor:pointer;">
          <input type="checkbox" name="ddb-target" value="${t.id}" ${preChecked}>
          <img src="${img}" style="width:24px;height:24px;border-radius:3px;object-fit:cover;">
          <span style="flex:1;font-weight:600;">${t.name}</span>
          <span style="font-size:0.85em;color:var(--color-text-muted);">AC ${ac}</span>
        </label>
      `;
    }).join("");

    const hitLabel = isCrit ? "★ CRIT — Auto Hit!" : `Attack Roll: <strong>${total}</strong>`;

    new Dialog({
      title: "Select Attack Targets",
      content: `
        <div style="font-family:inherit;padding:4px;">
          <p style="margin-bottom:10px;">${character} attacks (${hitLabel})</p>
          ${rows}
        </div>
      `,
      buttons: {
        attack: {
          icon: '<i class="fas fa-crosshairs"></i>',
          label: "Confirm Targets",
          callback: html => {
            const checkedIds = [...html.find("input[name='ddb-target']:checked")].map(el => el.value);
            const results = allTokens
              .filter(t => checkedIds.includes(t.id))
              .map(t => {
                const ac = t.actor.system?.attributes?.ac?.value ?? null;
                const hit = isCrit || (ac !== null ? total >= ac : null);
                return { name: t.name, ac, hit, tokenId: t.id };
              });
            resolve(results.length ? results : null);
          }
        },
        skip: { label: "No Target", callback: () => resolve(null) }
      },
      default: "attack"
    }, { width: 320 }).render(true);
  });
}

// Dialog for healing selection
async function pickHealTargetsDialog(character, amount) {
  const allTokens = (canvas.tokens?.placeables || []).filter(t => t.actor);
  if (allTokens.length === 0) return null;

  const manualTargetIds = new Set([...game.user.targets].map(t => t.id));

  return new Promise(resolve => {
    const rows = allTokens.map(t => {
      const hp = t.actor.system?.attributes?.hp;
      const cur = hp?.value ?? "?";
      const max = hp?.max ?? "?";
      const img = t.document.texture?.src || "icons/svg/mystery-man.svg";
      const preChecked = manualTargetIds.has(t.id) ? "checked" : "";
      return `
        <label style="display:flex;align-items:center;gap:8px;padding:6px;margin-bottom:4px;cursor:pointer;">
          <input type="checkbox" name="ddb-heal" value="${t.id}" ${preChecked}>
          <img src="${img}" style="width:24px;height:24px;border-radius:3px;object-fit:cover;">
          <span style="flex:1;font-weight:600;">${t.name}</span>
          <span style="color:#2e7d32;font-size:0.85em;">HP ${cur}/${max}</span>
        </label>
      `;
    }).join("");

    new Dialog({
      title: "Select Heal Targets",
      content: `
        <div style="font-family:inherit;padding:4px;">
          <p style="margin-bottom:10px;">${character} heals <strong style="color:#2e7d32;">+${amount} HP</strong></p>
          ${rows}
        </div>
      `,
      buttons: {
        heal: {
          icon: '<i class="fas fa-heart"></i>',
          label: "Heal Targets",
          callback: html => {
            const checkedIds = [...html.find("input[name='ddb-heal']:checked")].map(el => el.value);
            const targets = allTokens.filter(t => checkedIds.includes(t.id)).map(t => ({ name: t.name, tokenId: t.id }));
            resolve(targets.length ? targets : null);
          }
        },
        skip: { label: "Skip", callback: () => resolve(null) }
      },
      default: "heal"
    }, { width: 320 }).render(true);
  });
}

// Dialog for Damage Confirmation
async function pickAndConfirmDamageDialog(character, amount, isCrit, preSelectedIds) {
  const allTokens = (canvas.tokens?.placeables || []).filter(t => t.actor);

  if (!game.settings.get(MODULE_ID, "damageConfirm")) {
    const targets = allTokens.filter(t => preSelectedIds.includes(t.id)).map(t => ({ name: t.name, tokenId: t.id }));
    return targets.length ? { targets, amount } : null;
  }

  const preSelectedSet = new Set(preSelectedIds);

  return new Promise(resolve => {
    const rows = allTokens.map(t => {
      const hp = t.actor.system?.attributes?.hp;
      const cur = hp?.value ?? "?";
      const max = hp?.max ?? "?";
      const img = t.document.texture?.src || "icons/svg/mystery-man.svg";
      const checked = preSelectedSet.has(t.id) ? "checked" : "";
      return `
        <label style="display:flex;align-items:center;gap:8px;padding:6px;margin-bottom:4px;cursor:pointer;">
          <input type="checkbox" name="ddb-dmg" value="${t.id}" ${checked}>
          <img src="${img}" style="width:24px;height:24px;border-radius:3px;object-fit:cover;">
          <span style="flex:1;font-weight:600;">${t.name}</span>
          <span style="font-size:0.85em;color:var(--color-text-muted);">HP ${cur}/${max}</span>
        </label>
      `;
    }).join("");

    new Dialog({
      title: `Confirm Damage - ${character}`,
      content: `
        <div style="font-family:inherit;padding:4px;">
          <div style="font-size:2em;font-weight:700;color:#d32f2f;text-align:center;line-height:1.1;">
            ${amount} ${isCrit ? "<span style='font-size:0.5em;color:#ff8f00;'>CRIT</span>" : ""}
          </div>
          <div style="text-align:center;font-size:0.85em;color:var(--color-text-muted);margin-bottom:12px;">damage</div>
          <div style="max-height:200px;overflow-y:auto;">${rows}</div>
        </div>
      `,
      buttons: {
        apply: {
          icon: '<i class="fas fa-check"></i>',
          label: `Apply ${amount}`,
          callback: html => {
            const checkedIds = [...html.find("input[name='ddb-dmg']:checked")].map(el => el.value);
            const targets = allTokens.filter(t => checkedIds.includes(t.id)).map(t => ({ name: t.name, tokenId: t.id }));
            resolve(targets.length ? { targets, amount } : null);
          }
        },
        double: {
          icon: '<i class="fas fa-times-2"></i>',
          label: `Double (${amount * 2})`,
          callback: html => {
            const checkedIds = [...html.find("input[name='ddb-dmg']:checked")].map(el => el.value);
            const targets = allTokens.filter(t => checkedIds.includes(t.id)).map(t => ({ name: t.name, tokenId: t.id }));
            resolve(targets.length ? { targets, amount: amount * 2 } : null);
          }
        },
        cancel: {
          icon: '<i class="fas fa-ban"></i>',
          label: "Cancel",
          callback: () => resolve(null)
        }
      },
      default: "apply"
    }, { width: 340 }).render(true);
  });
}

// Modify hit points of target actors
async function applyDamage(targets, amount) {
  const results = [];
  for (const target of targets) {
    const token = (canvas.tokens?.placeables || []).find(t => t.id === target.tokenId);
    if (!token?.actor) continue;
    const hp = token.actor.system?.attributes?.hp;
    if (!hp) continue;

    const oldHp = hp.value;
    const newHp = Math.max(0, oldHp - amount);
    await token.actor.update({ "system.attributes.hp.value": newHp });
    results.push({ targetName: target.name, oldHp, newHp, damage: amount, tokenId: target.tokenId });
  }
  return results.length ? results : null;
}

// Apply healing to target actors
async function applyHealing(targets, amount) {
  const results = [];
  for (const target of targets) {
    const token = (canvas.tokens?.placeables || []).find(t => t.id === target.tokenId);
    if (!token?.actor) continue;
    const hp = token.actor.system?.attributes?.hp;
    if (!hp) continue;

    const oldHp = hp.value;
    const maxHp = hp.max;
    const newHp = Math.min(maxHp, oldHp + amount);
    const healed = newHp - oldHp;
    if (healed > 0) {
      await token.actor.update({ "system.attributes.hp.value": newHp });
    }
    results.push({ targetName: target.name, oldHp, newHp, maxHp, healed, tokenId: target.tokenId });
  }
  return results.length ? results : null;
}

// Update actor initiative natively
async function updateInitiative(actor, value) {
  if (!game.settings.get(MODULE_ID, "autoInitiative")) return;
  if (!game.combat) return;

  const combatant = game.combat.combatants.find(c => c.actorId === actor.id);
  if (!combatant) {
    ui.notifications.warn(`DDB Gamelog: Actor ${actor.name} is not in the combat tracker.`);
    return;
  }

  await game.combat.setInitiative(combatant.id, value);
  ui.notifications.info(`Initiative set: ${actor.name} → ${value}`);
}

// Handle evaluation of custom formulas
async function buildRoll(dice, constant, total) {
  const groups = {};
  for (const d of dice) {
    groups[d.faces] = (groups[d.faces] ?? 0) + 1;
  }

  const parts = Object.entries(groups).map(([f, c]) => `${c}d${f}`);
  if (constant > 0) parts.push(`${constant}`);
  else if (constant < 0) parts.push(`${constant}`);

  const formula = parts.length > 0 ? parts.join(" + ") : `${Math.max(total, 0)}`;

  const roll = new Roll(formula);
  await roll.evaluate();

  const DieTerm = foundry.dice?.terms?.Die || Die;
  let dieIndex = 0;
  for (const term of roll.terms) {
    if (term instanceof DieTerm) {
      for (const result of term.results) {
        if (dieIndex < dice.length) {
          result.result = dice[dieIndex].result;
          dieIndex++;
        }
      }
    }
  }

  roll._total = total;
  return roll;
}

// Helper to trigger automated sequencer scrolling text or AA animations
function triggerAnimations(character, action, results, isHeal, isCrit) {
  // Sequencer scrolling text
  if (game.settings.get(MODULE_ID, "floatingNumbers") && game.modules.get("sequencer")?.active) {
    for (const r of results) {
      const token = (canvas.tokens?.placeables || []).find(t => t.id === r.tokenId);
      if (!token) continue;
      
      const amount = isHeal ? r.healed : r.damage;
      const text = isHeal ? `+${amount}` : `-${amount}`;
      const color = isHeal ? "#2e7d32" : (isCrit ? "#ff8f00" : "#d32f2f");

      new Sequence()
        .scrollingText(token, text, {
          duration: 1800,
          distance: 120,
          fontSize: isCrit ? 64 : 48,
          color,
          stroke: "#000000",
          strokeThickness: 4,
          jitter: 0.2
        })
        .play();
    }
  }

  // Automated Animations
  if (game.settings.get(MODULE_ID, "autoAnimations") && game.modules.get("autoanimations")?.active) {
    const sourceToken = canvas.tokens?.placeables?.find(t => t.actor?.name === character);
    const targetTokens = (canvas.tokens?.placeables || []).filter(t => results.some(r => r.tokenId === t.id));
    
    if (sourceToken && targetTokens.length > 0) {
      const item = sourceToken.actor?.items?.find(i => i.name.toLowerCase() === action.toLowerCase()) || { name: action };
      try {
        if (typeof AutoAnimations !== "undefined") {
          AutoAnimations.playAnimation(sourceToken, targetTokens, item);
        } else if (typeof AutomatedAnimations !== "undefined") {
          const prevTargets = [...game.user.targets].map(t => t.id);
          game.user.updateTokenTargets(targetTokens.map(t => t.id)).then(() => {
            AutomatedAnimations.playAnimation(sourceToken, item).then(() => {
              game.user.updateTokenTargets(prevTargets);
            });
          });
        }
      } catch (err) {
        console.warn(`${MODULE_ID} | Automated Animations trigger failed:`, err);
      }
    }
  }
}

// Build beautiful, styled chat cards
function buildFlavor({ label, text, rollType, isCrit, apiInfo, targetResults, damageResults, healResults, action = "" }) {
  const typeClass = getRollTypeClass(rollType, action);
  const critBadge = isCrit ? `<span class="ddb-crit-badge">★ CRIT</span>` : "";
  const ddbBadge = `<span class="ddb-badge">DDB</span>`;

  let spellSection = "";
  if (apiInfo) {
    const tagsHtml = (apiInfo.tags || []).map(t => `<span class="ddb-spell-tag">${t}</span>`).join("");
    spellSection = `
      <div class="ddb-spell-info">
        <div class="ddb-spell-tags">${tagsHtml}</div>
        ${apiInfo.desc ? `<div class="ddb-spell-desc">${apiInfo.desc}</div>` : ""}
      </div>
    `;
  }

  const breakdownHtml = text ? `<div class="ddb-roll-breakdown">${text}</div>` : "";

  let targetHtml = "";
  if (targetResults && targetResults.length > 0) {
    const rows = targetResults.map(tr => {
      const hit = tr.hit;
      const unknown = hit === null;
      const statusClass = isCrit || hit ? (isCrit ? "ddb-status-crit" : "ddb-status-hit") : "ddb-status-miss";
      const icon = (isCrit || hit) ? (isCrit ? "★ CRIT" : "✓ HIT") : "✗ MISS";
      const acStr = tr.ac !== null ? `<span class="ddb-hp-text">AC ${tr.ac}</span>` : "";
      return `
        <div class="ddb-target-row">
          <div style="display:flex;align-items:center;gap:6px;">
            <span class="ddb-target-status ${statusClass}">${icon}</span>
            <span style="font-size:0.85em;color:var(--color-text-primary);">${tr.name}</span>
          </div>
          ${acStr}
        </div>
      `;
    }).join("");
    targetHtml = `<div class="ddb-targets-container">${rows}</div>`;
  }

  let damageHtml = "";
  if (damageResults && damageResults.length > 0) {
    const bars = damageResults.map(r => {
      const pct = Math.round((r.newHp / Math.max(r.oldHp, 1)) * 100);
      const barColClass = pct > 50 ? "ddb-hp-green" : pct > 25 ? "ddb-hp-orange" : "ddb-hp-red";
      return `
        <div class="ddb-hp-bar-wrapper">
          <div class="ddb-hp-bar-header">
            <span style="font-size:0.82em;color:var(--color-text-primary);">${r.targetName}</span>
            <span style="font-size:0.82em;font-weight:700;color:#d32f2f;">−${r.damage} HP</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <div class="ddb-hp-bar-outer" style="flex:1;">
              <div class="ddb-hp-bar-inner ${barColClass}" style="width:${pct}%;"></div>
            </div>
            <span class="ddb-hp-text">${r.newHp} / ${r.oldHp}</span>
          </div>
        </div>
      `;
    }).join("");
    damageHtml = `<div class="ddb-damage-container">${bars}</div>`;
  }

  let healHtml = "";
  if (healResults && healResults.length > 0) {
    const bars = healResults.map(r => {
      const pct = Math.round((r.newHp / Math.max(r.maxHp, 1)) * 100);
      const barColClass = pct > 50 ? "ddb-hp-green" : pct > 25 ? "ddb-hp-orange" : "ddb-hp-red";
      return `
        <div class="ddb-hp-bar-wrapper">
          <div class="ddb-hp-bar-header">
            <span style="font-size:0.82em;color:var(--color-text-primary);">${r.targetName}</span>
            <span style="font-size:0.82em;font-weight:700;color:#2e7d32;">+${r.healed} HP</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <div class="ddb-hp-bar-outer" style="flex:1;">
              <div class="ddb-hp-bar-inner ${barColClass}" style="width:${pct}%;"></div>
            </div>
            <span class="ddb-hp-text">${r.newHp} / ${r.maxHp}</span>
          </div>
        </div>
      `;
    }).join("");
    healHtml = `<div class="ddb-damage-container">${bars}</div>`;
  }

  return `
    <div class="ddb-roll-flavor ddb-type-${typeClass}">
      <div class="ddb-roll-header">
        <strong class="ddb-roll-label">${label}</strong>
        <div class="ddb-badges">
          ${critBadge}${ddbBadge}
        </div>
      </div>
      ${spellSection}
      ${breakdownHtml}
      ${targetHtml}
      ${damageHtml}
      ${healHtml}
    </div>
  `;
}
