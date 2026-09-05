import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import {
  WHALE_SUBMERGED_REFRACTION_PX,
  synchronizeWhaleVisualPresentation,
  whaleVisualPresentationIsActive,
  whaleVisualPresentationPoint
} from "./whaleVisualPresentation.js";
import { WHALE_PHASE_DEAD, WHALE_PHASE_EXHAUSTED, WHALE_PHASE_TETHERED, whaleById, reconcileWhalePresentationIds, advanceWhaleJob, beginWhaleAdvance, createWhaleMemory, seedWhalePopulation } from "./whaleSystem.js";

const coordinateSpace = {};
function sync(state, worldPosition, nowMs, overrides = {}) {
  return synchronizeWhaleVisualPresentation(state, {
    coordinateSpace, cameraRight: [1, 0, 0], cameraUp: [0, 1, 0],
    pixelsPerRadian: 1000, durationMs: 250,
    whaleId: "whale-1", rawPoint: { x: 10, y: 20, tileId: 7 },
    worldPosition, nowMs, ...overrides
  });
}
function point(state, nowMs, overrides = {}) {
  return whaleVisualPresentationPoint(state, {
    coordinateSpace, rawPoint: { x: 999, y: 999, tileId: 8 }, nowMs, ...overrides
  });
}

test("a visible whale retains its local endpoint across tile and camera reprojections", () => {
  let state = sync(null, [0, 0, 1], 0);
  state = sync(state, [0.01, -0.005, 1], 250);
  assert.deepEqual(point(state, 375), { x: 15, y: 22.5, tileId: 8 });
  assert.deepEqual(point(state, 500), { x: 20, y: 25, tileId: 8 });
  // No physical movement: changing the projection must not replace the local
  // endpoint, including after the interpolation has finished.
  state = sync(state, [0.01, -0.005, 1], 800, {
    rawPoint: { x: -40, y: 200, tileId: 9 }, cameraRight: [0, 0, 1]
  });
  assert.deepEqual(point(state, 800), { x: 20, y: 25, tileId: 8 });
  assert.equal(whaleVisualPresentationIsActive(state, coordinateSpace, 800), false);
});

test("retargeting starts at the displayed point and preserves all movement", () => {
  let state = sync(null, [0, 0, 1], 0);
  state = sync(state, [0.01, 0, 1], 250);
  const before = point(state, 375);
  state = sync(state, [0.02, 0, 1], 375);
  assert.deepEqual(point(state, 375), before);
  assert.deepEqual(point(state, 625), { x: 30, y: 20, tileId: 8 });
  assert.equal(whaleVisualPresentationIsActive(state, coordinateSpace, 500), true);
});

test("whales retain independent movement clocks", () => {
  let first = sync(null, [0, 0, 1], 0);
  let second = sync(null, [0, 0, 1], 0, { whaleId: "whale-2" });
  first = sync(first, [0.01, 0, 1], 250);
  second = sync(second, [0.01, 0, 1], 350, { whaleId: "whale-2" });
  assert.equal(point(first, 400).x, 16);
  assert.equal(point(second, 400).x, 12);
});

test("a replacement coordinate space initializes from its own projection", () => {
  let state = sync(null, [0, 0, 1], 0);
  state = sync(state, [0.01, 0, 1], 250);
  const replacement = {};
  state = sync(state, [0.01, 0, 1], 300, {
    coordinateSpace: replacement, rawPoint: { x: 80, y: 90 }
  });
  assert.deepEqual(point(state, 300, { coordinateSpace: replacement }), { x: 80, y: 90, tileId: 8 });
  assert.equal(whaleVisualPresentationIsActive(state, coordinateSpace, 300), false);
});

test("rope constraints apply immediately without reviving an old target", () => {
  let state = sync(null, [0, 0, 1], 0);
  state = sync(state, [0.01, 0, 1], 250);
  state = sync(state, [0.008, 0, 1], 300, { durationMs: 0 });
  assert.equal(point(state, 300).x, 18);
  assert.equal(point(state, 600).x, 18);
  assert.equal(whaleVisualPresentationIsActive(state, coordinateSpace, 300), false);
});

test("partial background simulation never exposes a raw jump or rewinds when the job finishes", () => {
  const memory = seededWhaleMemory();
  const whale = memory.individuals[0];
  let state = sync(null, whale.position, 0, { whaleId: whale.id });
  const job = beginWhaleAdvance(memory, 0.25, () => ({ ok: true, canSurface: true, tileId: 1 }), 1,
    { bucket: 0, bucketCount: 1, activeWhaleIds: [whale.id] });
  assert.equal(advanceWhaleJob(job, 1).complete, false);
  state = sync(state, whale.position, 250, { whaleId: whale.id });
  assert.equal(point(state, 250).x, 10);
  const target = { x: state.presentationToX, y: state.presentationToY };
  assert.notEqual(target.x, 10);
  let nowMs = 250;
  while (true) {
    nowMs += 40;
    const result = advanceWhaleJob(job, 1);
    const before = point(state, nowMs);
    state = sync(state, whale.position, nowMs, { whaleId: whale.id });
    assert.deepEqual(point(state, nowMs), before, "background work changed the visible whale");
    if (result.complete) break;
  }
  assert.deepEqual(point(state, nowMs + 250), { ...target, tileId: 8 });
});

test("whale presentation rejects invalid identity, projection, and movement input", () => {
  const state = sync(null, [0, 0, 1], 0);
  assert.throws(() => sync(state, [0, 0, 1], 1, { whaleId: "other" }), /identity changed/);
  assert.throws(() => sync(state, [NaN, 0, 1], 1), /worldPosition/);
  assert.throws(() => sync(state, [0, 0, 1], 1, { pixelsPerRadian: 0 }), /projection scale/);
});

test("submerged whales do not inherit the globally phased texture twitch", () => {
  assert.equal(WHALE_SUBMERGED_REFRACTION_PX, 0);
  const main = readFileSync(new URL("./main.js", import.meta.url), "utf8");
  assert.match(main, /refractionPx: WHALE_SUBMERGED_REFRACTION_PX/);
});

function seededWhaleMemory() {
  const memory = createWhaleMemory();
  const candidates = Array.from({ length: 100 }, (_, tileId) => {
    const lat = (tileId % 2 === 0 ? 42 : -44) * Math.PI / 180;
    const lon = tileId / 100 * Math.PI * 2 - Math.PI;
    return {
      tileId, latitudeDeg: lat * 180 / Math.PI, longitudeDeg: lon * 180 / Math.PI,
      position: [Math.cos(lat) * Math.cos(lon), Math.sin(lat), -Math.cos(lat) * Math.sin(lon)]
    };
  });
  seedWhalePopulation(memory, candidates, 20);
  return memory;
}

test("the production whale frame publishes movement during a partial batch", () => {
  const main = readFileSync(new URL("./main.js", import.meta.url), "utf8");
  const functionSource = (name) => {
    const start = main.indexOf(`function ${name}(`);
    const end = main.indexOf("\nfunction ", start);
    assert.ok(start >= 0 && end > start, `missing runtime function ${name}`);
    return main.slice(start, end);
  };
  const memory = seededWhaleMemory();
  const whale = memory.individuals[0];
  const runtime = {
    gameState: { memory: { whales: memory } }, chart: {}, localLayout: coordinateSpace,
    camera: { right: [1, 0, 0], up: [0, 1, 0] }, PIXELS_PER_RADIAN: 1000,
    WHALE_SIMULATION_INTERVAL_SECONDS: 0.25, WHALE_HUNT_SIMULATION_INTERVAL_SECONDS: 1 / 30,
    WHALE_BACKGROUND_MOVEMENT_BUCKET_COUNT: 1, WHALE_MOVEMENTS_PER_FRAME: 1,
    WHALE_PHASE_DEAD, WHALE_PHASE_EXHAUSTED, WHALE_PHASE_TETHERED,
    WHALE_BLOW_DURATION_MS: 1000, weatherClockMinutes: 1,
    whaleSimulationAccumulator: 0, whaleBackgroundMovementBucket: 0, whaleAdvanceJob: null,
    responsiveWhaleIds: new Set([whale.id]), whaleVisualPresentations: new Map(),
    whaleHarpoonProjectile: null, whaleBlowBursts: [], whaleKillEffects: [],
    beginWhaleAdvance, advanceWhaleJob, whaleById, reconcileWhalePresentationIds,
    synchronizeWhaleVisualPresentation, whaleVisualPresentationPoint, whaleVisualPresentationIsActive,
    whaleNavigationAtPosition: () => ({ ok: true, canSurface: true, tileId: 1 }),
    constrainActiveWhaleTether: () => false,
    localPointForKnownTileVector: (position, tileId) => ({
      x: position[0] * 1000, y: -position[1] * 1000, tileId
    })
  };
  runInNewContext([
    "updateWhales", "synchronizeWhalePresentations", "synchronizeWhalePresentation",
    "presentedWhalePoint", "activeWhalePresentationExists", "responsiveWhaleMovementIds",
    "takeWhaleSimulationElapsed"
  ].map(functionSource).join("\n"), runtime);
  runtime.synchronizeWhalePresentations([whale.id], 0);
  const displayed = (time) => runtime.presentedWhalePoint(whale,
    runtime.localPointForKnownTileVector(whale.position, whale.tileId), time);
  const origin = displayed(0);
  runtime.updateWhales(0.25, 250);
  assert.ok(runtime.whaleAdvanceJob, "the background job should still be partial");
  assert.equal(displayed(250).x, origin.x, "a partial batch exposed the raw world position");
  const state = runtime.whaleVisualPresentations.get(whale.id);
  const targetX = state.presentationToX;
  assert.notEqual(targetX, origin.x, "the moved whale must receive a target immediately");
  let nowMs = 250;
  while (runtime.whaleAdvanceJob) {
    nowMs += 40;
    const before = displayed(nowMs);
    runtime.updateWhales(0, nowMs);
    assert.equal(displayed(nowMs).x, before.x, "unrelated background work rewound the whale");
  }
  assert.equal(displayed(nowMs + 250).x, targetX);
});
