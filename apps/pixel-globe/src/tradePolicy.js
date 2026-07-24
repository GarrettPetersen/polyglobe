import {
  DIPLOMACY_ALLY,
  DIPLOMACY_FRIENDLY,
  DIPLOMACY_HOSTILE,
  DIPLOMACY_NEUTRAL,
  DIPLOMACY_WAR,
  NEUTRAL_FACTION_ID,
  PIRATE_FACTION_ID,
  assertFactionId
} from "./factions.js";
import {
  SOVEREIGN_TRADE_ACCESS_POLICIES,
  evaluateSovereignTradeAccess,
  sovereignTradePolicyForPort
} from "./sovereignTradeAccess.js";
import { activeForeignSettlements } from "./foreignSettlements.js";

export const PORTUGUESE_FACTION_ID = "portugal";
export const PORTUGUESE_CARTAZ_DURATION_DAYS = 90;
export const PORTUGUESE_CARTAZ_FINE_MULTIPLIER = 2;
export const PORTUGUESE_CARTAZ_INSPECTION_COOLDOWN_DAYS = 2;

export const CUSTOMS_RATE_BY_RELATION = Object.freeze({
  [DIPLOMACY_ALLY]: 0.02,
  [DIPLOMACY_FRIENDLY]: 0.05,
  [DIPLOMACY_NEUTRAL]: 0.1,
  [DIPLOMACY_HOSTILE]: 0.2
});

export const PORTUGUESE_CROWN_SPICE_GOOD_IDS = Object.freeze([
  "pepper",
  "cinnamon",
  "cloves",
  "nutmeg"
]);

const PORTUGUESE_CROWN_SPICE_SET = new Set(PORTUGUESE_CROWN_SPICE_GOOD_IDS);
const PORTUGUESE_ESTADO_PORT_KEYS = new Set([
  portKey("Goa", "India"),
  portKey("Hormuz", "Iran"),
  portKey("Malacca", "Malaysia"),
  portKey("Muscat", "Oman"),
  portKey("Sofala", "Mozambique"),
  portKey("Mozambique Island", "Mozambique")
]);

const PORTUGUESE_CARTAZ_ENFORCEMENT_ZONES = Object.freeze([
  zone("Cape route", -34, 20, 520),
  zone("Mozambique Channel", -17, 41, 900),
  zone("Red Sea approaches", 13, 44, 650),
  zone("Hormuz", 25, 57, 650),
  zone("Arabian Sea", 14, 64, 900),
  zone("Goa and Malabar", 13, 75, 850),
  zone("Ceylon", 7, 80, 650),
  zone("Malacca", 3, 101, 700)
]);

export const TRADE_POLICY_REGIMES = Object.freeze([
  Object.freeze({
    id: "relation-customs",
    label: "Diplomatic customs",
    kind: "customs",
    appliesTo: "all-foreign-trade"
  }),
  Object.freeze({
    id: "foreign-settlements",
    label: "Resident foreign settlements",
    kind: "port-jurisdiction",
    appliesTo: "ports-with-foreign-settlements"
  }),
  ...SOVEREIGN_TRADE_ACCESS_POLICIES,
  Object.freeze({
    id: "portuguese-cartaz",
    label: "Portuguese cartaz",
    kind: "maritime-permit",
    appliesTo: "estado-da-india-waters"
  }),
  Object.freeze({
    id: "portuguese-crown-spices",
    label: "Portuguese crown spice monopoly",
    kind: "commodity-monopoly",
    appliesTo: "portuguese-estado-ports"
  })
]);

export function evaluateTradeAccess({
  port,
  traderFactionId,
  relation,
  relationToFaction = null,
  foreignSettlementExpulsions = null,
  simMinute = 0,
  tradeAccessGranted = () => false,
  illicitAccessPolicyId = null,
  disguisedEntry = false
}) {
  assertTradePolicyPort(port);
  const traderId = assertFactionId(traderFactionId);
  assertDiplomaticRelation(relation);
  if (typeof tradeAccessGranted !== "function") {
    throw new Error("Trade access evaluation requires a sovereign permission resolver");
  }
  const wartimeBlocked = relation === DIPLOMACY_WAR &&
    port.isPirateHideout !== true &&
    illicitAccessPolicyId === null &&
    disguisedEntry !== true;
  if (wartimeBlocked) {
    return Object.freeze({
      allowed: false,
      provisioningAllowed: false,
      restricted: true,
      illicit: false,
      reason: "war"
    });
  }
  const policy = sovereignTradePolicyForPort(port, simMinute);
  const sovereign = evaluateSovereignTradeAccess({
    port,
    traderFactionId: traderId,
    simMinute,
    granted: policy ? tradeAccessGranted(policy.id, traderId) : false,
    illicitAccessPolicyId,
    disguisedEntry
  });
  const settlementAccess = bestForeignSettlementAccess({
    port,
    relationToFaction,
    foreignSettlementExpulsions
  });
  if (!sovereign.allowed && !settlementAccess) return sovereign;
  if (!sovereign.allowed) {
    return Object.freeze({
      ...sovereign,
      allowed: true,
      restricted: true,
      illicit: false,
      reason: "foreign-settlement",
      foreignSettlement: settlementAccess,
      foreignSettlementFactionId: settlementAccess.factionId
    });
  }
  return Object.freeze({
    ...sovereign,
    allowed: true,
    restricted: sovereign.restricted,
    illicit: sovereign.illicit,
    foreignSettlement: settlementAccess,
    foreignSettlementFactionId: settlementAccess?.factionId || null
  });
}

export function tradeTerms({
  port,
  traderFactionId,
  relation,
  relationToFaction = null,
  foreignSettlementExpulsions = null,
  goodId,
  reputation = 0,
  reputationForFaction = null,
  purchaseDiscountMultiplier = 1,
  purchaseBargainMultiplier = 1,
  saleBargainMultiplier = 1
}) {
  if (typeof goodId !== "string" || goodId === "") throw new Error(`Invalid trade-policy good: ${goodId}`);
  if (
    !Number.isFinite(purchaseDiscountMultiplier) ||
    purchaseDiscountMultiplier <= 0 ||
    purchaseDiscountMultiplier > 1
  ) {
    throw new Error(`Invalid trade purchase discount: ${purchaseDiscountMultiplier}`);
  }
  if (
    !Number.isFinite(purchaseBargainMultiplier) ||
    purchaseBargainMultiplier <= 0 ||
    purchaseBargainMultiplier > 1
  ) {
    throw new Error(`Invalid trade purchase bargain: ${purchaseBargainMultiplier}`);
  }
  if (
    !Number.isFinite(saleBargainMultiplier) ||
    saleBargainMultiplier < 1
  ) {
    throw new Error(`Invalid trade sale bargain: ${saleBargainMultiplier}`);
  }

  const customs = customsTerms({
    port,
    traderFactionId,
    relation,
    relationToFaction,
    foreignSettlementExpulsions,
    reputation,
    reputationForFaction
  });
  const crownMonopoly = isPortugueseEstadoPort(port) && isPortugueseCrownSpice(goodId);
  const monopolyPurchaseRate = crownMonopoly ? 0.25 : 0;
  const monopolySaleRate = crownMonopoly ? 0.1 : 0;
  const purchaseMultiplier = purchaseDiscountMultiplier * purchaseBargainMultiplier *
    (1 + customs.customsRate + monopolyPurchaseRate);
  const saleMultiplier = Math.max(
    0.5,
    (1 - customs.customsRate - monopolySaleRate) * saleBargainMultiplier
  );

  return Object.freeze({
    allowed: relation !== DIPLOMACY_WAR,
    ...customs,
    crownMonopoly,
    monopolyPurchaseRate,
    monopolySaleRate,
    purchaseBargainMultiplier,
    saleBargainMultiplier,
    purchaseMultiplier,
    saleMultiplier
  });
}

export function customsTerms({
  port,
  traderFactionId,
  relation,
  relationToFaction = null,
  foreignSettlementExpulsions = null,
  reputation = 0,
  reputationForFaction = null
}) {
  assertTradePolicyPort(port);
  const traderId = assertFactionId(traderFactionId);
  const portFactionId = assertFactionId(port.factionId || NEUTRAL_FACTION_ID);
  assertDiplomaticRelation(relation);
  assertTradeReputation(reputation);
  const sovereign = customsCandidate({
    traderId,
    jurisdictionFactionId: portFactionId,
    relation,
    reputation,
    foreignSettlement: null
  });
  const settlementCandidates = activeForeignSettlements(
    port,
    foreignSettlementExpulsions
  ).map((foreignSettlement) => {
    if (typeof relationToFaction !== "function") {
      throw new Error("Foreign settlement customs require a diplomacy resolver");
    }
    const foreignRelation = relationToFaction(foreignSettlement.factionId);
    assertDiplomaticRelation(foreignRelation);
    const foreignReputation = reputationForFaction === null
      ? 0
      : reputationForFaction(foreignSettlement.factionId);
    assertTradeReputation(foreignReputation);
    return customsCandidate({
      traderId,
      jurisdictionFactionId: foreignSettlement.factionId,
      relation: foreignRelation,
      reputation: foreignReputation,
      foreignSettlement
    });
  }).filter((candidate) => candidate.relation !== DIPLOMACY_WAR);
  const selected = [sovereign, ...settlementCandidates].reduce((best, candidate) => (
    candidate.customsRate < best.customsRate ? candidate : best
  ));

  return Object.freeze({
    ...selected,
    sovereignRelation: relation,
    sovereignFactionId: portFactionId,
    foreignSettlementPrivilege: selected.foreignSettlement !== null
  });
}

function bestForeignSettlementAccess({
  port,
  relationToFaction,
  foreignSettlementExpulsions
}) {
  const settlements = activeForeignSettlements(port, foreignSettlementExpulsions);
  if (settlements.length === 0) return null;
  if (typeof relationToFaction !== "function") {
    throw new Error("Foreign settlement trade access requires a diplomacy resolver");
  }
  return settlements.find((entry) => {
    const relation = relationToFaction(entry.factionId);
    assertDiplomaticRelation(relation);
    return relation !== DIPLOMACY_WAR;
  }) || null;
}

function customsCandidate({
  traderId,
  jurisdictionFactionId,
  relation,
  reputation,
  foreignSettlement
}) {
  const domestic = traderId === jurisdictionFactionId &&
    jurisdictionFactionId !== NEUTRAL_FACTION_ID &&
    jurisdictionFactionId !== PIRATE_FACTION_ID;
  const pirateHome = traderId === PIRATE_FACTION_ID &&
    jurisdictionFactionId === PIRATE_FACTION_ID;
  const baseCustomsRate = domestic || pirateHome ? 0 : customsRateForRelation(relation);
  const reputationAdjustment = baseCustomsRate > 0
    ? clamp(-reputation * 0.0003, -0.03, 0.03)
    : 0;
  return Object.freeze({
    domestic,
    relation,
    customsRate: clamp(baseCustomsRate + reputationAdjustment, 0, 0.25),
    reputationAdjustment,
    jurisdictionFactionId,
    foreignSettlement
  });
}

function assertTradeReputation(reputation) {
  if (!Number.isFinite(reputation) || reputation < -100 || reputation > 100) {
    throw new Error(`Invalid trade-policy reputation: ${reputation}`);
  }
}

export function customsRateForRelation(relation) {
  assertDiplomaticRelation(relation);
  if (relation === DIPLOMACY_WAR) return CUSTOMS_RATE_BY_RELATION[DIPLOMACY_HOSTILE];
  const rate = CUSTOMS_RATE_BY_RELATION[relation];
  if (rate === undefined) throw new Error(`No customs rate for diplomacy: ${relation}`);
  return rate;
}

export function isPortugueseEstadoPort(port) {
  assertTradePolicyPort(port);
  return (port.factionId || NEUTRAL_FACTION_ID) === PORTUGUESE_FACTION_ID &&
    PORTUGUESE_ESTADO_PORT_KEYS.has(portKey(portName(port), port.country));
}

export function isPortugueseCrownSpice(goodId) {
  return PORTUGUESE_CROWN_SPICE_SET.has(goodId);
}

export function portugueseCartazRequired({ traderFactionId, latitudeDeg, longitudeDeg }) {
  const traderId = assertFactionId(traderFactionId);
  if (traderId === PORTUGUESE_FACTION_ID || traderId === PIRATE_FACTION_ID) return false;
  assertLatitudeLongitude(latitudeDeg, longitudeDeg);
  return PORTUGUESE_CARTAZ_ENFORCEMENT_ZONES.some((entry) => (
    approximateDistanceKm(latitudeDeg, longitudeDeg, entry.latitudeDeg, entry.longitudeDeg) <= entry.radiusKm
  ));
}

export function portugueseCartazFee({ traderFactionId, relation, cargoCapacity }) {
  const traderId = assertFactionId(traderFactionId);
  assertDiplomaticRelation(relation);
  if (!Number.isInteger(cargoCapacity) || cargoCapacity < 0) {
    throw new Error(`Invalid cartaz cargo capacity: ${cargoCapacity}`);
  }
  if (traderId === PORTUGUESE_FACTION_ID) return 0;
  if (relation === DIPLOMACY_WAR || relation === DIPLOMACY_HOSTILE) return null;
  const relationMultiplier = relation === DIPLOMACY_ALLY
    ? 0.5
    : relation === DIPLOMACY_FRIENDLY
      ? 0.75
      : 1;
  return roundToNearestTen((80 + cargoCapacity * 1.8) * relationMultiplier);
}

export function portugueseCartazFine(permitFee) {
  if (!Number.isInteger(permitFee) || permitFee <= 0) {
    throw new Error(`Invalid cartaz permit fee: ${permitFee}`);
  }
  return roundToNearestTen(permitFee * PORTUGUESE_CARTAZ_FINE_MULTIPLIER);
}

export function portugueseControlledCargo(cargo) {
  if (!cargo || typeof cargo !== "object" || Array.isArray(cargo)) {
    throw new Error("Cartaz cargo manifest must be an object");
  }
  return Object.fromEntries(PORTUGUESE_CROWN_SPICE_GOOD_IDS
    .map((goodId) => [goodId, cargo[goodId] || 0])
    .filter(([, quantity]) => quantity > 0));
}

function assertDiplomaticRelation(relation) {
  if (
    relation !== DIPLOMACY_ALLY &&
    relation !== DIPLOMACY_FRIENDLY &&
    relation !== DIPLOMACY_NEUTRAL &&
    relation !== DIPLOMACY_HOSTILE &&
    relation !== DIPLOMACY_WAR
  ) {
    throw new Error(`Invalid trade-policy diplomacy: ${relation}`);
  }
  return relation;
}

function assertTradePolicyPort(port) {
  if (!port || typeof port !== "object") throw new Error("Trade policy requires a port");
  assertFactionId(port.factionId || NEUTRAL_FACTION_ID);
  const name = portName(port);
  if (!name || typeof port.country !== "string") {
    throw new Error("Trade policy port requires city and country names");
  }
}

function assertLatitudeLongitude(latitudeDeg, longitudeDeg) {
  if (!Number.isFinite(latitudeDeg) || latitudeDeg < -90 || latitudeDeg > 90) {
    throw new Error(`Invalid cartaz latitude: ${latitudeDeg}`);
  }
  if (!Number.isFinite(longitudeDeg) || longitudeDeg < -180 || longitudeDeg > 180) {
    throw new Error(`Invalid cartaz longitude: ${longitudeDeg}`);
  }
}

function portName(port) {
  return port.displayCity || port.city || port.name;
}

function portKey(city, country) {
  return `${city}|${country}`;
}

function zone(id, latitudeDeg, longitudeDeg, radiusKm) {
  return Object.freeze({ id, latitudeDeg, longitudeDeg, radiusKm });
}

function approximateDistanceKm(latitudeA, longitudeA, latitudeB, longitudeB) {
  const radians = Math.PI / 180;
  const meanLatitude = (latitudeA + latitudeB) * 0.5 * radians;
  const latitudeKm = (latitudeA - latitudeB) * 111.32;
  const longitudeKm = (longitudeA - longitudeB) * 111.32 * Math.cos(meanLatitude);
  return Math.hypot(latitudeKm, longitudeKm);
}

function roundToNearestTen(value) {
  return Math.max(10, Math.round(value / 10) * 10);
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}
