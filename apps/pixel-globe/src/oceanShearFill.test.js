import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLandShearFillCalls,
  buildOpenOceanShearFillCalls
} from "./oceanShearFill.js";

test("stretched open-ocean edges receive visual water tiles", () => {
  const result = fillersFor({
    actualB: { x: 28, y: 0 },
    projectedB: { x: 20, y: 0 }
  });

  assert.equal(result.length, 1);
  assert.deepEqual(result[0].shearEdge, [0, 1]);
  assert.equal(result[0].drawSurfaceX, 14);
  assert.equal(result[0].drawSurfaceY, 0);
  assert.equal(result[0].visualOnly, true);
  assert.equal(result[0].row.t, "water");
});

test("large ocean tears receive enough tiles to cover every segment", () => {
  const result = fillersFor({
    actualB: { x: 61, y: 0 },
    projectedB: { x: 20, y: 0 }
  });

  assert.equal(result.length, 3);
  const centers = [0, ...result.map((call) => call.drawSurfaceX), 61];
  for (let index = 1; index < centers.length; index++) {
    assert.ok(centers[index] - centers[index - 1] <= 20);
  }
});

test("one-pixel ocean expansions receive fillers", () => {
  assert.equal(fillersFor({
    actualB: { x: 21, y: 0 },
    projectedB: { x: 20, y: 0 }
  }).length, 1);
});

test("subpixel, compressed, and non-ocean edges do not receive fillers", () => {
  assert.equal(fillersFor({
    actualB: { x: 20.4, y: 0 },
    projectedB: { x: 20, y: 0 }
  }).length, 0);
  assert.equal(fillersFor({
    actualB: { x: 16, y: 0 },
    projectedB: { x: 20, y: 0 }
  }).length, 0);
  assert.equal(fillersFor({
    actualB: { x: 28, y: 0 },
    projectedB: { x: 20, y: 0 },
    terrain: "lake"
  }).length, 0);
});

test("stretched adjacent land receives visual terrain without changing topology", () => {
  const tileById = new Map([
    [0, tileCall(0, { x: 0, y: 0 }, { x: 0, y: 0 }, "forest")],
    [1, tileCall(1, { x: 47, y: 0 }, { x: 20, y: 0 }, "hills")]
  ]);
  const result = buildLandShearFillCalls({
    faceCalls: [{ a: 0, b: 1 }],
    tileById,
    isLandTile: (call) => call.row.t !== "water"
  });

  assert.equal(result.length, 2);
  assert.deepEqual(result.map((call) => call.row.t), ["forest", "hills"]);
  assert.ok(result.every((call) => call.visualOnly));
  const centers = [0, ...result.map((call) => call.drawSurfaceX), 47];
  for (let index = 1; index < centers.length; index++) {
    assert.ok(centers[index] - centers[index - 1] <= 20);
  }
});

function fillersFor({ actualB, projectedB, terrain = "water" }) {
  const tileById = new Map([
    [0, tileCall(0, { x: 0, y: 0 }, { x: 0, y: 0 }, terrain)],
    [1, tileCall(1, actualB, projectedB, terrain)]
  ]);
  return buildOpenOceanShearFillCalls({
    faceCalls: [{ a: 0, b: 1 }],
    tileById,
    isOpenOceanTile: (call) => call.row.t === "water"
  });
}

function tileCall(id, actual, projected, terrain) {
  return {
    id,
    row: { t: terrain },
    x: actual.x,
    y: actual.y,
    surface: { ...actual },
    drawSurfaceX: actual.x,
    drawSurfaceY: actual.y,
    projectedX: projected.x,
    projectedY: projected.y,
    sortY: actual.y
  };
}
