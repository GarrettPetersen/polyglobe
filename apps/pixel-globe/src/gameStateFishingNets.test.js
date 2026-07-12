import assert from "node:assert/strict";
import test from "node:test";

import {
  createGameState,
  ledgerEntries,
  playerFishingNet,
  purchaseFishingNet,
  shipItemRows
} from "./gameState.js";
import { BASIC_FISHING_NET_ID } from "./fishingNets.js";

const LISBON = {
  tileId: 1,
  city: "Lisbon",
  displayCity: "Lisbon",
  country: "Portugal"
};

test("players begin with the low-capacity basic cast net", () => {
  const state = createGameState({ cargoCapacity: 20 });
  const net = playerFishingNet(state);

  assert.equal(net.id, BASIC_FISHING_NET_ID);
  assert.equal(net.maxCatch, 2);
  assert.equal(shipItemRows(state)[0].label, "Basic cast net");
  assert.match(shipItemRows(state)[0].detail, /max haul 2/);
});

test("fishing net upgrades are expensive equipment purchases recorded in the ledger", () => {
  const state = createGameState({ cargoCapacity: 20 });
  state.doubloons = 5000;

  const purchase = purchaseFishingNet(state, LISBON, "weighted-cast-net", { simMinute: 120 });

  assert.equal(purchase.previous.id, BASIC_FISHING_NET_ID);
  assert.equal(purchase.net.id, "weighted-cast-net");
  assert.equal(purchase.price, 900);
  assert.equal(state.doubloons, 4100);
  assert.equal(playerFishingNet(state).maxCatch, 4);
  assert.deepEqual(ledgerEntries(state).at(-1), {
    id: 2,
    kind: "equipment",
    simMinute: 120,
    location: "Lisbon",
    country: "Portugal",
    description: "Buy Weighted cast net",
    goodId: null,
    quantity: 1,
    amount: -900,
    balance: 4100,
    costBasis: 900,
    pnl: null
  });
});

test("players cannot afford top nets early or replace good gear with worse gear", () => {
  const state = createGameState({ cargoCapacity: 20 });

  assert.throws(
    () => purchaseFishingNet(state, LISBON, "masterwork-seine"),
    /Not enough doubloons/
  );
  state.doubloons = 20000;
  purchaseFishingNet(state, LISBON, "drift-net");
  assert.throws(
    () => purchaseFishingNet(state, LISBON, BASIC_FISHING_NET_ID),
    /not an upgrade/
  );
});
