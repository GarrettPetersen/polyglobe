import { requireEntityId } from "./entityIds.js";

export const QUEST_ITINERARY_VERSION = 3;
export const QUEST_ITINERARY_ORDERED = "ordered";
export const QUEST_ITINERARY_OPEN = "open";

const QUEST_ITINERARY_MODES = new Set([
  QUEST_ITINERARY_ORDERED,
  QUEST_ITINERARY_OPEN
]);

export function createQuestItinerary(stops, {
  mode = QUEST_ITINERARY_ORDERED,
  openingStopCityId = null,
  completedCityIds = []
} = {}) {
  validateStops(stops);
  if (!QUEST_ITINERARY_MODES.has(mode)) {
    throw new Error(`Unsupported quest itinerary mode: ${mode}`);
  }
  if (mode === QUEST_ITINERARY_ORDERED && openingStopCityId !== null) {
    throw new Error("Ordered quest itineraries cannot define an opening stop");
  }
  if (openingStopCityId !== null && !stops.some((stop) => stop.cityId === openingStopCityId)) {
    throw new Error(`Quest itinerary opening stop is absent: ${openingStopCityId}`);
  }
  const itinerary = {
    version: QUEST_ITINERARY_VERSION,
    mode,
    openingStopCityId,
    stops: stops.map((stop) => ({ ...stop })),
    completedCityIds: [...completedCityIds]
  };
  return validateQuestItinerary(itinerary);
}

export function migrateQuestItinerary(quest) {
  if (!quest || typeof quest !== "object") return quest;
  if (quest.itinerary) {
    if (quest.itinerary.version === QUEST_ITINERARY_VERSION) {
      validateQuestItinerary(quest.itinerary);
    } else {
      validateLegacyQuestItinerary(quest.itinerary);
    }
    return quest;
  }

  if (quest.openItinerary) {
    const legacy = validateLegacyOpenQuestItinerary(quest.openItinerary);
    quest.itinerary = { ...legacy, mode: QUEST_ITINERARY_OPEN };
  } else if (Array.isArray(quest.religiousItinerary)) {
    const completedCount = quest.religiousAuthorityAppliedLegCount ??
      quest.religiousDeliveryLegIndex ?? 0;
    if (!Number.isInteger(completedCount) || completedCount < 0 ||
        completedCount > quest.religiousItinerary.length) {
      throw new Error(`Invalid legacy religious itinerary progress: ${completedCount}`);
    }
    quest.itinerary = {
      version: 2,
      mode: QUEST_ITINERARY_ORDERED,
      openingStopTileId: null,
      stops: quest.religiousItinerary.map((stop) => ({ ...stop })),
      completedTileIds: quest.religiousItinerary.slice(0, completedCount).map((stop) => stop.tileId)
    };
    validateLegacyQuestItinerary(quest.itinerary);
  } else if (Array.isArray(quest.eastAsianItinerary)) {
    quest.itinerary = {
      version: 2,
      mode: QUEST_ITINERARY_OPEN,
      openingStopTileId: quest.eastAsianItinerary[0]?.tileId ?? null,
      stops: quest.eastAsianItinerary.map((stop) => ({ ...stop })),
      completedTileIds: []
    };
    validateLegacyQuestItinerary(quest.itinerary);
  }

  delete quest.openItinerary;
  delete quest.religiousItinerary;
  delete quest.religiousDeliveryLegIndex;
  delete quest.religiousAuthorityAppliedLegCount;
  delete quest.eastAsianItinerary;
  delete quest.eastAsianDeliveryLegIndex;
  delete quest.eastAsianAppliedLegCount;
  return quest;
}

export function questDestinationStops(quest) {
  if (!quest) return [];
  if (!quest.itinerary) {
    if (!Number.isInteger(quest.destinationTileId)) return [];
    return [Object.freeze({
      key: quest.destinationKey || null,
      cityId: quest.destinationCityId || null,
      tileId: quest.destinationTileId,
      name: quest.destinationName || "",
      country: quest.destinationCountry || ""
    })];
  }
  if (quest.itinerary.version !== QUEST_ITINERARY_VERSION) {
    return legacyQuestDestinationStops(quest.itinerary);
  }
  const itinerary = validateQuestItinerary(quest.itinerary);
  const completed = new Set(itinerary.completedCityIds);
  const remaining = itinerary.stops.filter((stop) => !completed.has(stop.cityId));
  if (itinerary.mode === QUEST_ITINERARY_ORDERED) return remaining.slice(0, 1);
  if (itinerary.openingStopCityId !== null && !completed.has(itinerary.openingStopCityId)) {
    return remaining.filter((stop) => stop.cityId === itinerary.openingStopCityId);
  }
  return remaining;
}

export function questHasDestination(quest, cityOrCityId) {
  const cityId = typeof cityOrCityId === "string" ? cityOrCityId : cityOrCityId?.cityId;
  if (typeof cityId !== "string" || cityId === "") return false;
  return questDestinationStops(quest).some((stop) => stop.cityId === cityId);
}

export function completeQuestItineraryStop(quest, cityOrCityId) {
  if (!quest?.itinerary) throw new Error("Quest has no itinerary");
  const itinerary = validateQuestItinerary(quest.itinerary);
  const cityId = typeof cityOrCityId === "string" ? cityOrCityId : cityOrCityId?.cityId;
  requireEntityId(cityId, "Quest itinerary completion city");
  const available = questDestinationStops(quest);
  const stop = available.find((entry) => entry.cityId === cityId);
  if (!stop) throw new Error(`Quest itinerary stop is not currently available: ${cityId}`);

  itinerary.completedCityIds.push(cityId);
  const remainingStops = questDestinationStops(quest);
  const next = remainingStops[0] || stop;
  quest.destinationKey = next.key;
  quest.destinationCityId = next.cityId;
  quest.destinationTileId = next.tileId;
  quest.destinationName = next.name;
  quest.destinationCountry = next.country;
  return Object.freeze({
    stop,
    stepNumber: itinerary.completedCityIds.length,
    stepCount: itinerary.stops.length,
    final: remainingStops.length === 0,
    remainingStops: Object.freeze([...remainingStops])
  });
}

export function validateQuestItinerary(itinerary) {
  if (itinerary?.version === 1 || itinerary?.version === 2) {
    return validateLegacyQuestItinerary(itinerary);
  }
  if (!itinerary || itinerary.version !== QUEST_ITINERARY_VERSION) {
    throw new Error(`Unsupported quest itinerary version: ${itinerary?.version}`);
  }
  if (!QUEST_ITINERARY_MODES.has(itinerary.mode)) {
    throw new Error(`Unsupported quest itinerary mode: ${itinerary.mode}`);
  }
  validateStops(itinerary.stops);
  if (!Array.isArray(itinerary.completedCityIds)) {
    throw new Error("Quest itinerary completed stops are missing");
  }
  const stopIds = new Set(itinerary.stops.map((stop) => stop.cityId));
  const completedIds = new Set();
  for (const cityId of itinerary.completedCityIds) {
    if (typeof cityId !== "string" || !stopIds.has(cityId)) {
      throw new Error(`Quest itinerary completed stop is invalid: ${cityId}`);
    }
    if (completedIds.has(cityId)) throw new Error(`Quest itinerary stop completed twice: ${cityId}`);
    completedIds.add(cityId);
  }
  if (itinerary.mode === QUEST_ITINERARY_ORDERED) {
    const expected = itinerary.stops
      .slice(0, itinerary.completedCityIds.length)
      .map((stop) => stop.cityId);
    if (expected.some((cityId, index) => itinerary.completedCityIds[index] !== cityId)) {
      throw new Error("Ordered quest itinerary completed stops are out of sequence");
    }
    if (itinerary.openingStopCityId !== null) {
      throw new Error("Ordered quest itinerary cannot define an opening stop");
    }
  } else if (itinerary.openingStopCityId !== null && !stopIds.has(itinerary.openingStopCityId)) {
    throw new Error(`Quest itinerary opening stop is absent: ${itinerary.openingStopCityId}`);
  }
  return itinerary;
}

function validateLegacyOpenQuestItinerary(itinerary) {
  if (!itinerary || itinerary.version !== 1) {
    throw new Error(`Unsupported legacy quest itinerary version: ${itinerary?.version}`);
  }
  validateStops(itinerary.stops, { legacy: true });
  if (!Array.isArray(itinerary.completedTileIds)) {
    throw new Error("Legacy quest itinerary completed stops are missing");
  }
  const stopIds = new Set(itinerary.stops.map((stop) => stop.tileId));
  const completed = new Set();
  for (const tileId of itinerary.completedTileIds) {
    if (!Number.isInteger(tileId) || !stopIds.has(tileId) || completed.has(tileId)) {
      throw new Error(`Legacy quest itinerary completed stop is invalid: ${tileId}`);
    }
    completed.add(tileId);
  }
  if (itinerary.openingStopTileId !== null && !stopIds.has(itinerary.openingStopTileId)) {
    throw new Error(`Legacy quest itinerary opening stop is absent: ${itinerary.openingStopTileId}`);
  }
  return itinerary;
}

function validateLegacyQuestItinerary(itinerary) {
  if (itinerary?.version === 1) return validateLegacyOpenQuestItinerary(itinerary);
  if (!itinerary || itinerary.version !== 2) {
    throw new Error(`Unsupported legacy quest itinerary version: ${itinerary?.version}`);
  }
  validateStops(itinerary.stops, { legacy: true });
  if (!Array.isArray(itinerary.completedTileIds)) {
    throw new Error("Legacy quest itinerary completed stops are missing");
  }
  const stopIds = new Set(itinerary.stops.map((stop) => stop.tileId));
  for (const tileId of itinerary.completedTileIds) {
    if (!Number.isInteger(tileId) || !stopIds.has(tileId)) {
      throw new Error(`Legacy quest itinerary completed stop is invalid: ${tileId}`);
    }
  }
  return itinerary;
}

function legacyQuestDestinationStops(itinerary) {
  const legacy = validateLegacyQuestItinerary(itinerary);
  const completed = new Set(legacy.completedTileIds);
  const remaining = legacy.stops.filter((stop) => !completed.has(stop.tileId));
  if (legacy.mode === QUEST_ITINERARY_ORDERED) return remaining.slice(0, 1);
  if (legacy.openingStopTileId !== null && !completed.has(legacy.openingStopTileId)) {
    return remaining.filter((stop) => stop.tileId === legacy.openingStopTileId);
  }
  return remaining;
}

function validateStops(stops, { legacy = false } = {}) {
  if (!Array.isArray(stops) || stops.length === 0) throw new Error("Quest itinerary needs at least one stop");
  const ids = new Set();
  for (const stop of stops) {
    if (!stop || (!legacy && typeof stop.cityId !== "string") ||
        !Number.isInteger(stop.tileId) || typeof stop.name !== "string" || stop.name === "") {
      throw new Error("Quest itinerary contains an invalid stop");
    }
    const identity = legacy ? stop.tileId : stop.cityId;
    if (ids.has(identity)) throw new Error(`Quest itinerary repeats stop: ${identity}`);
    ids.add(identity);
  }
}
