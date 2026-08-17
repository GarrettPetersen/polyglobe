import assert from "node:assert/strict";
import test from "node:test";

import {
  createSurfaceDetailLayerBounds,
  surfaceDetailCallsForLayer,
  surfaceDetailCallsHaveSameGeometry,
  surfaceDetailLayerCoversViewport
} from "./surfaceDetailCache.js";

test("surface detail cache includes rivers across its padded movement area", () => {
  const viewport = {
    minX: 1000,
    minY: 2000,
    maxX: 1455,
    maxY: 2256
  };
  const layer = createSurfaceDetailLayerBounds({
    viewport,
    screenWidth: 455,
    screenHeight: 256,
    layerMargin: 96,
    tileMargin: 32
  });
  assert.deepEqual(layer, {
    x: 872,
    y: 1872,
    width: 711,
    height: 512
  });

  const rightEdgeRiverTile = {
    id: 1,
    drawSurfaceX: 1510,
    drawSurfaceY: 2150
  };
  const rightEdgeConnector = {
    a: 1,
    b: 2,
    ax: 1480,
    ay: 2140,
    bx: 1530,
    by: 2160
  };
  const outsideTile = {
    id: 3,
    drawSurfaceX: 1700,
    drawSurfaceY: 2150
  };
  const calls = surfaceDetailCallsForLayer({
    tileCalls: [rightEdgeRiverTile, outsideTile],
    riverConnectorCalls: [rightEdgeConnector],
    layer,
    margin: 32
  });

  assert.deepEqual(calls.tileCalls, [rightEdgeRiverTile]);
  assert.deepEqual(calls.riverConnectorCalls, [rightEdgeConnector]);
  assert.equal(surfaceDetailLayerCoversViewport(layer, {
    minX: 1080,
    minY: 2000,
    maxX: 1535,
    maxY: 2256
  }, 32), true);
});

test("surface detail cache rebuilds before the viewport reaches undrawn pixels", () => {
  const layer = {
    x: 872,
    y: 1872,
    width: 711,
    height: 512
  };
  assert.equal(surfaceDetailLayerCoversViewport(layer, {
    minX: 1100,
    minY: 2000,
    maxX: 1555,
    maxY: 2256
  }, 32), false);
});

test("surface detail cache covers movement on every supported viewport shape", () => {
  const viewportSizes = [
    { label: "narrow mobile", width: 256, height: 455 },
    { label: "standard landscape", width: 455, height: 256 },
    { label: "maximum ultrawide", width: 910, height: 256 },
    { label: "maximum portrait", width: 256, height: 910 }
  ];
  const layerMargin = 96;
  const tileMargin = 32;

  for (const { label, width, height } of viewportSizes) {
    const viewport = {
      minX: 1000,
      minY: 2000,
      maxX: 1000 + width,
      maxY: 2000 + height
    };
    const layer = createSurfaceDetailLayerBounds({
      viewport,
      screenWidth: width,
      screenHeight: height,
      layerMargin,
      tileMargin
    });
    assert.equal(layer.width, width + (layerMargin + tileMargin) * 2, label);
    assert.equal(layer.height, height + (layerMargin + tileMargin) * 2, label);

    for (const [dx, dy] of [
      [-layerMargin, 0],
      [layerMargin, 0],
      [0, -layerMargin],
      [0, layerMargin]
    ]) {
      assert.equal(surfaceDetailLayerCoversViewport(layer, {
        minX: viewport.minX + dx,
        minY: viewport.minY + dy,
        maxX: viewport.maxX + dx,
        maxY: viewport.maxY + dy
      }, tileMargin), true, `${label}: ${dx},${dy}`);
    }

    const cornerRiverTile = {
      id: width + height,
      drawSurfaceX: viewport.maxX + layerMargin,
      drawSurfaceY: viewport.maxY + layerMargin
    };
    const calls = surfaceDetailCallsForLayer({
      tileCalls: [cornerRiverTile],
      riverConnectorCalls: [],
      layer,
      margin: tileMargin
    });
    assert.deepEqual(calls.tileCalls, [cornerRiverTile], label);
  }
});

test("surface detail cache invalidates when an offscreen river moves before entering view", () => {
  const riverRow = { t: "land", e: "grass" };
  const cached = {
    tileCalls: [{
      id: 41,
      drawSurfaceX: 520,
      drawSurfaceY: 100,
      level: 0,
      row: riverRow
    }],
    riverConnectorCalls: [{
      a: 41,
      b: 42,
      ax: 520,
      ay: 100,
      bx: 548,
      by: 101,
      aMouth: false,
      bMouth: false,
      aWater: false,
      bWater: false
    }]
  };
  const unchanged = {
    tileCalls: cached.tileCalls.map((call) => ({ ...call })),
    riverConnectorCalls: cached.riverConnectorCalls.map((call) => ({ ...call }))
  };
  assert.equal(surfaceDetailCallsHaveSameGeometry(cached, unchanged), true);

  const stitched = {
    tileCalls: [{ ...unchanged.tileCalls[0], drawSurfaceX: 518 }],
    riverConnectorCalls: [{
      ...unchanged.riverConnectorCalls[0],
      ax: 518
    }]
  };
  assert.equal(surfaceDetailCallsHaveSameGeometry(cached, stitched), false);
});

test("surface detail cache invalidates when a newly drawn river enters its bounds", () => {
  const cached = { tileCalls: [], riverConnectorCalls: [] };
  const current = {
    tileCalls: [{
      id: 7,
      drawSurfaceX: 400,
      drawSurfaceY: 120,
      level: 0,
      row: { t: "land", e: "grass" }
    }],
    riverConnectorCalls: []
  };
  assert.equal(surfaceDetailCallsHaveSameGeometry(cached, current), false);
});

test("surface detail cache invalidates when river shapes change inside stable tiles", () => {
  const calls = {
    tileCalls: [{
      id: 7,
      drawSurfaceX: 400,
      drawSurfaceY: 120,
      level: 0,
      row: { t: "land", e: "grass" }
    }],
    riverConnectorCalls: []
  };
  const cached = { ...calls, riverGeometryKey: "tile:7:10,16;22,16" };
  const current = { ...calls, riverGeometryKey: "tile:7:9,16;22,16" };

  assert.equal(surfaceDetailCallsHaveSameGeometry(cached, current), false);
});

test("surface detail cache ignores moving tiles that cannot affect its layer", () => {
  const land = { id: 1, drawSurfaceX: 40, drawSurfaceY: 40, surface: "land" };
  const water = { id: 2, drawSurfaceX: 70, drawSurfaceY: 40, surface: "water" };
  const args = {
    riverConnectorCalls: [],
    layer: { x: 0, y: 0, width: 120, height: 80 },
    margin: 0,
    tileCallFilter: (call) => call.surface === "land"
  };
  const cached = surfaceDetailCallsForLayer({ ...args, tileCalls: [land, water] });
  const moved = surfaceDetailCallsForLayer({
    ...args,
    tileCalls: [land, { ...water, drawSurfaceX: 64 }]
  });

  assert.deepEqual(cached.tileCalls, [land]);
  assert.equal(surfaceDetailCallsHaveSameGeometry(cached, moved), true);
});
