import assert from "node:assert/strict";
import test from "node:test";

import { createGameState } from "./gameState.js";
import {
  FISH_PLAYER_CATCH_COOLDOWN_MINUTES,
  fisheryForHabitat,
  harvestFishery
} from "./fishEcology.js";

const MINUTE = 1440;

test("temperate rivers can produce seasonal salmon runs", () => {
  const state = createGameState({ cargoCapacity: 20 });
  const fishery = findFishery(state, "river", 48, -123, 280 * MINUTE, "salmon");

  assert.equal(fishery.kind, "fishery");
  assert.equal(fishery.speciesId, "salmon");
  assert.equal(fishery.habitatKind, "river");
  assert.ok(fishery.population > 0);
  assert.ok(fishery.capacity >= fishery.population);
  assert.ok(fishery.visibleIndividualCount > 0);
  assert.ok(fishery.areaRadiusPx > 0);
});

test("fish catches mutate persistent fishery stock and enforce a local cooldown", () => {
  const state = createGameState({ cargoCapacity: 20 });
  const minute = 140 * MINUTE;
  const fishery = findFishery(state, "coastal", 42, -9, minute);
  const before = state.memory.fish.fisheries[fishery.stockKey].population;

  const caught = harvestFishery(state, fishery, 4, minute);
  const after = state.memory.fish.fisheries[fishery.stockKey].population;
  const cooldown = harvestFishery(state, fishery, 4, minute + 1);

  assert.ok(caught.quantity > 0);
  assert.ok(caught.quantity <= 4);
  assert.equal(caught.reason, "caught");
  assert.equal(caught.fisheryId, fishery.id);
  assert.ok(after < before);
  assert.equal(cooldown.quantity, 0);
  assert.equal(cooldown.reason, "cooldown");
});

test("overfished stocks disappear from the visible fishery layer", () => {
  const state = createGameState({ cargoCapacity: 20 });
  const minute = 180 * MINUTE;
  const habitat = findHabitatWithFishery(state, "coastal", 38, 12, minute);
  const fishery = fisheryForHabitat(state, habitat, minute);
  const stock = state.memory.fish.fisheries[fishery.stockKey];
  stock.population = 2;

  const caught = harvestFishery(
    state,
    fishery,
    8,
    minute + FISH_PLAYER_CATCH_COOLDOWN_MINUTES + 1
  );
  const visible = fisheryForHabitat(
    state,
    habitat,
    minute + FISH_PLAYER_CATCH_COOLDOWN_MINUTES + 2
  );

  assert.equal(caught.quantity, 2);
  assert.equal(caught.overfished, true);
  assert.equal(caught.depleted, true);
  assert.equal(visible, null);
});

function findFishery(state, kind, lat, lon, simMinute, speciesId = null) {
  const habitat = findHabitatWithFishery(state, kind, lat, lon, simMinute, speciesId);
  return fisheryForHabitat(state, habitat, simMinute);
}

function findHabitatWithFishery(state, kind, lat, lon, simMinute, speciesId = null) {
  for (let tileId = 1; tileId < 8000; tileId++) {
    const habitat = { tileId, kind, lat, lon };
    const fishery = fisheryForHabitat(state, habitat, simMinute);
    if (fishery && (!speciesId || fishery.speciesId === speciesId)) return habitat;
  }
  throw new Error(`Could not find ${speciesId || "any"} ${kind} fishery for test`);
}
