import assert from "node:assert/strict";
import test from "node:test";

import {
  DIPLOMACY_ALLY,
  DIPLOMACY_FRIENDLY,
  DIPLOMACY_HOSTILE,
  DIPLOMACY_NEUTRAL,
  DIPLOMACY_WAR
} from "./factions.js";
import {
  PORTUGUESE_CARTAZ_DURATION_DAYS,
  PORTUGUESE_CROWN_SPICE_POLICY_ID,
  PORTUGUESE_CROWN_SPICE_GOOD_IDS,
  TRADE_POLICY_REGIMES,
  WARTIME_TRADE_RESTRICTION_ID,
  customsTerms,
  customsRateForRelation,
  evaluateTradeAccess,
  evaluatePortugueseCrownSpiceAccess,
  isPortugueseEstadoPort,
  portugueseCartazFee,
  portugueseCartazFine,
  portugueseCartazRequired,
  resolveRestrictedIllicitMarketAttempt,
  tradeTerms
} from "./tradePolicy.js";
import {
  createForeignSettlementExpulsionMemory,
  expelHostileForeignSettlements,
  foreignSettlementById
} from "./foreignSettlements.js";

const LISBON = Object.freeze({
  tileId: 1,
  city: "Lisbon",
  country: "Portugal",
  factionId: "portugal"
});
const GOA = Object.freeze({
  tileId: 2,
  city: "Goa",
  country: "India",
  factionId: "portugal"
});
const CALICUT = Object.freeze({
  tileId: 3,
  city: "Calicut",
  country: "India",
  factionId: "vijayanagara"
});
const COLOMBO = Object.freeze({
  tileId: 4,
  city: "Colombo",
  country: "Sri Lanka",
  factionId: "neutral",
  foreignSettlements: [foreignSettlementById("portuguese-colombo")]
});

test("diplomatic customs span ally through hostile while domestic trade is duty free", () => {
  assert.equal(customsRateForRelation(DIPLOMACY_ALLY), 0.02);
  assert.equal(customsRateForRelation(DIPLOMACY_FRIENDLY), 0.05);
  assert.equal(customsRateForRelation(DIPLOMACY_NEUTRAL), 0.1);
  assert.equal(customsRateForRelation(DIPLOMACY_HOSTILE), 0.2);

  const domestic = tradeTerms({
    port: LISBON,
    traderFactionId: "portugal",
    relation: DIPLOMACY_ALLY,
    goodId: "wine"
  });
  assert.equal(domestic.customsRate, 0);
  assert.equal(domestic.purchaseMultiplier, 1);
  assert.equal(domestic.saleMultiplier, 1);

  const neutral = tradeTerms({
    port: LISBON,
    traderFactionId: "england",
    relation: DIPLOMACY_NEUTRAL,
    goodId: "wine"
  });
  assert.equal(neutral.customsRate, 0.1);
  assert.equal(neutral.purchaseMultiplier, 1.1);
  assert.equal(neutral.saleMultiplier, 0.9);
});

test("illicit trade evades official customs and crown monopoly charges", () => {
  const lawful = tradeTerms({
    port: GOA,
    traderFactionId: "england",
    relation: DIPLOMACY_NEUTRAL,
    goodId: "pepper"
  });
  const illicit = tradeTerms({
    port: GOA,
    traderFactionId: "england",
    relation: DIPLOMACY_NEUTRAL,
    goodId: "pepper",
    illicit: true
  });

  assert.equal(illicit.illicit, true);
  assert.equal(illicit.customsRate, 0);
  assert.equal(illicit.officialCustomsRate, lawful.customsRate);
  assert.equal(illicit.monopolyPurchaseRate, 0);
  assert.equal(illicit.officialMonopolyPurchaseRate, lawful.monopolyPurchaseRate);
  assert.equal(illicit.purchaseMultiplier, 1);
  assert.equal(illicit.saleMultiplier, 1);
});

test("illicit wartime trade is quoted as allowed without collecting enemy customs", () => {
  const illicit = tradeTerms({
    port: LISBON,
    traderFactionId: "morocco",
    relation: DIPLOMACY_WAR,
    goodId: "wine",
    illicit: true
  });

  assert.equal(illicit.allowed, true);
  assert.equal(illicit.illicit, true);
  assert.equal(illicit.customsRate, 0);
  assert.equal(illicit.officialCustomsRate, 0.2);
  assert.equal(illicit.purchaseMultiplier, 1);
  assert.equal(illicit.saleMultiplier, 1);
});

test("personal standing nudges customs without overriding diplomacy", () => {
  const admired = tradeTerms({
    port: CALICUT,
    traderFactionId: "england",
    relation: DIPLOMACY_NEUTRAL,
    reputation: 100,
    goodId: "cotton"
  });
  const notorious = tradeTerms({
    port: CALICUT,
    traderFactionId: "england",
    relation: DIPLOMACY_NEUTRAL,
    reputation: -100,
    goodId: "cotton"
  });
  assert.equal(admired.customsRate, 0.07);
  assert.equal(notorious.customsRate, 0.13);
});

test("suzerain privileges are asymmetric while tributary commerce can be reciprocal", () => {
  const portugueseInHormuz = tradeTerms({
    port: { tileId: 8, city: "Hormuz", country: "Iran", factionId: "hormuz" },
    traderFactionId: "portugal",
    relation: DIPLOMACY_FRIENDLY,
    suzeraintyPrivilege: {
      customsRate: 0.02,
      sovereignMarketAccess: true,
      kind: "vassal",
      traderIsSuzerain: true
    },
    goodId: "dates"
  });
  const hormuziInLisbon = tradeTerms({
    port: LISBON,
    traderFactionId: "hormuz",
    relation: DIPLOMACY_FRIENDLY,
    suzeraintyPrivilege: {
      customsRate: 0.05,
      sovereignMarketAccess: false,
      kind: "vassal",
      traderIsSuzerain: false
    },
    goodId: "wine"
  });
  assert.equal(portugueseInHormuz.customsRate, 0.02);
  assert.equal(hormuziInLisbon.customsRate, 0.05);
});

test("negotiation perks make small improvements after duties and monopolies", () => {
  const ordinary = tradeTerms({
    port: GOA,
    traderFactionId: "england",
    relation: DIPLOMACY_NEUTRAL,
    goodId: "pepper"
  });
  const negotiated = tradeTerms({
    port: GOA,
    traderFactionId: "england",
    relation: DIPLOMACY_NEUTRAL,
    goodId: "pepper",
    purchaseBargainMultiplier: 0.97,
    saleBargainMultiplier: 1.03
  });
  assert.equal(negotiated.purchaseMultiplier, ordinary.purchaseMultiplier * 0.97);
  assert.equal(negotiated.saleMultiplier, ordinary.saleMultiplier * 1.03);
});

test("customs status can be explained without inventing a commodity transaction", () => {
  const terms = customsTerms({
    port: LISBON,
    traderFactionId: "england",
    relation: DIPLOMACY_ALLY,
    reputation: 100
  });
  assert.equal(terms.relation, DIPLOMACY_ALLY);
  assert.equal(terms.customsRate, 0);
  assert.equal(terms.domestic, false);
});

test("Portuguese Estado ports levy crown-controlled spices without taxing independent ports", () => {
  assert.equal(isPortugueseEstadoPort(GOA), true);
  assert.equal(isPortugueseEstadoPort(COLOMBO), true);
  assert.equal(isPortugueseEstadoPort(LISBON), false);
  assert.equal(isPortugueseEstadoPort({
    tileId: 8,
    city: "Hormuz",
    country: "Iran",
    factionId: "hormuz",
    foreignSettlements: [foreignSettlementById("portuguese-hormuz")]
  }), true);
  assert.deepEqual(PORTUGUESE_CROWN_SPICE_GOOD_IDS, ["pepper", "cinnamon", "cloves", "nutmeg"]);

  const crownPepper = tradeTerms({
    port: GOA,
    traderFactionId: "portugal",
    relation: DIPLOMACY_ALLY,
    goodId: "pepper"
  });
  assert.equal(crownPepper.customsRate, 0);
  assert.equal(crownPepper.crownMonopoly, true);
  assert.equal(crownPepper.purchaseMultiplier, 1.25);
  assert.equal(crownPepper.saleMultiplier, 0.9);

  const independentPepper = tradeTerms({
    port: CALICUT,
    traderFactionId: "portugal",
    relation: DIPLOMACY_FRIENDLY,
    goodId: "pepper"
  });
  assert.equal(independentPepper.crownMonopoly, false);
  assert.equal(independentPepper.purchaseMultiplier, 1.05);
});

test("Portuguese factors require cartaz papers for official crown-spice trade", () => {
  const blocked = evaluatePortugueseCrownSpiceAccess({
    port: COLOMBO,
    traderFactionId: "england",
    goodId: "cinnamon",
    cartazValid: false
  });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.restricted, true);
  assert.equal(blocked.policyId, PORTUGUESE_CROWN_SPICE_POLICY_ID);

  const ordinary = evaluatePortugueseCrownSpiceAccess({
    port: COLOMBO,
    traderFactionId: "england",
    goodId: "grain",
    cartazValid: false
  });
  assert.equal(ordinary.allowed, true);
  assert.equal(ordinary.restricted, false);

  const licensed = evaluatePortugueseCrownSpiceAccess({
    port: COLOMBO,
    traderFactionId: "england",
    goodId: "cinnamon",
    cartazValid: true
  });
  assert.equal(licensed.allowed, true);
  assert.equal(licensed.lawful, true);

  const illicit = evaluatePortugueseCrownSpiceAccess({
    port: COLOMBO,
    traderFactionId: "england",
    goodId: "cinnamon",
    cartazValid: false,
    illicitAccessPolicyId: PORTUGUESE_CROWN_SPICE_POLICY_ID
  });
  assert.equal(illicit.allowed, true);
  assert.equal(illicit.illicit, true);

  const disguised = evaluatePortugueseCrownSpiceAccess({
    port: COLOMBO,
    traderFactionId: "england",
    goodId: "cinnamon",
    cartazValid: false,
    disguisedEntry: true
  });
  assert.equal(disguised.allowed, true);
  assert.equal(disguised.lawful, false);
  assert.equal(disguised.illicit, true);
});

test("war blocks ordinary commerce while illicit access and disguise remain explicit exceptions", () => {
  const blocked = evaluateTradeAccess({
    port: LISBON,
    traderFactionId: "morocco",
    relation: DIPLOMACY_WAR
  });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, "war");
  assert.equal(blocked.policyId, WARTIME_TRADE_RESTRICTION_ID);
  assert.equal(blocked.policy.kind, "wartime-access");
  assert.equal(blocked.policy.hostFactionId, "portugal");
  assert.equal(blocked.lawful, false);
  assert.equal(blocked.portFactionId, "portugal");
  assert.equal(blocked.traderFactionId, "morocco");
  assert.equal(resolveRestrictedIllicitMarketAttempt(blocked, 0.449), true);
  assert.equal(resolveRestrictedIllicitMarketAttempt(blocked, 0.45), false);

  const illicit = evaluateTradeAccess({
    port: LISBON,
    traderFactionId: "morocco",
    relation: DIPLOMACY_WAR,
    illicitAccessPolicyId: WARTIME_TRADE_RESTRICTION_ID
  });
  assert.equal(illicit.allowed, true);
  assert.equal(illicit.illicit, true);

  const disguised = evaluateTradeAccess({
    port: LISBON,
    traderFactionId: "morocco",
    relation: DIPLOMACY_WAR,
    disguisedEntry: true
  });
  assert.equal(disguised.allowed, true);
});

test("foreign settlements provide the more favorable lawful customs jurisdiction", () => {
  const ternate = {
    tileId: 4,
    city: "Ternate",
    country: "Indonesia",
    factionId: "ternate",
    foreignSettlements: [foreignSettlementById("portuguese-ternate")]
  };
  const portuguese = customsTerms({
    port: ternate,
    traderFactionId: "portugal",
    relation: DIPLOMACY_NEUTRAL,
    relationToFaction: () => DIPLOMACY_NEUTRAL
  });
  assert.equal(portuguese.customsRate, 0);
  assert.equal(portuguese.domestic, true);
  assert.equal(portuguese.jurisdictionFactionId, "portugal");
  assert.equal(portuguese.foreignSettlementPrivilege, true);

  const english = customsTerms({
    port: ternate,
    traderFactionId: "england",
    relation: DIPLOMACY_NEUTRAL,
    relationToFaction: (factionId) => (
      factionId === "portugal" ? DIPLOMACY_ALLY : DIPLOMACY_NEUTRAL
    )
  });
  assert.equal(english.customsRate, 0.02);
  assert.equal(english.jurisdictionFactionId, "portugal");
  assert.equal(english.foreignSettlementPrivilege, true);

  const expulsions = createForeignSettlementExpulsionMemory();
  expelHostileForeignSettlements({
    memory: expulsions,
    ports: [ternate],
    relationBetween: () => DIPLOMACY_HOSTILE,
    simMinute: 100
  });
  const afterExpulsion = customsTerms({
    port: ternate,
    traderFactionId: "portugal",
    relation: DIPLOMACY_NEUTRAL,
    relationToFaction: () => DIPLOMACY_NEUTRAL,
    foreignSettlementExpulsions: expulsions
  });
  assert.equal(afterExpulsion.customsRate, 0.1);
  assert.equal(afterExpulsion.jurisdictionFactionId, "ternate");
  assert.equal(afterExpulsion.foreignSettlementPrivilege, false);
});

test("a resident settlement can open a closed sovereign market but cannot override war", () => {
  const mingPortWithPortugueseSettlement = {
    tileId: 5,
    city: "Guangzhou",
    country: "China",
    factionId: "ming",
    lat: 23.13,
    lon: 113.26,
    foreignSettlements: [{
      ...foreignSettlementById("portuguese-ternate"),
      id: "portuguese-guangzhou-test",
      city: "Guangzhou",
      country: "China"
    }]
  };
  const residentAccess = evaluateTradeAccess({
    port: mingPortWithPortugueseSettlement,
    traderFactionId: "england",
    relation: DIPLOMACY_NEUTRAL,
    relationToFaction: () => DIPLOMACY_NEUTRAL
  });
  assert.equal(residentAccess.allowed, true);
  assert.equal(residentAccess.reason, "foreign-settlement");
  assert.equal(residentAccess.foreignSettlementFactionId, "portugal");

  const wartime = evaluateTradeAccess({
    port: mingPortWithPortugueseSettlement,
    traderFactionId: "england",
    relation: DIPLOMACY_WAR,
    relationToFaction: () => DIPLOMACY_ALLY
  });
  assert.equal(wartime.allowed, false);
  assert.equal(wartime.reason, "war");
});

test("cartaz rules cover guarded Estado routes and reward good relations", () => {
  assert.equal(PORTUGUESE_CARTAZ_DURATION_DAYS, 90);
  assert.equal(portugueseCartazRequired({
    traderFactionId: "england",
    latitudeDeg: 15,
    longitudeDeg: 74
  }), true);
  assert.equal(portugueseCartazRequired({
    traderFactionId: "england",
    latitudeDeg: 45,
    longitudeDeg: -30
  }), false);
  assert.equal(portugueseCartazRequired({
    traderFactionId: "portugal",
    latitudeDeg: 15,
    longitudeDeg: 74
  }), false);

  const allied = portugueseCartazFee({
    traderFactionId: "england",
    relation: DIPLOMACY_ALLY,
    cargoCapacity: 40
  });
  const neutral = portugueseCartazFee({
    traderFactionId: "england",
    relation: DIPLOMACY_NEUTRAL,
    cargoCapacity: 40
  });
  const hostile = portugueseCartazFee({
    traderFactionId: "england",
    relation: DIPLOMACY_HOSTILE,
    cargoCapacity: 40
  });
  assert.ok(allied < neutral);
  assert.ok(hostile > neutral);
  assert.equal(portugueseCartazFee({
    traderFactionId: "ottoman",
    relation: DIPLOMACY_WAR,
    cargoCapacity: 40
  }), null);
  assert.equal(portugueseCartazFine(neutral), neutral * 3);
  assert.ok(portugueseCartazFine(neutral) > hostile);
});

test("special trade restrictions live in one explicit policy registry", () => {
  assert.deepEqual(
    TRADE_POLICY_REGIMES.map((regime) => regime.id),
    [
      "relation-customs",
      "foreign-settlements",
      "wartime-trade-restriction",
      "ming-maritime-prohibition",
      "joseon-licensed-trade",
      "spanish-indies-monopoly",
      "portuguese-cartaz",
      "portuguese-crown-spices"
    ]
  );
});
