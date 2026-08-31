import assert from "node:assert/strict";
import test from "node:test";

import {
  DIPLOMACY_FRIENDLY,
  DIPLOMACY_WAR
} from "./factions.js";
import {
  createWorldDiplomacy
} from "./worldDiplomacy.js";
import {
  PAPAL_EMBARGO_REPUTATION_PENALTY,
  HOSPITALLER_OTTOMAN_BLOCKADE_MINUTE,
  TRADE_EMBARGO_AUTHORITY_NATIONAL,
  TRADE_EMBARGO_REPUTATION_PENALTY,
  TRADE_EMBARGO_RESTRICTION_BLOCKADE,
  TRADE_EMBARGO_RESTRICTION_EXPORTS,
  TRADE_EMBARGO_RESTRICTION_IMPORTS,
  TRADE_EMBARGO_SCOPE_WAR_MATERIEL,
  activeTradeEmbargoCombatFactionIds,
  activeTradeEmbargoOrders,
  advanceTradeEmbargoPolitics,
  beginTradeEmbargoEnforcementCombat,
  consumeTrackedEmbargoCargo,
  createTradeEmbargoEnforcementMemory,
  createTradeEmbargoMemory,
  embargoCargoAvailable,
  npcWillSmuggleEmbargoedCargo,
  migrateTradeEmbargoMemory,
  migrateTradeEmbargoEnforcementMemory,
  recordTradeEmbargoPurchase,
  resolveTradeEmbargoInspection,
  tradeEmbargoIncidentForInspection,
  tradeEmbargoOrdersForPurchase,
  tradeEmbargoOrdersForSale,
  tradeEmbargoOrdersForShipping
} from "./tradeEmbargoes.js";
import { npcTradeEmbargoViolations } from "./npcSeaRoutes.js";

const RHODES = Object.freeze({
  tileId: 12,
  portId: "city-12",
  cityId: "rhodes|greece",
  city: "Rhodes",
  country: "Greece",
  factionId: "hospitallers"
});
const ISTANBUL = Object.freeze({
  tileId: 13,
  portId: "city-13",
  cityId: "istanbul|turkey",
  city: "Istanbul",
  country: "Turkey",
  factionId: "ottoman"
});
const ROUEN = Object.freeze({
  tileId: 14,
  portId: "city-14",
  cityId: "rouen|france",
  city: "Rouen",
  country: "France",
  factionId: "france"
});

test("the March 1522 opening has enemy-import bans and a destination-bound Papal arms prohibition", () => {
  const memory = createTradeEmbargoMemory({ seedKey: "historical" });
  const orders = activeTradeEmbargoOrders(memory);
  const papal = orders.find((order) => order.authorityKind === "papal" &&
    order.targetFactionId === "ottoman");
  const french = orders.find((order) => order.issuerFactionId === "france" &&
    order.targetFactionId === "england");

  assert.deepEqual(orders.filter((order) => order.authorityKind === "national")
    .map((order) => `${order.issuerFactionId}>${order.targetFactionId}`).sort(), [
    "burgundian-netherlands>france",
    "france>england",
    "habsburg>france",
    "spain>france"
  ]);
  assert.equal(orders.some((order) => order.issuerFactionId === "hospitallers"), false);
  assert.equal(french.restrictionKind, TRADE_EMBARGO_RESTRICTION_IMPORTS);
  assert.equal(papal.scope, TRADE_EMBARGO_SCOPE_WAR_MATERIEL);
  assert.equal(papal.restrictionKind, TRADE_EMBARGO_RESTRICTION_EXPORTS);
  assert.ok(papal.followerFactionIds.includes("hospitallers"));
  assert.ok(papal.followerFactionIds.includes("papal-states"));
  assert.equal(TRADE_EMBARGO_REPUTATION_PENALTY, 9);
  assert.equal(PAPAL_EMBARGO_REPUTATION_PENALTY, 5);
});

test("Suleiman's restoration of Safavid commerce leaves Persian silk outside an opening embargo", () => {
  const memory = createTradeEmbargoMemory({ seedKey: "safavid-commerce" });
  assert.deepEqual(tradeEmbargoOrdersForPurchase(memory, {
    sourceFactionId: "safavid",
    playerFactionId: "ottoman",
    goodId: "silk"
  }), []);
});

test("Ottoman wares are not Papal contraband but delivering arms to Ottoman buyers is", () => {
  const memory = createTradeEmbargoMemory({ seedKey: "scopes" });
  const carpets = tradeEmbargoOrdersForPurchase(memory, {
    sourceFactionId: "ottoman",
    playerFactionId: "england",
    goodId: "carpets"
  });
  const gunpowder = tradeEmbargoOrdersForSale(memory, {
    destinationFactionId: "ottoman",
    playerFactionId: "england",
    goodId: "gunpowder"
  });

  assert.deepEqual(carpets, []);
  assert.deepEqual(gunpowder.map((order) => order.authorityKind), ["papal"]);
});

test("tracked French purchases can be detected, seized, or defended by force", () => {
  const embargoes = createTradeEmbargoMemory({ seedKey: "inspection" });
  const enforcement = createTradeEmbargoEnforcementMemory();
  const [order] = tradeEmbargoOrdersForPurchase(embargoes, {
    sourceFactionId: "france",
    goodId: "wool-cloth",
    playerFactionId: "england"
  });
  const [recorded] = recordTradeEmbargoPurchase(enforcement, [order], {
    port: ROUEN,
    goodId: "wool-cloth",
    quantity: 4,
    transactionValue: 600,
    simMinute: 100
  });
  assert.deepEqual(embargoCargoAvailable(recorded, { "wool-cloth": 4 }).manifest, { "wool-cloth": 4 });

  const incident = tradeEmbargoIncidentForInspection(
    enforcement,
    embargoes,
    "spain",
    "spanish-galleon",
    { "wool-cloth": 4 }
  );
  assert.equal(incident.id, recorded.id);
  const caught = resolveTradeEmbargoInspection(
    enforcement,
    incident.id,
    "spain",
    "spanish-galleon",
    0
  );
  assert.equal(caught.detected, true);
  assert.ok(caught.fine >= 100);
  beginTradeEmbargoEnforcementCombat(enforcement, incident.id);
  assert.deepEqual(activeTradeEmbargoCombatFactionIds(enforcement), ["spain"]);
});

test("selling or jettisoning tracked cargo removes the corresponding embargo risk", () => {
  const embargoes = createTradeEmbargoMemory({ seedKey: "consumption" });
  const enforcement = createTradeEmbargoEnforcementMemory();
  const orders = tradeEmbargoOrdersForPurchase(embargoes, {
    sourceFactionId: "france",
    goodId: "wool-cloth",
    playerFactionId: "england"
  });
  recordTradeEmbargoPurchase(enforcement, orders, {
    port: ROUEN,
    goodId: "wool-cloth",
    quantity: 3,
    transactionValue: 450,
    simMinute: 100
  });
  assert.equal(consumeTrackedEmbargoCargo(enforcement, "wool-cloth", 2), 2);
  assert.deepEqual(enforcement.incidents[0].cargo, { "wool-cloth": 1 });
  assert.equal(consumeTrackedEmbargoCargo(enforcement, "wool-cloth", 1), 1);
  assert.equal(enforcement.incidents.length, 0);
});

test("national embargoes lift after peace while later wars can produce new orders", () => {
  const memory = createTradeEmbargoMemory({ seedKey: "politics" });
  const diplomacy = createWorldDiplomacy({ seedKey: "politics" });
  diplomacy.overrides["france|spain"] = DIPLOMACY_FRIENDLY;
  diplomacy.pairLastChangedMinute["france|spain"] = 1;
  const minute = memory.nextReviewMinute;
  const events = advanceTradeEmbargoPolitics(memory, diplomacy, minute, {
    authorityForFaction: () => 60,
    papalAuthority: 60
  });
  assert.ok(events.some((event) => event.kind === "lifted" &&
    event.issuerFactionId === "spain" && event.targetFactionId === "france"));

  diplomacy.overrides["france|spain"] = DIPLOMACY_WAR;
  diplomacy.pairLastChangedMinute["france|spain"] = minute + 1;
  for (let index = 0; index < 30 && !activeTradeEmbargoOrders(memory).some((order) => (
    order.issuerFactionId === "spain" && order.targetFactionId === "france"
  )); index++) {
    advanceTradeEmbargoPolitics(memory, diplomacy, memory.nextReviewMinute, {
      authorityForFaction: () => 100,
      papalAuthority: 60
    });
  }
  assert.ok(activeTradeEmbargoOrders(memory).some((order) => (
    order.issuerFactionId === "spain" && order.targetFactionId === "france"
  )));
});

test("the Hospitaller blockade begins with the Rhodes campaign and controls Ottoman shipping", () => {
  const before = createTradeEmbargoMemory({
    startMinute: HOSPITALLER_OTTOMAN_BLOCKADE_MINUTE - 1,
    seedKey: "rhodes-before"
  });
  const after = createTradeEmbargoMemory({
    startMinute: HOSPITALLER_OTTOMAN_BLOCKADE_MINUTE,
    seedKey: "rhodes-after"
  });
  assert.equal(activeTradeEmbargoOrders(before).some((order) => (
    order.issuerFactionId === "hospitallers" && order.targetFactionId === "ottoman"
  )), false);
  const shipping = tradeEmbargoOrdersForShipping(after, {
    shipFactionId: "ottoman",
    destinationFactionId: "venice",
    goodId: "carpets"
  });
  assert.equal(shipping.length, 1);
  assert.equal(shipping[0].restrictionKind, TRADE_EMBARGO_RESTRICTION_BLOCKADE);
});

test("version 1 voyages retain their early English and Hospitaller bans without duplicate transitions", () => {
  const legacy = structuredClone(createTradeEmbargoMemory({ seedKey: "legacy-orders" }));
  legacy.version = 1;
  delete legacy.historicalTransitions;
  for (const order of legacy.orders) delete order.restrictionKind;
  for (const event of legacy.history) delete event.restrictionKind;
  legacy.orders.push({
    ...legacy.orders[0],
    id: "legacy-english-order",
    issuerFactionId: "england",
    targetFactionId: "france",
    followerFactionIds: ["england"],
    source: "historical-1522"
  }, {
    ...legacy.orders[0],
    id: "legacy-hospitaller-order",
    issuerFactionId: "hospitallers",
    targetFactionId: "ottoman",
    followerFactionIds: ["hospitallers"],
    source: "historical-1522"
  });

  const migrated = migrateTradeEmbargoMemory(legacy);
  assert.equal(migrated.historicalTransitions["english-french-war-embargo"], "completed");
  assert.equal(migrated.historicalTransitions["hospitaller-ottoman-blockade"], "completed");
  assert.equal(migrated.orders.find((order) => order.authorityKind === "papal").restrictionKind,
    TRADE_EMBARGO_RESTRICTION_EXPORTS);
  assert.equal(migrated.orders.filter((order) => (
    order.issuerFactionId === "england" && order.targetFactionId === "france"
  )).length, 1);
});

test("migration removes legacy Papal incidents that tracked imports under an export prohibition", () => {
  const embargoes = createTradeEmbargoMemory({ seedKey: "legacy-papal-incident" });
  const papal = activeTradeEmbargoOrders(embargoes).find((order) => (
    order.authorityKind === "papal" && order.targetFactionId === "ottoman"
  ));
  const enforcement = createTradeEmbargoEnforcementMemory();
  recordTradeEmbargoPurchase(enforcement, [papal], {
    port: ISTANBUL,
    goodId: "gunpowder",
    quantity: 1,
    transactionValue: 300,
    simMinute: 100
  });
  enforcement.version = 1;
  delete enforcement.incidents[0].restrictionKind;

  const migrated = migrateTradeEmbargoEnforcementMemory(enforcement, {
    embargoMemory: embargoes
  });
  assert.equal(migrated.version, 2);
  assert.deepEqual(migrated.incidents, []);
});

test("NPC captains have stable but different willingness to smuggle", () => {
  const choices = Array.from({ length: 60 }, (_unused, index) => npcWillSmuggleEmbargoedCargo({
    shipId: `merchant-${index}`,
    seed: index,
    expectedProfit: 300,
    cargoValue: 1000
  }));
  assert.ok(choices.includes(true));
  assert.ok(choices.includes(false));
  assert.equal(npcWillSmuggleEmbargoedCargo({
    shipId: "merchant-4",
    seed: 4,
    expectedProfit: 300,
    cargoValue: 1000
  }), choices[4]);
});

test("NPC cargo provenance exposes only violations the player's commissions may enforce", () => {
  const embargoes = createTradeEmbargoMemory({ seedKey: "npc-prize" });
  const ship = {
    id: "ottoman-merchant-7",
    cargoCapacity: 20,
    cargo: { carpets: 3, gunpowder: 2 },
    cargoCost: { carpets: 450, gunpowder: 800 },
    cargoOrigins: {
      carpets: [{
        sourceFactionId: "ottoman",
        sourceTileId: ISTANBUL.tileId,
        quantity: 3,
        purchasedMinute: 100
      }],
      gunpowder: [{
        sourceFactionId: "ottoman",
        sourceTileId: ISTANBUL.tileId,
        quantity: 2,
        purchasedMinute: 100
      }]
    },
    tradeEmbargoConvictions: 0,
    lastTradeEmbargoEnforcement: null
    ,plan: { destination: ISTANBUL }
  };

  const hospitaller = npcTradeEmbargoViolations(ship, embargoes, ["hospitallers"]);
  const spanish = npcTradeEmbargoViolations(ship, embargoes, ["spain"]);
  const french = npcTradeEmbargoViolations(ship, embargoes, ["france"]);

  assert.ok(hospitaller.some((violation) => violation.authorityKind === "papal" &&
    violation.cargo.gunpowder === 2));
  assert.deepEqual(spanish.map((violation) => violation.cargo), [{ gunpowder: 2 }]);
  assert.deepEqual(french, []);
});
