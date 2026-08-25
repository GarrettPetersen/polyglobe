import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceDistantWorldPartComparisonPlan,
  createDistantWorldPartComparisonPlan,
  distantWorldChangedSnapshotParts,
  distantWorldSnapshotsEqual,
  portableDistantWorldSystems,
  relationKey
} from "./distantWorldSimulation.js";

test("distant diplomacy keys are symmetric", () => {
  assert.equal(relationKey("ming", "japan"), relationKey("japan", "ming"));
});

test("distant system transfer removes browser callbacks without mutating originals", () => {
  const callback = () => true;
  const economy = { portStates: new Map() };
  const landTrade = {
    carts: [],
    economy,
    relationBetween: callback,
    sovereignTradeOpenToFaction: callback
  };
  const npcRoutes = {
    ships: [],
    shipById: new Map(),
    economy,
    relationBetween: callback,
    sovereignTradeOpenToFaction: callback,
    onForeignPortCall: callback,
    fishingGroundIsNavigable: callback
  };
  const portable = portableDistantWorldSystems({
    economy,
    landTrade,
    npcRoutes,
    fishState: {
      voyageSeed: "voyage",
      memory: { fish: { fisheries: {} }, whales: { individuals: [] } }
    }
  });
  assert.equal(portable.landTrade.relationBetween, null);
  assert.equal(portable.npcRoutes.onForeignPortCall, null);
  assert.equal(landTrade.relationBetween, callback);
  assert.doesNotThrow(() => structuredClone(portable));
});

test("distant snapshot equality notices live state conflicts", () => {
  const a = {
    economy: { lastMinute: 1 },
    landTrade: { carts: [{ id: "a" }] },
    npcRoutes: { ships: [{ id: "b", hitPoints: 2 }] }
  };
  assert.equal(distantWorldSnapshotsEqual(a, structuredClone(a)), true);
  const changed = structuredClone(a);
  changed.npcRoutes.ships[0].hitPoints = 1;
  assert.equal(distantWorldSnapshotsEqual(a, changed), false);
  assert.deepEqual(distantWorldChangedSnapshotParts(a, changed), ["npcRoutes"]);
});

test("main-thread distant comparisons advance through bounded entry batches", () => {
  const current = {
    version: 1,
    lastMinute: 40,
    ports: Array.from({ length: 53 }, (_, index) => ({
      id: index,
      specie: 1000 + index,
      stocks: [["salt", index]]
    }))
  };
  const plan = createDistantWorldPartComparisonPlan(
    "economy",
    current,
    structuredClone(current)
  );
  let calls = 0;
  while (true) {
    const before = plan.entryIndex;
    const progress = advanceDistantWorldPartComparisonPlan(plan, { maxEntries: 7 });
    assert.ok(plan.entryIndex - before <= 7);
    calls++;
    if (progress.complete) {
      assert.equal(progress.equal, true);
      break;
    }
  }
  assert.equal(calls, 8);
});

test("distant NPC comparison ignores protected ships but catches strategic changes", () => {
  const baseline = {
    version: 1,
    replacementQueue: [],
    ships: [
      { id: "visible", hitPoints: 8 },
      { id: "distant", hitPoints: 8 }
    ]
  };
  const current = structuredClone(baseline);
  current.ships[0].hitPoints = 2;
  const protectedPlan = createDistantWorldPartComparisonPlan(
    "npcRoutes",
    current,
    baseline,
    { ignoredNpcShipIds: ["visible"] }
  );
  assert.deepEqual(
    advanceDistantWorldPartComparisonPlan(protectedPlan),
    { complete: true, equal: true }
  );

  current.ships[1].hitPoints = 3;
  const changedPlan = createDistantWorldPartComparisonPlan(
    "npcRoutes",
    current,
    baseline,
    { ignoredNpcShipIds: ["visible"] }
  );
  assert.deepEqual(
    advanceDistantWorldPartComparisonPlan(changedPlan),
    { complete: true, equal: false }
  );
});
