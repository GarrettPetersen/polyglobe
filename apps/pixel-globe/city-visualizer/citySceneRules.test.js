import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { canvasDisplayLayout } from "../src/displayScaling.js";
import { responsiveLogicalViewport } from "../src/responsiveViewport.js";
import { SHIP_STATS } from "../src/shipStats.js";
import { cityVisualizerShipOptions } from "./cityVisualizerLabels.js";
import {
  PORT_SCENE_MASTER,
  PORT_SCENE_DOCK,
  PORT_SCENE_ENTITY_META,
  PORT_SCENE_OCEAN_SLICES,
  PORT_SCENE_RIVER,
  activePortSceneLayers,
  advanceSceneParallax,
  docksideShipSideAnchor,
  layerParallaxAnchor,
  layerParallaxDepth,
  layerSceneOffsetX,
  layerSceneOffsetY,
  layerSceneZ,
  logicalSceneWindow,
  resolveCitySceneFeatures,
  sceneCameraDefaultParallax,
  sceneCameraParallaxBounds,
  sceneEdgeScrollVelocity,
  scenePanParallaxDelta
} from "./citySceneRules.js";

const SHIP_MANIFEST = JSON.parse(readFileSync(new URL(
  "../public/assets/vehicles/unity-ships/port-assault/manifest.json",
  import.meta.url
), "utf8"));

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

test("the visualizer uses the game's continuous fullscreen display scaling", () => {
  for (const [viewportWidth, viewportHeight] of [
    [1920, 1080],
    [5120, 1440],
    [1024, 1024],
    [390, 844],
    [360, 1280]
  ]) {
    const logical = responsiveLogicalViewport({ viewportWidth, viewportHeight });
    const layout = canvasDisplayLayout({
      viewportWidth,
      viewportHeight,
      canvasWidth: logical.width,
      canvasHeight: logical.height
    });
    const horizontalGap = viewportWidth - layout.width;
    const verticalGap = viewportHeight - layout.height;
    assert.ok(horizontalGap < 2 || verticalGap < 2, `${viewportWidth}×${viewportHeight} did not fill either axis`);
    assert.ok(layout.left >= 0 && layout.top >= 0);
  }
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

test("RTS camera scrolls only at the edges and stops in place when input ceases", () => {
  assert.equal(sceneEdgeScrollVelocity({ pointerX: 227.5, width: 455 }), 0);
  assert.equal(sceneEdgeScrollVelocity({ pointerX: 0, width: 455 }), -0.45);
  assert.equal(sceneEdgeScrollVelocity({ pointerX: 455, width: 455 }), 0.45);
  assert.equal(sceneEdgeScrollVelocity({ pointerX: -0.39678955078125, width: 455 }), -0.45);
  assert.equal(sceneEdgeScrollVelocity({ pointerX: 455.39678955078125, width: 455 }), 0.45);
  const firstFrame = advanceSceneParallax({
    current: -0.35,
    velocity: sceneEdgeScrollVelocity({ pointerX: 450, width: 455 }),
    elapsedMs: 16
  });
  assert.ok(firstFrame > -0.35);
  assert.ok(firstFrame < 1);
  assert.equal(advanceSceneParallax({ current: firstFrame, velocity: 0, elapsedMs: 1000 }), firstFrame);
  assert.deepEqual(sceneCameraParallaxBounds("river"), { minimum: -0.12, maximum: 1 });
  assert.equal(sceneCameraDefaultParallax("river"), -0.12);
  assert.deepEqual(sceneCameraParallaxBounds("ocean"), { minimum: -1, maximum: 1 });
});

test("wheel and swipe distances pan the camera through the authored scene", () => {
  assert.equal(scenePanParallaxDelta({
    screenDeltaX: 455,
    displayWidth: 910,
    logicalWidth: 455,
    approach: "ocean"
  }), 1);
  assert.equal(scenePanParallaxDelta({
    screenDeltaX: -455,
    displayWidth: 910,
    logicalWidth: 455,
    approach: "river"
  }), -0.5);
  assert.equal(scenePanParallaxDelta({
    screenDeltaX: 200,
    displayWidth: 910,
    logicalWidth: 910,
    approach: "ocean"
  }), 0);
});

test("ocean depth slices cover the authored water without gaps", () => {
  assert.equal(PORT_SCENE_OCEAN_SLICES[0].top, 446);
  assert.equal(PORT_SCENE_OCEAN_SLICES.at(-1).bottom, PORT_SCENE_MASTER.height);
  for (let index = 1; index < PORT_SCENE_OCEAN_SLICES.length; index++) {
    assert.equal(PORT_SCENE_OCEAN_SLICES[index - 1].bottom, PORT_SCENE_OCEAN_SLICES[index].top);
    assert.ok(PORT_SCENE_OCEAN_SLICES[index - 1].depth <= PORT_SCENE_OCEAN_SLICES[index].depth);
  }
  assert.equal(PORT_SCENE_OCEAN_SLICES[1].depth, layerParallaxDepth("Distant Plains"));
  assert.equal(PORT_SCENE_OCEAN_SLICES[1].depth, layerParallaxDepth("Distant Forest"));
  assert.equal(PORT_SCENE_OCEAN_SLICES[2].depth, layerParallaxDepth("Midground Grass"));
  assert.equal(PORT_SCENE_OCEAN_SLICES[2].depth, layerParallaxDepth("Sand Beach"));
  assert.ok(layerSceneZ("Distant Plains") < PORT_SCENE_OCEAN_SLICES[2].z);
  assert.ok(layerSceneZ("Distant Plains") < PORT_SCENE_OCEAN_SLICES[3].z);
});

test("river scenes inset intact left-bank artwork without moving coastal layers", () => {
  assert.equal(layerSceneOffsetX("Distant Forest Left Bank", 0, "river"), PORT_SCENE_RIVER.leftBankDistantInsetX);
  assert.equal(layerSceneOffsetY("Distant Forest Left Bank", 0, "river"), PORT_SCENE_RIVER.leftBankDistantOffsetY);
  assert.equal(layerSceneOffsetX("Left Bank Sand Beach", 0, "river"), PORT_SCENE_RIVER.leftBankForegroundInsetX);
  assert.equal(layerSceneOffsetY("Left Bank Sand Beach", 0, "river"), 0);
  assert.equal(layerSceneOffsetX("Foreground Grass Left Bank", 0, "river"), PORT_SCENE_RIVER.leftBankForegroundInsetX);
  assert.equal(layerSceneOffsetX("Sand Beach", 0, "river"), 0);
  assert.equal(layerSceneOffsetX("Left Bank Sand Beach", 0, "ocean"), 0);
  assert.equal(layerSceneOffsetY("Distant Forest Left Bank", 0, "ocean"), 0);
  assert.equal(layerParallaxAnchor("Distant Forest Left Bank"), sceneCameraDefaultParallax("river"));
  assert.ok(layerParallaxDepth("Distant Forest") < layerParallaxDepth("Midground Grass"));
  assert.equal(layerParallaxDepth("Distant Forest"), layerParallaxDepth("Distant Hills"));

  const width = 455;
  const parallax = sceneCameraDefaultParallax("river");
  const leftWindow = logicalSceneWindow({
    width,
    height: 256,
    parallax,
    depth: layerParallaxDepth("Distant Forest Left Bank"),
    parallaxAnchor: layerParallaxAnchor("Distant Forest Left Bank"),
    approach: "river"
  });
  const rightWindow = logicalSceneWindow({
    width,
    height: 256,
    parallax,
    depth: layerParallaxDepth("Distant Forest"),
    parallaxAnchor: layerParallaxAnchor("Distant Forest"),
    approach: "river"
  });
  const leftForestRightEdge = 371 - (leftWindow.x - PORT_SCENE_RIVER.leftBankDistantInsetX);
  const rightForestLeftEdge = 714 - rightWindow.x;
  assert.ok(rightForestLeftEdge - leftForestRightEdge >= 16);
});

test("ship-to-gate lane and its terrain remain one rigid parallax assembly", () => {
  const assembly = [
    "Sand Beach",
    "Sand Beach Dock Shadow",
    "Midground Grass",
    "Midground Desert",
    "Midground Rocky",
    "Road",
    "Dock Background",
    "Dock",
    "Stone Dock",
    "Dock Foreground",
    "Waves",
    "Surf",
    "Castle Shadow",
    "Gate",
    "Near Castle"
  ];
  assert.deepEqual(new Set(assembly.map((layer) => layerParallaxDepth(layer))), new Set([1]));
  assert.equal(PORT_SCENE_ENTITY_META.ship.depth, 1);
  assert.equal(PORT_SCENE_ENTITY_META.ship.scale, 1);
  assert.equal(PORT_SCENE_ENTITY_META.ship.nativeRasterScale, 3);
  assert.ok(layerSceneZ("Left Bank Sand Beach") > PORT_SCENE_ENTITY_META.ship.z);
  assert.ok(layerSceneZ("Foreground Grass Left Bank") > PORT_SCENE_ENTITY_META.ship.z);
  assert.equal(PORT_SCENE_ENTITY_META.npcs.depth, 1);
  assert.equal(PORT_SCENE_DOCK.beachStartX - PORT_SCENE_DOCK.startX, PORT_SCENE_DOCK.shadowWaterExtension);
  assert.ok(PORT_SCENE_DOCK.shipAccessX >= PORT_SCENE_DOCK.startX);
  assert.equal(PORT_SCENE_DOCK.shipAccessY, PORT_SCENE_DOCK.topY);
});

test("dockside ships berth at the middle of their side rather than their bow anchor", () => {
  for (const ship of SHIP_MANIFEST.ships) {
    const dockside = ship.cityDockside;
    const nearRail = ship.deckPolygon.slice(2);
    const sideMidpoint = {
      x: (nearRail[0].x + nearRail[1].x) / 2,
      y: (nearRail[0].y + nearRail[1].y) / 2
    };
    const anchor = docksideShipSideAnchor(ship);
    assert.equal(
      anchor.x,
      dockside.deckEntryAnchor.x +
        (sideMidpoint.x - ship.deckEntryAnchor.x) * dockside.nativeScale,
      ship.slug
    );
    assert.equal(
      anchor.y,
      dockside.deckEntryAnchor.y +
        (sideMidpoint.y - ship.deckEntryAnchor.y) * dockside.nativeScale,
      ship.slug
    );
    assert.ok(anchor.x < dockside.deckEntryAnchor.x, ship.slug);
    assert.ok(anchor.y > dockside.deckEntryAnchor.y, ship.slug);
  }
});

test("ship menus display canonical vessel names rather than internal IDs", () => {
  const options = cityVisualizerShipOptions(SHIP_STATS);
  assert.equal(options.length, SHIP_STATS.length);
  assert.ok(options.every(({ value, label }) => label !== value));
  assert.equal(options.find(({ value }) => value === "fishing-lugger").label, "Fishing Barque");
  assert.equal(options.find(({ value }) => value === "pirate-brig").label, "Heavy Caravel");
  assert.equal(options.find(({ value }) => value === "ottoman-coastal-trader").label, "Kancabash");
});

test("shore and town layers retain small parallax but stay attached to the authored composition", () => {
  const behindRoad = [
    "Shipyard",
    "Desert Behind Buildings",
    "Rocks Behind Buildings",
    "Grass Behind Buildings",
    "Home 2",
    "Home",
    "Smith",
    "Market Stall",
    "Market Stall Copy",
    "Market Stall Copy Copy"
  ];
  assert.ok(behindRoad.every((layer) => layerParallaxDepth(layer) < 1));
  assert.ok(behindRoad.every((layer) => layerParallaxDepth(layer) >= 0.94));
  assert.ok(layerParallaxDepth("Home") < layerParallaxDepth("Smith"));
  assert.ok(layerParallaxDepth("Home 2") < layerParallaxDepth("Smith"));
  assert.ok(behindRoad.every((layer) => layerParallaxAnchor(layer) === 1));
  const upperAtFocus = logicalSceneWindow({
    width: 455,
    height: 256,
    parallax: 1,
    depth: layerParallaxDepth("Market Stall", 0),
    parallaxAnchor: layerParallaxAnchor("Market Stall", 0),
    approach: "river"
  });
  const lowerAtFocus = logicalSceneWindow({ width: 455, height: 256, parallax: 1, depth: 1, approach: "river" });
  assert.equal(upperAtFocus.x, lowerAtFocus.x);
  const upperAway = logicalSceneWindow({
    width: 455,
    height: 256,
    parallax: 0,
    depth: layerParallaxDepth("Market Stall", 0),
    parallaxAnchor: layerParallaxAnchor("Market Stall", 0),
    approach: "river"
  });
  const lowerAway = logicalSceneWindow({ width: 455, height: 256, parallax: 0, depth: 1, approach: "river" });
  assert.notEqual(upperAway.x, lowerAway.x);

  for (const width of [256, 455, 910]) {
    const minimum = sceneCameraParallaxBounds("river").minimum;
    const foreground = logicalSceneWindow({ width, height: 256, parallax: minimum, depth: 1, approach: "river" });
    for (const layer of ["Distant Plains", "Shipyard", ...behindRoad]) {
      const layerWindow = logicalSceneWindow({
        width,
        height: 256,
        parallax: minimum,
        depth: layerParallaxDepth(layer),
        parallaxAnchor: layerParallaxAnchor(layer),
        approach: "river"
      });
      assert.ok(Math.abs(layerWindow.x - foreground.x) <= 38, `${layer} detached by ${layerWindow.x - foreground.x}px`);
    }
  }
});

test("explicit scene z places walkers and the inn between gatehouse sections", () => {
  assert.ok(layerSceneZ("Road") < layerSceneZ("Far Castle"));
  assert.ok(layerSceneZ("Far Castle") < layerSceneZ("Gate"));
  assert.ok(layerSceneZ("Road") < layerSceneZ("Castle Shadow"));
  assert.ok(layerSceneZ("Gate") < PORT_SCENE_ENTITY_META.npcs.z);
  assert.ok(PORT_SCENE_ENTITY_META.npcs.z < layerSceneZ("Inn"));
  assert.ok(layerSceneZ("Foreground Grass") < layerSceneZ("Near Castle"));
  assert.ok(layerSceneZ("Foreground Grass Castle Shadow") < layerSceneZ("Near Castle"));
  assert.ok(layerSceneZ("Near Castle") < layerSceneZ("Barrel"));
  assert.ok(layerParallaxDepth("Far Castle") < layerParallaxDepth("Gate"));
  assert.equal(layerParallaxDepth("Gate"), layerParallaxDepth("Near Castle"));
  assert.equal(layerParallaxDepth("Near Castle"), layerParallaxDepth("Inn"));

  for (const width of [256, 455, 910]) {
    for (const parallax of [sceneCameraParallaxBounds("river").minimum, 1]) {
      const far = logicalSceneWindow({
        width,
        height: 256,
        parallax,
        depth: layerParallaxDepth("Far Castle"),
        parallaxAnchor: layerParallaxAnchor("Far Castle"),
        approach: "river"
      });
      const near = logicalSceneWindow({ width, height: 256, parallax, depth: layerParallaxDepth("Near Castle"), approach: "river" });
      assert.ok(Math.abs(far.x - near.x) <= 3);
    }
  }
});

test("duplicate market layers can occupy distinct authored rows", () => {
  assert.ok(layerSceneZ("Market Stall", 0) < layerSceneZ("Market Stall", 1));
  assert.equal(layerSceneZ("Market Stall", 1), layerSceneZ("Inn"));
  assert.ok(layerSceneZ("Market Stall Copy Copy", 1) < layerSceneZ("Market Stall Copy Copy", 2));
});

test("vertical crops expand around the authored view and extreme portrait reveals the full tall artwork", () => {
  const landscape = logicalSceneWindow({ width: 455, height: 256 });
  const portrait = logicalSceneWindow({ width: 256, height: 455 });
  const extremePortrait = logicalSceneWindow({ width: 256, height: 910 });
  const authoredCenterY = PORT_SCENE_MASTER.safeBottom - PORT_SCENE_MASTER.safeHeight / 2;
  assert.equal(landscape.y + landscape.height, PORT_SCENE_MASTER.safeBottom);
  assert.ok(Math.abs(portrait.y + portrait.height / 2 - authoredCenterY) <= 0.5);
  assert.equal(extremePortrait.y, 0);
  assert.equal(extremePortrait.y + extremePortrait.height, PORT_SCENE_MASTER.height);
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
