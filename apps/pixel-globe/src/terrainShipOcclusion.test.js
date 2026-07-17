import assert from "node:assert/strict";
import test from "node:test";

import {
  foregroundTerrainOcclusionSpans,
  shipOcclusionDepthY
} from "./terrainShipOcclusion.js";

function occluder({ x, y, depthY, rows, containsRiver = false }) {
  const height = rows.length;
  const width = rows[0].length;
  return {
    x,
    y,
    depthY,
    containsRiver,
    width,
    height,
    alpha: Uint8Array.from(rows.flatMap((row) => [...row].map((pixel) => pixel === "#" ? 255 : 0)))
  };
}

test("opaque terrain below a ship clips the overlapping ship pixels", () => {
  const spans = foregroundTerrainOcclusionSpans(
    { x: 10, y: 10, w: 5, h: 4 },
    20,
    [occluder({ x: 11, y: 9, depthY: 24, rows: ["....", ".##.", "####", "...."] })],
    () => false,
    null
  );
  assert.deepEqual(spans, [
    { x: 12, y: 10, width: 2 },
    { x: 11, y: 11, width: 4 }
  ]);
});

test("terrain above a ship cannot occlude it", () => {
  const spans = foregroundTerrainOcclusionSpans(
    { x: 0, y: 0, w: 3, h: 3 },
    20,
    [occluder({ x: 0, y: 0, depthY: 19, rows: ["###", "###", "###"] })],
    () => false,
    null
  );
  assert.deepEqual(spans, []);
});

test("overlapping terrain masks merge without reopening clipped pixels", () => {
  const spans = foregroundTerrainOcclusionSpans(
    { x: 0, y: 0, w: 4, h: 2 },
    5,
    [
      occluder({ x: 0, y: 0, depthY: 6, rows: ["###", "..."] }),
      occluder({ x: 1, y: 0, depthY: 7, rows: ["###", "..."] })
    ],
    () => false,
    null
  );
  assert.deepEqual(spans, [{ x: 0, y: 0, width: 4 }]);
});

test("river and mouth water pixels remain visible through dry terrain masks", () => {
  const waterPixels = new Set(["1,0", "2,0", "2,1"]);
  const spans = foregroundTerrainOcclusionSpans(
    { x: 0, y: 0, w: 4, h: 2 },
    5,
    [occluder({ x: 0, y: 0, depthY: 6, rows: ["####", "####"] })],
    (x, y) => waterPixels.has(`${x},${y}`),
    null
  );
  assert.deepEqual(spans, [
    { x: 0, y: 0, width: 1 },
    { x: 3, y: 0, width: 1 },
    { x: 0, y: 1, width: 2 },
    { x: 3, y: 1, width: 1 }
  ]);
});

test("a ship in a river draws before the upper bank and behind the lower bank", () => {
  const spans = foregroundTerrainOcclusionSpans(
    { x: 0, y: 0, w: 4, h: 4 },
    1,
    [occluder({
      x: 0,
      y: 0,
      depthY: 0,
      containsRiver: true,
      rows: ["####", "####", "####", "####"]
    })],
    () => false,
    2
  );
  assert.deepEqual(spans, [
    { x: 0, y: 2, width: 4 },
    { x: 0, y: 3, width: 4 }
  ]);
});

test("ship terrain depth uses its bottom opaque pixel plus a visibility bias", () => {
  assert.equal(shipOcclusionDepthY(70, 47, 2), 119);
  assert.throws(() => shipOcclusionDepthY(70, -1, 2), /integer sprite/);
  assert.throws(() => shipOcclusionDepthY(70, 47, 1.5), /integer sprite/);
});

test("terrain occlusion rejects malformed masks", () => {
  assert.throws(
    () => foregroundTerrainOcclusionSpans({ x: 0, y: 0, w: 0, h: 4 }, 1, [], () => false, null),
    /positive integer bounds/
  );
  assert.throws(
    () => foregroundTerrainOcclusionSpans(
      { x: 0, y: 0, w: 4, h: 4 },
      1,
      [{
        x: 0,
        y: 0,
        depthY: 2,
        containsRiver: false,
        width: 2,
        height: 2,
        alpha: new Uint8Array(3)
      }],
      () => false,
      null
    ),
    /invalid terrain mask/
  );
  assert.throws(
    () => foregroundTerrainOcclusionSpans({ x: 0, y: 0, w: 4, h: 4 }, 1, [], null, null),
    /water-mask callback/
  );
  assert.throws(
    () => foregroundTerrainOcclusionSpans(
      { x: 0, y: 0, w: 4, h: 4 },
      1,
      [],
      () => false,
      Number.NaN
    ),
    /Invalid ship river depth/
  );
});
