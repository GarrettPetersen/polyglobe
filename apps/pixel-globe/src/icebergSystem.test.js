import assert from "node:assert/strict";
import test from "node:test";
import {
  ICEBERG_ADVANCE_INTERVAL_MINUTES,
  advanceIcebergMemory,
  createIcebergMemory,
  icebergVariantById,
  seedIcebergPopulation,
  validateIcebergMemory
} from "./icebergSystem.js";

const CANDIDATES = Object.freeze([
  Object.freeze({ sourceIceTileId: 1, tileId: 2, position: Object.freeze([1, 0, 0]) }),
  Object.freeze({ sourceIceTileId: 3, tileId: 4, position: Object.freeze([0, 0, -1]) })
]);

test("iceberg seeding is deterministic and preserves three physical size classes", () => {
  const first = createIcebergMemory();
  const second = createIcebergMemory();
  seedIcebergPopulation(first, CANDIDATES, { count: 24, seedKey: "voyage-a" });
  seedIcebergPopulation(second, CANDIDATES, { count: 24, seedKey: "voyage-a" });
  assert.deepEqual(first, second);
  assert.equal(new Set(first.individuals.map((iceberg) => iceberg.variantId)).size, 3);
  for (const iceberg of first.individuals) {
    assert.ok(icebergVariantById(iceberg.variantId).mass > 0);
  }
});

test("icebergs drift with wind through open water", () => {
  const memory = createIcebergMemory();
  seedIcebergPopulation(memory, CANDIDATES, { count: 1, seedKey: "drift", startMinute: 0 });
  const before = memory.individuals[0].position.slice();
  const result = advanceIcebergMemory(memory, {
    currentMinute: ICEBERG_ADVANCE_INTERVAL_MINUTES,
    environmentAtPosition: (position) => ({
      tileId: position[2] < -0.001 ? 5 : 2,
      navigable: true,
      frozen: false,
      windDirectionRad: Math.PI,
      windStrength: 1,
      waterTemperatureC: -1
    }),
    spawnCandidates: CANDIDATES,
    seedKey: "drift",
    targetCount: 1
  });
  assert.equal(result.changed, true);
  assert.notDeepEqual(memory.individuals[0].position, before);
});

test("warm water melts icebergs while cold water preserves them", () => {
  const warm = createIcebergMemory();
  const cold = createIcebergMemory();
  seedIcebergPopulation(warm, CANDIDATES, { count: 1, seedKey: "melt" });
  seedIcebergPopulation(cold, CANDIDATES, { count: 1, seedKey: "melt" });
  const environment = (temperature) => () => ({
    tileId: 2,
    navigable: true,
    frozen: false,
    windDirectionRad: 0,
    windStrength: 0,
    waterTemperatureC: temperature
  });
  advanceIcebergMemory(warm, {
    currentMinute: 10 * 24 * 60,
    environmentAtPosition: environment(22),
    spawnCandidates: [],
    seedKey: "melt",
    targetCount: 0
  });
  advanceIcebergMemory(cold, {
    currentMinute: 10 * 24 * 60,
    environmentAtPosition: environment(-1),
    spawnCandidates: [],
    seedKey: "melt",
    targetCount: 0
  });
  assert.ok(warm.individuals.length === 0 || warm.individuals[0].integrity < 1);
  assert.equal(cold.individuals[0].integrity, 1);
});

test("melting icebergs visibly step down through the baked size classes", () => {
  const memory = createIcebergMemory();
  seedIcebergPopulation(memory, CANDIDATES, { count: 1, seedKey: "melt-size" });
  memory.individuals[0].variantId = "iceberg-large";
  memory.individuals[0].integrity = 0.67;
  advanceIcebergMemory(memory, {
    currentMinute: 2 * 24 * 60,
    environmentAtPosition: fixedEnvironment({ waterTemperatureC: 3 }),
    spawnCandidates: CANDIDATES,
    seedKey: "melt-size",
    targetCount: 1
  });
  assert.equal(memory.individuals[0].variantId, "iceberg-medium");
  memory.individuals[0].integrity = 0.34;
  advanceIcebergMemory(memory, {
    currentMinute: 4 * 24 * 60,
    environmentAtPosition: fixedEnvironment({ waterTemperatureC: 3 }),
    spawnCandidates: CANDIDATES,
    seedKey: "melt-size",
    targetCount: 1
  });
  assert.equal(memory.individuals[0].variantId, "iceberg-small");
});

test("icebergs refuse to drift onto frozen or unnavigable water", () => {
  const memory = createIcebergMemory();
  seedIcebergPopulation(memory, CANDIDATES, { count: 1, seedKey: "blocked" });
  const before = memory.individuals[0].position.slice();
  advanceIcebergMemory(memory, {
    currentMinute: ICEBERG_ADVANCE_INTERVAL_MINUTES,
    environmentAtPosition: (position) => ({
      tileId: 2,
      navigable: position === memory.individuals[0].position,
      frozen: position !== memory.individuals[0].position,
      windDirectionRad: 0,
      windStrength: 1,
      waterTemperatureC: -1
    }),
    spawnCandidates: CANDIDATES,
    seedKey: "blocked",
    targetCount: 1
  });
  assert.deepEqual(memory.individuals[0].position, before);
  validateIcebergMemory(memory);
});

test("icebergs trapped by sea ice are ejected once into open water", () => {
  const memory = createIcebergMemory();
  seedIcebergPopulation(memory, CANDIDATES, { count: 1, seedKey: "eject" });
  const iceberg = memory.individuals[0];
  const trappedPosition = iceberg.position;
  const openPosition = [0, 1, 0];
  let ejectionCalls = 0;
  const result = advanceIcebergMemory(memory, {
    currentMinute: ICEBERG_ADVANCE_INTERVAL_MINUTES,
    environmentAtPosition: (position) => ({
      tileId: position === trappedPosition ? 2 : 8,
      navigable: true,
      frozen: position === trappedPosition,
      windDirectionRad: 0,
      windStrength: 0,
      waterTemperatureC: -1
    }),
    ejectionCandidateForIceberg: () => {
      ejectionCalls += 1;
      return {
        sourceIceTileId: 2,
        tileId: 8,
        position: openPosition,
        heading: [1, 0, 0]
      };
    },
    spawnCandidates: CANDIDATES,
    seedKey: "eject",
    targetCount: 1
  });
  assert.equal(ejectionCalls, 1);
  assert.deepEqual(result.ejectedIds, [iceberg.id]);
  assert.deepEqual(iceberg.position, openPosition);
  assert.deepEqual(iceberg.heading, [1, 0, 0]);
});

test("iceberg ejection rejects another frozen destination", () => {
  const memory = createIcebergMemory();
  seedIcebergPopulation(memory, CANDIDATES, { count: 1, seedKey: "bad-eject" });
  assert.throws(() => advanceIcebergMemory(memory, {
    currentMinute: ICEBERG_ADVANCE_INTERVAL_MINUTES,
    environmentAtPosition: () => ({
      tileId: 2,
      navigable: true,
      frozen: true,
      windDirectionRad: 0,
      windStrength: 0,
      waterTemperatureC: -1
    }),
    ejectionCandidateForIceberg: () => CANDIDATES[1],
    spawnCandidates: CANDIDATES,
    seedKey: "bad-eject",
    targetCount: 1
  }), /ejection candidate is not open water/i);
});

function fixedEnvironment(overrides = {}) {
  return () => ({
    tileId: 2,
    navigable: true,
    frozen: false,
    windDirectionRad: 0,
    windStrength: 0,
    waterTemperatureC: -1,
    ...overrides
  });
}
