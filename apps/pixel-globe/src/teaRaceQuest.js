import { gameCalendarDateAtMinute } from "./characterBiography.js";
import {
  CANONICAL_PORTS,
  canonicalPortDisplayName,
  portMatchesCanonicalReference
} from "./canonicalPorts.js";
import { TEA_GOOD_ID, tradeGoodById } from "./economy.js";
import { greatCircleDistanceKm } from "./worldDistance.js";

export const TEA_RACE_QUEST_KIND = "tea-race";
export const TEA_RACE_CARGO_QUANTITY = 10;
export const TEA_RACE_FIRST_PRIZE = 10000;
export const TEA_RACE_FINISHER_PRIZE = 2500;
export const TEA_RACE_THEFT_REPUTATION = -40;
export const TEA_RACE_DESTINATION_CITY = CANONICAL_PORTS.LONDON.city;

const TEA_RACE_SEASON_START_DAY = 73;
const TEA_RACE_SEASON_END_DAY = 181;
const TEA_RACE_SOURCE_PORTS = Object.freeze([
  CANONICAL_PORTS.GUANGZHOU,
  CANONICAL_PORTS.FUZHOU,
  CANONICAL_PORTS.JINJIANG,
  CANONICAL_PORTS.CHANGSHA
]);
const TEA_RACE_COMPETITORS = Object.freeze([
  competitor("portugal", "portuguese-carrack", 0, 0.86),
  competitor("spain", "spanish-nao", 30, 0.88),
  competitor("england", "galleon", 60, 0.9),
  competitor("france", "square-rigged-caravel", 90, 0.92),
  competitor("venice", "carrack", 120, 0.94)
]);

export function isTeaRaceQuest(quest) {
  return quest?.kind === TEA_RACE_QUEST_KIND;
}

export function teaRaceSeasonAtMinute(simMinute, longitudeDeg = 0) {
  const date = gameCalendarDateAtMinute(simMinute, longitudeDeg);
  return Object.freeze({
    ...date,
    open: date.dayIndex >= TEA_RACE_SEASON_START_DAY && date.dayIndex <= TEA_RACE_SEASON_END_DAY
  });
}

export function isTeaRaceSourcePort(city) {
  return city?.factionId === "ming" && TEA_RACE_SOURCE_PORTS.some((reference) => (
    portMatchesCanonicalReference(city, reference)
  ));
}

export function createTeaRaceQuest({
  origin,
  destination,
  originKey,
  destinationKey,
  simMinute
}) {
  if (!isTeaRaceSourcePort(origin)) {
    throw new Error(`Tea race requires a Ming tea port: ${portName(origin)}`);
  }
  if (!portMatchesCanonicalReference(destination, CANONICAL_PORTS.LONDON)) {
    throw new Error(`Tea race requires ${TEA_RACE_DESTINATION_CITY}: ${portName(destination)}`);
  }
  if (typeof originKey !== "string" || originKey === "" ||
      typeof destinationKey !== "string" || destinationKey === "") {
    throw new Error("Tea race requires stable port keys");
  }
  if (!Number.isFinite(simMinute) || simMinute < 0) {
    throw new Error(`Invalid tea race offer minute: ${simMinute}`);
  }
  const season = teaRaceSeasonAtMinute(simMinute, origin.lon || 0);
  if (!season.open) throw new Error(`Tea race offered outside the spring crop: day ${season.dayIndex}`);
  const id = `tea-race-${season.year}`;
  const competitors = teaRaceCompetitorManifest(id, origin.cityId, destination.cityId);
  return Object.freeze({
    id,
    kind: TEA_RACE_QUEST_KIND,
    stage: "race",
    seasonYear: season.year,
    originKey,
    originCityId: origin.cityId,
    originTileId: origin.tileId,
    originName: portName(origin),
    originCountry: origin.country || "",
    originFactionId: "ming",
    destinationKey,
    destinationCityId: destination.cityId,
    destinationTileId: destination.tileId,
    destinationName: portName(destination),
    destinationCountry: destination.country || "",
    distanceKm: Math.round(greatCircleDistanceKm(origin, destination)),
    cargoLabel: "ten sealed chests of new spring tea",
    teaRaceCargoRequirements: Object.freeze([
      Object.freeze({ goodId: TEA_GOOD_ID, quantity: TEA_RACE_CARGO_QUANTITY })
    ]),
    teaRaceCompetitors: competitors,
    teaRaceRetiredShipIds: Object.freeze([]),
    reward: TEA_RACE_FINISHER_PRIZE,
    firstPrize: TEA_RACE_FIRST_PRIZE,
    finisherPrize: TEA_RACE_FINISHER_PRIZE,
    offerText: `Five European captains race the first spring tea west. Land these ten sealed chests ` +
      `at London before them for ${TEA_RACE_FIRST_PRIZE} db; finish later for ` +
      `${TEA_RACE_FINISHER_PRIZE} db.`
  });
}

export function teaRaceCompetitorManifest(questId, originCityId, destinationCityId) {
  if (typeof questId !== "string" || questId === "" ||
      typeof originCityId !== "string" || originCityId === "" ||
      typeof destinationCityId !== "string" || destinationCityId === "") {
    throw new Error("Tea race competitor manifest requires quest and port ids");
  }
  return Object.freeze(TEA_RACE_COMPETITORS.map((entry, index) => Object.freeze({
    id: `${questId}-competitor-${index + 1}`,
    factionId: entry.factionId,
    role: "merchant",
    shipSlug: entry.shipSlug,
    originCityId,
    destinationCityId,
    departureDelayMinutes: entry.departureDelayMinutes,
    holdProgress: entry.holdProgress
  })));
}

export function teaRaceWaypointShips(quest) {
  if (!isTeaRaceQuest(quest) || quest.stage !== "race") return Object.freeze([]);
  const retiredIds = new Set(quest.teaRaceRetiredShipIds || []);
  return Object.freeze(quest.teaRaceCompetitors.filter((ship) => !retiredIds.has(ship.id)));
}

export function teaRaceEntrustedCargo(quest) {
  if (!isTeaRaceQuest(quest)) return Object.freeze([]);
  return quest.teaRaceCargoRequirements;
}

export function teaRaceCargoHeld(state, quest) {
  if (!isTeaRaceQuest(quest)) return false;
  return quest.teaRaceCargoRequirements.every((requirement) => (
    (state.cargo[requirement.goodId] || 0) >= requirement.quantity
  ));
}

export function teaRaceSaleTheftStatus(state, goodId, quantity) {
  if (!Number.isInteger(quantity) || quantity <= 0) return null;
  const quest = state.memory?.quests?.active;
  if (!isTeaRaceQuest(quest) || quest.stage !== "race") return null;
  const requirement = quest.teaRaceCargoRequirements.find((entry) => entry.goodId === goodId);
  if (!requirement) return null;
  const held = state.cargo[goodId] || 0;
  const playerOwned = Math.max(0, held - requirement.quantity);
  const stolenQuantity = Math.max(0, quantity - playerOwned);
  if (stolenQuantity <= 0) return null;
  return Object.freeze({
    kind: TEA_RACE_QUEST_KIND,
    questId: quest.id,
    goodId,
    quantity,
    stolenQuantity,
    originFactionId: quest.originFactionId,
    originPenalty: TEA_RACE_THEFT_REPUTATION
  });
}

export function validateTeaRaceQuest(quest) {
  if (!isTeaRaceQuest(quest)) return quest;
  if (!Number.isInteger(quest.seasonYear) || quest.seasonYear < 1522 ||
      !Number.isInteger(quest.originTileId) || !Number.isInteger(quest.destinationTileId) ||
      quest.originFactionId !== "ming" || !["race", "arrived"].includes(quest.stage)) {
    throw new Error(`Invalid tea race quest: ${quest.id}`);
  }
  if (!Array.isArray(quest.teaRaceCargoRequirements) || quest.teaRaceCargoRequirements.length !== 1 ||
      quest.teaRaceCargoRequirements[0].goodId !== TEA_GOOD_ID ||
      quest.teaRaceCargoRequirements[0].quantity !== TEA_RACE_CARGO_QUANTITY) {
    throw new Error(`Tea race has invalid entrusted cargo: ${quest.id}`);
  }
  if (!Array.isArray(quest.teaRaceCompetitors) || quest.teaRaceCompetitors.length !== 5 ||
      new Set(quest.teaRaceCompetitors.map((entry) => entry.id)).size !== 5 ||
      new Set(quest.teaRaceCompetitors.map((entry) => entry.shipSlug)).size !== 5) {
    throw new Error(`Tea race requires five distinct competitors: ${quest.id}`);
  }
  if (!Array.isArray(quest.teaRaceRetiredShipIds)) {
    throw new Error(`Tea race retired roster is invalid: ${quest.id}`);
  }
  tradeGoodById(TEA_GOOD_ID);
  return quest;
}

function competitor(factionId, shipSlug, departureDelayMinutes, holdProgress) {
  return Object.freeze({ factionId, shipSlug, departureDelayMinutes, holdProgress });
}

function portName(city) {
  return canonicalPortDisplayName(city);
}
