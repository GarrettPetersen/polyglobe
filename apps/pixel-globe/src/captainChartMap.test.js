import assert from "node:assert/strict";
import test from "node:test";

import {
  CAPTAIN_CHART_SAMPLE_OFFSETS,
  captainChartHexPixelSpan,
  captainChartHousePixels,
  captainChartPanAvailability,
  captainChartPreviewCrop,
  captainChartSettlementMarkerSize
} from "./captainChartMap.js";

const WORLD = Object.freeze({ worldWidth: 80, worldHeight: 26 });
const BASE = Object.freeze({ startX: 10, startY: 4, spanX: 40, spanY: 16 });

test("captain chart samples thin terrain details across every output pixel", () => {
  assert.deepEqual(CAPTAIN_CHART_SAMPLE_OFFSETS, [1 / 6, 1 / 2, 5 / 6]);
});

test("captain chart hides pan arrows at each reached boundary", () => {
  const topLeft = Object.freeze({ startX: 10, startY: 4, spanX: 20, spanY: 8 });
  assert.deepEqual(captainChartPanAvailability({
    baseViewport: BASE,
    viewport: topLeft,
    zoom: 2,
    fraction: 0.2,
    ...WORLD
  }), { left: false, right: true, up: false, down: true });

  const bottomRight = Object.freeze({ startX: 30, startY: 12, spanX: 20, spanY: 8 });
  assert.deepEqual(captainChartPanAvailability({
    baseViewport: BASE,
    viewport: bottomRight,
    zoom: 2,
    fraction: 0.2,
    ...WORLD
  }), { left: true, right: false, up: true, down: false });
});

test("unzoomed captain chart has no pan arrows", () => {
  assert.deepEqual(captainChartPanAvailability({
    baseViewport: BASE,
    viewport: BASE,
    zoom: 1,
    fraction: 0.2,
    ...WORLD
  }), { left: false, right: false, up: false, down: false });
});

test("captain chart upgrades settlement dots only after hexes exceed one pixel", () => {
  const worldSpan = captainChartHexPixelSpan({
    viewport: { startX: 0, startY: 0, spanX: 80, spanY: 26 },
    pixelWidth: 400,
    pixelHeight: 130,
    tileCount: 164000,
    ...WORLD
  });
  assert.ok(worldSpan < 1);
  assert.equal(captainChartSettlementMarkerSize(worldSpan), 1);
  assert.equal(captainChartSettlementMarkerSize(1.01), 3);
  assert.equal(captainChartSettlementMarkerSize(2.4), 5);
  assert.equal(captainChartSettlementMarkerSize(8), 9);
});

test("zoomed settlement houses are crisp odd-sized pixel silhouettes", () => {
  const threePixelHouse = new Set(captainChartHousePixels(3).map(({ x, y }) => `${x}:${y}`));
  assert.deepEqual(threePixelHouse, new Set(["1:0", "0:1", "1:1", "2:1", "0:2", "2:2"]));
  assert.ok(captainChartHousePixels(5).some(({ x, y }) => x === 0 && y === 2));
  assert.equal(captainChartHousePixels(5).some(({ x, y }) => x === 2 && y === 4), false);
  assert.throws(() => captainChartHousePixels(4), /Invalid captain chart house size/);
});

test("captain chart derives an immediate zoom preview from the explored map", () => {
  assert.deepEqual(captainChartPreviewCrop({
    sourceViewport: BASE,
    targetViewport: { startX: 20, startY: 8, spanX: 20, spanY: 8 },
    worldWidth: 80,
    sourcePixelWidth: 80,
    sourcePixelHeight: 32
  }), { x: 20, y: 8, width: 40, height: 16 });
});

test("captain chart preview crops work across the longitude seam", () => {
  assert.deepEqual(captainChartPreviewCrop({
    sourceViewport: { startX: 70, startY: 4, spanX: 30, spanY: 12 },
    targetViewport: { startX: 76, startY: 7, spanX: 12, spanY: 6 },
    worldWidth: 80,
    sourcePixelWidth: 90,
    sourcePixelHeight: 36
  }), { x: 18, y: 9, width: 36, height: 18 });
});
