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
  TRADE_EMBARGO_AUTHORITY_NATIONAL,
  TRADE_EMBARGO_REPUTATION_PENALTY,
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
  recordTradeEmbargoPurchase,
  resolveTradeEmbargoInspection,
  tradeEmbargoIncidentForInspection,
  tradeEmbargoOrdersForPurchase
} from "./tradeEmbargoes.js";
import { npcTradeEmbargoViolations } from "./npcSeaRoutes.js";

const RHODES = Object.freeze({
  tileId: 12,
  portId: "city-12",
  city: "Rhodes",
  country: "Greece",
  factionId: "hospitallers"
});
const ISTANBUL = Object.freeze({
  tileId: 13,
  portId: "city-13",
  city: "Istanbul",
  country: "Turkey",
  factionId: "ottoman"
});

test("1522 embargoes distinguish a Hospitaller commercial prohibition from Papal war materiel", () => {
  const memory = createTradeEmbargoMemory({ seedKey: "historical" });
  const orders = activeTradeEmbargoOrders(memory);
  const hospitaller = orders.find((order) => (
    order.authorityKind === TRADE_EMBARGO_AUTHORITY_NATIONAL &&
    order.issuerFactionId === "hospitallers" && order.targetFactionId === "ottoman"
  ));
  const papal = orders.find((order) => order.authorityKind === "papal" &&
    order.targetFactionId === "ottoman");

  assert.equal(hospitaller.scope, "all-goods");
  assert.equal(papal.scope, TRADE_EMBARGO_SCOPE_WAR_MATERIEL);
  assert.ok(papal.followerFactionIds.includes("hospitallers"));
  assert.ok(papal.followerFactionIds.includes("papal-states"));
  assert.equal(TRADE_EMBARGO_REPUTATION_PENALTY, 9);
  assert.equal(PAPAL_EMBARGO_REPUTATION_PENALTY, 5);
});

test("ordinary Ottoman wares violate the Hospitaller embargo but not the narrower Papal prohibition", () => {
  const memory = createTradeEmbargoMemory({ seedKey: "scopes" });
  const carpets = tradeEmbargoOrdersForPurchase(memory, {
    sourceFactionId: "ottoman",
    playerFactionId: "england",
    goodId: "carpets"
  });
  const gunpowder = tradeEmbargoOrdersForPurchase(memory, {
    sourceFactionId: "ottoman",
    playerFactionId: "england",
    goodId: "gunpowder"
  });

  assert.deepEqual(carpets.map((order) => order.issuerFactionId), ["hospitallers"]);
  assert.deepEqual(new Set(gunpowder.map((order) => order.authorityKind)), new Set(["national", "papal"]));
});

test("tracked Ottoman purchases can be detected, seized, or defended by force", () => {
  const embargoes = createTradeEmbargoMemory({ seedKey: "inspection" });
  const enforcement = createTradeEmbargoEnforcementMemory();
  const [order] = tradeEmbargoOrdersForPurchase(embargoes, {
    sourceFactionId: "ottoman",
    goodId: "carpets",
    playerFactionId: "england"
  });
  const [recorded] = recordTradeEmbargoPurchase(enforcement, [order], {
    port: ISTANBUL,
    goodId: "carpets",
    quantity: 4,
    transactionValue: 600,
    simMinute: 100
  });
  assert.deepEqual(embargoCargoAvailable(recorded, { carpets: 4 }).manifest, { carpets: 4 });

  const incident = tradeEmbargoIncidentForInspection(
    enforcement,
    embargoes,
    "hospitallers",
    "rhodes-galley",
    { carpets: 4 }
  );
  assert.equal(incident.id, recorded.id);
  const caught = resolveTradeEmbargoInspection(
    enforcement,
    incident.id,
    "hospitallers",
    "rhodes-galley",
    0
  );
  assert.equal(caught.detected, true);
  assert.ok(caught.fine >= 100);
  beginTradeEmbargoEnforcementCombat(enforcement, incident.id);
  assert.deepEqual(activeTradeEmbargoCombatFactionIds(enforcement), ["hospitallers"]);
});

test("selling or jettisoning tracked cargo removes the corresponding embargo risk", () => {
  const embargoes = createTradeEmbargoMemory({ seedKey: "consumption" });
  const enforcement = createTradeEmbargoEnforcementMemory();
  const orders = tradeEmbargoOrdersForPurchase(embargoes, {
    sourceFactionId: "ottoman",
    goodId: "carpets",
    playerFactionId: "england"
  });
  recordTradeEmbargoPurchase(enforcement, orders, {
    port: ISTANBUL,
    goodId: "carpets",
    quantity: 3,
    transactionValue: 450,
    simMinute: 100
  });
  assert.equal(consumeTrackedEmbargoCargo(enforcement, "carpets", 2), 2);
  assert.deepEqual(enforcement.incidents[0].cargo, { carpets: 1 });
  assert.equal(consumeTrackedEmbargoCargo(enforcement, "carpets", 1), 1);
  assert.equal(enforcement.incidents.length, 0);
});

test("national embargoes lift after peace while later wars can produce new orders", () => {
  const memory = createTradeEmbargoMemory({ seedKey: "politics" });
  const diplomacy = createWorldDiplomacy({ seedKey: "politics" });
  diplomacy.overrides["england|france"] = DIPLOMACY_FRIENDLY;
  diplomacy.pairLastChangedMinute["england|france"] = 1;
  const minute = memory.nextReviewMinute;
  const events = advanceTradeEmbargoPolitics(memory, diplomacy, minute, {
    authorityForFaction: () => 60,
    papalAuthority: 60
  });
  assert.ok(events.some((event) => event.kind === "lifted" &&
    event.issuerFactionId === "england" && event.targetFactionId === "france"));

  diplomacy.overrides["england|france"] = DIPLOMACY_WAR;
  diplomacy.pairLastChangedMinute["england|france"] = minute + 1;
  for (let index = 0; index < 30 && !activeTradeEmbargoOrders(memory).some((order) => (
    order.issuerFactionId === "england" && order.targetFactionId === "france"
  )); index++) {
    advanceTradeEmbargoPolitics(memory, diplomacy, memory.nextReviewMinute, {
      authorityForFaction: () => 100,
      papalAuthority: 60
    });
  }
  assert.ok(activeTradeEmbargoOrders(memory).some((order) => (
    order.issuerFactionId === "england" && order.targetFactionId === "france"
  )));
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
  };

  const hospitaller = npcTradeEmbargoViolations(ship, embargoes, ["hospitallers"]);
  const spanish = npcTradeEmbargoViolations(ship, embargoes, ["spain"]);
  const french = npcTradeEmbargoViolations(ship, embargoes, ["france"]);

  assert.ok(hospitaller.some((violation) => (
    violation.authorityKind === "national" && violation.cargo.carpets === 3
  )));
  assert.deepEqual(spanish.map((violation) => violation.cargo), [{ gunpowder: 2 }]);
  assert.deepEqual(french, []);
});
