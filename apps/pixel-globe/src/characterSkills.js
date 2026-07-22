import { perkEffectLabels, validatePerkSource } from "./perkSystem.js";

function skill(id, label, detail, perks, {
  travelerEligible = true,
  assignable = true,
  effectLabels = null
} = {}) {
  const value = Object.freeze({
    id,
    label,
    detail,
    perks: Object.freeze(perks),
    travelerEligible,
    assignable,
    effectLabels: effectLabels === null ? null : Object.freeze(effectLabels)
  });
  validatePerkSource(value);
  return value;
}

export const CHARACTER_SKILLS = Object.freeze([
  skill("organized", "Organized", "Finds room where other captains see a full hold.", {
    cargoCapacityFlat: 4
  }, { travelerEligible: false }),
  skill("skilled-chef", "Skilled Chef", "Makes every cask and ration stretch farther.", {
    foodDurationMultiplier: 1.2
  }),
  skill("master-chef", "Master Chef", "Plans every meal so well that provisions last sixty percent longer.", {
    foodDurationMultiplier: 1.6
  }, { travelerEligible: false }),
  skill("skilled-fisher", "Skilled Fisher", "Reads shoals and handles a net with confidence.", {
    fishingChanceMultiplier: 1.1,
    fishingHaulMultiplier: 1.1
  }),
  skill("expert-fisher", "Expert Fisher", "Knows where fish gather and how to bring them aboard.", {
    fishingChanceMultiplier: 1.22,
    fishingHaulMultiplier: 1.25
  }),
  skill("master-fisher", "Master Fisher", "Can turn a promising fishery into a laden hold.", {
    fishingChanceMultiplier: 1.35,
    fishingHaulMultiplier: 1.45
  }),
  skill("able-seaman", "Able Seaman", "Keeps sail and hull working efficiently underway.", {
    topSpeedMultiplier: 1.05,
    accelerationMultiplier: 1.05
  }),
  skill("master-helmsman", "Master Helmsman", "Coaxes the ship through turns and closer to the wind.", {
    turnRateMultiplier: 1.1,
    windwardAngleReductionDeg: 2
  }),
  skill("master-rigger", "Master Rigger", "Sets and trims canvas before the wind can shift.", {
    accelerationMultiplier: 1.12
  }),
  skill("marine-officer", "Marine Officer", "Keeps a landing party disciplined under fire.", {
    assaultChanceBonus: 0.06
  }),
  skill("seasoned-forager", "Seasoned Forager", "Finds useful stores ashore and brings more back.", {
    scavengingChanceMultiplier: 1.2,
    scavengingYieldMultiplier: 1.25
  }),
  skill("gun-captain", "Gun Captain", "Runs a practiced and orderly gun deck.", {
    cannonReloadMultiplier: 0.88
  }),
  skill("veteran-whaler", "Veteran Whaler", "Judges the instant to strike and holds a working line.", {
    whalingChanceMultiplier: 1.18
  }),
  skill("shipwright", "Shipwright", "Braces weak points before they become disasters.", {
    damageResistanceChance: 0.06
  }),
  skill("ships-surgeon", "Ship's Surgeon", "Keeps wounds from becoming names in the logbook.", {
    crewCasualtyResistanceChance: 0.12
  }),
  skill("navigator", "Navigator", "Turns observations and soundings into a cleaner passage.", {
    topSpeedMultiplier: 1.03,
    windwardAngleReductionDeg: 1
  }),
  skill("useless", "Useless", "Eats enthusiastically and contributes nothing to the work of the ship.", {
    cargoCapacityFlat: 0
  }, {
    travelerEligible: false,
    assignable: false,
    effectLabels: ["No crew work"]
  })
]);

const SKILLS_BY_ID = new Map(CHARACTER_SKILLS.map((entry) => [entry.id, entry]));
if (SKILLS_BY_ID.size !== CHARACTER_SKILLS.length) throw new Error("Duplicate character skill id");

export function characterSkillById(id) {
  const value = SKILLS_BY_ID.get(id);
  if (!value) throw new Error(`Unknown character skill: ${id}`);
  return value;
}

export function characterSkills(character) {
  if (!character || typeof character !== "object") throw new Error("Character skills require a character");
  validateCharacterSkillIds(character.skillIds);
  return Object.freeze(character.skillIds.map(characterSkillById));
}

export function characterSkillIdsForIdentity(identityKey, { traveler = false, count = 1 } = {}) {
  if (typeof identityKey !== "string" || identityKey.trim() === "") {
    throw new Error("Character skill assignment requires an identity key");
  }
  if (!Number.isInteger(count) || count <= 0) throw new Error(`Invalid character skill count: ${count}`);
  const pool = CHARACTER_SKILLS.filter((entry) => (
    entry.assignable && (!traveler || entry.travelerEligible)
  ));
  if (count > pool.length) throw new Error(`Cannot assign ${count} distinct skills from ${pool.length}`);
  const remaining = [...pool];
  const result = [];
  for (let index = 0; index < count; index++) {
    const selectedIndex = hashString32(`${identityKey}|skill|${index}`) % remaining.length;
    result.push(remaining.splice(selectedIndex, 1)[0].id);
  }
  return Object.freeze(result);
}

export function validateCharacterSkillIds(skillIds) {
  if (!Array.isArray(skillIds) || skillIds.length === 0) {
    throw new Error("Character requires at least one skill");
  }
  const seen = new Set();
  for (const id of skillIds) {
    characterSkillById(id);
    if (seen.has(id)) throw new Error(`Duplicate character skill: ${id}`);
    seen.add(id);
  }
  return skillIds;
}

export function characterSkillSummary(skillId) {
  const value = characterSkillById(skillId);
  return Object.freeze({
    ...value,
    effectLabels: value.effectLabels || perkEffectLabels(value.perks)
  });
}

function hashString32(value) {
  let hash = 0x811c9dc5;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
