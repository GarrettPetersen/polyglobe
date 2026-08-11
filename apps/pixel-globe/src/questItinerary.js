export const QUEST_ITINERARY_VERSION = 2;
export const QUEST_ITINERARY_ORDERED = "ordered";
export const QUEST_ITINERARY_OPEN = "open";

const QUEST_ITINERARY_MODES = new Set([
  QUEST_ITINERARY_ORDERED,
  QUEST_ITINERARY_OPEN
]);

export function createQuestItinerary(stops, {
  mode = QUEST_ITINERARY_ORDERED,
  openingStopTileId = null,
  completedTileIds = []
} = {}) {
  validateStops(stops);
  if (!QUEST_ITINERARY_MODES.has(mode)) {
    throw new Error(`Unsupported quest itinerary mode: ${mode}`);
  }
  if (mode === QUEST_ITINERARY_ORDERED && openingStopTileId !== null) {
    throw new Error("Ordered quest itineraries cannot define an opening stop");
  }
  if (openingStopTileId !== null && !stops.some((stop) => stop.tileId === openingStopTileId)) {
    throw new Error(`Quest itinerary opening stop is absent: ${openingStopTileId}`);
  }
  const itinerary = {
    version: QUEST_ITINERARY_VERSION,
    mode,
    openingStopTileId,
    stops: stops.map((stop) => ({ ...stop })),
    completedTileIds: [...completedTileIds]
  };
  return validateQuestItinerary(itinerary);
}

export function migrateQuestItinerary(quest) {
  if (!quest || typeof quest !== "object") return quest;
  if (quest.itinerary) {
    validateQuestItinerary(quest.itinerary);
    return quest;
  }

  if (quest.openItinerary) {
    const legacy = validateLegacyOpenQuestItinerary(quest.openItinerary);
    quest.itinerary = createQuestItinerary(legacy.stops, {
      mode: QUEST_ITINERARY_OPEN,
      openingStopTileId: legacy.openingStopTileId,
      completedTileIds: legacy.completedTileIds
    });
  } else if (Array.isArray(quest.religiousItinerary)) {
    const completedCount = quest.religiousAuthorityAppliedLegCount ??
      quest.religiousDeliveryLegIndex ?? 0;
    if (!Number.isInteger(completedCount) || completedCount < 0 ||
        completedCount > quest.religiousItinerary.length) {
      throw new Error(`Invalid legacy religious itinerary progress: ${completedCount}`);
    }
    quest.itinerary = createQuestItinerary(quest.religiousItinerary, {
      mode: QUEST_ITINERARY_ORDERED,
      completedTileIds: quest.religiousItinerary
        .slice(0, completedCount)
        .map((stop) => stop.tileId)
    });
  } else if (Array.isArray(quest.eastAsianItinerary)) {
    quest.itinerary = createQuestItinerary(quest.eastAsianItinerary, {
      mode: QUEST_ITINERARY_OPEN,
      openingStopTileId: quest.eastAsianItinerary[0]?.tileId ?? null
    });
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
      tileId: quest.destinationTileId,
      name: quest.destinationName || "",
      country: quest.destinationCountry || ""
    })];
  }
  const itinerary = validateQuestItinerary(quest.itinerary);
  const completed = new Set(itinerary.completedTileIds);
  const remaining = itinerary.stops.filter((stop) => !completed.has(stop.tileId));
  if (itinerary.mode === QUEST_ITINERARY_ORDERED) return remaining.slice(0, 1);
  if (itinerary.openingStopTileId !== null && !completed.has(itinerary.openingStopTileId)) {
    return remaining.filter((stop) => stop.tileId === itinerary.openingStopTileId);
  }
  return remaining;
}

export function questHasDestination(quest, cityOrTileId) {
  const tileId = Number.isInteger(cityOrTileId) ? cityOrTileId : cityOrTileId?.tileId;
  if (!Number.isInteger(tileId)) return false;
  return questDestinationStops(quest).some((stop) => stop.tileId === tileId);
}

export function completeQuestItineraryStop(quest, cityOrTileId) {
  if (!quest?.itinerary) throw new Error("Quest has no itinerary");
  const itinerary = validateQuestItinerary(quest.itinerary);
  const tileId = Number.isInteger(cityOrTileId) ? cityOrTileId : cityOrTileId?.tileId;
  if (!Number.isInteger(tileId)) throw new Error("Quest itinerary completion requires a city tile id");
  const available = questDestinationStops(quest);
  const stop = available.find((entry) => entry.tileId === tileId);
  if (!stop) throw new Error(`Quest itinerary stop is not currently available: ${tileId}`);

  itinerary.completedTileIds.push(tileId);
  const remainingStops = questDestinationStops(quest);
  const next = remainingStops[0] || stop;
  quest.destinationKey = next.key;
  quest.destinationTileId = next.tileId;
  quest.destinationName = next.name;
  quest.destinationCountry = next.country;
  return Object.freeze({
    stop,
    stepNumber: itinerary.completedTileIds.length,
    stepCount: itinerary.stops.length,
    final: remainingStops.length === 0,
    remainingStops: Object.freeze([...remainingStops])
  });
}

export function validateQuestItinerary(itinerary) {
  if (!itinerary || itinerary.version !== QUEST_ITINERARY_VERSION) {
    throw new Error(`Unsupported quest itinerary version: ${itinerary?.version}`);
  }
  if (!QUEST_ITINERARY_MODES.has(itinerary.mode)) {
    throw new Error(`Unsupported quest itinerary mode: ${itinerary.mode}`);
  }
  validateStops(itinerary.stops);
  if (!Array.isArray(itinerary.completedTileIds)) {
    throw new Error("Quest itinerary completed stops are missing");
  }
  const stopIds = new Set(itinerary.stops.map((stop) => stop.tileId));
  const completedIds = new Set();
  for (const tileId of itinerary.completedTileIds) {
    if (!Number.isInteger(tileId) || !stopIds.has(tileId)) {
      throw new Error(`Quest itinerary completed stop is invalid: ${tileId}`);
    }
    if (completedIds.has(tileId)) throw new Error(`Quest itinerary stop completed twice: ${tileId}`);
    completedIds.add(tileId);
  }
  if (itinerary.mode === QUEST_ITINERARY_ORDERED) {
    const expected = itinerary.stops
      .slice(0, itinerary.completedTileIds.length)
      .map((stop) => stop.tileId);
    if (expected.some((tileId, index) => itinerary.completedTileIds[index] !== tileId)) {
      throw new Error("Ordered quest itinerary completed stops are out of sequence");
    }
    if (itinerary.openingStopTileId !== null) {
      throw new Error("Ordered quest itinerary cannot define an opening stop");
    }
  } else if (itinerary.openingStopTileId !== null && !stopIds.has(itinerary.openingStopTileId)) {
    throw new Error(`Quest itinerary opening stop is absent: ${itinerary.openingStopTileId}`);
  }
  return itinerary;
}

function validateLegacyOpenQuestItinerary(itinerary) {
  if (!itinerary || itinerary.version !== 1) {
    throw new Error(`Unsupported legacy quest itinerary version: ${itinerary?.version}`);
  }
  validateStops(itinerary.stops);
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

function validateStops(stops) {
  if (!Array.isArray(stops) || stops.length === 0) throw new Error("Quest itinerary needs at least one stop");
  const ids = new Set();
  for (const stop of stops) {
    if (!stop || !Number.isInteger(stop.tileId) || typeof stop.name !== "string" || stop.name === "") {
      throw new Error("Quest itinerary contains an invalid stop");
    }
    if (ids.has(stop.tileId)) throw new Error(`Quest itinerary repeats stop: ${stop.tileId}`);
    ids.add(stop.tileId);
  }
}
