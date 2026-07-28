import { ANIMAL_CATALOG_BY_ID } from "./animalEncounters.js";

export const ANIMAL_COMPANION_MEMORY_VERSION = 1;
export const ANIMAL_COMPANION_UNMET = "unmet";
export const ANIMAL_COMPANION_PENDING = "pending";
export const ANIMAL_COMPANION_DECLINED = "declined";
export const ANIMAL_COMPANION_ABOARD = "aboard";
export const ANIMAL_COMPANION_WITH_NATURALIST = "with-naturalist";
export const ANIMAL_NATURALIST_OFFER_UNRESOLVED = "unresolved";
export const ANIMAL_NATURALIST_OFFER_DECLINED = "declined";
export const ANIMAL_NATURALIST_OFFER_ACCEPTED = "accepted";

const NPC_REACTION_LIMIT = 8;
const PANDA_FAMILIAR_CULTURES = new Set([
  "chinese",
  "japanese",
  "korean",
  "southAsian",
  "southeastAsian"
]);
const RACCOON_FAMILIAR_CULTURES = new Set(["nahua"]);

export const ANIMAL_COMPANION_CATALOG = Object.freeze([
  companion({
    id: "panda",
    name: "Panda",
    sex: "female",
    age: 7,
    homePortName: "Sichuan",
    nationalityAdjective: "Chinese",
    nameCulture: "chinese",
    goal: "Eat bamboo, avoid all work, and remain aboard",
    skillId: "panda-passenger",
    statusIcon: { src: "assets/misc/panda.png", width: 5, height: 9 },
    foodConsumers: 3,
    waterConsumers: 1,
    naturalistPayment: 1000,
    familiarCultures: PANDA_FAMILIAR_CULTURES,
    familiarNpcLines: [
      "A panda? I know the animal, captain, but I never expected to see one serving aboard a ship.",
      "That is certainly a panda. How did a creature of the bamboo hills come to stand watch on your deck?",
      "A panda aboard a sailing ship? I recognize it, though I scarcely believe it."
    ],
    unfamiliarNpcLines: [
      "Captain, what manner of black-and-white bear have you brought into my harbor?",
      "Does that strange bear earn its passage, or does it merely eat the provisions?",
      "I have seen many unlikely sailors, captain, but never one shaped quite like that."
    ],
    callTexts: ["Meee-eh!", "Hrrmph."],
    recruitPrompt: "The panda climbs into our boat and refuses to leave. Let it stay aboard?",
    acceptedCaptainText: "Very well. But I am not listing it as an able seaman.",
    rejectedCaptainText: "Back to the bamboo hills with you. A ship is no place for a bear.",
    naturalistIntro: "And this is the panda from your account? Aristotle never prepared me for a bear that eats all day and refuses every useful occupation.",
    naturalistReply: "Hrrmph.",
    naturalistOffer: "A decisive rebuttal! Leave the panda in my care and I shall pay you {payment} doubloons. Imagine the observations!",
    naturalistAccept: "Splendid! I shall provide bamboo, patience, and absolutely no employment. It should feel perfectly at home.",
    naturalistFarewell: "Take good care of it. It was a useless sailor, but a remarkably memorable one.",
    naturalistRejectAnimalText: "Hrrmph."
  }),
  companion({
    id: "raccoon",
    name: "Raccoon",
    sex: "male",
    age: 4,
    homePortName: "Eastern Woodlands",
    nationalityAdjective: "North American",
    nameCulture: "nahua",
    goal: "Inspect every barrel, steal one biscuit, and deny everything",
    skillId: "raccoon-passenger",
    statusIcon: { src: "assets/misc/raccoon.png", width: 3, height: 6 },
    foodConsumers: 1,
    waterConsumers: 1,
    naturalistPayment: 1000,
    familiarCultures: RACCOON_FAMILIAR_CULTURES,
    familiarNpcLines: [
      "A raccoon aboard? I know its kind, captain. Count every ration again after dark.",
      "That masked forager followed you onto a ship? Lock the meal chest and check the knots.",
      "I recognize the animal. I am less certain it recognizes your claim to the provisions."
    ],
    unfamiliarNpcLines: [
      "Captain, why is that masked little thief testing the latch on my strongbox?",
      "Your smallest passenger has washed a biscuit in my ink and appears pleased with the result.",
      "Is that creature part of the crew, or merely the most successful pirate aboard?",
      "Captain, that animal has emptied one pocket and is now examining the next."
    ],
    callTexts: ["Chrrr-chrrr!", "Krrrk!", "Chitter-chitter!"],
    recruitPrompt: "The raccoon scampers aboard with a biscuit in both paws, curls up behind the barrels, and refuses to leave. Let him stay aboard?",
    acceptedCaptainText: "Very well. Lock the larder, count the spoons, and do not call him an able seaman.",
    rejectedCaptainText: "Back ashore with you, masked rogue. We already have enough thieves at sea.",
    naturalistIntro: "So this is the masked forager from your account? Aristotle catalogued many thieves in nature, but none with hands so well suited to opening a biscuit chest.",
    naturalistReply: "Chrrr?",
    naturalistOffer: "A most dexterous subject. Leave the raccoon in my care and I shall pay you {payment} doubloons. I shall begin by purchasing stronger locks.",
    naturalistAccept: "Splendid! I shall observe its habits scientifically, beginning with where it hid my purse.",
    naturalistFarewell: "Take care of him. He contributed no labor, but he did keep every cupboard under inspection.",
    naturalistRejectAnimalText: "Krrrk!"
  }),
  companion({
    id: "penguin",
    name: "Penguin",
    sex: "male",
    age: 5,
    homePortName: "Southern Ice",
    nationalityAdjective: "Antarctic",
    nameCulture: "maritime",
    goal: "Eat the fish, inspect the deck, and go wherever the ship goes",
    skillId: "penguin-passenger",
    statusIcon: { src: "assets/misc/penguin.png", width: 3, height: 6 },
    foodConsumers: 0,
    waterConsumers: 1,
    requiredFoodGoodId: "fish",
    requiredFoodRationsPerDay: 2,
    naturalistPayment: 1000,
    familiarCultures: new Set(),
    familiarNpcLines: [],
    unfamiliarNpcLines: [
      "Captain, why is that very formal bird inspecting my quay?",
      "Does your small black-and-white officer always smell so strongly of fish?",
      "I have questions about the bird, captain, but it appears unwilling to answer them.",
      "Your bird has eaten a herring from my stall and now regards the entire port as its property."
    ],
    callTexts: ["Honk-hraaa!", "Honk!", "Hrrr-RAAH!"],
    recruitPrompt: "The penguin waddles up the gangplank, settles beside the fish, and refuses to go back ashore. Let him stay aboard?",
    acceptedCaptainText: "Very well. He may stay, but somebody keep him out of the fish barrel.",
    rejectedCaptainText: "Back to the rookery with you. The fish aboard already have enough enemies.",
    naturalistIntro: "And this solemn little passenger came from the southern ice? Aristotle wrote that some birds do not fly, but he neglected to mention their talent for commanding a deck.",
    naturalistReply: "Honk.",
    naturalistOffer: "Remarkable. Leave the penguin in my care and I shall pay you {payment} doubloons. I have fish, ink, and several questions he may decline to answer.",
    naturalistAccept: "Excellent! I shall build him a cold pool and keep the larder under lock. My next volume may require an entire chapter.",
    naturalistFarewell: "Look after him. He never hauled a line, but the deck will seem strangely empty without him.",
    naturalistRejectAnimalText: "Honk!"
  })
]);

export const ANIMAL_COMPANION_BY_ID = new Map(
  ANIMAL_COMPANION_CATALOG.map((entry) => [entry.id, entry])
);
if (ANIMAL_COMPANION_BY_ID.size !== ANIMAL_COMPANION_CATALOG.length) {
  throw new Error("Animal companion catalog contains duplicate ids");
}

const COMPANION_INTRODUCTIONS = new Map([
  ["panda|penguin|raccoon", Object.freeze([
    Object.freeze({
      companionId: "raccoon",
      listenerCompanionId: "panda",
      expressionId: "mischievous",
      message: "Chrrr?"
    }),
    Object.freeze({
      companionId: "panda",
      listenerCompanionId: "raccoon",
      expressionId: "angry",
      message: "Hrrmph!"
    }),
    Object.freeze({
      companionId: "raccoon",
      listenerCompanionId: "penguin",
      expressionId: "surprised",
      message: "Chrr?"
    }),
    Object.freeze({
      companionId: "penguin",
      listenerCompanionId: "raccoon",
      expressionId: "angry",
      message: "HONK!"
    }),
    Object.freeze({
      companionId: "panda",
      listenerCompanionId: "penguin",
      expressionId: "amused",
      message: "Hrrmph."
    }),
    Object.freeze({
      companionId: "penguin",
      listenerCompanionId: "panda",
      expressionId: "amused",
      message: "Honk."
    })
  ])],
  ["panda|penguin", Object.freeze([
    Object.freeze({
      companionId: "panda",
      listenerCompanionId: "penguin",
      expressionId: "surprised",
      message: "Meee-eh?"
    }),
    Object.freeze({
      companionId: "penguin",
      listenerCompanionId: "panda",
      expressionId: "surprised",
      message: "HONK!"
    }),
    Object.freeze({
      companionId: "panda",
      listenerCompanionId: "penguin",
      expressionId: "amused",
      message: "Hrrmph."
    }),
    Object.freeze({
      companionId: "penguin",
      listenerCompanionId: "panda",
      expressionId: "amused",
      message: "Honk."
    })
  ])],
  ["panda|raccoon", Object.freeze([
    Object.freeze({
      companionId: "raccoon",
      listenerCompanionId: "panda",
      expressionId: "mischievous",
      message: "Chrrr-chrrr?"
    }),
    Object.freeze({
      companionId: "panda",
      listenerCompanionId: "raccoon",
      expressionId: "angry",
      message: "Hrrmph!"
    }),
    Object.freeze({
      companionId: "raccoon",
      listenerCompanionId: "panda",
      expressionId: "amused",
      message: "Krrrk."
    }),
    Object.freeze({
      companionId: "panda",
      listenerCompanionId: "raccoon",
      expressionId: "amused",
      message: "Hrrmph."
    })
  ])],
  ["penguin|raccoon", Object.freeze([
    Object.freeze({
      companionId: "raccoon",
      listenerCompanionId: "penguin",
      expressionId: "mischievous",
      message: "Chrrr?"
    }),
    Object.freeze({
      companionId: "penguin",
      listenerCompanionId: "raccoon",
      expressionId: "angry",
      message: "HONK!"
    }),
    Object.freeze({
      companionId: "raccoon",
      listenerCompanionId: "penguin",
      expressionId: "surprised",
      message: "Krrrk?"
    }),
    Object.freeze({
      companionId: "penguin",
      listenerCompanionId: "raccoon",
      expressionId: "amused",
      message: "Honk."
    })
  ])]
]);
for (const [key, steps] of COMPANION_INTRODUCTIONS) {
  const participantIds = key.split("|");
  if (participantIds.length < 2 || new Set(participantIds).size !== participantIds.length ||
      participantIds.some((id) => !ANIMAL_COMPANION_BY_ID.has(id))) {
    throw new Error(`Animal companion introduction has invalid participants: ${key}`);
  }
  for (const step of steps) {
    if (!participantIds.includes(step.companionId) ||
        !participantIds.includes(step.listenerCompanionId) ||
        step.companionId === step.listenerCompanionId) {
      throw new Error(`Animal companion introduction has an invalid exchange: ${key}`);
    }
    const expressions = ANIMAL_CATALOG_BY_ID.get(step.companionId).expressions;
    if (!expressions.some(({ id }) => id === step.expressionId)) {
      throw new Error(`Animal introduction requests missing ${step.companionId} expression: ${step.expressionId}`);
    }
  }
}

export function createAnimalCompanionMemory() {
  return {
    version: ANIMAL_COMPANION_MEMORY_VERSION,
    byId: Object.fromEntries(ANIMAL_COMPANION_CATALOG.map(({ id }) => [id, createCompanionState()])),
    introductionKeys: []
  };
}

export function migrateAnimalCompanionMemory(memory, { legacyPanda = null } = {}) {
  if (memory) {
    if (memory.version !== ANIMAL_COMPANION_MEMORY_VERSION) {
      throw new Error(`Cannot migrate animal companion memory version: ${memory.version ?? "missing"}`);
    }
    const migrated = createAnimalCompanionMemory();
    for (const id of Object.keys(migrated.byId)) {
      if (memory.byId?.[id]) migrated.byId[id] = migrateCompanionState(memory.byId[id]);
    }
    migrated.introductionKeys = Array.isArray(memory.introductionKeys)
      ? [...memory.introductionKeys]
      : [];
    return validateAnimalCompanionMemory(migrated);
  }
  const migrated = createAnimalCompanionMemory();
  if (legacyPanda) migrated.byId.panda = migrateLegacyPandaState(legacyPanda);
  return validateAnimalCompanionMemory(migrated);
}

export function validateAnimalCompanionMemory(memory) {
  if (!memory || memory.version !== ANIMAL_COMPANION_MEMORY_VERSION) {
    throw new Error(`Unsupported animal companion memory: ${memory?.version ?? "missing"}`);
  }
  if (!memory.byId || typeof memory.byId !== "object" || Array.isArray(memory.byId)) {
    throw new Error("Animal companion memory requires a companion table");
  }
  const ids = Object.keys(memory.byId);
  if (ids.length !== ANIMAL_COMPANION_CATALOG.length ||
      ids.some((id) => !ANIMAL_COMPANION_BY_ID.has(id))) {
    throw new Error("Animal companion memory does not match the companion catalog");
  }
  for (const id of ids) validateCompanionState(memory.byId[id], id);
  if (!Array.isArray(memory.introductionKeys) ||
      memory.introductionKeys.some((key) => typeof key !== "string" || !COMPANION_INTRODUCTIONS.has(key)) ||
      new Set(memory.introductionKeys).size !== memory.introductionKeys.length) {
    throw new Error("Animal companion introductions are invalid");
  }
  return memory;
}

export function beginAnimalCompanionRecruitment(memory, companionId) {
  const state = companionState(memory, companionId);
  if (state.status !== ANIMAL_COMPANION_UNMET) {
    throw new Error(`Cannot begin ${companionId} recruitment from ${state.status}`);
  }
  state.status = ANIMAL_COMPANION_PENDING;
  return memory;
}

export function acceptAnimalCompanion(memory, companionId, currentMinute) {
  const state = companionState(memory, companionId);
  if (state.status !== ANIMAL_COMPANION_PENDING) {
    throw new Error(`Cannot accept ${companionId} companion from ${state.status}`);
  }
  if (!Number.isFinite(currentMinute) || currentMinute < 0) {
    throw new Error(`Invalid ${companionId} joining minute: ${currentMinute}`);
  }
  state.status = ANIMAL_COMPANION_ABOARD;
  state.joinedMinute = Math.floor(currentMinute);
  return memory;
}

export function declineAnimalCompanion(memory, companionId) {
  const state = companionState(memory, companionId);
  if (state.status !== ANIMAL_COMPANION_PENDING) {
    throw new Error(`Cannot decline ${companionId} companion from ${state.status}`);
  }
  state.status = ANIMAL_COMPANION_DECLINED;
  return memory;
}

export function animalCompanionIsAboard(memory, companionId) {
  return companionState(memory, companionId).status === ANIMAL_COMPANION_ABOARD;
}

export function animalCompanionRecruitmentIsPending(memory, companionId) {
  return companionState(memory, companionId).status === ANIMAL_COMPANION_PENDING;
}

export function pendingAnimalCompanionRecruitmentId(memory) {
  validateAnimalCompanionMemory(memory);
  return ANIMAL_COMPANION_CATALOG.find(({ id }) => (
    memory.byId[id].status === ANIMAL_COMPANION_PENDING
  ))?.id || null;
}

export function aboardAnimalCompanionIds(memory) {
  validateAnimalCompanionMemory(memory);
  return Object.freeze(ANIMAL_COMPANION_CATALOG
    .filter(({ id }) => memory.byId[id].status === ANIMAL_COMPANION_ABOARD)
    .map(({ id }) => id));
}

export function animalNaturalistOfferIsAvailable(memory, companionId) {
  const state = companionState(memory, companionId);
  return state.status === ANIMAL_COMPANION_ABOARD &&
    state.naturalistOffer === ANIMAL_NATURALIST_OFFER_UNRESOLVED;
}

export function availableAnimalNaturalistOfferIds(memory) {
  validateAnimalCompanionMemory(memory);
  return Object.freeze(ANIMAL_COMPANION_CATALOG
    .filter(({ id }) => animalNaturalistOfferIsAvailable(memory, id))
    .map(({ id }) => id));
}

export function declineAnimalNaturalistOffer(memory, companionId) {
  if (!animalNaturalistOfferIsAvailable(memory, companionId)) {
    throw new Error(`Cannot decline an unavailable ${companionId} naturalist offer`);
  }
  memory.byId[companionId].naturalistOffer = ANIMAL_NATURALIST_OFFER_DECLINED;
  return validateAnimalCompanionMemory(memory);
}

export function placeAnimalWithNaturalist(memory, companionId) {
  if (!animalNaturalistOfferIsAvailable(memory, companionId)) {
    throw new Error(`Cannot place ${companionId} with the naturalist without an available offer`);
  }
  const state = memory.byId[companionId];
  state.status = ANIMAL_COMPANION_WITH_NATURALIST;
  state.naturalistOffer = ANIMAL_NATURALIST_OFFER_ACCEPTED;
  return validateAnimalCompanionMemory(memory);
}

export function animalCompanionConsumption(memory) {
  const aboardIds = aboardAnimalCompanionIds(memory);
  const aboard = aboardIds.map((id) => ANIMAL_COMPANION_BY_ID.get(id));
  return Object.freeze({
    companionIds: aboardIds,
    foodConsumers: aboard.reduce((total, entry) => total + entry.foodConsumers, 0),
    waterConsumers: aboard.reduce((total, entry) => total + entry.waterConsumers, 0),
    restrictedFood: Object.freeze(aboard
      .filter((entry) => entry.requiredFoodGoodId)
      .map((entry) => Object.freeze({
        companionId: entry.id,
        goodId: entry.requiredFoodGoodId,
        rationsPerDay: entry.requiredFoodRationsPerDay
      })))
  });
}

export function animalCompanionCharacter(companionId) {
  const entry = requiredCompanion(companionId);
  const animal = ANIMAL_CATALOG_BY_ID.get(entry.animalId);
  if (!animal) throw new Error(`${entry.name} animal entry is missing`);
  return Object.freeze({
    id: `companion:${entry.id}`,
    name: entry.name,
    role: "ship-animal-companion",
    companionId: entry.id,
    sex: entry.sex,
    age: entry.age,
    nameCulture: entry.nameCulture,
    nationalityAdjective: entry.nationalityAdjective,
    homePortName: entry.homePortName,
    skillIds: Object.freeze([entry.skillId]),
    goal: Object.freeze({ text: entry.goal }),
    expressions: animal.expressions
  });
}

export function animalCompanionNpcReaction(memory, companionId, interactionKey, npcCharacter) {
  const entry = requiredCompanion(companionId);
  const state = companionState(memory, companionId);
  if (state.status !== ANIMAL_COMPANION_ABOARD) return null;
  if (typeof interactionKey !== "string" || interactionKey.trim() === "") {
    throw new Error(`${entry.name} NPC reaction requires an interaction key`);
  }
  if (!npcCharacter || typeof npcCharacter !== "object" || !npcCharacter.name) {
    throw new Error(`${entry.name} NPC reaction requires a named character`);
  }
  if (state.npcReactionKeys.includes(interactionKey) || state.npcReactionKeys.length >= NPC_REACTION_LIMIT) {
    return null;
  }
  const seed = hashString32(`${interactionKey}|${companionId}-reaction`);
  if (state.npcReactionKeys.length > 0 && seed % 3 !== 0) return null;
  const familiar = entry.familiarCultures.has(npcCharacter.nameCulture);
  const lines = familiar ? entry.familiarNpcLines : entry.unfamiliarNpcLines;
  return Object.freeze({
    key: interactionKey,
    companionId,
    familiar,
    npcText: lines[seed % lines.length],
    animalText: entry.callTexts[seed % entry.callTexts.length]
  });
}

export function firstAnimalCompanionNpcReaction(memory, interactionKey, npcCharacter) {
  for (const companionId of aboardAnimalCompanionIds(memory)) {
    const reaction = animalCompanionNpcReaction(memory, companionId, interactionKey, npcCharacter);
    if (reaction) return reaction;
  }
  return null;
}

export function recordAnimalCompanionNpcReaction(memory, companionId, interactionKey) {
  const state = companionState(memory, companionId);
  if (state.status !== ANIMAL_COMPANION_ABOARD) {
    throw new Error(`Cannot record a ${companionId} reaction without that companion aboard`);
  }
  if (state.npcReactionKeys.includes(interactionKey)) {
    throw new Error(`${companionId} NPC reaction was already recorded: ${interactionKey}`);
  }
  if (state.npcReactionKeys.length >= NPC_REACTION_LIMIT) {
    throw new Error(`Cannot record another ${companionId} NPC reaction`);
  }
  state.npcReactionKeys.push(interactionKey);
  return memory;
}

export function pendingAnimalCompanionIntroduction(memory) {
  const aboard = new Set(aboardAnimalCompanionIds(memory));
  for (const [key, steps] of COMPANION_INTRODUCTIONS) {
    if (memory.introductionKeys.includes(key)) continue;
    if (key.split("|").every((id) => aboard.has(id))) return Object.freeze({ key, steps });
  }
  return null;
}

export function recordAnimalCompanionIntroduction(memory, key) {
  validateAnimalCompanionMemory(memory);
  if (!COMPANION_INTRODUCTIONS.has(key)) throw new Error(`Unknown animal companion introduction: ${key}`);
  if (memory.introductionKeys.includes(key)) {
    throw new Error(`Animal companion introduction was already recorded: ${key}`);
  }
  const introducedIds = new Set(key.split("|"));
  for (const knownKey of COMPANION_INTRODUCTIONS.keys()) {
    if (memory.introductionKeys.includes(knownKey)) continue;
    if (knownKey.split("|").every((id) => introducedIds.has(id))) {
      memory.introductionKeys.push(knownKey);
    }
  }
  return validateAnimalCompanionMemory(memory);
}

export function animalCompanionState(memory, companionId) {
  return companionState(memory, companionId);
}

function companion(options) {
  const {
    id,
    name,
    sex,
    age,
    homePortName,
    nationalityAdjective,
    nameCulture,
    goal,
    skillId,
    statusIcon,
    foodConsumers,
    waterConsumers,
    requiredFoodGoodId = null,
    requiredFoodRationsPerDay = 0,
    naturalistPayment,
    familiarCultures,
    familiarNpcLines,
    unfamiliarNpcLines,
    callTexts,
    recruitPrompt,
    acceptedCaptainText,
    rejectedCaptainText,
    naturalistIntro,
    naturalistReply,
    naturalistOffer,
    naturalistAccept,
    naturalistFarewell,
    naturalistRejectAnimalText
  } = options;
  if (!ANIMAL_CATALOG_BY_ID.has(id)) throw new Error(`Animal companion has no animal entry: ${id}`);
  if (typeof skillId !== "string" || skillId.trim() === "") {
    throw new Error(`Animal companion has no character skill: ${id}`);
  }
  if (!statusIcon || typeof statusIcon.src !== "string" ||
      !Number.isInteger(statusIcon.width) || statusIcon.width <= 0 ||
      !Number.isInteger(statusIcon.height) || statusIcon.height <= 0) {
    throw new Error(`Animal companion has an invalid status icon: ${id}`);
  }
  return Object.freeze({
    id,
    animalId: id,
    name,
    sex,
    age,
    homePortName,
    nationalityAdjective,
    nameCulture,
    goal,
    skillId,
    statusIcon: Object.freeze(statusIcon),
    foodConsumers,
    waterConsumers,
    requiredFoodGoodId,
    requiredFoodRationsPerDay,
    naturalistPayment,
    familiarCultures,
    familiarNpcLines: Object.freeze(familiarNpcLines),
    unfamiliarNpcLines: Object.freeze(unfamiliarNpcLines),
    callTexts: Object.freeze(callTexts),
    recruitPrompt,
    acceptedCaptainText,
    rejectedCaptainText,
    naturalistIntro,
    naturalistReply,
    naturalistOffer,
    naturalistAccept,
    naturalistFarewell,
    naturalistRejectAnimalText
  });
}

function createCompanionState() {
  return {
    status: ANIMAL_COMPANION_UNMET,
    joinedMinute: null,
    naturalistOffer: ANIMAL_NATURALIST_OFFER_UNRESOLVED,
    npcReactionKeys: [],
    restrictedFoodRationDebt: 0
  };
}

function migrateCompanionState(state) {
  return {
    ...state,
    naturalistOffer: state.naturalistOffer ?? ANIMAL_NATURALIST_OFFER_UNRESOLVED,
    npcReactionKeys: Array.isArray(state.npcReactionKeys) ? [...state.npcReactionKeys] : [],
    restrictedFoodRationDebt: Number.isFinite(state.restrictedFoodRationDebt)
      ? state.restrictedFoodRationDebt
      : 0
  };
}

function migrateLegacyPandaState(memory) {
  if (!memory || ![1, 2].includes(memory.version)) {
    throw new Error(`Cannot migrate panda companion memory version: ${memory?.version ?? "missing"}`);
  }
  return migrateCompanionState({
    status: memory.status,
    joinedMinute: memory.joinedMinute,
    naturalistOffer: memory.version === 2
      ? memory.naturalistOffer
      : ANIMAL_NATURALIST_OFFER_UNRESOLVED,
    npcReactionKeys: memory.npcReactionKeys
  });
}

function validateCompanionState(state, companionId) {
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new Error(`Invalid ${companionId} companion state`);
  }
  if (![ANIMAL_COMPANION_UNMET, ANIMAL_COMPANION_PENDING, ANIMAL_COMPANION_DECLINED,
    ANIMAL_COMPANION_ABOARD, ANIMAL_COMPANION_WITH_NATURALIST].includes(state.status)) {
    throw new Error(`Invalid ${companionId} companion status: ${state.status}`);
  }
  if (state.status === ANIMAL_COMPANION_ABOARD || state.status === ANIMAL_COMPANION_WITH_NATURALIST) {
    if (!Number.isFinite(state.joinedMinute) || state.joinedMinute < 0) {
      throw new Error(`Invalid ${companionId} joining minute: ${state.joinedMinute}`);
    }
  } else if (state.joinedMinute !== null) {
    throw new Error(`${companionId} joining minute exists before acceptance: ${state.joinedMinute}`);
  }
  if (![ANIMAL_NATURALIST_OFFER_UNRESOLVED, ANIMAL_NATURALIST_OFFER_DECLINED,
    ANIMAL_NATURALIST_OFFER_ACCEPTED].includes(state.naturalistOffer)) {
    throw new Error(`Invalid ${companionId} naturalist offer: ${state.naturalistOffer}`);
  }
  if (state.status === ANIMAL_COMPANION_WITH_NATURALIST &&
      state.naturalistOffer !== ANIMAL_NATURALIST_OFFER_ACCEPTED) {
    throw new Error(`${companionId} living with the naturalist requires an accepted offer`);
  }
  if (state.status !== ANIMAL_COMPANION_WITH_NATURALIST &&
      state.naturalistOffer === ANIMAL_NATURALIST_OFFER_ACCEPTED) {
    throw new Error(`Accepted ${companionId} naturalist offer requires naturalist custody`);
  }
  if (state.status !== ANIMAL_COMPANION_ABOARD && state.status !== ANIMAL_COMPANION_WITH_NATURALIST &&
      state.naturalistOffer !== ANIMAL_NATURALIST_OFFER_UNRESOLVED) {
    throw new Error(`${companionId} naturalist offer cannot be ${state.naturalistOffer} while ${state.status}`);
  }
  if (!Array.isArray(state.npcReactionKeys) ||
      state.npcReactionKeys.some((key) => typeof key !== "string" || key.trim() === "")) {
    throw new Error(`${companionId} NPC reaction keys must be non-empty strings`);
  }
  if (new Set(state.npcReactionKeys).size !== state.npcReactionKeys.length) {
    throw new Error(`${companionId} NPC reaction keys contain duplicates`);
  }
  if (state.npcReactionKeys.length > NPC_REACTION_LIMIT) {
    throw new Error(`${companionId} NPC reactions exceed their limit: ${state.npcReactionKeys.length}`);
  }
  if (!Number.isFinite(state.restrictedFoodRationDebt) ||
      state.restrictedFoodRationDebt < 0 || state.restrictedFoodRationDebt >= 1) {
    throw new Error(`Invalid ${companionId} restricted food debt: ${state.restrictedFoodRationDebt}`);
  }
  return state;
}

function companionState(memory, companionId) {
  validateAnimalCompanionMemory(memory);
  requiredCompanion(companionId);
  return memory.byId[companionId];
}

function requiredCompanion(companionId) {
  const entry = ANIMAL_COMPANION_BY_ID.get(companionId);
  if (!entry) throw new Error(`Unknown animal companion: ${companionId}`);
  return entry;
}

function hashString32(value) {
  let hash = 0x811c9dc5;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
