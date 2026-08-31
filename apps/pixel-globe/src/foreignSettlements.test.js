import assert from "node:assert/strict";
import test from "node:test";

import {
  FOREIGN_SETTLEMENTS_1522,
  activeForeignSettlements,
  cityFlagFactionIds,
  createForeignSettlementExpulsionMemory,
  expelledForeignSettlements,
  expelHostileForeignSettlements,
  foreignSettlementById,
  foreignSettlementsForCity1522,
  validateForeignSettlementExpulsionMemory,
  withForeignSettlements1522
} from "./foreignSettlements.js";

test("the 1522 registry contains only historically active starting settlements", () => {
  assert.deepEqual(
    FOREIGN_SETTLEMENTS_1522.map((entry) => entry.id),
    [
      "portuguese-hormuz",
      "portuguese-muscat",
      "portuguese-ternate",
      "portuguese-ayutthaya",
      "portuguese-patani",
      "portuguese-cochin",
      "portuguese-calicut",
      "portuguese-colombo",
      "portuguese-zanzibar",
      "portuguese-quilon",
      "venetian-constantinople",
      "venetian-alexandria"
    ]
  );
  assert.deepEqual(
    foreignSettlementsForCity1522({ cityId: "ternate|indonesia", city: "Ternate", country: "Indonesia" })
      .map((entry) => entry.factionId),
    ["portugal"]
  );
  assert.deepEqual(
    foreignSettlementsForCity1522({ cityId: "zanzibar|tanzania", city: "Zanzibar", country: "Tanzania" })
      .map((entry) => entry.factionId),
    ["portugal"]
  );
  assert.deepEqual(
    foreignSettlementsForCity1522({ cityId: "nagasaki|japan", city: "Nagasaki", country: "Japan" }),
    []
  );
  assert.equal(foreignSettlementById("portuguese-nagasaki").activeAtStart, false);
});

test("city enrichment preserves sovereignty while exposing resident jurisdictions", () => {
  const ternate = withForeignSettlements1522({
    cityId: "ternate|indonesia",
    city: "Ternate",
    country: "Indonesia",
    factionId: "ternate"
  });
  assert.equal(ternate.factionId, "ternate");
  assert.deepEqual(cityFlagFactionIds(ternate), ["ternate", "portugal"]);
  assert.deepEqual(
    activeForeignSettlements(ternate).map((entry) => entry.label),
    ["Portuguese fort and factory"]
  );

  const conquered = { ...ternate, factionId: "portugal" };
  assert.deepEqual(cityFlagFactionIds(conquered), ["portugal"]);
  assert.deepEqual(activeForeignSettlements(conquered), []);
});

test("cities without a foreign settlement remain unchanged", () => {
  const london = { cityId: "london|united kingdom", city: "London", country: "United Kingdom", factionId: "england" };
  assert.equal(withForeignSettlements1522(london), london);
  assert.deepEqual(cityFlagFactionIds(london), ["england"]);
});

test("hostile relations permanently expel a resident settlement for the voyage", () => {
  const ternate = withForeignSettlements1522({
    cityId: "ternate|indonesia",
    city: "Ternate",
    country: "Indonesia",
    factionId: "ternate"
  });
  const memory = createForeignSettlementExpulsionMemory();
  assert.deepEqual(expelHostileForeignSettlements({
    memory,
    ports: [ternate],
    relationBetween: () => "neutral",
    simMinute: 100
  }), []);

  const events = expelHostileForeignSettlements({
    memory,
    ports: [ternate],
    relationBetween: () => "hostile",
    simMinute: 200
  });

  assert.deepEqual(events.map((entry) => entry.settlementId), ["portuguese-ternate"]);
  assert.deepEqual(activeForeignSettlements(ternate, memory), []);
  assert.deepEqual(
    expelledForeignSettlements(ternate, memory).map((entry) => entry.id),
    ["portuguese-ternate"]
  );
  assert.deepEqual(cityFlagFactionIds(ternate, memory), ["ternate"]);

  assert.deepEqual(expelHostileForeignSettlements({
    memory,
    ports: [ternate],
    relationBetween: () => "friendly",
    simMinute: 300
  }), []);
  assert.deepEqual(activeForeignSettlements(ternate, memory), []);
  assert.doesNotThrow(() => validateForeignSettlementExpulsionMemory(
    JSON.parse(JSON.stringify(memory))
  ));
});

test("a resident power taking sovereignty removes the duplicate flag without an expulsion", () => {
  const portugueseTernate = withForeignSettlements1522({
    cityId: "ternate|indonesia",
    city: "Ternate",
    country: "Indonesia",
    factionId: "portugal"
  });
  const memory = createForeignSettlementExpulsionMemory();

  assert.deepEqual(expelHostileForeignSettlements({
    memory,
    ports: [portugueseTernate],
    relationBetween: () => "war",
    simMinute: 200
  }), []);
  assert.deepEqual(cityFlagFactionIds(portugueseTernate, memory), ["portugal"]);
  assert.equal(memory.revision, 0);
});
