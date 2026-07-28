import assert from "node:assert/strict";
import test from "node:test";
import {
  renderWorldLayerStack,
  WORLD_LAYER_ORDER
} from "./worldLayerOrder.js";

test("the priority beach connector and its tide both remain beneath terrain tiles", () => {
  const drawn = [];
  const drawers = Object.fromEntries(
    WORLD_LAYER_ORDER.map((layer) => [layer, () => drawn.push(layer)])
  );

  renderWorldLayerStack(drawers);

  assert.deepEqual(drawn, [
    "connectorBase",
    "tidalWater",
    "terrainTiles",
    "surfaceDetails",
    "waterEffects",
    "waterForeground",
    "dynamicWorld"
  ]);
});

test("world layer rendering fails loudly when a painter pass is absent", () => {
  assert.throws(
    () => renderWorldLayerStack({}),
    /missing its connectorBase/
  );
});
