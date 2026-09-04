import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { canvasDisplayLayout } from "../src/displayScaling.js";
import { responsiveLogicalViewport } from "../src/responsiveViewport.js";
import { SHIP_STATS } from "../src/shipStats.js";
import { COLONIZATION_TARGETS } from "../src/colonialCities.js";
import { pixelFontSizePx } from "../src/pixelText.js";
import { PORT_CITY_LOCATION } from "../src/portCityNavigation.js";
import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import {
  CITY_PIXEL_FONT_SMALL_8,
  CITY_PIXEL_FONT_TITLE_8
} from "./cityPixelText.js";
import { cityVisualizerShipOptions } from "./cityVisualizerLabels.js";
import { cityDestinationById } from "./cityDestinations.js";
import {
  CITY_HORIZON_LANDMARK,
  CITY_PYRAMID_VISIBILITY_RADIUS_KM,
  cityHasHorizonLandmark,
  cityHorizonLandmarks
} from "./cityHorizonLandmarks.js";
import {
  BACKGROUND_CITY_UNDERLAY_LAYERS,
  PORT_SCENE_MASTER,
  PORT_SCENE_CAMERA,
  PORT_SCENE_DOCK,
  PORT_SCENE_ENTITY_META,
  PORT_SCENE_DISTANT_TERRAIN_SHIFT_Y,
  PORT_SCENE_HORIZON_SHIFT_Y,
  PORT_SCENE_OCEAN_SLICES,
  PORT_SCENE_PYRAMID_GROUNDING_Y,
  PORT_SCENE_RIVER,
  PORT_SCENE_WATER_HORIZON_Y,
  activePortSceneLayers,
  advanceSceneParallax,
  advanceSceneScrollVelocity,
  cityFrameHitMaskContainsPoint,
  citySetSailOceanRect,
  cityStaticSceneCacheAllowed,
  docksideShipSideAnchor,
  docksideShipVerticalPlacement,
  layerParallaxAnchor,
  layerParallaxDepth,
  layerPainterZ,
  layerSceneOffsetX,
  layerSceneOffsetY,
  layerSceneZ,
  layerVisibleSourceRect,
  logicalSceneWindow,
  resolveCitySceneFeatures,
  sceneCameraDefaultParallax,
  sceneCameraDockParallax,
  sceneCameraParallaxBounds,
  sceneCameraSetSailIsRevealed,
  sceneEdgeScrollVelocity,
  sceneInertialPanTargetVelocity,
  scenePanParallaxDelta
} from "./citySceneRules.js";
import {
  CITY_GATE_FRONT_PAINTER_Z,
  CITY_GATE_TRAVERSAL_PAINTER_Z,
  CITY_GATE_TRAVERSAL_PATHS,
  CITY_PORT_ASSAULT_LANE_FEET_Y,
  CITY_PORT_ASSAULT_SHIP_FOREGROUND_PAINTER_Z,
  cityGroundPainterZ,
  cityNpcPathPoint,
  cityNpcPaths,
  cityPortAssaultLanePainterZ
} from "./cityPainterOrder.js";

const SHIP_MANIFEST = JSON.parse(readFileSync(new URL(
  "../public/assets/vehicles/unity-ships/port-assault/manifest.json",
  import.meta.url
), "utf8"));
const VISUALIZER_MAIN_SOURCE = readFileSync(new URL("./main.js", import.meta.url), "utf8");
const VISUALIZER_BOOTSTRAP_SOURCE = readFileSync(new URL("./bootstrap.js", import.meta.url), "utf8");
const VISUALIZER_STYLES_SOURCE = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
const VISUALIZER_HTML_SOURCE = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const CITY_VISUALIZER_CATALOG = JSON.parse(readFileSync(new URL("./data/cities.json", import.meta.url), "utf8"));
const CITY_VISUALIZER_PORT_MANIFEST = JSON.parse(readFileSync(new URL(
  "./assets/port-parallax/manifest.json",
  import.meta.url
), "utf8"));

const CITY = Object.freeze({
  cityType: "northern-european",
  approach: "river",
  dock: "wood",
  fortified: true,
  settlementType: "city",
  population: 50000,
  horizonLandmarks: [],
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

test("city labels and controls stay on the game's native pixel font grid", () => {
  assert.equal(pixelFontSizePx(CITY_PIXEL_FONT_SMALL_8), 8);
  assert.equal(pixelFontSizePx(CITY_PIXEL_FONT_TITLE_8), 8);
  assert.doesNotMatch(VISUALIZER_MAIN_SOURCE, /context\.fillText/);
  assert.doesNotMatch(
    VISUALIZER_STYLES_SOURCE,
    /font(?:-size)?\s*:\s*(?:7|9|10|17)px/
  );
});

test("persistent city destination labels share the production runtime and warp before activation", () => {
  assert.match(
    VISUALIZER_MAIN_SOURCE,
    /activeDestinations\(\)[\s\S]*layoutCityDestinationLabels\(\{/
  );
  assert.match(
    VISUALIZER_MAIN_SOURCE,
    /const targetContext = emissiveContext \|\| context;[\s\S]*drawDestinationLabelPlate/
  );
  assert.match(
    VISUALIZER_MAIN_SOURCE,
    /if \(hit\.fromLabel === true\) focusDestination\(hit\.destination\.id, \{ immediate: true \}\);[\s\S]*activateDestination/
  );
  assert.match(
    VISUALIZER_MAIN_SOURCE,
    /function activateDestination[\s\S]*state\.pointer = null;[\s\S]*state\.cameraVelocity = 0;[\s\S]*state\.cameraPanTarget = null;[\s\S]*onDestination\(activation\)/
  );
  assert.match(
    VISUALIZER_MAIN_SOURCE,
    /pointerOverDestinationLabel[\s\S]*state\.pointer && !pointerOverDestinationLabel/
  );
  assert.match(
    VISUALIZER_MAIN_SOURCE,
    /function updateDestinationLabelHover[\s\S]*pinnedDestinationLabel[\s\S]*panCameraToDestination/
  );
  assert.match(
    VISUALIZER_MAIN_SOURCE,
    /const retainedPin = retainAvailableCityDestinationLabelPin\([\s\S]*pinnedLabel: retainedPin/
  );
});

test("regional hover outlines and hit masks use the displayed building silhouette", () => {
  assert.match(
    VISUALIZER_MAIN_SOURCE,
    /const displayed = bombarded \|\| source;[\s\S]*const sourceAtlas = displayed\.atlas;[\s\S]*drawFrameOutline\(sourceAtlas, sourceFrame, window, targetContext\)/
  );
  assert.match(
    VISUALIZER_MAIN_SOURCE,
    /const regionalFrame = regionalStaticFrame\(frame, layerName\);[\s\S]*const bombarded = authoredBombardmentPresentation\([\s\S]*frameContainsOpaquePixel\([\s\S]*displayed\.atlas,[\s\S]*displayed\.frame/
  );
  assert.match(
    VISUALIZER_MAIN_SOURCE,
    /layerVisibleSourceRect\(layerName, sourceFrame\.frame\.w, sourceFrame\.frame\.h\)/
  );
});

test("only the suspicious merchant is a directly clickable NPC with a padded outlined target", () => {
  assert.match(VISUALIZER_MAIN_SOURCE, /const SUSPICIOUS_MERCHANT_HIT_PADDING_PX = 8/);
  assert.match(
    VISUALIZER_MAIN_SOURCE,
    /candidate\.interactive === true && candidate\.destinationId === destinationId/
  );
  assert.match(
    VISUALIZER_MAIN_SOURCE,
    /destinationId !== PORT_CITY_LOCATION\.ILLICIT_MERCHANT[\s\S]*Unexpected clickable city NPC destination/
  );
  assert.match(
    VISUALIZER_MAIN_SOURCE,
    /id: `\$\{state\.city\.id\}:suspicious-merchant`[\s\S]*?interactive: true/
  );
  assert.match(VISUALIZER_MAIN_SOURCE, /motion: "stationary",\n\s*interactive: false/);
  assert.match(
    VISUALIZER_MAIN_SOURCE,
    /agent\.interactive === true[\s\S]*tintedFrameCanvas\(atlas, frame\)[\s\S]*drawNpcFrame\(mask/
  );
  assert.match(VISUALIZER_MAIN_SOURCE, /maskContext\.fillStyle = "#ffe55c"/);
});

test("standalone visualizer controls and destination copy stay outside the production scene runtime", () => {
  assert.doesNotMatch(VISUALIZER_MAIN_SOURCE, /#city-select|destinationDialog|ResizeObserver|This will open/);
  assert.match(VISUALIZER_BOOTSTRAP_SOURCE, /#city-select/);
  assert.match(VISUALIZER_BOOTSTRAP_SOURCE, /destinationDialog\.showModal\(\)/);
  assert.match(VISUALIZER_BOOTSTRAP_SOURCE, /new ResizeObserver\(resizeLogicalCanvas\)/);
  assert.doesNotMatch(VISUALIZER_BOOTSTRAP_SOURCE, /This will open/);
});

test("the shipyard highlight excludes inert dock layers and the player ship owns a yellow outline", () => {
  const shipyard = cityDestinationById(PORT_CITY_LOCATION.SHIPYARD);
  assert.deepEqual(shipyard.layers, ["Shipyard"]);
  assert.equal(shipyard.requiredFeature, "shipyard");
  assert.match(VISUALIZER_MAIN_SOURCE, /shipOutline: tintedImageCanvas\(shipImage, "#ffe55c"\)/);
  assert.match(VISUALIZER_MAIN_SOURCE, /const SHIPYARD_BUILDING_HIT_PADDING_PX = 4/);
  assert.match(
    VISUALIZER_MAIN_SOURCE,
    /destination\.id === PORT_CITY_LOCATION\.SHIPYARD[\s\S]*SHIPYARD_BUILDING_HIT_PADDING_PX/
  );
});

test("standalone destinations expose services only when the current city provides them", () => {
  assert.equal(cityDestinationById(PORT_CITY_LOCATION.SHIPYARD).requiredFeature, "shipyard");
  assert.equal(cityDestinationById(PORT_CITY_LOCATION.MARKET).requiredFeature, "market");
  assert.equal(cityDestinationById(PORT_CITY_LOCATION.EQUIPMENT).requiredFeature, "store");
  assert.equal(cityDestinationById(PORT_CITY_LOCATION.INN).requiredFeature, "inn");
});

test("porous shipyard boards remain clickable across small transparent gaps", () => {
  const alpha = new Uint8Array(9 * 5);
  alpha[1 + 2 * 9] = 255;
  alpha[7 + 2 * 9] = 255;
  assert.equal(cityFrameHitMaskContainsPoint({
    alpha,
    width: 9,
    height: 5,
    x: 4,
    y: 2,
    paddingPx: 1
  }), false);
  assert.equal(cityFrameHitMaskContainsPoint({
    alpha,
    width: 9,
    height: 5,
    x: 4,
    y: 2,
    paddingPx: 4
  }), true);
  assert.equal(cityFrameHitMaskContainsPoint({
    alpha,
    width: 9,
    height: 5,
    x: 13,
    y: 2,
    paddingPx: 4
  }), false);
});

test("static regional buildings emit smoke only when their displayed sprite has a chimney", () => {
  assert.match(
    VISUALIZER_MAIN_SOURCE,
    /const displayedFrame = cityRegionalBuildingFrame\([\s\S]*if \(displayedFrame\.hasChimney === false\) continue;/
  );
});

test("coastal views can pan into the authored western ocean while river bounds remain restricted", () => {
  const wideLeft = logicalSceneWindow({ width: 910, height: 256, parallax: -1 });
  const wideRight = logicalSceneWindow({ width: 910, height: 256, parallax: 1 });
  assert.equal(wideLeft.x, PORT_SCENE_MASTER.leftBankX);
  assert.equal(wideRight.x + wideRight.width, PORT_SCENE_MASTER.width);

  const canonicalLeft = logicalSceneWindow({ width: 455, height: 256, parallax: -1 });
  const canonicalRight = logicalSceneWindow({ width: 455, height: 256, parallax: 1 });
  assert.equal(canonicalLeft.x, PORT_SCENE_MASTER.leftBankX);
  assert.equal(canonicalRight.x + canonicalRight.width, PORT_SCENE_MASTER.width);

  const riverWideLeft = logicalSceneWindow({ width: 910, height: 256, parallax: -1, approach: "river" });
  const riverWideRight = logicalSceneWindow({ width: 910, height: 256, parallax: 1, approach: "river" });
  assert.equal(riverWideLeft.x, PORT_SCENE_MASTER.leftBankX);
  assert.equal(riverWideRight.x + riverWideRight.width, PORT_SCENE_MASTER.width);

  const riverCanonicalLeft = logicalSceneWindow({ width: 455, height: 256, parallax: -1, approach: "river" });
  assert.equal(riverCanonicalLeft.x, PORT_SCENE_MASTER.leftBankX);
});

test("city scenes open on the player ship's connection to the dock", () => {
  for (const viewportWidth of [256, 455, 910]) {
    for (const approach of ["ocean", "river", "lake"]) {
      const parallax = sceneCameraDockParallax({ viewportWidth, approach });
      const window = logicalSceneWindow({
        width: viewportWidth,
        height: 256,
        parallax,
        depth: PORT_SCENE_ENTITY_META.ship.depth,
        approach
      });
      assert.equal(
        Math.round(PORT_SCENE_DOCK.shipAccessX - window.x),
        Math.round(viewportWidth / 2)
      );
      assert.ok(parallax > sceneCameraParallaxBounds(approach).minimum);
    }
  }
});

test("Set Sail stays hidden at the dock and appears after deliberate westward travel", () => {
  for (const viewportWidth of [256, 455, 910]) {
    for (const approach of ["ocean", "river", "lake"]) {
      const dockParallax = sceneCameraDockParallax({ viewportWidth, approach });
      const { minimum } = sceneCameraParallaxBounds(approach);
      assert.equal(sceneCameraSetSailIsRevealed({
        parallax: dockParallax,
        viewportWidth,
        approach
      }), false);
      assert.equal(sceneCameraSetSailIsRevealed({
        parallax: minimum,
        viewportWidth,
        approach
      }), true);
    }
  }
});

test("RTS camera scrolls quickly at the edges with smooth start, stop, and reversal inertia", () => {
  assert.equal(sceneEdgeScrollVelocity({ pointerX: 227.5, width: 455 }), 0);
  assert.equal(sceneEdgeScrollVelocity({ pointerX: 0, width: 455 }), -1.15);
  assert.equal(sceneEdgeScrollVelocity({ pointerX: 455, width: 455 }), 1.15);
  assert.equal(sceneEdgeScrollVelocity({ pointerX: -0.39678955078125, width: 455 }), -1.15);
  assert.equal(sceneEdgeScrollVelocity({ pointerX: 455.39678955078125, width: 455 }), 1.15);
  const firstFrame = advanceSceneParallax({
    current: -0.35,
    velocity: sceneEdgeScrollVelocity({ pointerX: 450, width: 455 }),
    elapsedMs: 16
  });
  assert.ok(firstFrame > -0.35);
  assert.ok(firstFrame < 1);
  assert.equal(advanceSceneParallax({ current: firstFrame, velocity: 0, elapsedMs: 1000 }), firstFrame);
  assert.equal(advanceSceneParallax({
    current: 0,
    velocity: PORT_SCENE_CAMERA.maximumPanSpeed,
    elapsedMs: 100
  }), 0.24);
  assert.throws(() => advanceSceneParallax({
    current: 0,
    velocity: PORT_SCENE_CAMERA.maximumPanSpeed + 0.01,
    elapsedMs: 16
  }), /Invalid scene parallax velocity/);
  const starting = advanceSceneScrollVelocity({ current: 0, target: 1.15, elapsedMs: 16 });
  assert.ok(starting > 0 && starting < 1.15);
  const stopping = advanceSceneScrollVelocity({ current: 1.15, target: 0, elapsedMs: 16 });
  assert.ok(stopping > 0 && stopping < 1.15);
  const reversing = advanceSceneScrollVelocity({ current: 1.15, target: -1.15, elapsedMs: 16 });
  assert.ok(reversing > 0 && reversing < 1.15);
  assert.equal(
    advanceSceneScrollVelocity({ current: 0.01, target: -1.15, elapsedMs: 16 }),
    0
  );
  assert.equal(
    advanceSceneScrollVelocity({ current: 0, target: 1.15, elapsedMs: 1000 }),
    1.15
  );
  assert.deepEqual(sceneCameraParallaxBounds("river"), { minimum: -0.30, maximum: 1 });
  assert.equal(sceneCameraDefaultParallax("river"), -0.12);
  assert.deepEqual(sceneCameraParallaxBounds("ocean"), { minimum: -1, maximum: 1 });
});

test("static city batches are cached only while every camera input is stationary", () => {
  assert.equal(cityStaticSceneCacheAllowed({
    cameraGestureActive: false,
    panTarget: null,
    velocity: 0
  }), true);
  assert.equal(cityStaticSceneCacheAllowed({
    cameraGestureActive: true,
    panTarget: null,
    velocity: 0
  }), false);
  assert.equal(cityStaticSceneCacheAllowed({
    cameraGestureActive: false,
    panTarget: 0.5,
    velocity: 0
  }), false);
  assert.equal(cityStaticSceneCacheAllowed({
    cameraGestureActive: false,
    panTarget: null,
    velocity: 0.25
  }), false);
  assert.throws(() => cityStaticSceneCacheAllowed({
    cameraGestureActive: false,
    panTarget: 2,
    velocity: 0
  }), /Invalid city static scene cache pan target/);
});

test("wheel and swipe distances pan the camera through the authored scene", () => {
  assert.equal(scenePanParallaxDelta({
    screenDeltaX: 455,
    displayWidth: 910,
    logicalWidth: 455,
    approach: "ocean"
  }), 0.5);
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
  }), 80 / 91);
  assert.ok(sceneInertialPanTargetVelocity({ current: 0, target: 0.5 }) > 2);
  assert.ok(sceneInertialPanTargetVelocity({ current: 0, target: 0.5 }) <= 2.4);
  assert.ok(sceneInertialPanTargetVelocity({ current: 0.499, target: 0.5 }) < 0.15);
  assert.equal(sceneInertialPanTargetVelocity({ current: 0.5, target: 0.5 }), 0);
});

test("Set Sail uses the visible ocean left of the player ship as its hit target", () => {
  assert.deepEqual(citySetSailOceanRect({
    shipX: 140,
    waterSurfaceY: 119,
    viewportWidth: 455,
    viewportHeight: 256
  }), { x: 0, y: 119, w: 134, h: 137 });
  assert.deepEqual(citySetSailOceanRect({
    shipX: 30,
    waterSurfaceY: 228,
    viewportWidth: 256,
    viewportHeight: 256
  }), { x: 0, y: 228, w: 24, h: 28 });
  assert.deepEqual(citySetSailOceanRect({
    shipX: 700,
    waterSurfaceY: 119,
    viewportWidth: 455,
    viewportHeight: 256
  }), { x: 0, y: 119, w: 455, h: 137 });
  assert.equal(citySetSailOceanRect({
    shipX: 4,
    waterSurfaceY: 119,
    viewportWidth: 455,
    viewportHeight: 256
  }), null);
  assert.match(
    VISUALIZER_MAIN_SOURCE,
    /shipX: placement\.x \+ state\.shipWaterlineLayers\.opaqueMinX \* placement\.scale/,
    "Set Sail must anchor to the visible ship silhouette rather than transparent raster padding"
  );
  assert.match(
    VISUALIZER_MAIN_SOURCE,
    /const riseY = highlighted \? -2 : 0;[\s\S]*PIRATE_MENU_PAPER_SELECTED/,
    "Set Sail hover and controller focus must lift and recolor the unboxed ocean label"
  );
  assert.match(
    VISUALIZER_MAIN_SOURCE,
    /if \(destination\.id === PORT_CITY_LOCATION\.SET_SAIL\) \{[\s\S]*state\.cameraPanTarget = minimum;/,
    "Set Sail controller focus must pan to the authored western ocean"
  );
  assert.match(
    VISUALIZER_MAIN_SOURCE,
    /const playerShipDestination = destinationById\(PORT_CITY_LOCATION\.SHIP\);[\s\S]*state\.focusedDestinationId = playerShipDestination\.id;/,
    "city entry must start at the ship instead of automatically revealing the western departure area"
  );
});

test("ocean depth slices cover the authored water without gaps", () => {
  assert.equal(PORT_SCENE_HORIZON_SHIFT_Y, -20);
  assert.equal(PORT_SCENE_OCEAN_SLICES[0].top, 446 + PORT_SCENE_HORIZON_SHIFT_Y);
  assert.equal(PORT_SCENE_OCEAN_SLICES.at(-1).bottom, PORT_SCENE_MASTER.height);
  for (let index = 1; index < PORT_SCENE_OCEAN_SLICES.length; index++) {
    assert.equal(PORT_SCENE_OCEAN_SLICES[index - 1].bottom, PORT_SCENE_OCEAN_SLICES[index].top);
    assert.ok(PORT_SCENE_OCEAN_SLICES[index - 1].depth <= PORT_SCENE_OCEAN_SLICES[index].depth);
  }
  assert.equal(PORT_SCENE_OCEAN_SLICES[1].depth, layerParallaxDepth("Distant Plains"));
  assert.equal(PORT_SCENE_OCEAN_SLICES[1].depth, layerParallaxDepth("Distant Forest"));
  const distantTerrainMidpoint = (
    layerParallaxDepth("Ocean") + layerParallaxDepth("Background City Base")
  ) / 2;
  assert.ok(Math.abs(
    layerParallaxDepth("Distant Forest") - distantTerrainMidpoint
  ) <= 0.02);
  assert.equal(PORT_SCENE_OCEAN_SLICES[2].depth, layerParallaxDepth("Midground Grass"));
  assert.equal(PORT_SCENE_OCEAN_SLICES[2].depth, layerParallaxDepth("Sand Beach"));
  assert.ok(layerSceneZ("Distant Plains") < PORT_SCENE_OCEAN_SLICES[2].z);
  assert.ok(layerSceneZ("Distant Plains") < PORT_SCENE_OCEAN_SLICES[3].z);
});

test("river scenes separate the banks around the raised horizon", () => {
  assert.equal(PORT_SCENE_RIVER.leftBankDistantInsetX, 276);
  assert.equal(PORT_SCENE_RIVER.leftBankForegroundInsetX, 300);
  assert.equal(PORT_SCENE_RIVER.leftBankHorizonOffsetY, -22);
  assert.equal(PORT_SCENE_RIVER.leftBankDistantOffsetY, -34);
  assert.equal(PORT_SCENE_RIVER.leftBankForestOffsetY, -46);
  assert.equal(layerSceneOffsetX("Distant Forest Left Bank", 0, "river"), PORT_SCENE_RIVER.leftBankDistantInsetX);
  assert.equal(layerSceneOffsetY("Distant Forest Left Bank", 0, "river"), PORT_SCENE_RIVER.leftBankForestOffsetY);
  assert.equal(layerSceneOffsetX("Left Bank Sand Beach", 0, "river"), PORT_SCENE_RIVER.leftBankForegroundInsetX);
  assert.equal(layerSceneOffsetY("Left Bank Sand Beach", 0, "river"), 0);
  assert.equal(layerSceneOffsetX("Foreground Grass Left Bank", 0, "river"), PORT_SCENE_RIVER.leftBankForegroundInsetX);
  assert.equal(layerSceneOffsetX("Sand Beach", 0, "river"), 0);
  assert.equal(layerSceneOffsetX("Left Bank Sand Beach", 0, "ocean"), 0);
  assert.equal(layerSceneOffsetY("Distant Forest Left Bank", 0, "ocean"), 0);
  assert.equal(
    layerSceneOffsetY("Distant Forest", 0, "river"),
    PORT_SCENE_DISTANT_TERRAIN_SHIFT_Y
  );
  assert.equal(layerSceneOffsetY("Sky", 0, "river"), PORT_SCENE_HORIZON_SHIFT_Y);
  assert.equal(layerSceneOffsetY("Shipyard", 0, "river"), 0);
  assert.equal(layerParallaxAnchor("Distant Forest Left Bank"), sceneCameraDefaultParallax("river"));
  assert.equal(layerParallaxAnchor("Distant Forest"), PORT_SCENE_CAMERA.distantParallaxAnchor);
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

  const leftBeachRightEdge = 242 + PORT_SCENE_RIVER.leftBankForegroundInsetX;
  const berthGap = PORT_SCENE_DOCK.shipAccessX - leftBeachRightEdge;
  assert.equal(berthGap, 130);
});

test("distant forests retain their authored perspective toward the viewer", () => {
  assert.deepEqual(layerVisibleSourceRect("Distant Forest", 651, 97), {
    x: 0,
    y: 0,
    width: 651,
    height: 97
  });
  assert.deepEqual(layerVisibleSourceRect("Distant Forest Left Bank", 371, 141), {
    x: 0,
    y: 0,
    width: 371,
    height: 141
  });
  assert.deepEqual(layerVisibleSourceRect("Distant Plains", 654, 75), {
    x: 0,
    y: 0,
    width: 654,
    height: 75
  });
  const horizonY = PORT_SCENE_OCEAN_SLICES[0].top;
  const rightForestTop = 424 + layerSceneOffsetY("Distant Forest", 0, "river");
  const rightForestBottom = rightForestTop + 97;
  const leftForestTop = 426 + layerSceneOffsetY("Distant Forest Left Bank", 0, "river");
  const leftForestBottom = leftForestTop + 141;
  assert.equal(rightForestTop, 392);
  assert.equal(leftForestTop, 380);
  assert.ok(rightForestTop < 404, "right forest must move upward from its prior rendered row");
  assert.ok(leftForestTop < 392, "left forest must move upward from its prior rendered row");
  assert.ok(rightForestTop < horizonY);
  assert.ok(rightForestBottom > horizonY);
  assert.equal(rightForestTop - leftForestTop, 12);
  assert.ok(leftForestBottom > rightForestBottom);
  assert.ok(leftForestBottom - rightForestBottom < 40);
  assert.ok(layerSceneZ("Distant Forest Left Bank") > PORT_SCENE_OCEAN_SLICES[2].z);
  assert.ok(layerSceneZ("Distant Forest Left Bank") < PORT_SCENE_OCEAN_SLICES[3].z);
});

test("the shipyard stays planted behind the beach bend", () => {
  const shipyardTop = 470 + layerSceneOffsetY("Shipyard", 0, "river");
  const shipyardBottom = shipyardTop + 41;
  const beachTop = 478 + layerSceneOffsetY("Sand Beach", 0, "river");
  assert.ok(shipyardTop < beachTop);
  assert.ok(shipyardBottom > beachTop);
  assert.ok(layerSceneZ("Shipyard") < layerSceneZ("Sand Beach"));
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
  assert.ok(PORT_SCENE_ENTITY_META.ship.z < layerSceneZ("Dock Background"));
  assert.ok(PORT_SCENE_ENTITY_META.ship.z < layerSceneZ("Dock"));
  assert.ok(PORT_SCENE_ENTITY_META.ship.z < layerSceneZ("Stone Dock"));
  assert.ok(PORT_SCENE_ENTITY_META.ship.z < layerSceneZ("Dock Foreground"));
  assert.ok(layerSceneZ("Left Bank Sand Beach") > PORT_SCENE_ENTITY_META.ship.z);
  assert.ok(layerSceneZ("Foreground Grass Left Bank") > PORT_SCENE_ENTITY_META.ship.z);
  assert.equal(PORT_SCENE_ENTITY_META.npcs.depth, 1);
  assert.equal(PORT_SCENE_DOCK.beachStartX - PORT_SCENE_DOCK.startX, PORT_SCENE_DOCK.shadowWaterExtension);
  assert.equal(PORT_SCENE_DOCK.startX - PORT_SCENE_DOCK.shipAccessX, 4);
  assert.equal(PORT_SCENE_DOCK.shipAccessY - PORT_SCENE_DOCK.topY, 9);
  assert.equal(
    PORT_SCENE_DOCK.waterlineY,
    PORT_SCENE_DOCK.foregroundPostTopY + PORT_SCENE_DOCK.foregroundPostHeight - 1
  );
});

test("docked and no-dock ships share one berth geometry", () => {
  const shortShip = docksideShipVerticalPlacement({
    dock: "wood",
    sideAnchorY: 438,
    submergedMinY: 461
  });
  assert.equal(shortShip.waterlineY, PORT_SCENE_DOCK.waterlineY);
  assert.equal(shortShip.topY, PORT_SCENE_DOCK.waterlineY - 461);
  const longShip = docksideShipVerticalPlacement({
    dock: "wood",
    sideAnchorY: 353.5,
    submergedMinY: 460
  });
  assert.equal(longShip.topY, PORT_SCENE_DOCK.shipAccessY - 353.5);
  assert.ok(longShip.waterlineY > PORT_SCENE_DOCK.waterlineY);
  const anchored = docksideShipVerticalPlacement({
    dock: "none",
    sideAnchorY: 365,
    submergedMinY: 450
  });
  const docked = docksideShipVerticalPlacement({
    dock: "wood",
    sideAnchorY: 365,
    submergedMinY: 450
  });
  assert.deepEqual(anchored, docked);
});

test("dockside ships berth at their authored side point rather than their bow anchor", () => {
  for (const ship of SHIP_MANIFEST.ships) {
    const dockside = ship.cityDockside;
    const nearRail = dockside.deckPolygon.slice(2);
    const berthFraction = dockside.berthFraction ?? 0.5;
    const sidePoint = {
      x: nearRail[0].x + (nearRail[1].x - nearRail[0].x) * berthFraction,
      y: nearRail[0].y + (nearRail[1].y - nearRail[0].y) * berthFraction
    };
    const anchor = docksideShipSideAnchor(ship);
    assert.equal(anchor.x, sidePoint.x, ship.slug);
    assert.equal(anchor.y, sidePoint.y, ship.slug);
    assert.ok(
      Math.abs(anchor.x - dockside.deckEntryAnchor.x) < dockside.width / 4,
      ship.slug
    );
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
  const townLayers = [
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
  assert.ok(townLayers.every((layer) => layerParallaxDepth(layer) < 1));
  assert.ok(townLayers.every((layer) => layerParallaxDepth(layer) >= 0.94));
  assert.ok(layerParallaxDepth("Distant Forest") < layerParallaxDepth("Home"));
  assert.ok(layerParallaxDepth("Home") < layerParallaxDepth("Smith"));
  assert.ok(layerParallaxDepth("Home 2") < layerParallaxDepth("Smith"));
  for (const terrain of ["Desert Behind Buildings", "Rocks Behind Buildings", "Grass Behind Buildings"]) {
    assert.ok(layerSceneZ(terrain) > layerSceneZ("Home"));
    assert.ok(layerSceneZ(terrain) > layerSceneZ("Home 2"));
    assert.ok(layerSceneZ(terrain) < layerSceneZ("Smith"));
  }
  assert.ok(townLayers.every((layer) => layerParallaxAnchor(layer) === 1));
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

  const minimum = sceneCameraParallaxBounds("river").minimum;
  const forestAway = logicalSceneWindow({
    width: 455,
    height: 256,
    parallax: minimum,
    depth: layerParallaxDepth("Distant Forest"),
    parallaxAnchor: layerParallaxAnchor("Distant Forest"),
    approach: "river"
  });
  const homeAway = logicalSceneWindow({
    width: 455,
    height: 256,
    parallax: minimum,
    depth: layerParallaxDepth("Home"),
    parallaxAnchor: layerParallaxAnchor("Home"),
    approach: "river"
  });
  const smithAway = logicalSceneWindow({
    width: 455,
    height: 256,
    parallax: minimum,
    depth: layerParallaxDepth("Smith"),
    parallaxAnchor: layerParallaxAnchor("Smith"),
    approach: "river"
  });
  assert.ok(forestAway.x - homeAway.x >= 30);
  assert.ok(homeAway.x - smithAway.x >= 4);

  const forestAtFocus = logicalSceneWindow({
    width: 455,
    height: 256,
    parallax: 1,
    depth: layerParallaxDepth("Distant Forest"),
    parallaxAnchor: layerParallaxAnchor("Distant Forest"),
    approach: "river"
  });
  const homeAtFocus = logicalSceneWindow({
    width: 455,
    height: 256,
    parallax: 1,
    depth: layerParallaxDepth("Home"),
    parallaxAnchor: layerParallaxAnchor("Home"),
    approach: "river"
  });
  const forestToHomeTravel =
    (homeAtFocus.x - homeAway.x) - (forestAtFocus.x - forestAway.x);
  assert.ok(forestToHomeTravel >= 120);

  for (const width of [256, 455, 910]) {
    const foreground = logicalSceneWindow({ width, height: 256, parallax: minimum, depth: 1, approach: "river" });
    for (const layer of ["Shipyard", ...townLayers]) {
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

test("fortified cities send two walkers into the gate behind its front edge", () => {
  const openPaths = cityNpcPaths({ fortified: false });
  const fortifiedPaths = cityNpcPaths({ fortified: true });
  assert.equal(openPaths.some((path) => CITY_GATE_TRAVERSAL_PATHS.includes(path)), false);
  assert.deepEqual(fortifiedPaths.slice(-2), CITY_GATE_TRAVERSAL_PATHS);
  for (const path of CITY_GATE_TRAVERSAL_PATHS) {
    assert.ok(path.startX < 1225, "walker begins below and outside the rear tower");
    assert.ok(path.feetY >= 568, "walker begins below the gatehouse foundations");
    assert.ok(path.endX >= 1287 && path.endX < 1301, "walker ends inside the gateway");
    assert.ok(path.endFeetY <= 520, "walker climbs into the visible gateway");
    assert.equal(path.painterZ, CITY_GATE_TRAVERSAL_PAINTER_Z);
    assert.ok(path.painterZ < CITY_GATE_FRONT_PAINTER_Z);
    const midpoint = cityNpcPathPoint(path, 0.5);
    assert.ok(midpoint.x > path.startX && midpoint.x < path.endX);
    assert.ok(midpoint.feetY < path.feetY && midpoint.feetY > path.endFeetY);
  }
  assert.match(VISUALIZER_MAIN_SOURCE, /cityNpcPathPoint\(agent, progress\)/);
  assert.ok(CITY_GATE_FRONT_PAINTER_Z < layerSceneZ("Near Castle"));
});

test("explicit scene z places walkers and the inn between gatehouse sections", () => {
  assert.ok(layerSceneZ("Road") < layerSceneZ("Far Castle"));
  assert.ok(layerSceneZ("Far Castle") < layerSceneZ("Gate"));
  assert.ok(layerSceneZ("Road") < layerSceneZ("Castle Shadow"));
  assert.ok(layerSceneZ("Gate") < PORT_SCENE_ENTITY_META.npcs.z);
  assert.ok(PORT_SCENE_ENTITY_META.npcs.z < layerSceneZ("Inn"));
  assert.ok(layerSceneZ("Inn") < cityGroundPainterZ(565));
  assert.ok(cityGroundPainterZ(565) < cityGroundPainterZ(575));
  assert.ok(layerSceneZ("Foreground Grass") < layerSceneZ("Near Castle"));
  assert.ok(layerSceneZ("Foreground Grass Castle Shadow") < layerSceneZ("Near Castle"));
  assert.ok(CITY_GATE_FRONT_PAINTER_Z < layerSceneZ("Near Castle"));
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

test("port-assault lanes participate in city ground painter order", () => {
  assert.deepEqual(CITY_PORT_ASSAULT_LANE_FEET_Y, [516, 524, 532, 540]);
  for (const lane of CITY_PORT_ASSAULT_LANE_FEET_Y.keys()) {
    const painterZ = cityPortAssaultLanePainterZ(lane);
    assert.equal(painterZ, cityGroundPainterZ(CITY_PORT_ASSAULT_LANE_FEET_Y[lane]));
    assert.ok(painterZ < layerSceneZ("Inn"), "the inn occludes road combatants");
    assert.ok(painterZ < CITY_GATE_FRONT_PAINTER_Z, "the gate front occludes combatants");
    assert.ok(painterZ < cityGroundPainterZ(565), "foreground trees occlude combatants");
  }
  assert.ok(
    CITY_PORT_ASSAULT_SHIP_FOREGROUND_PAINTER_Z >
      cityPortAssaultLanePainterZ(CITY_PORT_ASSAULT_LANE_FEET_Y.length - 1),
    "the near rail occludes sailors standing on the deck"
  );
  assert.ok(CITY_PORT_ASSAULT_SHIP_FOREGROUND_PAINTER_Z < layerSceneZ("Inn"));
  assert.throws(() => cityPortAssaultLanePainterZ(-1), /port-assault lane/);
  assert.throws(() => cityPortAssaultLanePainterZ(4), /port-assault lane/);
  assert.match(VISUALIZER_MAIN_SOURCE, /kind: "port-assault",\s+lane,\s+z: cityPortAssaultLanePainterZ\(lane\)/);
  assert.match(
    VISUALIZER_MAIN_SOURCE,
    /if \(state\.assaultPresentation\) \{[\s\S]*kind: "port-assault"[\s\S]*\} else \{[\s\S]*kind: "npc"/
  );
  assert.match(
    VISUALIZER_MAIN_SOURCE,
    /assaultWasActive !== \(presentation !== null\)\) rebuildCitySceneRenderPlan\(\)/
  );
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
    "Distant Land",
    "Distant Land Left Bank",
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

test("all port scenes retain the three authored cloud layers at distinct parallax depths", () => {
  const layers = activePortSceneLayers(resolveCitySceneFeatures(CITY));
  for (const layer of ["Cloud 1", "Cloud 2", "Cloud 3"]) {
    assert.equal(layers.has(layer), true, layer);
  }
  assert.ok(layerParallaxDepth("Cloud 1") < layerParallaxDepth("Cloud 2"));
  assert.ok(layerParallaxDepth("Cloud 2") < layerParallaxDepth("Cloud 3"));
  assert.ok(layerSceneZ("Cloud 1") < layerSceneZ("Ocean"));
  assert.ok(layerSceneZ("Cloud 2") > layerSceneZ("Ocean"));
  assert.ok(layerSceneZ("Cloud 2") < layerSceneZ("Horizon Mountains"));
  assert.ok(layerSceneZ("Cloud 3") > layerSceneZ("Horizon Mountains"));
});

test("river horizons close with two parallax-locked banks while open water does not", async () => {
  for (const layer of ["Distant Land", "Distant Land Left Bank"]) {
    assert.equal(layerParallaxDepth(layer), layerParallaxDepth("Ocean"));
    assert.equal(layerParallaxAnchor(layer), layerParallaxAnchor("Ocean"));
    assert.equal(layerSceneOffsetX(layer, 0, "river"), 0);
    assert.equal(layerSceneOffsetY(layer, 0, "river"), PORT_SCENE_HORIZON_SHIFT_Y);
    assert.ok(layerSceneZ(layer) > layerSceneZ("Ocean"));
    assert.ok(layerSceneZ(layer) < layerSceneZ("Distant Forest"));
  }
  const riverLayers = activePortSceneLayers(resolveCitySceneFeatures(CITY));
  const oceanLayers = activePortSceneLayers(resolveCitySceneFeatures({
    ...CITY,
    approach: "ocean"
  }));
  assert.equal(riverLayers.has("Distant Land"), true);
  assert.equal(riverLayers.has("Distant Land Left Bank"), true);
  assert.equal(oceanLayers.has("Distant Land"), false);
  assert.equal(oceanLayers.has("Distant Land Left Bank"), false);

  const rightBank = CITY_VISUALIZER_PORT_MANIFEST.staticFrames.find((frame) => (
    frame.layer === "Distant Land"
  ));
  const leftBank = CITY_VISUALIZER_PORT_MANIFEST.staticFrames.find((frame) => (
    frame.layer === "Distant Land Left Bank"
  ));
  assert.ok(rightBank && leftBank);
  const authoredInnerOverlap =
    leftBank.spriteSourceSize.x + leftBank.spriteSourceSize.w - rightBank.spriteSourceSize.x;
  assert.ok(authoredInnerOverlap >= 0 && authoredInnerOverlap <= 40);

  const atlas = await loadImage(new URL(
    `./assets/port-parallax/${CITY_VISUALIZER_PORT_MANIFEST.staticSheet}`,
    import.meta.url
  ).pathname);
  const canvas = createCanvas(rightBank.frame.w, rightBank.frame.h);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(
    atlas,
    rightBank.frame.x,
    rightBank.frame.y,
    rightBank.frame.w,
    rightBank.frame.h,
    0,
    0,
    rightBank.frame.w,
    rightBank.frame.h
  );
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let leftmostOpaqueX = canvas.width;
  let leftmostOpaqueY = -1;
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      if (pixels[(y * canvas.width + x) * 4 + 3] <= 16 || x >= leftmostOpaqueX) continue;
      leftmostOpaqueX = x;
      leftmostOpaqueY = y;
    }
  }
  assert.equal(
    rightBank.spriteSourceSize.y + leftmostOpaqueY +
      layerSceneOffsetY("Distant Land", 0, "river"),
    PORT_SCENE_WATER_HORIZON_Y + PORT_SCENE_HORIZON_SHIFT_Y
  );
});

test("river-bend water occludes both horizon mountain layers", () => {
  const horizonOceanZ = PORT_SCENE_OCEAN_SLICES[0].z;
  for (const layerName of ["Horizon Mountains", "Horizon Mountains Left Bank"]) {
    assert.ok(layerPainterZ(layerName, 0, "river") < horizonOceanZ, layerName);
    assert.equal(layerPainterZ(layerName, 0, "ocean"), layerSceneZ(layerName));
  }
  assert.throws(
    () => layerPainterZ("Horizon Mountains", 0, "estuary"),
    /Invalid port scene approach/
  );
  assert.match(
    VISUALIZER_MAIN_SOURCE,
    /layerPainterZ\(layerName, occurrence, state\.features\.approach\)/,
    "the render plan must use the approach-aware mountain painter order"
  );
});

test("opposite-bank development is city data with a river-only manual override", () => {
  assert.equal(resolveCitySceneFeatures({ ...CITY, builtUpBothBanks: true }).leftBankCity, true);
  assert.equal(resolveCitySceneFeatures({ ...CITY, approach: "ocean", builtUpBothBanks: true }).leftBankCity, false);
  assert.equal(resolveCitySceneFeatures({ ...CITY, builtUpBothBanks: false }, { leftBankCity: true }).leftBankCity, true);
  assert.equal(
    resolveCitySceneFeatures(
      { ...CITY, approach: "ocean", builtUpBothBanks: false },
      { leftBankCity: true }
    ).leftBankCity,
    false
  );
  assert.match(VISUALIZER_HTML_SOURCE, /id="left-bank-city-override"/);
});

test("London and Buda default to developed opposite banks in the generated city catalog", () => {
  const cityById = new Map(CITY_VISUALIZER_CATALOG.cities.map((city) => [city.id, city]));
  assert.equal(cityById.get("london|united kingdom")?.builtUpBothBanks, true);
  assert.equal(cityById.get("budapest|hungary")?.builtUpBothBanks, true);
  assert.equal(cityById.get("angers|france")?.builtUpBothBanks, false);
});

test("the city catalog preserves actual tree-cover tiles even when open ground is dominant", () => {
  const cityById = new Map(CITY_VISUALIZER_CATALOG.cities.map((city) => [city.id, city]));
  const london = cityById.get("london|united kingdom");
  const zaragoza = cityById.get("zaragoza|spain");
  assert.equal(CITY_VISUALIZER_CATALOG.version, 6);
  assert.equal(london?.terrain?.leftTreeCover, true);
  assert.equal(zaragoza?.terrain?.left, "grass");
  assert.equal(
    zaragoza?.terrain?.leftTreeCover,
    true,
    "tree-bearing production tiles survive the dominant-terrain reduction"
  );
  assert.ok(CITY_VISUALIZER_CATALOG.cities.every((city) => (
    typeof city.terrain?.leftTreeCover === "boolean" &&
    typeof city.terrain?.rightTreeCover === "boolean"
  )));
});

test("only cities within the canonical pyramid horizon receive the grounded distant silhouette", async () => {
  const cityById = new Map(CITY_VISUALIZER_CATALOG.cities.map((city) => [city.id, city]));
  const cairo = cityById.get("cairo|egypt");
  const alexandria = cityById.get("alexandria|egypt");
  const dongola = cityById.get("dongola|sudan");

  assert.deepEqual(cairo?.horizonLandmarks, [CITY_HORIZON_LANDMARK.PYRAMID]);
  assert.deepEqual(alexandria?.horizonLandmarks, []);
  assert.deepEqual(dongola?.horizonLandmarks, []);
  assert.deepEqual(
    cityHorizonLandmarks({ cityId: "future-meroe-port", lat: 16.95, lon: 33.74 }),
    [CITY_HORIZON_LANDMARK.PYRAMID]
  );
  assert.equal(CITY_PYRAMID_VISIBILITY_RADIUS_KM, 50);
  assert.throws(
    () => cityHorizonLandmarks({ cityId: "missing-position" }),
    /finite coordinates: missing-position/
  );
  assert.throws(
    () => cityHasHorizonLandmark({ cityId: "missing-list" }, CITY_HORIZON_LANDMARK.PYRAMID),
    /no explicit horizon landmark list: missing-list/
  );
  assert.throws(
    () => cityHasHorizonLandmark(
      { cityId: "unknown-landmark", horizonLandmarks: ["obelisk"] },
      CITY_HORIZON_LANDMARK.PYRAMID
    ),
    /unknown horizon landmark obelisk: unknown-landmark/
  );

  const cairoFeatures = resolveCitySceneFeatures(cairo);
  const alexandriaFeatures = resolveCitySceneFeatures(alexandria);
  assert.equal(cairoFeatures.pyramid, true);
  assert.equal(alexandriaFeatures.pyramid, false);
  assert.equal(activePortSceneLayers(cairoFeatures).has("Pyramid"), true);
  assert.equal(activePortSceneLayers(alexandriaFeatures).has("Pyramid"), false);
  assert.ok(layerSceneZ("Pyramid") < layerSceneZ("Distant Desert"));
  assert.ok(layerParallaxDepth("Pyramid") < layerParallaxDepth("Distant Desert"));
  const pyramidOffsetY = layerSceneOffsetY("Pyramid", 0, "river");
  const desertOffsetY = layerSceneOffsetY("Distant Desert", 0, "river");
  assert.equal(pyramidOffsetY - desertOffsetY, PORT_SCENE_PYRAMID_GROUNDING_Y);

  const pyramidFrame = CITY_VISUALIZER_PORT_MANIFEST.staticFrames.find(({ layer }) => layer === "Pyramid");
  const desertFrame = CITY_VISUALIZER_PORT_MANIFEST.staticFrames.find(({ layer }) => layer === "Distant Desert");
  assert.deepEqual(pyramidFrame?.spriteSourceSize, { x: 705, y: 348, w: 200, h: 102 });
  assert.ok(
    CITY_VISUALIZER_PORT_MANIFEST.layerOrder.indexOf("Pyramid") <
      CITY_VISUALIZER_PORT_MANIFEST.layerOrder.indexOf("Distant Desert")
  );

  const atlas = await loadImage(new URL(
    `./assets/port-parallax/${CITY_VISUALIZER_PORT_MANIFEST.staticSheet}`,
    import.meta.url
  ).pathname);
  const alphaProfile = (frame) => {
    const canvas = createCanvas(frame.frame.w, frame.frame.h);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(
      atlas,
      frame.frame.x,
      frame.frame.y,
      frame.frame.w,
      frame.frame.h,
      0,
      0,
      frame.frame.w,
      frame.frame.h
    );
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    return Array.from({ length: canvas.width }, (_, x) => {
      let top = Number.POSITIVE_INFINITY;
      let bottom = Number.NEGATIVE_INFINITY;
      for (let y = 0; y < canvas.height; y++) {
        if (pixels[(y * canvas.width + x) * 4 + 3] <= 16) continue;
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
      return Object.freeze({ top, bottom });
    });
  };
  const pyramidProfile = alphaProfile(pyramidFrame);
  const desertProfile = alphaProfile(desertFrame);
  for (let x = 0; x < pyramidProfile.length; x++) {
    const desertX = pyramidFrame.spriteSourceSize.x + x - desertFrame.spriteSourceSize.x;
    const pyramidBottom = pyramidProfile[x].bottom;
    const desertTop = desertProfile[desertX]?.top;
    if (!Number.isFinite(pyramidBottom) || !Number.isFinite(desertTop)) continue;
    assert.ok(
      pyramidFrame.spriteSourceSize.y + pyramidBottom + pyramidOffsetY >=
        desertFrame.spriteSourceSize.y + desertTop + desertOffsetY,
      `the distant desert must cover the pyramid baseline at scene x ${x}`
    );
  }
});

test("every future sailing colony has a baked city scene", () => {
  const cityById = new Map(CITY_VISUALIZER_CATALOG.cities.map((city) => [city.id, city]));
  for (const target of COLONIZATION_TARGETS.filter(({ waterAccess }) => waterAccess !== "inland")) {
    const city = cityById.get(target.cityId);
    assert.equal(city?.cityId, target.cityId, target.cityId);
    assert.equal(city?.label, target.city, target.cityId);
  }
});

test("Christian communities opt into the shared church landmark through city data", () => {
  const cityById = new Map(CITY_VISUALIZER_CATALOG.cities.map((city) => [city.id, city]));
  const london = cityById.get("london|united kingdom");
  const angers = cityById.get("angers|france");
  const angra = cityById.get("angra|portugal");
  const augsburg = cityById.get("augsberg|germany");
  const nanjing = cityById.get("nanjing|china");
  assert.deepEqual(london?.religiousLandmarks, ["church"]);
  assert.equal(london?.backgroundCity?.landmarks?.church, 2);
  assert.equal(london?.backgroundCity?.density, "dense");
  assert.equal(angers?.backgroundCity?.landmarks?.church, 1);
  assert.equal(angers?.backgroundCity?.density, "moderate");
  assert.equal(angra?.backgroundCity?.density, "sparse");
  assert.equal(angra?.backgroundCity?.landmarks?.church, 0);
  assert.equal(augsburg?.capital, true);
  assert.equal(augsburg?.backgroundCity?.density, "moderate");
  assert.equal(nanjing?.backgroundCity?.landmarks?.church, 0);
  assert.notDeepEqual(london?.backgroundCity?.buildingMix, angers?.backgroundCity?.buildingMix);
  assert.equal(
    resolveCitySceneFeatures({ ...CITY, religiousLandmarks: ["church"] }).church,
    true
  );
  assert.equal(resolveCitySceneFeatures(CITY).church, false);
});

test("Islamic communities opt into the mosque landmark through city data", () => {
  const cityById = new Map(CITY_VISUALIZER_CATALOG.cities.map((city) => [city.id, city]));
  const cairo = cityById.get("cairo|egypt");
  const alexandria = cityById.get("alexandria|egypt");
  const london = cityById.get("london|united kingdom");
  assert.deepEqual(cairo?.religiousLandmarks, ["mosque"]);
  assert.equal(cairo?.backgroundCity?.landmarks?.mosque, 3);
  assert.equal(alexandria?.backgroundCity?.landmarks?.mosque, 1);
  assert.equal(london?.backgroundCity?.landmarks?.mosque, 0);
  assert.equal(
    resolveCitySceneFeatures({ ...CITY, religiousLandmarks: ["mosque"] }).mosque,
    true
  );
  assert.equal(resolveCitySceneFeatures(CITY).mosque, false);
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

test("authored terrain underlays sit on the city ribbon plane behind both developed banks", () => {
  const features = resolveCitySceneFeatures({
    ...CITY,
    builtUpBothBanks: true,
    backgroundCity: { enabled: true },
    terrain: { ...CITY.terrain, left: "rocky" }
  });
  const layers = activePortSceneLayers(features);
  assert.equal(layers.has(BACKGROUND_CITY_UNDERLAY_LAYERS.grass), true);
  assert.equal(layers.has(BACKGROUND_CITY_UNDERLAY_LAYERS.rocky), true);
  assert.equal(BACKGROUND_CITY_UNDERLAY_LAYERS.forest, BACKGROUND_CITY_UNDERLAY_LAYERS.grass);

  const base = CITY_VISUALIZER_PORT_MANIFEST.staticFrames.find(({ layer }) => (
    layer === "Background City Base"
  ));
  const baseOrder = CITY_VISUALIZER_PORT_MANIFEST.layerOrder.indexOf("Background City Base");
  for (const layerName of new Set(Object.values(BACKGROUND_CITY_UNDERLAY_LAYERS))) {
    const frame = CITY_VISUALIZER_PORT_MANIFEST.staticFrames.find(({ layer }) => layer === layerName);
    assert.ok(frame, `${layerName} should be exported`);
    assert.equal(layerParallaxDepth(layerName), layerParallaxDepth("Background City Base"));
    assert.equal(layerParallaxAnchor(layerName), layerParallaxAnchor("Background City Base"));
    assert.ok(CITY_VISUALIZER_PORT_MANIFEST.layerOrder.indexOf(layerName) < baseOrder);
    assert.ok(frame.spriteSourceSize.y < base.spriteSourceSize.y);
    assert.ok(
      frame.spriteSourceSize.y + frame.spriteSourceSize.h >= base.spriteSourceSize.y,
      `${layerName} should reach the city ribbon`
    );
  }
});

test("sparse earthen villages show huts and a market without urban institutions", () => {
  const smallVillage = {
    ...CITY,
    cityType: "polynesian",
    settlementType: "village",
    population: 1800,
    fortified: true,
    religiousLandmarks: ["church"]
  };
  const features = resolveCitySceneFeatures(smallVillage);
  assert.deepEqual({
    backgroundCity: features.backgroundCity,
    church: features.church,
    fortified: features.fortified,
    inn: features.inn,
    market: features.market,
    mosque: features.mosque,
    primitiveSettlement: features.primitiveSettlement,
    shipyard: features.shipyard,
    store: features.store
  }, {
    backgroundCity: false,
    church: false,
    fortified: false,
    inn: false,
    market: true,
    mosque: false,
    primitiveSettlement: true,
    shipyard: false,
    store: false
  });
  const layers = activePortSceneLayers(features);
  assert.equal(layers.has("Market Stall"), true);
  assert.equal(layers.has("Market Stall Copy"), false);
  assert.equal(layers.has("Market Stall Copy Copy"), false);
  assert.equal(layers.has("Shipyard"), false);
  assert.equal(layers.has("Smith"), false);
  assert.equal(layers.has("Inn"), false);
  assert.equal(layers.has("Gate"), false);

  const largerFeatures = resolveCitySceneFeatures({ ...smallVillage, population: 3000 });
  assert.equal(largerFeatures.shipyard, true);
  assert.equal(activePortSceneLayers(largerFeatures).has("Shipyard"), true);
});

test("generated regional architecture profiles remain explicit city data", () => {
  const cityById = new Map(CITY_VISUALIZER_CATALOG.cities.map((city) => [city.id, city]));
  const fiji = cityById.get("fiji village|fiji");
  const makian = cityById.get("makian village|indonesia");
  const kilwa = cityById.get("kilwa|tanzania");
  const kyoto = cityById.get("kyoto|japan");
  const nanjing = cityById.get("nanjing|china");
  const seoul = cityById.get("seoul|republic of korea");
  assert.deepEqual(fiji?.architecture, {
    housingStyle: "earthen-village",
    serviceStyle: "polynesian",
    fortificationStyle: "polynesian",
    settlementForm: "sparse-village"
  });
  assert.deepEqual(fiji?.services, {
    inn: false,
    smith: false,
    market: true,
    shipyard: true
  });
  assert.equal(fiji?.backgroundCity?.enabled, false);
  assert.deepEqual(makian?.architecture, {
    housingStyle: "earthen-village",
    serviceStyle: "southeast-asian",
    fortificationStyle: "southeast-asian",
    settlementForm: "sparse-village"
  });
  assert.deepEqual(makian?.services, {
    inn: false,
    smith: false,
    market: true,
    shipyard: false
  });
  assert.equal(makian?.backgroundCity?.enabled, false);
  assert.deepEqual(kilwa?.architecture, {
    housingStyle: "earthen-village",
    serviceStyle: "islamic-desert",
    fortificationStyle: "islamic-desert",
    settlementForm: "urban"
  });
  assert.equal(kilwa?.backgroundCity?.enabled, true);
  assert.deepEqual(kyoto?.architecture, {
    housingStyle: "japanese",
    serviceStyle: "japanese",
    fortificationStyle: "japanese",
    settlementForm: "urban"
  });
  assert.deepEqual(kyoto?.religiousLandmarks, ["pagoda"]);
  assert.equal(kyoto?.backgroundCity?.landmarks?.pagoda, 2);
  assert.deepEqual(nanjing?.religiousLandmarks, ["pagoda"]);
  assert.deepEqual(seoul?.religiousLandmarks, ["pagoda"]);
  assert.equal(nanjing?.backgroundCity?.landmarks?.pagoda, 3);
  assert.equal(seoul?.backgroundCity?.landmarks?.pagoda, 3);
  for (const city of [nanjing, seoul]) {
    assert.deepEqual(city?.architecture, {
      housingStyle: "east-asian",
      serviceStyle: "east-asian",
      fortificationStyle: "east-asian",
      settlementForm: "urban"
    });
  }
});
