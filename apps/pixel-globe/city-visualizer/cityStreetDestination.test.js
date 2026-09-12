import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { activeCityDestinations, cityDestinationById } from "./cityDestinations.js";
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

test("village authority hover and clicks use the placed chief's house, including its opaque pixels", () => {
  const frame = { frame: { x: 0, y: 0, w: 60, h: 40 }, spriteSourceSize: { x: 0, y: 0 } };
  const placement = { slotId: "business-east", layerName: "Home", frame, x: 1000, y: 420, width: 60, height: 40, depth: 3 };
  const authority = activeCityDestinations({ availableDestinationIds: new Set([PORT_CITY_LOCATION.AUTHORITY]),
    assaultActive: false, features: { settlementStage: "city", primitiveSettlement: true,
      inn: true, market: true, store: false, shipyard: false } })[0];
  const context = vm.createContext({ PORT_CITY_LOCATION, state: {
    streetBuildings: [placement], features: { primitiveSettlement: true },
    portManifest: { staticFrames: [] }, staticAtlas: {}, specialAgents: []
  }, activeDestinations: () => [authority], destinationLabelAtPoint: () => null,
  specialDestinationContainsPoint: () => false, activePortSceneLayers: () => new Set(),
  sceneWindow: () => ({ x: 800, y: 200 }), regionalStaticFrame: () => null,
  cityStreetBombardmentPresentation: () => null,
  frameContainsOpaquePixel: (_atlas, f, x, y) => x > f.spriteSourceSize.x && x < f.spriteSourceSize.x + 60 &&
    y > f.spriteSourceSize.y && y < f.spriteSourceSize.y + 40
  });
  for (const name of ["streetDestinationPresentation", "destinationScreenAnchor", "destinationAtPoint"]) loadFunction(name, context);
  assert.equal(context.destinationScreenAnchor(authority).x, 230);
  assert.equal(context.destinationAtPoint(230, 240).destination.id, PORT_CITY_LOCATION.AUTHORITY);
  assert.equal(context.destinationAtPoint(190, 240), null);
  assert.equal(context.destinationAtPoint(200, 220), null, "transparent boundary is not clickable");
});
