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

function landmassChannel(waterTileId, x, y, width, pixels, kind = "surface") {
  return {
    kind: "landmassChannel",
    navigationAnchor: { tileId: waterTileId, kind },
    raster: {
      x,
      y,
      width,
      height: 1,
      alpha: Uint8Array.from(pixels)
    }
  };
}

function rasterize(tiles, options = {}) {
  const byId = new Map(
    tiles.filter((entry) => entry.kind === "tile").map((entry) => [entry.call.id, entry])
  );
  return rasterizeDrawnNavigationChunk({
    originX: 0,
    originY: 0,
    size: 8,
    padding: 2,
    candidates: tiles,
    maxDistancePx: 6,
    isWaterTile: (tileId) => byId.get(tileId).water,
    isRiverTile: (tileId) => options.riverIds?.has(tileId) === true,
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

test("a different-landmass connector is water beneath its land endpoint sprites", () => {
  const opaque = new Array(9).fill(255);
  const waterReference = tile(40, 0, 0, 0, new Array(9).fill(0), true);
  const chunk = rasterize([
    waterReference,
    landmassChannel(40, 2, 3, 5, [255, 255, 255, 255, 255]),
    tile(41, 1, 1, 2, opaque, false),
    tile(42, 2, 5, 2, opaque, false)
  ]);
  assert.equal(drawnNavigationFieldPoint(chunk, 2, 3).water, false);
  assert.equal(drawnNavigationFieldPoint(chunk, 4, 3).water, true);
  assert.equal(drawnNavigationFieldPoint(chunk, 4, 3).source, "landmass-channel");
  assert.equal(drawnNavigationFieldPoint(chunk, 6, 3).water, false);
});

test("a transparent mountain at Musandam cannot become a water bridge", () => {
  const transparent = new Array(9).fill(0);
  const chunk = rasterize([
    tile(20, 0, 0, 2, transparent, true),
    tile(21, 1, 3, 2, transparent, false),
    tile(22, 2, 6, 2, transparent, true)
  ]);
  const mountainCenter = drawnNavigationFieldPoint(chunk, 4, 3);
  assert.equal(mountainCenter.tileId, 21);
  assert.equal(mountainCenter.water, false);
  assert.equal(mountainCenter.source, "connector-gap");
});

test("beach tolerance is limited to one pixel beyond the water side", () => {
  const transparent = new Array(9).fill(0);
  const chunk = rasterize([
    tile(30, 0, 0, 2, transparent, true),
    tile(31, 1, 4, 2, transparent, false)
  ]);
  assert.equal(drawnNavigationFieldPoint(chunk, 3, 3).water, true);
  assert.equal(drawnNavigationFieldPoint(chunk, 4, 3).water, false);
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

test("river-island channels retain river identity and honor navigation restrictions", () => {
  const tiles = [landmassChannel(296827, 2, 3, 5, [255, 255, 255, 255, 255], "river")];
  const options = { riverIds: new Set([296827]) };
  const point = drawnNavigationFieldPoint(rasterize(tiles, options), 4, 3);
  assert.equal(point.water, true);
  assert.equal(point.riverTileId, 296827);
  assert.equal(point.source, "landmass-channel");
  const blocked = rasterize(tiles, { ...options, blockedWaterIds: new Set([296827]) });
  assert.equal(drawnNavigationFieldPoint(blocked, 4, 3).water, false);
  assert.throws(() => rasterize(tiles), /Invalid landmass channel navigation anchor/);
});
