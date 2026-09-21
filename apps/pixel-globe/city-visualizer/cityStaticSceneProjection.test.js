import assert from "node:assert/strict";
import test from "node:test";

import {
  CITY_STATIC_SCENE_ENTRY_KINDS,
  cityStaticSceneProjectionInstruction
} from "./cityStaticSceneProjection.js";
import {
  citySceneCacheBounds,
  contiguousCityProjectionGroups
} from "./cityProjectionGroups.js";

test("every cacheable city scene entry kind declares its projection source", () => {
  const examples = {
    "background-city-static": { side: "right" },
    "city-building": placement(),
    "dock-shadow-extension": {},
    "gate-front": {},
    "left-bank-background-city-base": { frame: { layer: "Grass Under City" } },
    "left-bank-background-city-underlay": { frame: { layer: "Rocky Under City" } },
    "quay-cargo": placement(),
    "shipyard-construction": placement(0.98, 1),
    "shipyard-front": {},
    "static": { layerName: "Inn", occurrence: 0 },
    "tree": placement(),
    "tree-shadow": placement()
  };

  assert.deepEqual(Object.keys(examples).sort(), [...CITY_STATIC_SCENE_ENTRY_KINDS].sort());
  for (const kind of CITY_STATIC_SCENE_ENTRY_KINDS) {
    assert.doesNotThrow(() => cityStaticSceneProjectionInstruction({ kind, ...examples[kind] }));
  }
});

test("city foreground cache entries use the same projection as their drawing code", () => {
  assert.deepEqual(cityStaticSceneProjectionInstruction({ kind: "gate-front" }), {
    kind: "layer",
    layerName: "Gate",
    occurrence: undefined
  });
  assert.deepEqual(cityStaticSceneProjectionInstruction({
    kind: "shipyard-construction",
    ...placement(0.98, 1)
  }), {
    kind: "explicit",
    depth: 0.98,
    parallaxAnchor: 1
  });
  assert.deepEqual(cityStaticSceneProjectionInstruction({ kind: "shipyard-front" }), {
    kind: "layer",
    layerName: "Shipyard",
    occurrence: undefined
  });
});

test("city static projection contracts reject unknown kinds and invalid placement data", () => {
  assert.throws(
    () => cityStaticSceneProjectionInstruction({ kind: "new-static-kind" }),
    /not cacheable/
  );
  assert.throws(
    () => cityStaticSceneProjectionInstruction({ kind: "tree", placement: { depth: NaN } }),
    /Invalid tree projection/
  );
});

test("projection groups preserve painter order when a projection plane reappears", () => {
  const frontA = { id: "front-a", depth: 1, parallaxAnchor: 0 };
  const frontB = { id: "front-b", depth: 1, parallaxAnchor: 0 };
  const rear = { id: "rear", depth: 2, parallaxAnchor: 0.5 };
  const frontC = { id: "front-c", depth: 1, parallaxAnchor: 0 };

  const groups = contiguousCityProjectionGroups([frontA, frontB, rear, frontC]);

  assert.equal(groups.length, 3);
  assert.deepEqual(groups.map((group) => group.entries.map((entry) => entry.id)), [
    ["front-a", "front-b"],
    ["rear"],
    ["front-c"]
  ]);
  assert.deepEqual(groups.flatMap((group) => group.entries), [frontA, frontB, rear, frontC]);
});

test("projection groups reject invalid coordinates", () => {
  assert.throws(
    () => contiguousCityProjectionGroups([{ depth: Number.NaN, parallaxAnchor: 0 }]),
    /invalid depth/
  );
  assert.throws(
    () => contiguousCityProjectionGroups([{ depth: 1, parallaxAnchor: Infinity }]),
    /invalid parallaxAnchor/
  );
});

test("city scene cache bounds tightly enclose fractional rectangles", () => {
  assert.deepEqual(citySceneCacheBounds([
    { x: 10.25, y: 20.5, width: 5, height: 6 },
    { x: -2, y: 23, width: 4.5, height: 2 }
  ]), { x: -2, y: 20, width: 18, height: 7 });
  assert.throws(() => citySceneCacheBounds([]), /at least one rectangle/);
  assert.throws(
    () => citySceneCacheBounds([{ x: 0, y: 0, width: 0, height: 1 }]),
    /finite positive bounds/
  );
});

function placement(depth = 0.72, parallaxAnchor = 0.4) {
  return { placement: { depth, parallaxAnchor } };
}
