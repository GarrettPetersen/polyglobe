import { CAMPAIGN_GOAL_EXPLORER } from "../campaignGoals.js";
import { COURT_ACTION_KINDS } from "../courtPolitics.js";
import { createGameState, validateGameState } from "../gameState.js";
import { IMPERIAL_HISTORY_EVENT_KINDS } from "../imperialConstitution.js";
import {
  PAPAL_ACTION_REVOCATION,
  PAPAL_RECORDED_ACTION_KINDS
} from "../papalPolitics.js";
import { PORT_CONQUEST_EVENT_KINDS } from "../portConquest.js";
import { shipStatsForSlug } from "../shipStats.js";
import {
  SUZERAINTY_EVENT_KINDS,
  SUZERAINTY_KIND_AUTONOMOUS_VASSAL,
  SUZERAINTY_KIND_PERSONAL_UNION,
  SUZERAINTY_KIND_TRIBUTARY,
  SUZERAINTY_KIND_VASSAL
} from "../suzerainty.js";
import { TRADE_EMBARGO_EVENT_KINDS } from "../tradeEmbargoes.js";
import { WORLD_DIPLOMACY_EVENT_KINDS } from "../worldDiplomacy.js";

const START_MINUTE = 123_456;
const CURRENT_MINUTE = 234_567;
const LONDON_ID = "london|united kingdom";
const PARIS_ID = "paris|france";

export const DENSE_SAVE_PORT_CATALOG = Object.freeze([
  port(LONDON_ID, 1, "London", "United Kingdom", "england", true),
  port(PARIS_ID, 2, "Paris", "France", "france", true)
]);

const PLAYER_CHARACTER = Object.freeze({
  id: "player:dense-save-captain",
  name: "Dense Save Captain",
  givenName: "Dense",
  familyName: "Captain",
  gender: "female",
  sex: "female",
  nameCulture: "english",
  nationalityId: "england",
  homePortCityId: LONDON_ID,
  homePortTileId: 1,
  homePortName: "London",
  homePortCountry: "United Kingdom",
  religionId: "roman-catholic",
  expressions: Object.freeze(["neutral", "happy"])
});

export function createDenseSaveCompatibilityFixture() {
  const shipStats = shipStatsForSlug("brigantine");
  const state = createGameState({
    cargoCapacity: shipStats.cargoCapacity,
    startMinute: START_MINUTE,
    playerCharacter: PLAYER_CHARACTER,
    shipStats,
    campaignGoalType: CAMPAIGN_GOAL_EXPLORER,
    voyageSeed: "dense-save-compatibility"
  });
  populatePersistentEventHistories(state);
  populateCanonicalPortMemories(state);
  validateGameState(state);

  return {
    version: 2,
    savedAt: 1_800_000_000_000 + state.version,
    encoding: "json",
    payload: {
      worldSubdivisions: 8,
      anchored: false,
      gameState: state,
      playerShip: {
        factionId: "england",
        typeSlug: shipStats.slug,
        position: [1, 0, 0],
        tileId: 1,
        heading: [0, 1, 0],
        targetHeading: [0, 1, 0],
        velocity: [0, 0, 0],
        hitPoints: shipStats.hitPoints,
        maxHitPoints: shipStats.hitPoints,
        wakeSeedCounter: 7,
        cannonSequence: 3
      },
      worldClock: {
        currentMinute: CURRENT_MINUTE,
        voyageStartMinute: START_MINUTE
      }
    }
  };
}

function populatePersistentEventHistories(state) {
  state.memory.conquest.events = PORT_CONQUEST_EVENT_KINDS.map(conquestEvent);
  state.relations.diplomacy.history = WORLD_DIPLOMACY_EVENT_KINDS.map((kind, index) => ({
    id: `dense-diplomacy-${kind}`,
    kind,
    factionAId: "england",
    factionBId: "france",
    simMinute: START_MINUTE + index + 1,
    headline: `Dense compatibility event: ${kind}`
  }));

  const relationshipKinds = [
    SUZERAINTY_KIND_VASSAL,
    SUZERAINTY_KIND_AUTONOMOUS_VASSAL,
    SUZERAINTY_KIND_TRIBUTARY,
    SUZERAINTY_KIND_PERSONAL_UNION
  ];
  state.relations.diplomacy.suzerainties.history = relationshipKinds.map((relationshipKind, index) => ({
    id: `dense-suzerainty-${relationshipKind}`,
    kind: SUZERAINTY_EVENT_KINDS[index % SUZERAINTY_EVENT_KINDS.length],
    vassalFactionId: ["scotland", "crimea", "ragusa", "bohemia"][index],
    suzerainFactionId: ["england", "ottoman", "ottoman", "hungary"][index],
    relationshipKind,
    simMinute: START_MINUTE + 100 + index,
    source: "dense-save-compatibility"
  }));

  state.relations.tradeEmbargoes.history = TRADE_EMBARGO_EVENT_KINDS.map((kind, index) => ({
    id: `dense-embargo-${kind}`,
    orderId: `dense-order-${index}`,
    kind,
    authorityKind: "national",
    issuerFactionId: "england",
    targetFactionId: "france",
    scope: "all-goods",
    restrictionKind: "enemy-imports",
    followerFactionIds: ["england"],
    simMinute: START_MINUTE + 200 + index,
    source: "dense-save-compatibility"
  }));

  state.relations.imperial.history = IMPERIAL_HISTORY_EVENT_KINDS.map(imperialEvent);
  state.relations.courts.history = COURT_ACTION_KINDS.map((kind, index) => ({
    id: `dense-court-${kind}`,
    kind,
    simMinute: START_MINUTE + 400 + index,
    authorityFactionId: kind.startsWith("ming-") ? "ming" : kind.startsWith("shogunal-") ||
      kind === "wokou-suppression" ? "japan" : "england",
    targetFactionId: "france",
    secondaryFactionId: null,
    source: "dense-save-compatibility",
    destinationCityId: LONDON_ID,
    destinationName: "London",
    headline: `Dense court action: ${kind}`,
    detail: "A frozen compatibility record."
  }));
  state.relations.papacy.history = PAPAL_RECORDED_ACTION_KINDS.map(papalEvent);
}

function populateCanonicalPortMemories(state) {
  state.memory.visitedPorts[LONDON_ID] = {
    visits: 3,
    drunkArrivals: 1,
    lastDrunkVisit: 2,
    lastDrunkArrivalMinute: START_MINUTE + 600
  };
  state.memory.flags[`shoreBatteryDisabledUntil:${LONDON_ID}`] = CURRENT_MINUTE + 500;
  state.memory.flags[`shoreBatteryDisabledByShip:${LONDON_ID}`] = "the Pelican";
  state.memory.flags[`shoreBatteryUpgradeLevel:${LONDON_ID}`] = 1;
  state.memory.flags[`playerPortAssaultUntil:${PARIS_ID}`] = CURRENT_MINUTE + 600;
  state.memory.flags[`playerPortRaidedUntil:${PARIS_ID}`] = CURRENT_MINUTE + 700;
  state.memory.navigation.optionalWaypoints.push({
    id: `port:${PARIS_ID}:DENSE SAVE`,
    destinationCityId: PARIS_ID,
    destinationTileId: 2,
    destinationName: "Paris",
    reason: "DENSE SAVE"
  });
}

function conquestEvent(kind, index) {
  const shared = {
    id: `dense-conquest-${kind}`,
    kind,
    simMinute: START_MINUTE + 300 + index,
    source: "dense-save-compatibility"
  };
  if (kind === "port-capture") {
    return {
      ...shared,
      portId: PARIS_ID,
      cityId: PARIS_ID,
      cityTileId: 2,
      cityName: "Paris",
      previousFactionId: "france",
      newFactionId: "england",
      capitalCapturedFactionId: "france",
      collapsedFactionId: null,
      peaceTreatyId: null
    };
  }
  if (kind === "faction-collapse") {
    return { ...shared, factionId: "france", successorFactionId: "england" };
  }
  if (kind === "faction-restoration") {
    return {
      ...shared,
      factionId: "france",
      capitalPortId: PARIS_ID,
      cityPortIds: [PARIS_ID]
    };
  }
  if (kind === "faction-succession") {
    return {
      ...shared,
      predecessorFactionId: "france",
      successorFactionId: "england",
      capitalPortId: PARIS_ID,
      cityPortIds: [PARIS_ID]
    };
  }
  throw new Error(`Dense save has no conquest event builder for ${kind}`);
}

function imperialEvent(kind, index) {
  const simMinute = START_MINUTE + 350 + index;
  if (kind === "election") {
    return {
      kind,
      simMinute,
      source: "dense-save-compatibility",
      office: "emperor",
      previousEmperorFactionId: "burgundian-netherlands",
      emperorFactionId: "habsburg",
      winnerFactionId: "habsburg",
      winnerRulerId: "ferdinand-i",
      winnerRulerName: "Ferdinand I",
      candidateFactionIds: ["habsburg", "electoral-saxony"],
      runoffCandidateFactionIds: ["habsburg", "electoral-saxony"],
      firstBallot: { habsburg: 4, "electoral-saxony": 3 },
      scores: {},
      votes: {},
      tally: { habsburg: 4, "electoral-saxony": 3 }
    };
  }
  if (kind === "election-convened") {
    return {
      kind,
      simMinute,
      electionId: "dense-election",
      office: "emperor",
      electionMinute: simMinute + 100,
      candidateFactionIds: ["habsburg", "electoral-saxony"],
      source: "dense-save-compatibility"
    };
  }
  if (kind === "king-of-romans-vacancy") {
    return { kind, simMinute, factionId: "habsburg", rulerId: "ferdinand-i", rulerName: "Ferdinand I", source: "dense-save-compatibility" };
  }
  if (kind === "king-of-romans-succeeds") {
    return {
      kind,
      simMinute,
      previousEmperorFactionId: "burgundian-netherlands",
      emperorFactionId: "habsburg",
      emperorRulerId: "ferdinand-i",
      emperorRulerName: "Ferdinand I",
      source: "dense-save-compatibility"
    };
  }
  if (kind === "imperial-vacancy") {
    return {
      kind,
      simMinute,
      previousEmperorFactionId: "burgundian-netherlands",
      previousEmperorRulerId: "charles-v",
      previousEmperorRulerName: "Charles V",
      source: "dense-save-compatibility"
    };
  }
  if (kind === "elector-support") {
    return {
      kind,
      simMinute,
      source: "dense-save-compatibility",
      electorFactionId: "mainz",
      candidateFactionId: "habsburg",
      previous: 60,
      next: 65
    };
  }
  if (kind === "diet-resolution") {
    return {
      kind,
      simMinute,
      resolution: {
        id: "dense-diet-resolution",
        kind: "mediation",
        sponsorFactionId: "burgundian-netherlands",
        targetFactionId: "france",
        supportingFactionIds: ["mainz", "trier", "palatinate"],
        simMinute,
        expiresMinute: simMinute + 1000,
        scope: "target"
      }
    };
  }
  if (kind === "reformation") {
    return {
      kind,
      simMinute,
      source: "dense-save-compatibility",
      cityId: "augsberg|germany",
      factionId: "augsburg",
      previousReligionId: "roman-catholic",
      religionId: "mixed",
      authorityDelta: -1
    };
  }
  throw new Error(`Dense save has no Imperial event builder for ${kind}`);
}

function papalEvent(kind, index) {
  const action = {
    id: `dense-papal-${kind}`,
    kind,
    targetFactionId: "england",
    targetRulerId: "henry-viii",
    targetRulerName: "Henry VIII",
    popeId: "adrian-vi",
    popeName: "Adrian VI",
    respondingFactionIds: ["spain"],
    simMinute: START_MINUTE + 500 + index,
    source: "dense-save-compatibility",
    logistics: null
  };
  if (kind !== PAPAL_ACTION_REVOCATION) return action;
  return {
    ...action,
    revokedActionId: "dense-papal-papal-excommunication",
    revokedActionKind: "papal-excommunication"
  };
}

function port(cityId, tileId, city, country, factionId, capital) {
  return Object.freeze({
    cityId,
    tileId,
    city,
    displayCity: city,
    country,
    cityType: "northern-european",
    factionId,
    foundingFactionId: factionId,
    population: 100_000,
    lat: city === "London" ? 51.5 : 48.85,
    lon: city === "London" ? -0.1 : 2.35,
    isFactionCapital: capital,
    capitalOfFactionId: capital ? factionId : null
  });
}
