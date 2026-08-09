import assert from "node:assert/strict";
import test from "node:test";
import {
  chartRepairHeatHazeFrame,
  chartRepairHeatHazeIsPlausible,
  chartRepairHeatHazePixelOffset,
  createChartRepairHeatHaze,
  planChartHeatHazeSettlement
} from "./chartRepairHeatHaze.js";

test("heat haze forms and clears slowly around a long calm hold", () => {
  const haze = createChartRepairHeatHaze({ nowMs: 1_000 });
  assert.equal(chartRepairHeatHazeFrame(haze, 1_000).strength, 0);
  assert.ok(chartRepairHeatHazeFrame(haze, 10_000).strength > 0.45);
  assert.equal(chartRepairHeatHazeFrame(haze, 25_000).strength, 1);
  assert.equal(chartRepairHeatHazeFrame(haze, 61_000).finished, true);
});

test("heat haze stays on whole logical pixels and never becomes frantic", () => {
  const haze = createChartRepairHeatHaze({ nowMs: 0 });
  const frame = chartRepairHeatHazeFrame(haze, 24_000);
  const offsets = Array.from({ length: 256 }, (_, y) => (
    chartRepairHeatHazePixelOffset(frame, y)
  ));
  assert.ok(offsets.every(Number.isInteger));
  assert.ok(offsets.every((offset) => Math.abs(offset) <= 2));
  assert.ok(haze.periodMs >= 12_000);
  assert.ok(haze.formationDurationMs >= 15_000);
  assert.ok(haze.clearingDurationMs >= 15_000);
});

test("heat haze is reserved for clear hot arid climates", () => {
  const sahara = {
    terrainKind: "hot-desert",
    latitudeDeg: 27,
    raining: false,
    snowing: false,
    stormIntensity: 0
  };
  assert.equal(chartRepairHeatHazeIsPlausible(sahara), true);
  assert.equal(chartRepairHeatHazeIsPlausible({ ...sahara, raining: true }), false);
  assert.equal(chartRepairHeatHazeIsPlausible({ ...sahara, terrainKind: "oceanic" }), false);
  assert.equal(chartRepairHeatHazeIsPlausible({ ...sahara, latitudeDeg: 55 }), false);
});

test("successive haze waves creep tiles to exact north-up targets one pixel at a time", () => {
  const haze = createChartRepairHeatHaze({ nowMs: 0 });
  const frame = chartRepairHeatHazeFrame(haze, 24_000);
  const y = Array.from({ length: 72 }, (_, value) => value).find((value) => (
    chartRepairHeatHazePixelOffset(frame, value) !== 0
  ));
  assert.notEqual(y, undefined);
  const positions = new Map([[7, { x: 10, y }]]);
  const targetsById = new Map([[7, { x: 16, y: y + 4 }]]);
  const plan = planChartHeatHazeSettlement({
    positions,
    targetsById,
    tileIds: new Set([7]),
    screenOffsetY: 0,
    frame
  });
  const next = plan.get(7);
  assert.ok(next);
  assert.ok(Math.hypot(next.x - 10, next.y - y) <= Math.SQRT2);
  assert.ok(Math.hypot(16 - next.x, y + 4 - next.y) < Math.hypot(6, 4));
});
