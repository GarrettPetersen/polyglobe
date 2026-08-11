export const QUEST_ITINERARY_VERSION = 1;

export function createOpenQuestItinerary(stops, { openingStopTileId = null } = {}) {
  validateStops(stops);
  if (openingStopTileId !== null && !stops.some((stop) => stop.tileId === openingStopTileId)) {
    throw new Error(`Quest itinerary opening stop is absent: ${openingStopTileId}`);
  }
  return {
    version: QUEST_ITINERARY_VERSION,
    openingStopTileId,
    stops: stops.map((stop) => ({ ...stop })),
    completedTileIds: []
  };
}

export function questDestinationStops(quest) {
  if (!quest) return [];
  if (!quest.openItinerary) {
    if (!Number.isInteger(quest.destinationTileId)) return [];
    return [Object.freeze({
      key: quest.destinationKey || null,
      tileId: quest.destinationTileId,
      name: quest.destinationName || "",
      country: quest.destinationCountry || ""
    })];
  }
  const itinerary = validateOpenQuestItinerary(quest.openItinerary);
  const completed = new Set(itinerary.completedTileIds);
  if (itinerary.openingStopTileId !== null && !completed.has(itinerary.openingStopTileId)) {
    return itinerary.stops.filter((stop) => stop.tileId === itinerary.openingStopTileId);
  }
  return itinerary.stops.filter((stop) => !completed.has(stop.tileId));
}

export function questHasDestination(quest, cityOrTileId) {
  const tileId = Number.isInteger(cityOrTileId) ? cityOrTileId : cityOrTileId?.tileId;
  if (!Number.isInteger(tileId)) return false;
  return questDestinationStops(quest).some((stop) => stop.tileId === tileId);
}

export function completeOpenQuestItineraryStop(quest, cityOrTileId) {
  if (!quest?.openItinerary) throw new Error("Quest has no open itinerary");
  const itinerary = validateOpenQuestItinerary(quest.openItinerary);
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

export function validateOpenQuestItinerary(itinerary) {
  if (!itinerary || itinerary.version !== QUEST_ITINERARY_VERSION) {
    throw new Error(`Unsupported quest itinerary version: ${itinerary?.version}`);
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
  if (itinerary.openingStopTileId !== null && !stopIds.has(itinerary.openingStopTileId)) {
    throw new Error(`Quest itinerary opening stop is absent: ${itinerary.openingStopTileId}`);
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
