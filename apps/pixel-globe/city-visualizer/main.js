import {
  resolveBrowserViewportDimensions,
  responsiveLogicalViewport
} from "../src/responsiveViewport.js";
import { canvasDisplayLayout } from "../src/displayScaling.js";
import {
  PORT_SCENE_ENTITY_META,
  PORT_SCENE_DOCK,
  PORT_SCENE_CAMERA,
  PORT_SCENE_HORIZON_SHIFT_Y,
  PORT_SCENE_MASTER,
  PORT_SCENE_OCEAN_SLICES,
  activePortSceneLayers,
  advanceSceneParallax,
  advanceSceneScrollVelocity,
  docksideShipSideAnchor,
  docksideShipPostClearanceShift,
  docksideShipVerticalPlacement,
  layerParallaxAnchor,
  layerParallaxDepth,
  layerSceneOffsetX,
  layerSceneOffsetY,
  layerSceneZ,
  layerVisibleSourceRect,
  logicalSceneWindow,
  resolveCitySceneFeatures,
  sceneCameraDefaultParallax,
  sceneCameraParallaxBounds,
  sceneEdgeScrollVelocity,
  sceneInertialPanTargetVelocity,
  scenePanParallaxDelta,
  sceneReasonRows
} from "./citySceneRules.js";
import { cityVisualizerShipOptions } from "./cityVisualizerLabels.js";
import {
  BACKGROUND_CITY_BASE_LAYER,
  BACKGROUND_CITY_STREET_COLOR,
  cityBackgroundAtmosphereLevel,
  cityBackgroundAtmosphereRgb,
  cityBackgroundBaseTopProfile,
  cityBackgroundLayout,
  cityBackgroundPainterOrder,
  cityBackgroundStreetRows,
  mirrorCityBackgroundStreetRows,
  oppositeBankCityBackgroundLayout
} from "./cityBackground.js";
import { cityOceanParallaxDepth, cityOceanRowOffset } from "./cityOceanMotion.js";
import {
  cityWaterAnimatedLayerUsesPalette,
  cityWaterDepthIndex,
  cityWaterLatitudeBand,
  cityWaterPaletteHexForSourceHex,
  cityWaterPaletteRgb
} from "./cityWaterPalette.js";
import {
  flagFabricColumnLayout,
  flagWaveColumnOffsets,
  flagWindPose
} from "../src/flagAnimation.js";
import {
  CITY_PIXEL_FONT_SMALL_8,
  CITY_PIXEL_FONT_TITLE_8,
  createCityPixelTextRenderer
} from "./cityPixelText.js";
import {
  CITY_CHIMNEY_SMOKE_EMITTERS,
  backgroundCityChimneySmokeEmitters,
  cityChimneySmokeParticles,
  placedCityBuildingChimneySmokeEmitter
} from "./cityChimneySmoke.js";
import { cityStreetBuildingPlacements } from "./cityStreetBuildings.js";
import { cityArchitectureStyleForLayer } from "./cityArchitecture.js";
import {
  DOCKSIDE_SHIP_WATERLINE_RGB,
  docksideShipWaterlinePixelKeys
} from "./cityDocksideShipWaterline.js";
import {
  SHIP_REFRACTION_BAND_HEIGHT,
  SHIP_SUBMERGED_ALPHA,
  floatingShipSubmergedPixelKeysForDimensions,
  liveShipRefractionOffset,
  shipMaxRasterWaterlineDepth
} from "../src/shipWaterline.js";
import {
  SHIP_SURFACE_LIGHTING_BLEND,
  shipLightingCssColor
} from "../src/shipLighting.js";
import {
  cityRegionalPaletteApplies,
  cityRegionalPaletteRgb
} from "./cityRegionalPalette.js";
import { cityRegionalBuildingFrame } from "./cityRegionalBuildings.js";
import {
  CITY_GATEHOUSE_FLAG_LAYER,
  cityGatehouseFlagGeometry,
  cityGatehouseFlagPhase,
  cityGatehouseFlagVisible
} from "./cityGatehouseFlag.js";
import {
  CITY_WIND_DIRECTION_OPTIONS,
  CITY_WIND_SPEED_OPTIONS,
  cityWindForCity
} from "./cityWind.js";
import {
  CITY_CLOUD_SPECS,
  advanceCityCloudDrift,
  cityCloudDrawPositions,
  cityCloudSpec
} from "./cityClouds.js";

const canvas = document.querySelector("#scene");
const context = canvas.getContext("2d", { alpha: false });
const pixelText = createCityPixelTextRenderer(context, () => document.createElement("canvas"));
const stage = document.querySelector("#stage");
const loading = document.querySelector("#loading");
const citySelect = document.querySelector("#city-select");
const viewportSelect = document.querySelector("#viewport-select");
const shipSelect = document.querySelector("#ship-select");
const approachOverride = document.querySelector("#approach-override");
const leftBankCityOverride = document.querySelector("#left-bank-city-override");
const dockOverride = document.querySelector("#dock-override");
const fortOverride = document.querySelector("#fort-override");
const mountainOverride = document.querySelector("#mountain-override");
const leftTerrainOverride = document.querySelector("#left-terrain-override");
const rightTerrainOverride = document.querySelector("#right-terrain-override");
const windSpeedOverride = document.querySelector("#wind-speed-override");
const windDirectionOverride = document.querySelector("#wind-direction-override");
const resetOverrides = document.querySelector("#reset-overrides");
const ruleLedger = document.querySelector("#rule-ledger");
const destinationDialog = document.querySelector("#destination-dialog");
const destinationTitle = document.querySelector("#destination-title");
const destinationCopy = document.querySelector("#destination-copy");

const prefersReducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const imageCache = new Map();
const frameCanvasCache = new WeakMap();
const backgroundCityAtmosphereCanvasCache = new WeakMap();
const regionalStaticFrameCanvasCache = new Map();
const alphaCache = new WeakMap();
const animatedRowEdgeCache = new WeakMap();
const latitudeWaterFrameCanvasCache = new WeakMap();
const latitudeWaterCssColorCache = new Map();
let dockShadowExtensionRows = null;
let beachOpaqueRowRuns = null;
const state = {
  ready: false,
  catalog: null,
  portManifest: null,
  minifolkManifest: null,
  shipManifest: null,
  staticAtlas: null,
  waveAtlas: null,
  surfAtlas: null,
  minifolkAtlases: new Map(),
  shipImage: null,
  shipSinkDepthImage: null,
  shipWaterlineLayers: null,
  shipWaterShadowImages: null,
  shipSlug: null,
  cityFlagFactionId: null,
  cityFlagImage: null,
  wind: null,
  cloudDriftByLayer: new Map(CITY_CLOUD_SPECS.map(({ layer }) => [layer, 0])),
  lastCloudTimeMs: null,
  city: null,
  features: null,
  parallax: PORT_SCENE_CAMERA.defaultParallax,
  cameraVelocity: 0,
  cameraPanTarget: null,
  lastRenderTimeMs: null,
  pointer: null,
  cameraGesture: null,
  suppressClick: false,
  hoveredDestination: null,
  backgroundCityRows: [],
  backgroundCityPainterOrder: [],
  backgroundCitySmokeByBuilding: new Map(),
  leftBankBackgroundCityRows: [],
  leftBankBackgroundCityPainterOrder: [],
  leftBankBackgroundCitySmokeByBuilding: new Map(),
  backgroundCityBaseTopYByX: null,
  backgroundCityStreetRows: [],
  leftBankBackgroundCityStreetRows: [],
  streetBuildings: [],
  npcAgents: []
};

const DESTINATIONS = Object.freeze([
  Object.freeze({
    id: "shipyard",
    label: "Shipyard",
    layers: Object.freeze(["Shipyard"]),
    requiredFeature: "shipyard",
    copy: "This will open the existing shipyard modal: repairs, outfitting, and available hulls."
  }),
  Object.freeze({
    id: "market",
    label: "Market",
    layers: Object.freeze(["Market Stall", "Market Stall Copy", "Market Stall Copy Copy"]),
    requiredFeature: "market",
    copy: "This will open the existing market modal for regional cargo and prices."
  }),
  Object.freeze({
    id: "store",
    label: "Item store",
    layers: Object.freeze(["Smith"]),
    requiredFeature: "store",
    copy: "This will open the existing item-store modal for weapons, tools, and supplies."
  }),
  Object.freeze({
    id: "inn",
    label: "Inn",
    layers: Object.freeze(["Inn"]),
    requiredFeature: "inn",
    copy: "This will open the existing inn flow for rumours, quests, and recruitable characters."
  }),
  Object.freeze({
    id: "gatehouse",
    label: "Gatehouse",
    layers: Object.freeze(["Far Castle", "Gate", "Near Castle"]),
    requiresFortification: true,
    copy: "This will become the entry point for garrison business and the city-storming encounter."
  })
]);

await initialize();

async function initialize() {
  try {
    const [catalog, portManifest, minifolkManifest, shipManifest] = await Promise.all([
      fetchJson("./data/cities.json"),
      fetchJson("./assets/port-parallax/manifest.json"),
      fetchJson("./assets/minifolks/manifest.json"),
      fetchJson("/assets/vehicles/unity-ships/port-assault/manifest.json"),
      document.fonts?.load?.(CITY_PIXEL_FONT_SMALL_8) || Promise.resolve(),
      document.fonts?.load?.(CITY_PIXEL_FONT_TITLE_8) || Promise.resolve()
    ]);
    state.catalog = catalog;
    state.portManifest = portManifest;
    state.minifolkManifest = minifolkManifest;
    state.shipManifest = shipManifest;
    [state.staticAtlas, state.waveAtlas, state.surfAtlas] = await Promise.all([
      loadImage("./assets/port-parallax/static.png"),
      loadImage("./assets/port-parallax/waves.png"),
      loadImage("./assets/port-parallax/surf.png")
    ]);
    await Promise.all(minifolkManifest.characters.map(async (character) => {
      state.minifolkAtlases.set(character.id, await loadImage(`./assets/minifolks/${character.sheet}`));
    }));
    prepareScenePixelCaches();
    prepareControls();
    selectInitialCity();
    resizeLogicalCanvas();
    state.ready = true;
    loading.hidden = true;
    requestAnimationFrame(render);
  } catch (error) {
    console.error(error);
    loading.textContent = error instanceof Error ? error.message : String(error);
  }
}

function prepareScenePixelCaches() {
  const beach = state.portManifest.staticFrames.find((frame) => frame.layer === "Sand Beach");
  if (!beach) throw new Error("Port scene is missing its beach frame");
  beachOpaqueRuns(beach);
  dockShadowRows();
  for (const frame of state.portManifest.animated.Waves.frames) {
    animatedOpaqueLeftEdges(state.waveAtlas, frame);
  }
}

function prepareControls() {
  citySelect.replaceChildren(...state.catalog.cities.map((city) => option(city.id, `${city.label} — ${city.country}`)));
  shipSelect.replaceChildren(...cityVisualizerShipOptions(state.shipManifest.ships).map((ship) => (
    option(ship.value, ship.label)
  )));
  setOptions(approachOverride, ["auto", "ocean", "river", "lake"]);
  setOptions(leftBankCityOverride, ["auto", "on", "off"]);
  setOptions(dockOverride, ["auto", "none", "wood", "stone"]);
  setOptions(fortOverride, ["auto", "on", "off"]);
  setOptions(mountainOverride, ["auto", "none", "left", "right", "both"]);
  setOptions(leftTerrainOverride, ["auto", "grass", "forest", "desert", "rocky"]);
  setOptions(rightTerrainOverride, ["auto", "grass", "forest", "desert", "rocky"]);
  setLabeledOptions(windSpeedOverride, CITY_WIND_SPEED_OPTIONS);
  setLabeledOptions(windDirectionOverride, CITY_WIND_DIRECTION_OPTIONS);

  citySelect.addEventListener("change", () => selectCity(citySelect.value));
  viewportSelect.addEventListener("change", resizeLogicalCanvas);
  shipSelect.addEventListener("change", () => selectShip(shipSelect.value));
  for (const control of [
    approachOverride,
    leftBankCityOverride,
    dockOverride,
    fortOverride,
    mountainOverride,
    leftTerrainOverride,
    rightTerrainOverride
  ]) control.addEventListener("change", applyFeatureOverrides);
  for (const control of [windSpeedOverride, windDirectionOverride]) {
    control.addEventListener("change", applyWindOverrides);
  }
  resetOverrides.addEventListener("click", () => {
    for (const control of [
      approachOverride,
      leftBankCityOverride,
      dockOverride,
      fortOverride,
      mountainOverride,
      leftTerrainOverride,
      rightTerrainOverride
    ]) control.value = "auto";
    windSpeedOverride.value = "auto";
    windDirectionOverride.value = "auto";
    applyFeatureOverrides();
  });
}

function selectInitialCity() {
  const requested = new URL(location.href).searchParams.get("city");
  const city = state.catalog.cities.find((candidate) => candidate.id === requested) ||
    state.catalog.cities.find((candidate) => candidate.label === "London") ||
    state.catalog.cities[0];
  selectCity(city.id);
}

function selectCity(cityId) {
  const city = state.catalog.cities.find((candidate) => candidate.id === cityId);
  if (!city) throw new Error(`Unknown visualizer city: ${cityId}`);
  state.city = city;
  citySelect.value = city.id;
  canvas.setAttribute("aria-label", `${city.label}, ${city.country}`);
  state.npcAgents = createNpcAgents(city.id);
  for (const control of [
    approachOverride,
    leftBankCityOverride,
    dockOverride,
    fortOverride,
    mountainOverride,
    leftTerrainOverride,
    rightTerrainOverride
  ]) control.value = "auto";
  windSpeedOverride.value = "auto";
  windDirectionOverride.value = "auto";
  applyFeatureOverrides();
  state.parallax = sceneCameraDefaultParallax(state.features.approach);
  state.cameraVelocity = 0;
  state.cameraPanTarget = null;
  state.cloudDriftByLayer = new Map(CITY_CLOUD_SPECS.map(({ layer }) => [layer, 0]));
  state.lastCloudTimeMs = null;
  void selectCityFlag(city);
  selectShip(city.defaultShip);
  const url = new URL(location.href);
  url.searchParams.set("city", city.id);
  history.replaceState(null, "", url);
}

async function selectCityFlag(city) {
  const factionId = city.factionId;
  state.cityFlagFactionId = factionId;
  state.cityFlagImage = null;
  if (!cityGatehouseFlagVisible({ fortified: true, factionId })) return;
  try {
    const image = await loadImage(`/assets/factions/flags/${factionId}.png`);
    if (image.width !== 32 || image.height !== 20) {
      throw new Error(`City flag ${factionId} must be 32x20, got ${image.width}x${image.height}`);
    }
    if (state.cityFlagFactionId === factionId) state.cityFlagImage = image;
  } catch (error) {
    console.error(`Could not load city flag ${factionId}`, error);
  }
}

function applyFeatureOverrides() {
  const mountain = mountainOverride.value;
  const overrides = {
    approach: autoValue(approachOverride.value),
    leftBankCity: leftBankCityOverride.value === "auto"
      ? undefined
      : leftBankCityOverride.value === "on",
    dock: autoValue(dockOverride.value),
    fortified: fortOverride.value === "auto" ? undefined : fortOverride.value === "on",
    mountainsLeft: mountain === "auto" ? undefined : mountain === "left" || mountain === "both",
    mountainsRight: mountain === "auto" ? undefined : mountain === "right" || mountain === "both",
    leftTerrain: autoValue(leftTerrainOverride.value),
    rightTerrain: autoValue(rightTerrainOverride.value)
  };
  state.features = resolveCitySceneFeatures(state.city, overrides);
  state.streetBuildings = cityStreetBuildingPlacements({
    features: state.features,
    frames: state.portManifest.staticFrames,
    buildingStyle: cityArchitectureStyleForLayer(state.city, "Home")
  });
  const backgroundCityBase = state.portManifest.staticFrames.find((frame) => (
    frame.layer === BACKGROUND_CITY_BASE_LAYER
  ));
  state.backgroundCityBaseTopYByX = backgroundCityBase
    ? cityBackgroundBaseTopProfile({
        alpha: frameAlpha(backgroundCityBase),
        width: backgroundCityBase.frame.w,
        height: backgroundCityBase.frame.h,
        sourceY: backgroundCityBase.spriteSourceSize.y
      })
    : null;
  state.backgroundCityStreetRows = backgroundCityBase
    ? cityBackgroundStreetRows({
        alpha: frameAlpha(backgroundCityBase),
        width: backgroundCityBase.frame.w,
        height: backgroundCityBase.frame.h,
        sourceX: backgroundCityBase.spriteSourceSize.x,
        sourceY: backgroundCityBase.spriteSourceSize.y,
        rightX: PORT_SCENE_MASTER.width
      })
    : [];
  state.backgroundCityRows = cityBackgroundLayout({
    city: state.city,
    frames: state.portManifest.staticFrames,
    baseFrame: backgroundCityBase,
    baseTopYByX: state.backgroundCityBaseTopYByX
  });
  state.backgroundCityPainterOrder = cityBackgroundPainterOrder(state.backgroundCityRows);
  state.backgroundCitySmokeByBuilding = backgroundCitySmokeMap({
    cityId: state.city.id,
    side: "right",
    rows: state.backgroundCityRows
  });
  state.leftBankBackgroundCityStreetRows = state.features.leftBankCity
    ? mirrorCityBackgroundStreetRows({
        rows: state.backgroundCityStreetRows,
        sceneWidth: PORT_SCENE_MASTER.width
      })
    : [];
  state.leftBankBackgroundCityRows = state.features.leftBankCity
    ? oppositeBankCityBackgroundLayout({
        city: state.city,
        frames: state.portManifest.staticFrames,
        baseFrame: backgroundCityBase,
        baseTopYByX: state.backgroundCityBaseTopYByX,
        sceneWidth: PORT_SCENE_MASTER.width,
        parallaxAnchor: PORT_SCENE_CAMERA.riverDefaultParallax
      })
    : [];
  state.leftBankBackgroundCityPainterOrder = cityBackgroundPainterOrder(
    state.leftBankBackgroundCityRows
  );
  state.leftBankBackgroundCitySmokeByBuilding = backgroundCitySmokeMap({
    cityId: state.city.id,
    side: "left",
    rows: state.leftBankBackgroundCityRows
  });
  const cameraBounds = sceneCameraParallaxBounds(state.features.approach);
  state.parallax = clamp(state.parallax, cameraBounds.minimum, cameraBounds.maximum);
  state.cameraVelocity = 0;
  state.cameraPanTarget = null;
  applyWindOverrides();
}

function applyWindOverrides() {
  state.wind = cityWindForCity(state.city, {
    speed: windSpeedOverride.value,
    direction: windDirectionOverride.value
  });
  updateRuleLedger();
  updateHover();
}

async function selectShip(slug) {
  const ship = state.shipManifest.ships.find((candidate) => candidate.slug === slug) || state.shipManifest.ships[0];
  if (!ship.cityDockside) throw new Error(`Missing native city dockside raster: ${ship.slug}`);
  const waterShadowEntries = ship.cityDockside.waterShadows;
  if (
    !waterShadowEntries ||
    JSON.stringify(Object.keys(waterShadowEntries).sort()) !== JSON.stringify(["down", "level", "up"])
  ) {
    throw new Error(`Missing dockside water-shadow bakes: ${ship.slug}`);
  }
  state.shipSlug = ship.slug;
  shipSelect.value = ship.slug;
  state.shipImage = null;
  state.shipSinkDepthImage = null;
  state.shipWaterlineLayers = null;
  state.shipWaterShadowImages = null;
  const shadowStates = ["up", "level", "down"];
  const [shipImage, shipSinkDepthImage, ...waterShadowMasks] = await Promise.all([
    loadImage(publicAssetUrl(ship.cityDockside.file)),
    loadImage(publicAssetUrl(ship.cityDockside.sinkDepthFile)),
    ...shadowStates.map((bobState) => (
      loadImage(publicAssetUrl(waterShadowEntries[bobState].file))
    ))
  ]);
  if (state.shipSlug !== ship.slug) return;
  for (const mask of waterShadowMasks) {
    if (mask.width !== shipImage.width || mask.height !== shipImage.height) {
      throw new Error(`Dockside water-shadow bake has mismatched dimensions: ${ship.slug}`);
    }
  }
  state.shipImage = shipImage;
  state.shipSinkDepthImage = shipSinkDepthImage;
  const waterlineRgb = cityWaterPaletteRgb(
    DOCKSIDE_SHIP_WATERLINE_RGB.r,
    DOCKSIDE_SHIP_WATERLINE_RGB.g,
    DOCKSIDE_SHIP_WATERLINE_RGB.b,
    state.city.lat,
    PORT_SCENE_DOCK.waterlineY
  );
  state.shipWaterlineLayers = docksideShipWaterlineLayers(
    shipImage,
    shipSinkDepthImage,
    ship.slug,
    waterlineRgb
  );
  state.shipWaterShadowImages = Object.freeze(Object.fromEntries(
    shadowStates.map((bobState, index) => [
      bobState,
      tintedDocksideWaterShadow(waterShadowMasks[index])
    ])
  ));
}

function publicAssetUrl(file) {
  const prefix = "apps/pixel-globe/public";
  if (typeof file !== "string" || !file.startsWith(`${prefix}/`)) {
    throw new Error(`City visualizer requires a public asset path: ${file}`);
  }
  return file.slice(prefix.length);
}

function updateRuleLedger() {
  const rows = [...sceneReasonRows(state.city, state.features)];
  if (state.wind) {
    rows.push(Object.freeze({
      label: "Wind",
      value: `${state.wind.speedLabel}, ${state.wind.directionLabel}`,
      reason: state.wind.automaticSpeed && state.wind.automaticDirection
        ? "production game wind field at this city's coordinates"
        : "visualizer weather override"
    }));
  }
  ruleLedger.replaceChildren(...rows.flatMap((row) => {
    const term = document.createElement("dt");
    term.textContent = row.label;
    const detail = document.createElement("dd");
    detail.textContent = `${humanize(row.value)} — ${row.reason}`;
    return [term, detail];
  }));
}

function resizeLogicalCanvas() {
  const browserViewport = window.visualViewport;
  const dimensions = resolveBrowserViewportDimensions({
    shellWidth: stage.clientWidth,
    shellHeight: stage.clientHeight,
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    visualViewportWidth: browserViewport?.width,
    visualViewportHeight: browserViewport?.height
  });
  if (!dimensions) return;
  const { width: viewportWidth, height: viewportHeight } = dimensions;
  const preset = viewportSelect.value;
  const logical = preset === "auto"
    ? responsiveLogicalViewport({
        viewportWidth,
        viewportHeight
      })
    : ({
        canonical: { width: 455, height: 256 },
        wide: { width: 910, height: 256 },
        portrait: { width: 256, height: 455 },
        tall: { width: 256, height: 910 }
      })[preset];
  if (!logical) return;
  canvas.width = logical.width;
  canvas.height = logical.height;
  const layout = canvasDisplayLayout({
    viewportWidth,
    viewportHeight,
    canvasWidth: logical.width,
    canvasHeight: logical.height
  });
  canvas.style.left = `${layout.left}px`;
  canvas.style.top = `${layout.top}px`;
  canvas.style.width = `${layout.width}px`;
  canvas.style.height = `${layout.height}px`;
  context.imageSmoothingEnabled = false;
  updateHover();
}

new ResizeObserver(() => {
  resizeLogicalCanvas();
}).observe(stage);
window.visualViewport?.addEventListener("resize", resizeLogicalCanvas);

canvas.addEventListener("pointermove", (event) => {
  state.pointer = canvasPoint(event);
  const gesture = state.cameraGesture;
  if (gesture?.pointerId === event.pointerId) {
    const movementX = event.clientX - gesture.lastClientX;
    gesture.lastClientX = event.clientX;
    gesture.totalX = event.clientX - gesture.startClientX;
    if (!gesture.moved && Math.abs(gesture.totalX) >= 4) {
      gesture.moved = true;
      canvas.classList.add("is-panning");
      panCameraByScreenPixels(-gesture.totalX);
    } else if (gesture.moved && movementX !== 0) {
      panCameraByScreenPixels(-movementX);
    }
  }
  updateHover();
});

canvas.addEventListener("pointerdown", (event) => {
  if (!event.isPrimary || event.button !== 0 || state.cameraGesture) return;
  state.cameraVelocity = 0;
  state.cameraPanTarget = null;
  state.suppressClick = false;
  state.cameraGesture = {
    pointerId: event.pointerId,
    pointerType: event.pointerType,
    startClientX: event.clientX,
    lastClientX: event.clientX,
    totalX: 0,
    moved: false
  };
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointerup", finishCameraGesture);
canvas.addEventListener("pointercancel", cancelCameraGesture);

canvas.addEventListener("wheel", (event) => {
  let screenDeltaX = event.deltaX;
  if (screenDeltaX === 0 && event.shiftKey) screenDeltaX = event.deltaY;
  if (screenDeltaX === 0 || (!event.shiftKey && Math.abs(screenDeltaX) < Math.abs(event.deltaY))) return;
  if (event.deltaMode === 1) screenDeltaX *= 16;
  else if (event.deltaMode === 2) screenDeltaX *= canvas.clientWidth;
  event.preventDefault();
  const maximumDelta = canvas.clientWidth * 0.25;
  const boundedDelta = clamp(screenDeltaX, -maximumDelta, maximumDelta);
  if (prefersReducedMotion.matches) panCameraByScreenPixels(boundedDelta);
  else queueCameraPanByScreenPixels(boundedDelta);
}, { passive: false });

canvas.addEventListener("pointerleave", () => {
  state.pointer = null;
  state.hoveredDestination = null;
  canvas.classList.remove("is-actionable");
});

canvas.addEventListener("click", () => {
  if (state.suppressClick) {
    state.suppressClick = false;
    return;
  }
  const destination = state.hoveredDestination;
  if (!destination) return;
  destinationTitle.textContent = destination.label;
  destinationCopy.textContent = destination.copy;
  destinationDialog.showModal();
});

function finishCameraGesture(event) {
  const gesture = state.cameraGesture;
  if (!gesture || gesture.pointerId !== event.pointerId) return;
  state.suppressClick = gesture.moved;
  state.cameraGesture = null;
  canvas.classList.remove("is-panning");
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  state.pointer = gesture.pointerType === "mouse" ? canvasPoint(event) : null;
  updateHover();
}

function cancelCameraGesture(event) {
  if (state.cameraGesture?.pointerId !== event.pointerId) return;
  state.cameraGesture = null;
  state.suppressClick = false;
  canvas.classList.remove("is-panning");
  state.pointer = null;
  updateHover();
}

function panCameraByScreenPixels(screenDeltaX) {
  const delta = scenePanParallaxDelta({
    screenDeltaX,
    displayWidth: canvas.clientWidth,
    logicalWidth: canvas.width,
    approach: state.features?.approach || "ocean"
  });
  if (delta === 0) return;
  const cameraBounds = sceneCameraParallaxBounds(state.features?.approach || "ocean");
  state.cameraVelocity = 0;
  state.cameraPanTarget = null;
  state.parallax = clamp(
    state.parallax + delta,
    cameraBounds.minimum,
    cameraBounds.maximum
  );
  updateHover();
}

function queueCameraPanByScreenPixels(screenDeltaX) {
  const delta = scenePanParallaxDelta({
    screenDeltaX,
    displayWidth: canvas.clientWidth,
    logicalWidth: canvas.width,
    approach: state.features?.approach || "ocean"
  });
  if (delta === 0) return;
  const cameraBounds = sceneCameraParallaxBounds(state.features?.approach || "ocean");
  const target = state.cameraPanTarget ?? state.parallax;
  state.cameraPanTarget = clamp(
    target + delta,
    cameraBounds.minimum,
    cameraBounds.maximum
  );
}

function advanceCamera(timeMs) {
  if (state.lastRenderTimeMs === null) {
    state.lastRenderTimeMs = timeMs;
    return;
  }
  const elapsedMs = Math.min(50, Math.max(0, timeMs - state.lastRenderTimeMs));
  state.lastRenderTimeMs = timeMs;
  const previous = state.parallax;
  if (prefersReducedMotion.matches || state.cameraGesture) {
    state.cameraVelocity = 0;
  } else {
    const targetVelocity = state.cameraPanTarget === null
      ? (state.pointer
          ? sceneEdgeScrollVelocity({ pointerX: state.pointer.x, width: canvas.width })
          : 0)
      : sceneInertialPanTargetVelocity({
          current: state.parallax,
          target: state.cameraPanTarget
        });
    state.cameraVelocity = advanceSceneScrollVelocity({
      current: state.cameraVelocity,
      target: targetVelocity,
      elapsedMs
    });
  }
  if (state.cameraVelocity !== 0) {
    const next = advanceSceneParallax({
      current: state.parallax,
      velocity: state.cameraVelocity,
      elapsedMs
    });
    const cameraBounds = sceneCameraParallaxBounds(state.features?.approach || "ocean");
    const crossedPanTarget = state.cameraPanTarget !== null &&
      Math.sign(state.cameraPanTarget - state.parallax) !==
        Math.sign(state.cameraPanTarget - next);
    state.parallax = crossedPanTarget
      ? state.cameraPanTarget
      : clamp(next, cameraBounds.minimum, cameraBounds.maximum);
    if (crossedPanTarget) {
      state.cameraVelocity = 0;
      state.cameraPanTarget = null;
    }
    if (
      (state.parallax === cameraBounds.minimum && state.cameraVelocity < 0) ||
      (state.parallax === cameraBounds.maximum && state.cameraVelocity > 0)
    ) {
      state.cameraVelocity = 0;
      state.cameraPanTarget = null;
    }
  }
  if (state.pointer && state.parallax !== previous) updateHover();
}

function sceneWindow(depth, offsetX = 0, offsetY = 0, parallaxAnchor = 0) {
  const window = logicalSceneWindow({
    width: canvas.width,
    height: canvas.height,
    parallax: state.parallax,
    depth,
    approach: state.features?.approach || "ocean",
    parallaxAnchor
  });
  return offsetX === 0 && offsetY === 0
    ? window
    : Object.freeze({ ...window, x: window.x - offsetX, y: window.y - offsetY });
}

function render(timeMs) {
  if (!state.ready) return;
  advanceCamera(timeMs);
  advanceCloudMotion(timeMs);
  context.imageSmoothingEnabled = false;
  context.fillStyle = "#6385c5";
  context.fillRect(0, 0, canvas.width, canvas.height);
  for (const entry of sceneRenderEntries()) {
    if (entry.kind === "static") drawStaticFrame(entry.frame, entry.layerName, entry.occurrence);
    else if (entry.kind === "animated") drawAnimatedLayer(entry.layerName, timeMs, entry.occurrence);
    else if (entry.kind === "dock-shadow-extension") drawDockShadowExtension();
    else if (entry.kind === "ocean") drawOceanSlice(entry.frame, entry.slice, timeMs);
    else if (entry.kind === "background-city") drawBackgroundCity(entry.side, timeMs);
    else if (entry.kind === "left-bank-background-city-base") drawLeftBankBackgroundCityBase(entry.frame);
    else if (entry.kind === "chimney-smoke") drawChimneySmoke(entry.emitter, timeMs);
    else if (entry.kind === "city-building") drawCityStreetBuilding(entry.placement);
    else if (entry.kind === "city-building-smoke") {
      drawCityStreetBuildingSmoke(entry.placement, entry.emitter, timeMs);
    }
    else if (entry.kind === "gatehouse-flag") drawGatehouseFlag(entry.frame, timeMs);
    else if (entry.kind === "cloud") drawCloud(entry, timeMs);
    else if (entry.kind === "ship") drawDocksideShip(timeMs);
    else if (entry.kind === "npcs") drawNpcs(timeMs);
  }
  drawSceneLabels();
  requestAnimationFrame(render);
}

function advanceCloudMotion(timeMs) {
  if (!Number.isFinite(timeMs) || timeMs < 0) throw new Error(`Invalid city cloud time: ${timeMs}`);
  const previousTimeMs = state.lastCloudTimeMs;
  state.lastCloudTimeMs = timeMs;
  if (previousTimeMs === null || prefersReducedMotion.matches) return;
  const elapsedMs = Math.min(100, Math.max(0, timeMs - previousTimeMs));
  for (const spec of CITY_CLOUD_SPECS) {
    const current = state.cloudDriftByLayer.get(spec.layer) || 0;
    state.cloudDriftByLayer.set(spec.layer, advanceCityCloudDrift({
      current,
      elapsedMs,
      wind: state.wind,
      spec
    }));
  }
}

function sceneRenderEntries() {
  const activeLayers = activePortSceneLayers(state.features);
  const staticOccurrence = new Map();
  const entries = [];
  for (const [authoredOrder, layerName] of state.portManifest.layerOrder.entries()) {
    const occurrence = layerName === "Waves" || layerName === "Surf"
      ? 0
      : incrementOccurrence(staticOccurrence, layerName) - 1;
    if (!activeLayers.has(layerName)) {
      continue;
    }
    if (layerName === "Waves" || layerName === "Surf") {
      entries.push({
        kind: "animated",
        layerName,
        occurrence,
        z: layerSceneZ(layerName, occurrence),
        authoredOrder
      });
      continue;
    }
    const frames = state.portManifest.staticFrames.filter((frame) => frame.layer === layerName);
    const frame = frames[occurrence];
    if (!frame) throw new Error(`Missing ${layerName} layer occurrence ${occurrence}`);
    const cloud = cityCloudSpec(layerName);
    if (cloud) {
      entries.push({
        kind: "cloud",
        frame,
        spec: cloud,
        z: cloud.z,
        authoredOrder
      });
    } else if (layerName === "Ocean") {
      for (const [sliceIndex, slice] of PORT_SCENE_OCEAN_SLICES.entries()) {
        entries.push({ kind: "ocean", frame, slice, z: slice.z, authoredOrder: authoredOrder + sliceIndex / 10 });
      }
    } else {
      if (layerName === BACKGROUND_CITY_BASE_LAYER) {
        entries.push({
          kind: "background-city",
          side: "right",
          z: layerSceneZ(layerName, occurrence) - 0.1,
          authoredOrder: authoredOrder - 0.1
        });
        if (state.features.leftBankCity) {
          entries.push({
            kind: "background-city",
            side: "left",
            z: layerSceneZ(layerName, occurrence) - 0.1,
            authoredOrder: authoredOrder - 0.2
          });
          entries.push({
            kind: "left-bank-background-city-base",
            frame,
            z: layerSceneZ(layerName, occurrence),
            authoredOrder: authoredOrder - 0.05
          });
        }
      }
      entries.push({
        kind: "static",
        frame,
        layerName,
        occurrence,
        z: layerSceneZ(layerName, occurrence),
        authoredOrder
      });
      if (
        layerName === CITY_GATEHOUSE_FLAG_LAYER &&
        state.cityFlagImage &&
        cityGatehouseFlagVisible({
          fortified: state.features.fortified,
          factionId: state.city.factionId
        })
      ) {
        entries.push({
          kind: "gatehouse-flag",
          frame: cityRegionalBuildingFrame(
            state.portManifest.staticFrames,
            cityArchitectureStyleForLayer(state.city, CITY_GATEHOUSE_FLAG_LAYER),
            CITY_GATEHOUSE_FLAG_LAYER
          ) || frame,
          z: layerSceneZ(layerName, occurrence),
          authoredOrder: authoredOrder + 0.01
        });
      }
    }
  }
  for (const emitter of CITY_CHIMNEY_SMOKE_EMITTERS) {
    if (!activeLayers.has(emitter.layerName)) continue;
    const baseFrame = state.portManifest.staticFrames.find((frame) => frame.layer === emitter.layerName);
    if (!baseFrame) throw new Error(`Missing chimney building frame: ${emitter.layerName}`);
    const displayedFrame = cityRegionalBuildingFrame(
      state.portManifest.staticFrames,
      cityArchitectureStyleForLayer(state.city, emitter.layerName),
      emitter.layerName
    ) || baseFrame;
    if (displayedFrame.hasChimney === false) continue;
    const authoredOrder = state.portManifest.layerOrder.indexOf(emitter.layerName);
    if (authoredOrder < 0) throw new Error(`Missing chimney layer order: ${emitter.layerName}`);
    entries.push({
      kind: "chimney-smoke",
      emitter,
      z: layerSceneZ(emitter.layerName) - 0.1,
      authoredOrder: authoredOrder - 0.1
    });
  }
  for (const [placementOrder, placement] of state.streetBuildings.entries()) {
    const authoredOrder = 15 + placementOrder / 10;
    const emitter = placedCityBuildingChimneySmokeEmitter(placement);
    if (emitter) {
      entries.push({
        kind: "city-building-smoke",
        placement,
        emitter,
        z: placement.z - 0.1,
        authoredOrder: authoredOrder - 0.01
      });
    }
    entries.push({
      kind: "city-building",
      placement,
      z: placement.z,
      authoredOrder
    });
  }
  entries.push({ kind: "ship", ...PORT_SCENE_ENTITY_META.ship, authoredOrder: 34.5 });
  entries.push({ kind: "npcs", ...PORT_SCENE_ENTITY_META.npcs, authoredOrder: 37.5 });
  if (state.features.dock !== "none") {
    entries.push({ kind: "dock-shadow-extension", z: 36, authoredOrder: 16.5 });
  }
  return entries.sort((a, b) => a.z - b.z || a.authoredOrder - b.authoredOrder);
}

function drawCityStreetBuilding(placement) {
  const window = sceneWindow(placement.depth, 0, 0, placement.parallaxAnchor);
  const regionalFrame = regionalStaticFrame(placement.frame, placement.layerName);
  const sourceFrame = regionalFrame?.frame || placement.frame;
  context.drawImage(
    regionalFrame?.atlas || state.staticAtlas,
    sourceFrame.frame.x,
    sourceFrame.frame.y,
    placement.frame.frame.w,
    placement.frame.frame.h,
    Math.round(placement.x - window.x),
    Math.round(placement.y - window.y),
    placement.width,
    placement.height
  );
}

function drawCityStreetBuildingSmoke(placement, emitter, timeMs) {
  const window = sceneWindow(placement.depth, 0, 0, placement.parallaxAnchor);
  const smokeTime = prefersReducedMotion.matches ? 4800 : timeMs;
  context.save();
  for (const particle of cityChimneySmokeParticles(emitter, smokeTime, state.wind)) {
    if (particle.alpha <= 0) continue;
    context.globalAlpha = particle.alpha;
    context.fillStyle = particle.color;
    context.fillRect(
      Math.round(particle.x - window.x),
      Math.round(particle.y - window.y),
      particle.size,
      particle.size
    );
  }
  context.restore();
}

function drawBackgroundCity(side, timeMs) {
  const leftBank = side === "left";
  const rows = leftBank ? state.leftBankBackgroundCityRows : state.backgroundCityRows;
  const painterOrder = leftBank
    ? state.leftBankBackgroundCityPainterOrder
    : state.backgroundCityPainterOrder;
  const streetRows = leftBank
    ? state.leftBankBackgroundCityStreetRows
    : state.backgroundCityStreetRows;
  const smokeByBuilding = leftBank
    ? state.leftBankBackgroundCitySmokeByBuilding
    : state.backgroundCitySmokeByBuilding;
  if (rows.length === 0) return;
  drawBackgroundCityStreet(streetRows, rows.at(-1).parallaxAnchor);
  for (const entry of painterOrder) {
    const building = entry.building;
    const frame = building.frame;
    const window = sceneWindow(entry.depth, 0, 0, entry.parallaxAnchor);
    const atmosphereLevel = building.atmosphereLevel ?? cityBackgroundAtmosphereLevel(
      entry.distanceFromFront,
      rows.length
    );
    const atmosphereFrame = backgroundCityAtmosphereFrame(frame, atmosphereLevel);
    if (atmosphereFrame) {
      context.drawImage(
        atmosphereFrame,
        0,
        0,
        frame.frame.w,
        frame.frame.h,
        Math.round(building.x - window.x),
        Math.round(building.y - window.y),
        building.width,
        building.height
      );
    } else {
      context.drawImage(
        state.staticAtlas,
        frame.frame.x,
        frame.frame.y,
        frame.frame.w,
        frame.frame.h,
        Math.round(building.x - window.x),
        Math.round(building.y - window.y),
        building.width,
        building.height
      );
    }
    const emitter = smokeByBuilding.get(building);
    if (emitter) drawBackgroundCityChimneySmoke(emitter, timeMs, window);
  }
}

function backgroundCitySmokeMap(options) {
  return new Map(backgroundCityChimneySmokeEmitters(options).map(({ building, emitter }) => (
    [building, emitter]
  )));
}

function drawBackgroundCityChimneySmoke(emitter, timeMs, window) {
  const smokeTime = prefersReducedMotion.matches ? 4800 : timeMs;
  context.save();
  for (const particle of cityChimneySmokeParticles(emitter, smokeTime, state.wind)) {
    if (particle.alpha <= 0) continue;
    context.globalAlpha = particle.alpha;
    context.fillStyle = particle.color;
    context.fillRect(
      Math.round(particle.x - window.x),
      Math.round(particle.y - window.y),
      particle.size,
      particle.size
    );
  }
  context.restore();
}

function backgroundCityAtmosphereFrame(frame, level) {
  const regionalFrame = regionalStaticFrame(frame, frame.layer);
  if (level === 0) return regionalFrame?.atlas || null;
  let levels = backgroundCityAtmosphereCanvasCache.get(frame);
  if (!levels) {
    levels = new Map();
    backgroundCityAtmosphereCanvasCache.set(frame, levels);
  }
  const regionalKey = cityRegionalPaletteApplies(state.city?.cityType, frame.layer)
    ? state.city.cityType
    : "default";
  const cacheKey = `${regionalKey}:${level}`;
  if (levels.has(cacheKey)) return levels.get(cacheKey);
  const buffer = document.createElement("canvas");
  buffer.width = frame.frame.w;
  buffer.height = frame.frame.h;
  const bufferContext = buffer.getContext("2d", { willReadFrequently: true });
  bufferContext.imageSmoothingEnabled = false;
  const sourceFrame = regionalFrame?.frame || frame;
  bufferContext.drawImage(
    regionalFrame?.atlas || state.staticAtlas,
    sourceFrame.frame.x,
    sourceFrame.frame.y,
    frame.frame.w,
    frame.frame.h,
    0,
    0,
    frame.frame.w,
    frame.frame.h
  );
  const imageData = bufferContext.getImageData(0, 0, buffer.width, buffer.height);
  for (let offset = 0; offset < imageData.data.length; offset += 4) {
    if (imageData.data[offset + 3] <= 16) continue;
    const shifted = cityBackgroundAtmosphereRgb(
      imageData.data[offset],
      imageData.data[offset + 1],
      imageData.data[offset + 2],
      level
    );
    imageData.data[offset] = shifted.red;
    imageData.data[offset + 1] = shifted.green;
    imageData.data[offset + 2] = shifted.blue;
  }
  bufferContext.putImageData(imageData, 0, 0);
  levels.set(cacheKey, buffer);
  return buffer;
}

function drawBackgroundCityStreet(rows, parallaxAnchor) {
  if (rows.length === 0) return;
  const window = sceneWindow(
    layerParallaxDepth(BACKGROUND_CITY_BASE_LAYER),
    0,
    0,
    parallaxAnchor
  );
  context.fillStyle = BACKGROUND_CITY_STREET_COLOR;
  for (const row of rows) {
    const screenX = Math.round(row.leftX - window.x);
    const screenY = Math.round(row.y - window.y);
    const screenRight = Math.round(row.rightX - window.x);
    if (screenY < 0 || screenY >= canvas.height || screenRight <= 0 || screenX >= canvas.width) continue;
    context.fillRect(
      Math.max(0, screenX),
      screenY,
      Math.max(1, Math.min(canvas.width, screenRight) - Math.max(0, screenX)),
      1
    );
  }
}

function drawLeftBankBackgroundCityBase(frame) {
  const parallaxAnchor = PORT_SCENE_CAMERA.riverDefaultParallax;
  const window = sceneWindow(
    layerParallaxDepth(BACKGROUND_CITY_BASE_LAYER),
    0,
    0,
    parallaxAnchor
  );
  const masterX = PORT_SCENE_MASTER.width - frame.spriteSourceSize.x - frame.frame.w;
  const destinationX = Math.round(masterX - window.x);
  const destinationY = Math.round(frame.spriteSourceSize.y - window.y);
  context.save();
  context.translate(destinationX + frame.frame.w, 0);
  context.scale(-1, 1);
  context.drawImage(
    state.staticAtlas,
    frame.frame.x,
    frame.frame.y,
    frame.frame.w,
    frame.frame.h,
    0,
    destinationY,
    frame.frame.w,
    frame.frame.h
  );
  context.restore();
}

function drawChimneySmoke(emitter, timeMs) {
  const occurrence = 0;
  const approach = state.features?.approach || "ocean";
  const window = sceneWindow(
    layerParallaxDepth(emitter.layerName, occurrence),
    layerSceneOffsetX(emitter.layerName, occurrence, approach),
    layerSceneOffsetY(emitter.layerName, occurrence, approach),
    layerParallaxAnchor(emitter.layerName, occurrence)
  );
  const smokeTime = prefersReducedMotion.matches ? 4800 : timeMs;
  context.save();
  for (const particle of cityChimneySmokeParticles(emitter, smokeTime, state.wind)) {
    if (particle.alpha <= 0) continue;
    context.globalAlpha = particle.alpha;
    context.fillStyle = particle.color;
    context.fillRect(
      Math.round(particle.x - window.x),
      Math.round(particle.y - window.y),
      particle.size,
      particle.size
    );
  }
  context.restore();
}

function drawStaticFrame(frame, layerName, occurrence) {
  const approach = state.features?.approach || "ocean";
  const offsetX = layerSceneOffsetX(layerName, occurrence, state.features?.approach || "ocean");
  const offsetY = layerSceneOffsetY(layerName, occurrence, approach);
  const window = sceneWindow(
    layerParallaxDepth(layerName, occurrence),
    offsetX,
    offsetY,
    layerParallaxAnchor(layerName, occurrence)
  );
  const regionalFrame = regionalStaticFrame(frame, layerName);
  const sourceAtlas = regionalFrame?.atlas || state.staticAtlas;
  const sourceFrame = regionalFrame?.frame || frame;
  if (state.hoveredDestination?.layers.includes(layerName)) {
    drawFrameOutline(sourceAtlas, sourceFrame, window);
  }
  drawAtlasFrame(
    sourceAtlas,
    sourceFrame,
    window,
    offsetX > 0,
    layerVisibleSourceRect(layerName, sourceFrame.frame.w, sourceFrame.frame.h)
  );
}

function regionalStaticFrame(frame, layerName) {
  const cityType = cityArchitectureStyleForLayer(state.city, layerName);
  const regionalBuildingFrame = cityRegionalBuildingFrame(
    state.portManifest.staticFrames,
    cityType,
    layerName
  );
  const sourceFrame = regionalBuildingFrame || frame;
  const paletteApplies = cityRegionalPaletteApplies(cityType, layerName);
  if (sourceFrame === frame && !paletteApplies) return null;
  if (!paletteApplies) return { atlas: state.staticAtlas, frame: sourceFrame };
  const cacheKey = `${cityType}:${sourceFrame.id}`;
  if (regionalStaticFrameCanvasCache.has(cacheKey)) {
    return regionalStaticFrameCanvasCache.get(cacheKey);
  }

  const buffer = document.createElement("canvas");
  buffer.width = sourceFrame.frame.w;
  buffer.height = sourceFrame.frame.h;
  const bufferContext = buffer.getContext("2d", { willReadFrequently: true });
  bufferContext.imageSmoothingEnabled = false;
  bufferContext.drawImage(
    state.staticAtlas,
    sourceFrame.frame.x,
    sourceFrame.frame.y,
    sourceFrame.frame.w,
    sourceFrame.frame.h,
    0,
    0,
    sourceFrame.frame.w,
    sourceFrame.frame.h
  );
  const imageData = bufferContext.getImageData(0, 0, buffer.width, buffer.height);
  for (let offset = 0; offset < imageData.data.length; offset += 4) {
    if (imageData.data[offset + 3] <= 16) continue;
    const shifted = cityRegionalPaletteRgb(
      cityType,
      layerName,
      imageData.data[offset],
      imageData.data[offset + 1],
      imageData.data[offset + 2]
    );
    imageData.data[offset] = shifted.red;
    imageData.data[offset + 1] = shifted.green;
    imageData.data[offset + 2] = shifted.blue;
  }
  bufferContext.putImageData(imageData, 0, 0);

  const regionalFrame = {
    atlas: buffer,
    frame: {
      ...sourceFrame,
      frame: {
        ...sourceFrame.frame,
        x: 0,
        y: 0
      }
    }
  };
  regionalStaticFrameCanvasCache.set(cacheKey, regionalFrame);
  return regionalFrame;
}

function drawAnimatedLayer(layerName, timeMs, occurrence) {
  const animation = state.portManifest.animated[layerName];
  const frame = animationFrame(animation.frames, prefersReducedMotion.matches ? 0 : timeMs);
  const window = sceneWindow(layerParallaxDepth(layerName, occurrence));
  const atlas = layerName === "Waves" ? state.waveAtlas : state.surfAtlas;
  if (layerName === "Waves") drawWaterToWaveEdges(atlas, frame, window);
  const renderedFrame = cityWaterAnimatedLayerUsesPalette(layerName)
    ? latitudeWaterFrame(atlas, frame)
    : { atlas, frame };
  drawAtlasFrame(renderedFrame.atlas, renderedFrame.frame, window);
}

function drawGatehouseFlag(frame, timeMs) {
  const image = state.cityFlagImage;
  if (!image) return;
  const approach = state.features?.approach || "ocean";
  const window = sceneWindow(
    layerParallaxDepth(CITY_GATEHOUSE_FLAG_LAYER, 0),
    layerSceneOffsetX(CITY_GATEHOUSE_FLAG_LAYER, 0, approach),
    layerSceneOffsetY(CITY_GATEHOUSE_FLAG_LAYER, 0, approach),
    layerParallaxAnchor(CITY_GATEHOUSE_FLAG_LAYER, 0)
  );
  const geometry = cityGatehouseFlagGeometry(frame);
  const poleX = Math.round(geometry.poleX - window.x);
  const poleTopY = Math.round(geometry.poleTopY - window.y);
  const poleBottomY = Math.round(geometry.poleBottomY - window.y);
  context.fillStyle = "#3e3546";
  context.fillRect(poleX, poleTopY, 1, poleBottomY - poleTopY + 1);

  const pose = flagWindPose(state.wind.flowDirectionRad, state.wind.strength);
  const layout = flagFabricColumnLayout(geometry.flagWidth, geometry.flagHeight, pose);
  const phase = cityGatehouseFlagPhase(prefersReducedMotion.matches ? 0 : timeMs) * pose.waveRate;
  const columnOffsets = flagWaveColumnOffsets(layout.fabricWidth, phase, pose.waveAmplitudePx);
  const destinationY = Math.round(geometry.flagY - window.y);
  for (let column = 0; column < layout.fabricWidth; column++) {
    const columnLayout = layout.columns[column];
    const sourceX = Math.min(image.width - 1, Math.floor(columnLayout.sourceStart * image.width));
    const sourceEndX = Math.max(sourceX + 1, Math.ceil(columnLayout.sourceEnd * image.width));
    context.drawImage(
      image,
      sourceX,
      0,
      Math.max(1, sourceEndX - sourceX),
      image.height,
      poleX + pose.flyDirection * (column + 1),
      destinationY + columnOffsets[column] + columnLayout.y,
      1,
      columnLayout.height
    );
  }
}

function drawCloud(entry, timeMs) {
  const cloudTime = prefersReducedMotion.matches ? 0 : timeMs;
  const window = sceneWindow(entry.spec.depth);
  for (const position of cityCloudDrawPositions({
    spec: entry.spec,
    frame: entry.frame,
    timeMs: cloudTime,
    wind: state.wind,
    sceneWidth: PORT_SCENE_MASTER.width,
    driftX: state.cloudDriftByLayer.get(entry.spec.layer) || 0
  })) {
    const destinationX = Math.round(position.x - window.x);
    const destinationY = Math.round(position.y - window.y);
    if (
      destinationX + entry.frame.frame.w <= 0 ||
      destinationX >= canvas.width ||
      destinationY + entry.frame.frame.h <= 0 ||
      destinationY >= canvas.height
    ) continue;
    context.drawImage(
      state.staticAtlas,
      entry.frame.frame.x,
      entry.frame.frame.y,
      entry.frame.frame.w,
      entry.frame.frame.h,
      destinationX,
      destinationY,
      entry.frame.frame.w,
      entry.frame.frame.h
    );
  }
}

function drawWaterToWaveEdges(atlas, frame, window) {
  const edges = animatedOpaqueLeftEdges(atlas, frame);
  const beach = state.portManifest.staticFrames.find((candidate) => candidate.layer === "Sand Beach");
  if (!beach) return;
  const beachRuns = beachOpaqueRuns(beach);
  for (let y = 0; y < edges.length; y++) {
    if (edges[y] < 0) continue;
    const masterY = frame.spriteSourceSize.y + y;
    context.fillStyle = latitudeWaterCssColor("4d65b4", masterY);
    const beachY = masterY - beach.spriteSourceSize.y;
    if (beachY < 0 || beachY >= beachRuns.length) continue;
    const wavefrontX = frame.spriteSourceSize.x + edges[y];
    for (const [runStart, runEnd] of beachRuns[beachY]) {
      const masterStart = beach.spriteSourceSize.x + runStart;
      const masterEnd = Math.min(beach.spriteSourceSize.x + runEnd, wavefrontX);
      if (masterEnd <= masterStart) continue;
      context.fillRect(
        Math.round(masterStart - window.x),
        Math.round(masterY - window.y),
        Math.max(1, Math.round(masterEnd - masterStart)),
        1
      );
    }
  }
}

function beachOpaqueRuns(frame) {
  if (beachOpaqueRowRuns) return beachOpaqueRowRuns;
  const alpha = frameAlpha(frame);
  beachOpaqueRowRuns = Array.from({ length: frame.frame.h }, (_, y) => {
    const runs = [];
    let start = -1;
    for (let x = 0; x <= frame.frame.w; x++) {
      const opaque = x < frame.frame.w && alpha[y * frame.frame.w + x] > 16;
      if (opaque && start < 0) start = x;
      if (!opaque && start >= 0) {
        runs.push([start, x]);
        start = -1;
      }
    }
    return runs;
  });
  return beachOpaqueRowRuns;
}

function animatedOpaqueLeftEdges(atlas, frame) {
  if (animatedRowEdgeCache.has(frame)) return animatedRowEdgeCache.get(frame);
  const buffer = document.createElement("canvas");
  buffer.width = frame.frame.w;
  buffer.height = frame.frame.h;
  const bufferContext = buffer.getContext("2d", { willReadFrequently: true });
  bufferContext.drawImage(
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
  const pixels = bufferContext.getImageData(0, 0, buffer.width, buffer.height).data;
  const edges = new Int16Array(buffer.height).fill(-1);
  for (let y = 0; y < buffer.height; y++) {
    for (let x = 0; x < buffer.width; x++) {
      if (pixels[(y * buffer.width + x) * 4 + 3] <= 16) continue;
      edges[y] = x;
      break;
    }
  }
  animatedRowEdgeCache.set(frame, edges);
  return edges;
}

function drawDockShadowExtension() {
  const frame = state.portManifest.staticFrames.find((candidate) => candidate.layer === "Sand Beach Dock Shadow");
  const beach = state.portManifest.staticFrames.find((candidate) => candidate.layer === "Sand Beach");
  if (!frame || !beach) return;
  const window = sceneWindow(layerParallaxDepth("Sand Beach Dock Shadow"));
  const beachRuns = beachOpaqueRuns(beach);
  for (const row of dockShadowRows()) {
    const masterY = frame.spriteSourceSize.y + row.y;
    const beachY = masterY - beach.spriteSourceSize.y;
    if (beachY < 0 || beachY >= beachRuns.length) continue;
    const extensionEnd = frame.spriteSourceSize.x + row.x;
    const extensionStart = extensionEnd - PORT_SCENE_DOCK.shadowWaterExtension;
    context.fillStyle = row.color;
    for (const [runStart, runEnd] of beachRuns[beachY]) {
      const clippedStart = Math.max(extensionStart, beach.spriteSourceSize.x + runStart);
      const clippedEnd = Math.min(extensionEnd, beach.spriteSourceSize.x + runEnd);
      if (clippedEnd <= clippedStart) continue;
      context.fillRect(
        Math.round(clippedStart - window.x),
        Math.round(masterY - window.y),
        Math.max(1, Math.round(clippedEnd - clippedStart)),
        1
      );
    }
  }
}

function dockShadowRows() {
  if (dockShadowExtensionRows) return dockShadowExtensionRows;
  const plain = state.portManifest.staticFrames.find((frame) => frame.layer === "Sand Beach");
  const shadow = state.portManifest.staticFrames.find((frame) => frame.layer === "Sand Beach Dock Shadow");
  if (!plain || !shadow || plain.frame.w !== shadow.frame.w || plain.frame.h !== shadow.frame.h) {
    throw new Error("Dock shadow requires matching beach frames");
  }
  const comparison = document.createElement("canvas");
  comparison.width = plain.frame.w;
  comparison.height = plain.frame.h;
  const comparisonContext = comparison.getContext("2d", { willReadFrequently: true });
  comparisonContext.drawImage(
    state.staticAtlas,
    plain.frame.x,
    plain.frame.y,
    plain.frame.w,
    plain.frame.h,
    0,
    0,
    plain.frame.w,
    plain.frame.h
  );
  const plainPixels = comparisonContext.getImageData(0, 0, plain.frame.w, plain.frame.h).data;
  comparisonContext.clearRect(0, 0, plain.frame.w, plain.frame.h);
  comparisonContext.drawImage(
    state.staticAtlas,
    shadow.frame.x,
    shadow.frame.y,
    shadow.frame.w,
    shadow.frame.h,
    0,
    0,
    shadow.frame.w,
    shadow.frame.h
  );
  const shadowPixels = comparisonContext.getImageData(0, 0, shadow.frame.w, shadow.frame.h).data;
  dockShadowExtensionRows = [];
  for (let y = 0; y < shadow.frame.h; y++) {
    for (let x = 0; x < shadow.frame.w; x++) {
      const index = (y * shadow.frame.w + x) * 4;
      const changed =
        shadowPixels[index] !== plainPixels[index] ||
        shadowPixels[index + 1] !== plainPixels[index + 1] ||
        shadowPixels[index + 2] !== plainPixels[index + 2] ||
        shadowPixels[index + 3] !== plainPixels[index + 3];
      if (!changed || shadowPixels[index + 3] === 0) continue;
      dockShadowExtensionRows.push({
        x,
        y,
        color: `rgba(${shadowPixels[index]}, ${shadowPixels[index + 1]}, ${shadowPixels[index + 2]}, ${shadowPixels[index + 3] / 255})`
      });
      break;
    }
  }
  return dockShadowExtensionRows;
}

function drawOceanSlice(frame, slice, timeMs) {
  const latitudeFrame = latitudeWaterFrame(state.staticAtlas, frame, PORT_SCENE_HORIZON_SHIFT_Y);
  const viewportWindow = sceneWindow(slice.depth);
  const frameTop = frame.spriteSourceSize.y + PORT_SCENE_HORIZON_SHIFT_Y;
  const frameBottom = PORT_SCENE_MASTER.height;
  const top = Math.max(slice.top, frameTop, Math.floor(viewportWindow.y));
  const bottom = Math.min(slice.bottom, frameBottom, Math.ceil(viewportWindow.y + viewportWindow.height));
  if (bottom <= top) return;

  let bandTop = top;
  let bandOffset = oceanRowOffset(top, timeMs);
  let bandWindow = sceneWindow(cityOceanParallaxDepth(top));
  let bandCameraX = Math.round(bandWindow.x);
  for (let masterY = top + 1; masterY <= bottom; masterY++) {
    const offset = masterY === bottom ? Number.NaN : oceanRowOffset(masterY, timeMs);
    const window = masterY === bottom ? null : sceneWindow(cityOceanParallaxDepth(masterY));
    const cameraX = window ? Math.round(window.x) : Number.NaN;
    if (offset === bandOffset && cameraX === bandCameraX) continue;
    drawWrappedOceanBand(
      latitudeFrame.atlas,
      latitudeFrame.frame,
      bandWindow,
      bandTop,
      masterY - bandTop,
      bandOffset
    );
    bandTop = masterY;
    bandOffset = offset;
    bandWindow = window;
    bandCameraX = cameraX;
  }
  drawDocksideShipWaterShadow(slice, timeMs, top, bottom);
}

function oceanRowOffset(masterY, timeMs) {
  if (prefersReducedMotion.matches) return 0;
  return cityOceanRowOffset(masterY, timeMs);
}

function drawWrappedOceanBand(atlas, frame, window, masterY, height, offset) {
  const destinationY = Math.round(masterY - window.y);
  const sourceMasterY = masterY - PORT_SCENE_HORIZON_SHIFT_Y;
  const sourceBottom = frame.spriteSourceSize.y + frame.spriteSourceSize.h;
  const copiedHeight = Math.min(height, Math.max(0, sourceBottom - sourceMasterY));
  if (copiedHeight > 0) {
    drawWrappedOceanBandPart(
      atlas,
      frame,
      frame.frame.y + sourceMasterY - frame.spriteSourceSize.y,
      copiedHeight,
      destinationY,
      copiedHeight,
      window,
      offset
    );
  }
  if (copiedHeight < height) {
    context.fillStyle = latitudeWaterCssColor("4d65b4", masterY + copiedHeight);
    context.fillRect(
      0,
      destinationY + copiedHeight,
      canvas.width,
      height - copiedHeight
    );
  }
}

function drawWrappedOceanBandPart(
  atlas,
  frame,
  sourceY,
  sourceHeight,
  destinationY,
  destinationHeight,
  window,
  offset
) {
  const rowWidth = frame.frame.w;
  let sourceX = positiveModulo(
    Math.round(window.x - frame.spriteSourceSize.x) - offset,
    rowWidth
  );
  let destinationX = 0;
  let remainingWidth = canvas.width;
  while (remainingWidth > 0) {
    const width = Math.min(rowWidth - sourceX, remainingWidth);
    context.drawImage(
      atlas,
      frame.frame.x + sourceX,
      sourceY,
      width,
      sourceHeight,
      destinationX,
      destinationY,
      width,
      destinationHeight
    );
    remainingWidth -= width;
    destinationX += width;
    sourceX = 0;
  }
}

function latitudeWaterFrame(atlas, frame, masterYOffset = 0) {
  let frameCache = latitudeWaterFrameCanvasCache.get(frame);
  if (!frameCache) {
    frameCache = new Map();
    latitudeWaterFrameCanvasCache.set(frame, frameCache);
  }
  const latitudeBandKey = `${cityWaterLatitudeBand(state.city.lat)}|${masterYOffset}`;
  const cached = frameCache.get(latitudeBandKey);
  if (cached) return cached;

  const buffer = document.createElement("canvas");
  buffer.width = frame.frame.w;
  buffer.height = frame.frame.h;
  const bufferContext = buffer.getContext("2d", { willReadFrequently: true });
  if (!bufferContext) throw new Error(`Could not create latitude water canvas for ${frame.layer || "animation"}`);
  bufferContext.imageSmoothingEnabled = false;
  bufferContext.drawImage(
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
  const imageData = bufferContext.getImageData(0, 0, buffer.width, buffer.height);
  for (let y = 0; y < buffer.height; y++) {
    const masterY = frame.spriteSourceSize.y + masterYOffset + y;
    for (let x = 0; x < buffer.width; x++) {
      const offset = (y * buffer.width + x) * 4;
      if (imageData.data[offset + 3] === 0) continue;
      const mapped = cityWaterPaletteRgb(
        imageData.data[offset],
        imageData.data[offset + 1],
        imageData.data[offset + 2],
        state.city.lat,
        masterY
      );
      imageData.data[offset] = mapped.r;
      imageData.data[offset + 1] = mapped.g;
      imageData.data[offset + 2] = mapped.b;
    }
  }
  bufferContext.putImageData(imageData, 0, 0);

  const result = Object.freeze({
    atlas: buffer,
    frame: Object.freeze({
      ...frame,
      frame: Object.freeze({ ...frame.frame, x: 0, y: 0 })
    })
  });
  frameCache.set(latitudeBandKey, result);
  return result;
}

function latitudeWaterCssColor(sourceHex, masterY) {
  const cacheKey = `${sourceHex}|${cityWaterLatitudeBand(state.city.lat)}|${cityWaterDepthIndex(masterY)}`;
  const cached = latitudeWaterCssColorCache.get(cacheKey);
  if (cached) return cached;
  const color = `#${cityWaterPaletteHexForSourceHex(sourceHex, state.city.lat, masterY)}`;
  latitudeWaterCssColorCache.set(cacheKey, color);
  return color;
}

function drawAtlasFrame(atlas, frame, window, extendLeft = false, sourceRect = null) {
  const source = sourceRect || {
    x: 0,
    y: 0,
    width: frame.frame.w,
    height: frame.frame.h
  };
  const destinationX = Math.round(frame.spriteSourceSize.x - window.x);
  const destinationY = Math.round(frame.spriteSourceSize.y + source.y - window.y);
  if (extendLeft && destinationX > 0) {
    const extensionWidth = Math.min(destinationX, source.width);
    context.save();
    context.translate(destinationX, 0);
    context.scale(-1, 1);
    context.drawImage(
      atlas,
      frame.frame.x + source.x,
      frame.frame.y + source.y,
      extensionWidth,
      source.height,
      0,
      destinationY,
      extensionWidth,
      source.height
    );
    context.restore();
  }
  context.drawImage(
    atlas,
    frame.frame.x + source.x,
    frame.frame.y + source.y,
    source.width,
    source.height,
    destinationX + source.x,
    destinationY,
    source.width,
    source.height
  );
}

function drawFrameOutline(atlas, frame, window) {
  const mask = tintedFrameCanvas(atlas, frame);
  const x = Math.round(frame.spriteSourceSize.x - window.x);
  const y = Math.round(frame.spriteSourceSize.y - window.y);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    context.drawImage(mask, x + dx, y + dy);
  }
}

function tintedFrameCanvas(atlas, frame) {
  let atlasCache = frameCanvasCache.get(atlas);
  if (!atlasCache) {
    atlasCache = new WeakMap();
    frameCanvasCache.set(atlas, atlasCache);
  }
  if (atlasCache.has(frame)) return atlasCache.get(frame);
  const mask = document.createElement("canvas");
  mask.width = frame.frame.w;
  mask.height = frame.frame.h;
  const maskContext = mask.getContext("2d");
  maskContext.imageSmoothingEnabled = false;
  maskContext.drawImage(
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
  maskContext.globalCompositeOperation = "source-in";
  maskContext.fillStyle = "#ffe55c";
  maskContext.fillRect(0, 0, mask.width, mask.height);
  atlasCache.set(frame, mask);
  return mask;
}

function drawDocksideShip(timeMs) {
  if (!state.shipImage) return;
  const placement = docksideShipPlacement(timeMs, PORT_SCENE_ENTITY_META.ship.depth);
  if (!placement) return;
  drawDocksideShipWaterlineLayers(
    state.shipWaterlineLayers,
    placement.x,
    placement.y + placement.bobY,
    placement.scale,
    timeMs,
    hashString(placement.ship.slug)
  );
}

function drawDocksideShipWaterShadow(slice, timeMs, top, bottom) {
  if (!state.shipWaterShadowImages) return;
  const placement = docksideShipPlacement(timeMs, slice.depth);
  if (!placement) return;
  const bobState = placement.bobY < 0 ? "up" : placement.bobY > 0 ? "down" : "level";
  const shadow = state.shipWaterShadowImages[bobState];
  if (!shadow) throw new Error(`Missing ${bobState} dockside water shadow: ${placement.ship.slug}`);
  const window = sceneWindow(slice.depth);
  context.save();
  context.beginPath();
  context.rect(0, Math.round(top - window.y), canvas.width, bottom - top);
  context.clip();
  context.globalCompositeOperation = SHIP_SURFACE_LIGHTING_BLEND;
  context.drawImage(
    shadow,
    placement.x,
    placement.y,
    shadow.width * placement.scale,
    shadow.height * placement.scale
  );
  context.restore();
}

function docksideShipPlacement(timeMs, depth) {
  if (!state.shipWaterlineLayers || !state.shipManifest || !state.features) return null;
  const ship = state.shipManifest.ships.find((candidate) => candidate.slug === state.shipSlug);
  if (!ship?.cityDockside) return null;
  const sideAnchor = docksideShipSideAnchor(ship);
  const window = sceneWindow(depth);
  const scale = PORT_SCENE_ENTITY_META.ship.scale;
  const berth = state.features.dock === "none"
    ? { x: 802, y: 528 }
    : { x: PORT_SCENE_DOCK.shipAccessX, y: PORT_SCENE_DOCK.shipAccessY };
  const vertical = docksideShipVerticalPlacement({
    dock: state.features.dock,
    sideAnchorY: sideAnchor.y * scale,
    submergedMinY: state.shipWaterlineLayers.submergedMinY * scale,
    beachSideY: berth.y
  });
  const postClearanceShift = state.features.dock === "none" ? 0 : docksideShipPostClearanceShift({
    rightmostOpaqueXByRow: state.shipWaterlineLayers.rightmostOpaqueXByRow,
    topY: vertical.topY + PORT_SCENE_DOCK.maximumShipBobY,
    sideAnchorX: sideAnchor.x * scale
  });
  return {
    ship,
    scale,
    bobY: clamp(
      oceanRowOffset(vertical.waterlineY, timeMs),
      -PORT_SCENE_DOCK.maximumShipBobY,
      PORT_SCENE_DOCK.maximumShipBobY
    ),
    x: Math.round(berth.x - sideAnchor.x * scale - postClearanceShift - window.x),
    y: Math.round(vertical.topY - window.y)
  };
}

function tintedDocksideWaterShadow(mask) {
  const canvas = document.createElement("canvas");
  canvas.width = mask.width;
  canvas.height = mask.height;
  const shadowContext = canvas.getContext("2d");
  shadowContext.imageSmoothingEnabled = false;
  shadowContext.drawImage(mask, 0, 0);
  shadowContext.globalCompositeOperation = "source-in";
  shadowContext.fillStyle = shipLightingCssColor("shadow");
  shadowContext.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

function drawDocksideShipWaterlineLayers(layers, x, y, scale, timeMs, seed) {
  const refractionTime = prefersReducedMotion.matches ? 0 : timeMs;
  context.save();
  context.globalAlpha = SHIP_SUBMERGED_ALPHA;
  const firstBandY = Math.floor(layers.submergedMinY / SHIP_REFRACTION_BAND_HEIGHT) *
    SHIP_REFRACTION_BAND_HEIGHT;
  for (
    let sourceY = firstBandY;
    sourceY <= layers.submergedMaxY;
    sourceY += SHIP_REFRACTION_BAND_HEIGHT
  ) {
    const sourceHeight = Math.min(SHIP_REFRACTION_BAND_HEIGHT, layers.height - sourceY);
    context.drawImage(
      layers.submerged,
      0,
      sourceY,
      layers.width,
      sourceHeight,
      x + liveShipRefractionOffset(sourceY, refractionTime, seed),
      y + sourceY * scale,
      layers.width * scale,
      sourceHeight * scale
    );
  }
  context.restore();
  context.drawImage(
    layers.above,
    x,
    y,
    layers.width * scale,
    layers.height * scale
  );
  context.drawImage(
    layers.waterline,
    x,
    y,
    layers.width * scale,
    layers.height * scale
  );
}

function docksideShipWaterlineLayers(shipImage, sinkDepthImage, slug, waterlineRgb) {
  if (
    shipImage.width !== sinkDepthImage.width ||
    shipImage.height !== sinkDepthImage.height
  ) {
    throw new Error(`Dockside ship waterline bake has mismatched dimensions: ${slug}`);
  }
  const source = document.createElement("canvas");
  source.width = shipImage.width;
  source.height = shipImage.height;
  const sourceContext = source.getContext("2d", { willReadFrequently: true });
  sourceContext.drawImage(shipImage, 0, 0);
  const color = sourceContext.getImageData(0, 0, source.width, source.height);
  sourceContext.clearRect(0, 0, source.width, source.height);
  sourceContext.drawImage(sinkDepthImage, 0, 0);
  const depth = sourceContext.getImageData(0, 0, source.width, source.height);
  const pixels = [];
  for (let pixel = 0; pixel < source.width * source.height; pixel++) {
    const offset = pixel * 4;
    if (color.data[offset + 3] <= 16) continue;
    if (depth.data[offset + 3] <= 16) {
      throw new Error(`Dockside ship waterline bake misses an opaque pixel: ${slug}`);
    }
    pixels.push({
      x: pixel % source.width,
      y: Math.floor(pixel / source.width),
      sinkHeight: depth.data[offset] / 255
    });
  }
  const submergedKeys = floatingShipSubmergedPixelKeysForDimensions(
    pixels,
    source.width,
    source.height,
    shipMaxRasterWaterlineDepth(slug)
  );
  const waterlineKeys = docksideShipWaterlinePixelKeys(
    submergedKeys,
    source.width,
    source.height
  );
  const above = document.createElement("canvas");
  const submerged = document.createElement("canvas");
  const waterline = document.createElement("canvas");
  above.width = submerged.width = waterline.width = source.width;
  above.height = submerged.height = waterline.height = source.height;
  const aboveContext = above.getContext("2d");
  const submergedContext = submerged.getContext("2d");
  const waterlineContext = waterline.getContext("2d");
  const aboveImage = aboveContext.createImageData(source.width, source.height);
  const submergedImage = submergedContext.createImageData(source.width, source.height);
  const waterlineImage = waterlineContext.createImageData(source.width, source.height);
  let submergedMinY = source.height;
  let submergedMaxY = -1;
  let opaqueMaxY = -1;
  const rightmostOpaqueXByRow = new Int32Array(source.height);
  rightmostOpaqueXByRow.fill(-1);
  for (const pixel of pixels) {
    opaqueMaxY = Math.max(opaqueMaxY, pixel.y);
    rightmostOpaqueXByRow[pixel.y] = Math.max(rightmostOpaqueXByRow[pixel.y], pixel.x);
    const key = pixel.y * source.width + pixel.x;
    const offset = key * 4;
    const target = submergedKeys.has(key) ? submergedImage.data : aboveImage.data;
    target[offset] = color.data[offset];
    target[offset + 1] = color.data[offset + 1];
    target[offset + 2] = color.data[offset + 2];
    target[offset + 3] = color.data[offset + 3];
    if (target === submergedImage.data) {
      submergedMinY = Math.min(submergedMinY, pixel.y);
      submergedMaxY = Math.max(submergedMaxY, pixel.y);
    }
  }
  for (const key of waterlineKeys) {
    const offset = key * 4;
    waterlineImage.data[offset] = waterlineRgb.r;
    waterlineImage.data[offset + 1] = waterlineRgb.g;
    waterlineImage.data[offset + 2] = waterlineRgb.b;
    waterlineImage.data[offset + 3] = 255;
  }
  aboveContext.putImageData(aboveImage, 0, 0);
  submergedContext.putImageData(submergedImage, 0, 0);
  waterlineContext.putImageData(waterlineImage, 0, 0);
  if (submergedMaxY < 0) submergedMinY = opaqueMaxY;
  return Object.freeze({
    above,
    submerged,
    waterline,
    width: source.width,
    height: source.height,
    rightmostOpaqueXByRow,
    submergedMinY,
    submergedMaxY
  });
}

function drawNpcs(timeMs) {
  if (!state.minifolkManifest || !state.features) return;
  const window = sceneWindow(PORT_SCENE_ENTITY_META.npcs.depth);
  const time = prefersReducedMotion.matches ? 0 : timeMs;
  for (const agent of state.npcAgents.slice(0, state.features.npcs)) {
    const character = state.minifolkManifest.characters[agent.characterIndex % state.minifolkManifest.characters.length];
    const atlas = state.minifolkAtlases.get(character.id);
    const cycle = (time * agent.speed + agent.phase) % 2;
    const progress = cycle <= 1 ? cycle : 2 - cycle;
    const facingRight = cycle <= 1;
    const x = agent.startX + (agent.endX - agent.startX) * progress;
    const frame = animationFrame(character.frames, time + agent.phase * 1000);
    const dx = Math.round(x + frame.spriteSourceSize.x - window.x);
    const dy = Math.round(agent.feetY - frame.sourceSize.h + frame.spriteSourceSize.y - window.y);
    if (facingRight) {
      context.drawImage(atlas, frame.frame.x, frame.frame.y, frame.frame.w, frame.frame.h, dx, dy, frame.frame.w, frame.frame.h);
    } else {
      context.save();
      context.translate(dx + frame.frame.w, 0);
      context.scale(-1, 1);
      context.drawImage(atlas, frame.frame.x, frame.frame.y, frame.frame.w, frame.frame.h, 0, dy, frame.frame.w, frame.frame.h);
      context.restore();
    }
  }
}

function drawSceneLabels() {
  const cityLabel = state.city.label.toUpperCase();
  pixelText.draw(cityLabel, 8, 8, {
    color: "#ffffff",
    font: CITY_PIXEL_FONT_TITLE_8
  });

  if (state.hoveredDestination) {
    const label = state.hoveredDestination.label.toUpperCase();
    const width = pixelText.measure(label, CITY_PIXEL_FONT_SMALL_8) + 10;
    const x = Math.round((canvas.width - width) / 2);
    const y = canvas.height - 22;
    drawLabelPlate(x, y, width, 15);
    pixelText.draw(label, x + 5, y + 2, {
      color: "#ffe55c",
      font: CITY_PIXEL_FONT_SMALL_8
    });
  }
}

function drawLabelPlate(x, y, width, height) {
  context.fillStyle = "rgb(10 16 12 / 82%)";
  context.fillRect(x, y, width, height);
  context.strokeStyle = "#9c824b";
  context.lineWidth = 1;
  context.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
}

function updateHover() {
  if (!state.ready || !state.pointer || !state.features) return;
  const activeLayers = activePortSceneLayers(state.features);
  const destinations = DESTINATIONS.filter((destination) => (
    (!destination.requiresFortification || state.features.fortified) &&
    (!destination.requiredFeature || state.features[destination.requiredFeature])
  ));
  state.hoveredDestination = destinations.find((destination) => destination.layers.some((layerName) => {
    if (!activeLayers.has(layerName)) return false;
    return state.portManifest.staticFrames
      .filter((frame) => frame.layer === layerName)
      .some((frame, occurrence) => {
        const window = sceneWindow(
          layerParallaxDepth(layerName, occurrence),
          layerSceneOffsetX(layerName, occurrence, state.features?.approach || "ocean"),
          layerSceneOffsetY(layerName, occurrence, state.features?.approach || "ocean"),
          layerParallaxAnchor(layerName, occurrence)
        );
        const masterX = state.pointer.x + window.x;
        const masterY = state.pointer.y + window.y;
        const regionalFrame = regionalStaticFrame(frame, layerName);
        return frameContainsOpaquePixel(
          regionalFrame?.atlas || state.staticAtlas,
          regionalFrame?.frame || frame,
          masterX,
          masterY
        );
      });
  })) || null;
  canvas.classList.toggle("is-actionable", Boolean(state.hoveredDestination));
  canvas.setAttribute(
    "aria-label",
    `${state.city.label}, ${state.city.country}${state.hoveredDestination ? `, ${state.hoveredDestination.label}` : ""}`
  );
}

function frameContainsOpaquePixel(atlas, frame, masterX, masterY) {
  const localX = Math.floor(masterX - frame.spriteSourceSize.x);
  const localY = Math.floor(masterY - frame.spriteSourceSize.y);
  if (localX < -1 || localY < -1 || localX > frame.frame.w || localY > frame.frame.h) return false;
  const alpha = frameAlpha(frame, atlas);
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = localX + dx;
      const y = localY + dy;
      if (x < 0 || y < 0 || x >= frame.frame.w || y >= frame.frame.h) continue;
      if (alpha[x + y * frame.frame.w] > 16) return true;
    }
  }
  return false;
}

function frameAlpha(frame, atlas = state.staticAtlas) {
  let atlasCache = alphaCache.get(atlas);
  if (!atlasCache) {
    atlasCache = new WeakMap();
    alphaCache.set(atlas, atlasCache);
  }
  if (atlasCache.has(frame)) return atlasCache.get(frame);
  const buffer = document.createElement("canvas");
  buffer.width = frame.frame.w;
  buffer.height = frame.frame.h;
  const bufferContext = buffer.getContext("2d", { willReadFrequently: true });
  bufferContext.drawImage(
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
  const rgba = bufferContext.getImageData(0, 0, buffer.width, buffer.height).data;
  const alpha = new Uint8Array(buffer.width * buffer.height);
  for (let index = 0; index < alpha.length; index++) alpha[index] = rgba[index * 4 + 3];
  atlasCache.set(frame, alpha);
  return alpha;
}

function createNpcAgents(cityId) {
  let seed = hashString(cityId);
  const paths = [
    [900, 1005, 518],
    [960, 1070, 544],
    [1020, 1132, 518],
    [1080, 1185, 548],
    [1140, 1242, 520],
    [970, 1120, 565]
  ];
  return paths.map(([startX, endX, feetY], index) => {
    seed = xorshift(seed);
    return Object.freeze({
      startX,
      endX,
      feetY,
      phase: ((seed >>> 0) % 1000) / 500,
      speed: 0.00012 + ((seed >>> 12) & 255) / 1_000_000,
      characterIndex: index
    });
  });
}

function animationFrame(frames, timeMs) {
  const duration = frames.reduce((sum, frame) => sum + frame.duration, 0);
  let elapsed = duration === 0 ? 0 : timeMs % duration;
  for (const frame of frames) {
    if (elapsed < frame.duration) return frame;
    elapsed -= frame.duration;
  }
  return frames[frames.length - 1];
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clamp((event.clientX - rect.left) / rect.width * canvas.width, 0, canvas.width),
    y: clamp((event.clientY - rect.top) / rect.height * canvas.height, 0, canvas.height)
  };
}

function option(value, label) {
  const entry = document.createElement("option");
  entry.value = value;
  entry.textContent = label;
  return entry;
}

function setOptions(select, values) {
  select.replaceChildren(...values.map((value) => option(value, humanize(value))));
}

function setLabeledOptions(select, values) {
  select.replaceChildren(...values.map(({ value, label }) => option(value, label)));
}

function autoValue(value) {
  return value === "auto" ? undefined : value;
}

function humanize(value) {
  return String(value).replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function incrementOccurrence(map, layerName) {
  const next = (map.get(layerName) || 0) + 1;
  map.set(layerName, next);
  return next;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url}: HTTP ${response.status}`);
  return response.json();
}

function loadImage(url) {
  if (imageCache.has(url)) return imageCache.get(url);
  const request = new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load image: ${url}`));
    image.src = url;
  });
  imageCache.set(url, request);
  return request;
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0 || 1;
}

function xorshift(value) {
  let next = value >>> 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  return next >>> 0;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function positiveModulo(value, modulus) {
  return ((value % modulus) + modulus) % modulus;
}
