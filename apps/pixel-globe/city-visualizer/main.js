import { CROATOAN_CLUE, cityRuinsDamage, croatoanClueScreenRect, croatoanClueContainsPoint } from "./cityColonyRuins.js";
import { GAME_ICON_ASSET_VERSION, gameIconAtlasRect, gameIconAtlasDimensions } from "../src/gameIcons.js";
import { requirePixelPerfectSpriteScale } from "../src/pixelPerfectSpriteScale.js";
import { cityAssaultCameraTargetPosition } from "./cityAssaultCamera.js";
import { cityCombatEntryOpacity } from "./cityCombatVisibility.js";
import { activeForeignSettlements, foreignSettlementsForCity1522 } from "../src/foreignSettlements.js";
import {
  CITY_FEAST_TABLE, CITY_FEAST_TABLE_Z, CITY_FEAST_SHADOW_Z, CITY_FEAST_FOOD_FILES,
  cityFeastFrames, createCityFeastGuests, cityFeastGuestPose, cityFeastDishes
} from "./cityFeast.js";
import {
  PORT_SCENE_ENTITY_META,
  PORT_SCENE_DOCK,
  PORT_SCENE_CAMERA,
  PORT_SCENE_DEPTH,
  PORT_SCENE_HORIZON_SHIFT_Y,
  PORT_SCENE_MASTER,
  PORT_SCENE_OCEAN_SLICES,
  BACKGROUND_CITY_UNDERLAY_LAYERS,
  activePortSceneLayers,
  advanceSceneParallax,
  advanceSceneScrollVelocity,
  cityFrameHitMaskContainsPoint,
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
  sceneCameraDockParallax,
  sceneCameraParallaxBounds,
  sceneCameraSetSailIsRevealed,
  sceneEdgeScrollVelocity,
  sceneInertialPanTargetVelocity,
  scenePanParallaxDelta
} from "./citySceneRules.js";
import {
  PIRATE_MENU_CHART_LINE,
  PIRATE_MENU_INK,
  PIRATE_MENU_PAPER_BUTTON,
  PIRATE_MENU_PAPER_SELECTED
} from "../src/pirateUiPalette.js";
import {
  BACKGROUND_CITY_BASE_LAYER,
  cityBackgroundAtmosphereLevel,
  cityBackgroundAtmosphereRgb,
  cityBackgroundBaseTopProfile,
  cityBackgroundLayout,
  cityBackgroundPainterOrder,
  oppositeBankCityBackgroundLayout
} from "./cityBackground.js";
import { cityOceanParallaxDepth, cityOceanRowOffset } from "./cityOceanMotion.js";
import {
  cityWaterAnimatedLayerUsesPalette,
  cityWaterDepthIndex,
  cityWaterLatitudeBand,
  cityWaterPaletteHexForSourceHex,
  cityWaterPaletteRgb,
  applyCityWaterPalette
} from "./cityWaterPalette.js";
import {
  flagFabricColumnLayout,
  flagWaveColumnOffsets,
  flagWindPose
} from "../src/flagAnimation.js";
import {
  CITY_PIXEL_FONT_SMALL_8,
  CITY_PIXEL_FONT_TITLE_8,
  cityPortTitleLayout,
  createCityPixelTextRenderer
} from "./cityPixelText.js";
import {
  CITY_CHIMNEY_SMOKE_EMITTERS,
  backgroundCityChimneySmokeEmitters,
  cityChimneySmokeFrameParticles,
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
  CITY_BOMBARDMENT_FIRE_PAINTER_Z,
  CITY_GATE_FRONT_PAINTER_Z,
  CITY_NPC_PATHS,
  CITY_PORT_ASSAULT_LANE_FEET_Y,
  cityPortAssaultLaneFeetY,
  CITY_PORT_ASSAULT_SHIP_FOREGROUND_PAINTER_Z,
  cityPortAssaultLanePainterZ,
  cityGroundPainterZ,
  cityNpcPathPoint,
  cityNpcPaths
} from "./cityPainterOrder.js";
import {
  CITY_ANIMATION_PLAYBACK,
  cityAnimationFrame
} from "./cityAnimationFrame.js";
import {
  cityAssaultForwardEntryShift,
  cityAssaultJumpPoint,
  cityAssaultKnockbackOffset,
  cityAssaultLaneX,
  CITY_ASSAULT_TRACK_SPAN_PX,
  cityAssaultMeleeLungeOffset
} from "./cityAssaultMotion.js";
import { cityMatchlockSmokeParticles } from "./cityMatchlockSmoke.js";
import {
  CITY_COLONIST_LANE_FEET_Y,
  createCityColonistRoster,
  cityColonistLandingFrame,
  cityColonistScreenPoint
} from "./cityColonistLanding.js";
import {
  PORT_ASSAULT_ATTACKER_ENTRY_POSITION,
  portAssaultLandingDurationMs
} from "../src/portAssaultBattle.js";
import {
  CITY_SHIPYARD_FRONT_Z,
  cityShipyardConstructionPlacement,
  validateCityShipyardConstruction
} from "./cityShipyardConstruction.js";
import {
  cityGarrisonAppearanceIds,
  cityPortStaffAppearanceIds,
  citySuspiciousMerchantAppearanceId,
  createCityBombardmentCivilianAgents,
  createCityPeopleAgents,
  validateCityPeopleAtlasImage,
  validateCityPeopleManifest
} from "./cityPeople.js";
import { PORT_CITY_STAFF_ROLE } from "../src/characterPortraits.js";
import { PORT_CITY_LOCATION } from "../src/portCityNavigation.js";
import {
  activeCityDestinations,
  validateCityDestinationIds
} from "./cityDestinations.js";
import { cityArchitectureStyleForLayer } from "./cityArchitecture.js";
import {
  DOCKSIDE_SHIP_WATERLINE_RGB,
  docksideShipHullBarLayout,
  docksideShipWaterlinePixelKeys
} from "./cityDocksideShipWaterline.js";
import { shipHullIsDamaged } from "../src/shipHullBar.js";
import { PLAYER_SHIP_COMBAT_COLOR } from "../src/shipCombatPresentation.js";
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
import {
  CITY_BOMBARDMENT_SMOKE_FRAME_MS,
  cityBombardmentEffectGeometry,
  cityBombardmentEffectIntersectsViewport
} from "./cityBombardmentEffects.js";
import {
  applyCityBuildingEdgeContrast,
  cityBuildingEdgeContrastApplies,
  citySkySourceColorsByRow
} from "./cityBuildingEdgeContrast.js";
import {
  cityDestinationLabelContainsPoint,
  cityDestinationLeader,
  layoutCityDestinationLabels,
  retainAvailableCityDestinationLabelPin
} from "./cityDestinationLabels.js";
import {
  cityGuardApproachEndX,
  cityGuardPlacement,
  cityPortStaffPlacements,
  citySuspiciousMerchantPlacement
} from "./citySpecialPeoplePlacement.js";

import { createRasterFramePixelReader } from "../src/rasterFramePixels.js";
import { loadCitySceneCatalog } from "../src/cityCatalogAssets.js";

export async function createCitySceneRuntime({
  canvas,
  assetBaseUrl = "./assets",
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
if (typeof onDestination !== "function") {
  throw new TypeError("City scene runtime requires a destination callback");
}
const context = canvas.getContext("2d", { alpha: false });
if (!context) throw new Error("City scene runtime could not create its 2D canvas context");
const emissiveCanvas = separateEmissiveOverlay ? document.createElement("canvas") : null;
const emissiveContext = emissiveCanvas?.getContext("2d") || null;
if (separateEmissiveOverlay && !emissiveContext) {
  throw new Error("City scene runtime could not create its emissive overlay context");
}
const pixelText = createCityPixelTextRenderer(context, () => document.createElement("canvas"));
const overlayPixelText = emissiveContext
  ? createCityPixelTextRenderer(emissiveContext, () => document.createElement("canvas"))
  : pixelText;
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
const bombardmentFireMaskCanvas = document.createElement("canvas");
const bombardmentFireMaskContext = bombardmentFireMaskCanvas.getContext("2d");
if (!bombardmentFireMaskContext) {
  throw new Error("City scene could not create its bombardment fire mask context");
}
const buildingEdgeContrastFrameCache = new WeakMap();
const readStaticFramePixels = createRasterFramePixelReader(readAtlasFramePixels);
const MAX_DOCKSIDE_SHIP_PRESENTATIONS = 4;
const CITY_VISUALIZER_BENCHMARK = benchmark ?? (
  externalFrameClock ? null : cityVisualizerBenchmarkFromSearch(window.location.search)
);
const STATIC_SCENE_ENTRY_KINDS = new Set(CITY_STATIC_SCENE_ENTRY_KINDS);
const BACKGROUND_CITY_UNDERLAY_LAYER_NAMES = new Set(
  Object.values(BACKGROUND_CITY_UNDERLAY_LAYERS)
);
const CITY_VISUALIZER_DEFAULT_CITY_ID = "london|united kingdom";
const SUSPICIOUS_MERCHANT_HIT_PADDING_PX = 8;
const SHIPYARD_BUILDING_HIT_PADDING_PX = 4;
const CITY_PORT_ASSAULT_TRACK_START_X = 666;
let dockShadowExtensionRows = null;
let beachOpaqueRowRuns = null;
let renderFrameId = null;
let bombardmentOverlayFrameCache = null;
let skySourceColorsByRow = null;
let skyMasterY = null;
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
  foreignSettlements: [],
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
  shipForegroundImage: null,
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
  featureOverrides: Object.freeze({}),
  parallax: PORT_SCENE_CAMERA.defaultParallax,
  cameraVelocity: 0,
  cameraPanTarget: null,
  lastRenderTimeMs: null,
  pointer: null,
  hoveredDestination: null,
  hoveredShipyardSaleShipId: null,
  pinnedDestinationLabel: null,
  hoverPanDestinationId: null,
  focusedDestinationId: null,
  colonyClueId: null,
  gameIconAtlas: null,
  destinationLabelLayouts: Object.freeze([]),
  destinationLabelLayoutParallax: null,
  availableDestinationIds: null,
  barred: false,
  illicitCaughtStartedAtMs: null,
  bombardmentEventId: null,
  assaultPresentation: null,
  colonistLanding: null,
  feast: null,
  feastFoodImages: null,
  specialAgents: [],
  backgroundCityRows: [],
  backgroundCityPainterOrder: [],
  backgroundCitySmokeByBuilding: new Map(),
  leftBankBackgroundCityRows: [],
  leftBankBackgroundCityPainterOrder: [],
  leftBankBackgroundCitySmokeByBuilding: new Map(),
  backgroundCityBaseTopYByX: null,
  streetBuildings: [],
  treePlacements: [],
  quayCargoPlacements: [],
  npcAgents: [],
  renderCount: 0,
  benchmarkState: null,
  benchmarkColdFrameCpuMs: null,
  benchmarkMaxFrameCpuMs: 0
};
let citySelectionSerial = 0;
const citySceneRenderer = createCachedSceneRenderer({
  displayContext: context,
  createSurface: createCitySceneCacheSurface,
  drawEntry: drawMeasuredSceneEntry,
  isStaticEntry: (entry) => STATIC_SCENE_ENTRY_KINDS.has(entry.kind)
});

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
      loadCitySceneCatalog(),
      fetchJson(`${assetBaseUrl}/port-parallax/manifest.json`, { cache: "no-store" }),
      fetchJson(`${assetBaseUrl}/minifolks/manifest.json`, { cache: "no-store" }),
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
      loadImage(cityPeopleAtlasUrl(state.peopleManifest)),
      loadImage("/assets/misc/fire.png?v=fire-effect-2")
    ]);
    state.gameIconAtlas = await loadImage(`/assets/ui/game-icons.png?v=${GAME_ICON_ASSET_VERSION}`);
    const iconDimensions = gameIconAtlasDimensions();
    if (state.gameIconAtlas.width !== iconDimensions.width || state.gameIconAtlas.height !== iconDimensions.height) {
      throw new Error("City clue icon atlas dimensions do not match the game icon catalog");
    }
    validateCityPeopleAtlasImage(state.peopleManifest, state.peopleAtlas);
    cityFeastFrames(portManifest);
    state.feastFoodImages = Object.fromEntries(await Promise.all(
      Object.entries(CITY_FEAST_FOOD_FILES).map(async ([id, file]) => {
        const image = await loadImage(`/assets/misc/${file}.png?v=provision-icons-3`);
        if (image.width !== 6 || image.height !== 6) throw new Error(`Feast food must be 6x6: ${id}`);
        return [id, image];
      })
    ));
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
    await selectInitialCity();
    if (canvas.width <= 0 || canvas.height <= 0) {
      throw new Error("City scene runtime requires explicit positive canvas dimensions");
    }
    state.ready = true;
    if (CITY_VISUALIZER_BENCHMARK) setupCityVisualizerBenchmark();
    if (!externalFrameClock) scheduleRender();
  } catch (error) {
    console.error(error);
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
  const sky = state.portManifest.staticFrames.find((frame) => frame.layer === "Sky");
  if (!sky) throw new Error("Port scene is missing its sky frame");
  const skyImageData = staticFrameImageData({ atlas: state.staticAtlas, frame: sky });
  skySourceColorsByRow = citySkySourceColorsByRow({
    pixels: skyImageData.data,
    width: sky.frame.w,
    height: sky.frame.h
  });
  skyMasterY = sky.spriteSourceSize.y + layerSceneOffsetY("Sky", 0, "ocean");
  const beach = state.portManifest.staticFrames.find((frame) => frame.layer === "Sand Beach");
  if (!beach) throw new Error("Port scene is missing its beach frame");
  beachOpaqueRuns(beach);
  dockShadowRows();
  for (const frame of state.portManifest.animated.Waves.frames) {
    animatedOpaqueLeftEdges(state.waveAtlas, frame);
  }
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
  foreignSettlements = null,
  factionId = null,
  label = null,
  shipyardConstruction = null,
  barred = false,
  illicitCaughtStartedAtMs = null,
  bombardmentEventId = null,
  colonyClueId = null,
  population = null,
  settlementType = null,
  featureOverrides = Object.freeze({})
} = {}) {
  const serial = ++citySelectionSerial;
  const city = resolveCityRecord(cityId, { factionId, label, population, settlementType });
  const selectedForeignSettlements = activeForeignSettlements({
    ...city, foreignSettlements: foreignSettlements ?? foreignSettlementsForCity1522(city)
  });
  for (const settlement of selectedForeignSettlements) requiredPreloadedFlagImage(settlement.factionId);
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
    shipyardConstruction,
    featureOverrides
  });
  if (serial !== citySelectionSerial) return;

  if (colonyClueId !== null && (colonyClueId !== CROATOAN_CLUE.id ||
      featureOverrides.settlementStage !== "ruins")) {
    throw new Error(`Invalid colony scene clue: ${colonyClueId}`);
  }
  state.colonyClueId = colonyClueId;
  state.city = city;
  state.foreignSettlements = selectedForeignSettlements;
  state.availableDestinationIds = validatedDestinationIds;
  state.barred = barred;
  state.illicitCaughtStartedAtMs = illicitCaughtStartedAtMs;
  state.bombardmentEventId = bombardmentEventId;
  state.assaultPresentation = null;
  state.colonistLanding = null;
  state.feast = null;
  bombardmentFrameCache.clear();
  bombardmentOverlayFrameCache = null;
  state.focusedDestinationId = null;
  state.pinnedDestinationLabel = null;
  state.hoverPanDestinationId = null;
  invalidateDestinationLabelLayouts();
  state.cityFlagFactionId = city.factionId;
  state.cityFlagImage = prepared.cityFlagImage;
  state.shipSlug = prepared.ship.slug;
  state.shipImage = prepared.shipPresentation.shipImage;
  state.shipForegroundImage = prepared.shipPresentation.shipForegroundImage;
  state.shipOutline = prepared.shipPresentation.shipOutline;
  state.shipSinkDepthImage = prepared.shipPresentation.shipSinkDepthImage;
  state.shipWaterlineLayers = prepared.shipPresentation.shipWaterlineLayers;
  state.shipWaterShadowImages = prepared.shipPresentation.shipWaterShadowImages;
  state.shipyardSaleShips = prepared.saleShips;
  state.shipyardSaleShipPlacements = cityShipyardSaleShipPlacements(prepared.saleShips);
  state.shipyardConstructionPlacement = prepared.shipyardConstructionPlacement;
  canvas.setAttribute("aria-label", `${renderText(city.label)}, ${renderText(city.country)}`);
  state.wind = cityWindForCity(state.city);
  applyFeatureOverrides(featureOverrides, { rebuild: false });
  state.parallax = sceneCameraDockParallax({
    viewportWidth: canvas.width,
    approach: state.features.approach
  });
  state.cameraVelocity = 0;
  state.cameraPanTarget = null;
  if (["colony", "ruins"].includes(state.features.settlementStage)) focusSceneMasterX(1100, { immediate: true });
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

function resolveCityRecord(cityId, {
  factionId = null, label = null, population = null, settlementType = null
} = {}) {
  const catalogCity = state.catalog.cities.find((candidate) => candidate.id === cityId);
  if (!catalogCity) throw new Error(`Unknown visualizer city: ${cityId}`);
  if (factionId !== null && (typeof factionId !== "string" || factionId === "")) {
    throw new Error(`Invalid visualizer city faction: ${factionId}`);
  }
  if (label !== null && (typeof label !== "string" || label.trim() === "")) {
    throw new Error(`Invalid visualizer city label: ${label}`);
  }
  if (population !== null && (!Number.isInteger(population) || population < 1)) {
    throw new Error(`Invalid visualizer city population: ${population}`);
  }
  if (settlementType !== null && !["city", "village"].includes(settlementType)) {
    throw new Error(`Invalid visualizer settlement type: ${settlementType}`);
  }
  const liveFactionId = factionId ?? catalogCity.factionId;
  const liveLabel = label ?? catalogCity.label;
  // Authored skyline density describes the catalog settlement. A live colony's
  // population must instead determine its skyline density.
  const { density, ...backgroundCity } = catalogCity.backgroundCity || {};
  return liveFactionId === catalogCity.factionId && liveLabel === catalogCity.label &&
      population === null && settlementType === null
    ? catalogCity
    : Object.freeze({
      ...catalogCity, factionId: liveFactionId, label: liveLabel,
      population: population ?? catalogCity.population,
      settlementType: settlementType ?? catalogCity.settlementType,
      ...(settlementType === null ? {} : { architecture: undefined, services: undefined }),
      ...(population === null ? {} : { backgroundCity })
    });
}

async function preloadCity(cityId, options = {}) {
  const city = resolveCityRecord(cityId, options);
  await preloadCitySelection(city, options);
}

async function preloadCitySelection(city, {
  playerShipSlug = null,
  saleShipSlugs = null,
  shipyardConstruction = null,
  featureOverrides = Object.freeze({})
} = {}) {
  const features = resolveCitySceneFeatures(city, featureOverrides);
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

function updateBombardmentEventId(eventId) {
  validateBombardmentEventId(eventId);
  if (state.bombardmentEventId === eventId) return;
  state.bombardmentEventId = eventId;
  rebuildCityPeopleAgents();
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

function applyFeatureOverrides(overrides, { rebuild = true } = {}) {
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) {
    throw new TypeError("City scene feature overrides must be an object");
  }
  bombardmentOverlayFrameCache = null;
  state.pinnedDestinationLabel = null;
  state.hoverPanDestinationId = null;
  state.featureOverrides = Object.freeze({ ...overrides });
  state.features = resolveCitySceneFeatures(state.city, state.featureOverrides);
  rebuildCityPeopleAgents();
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
  state.backgroundCityRows = state.features.backgroundCity
    ? cityBackgroundLayout({
        city: state.city,
        frames: state.portManifest.staticFrames,
        baseFrame: backgroundCityBase,
        baseTopYByX: state.backgroundCityBaseTopYByX
      })
    : [];
  state.backgroundCityPainterOrder = cityBackgroundPainterOrder(state.backgroundCityRows);
  state.backgroundCitySmokeByBuilding = backgroundCitySmokeMap({
    cityId: state.city.id,
    side: "right",
    rows: state.backgroundCityRows
  });
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
  if (state.focusedDestinationId !== null && !destinationById(state.focusedDestinationId)) {
    const destinations = activeDestinations();
    state.focusedDestinationId = destinations.find(({ id }) => id === PORT_CITY_LOCATION.SHIP)?.id ??
      destinations[0]?.id ?? null;
  }
  invalidateDestinationLabelLayouts();
  updateHover();
  if (rebuild) rebuildCitySceneRenderPlan();
}

function rebuildCityPeopleAgents() {
  if (!state.city || !state.features) {
    throw new Error("City people cannot be built before the scene selection");
  }
  state.npcAgents = state.bombardmentEventId === null
    ? createCityPeopleAgents({
        city: state.city,
        count: state.features.npcs,
        paths: cityNpcPaths({ fortified: state.features.fortified })
      })
    : createCityBombardmentCivilianAgents({
        city: state.city,
        count: state.features.npcs,
        paths: CITY_NPC_PATHS
      });
}

async function selectShip(shipSlug) {
  const serial = ++citySelectionSerial;
  const ship = requireCityDocksideShip(state.docksideShipCatalog, shipSlug);
  const presentation = await prepareDocksideShipPresentation(ship, state.city.lat);
  if (serial !== citySelectionSerial) return;
  state.shipSlug = ship.slug;
  state.shipImage = presentation.shipImage;
  state.shipForegroundImage = presentation.shipForegroundImage;
  state.shipOutline = presentation.shipOutline;
  state.shipSinkDepthImage = presentation.shipSinkDepthImage;
  state.shipWaterlineLayers = presentation.shipWaterlineLayers;
  state.shipWaterShadowImages = presentation.shipWaterShadowImages;
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
  const [shipImage, shipForegroundImage, shipSinkDepthImage, ...waterShadowMasks] = await Promise.all(
    assetUrls.map(loadTransientImage)
  );
  const { width, height } = ship.cityDockside;
  for (const [label, image] of [
    ["raster", shipImage],
    ["foreground raster", shipForegroundImage],
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
    shipForegroundImage,
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

function focusAssaultPresentation(presentation) {
  const position = cityAssaultCameraTargetPosition(presentation.units);
  if (position === null) return;
  focusSceneMasterX(666 + position * 640);
}

function focusSceneMasterX(masterX, { immediate = false } = {}) {
  const window = sceneWindow(PORT_SCENE_ENTITY_META.npcs.depth);
  const delta = scenePanParallaxDelta({
    screenDeltaX: masterX - window.x - canvas.width / 2,
    displayWidth: canvas.width,
    logicalWidth: canvas.width,
    approach: state.features?.approach || "ocean"
  });
  const bounds = sceneCameraParallaxBounds(state.features?.approach || "ocean");
  const target = clamp(state.parallax + delta, bounds.minimum, bounds.maximum);
  if (immediate || prefersReducedMotion.matches) {
    state.parallax = target;
    state.cameraVelocity = 0;
    state.cameraPanTarget = null;
  } else {
    state.cameraPanTarget = target;
  }
}

function advanceCamera(timeMs) {
  if (state.lastRenderTimeMs === null) {
    state.lastRenderTimeMs = timeMs;
    return;
  }
  const elapsedMs = Math.min(50, Math.max(0, timeMs - state.lastRenderTimeMs));
  state.lastRenderTimeMs = timeMs;
  const cameraBounds = sceneCameraParallaxBounds(state.features?.approach || "ocean");
  if (
    CITY_VISUALIZER_BENCHMARK?.cameraMode === "pan" &&
    state.cameraPanTarget === null
  ) {
    state.cameraPanTarget = state.parallax >= cameraBounds.maximum
      ? cameraBounds.minimum
      : cameraBounds.maximum;
  }
  if (prefersReducedMotion.matches) {
    state.cameraVelocity = 0;
  } else {
    const pointerOverDestinationLabel = state.pointer
      ? Boolean(destinationLabelAtPoint(state.pointer.x, state.pointer.y))
      : false;
    const targetVelocity = state.cameraPanTarget === null
      ? (state.pointer && !pointerOverDestinationLabel
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
  advanceCityFrame(timeMs);
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
    advanceCityFrame(timeMs);
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

function advanceCityFrame(timeMs) {
  if (state.colonistLanding && !state.colonistLanding.frame.complete) {
    const window = sceneWindow(PORT_SCENE_ENTITY_META.npcs.depth);
    const shipboard = assaultShipboardStartPoint(timeMs);
    const units = state.colonistLanding.frame.units;
    const centerX = units.reduce((sum, unit) => sum + cityColonistScreenPoint(
      unit, colonistLandingGeometry(unit, window, shipboard)
    ).x, 0) / units.length;
    focusSceneMasterX(centerX + window.x);
  }
  advanceCamera(timeMs);
  advanceCloudMotion(timeMs);
  prepareDestinationLabelLayouts();
  if (state.pointer) updateHover();
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
  const opacity = cityCombatEntryOpacity(entry, state.assaultPresentation !== null);
  if (opacity !== 1) {
    targetContext.save();
    targetContext.globalAlpha *= opacity;
  }
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
  else if (entry.kind === "colony-clue") drawColonyClue(targetContext);
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
  else if (entry.kind === "foreign-settlement-flag") drawForeignSettlementFlag(entry, timeMs);
  else if (entry.kind === "cloud") drawCloud(entry, timeMs);
  else if (entry.kind === "shipyard-sale-ship") {
    drawShipyardSaleShip(entry.placement, timeMs, targetContext);
  }
  else if (entry.kind === "ship") drawDocksideShip(timeMs);
  else if (entry.kind === "ship-foreground") drawDocksideShipForeground(timeMs);
  else if (entry.kind === "npc") drawNpc(entry.agent, timeMs);
  else if (entry.kind === "port-assault") drawPortAssaultPresentation(entry.lane);
  else if (entry.kind === "colonist-landing") drawColonistLanding(entry.lane, timeMs);
  else if (entry.kind === "feast-table") drawFeastTable(targetContext);
  else if (entry.kind === "feast-shadow") drawFeastShadow(targetContext);
  else if (entry.kind === "feast-guest") {
    drawNpc(cityFeastGuestPose(entry.guest, state.feast.phase, state.feast.elapsedMs), timeMs);
  }
  else throw new Error(`Unknown city scene render entry: ${entry.kind}`);
  if (opacity !== 1) targetContext.restore();
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
  state.benchmarkColdFrameCpuMs ??= cpuMs;
  state.benchmarkMaxFrameCpuMs = Math.max(state.benchmarkMaxFrameCpuMs, cpuMs);
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
    coldFrameCpuMs: state.benchmarkColdFrameCpuMs,
    maxFrameCpuMs: state.benchmarkMaxFrameCpuMs,
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
    `assault=${state.assaultPresentation !== null}`,
    `camera=${state.parallax}`,
    `bombardment=${state.bombardmentEventId || "none"}`,
    hoveredDestinationId
  ].join("|");
}

function cityStaticCacheIsUsable() {
  return cityStaticSceneCacheAllowed({
    cameraGestureActive: false,
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
    if (emitter && state.features.settlementStage !== "ruins") {
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
    if (state.feast && placement.x + placement.width >= CITY_FEAST_TABLE.x &&
        placement.x <= CITY_FEAST_TABLE.x + CITY_FEAST_TABLE.width &&
        placement.groundY >= 505 && placement.groundY <= 540) continue;
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
  if (state.bombardmentEventId !== null && !["uninhabited", "ruins"].includes(state.features.settlementStage)) {
    entries.push({
      kind: "bombardment-fire-overlay",
      z: CITY_BOMBARDMENT_FIRE_PAINTER_Z,
      authoredOrder: 37.4
    });
  }
  if (state.colonyClueId !== null) {
    entries.push({ kind: "colony-clue", z: CROATOAN_CLUE.z, authoredOrder: 37.5 });
  }
  entries.push({ kind: "ship", ...PORT_SCENE_ENTITY_META.ship, authoredOrder: 34.5 });
  if (state.colonistLanding) {
    for (const [lane, feetY] of CITY_COLONIST_LANE_FEET_Y.entries()) {
      entries.push({
        kind: "colonist-landing", lane,
        z: cityGroundPainterZ(feetY), authoredOrder: 38.9 + lane / 100
      });
    }
    entries.push({ kind: "ship-foreground", z: CITY_PORT_ASSAULT_SHIP_FOREGROUND_PAINTER_Z,
      authoredOrder: 38.95 });
  }
  if (state.assaultPresentation) {
    for (const lane of CITY_PORT_ASSAULT_LANE_FEET_Y.keys()) {
      entries.push({
        kind: "port-assault",
        lane,
        z: cityPortAssaultLanePainterZ(lane),
        authoredOrder: 38.9 + lane / 100
      });
    }
    entries.push({
      kind: "ship-foreground",
      z: CITY_PORT_ASSAULT_SHIP_FOREGROUND_PAINTER_Z,
      authoredOrder: 38.95
    });
  } else if (state.feast) {
    entries.push({ kind: "feast-shadow", z: CITY_FEAST_SHADOW_Z, authoredOrder: 37 });
    entries.push({ kind: "feast-table", z: CITY_FEAST_TABLE_Z, authoredOrder: 38 });
    for (const guest of state.feast.guests) {
      entries.push({ kind: "feast-guest", guest, z: cityGroundPainterZ(guest.feetY),
        authoredOrder: 39 + guest.index / 100 });
    }
  } else {
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
  }
  if (state.features.dock !== "none") {
    entries.push({ kind: "dock-shadow-extension", z: 36, authoredOrder: 16.5 });
  }
  if (state.features.market) {
    for (const [index, settlement] of state.foreignSettlements.entries()) {
      const frame = state.portManifest.staticFrames.find((frame) => frame.layer === "Market Stall");
      if (!frame) throw new Error("Foreign factory requires a market frame");
      const poleX = frame.spriteSourceSize.x + 8 + index * 24;
      const roofY = frame.spriteSourceSize.y;
      entries.push({ kind: "foreign-settlement-flag", settlement,
        // Fly above the market's destination label so the flag stays readable.
        geometry: { poleX, poleTopY: roofY - 40, poleBottomY: roofY + 4,
          flagY: roofY - 38, flagWidth: 18, flagHeight: 12, waveAmplitudeScale: 1 },
        z: painterZ("Market Stall", 0), authoredOrder: 100 + index });
    }
  }
  return entries.sort((a, b) => a.z - b.z || a.authoredOrder - b.authoredOrder);
}

function drawCityTree(placement, targetContext) {
  const window = sceneWindow(placement.depth, 0, 0, placement.parallaxAnchor);
  drawCityTreePart(placement, placement.tree.frame, window, targetContext);
}

function drawFeastPart(frame, x, y, targetContext) {
  const window = sceneWindow(PORT_SCENE_ENTITY_META.npcs.depth);
  targetContext.drawImage(state.staticAtlas, frame.frame.x, frame.frame.y, frame.frame.w, frame.frame.h,
    Math.round(x - window.x), Math.round(y - window.y), frame.frame.w, frame.frame.h);
}

function drawFeastShadow(targetContext) {
  const frames = state.feast.frames;
  const table = frames.Table.spriteSourceSize;
  const shadow = frames["Table shadow"].spriteSourceSize;
  // Like tree shadows, this is painted immediately above its ground band:
  // the street here, before its people, table and foreground market stalls.
  drawFeastPart(frames["Table shadow"], CITY_FEAST_TABLE.x + shadow.x - table.x,
    CITY_FEAST_TABLE.y + shadow.y - table.y, targetContext);
}

function drawFeastTable(targetContext) {
  drawFeastPart(state.feast.frames.Table, CITY_FEAST_TABLE.x, CITY_FEAST_TABLE.y, targetContext);
  const window = sceneWindow(PORT_SCENE_ENTITY_META.npcs.depth);
  for (const dish of state.feast.dishes) {
    drawFeastPart(state.feast.frames[dish.layer], dish.x, dish.y, targetContext);
    for (const food of dish.foods) {
      targetContext.drawImage(state.feastFoodImages[food.id],
        Math.round(dish.x + food.x - window.x), Math.round(dish.y + food.y - window.y));
    }
  }
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

function colonyClueScreenRect() {
  return croatoanClueScreenRect(sceneWindow(PORT_SCENE_DEPTH.foreground));
}

function drawColonyClue(targetContext) {
  const rect = colonyClueScreenRect();
  const source = gameIconAtlasRect(CROATOAN_CLUE.iconId);
  targetContext.drawImage(state.gameIconAtlas, source.x, source.y, source.w, source.h,
    rect.x, rect.y, rect.width, rect.height);
}

function drawCityStreetBuilding(placement, targetContext) {
  const window = sceneWindow(placement.depth, 0, 0, placement.parallaxAnchor);
  const regionalFrame = regionalStaticFrame(placement.frame, placement.layerName);
  const source = buildingEdgeContrastFrame(
    regionalFrame || { atlas: state.staticAtlas, frame: placement.frame },
    {
      layerName: placement.layerName,
      masterY: placement.y,
      renderedHeight: placement.height
    }
  );
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
  drawCitySmokeParticles(emitter, timeMs, window, context);
}

function backgroundCityRenderState(side) {
  const leftBank = side === "left";
  return Object.freeze({
    rows: leftBank ? state.leftBankBackgroundCityRows : state.backgroundCityRows,
    painterOrder: leftBank
      ? state.leftBankBackgroundCityPainterOrder
      : state.backgroundCityPainterOrder,
    smokeByBuilding: leftBank
      ? state.leftBankBackgroundCitySmokeByBuilding
      : state.backgroundCitySmokeByBuilding
  });
}

function drawBackgroundCityStatic(side, targetContext) {
  const { rows, painterOrder } = backgroundCityRenderState(side);
  if (rows.length === 0) return;
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
    const contrastSource = buildingEdgeContrastFrame(source, {
      layerName: frame.layer,
      masterY: building.y,
      renderedHeight: building.height
    });
    const bombarded = backgroundCityBombardmentPresentation(side, entry, contrastSource);
    const displayed = bombarded || contrastSource;
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
  drawCitySmokeParticles(emitter, timeMs, window, context);
}

function drawCitySmokeParticles(emitter, timeMs, window, targetContext) {
  const smokeTimeMs = prefersReducedMotion.matches ? 4800 : timeMs;
  targetContext.save();
  for (const particle of cityChimneySmokeFrameParticles(emitter, smokeTimeMs, state.wind)) {
    if (particle.alpha <= 0) continue;
    targetContext.globalAlpha = particle.alpha;
    targetContext.fillStyle = particle.color;
    targetContext.fillRect(
      Math.round(particle.x - window.x),
      Math.round(particle.y - window.y),
      particle.size,
      particle.size
    );
  }
  targetContext.restore();
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
  return damagedBuildingFramePresentation({
    source,
    buildingId: `authored|${layerName}|${occurrence}`
  });
}

function cityStreetBombardmentPresentation(placement, source) {
  if (state.features.settlementStage === "ruins") {
    return damagedBuildingFramePresentation({ source, buildingId: `street|${placement.id}`,
      foundationHeight: placement.foundationHeight });
  }
  if (state.bombardmentEventId === null) return null;
  return damagedBuildingFramePresentation({
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
  return damagedBuildingFramePresentation({ source, buildingId, seed });
}

function backgroundCityBombardmentBuildingId(side, entry) {
  if (!Number.isInteger(entry?.rowOrder) || !Number.isInteger(entry?.buildingOrder)) {
    throw new Error("Background city bombardment requires stable painter slots");
  }
  return `background|${side}|${entry.rowOrder}|${entry.buildingOrder}|${entry.building.frame.layer}`;
}

function damagedBuildingFramePresentation({ source, buildingId, seed = null, foundationHeight = null }) {
  const eventId = foundationHeight === null ? state.bombardmentEventId : "colony-ruins";
  if (!source?.atlas || !source?.frame?.frame) {
    throw new Error(`Bombardment building ${buildingId} has no source frame`);
  }
  const resolvedSeed = seed ?? cityBombardmentSeed({
    cityId: state.city.id,
    buildingId,
    eventId
  });
  const sourceFrame = source.frame;
  const cacheKey = [
    state.city.id,
    eventId,
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
  const damageInput = { alpha, width: buffer.width, height: buffer.height, seed: resolvedSeed };
  const damage = foundationHeight === null
    ? cityBombardmentDamage(damageInput)
    : cityRuinsDamage({ ...damageInput, foundationHeight });
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
  const fireTargetContext = separateEmissiveOverlay ? emissiveContext : context;
  if (!fireTargetContext) throw new Error("Bombarded city has no emissive render target");
  fireTargetContext.imageSmoothingEnabled = false;
  if (cityStaticCacheIsUsable()) {
    const baseKey = [
      state.city.id,
      state.bombardmentEventId,
      canvas.width,
      canvas.height,
      state.parallax,
      state.wind.flowDirectionRad,
      state.wind.strength
    ].join("|");
    if (!bombardmentOverlayFrameCache) {
      bombardmentOverlayFrameCache = {
        baseKey: null,
        fireFrames: new Map(),
        smokeOverlay: document.createElement("canvas"),
        smokeContext: null,
        smokeTimeMs: null
      };
    }
    if (bombardmentOverlayFrameCache.baseKey !== baseKey) {
      bombardmentOverlayFrameCache.baseKey = baseKey;
      bombardmentOverlayFrameCache.fireFrames.clear();
      bombardmentOverlayFrameCache.smokeTimeMs = null;
    }
    const smokeOverlay = bombardmentOverlayFrameCache.smokeOverlay;
    if (
      !bombardmentOverlayFrameCache.smokeContext ||
      smokeOverlay.width !== canvas.width ||
      smokeOverlay.height !== canvas.height
    ) {
      if (smokeOverlay.width !== canvas.width) smokeOverlay.width = canvas.width;
      if (smokeOverlay.height !== canvas.height) smokeOverlay.height = canvas.height;
      bombardmentOverlayFrameCache.smokeContext = smokeOverlay.getContext("2d");
      if (!bombardmentOverlayFrameCache.smokeContext) {
        throw new Error("Could not cache city bombardment smoke overlay");
      }
    }
    const smokeTimeMs = prefersReducedMotion.matches
      ? 5000
      : Math.floor(timeMs / CITY_BOMBARDMENT_SMOKE_FRAME_MS) * CITY_BOMBARDMENT_SMOKE_FRAME_MS;
    if (bombardmentOverlayFrameCache.smokeTimeMs !== smokeTimeMs) {
      const smokeContext = bombardmentOverlayFrameCache.smokeContext;
      if (!smokeContext) throw new Error("City bombardment smoke cache has no render context");
      smokeContext.imageSmoothingEnabled = false;
      smokeContext.clearRect(0, 0, smokeOverlay.width, smokeOverlay.height);
      drawBombardmentSmokeSources(smokeTimeMs, smokeContext);
      bombardmentOverlayFrameCache.smokeTimeMs = smokeTimeMs;
    }
    context.drawImage(smokeOverlay, 0, 0);
    const animationFrame = Math.floor((prefersReducedMotion.matches ? 0 : timeMs) / FIRE_FRAME_MS) %
      FIRE_FRAME_COUNT;
    let overlay = bombardmentOverlayFrameCache.fireFrames.get(animationFrame);
    if (!overlay) {
      overlay = document.createElement("canvas");
      overlay.width = canvas.width;
      overlay.height = canvas.height;
      const overlayContext = overlay.getContext("2d");
      if (!overlayContext) throw new Error("Could not cache city bombardment fire overlay");
      overlayContext.imageSmoothingEnabled = false;
      drawBombardmentFireSources(timeMs, overlayContext);
      bombardmentOverlayFrameCache.fireFrames.set(animationFrame, overlay);
    }
    fireTargetContext.drawImage(overlay, 0, 0);
    return;
  }
  const smokeTimeMs = prefersReducedMotion.matches
    ? 5000
    : Math.floor(timeMs / CITY_BOMBARDMENT_SMOKE_FRAME_MS) * CITY_BOMBARDMENT_SMOKE_FRAME_MS;
  drawBombardmentSmokeSources(smokeTimeMs, context);
  drawBombardmentFireSources(timeMs, fireTargetContext);
}

function drawBombardmentFireSources(timeMs, targetContext) {
  forEachBombardmentPresentation((presentation, destination) => {
    drawBombardmentPresentationFire(presentation, destination, timeMs, targetContext);
  });
}

function drawBombardmentSmokeSources(timeMs, targetContext) {
  forEachBombardmentPresentation((presentation, destination) => {
    drawBombardmentPresentationSmoke(presentation, destination, timeMs, targetContext);
  });
}

function forEachBombardmentPresentation(visit) {
  if (typeof visit !== "function") throw new TypeError("Bombardment presentation visitor is required");
  visitAuthoredBombardmentPresentations(visit);
  visitBackgroundCityBombardmentPresentations("right", visit);
  if (state.features.leftBankCity) visitBackgroundCityBombardmentPresentations("left", visit);
  for (const placement of state.streetBuildings) {
    const regionalFrame = regionalStaticFrame(placement.frame, placement.layerName);
    const source = regionalFrame || { atlas: state.staticAtlas, frame: placement.frame };
    const presentation = cityStreetBombardmentPresentation(placement, source);
    const window = sceneWindow(placement.depth, 0, 0, placement.parallaxAnchor);
    visit(presentation, {
      x: placement.x - window.x,
      y: placement.y - window.y,
      width: placement.width,
      height: placement.height
    });
  }
}

function visitAuthoredBombardmentPresentations(visit) {
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
    visit(presentation, {
      x: presentation.frame.spriteSourceSize.x - window.x,
      y: presentation.frame.spriteSourceSize.y - window.y,
      width: presentation.frame.frame.w,
      height: presentation.frame.frame.h
    });
  }
}

function visitBackgroundCityBombardmentPresentations(side, visit) {
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
    visit(presentation, {
      x: building.x - window.x,
      y: building.y - window.y,
      width: building.width,
      height: building.height
    });
  }
}

function drawBombardmentPresentationFire(presentation, destination, timeMs, targetContext) {
  if (!presentation) return;
  const destinationX = Math.round(destination.x);
  const destinationY = Math.round(destination.y);
  const destinationWidth = Math.max(1, Math.round(destination.width));
  const destinationHeight = Math.max(1, Math.round(destination.height));
  const normalizedDestination = Object.freeze({
    x: destinationX,
    y: destinationY,
    width: destinationWidth,
    height: destinationHeight
  });
  if (!cityBombardmentEffectIntersectsViewport({
    destination: normalizedDestination,
    viewportWidth: canvas.width,
    viewportHeight: canvas.height
  })) return;
  const sourceWidth = presentation.frame.frame.w;
  const sourceHeight = presentation.frame.frame.h;
  const geometry = cityBombardmentEffectGeometry({
    damage: presentation.damage,
    sourceWidth,
    sourceHeight,
    destination: normalizedDestination,
    seed: presentation.seed
  });
  const { flame } = geometry;
  if (bombardmentFireMaskCanvas.width !== flame.width) {
    bombardmentFireMaskCanvas.width = flame.width;
  }
  if (bombardmentFireMaskCanvas.height !== flame.height) {
    bombardmentFireMaskCanvas.height = flame.height;
  }
  bombardmentFireMaskContext.imageSmoothingEnabled = false;
  bombardmentFireMaskContext.clearRect(0, 0, flame.width, flame.height);
  drawBombardmentFireSprite(
    { x: 0, y: 0, width: flame.width, height: flame.height },
    presentation.seed,
    timeMs,
    bombardmentFireMaskContext
  );
  // The damaged facade is the fire mask: intact wall pixels occlude the flame,
  // while the cannon breach and transparent air above it expose one continuous sprite.
  const sourceFrame = presentation.frame.frame;
  bombardmentFireMaskContext.save();
  bombardmentFireMaskContext.globalCompositeOperation = "destination-out";
  bombardmentFireMaskContext.drawImage(
    presentation.atlas,
    sourceFrame.x,
    sourceFrame.y,
    sourceFrame.w,
    sourceFrame.h,
    destinationX - flame.x,
    destinationY - flame.y,
    destinationWidth,
    destinationHeight
  );
  bombardmentFireMaskContext.restore();
  targetContext.drawImage(bombardmentFireMaskCanvas, flame.x, flame.y);
}

function drawBombardmentPresentationSmoke(presentation, destination, timeMs, targetContext) {
  if (!presentation) return;
  const normalizedDestination = {
    x: Math.round(destination.x),
    y: Math.round(destination.y),
    width: Math.max(1, Math.round(destination.width)),
    height: Math.max(1, Math.round(destination.height))
  };
  if (!cityBombardmentEffectIntersectsViewport({
    destination: normalizedDestination,
    viewportWidth: canvas.width,
    viewportHeight: canvas.height
  })) return;
  const geometry = cityBombardmentEffectGeometry({
    damage: presentation.damage,
    sourceWidth: presentation.frame.frame.w,
    sourceHeight: presentation.frame.frame.h,
    destination: normalizedDestination,
    seed: presentation.seed
  });
  drawCitySmokeParticles(geometry.smokeEmitter, timeMs, { x: 0, y: 0 }, targetContext);
}

function drawBombardmentFireSprite(destination, seed, timeMs, targetContext) {
  const frame = fireAnimationFrame(prefersReducedMotion.matches ? 0 : timeMs, seed);
  targetContext.drawImage(
    state.fireAtlas,
    frame * FIRE_FRAME_WIDTH,
    fireVariantIndex(seed) * FIRE_FRAME_HEIGHT,
    FIRE_FRAME_WIDTH,
    FIRE_FRAME_HEIGHT,
    destination.x,
    destination.y,
    destination.width,
    destination.height
  );
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
  drawCitySmokeParticles(emitter, timeMs, window, context);
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
  const baseSource = regionalFrame || { atlas: state.staticAtlas, frame };
  const source = buildingEdgeContrastFrame(baseSource, {
    layerName,
    masterY: baseSource.frame.spriteSourceSize.y + offsetY,
    renderedHeight: baseSource.frame.frame.h
  });
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

function buildingEdgeContrastFrame(source, { layerName, masterY, renderedHeight }) {
  if (!cityBuildingEdgeContrastApplies(layerName, source.frame)) return source;
  if (!skySourceColorsByRow || skyMasterY === null) {
    throw new Error("City building edge contrast rendered before its sky palette was prepared");
  }
  let atlasCache = buildingEdgeContrastFrameCache.get(source.atlas);
  if (!atlasCache) {
    atlasCache = new Map();
    buildingEdgeContrastFrameCache.set(source.atlas, atlasCache);
  }
  const frame = source.frame;
  const cacheKey = [
    frame.id,
    frame.frame.x,
    frame.frame.y,
    masterY,
    renderedHeight
  ].join("|");
  if (atlasCache.has(cacheKey)) return atlasCache.get(cacheKey);

  const imageData = staticFrameImageData(source);
  const changedPixels = applyCityBuildingEdgeContrast({
    pixels: imageData.data,
    width: frame.frame.w,
    height: frame.frame.h,
    masterY,
    renderedHeight,
    skyMasterY,
    skySourceColorsByRow
  });
  if (changedPixels === 0) {
    atlasCache.set(cacheKey, source);
    return source;
  }
  const buffer = document.createElement("canvas");
  buffer.width = frame.frame.w;
  buffer.height = frame.frame.h;
  const bufferContext = buffer.getContext("2d");
  if (!bufferContext) throw new Error(`Could not create edge-safe city building: ${frame.id}`);
  bufferContext.imageSmoothingEnabled = false;
  bufferContext.putImageData(imageData, 0, 0);
  const result = Object.freeze({
    atlas: buffer,
    frame: Object.freeze({
      ...frame,
      frame: Object.freeze({ ...frame.frame, x: 0, y: 0 })
    })
  });
  atlasCache.set(cacheKey, result);
  return result;
}

function staticFrameImageData(source) {
  if (!source?.atlas || !source?.frame?.frame) {
    throw new Error("City static frame pixels require an atlas source");
  }
  const frame = source.frame;
  return new ImageData(readStaticFramePixels(source.atlas, frame.frame), frame.frame.w, frame.frame.h);
}

function readAtlasFramePixels(atlas, frame) {
  const buffer = document.createElement("canvas");
  buffer.width = frame.w;
  buffer.height = frame.h;
  const bufferContext = buffer.getContext("2d", { willReadFrequently: true });
  if (!bufferContext) throw new Error("Could not read city static frame pixels");
  bufferContext.imageSmoothingEnabled = false;
  bufferContext.drawImage(
    atlas,
    frame.x,
    frame.y,
    frame.w,
    frame.h,
    0,
    0,
    frame.w,
    frame.h
  );
  return bufferContext.getImageData(0, 0, frame.w, frame.h).data;
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
  const frame = cityAnimationFrame(animation.frames, prefersReducedMotion.matches ? 0 : timeMs);
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
  drawCityFlag(image, cityGatehouseFlagGeometry(frame), window, timeMs);
}

function drawForeignSettlementFlag(entry, timeMs) {
  const approach = state.features.approach;
  const window = sceneWindow(layerParallaxDepth("Market Stall", 0),
    layerSceneOffsetX("Market Stall", 0, approach),
    layerSceneOffsetY("Market Stall", 0, approach),
    layerParallaxAnchor("Market Stall", 0));
  drawCityFlag(requiredPreloadedFlagImage(entry.settlement.factionId), entry.geometry, window, timeMs);
}

function drawCityFlag(image, geometry, window, timeMs) {
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
  applyCityWaterPalette({
    pixels: imageData.data,
    width: buffer.width,
    height: buffer.height,
    latitudeDeg: state.city.lat,
    masterX: frame.spriteSourceSize.x,
    masterY: frame.spriteSourceSize.y + masterYOffset
  });
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
  drawDocksideShipHullBar(placement);
}

function drawDocksideShipHullBar(placement) {
  const presentation = state.assaultPresentation;
  if (!presentation || !shipHullIsDamaged(
    presentation.shipHitPoints,
    presentation.shipMaxHitPoints
  )) return;
  const layout = docksideShipHullBarLayout({
    x: placement.x,
    y: placement.y + placement.bobY,
    scale: placement.scale,
    opaqueMinX: state.shipWaterlineLayers.opaqueMinX,
    opaqueMaxX: state.shipWaterlineLayers.opaqueMaxX,
    opaqueMaxY: state.shipWaterlineLayers.opaqueMaxY,
    hitPoints: presentation.shipHitPoints,
    maxHitPoints: presentation.shipMaxHitPoints,
    viewportWidth: canvas.width,
    viewportHeight: canvas.height
  });
  context.fillStyle = "#2e222f";
  context.fillRect(layout.x, layout.y, layout.width, layout.height);
  if (layout.fillWidth <= 0) return;
  context.fillStyle = PLAYER_SHIP_COMBAT_COLOR;
  context.fillRect(layout.x + 1, layout.y + 1, layout.fillWidth, 1);
}

function drawDocksideShipForeground(timeMs) {
  if (!state.assaultPresentation && !state.colonistLanding) return;
  if (!state.shipForegroundImage) {
    throw new Error("Port assault ship is missing its foreground deck mask");
  }
  const placement = docksideShipPlacement(timeMs, PORT_SCENE_ENTITY_META.ship.depth);
  context.drawImage(
    state.shipForegroundImage,
    placement.x,
    placement.y + placement.bobY,
    state.shipForegroundImage.width * placement.scale,
    state.shipForegroundImage.height * placement.scale
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
  let opaqueMaxX = -1;
  let opaqueMaxY = -1;
  const rightmostOpaqueXByRow = new Int32Array(source.height);
  rightmostOpaqueXByRow.fill(-1);
  for (const pixel of pixels) {
    opaqueMinX = Math.min(opaqueMinX, pixel.x);
    opaqueMaxX = Math.max(opaqueMaxX, pixel.x);
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
    opaqueMaxX,
    opaqueMaxY,
    rightmostOpaqueXByRow,
    submergedMinY,
    submergedMaxY
  });
}

function drawNpc(agent, timeMs) {
  if (state.assaultPresentation) return;
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
  const fallen = agent.motion === "fallen";
  const panicking = agent.motion === "panic";
  const stationary = agent.motion === "stationary" || fallen;
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
  const frame = fallen
    ? animation.at(-1)
    : cityAnimationFrame(
        animation,
        (panicking ? time * 1.65 : time) + agent.phase * 1000
      );
  const painterZ = agent.painterZ ?? cityGroundPainterZ(feetY);
  const dx = Math.round(x + frame.spriteSourceSize.x - window.x);
  const dy = Math.round(feetY - frame.sourceSize.h + frame.spriteSourceSize.y - window.y);
  const highlightedDestination = state.hoveredDestination || destinationById(state.focusedDestinationId);
  if (agent.interactive === true && highlightedDestination?.id === agent.destinationId) {
    const mask = tintedFrameCanvas(atlas, frame);
    for (const [offsetX, offsetY] of [
      [-1, 0], [1, 0], [0, -1], [0, 1],
      [-1, -1], [1, -1], [-1, 1], [1, 1]
    ]) {
      drawNpcFrame(mask, { x: 0, y: 0, w: mask.width, h: mask.height },
        dx + offsetX, dy + offsetY, facingRight, context);
    }
  }
  clearNpcFrameFromEmissiveFire(atlas, frame.frame, dx, dy, facingRight, painterZ);
  drawNpcFrame(atlas, frame.frame, dx, dy, facingRight, context);
}

function drawNpcFrame(atlas, frame, dx, dy, facingRight, targetContext) {
  if (facingRight) {
    targetContext.drawImage(atlas, frame.x, frame.y, frame.w, frame.h, dx, dy, frame.w, frame.h);
    return;
  }
  targetContext.save();
  targetContext.translate(dx + frame.w, 0);
  targetContext.scale(-1, 1);
  targetContext.drawImage(atlas, frame.x, frame.y, frame.w, frame.h, 0, dy, frame.w, frame.h);
  targetContext.restore();
}

function clearNpcFrameFromEmissiveFire(atlas, frame, dx, dy, facingRight, painterZ) {
  if (!npcOccludesEmissiveFire(painterZ)) return;
  emissiveContext.save();
  emissiveContext.globalCompositeOperation = "destination-out";
  drawNpcFrame(atlas, frame, dx, dy, facingRight, emissiveContext);
  emissiveContext.restore();
}

function npcOccludesEmissiveFire(painterZ) {
  return separateEmissiveOverlay &&
    state.bombardmentEventId !== null &&
    painterZ > CITY_BOMBARDMENT_FIRE_PAINTER_Z;
}

function drawPortAssaultPresentation(lane) {
  const presentation = state.assaultPresentation;
  if (!presentation) return;
  const battleTimeMs = presentation.elapsedMs;
  const window = sceneWindow(PORT_SCENE_ENTITY_META.npcs.depth);
  const shipboardStart = assaultShipboardStartPoint(battleTimeMs);
  const baselineEntryX = CITY_PORT_ASSAULT_TRACK_START_X +
    PORT_ASSAULT_ATTACKER_ENTRY_POSITION * CITY_ASSAULT_TRACK_SPAN_PX - window.x;
  const entryShiftX = cityAssaultForwardEntryShift({
    baselineEntryX,
    deckStartX: shipboardStart.x
  });
  // Each lane is its own dynamic scene entry, so buildings, trees, cargo, and
  // gate pieces can naturally paint in front of combatants by ground depth.
  for (const unit of presentation.units) {
    if (Math.round(unit.lane) !== lane) continue;
    const feetY = cityPortAssaultLaneFeetY(unit.lane);
    const baselineX = CITY_PORT_ASSAULT_TRACK_START_X +
      unit.position * CITY_ASSAULT_TRACK_SPAN_PX - window.x;
    const laneX = cityAssaultLaneX({
      baselineX,
      position: unit.position,
      entryPosition: PORT_ASSAULT_ATTACKER_ENTRY_POSITION,
      entryShiftX
    });
    const landingPoint = Object.freeze({ x: laneX, y: feetY - window.y });
    const point = assaultPersonScreenPoint(
      unit,
      landingPoint,
      presentation.events,
      battleTimeMs,
      shipboardStart
    );
    drawGroundPersonSprite(unit, point.x, point.y, battleTimeMs);
    if (unit.inWater) drawWadingWater(unit, point.x, point.y, battleTimeMs);
  }
  for (const event of presentation.events) {
    const unit = presentation.units.find(({ id }) => id === event.unitId);
    if (!unit || Math.round(event.type === "attack" ? event.lane : unit.lane) !== lane) continue;
    drawAssaultEvent(event, unit, window, battleTimeMs, entryShiftX);
  }
}

function assaultShipboardStartPoint(timeMs) {
  const placement = docksideShipPlacement(timeMs, PORT_SCENE_ENTITY_META.ship.depth);
  const spawnAnchor = placement.ship.cityDockside.sailorSpawnAnchor;
  if (!spawnAnchor || !Number.isFinite(spawnAnchor.x) || !Number.isFinite(spawnAnchor.y)) {
    throw new Error(`Port assault ship has no sailor spawn anchor: ${placement.ship.slug}`);
  }
  return Object.freeze({
    x: placement.x + spawnAnchor.x * placement.scale,
    y: placement.y + placement.bobY + spawnAnchor.y * placement.scale
  });
}

function assaultPersonScreenPoint(unit, landingPoint, events, timeMs, shipboardStart) {
  if (unit.animationId === "jump") {
    return cityAssaultJumpPoint({
      start: shipboardStart,
      end: landingPoint,
      elapsedMs: timeMs - unit.animationStartedAtMs,
      durationMs: portAssaultLandingDurationMs(state.features.dock)
    });
  }

  let latestLunge = null;
  let latestKnockback = null;
  for (const event of events) {
    if (event.attackType === "melee" && event.type === "attack" && event.unitId === unit.id &&
        (!latestLunge || event.timeMs > latestLunge.timeMs)) latestLunge = event;
    if ((event.type === "hit" || event.type === "death") && event.unitId === unit.id &&
        (!latestKnockback || event.timeMs > latestKnockback.timeMs)) latestKnockback = event;
  }
  let offsetX = 0;
  let offsetY = 0;
  if (latestLunge) {
    const offset = cityAssaultMeleeLungeOffset(latestLunge.facingRight ? "attacker" : "defender", timeMs - latestLunge.timeMs);
    offsetX += offset.x;
    offsetY += offset.y;
  }
  if (latestKnockback) {
    if (!Number.isFinite(latestKnockback.knockbackPositionDelta)) {
      throw new Error(`Port-assault hit has invalid knockback: ${unit.id}`);
    }
    if (latestKnockback.knockbackPositionDelta !== 0) {
      const offset = cityAssaultKnockbackOffset({
        knockbackPx: latestKnockback.knockbackPositionDelta * CITY_ASSAULT_TRACK_SPAN_PX,
        elapsedMs: timeMs - latestKnockback.timeMs
      });
      offsetX += offset.x;
      offsetY += offset.y;
    }
  }
  return Object.freeze({
    x: Math.round(landingPoint.x + offsetX),
    y: Math.round(landingPoint.y + offsetY)
  });
}

function drawColonistLanding(lane, timeMs) {
  const landing = state.colonistLanding;
  if (!landing) return;
  const window = sceneWindow(PORT_SCENE_ENTITY_META.npcs.depth);
  const shipboard = assaultShipboardStartPoint(timeMs);
  for (const unit of landing.frame.units) {
    if (unit.lane !== lane) continue;
    const geometry = colonistLandingGeometry(unit, window, shipboard);
    const point = cityColonistScreenPoint(unit, geometry);
    drawGroundPersonSprite(unit, point.x, point.y, landing.frame.elapsedMs);
    if (unit.inWater) drawWadingWater(unit, point.x, point.y, landing.frame.elapsedMs);
    if (unit.splashAgeMs !== null) drawLandingSplash(geometry.water.x, geometry.water.y, unit.splashAgeMs);
  }
}

function colonistShoreline() {
  const frame = state.portManifest.staticFrames.find(({ layer }) => layer === "Sand Beach");
  if (!frame) throw new Error("Colonist landing requires the beach frame");
  return Object.freeze(CITY_COLONIST_LANE_FEET_Y.map((feetY) => {
    const runs = beachOpaqueRuns(frame)[feetY - frame.spriteSourceSize.y];
    if (!runs?.length) throw new Error(`Colonist landing has no shore at scene y=${feetY}`);
    return Object.freeze({ x: frame.spriteSourceSize.x + runs[0][0], feetY });
  }));
}

function colonistLandingGeometry(unit, window, shipboard) {
  const shore = state.colonistLanding.shoreline[unit.lane];
  const shoreX = shore.x - window.x;
  const feetY = shore.feetY - window.y;
  return {
    deck: { x: shipboard.x - unit.column * 8, y: shipboard.y - unit.lane * 2 },
    water: { x: Math.min(shoreX - 28, shipboard.x + 20), y: feetY },
    beach: { x: shoreX + 8, y: feetY },
    assembly: { x: shoreX + 70 + unit.column * 20, y: feetY }
  };
}

function drawGroundPersonSprite(unit, screenX, screenFeetY, timeMs) {
  const appearance = state.peopleById.get(unit.appearanceId);
  if (!appearance) throw new Error(`Unknown city ground appearance: ${unit.appearanceId}`);
  const animation = appearance.animations[unit.animationId];
  if (!Array.isArray(animation) || animation.length === 0) {
    throw new Error(`City ground appearance ${unit.appearanceId} has no ${unit.animationId} animation`);
  }
  if (!Number.isFinite(unit.animationStartedAtMs) || unit.animationStartedAtMs > timeMs) {
    throw new Error(`Invalid city ground animation start for ${unit.id}: ${unit.animationStartedAtMs}`);
  }
  const animationElapsedMs = timeMs - unit.animationStartedAtMs;
  const playback = unit.animationId === "death" || unit.animationId === "jump" ||
    unit.animationId === "attack"
    ? CITY_ANIMATION_PLAYBACK.ONCE
    : CITY_ANIMATION_PLAYBACK.LOOP;
  const frame = cityAnimationFrame(animation, animationElapsedMs, playback);
  const dx = Math.round(screenX + frame.spriteSourceSize.x - frame.sourceSize.w / 2);
  const dy = Math.round(screenFeetY - frame.sourceSize.h + frame.spriteSourceSize.y);
  const facingRight = unit.facingRight;
  context.save();
  context.imageSmoothingEnabled = false;
  if (unit.inWater) {
    context.beginPath();
    context.rect(0, 0, canvas.width, Math.max(0, Math.round(screenFeetY) - 1));
    context.clip();
  }
  if (facingRight) {
    context.drawImage(
      state.peopleAtlas,
      frame.frame.x,
      frame.frame.y,
      frame.frame.w,
      frame.frame.h,
      dx,
      dy,
      frame.frame.w,
      frame.frame.h
    );
  } else {
    context.translate(dx + frame.frame.w, 0);
    context.scale(-1, 1);
    context.drawImage(
      state.peopleAtlas,
      frame.frame.x,
      frame.frame.y,
      frame.frame.w,
      frame.frame.h,
      0,
      dy,
      frame.frame.w,
      frame.frame.h
    );
  }
  context.restore();
}

function drawWadingWater(unit, x, feetY, timeMs) {
  const phase = Math.floor(timeMs / 140 + unit.lane) % 2;
  context.fillStyle = phase === 0 ? "#8fd3ff" : "#4d9be6";
  context.fillRect(Math.round(x) - 3 - phase, Math.round(feetY) - 2, 7 + phase * 2, 1);
  context.fillRect(Math.round(x) - 2, Math.round(feetY), 5, 1);
}

function drawLandingSplash(x, y, ageMs) {
  const rise = Math.floor(ageMs / 90);
  context.fillStyle = "#8fd3ff";
  context.fillRect(Math.round(x) - 5 - rise, Math.round(y) - 3 - rise, 2, 1);
  context.fillRect(Math.round(x) + 4 + rise, Math.round(y) - 4 - Math.floor(rise / 2), 2, 1);
  if (ageMs < 260) context.fillRect(Math.round(x) - 1, Math.round(y) - 6 - rise, 2, 2);
}

function drawAssaultEvent(event, unit, window, timeMs, entryShiftX) {
  const eventTracksShot = event.type === "attack";
  const position = eventTracksShot ? event.position : unit.position;
  const lane = eventTracksShot ? event.lane : unit.lane;
  if (!Number.isFinite(position) || position < 0 || position > 1) {
    throw new Error(`Port assault event has invalid position: ${event.unitId}`);
  }
  const baselineX = CITY_PORT_ASSAULT_TRACK_START_X +
    position * CITY_ASSAULT_TRACK_SPAN_PX - window.x;
  const x = Math.round(cityAssaultLaneX({
    baselineX,
    position,
    entryPosition: PORT_ASSAULT_ATTACKER_ENTRY_POSITION,
    entryShiftX
  }));
  const feetY = cityPortAssaultLaneFeetY(lane);
  const y = Math.round(feetY - window.y);
  if (event.type === "attack" && event.attackType === "firearm") {
    drawMatchlockSmoke(event, x, y, timeMs);
    if (timeMs - event.timeMs < 100) {
      context.fillStyle = "#ffffff";
      context.fillRect(x + (event.facingRight ? 5 : -6), y - 10, 2, 1);
    }
  } else if (event.type === "attack" && event.attackType === "arrow") {
    context.fillStyle = "#2e222f";
    context.fillRect(x + (event.facingRight ? 5 : -9), y - 9, 5, 1);
  } else if (event.type === "block") {
    context.fillStyle = "#f9c22b";
    context.fillRect(x - 3, y - 16, 7, 1);
  } else if (event.type === "splash") {
    drawLandingSplash(x, y, Math.max(0, timeMs - event.timeMs));
  } else if (event.type === "dock-land") {
    const age = Math.max(0, timeMs - event.timeMs);
    const spread = Math.floor(age / 120);
    context.fillStyle = event.dockKind === "stone" ? "#9babb2" : "#c7dcd0";
    context.fillRect(x - 3 - spread, y - 1, 2, 1);
    context.fillRect(x + 2 + spread, y - 1, 2, 1);
  } else if (event.type === "death" && timeMs - event.timeMs < 500) {
    context.fillStyle = "#ae2334";
    context.fillRect(x - 2 - Math.floor((timeMs - event.timeMs) / 180), y - 3, 2, 1);
  }
}

function drawMatchlockSmoke(event, x, feetY, timeMs) {
  const facingRight = event.facingRight;
  const muzzleX = x + (facingRight ? 6 : -6);
  const muzzleY = feetY - 10;
  const particles = cityMatchlockSmokeParticles({
    shotId: `${event.unitId}|${event.timeMs}`,
    ageMs: timeMs - event.timeMs,
    facingRight,
    wind: state.wind
  });
  context.save();
  for (const particle of particles) {
    context.globalAlpha = particle.alpha;
    context.fillStyle = particle.color;
    drawMatchlockSmokeCluster(
      muzzleX + particle.x,
      muzzleY + particle.y,
      particle.size,
      particle.shape
    );
  }
  context.restore();
}

function drawMatchlockSmokeCluster(x, y, size, shape) {
  const left = Math.round(x - (size - 1) / 2);
  const top = Math.round(y - (size - 1) / 2);
  if (size === 1) {
    context.fillRect(left, top, 1, 1);
    return;
  }
  if (size === 2) {
    context.fillRect(left, top, 2, 1);
    context.fillRect(left + (shape % 2), top + 1, 1, 1);
    return;
  }
  context.fillRect(left, top + 1, 3, 1);
  context.fillRect(left + 1, top, 1, 3);
  context.fillRect(left + (shape % 2 === 0 ? 0 : 2), top + (shape < 2 ? 0 : 2), 1, 1);
}

function drawPersonSprite(targetContext, {
  appearanceId,
  animationId = "walk",
  timeMs = 0,
  x,
  y,
  scale = 1,
  facingRight = true,
  playback = CITY_ANIMATION_PLAYBACK.LOOP
}) {
  if (!targetContext || typeof targetContext.drawImage !== "function") {
    throw new Error("City person sprite requires a canvas context");
  }
  if (![timeMs, x, y].every(Number.isFinite)) {
    throw new Error("City person sprite requires finite placement");
  }
  requirePixelPerfectSpriteScale(scale, "City person sprite");
  const appearance = state.peopleById.get(appearanceId);
  if (!appearance) throw new Error(`Unknown city person appearance: ${appearanceId}`);
  const animation = appearance.animations[animationId];
  if (!Array.isArray(animation) || animation.length === 0) {
    throw new Error(`City person ${appearanceId} has no ${animationId} animation`);
  }
  const frame = cityAnimationFrame(
    animation,
    prefersReducedMotion.matches && playback === CITY_ANIMATION_PLAYBACK.LOOP ? 0 : timeMs,
    playback
  );
  const dx = Math.round(x + frame.spriteSourceSize.x * scale);
  const dy = Math.round(y + frame.spriteSourceSize.y * scale);
  const dw = Math.round(frame.frame.w * scale);
  const dh = Math.round(frame.frame.h * scale);
  targetContext.imageSmoothingEnabled = false;
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

function prepareDestinationLabelLayouts() {
  if (state.destinationLabelLayoutParallax === state.parallax) return;
  const setSailHasWorldControl = Boolean(setSailControlRect());
  const entries = activeDestinations()
    .filter((destination) => (
      destination.id !== PORT_CITY_LOCATION.SET_SAIL || !setSailHasWorldControl
    ))
    .map((destination) => {
      const label = renderText(destination.label);
      const font = smallFontForText(label);
      const textWidth = overlayPixelText.measure(label, font);
      const textHeight = overlayPixelText.height(font);
      const anchor = destinationScreenAnchor(destination);
      if (!anchor) {
        throw new Error(`Active city destination has no scene anchor: ${destination.id}`);
      }
      return Object.freeze({
        id: destination.id,
        label,
        font,
        textWidth,
        anchor,
        width: textWidth + 6,
        height: textHeight + 2,
        preferredSide: destination.id === PORT_CITY_LOCATION.SHIP ? "left" : "above"
      });
    });
  const retainedPin = retainAvailableCityDestinationLabelPin(
    state.pinnedDestinationLabel,
    entries
  );
  if (state.pinnedDestinationLabel !== null && retainedPin === null) {
    const releasedDestinationId = state.pinnedDestinationLabel.id;
    state.pinnedDestinationLabel = null;
    if (state.hoverPanDestinationId === releasedDestinationId) {
      state.hoverPanDestinationId = null;
      state.cameraPanTarget = null;
    }
  }
  state.destinationLabelLayouts = layoutCityDestinationLabels({
    entries,
    viewportWidth: canvas.width,
    viewportHeight: canvas.height,
    pinnedLabel: retainedPin
  });
  state.destinationLabelLayoutParallax = state.parallax;
}

function invalidateDestinationLabelLayouts() {
  state.destinationLabelLayouts = Object.freeze([]);
  state.destinationLabelLayoutParallax = null;
}

function refreshDestinationLabelLayouts() {
  invalidateDestinationLabelLayouts();
  if (state.ready && state.features) prepareDestinationLabelLayouts();
}

function drawSceneLabels() {
  drawCityNameLabel();
  if (state.feast) return;
  drawSetSailControl();
  drawDestinationLabels();
}

function drawCityNameLabel() {
  const localizedCityLabel = renderText(state.city.label);
  const cityLabel = localizedCityLabel.toUpperCase();
  const cityFont = titleFontForText(cityLabel);
  const cityTitle = cityPortTitleLayout({
    textWidth: overlayPixelText.measure(cityLabel, cityFont, { wordSpacingPx: 4 }),
    textHeight: overlayPixelText.height(cityFont),
    viewportWidth: canvas.width
  });
  overlayPixelText.draw(cityLabel, cityTitle.x + 1, cityTitle.y + 1, {
    color: PIRATE_MENU_INK,
    font: cityFont,
    scale: cityTitle.scale,
    wordSpacingPx: 4
  });
  overlayPixelText.draw(cityLabel, cityTitle.x, cityTitle.y, {
    color: "#ffffff",
    font: cityFont,
    scale: cityTitle.scale,
    wordSpacingPx: 4
  });
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
  if (!sceneCameraSetSailIsRevealed({
    parallax: state.parallax,
    viewportWidth: canvas.width,
    approach: state.features.approach
  })) return null;
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

function drawDestinationLabels() {
  const targetContext = emissiveContext || context;
  const highlightedDestination = state.hoveredDestination ||
    destinationById(state.focusedDestinationId);
  targetContext.save();
  targetContext.imageSmoothingEnabled = false;
  for (const label of state.destinationLabelLayouts) {
    drawDestinationLeader(
      targetContext,
      label,
      highlightedDestination?.id === label.id
    );
  }
  for (const label of state.destinationLabelLayouts) {
    const highlighted = highlightedDestination?.id === label.id;
    drawDestinationLabelPlate(targetContext, label, highlighted);
    overlayPixelText.draw(label.label, label.x + 3, label.y + 1, {
      color: PIRATE_MENU_INK,
      font: label.font
    });
  }
  targetContext.restore();
}

function drawDestinationLabelPlate(targetContext, label, highlighted) {
  targetContext.save();
  targetContext.globalAlpha = highlighted ? 1 : 0.76;
  targetContext.fillStyle = highlighted ? PIRATE_MENU_PAPER_SELECTED : PIRATE_MENU_PAPER_BUTTON;
  targetContext.fillRect(label.x, label.y, label.width, label.height);
  targetContext.strokeStyle = highlighted ? PIRATE_MENU_INK : PIRATE_MENU_CHART_LINE;
  targetContext.lineWidth = 1;
  targetContext.strokeRect(
    label.x + 0.5,
    label.y + 0.5,
    label.width - 1,
    label.height - 1
  );
  targetContext.restore();
}

function drawDestinationLeader(targetContext, label, highlighted) {
  const leader = cityDestinationLeader(label, canvas.width, canvas.height);
  targetContext.save();
  targetContext.globalAlpha = highlighted ? 1 : 0.72;
  targetContext.fillStyle = highlighted ? PIRATE_MENU_PAPER_SELECTED : PIRATE_MENU_CHART_LINE;
  for (const segment of leader.segments) drawOrthogonalPixelSegment(targetContext, segment);
  drawDestinationLeaderTarget(targetContext, leader.target, leader.direction);
  targetContext.restore();
}

function drawOrthogonalPixelSegment(targetContext, segment) {
  if (segment.y1 === segment.y2) {
    targetContext.fillRect(
      Math.min(segment.x1, segment.x2),
      segment.y1,
      Math.abs(segment.x2 - segment.x1) + 1,
      1
    );
    return;
  }
  if (segment.x1 === segment.x2) {
    targetContext.fillRect(
      segment.x1,
      Math.min(segment.y1, segment.y2),
      1,
      Math.abs(segment.y2 - segment.y1) + 1
    );
    return;
  }
  throw new Error(`City destination leader is not orthogonal: ${segment.x1},${segment.y1}`);
}

function drawDestinationLeaderTarget(targetContext, target, direction) {
  if (direction === null) {
    targetContext.fillRect(target.x - 1, target.y, 3, 1);
    targetContext.fillRect(target.x, target.y - 1, 1, 3);
    return;
  }
  const steps = {
    left: [[0, 0], [1, -1], [1, 1], [2, -2], [2, 2]],
    right: [[0, 0], [-1, -1], [-1, 1], [-2, -2], [-2, 2]],
    up: [[0, 0], [-1, 1], [1, 1], [-2, 2], [2, 2]],
    down: [[0, 0], [-1, -1], [1, -1], [-2, -2], [2, -2]]
  }[direction];
  if (!steps) throw new Error(`Unknown city destination direction: ${direction}`);
  for (const [offsetX, offsetY] of steps) {
    targetContext.fillRect(target.x + offsetX, target.y + offsetY, 1, 1);
  }
}

function updateHover() {
  if (!state.ready || !state.features) return;
  const hit = state.pointer ? destinationAtPoint(state.pointer.x, state.pointer.y) : null;
  updateDestinationLabelHover(hit);
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

function updateDestinationLabelHover(hit) {
  const hitLabel = hit?.fromLabel === true
    ? state.destinationLabelLayouts.find(({ id }) => id === hit.destination.id)
    : null;
  if (hit?.fromLabel === true && !hitLabel) {
    throw new Error(`Hovered city destination has no label layout: ${hit.destination.id}`);
  }
  if (state.pinnedDestinationLabel?.id === hitLabel?.id) return;
  clearDestinationLabelHover();
  if (!hitLabel || (hitLabel.anchor.x >= 0 && hitLabel.anchor.x < canvas.width)) return;
  state.pinnedDestinationLabel = Object.freeze({
    id: hitLabel.id,
    x: hitLabel.x,
    y: hitLabel.y
  });
  state.hoverPanDestinationId = hit.destination.id;
  refreshDestinationLabelLayouts();
  panCameraToDestination(hit.destination, { immediate: prefersReducedMotion.matches });
}

function clearDestinationLabelHover() {
  if (!state.pinnedDestinationLabel && state.hoverPanDestinationId === null) return;
  state.pinnedDestinationLabel = null;
  if (state.hoverPanDestinationId !== null) {
    state.hoverPanDestinationId = null;
    state.cameraPanTarget = null;
  }
  refreshDestinationLabelLayouts();
}

function activeDestinations() {
  return activeCityDestinations({
    availableDestinationIds: state.availableDestinationIds,
    features: state.features,
    assaultActive: state.assaultPresentation !== null
  });
}

function destinationById(destinationId) {
  if (!destinationId) return null;
  return activeDestinations().find(({ id }) => id === destinationId) || null;
}

function validateAvailableDestinationIds(destinationIds) {
  return validateCityDestinationIds(destinationIds);
}

function destinationAtPoint(x, y) {
  if (![x, y].every(Number.isFinite)) throw new Error("Invalid city destination coordinates");
  const destinations = activeDestinations();
  const label = destinationLabelAtPoint(x, y);
  if (label) {
    const destination = destinations.find(({ id }) => id === label.id);
    if (!destination) {
      throw new Error(`City destination label outlived its destination: ${label.id}`);
    }
    return Object.freeze({ destination, saleShipId: null, fromLabel: true });
  }
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
  const clueDestination = destinations.find(({ id }) => id === PORT_CITY_LOCATION.COLONY_CLUE);
  if (clueDestination && croatoanClueContainsPoint(colonyClueScreenRect(), x, y)) {
    return Object.freeze({ destination: clueDestination, saleShipId: null });
  }
  for (const destination of destinations) {
    if (specialDestinationContainsPoint(destination.id, x, y)) {
      return Object.freeze({ destination, saleShipId: null });
    }
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
          y + window.y,
          destination.id === PORT_CITY_LOCATION.SHIPYARD
            ? SHIPYARD_BUILDING_HIT_PADDING_PX
            : 1
        )) return Object.freeze({ destination, saleShipId: null });
      }
    }
  }
  return null;
}

function destinationLabelAtPoint(x, y) {
  if (![x, y].every(Number.isFinite)) {
    throw new Error("Invalid city destination label coordinates");
  }
  return state.destinationLabelLayouts.find((label) => (
    cityDestinationLabelContainsPoint(label, x, y)
  )) || null;
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
    candidate.interactive === true && candidate.destinationId === destinationId
  ));
  if (!agent) return false;
  if (destinationId !== PORT_CITY_LOCATION.ILLICIT_MERCHANT) {
    throw new Error(`Unexpected clickable city NPC destination: ${destinationId}`);
  }
  const appearance = state.peopleById.get(agent.appearanceId);
  if (!appearance) throw new Error(`Unknown clickable city person: ${agent.appearanceId}`);
  const animation = appearance.animations[agent.animationId || "walk"];
  if (!Array.isArray(animation) || animation.length === 0) {
    throw new Error(`Clickable city person ${agent.appearanceId} has no animation`);
  }
  const sourceSize = animation[0].sourceSize;
  if (!Number.isInteger(sourceSize?.w) || !Number.isInteger(sourceSize?.h)) {
    throw new Error(`Clickable city person ${agent.appearanceId} has invalid source dimensions`);
  }
  const window = sceneWindow(PORT_SCENE_ENTITY_META.npcs.depth);
  const x = agent.startX - window.x;
  const y = agent.feetY - sourceSize.h - window.y;
  return screenX >= x - SUSPICIOUS_MERCHANT_HIT_PADDING_PX &&
    screenX <= x + sourceSize.w + SUSPICIOUS_MERCHANT_HIT_PADDING_PX &&
    screenY >= y - SUSPICIOUS_MERCHANT_HIT_PADDING_PX &&
    screenY <= y + sourceSize.h + SUSPICIOUS_MERCHANT_HIT_PADDING_PX;
}

function focusDestination(destinationId, { immediate = false } = {}) {
  if (typeof immediate !== "boolean") throw new Error("City focus motion policy must be boolean");
  const destination = destinationById(destinationId);
  if (!destination) throw new Error(`City destination is unavailable: ${destinationId}`);
  clearDestinationLabelHover();
  state.focusedDestinationId = destinationId;
  panCameraToDestination(destination, { immediate });
}

function panCameraToDestination(destination, { immediate }) {
  if (typeof immediate !== "boolean") throw new Error("City pan motion policy must be boolean");
  if (destination.id === PORT_CITY_LOCATION.SET_SAIL) {
    if (!state.features) throw new Error("Set Sail focus requires resolved city features");
    const { minimum } = sceneCameraParallaxBounds(state.features.approach);
    state.cameraVelocity = 0;
    if (immediate || prefersReducedMotion.matches) {
      state.parallax = minimum;
      state.cameraPanTarget = null;
      invalidateDestinationLabelLayouts();
    } else {
      state.cameraPanTarget = minimum;
    }
    return;
  }
  const anchor = destinationScreenAnchor(destination);
  if (!anchor) throw new Error(`City destination has no scene anchor: ${destination.id}`);
  const deltaX = anchor.x - canvas.width / 2;
  if (immediate || prefersReducedMotion.matches) {
    panCameraByLogicalPixels(deltaX);
  } else {
    queueCameraPanByLogicalPixels(deltaX);
  }
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
  if (destination.id === PORT_CITY_LOCATION.COLONY_CLUE) {
    if (state.colonyClueId !== CROATOAN_CLUE.id) throw new Error("CROATOAN destination has no visible clue");
    const rect = colonyClueScreenRect();
    return Object.freeze({ x: rect.x + rect.width / 2, y: rect.y });
  }
  if (destination.id === PORT_CITY_LOCATION.SET_SAIL) {
    const window = sceneWindow(PORT_SCENE_DEPTH.foreground);
    return Object.freeze({
      x: PORT_SCENE_MASTER.leftBankX + 64 - window.x,
      y: PORT_SCENE_OCEAN_SLICES[1].top + 58 - window.y
    });
  }
  if (destination.id === PORT_CITY_LOCATION.SHIP) {
    const placement = docksideShipPlacement(state.lastRenderTimeMs ?? 0, PORT_SCENE_ENTITY_META.ship.depth);
    if (!placement) return null;
    const sideAnchor = docksideShipSideAnchor(placement.ship);
    return Object.freeze({
      x: placement.x + state.shipWaterlineLayers.opaqueMinX * placement.scale,
      y: placement.y + sideAnchor.y * placement.scale
    });
  }
  const activeLayers = activePortSceneLayers(state.features);
  for (const layerName of destination.layers) {
    if (!activeLayers.has(layerName)) continue;
    const frame = state.portManifest.staticFrames.find((candidate) => candidate.layer === layerName);
    if (!frame) continue;
    const occurrence = 0;
    const approach = state.features?.approach || "ocean";
    const window = sceneWindow(
      layerParallaxDepth(layerName, occurrence),
      layerSceneOffsetX(layerName, occurrence, approach),
      layerSceneOffsetY(layerName, occurrence, approach),
      layerParallaxAnchor(layerName, occurrence)
    );
    return Object.freeze({
      x: frame.spriteSourceSize.x + frame.frame.w / 2 - window.x,
      y: frame.spriteSourceSize.y + Math.min(6, Math.floor(frame.frame.h / 4)) - window.y
    });
  }
  const agent = state.specialAgents.find(({ destinationId }) => (
    destinationId === destination.id
  ));
  if (agent) {
    const window = sceneWindow(PORT_SCENE_ENTITY_META.npcs.depth);
    return Object.freeze({
      x: agent.startX - window.x,
      y: agent.feetY - 8 - window.y
    });
  }
  return null;
}

function activateDestination(destinationId, saleShipId = null) {
  const destination = destinationById(destinationId);
  if (!destination) throw new Error(`City destination is unavailable: ${destinationId}`);
  const activation = Object.freeze({ id: destination.id, saleShipId });
  state.pointer = null;
  state.cameraVelocity = 0;
  state.cameraPanTarget = null;
  updateHover();
  onDestination(activation);
  return activation;
}

function createSpecialPeopleAgents() {
  if (!state.city || state.features.settlementStage !== "city") return Object.freeze([]);
  const agents = [];
  if (!state.barred) {
    const appearances = cityPortStaffAppearanceIds(state.city);
    const staffPlacements = cityPortStaffPlacements({
      dockKind: state.features.dock,
      fortified: state.features.fortified
    });
    for (const placement of staffPlacements) {
      if (placement.destinationId && !destinationById(placement.destinationId)) continue;
      agents.push(Object.freeze({
        id: `${state.city.id}:staff:${placement.role}`,
        ...(placement.destinationId ? { destinationId: placement.destinationId } : {}),
        appearanceId: appearances[placement.role],
        role: placement.role,
        startX: placement.startX,
        endX: placement.startX,
        feetY: placement.feetY,
        phase: 0,
        speed: 0,
        motion: "stationary",
        interactive: false,
        animationId: "idle",
        facingRight: placement.facingRight
      }));
    }
  }
  const caught = state.illicitCaughtStartedAtMs !== null;
  const guardCount = state.barred ? 5 : caught ? 3 : 0;
  if (guardCount > 0) {
    for (const [index, appearanceId] of cityGarrisonAppearanceIds(state.city, guardCount).entries()) {
      const placement = cityGuardPlacement({ dockKind: state.features.dock, index });
      agents.push(Object.freeze({
        id: `${state.city.id}:barred-dock-guard:${index + 1}`,
        appearanceId,
        role: "garrison",
        startX: placement.startX,
        endX: caught
          ? cityGuardApproachEndX({ dockKind: state.features.dock, index })
          : placement.startX,
        feetY: placement.feetY,
        phase: index / 5,
        speed: caught ? 0.0014 : 0,
        motion: caught ? "guard-approach" : "stationary",
        startedAtMs: caught ? state.illicitCaughtStartedAtMs : undefined,
        facingRight: index % 2 === 0
      }));
    }
  }
  if (caught || state.availableDestinationIds?.has(PORT_CITY_LOCATION.ILLICIT_MERCHANT)) {
    const placement = citySuspiciousMerchantPlacement({
      dockKind: state.features.dock,
      caught
    });
    agents.push(Object.freeze({
      id: `${state.city.id}:suspicious-merchant`,
      destinationId: PORT_CITY_LOCATION.ILLICIT_MERCHANT,
      appearanceId: citySuspiciousMerchantAppearanceId(state.city),
      role: "ambient",
      startX: placement.startX,
      endX: placement.endX,
      feetY: placement.feetY,
      phase: 0,
      speed: caught ? 0.0017 : 0,
      motion: caught ? "merchant-flee" : "stationary",
      interactive: true,
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

function frameContainsOpaquePixel(atlas, frame, masterX, masterY, paddingPx = 1) {
  const localX = Math.floor(masterX - frame.spriteSourceSize.x);
  const localY = Math.floor(masterY - frame.spriteSourceSize.y);
  return cityFrameHitMaskContainsPoint({
    alpha: frameAlpha(frame, atlas),
    width: frame.frame.w,
    height: frame.frame.h,
    x: localX,
    y: localY,
    paddingPx
  });
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

function cityPeopleAtlasUrl(manifest) {
  if (typeof manifest?.sheet !== "string" || manifest.sheet.length === 0) {
    throw new Error("City people atlas manifest is missing a sheet filename");
  }
  if (typeof manifest.assetRevision !== "string" || !/^[0-9a-f]{16}$/.test(manifest.assetRevision)) {
    throw new Error("City people atlas manifest is missing its content revision");
  }
  return `${assetBaseUrl}/minifolks/${manifest.sheet}?v=${encodeURIComponent(manifest.assetRevision)}`;
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
  async selectShip(shipSlug) {
    await selectShip(shipSlug);
  },
  getCatalog() {
    if (!state.catalog || !state.shipManifest) {
      throw new Error("City scene catalog is not ready");
    }
    return Object.freeze({
      cities: Object.freeze([...state.catalog.cities]),
      ships: Object.freeze([...state.shipManifest.ships])
    });
  },
  getPresentationState() {
    if (!state.city || !state.features || !state.wind || !state.shipSlug) {
      throw new Error("City scene presentation state is not ready");
    }
    return Object.freeze({
      city: state.city,
      features: state.features,
      wind: state.wind,
      shipSlug: state.shipSlug,
      foreignSettlements: state.foreignSettlements,
      bombardmentEventId: state.bombardmentEventId,
      colonyClue: state.colonyClueId === null ? null : Object.freeze({
        id: state.colonyClueId, rect: colonyClueScreenRect(),
        label: state.destinationLabelLayouts.find(({ id }) => id === PORT_CITY_LOCATION.COLONY_CLUE) || null
      })
    });
  },
  setFeatureOverrides(overrides) {
    applyFeatureOverrides(overrides);
  },
  setPreviewWind({ speed = "auto", direction = "auto" } = {}) {
    state.wind = cityWindForCity(state.city, { speed, direction });
    updateHover();
  },
  setBombardmentEventId(eventId) {
    updateBombardmentEventId(eventId);
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
    if (state.focusedDestinationId === null) return null;
    focusDestination(state.focusedDestinationId, { immediate: true });
    return activateDestination(state.focusedDestinationId);
  },
  destinationAt(x, y) {
    const hit = destinationAtPoint(x, y);
    return hit ? Object.freeze({ id: hit.destination.id, saleShipId: hit.saleShipId }) : null;
  },
  activateAt(x, y) {
    const hit = destinationAtPoint(x, y);
    if (!hit) return null;
    if (hit.fromLabel === true) focusDestination(hit.destination.id, { immediate: true });
    return activateDestination(hit.destination.id, hit.saleShipId);
  },
  setColonistLandingElapsedMs(elapsedMs, { originCityId } = {}) {
    if (elapsedMs === null) {
      if (state.colonistLanding) {
        state.colonistLanding = null;
        rebuildCitySceneRenderPlan();
      }
      return null;
    }
    if (state.features.settlementStage !== "uninhabited" || state.assaultPresentation) {
      throw new Error("Colonist landing requires an uninhabited shore without active combat");
    }
    if (typeof originCityId !== "string" || !originCityId) {
      throw new Error("Colonist landing requires its expedition's canonical origin city ID");
    }
    if (state.colonistLanding && state.colonistLanding.originCityId !== originCityId) {
      throw new Error("Colonist landing cannot change its expedition origin");
    }
    const roster = state.colonistLanding?.roster || createCityColonistRoster(resolveCityRecord(originCityId));
    const frame = cityColonistLandingFrame(roster, elapsedMs);
    const shoreline = state.colonistLanding?.shoreline || colonistShoreline();
    const entering = state.colonistLanding === null;
    state.colonistLanding = { originCityId, roster, frame, shoreline };
    if (entering) {
      state.cameraVelocity = 0;
      state.cameraPanTarget = null;
      state.hoverPanDestinationId = null;
      state.focusedDestinationId = null;
      rebuildCitySceneRenderPlan();
    }
    return frame.complete;
  },
  setFeastPresentation(presentation) {
    if (presentation === null) {
      if (state.feast) {
        state.feast = null;
        rebuildCitySceneRenderPlan();
      }
      return;
    }
    const { phase, elapsedMs } = presentation;
    if (!["served", "afterwards"].includes(phase) || !Number.isFinite(elapsedMs) || elapsedMs < 0 ||
        !state.city || state.colonistLanding || state.assaultPresentation) {
      throw new Error("Invalid city feast presentation");
    }
    const changed = state.feast?.phase !== phase;
    state.feast = {
      phase, elapsedMs,
      guests: state.feast?.guests || createCityFeastGuests(state.city),
      frames: state.feast?.frames || cityFeastFrames(state.portManifest),
      dishes: changed ? cityFeastDishes(phase) : state.feast.dishes
    };
    if (changed) {
      state.cameraVelocity = 0;
      state.cameraPanTarget = null;
      state.hoverPanDestinationId = null;
      state.focusedDestinationId = null;
      focusSceneMasterX(CITY_FEAST_TABLE.x + CITY_FEAST_TABLE.width / 2, { immediate: true });
      rebuildCitySceneRenderPlan();
    }
  },
  setAssaultPresentation(presentation) {
    if (presentation !== null && state.colonistLanding) {
      throw new Error("Port assault cannot overlap a colonist landing");
    }
    if (presentation !== null && (
      !presentation || !Array.isArray(presentation.units) || !Array.isArray(presentation.events) ||
      !Number.isFinite(presentation.elapsedMs) || presentation.elapsedMs < 0 ||
      !Number.isFinite(presentation.durationMs) || presentation.durationMs < 0 ||
      !Number.isFinite(presentation.shipHitPoints) || presentation.shipHitPoints < 0 ||
      !Number.isFinite(presentation.shipMaxHitPoints) || presentation.shipMaxHitPoints <= 0 ||
      presentation.shipHitPoints > presentation.shipMaxHitPoints ||
      ![null, "victory", "defeat"].includes(presentation.outcome)
    )) {
      throw new Error("Invalid port assault presentation");
    }
    const assaultWasActive = state.assaultPresentation !== null;
    const enteringAssault = presentation !== null && !assaultWasActive;
    if (state.hoverPanDestinationId !== null) state.cameraPanTarget = null;
    state.pinnedDestinationLabel = null;
    state.hoverPanDestinationId = null;
    state.assaultPresentation = presentation;
    if (assaultWasActive !== (presentation !== null)) rebuildCitySceneRenderPlan();
    invalidateDestinationLabelLayouts();
    if (presentation) {
      if (enteringAssault) focusDestination(PORT_CITY_LOCATION.SET_SAIL, { immediate: true });
      state.focusedDestinationId = PORT_CITY_LOCATION.SET_SAIL;
      focusAssaultPresentation(presentation);
    }
    updateHover();
  },
  getSceneFeatures() {
    if (!state.features) throw new Error("City scene features are not ready");
    return Object.freeze({
      dockKind: state.features.dock,
      fortified: state.features.fortified
    });
  },
  getCitySceneFeatures(cityId) {
    const city = resolveCityRecord(cityId);
    const features = resolveCitySceneFeatures(city, {});
    return Object.freeze({
      dockKind: features.dock,
      fortified: features.fortified
    });
  },
  getCityAssaultProfile(cityId) {
    const city = resolveCityRecord(cityId);
    return Object.freeze({
      id: city.id,
      cityId: city.cityId,
      label: city.label,
      cityType: city.cityType,
      country: city.country,
      factionId: city.factionId,
      population: city.population,
      populationProfileId: city.populationProfileId,
      settlementType: city.settlementType,
      capital: city.capital,
      isFactionCapital: city.capital
    });
  },
  drawEmissiveOverlay(targetContext, offset) {
    if (!separateEmissiveOverlay || !emissiveCanvas) {
      throw new Error("City scene emissive overlay was not configured separately");
    }
    if (!targetContext || typeof targetContext.drawImage !== "function") {
      throw new TypeError("City scene emissive overlay requires a 2D target context");
    }
    if (!offset || !Number.isInteger(offset.x) || !Number.isInteger(offset.y)) {
      throw new TypeError("City scene emissive overlay requires an integer pixel offset");
    }
    targetContext.save();
    targetContext.imageSmoothingEnabled = false;
    targetContext.drawImage(emissiveCanvas, offset.x, offset.y);
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
    invalidateDestinationLabelLayouts();
    citySceneRenderer.invalidateStaticCache();
    updateHover();
  }
});
}
