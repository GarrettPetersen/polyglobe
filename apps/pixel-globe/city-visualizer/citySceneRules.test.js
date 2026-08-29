import assert from "node:assert/strict";
import test from "node:test";
import { responsiveLogicalViewport } from "../src/responsiveViewport.js";
import {
  PORT_SCENE_MASTER,
  activePortSceneLayers,
  logicalSceneWindow,
  resolveCitySceneFeatures
} from "./citySceneRules.js";

const CITY = Object.freeze({
  approach: "river",
  dock: "wood",
  fortified: true,
  settlementType: "city",
  mountains: { left: true, right: false },
  terrain: {
    left: "forest",
    right: "grass",
    leftDistant: "rocky",
    rightDistant: "grass"
  }
});

test("the visualizer inherits the game's exact logical viewport dimensions", () => {
  assert.deepEqual(responsiveLogicalViewport({ viewportWidth: 16, viewportHeight: 9 }), {
    width: 455,
    height: 256
  });
  assert.deepEqual(responsiveLogicalViewport({ viewportWidth: 32, viewportHeight: 9 }), {
    width: 910,
    height: 256
  });
  assert.deepEqual(responsiveLogicalViewport({ viewportWidth: 1, viewportHeight: 100 }), {
    width: 256,
    height: 910
  });
});

test("a widest viewport exhausts horizontal parallax while canonical views travel the safe span", () => {
  const wideLeft = logicalSceneWindow({ width: 910, height: 256, parallax: -1 });
  const wideRight = logicalSceneWindow({ width: 910, height: 256, parallax: 1 });
  assert.equal(wideLeft.x, PORT_SCENE_MASTER.safeX);
  assert.equal(wideRight.x, PORT_SCENE_MASTER.safeX);

  const canonicalLeft = logicalSceneWindow({ width: 455, height: 256, parallax: -1 });
  const canonicalRight = logicalSceneWindow({ width: 455, height: 256, parallax: 1 });
  assert.equal(canonicalLeft.x, PORT_SCENE_MASTER.safeX);
  assert.equal(canonicalRight.x + canonicalRight.width, PORT_SCENE_MASTER.safeX + PORT_SCENE_MASTER.safeWidth);
});

test("vertical crops stay bottom-anchored and extreme portrait reveals only additional sky", () => {
  const landscape = logicalSceneWindow({ width: 455, height: 256 });
  const portrait = logicalSceneWindow({ width: 256, height: 910 });
  assert.equal(landscape.y + landscape.height, PORT_SCENE_MASTER.safeBottom);
  assert.equal(portrait.y + portrait.height, PORT_SCENE_MASTER.safeBottom);
  assert.ok(portrait.y < 0);
});

test("river, dock, mountain, terrain, and fortification rules activate authored layer families", () => {
  const layers = activePortSceneLayers(resolveCitySceneFeatures(CITY));
  for (const layer of [
    "Left Bank Sand Beach",
    "Rocky Hills Left Bank",
    "Foreground Grass Left Bank",
    "Horizon Mountains Left Bank",
    "Dock Background",
    "Dock",
    "Dock Foreground",
    "Far Castle",
    "Gate",
    "Near Castle",
    "Foreground Grass Castle Shadow"
  ]) assert.equal(layers.has(layer), true, layer);
  assert.equal(layers.has("Horizon Mountains"), false);
  assert.equal(layers.has("Stone Dock"), false);
});

test("manual feature overrides can audition missing art without changing the city bake", () => {
  const features = resolveCitySceneFeatures(CITY, {
    approach: "ocean",
    dock: "stone",
    fortified: false,
    mountainsRight: true,
    rightTerrain: "desert"
  });
  const layers = activePortSceneLayers(features);
  assert.equal(layers.has("Left Bank Sand Beach"), false);
  assert.equal(layers.has("Stone Dock"), true);
  assert.equal(layers.has("Gate"), false);
  assert.equal(layers.has("Horizon Mountains"), true);
  assert.equal(layers.has("Foreground Desert"), true);
});
