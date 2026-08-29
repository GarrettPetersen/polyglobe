import assert from "node:assert/strict";
import test from "node:test";
import { responsiveLogicalViewport } from "../src/responsiveViewport.js";
import {
  PORT_SCENE_MASTER,
  PORT_SCENE_BEACH_SLICES,
  PORT_SCENE_ENTITY_META,
  PORT_SCENE_OCEAN_SLICES,
  activePortSceneLayers,
  advanceSceneParallax,
  layerParallaxDepth,
  layerSceneZ,
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

test("coastal views use the safe span while river views can pan across the authored left bank", () => {
  const wideLeft = logicalSceneWindow({ width: 910, height: 256, parallax: -1 });
  const wideRight = logicalSceneWindow({ width: 910, height: 256, parallax: 1 });
  assert.equal(wideLeft.x, PORT_SCENE_MASTER.safeX);
  assert.equal(wideRight.x, PORT_SCENE_MASTER.safeX);

  const canonicalLeft = logicalSceneWindow({ width: 455, height: 256, parallax: -1 });
  const canonicalRight = logicalSceneWindow({ width: 455, height: 256, parallax: 1 });
  assert.equal(canonicalLeft.x, PORT_SCENE_MASTER.safeX);
  assert.equal(canonicalRight.x + canonicalRight.width, PORT_SCENE_MASTER.safeX + PORT_SCENE_MASTER.safeWidth);

  const riverWideLeft = logicalSceneWindow({ width: 910, height: 256, parallax: -1, approach: "river" });
  const riverWideRight = logicalSceneWindow({ width: 910, height: 256, parallax: 1, approach: "river" });
  assert.equal(riverWideLeft.x, PORT_SCENE_MASTER.leftBankX);
  assert.equal(riverWideRight.x + riverWideRight.width, PORT_SCENE_MASTER.width);

  const riverCanonicalLeft = logicalSceneWindow({ width: 455, height: 256, parallax: -1, approach: "river" });
  assert.equal(riverCanonicalLeft.x, PORT_SCENE_MASTER.leftBankX);
});

test("camera parallax approaches an edge without snapping there on pointer entry", () => {
  const firstFrame = advanceSceneParallax({ current: -0.35, target: 1, elapsedMs: 16 });
  assert.ok(firstFrame > -0.35);
  assert.ok(firstFrame < 1);
  let settled = firstFrame;
  for (let frame = 0; frame < 240; frame++) {
    settled = advanceSceneParallax({ current: settled, target: 1, elapsedMs: 16 });
  }
  assert.equal(settled, 1);
});

test("ocean depth slices cover the authored water without gaps", () => {
  assert.equal(PORT_SCENE_OCEAN_SLICES[0].top, 446);
  assert.equal(PORT_SCENE_OCEAN_SLICES.at(-1).bottom, PORT_SCENE_MASTER.height);
  for (let index = 1; index < PORT_SCENE_OCEAN_SLICES.length; index++) {
    assert.equal(PORT_SCENE_OCEAN_SLICES[index - 1].bottom, PORT_SCENE_OCEAN_SLICES[index].top);
    assert.ok(PORT_SCENE_OCEAN_SLICES[index - 1].depth < PORT_SCENE_OCEAN_SLICES[index].depth);
  }
});

test("beach variants cross the same distant, midground, and foreground boundaries", () => {
  assert.deepEqual(
    PORT_SCENE_BEACH_SLICES.map(({ top, bottom }) => [top, bottom]),
    [[478, 522], [522, 557], [557, PORT_SCENE_MASTER.height]]
  );
  assert.deepEqual(
    PORT_SCENE_BEACH_SLICES.map(({ depth }) => depth),
    [PORT_SCENE_OCEAN_SLICES[1].depth, PORT_SCENE_OCEAN_SLICES[2].depth, PORT_SCENE_OCEAN_SLICES[3].depth]
  );
});

test("explicit scene z places walkers and the inn between gatehouse sections", () => {
  assert.ok(layerSceneZ("Far Castle") < layerSceneZ("Gate"));
  assert.ok(layerSceneZ("Gate") < PORT_SCENE_ENTITY_META.npcs.z);
  assert.ok(PORT_SCENE_ENTITY_META.npcs.z < layerSceneZ("Inn"));
  assert.equal(layerSceneZ("Near Castle"), layerSceneZ("Inn"));
  assert.ok(layerParallaxDepth("Far Castle") < layerParallaxDepth("Gate"));
  assert.ok(layerParallaxDepth("Gate") < layerParallaxDepth("Near Castle"));
  assert.equal(layerParallaxDepth("Near Castle"), layerParallaxDepth("Inn"));
});

test("duplicate market layers can occupy distinct authored rows", () => {
  assert.ok(layerSceneZ("Market Stall", 0) < layerSceneZ("Market Stall", 1));
  assert.equal(layerSceneZ("Market Stall", 1), layerSceneZ("Inn"));
  assert.ok(layerSceneZ("Market Stall Copy Copy", 1) < layerSceneZ("Market Stall Copy Copy", 2));
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
