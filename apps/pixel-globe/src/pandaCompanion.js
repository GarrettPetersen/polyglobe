import { ANIMAL_CATALOG_BY_ID } from "./animalEncounters.js";

export const PANDA_COMPANION_MEMORY_VERSION = 2;
export const PANDA_COMPANION_UNMET = "unmet";
export const PANDA_COMPANION_PENDING = "pending";
export const PANDA_COMPANION_DECLINED = "declined";
export const PANDA_COMPANION_ABOARD = "aboard";
export const PANDA_COMPANION_WITH_NATURALIST = "with-naturalist";
export const PANDA_NATURALIST_OFFER_UNRESOLVED = "unresolved";
export const PANDA_NATURALIST_OFFER_DECLINED = "declined";
export const PANDA_NATURALIST_OFFER_ACCEPTED = "accepted";
export const PANDA_FOOD_CONSUMERS = 3;
export const PANDA_WATER_CONSUMERS = 1;
export const PANDA_NATURALIST_PAYMENT = 1000;

const PANDA_REACTION_LIMIT = 8;
const PANDA_FAMILIAR_CULTURES = new Set([
  "chinese",
  "japanese",
  "korean",
  "southAsian",
  "southeastAsian"
]);

export function createPandaCompanionMemory() {
  return {
    version: PANDA_COMPANION_MEMORY_VERSION,
    status: PANDA_COMPANION_UNMET,
    joinedMinute: null,
    naturalistOffer: PANDA_NATURALIST_OFFER_UNRESOLVED,
    npcReactionKeys: []
  };
}

export function migratePandaCompanionMemory(memory) {
  if (!memory) return createPandaCompanionMemory();
  if (memory.version === PANDA_COMPANION_MEMORY_VERSION) return memory;
  if (memory.version !== 1) {
    throw new Error(`Cannot migrate panda companion memory version: ${memory.version ?? "missing"}`);
  }
  const migrated = {
    ...memory,
    version: PANDA_COMPANION_MEMORY_VERSION,
    naturalistOffer: PANDA_NATURALIST_OFFER_UNRESOLVED
  };
  return validatePandaCompanionMemory(migrated);
}

export function validatePandaCompanionMemory(memory) {
  if (!memory || memory.version !== PANDA_COMPANION_MEMORY_VERSION) {
    throw new Error(`Unsupported panda companion memory: ${memory?.version ?? "missing"}`);
  }
  if (![PANDA_COMPANION_UNMET, PANDA_COMPANION_PENDING, PANDA_COMPANION_DECLINED,
    PANDA_COMPANION_ABOARD, PANDA_COMPANION_WITH_NATURALIST]
    .includes(memory.status)) {
    throw new Error(`Invalid panda companion status: ${memory.status}`);
  }
  if (memory.status === PANDA_COMPANION_ABOARD || memory.status === PANDA_COMPANION_WITH_NATURALIST) {
    if (!Number.isFinite(memory.joinedMinute) || memory.joinedMinute < 0) {
      throw new Error(`Invalid panda joining minute: ${memory.joinedMinute}`);
    }
  } else if (memory.joinedMinute !== null) {
    throw new Error(`Panda joining minute exists before acceptance: ${memory.joinedMinute}`);
  }
  if (![PANDA_NATURALIST_OFFER_UNRESOLVED, PANDA_NATURALIST_OFFER_DECLINED,
    PANDA_NATURALIST_OFFER_ACCEPTED].includes(memory.naturalistOffer)) {
    throw new Error(`Invalid panda naturalist offer: ${memory.naturalistOffer}`);
  }
  if (memory.status === PANDA_COMPANION_WITH_NATURALIST &&
      memory.naturalistOffer !== PANDA_NATURALIST_OFFER_ACCEPTED) {
    throw new Error("Panda living with the naturalist must have an accepted offer");
  }
  if (memory.status !== PANDA_COMPANION_WITH_NATURALIST &&
      memory.naturalistOffer === PANDA_NATURALIST_OFFER_ACCEPTED) {
    throw new Error("Accepted panda naturalist offer requires the panda to live with the naturalist");
  }
  if (memory.status !== PANDA_COMPANION_ABOARD && memory.status !== PANDA_COMPANION_WITH_NATURALIST &&
      memory.naturalistOffer !== PANDA_NATURALIST_OFFER_UNRESOLVED) {
    throw new Error(`Panda naturalist offer cannot be ${memory.naturalistOffer} while ${memory.status}`);
  }
  if (!Array.isArray(memory.npcReactionKeys) ||
      memory.npcReactionKeys.some((key) => typeof key !== "string" || key.trim() === "")) {
    throw new Error("Panda NPC reaction keys must be non-empty strings");
  }
  if (new Set(memory.npcReactionKeys).size !== memory.npcReactionKeys.length) {
    throw new Error("Panda NPC reaction keys contain duplicates");
  }
  if (memory.npcReactionKeys.length > PANDA_REACTION_LIMIT) {
    throw new Error(`Panda NPC reactions exceed their limit: ${memory.npcReactionKeys.length}`);
  }
  return memory;
}

export function beginPandaRecruitment(memory) {
  validatePandaCompanionMemory(memory);
  if (memory.status !== PANDA_COMPANION_UNMET) {
    throw new Error(`Cannot begin panda recruitment from ${memory.status}`);
  }
  memory.status = PANDA_COMPANION_PENDING;
  return memory;
}

export function acceptPandaCompanion(memory, currentMinute) {
  validatePandaCompanionMemory(memory);
  if (memory.status !== PANDA_COMPANION_PENDING) {
    throw new Error(`Cannot accept panda companion from ${memory.status}`);
  }
  if (!Number.isFinite(currentMinute) || currentMinute < 0) {
    throw new Error(`Invalid panda joining minute: ${currentMinute}`);
  }
  memory.status = PANDA_COMPANION_ABOARD;
  memory.joinedMinute = Math.floor(currentMinute);
  return memory;
}

export function declinePandaCompanion(memory) {
  validatePandaCompanionMemory(memory);
  if (memory.status !== PANDA_COMPANION_PENDING) {
    throw new Error(`Cannot decline panda companion from ${memory.status}`);
  }
  memory.status = PANDA_COMPANION_DECLINED;
  return memory;
}

export function pandaCompanionIsAboard(memory) {
  validatePandaCompanionMemory(memory);
  return memory.status === PANDA_COMPANION_ABOARD;
}

export function pandaRecruitmentIsPending(memory) {
  validatePandaCompanionMemory(memory);
  return memory.status === PANDA_COMPANION_PENDING;
}

export function pandaNaturalistOfferIsAvailable(memory) {
  validatePandaCompanionMemory(memory);
  return memory.status === PANDA_COMPANION_ABOARD &&
    memory.naturalistOffer === PANDA_NATURALIST_OFFER_UNRESOLVED;
}

export function declinePandaNaturalistOffer(memory) {
  if (!pandaNaturalistOfferIsAvailable(memory)) {
    throw new Error("Cannot decline an unavailable panda naturalist offer");
  }
  memory.naturalistOffer = PANDA_NATURALIST_OFFER_DECLINED;
  return validatePandaCompanionMemory(memory);
}

export function placePandaWithNaturalist(memory) {
  if (!pandaNaturalistOfferIsAvailable(memory)) {
    throw new Error("Cannot place the panda with the naturalist without an available offer");
  }
  memory.status = PANDA_COMPANION_WITH_NATURALIST;
  memory.naturalistOffer = PANDA_NATURALIST_OFFER_ACCEPTED;
  return validatePandaCompanionMemory(memory);
}

export function pandaCompanionConsumption(memory) {
  const aboard = pandaCompanionIsAboard(memory);
  return Object.freeze({
    pandas: aboard ? 1 : 0,
    foodConsumers: aboard ? PANDA_FOOD_CONSUMERS : 0,
    waterConsumers: aboard ? PANDA_WATER_CONSUMERS : 0
  });
}

export function pandaCompanionCharacter() {
  const panda = ANIMAL_CATALOG_BY_ID.get("panda");
  if (!panda) throw new Error("Panda animal entry is missing");
  return Object.freeze({
    id: "companion:panda",
    name: "Panda",
    role: "ship-panda",
    sex: "female",
    age: 7,
    nameCulture: "chinese",
    nationalityAdjective: "Chinese",
    homePortName: "Sichuan",
    skillIds: Object.freeze(["useless"]),
    goal: Object.freeze({ text: "Eat bamboo, avoid all work, and remain aboard" }),
    expressions: panda.expressions
  });
}

export function pandaNpcReaction(memory, interactionKey, npcCharacter) {
  validatePandaCompanionMemory(memory);
  if (!pandaCompanionIsAboard(memory)) return null;
  if (typeof interactionKey !== "string" || interactionKey.trim() === "") {
    throw new Error("Panda NPC reaction requires an interaction key");
  }
  if (!npcCharacter || typeof npcCharacter !== "object" || !npcCharacter.name) {
    throw new Error("Panda NPC reaction requires a named character");
  }
  if (memory.npcReactionKeys.includes(interactionKey) || memory.npcReactionKeys.length >= PANDA_REACTION_LIMIT) {
    return null;
  }
  const seed = hashString32(`${interactionKey}|panda-reaction`);
  if (memory.npcReactionKeys.length > 0 && seed % 3 !== 0) return null;

  const familiar = PANDA_FAMILIAR_CULTURES.has(npcCharacter.nameCulture);
  const lines = familiar ? [
    "A panda? I know the animal, captain, but I never expected to see one serving aboard a ship.",
    "That is certainly a panda. How did a creature of the bamboo hills come to stand watch on your deck?",
    "A panda aboard a sailing ship? I recognize it, though I scarcely believe it."
  ] : [
    "Captain, what manner of black-and-white bear have you brought into my harbor?",
    "Does that strange bear earn its passage, or does it merely eat the provisions?",
    "I have seen many unlikely sailors, captain, but never one shaped quite like that."
  ];
  return Object.freeze({
    key: interactionKey,
    familiar,
    npcText: lines[seed % lines.length],
    pandaText: seed % 2 === 0 ? "Meee-eh!" : "Hrrmph."
  });
}

export function recordPandaNpcReaction(memory, interactionKey) {
  validatePandaCompanionMemory(memory);
  if (!pandaCompanionIsAboard(memory)) throw new Error("Cannot record a panda reaction without a panda aboard");
  if (memory.npcReactionKeys.includes(interactionKey)) {
    throw new Error(`Panda NPC reaction was already recorded: ${interactionKey}`);
  }
  if (memory.npcReactionKeys.length >= PANDA_REACTION_LIMIT) {
    throw new Error("Cannot record another panda NPC reaction");
  }
  memory.npcReactionKeys.push(interactionKey);
  return memory;
}

function hashString32(value) {
  let hash = 0x811c9dc5;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
