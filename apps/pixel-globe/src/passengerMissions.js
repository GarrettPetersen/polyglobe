import {
  cityKey,
  cityLabel
} from "./gameState.js";

export const PASSENGER_SPAWN_CHANCE = 0.12;
export const PASSENGER_MIN_DISTANCE_KM = 1800;
export const PASSENGER_ROLL_PERIOD_MINUTES = 7 * 24 * 60;

const EARTH_RADIUS_KM = 6371;

export const PASSENGER_SCENARIOS = Object.freeze([
  Object.freeze({ id: "return-home", expressionId: "sad", namePort: "destination" }),
  Object.freeze({ id: "shipwrecked-sailor", expressionId: "afraid", namePort: "origin" }),
  Object.freeze({ id: "family-letter", expressionId: "sad", namePort: "origin" }),
  Object.freeze({ id: "patron-papers", expressionId: "neutral", namePort: "origin" })
]);

export function passengerOfferForCity(state, city, portCities, context = {}) {
  const quests = questMemory(state);
  if (quests.active) return null;
  const existing = pendingPassengerOfferForCity(state, city);
  if (existing) return existing;

  const destination = choosePassengerDestination(city, portCities, context);
  if (!destination) return null;

  const period = passengerRollPeriod(context.simMinute);
  const originKey = cityKey(city);
  const rollKey = `${originKey}|${period}`;
  if (quests.passengerRolls[rollKey]) return null;
  quests.passengerRolls[rollKey] = true;

  const spawnChance = passengerSpawnChance(context.spawnChance);
  if (spawnChance < 1 && seededFraction(`${rollKey}|passenger`) >= spawnChance) return null;

  const distanceKm = greatCircleDistanceKm(city, destination);
  const scenario = choosePassengerScenario(`${rollKey}|${cityKey(destination)}`, context);
  const quest = buildPassengerQuest(city, destination, scenario, distanceKm, period);
  if (typeof context.createCharacter === "function") {
    const character = context.createCharacter({ quest, origin: city, destination, scenario });
    if (character) {
      quest.passenger = character;
      quest.passengerName = character.name;
    }
  }
  quests.passengerOffers[originKey] = quest;
  return quest;
}

export function pendingPassengerOfferForCity(state, city) {
  if (!state || !city) return null;
  const quests = questMemory(state);
  const offer = quests.passengerOffers[cityKey(city)];
  if (!offer || quests.completed[offer.id]) return null;
  return offer;
}

export function activePassengerQuest(state) {
  const active = questMemory(state).active;
  return active?.kind === "passenger" ? active : null;
}

export function passengerQuestById(state, questId) {
  const quests = questMemory(state);
  if (quests.active?.id === questId) return quests.active;
  for (const offer of Object.values(quests.passengerOffers)) {
    if (offer?.id === questId && !quests.completed[offer.id]) return offer;
  }
  return null;
}

export function markPassengerOfferSeen(state, quest) {
  if (!quest || quest.kind !== "passenger" || !quest.originKey) return null;
  const quests = questMemory(state);
  const offer = quests.passengerOffers[quest.originKey];
  if (!offer || offer.id !== quest.id) return null;
  offer.seen = true;
  quest.seen = true;
  return offer;
}

export function passengerName(quest) {
  return quest?.passenger?.name || quest?.passengerName || "Passenger";
}

function buildPassengerQuest(origin, destination, scenario, distanceKm, period) {
  const originKey = cityKey(origin);
  const destinationKey = cityKey(destination);
  const seed = `${originKey}|${destinationKey}|${scenario.id}|${period}`;
  const reward = 90 + Math.round(distanceKm / 45) + (hashString32(`${seed}|reward`) % 76);
  const id = `passenger-${origin.tileId}-${destination.tileId}-${hashString32(seed).toString(36)}`;
  return {
    id,
    kind: "passenger",
    originKey,
    originTileId: origin.tileId,
    originName: cityLabel(origin),
    destinationTileId: destination.tileId,
    destinationName: cityLabel(destination),
    destinationCountry: destination.country || "",
    distanceKm: Math.round(distanceKm),
    reward,
    scenarioId: scenario.id,
    passengerName: "Passenger",
    seen: false,
    dialogue: passengerDialogueText(scenario.id, origin, destination, reward)
  };
}

function passengerDialogueText(scenarioId, origin, destination, reward) {
  const originName = cityLabel(origin);
  const destinationName = cityLabel(destination);
  if (scenarioId === "return-home") {
    return {
      offer: `Captain, I was born in ${destinationName}. My last berth ended here, and I have no kin in this harbor. Carry me home and I will pay ${reward} db.`,
      underway: `Every league toward ${destinationName} feels like a debt lifting. Tell me when we make the harbor.`,
      arrival: `${destinationName}. I know that smell of water and smoke. You have brought me home; here is the fare I promised.`
    };
  }
  if (scenarioId === "shipwrecked-sailor") {
    return {
      offer: `Our ship broke up before we reached ${originName}. I can stand a night watch and keep quiet. Land me at ${destinationName} for ${reward} db.`,
      underway: `I will stay out of the crew's way until ${destinationName}. A dry deck is more mercy than I expected.`,
      arrival: `There is ${destinationName}. I will find a berth from here. Take the ${reward} db, captain, and my thanks.`
    };
  }
  if (scenarioId === "family-letter") {
    return {
      offer: `A letter found me in ${originName}. My family in ${destinationName} needs me before the season turns. Please take me there; I can pay ${reward} db.`,
      underway: `If the wind holds, ${destinationName} is close enough to hope for. I will not forget this passage.`,
      arrival: `${destinationName} at last. My family will hear your name kindly. Here is the ${reward} db I owe.`
    };
  }
  return {
    offer: `I carry papers for a patron in ${destinationName}, and the roads are closed to me. Passage by sea is safer. Take me there for ${reward} db.`,
    underway: `The papers are still dry, and ${destinationName} is still ahead. That is enough fortune for now.`,
    arrival: `This is the quay I needed. My patron can settle the rest, but your ${reward} db is ready now.`
  };
}

function choosePassengerDestination(origin, portCities, context) {
  if (context.destinationTileId !== undefined) {
    return portCities.find((port) => port.tileId === context.destinationTileId) || null;
  }
  const candidates = portCities
    .filter((port) => port.tileId !== origin.tileId)
    .filter((port) => Number.isFinite(port.lat) && Number.isFinite(port.lon))
    .map((port) => ({ port, distanceKm: greatCircleDistanceKm(origin, port) }))
    .filter(({ distanceKm }) => distanceKm >= PASSENGER_MIN_DISTANCE_KM);
  if (candidates.length === 0) return null;
  const seed = `${cityKey(origin)}|${passengerRollPeriod(context.simMinute)}|destination`;
  return candidates
    .map((candidate) => ({
      ...candidate,
      score: destinationScore(seed, candidate.port, candidate.distanceKm)
    }))
    .sort((a, b) => a.score - b.score)[0].port;
}

function destinationScore(seed, port, distanceKm) {
  const random = seededFraction(`${seed}|${cityKey(port)}`);
  const distanceBonus = Math.min(distanceKm, 9000) / 9000;
  return random - distanceBonus * 0.25;
}

function choosePassengerScenario(seed, context) {
  if (context.scenarioId) {
    const forced = PASSENGER_SCENARIOS.find((scenario) => scenario.id === context.scenarioId);
    if (forced) return forced;
  }
  return PASSENGER_SCENARIOS[hashString32(`${seed}|scenario`) % PASSENGER_SCENARIOS.length];
}

function passengerSpawnChance(value) {
  if (!Number.isFinite(value)) return PASSENGER_SPAWN_CHANCE;
  return Math.max(0, Math.min(1, value));
}

function passengerRollPeriod(simMinute) {
  if (!Number.isFinite(simMinute)) return 0;
  return Math.floor(simMinute / PASSENGER_ROLL_PERIOD_MINUTES);
}

function greatCircleDistanceKm(a, b) {
  const latA = degreesToRadians(a.lat);
  const latB = degreesToRadians(b.lat);
  const dLat = latB - latA;
  const dLon = degreesToRadians(b.lon - a.lon);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat + Math.cos(latA) * Math.cos(latB) * sinLon * sinLon;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

function degreesToRadians(value) {
  return value * Math.PI / 180;
}

function seededFraction(value) {
  return hashString32(value) / 0x100000000;
}

function questMemory(state) {
  if (!state?.memory || typeof state.memory !== "object") throw new Error("Passenger missions require game state memory");
  if (!state.memory.quests || typeof state.memory.quests !== "object") {
    state.memory.quests = { active: null, completed: {} };
  }
  const quests = state.memory.quests;
  if (!quests.completed || typeof quests.completed !== "object") quests.completed = {};
  if (!quests.passengerOffers || typeof quests.passengerOffers !== "object") quests.passengerOffers = {};
  if (!quests.passengerRolls || typeof quests.passengerRolls !== "object") quests.passengerRolls = {};
  return quests;
}

function hashString32(value) {
  let h = 0x811c9dc5;
  const text = String(value);
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
