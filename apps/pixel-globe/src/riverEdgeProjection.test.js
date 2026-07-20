import assert from "node:assert/strict";
import test from "node:test";
import { projectedRiverEdgeDirection } from "./riverEdgeProjection.js";

test("river edges follow visible elevated surface positions when distinct", () => {
  assert.deepEqual(projectedRiverEdgeDirection({
    surfaceDelta: { x: 3, y: 4 },
    layoutDelta: { x: -12, y: 0 },
    globeDelta: { x: 0, y: -1 },
    tileId: 12,
    edge: 1
  }), { x: 0.6, y: 0.8 });
});

test("river edges use stable tile centers when elevation collapses the surface direction", () => {
  assert.deepEqual(projectedRiverEdgeDirection({
    surfaceDelta: { x: 0, y: 0 },
    layoutDelta: { x: -20, y: 10 },
    globeDelta: { x: -1, y: 0 },
    tileId: 24583,
    edge: 1
  }), {
    x: -20 / Math.hypot(20, 10),
    y: 10 / Math.hypot(20, 10)
  });
});

test("river edges use globe projection when frozen tile centers coincide", () => {
  assert.deepEqual(projectedRiverEdgeDirection({
    surfaceDelta: { x: 0, y: 0 },
    layoutDelta: { x: 0, y: 0 },
    globeDelta: { x: -2, y: 1 },
    tileId: 24583,
    edge: 1
  }), {
    x: -2 / Math.hypot(2, 1),
    y: 1 / Math.hypot(2, 1)
  });
});

test("river edge projection still fails when every representation is degenerate", () => {
  assert.throws(() => projectedRiverEdgeDirection({
    surfaceDelta: { x: 0, y: 0 },
    layoutDelta: { x: 0, y: 0 },
    globeDelta: { x: 0, y: 0 },
    tileId: 24583,
    edge: 1
  }), /Could not project river edge 1 on tile 24583/);
});
