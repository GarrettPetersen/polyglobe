import { ANIMAL_CATALOG_BY_ID, validateAnimalEncounterMemory } from "./animalEncounters.js";

export const NATURALIST_QUEST_MEMORY_VERSION = 1;
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
      framesCompletion: true
    });
  }
  if (buildEditionId === "demo") {
    return Object.freeze({
      title: "NATURAL HISTORY",
      idleObjective: "DOCUMENT EXOTIC ANIMALS",
      reportSummary: `NATURALIST REPORTS RECORDED ${view.reportedCount}`,
      ongoingDialogue:
        "Every honest account adds another page to my book. " +
        "Keep watch whenever you make landfall.",
      framesCompletion: false
    });
  }
  throw new Error(`Unknown naturalist presentation edition: ${buildEditionId}`);
}

export function createNaturalistQuestMemory() {
  return {
    version: NATURALIST_QUEST_MEMORY_VERSION,
    portTileId: null,
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

export function naturalistQuestView(memory, animalMemory) {
  validateNaturalistQuestMemory(memory);
  validateAnimalEncounterMemory(animalMemory);
  const unreportedAnimalIds = animalMemory.encounterOrder.filter((id) => !memory.reportedAnimalIds.includes(id));
  return Object.freeze({
    portTileId: memory.portTileId,
    met: memory.met,
    reportedCount: memory.reportedAnimalIds.length,
    totalCount: ANIMAL_CATALOG_BY_ID.size,
    unreportedAnimalIds: Object.freeze(unreportedAnimalIds),
    hasUnreportedAnimals: unreportedAnimalIds.length > 0,
    complete: memory.reportedAnimalIds.length === ANIMAL_CATALOG_BY_ID.size,
    completionRewarded: memory.completionRewarded
  });
}

export function naturalistShouldApproach(memory, animalMemory, cityTileId, {
  companionOfferAvailable = false
} = {}) {
  if (typeof companionOfferAvailable !== "boolean") {
    throw new Error("Naturalist companion offer availability must be boolean");
  }
  const view = naturalistQuestView(memory, animalMemory);
  return view.portTileId === cityTileId &&
    (!view.met || view.hasUnreportedAnimals || companionOfferAvailable);
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
