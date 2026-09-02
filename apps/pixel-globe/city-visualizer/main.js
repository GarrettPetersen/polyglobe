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
  BACKGROUND_CITY_UNDERLAY_LAYERS,
  activePortSceneLayers,
  advanceSceneParallax,
  advanceSceneScrollVelocity,
  citySetSailOceanRect,
  cityStaticSceneCacheAllowed,
  docksideShipSideAnchor,
  docksideShipPostClearanceShift,
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
  sceneCameraParallaxBounds,
  sceneEdgeScrollVelocity,
  sceneInertialPanTargetVelocity,
  scenePanParallaxDelta,
  sceneReasonRows
} from "./citySceneRules.js";
import {
  PIRATE_MENU_CHART_LINE,
  PIRATE_MENU_INK,
  PIRATE_MENU_PAPER,
  PIRATE_MENU_PAPER_SELECTED
} from "../src/pirateUiPalette.js";
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
  cityWaterPaletteRgb,
  cityWaterPaletteRgbAt
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
import { cityTreePlacements } from "./cityTrees.js";
import { cityQuayCargoPlacements } from "./cityQuayCargo.js";
import {
  CITY_SHIPYARD_SALE_SHIP_MAX_COUNT,
  cityShipyardSaleShipContainsPoint,
  cityShipyardSaleShipPlacements,
  cityShipyardSaleShipSlugs,
  validateCityShipSideViewManifest
} from "./cityShipyardSaleShips.js";
import {
  CITY_GATE_FRONT_PAINTER_Z,
  cityGroundPainterZ,
  cityNpcPathPoint,
  cityNpcPaths
} from "./cityPainterOrder.js";
import {
  CITY_SHIPYARD_FRONT_Z,
  cityShipyardConstructionPlacement,
  validateCityShipyardConstruction
} from "./cityShipyardConstruction.js";
import {
  cityGarrisonAppearanceIds,
  citySuspiciousMerchantAppearanceId,
  createCityPeopleAgents,
  validateCityPeopleManifest
} from "./cityPeople.js";
import { PORT_CITY_LOCATION } from "../src/portCityNavigation.js";
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
  cityWindFromGeographicWind,
  cityWindForCity
} from "./cityWind.js";
import { cityPrecipitationParticles } from "./cityPrecipitation.js";
import {
  CITY_CLOUD_SPECS,
  advanceCityCloudDrift,
  cityCloudDrawPositions,
  cityCloudSpec
} from "./cityClouds.js";
import {
  createPerformanceBenchmarkState,
  recordPerformanceBenchmarkFrame,
  recordPerformanceBenchmarkStage
} from "../src/performanceBenchmark.js";
import { cityVisualizerBenchmarkFromSearch } from "./cityVisualizerBenchmark.js";
import { createCachedSceneRenderer } from "../src/cachedSceneRenderer.js";
import {
  FIRE_FRAME_COUNT,
  FIRE_FRAME_HEIGHT,
  FIRE_FRAME_MS,
  FIRE_FRAME_WIDTH,
  FIRE_VARIANT_COUNT,
  fireAnimationFrame,
  fireVariantIndex
} from "../src/fireEffects.js";
import { darkerResurrect64Hex } from "../src/waterLatitudePalette.js";
import { shipyardConstructionFillPixels } from "../src/shipyardConstructionArt.js";
import {
  CITY_STATIC_SCENE_ENTRY_KINDS
} from "./cityStaticSceneProjection.js";
import {
  CITY_DOCKSIDE_SHADOW_STATES,
  cityDocksideAssetUrls,
  cityFlagAssetUrl,
  indexCitySideViewShips,
  publicCityAssetUrl,
  requireCityDocksideShip,
  requireCityFlag,
  requireCitySideViewShip,
  validateCityDocksideShipManifest,
  validateCityFlagManifest
} from "./citySceneAssetContracts.js";
import {
  cityBombardmentBuildingIsAffected,
  cityBombardmentDamage,
  cityBombardmentLayerIsDamageable,
  cityBombardmentSeed
} from "./cityBombardmentDamage.js";

export async function createCitySceneRuntime({
  canvas,
  stage = null,
  loading = null,
  controls = null,
  assetBaseUrl = "./assets",
  catalogUrl = "./data/cities.json",
  initialCityId = null,
  initialShipSlug = null,
  initialSaleShipSlugs = null,
  externalFrameClock = false,
  separateEmissiveOverlay = false,
  benchmark = null,
  onDestination = null,
  renderText = (text) => text,
  smallFontForText = (_text) => CITY_PIXEL_FONT_SMALL_8,
  titleFontForText = (_text) => CITY_PIXEL_FONT_TITLE_8
} = {}) {
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new TypeError("City scene runtime requires an HTML canvas");
}
if (typeof separateEmissiveOverlay !== "boolean") {
  throw new TypeError("City scene runtime requires an explicit emissive-overlay mode");
}
for (const [label, callback] of Object.entries({ renderText, smallFontForText, titleFontForText })) {
  if (typeof callback !== "function") throw new TypeError(`City scene runtime requires ${label}`);
}
const context = canvas.getContext("2d", { alpha: false });
if (!context) throw new Error("City scene runtime could not create its 2D canvas context");
const emissiveCanvas = separateEmissiveOverlay ? document.createElement("canvas") : null;
const emissiveContext = emissiveCanvas?.getContext("2d") || null;
if (separateEmissiveOverlay && !emissiveContext) {
  throw new Error("City scene runtime could not create its emissive overlay context");
}
const pixelText = createCityPixelTextRenderer(context, () => document.createElement("canvas"));
const inertControl = (value = "auto") => ({ value });
const citySelect = controls?.citySelect || inertControl("");
const viewportSelect = controls?.viewportSelect || inertControl("auto");
const shipSelect = controls?.shipSelect || inertControl("");
const approachOverride = controls?.approachOverride || inertControl();
const leftBankCityOverride = controls?.leftBankCityOverride || inertControl();
const dockOverride = controls?.dockOverride || inertControl();
const fortOverride = controls?.fortOverride || inertControl();
const mountainOverride = controls?.mountainOverride || inertControl();
const leftTerrainOverride = controls?.leftTerrainOverride || inertControl();
const rightTerrainOverride = controls?.rightTerrainOverride || inertControl();
const windSpeedOverride = controls?.windSpeedOverride || inertControl();
const windDirectionOverride = controls?.windDirectionOverride || inertControl();
const bombardmentToggle = controls?.bombardmentToggle || null;
const resetOverrides = controls?.resetOverrides || null;
const ruleLedger = controls?.ruleLedger || null;
const destinationDialog = controls?.destinationDialog || null;
const destinationTitle = controls?.destinationTitle || null;
const destinationCopy = controls?.destinationCopy || null;

const prefersReducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const imageCache = new Map();
const frameCanvasCache = new WeakMap();
const backgroundCityAtmosphereCanvasCache = new WeakMap();
const regionalStaticFrameCanvasCache = new Map();
const alphaCache = new WeakMap();
const imageAlphaCache = new WeakMap();
const animatedRowEdgeCache = new WeakMap();
const latitudeWaterFrameCanvasCache = new WeakMap();
const latitudeWaterCssColorCache = new Map();
const docksideShipPresentationPromiseCache = new Map();
const bombardmentFrameCache = new Map();
const bombardmentScaledHoleRunCache = new WeakMap();
const MAX_DOCKSIDE_SHIP_PRESENTATIONS = 4;
const CITY_VISUALIZER_BENCHMARK = benchmark ?? (
  externalFrameClock ? null : cityVisualizerBenchmarkFromSearch(window.location.search)
);
const STATIC_SCENE_ENTRY_KINDS = new Set(CITY_STATIC_SCENE_ENTRY_KINDS);
const BACKGROUND_CITY_UNDERLAY_LAYER_NAMES = new Set(
  Object.values(BACKGROUND_CITY_UNDERLAY_LAYERS)
);
const CITY_VISUALIZER_DEFAULT_CITY_ID = "london|united kingdom";
let dockShadowExtensionRows = null;
let beachOpaqueRowRuns = null;
let renderFrameId = null;
let bombardmentOverlayFrameCache = null;
const state = {
  ready: false,
  catalog: null,
  portManifest: null,
  peopleManifest: null,
  shipManifest: null,
  docksideShipCatalog: null,
  shipSideViewManifest: null,
  sideViewShipsBySlug: null,
  sideViewRastersBySlug: null,
  saleShipRastersBySlug: null,
  flagCatalog: null,
  flagImagesByFactionId: null,
  treeManifest: null,
  staticAtlas: null,
  waveAtlas: null,
  surfAtlas: null,
  treeAtlas: null,
  peopleAtlas: null,
  fireAtlas: null,
  peopleById: new Map(),
  shipImage: null,
  shipOutline: null,
  shipSinkDepthImage: null,
  shipWaterlineLayers: null,
  shipWaterShadowImages: null,
  shipSlug: null,
  shipyardSaleShips: [],
  shipyardSaleShipPlacements: [],
  shipyardConstructionPlacement: null,
  cityFlagFactionId: null,
  cityFlagImage: null,
  wind: null,
  precipitation: Object.freeze({ kind: null, intensity: 0 }),
  weatherSignature: null,
  precipitationFrameCache: null,
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
  hoveredShipyardSaleShipId: null,
  focusedDestinationId: null,
  availableDestinationIds: null,
  barred: false,
  illicitCaughtStartedAtMs: null,
  bombardmentEventId: null,
  specialAgents: [],
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
  treePlacements: [],
  quayCargoPlacements: [],
  npcAgents: [],
  renderCount: 0,
  benchmarkState: null
};
let citySelectionSerial = 0;
const citySceneRenderer = createCachedSceneRenderer({
  displayContext: context,
  createSurface: createCitySceneCacheSurface,
  drawEntry: drawMeasuredSceneEntry,
  isStaticEntry: (entry) => STATIC_SCENE_ENTRY_KINDS.has(entry.kind)
});

const DESTINATIONS = Object.freeze([
  Object.freeze({
    id: PORT_CITY_LOCATION.SET_SAIL,
    label: "Set Sail",
    layers: Object.freeze([]),
    copy: "This leaves port."
  }),
  Object.freeze({
    id: PORT_CITY_LOCATION.SHIPYARD,
    label: "Shipyard",
    layers: Object.freeze(["Shipyard"]),
    copy: "This will open the existing shipyard modal: repairs, outfitting, and available hulls."
  }),
  Object.freeze({
    id: PORT_CITY_LOCATION.MARKET,
    label: "Market",
    layers: Object.freeze(["Market Stall", "Market Stall Copy", "Market Stall Copy Copy"]),
    requiredFeature: "market",
    copy: "This will open the existing market modal for regional cargo and prices."
  }),
  Object.freeze({
    id: PORT_CITY_LOCATION.EQUIPMENT,
    label: "Smith",
    layers: Object.freeze(["Smith"]),
    requiredFeature: "store",
    copy: "This will open the existing item-store modal for weapons, tools, and supplies."
  }),
  Object.freeze({
    id: PORT_CITY_LOCATION.INN,
    label: "Inn",
    layers: Object.freeze(["Inn", "Home 2"]),
    copy: "This will open the existing inn flow for rumours, quests, and recruitable characters."
  }),
  Object.freeze({
    id: PORT_CITY_LOCATION.AUTHORITY,
    label: "Port authority",
    layers: Object.freeze(["Far Castle", "Gate", "Near Castle"]),
    copy: "This will become the entry point for garrison business and the city-storming encounter."
  }),
  Object.freeze({
    id: PORT_CITY_LOCATION.SHIP,
    label: "Your ship",
    layers: Object.freeze([]),
    copy: "This opens the ship menu."
  }),
  Object.freeze({
    id: PORT_CITY_LOCATION.ILLICIT_MERCHANT,
    label: "Suspicious merchant",
    layers: Object.freeze([]),
    copy: "This attempts to trade illicitly."
  })
]);

async function initialize() {
  try {
    const [
      catalog,
      portManifest,
      peopleManifest,
      shipManifest,
      shipSideViewManifest,
      treeManifest,
      flagManifest
    ] = await Promise.all([
      fetchJson(catalogUrl),
      fetchJson(`${assetBaseUrl}/port-parallax/manifest.json`, { cache: "no-store" }),
      fetchJson(`${assetBaseUrl}/minifolks/manifest.json`),
      fetchJson("/assets/vehicles/unity-ships/port-assault/manifest.json"),
      fetchJson("/assets/vehicles/unity-ships/side-views/manifest.json"),
      fetchJson(`${assetBaseUrl}/trees/manifest.json`),
      fetchJson("/assets/factions/flags/manifest.json"),
      loadRequiredCityFont(CITY_PIXEL_FONT_SMALL_8),
      loadRequiredCityFont(CITY_PIXEL_FONT_TITLE_8)
    ]);
    state.catalog = catalog;
    state.portManifest = portManifest;
    state.peopleManifest = validateCityPeopleManifest(peopleManifest);
    state.peopleById = new Map(
      state.peopleManifest.appearances.map((appearance) => [appearance.id, appearance])
    );
    state.shipManifest = shipManifest;
    state.docksideShipCatalog = validateCityDocksideShipManifest(shipManifest);
    state.shipSideViewManifest = validateCityShipSideViewManifest(shipSideViewManifest);
    state.sideViewShipsBySlug = indexCitySideViewShips(state.shipSideViewManifest);
    state.flagCatalog = validateCityFlagManifest(flagManifest);
    state.treeManifest = treeManifest;
    [
      state.staticAtlas,
      state.waveAtlas,
      state.surfAtlas,
      state.treeAtlas,
      state.peopleAtlas,
      state.fireAtlas
    ] = await Promise.all([
      loadImage(portAtlasUrl(portManifest, portManifest.staticSheet)),
      loadImage(portAtlasUrl(portManifest, portManifest.animated?.Waves?.sheet)),
      loadImage(portAtlasUrl(portManifest, portManifest.animated?.Surf?.sheet)),
      loadImage(`${assetBaseUrl}/trees/${treeManifest.sheet}`),
      loadImage(`${assetBaseUrl}/minifolks/${state.peopleManifest.sheet}`),
      loadImage("/assets/misc/fire.png?v=fire-effect-2")
    ]);
    if (
      state.fireAtlas.width !== FIRE_FRAME_WIDTH * FIRE_FRAME_COUNT ||
      state.fireAtlas.height !== FIRE_FRAME_HEIGHT * FIRE_VARIANT_COUNT
    ) {
      throw new Error(
        `City fire atlas has invalid dimensions: ${state.fireAtlas.width}x${state.fireAtlas.height}`
      );
    }
    prepareScenePixelCaches();
    await preloadSharedCitySceneImages();
    if (controls) prepareControls();
    await selectInitialCity();
    if (!externalFrameClock) resizeLogicalCanvas();
    else if (canvas.width <= 0 || canvas.height <= 0) {
      throw new Error("Externally clocked city scene requires explicit canvas dimensions");
    }
    state.ready = true;
    if (loading) loading.hidden = true;
    if (CITY_VISUALIZER_BENCHMARK) setupCityVisualizerBenchmark();
    if (!externalFrameClock) scheduleRender();
  } catch (error) {
    console.error(error);
    if (loading) {
      loading.hidden = false;
      loading.textContent = error instanceof Error ? error.message : String(error);
    }
    throw error;
  }
}

async function loadRequiredCityFont(font) {
  if (!document.fonts || typeof document.fonts.load !== "function") {
    throw new Error("City scene requires the browser FontFaceSet loading contract");
  }
  const faces = await document.fonts.load(font);
  if (!faces || faces.length === 0) throw new Error(`City scene font did not load: ${font}`);
}

async function preloadSharedCitySceneImages() {
  const [flagEntries, sideViewEntries] = await Promise.all([
    Promise.all(state.flagCatalog.manifest.factions.map(async (flag) => {
      const image = await loadImage(cityFlagAssetUrl(flag));
      if (image.width !== flag.width || image.height !== flag.height) {
        throw new Error(
          `City flag ${flag.id} must be ${flag.width}x${flag.height}, ` +
          `got ${image.width}x${image.height}`
        );
      }
      return [flag.id, image];
    })),
    Promise.all(state.shipSideViewManifest.ships.map(async (ship) => {
      const image = await loadImage(publicCityAssetUrl(ship.file));
      if (image.width !== ship.width || image.height !== ship.height) {
        throw new Error(
          `City ship side view has mismatched dimensions: ${ship.slug} ` +
          `${image.width}x${image.height}`
        );
      }
      return [ship.slug, cityShipSideViewRaster(ship, image)];
    }))
  ]);
  state.flagImagesByFactionId = new Map(flagEntries);
  state.sideViewRastersBySlug = new Map(sideViewEntries);
  state.saleShipRastersBySlug = new Map(sideViewEntries.map(([shipSlug, raster]) => [
    shipSlug,
    cityShipyardSaleShipRaster(raster)
  ]));
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

  citySelect.addEventListener("change", () => {
    void selectCity(citySelect.value).catch(reportVisualizerError);
  });
  viewportSelect.addEventListener("change", resizeLogicalCanvas);
  shipSelect.addEventListener("change", () => {
    void selectShip(shipSelect.value).catch(reportVisualizerError);
  });
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
  if (!bombardmentToggle) throw new Error("City visualizer is missing its bombardment toggle");
  bombardmentToggle.addEventListener("change", () => {
    setBombardmentEventId(bombardmentToggle.checked ? "visualizer-test-bombardment" : null);
  });
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
    bombardmentToggle.checked = false;
    state.bombardmentEventId = null;
    bombardmentFrameCache.clear();
    bombardmentOverlayFrameCache = null;
    applyFeatureOverrides();
  });
}

async function selectInitialCity() {
  const searchParams = externalFrameClock ? null : new URL(location.href).searchParams;
  const requested = initialCityId ?? (
    searchParams?.get("city") || null
  );
  await selectCity(requested ?? CITY_VISUALIZER_DEFAULT_CITY_ID, {
    playerShipSlug: initialShipSlug,
    saleShipSlugs: initialSaleShipSlugs,
    bombardmentEventId: searchParams
      ? visualizerBombardmentEventIdFromSearch(searchParams)
      : null
  });
}

function visualizerBombardmentEventIdFromSearch(searchParams) {
  const raw = searchParams.get("bombarded");
  if (raw === null || raw === "0") return null;
  if (raw === "1") return "visualizer-test-bombardment";
  throw new Error(`Invalid bombarded query value: ${raw}`);
}

async function selectCity(cityId, {
  playerShipSlug = null,
  saleShipSlugs = null,
  availableDestinationIds = null,
  factionId = null,
  label = null,
  shipyardConstruction = null,
  barred = false,
  illicitCaughtStartedAtMs = null,
  bombardmentEventId = null
} = {}) {
  const serial = ++citySelectionSerial;
  const city = resolveCityRecord(cityId, { factionId, label });
  const validatedDestinationIds = availableDestinationIds === null
    ? null
    : validateAvailableDestinationIds(availableDestinationIds);
  if (typeof barred !== "boolean") throw new Error(`Invalid barred city state: ${barred}`);
  if (illicitCaughtStartedAtMs !== null &&
      (!Number.isFinite(illicitCaughtStartedAtMs) || illicitCaughtStartedAtMs < 0)) {
    throw new Error(`Invalid illicit-trade city event time: ${illicitCaughtStartedAtMs}`);
  }
  validateBombardmentEventId(bombardmentEventId);
  const prepared = await preloadCitySelection(city, {
    playerShipSlug,
    saleShipSlugs,
    shipyardConstruction
  });
  if (serial !== citySelectionSerial) return;

  state.city = city;
  state.availableDestinationIds = validatedDestinationIds;
  state.barred = barred;
  state.illicitCaughtStartedAtMs = illicitCaughtStartedAtMs;
  state.bombardmentEventId = bombardmentEventId;
  bombardmentFrameCache.clear();
  bombardmentOverlayFrameCache = null;
  state.focusedDestinationId = null;
  state.cityFlagFactionId = city.factionId;
  state.cityFlagImage = prepared.cityFlagImage;
  state.shipSlug = prepared.ship.slug;
  state.shipImage = prepared.shipPresentation.shipImage;
  state.shipOutline = prepared.shipPresentation.shipOutline;
  state.shipSinkDepthImage = prepared.shipPresentation.shipSinkDepthImage;
  state.shipWaterlineLayers = prepared.shipPresentation.shipWaterlineLayers;
  state.shipWaterShadowImages = prepared.shipPresentation.shipWaterShadowImages;
  state.shipyardSaleShips = prepared.saleShips;
  state.shipyardSaleShipPlacements = cityShipyardSaleShipPlacements(prepared.saleShips);
  state.shipyardConstructionPlacement = prepared.shipyardConstructionPlacement;
  citySelect.value = city.id;
  shipSelect.value = prepared.ship.slug;
  canvas.setAttribute("aria-label", `${renderText(city.label)}, ${renderText(city.country)}`);
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
  if (bombardmentToggle) bombardmentToggle.checked = bombardmentEventId !== null;
  applyFeatureOverrides({ rebuild: false });
  state.parallax = sceneCameraDefaultParallax(state.features.approach);
  state.cameraVelocity = 0;
  state.cameraPanTarget = null;
  state.cloudDriftByLayer = new Map(CITY_CLOUD_SPECS.map(({ layer }) => [layer, 0]));
  state.lastCloudTimeMs = null;
  rebuildCitySceneRenderPlan();
  updateHover();
  const initialDestinations = activeDestinations();
  if (initialDestinations.length === 0) {
    state.focusedDestinationId = null;
  } else {
    const playerShipDestination = destinationById(PORT_CITY_LOCATION.SHIP);
    if (!playerShipDestination) {
      throw new Error("Interactive city scene is missing the player-ship destination");
    }
    state.focusedDestinationId = playerShipDestination.id;
  }
  if (!externalFrameClock) {
    const url = new URL(location.href);
    url.searchParams.set("city", city.id);
    history.replaceState(null, "", url);
  }
}

function resolveCityRecord(cityId, { factionId = null, label = null } = {}) {
  const catalogCity = state.catalog.cities.find((candidate) => candidate.id === cityId);
  if (!catalogCity) throw new Error(`Unknown visualizer city: ${cityId}`);
  if (factionId !== null && (typeof factionId !== "string" || factionId === "")) {
    throw new Error(`Invalid visualizer city faction: ${factionId}`);
  }
  if (label !== null && (typeof label !== "string" || label.trim() === "")) {
    throw new Error(`Invalid visualizer city label: ${label}`);
  }
  const liveFactionId = factionId ?? catalogCity.factionId;
  const liveLabel = label ?? catalogCity.label;
  return liveFactionId === catalogCity.factionId && liveLabel === catalogCity.label
    ? catalogCity
    : Object.freeze({ ...catalogCity, factionId: liveFactionId, label: liveLabel });
}

async function preloadCity(cityId, options = {}) {
  const city = resolveCityRecord(cityId, options);
  await preloadCitySelection(city, options);
}

async function preloadCitySelection(city, {
  playerShipSlug = null,
  saleShipSlugs = null,
  shipyardConstruction = null
} = {}) {
  const features = resolveCitySceneFeatures(city, {});
  const resolvedPlayerShipSlug = playerShipSlug ?? city.defaultShip;
  const resolvedSaleShipSlugs = saleShipSlugs === null
    ? cityShipyardSaleShipSlugs(city, features)
    : validateSaleShipSlugs(saleShipSlugs, city.id);
  const validatedConstruction = validateCityShipyardConstruction(shipyardConstruction);
  const ship = requireCityDocksideShip(state.docksideShipCatalog, resolvedPlayerShipSlug);
  const cityFlagImage = cityGatehouseFlagVisible({ fortified: true, factionId: city.factionId })
    ? requiredPreloadedFlagImage(city.factionId)
    : null;
  const saleShips = Object.freeze(resolvedSaleShipSlugs.map((shipSlug) => (
    requiredPreloadedSaleShip(shipSlug)
  )));
  const shipyardConstructionPlacement = validatedConstruction
    ? preparedShipyardConstructionPlacement(validatedConstruction)
    : null;
  const shipPresentation = await prepareDocksideShipPresentation(ship, city.lat);
  return Object.freeze({
    ship,
    shipPresentation,
    cityFlagImage,
    saleShips,
    shipyardConstructionPlacement
  });
}

function validateSaleShipSlugs(shipSlugs, cityId) {
  if (!Array.isArray(shipSlugs)) throw new Error(`Invalid city sale ship list: ${cityId}`);
  if (shipSlugs.length > CITY_SHIPYARD_SALE_SHIP_MAX_COUNT) {
    throw new Error(
      `City sale ship list exceeds ${CITY_SHIPYARD_SALE_SHIP_MAX_COUNT}: ${cityId}`
    );
  }
  return Object.freeze(shipSlugs.map((shipSlug) => {
    if (typeof shipSlug !== "string" || shipSlug.length === 0) {
      throw new Error(`Invalid city sale ship canonical ID: ${cityId}`);
    }
    return shipSlug;
  }));
}

function validateBombardmentEventId(eventId) {
  if (eventId !== null && (typeof eventId !== "string" || eventId === "")) {
    throw new Error(`Invalid city bombardment event ID: ${eventId}`);
  }
}

function setBombardmentEventId(eventId) {
  validateBombardmentEventId(eventId);
  if (state.bombardmentEventId === eventId) return;
  state.bombardmentEventId = eventId;
  bombardmentFrameCache.clear();
  bombardmentOverlayFrameCache = null;
  rebuildCitySceneRenderPlan();
  if (!externalFrameClock) {
    const url = new URL(location.href);
    if (eventId === null) url.searchParams.delete("bombarded");
    else url.searchParams.set("bombarded", "1");
    history.replaceState(null, "", url);
  }
}

function requiredPreloadedFlagImage(factionId) {
  const flag = requireCityFlag(state.flagCatalog, factionId);
  const image = state.flagImagesByFactionId.get(flag.id);
  if (!image) throw new Error(`City faction flag was not preloaded: ${flag.id}`);
  return image;
}

function requiredPreloadedSaleShip(shipSlug) {
  requireCitySideViewShip(state.sideViewShipsBySlug, shipSlug, "city sale ship side view");
  const raster = state.saleShipRastersBySlug.get(shipSlug);
  if (!raster) throw new Error(`City sale ship side view was not preloaded: ${shipSlug}`);
  return raster;
}

function preparedShipyardConstructionPlacement(construction) {
  requireCitySideViewShip(
    state.sideViewShipsBySlug,
    construction.shipSlug,
    "city construction ship side view"
  );
  const raster = state.sideViewRastersBySlug.get(construction.shipSlug);
  if (!raster) {
    throw new Error(`City construction ship side view was not preloaded: ${construction.shipSlug}`);
  }
  const constructionImage = cityShipyardConstructionImage(raster, construction.progress);
  return cityShipyardConstructionPlacement(
    Object.freeze({ ...raster, image: constructionImage }),
    construction.progress
  );
}

function reportVisualizerError(error) {
  console.error(error);
  if (loading) {
    loading.hidden = false;
    loading.textContent = error instanceof Error ? error.message : String(error);
  }
}

function applyFeatureOverrides({ rebuild = true } = {}) {
  bombardmentOverlayFrameCache = null;
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
  state.npcAgents = createCityPeopleAgents({
    city: state.city,
    count: state.features.npcs,
    paths: cityNpcPaths({ fortified: state.features.fortified })
  });
  state.specialAgents = createSpecialPeopleAgents();
  state.streetBuildings = cityStreetBuildingPlacements({
    features: state.features,
    frames: state.portManifest.staticFrames,
    buildingStyle: cityArchitectureStyleForLayer(state.city, "Home")
  });
  state.treePlacements = cityTreePlacements({
    city: state.city,
    features: state.features,
    trees: state.treeManifest.trees
  });
  state.quayCargoPlacements = cityQuayCargoPlacements({
    city: state.city,
    features: state.features,
    frames: state.portManifest.staticFrames
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
  if (rebuild) rebuildCitySceneRenderPlan();
}

function applyWindOverrides() {
  state.wind = cityWindForCity(state.city, {
    speed: windSpeedOverride.value,
    direction: windDirectionOverride.value
  });
  updateRuleLedger();
  updateHover();
}

async function selectShip(shipSlug) {
  const serial = ++citySelectionSerial;
  const ship = requireCityDocksideShip(state.docksideShipCatalog, shipSlug);
  const presentation = await prepareDocksideShipPresentation(ship, state.city.lat);
  if (serial !== citySelectionSerial) return;
  state.shipSlug = ship.slug;
  state.shipImage = presentation.shipImage;
  state.shipOutline = presentation.shipOutline;
  state.shipSinkDepthImage = presentation.shipSinkDepthImage;
  state.shipWaterlineLayers = presentation.shipWaterlineLayers;
  state.shipWaterShadowImages = presentation.shipWaterShadowImages;
  shipSelect.value = ship.slug;
  rebuildCitySceneRenderPlan();
  updateHover();
}

function prepareDocksideShipPresentation(ship, latitudeDeg) {
  const waterBand = cityWaterLatitudeBand(latitudeDeg);
  const cacheKey = `${ship.slug}:${waterBand}`;
  const cached = docksideShipPresentationPromiseCache.get(cacheKey);
  if (cached) {
    docksideShipPresentationPromiseCache.delete(cacheKey);
    docksideShipPresentationPromiseCache.set(cacheKey, cached);
    return cached;
  }
  const request = prepareDocksideShipPresentationUncached(ship, latitudeDeg).catch((error) => {
    if (docksideShipPresentationPromiseCache.get(cacheKey) === request) {
      docksideShipPresentationPromiseCache.delete(cacheKey);
    }
    throw error;
  });
  docksideShipPresentationPromiseCache.set(cacheKey, request);
  while (docksideShipPresentationPromiseCache.size > MAX_DOCKSIDE_SHIP_PRESENTATIONS) {
    const oldestKey = docksideShipPresentationPromiseCache.keys().next().value;
    docksideShipPresentationPromiseCache.delete(oldestKey);
  }
  return request;
}

async function prepareDocksideShipPresentationUncached(ship, latitudeDeg) {
  const assetUrls = cityDocksideAssetUrls(state.docksideShipCatalog, ship.slug);
  const [shipImage, shipSinkDepthImage, ...waterShadowMasks] = await Promise.all(
    assetUrls.map(loadTransientImage)
  );
  const { width, height } = ship.cityDockside;
  for (const [label, image] of [
    ["raster", shipImage],
    ["sink-depth raster", shipSinkDepthImage],
    ...CITY_DOCKSIDE_SHADOW_STATES.map((shadowState, index) => [
      `${shadowState} water-shadow bake`,
      waterShadowMasks[index]
    ])
  ]) {
    if (image.width !== width || image.height !== height) {
      throw new Error(
        `Dockside ${label} has mismatched dimensions: ${ship.slug} ` +
        `${image.width}x${image.height}; expected ${width}x${height}`
      );
    }
  }
  const waterlineRgb = cityWaterPaletteRgb(
    DOCKSIDE_SHIP_WATERLINE_RGB.r,
    DOCKSIDE_SHIP_WATERLINE_RGB.g,
    DOCKSIDE_SHIP_WATERLINE_RGB.b,
    latitudeDeg,
    PORT_SCENE_DOCK.waterlineY
  );
  return Object.freeze({
    shipImage,
    shipOutline: tintedImageCanvas(shipImage, "#ffe55c"),
    shipSinkDepthImage,
    shipWaterlineLayers: docksideShipWaterlineLayers(
      shipImage,
      shipSinkDepthImage,
      ship.slug,
      waterlineRgb
    ),
    shipWaterShadowImages: Object.freeze(Object.fromEntries(
      CITY_DOCKSIDE_SHADOW_STATES.map((shadowState, index) => [
        shadowState,
        tintedDocksideWaterShadow(waterShadowMasks[index])
      ])
    ))
  });
}

function cityShipyardSaleShipRaster(raster) {
  const image = raster.image;
  const outline = document.createElement("canvas");
  outline.width = raster.width;
  outline.height = raster.height;
  const outlineContext = outline.getContext("2d");
  if (!outlineContext) throw new Error(`Could not create city sale ship outline: ${raster.slug}`);
  outlineContext.imageSmoothingEnabled = false;
  outlineContext.drawImage(image, 0, 0);
  outlineContext.globalCompositeOperation = "source-in";
  outlineContext.fillStyle = "#ffe55c";
  outlineContext.fillRect(0, 0, outline.width, outline.height);
  return Object.freeze({ ...raster, outline });
}

function cityShipSideViewRaster(ship, image) {
  const source = document.createElement("canvas");
  source.width = ship.width;
  source.height = ship.height;
  const sourceContext = source.getContext("2d", { willReadFrequently: true });
  if (!sourceContext) throw new Error(`Could not create city side-view raster: ${ship.slug}`);
  sourceContext.imageSmoothingEnabled = false;
  sourceContext.drawImage(image, 0, 0);
  const pixels = sourceContext.getImageData(0, 0, source.width, source.height).data;
  const alpha = new Uint8Array(source.width * source.height);
  let minX = source.width;
  let minY = source.height;
  let maxX = -1;
  let maxY = -1;
  for (let key = 0; key < alpha.length; key++) {
    alpha[key] = pixels[key * 4 + 3];
    if (alpha[key] <= 16) continue;
    const x = key % source.width;
    const y = Math.floor(key / source.width);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  if (maxX < 0 || maxY !== ship.lowestOpaquePixelY) {
    throw new Error(`City shipyard sale side-view metadata does not match raster: ${ship.slug}`);
  }
  return Object.freeze({
    ...ship,
    image,
    alpha,
    opaqueBounds: Object.freeze({ minX, minY, maxX, maxY })
  });
}

function cityShipyardConstructionImage(ship, progress) {
  const canvas = document.createElement("canvas");
  canvas.width = ship.width;
  canvas.height = ship.height;
  const target = canvas.getContext("2d", { willReadFrequently: true });
  if (!target) throw new Error(`Could not create city construction raster: ${ship.slug}`);
  target.imageSmoothingEnabled = false;
  target.drawImage(ship.image, 0, 0);
  const source = target.getImageData(0, 0, canvas.width, canvas.height);
  const output = target.createImageData(canvas.width, canvas.height);
  output.data.set(shipyardConstructionFillPixels(
    source.data,
    canvas.width,
    canvas.height,
    progress
  ));
  target.clearRect(0, 0, canvas.width, canvas.height);
  target.putImageData(output, 0, 0);
  return canvas;
}

function updateRuleLedger() {
  if (!ruleLedger) return;
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

if (!externalFrameClock) {
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
  state.hoveredShipyardSaleShipId = null;
  canvas.classList.remove("is-actionable");
});

canvas.addEventListener("click", () => {
  if (state.suppressClick) {
    state.suppressClick = false;
    return;
  }
  const destination = state.hoveredDestination;
  if (!destination) return;
  if (onDestination) {
    onDestination(Object.freeze({ id: destination.id, saleShipId: state.hoveredShipyardSaleShipId }));
    return;
  }
  destinationTitle.textContent = destination.label;
  destinationCopy.textContent = destination.copy;
  destinationDialog.showModal();
});
}

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

function panCameraByLogicalPixels(logicalDeltaX) {
  const delta = scenePanParallaxDelta({
    screenDeltaX: logicalDeltaX,
    displayWidth: canvas.width,
    logicalWidth: canvas.width,
    approach: state.features?.approach || "ocean"
  });
  if (delta === 0) return;
  const cameraBounds = sceneCameraParallaxBounds(state.features?.approach || "ocean");
  state.cameraVelocity = 0;
  state.cameraPanTarget = null;
  state.parallax = clamp(state.parallax + delta, cameraBounds.minimum, cameraBounds.maximum);
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

function queueCameraPanByLogicalPixels(logicalDeltaX) {
  const delta = scenePanParallaxDelta({
    screenDeltaX: logicalDeltaX,
    displayWidth: canvas.width,
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
  const cameraBounds = sceneCameraParallaxBounds(state.features?.approach || "ocean");
  if (
    CITY_VISUALIZER_BENCHMARK?.cameraMode === "pan" &&
    state.cameraPanTarget === null
  ) {
    state.cameraPanTarget = state.parallax >= cameraBounds.maximum
      ? cameraBounds.minimum
      : cameraBounds.maximum;
  }
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
  renderFrameId = null;
  if (!state.ready) return;
  const cpuStartedAtMs = state.benchmarkState ? performance.now() : 0;
  try {
    if (state.benchmarkState) renderBenchmarkedCityFrame(timeMs);
    else renderCityFrame(timeMs);
    state.renderCount++;
  } finally {
    if (state.benchmarkState) {
      updateCityVisualizerBenchmark(timeMs, performance.now() - cpuStartedAtMs);
    }
    scheduleRender();
  }
}

function prepareEmissiveFrame() {
  if (!separateEmissiveOverlay) return;
  if (!emissiveCanvas || !emissiveContext) {
    throw new Error("City emissive overlay mode has no render surface");
  }
  if (emissiveCanvas.width !== canvas.width || emissiveCanvas.height !== canvas.height) {
    emissiveCanvas.width = canvas.width;
    emissiveCanvas.height = canvas.height;
  }
  emissiveContext.setTransform(1, 0, 0, 1, 0, 0);
  emissiveContext.clearRect(0, 0, emissiveCanvas.width, emissiveCanvas.height);
  emissiveContext.imageSmoothingEnabled = false;
}

function renderCityFrame(timeMs) {
  advanceCamera(timeMs);
  advanceCloudMotion(timeMs);
  prepareEmissiveFrame();
  context.imageSmoothingEnabled = false;
  context.fillStyle = "#6385c5";
  context.fillRect(0, 0, canvas.width, canvas.height);
  citySceneRenderer.renderFrame({
    timeMs,
    width: canvas.width,
    height: canvas.height,
    staticCacheKey: staticSceneCacheKey,
    useStaticCache: cityStaticCacheIsUsable()
  });
  drawCityPrecipitation(timeMs);
  drawSceneLabels();
}

function renderBenchmarkedCityFrame(timeMs) {
  measureCityBenchmarkStage("update", () => {
    advanceCamera(timeMs);
    advanceCloudMotion(timeMs);
  });
  prepareEmissiveFrame();
  context.imageSmoothingEnabled = false;
  measureCityBenchmarkStage("render.clear", () => {
    context.fillStyle = "#6385c5";
    context.fillRect(0, 0, canvas.width, canvas.height);
  });
  measureCityBenchmarkStage("render.scene", () => citySceneRenderer.renderFrame({
    timeMs,
    width: canvas.width,
    height: canvas.height,
    staticCacheKey: staticSceneCacheKey,
    useStaticCache: cityStaticCacheIsUsable()
  }));
  measureCityBenchmarkStage("render.precipitation", () => drawCityPrecipitation(timeMs));
  measureCityBenchmarkStage("render.labels", drawSceneLabels);
}

function drawCityPrecipitation(timeMs) {
  const { kind, intensity } = state.precipitation;
  if (kind === null || intensity === 0) return;
  if (!state.wind) throw new Error("City precipitation rendered before wind initialization");
  const animationTimeMs = prefersReducedMotion.matches ? 0 : Math.floor(timeMs / 33) * 33;
  const cacheKey = `${kind}:${intensity}:${animationTimeMs}:${canvas.width}x${canvas.height}`;
  if (state.precipitationFrameCache?.key !== cacheKey) {
    state.precipitationFrameCache = Object.freeze({
      key: cacheKey,
      particles: cityPrecipitationParticles({
        kind,
        intensity,
        timeMs: animationTimeMs,
        width: canvas.width,
        height: canvas.height,
        wind: state.wind
      })
    });
  }
  const particles = state.precipitationFrameCache.particles;
  context.save();
  context.fillStyle = kind === "snow" ? "#c7dcd0" : "#8fd3ff";
  for (const particle of particles) {
    context.globalAlpha = particle.alpha;
    if (kind === "rain") {
      const windTail = Math.round(state.wind.flowX * state.wind.strength * 2);
      context.fillRect(particle.x - windTail, particle.y, 1, particle.length);
    } else {
      context.fillRect(particle.x, particle.y, particle.length, particle.length);
    }
  }
  context.restore();
}

function scheduleRender() {
  if (document.visibilityState === "hidden" || renderFrameId !== null) return;
  renderFrameId = requestAnimationFrame(render);
}

if (!externalFrameClock) document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    if (renderFrameId !== null) cancelAnimationFrame(renderFrameId);
    renderFrameId = null;
    return;
  }
  state.lastRenderTimeMs = null;
  state.lastCloudTimeMs = null;
  scheduleRender();
});

function drawSceneEntry(entry, timeMs, targetContext = context) {
  if (entry.kind === "static") {
    drawStaticFrame(entry.frame, entry.layerName, entry.occurrence, targetContext);
  }
  else if (entry.kind === "animated") drawAnimatedLayer(entry.layerName, timeMs, entry.occurrence);
  else if (entry.kind === "dock-shadow-extension") drawDockShadowExtension(targetContext);
  else if (entry.kind === "ocean") drawOceanSlice(entry.frame, entry.slice, timeMs);
  else if (entry.kind === "background-city-static") drawBackgroundCityStatic(entry.side, targetContext);
  else if (entry.kind === "background-city-smoke") drawBackgroundCitySmoke(entry.side, timeMs);
  else if (entry.kind === "bombardment-fire-overlay") drawBombardmentFireOverlay(timeMs);
  else if (
    entry.kind === "left-bank-background-city-base" ||
    entry.kind === "left-bank-background-city-underlay"
  ) {
    drawLeftBankBackgroundCityFrame(entry.frame, targetContext);
  }
  else if (entry.kind === "chimney-smoke") drawChimneySmoke(entry.emitter, timeMs);
  else if (entry.kind === "city-building") drawCityStreetBuilding(entry.placement, targetContext);
  else if (entry.kind === "city-building-smoke") {
    drawCityStreetBuildingSmoke(entry.placement, entry.emitter, timeMs);
  }
  else if (entry.kind === "tree") drawCityTree(entry.placement, targetContext);
  else if (entry.kind === "tree-shadow") drawCityTreeShadow(entry.placement, targetContext);
  else if (entry.kind === "quay-cargo") drawQuayCargo(entry.placement, targetContext);
  else if (entry.kind === "gate-front") drawGateFront(entry.frame, targetContext);
  else if (entry.kind === "shipyard-construction") {
    drawShipyardConstruction(entry.placement, targetContext);
  }
  else if (entry.kind === "shipyard-front") drawShipyardFront(entry.frame, targetContext);
  else if (entry.kind === "gatehouse-flag") drawGatehouseFlag(entry.frame, timeMs);
  else if (entry.kind === "cloud") drawCloud(entry, timeMs);
  else if (entry.kind === "shipyard-sale-ship") {
    drawShipyardSaleShip(entry.placement, timeMs, targetContext);
  }
  else if (entry.kind === "ship") drawDocksideShip(timeMs);
  else if (entry.kind === "npc") drawNpc(entry.agent, timeMs);
  else throw new Error(`Unknown city scene render entry: ${entry.kind}`);
}

function drawMeasuredSceneEntry(entry, timeMs, targetContext) {
  if (!state.benchmarkState) return drawSceneEntry(entry, timeMs, targetContext);
  const startedAtMs = performance.now();
  try {
    return drawSceneEntry(entry, timeMs, targetContext);
  } finally {
    recordPerformanceBenchmarkStage(
      state.benchmarkState,
      `render.${entry.kind}`,
      performance.now() - startedAtMs
    );
  }
}

function measureCityBenchmarkStage(name, operation) {
  if (!state.benchmarkState) return operation();
  const startedAtMs = performance.now();
  try {
    return operation();
  } finally {
    recordPerformanceBenchmarkStage(
      state.benchmarkState,
      name,
      performance.now() - startedAtMs
    );
  }
}

function setupCityVisualizerBenchmark() {
  const startedAtMs = performance.now();
  if (CITY_VISUALIZER_BENCHMARK.cameraMode === "pan") {
    state.pointer = null;
    state.cameraPanTarget = null;
  }
  state.benchmarkState = createPerformanceBenchmarkState(
    CITY_VISUALIZER_BENCHMARK,
    startedAtMs
  );
  window.__CITY_VISUALIZER_BENCHMARK_READY__ = true;
  window.__CITY_VISUALIZER_BENCHMARK_RESULT__ = null;
  setCityVisualizerBenchmarkDomStatus({ ready: true });
}

function updateCityVisualizerBenchmark(timeMs, cpuMs) {
  if (!state.benchmarkState || state.benchmarkState.result) return;
  const result = recordPerformanceBenchmarkFrame(
    state.benchmarkState,
    timeMs,
    cpuMs,
    state.renderCount,
    cityVisualizerBenchmarkSceneSnapshot
  );
  if (!result) return;
  window.__CITY_VISUALIZER_BENCHMARK_RESULT__ = Object.freeze({
    ...result,
    viewport: Object.freeze({ width: canvas.width, height: canvas.height }),
    environment: Object.freeze({
      hardwareConcurrency: navigator.hardwareConcurrency || null,
      deviceMemoryGb: navigator.deviceMemory || null,
      userAgent: navigator.userAgent
    })
  });
  setCityVisualizerBenchmarkDomStatus({ result: window.__CITY_VISUALIZER_BENCHMARK_RESULT__ });
  console.info(
    "[city-visualizer] performance benchmark complete",
    window.__CITY_VISUALIZER_BENCHMARK_RESULT__
  );
}

function setCityVisualizerBenchmarkDomStatus({ ready = false, result = null }) {
  let status = document.getElementById("city-visualizer-performance-benchmark");
  if (!status) {
    status = document.createElement("script");
    status.id = "city-visualizer-performance-benchmark";
    status.type = "application/json";
    status.hidden = true;
    document.body.appendChild(status);
  }
  if (ready) status.dataset.ready = "true";
  if (result) status.textContent = JSON.stringify(result);
}

function cityVisualizerBenchmarkSceneSnapshot() {
  return {
    cityId: state.city.id,
    approach: state.features.approach,
    bombarded: state.bombardmentEventId !== null,
    cameraMode: CITY_VISUALIZER_BENCHMARK?.cameraMode || "interactive",
    staticFrames: state.portManifest.staticFrames.length,
    backgroundBuildings: state.backgroundCityPainterOrder.length +
      state.leftBankBackgroundCityPainterOrder.length,
    streetBuildings: state.streetBuildings.length,
    trees: state.treePlacements.length,
    quayCargo: state.quayCargoPlacements.length,
    npcs: state.npcAgents.length,
    renderWorkload: citySceneRenderer.stats()
  };
}

function createCitySceneCacheSurface(width, height) {
  if (typeof OffscreenCanvas !== "function") {
    throw new Error("City scene static caching requires OffscreenCanvas support");
  }
  return new OffscreenCanvas(width, height);
}

function staticSceneCacheKey(entries) {
  const highlightedDestination = state.hoveredDestination || destinationById(state.focusedDestinationId);
  const hoveredDestinationId = highlightedDestination &&
    !state.hoveredShipyardSaleShipId && entries.some((entry) => (
    entry.kind === "static" && highlightedDestination.layers.includes(entry.layerName)
  ))
    ? highlightedDestination.id
    : "no-hover";
  return [
    `${canvas.width}x${canvas.height}`,
    `camera=${state.parallax}`,
    `bombardment=${state.bombardmentEventId || "none"}`,
    hoveredDestinationId
  ].join("|");
}

function cityStaticCacheIsUsable() {
  return cityStaticSceneCacheAllowed({
    cameraGestureActive: Boolean(state.cameraGesture),
    panTarget: state.cameraPanTarget,
    velocity: state.cameraVelocity
  });
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

function rebuildCitySceneRenderPlan() {
  if (!state.features || !state.portManifest) return;
  const entries = createSceneRenderEntries();
  citySceneRenderer.setEntries(entries);
}

function createSceneRenderEntries() {
  const activeLayers = activePortSceneLayers(state.features);
  const staticOccurrence = new Map();
  const entries = [];
  const painterZ = (layerName, occurrence = 0) => (
    layerPainterZ(layerName, occurrence, state.features.approach)
  );
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
        z: painterZ(layerName, occurrence),
        authoredOrder
      });
      continue;
    }
    const frames = state.portManifest.staticFrames.filter((frame) => frame.layer === layerName);
    const frame = frames[occurrence];
    if (!frame) throw new Error(`Missing ${layerName} layer occurrence ${occurrence}`);
    if (BACKGROUND_CITY_UNDERLAY_LAYER_NAMES.has(layerName)) {
      if (layerName === BACKGROUND_CITY_UNDERLAY_LAYERS[state.features.rightTerrain]) {
        entries.push({
          kind: "static",
          frame,
          layerName,
          occurrence,
          z: painterZ(layerName, occurrence),
          authoredOrder
        });
      }
      if (
        state.features.leftBankCity &&
        layerName === BACKGROUND_CITY_UNDERLAY_LAYERS[state.features.leftTerrain]
      ) {
        entries.push({
          kind: "left-bank-background-city-underlay",
          frame,
          z: painterZ(layerName, occurrence),
          authoredOrder: authoredOrder - 0.01
        });
      }
      continue;
    }
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
        if (state.backgroundCityRows.length > 0) {
          entries.push({
            kind: "background-city-static",
            side: "right",
            z: painterZ(layerName, occurrence) - 0.1,
            authoredOrder: authoredOrder - 0.1
          });
          entries.push({
            kind: "background-city-smoke",
            side: "right",
            z: painterZ(layerName, occurrence) - 0.1,
            authoredOrder: authoredOrder - 0.099
          });
        }
        if (state.features.leftBankCity) {
          if (state.leftBankBackgroundCityRows.length > 0) {
            entries.push({
              kind: "background-city-static",
              side: "left",
              z: painterZ(layerName, occurrence) - 0.1,
              authoredOrder: authoredOrder - 0.2
            });
            entries.push({
              kind: "background-city-smoke",
              side: "left",
              z: painterZ(layerName, occurrence) - 0.1,
              authoredOrder: authoredOrder - 0.199
            });
          }
          entries.push({
            kind: "left-bank-background-city-base",
            frame,
            z: painterZ(layerName, occurrence),
            authoredOrder: authoredOrder - 0.05
          });
        }
      }
      entries.push({
        kind: "static",
        frame,
        layerName,
        occurrence,
        z: painterZ(layerName, occurrence),
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
          z: painterZ(layerName, occurrence),
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
  for (const [placementOrder, placement] of state.treePlacements.entries()) {
    entries.push({
      kind: "tree",
      placement,
      z: placement.z,
      authoredOrder: 14 + placementOrder / 100
    });
    entries.push({
      kind: "tree-shadow",
      placement,
      z: placement.shadowZ,
      authoredOrder: 14 + placementOrder / 100
    });
  }
  for (const [placementOrder, placement] of state.quayCargoPlacements.entries()) {
    entries.push({
      kind: "quay-cargo",
      placement,
      z: placement.z,
      authoredOrder: 36 + placementOrder / 100
    });
  }
  if (state.features.shipyard) {
    for (const [placementOrder, placement] of state.shipyardSaleShipPlacements.entries()) {
      entries.push({
        kind: "shipyard-sale-ship",
        placement,
        z: placement.z,
        authoredOrder: 12 + placementOrder / 100
      });
    }
    if (state.shipyardConstructionPlacement) {
      entries.push({
        kind: "shipyard-construction",
        placement: state.shipyardConstructionPlacement,
        z: state.shipyardConstructionPlacement.z,
        authoredOrder: 12.8
      });
    }
    const shipyardFront = state.portManifest.staticFrames.find(({ layer }) => (
      layer === "Shipyard Front"
    ));
    if (!shipyardFront) throw new Error("Port scene is missing its shipyard front frame");
    entries.push({
      kind: "shipyard-front",
      frame: shipyardFront,
      z: CITY_SHIPYARD_FRONT_Z,
      authoredOrder: 12.9
    });
  }
  if (state.features.fortified) {
    const gateFront = state.portManifest.staticFrames.find(({ layer }) => (
      layer === "Gate Front Edge"
    ));
    if (!gateFront) throw new Error("Port scene is missing its gate front edge");
    entries.push({
      kind: "gate-front",
      frame: gateFront,
      z: CITY_GATE_FRONT_PAINTER_Z,
      authoredOrder: 39
    });
  }
  if (state.bombardmentEventId !== null) {
    entries.push({
      kind: "bombardment-fire-overlay",
      z: 61.9,
      authoredOrder: 37.4
    });
  }
  entries.push({ kind: "ship", ...PORT_SCENE_ENTITY_META.ship, authoredOrder: 34.5 });
  for (const [agentOrder, agent] of state.npcAgents.slice(0, state.features.npcs).entries()) {
    entries.push({
      kind: "npc",
      agent,
      z: agent.painterZ ?? cityGroundPainterZ(agent.feetY),
      authoredOrder: 37.5 + agentOrder / 100
    });
  }
  for (const [agentOrder, agent] of state.specialAgents.entries()) {
    entries.push({
      kind: "npc",
      agent,
      z: cityGroundPainterZ(agent.feetY),
      authoredOrder: 38.5 + agentOrder / 100
    });
  }
  if (state.features.dock !== "none") {
    entries.push({ kind: "dock-shadow-extension", z: 36, authoredOrder: 16.5 });
  }
  return entries.sort((a, b) => a.z - b.z || a.authoredOrder - b.authoredOrder);
}

function drawCityTree(placement, targetContext) {
  const window = sceneWindow(placement.depth, 0, 0, placement.parallaxAnchor);
  drawCityTreePart(placement, placement.tree.frame, window, targetContext);
}

function drawQuayCargo(placement, targetContext) {
  const window = sceneWindow(placement.depth, 0, 0, placement.parallaxAnchor);
  targetContext.drawImage(
    state.staticAtlas,
    placement.frame.frame.x,
    placement.frame.frame.y,
    placement.width,
    placement.height,
    Math.round(placement.x - window.x),
    Math.round(placement.y - window.y),
    placement.width,
    placement.height
  );
}

function drawGateFront(frame, targetContext) {
  const regional = regionalStaticFrame(frame, "Gate Front Edge");
  const sourceAtlas = regional?.atlas || state.staticAtlas;
  const sourceFrame = regional?.frame || frame;
  drawAtlasFrame(
    targetContext,
    sourceAtlas,
    sourceFrame,
    sceneWindow(
      layerParallaxDepth("Gate"),
      0,
      0,
      layerParallaxAnchor("Gate")
    )
  );
}

function drawShipyardConstruction(placement, targetContext) {
  const window = sceneWindow(
    placement.depth,
    0,
    0,
    placement.parallaxAnchor
  );
  targetContext.drawImage(
    placement.ship.image,
    Math.round(placement.x - window.x),
    Math.round(placement.y - window.y),
    placement.width,
    placement.height
  );
}

function drawShipyardFront(frame, targetContext) {
  drawAtlasFrame(
    targetContext,
    state.staticAtlas,
    frame,
    sceneWindow(
      layerParallaxDepth("Shipyard"),
      0,
      0,
      layerParallaxAnchor("Shipyard")
    )
  );
}

function drawCityTreeShadow(placement, targetContext) {
  const window = sceneWindow(placement.depth, 0, 0, placement.parallaxAnchor);
  drawCityTreePart(placement, placement.tree.shadow, window, targetContext);
}

function drawCityTreePart(placement, part, window, targetContext) {
  const fullWidth = Math.round(part.sourceSize.w * placement.scale);
  const sourceX = Math.round(part.spriteSourceSize.x * placement.scale);
  const destinationX = Math.round(placement.originX - window.x);
  const destinationY = Math.round(
    placement.originY + part.spriteSourceSize.y * placement.scale - window.y
  );
  const destinationWidth = Math.max(1, Math.round(part.frame.w * placement.scale));
  const destinationHeight = Math.max(1, Math.round(part.frame.h * placement.scale));
  targetContext.save();
  if (placement.flipX) {
    targetContext.translate(destinationX + fullWidth, 0);
    targetContext.scale(-1, 1);
  }
  targetContext.drawImage(
    state.treeAtlas,
    part.frame.x,
    part.frame.y,
    part.frame.w,
    part.frame.h,
    placement.flipX ? sourceX : destinationX + sourceX,
    destinationY,
    destinationWidth,
    destinationHeight
  );
  targetContext.restore();
}

function drawCityStreetBuilding(placement, targetContext) {
  const window = sceneWindow(placement.depth, 0, 0, placement.parallaxAnchor);
  const regionalFrame = regionalStaticFrame(placement.frame, placement.layerName);
  const source = regionalFrame || { atlas: state.staticAtlas, frame: placement.frame };
  const bombarded = cityStreetBombardmentPresentation(placement, source);
  const displayed = bombarded || source;
  const sourceFrame = displayed.frame;
  targetContext.drawImage(
    displayed.atlas,
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

function backgroundCityRenderState(side) {
  const leftBank = side === "left";
  return Object.freeze({
    rows: leftBank ? state.leftBankBackgroundCityRows : state.backgroundCityRows,
    painterOrder: leftBank
      ? state.leftBankBackgroundCityPainterOrder
      : state.backgroundCityPainterOrder,
    streetRows: leftBank
      ? state.leftBankBackgroundCityStreetRows
      : state.backgroundCityStreetRows,
    smokeByBuilding: leftBank
      ? state.leftBankBackgroundCitySmokeByBuilding
      : state.backgroundCitySmokeByBuilding
  });
}

function drawBackgroundCityStatic(side, targetContext) {
  const { rows, painterOrder, streetRows } = backgroundCityRenderState(side);
  if (rows.length === 0) return;
  drawBackgroundCityStreet(streetRows, rows.at(-1).parallaxAnchor, targetContext);
  for (const entry of painterOrder) {
    const building = entry.building;
    const frame = building.frame;
    const window = sceneWindow(entry.depth, 0, 0, entry.parallaxAnchor);
    const atmosphereLevel = building.atmosphereLevel ?? cityBackgroundAtmosphereLevel(
      entry.distanceFromFront,
      rows.length
    );
    const source = backgroundCityAtmosphereFrame(frame, atmosphereLevel) || {
      atlas: state.staticAtlas,
      frame
    };
    const bombarded = backgroundCityBombardmentPresentation(side, entry, source);
    const displayed = bombarded || source;
    targetContext.drawImage(
      displayed.atlas,
      displayed.frame.frame.x,
      displayed.frame.frame.y,
      frame.frame.w,
      frame.frame.h,
      Math.round(building.x - window.x),
      Math.round(building.y - window.y),
      building.width,
      building.height
    );
  }
}

function drawBackgroundCitySmoke(side, timeMs) {
  const { rows, painterOrder, smokeByBuilding } = backgroundCityRenderState(side);
  if (rows.length === 0) return;
  for (const entry of painterOrder) {
    const emitter = smokeByBuilding.get(entry.building);
    if (!emitter) continue;
    const window = sceneWindow(entry.depth, 0, 0, entry.parallaxAnchor);
    drawBackgroundCityChimneySmoke(emitter, timeMs, window);
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
  if (level === 0) return regionalFrame;
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
  const result = Object.freeze({
    atlas: buffer,
    frame: Object.freeze({
      ...sourceFrame,
      frame: Object.freeze({ ...sourceFrame.frame, x: 0, y: 0 })
    })
  });
  levels.set(cacheKey, result);
  return result;
}

function authoredBombardmentPresentation(frame, layerName, occurrence, source) {
  if (state.bombardmentEventId === null || !cityBombardmentLayerIsDamageable(layerName)) {
    return null;
  }
  return bombardmentFramePresentation({
    source,
    buildingId: `authored|${layerName}|${occurrence}`
  });
}

function cityStreetBombardmentPresentation(placement, source) {
  if (state.bombardmentEventId === null) return null;
  return bombardmentFramePresentation({
    source,
    buildingId: `street|${placement.id}`
  });
}

function backgroundCityBombardmentPresentation(side, entry, source) {
  if (state.bombardmentEventId === null) return null;
  const buildingId = backgroundCityBombardmentBuildingId(side, entry);
  const seed = cityBombardmentSeed({
    cityId: state.city.id,
    buildingId,
    eventId: state.bombardmentEventId
  });
  if (!cityBombardmentBuildingIsAffected(seed, 0.18)) return null;
  return bombardmentFramePresentation({ source, buildingId, seed });
}

function backgroundCityBombardmentBuildingId(side, entry) {
  if (!Number.isInteger(entry?.rowOrder) || !Number.isInteger(entry?.buildingOrder)) {
    throw new Error("Background city bombardment requires stable painter slots");
  }
  return `background|${side}|${entry.rowOrder}|${entry.buildingOrder}|${entry.building.frame.layer}`;
}

function bombardmentFramePresentation({ source, buildingId, seed = null }) {
  if (!source?.atlas || !source?.frame?.frame) {
    throw new Error(`Bombardment building ${buildingId} has no source frame`);
  }
  const resolvedSeed = seed ?? cityBombardmentSeed({
    cityId: state.city.id,
    buildingId,
    eventId: state.bombardmentEventId
  });
  const sourceFrame = source.frame;
  const cacheKey = [
    state.city.id,
    state.bombardmentEventId,
    buildingId,
    sourceFrame.id,
    sourceFrame.frame.x,
    sourceFrame.frame.y
  ].join("|");
  const cached = bombardmentFrameCache.get(cacheKey);
  if (cached) return cached;

  const buffer = document.createElement("canvas");
  buffer.width = sourceFrame.frame.w;
  buffer.height = sourceFrame.frame.h;
  const bufferContext = buffer.getContext("2d", { willReadFrequently: true });
  if (!bufferContext) throw new Error(`Could not rasterize bombarded building: ${buildingId}`);
  bufferContext.imageSmoothingEnabled = false;
  bufferContext.drawImage(
    source.atlas,
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
  const alpha = new Uint8Array(buffer.width * buffer.height);
  for (let index = 0; index < alpha.length; index += 1) {
    alpha[index] = imageData.data[index * 4 + 3];
  }
  const damage = cityBombardmentDamage({
    alpha,
    width: buffer.width,
    height: buffer.height,
    seed: resolvedSeed
  });
  for (let index = 0; index < alpha.length; index += 1) {
    const offset = index * 4;
    if (damage.hole[index] !== 0) {
      imageData.data[offset + 3] = 0;
      continue;
    }
    if (damage.rim[index] === 0) continue;
    const sourceHex = [
      imageData.data[offset],
      imageData.data[offset + 1],
      imageData.data[offset + 2]
    ].map((channel) => channel.toString(16).padStart(2, "0")).join("");
    const darkened = darkerResurrect64Hex(sourceHex, 2);
    imageData.data[offset] = Number.parseInt(darkened.slice(0, 2), 16);
    imageData.data[offset + 1] = Number.parseInt(darkened.slice(2, 4), 16);
    imageData.data[offset + 2] = Number.parseInt(darkened.slice(4, 6), 16);
  }
  bufferContext.putImageData(imageData, 0, 0);

  const presentation = Object.freeze({
    atlas: buffer,
    frame: Object.freeze({
      ...sourceFrame,
      frame: Object.freeze({ ...sourceFrame.frame, x: 0, y: 0 })
    }),
    damage,
    seed: resolvedSeed
  });
  bombardmentFrameCache.set(cacheKey, presentation);
  return presentation;
}

function drawBombardmentFireOverlay(timeMs) {
  if (state.bombardmentEventId === null) return;
  if (!state.fireAtlas) throw new Error("Bombarded city rendered before its fire atlas loaded");
  const targetContext = separateEmissiveOverlay ? emissiveContext : context;
  if (!targetContext) throw new Error("Bombarded city has no emissive render target");
  targetContext.imageSmoothingEnabled = false;
  if (cityStaticCacheIsUsable()) {
    const baseKey = [
      state.city.id,
      state.bombardmentEventId,
      canvas.width,
      canvas.height,
      state.parallax
    ].join("|");
    if (bombardmentOverlayFrameCache?.baseKey !== baseKey) {
      bombardmentOverlayFrameCache = { baseKey, frames: new Map() };
    }
    const animationFrame = Math.floor((prefersReducedMotion.matches ? 0 : timeMs) / FIRE_FRAME_MS) %
      FIRE_FRAME_COUNT;
    let overlay = bombardmentOverlayFrameCache.frames.get(animationFrame);
    if (!overlay) {
      overlay = document.createElement("canvas");
      overlay.width = canvas.width;
      overlay.height = canvas.height;
      const overlayContext = overlay.getContext("2d");
      if (!overlayContext) throw new Error("Could not cache city bombardment fire overlay");
      overlayContext.imageSmoothingEnabled = false;
      drawBombardmentFireSources(timeMs, overlayContext);
      bombardmentOverlayFrameCache.frames.set(animationFrame, overlay);
    }
    targetContext.drawImage(overlay, 0, 0);
    return;
  }
  drawBombardmentFireSources(timeMs, targetContext);
}

function drawBombardmentFireSources(timeMs, targetContext) {
  drawAuthoredBombardmentFires(timeMs, targetContext);
  drawBackgroundCityBombardmentFires("right", timeMs, targetContext);
  if (state.features.leftBankCity) {
    drawBackgroundCityBombardmentFires("left", timeMs, targetContext);
  }
  for (const placement of state.streetBuildings) {
    const regionalFrame = regionalStaticFrame(placement.frame, placement.layerName);
    const source = regionalFrame || { atlas: state.staticAtlas, frame: placement.frame };
    const presentation = cityStreetBombardmentPresentation(placement, source);
    drawBombardmentPresentationFire(presentation, {
      x: placement.x - sceneWindow(
        placement.depth,
        0,
        0,
        placement.parallaxAnchor
      ).x,
      y: placement.y - sceneWindow(
        placement.depth,
        0,
        0,
        placement.parallaxAnchor
      ).y,
      width: placement.width,
      height: placement.height
    }, timeMs, targetContext);
  }
}

function drawAuthoredBombardmentFires(timeMs, targetContext) {
  const activeLayers = activePortSceneLayers(state.features);
  const occurrences = new Map();
  for (const layerName of state.portManifest.layerOrder) {
    if (layerName === "Waves" || layerName === "Surf") continue;
    const occurrence = incrementOccurrence(occurrences, layerName) - 1;
    if (!activeLayers.has(layerName) || !cityBombardmentLayerIsDamageable(layerName)) continue;
    const frame = state.portManifest.staticFrames.filter((candidate) => (
      candidate.layer === layerName
    ))[occurrence];
    if (!frame) throw new Error(`Missing bombarded ${layerName} occurrence ${occurrence}`);
    const regionalFrame = regionalStaticFrame(frame, layerName);
    const source = regionalFrame || { atlas: state.staticAtlas, frame };
    const presentation = authoredBombardmentPresentation(frame, layerName, occurrence, source);
    const offsetX = layerSceneOffsetX(layerName, occurrence, state.features.approach);
    const offsetY = layerSceneOffsetY(layerName, occurrence, state.features.approach);
    const window = sceneWindow(
      layerParallaxDepth(layerName, occurrence),
      offsetX,
      offsetY,
      layerParallaxAnchor(layerName, occurrence)
    );
    drawBombardmentPresentationFire(presentation, {
      x: presentation.frame.spriteSourceSize.x - window.x,
      y: presentation.frame.spriteSourceSize.y - window.y,
      width: presentation.frame.frame.w,
      height: presentation.frame.frame.h
    }, timeMs, targetContext);
  }
}

function drawBackgroundCityBombardmentFires(side, timeMs, targetContext) {
  const { rows, painterOrder } = backgroundCityRenderState(side);
  for (const entry of painterOrder) {
    const building = entry.building;
    const atmosphereLevel = building.atmosphereLevel ?? cityBackgroundAtmosphereLevel(
      entry.distanceFromFront,
      rows.length
    );
    const source = backgroundCityAtmosphereFrame(building.frame, atmosphereLevel) || {
      atlas: state.staticAtlas,
      frame: building.frame
    };
    const presentation = backgroundCityBombardmentPresentation(side, entry, source);
    if (!presentation) continue;
    const window = sceneWindow(entry.depth, 0, 0, entry.parallaxAnchor);
    drawBombardmentPresentationFire(presentation, {
      x: building.x - window.x,
      y: building.y - window.y,
      width: building.width,
      height: building.height
    }, timeMs, targetContext);
  }
}

function drawBombardmentPresentationFire(presentation, destination, timeMs, targetContext) {
  if (!presentation) return;
  const frame = fireAnimationFrame(prefersReducedMotion.matches ? 0 : timeMs, presentation.seed);
  const destinationX = Math.round(destination.x);
  const destinationY = Math.round(destination.y);
  const destinationWidth = Math.max(1, Math.round(destination.width));
  const destinationHeight = Math.max(1, Math.round(destination.height));
  const holeRuns = scaledBombardmentHoleRuns(
    presentation,
    destinationWidth,
    destinationHeight
  );
  const bounds = presentation.damage.holeBounds;
  const sourceWidth = presentation.frame.frame.w;
  const sourceHeight = presentation.frame.frame.h;
  const scale = clamp(Math.max(bounds.width / 13, bounds.height / 15), 0.55, 1.4);
  const fireWidth = FIRE_FRAME_WIDTH * scale;
  const fireHeight = FIRE_FRAME_HEIGHT * scale;
  const fireBottom = bounds.y + bounds.height + Math.max(1, Math.round(bounds.height * 0.2));
  const fireX = bounds.x + bounds.width / 2 - fireWidth / 2;
  const fireY = fireBottom - fireHeight;
  targetContext.save();
  targetContext.beginPath();
  for (const run of holeRuns) {
    targetContext.rect(
      destinationX + run.x,
      destinationY + run.y,
      run.width,
      1
    );
  }
  targetContext.clip();
  targetContext.drawImage(
    state.fireAtlas,
    frame * FIRE_FRAME_WIDTH,
    fireVariantIndex(presentation.seed) * FIRE_FRAME_HEIGHT,
    FIRE_FRAME_WIDTH,
    FIRE_FRAME_HEIGHT,
    destinationX + Math.round(fireX / sourceWidth * destinationWidth),
    destinationY + Math.round(fireY / sourceHeight * destinationHeight),
    Math.max(1, Math.round(fireWidth / sourceWidth * destinationWidth)),
    Math.max(1, Math.round(fireHeight / sourceHeight * destinationHeight))
  );
  targetContext.restore();
}

function scaledBombardmentHoleRuns(presentation, width, height) {
  let dimensions = bombardmentScaledHoleRunCache.get(presentation);
  if (!dimensions) {
    dimensions = new Map();
    bombardmentScaledHoleRunCache.set(presentation, dimensions);
  }
  const key = `${width}x${height}`;
  if (dimensions.has(key)) return dimensions.get(key);
  const sourceWidth = presentation.frame.frame.w;
  const sourceHeight = presentation.frame.frame.h;
  const runs = [];
  for (let destinationY = 0; destinationY < height; destinationY += 1) {
    const sourceY = Math.min(
      sourceHeight - 1,
      Math.floor(destinationY / height * sourceHeight)
    );
    let runStart = -1;
    for (let destinationX = 0; destinationX <= width; destinationX += 1) {
      const inHole = destinationX < width && presentation.damage.hole[
        sourceY * sourceWidth + Math.min(
          sourceWidth - 1,
          Math.floor(destinationX / width * sourceWidth)
        )
      ] !== 0;
      if (inHole && runStart < 0) runStart = destinationX;
      if (!inHole && runStart >= 0) {
        runs.push(Object.freeze({
          x: runStart,
          y: destinationY,
          width: destinationX - runStart
        }));
        runStart = -1;
      }
    }
  }
  if (runs.length === 0) {
    throw new Error(`Bombardment opening vanished at ${width}x${height}`);
  }
  const result = Object.freeze(runs);
  dimensions.set(key, result);
  return result;
}

function drawBackgroundCityStreet(rows, parallaxAnchor, targetContext) {
  if (rows.length === 0) return;
  const window = sceneWindow(
    layerParallaxDepth(BACKGROUND_CITY_BASE_LAYER),
    0,
    0,
    parallaxAnchor
  );
  targetContext.fillStyle = BACKGROUND_CITY_STREET_COLOR;
  for (const row of rows) {
    const screenX = Math.round(row.leftX - window.x);
    const screenY = Math.round(row.y - window.y);
    const screenRight = Math.round(row.rightX - window.x);
    if (screenY < 0 || screenY >= canvas.height || screenRight <= 0 || screenX >= canvas.width) continue;
    targetContext.fillRect(
      Math.max(0, screenX),
      screenY,
      Math.max(1, Math.min(canvas.width, screenRight) - Math.max(0, screenX)),
      1
    );
  }
}

function drawLeftBankBackgroundCityFrame(frame, targetContext) {
  const parallaxAnchor = PORT_SCENE_CAMERA.riverDefaultParallax;
  const window = sceneWindow(
    layerParallaxDepth(frame.layer),
    0,
    0,
    parallaxAnchor
  );
  const masterX = PORT_SCENE_MASTER.width - frame.spriteSourceSize.x - frame.frame.w;
  const destinationX = Math.round(masterX - window.x);
  const destinationY = Math.round(frame.spriteSourceSize.y - window.y);
  targetContext.save();
  targetContext.translate(destinationX + frame.frame.w, 0);
  targetContext.scale(-1, 1);
  targetContext.drawImage(
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
  targetContext.restore();
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

function drawStaticFrame(frame, layerName, occurrence, targetContext) {
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
  const source = regionalFrame || { atlas: state.staticAtlas, frame };
  const bombarded = authoredBombardmentPresentation(frame, layerName, occurrence, source);
  const displayed = bombarded || source;
  const sourceAtlas = displayed.atlas;
  const sourceFrame = displayed.frame;
  const highlightedDestination = state.hoveredDestination || destinationById(state.focusedDestinationId);
  if (
    highlightedDestination?.layers.includes(layerName) &&
    !state.hoveredShipyardSaleShipId
  ) {
    drawFrameOutline(sourceAtlas, sourceFrame, window, targetContext);
  }
  drawAtlasFrame(
    targetContext,
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
  drawAtlasFrame(context, renderedFrame.atlas, renderedFrame.frame, window);
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
  const columnOffsets = flagWaveColumnOffsets(
    layout.fabricWidth,
    phase,
    pose.waveAmplitudePx * geometry.waveAmplitudeScale
  );
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

function drawDockShadowExtension(targetContext) {
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
    targetContext.fillStyle = row.color;
    for (const [runStart, runEnd] of beachRuns[beachY]) {
      const clippedStart = Math.max(extensionStart, beach.spriteSourceSize.x + runStart);
      const clippedEnd = Math.min(extensionEnd, beach.spriteSourceSize.x + runEnd);
      if (clippedEnd <= clippedStart) continue;
      targetContext.fillRect(
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
      const masterX = frame.spriteSourceSize.x + x;
      const offset = (y * buffer.width + x) * 4;
      if (imageData.data[offset + 3] === 0) continue;
      const mapped = cityWaterPaletteRgbAt(
        imageData.data[offset],
        imageData.data[offset + 1],
        imageData.data[offset + 2],
        state.city.lat,
        masterX,
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

function drawAtlasFrame(
  targetContext,
  atlas,
  frame,
  window,
  extendLeft = false,
  sourceRect = null
) {
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
    targetContext.save();
    targetContext.translate(destinationX, 0);
    targetContext.scale(-1, 1);
    targetContext.drawImage(
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
    targetContext.restore();
  }
  targetContext.drawImage(
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

function drawFrameOutline(atlas, frame, window, targetContext) {
  const mask = tintedFrameCanvas(atlas, frame);
  const x = Math.round(frame.spriteSourceSize.x - window.x);
  const y = Math.round(frame.spriteSourceSize.y - window.y);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    targetContext.drawImage(mask, x + dx, y + dy);
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

function tintedImageCanvas(image, color) {
  if (!(image instanceof HTMLImageElement) && !(image instanceof HTMLCanvasElement)) {
    throw new TypeError("Tinted city image requires a raster source");
  }
  if (typeof color !== "string" || color.length === 0) {
    throw new Error("Tinted city image requires a color");
  }
  const mask = document.createElement("canvas");
  mask.width = image.width;
  mask.height = image.height;
  const maskContext = mask.getContext("2d");
  if (!maskContext) throw new Error("Could not create tinted city image");
  maskContext.imageSmoothingEnabled = false;
  maskContext.drawImage(image, 0, 0);
  maskContext.globalCompositeOperation = "source-in";
  maskContext.fillStyle = color;
  maskContext.fillRect(0, 0, mask.width, mask.height);
  return mask;
}

function drawDocksideShip(timeMs) {
  if (!state.shipImage) return;
  const placement = docksideShipPlacement(timeMs, PORT_SCENE_ENTITY_META.ship.depth);
  if (!placement) return;
  if (!state.shipOutline) throw new Error("Player ship is missing its city highlight");
  const outlineY = placement.y + placement.bobY;
  for (const [dx, dy] of [
    [-1, 0], [1, 0], [0, -1], [0, 1],
    [-1, -1], [1, -1], [-1, 1], [1, 1]
  ]) {
    context.drawImage(
      state.shipOutline,
      placement.x + dx,
      outlineY + dy,
      state.shipOutline.width * placement.scale,
      state.shipOutline.height * placement.scale
    );
  }
  drawDocksideShipWaterlineLayers(
    state.shipWaterlineLayers,
    placement.x,
    placement.y + placement.bobY,
    placement.scale,
    timeMs,
    hashString(placement.ship.slug)
  );
}

function drawShipyardSaleShip(placement, timeMs, targetContext) {
  const screen = shipyardSaleShipScreenPlacement(placement, timeMs);
  const ship = placement.ship;
  const splitSourceY = clamp(
    ship.sideViewWaterlineY - screen.bobY,
    0,
    ship.height
  );
  if (state.hoveredShipyardSaleShipId === placement.id) {
    for (const [dx, dy] of [
      [-1, 0], [1, 0], [0, -1], [0, 1],
      [-1, -1], [1, -1], [-1, 1], [1, 1]
    ]) {
      targetContext.drawImage(
        ship.outline,
        screen.x + dx,
        screen.y + dy,
        placement.width,
        placement.height
      );
    }
  }
  const refractionTime = prefersReducedMotion.matches ? 0 : timeMs;
  targetContext.save();
  targetContext.globalAlpha = SHIP_SUBMERGED_ALPHA;
  for (
    let sourceY = splitSourceY;
    sourceY < ship.height;
    sourceY += SHIP_REFRACTION_BAND_HEIGHT
  ) {
    const sourceHeight = Math.min(SHIP_REFRACTION_BAND_HEIGHT, ship.height - sourceY);
    targetContext.drawImage(
      ship.image,
      0,
      sourceY,
      ship.width,
      sourceHeight,
      screen.x + liveShipRefractionOffset(sourceY, refractionTime, hashString(placement.id)),
      screen.y + sourceY * placement.scale,
      placement.width,
      sourceHeight * placement.scale
    );
  }
  targetContext.restore();
  if (splitSourceY > 0) {
    targetContext.drawImage(
      ship.image,
      0,
      0,
      ship.width,
      splitSourceY,
      screen.x,
      screen.y,
      placement.width,
      splitSourceY * placement.scale
    );
  }
}

function shipyardSaleShipScreenPlacement(placement, timeMs) {
  const window = sceneWindow(
    placement.depth,
    0,
    0,
    placement.parallaxAnchor
  );
  const bobY = clamp(
    oceanRowOffset(placement.waterlineY, Math.max(0, timeMs + placement.bobPhase)),
    -1,
    1
  );
  return Object.freeze({
    x: Math.round(placement.x - window.x),
    y: Math.round(placement.y - window.y + bobY),
    bobY
  });
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
  if (!state.shipWaterlineLayers || !state.features || !state.shipSlug) {
    throw new Error("City dockside ship rendered before its presentation was prepared");
  }
  const ship = requireCityDocksideShip(state.docksideShipCatalog, state.shipSlug);
  const sideAnchor = docksideShipSideAnchor(ship);
  const window = sceneWindow(depth);
  const scale = PORT_SCENE_ENTITY_META.ship.scale;
  const vertical = docksideShipVerticalPlacement({
    dock: state.features.dock,
    sideAnchorY: sideAnchor.y * scale,
    submergedMinY: state.shipWaterlineLayers.submergedMinY * scale
  });
  const postClearanceShift = docksideShipPostClearanceShift({
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
    x: Math.round(
      PORT_SCENE_DOCK.shipAccessX - sideAnchor.x * scale - postClearanceShift - window.x
    ),
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
  if (pixels.length === 0) throw new Error(`Dockside ship image has no opaque pixels: ${slug}`);
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
  let opaqueMinX = source.width;
  let opaqueMaxY = -1;
  const rightmostOpaqueXByRow = new Int32Array(source.height);
  rightmostOpaqueXByRow.fill(-1);
  for (const pixel of pixels) {
    opaqueMinX = Math.min(opaqueMinX, pixel.x);
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
    opaqueMinX,
    rightmostOpaqueXByRow,
    submergedMinY,
    submergedMaxY
  });
}

function drawNpc(agent, timeMs) {
  if (!state.peopleManifest || !state.peopleAtlas || !state.features) return;
  const window = sceneWindow(PORT_SCENE_ENTITY_META.npcs.depth);
  const time = prefersReducedMotion.matches ? 0 : timeMs;
  const appearance = state.peopleById.get(agent.appearanceId);
  if (!appearance) throw new Error(`Unknown city person appearance: ${agent.appearanceId}`);
  const atlas = state.peopleAtlas;
  const caughtElapsed = agent.startedAtMs === undefined
    ? null
    : clamp((timeMs - agent.startedAtMs) / 850, 0, 1);
  const scripted = ["merchant-flee", "guard-approach"].includes(agent.motion);
  const stationary = agent.motion === "stationary";
  const cycle = stationary ? 0 : (time * agent.speed + agent.phase) % 2;
  const progress = cycle <= 1 ? cycle : 2 - cycle;
  const facingRight = scripted
    ? agent.endX >= agent.startX
    : stationary ? agent.facingRight !== false : cycle <= 1;
  const pathPoint = scripted || stationary ? null : cityNpcPathPoint(agent, progress);
  const x = scripted
    ? agent.startX + (agent.endX - agent.startX) * caughtElapsed
    : stationary ? agent.startX : pathPoint.x;
  const feetY = scripted || stationary ? agent.feetY : pathPoint.feetY;
  const animationId = agent.animationId || "walk";
  const animation = appearance.animations[animationId];
  if (!Array.isArray(animation) || animation.length === 0) {
    throw new Error(`City person ${agent.appearanceId} has no ${animationId} animation`);
  }
  const frame = animationFrame(animation, time + agent.phase * 1000);
  const dx = Math.round(x + frame.spriteSourceSize.x - window.x);
  const dy = Math.round(feetY - frame.sourceSize.h + frame.spriteSourceSize.y - window.y);
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

function drawPersonSprite(targetContext, {
  appearanceId,
  animationId = "walk",
  timeMs = 0,
  x,
  y,
  scale = 1,
  facingRight = true
}) {
  if (!targetContext || typeof targetContext.drawImage !== "function") {
    throw new Error("City person sprite requires a canvas context");
  }
  if (![timeMs, x, y, scale].every(Number.isFinite) || scale <= 0) {
    throw new Error("City person sprite requires finite placement and a positive scale");
  }
  const appearance = state.peopleById.get(appearanceId);
  if (!appearance) throw new Error(`Unknown city person appearance: ${appearanceId}`);
  const animation = appearance.animations[animationId];
  if (!Array.isArray(animation) || animation.length === 0) {
    throw new Error(`City person ${appearanceId} has no ${animationId} animation`);
  }
  const frame = animationFrame(animation, prefersReducedMotion.matches ? 0 : timeMs);
  const dx = Math.round(x + frame.spriteSourceSize.x * scale);
  const dy = Math.round(y + frame.spriteSourceSize.y * scale);
  const dw = Math.round(frame.frame.w * scale);
  const dh = Math.round(frame.frame.h * scale);
  if (facingRight) {
    targetContext.drawImage(
      state.peopleAtlas,
      frame.frame.x,
      frame.frame.y,
      frame.frame.w,
      frame.frame.h,
      dx,
      dy,
      dw,
      dh
    );
    return;
  }
  targetContext.save();
  targetContext.translate(dx + dw, 0);
  targetContext.scale(-1, 1);
  targetContext.drawImage(
    state.peopleAtlas,
    frame.frame.x,
    frame.frame.y,
    frame.frame.w,
    frame.frame.h,
    0,
    dy,
    dw,
    dh
  );
  targetContext.restore();
}

function drawSceneLabels() {
  const localizedCityLabel = renderText(state.city.label);
  const cityLabel = localizedCityLabel.toUpperCase();
  const cityFont = titleFontForText(cityLabel);
  pixelText.draw(cityLabel, 9, 9, {
    color: PIRATE_MENU_INK,
    font: cityFont,
    wordSpacingPx: 4
  });
  pixelText.draw(cityLabel, 8, 8, {
    color: PIRATE_MENU_PAPER,
    font: cityFont,
    wordSpacingPx: 4
  });

  drawSetSailControl();

  const highlightedDestination = state.hoveredDestination || destinationById(state.focusedDestinationId);
  if (highlightedDestination && highlightedDestination.id !== PORT_CITY_LOCATION.SET_SAIL) {
    const label = renderText(highlightedDestination.label).toUpperCase();
    const font = smallFontForText(label);
    const width = pixelText.measure(label, font) + 10;
    const x = Math.round((canvas.width - width) / 2);
    const y = canvas.height - 22;
    drawLabelPlate(x, y, width, 15);
    pixelText.draw(label, x + 5, y + 2, {
      color: PIRATE_MENU_INK,
      font
    });
  }
}

function drawSetSailControl() {
  const destination = destinationById(PORT_CITY_LOCATION.SET_SAIL);
  if (!destination) return;
  const rect = setSailControlRect();
  if (!rect) return;
  const highlightedDestination = state.hoveredDestination || destinationById(state.focusedDestinationId);
  const highlighted = highlightedDestination?.id === PORT_CITY_LOCATION.SET_SAIL;
  const label = renderText(destination.label).toUpperCase();
  const font = titleFontForText(label);
  const layout = setSailLabelLayout(rect, label, font);
  if (!layout) return;
  const riseY = highlighted ? -2 : 0;
  const foregroundColor = highlighted ? PIRATE_MENU_PAPER_SELECTED : "#ffffff";
  context.save();
  context.globalAlpha = highlighted ? 1 : 0.9;
  drawSetSailArrow(layout.arrowX + 1, layout.arrowCenterY + riseY + 1, layout.scale, PIRATE_MENU_INK);
  pixelText.draw(label, layout.textX + 1, layout.textY + riseY + 1, {
    color: PIRATE_MENU_INK,
    font,
    scale: layout.scale,
    wordSpacingPx: 4
  });
  drawSetSailArrow(layout.arrowX, layout.arrowCenterY + riseY, layout.scale, foregroundColor);
  pixelText.draw(label, layout.textX, layout.textY + riseY, {
    color: foregroundColor,
    font,
    scale: layout.scale,
    wordSpacingPx: 4
  });
  context.restore();
}

function setSailControlRect() {
  const placement = docksideShipPlacement(
    state.lastRenderTimeMs ?? 0,
    PORT_SCENE_ENTITY_META.ship.depth
  );
  if (!placement || !state.shipImage) return null;
  const window = sceneWindow(PORT_SCENE_ENTITY_META.ship.depth);
  return citySetSailOceanRect({
    shipX: placement.x + state.shipWaterlineLayers.opaqueMinX * placement.scale,
    waterSurfaceY: PORT_SCENE_OCEAN_SLICES[0].top - window.y,
    viewportWidth: canvas.width,
    viewportHeight: canvas.height
  });
}

function setSailLabelLayout(rect, label, font) {
  const baseWidth = pixelText.measure(label, font, { wordSpacingPx: 4 });
  const baseHeight = pixelText.height(font);
  const preferredScale = baseHeight <= 8 ? 2 : 1;
  const inset = 8;
  for (const scale of [...new Set([preferredScale, 1])]) {
    const arrowWidth = 10 * scale;
    const gap = 4 * scale;
    const textWidth = baseWidth * scale;
    const textHeight = baseHeight * scale;
    const groupWidth = arrowWidth + gap + textWidth;
    if (groupWidth > rect.w - inset * 2 || textHeight > rect.h - inset * 2) continue;
    const groupX = rect.x + Math.floor((rect.w - groupWidth) / 2);
    const textY = rect.y + Math.floor((rect.h - textHeight) / 2);
    return Object.freeze({
      arrowX: groupX,
      arrowCenterY: rect.y + Math.floor(rect.h / 2),
      scale,
      textX: groupX + arrowWidth + gap,
      textY
    });
  }
  return null;
}

function drawSetSailArrow(x, centerY, scale, color) {
  context.fillStyle = color;
  context.fillRect(x, centerY, 10 * scale, scale);
  context.fillRect(x + scale, centerY - scale, 3 * scale, scale);
  context.fillRect(x + scale, centerY + scale, 3 * scale, scale);
  context.fillRect(x + 2 * scale, centerY - 2 * scale, 2 * scale, scale);
  context.fillRect(x + 2 * scale, centerY + 2 * scale, 2 * scale, scale);
  context.fillRect(x + 3 * scale, centerY - 3 * scale, scale, scale);
  context.fillRect(x + 3 * scale, centerY + 3 * scale, scale, scale);
}

function drawLabelPlate(x, y, width, height) {
  context.fillStyle = PIRATE_MENU_PAPER;
  context.fillRect(x, y, width, height);
  context.strokeStyle = PIRATE_MENU_CHART_LINE;
  context.lineWidth = 1;
  context.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
}

function updateHover() {
  if (!state.ready || !state.features) return;
  const hit = state.pointer ? destinationAtPoint(state.pointer.x, state.pointer.y) : null;
  state.hoveredShipyardSaleShipId = hit?.saleShipId || null;
  state.hoveredDestination = hit?.destination || null;
  canvas.classList.toggle("is-actionable", Boolean(state.hoveredDestination));
  const cityLabel = renderText(state.city.label);
  const destinationLabel = state.hoveredDestination
    ? renderText(state.hoveredDestination.label)
    : null;
  canvas.setAttribute(
    "aria-label",
    `${cityLabel}, ${renderText(state.city.country)}${destinationLabel ? `, ${destinationLabel}` : ""}`
  );
}

function activeDestinations() {
  const explicit = state.availableDestinationIds;
  return DESTINATIONS.filter((destination) => {
    if (explicit && !explicit.has(destination.id)) return false;
    if (!explicit && destination.id === PORT_CITY_LOCATION.ILLICIT_MERCHANT) return false;
    if (destination.requiredFeature && !state.features?.[destination.requiredFeature]) return false;
    if (destination.requiresFortification && !state.features?.fortified) return false;
    return true;
  });
}

function destinationById(destinationId) {
  if (!destinationId) return null;
  return activeDestinations().find(({ id }) => id === destinationId) || null;
}

function validateAvailableDestinationIds(destinationIds) {
  if (!Array.isArray(destinationIds)) {
    throw new Error("City scene destination IDs must be an array");
  }
  const knownIds = new Set(DESTINATIONS.map(({ id }) => id));
  const validated = new Set();
  for (const destinationId of destinationIds) {
    if (!knownIds.has(destinationId)) throw new Error(`Unknown city destination: ${destinationId}`);
    if (validated.has(destinationId)) throw new Error(`Duplicate city destination: ${destinationId}`);
    validated.add(destinationId);
  }
  return validated;
}

function destinationAtPoint(x, y) {
  if (![x, y].every(Number.isFinite)) throw new Error("Invalid city destination coordinates");
  const destinations = activeDestinations();
  const setSailDestination = destinations.find(({ id }) => id === PORT_CITY_LOCATION.SET_SAIL);
  if (setSailDestination) {
    const rect = setSailControlRect();
    if (rect && x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) {
      return Object.freeze({ destination: setSailDestination, saleShipId: null });
    }
  }
  const shipDestination = destinations.find(({ id }) => id === PORT_CITY_LOCATION.SHIP);
  if (shipDestination && docksideShipContainsPoint(x, y)) {
    return Object.freeze({ destination: shipDestination, saleShipId: null });
  }
  const merchantDestination = destinations.find(({ id }) => id === PORT_CITY_LOCATION.ILLICIT_MERCHANT);
  if (merchantDestination && specialDestinationContainsPoint(PORT_CITY_LOCATION.ILLICIT_MERCHANT, x, y)) {
    return Object.freeze({ destination: merchantDestination, saleShipId: null });
  }
  const authorityDestination = destinations.find(({ id }) => id === PORT_CITY_LOCATION.AUTHORITY);
  if (authorityDestination && specialDestinationContainsPoint(PORT_CITY_LOCATION.AUTHORITY, x, y)) {
    return Object.freeze({ destination: authorityDestination, saleShipId: null });
  }
  const shipyardDestination = destinations.find(({ id }) => id === PORT_CITY_LOCATION.SHIPYARD);
  const hoveredSaleShip = shipyardDestination
    ? [...state.shipyardSaleShipPlacements]
        .sort((left, right) => right.z - left.z)
        .find((placement) => {
          const screen = shipyardSaleShipScreenPlacement(placement, state.lastRenderTimeMs ?? 0);
          return cityShipyardSaleShipContainsPoint({
            placement: { ...placement, x: screen.x, y: screen.y },
            screenX: x,
            screenY: y,
            alpha: placement.ship.alpha
          });
        })
    : null;
  if (hoveredSaleShip) {
    return Object.freeze({ destination: shipyardDestination, saleShipId: hoveredSaleShip.id });
  }
  const activeLayers = activePortSceneLayers(state.features);
  for (const destination of destinations) {
    for (const layerName of destination.layers) {
      if (!activeLayers.has(layerName)) continue;
      const frames = state.portManifest.staticFrames.filter((frame) => frame.layer === layerName);
      for (const [occurrence, frame] of frames.entries()) {
        const window = sceneWindow(
          layerParallaxDepth(layerName, occurrence),
          layerSceneOffsetX(layerName, occurrence, state.features?.approach || "ocean"),
          layerSceneOffsetY(layerName, occurrence, state.features?.approach || "ocean"),
          layerParallaxAnchor(layerName, occurrence)
        );
        const regionalFrame = regionalStaticFrame(frame, layerName);
        const source = regionalFrame || { atlas: state.staticAtlas, frame };
        const bombarded = authoredBombardmentPresentation(
          frame,
          layerName,
          occurrence,
          source
        );
        const displayed = bombarded || source;
        if (frameContainsOpaquePixel(
          displayed.atlas,
          displayed.frame,
          x + window.x,
          y + window.y
        )) return Object.freeze({ destination, saleShipId: null });
      }
    }
  }
  return null;
}

function docksideShipContainsPoint(screenX, screenY) {
  if (!state.shipImage) return false;
  const placement = docksideShipPlacement(state.lastRenderTimeMs ?? 0, PORT_SCENE_ENTITY_META.ship.depth);
  if (!placement) return false;
  const localX = Math.floor((screenX - placement.x) / placement.scale);
  const localY = Math.floor((screenY - placement.y - placement.bobY) / placement.scale);
  if (localX < 0 || localY < 0 || localX >= state.shipImage.width || localY >= state.shipImage.height) {
    return false;
  }
  return imageAlpha(state.shipImage)[localX + localY * state.shipImage.width] > 16;
}

function specialDestinationContainsPoint(destinationId, screenX, screenY) {
  const agent = state.specialAgents.find((candidate) => (
    candidate.destinationId === destinationId
  ));
  if (!agent) return false;
  const window = sceneWindow(PORT_SCENE_ENTITY_META.npcs.depth);
  const x = agent.startX - window.x;
  const y = agent.feetY - window.y;
  return screenX >= x - 6 && screenX <= x + 6 && screenY >= y - 18 && screenY <= y + 2;
}

function focusDestination(destinationId, { immediate = false } = {}) {
  if (typeof immediate !== "boolean") throw new Error("City focus motion policy must be boolean");
  const destination = destinationById(destinationId);
  if (!destination) throw new Error(`City destination is unavailable: ${destinationId}`);
  state.focusedDestinationId = destinationId;
  if (destination.id === PORT_CITY_LOCATION.SET_SAIL) {
    if (!state.features) throw new Error("Set Sail focus requires resolved city features");
    const { minimum } = sceneCameraParallaxBounds(state.features.approach);
    state.cameraVelocity = 0;
    if (immediate || prefersReducedMotion.matches) {
      state.parallax = minimum;
      state.cameraPanTarget = null;
      updateHover();
    } else {
      state.cameraPanTarget = minimum;
    }
    return;
  }
  const anchor = destinationScreenAnchor(destination);
  if (!anchor) return;
  const deltaX = anchor.x - canvas.width / 2;
  if (immediate || prefersReducedMotion.matches) panCameraByLogicalPixels(deltaX);
  else queueCameraPanByLogicalPixels(deltaX);
}

function moveDestinationFocus(direction) {
  if (!["left", "right", "up", "down"].includes(direction)) {
    throw new Error(`Invalid city focus direction: ${direction}`);
  }
  const destinations = activeDestinations();
  if (destinations.length === 0) return null;
  const currentIndex = destinations.findIndex(({ id }) => id === state.focusedDestinationId);
  const step = direction === "left" || direction === "up" ? -1 : 1;
  const nextIndex = currentIndex < 0
    ? 0
    : positiveModulo(currentIndex + step, destinations.length);
  focusDestination(destinations[nextIndex].id);
  return destinations[nextIndex].id;
}

function destinationScreenAnchor(destination) {
  if (destination.id === PORT_CITY_LOCATION.SHIP) {
    const placement = docksideShipPlacement(state.lastRenderTimeMs ?? 0, PORT_SCENE_ENTITY_META.ship.depth);
    return placement ? { x: placement.x + state.shipImage.width / 2, y: placement.y } : null;
  }
  if ([PORT_CITY_LOCATION.ILLICIT_MERCHANT, PORT_CITY_LOCATION.AUTHORITY].includes(destination.id)) {
    const agent = state.specialAgents.find(({ destinationId }) => (
      destinationId === destination.id
    ));
    if (agent) {
      const window = sceneWindow(PORT_SCENE_ENTITY_META.npcs.depth);
      return { x: agent.startX - window.x, y: agent.feetY - window.y };
    }
  }
  const activeLayers = activePortSceneLayers(state.features);
  for (const layerName of destination.layers) {
    if (!activeLayers.has(layerName)) continue;
    const frame = state.portManifest.staticFrames.find((candidate) => candidate.layer === layerName);
    if (!frame) continue;
    const window = sceneWindow(layerParallaxDepth(layerName));
    return {
      x: frame.spriteSourceSize.x + frame.frame.w / 2 - window.x,
      y: frame.spriteSourceSize.y + frame.frame.h / 2 - window.y
    };
  }
  return null;
}

function activateDestination(destinationId, saleShipId = null) {
  const destination = destinationById(destinationId);
  if (!destination) throw new Error(`City destination is unavailable: ${destinationId}`);
  const activation = Object.freeze({ id: destination.id, saleShipId });
  if (onDestination) onDestination(activation);
  return activation;
}

function createSpecialPeopleAgents() {
  if (!state.city) return Object.freeze([]);
  const agents = [];
  if (!state.features?.fortified &&
      state.availableDestinationIds?.has(PORT_CITY_LOCATION.AUTHORITY)) {
    agents.push(Object.freeze({
      id: `${state.city.id}:port-authority`,
      destinationId: PORT_CITY_LOCATION.AUTHORITY,
      appearanceId: cityGarrisonAppearanceIds(state.city, 1, "port-authority")[0],
      role: "garrison",
      startX: 880,
      endX: 880,
      feetY: 518,
      phase: 0,
      speed: 0,
      motion: "stationary",
      facingRight: false
    }));
  }
  const caught = state.illicitCaughtStartedAtMs !== null;
  const guardCount = state.barred ? 5 : caught ? 3 : 0;
  if (guardCount > 0) {
    for (const [index, appearanceId] of cityGarrisonAppearanceIds(state.city, guardCount).entries()) {
      const startX = 704 + index * 19;
      agents.push(Object.freeze({
        id: `${state.city.id}:barred-dock-guard:${index + 1}`,
        appearanceId,
        role: "garrison",
        startX,
        endX: caught ? 798 + index * 8 : startX,
        feetY: 518 + index % 2 * 9,
        phase: index / 5,
        speed: caught ? 0.0014 : 0,
        motion: caught ? "guard-approach" : "stationary",
        startedAtMs: caught ? state.illicitCaughtStartedAtMs : undefined,
        facingRight: index % 2 === 0
      }));
    }
  }
  if (caught || state.availableDestinationIds?.has(PORT_CITY_LOCATION.ILLICIT_MERCHANT)) {
    agents.push(Object.freeze({
      id: `${state.city.id}:suspicious-merchant`,
      destinationId: PORT_CITY_LOCATION.ILLICIT_MERCHANT,
      appearanceId: citySuspiciousMerchantAppearanceId(state.city),
      role: "ambient",
      startX: 823,
      endX: caught ? 975 : 823,
      feetY: 519,
      phase: 0,
      speed: caught ? 0.0017 : 0,
      motion: caught ? "merchant-flee" : "stationary",
      animationId: caught ? "walk" : "idle2",
      startedAtMs: caught ? state.illicitCaughtStartedAtMs : undefined,
      facingRight: false
    }));
  }
  return Object.freeze(agents);
}

function imageAlpha(image) {
  if (imageAlphaCache.has(image)) return imageAlphaCache.get(image);
  const buffer = document.createElement("canvas");
  buffer.width = image.width;
  buffer.height = image.height;
  const bufferContext = buffer.getContext("2d", { willReadFrequently: true });
  bufferContext.drawImage(image, 0, 0);
  const rgba = bufferContext.getImageData(0, 0, image.width, image.height).data;
  const alpha = new Uint8Array(image.width * image.height);
  for (let index = 0; index < alpha.length; index++) alpha[index] = rgba[index * 4 + 3];
  imageAlphaCache.set(image, alpha);
  return alpha;
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

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`Could not load ${url}: HTTP ${response.status}`);
  return response.json();
}

function portAtlasUrl(manifest, sheet) {
  if (typeof sheet !== "string" || sheet.length === 0) {
    throw new Error("City-view atlas manifest is missing a sheet filename");
  }
  if (typeof manifest?.assetRevision !== "string" || manifest.assetRevision.length === 0) {
    throw new Error("City-view atlas manifest is missing its asset revision");
  }
  return `${assetBaseUrl}/port-parallax/${sheet}?v=${encodeURIComponent(manifest.assetRevision)}`;
}

function loadImage(url) {
  if (imageCache.has(url)) return imageCache.get(url);
  const request = new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load image: ${url}`));
    image.src = url;
  }).catch((error) => {
    if (imageCache.get(url) === request) imageCache.delete(url);
    throw error;
  });
  imageCache.set(url, request);
  return request;
}

function loadTransientImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load image: ${url}`));
    image.src = url;
  });
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0 || 1;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function positiveModulo(value, modulus) {
  return ((value % modulus) + modulus) % modulus;
}

await initialize();

return Object.freeze({
  canvas,
  get cityId() {
    return state.city?.id || null;
  },
  get renderCount() {
    return state.renderCount;
  },
  async selectCity(cityId, options = {}) {
    await selectCity(cityId, options);
  },
  async preloadCity(cityId, options = {}) {
    await preloadCity(cityId, options);
  },
  getDestinationIds() {
    return Object.freeze(activeDestinations().map(({ id }) => id));
  },
  focusDestination(destinationId) {
    focusDestination(destinationId);
  },
  moveFocus(direction) {
    return moveDestinationFocus(direction);
  },
  activateFocusedDestination() {
    return activateDestination(state.focusedDestinationId);
  },
  destinationAt(x, y) {
    const hit = destinationAtPoint(x, y);
    return hit ? Object.freeze({ id: hit.destination.id, saleShipId: hit.saleShipId }) : null;
  },
  activateAt(x, y) {
    const hit = destinationAtPoint(x, y);
    return hit ? activateDestination(hit.destination.id, hit.saleShipId) : null;
  },
  drawEmissiveOverlay(targetContext) {
    if (!separateEmissiveOverlay || !emissiveCanvas) {
      throw new Error("City scene emissive overlay was not configured separately");
    }
    if (!targetContext || typeof targetContext.drawImage !== "function") {
      throw new TypeError("City scene emissive overlay requires a 2D target context");
    }
    targetContext.save();
    targetContext.imageSmoothingEnabled = false;
    targetContext.drawImage(emissiveCanvas, 0, 0);
    targetContext.restore();
  },
  setWeather({ wind, precipitation }) {
    if (![null, "rain", "snow"].includes(precipitation?.kind)) {
      throw new Error(`Unknown live city precipitation kind: ${precipitation?.kind}`);
    }
    if (!Number.isFinite(precipitation?.intensity) ||
        precipitation.intensity < 0 || precipitation.intensity > 1) {
      throw new Error(`Invalid live city precipitation intensity: ${precipitation?.intensity}`);
    }
    if (precipitation.kind === null && precipitation.intensity !== 0) {
      throw new Error("Clear live city weather cannot have precipitation intensity");
    }
    const signature = `${wind?.directionRad}:${wind?.strength}:${precipitation.kind}:${precipitation.intensity}`;
    if (state.weatherSignature === signature) return;
    state.weatherSignature = signature;
    state.wind = cityWindFromGeographicWind(wind);
    state.precipitation = Object.freeze({
      kind: precipitation.kind,
      intensity: precipitation.intensity
    });
    state.precipitationFrameCache = null;
  },
  setPointer(x, y) {
    if (x === null && y === null) state.pointer = null;
    else if (![x, y].every(Number.isFinite)) throw new Error("Invalid city pointer coordinates");
    else state.pointer = Object.freeze({ x, y });
    updateHover();
  },
  panByLogicalPixels(deltaX) {
    if (!Number.isFinite(deltaX)) throw new Error(`Invalid city camera pan: ${deltaX}`);
    panCameraByLogicalPixels(deltaX);
  },
  render(timeMs) {
    if (!state.ready) throw new Error("City scene runtime rendered before initialization");
    renderCityFrame(timeMs);
    state.renderCount++;
    return state.renderCount;
  },
  drawPersonSprite(targetContext, options) {
    drawPersonSprite(targetContext, options);
  },
  resize(width, height) {
    if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
      throw new RangeError(`City scene dimensions must be positive integers, got ${width}x${height}`);
    }
    canvas.width = width;
    canvas.height = height;
    context.imageSmoothingEnabled = false;
    citySceneRenderer.invalidateStaticCache();
    updateHover();
  }
});
}
