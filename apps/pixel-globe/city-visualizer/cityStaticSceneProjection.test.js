import assert from "node:assert/strict";
import test from "node:test";

import {
  CITY_STATIC_SCENE_ENTRY_KINDS,
  cityStaticSceneProjectionInstruction
} from "./cityStaticSceneProjection.js";

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

function placement(depth = 0.72, parallaxAnchor = 0.4) {
  return { placement: { depth, parallaxAnchor } };
}
