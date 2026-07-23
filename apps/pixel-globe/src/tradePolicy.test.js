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
  PORTUGUESE_CROWN_SPICE_GOOD_IDS,
  TRADE_POLICY_REGIMES,
  customsTerms,
  customsRateForRelation,
  evaluateTradeAccess,
  isPortugueseEstadoPort,
  portugueseCartazFee,
  portugueseCartazFine,
  portugueseCartazRequired,
  tradeTerms
} from "./tradePolicy.js";

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
  assert.equal(isPortugueseEstadoPort(LISBON), false);
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

test("war blocks ordinary commerce while a successful disguise remains an explicit exception", () => {
  const blocked = evaluateTradeAccess({
    port: LISBON,
    traderFactionId: "morocco",
    relation: DIPLOMACY_WAR
  });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, "war");

  const disguised = evaluateTradeAccess({
    port: LISBON,
    traderFactionId: "morocco",
    relation: DIPLOMACY_WAR,
    disguisedEntry: true
  });
  assert.equal(disguised.allowed, true);
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
  assert.ok(allied < neutral);
  assert.equal(portugueseCartazFee({
    traderFactionId: "ottoman",
    relation: DIPLOMACY_WAR,
    cargoCapacity: 40
  }), null);
  assert.equal(portugueseCartazFine(neutral), neutral * 2);
});

test("special trade restrictions live in one explicit policy registry", () => {
  assert.deepEqual(
    TRADE_POLICY_REGIMES.map((regime) => regime.id),
    [
      "relation-customs",
      "ming-maritime-prohibition",
      "portuguese-cartaz",
      "portuguese-crown-spices"
    ]
  );
});
