import assert from "node:assert/strict";
import test from "node:test";

import {
  cargoFree,
  cargoQuantityCapacityForGood,
  cargoUsed,
  cargoUsedTicks,
  createGameState,
  fishCatchCargoCapacity,
  initializeProvisionalShipLoadout,
  recordDiscovery,
  receiveDiscoveryCargo,
  receiveFishCatch,
  receivePortConquestPrize,
  receiveSurrenderedLoot
} from "./gameState.js";
import { shipStatsForSlug } from "./shipStats.js";

test("surrendered loot credits money and accepts only cargo that fits", () => {
  const state = createGameState({ cargoCapacity: 3, startMinute: 100 });
  const received = receiveSurrenderedLoot(state, {
    specie: 75,
    cargo: { grain: 5, wine: 2 }
  }, { simMinute: 140 });

  assert.equal(state.doubloons, 435);
  assert.ok(cargoUsed(state) <= state.cargoCapacity);
  assert.equal(received.specie, 75);
  assert.ok(Object.values(received.cargo).reduce((sum, quantity) => sum + quantity, 0) > 0);
  assert.ok(state.accounts.ledger.some((entry) => entry.description === "Surrendered prize money"));
});

test("port conquest pays prize money and records the captured treasury", () => {
  const state = createGameState({ cargoCapacity: 3, startMinute: 100 });
  const city = { tileId: 9, city: "Lisbon", displayCity: "Lisbon", country: "Portugal" };
  const prize = receivePortConquestPrize(state, city, 1800, { simMinute: 140 });
  assert.deepEqual(prize, { amount: 1800, balance: 2160 });
  assert.equal(state.doubloons, 2160);
  assert.deepEqual(state.accounts.ledger.at(-1), {
    id: 2,
    kind: "conquest",
    simMinute: 140,
    location: "Lisbon",
    country: "Portugal",
    description: "Lisbon conquest prize",
    goodId: null,
    quantity: 0,
    amount: 1800,
    balance: 2160,
    costBasis: 0,
    pnl: 1800
  });
});

test("fish catches enter cargo and the ledger with no cost basis", () => {
  const state = createGameState({ cargoCapacity: 4, startMinute: 100 });
  const received = receiveFishCatch(state, {
    stockKey: "10:salmon",
    speciesLabel: "Salmon",
    quantity: 3
  }, { simMinute: 120, location: "Near river mouth" });

  assert.equal(received.good.id, "fish");
  assert.equal(received.quantity, 3);
  assert.equal(state.cargo.fish, 3);
  assert.equal(state.accounts.cargoCostBasis.fish, 0);
  assert.ok(state.accounts.ledger.some((entry) => (
    entry.kind === "catch" &&
    entry.description === "Catch Salmon x3" &&
    entry.amount === 0
  )));
});

test("fishing can partially fill physical hold space reserved for later provisions", () => {
  const stats = shipStatsForSlug("brigantine");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  initializeProvisionalShipLoadout(state, stats);
  const initiallyFree = cargoFree(state);
  state.cargo.gold = initiallyFree;
  state.accounts.cargoCostBasis.gold = 0;
  state.survival.freshWater -= 5;

  assert.equal(cargoUsed(state), state.cargoCapacity - 5);
  assert.equal(cargoFree(state), 0);
  assert.equal(cargoQuantityCapacityForGood(state, "fish"), 0);
  assert.equal(fishCatchCargoCapacity(state), 5);

  const received = receiveFishCatch(state, {
    stockKey: "10:cod",
    speciesLabel: "Cod",
    quantity: 5
  });
  assert.equal(received.quantity, 5);
  assert.equal(cargoUsed(state), state.cargoCapacity);
});

test("fractional ration space cannot be harvested as a fractional fish lot", () => {
  const state = createGameState({ cargoCapacity: 1, startMinute: 100 });
  state.cargo.hardtack = 2 / 3;
  state.accounts.cargoCostBasis.hardtack = 0;

  assert.ok(cargoFree(state) > 0.33 && cargoFree(state) < 0.34);
  assert.equal(cargoQuantityCapacityForGood(state, "fish"), 0);
  assert.equal(fishCatchCargoCapacity(state), 0);
  assert.throws(() => receiveFishCatch(state, {
    stockKey: "10:cod",
    speciesLabel: "Cod",
    quantity: 1
  }), /Not enough cargo space/);
});

test("cargo capacity uses integer ration-sized ticks for arbitrary fractional goods", () => {
  const state = createGameState({ cargoCapacity: 2, startMinute: 100 });
  state.cargo.wine = 0.123456789;
  state.accounts.cargoCostBasis.wine = 1;

  assert.equal(cargoUsedTicks(state), 2);
  assert.equal(cargoUsed(state), 2 / 12);
  assert.equal(cargoFree(state), 22 / 12);
  assert.equal(cargoQuantityCapacityForGood(state, "fish"), 1);
});

test("El Dorado fills the remaining hold with zero-basis trade gold exactly once", () => {
  const state = createGameState({ cargoCapacity: 4, startMinute: 100 });
  receiveFishCatch(state, {
    stockKey: "10:salmon",
    speciesLabel: "Salmon",
    quantity: 1
  }, { simMinute: 110 });
  const elDorado = {
    id: "legend-el-dorado",
    displayName: "El Dorado",
    kind: "legend",
    detail: "The legend of the golden city"
  };
  recordDiscovery(state, elDorado);

  const received = receiveDiscoveryCargo(state, elDorado, "gold", { simMinute: 120 });
  const duplicate = receiveDiscoveryCargo(state, elDorado, "gold", { simMinute: 121 });

  assert.equal(received.good.label, "Gold");
  assert.equal(received.quantity, 3);
  assert.equal(received.alreadyReceived, false);
  assert.equal(state.cargo.gold, 3);
  assert.equal(state.accounts.cargoCostBasis.gold, 0);
  assert.equal(cargoUsed(state), state.cargoCapacity);
  assert.equal(duplicate.quantity, 0);
  assert.equal(duplicate.alreadyReceived, true);
  assert.equal(state.accounts.ledger.at(-1).kind, "discovery");
  assert.equal(state.accounts.ledger.at(-1).description, "Treasure from El Dorado: Gold x3");
});
