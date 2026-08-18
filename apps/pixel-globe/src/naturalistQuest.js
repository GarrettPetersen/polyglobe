import { ANIMAL_CATALOG_BY_ID, validateAnimalEncounterMemory } from "./animalEncounters.js";
import { validateCharacterBiography } from "./characterBiography.js";
import { validateCharacterSkillIds } from "./characterSkills.js";

export const NATURALIST_QUEST_MEMORY_VERSION = 2;
export const NATURALIST_REPORT_REWARD = 100;
export const NATURALIST_COMPLETION_REWARD = 1000;

export function naturalistQuestPresentation(view, buildEditionId = "full") {
  if (!view || !Number.isInteger(view.reportedCount) || view.reportedCount < 0 ||
      !Number.isInteger(view.totalCount) || view.totalCount <= 0 ||
      view.reportedCount > view.totalCount) {
    throw new Error("Naturalist presentation requires valid report progress");
  }
  if (buildEditionId === "full") {
    return Object.freeze({
      title: "THE GREAT BESTIARY",
      idleObjective: `DOCUMENT EXOTIC ANIMALS (${view.reportedCount}/${view.totalCount})`,
      reportSummary: `BESTIARY REPORTED ${view.reportedCount}/${view.totalCount}`,
      ongoingDialogue:
        `${view.reportedCount} of ${view.totalCount} creatures now have a place in my book. ` +
        "Keep watch whenever you make landfall.",
      completionLedgerLabel: "Completed the great bestiary",
      completionDialogue:
        "At last, the book is complete: not a cabinet of travelers' fables, but a bestiary " +
        "founded upon witnesses. Your name shall stand beside mine on its first page.",
      framesCompletion: true
    });
  }
  if (buildEditionId === "demo") {
    return Object.freeze({
      title: "MEDITERRANEAN NATURAL HISTORY",
      idleObjective:
        `DOCUMENT MEDITERRANEAN ANIMALS (${view.reportedCount}/${view.totalCount})`,
      reportSummary: `MEDITERRANEAN REPORTS ${view.reportedCount}/${view.totalCount}`,
      ongoingDialogue:
        `${view.reportedCount} of ${view.totalCount} creatures of these seas now have a place ` +
        "in my book. " +
        "Keep watch whenever you make landfall.",
      completionLedgerLabel: "Completed Mediterranean natural history",
      completionDialogue:
        "Splendid! You have recorded every creature in these waters. The full game opens distant " +
        "oceans and many blank pages in my book.",
      framesCompletion: true
    });
  }
  throw new Error(`Unknown naturalist presentation edition: ${buildEditionId}`);
}

export function createNaturalistQuestMemory() {
  return {
    version: NATURALIST_QUEST_MEMORY_VERSION,
    portTileId: null,
    character: null,
    met: false,
    reportedAnimalIds: [],
    completionRewarded: false
  };
}

export function validateNaturalistQuestMemory(memory) {
  if (!memory || memory.version !== NATURALIST_QUEST_MEMORY_VERSION) {
    throw new Error(`Unsupported naturalist quest memory: ${memory?.version ?? "missing"}`);
  }
  if (memory.portTileId !== null && !Number.isInteger(memory.portTileId)) {
    throw new Error(`Invalid naturalist port tile: ${memory.portTileId}`);
  }
  if (memory.character !== null) {
    validateNaturalistCharacter(memory.character, memory.portTileId);
  }
  if (typeof memory.met !== "boolean" || typeof memory.completionRewarded !== "boolean") {
    throw new Error("Naturalist quest flags must be booleans");
  }
  if (!Array.isArray(memory.reportedAnimalIds) ||
      new Set(memory.reportedAnimalIds).size !== memory.reportedAnimalIds.length) {
    throw new Error("Naturalist reports must be a unique list");
  }
  for (const animalId of memory.reportedAnimalIds) {
    if (!ANIMAL_CATALOG_BY_ID.has(animalId)) throw new Error(`Naturalist report names an unknown animal: ${animalId}`);
  }
  if (memory.completionRewarded && memory.reportedAnimalIds.length !== ANIMAL_CATALOG_BY_ID.size) {
    throw new Error("Naturalist completion reward was granted before the bestiary was complete");
  }
  return memory;
}

export function migrateNaturalistQuestMemory(memory) {
  if (!memory) return createNaturalistQuestMemory();
  if (memory.version === NATURALIST_QUEST_MEMORY_VERSION) {
    return validateNaturalistQuestMemory(memory);
  }
  if (memory.version !== 1) {
    throw new Error(`Unsupported naturalist quest memory: ${memory.version ?? "missing"}`);
  }
  return validateNaturalistQuestMemory({
    ...memory,
    version: NATURALIST_QUEST_MEMORY_VERSION,
    character: null
  });
}

export function naturalistQuestCharacter(memory) {
  validateNaturalistQuestMemory(memory);
  return memory.character;
}

export function setNaturalistQuestCharacter(memory, character) {
  if (!memory || memory.version !== NATURALIST_QUEST_MEMORY_VERSION) {
    throw new Error(`Unsupported naturalist quest memory: ${memory?.version ?? "missing"}`);
  }
  if (character !== null) validateNaturalistCharacter(character, memory.portTileId);
  memory.character = character;
  validateNaturalistQuestMemory(memory);
  return memory.character;
}

export function assignNaturalistPort(memory, ports, identityKey = "naturalist") {
  validateNaturalistQuestMemory(memory);
  if (memory.portTileId !== null) return memory.portTileId;
  if (!Array.isArray(ports) || ports.length === 0) throw new Error("Naturalist assignment requires ports");
  const candidates = ports.filter((port) => Number.isInteger(port.tileId) && port.country !== "Pirate");
  if (candidates.length === 0) throw new Error("Naturalist assignment found no suitable port");
  const index = hashString32(String(identityKey)) % candidates.length;
  memory.portTileId = candidates[index].tileId;
  return memory.portTileId;
}

export function naturalistQuestView(memory, animalMemory, {
  catalogAnimalIds = undefined
} = {}) {
  validateNaturalistQuestMemory(memory);
  validateAnimalEncounterMemory(animalMemory);
  const catalogIds = validatedNaturalistCatalogIds(catalogAnimalIds);
  const catalogIdSet = new Set(catalogIds);
  const reportedAnimalIds = memory.reportedAnimalIds.filter((id) => catalogIdSet.has(id));
  const unreportedAnimalIds = animalMemory.encounterOrder.filter((id) => (
    catalogIdSet.has(id) && !memory.reportedAnimalIds.includes(id)
  ));
  return Object.freeze({
    portTileId: memory.portTileId,
    met: memory.met,
    reportedCount: reportedAnimalIds.length,
    totalCount: catalogIds.length,
    unreportedAnimalIds: Object.freeze(unreportedAnimalIds),
    hasUnreportedAnimals: unreportedAnimalIds.length > 0,
    complete: reportedAnimalIds.length === catalogIds.length,
    completionRewarded: memory.completionRewarded
  });
}

export function naturalistShouldApproach(memory, animalMemory, cityTileId, {
  companionOfferAvailable = false,
  formerCompanionGreetingAvailable = false
} = {}) {
  if (typeof companionOfferAvailable !== "boolean") {
    throw new Error("Naturalist companion offer availability must be boolean");
  }
  if (typeof formerCompanionGreetingAvailable !== "boolean") {
    throw new Error("Former companion greeting availability must be boolean");
  }
  const view = naturalistQuestView(memory, animalMemory);
  return view.portTileId === cityTileId &&
    (!view.met || view.hasUnreportedAnimals || companionOfferAvailable || formerCompanionGreetingAvailable);
}

export function meetNaturalist(memory) {
  validateNaturalistQuestMemory(memory);
  if (memory.met) return false;
  memory.met = true;
  return true;
}

export function reportAnimalsToNaturalist(memory, animalMemory) {
  const before = naturalistQuestView(memory, animalMemory);
  if (!memory.met) throw new Error("Cannot report animals before meeting the naturalist");
  for (const animalId of before.unreportedAnimalIds) memory.reportedAnimalIds.push(animalId);
  const completedNow = memory.reportedAnimalIds.length === ANIMAL_CATALOG_BY_ID.size && !memory.completionRewarded;
  if (completedNow) memory.completionRewarded = true;
  const reward = before.unreportedAnimalIds.length * NATURALIST_REPORT_REWARD +
    (completedNow ? NATURALIST_COMPLETION_REWARD : 0);
  validateNaturalistQuestMemory(memory);
  return Object.freeze({
    animalIds: before.unreportedAnimalIds,
    reward,
    completedNow
  });
}

function hashString32(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function validatedNaturalistCatalogIds(catalogAnimalIds) {
  const ids = catalogAnimalIds === undefined
    ? [...ANIMAL_CATALOG_BY_ID.keys()]
    : catalogAnimalIds;
  if (!Array.isArray(ids) || ids.length === 0 || new Set(ids).size !== ids.length) {
    throw new Error("Naturalist catalog must be a nonempty unique animal list");
  }
  for (const animalId of ids) {
    if (!ANIMAL_CATALOG_BY_ID.has(animalId)) {
      throw new Error(`Naturalist catalog names an unknown animal: ${animalId}`);
    }
  }
  return ids;
}

function validateNaturalistCharacter(character, portTileId) {
  if (!Number.isInteger(portTileId)) {
    throw new Error("Naturalist character requires an assigned port");
  }
  validateCharacterBiography(character);
  validateCharacterSkillIds(character.skillIds);
  if (typeof character.id !== "string" || character.id.trim() === "") {
    throw new Error("Naturalist character requires an id");
  }
  if (typeof character.name !== "string" || character.name.trim() === "") {
    throw new Error("Naturalist character requires a name");
  }
  if (typeof character.sourceId !== "string" || character.sourceId.trim() === "") {
    throw new Error("Naturalist character requires a portrait source");
  }
  if (!Array.isArray(character.expressions) || character.expressions.length === 0) {
    throw new Error("Naturalist character requires portrait expressions");
  }
  if (character.role !== "natural-philosopher") {
    throw new Error(`Naturalist character has invalid role: ${character.role}`);
  }
  if (character.homePortTileId !== portTileId) {
    throw new Error("Naturalist character does not belong to the naturalist port");
  }
  return character;
}
