import assert from "node:assert/strict";
import test from "node:test";
import { createCanvas } from "../../../examples/globe-demo/node_modules/canvas/index.js";

import {
  createTerrainOcclusionIndex,
  eraseTerrainOccludersFromShipLayer,
  RIVER_BANK_LOWER,
  RIVER_BANK_NONE,
  RIVER_BANK_UPPER,
  shipOcclusionDepthY,
  splitRiverTerrainBanks,
  terrainOccludersForScreenBounds
} from "./terrainShipOcclusion.js";

function occluder({ x, y, depthY, width = 8, height = 2, image = {} }) {
  return {
    x,
    y,
    depthY,
    width,
    height,
    drawLayer: { image }
  };
}

test("ship terrain depth uses its bottom opaque pixel plus a visibility bias", () => {
  assert.equal(shipOcclusionDepthY(70, 47, 2), 119);
  assert.throws(() => shipOcclusionDepthY(70, -1, 2), /integer sprite/);
  assert.throws(() => shipOcclusionDepthY(70, 47, 1.5), /integer sprite/);
});

test("river terrain banks follow a diagonal river instead of a horizontal tile split", () => {
  const width = 7;
  const height = 7;
  const alpha = new Uint8Array(width * height);
  for (let x = 0; x < width; x++) alpha[x + x * width] = 255;

  const split = splitRiverTerrainBanks(alpha, width, height);
  assert.equal(split.banks[1 + 1 * width], RIVER_BANK_NONE);
  assert.equal(split.banks[5 + 2 * width], RIVER_BANK_UPPER);
  assert.equal(split.banks[1 + 5 * width], RIVER_BANK_LOWER);
  assert.equal(split.banks[5 + 4 * width], RIVER_BANK_UPPER);
});

test("river terrain banks interpolate gaps in a pixel river mask", () => {
  const width = 7;
  const height = 7;
  const alpha = new Uint8Array(width * height);
  alpha[0 + 1 * width] = 255;
  alpha[6 + 5 * width] = 255;

  const split = splitRiverTerrainBanks(alpha, width, height);
  assert.equal(split.banks[3 + 2 * width], RIVER_BANK_UPPER);
  assert.equal(split.banks[3 + 4 * width], RIVER_BANK_LOWER);
  assert.throws(
    () => splitRiverTerrainBanks(new Uint8Array(width * height), width, height),
    /empty river mask/
  );
});

test("river terrain bank splits extend the river slope to sprite edges", () => {
  const width = 7;
  const height = 7;
  const alpha = new Uint8Array(width * height);
  alpha[2 + 2 * width] = 255;
  alpha[4 + 4 * width] = 255;

  const split = splitRiverTerrainBanks(alpha, width, height);
  assert.equal(split.banks[0], RIVER_BANK_LOWER);
  assert.equal(split.banks[0 + 1 * width], RIVER_BANK_LOWER);
  assert.equal(split.banks[6 + 5 * width], RIVER_BANK_UPPER);
});

test("terrain occlusion index returns only nearby masks with the current screen offset", () => {
  const near = occluder({ x: 20, y: 30, depthY: 38 });
  const far = occluder({ x: 300, y: 300, depthY: 308 });
  const index = createTerrainOcclusionIndex([near, far], 32);

  const result = terrainOccludersForScreenBounds(
    index,
    { x: 24, y: 35, w: 10, h: 10 },
    { x: 4, y: 5 }
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].x, 24);
  assert.equal(result[0].y, 35);
  assert.equal(result[0].depthY, 43);
  assert.equal(result[0].drawLayer, near.drawLayer);
});

test("terrain occlusion rejects malformed layers and queries", () => {
  assert.throws(
    () => terrainOccludersForScreenBounds(
      createTerrainOcclusionIndex([], 32),
      { x: 0, y: 0, w: 0, h: 4 },
      { x: 0, y: 0 }
    ),
    /positive integer bounds/
  );
  assert.throws(
    () => createTerrainOcclusionIndex([{
      x: 0,
      y: 0,
      depthY: 2,
      width: 2,
      height: 2
    }]),
    /invalid draw layer/
  );
});

test("terrain masking removes only ship pixels and never repaints the finished world", () => {
  const world = createCanvas(5, 3);
  const worldCtx = world.getContext("2d");
  worldCtx.fillStyle = "#44aacc";
  worldCtx.fillRect(0, 0, 5, 3);
  worldCtx.fillStyle = "#ffd34e";
  worldCtx.fillRect(2, 1, 1, 1);

  const shipLayer = createCanvas(5, 3);
  const shipCtx = shipLayer.getContext("2d");
  shipCtx.fillStyle = "#d83a3a";
  shipCtx.fillRect(1, 1, 3, 1);

  const terrainMask = createCanvas(1, 1);
  const terrainMaskCtx = terrainMask.getContext("2d");
  terrainMaskCtx.fillStyle = "#315b2d";
  terrainMaskCtx.fillRect(0, 0, 1, 1);
  eraseTerrainOccludersFromShipLayer(shipCtx, [
    occluder({
      x: 2,
      y: 1,
      depthY: 3,
      width: 1,
      height: 1,
      image: terrainMask
    })
  ]);
  worldCtx.drawImage(shipLayer, 0, 0);

  const pixels = worldCtx.getImageData(0, 0, 5, 3).data;
  const rgbaAt = (x, y) => [...pixels.slice((x + y * 5) * 4, (x + y * 5) * 4 + 4)];
  assert.deepEqual(rgbaAt(1, 1), [216, 58, 58, 255], "visible ship pixel");
  assert.deepEqual(rgbaAt(2, 1), [255, 211, 78, 255], "existing city/weather pixel");
  assert.deepEqual(rgbaAt(3, 1), [216, 58, 58, 255], "visible ship pixel");
});
