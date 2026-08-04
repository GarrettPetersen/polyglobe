import test from "node:test";
import assert from "node:assert/strict";
import {
  drawnNavigationFieldPoint,
  rasterizeDrawnNavigationChunk
} from "./drawnNavigationField.js";

function tile(id, drawOrder, x, y, pixels, water = false) {
  return {
    kind: "tile",
    drawOrder,
    call: { id, drawSurfaceX: x + 1, drawSurfaceY: y + 1 },
    raster: {
      x,
      y,
      width: 3,
      height: 3,
      alpha: Uint8Array.from(pixels)
    },
    water
  };
}

function rasterize(tiles, options = {}) {
  const byId = new Map(tiles.map((entry) => [entry.call.id, entry]));
  return rasterizeDrawnNavigationChunk({
    originX: 0,
    originY: 0,
    size: 8,
    padding: 2,
    candidates: tiles,
    maxDistancePx: 6,
    isWaterTile: (tileId) => byId.get(tileId).water,
    isUsableWaterTile: (tileId) => !options.blockedWaterIds?.has(tileId),
    tileRaster: (call) => byId.get(call.id).raster
  });
}

test("navigation raster preserves painter order between land and water", () => {
  const opaque = new Array(9).fill(255);
  const chunk = rasterize([
    tile(1, 0, 1, 1, opaque, true),
    tile(2, 1, 2, 1, opaque, false)
  ]);
  const waterPoint = drawnNavigationFieldPoint(chunk, 1, 2);
  assert.equal(waterPoint.tileId, 1);
  assert.equal(waterPoint.water, true);
  assert.equal(waterPoint.source, "opaque-sprite");
  assert.equal(waterPoint.clearancePx, 1);
  assert.ok(waterPoint.flow.x < 0);
  assert.equal(drawnNavigationFieldPoint(chunk, 3, 2).water, false);
});

test("transparent connector gaps inherit nearby usable water", () => {
  const transparent = new Array(9).fill(0);
  const chunk = rasterize([tile(4, 0, 2, 2, transparent, true)]);
  const point = drawnNavigationFieldPoint(chunk, 0, 0);
  assert.equal(point.tileId, 4);
  assert.equal(point.water, true);
  assert.equal(point.source, "connector-gap");
});

test("surface ice turns a drawn water sprite into blocked navigation", () => {
  const opaque = new Array(9).fill(255);
  const chunk = rasterize(
    [tile(7, 0, 1, 1, opaque, true)],
    { blockedWaterIds: new Set([7]) }
  );
  const point = drawnNavigationFieldPoint(chunk, 2, 2);
  assert.equal(point.tileId, 7);
  assert.equal(point.water, false);
  assert.equal(point.clearancePx, 0);
});

test("clearance flow points away from a nearby blocked shore", () => {
  const opaque = new Array(9).fill(255);
  const chunk = rasterize([
    tile(10, 0, 0, 1, opaque, false),
    tile(11, 1, 3, 1, opaque, true)
  ]);
  const nearShore = drawnNavigationFieldPoint(chunk, 3, 2);
  const openWater = drawnNavigationFieldPoint(chunk, 5, 2);
  assert.equal(nearShore.water, true);
  assert.ok(nearShore.flow.x > 0);
  assert.ok(openWater.clearancePx >= nearShore.clearancePx);
});
