import assert from "node:assert/strict";
import test from "node:test";
import {
  createRiverWaterRaster,
  riverBankPointsFromRaster
} from "./riverBankRaster.js";

test("river bank raster deduplicates water and returns cardinal land pixels", () => {
  const raster = createRiverWaterRaster(
    { x: 10, y: 20, width: 4, height: 4 },
    [new Int32Array([11, 21, 11, 21, 12, 21])]
  );
  assert.equal(raster.waterIndices.length, 2);
  assert.deepEqual(sortedPoints(riverBankPointsFromRaster(raster)), [
    "10,21",
    "11,20",
    "11,22",
    "12,20",
    "12,22",
    "13,21"
  ]);
});

test("river bank raster uses padded water to avoid false layer-edge banks", () => {
  const raster = createRiverWaterRaster(
    { x: 0, y: 0, width: 2, height: 2 },
    [new Int32Array([-1, 0, 0, 0, 1, 0, 2, 0])]
  );
  assert.deepEqual(sortedPoints(riverBankPointsFromRaster(raster)), ["0,1", "1,1"]);
});

function sortedPoints(points) {
  const result = [];
  for (let index = 0; index < points.length; index += 2) {
    result.push(`${points[index]},${points[index + 1]}`);
  }
  return result.sort();
}
