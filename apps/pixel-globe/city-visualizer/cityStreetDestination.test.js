import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { cityDestinationById } from "./cityDestinations.js";
import { PORT_CITY_LOCATION } from "../src/portCityNavigation.js";

const source = readFileSync(new URL("./main.js", import.meta.url), "utf8");
function loadFunction(name, context) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0);
  const end = source.indexOf("\nfunction ", start + 1);
  vm.runInContext(source.slice(start, end), context);
}

test("a village inn has a button anchored to its placed house when the authored inn is absent", () => {
  const frame = { frame: { x: 20, y: 30, w: 60, h: 40 }, spriteSourceSize: { x: 900, y: 400 } };
  const placement = { layerName: "Home 2", frame, x: 1000, y: 420, width: 60, height: 40, depth: 3 };
  const atlas = {};
  const context = vm.createContext({ PORT_CITY_LOCATION, state: {
    streetBuildings: [placement], features: { primitiveSettlement: true },
    portManifest: { staticFrames: [] }, staticAtlas: atlas, specialAgents: []
  }, activePortSceneLayers: () => new Set(),
  sceneWindow: () => ({ x: 800, y: 200 }), regionalStaticFrame: () => null,
  cityStreetBombardmentPresentation: () => null });
  loadFunction("streetDestinationPresentation", context);
  loadFunction("destinationScreenAnchor", context);
  const inn = cityDestinationById(PORT_CITY_LOCATION.INN);
  const anchor = context.destinationScreenAnchor(inn);
  assert.equal(anchor.x, 230);
  assert.equal(anchor.y, 226);
  const presentation = context.streetDestinationPresentation(inn);
  assert.equal(presentation.atlas, atlas);
  assert.equal(presentation.frame.spriteSourceSize.x, placement.x);
  assert.equal(presentation.frame.spriteSourceSize.y, placement.y);
  assert.equal(frame.spriteSourceSize.x, 900, "navigation does not mutate the source atlas frame");
  context.state.streetBuildings = [];
  assert.equal(context.destinationScreenAnchor(inn), null);
});
