import {
  BEESWAX_GOOD_ID,
  GINSENG_GOOD_ID,
  PAPER_GOOD_ID,
  RICE_GOOD_ID,
  SULFUR_GOOD_ID,
  tradeGoodById
} from "./economy.js";
import { economyRegionForCity } from "./economyRegions.js";
import {
  DIPLOMACY_ALLY,
  DIPLOMACY_FRIENDLY,
  DIPLOMACY_HOSTILE,
  DIPLOMACY_NEUTRAL,
  DIPLOMACY_WAR,
  factionById
} from "./factions.js";
import {
  SUZERAINTY_KIND_AUTONOMOUS_VASSAL,
  SUZERAINTY_KIND_TRIBUTARY,
  SUZERAINTY_KIND_VASSAL,
  dependentsOf,
  suzeraintyForVassal,
  suzeraintyTermsForRelationship
} from "./suzerainty.js";

export const TRIBUTE_ENVOY_QUEST_KIND = "tribute-envoy";
export const COURT_ENVOY_QUEST_KIND = "court-envoy";
export const STATUS_ENVOY_QUEST_KIND = "status-envoy";
export const WOKOU_HUNT_QUEST_KIND = "wokou-hunt";
export const TRIBUTE_MISSION_REPUTATION_REQUIRED = 35;
export const TRIBUTE_THEFT_ORIGIN_REPUTATION = -45;
export const TRIBUTE_THEFT_SUZERAIN_REPUTATION = -25;

const RELATION_SCORE = Object.freeze({
  [DIPLOMACY_WAR]: -35,
  [DIPLOMACY_HOSTILE]: -20,
  [DIPLOMACY_NEUTRAL]: 0,
  [DIPLOMACY_FRIENDLY]: 18,
  [DIPLOMACY_ALLY]: 30
});

const TRIBUTE_CARGO_BY_FACTION = Object.freeze({
  joseon: cargo(GINSENG_GOOD_ID, 4, "sealed chests of ginseng"),
  ryukyu: cargo(SULFUR_GOOD_ID, 5, "the king's sulfur tribute"),
  ragusa: cargo("glassware", 3, "tribute glass from Ragusa"),
  wallachia: cargo(BEESWAX_GOOD_ID, 5, "wax and honey revenues"),
  moldavia: cargo(BEESWAX_GOOD_ID, 5, "the prince's wax tribute"),
  hormuz: cargo("perfume", 4, "tribute from the island customs house")
});

const NEW_STATUS_RELATION_MAX_DISTANCE_KM = 3200;

export function isTributeEnvoyQuest(quest) {
  return quest?.kind === TRIBUTE_ENVOY_QUEST_KIND;
}

export function isCourtEnvoyQuest(quest) {
  return quest?.kind === COURT_ENVOY_QUEST_KIND;
}

export function isStatusEnvoyQuest(quest) {
  return quest?.kind === STATUS_ENVOY_QUEST_KIND;
}

export function isWokouHuntQuest(quest) {
  return quest?.kind === WOKOU_HUNT_QUEST_KIND;
}

export function tributeMissionPlan(state, origin, portCities) {
  const relationship = suzeraintyForVassal(
    state.relations.diplomacy.suzerainties,
    origin.factionId
  );
  if (!relationship || !suzeraintyTermsForRelationship(relationship).tribute) return null;
  const destination = sovereignCapitalForFaction(portCities, relationship.suzerainFactionId);
  if (!destination || destination.cityId === origin.cityId) return null;
  const requirement = tributeCargoForOrigin(origin);
  return Object.freeze({
    destination,
    relationship,
    requirements: Object.freeze([requirement]),
    cargoLabel: requirement.label
  });
}

function tributeCargoForOrigin(origin) {
  const factionCargo = TRIBUTE_CARGO_BY_FACTION[origin.factionId];
  if (factionCargo) return factionCargo;
  if (["east-asian", "south-asian", "southeast-asian"].includes(economyRegionForCity(origin))) {
    return cargo(RICE_GOOD_ID, 6, "sealed rice tribute");
  }
  return cargo(PAPER_GOOD_ID, 4, "sealed tribute and court records");
}

export function diplomaticStatusMissionPlan(state, origin, portCities, context = {}) {
  const memory = state.relations.diplomacy.suzerainties;
  const ownRelationship = suzeraintyForVassal(memory, origin.factionId);
  if (ownRelationship) {
    const destination = sovereignCapitalForFaction(portCities, ownRelationship.suzerainFactionId);
    if (!destination) return null;
    const relation = context.relationBetween(origin.factionId, ownRelationship.suzerainFactionId);
    if (context.force !== true && ![DIPLOMACY_HOSTILE, DIPLOMACY_WAR].includes(relation) &&
        seededFraction(`${context.seed}|independence`) >= 0.18) {
      return null;
    }
    return proposal("seek-independence", origin.factionId, ownRelationship.suzerainFactionId, null, destination);
  }

  const dependents = dependentsOf(memory, origin.factionId).filter((entry) => [
    SUZERAINTY_KIND_TRIBUTARY,
    SUZERAINTY_KIND_AUTONOMOUS_VASSAL
  ].includes(entry.kind));
  if (dependents.length > 0) {
    const existing = dependents[hashString32(`${context.seed}|dependent`) % dependents.length];
    const destination = sovereignCapitalForFaction(portCities, existing.vassalFactionId);
    if (destination) {
      const desiredKind = existing.kind === SUZERAINTY_KIND_TRIBUTARY
        ? SUZERAINTY_KIND_AUTONOMOUS_VASSAL
        : SUZERAINTY_KIND_VASSAL;
      return proposal("demand-closer-submission", existing.vassalFactionId, origin.factionId, desiredKind, destination);
    }
  }

  const candidates = portCities
    .filter((port) => port.isFactionCapital && port.capitalOfFactionId === port.factionId)
    .filter((port) => port.factionId !== origin.factionId)
    .filter((port) => !suzeraintyForVassal(memory, port.factionId))
    .filter((port) => greatCircleDistanceKm(origin, port) <= NEW_STATUS_RELATION_MAX_DISTANCE_KM)
    .map((port) => ({
      port,
      relation: context.relationBetween(origin.factionId, port.factionId),
      originPorts: controlledPortCount(portCities, origin.factionId),
      targetPorts: controlledPortCount(portCities, port.factionId)
    }))
    .filter(({ relation }) => [DIPLOMACY_HOSTILE, DIPLOMACY_FRIENDLY, DIPLOMACY_ALLY].includes(relation));
  if (candidates.length === 0) return null;
  const candidate = candidates[hashString32(`${context.seed}|new-subject`) % candidates.length];
  const friendly = [DIPLOMACY_FRIENDLY, DIPLOMACY_ALLY].includes(candidate.relation);
  if (friendly && candidate.targetPorts > candidate.originPorts) {
    return proposal(
      "offer-submission",
      origin.factionId,
      candidate.port.factionId,
      SUZERAINTY_KIND_TRIBUTARY,
      candidate.port
    );
  }
  return proposal(
    friendly ? "offer-protection" : "demand-tribute",
    candidate.port.factionId,
    origin.factionId,
    friendly ? SUZERAINTY_KIND_AUTONOMOUS_VASSAL : SUZERAINTY_KIND_TRIBUTARY,
    candidate.port
  );
}

export function resolveDiplomaticStatusProposal(state, quest, portCities, relationBetween) {
  if (!isStatusEnvoyQuest(quest) || !quest.statusProposal) {
    throw new Error("Status negotiation requires a diplomatic-status envoy");
  }
  const status = quest.statusProposal;
  const vassalPorts = controlledPortCount(portCities, status.vassalFactionId);
  const suzerainPorts = controlledPortCount(portCities, status.suzerainFactionId);
  const relation = relationBetween(status.vassalFactionId, status.suzerainFactionId);
  const strengthRatio = (suzerainPorts + 1) / (vassalPorts + 1);
  let score = 50 + RELATION_SCORE[relation];
  if (status.type === "seek-independence") {
    score = 32 - RELATION_SCORE[relation] + Math.round((1 / strengthRatio - 1) * 22);
  } else if (status.type === "demand-tribute" || status.type === "demand-closer-submission") {
    score += Math.round((strengthRatio - 1) * 24) - 18;
  } else if (status.type === "offer-submission") {
    score += Math.round((strengthRatio - 1) * 8) + 10;
  } else if (status.type === "offer-protection") {
    score += Math.round((strengthRatio - 1) * 12) + 8;
  }
  score = Math.max(5, Math.min(95, score));
  const roll = hashString32(`${quest.id}|status-resolution`) % 100;
  return Object.freeze({ ...status, accepted: roll < score, score, roll, relation });
}

export function tributeCargoSpace(requirements) {
  return requirements.reduce((sum, requirement) => (
    sum + tradeGoodById(requirement.goodId).unitSize * requirement.quantity
  ), 0);
}

export function tributeCargoSummary(requirements) {
  return requirements.map((requirement) => (
    `${tradeGoodById(requirement.goodId).label} x${requirement.quantity}`
  )).join(", ");
}

export function tributeCargoHeld(state, quest) {
  if (!isTributeEnvoyQuest(quest)) return false;
  return quest.tributeCargoRequirements.every((requirement) => (
    (state.cargo[requirement.goodId] || 0) >= requirement.quantity
  ));
}

export function tributeSaleTheftStatus(state, goodId, quantity) {
  if (!Number.isInteger(quantity) || quantity <= 0) return null;
  const quest = state.memory?.quests?.active;
  if (!isTributeEnvoyQuest(quest) || quest.stage !== "outbound" || quest.tributeStolen) return null;
  const requirement = quest.tributeCargoRequirements.find((entry) => entry.goodId === goodId);
  if (!requirement) return null;
  const held = state.cargo[goodId] || 0;
  const playerOwned = Math.max(0, held - requirement.quantity);
  const stolenQuantity = Math.max(0, quantity - playerOwned);
  if (stolenQuantity <= 0) return null;
  return Object.freeze({
    questId: quest.id,
    goodId,
    quantity,
    stolenQuantity,
    originFactionId: quest.originFactionId,
    suzerainFactionId: quest.targetFactionId,
    originPenalty: TRIBUTE_THEFT_ORIGIN_REPUTATION,
    suzerainPenalty: TRIBUTE_THEFT_SUZERAIN_REPUTATION
  });
}

export function statusProposalText(status) {
  const vassal = factionById(status.vassalFactionId).name;
  const suzerain = factionById(status.suzerainFactionId).name;
  if (status.type === "seek-independence") return `${vassal} asks to be released from ${suzerain}'s overlordship.`;
  if (status.type === "offer-protection") return `${suzerain} offers protection to ${vassal} in return for tribute and allegiance.`;
  if (status.type === "offer-submission") return `${vassal} offers tribute and allegiance to ${suzerain} in return for recognition and protection.`;
  if (status.type === "demand-closer-submission") return `${suzerain} demands firmer obedience from ${vassal}.`;
  return `${suzerain} demands tribute from ${vassal}.`;
}

function cargo(goodId, quantity, label) {
  tradeGoodById(goodId);
  return Object.freeze({ goodId, quantity, label });
}

function proposal(type, vassalFactionId, suzerainFactionId, desiredKind, destination) {
  return Object.freeze({
    type,
    vassalFactionId,
    suzerainFactionId,
    desiredKind,
    destination
  });
}

function sovereignCapitalForFaction(portCities, factionId) {
  return portCities.find((port) => (
    port.factionId === factionId &&
    port.isFactionCapital === true &&
    port.capitalOfFactionId === factionId
  )) || null;
}

function controlledPortCount(portCities, factionId) {
  return portCities.filter((port) => port.factionId === factionId).length;
}

function greatCircleDistanceKm(a, b) {
  if (![a?.lat, a?.lon, b?.lat, b?.lon].every(Number.isFinite)) {
    throw new Error("Status diplomacy requires capital coordinates");
  }
  const toRadians = Math.PI / 180;
  const latA = a.lat * toRadians;
  const latB = b.lat * toRadians;
  const deltaLat = (b.lat - a.lat) * toRadians;
  const deltaLon = (b.lon - a.lon) * toRadians;
  const chord = Math.sin(deltaLat / 2) ** 2 +
    Math.cos(latA) * Math.cos(latB) * Math.sin(deltaLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(chord), Math.sqrt(Math.max(0, 1 - chord)));
}

function seededFraction(seed) {
  return hashString32(seed) / 0x100000000;
}

function hashString32(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
