import { characterSkillById, validateCharacterSkillIds } from "./characterSkills.js";
import { perkItemById } from "./perkItems.js";
import { aggregatePerkSources, effectiveShipStats } from "./perkSystem.js";
import { namedCrewMembers } from "./namedCrew.js";

export function gameStatePerkTotals(state, { additionalCharacters = [] } = {}) {
  if (!state || typeof state !== "object") throw new Error("Player perks require game state");
  if (!Array.isArray(additionalCharacters)) throw new Error("Additional perk characters must be an array");
  const characters = [state.playerCharacter, ...namedCrewMembers(state)];
  const travelers = [
    state.memory?.quests?.active?.passenger || null,
    state.memory?.quests?.passengerActive?.passenger || null
  ].filter(Boolean);
  characters.push(...travelers);
  characters.push(...additionalCharacters);

  const sources = [];
  const characterIds = new Set();
  for (const character of characters.filter(Boolean)) {
    const identity = character.id || character.name;
    if (!identity || characterIds.has(identity)) continue;
    characterIds.add(identity);
    validateCharacterSkillIds(character.skillIds);
    for (const skillId of character.skillIds) {
      const skill = characterSkillById(skillId);
      sources.push({ ...skill, id: `skill:${identity}:${skill.id}` });
    }
  }
  const items = state.inventory?.items;
  if (!items || typeof items !== "object" || Array.isArray(items)) {
    throw new Error("Player perks require inventory items");
  }
  for (const [itemId, quantity] of Object.entries(items)) {
    if (!Number.isInteger(quantity) || quantity < 0) throw new Error(`Invalid perk item quantity: ${itemId}=${quantity}`);
    if (quantity === 0) continue;
    const item = perkItemById(itemId);
    sources.push({ ...item, id: `item:${item.id}`, quantity });
  }
  return aggregatePerkSources(sources);
}

export function effectivePlayerShipStats(state, baseStats, options = {}) {
  return effectiveShipStats(baseStats, gameStatePerkTotals(state, options));
}
