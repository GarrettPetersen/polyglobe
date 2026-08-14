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
export const WARTIME_TRADE_RESTRICTION_ID = "wartime-trade-restriction";

const WARTIME_TRADE_RESTRICTION = Object.freeze({
  id: WARTIME_TRADE_RESTRICTION_ID,
  label: "War",
  kind: "wartime-access",
  appliesTo: "enemy ports",
  illicitMarketSuccessChance: 0.45,
  illicitMarketReputationPenalty: 8,
  closedMarketText: "Wartime orders close this market to enemy cargo."
});

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

export const PORTUGUESE_CROWN_SPICE_POLICY_ID = "portuguese-crown-spices";
export const PORTUGUESE_CROWN_SPICE_POLICY = Object.freeze({
  id: PORTUGUESE_CROWN_SPICE_POLICY_ID,
  label: "Portuguese crown spice monopoly",
  kind: "commodity-access",
  hostFactionId: PORTUGUESE_FACTION_ID,
  appliesTo: "portuguese-estado-ports",
  illicitMarketSuccessChance: 0.5,
  illicitMarketReputationPenalty: 10,
  closedMarketText: "The Portuguese factor will not deal in Crown spices without a valid cartaz."
});

const PORTUGUESE_CROWN_SPICE_SET = new Set(PORTUGUESE_CROWN_SPICE_GOOD_IDS);
const PORTUGUESE_ESTADO_PORT_KEYS = new Set([
  portKey("Goa", "India"),
  portKey("Hormuz", "Iran"),
  portKey("Malacca", "Malaysia"),
  portKey("Muscat", "Oman"),
  portKey("Calicut", "India"),
  portKey("Cochin", "India"),
  portKey("Colombo", "Sri Lanka"),
  portKey("Quilon", "India"),
  portKey("Sofala", "Mozambique"),
  portKey("Mozambique", "Mozambique"),
  portKey("Ternate", "Indonesia")
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
  WARTIME_TRADE_RESTRICTION,
  ...SOVEREIGN_TRADE_ACCESS_POLICIES,
  Object.freeze({
    id: "portuguese-cartaz",
    label: "Portuguese cartaz",
    kind: "maritime-permit",
    appliesTo: "estado-da-india-waters"
  }),
  PORTUGUESE_CROWN_SPICE_POLICY
]);

export function evaluateTradeAccess({
  port,
  traderFactionId,
  relation,
  relationToFaction = null,
  foreignSettlementExpulsions = null,
  simMinute = 0,
  tradeAccessGranted = () => false,
  suzeraintyPrivilege = null,
  illicitAccessPolicyId = null,
  disguisedEntry = false
}) {
  assertTradePolicyPort(port);
  const traderId = assertFactionId(traderFactionId);
  assertDiplomaticRelation(relation);
  if (typeof tradeAccessGranted !== "function") {
    throw new Error("Trade access evaluation requires a sovereign permission resolver");
  }
  assertSuzeraintyTradePrivilege(suzeraintyPrivilege);
  const wartimeRestricted = relation === DIPLOMACY_WAR &&
    port.isPirateHideout !== true &&
    disguisedEntry !== true;
  if (wartimeRestricted) {
    const policy = wartimeTradeRestrictionForPort(port);
    const illicit = illicitAccessPolicyId === policy.id;
    return Object.freeze({
      allowed: illicit,
      provisioningAllowed: true,
      restricted: true,
      lawful: false,
      illicit,
      domesticAccess: false,
      lawfulExemption: false,
      policyId: policy.id,
      policy,
      suzeraintyPrivilege,
      portFactionId: port.factionId || NEUTRAL_FACTION_ID,
      traderFactionId: traderId,
      reason: "war"
    });
  }
  const policy = sovereignTradePolicyForPort(port, simMinute);
  const sovereign = Object.freeze({
    ...evaluateSovereignTradeAccess({
      port,
      traderFactionId: traderId,
      simMinute,
      granted: policy
        ? tradeAccessGranted(policy.id, traderId) ||
          suzeraintyPrivilege?.sovereignMarketAccess === true
        : false,
      illicitAccessPolicyId,
      disguisedEntry
    }),
    suzeraintyPrivilege
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
      suzeraintyPrivilege,
      foreignSettlement: settlementAccess,
      foreignSettlementFactionId: settlementAccess.factionId
    });
  }
  return Object.freeze({
    ...sovereign,
    allowed: true,
    restricted: sovereign.restricted,
    illicit: sovereign.illicit,
    suzeraintyPrivilege,
    foreignSettlement: settlementAccess,
    foreignSettlementFactionId: settlementAccess?.factionId || null
  });
}

export function resolveRestrictedIllicitMarketAttempt(access, roll) {
  if (!access || access.allowed || access.restricted !== true || !access.policy) {
    throw new Error("Illicit market attempt requires an active closed-market restriction");
  }
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) {
    throw new Error(`Invalid ${access.policy.label} illicit market roll: ${roll}`);
  }
  const chance = access.policy.illicitMarketSuccessChance;
  if (!Number.isFinite(chance) || chance <= 0 || chance >= 1) {
    throw new Error(`Invalid ${access.policy.label} illicit market chance: ${chance}`);
  }
  return roll < chance;
}

function wartimeTradeRestrictionForPort(port) {
  const hostFactionId = assertFactionId(port.factionId || NEUTRAL_FACTION_ID);
  if (hostFactionId === NEUTRAL_FACTION_ID || hostFactionId === PIRATE_FACTION_ID) {
    throw new Error(`Wartime trade restriction requires a sovereign port: ${hostFactionId}`);
  }
  return Object.freeze({
    ...WARTIME_TRADE_RESTRICTION,
    hostFactionId
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
  suzeraintyPrivilege = null,
  illicit = false,
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
  if (typeof illicit !== "boolean") throw new Error(`Invalid illicit trade flag: ${illicit}`);

  const customs = customsTerms({
    port,
    traderFactionId,
    relation,
    relationToFaction,
    foreignSettlementExpulsions,
    reputation,
    reputationForFaction,
    suzeraintyPrivilege
  });
  const crownMonopoly = isPortugueseEstadoPort(port, foreignSettlementExpulsions) &&
    isPortugueseCrownSpice(goodId);
  const officialCustomsRate = customs.customsRate;
  const customsRate = illicit ? 0 : officialCustomsRate;
  const officialMonopolyPurchaseRate = crownMonopoly ? 0.25 : 0;
  const officialMonopolySaleRate = crownMonopoly ? 0.1 : 0;
  const monopolyPurchaseRate = illicit ? 0 : officialMonopolyPurchaseRate;
  const monopolySaleRate = illicit ? 0 : officialMonopolySaleRate;
  const purchaseMultiplier = purchaseDiscountMultiplier * purchaseBargainMultiplier *
    (1 + customsRate + monopolyPurchaseRate);
  const saleMultiplier = Math.max(
    0.5,
    (1 - customsRate - monopolySaleRate) * saleBargainMultiplier
  );

  return Object.freeze({
    allowed: illicit || relation !== DIPLOMACY_WAR,
    ...customs,
    illicit,
    customsRate,
    officialCustomsRate,
    crownMonopoly,
    monopolyPurchaseRate,
    monopolySaleRate,
    officialMonopolyPurchaseRate,
    officialMonopolySaleRate,
    purchaseDiscountMultiplier,
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
  reputationForFaction = null,
  suzeraintyPrivilege = null
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
    foreignSettlement: null,
    suzeraintyPrivilege
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
      foreignSettlement,
      suzeraintyPrivilege: null
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
  foreignSettlement,
  suzeraintyPrivilege
}) {
  const domestic = traderId === jurisdictionFactionId &&
    jurisdictionFactionId !== NEUTRAL_FACTION_ID &&
    jurisdictionFactionId !== PIRATE_FACTION_ID;
  const pirateHome = traderId === PIRATE_FACTION_ID &&
    jurisdictionFactionId === PIRATE_FACTION_ID;
  assertSuzeraintyTradePrivilege(suzeraintyPrivilege);
  const baseCustomsRate = domestic || pirateHome
    ? 0
    : suzeraintyPrivilege?.customsRate ?? customsRateForRelation(relation);
  const reputationAdjustment = baseCustomsRate > 0
    ? clamp(-reputation * 0.0003, -0.03, 0.03)
    : 0;
  return Object.freeze({
    domestic,
    relation,
    customsRate: clamp(baseCustomsRate + reputationAdjustment, 0, 0.25),
    reputationAdjustment,
    jurisdictionFactionId,
    foreignSettlement,
    suzeraintyPrivilege
  });
}

function assertSuzeraintyTradePrivilege(privilege) {
  if (privilege === null) return;
  if (!privilege || !Number.isFinite(privilege.customsRate) ||
      privilege.customsRate < 0 || privilege.customsRate > 0.25 ||
      typeof privilege.sovereignMarketAccess !== "boolean") {
    throw new Error("Invalid suzerainty trade privilege");
  }
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

export function isPortugueseEstadoPort(port, foreignSettlementExpulsions = null) {
  assertTradePolicyPort(port);
  if (!PORTUGUESE_ESTADO_PORT_KEYS.has(portKey(portName(port), port.country))) return false;
  if ((port.factionId || NEUTRAL_FACTION_ID) === PORTUGUESE_FACTION_ID) return true;
  return activeForeignSettlements(port, foreignSettlementExpulsions)
    .some((entry) => entry.factionId === PORTUGUESE_FACTION_ID);
}

export function isPortugueseCrownSpice(goodId) {
  return PORTUGUESE_CROWN_SPICE_SET.has(goodId);
}

export function evaluatePortugueseCrownSpiceAccess({
  port,
  traderFactionId,
  foreignSettlementExpulsions = null,
  goodId,
  cartazValid,
  illicitAccessPolicyId = null,
  otherIllicitAccess = false,
  disguisedEntry = false
}) {
  assertTradePolicyPort(port);
  const traderId = assertFactionId(traderFactionId);
  if (typeof goodId !== "string" || goodId === "") {
    throw new Error(`Invalid Portuguese crown-spice good: ${goodId}`);
  }
  if (typeof cartazValid !== "boolean") throw new Error(`Invalid cartaz validity: ${cartazValid}`);
  if (typeof otherIllicitAccess !== "boolean") {
    throw new Error(`Invalid other illicit trade access: ${otherIllicitAccess}`);
  }
  if (typeof disguisedEntry !== "boolean") throw new Error(`Invalid disguised entry: ${disguisedEntry}`);
  const controlled = isPortugueseCrownSpice(goodId) &&
    isPortugueseEstadoPort(port, foreignSettlementExpulsions);
  const exempt = traderId === PORTUGUESE_FACTION_ID;
  const restricted = controlled && !exempt && !cartazValid;
  const illicit = restricted && (
    disguisedEntry ||
    otherIllicitAccess ||
    illicitAccessPolicyId === PORTUGUESE_CROWN_SPICE_POLICY_ID
  );
  return Object.freeze({
    allowed: !restricted || illicit,
    restricted,
    lawful: !restricted,
    illicit,
    exempt,
    controlled,
    policyId: restricted ? PORTUGUESE_CROWN_SPICE_POLICY_ID : null,
    policy: restricted ? PORTUGUESE_CROWN_SPICE_POLICY : null,
    portFactionId: port.factionId || NEUTRAL_FACTION_ID,
    traderFactionId: traderId,
    reason: restricted ? "portuguese-crown-spice-monopoly" : null
  });
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
