import {
  buildGeodesicGraph,
  clamp,
  createDirectionIndex,
  cross3,
  dot3,
  findNearestTileId,
  graphCenter,
  normalize3
} from "./geodesic.js";
import {
  MANUAL_RIVER_HEX_CHAINS_BY_SUBDIVISIONS,
  MANUAL_RIVER_MOUTH_EDGES_BY_SUBDIVISIONS
} from "./manualRiverHexChains.js";
import {
  TILE_DAY_RAIN,
  TILE_DAY_SNOW_FALL,
  TILE_DAY_SNOW_GROUND,
  TILE_DAY_WET_SOIL,
  WEATHER_DAYS,
  WEATHER_MINUTES_PER_DAY,
  cloudLifecycleScaleOpacity,
  dateToSubsolarLatDeg,
  decodeDiscreteWeatherYearBakeFile,
  decodePixelRuntimeWeatherBakeFile,
  discreteWeatherFlagsForTile,
  fillIceMaskForDay,
  weatherClockParts,
  windAtLatLonDeg
} from "./weather.js";

const SCREEN_W = 455;
const SCREEN_H = 256;
const SUBDIVISIONS = 7;
const PIXELS_PER_RADIAN = 2450;
const TILE_RADIUS_PX = 10;
const TILE_ART_SIZE = 36;
const TILE_ART_HALF = TILE_ART_SIZE / 2;
const FACE_HALF_WIDTH = 7;
const BEACH_SPECKLE_COUNT = 5;
const BEACH_LIGHT_SPECKLE_COLOR = "rgba(255, 236, 151, 0.46)";
const BEACH_DARK_SPECKLE_COLOR = "rgba(218, 184, 92, 0.26)";
const BEACH_WAVE_PERIOD_MS = 3600;
const BEACH_WAVE_ADVANCE_RATIO = 0.44;
const BEACH_WAVE_RECEDE_RATIO = 0.38;
const BEACH_WAVE_MIN_REACH = 0.16;
const BEACH_WAVE_MAX_REACH = 0.78;
const BEACH_WAVE_WATER_ALPHA = 0.58;
const BEACH_WAVE_EDGE_RECESS = 0.2;
const FRONT_FACE_OVERLAP_PX = 4;
const FRONT_FACE_MIN_DY = 2;
const RIVER_ARM_LENGTH_PX = 15;
const RIVER_MOUTH_ARM_LENGTH_PX = 17;
const RIVER_CURVE_BEND_PX = 4;
const RIVER_BODY_RADIUS_PX = 2;
const RIVER_CONNECTOR_RADIUS_PX = 3;
const RIVER_MOUTH_RADIUS_PX = 5;
const RIVER_JOIN_MIN_LENGTH_PX = 5;
const RIVER_SPRITE_CACHE_LIMIT = 4096;
const VIEW_MARGIN = 58;
const CHART_REBUILD_RADIUS_PX = 28;
const CHART_MARGIN = VIEW_MARGIN + CHART_REBUILD_RADIUS_PX + TILE_ART_SIZE;
const MAX_CHART_TILES = 4200;
const START_LAT_DEG = 25.0;
const START_LON_DEG = -80.0;
const SHIP_SHEET_FRAME_SIZE = 36;
const SHIP_SHEET_COLS = 4;
const SHIP_HEADING_COUNT = 16;
const SHIP_TURN_RATE_RAD = 2.35;
const SHIP_SAIL_ACCEL_RAD = 0.018;
const SHIP_DRAG_PER_SECOND = 0.62;
const SHIP_MAX_SPEED_RAD = 0.035;
const SHIP_MIN_POWERED_SPEED_RAD = 0.006;
const SHIP_MIN_SLIDE_SPEED_RAD = 0.0015;
const SHIP_COLLISION_DAMPING = 0.82;
const SHIP_STOP_DAMPING = 0.15;
const SHIP_COLLISION_RADIUS_PX = 5;
const SHIP_COLLISION_SAMPLE_STEP_PX = 2;
const SAIL_NO_GO_ANGLE_RAD = Math.PI / 4;
const KELVIN_WAKE_HALF_ANGLE_RAD = Math.asin(1 / 3);
const SHIP_WAKE_MIN_SPEED_PX = 2.5;
const SHIP_WAKE_MIN_LENGTH_PX = 7;
const SHIP_WAKE_MAX_LENGTH_PX = 22;
const WIND_INDICATOR_RADIUS_PX = 20;
const WATER_FRAME_MS = 2000;
const WATER_REDRAW_MS = 250;
const WATER_DEPTH_GRADATION_COUNT = 4;
const WEATHER_REDRAW_MS = 250;
const PRECIP_PARTICLE_REDRAW_MS = 80;
const RAIN_PARTICLE_LIMIT = 340;
const SNOW_PARTICLE_LIMIT = 240;
const RAIN_PARTICLES_PER_TILE = 3;
const SNOW_PARTICLES_PER_TILE = 2;
const PRECIP_PARTICLE_VIEW_MARGIN = 30;
const WEATHER_DEFAULT_TIME_SCALE = 3600;
const WEATHER_WIND_SEED = 90210;
const CLOUD_LIFESPAN_MINUTES = 14 * 60;
const CLOUD_DRIFT_PX = 24;
const MAX_LOCAL_WEATHER_CLOUDS = 36;
const TERRAIN_ASSET_VERSION = "water-depth-gradations-1";
const LOCAL_LAYOUT_CULL_MARGIN = 520;
const MINIMAP_W = 80;
const MINIMAP_H = 26;
const MINIMAP_MAX_LAT_DEG = 72;
const MINIMAP_MAX_MERCATOR = mercatorYForLatDeg(MINIMAP_MAX_LAT_DEG);
const MINIMAP_X = SCREEN_W - MINIMAP_W - 5;
const MINIMAP_Y = 5;
const WORLD_NORTH = [0, 1, 0];
const TERRAIN_VARIANT = terrainVariantFromLocation();
const START_POSITION = startPositionFromLocation();
const START_WEATHER = startWeatherFromLocation();

const terrainAssets = [
  "water_deep_01_01", "water_deep_01_02", "water_shallow_01", "water_shallow_02",
  "water_depth_01_01", "water_depth_01_02", "water_depth_02_01", "water_depth_02_02",
  "water_depth_03_01", "water_depth_03_02", "water_depth_04_01", "water_depth_04_02",
  "sand_01", "sand_02", "sand_03", "sand_04", "sand_05",
  "grass_01", "grass_02", "grass_03", "grass_04", "grass_flowers",
  "forest_broadleaf_01", "forest_broadleaf_02", "forest_broadleaf_03",
  "pine_forest_01", "pine_forest_snow_01",
  "jungle_dense_01", "jungle_dense_02", "jungle_dense_03",
  "jungle_palm_01", "jungle_palm_02", "jungle_palm_03",
  "earth_rocky", "earth_stone", "earth_cracked",
  "mud_01", "mud_02", "mud_03", "mud_04",
  "mountain_stone_01", "mountain_stone_02", "mountain_stone_03",
  "mountain_snowy_01", "mountain_snowy_02",
  "snow_01", "ice_01"
];

const canvas = document.getElementById("view");
const ctx = canvas.getContext("2d", { alpha: false });
ctx.imageSmoothingEnabled = false;

const keys = new Set();
let graph;
let directionIndex;
let earthRows;
let earthById;
let images;
let shipImage;
let spriteColors;
let riverColors;
let riverMasks;
let riverToWaterMasks;
let riverSpriteCache = new Map();
let waterDepthBands;
let weatherBake;
let runtimeWeather;
let seaIceMask;
let freshwaterIceMask;
let cloudSprites;
let weatherClockMinutes = START_WEATHER.clockMinutes;
let weatherTimeScale = START_WEATHER.timeScale;
let pausedWeatherTimeScale = START_WEATHER.timeScale || WEATHER_DEFAULT_TIME_SCALE;
let weatherParts = weatherClockParts(weatherClockMinutes);
let weatherMaskDayIndex = -1;
let weatherDrawTick = -1;
let ship;
let camera;
let chart;
let localLayout;
let minimap;
let centerTileId = 0;
let dirty = true;
let lastFrameMs = performance.now();
let lastStatusMs = 0;
let lastOverlayMs = 0;
let waterAnimationClockMs = 0;
let waterAnimationDrawTick = -1;
let precipParticleDrawTick = -1;
let precipParticles = [];
let precipParticleSerial = 1;
let visiblePrecipitationLastRender = false;

fitCanvasToIntegerScale();
window.addEventListener("resize", fitCanvasToIntegerScale);

window.addEventListener("keydown", (event) => {
  if (isWeatherControlKey(event.key)) {
    event.preventDefault();
    handleWeatherControlKey(event.key);
    return;
  }
  if (isControlKey(event.key)) {
    event.preventDefault();
    keys.add(event.key);
  }
});

window.addEventListener("keyup", (event) => {
  if (isControlKey(event.key)) {
    event.preventDefault();
    keys.delete(event.key);
  }
});

main().catch((err) => {
  console.error(err);
  drawFatalError(err);
});

async function main() {
  drawLoading();
  const [loadedImages, loadedShipImage, earth, discreteWeatherBuffer, runtimeWeatherBuffer] = await Promise.all([
    loadTerrainImages(),
    loadVehicleImage("sail-ship-16-headings"),
    fetchEarthCache(),
    fetchBinary("/shared/discrete-weather-bake-7.bin", "discrete weather bake"),
    fetchBinary("/shared/globe-runtime-bake-7.bin", "globe runtime bake")
  ]);
  images = loadedImages;
  shipImage = loadedShipImage;
  earthRows = earth.tiles;
  if (earth.subdivisions !== SUBDIVISIONS) {
    throw new Error(`Expected Earth cache subdivision ${SUBDIVISIONS}, got ${earth.subdivisions}`);
  }

  graph = buildGeodesicGraph(SUBDIVISIONS);
  if (graph.tileCount !== earth.tileCount || graph.tileCount !== earthRows.length) {
    throw new Error(`Tile count mismatch: graph=${graph.tileCount}, cache=${earth.tileCount}, rows=${earthRows.length}`);
  }
  const globeTileIds = earthRows.map((row) => row.id);
  weatherBake = decodeDiscreteWeatherYearBakeFile(
    discreteWeatherBuffer,
    globeTileIds,
    earth.version,
    SUBDIVISIONS
  );
  runtimeWeather = decodePixelRuntimeWeatherBakeFile(
    runtimeWeatherBuffer,
    earth.version,
    SUBDIVISIONS,
    graph.tileCount
  );
  directionIndex = createDirectionIndex(graph);
  earthById = earthRows;
  waterDepthBands = buildWaterDepthBands();
  spriteColors = buildSpriteDominantColors(images);
  riverColors = buildRiverColors(images);
  const riverData = buildRiverMasksFromCache(earth);
  riverMasks = riverData.masks;
  riverToWaterMasks = riverData.toWaterMasks;
  seaIceMask = new Uint8Array(graph.tileCount);
  freshwaterIceMask = new Uint8Array(graph.tileCount);
  cloudSprites = buildCloudSprites();
  refreshWeatherState(true);
  minimap = buildMinimap();
  ship = createShip(START_POSITION.lat, START_POSITION.lon);
  camera = northUpCamera(ship.position);
  centerTileId = ship.tileId;
  localLayout = createLocalLayout(centerTileId);
  chart = buildChart(camera);
  requestAnimationFrame(loop);
}

async function fetchEarthCache() {
  const res = await fetch("/shared/earth-globe-cache-7.json");
  if (!res.ok) throw new Error(`Failed to load Earth cache: HTTP ${res.status}`);
  return res.json();
}

async function fetchBinary(path, label) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${label}: HTTP ${res.status}`);
  return res.arrayBuffer();
}

function loadTerrainImages() {
  return Promise.all(terrainAssets.map((key) => loadImage(key))).then((entries) => {
    const map = new Map(entries);
    for (const required of ["grass_01", "water_deep_01_01", "sand_01", "mountain_stone_01"]) {
      if (!map.has(required)) throw new Error(`Missing terrain image: ${required}`);
    }
    return map;
  });
}

function loadImage(key) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve([key, img]);
    img.onerror = () => reject(new Error(`Failed to load ${TERRAIN_VARIANT} terrain image: ${key}`));
    img.src = `/assets/terrain/${TERRAIN_VARIANT}/${key}.png?v=${TERRAIN_ASSET_VERSION}`;
  });
}

function loadVehicleImage(key) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load vehicle image: ${key}`));
    img.src = `/assets/vehicles/${key}.png?v=${TERRAIN_ASSET_VERSION}`;
  });
}

function terrainVariantFromLocation() {
  const requested = new URLSearchParams(window.location.search).get("terrain") || "resurrect-64";
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(requested)) {
    throw new Error(`Invalid terrain variant: ${requested}`);
  }
  return requested;
}

function startPositionFromLocation() {
  const params = new URLSearchParams(window.location.search);
  return {
    lat: numericQueryParam(params, "lat", START_LAT_DEG, -89.999, 89.999),
    lon: numericQueryParam(params, "lon", START_LON_DEG, -180, 180)
  };
}

function startWeatherFromLocation() {
  const params = new URLSearchParams(window.location.search);
  const dayParam = params.has("doy") ? "doy" : "day";
  const dayNumber = numericQueryParam(params, dayParam, 80, 1, WEATHER_DAYS);
  const hour = numericQueryParam(params, "hour", 12, 0, 23);
  const minute = numericQueryParam(params, "minute", 0, 0, 59);
  const speedParam = params.has("timeScale") ? "timeScale" : "autoTimeSpeed";
  const timeScale = numericQueryParam(params, speedParam, WEATHER_DEFAULT_TIME_SCALE, 0, 86400);
  return {
    clockMinutes: (Math.floor(dayNumber) - 1) * WEATHER_MINUTES_PER_DAY +
      Math.floor(hour) * 60 +
      Math.floor(minute),
    timeScale
  };
}

function numericQueryParam(params, name, fallback, min, max) {
  const raw = params.get(name);
  if (raw === null || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`Invalid ${name} query param: ${raw}. Expected ${min}..${max}`);
  }
  return value;
}

function buildSpriteDominantColors(imageMap) {
  const colors = new Map();
  const sampleCanvas = document.createElement("canvas");
  const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });
  if (!sampleCtx) throw new Error("Could not create terrain sprite sampling canvas");
  sampleCtx.imageSmoothingEnabled = false;

  for (const [key, img] of imageMap.entries()) {
    sampleCanvas.width = img.width;
    sampleCanvas.height = img.height;
    sampleCtx.clearRect(0, 0, img.width, img.height);
    sampleCtx.drawImage(img, 0, 0);
    colors.set(key, mostCommonOpaqueColor(key, sampleCtx.getImageData(0, 0, img.width, img.height)));
  }

  return colors;
}

function buildRiverColors(imageMap) {
  const frame1 = riverColorFrame("water_shallow_01", imageMap.get("water_shallow_01"));
  const frame2 = riverColorFrame("water_shallow_02", imageMap.get("water_shallow_02"));
  if (!frame1.main || !frame1.light || !frame2.main || !frame2.light) {
    throw new Error("Could not derive river colors from loaded terrain sprites");
  }
  return {
    base: frame1.main,
    frames: [frame1, frame2]
  };
}

function riverColorFrame(key, img) {
  const ranked = rankedImageColors(key, img, 10);
  const main = ranked[0];
  const mainBrightness = colorBrightness(main);
  const light = ranked
    .filter((c) => colorBrightness(c) > mainBrightness + 18)
    .reduce((best, c) => (colorBrightness(c) > colorBrightness(best) ? c : best), main);

  return {
    main: rgbToHex(main.r, main.g, main.b),
    light: rgbToHex(light.r, light.g, light.b)
  };
}

function rankedImageColors(key, img, limit) {
  if (!img) throw new Error(`Missing terrain image for color sampling: ${key}`);
  const sampleCanvas = document.createElement("canvas");
  const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });
  if (!sampleCtx) throw new Error("Could not create river color sampling canvas");
  sampleCanvas.width = img.width;
  sampleCanvas.height = img.height;
  sampleCtx.clearRect(0, 0, img.width, img.height);
  sampleCtx.drawImage(img, 0, 0);
  const ranked = rankOpaqueColors(sampleCtx.getImageData(0, 0, img.width, img.height), limit);
  if (ranked.length === 0) throw new Error(`Terrain sprite has no opaque pixels: ${key}`);
  return ranked;
}

function colorBrightness(color) {
  return color.r * 0.299 + color.g * 0.587 + color.b * 0.114;
}

function buildRiverMasksFromCache(earth) {
  if (!earth.riverEdges || typeof earth.riverEdges !== "object") {
    throw new Error("Earth cache is missing riverEdges; rebuild examples/globe-demo/public/earth-globe-cache-7.json");
  }

  const masks = new Uint8Array(graph.tileCount);
  const toWaterMasks = new Uint8Array(graph.tileCount);
  for (const [rawId, edges] of Object.entries(earth.riverEdges)) {
    const tileId = Number(rawId);
    if (!Number.isInteger(tileId) || tileId < 0 || tileId >= graph.tileCount) {
      throw new Error(`Invalid river tile id in Earth cache: ${rawId}`);
    }
    if (!Array.isArray(edges)) {
      throw new Error(`Invalid river edge list for tile ${tileId}`);
    }
    for (const edge of edges) {
      addRiverEdgeMask(masks, tileId, edge, `Earth cache tile ${tileId}`);
    }
  }

  if (earth.riverEdgeToWater != null) {
    if (typeof earth.riverEdgeToWater !== "object") {
      throw new Error("Earth cache riverEdgeToWater must be an object when present");
    }
    for (const [rawId, edges] of Object.entries(earth.riverEdgeToWater)) {
      const tileId = Number(rawId);
      if (!Number.isInteger(tileId) || tileId < 0 || tileId >= graph.tileCount) {
        throw new Error(`Invalid river-to-water tile id in Earth cache: ${rawId}`);
      }
      if (!Array.isArray(edges)) {
        throw new Error(`Invalid river-to-water edge list for tile ${tileId}`);
      }
      for (const edge of edges) {
        addRiverEdgeMask(toWaterMasks, tileId, edge, `Earth cache river-to-water tile ${tileId}`);
      }
    }
  }

  const added = mergeManualRiverChainsIntoMasks(masks);
  const manualMouthEdges = mergeManualRiverMouthEdgesIntoMasks(masks, toWaterMasks);
  const mouthEdges = markRiverEdgesOpeningToWater(masks, toWaterMasks);
  console.info(
    `[pixel-globe] river masks loaded: ${countRiverTiles(masks)} tiles, ${added} manual half-edge additions, ${manualMouthEdges} manual mouth half-edges, ${mouthEdges} derived coastal mouth half-edges`
  );
  return { masks, toWaterMasks };
}

function markRiverEdgesOpeningToWater(masks, toWaterMasks) {
  let added = 0;
  for (let tileId = 0; tileId < graph.tileCount; tileId++) {
    const mask = masks[tileId];
    if (mask === 0 || isWaterLikeRow(earthById[tileId])) continue;
    const edgeCount = graph.edgeCount[tileId];
    for (let edge = 0; edge < edgeCount; edge++) {
      if ((mask & (1 << edge)) === 0) continue;
      const neighborId = graph.edgeNeighbors[tileId]?.[edge];
      if (neighborId === undefined) {
        throw new Error(`River edge ${edge} on tile ${tileId} has no edge neighbor`);
      }
      if (isWaterLikeRow(earthById[neighborId])) {
        added += addRiverEdgeMask(toWaterMasks, tileId, edge, `derived river-to-water tile ${tileId}`);
      }
    }
  }
  return added;
}

function mergeManualRiverChainsIntoMasks(masks) {
  const chains = MANUAL_RIVER_HEX_CHAINS_BY_SUBDIVISIONS[SUBDIVISIONS] || [];
  let added = 0;
  for (const chain of chains) {
    for (let i = 0; i < chain.length - 1; i++) {
      added += addRiverEdgeBetween(masks, chain[i], chain[i + 1], "manual river chain");
    }
  }
  return added;
}

function mergeManualRiverMouthEdgesIntoMasks(masks, toWaterMasks) {
  const mouths = MANUAL_RIVER_MOUTH_EDGES_BY_SUBDIVISIONS[SUBDIVISIONS] || [];
  let added = 0;
  for (const mouth of mouths) {
    const { tile, edge } = mouth;
    const neighborId = graph.edgeNeighbors[tile]?.[edge];
    if (neighborId === undefined) {
      throw new Error(`manual river mouth: tile ${tile} has no edge ${edge}`);
    }
    if (!isWaterLikeRow(earthById[neighborId])) {
      throw new Error(`manual river mouth: tile ${tile} edge ${edge} does not touch water`);
    }
    added += addRiverEdgeMask(masks, tile, edge, `manual river mouth tile ${tile}`);
    addRiverEdgeMask(toWaterMasks, tile, edge, `manual river mouth tile ${tile}`);
  }
  return added;
}

function addRiverEdgeBetween(masks, a, b, source) {
  const edgeA = edgeIndexTowardNeighbor(a, b);
  const edgeB = edgeIndexTowardNeighbor(b, a);
  if (edgeA === undefined || edgeB === undefined) {
    throw new Error(`${source}: tiles ${a} and ${b} are not adjacent`);
  }
  let added = 0;
  added += addRiverEdgeMask(masks, a, edgeA, `${source} ${a}->${b}`);
  added += addRiverEdgeMask(masks, b, edgeB, `${source} ${b}->${a}`);
  return added;
}

function addRiverEdgeMask(masks, tileId, edge, source) {
  const edgeCount = graph.edgeCount[tileId];
  if (!Number.isInteger(edge) || edge < 0 || edge >= edgeCount) {
    throw new Error(`${source}: invalid edge ${edge}; tile ${tileId} has ${edgeCount} edges`);
  }
  const bit = 1 << edge;
  if ((masks[tileId] & bit) !== 0) return 0;
  masks[tileId] |= bit;
  return 1;
}

function edgeIndexTowardNeighbor(tileId, neighborId) {
  const edgeNeighbors = graph.edgeNeighbors[tileId];
  if (!edgeNeighbors) return undefined;
  const edge = edgeNeighbors.indexOf(neighborId);
  return edge >= 0 ? edge : undefined;
}

function countRiverTiles(masks) {
  let count = 0;
  for (const mask of masks) {
    if (mask !== 0) count++;
  }
  return count;
}

function buildWaterDepthBands() {
  const deepBand = WATER_DEPTH_GRADATION_COUNT + 1;
  const bands = new Uint8Array(graph.tileCount);
  bands.fill(deepBand);

  const queue = [];
  for (let id = 0; id < graph.tileCount; id++) {
    if (!isOceanWaterRow(earthById[id])) continue;
    for (const neighborId of graph.neighbors[id]) {
      if (isOceanWaterRow(earthById[neighborId])) continue;
      bands[id] = 1;
      queue.push(id);
      break;
    }
  }

  let head = 0;
  while (head < queue.length) {
    const id = queue[head++];
    const nextBand = bands[id] + 1;
    if (nextBand > WATER_DEPTH_GRADATION_COUNT) continue;
    for (const neighborId of graph.neighbors[id]) {
      if (!isOceanWaterRow(earthById[neighborId])) continue;
      if (bands[neighborId] <= nextBand) continue;
      bands[neighborId] = nextBand;
      queue.push(neighborId);
    }
  }

  console.info(`[pixel-globe] water depth bands: ${queue.length} coastal/intermediate ocean tiles`);
  return bands;
}

function isOceanWaterRow(row) {
  return row?.t === "water";
}

function mostCommonOpaqueColor(key, imageData) {
  const ranked = rankOpaqueColors(imageData, 1);
  if (ranked.length === 0) throw new Error(`Terrain sprite has no opaque pixels: ${key}`);
  const color = ranked[0];
  return rgbToHex(color.r, color.g, color.b);
}

function rankOpaqueColors(imageData, limit) {
  const counts = new Map();
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] <= 50) continue;
    const colorKey = `${data[i]},${data[i + 1]},${data[i + 2]}`;
    counts.set(colorKey, (counts.get(colorKey) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([colorKey, count]) => {
      const [r, g, b] = colorKey.split(",").map(Number);
      return { r, g, b, count };
    });
}

function rgbToHex(r, g, b) {
  const parts = [r, g, b].map((v) => clamp(v, 0, 255).toString(16).padStart(2, "0"));
  return `#${parts.join("")}`;
}

function parseHexColor(hex) {
  const clean = hex.startsWith("#") ? hex.slice(1) : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) throw new Error(`Expected 6-digit hex color, got: ${hex}`);
  const n = Number.parseInt(clean, 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255
  };
}

function rgbaFromHex(hex, alpha) {
  const { r, g, b } = parseHexColor(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function easeInOut(t) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

function loop(nowMs) {
  const dt = Math.min(0.05, (nowMs - lastFrameMs) / 1000);
  lastFrameMs = nowMs;
  if (updateSailing(dt)) dirty = true;
  if (updateWaterAnimation(nowMs)) dirty = true;
  if (updateWeather(dt, nowMs)) dirty = true;
  if (updatePrecipitationAnimation(nowMs)) dirty = true;
  if (dirty || nowMs - lastStatusMs > 1000) {
    render(nowMs);
    dirty = false;
    lastStatusMs = nowMs;
    lastOverlayMs = nowMs;
  } else if (nowMs - lastOverlayMs > 250) {
    drawMinimap(nowMs);
    lastOverlayMs = nowMs;
  }
  requestAnimationFrame(loop);
}

function createLocalLayout(centerId) {
  return {
    viewX: 0,
    viewY: 0,
    positions: new Map([[centerId, { x: 0, y: 0 }]])
  };
}

function createShip(latDeg, lonDeg) {
  const requested = latLonToDirection(latDeg, lonDeg);
  const tileId = nearestShipStartTile(requested);
  const position = tileCenterVector(tileId);
  const heading = initialShipHeading(position);
  return {
    position,
    tileId,
    heading,
    targetHeading: heading.slice(),
    velocity: [0, 0, 0]
  };
}

function nearestShipStartTile(direction) {
  const startId = findNearestTileId(graph, directionIndex, direction);
  if (isShipNavigableTile(startId)) return startId;
  const oceanId = nearestTileMatching(startId, isShipOceanTile);
  if (oceanId !== undefined) return oceanId;
  const openWaterId = nearestTileMatching(startId, isShipOpenWaterTile);
  if (openWaterId !== undefined) return openWaterId;
  const navigableId = nearestTileMatching(startId, isShipNavigableTile);
  if (navigableId !== undefined) return navigableId;
  throw new Error("Could not find a navigable start tile for the ship");
}

function nearestTileMatching(startId, predicate) {
  const seen = new Set([startId]);
  const q = [startId];
  let qi = 0;
  while (qi < q.length) {
    const id = q[qi++];
    if (predicate(id)) return id;
    for (const nid of graph.neighbors[id]) {
      if (seen.has(nid)) continue;
      seen.add(nid);
      q.push(nid);
    }
  }
  return undefined;
}

function initialShipHeading(position) {
  return normalizeTangentOrFallback(WORLD_NORTH, position, [1, 0, 0]);
}

function updateSailing(dt) {
  if (!ship || !camera) return false;
  const inputHeading = inputHeadingForShip();

  const previousHeading = ship.heading;
  if (inputHeading) {
    ship.targetHeading = inputHeading;
    ship.heading = rotateTangentToward(
      ship.heading,
      ship.targetHeading,
      ship.position,
      SHIP_TURN_RATE_RAD * dt
    );
  } else {
    ship.targetHeading = ship.heading;
  }

  applyWindAcceleration(dt);
  const moveResult = moveShipWithCollision(dt);
  const headingChanged = dot3(previousHeading, ship.heading) < 0.9995;
  return moveResult.moved || moveResult.collided || headingChanged || vectorLength(ship.velocity) > 0.0001;
}

function inputHeadingForShip() {
  let dx = 0;
  let dy = 0;
  if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) dx -= 1;
  if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) dx += 1;
  if (keys.has("ArrowUp") || keys.has("w") || keys.has("W")) dy += 1;
  if (keys.has("ArrowDown") || keys.has("s") || keys.has("S")) dy -= 1;
  if (dx === 0 && dy === 0) return null;

  return normalizeTangentOrFallback([
    camera.right[0] * dx + camera.up[0] * dy,
    camera.right[1] * dx + camera.up[1] * dy,
    camera.right[2] * dx + camera.up[2] * dy
  ], ship.position, ship.heading);
}

function applyWindAcceleration(dt) {
  const wind = windForTile(ship.tileId);
  const windFlow = windFlowVectorAtShip(wind);
  const efficiency = sailingEfficiency(ship.heading, windFlow);
  const sailAccel = SHIP_SAIL_ACCEL_RAD * wind.strength * efficiency;

  ship.velocity = [
    ship.velocity[0] + ship.heading[0] * sailAccel * dt,
    ship.velocity[1] + ship.heading[1] * sailAccel * dt,
    ship.velocity[2] + ship.heading[2] * sailAccel * dt
  ];
  ship.velocity = projectTangentVector(ship.velocity, ship.position);
  const drag = SHIP_DRAG_PER_SECOND * (efficiency > 0 ? 1 : 1.9);
  ship.velocity = scaleVector(ship.velocity, Math.exp(-drag * dt));
  limitShipSpeed(poweredShipMaxSpeed(wind.strength, efficiency));
}

function sailingEfficiency(heading, windFlow) {
  const alignment = clamp(dot3(heading, windFlow), -1, 1);
  const angleFromWind = Math.acos(clamp(-alignment, -1, 1));
  if (angleFromWind <= SAIL_NO_GO_ANGLE_RAD) return 0;

  if (angleFromWind <= Math.PI / 2) {
    return easeInOut((angleFromWind - SAIL_NO_GO_ANGLE_RAD) / (Math.PI / 2 - SAIL_NO_GO_ANGLE_RAD));
  }
  if (angleFromWind <= Math.PI * 0.75) {
    const t = (angleFromWind - Math.PI / 2) / (Math.PI * 0.25);
    return 1 - t * 0.15;
  }

  const t = (angleFromWind - Math.PI * 0.75) / (Math.PI * 0.25);
  return 0.85 - t * 0.3;
}

function poweredShipMaxSpeed(windStrength, efficiency) {
  if (efficiency <= 0) return Infinity;
  const windFactor = 0.28 + windStrength * 0.72;
  return SHIP_MIN_POWERED_SPEED_RAD + (SHIP_MAX_SPEED_RAD - SHIP_MIN_POWERED_SPEED_RAD) * windFactor * efficiency;
}

function windFlowVectorAtShip(wind) {
  const flowDir = wind.directionRad + Math.PI;
  return normalizeTangentOrFallback([
    camera.right[0] * Math.cos(flowDir) + camera.up[0] * Math.sin(flowDir),
    camera.right[1] * Math.cos(flowDir) + camera.up[1] * Math.sin(flowDir),
    camera.right[2] * Math.cos(flowDir) + camera.up[2] * Math.sin(flowDir)
  ], ship.position, ship.heading);
}

function limitShipSpeed(maxSpeed) {
  if (!Number.isFinite(maxSpeed)) return;
  const speed = vectorLength(ship.velocity);
  if (speed <= maxSpeed) return;
  ship.velocity = scaleVector(ship.velocity, maxSpeed / speed);
}

function moveShipWithCollision(dt) {
  const step = scaleVector(ship.velocity, dt);
  if (vectorLength(step) < 1e-8) return { moved: false, collided: false };

  const direct = attemptShipStep(ship.position, ship.tileId, step);
  if (direct.ok) {
    applyShipMove(direct.position, direct.tileId);
    return { moved: true, collided: false };
  }

  const normal = shipCollisionNormal(ship.position, direct.blockedTileId, step);
  const into = Math.max(0, dot3(ship.velocity, normal));
  const slideVelocity = projectTangentVector([
    ship.velocity[0] - normal[0] * into,
    ship.velocity[1] - normal[1] * into,
    ship.velocity[2] - normal[2] * into
  ], ship.position);

  if (vectorLength(slideVelocity) >= SHIP_MIN_SLIDE_SPEED_RAD) {
    const slide = attemptShipStep(ship.position, ship.tileId, scaleVector(slideVelocity, dt));
    if (slide.ok) {
      ship.velocity = projectTangentVector(scaleVector(slideVelocity, SHIP_COLLISION_DAMPING), slide.position);
      applyShipMove(slide.position, slide.tileId);
      return { moved: true, collided: true };
    }
  }

  ship.velocity = scaleVector(projectTangentVector(ship.velocity, ship.position), SHIP_STOP_DAMPING);
  if (vectorLength(ship.velocity) < SHIP_MIN_SLIDE_SPEED_RAD) ship.velocity = [0, 0, 0];
  return { moved: false, collided: true };
}

function attemptShipStep(fromPosition, fromTileId, step) {
  const segments = Math.max(1, Math.ceil(vectorLength(step) * PIXELS_PER_RADIAN / SHIP_COLLISION_SAMPLE_STEP_PX));
  let previousTileId = fromTileId;
  let position = fromPosition;

  for (let i = 1; i <= segments; i++) {
    position = normalize3([
      fromPosition[0] + step[0] * (i / segments),
      fromPosition[1] + step[1] * (i / segments),
      fromPosition[2] + step[2] * (i / segments)
    ]);
    const tileId = findNearestTileId(graph, directionIndex, position);
    if (!canShipMoveBetween(previousTileId, tileId)) return { ok: false, blockedTileId: tileId };
    const occupancy = shipOccupancyAtPosition(position, tileId);
    if (!occupancy.ok) return { ok: false, blockedTileId: occupancy.blockedTileId };
    previousTileId = tileId;
  }

  return { ok: true, position, tileId: previousTileId };
}

function shipOccupancyAtPosition(position, tileId) {
  const radius = SHIP_COLLISION_RADIUS_PX / PIXELS_PER_RADIAN;
  const forward = normalizeTangentOrFallback(ship.heading, position, WORLD_NORTH);
  const side = normalizeOrNull(cross3(position, forward));
  const sampleVectors = side
    ? [forward, side, scaleVector(side, -1)]
    : [forward];

  for (const sampleVector of sampleVectors) {
    const samplePosition = offsetSurfacePosition(position, sampleVector, radius);
    const sampleTileId = findNearestTileId(graph, directionIndex, samplePosition);
    if (sampleTileId === tileId) continue;
    if (canShipMoveBetween(tileId, sampleTileId)) continue;
    return { ok: false, blockedTileId: sampleTileId };
  }
  return { ok: true };
}

function offsetSurfacePosition(position, tangent, distanceRad) {
  return normalize3([
    position[0] + tangent[0] * distanceRad,
    position[1] + tangent[1] * distanceRad,
    position[2] + tangent[2] * distanceRad
  ]);
}

function applyShipMove(position, tileId) {
  const previousPosition = ship.position;
  const delta = [
    position[0] - previousPosition[0],
    position[1] - previousPosition[1],
    position[2] - previousPosition[2]
  ];
  const dx = dot3(delta, camera.right);
  const dy = dot3(delta, camera.up);

  ship.position = position;
  ship.tileId = tileId;
  ship.heading = normalizeTangentOrFallback(ship.heading, ship.position, WORLD_NORTH);
  ship.targetHeading = normalizeTangentOrFallback(ship.targetHeading, ship.position, ship.heading);
  ship.velocity = projectTangentVector(ship.velocity, ship.position);
  moveLocalView(dx, dy);
  camera = northUpCamera(ship.position, camera.right);
  centerTileId = ship.tileId;
}

function shipCollisionNormal(position, blockedTileId, fallbackStep) {
  if (blockedTileId !== undefined) {
    const towardTile = projectTangentVector(tileCenterVector(blockedTileId), position);
    const normal = normalizeOrNull(towardTile);
    if (normal) return normal;
  }
  const fallback = normalizeOrNull(projectTangentVector(fallbackStep, position));
  return fallback || ship.heading;
}

function canShipMoveBetween(fromTileId, toTileId) {
  if (!isShipNavigableTile(toTileId)) return false;
  if (fromTileId === toTileId) return true;

  const edgeA = edgeIndexTowardNeighbor(fromTileId, toTileId);
  const edgeB = edgeIndexTowardNeighbor(toTileId, fromTileId);
  if (edgeA === undefined || edgeB === undefined) return false;

  const fromWater = isShipOpenWaterTile(fromTileId);
  const toWater = isShipOpenWaterTile(toTileId);
  if (fromWater && toWater) return true;

  const fromRiver = shipTileHasRiver(fromTileId);
  const toRiver = shipTileHasRiver(toTileId);
  if (fromWater && toRiver) {
    return riverEdgeSet(riverMasks, toTileId, edgeB) || riverEdgeSet(riverToWaterMasks, toTileId, edgeB);
  }
  if (fromRiver && toWater) {
    return riverEdgeSet(riverMasks, fromTileId, edgeA) || riverEdgeSet(riverToWaterMasks, fromTileId, edgeA);
  }
  if (fromRiver && toRiver) {
    return riverEdgeSet(riverMasks, fromTileId, edgeA) && riverEdgeSet(riverMasks, toTileId, edgeB);
  }
  return false;
}

function isShipNavigableTile(tileId) {
  return isShipOpenWaterTile(tileId) || shipTileHasRiver(tileId);
}

function isShipOpenWaterTile(tileId) {
  return isWaterLikeRow(earthById[tileId]);
}

function isShipOceanTile(tileId) {
  return earthById[tileId]?.t === "water";
}

function shipTileHasRiver(tileId) {
  return (riverMasks?.[tileId] || 0) !== 0;
}

function moveLocalView(dx, dy) {
  localLayout.viewX += dx * PIXELS_PER_RADIAN;
  localLayout.viewY -= dy * PIXELS_PER_RADIAN;
}

function updateWaterAnimation(nowMs) {
  const tick = Math.floor(nowMs / WATER_REDRAW_MS);
  if (tick === waterAnimationDrawTick) return false;
  waterAnimationDrawTick = tick;
  waterAnimationClockMs = tick * WATER_REDRAW_MS;
  return true;
}

function updateWeather(dt, nowMs) {
  if (!runtimeWeather || !weatherBake) return false;
  if (weatherTimeScale > 0) {
    weatherClockMinutes += dt * weatherTimeScale / 60;
  }

  const dayChanged = refreshWeatherState(false);
  const tick = Math.floor(nowMs / WEATHER_REDRAW_MS);
  if (tick !== weatherDrawTick) {
    weatherDrawTick = tick;
    return weatherTimeScale > 0 || dayChanged;
  }
  return dayChanged;
}

function updatePrecipitationAnimation(nowMs) {
  const tick = Math.floor(nowMs / PRECIP_PARTICLE_REDRAW_MS);
  if (tick === precipParticleDrawTick) return false;
  precipParticleDrawTick = tick;
  return precipParticles.length > 0 || visiblePrecipitationLastRender;
}

function refreshWeatherState(force) {
  weatherParts = weatherClockParts(weatherClockMinutes);
  if (!runtimeWeather || !seaIceMask || !freshwaterIceMask) return false;
  if (!force && weatherParts.dayIndex === weatherMaskDayIndex) return false;
  weatherMaskDayIndex = weatherParts.dayIndex;
  fillIceMaskForDay(runtimeWeather.seaIceCycle, weatherParts.dayIndex, seaIceMask);
  fillIceMaskForDay(runtimeWeather.freshwaterIceCycle, weatherParts.dayIndex, freshwaterIceMask);
  return true;
}

function fitCanvasToIntegerScale() {
  const scale = Math.max(1, Math.floor(Math.min(
    window.innerWidth / SCREEN_W,
    window.innerHeight / SCREEN_H
  )));
  canvas.style.width = `${SCREEN_W * scale}px`;
  canvas.style.height = `${SCREEN_H * scale}px`;
}

function northUpCamera(center, fallbackRight = [1, 0, 0]) {
  let up = projectToTangent(WORLD_NORTH, center);
  if (Math.hypot(up[0], up[1], up[2]) >= 1e-6) {
    up = normalize3(up);
    const right = normalize3(cross3(up, center));
    return { center, right, up };
  }

  let right = projectToTangent(fallbackRight, center);
  if (Math.hypot(right[0], right[1], right[2]) < 1e-6) {
    right = projectToTangent([1, 0, 0], center);
  }
  if (Math.hypot(right[0], right[1], right[2]) < 1e-6) {
    right = projectToTangent([0, 0, 1], center);
  }
  right = normalize3(right);
  up = normalize3(cross3(center, right));
  return { center, right, up };
}

function projectToTangent(v, normal) {
  const d = dot3(v, normal);
  return [v[0] - normal[0] * d, v[1] - normal[1] * d, v[2] - normal[2] * d];
}

function projectTangentVector(v, normal) {
  return projectToTangent(v, normal);
}

function normalizeTangentOrFallback(v, normal, fallback) {
  const projected = projectTangentVector(v, normal);
  const normalized = normalizeOrNull(projected);
  if (normalized) return normalized;
  const fallbackProjected = projectTangentVector(fallback, normal);
  const fallbackNormalized = normalizeOrNull(fallbackProjected);
  if (fallbackNormalized) return fallbackNormalized;
  return northUpCamera(normal).right;
}

function rotateTangentToward(current, target, normal, maxStepRad) {
  const from = normalizeTangentOrFallback(current, normal, WORLD_NORTH);
  const to = normalizeTangentOrFallback(target, normal, from);
  const sin = dot3(cross3(from, to), normal);
  const cos = clamp(dot3(from, to), -1, 1);
  const signed = Math.atan2(sin, cos);
  const step = clamp(signed, -maxStepRad, maxStepRad);
  if (Math.abs(step) < 1e-6) return to;
  const quarterTurn = cross3(normal, from);
  return normalizeTangentOrFallback([
    from[0] * Math.cos(step) + quarterTurn[0] * Math.sin(step),
    from[1] * Math.cos(step) + quarterTurn[1] * Math.sin(step),
    from[2] * Math.cos(step) + quarterTurn[2] * Math.sin(step)
  ], normal, to);
}

function tileCenterVector(tileId) {
  const k = tileId * 3;
  return [graph.centers[k], graph.centers[k + 1], graph.centers[k + 2]];
}

function scaleVector(v, scale) {
  return [v[0] * scale, v[1] * scale, v[2] * scale];
}

function vectorLength(v) {
  return Math.hypot(v[0], v[1], v[2]);
}

function normalizeOrNull(v) {
  const length = vectorLength(v);
  if (length <= 1e-9) return null;
  return [v[0] / length, v[1] / length, v[2] / length];
}

function render(nowMs) {
  ctx.fillStyle = "#1f3650";
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

  ensureChart();
  const offset = chartOffsetPixels(chart);

  ctx.save();
  ctx.translate(offset.x, offset.y);
  for (const call of chart.baseFaceCalls) drawFace(call, chart);

  for (const call of chart.tileCalls) {
    drawTile(call, chart);
    const frontFaces = chart.frontFacesByTile.get(call.id);
    if (frontFaces) {
      for (const face of frontFaces) drawFace(face, chart, { coverFront: true });
    }
  }

  for (const call of chart.tileCalls) drawWeatherSurface(call);
  for (const call of chart.tileCalls) drawRiver(call, chart);
  for (const call of chart.riverConnectorCalls) drawRiverConnector(call, chart);
  drawPrecipitation(chart, nowMs, offset);
  drawCloudLayer(chart, nowMs);
  drawShipWake();
  drawShip();
  drawWindIndicator();
  ctx.restore();

  drawMinimap(nowMs);
  drawTinyStatus(nowMs);
}

function ensureChart() {
  if (!chart || !chart.visibleSet.has(centerTileId) || !localLayout.positions.has(centerTileId) || chartProjectionOffsetPixels(chart).magnitude > CHART_REBUILD_RADIUS_PX) {
    chart = buildChart(camera);
  }
}

function chartOffsetPixels(activeChart) {
  void activeChart;
  return layoutOffsetPixels();
}

function layoutOffsetPixels() {
  return {
    x: Math.round(SCREEN_W / 2 - localLayout.viewX),
    y: Math.round(SCREEN_H / 2 - localLayout.viewY),
    magnitude: 0
  };
}

function chartProjectionOffsetPixels(activeChart) {
  const projectedCenter = projectDirectionFor(camera.center, activeChart, false);
  if (!projectedCenter) return { x: 0, y: 0, magnitude: Infinity };
  const x = Math.round(SCREEN_W / 2 - projectedCenter.x);
  const y = Math.round(SCREEN_H / 2 - projectedCenter.y);
  return { x, y, magnitude: Math.hypot(x, y) };
}

function syncLocalLayout(projectedVisible, chartCenterTileId) {
  const projectedById = new Map();
  const pending = new Set();
  for (const item of projectedVisible) {
    projectedById.set(item.id, item);
    if (!localLayout.positions.has(item.id)) pending.add(item.id);
  }

  if (!localLayout.positions.has(chartCenterTileId)) {
    localLayout.positions.set(chartCenterTileId, {
      x: Math.round(localLayout.viewX),
      y: Math.round(localLayout.viewY)
    });
    pending.delete(chartCenterTileId);
  }

  let progress = true;
  while (pending.size > 0 && progress) {
    progress = false;
    for (const id of Array.from(pending)) {
      const position = localPositionFromNeighbors(id, projectedById);
      if (!position) continue;
      localLayout.positions.set(id, position);
      pending.delete(id);
      progress = true;
    }
  }

  if (pending.size > 0) {
    seedDisconnectedVisibleTiles(pending, projectedById, chartCenterTileId);
  }
}

function localPositionFromNeighbors(id, projectedById) {
  const projected = projectedById.get(id);
  if (!projected) return null;
  let x = 0;
  let y = 0;
  let count = 0;

  for (const neighborId of graph.neighbors[id]) {
    const neighborLayout = localLayout.positions.get(neighborId);
    const neighborProjected = projectedById.get(neighborId);
    if (!neighborLayout || !neighborProjected) continue;
    x += neighborLayout.x + projected.x - neighborProjected.x;
    y += neighborLayout.y + projected.y - neighborProjected.y;
    count++;
  }

  if (count === 0) return null;
  return {
    x: Math.round(x / count),
    y: Math.round(y / count)
  };
}

function seedDisconnectedVisibleTiles(pending, projectedById, chartCenterTileId) {
  const centerLayout = localLayout.positions.get(chartCenterTileId);
  const centerProjected = projectedById.get(chartCenterTileId);
  if (!centerLayout || !centerProjected) {
    throw new Error(`Cannot seed local layout for chart center tile: ${chartCenterTileId}`);
  }

  for (const id of pending) {
    const projected = projectedById.get(id);
    if (!projected) throw new Error(`Missing projected position for visible tile: ${id}`);
    localLayout.positions.set(id, {
      x: Math.round(centerLayout.x + projected.x - centerProjected.x),
      y: Math.round(centerLayout.y + projected.y - centerProjected.y)
    });
  }
}

function cullLocalLayout(projectedVisible) {
  const visibleIds = new Set(projectedVisible.map((item) => item.id));
  const minX = localLayout.viewX - SCREEN_W / 2 - LOCAL_LAYOUT_CULL_MARGIN;
  const maxX = localLayout.viewX + SCREEN_W / 2 + LOCAL_LAYOUT_CULL_MARGIN;
  const minY = localLayout.viewY - SCREEN_H / 2 - LOCAL_LAYOUT_CULL_MARGIN;
  const maxY = localLayout.viewY + SCREEN_H / 2 + LOCAL_LAYOUT_CULL_MARGIN;

  for (const [id, position] of localLayout.positions.entries()) {
    if (visibleIds.has(id)) continue;
    if (position.x < minX || position.x > maxX || position.y < minY || position.y > maxY) {
      localLayout.positions.delete(id);
    }
  }
}

function buildChart(anchorCamera) {
  const chartCamera = {
    center: anchorCamera.center.slice(),
    right: anchorCamera.right.slice(),
    up: anchorCamera.up.slice()
  };
  const chartCenterTileId = findNearestTileId(graph, directionIndex, chartCamera.center);
  const projectedVisible = collectChartTiles(chartCamera, chartCenterTileId);
  syncLocalLayout(projectedVisible, chartCenterTileId);
  cullLocalLayout(projectedVisible);
  const drawOffset = layoutOffsetPixels();
  const faceCalls = [];
  const riverConnectorCalls = [];
  const tileCalls = [];
  const baseFaceCalls = [];
  const frontFacesByTile = new Map();
  const tileById = new Map();
  const visibleSet = new Set();

  for (const item of projectedVisible) visibleSet.add(item.id);
  for (const item of projectedVisible) {
    const position = localLayout.positions.get(item.id);
    if (!position) throw new Error(`Missing local layout for visible tile: ${item.id}`);
    const row = earthById[item.id];
    const level = terrainLevel(row, item.id);
    const surface = { x: position.x, y: position.y - level * 3 };
    const tileCall = {
      id: item.id,
      x: position.x,
      y: position.y,
      row,
      level,
      surface,
      drawSurfaceX: surface.x,
      drawSurfaceY: surface.y,
      sortY: surface.y + level * 3
    };
    tileCalls.push(tileCall);
    tileById.set(item.id, tileCall);

    const neighbors = graph.neighbors[item.id];
    for (const nid of neighbors) {
      if (!visibleSet.has(nid)) continue;
      if (nid < item.id) continue;
      const nLayout = localLayout.positions.get(nid);
      if (!nLayout) throw new Error(`Missing local layout for visible neighbor: ${nid}`);
      const nrow = earthById[nid];
      const nlevel = terrainLevel(nrow, nid);
      const nSurfaceY = nLayout.y - nlevel * 3;
      if (!segmentNearScreen(surface.x + drawOffset.x, surface.y + drawOffset.y, nLayout.x + drawOffset.x, nSurfaceY + drawOffset.y, CHART_MARGIN)) continue;
      faceCalls.push(makeFaceCall({
        a: item.id,
        b: nid,
        ax: surface.x,
        ay: surface.y,
        aSortY: position.y,
        bx: nLayout.x,
        by: nSurfaceY,
        bSortY: nLayout.y,
        row,
        nrow,
        level,
        nlevel
      }));
      const riverConnector = makeRiverConnectorCall({
        a: item.id,
        b: nid,
        ax: surface.x,
        ay: surface.y,
        aSortY: position.y,
        bx: nLayout.x,
        by: nSurfaceY,
        bSortY: nLayout.y,
        row,
        nrow,
        level,
        nlevel
      });
      if (riverConnector) riverConnectorCalls.push(riverConnector);
    }
  }

  for (const call of faceCalls) {
    if (isFrontCoverFace(call) && visibleSet.has(call.ownerId)) {
      addFrontFace(frontFacesByTile, call.ownerId, call);
    } else {
      baseFaceCalls.push(call);
    }
  }

  baseFaceCalls.sort((a, b) => a.sortY - b.sortY);
  riverConnectorCalls.sort((a, b) => a.sortY - b.sortY || a.a - b.a || a.b - b.b);
  tileCalls.sort((a, b) => a.sortY - b.sortY || a.id - b.id);
  for (const frontFaces of frontFacesByTile.values()) frontFaces.sort((a, b) => a.sortY - b.sortY);

  return {
    ...chartCamera,
    centerTileId: chartCenterTileId,
    visibleSet,
    tileById,
    baseFaceCalls,
    riverConnectorCalls,
    tileCalls,
    frontFacesByTile
  };
}

function makeFaceCall(call) {
  const aOwnsFace = call.aSortY <= call.bSortY;
  return {
    ...call,
    ownerId: aOwnsFace ? call.a : call.b,
    ownerRow: aOwnsFace ? call.row : call.nrow,
    ownerLevel: aOwnsFace ? call.level : call.nlevel,
    otherLevel: aOwnsFace ? call.nlevel : call.level,
    sortY: Math.max(call.aSortY, call.bSortY)
  };
}

function isFrontCoverFace(call) {
  return Math.abs(call.bSortY - call.aSortY) > FRONT_FACE_MIN_DY;
}

function addFrontFace(frontFacesByTile, tileId, call) {
  let faces = frontFacesByTile.get(tileId);
  if (!faces) {
    faces = [];
    frontFacesByTile.set(tileId, faces);
  }
  faces.push(call);
}

function makeRiverConnectorCall(call) {
  const edgeA = edgeIndexTowardNeighbor(call.a, call.b);
  const edgeB = edgeIndexTowardNeighbor(call.b, call.a);
  if (edgeA === undefined || edgeB === undefined) return null;

  const aWater = isWaterLikeRow(call.row);
  const bWater = isWaterLikeRow(call.nrow);
  const aRiver = !aWater && riverEdgeSet(riverMasks, call.a, edgeA);
  const bRiver = !bWater && riverEdgeSet(riverMasks, call.b, edgeB);
  const aHasRiver = !aWater && (riverMasks[call.a] || 0) !== 0;
  const bHasRiver = !bWater && (riverMasks[call.b] || 0) !== 0;
  const aMouth = aRiver && (bWater || riverEdgeSet(riverToWaterMasks, call.a, edgeA));
  const bMouth = bRiver && (aWater || riverEdgeSet(riverToWaterMasks, call.b, edgeB));
  const connectsRiverTiles = (aRiver && bHasRiver) || (bRiver && aHasRiver);
  const connectsMouth = (aRiver && bWater) || (bRiver && aWater);

  if (!connectsRiverTiles && !connectsMouth) return null;
  return {
    ...call,
    aWater,
    bWater,
    aRiver,
    bRiver,
    aHasRiver,
    bHasRiver,
    aMouth,
    bMouth,
    sortY: Math.max(call.aSortY, call.bSortY) - 0.25
  };
}

function riverEdgeSet(masks, tileId, edge) {
  return ((masks?.[tileId] || 0) & (1 << edge)) !== 0;
}

function buildMinimap() {
  const land = new Float32Array(MINIMAP_W * MINIMAP_H);
  const total = new Float32Array(MINIMAP_W * MINIMAP_H);
  for (let id = 0; id < graph.tileCount; id++) {
    if (Math.abs(graph.latDeg[id]) > MINIMAP_MAX_LAT_DEG) continue;
    const row = earthById[id];
    const x = minimapX(graph.lonDeg[id]);
    const y = minimapY(graph.latDeg[id]);
    const k = x + y * MINIMAP_W;
    land[k] += minimapLandWeight(row);
    total[k] += 1;
  }

  const canvas = document.createElement("canvas");
  canvas.width = MINIMAP_W;
  canvas.height = MINIMAP_H;
  const mapCtx = canvas.getContext("2d", { alpha: false });
  mapCtx.imageSmoothingEnabled = false;
  const image = mapCtx.createImageData(MINIMAP_W, MINIMAP_H);

  for (let y = 0; y < MINIMAP_H; y++) {
    for (let x = 0; x < MINIMAP_W; x++) {
      const k = x + y * MINIMAP_W;
      const color = total[k] > 0
        ? minimapColor(land[k] / total[k])
        : minimapColor(0);
      const p = k * 4;
      image.data[p] = color[0];
      image.data[p + 1] = color[1];
      image.data[p + 2] = color[2];
      image.data[p + 3] = 255;
    }
  }

  mapCtx.putImageData(image, 0, 0);
  return { canvas };
}

function drawMinimap(nowMs) {
  if (!minimap) return;
  ctx.fillStyle = "#2a1c11";
  ctx.fillRect(MINIMAP_X - 1, MINIMAP_Y - 1, MINIMAP_W + 2, MINIMAP_H + 2);
  ctx.drawImage(minimap.canvas, MINIMAP_X, MINIMAP_Y);

  const mx = MINIMAP_X + minimapX(graph.lonDeg[centerTileId]);
  const my = MINIMAP_Y + minimapY(graph.latDeg[centerTileId]);
  const blinkOn = Math.floor(nowMs / 320) % 2 === 0;
  ctx.fillStyle = blinkOn ? "#fff4a8" : "#151713";
  ctx.fillRect(mx, my, 1, 1);
}

function minimapLandWeight(row) {
  const t = row?.t || "";
  if (t === "water" || t === "lake") return 0;
  if (t === "beach") return 0;
  if (t === "ice" && row.m == null) return 0.15;
  return 1;
}

function isWaterLikeRow(row) {
  const t = row?.t || "";
  return t === "water" || t === "lake" || t === "beach";
}

function minimapColor(fraction) {
  if (fraction >= 0.62) return [108, 73, 36];
  if (fraction >= 0.42) return [157, 113, 58];
  return [186, 148, 87];
}

function minimapX(lonDeg) {
  const lon = ((((lonDeg + 180) % 360) + 360) % 360) - 180;
  return clamp(Math.floor(((lon + 180) / 360) * MINIMAP_W), 0, MINIMAP_W - 1);
}

function minimapY(latDeg) {
  const mercator = mercatorYForLatDeg(clamp(latDeg, -MINIMAP_MAX_LAT_DEG, MINIMAP_MAX_LAT_DEG));
  return clamp(Math.floor(((MINIMAP_MAX_MERCATOR - mercator) / (MINIMAP_MAX_MERCATOR * 2)) * MINIMAP_H), 0, MINIMAP_H - 1);
}

function mercatorYForLatDeg(latDeg) {
  const lat = latDeg * Math.PI / 180;
  return Math.log(Math.tan(Math.PI / 4 + lat / 2));
}

function collectChartTiles(chartCamera, chartCenterTileId) {
  const visible = [];
  const seen = new Set([chartCenterTileId]);
  const q = [chartCenterTileId];
  const maxDistance = Math.hypot(SCREEN_W / 2 + CHART_MARGIN, SCREEN_H / 2 + CHART_MARGIN) / PIXELS_PER_RADIAN + 0.025;
  const minDot = Math.cos(maxDistance);
  let qi = 0;

  while (qi < q.length && q.length < MAX_CHART_TILES) {
    const id = q[qi++];
    const d = dotTile(id, chartCamera.center);
    if (d < minDot) continue;

    const p = projectTileCenterFor(id, chartCamera);
    if (!p) continue;
    if (p.x >= -CHART_MARGIN && p.x <= SCREEN_W + CHART_MARGIN && p.y >= -CHART_MARGIN && p.y <= SCREEN_H + CHART_MARGIN) {
      visible.push({ id, x: p.x, y: p.y });
    }

    if (p.x >= -CHART_MARGIN * 1.2 && p.x <= SCREEN_W + CHART_MARGIN * 1.2 && p.y >= -CHART_MARGIN * 1.2 && p.y <= SCREEN_H + CHART_MARGIN * 1.2) {
      for (const nid of graph.neighbors[id]) {
        if (seen.has(nid)) continue;
        seen.add(nid);
        q.push(nid);
      }
    }
  }

  return visible;
}

function projectTileCenterFor(id, view) {
  const center = graphCenter(graph, id, scratchVec);
  return projectDirectionFor(center, view, true);
}

const scratchVec = [0, 0, 0];

function projectDirectionFor(v, view, snap) {
  const d = dot3(v, view.center);
  if (d <= 0.2) return null;
  const vx = dot3(v, view.right);
  const vy = dot3(v, view.up);
  const sinTheta = Math.sqrt(Math.max(0, 1 - d * d));
  const k = sinTheta > 1e-6 ? Math.acos(clamp(d, -1, 1)) / sinTheta : 1;
  const x = SCREEN_W / 2 + vx * k * PIXELS_PER_RADIAN;
  const y = SCREEN_H / 2 - vy * k * PIXELS_PER_RADIAN;
  return snap ? { x: Math.round(x), y: Math.round(y) } : { x, y };
}

function drawFace(call, activeChart, options = {}) {
  const aTile = activeChart.tileById.get(call.a);
  const bTile = activeChart.tileById.get(call.b);
  const sourceAx = aTile ? aTile.drawSurfaceX : call.ax;
  const sourceAy = aTile ? aTile.drawSurfaceY : call.ay;
  const sourceBx = bTile ? bTile.drawSurfaceX : call.bx;
  const sourceBy = bTile ? bTile.drawSurfaceY : call.by;
  const dx = sourceBx - sourceAx;
  const dy = sourceBy - sourceAy;
  const len = Math.hypot(dx, dy);
  if (len < TILE_RADIUS_PX * 1.7) return;

  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const overlap = options.coverFront ? FRONT_FACE_OVERLAP_PX : 0;
  const start = Math.max(2, TILE_RADIUS_PX - 1 - overlap);
  const end = len - TILE_RADIUS_PX + 1;
  const width = FACE_HALF_WIDTH + Math.min(2, Math.abs(call.nlevel - call.level)) + (options.coverFront ? 1 : 0);
  const ax = sourceAx + ux * start;
  const ay = sourceAy + uy * start;
  const bx = sourceAx + ux * end;
  const by = sourceAy + uy * end;
  const bend = (hash2(call.a, call.b) - 0.5) * 2.2;
  const mx = (ax + bx) * 0.5 + nx * bend;
  const my = (ay + by) * 0.5 + ny * bend;

  ctx.fillStyle = faceColorFor(call);
  ctx.beginPath();
  ctx.moveTo(Math.round(ax + nx * width), Math.round(ay + ny * width));
  ctx.lineTo(Math.round(mx + nx * (width + 1)), Math.round(my + ny * (width + 1)));
  ctx.lineTo(Math.round(bx + nx * width), Math.round(by + ny * width));
  ctx.lineTo(Math.round(bx - nx * width), Math.round(by - ny * width));
  ctx.lineTo(Math.round(mx - nx * (width - 1)), Math.round(my - ny * (width - 1)));
  ctx.lineTo(Math.round(ax - nx * width), Math.round(ay - ny * width));
  ctx.closePath();
  ctx.fill();

  if (isCoastFace(call)) {
    drawBeachFaceDetails(call, ax, ay, mx, my, bx, by, nx, ny, width);
  } else if (Math.abs(call.level - call.nlevel) >= 2) {
    ctx.strokeStyle = call.nlevel > call.level ? "#28261f" : "#d3cab0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.round(ax + nx * width), Math.round(ay + ny * width));
    ctx.lineTo(Math.round(mx + nx * (width + 1)), Math.round(my + ny * (width + 1)));
    ctx.lineTo(Math.round(bx + nx * width), Math.round(by + ny * width));
    ctx.stroke();
  }
}

function drawBeachFaceDetails(call, ax, ay, mx, my, bx, by, nx, ny, width) {
  const seed = hashInt(call.a ^ Math.imul(call.b, 0x9e3779b1));
  for (let i = 0; i < BEACH_SPECKLE_COUNT; i++) {
    const h = hashInt(seed ^ Math.imul(i + 1, 0x85ebca6b));
    const along = 0.24 + ((h & 0xff) / 255) * 0.52;
    const side = (((h >>> 8) & 0xff) / 255 - 0.5) * (width * 1.35);
    const x = ax + (bx - ax) * along + nx * side;
    const y = ay + (by - ay) * along + ny * side;
    ctx.fillStyle = (h & 1) === 0 ? BEACH_LIGHT_SPECKLE_COLOR : BEACH_DARK_SPECKLE_COLOR;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }

  drawBeachWave(call, ax, ay, mx, my, bx, by, nx, ny, width);
}

function drawBeachWave(call, ax, ay, mx, my, bx, by, nx, ny, width) {
  const waterIsA = isWaterLikeRow(call.row);
  const wave = beachWaveState(call);
  const fromT = waterIsA ? 0 : 1;
  const toT = waterIsA ? wave.reach : 1 - wave.reach;
  const foamT = waterIsA ? wave.foamReach : 1 - wave.foamReach;
  drawBeachWaveWater(ax, ay, mx, my, bx, by, nx, ny, width, fromT, toT, beachWaterColor(call));
  drawBeachFoamLine(ax, ay, mx, my, bx, by, nx, ny, width, fromT, foamT, wave.foamAlpha);
}

function beachWaveState(call) {
  const offsetMs = hashInt(call.a ^ Math.imul(call.b, 0x632be59b)) % BEACH_WAVE_PERIOD_MS;
  const phase = ((waterAnimationClockMs + offsetMs) % BEACH_WAVE_PERIOD_MS) / BEACH_WAVE_PERIOD_MS;
  const reachSpan = BEACH_WAVE_MAX_REACH - BEACH_WAVE_MIN_REACH;
  if (phase < BEACH_WAVE_ADVANCE_RATIO) {
    const p = easeInOut(phase / BEACH_WAVE_ADVANCE_RATIO);
    const reach = BEACH_WAVE_MIN_REACH + reachSpan * p;
    return { reach, foamReach: reach, foamAlpha: 0.92 };
  }

  const fadePhase = (phase - BEACH_WAVE_ADVANCE_RATIO) / (1 - BEACH_WAVE_ADVANCE_RATIO);
  const foamAlpha = 0.92 * (1 - easeInOut(fadePhase));
  const recedeEnd = BEACH_WAVE_ADVANCE_RATIO + BEACH_WAVE_RECEDE_RATIO;
  if (phase < recedeEnd) {
    const p = easeInOut((phase - BEACH_WAVE_ADVANCE_RATIO) / BEACH_WAVE_RECEDE_RATIO);
    return {
      reach: BEACH_WAVE_MAX_REACH - reachSpan * p,
      foamReach: BEACH_WAVE_MAX_REACH,
      foamAlpha
    };
  }

  return {
    reach: BEACH_WAVE_MIN_REACH,
    foamReach: BEACH_WAVE_MAX_REACH,
    foamAlpha
  };
}

function drawBeachWaveWater(ax, ay, mx, my, bx, by, nx, ny, width, fromT, toT, color) {
  const lineHalfWidth = Math.max(2, Math.round(width));
  for (let side = -lineHalfWidth; side <= lineHalfWidth; side++) {
    const a = beachOffsetPoint(ax, ay, mx, my, bx, by, nx, ny, fromT, side);
    const roundedT = roundedBeachWaveT(fromT, toT, side, lineHalfWidth);
    const b = beachOffsetPoint(ax, ay, mx, my, bx, by, nx, ny, roundedT, side);
    drawPixelLine(Math.round(a.x), Math.round(a.y), Math.round(b.x), Math.round(b.y), color);
  }
}

function drawBeachFoamLine(ax, ay, mx, my, bx, by, nx, ny, width, fromT, t, alpha) {
  if (alpha <= 0.01) return;
  const lineHalfWidth = Math.max(2, width - 1);
  const color = `rgba(255, 253, 231, ${alpha.toFixed(3)})`;
  let previous = null;
  for (let side = -lineHalfWidth; side <= lineHalfWidth; side++) {
    const roundedT = roundedBeachWaveT(fromT, t, side, lineHalfWidth);
    const p = beachOffsetPoint(ax, ay, mx, my, bx, by, nx, ny, roundedT, side);
    const x = Math.round(p.x);
    const y = Math.round(p.y);
    if (previous) drawPixelLine(previous.x, previous.y, x, y, color);
    else {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
    previous = { x, y };
  }
}

function roundedBeachWaveT(fromT, targetT, side, lineHalfWidth) {
  const edge = Math.abs(side) / Math.max(1, lineHalfWidth);
  const reachScale = 1 - BEACH_WAVE_EDGE_RECESS * edge * edge;
  return fromT + (targetT - fromT) * reachScale;
}

function beachOffsetPoint(ax, ay, mx, my, bx, by, nx, ny, t, side) {
  const p = beachCenterPoint(ax, ay, mx, my, bx, by, t);
  return {
    x: p.x + nx * side,
    y: p.y + ny * side
  };
}

function beachCenterPoint(ax, ay, mx, my, bx, by, t) {
  const inv = 1 - t;
  return {
    x: inv * inv * ax + 2 * inv * t * mx + t * t * bx,
    y: inv * inv * ay + 2 * inv * t * my + t * t * by
  };
}

function drawRiverConnector(call, activeChart) {
  const aTile = activeChart.tileById.get(call.a);
  const bTile = activeChart.tileById.get(call.b);
  const sourceAx = aTile ? aTile.drawSurfaceX : call.ax;
  const sourceAy = aTile ? aTile.drawSurfaceY : call.ay;
  const sourceBx = bTile ? bTile.drawSurfaceX : call.bx;
  const sourceBy = bTile ? bTile.drawSurfaceY : call.by;
  const dx = sourceBx - sourceAx;
  const dy = sourceBy - sourceAy;
  const len = Math.hypot(dx, dy);
  if (len < 4) return;

  const ux = dx / len;
  const uy = dy / len;
  let a = riverConnectorEndpoint(call, "a", sourceAx, sourceAy, ux, uy);
  let b = riverConnectorEndpoint(call, "b", sourceBx, sourceBy, -ux, -uy);
  const joinLen = Math.hypot(b.x - a.x, b.y - a.y);
  if (joinLen < RIVER_JOIN_MIN_LENGTH_PX) {
    const midX = (a.x + b.x) * 0.5;
    const midY = (a.y + b.y) * 0.5;
    const half = RIVER_JOIN_MIN_LENGTH_PX * 0.5;
    a = { x: midX - ux * half, y: midY - uy * half };
    b = { x: midX + ux * half, y: midY + uy * half };
  }

  const seed = hashInt(call.a ^ Math.imul(call.b, 0x9e3779b1));
  const frameId = call.aWater ? call.b : call.a;
  const frame = waterFrameFor(frameId);
  const colors = riverColors.frames[frame - 1] || riverColors.frames[0];
  const mainColor = riverColors.base;
  const path = {
    x0: a.x,
    y0: a.y,
    cx: (a.x + b.x) * 0.5,
    cy: (a.y + b.y) * 0.5,
    x1: b.x,
    y1: b.y
  };

  drawPixelBezierStroke(ctx, path, mainColor, RIVER_CONNECTOR_RADIUS_PX);
  drawPixelBrush(ctx, a.x, a.y, RIVER_CONNECTOR_RADIUS_PX, mainColor);
  drawPixelBrush(ctx, b.x, b.y, RIVER_CONNECTOR_RADIUS_PX, mainColor);
  if (call.aMouth && call.bWater) drawPixelBrush(ctx, b.x, b.y, RIVER_MOUTH_RADIUS_PX, mainColor);
  if (call.bMouth && call.aWater) drawPixelBrush(ctx, a.x, a.y, RIVER_MOUTH_RADIUS_PX, mainColor);
  drawRiverSparkles(ctx, path, frame, seed, colors.light);
}

function riverConnectorEndpoint(call, side, x, y, towardX, towardY) {
  const water = side === "a" ? call.aWater : call.bWater;
  if (water) return { x, y };

  const mouth = side === "a" ? call.aMouth && call.bWater : call.bMouth && call.aWater;
  const arm = mouth ? RIVER_MOUTH_ARM_LENGTH_PX : RIVER_ARM_LENGTH_PX;
  return {
    x: x + towardX * arm,
    y: y + towardY * arm
  };
}

function drawTile(call, activeChart) {
  const key = spriteForTerrain(call.row, call.id);
  const img = terrainImage(key);
  const x = Math.round(call.drawSurfaceX - TILE_ART_HALF);
  const y = Math.round(call.drawSurfaceY - TILE_ART_HALF);
  ctx.drawImage(img, x, y);

  if (graph.isPentagon[call.id]) {
    ctx.fillStyle = "rgba(31, 35, 26, 0.35)";
    ctx.fillRect(Math.round(call.drawSurfaceX) - 1, Math.round(call.drawSurfaceY) - 1, 3, 3);
  }
}

function drawWeatherSurface(call) {
  if (seaIceMask?.[call.id] || freshwaterIceMask?.[call.id]) {
    if (isWaterLikeRow(call.row)) drawIceOverlay(call, freshwaterIceMask?.[call.id] ? 0.72 : 0.6);
  }

  if (isWaterLikeRow(call.row)) return;
  const flags = weatherFlagsForTile(call.id);
  if ((flags & TILE_DAY_WET_SOIL) !== 0) {
    drawWeatherSpeckles(call, "rgba(53, 64, 75, 0.42)", 14, 0x57544554, 9, 6);
  }
  if ((flags & TILE_DAY_SNOW_GROUND) !== 0) {
    drawWeatherSpeckles(call, "rgba(220, 231, 228, 0.72)", 18, 0x534e4f57, 10, 7);
  }
}

function drawIceOverlay(call, alpha) {
  const img = terrainImage("ice_01");
  const x = Math.round(call.drawSurfaceX - TILE_ART_HALF);
  const y = Math.round(call.drawSurfaceY - TILE_ART_HALF);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, x, y);
  ctx.restore();
  drawWeatherSpeckles(call, "rgba(229, 242, 235, 0.58)", 8, 0x494345, 10, 6);
}

function drawWeatherSpeckles(call, color, count, salt, radiusX, radiusY) {
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const h = hashInt(call.id ^ salt ^ Math.imul(i + 1, 0x9e3779b1));
    const dx = (((h & 0xff) / 255) * 2 - 1) * radiusX;
    const dy = ((((h >>> 8) & 0xff) / 255) * 2 - 1) * radiusY;
    if ((dx * dx) / (radiusX * radiusX) + (dy * dy) / (radiusY * radiusY) > 1) continue;
    const x = Math.round(call.drawSurfaceX + dx);
    const y = Math.round(call.drawSurfaceY + dy);
    ctx.fillRect(x, y, (h >>> 20) & 1 ? 2 : 1, 1);
  }
}

function drawRiver(call, activeChart) {
  if (!riverMasks) return;
  const mask = riverMasks[call.id] || 0;
  if (mask === 0 || isWaterLikeRow(call.row)) return;
  const sprite = riverSpriteForTile(call, activeChart, mask);
  if (!sprite) return;
  const spriteX = Math.round(call.drawSurfaceX - TILE_ART_HALF);
  const spriteY = Math.round(call.drawSurfaceY - TILE_ART_HALF);
  ctx.drawImage(sprite, spriteX, spriteY);
}

function drawPrecipitation(activeChart, nowMs, offset) {
  const weatherTiles = collectPrecipitationTileCalls(activeChart, offset);
  visiblePrecipitationLastRender = weatherTiles.rain.length > 0 || weatherTiles.snow.length > 0;
  syncPrecipitationParticles(weatherTiles);

  for (const particle of precipParticles) {
    const call = weatherTiles.callsByParticleKey.get(precipParticleKey(particle.kind, particle.tileId));
    if (!call) continue;
    if (particle.kind === "rain") drawRainParticle(particle, call, nowMs);
    else drawSnowParticle(particle, call, nowMs);
  }
}

function collectPrecipitationTileCalls(activeChart, offset) {
  const rain = [];
  const snow = [];
  const callsByParticleKey = new Map();
  for (const call of activeChart.tileCalls) {
    if (!tileCallNearViewport(call, offset, PRECIP_PARTICLE_VIEW_MARGIN)) continue;
    const flags = weatherFlagsForTile(call.id);
    if ((flags & TILE_DAY_RAIN) !== 0) {
      rain.push(call);
      callsByParticleKey.set(precipParticleKey("rain", call.id), call);
    }
    if ((flags & TILE_DAY_SNOW_FALL) !== 0) {
      snow.push(call);
      callsByParticleKey.set(precipParticleKey("snow", call.id), call);
    }
  }
  return { rain, snow, callsByParticleKey };
}

function tileCallNearViewport(call, offset, margin) {
  const x = call.drawSurfaceX + offset.x;
  const y = call.drawSurfaceY + offset.y;
  return x >= -margin &&
    x <= SCREEN_W + margin &&
    y >= -margin &&
    y <= SCREEN_H + margin;
}

function syncPrecipitationParticles(weatherTiles) {
  if (weatherTiles.rain.length === 0 && weatherTiles.snow.length === 0) {
    precipParticles = [];
    return;
  }

  const activeKeys = new Set(weatherTiles.callsByParticleKey.keys());
  precipParticles = precipParticles.filter((particle) => (
    activeKeys.has(precipParticleKey(particle.kind, particle.tileId))
  ));
  syncPrecipitationKind("rain", weatherTiles.rain, RAIN_PARTICLE_LIMIT, RAIN_PARTICLES_PER_TILE);
  syncPrecipitationKind("snow", weatherTiles.snow, SNOW_PARTICLE_LIMIT, SNOW_PARTICLES_PER_TILE);
}

function syncPrecipitationKind(kind, calls, limit, perTile) {
  const target = Math.min(limit, calls.length * perTile);
  let count = 0;
  for (const particle of precipParticles) {
    if (particle.kind === kind) count++;
  }

  while (count > target) {
    let index = -1;
    for (let i = precipParticles.length - 1; i >= 0; i--) {
      if (precipParticles[i].kind === kind) {
        index = i;
        break;
      }
    }
    if (index < 0) break;
    precipParticles.splice(index, 1);
    count--;
  }

  while (count < target && calls.length > 0) {
    const serial = precipParticleSerial++;
    const pick = hashInt(serial ^ (kind === "rain" ? 0x5241494e : 0x534e4f57)) % calls.length;
    precipParticles.push(makePrecipitationParticle(kind, calls[pick], serial));
    count++;
  }
}

function makePrecipitationParticle(kind, call, serial) {
  const salt = kind === "rain" ? 0x85ebca6b : 0xc2b2ae35;
  const seed = hashInt(call.id ^ Math.imul(serial, salt));
  const lifeMs = kind === "rain"
    ? 460 + (seed & 0xff)
    : 1700 + ((seed >>> 8) & 0x3ff);
  return {
    kind,
    tileId: call.id,
    seed,
    lifeMs,
    phaseMs: hashInt(seed ^ 0x27d4eb2d) % lifeMs,
    offsetX: particleRange(seed, 0, -12, 12),
    offsetY: particleRange(seed, 8, -4, 4),
    alpha: kind === "rain"
      ? particleRange(seed, 16, 0.46, 0.72)
      : particleRange(seed, 16, 0.58, 0.86),
    driftAmp: kind === "snow" ? particleRange(seed, 24, 1, 4) : 0
  };
}

function drawRainParticle(particle, call, nowMs) {
  const progress = precipitationProgress(particle, nowMs);
  const wind = windForTile(call.id);
  const flowDir = wind.directionRad + Math.PI;
  const windX = Math.cos(flowDir) * clamp(wind.strength, 0.35, 1.35);
  const x = Math.round(call.drawSurfaceX + particle.offsetX + windX * progress * 8);
  const y = Math.round(call.drawSurfaceY - 15 + particle.offsetY * 0.35 + progress * 30);
  const color = `rgba(137, 184, 205, ${particle.alpha.toFixed(3)})`;

  if (progress > 0.88) {
    drawRainSplash(x, y, progress, color);
    return;
  }

  const tailX = Math.round(x - windX * 2);
  drawPixelLine(tailX, y - 3, x, y + 1, color);
}

function drawRainSplash(x, y, progress, color) {
  const stage = Math.floor((progress - 0.88) / 0.12 * 3);
  ctx.fillStyle = color;
  if (stage <= 0) {
    ctx.fillRect(x - 1, y, 3, 1);
  } else if (stage === 1) {
    ctx.fillRect(x - 2, y - 1, 1, 1);
    ctx.fillRect(x + 2, y - 1, 1, 1);
  }
}

function drawSnowParticle(particle, call, nowMs) {
  const progress = precipitationProgress(particle, nowMs);
  const wind = windForTile(call.id);
  const flowDir = wind.directionRad + Math.PI;
  const windX = Math.cos(flowDir) * clamp(wind.strength, 0.15, 1.1);
  const wobble = Math.sin((nowMs + particle.phaseMs) * 0.004 + particle.seed) * particle.driftAmp;
  const x = Math.round(call.drawSurfaceX + particle.offsetX + windX * progress * 5 + wobble);
  const y = Math.round(call.drawSurfaceY - 14 + particle.offsetY + progress * 28);

  ctx.fillStyle = `rgba(235, 241, 232, ${particle.alpha.toFixed(3)})`;
  ctx.fillRect(x, y, 1, 1);
  if (((particle.seed + Math.floor(nowMs / 240)) & 15) === 0) {
    ctx.fillRect(x + 1, y, 1, 1);
  }
}

function precipitationProgress(particle, nowMs) {
  return ((nowMs + particle.phaseMs) % particle.lifeMs) / particle.lifeMs;
}

function particleRange(seed, shift, min, max) {
  const u = ((seed >>> shift) & 0xff) / 255;
  return min + (max - min) * u;
}

function precipParticleKey(kind, tileId) {
  return `${kind}:${tileId}`;
}

function drawCloudLayer(activeChart, nowMs) {
  if (!runtimeWeather || !cloudSprites) return;
  drawAnnualCloudSystems(activeChart);
  drawLocalWeatherClouds(activeChart, nowMs);
}

function drawAnnualCloudSystems(activeChart) {
  for (let slot = 0; slot < runtimeWeather.maxCloudSlots; slot++) {
    const rec = slot * WEATHER_DAYS + weatherParts.dayIndex;
    const tileId = runtimeWeather.cloudSpawnTileIds[rec];
    const call = activeChart.tileById.get(tileId);
    if (!call) continue;
    drawCloudAt(call, {
      seed: hashInt(tileId ^ Math.imul(slot + 1, 0x9e3779b1)),
      templateIndex: runtimeWeather.cloudTemplateIndices[rec],
      baseScale: runtimeWeather.cloudBaseScales[rec],
      windDirectionRad: runtimeWeather.cloudWindDirections[rec],
      windStrength: runtimeWeather.cloudWindStrengths[rec],
      opacityMul: 0.64
    });
  }
}

function drawLocalWeatherClouds(activeChart, nowMs) {
  let drawn = 0;
  const hourPhase = Math.floor((weatherParts.minuteOfDay + nowMs / 1000) / 60);
  for (const call of activeChart.tileCalls) {
    if (drawn >= MAX_LOCAL_WEATHER_CLOUDS) break;
    const flags = weatherFlagsForTile(call.id);
    const precip = (flags & (TILE_DAY_RAIN | TILE_DAY_SNOW_FALL)) !== 0;
    const ground = (flags & (TILE_DAY_WET_SOIL | TILE_DAY_SNOW_GROUND)) !== 0;
    if (!precip && !ground) continue;
    const h = hashInt(call.id ^ Math.imul(weatherParts.dayIndex + 1, 0x7f4a7c15));
    if (!precip && ((h + hourPhase) & 7) !== 0) continue;
    if (precip && ((h + hourPhase) & 3) === 0) continue;
    const wind = windForTile(call.id);
    drawCloudAt(call, {
      seed: h,
      templateIndex: h % 3,
      baseScale: precip ? 0.045 : 0.026,
      windDirectionRad: wind.directionRad,
      windStrength: wind.strength,
      opacityMul: precip ? 0.58 : 0.34
    });
    drawn++;
  }
}

function drawCloudAt(call, spec) {
  const lifeOffset = hashInt(spec.seed ^ Math.imul(weatherParts.dayIndex + 1, 0x27d4eb2d)) % CLOUD_LIFESPAN_MINUTES;
  const age = (weatherParts.minuteOfDay + lifeOffset) % CLOUD_LIFESPAN_MINUTES;
  const lifeU = age / CLOUD_LIFESPAN_MINUTES;
  const envelope = cloudLifecycleScaleOpacity(lifeU);
  const displayScale = spec.baseScale * envelope.scaleMul;
  const sprite = cloudSpriteFor(spec.templateIndex, displayScale);
  const drift = (lifeU - 0.5) * CLOUD_DRIFT_PX * clamp(spec.windStrength, 0.2, 1.2);
  const flowDir = spec.windDirectionRad + Math.PI;
  const x = Math.round(call.drawSurfaceX + Math.cos(flowDir) * drift - sprite.width / 2);
  const y = Math.round(call.drawSurfaceY - sprite.height * 0.72 - Math.sin(flowDir) * drift);
  ctx.save();
  ctx.globalAlpha = clamp(envelope.opacity * spec.opacityMul, 0.08, 0.56);
  ctx.drawImage(sprite, x, y);
  ctx.restore();
}

function cloudSpriteFor(templateIndex, displayScale) {
  const templateSprites = cloudSprites[templateIndex % cloudSprites.length];
  const scaleRatio = Math.sqrt(Math.max(0.08, displayScale) / 0.038);
  const sizeIndex = clamp(Math.round(scaleRatio * 1.7), 0, templateSprites.length - 1);
  return templateSprites[sizeIndex];
}

function buildCloudSprites() {
  const sizes = [
    { w: 16, h: 10 },
    { w: 22, h: 13 },
    { w: 28, h: 17 },
    { w: 34, h: 20 },
    { w: 42, h: 24 }
  ];
  const sprites = [];
  for (let variant = 0; variant < 3; variant++) {
    sprites.push(sizes.map((size, sizeIndex) => createCloudSprite(size.w, size.h, variant, sizeIndex)));
  }
  return sprites;
}

function createCloudSprite(width, height, variant, sizeIndex) {
  const sprite = document.createElement("canvas");
  sprite.width = width;
  sprite.height = height;
  const spriteCtx = sprite.getContext("2d", { willReadFrequently: true });
  if (!spriteCtx) throw new Error("Could not create cloud sprite canvas");
  spriteCtx.imageSmoothingEnabled = false;
  const image = spriteCtx.createImageData(width, height);
  const puffs = cloudPuffsFor(variant, sizeIndex);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = (x + 0.5 - width / 2) / (width / 2);
      const ny = (y + 0.5 - height / 2) / (height / 2);
      let density = -Infinity;
      for (const puff of puffs) {
        const dx = (nx - puff.x) / puff.rx;
        const dy = (ny - puff.y) / puff.ry;
        density = Math.max(density, 1 - Math.sqrt(dx * dx + dy * dy));
      }
      if (density <= 0) continue;
      const shade = clamp(Math.round(226 - Math.max(0, ny) * 38 + density * 18), 166, 242);
      const alpha = clamp(Math.round(45 + density * 135), 0, 190);
      const p = (x + y * width) * 4;
      image.data[p] = shade;
      image.data[p + 1] = clamp(shade + 2, 0, 255);
      image.data[p + 2] = clamp(shade + 4, 0, 255);
      image.data[p + 3] = alpha;
    }
  }

  spriteCtx.putImageData(image, 0, 0);
  return sprite;
}

function cloudPuffsFor(variant, sizeIndex) {
  const lift = (variant - 1) * 0.04;
  const grow = sizeIndex * 0.015;
  return [
    { x: -0.48, y: 0.12 + lift, rx: 0.34 + grow, ry: 0.42 },
    { x: -0.18, y: -0.12 - lift, rx: 0.42 + grow, ry: 0.54 },
    { x: 0.17, y: -0.18 + lift, rx: 0.38 + grow, ry: 0.52 },
    { x: 0.48, y: 0.06 - lift, rx: 0.33 + grow, ry: 0.4 },
    { x: 0.0, y: 0.22, rx: 0.62 + grow, ry: 0.38 }
  ];
}

function riverSpriteForTile(call, activeChart, mask) {
  const endpoints = riverEndpointsForTile(call, activeChart, mask);
  if (endpoints.length === 0) return null;
  const frame = waterFrameFor(call.id);
  const variant = hashInt(call.id) & 15;
  const endpointKey = endpoints.map((p) => `${p.x},${p.y},${p.mouth ? 1 : 0}`).join(";");
  const key = `${frame}|${variant}|${endpointKey}`;
  const cached = riverSpriteCache.get(key);
  if (cached) return cached;
  if (riverSpriteCache.size > RIVER_SPRITE_CACHE_LIMIT) riverSpriteCache = new Map();

  const sprite = generateRiverSprite(endpoints, frame, variant);
  riverSpriteCache.set(key, sprite);
  return sprite;
}

function riverEndpointsForTile(call, activeChart, mask) {
  const endpoints = [];
  const seen = new Set();
  const edgeCount = graph.edgeCount[call.id];
  for (let edge = 0; edge < edgeCount; edge++) {
    if ((mask & (1 << edge)) === 0) continue;
    const dir = riverEdgeScreenDirection(call, activeChart, edge);
    const mouth = riverEdgeSet(riverToWaterMasks, call.id, edge);
    const armLength = mouth ? RIVER_MOUTH_ARM_LENGTH_PX : RIVER_ARM_LENGTH_PX;
    const x = Math.round(TILE_ART_HALF + dir.x * armLength);
    const y = Math.round(TILE_ART_HALF + dir.y * armLength);
    const key = `${x},${y},${mouth ? 1 : 0}`;
    if (seen.has(key)) continue;
    seen.add(key);
    endpoints.push({ x, y, mouth });
  }
  endpoints.sort((a, b) => a.x - b.x || a.y - b.y || Number(a.mouth) - Number(b.mouth));
  return endpoints;
}

function riverEdgeScreenDirection(call, activeChart, edge) {
  const neighborId = graph.edgeNeighbors[call.id]?.[edge];
  if (neighborId === undefined) {
    throw new Error(`River edge ${edge} on tile ${call.id} has no edge neighbor`);
  }

  const neighbor = activeChart.tileById.get(neighborId);
  let dx;
  let dy;
  if (neighbor) {
    dx = neighbor.drawSurfaceX - call.drawSurfaceX;
    dy = neighbor.drawSurfaceY - call.drawSurfaceY;
  } else {
    dx = dotTile(neighborId, activeChart.right) - dotTile(call.id, activeChart.right);
    dy = -(dotTile(neighborId, activeChart.up) - dotTile(call.id, activeChart.up));
  }

  const len = Math.hypot(dx, dy);
  if (len < 1e-6) {
    throw new Error(`Could not project river edge ${edge} on tile ${call.id}`);
  }
  return { x: dx / len, y: dy / len };
}

function generateRiverSprite(endpoints, frame, variant) {
  const sprite = document.createElement("canvas");
  sprite.width = TILE_ART_SIZE;
  sprite.height = TILE_ART_SIZE;
  const spriteCtx = sprite.getContext("2d");
  if (!spriteCtx) throw new Error("Could not create river sprite canvas");
  spriteCtx.imageSmoothingEnabled = false;
  const colors = riverColors.frames[frame - 1] || riverColors.frames[0];
  const mainColor = riverColors.base;
  const cx = TILE_ART_HALF;
  const cy = TILE_ART_HALF;
  const paths = riverBezierPaths(endpoints, variant);

  for (const path of paths) {
    drawPixelBezierStroke(spriteCtx, path, mainColor, RIVER_BODY_RADIUS_PX);
  }
  if (endpoints.length !== 2) drawPixelBrush(spriteCtx, cx, cy, RIVER_CONNECTOR_RADIUS_PX, mainColor);
  for (const endpoint of endpoints) {
    drawPixelBrush(spriteCtx, endpoint.x, endpoint.y, RIVER_CONNECTOR_RADIUS_PX, mainColor);
    if (endpoint.mouth) drawPixelBrush(spriteCtx, endpoint.x, endpoint.y, RIVER_MOUTH_RADIUS_PX, mainColor);
  }

  for (const path of paths) {
    drawRiverSparkles(spriteCtx, path, frame, variant, colors.light);
  }
  return sprite;
}

function riverBezierPaths(endpoints, seed) {
  const center = { x: TILE_ART_HALF, y: TILE_ART_HALF };
  if (endpoints.length === 2) {
    return [curvedRiverPath(endpoints[0], endpoints[1], center, seed, 0)];
  }
  return endpoints.map((end, index) => {
    const control = {
      x: (center.x + end.x) * 0.5,
      y: (center.y + end.y) * 0.5
    };
    return curvedRiverPath(center, end, control, seed, index);
  });
}

function curvedRiverPath(start, end, controlBase, seed, index) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) {
    throw new Error("Cannot build a curved river path with identical endpoints");
  }
  const nx = -dy / len;
  const ny = dx / len;
  const bend = riverCurveBend(seed, index);
  return {
    x0: start.x,
    y0: start.y,
    cx: controlBase.x + nx * bend,
    cy: controlBase.y + ny * bend,
    x1: end.x,
    y1: end.y
  };
}

function riverCurveBend(seed, index) {
  const raw = hashInt(seed ^ Math.imul(index + 1, 0x9e3779b1));
  const sign = (raw & 1) === 0 ? -1 : 1;
  const amount = 2 + ((raw >>> 1) % Math.max(1, RIVER_CURVE_BEND_PX - 1));
  return sign * amount;
}

function drawPixelBezierStroke(targetCtx, path, color, radius) {
  targetCtx.fillStyle = color;
  forEachPixelOnBezier(path, (x, y) => {
    drawPixelBrush(targetCtx, x, y, radius, color);
  });
}

function drawRiverSparkles(targetCtx, path, frame, seed, color) {
  const points = [];
  forEachPixelOnBezier(path, (x, y) => points.push({ x, y }));
  const phase = (frame - 1) * 3 + (hashInt(seed) % 3);
  targetCtx.fillStyle = color;
  for (let i = 3 + phase; i < points.length - 1; i += 7) {
    const p = points[i];
    targetCtx.fillRect(p.x, p.y, 1, 1);
  }
}

function forEachPixelOnBezier(path, visit) {
  const steps = Math.max(10, Math.ceil(bezierPathLength(path) * 1.6));
  const seen = new Set();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const omt = 1 - t;
    const x = Math.round(omt * omt * path.x0 + 2 * omt * t * path.cx + t * t * path.x1);
    const y = Math.round(omt * omt * path.y0 + 2 * omt * t * path.cy + t * t * path.y1);
    const key = `${x},${y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    visit(x, y);
  }
}

function bezierPathLength(path) {
  let length = 0;
  let px = path.x0;
  let py = path.y0;
  for (let i = 1; i <= 12; i++) {
    const t = i / 12;
    const omt = 1 - t;
    const x = omt * omt * path.x0 + 2 * omt * t * path.cx + t * t * path.x1;
    const y = omt * omt * path.y0 + 2 * omt * t * path.cy + t * t * path.y1;
    length += Math.hypot(x - px, y - py);
    px = x;
    py = y;
  }
  return length;
}

function drawPixelBrush(targetCtx, x, y, radius, color) {
  targetCtx.fillStyle = color;
  for (let yy = -radius; yy <= radius; yy++) {
    for (let xx = -radius; xx <= radius; xx++) {
      if (Math.abs(xx) + Math.abs(yy) > radius + 1) continue;
      targetCtx.fillRect(Math.round(x + xx), Math.round(y + yy), 1, 1);
    }
  }
}

function terrainImage(key) {
  const img = images.get(key);
  if (!img) throw new Error(`Missing terrain image for sprite key: ${key}`);
  return img;
}

function drawShipWake() {
  if (!ship) return;
  const speedPx = vectorLength(ship.velocity) * PIXELS_PER_RADIAN;
  if (speedPx < SHIP_WAKE_MIN_SPEED_PX) return;

  const heading = shipScreenHeading();
  const cx = Math.round(localLayout.viewX);
  const cy = Math.round(localLayout.viewY);
  const sternX = Math.round(cx - heading.x * 7);
  const sternY = Math.round(cy - heading.y * 7);
  const backAngle = Math.atan2(-heading.y, -heading.x);
  const wakeLength = clamp(Math.round(SHIP_WAKE_MIN_LENGTH_PX + speedPx * 0.65), SHIP_WAKE_MIN_LENGTH_PX, SHIP_WAKE_MAX_LENGTH_PX);
  const alpha = clamp(0.22 + speedPx / 48, 0.22, 0.58).toFixed(3);
  const color = `rgba(255, 253, 231, ${alpha})`;

  drawPixelLine(
    sternX,
    sternY,
    Math.round(sternX + Math.cos(backAngle + KELVIN_WAKE_HALF_ANGLE_RAD) * wakeLength),
    Math.round(sternY + Math.sin(backAngle + KELVIN_WAKE_HALF_ANGLE_RAD) * wakeLength),
    color
  );
  drawPixelLine(
    sternX,
    sternY,
    Math.round(sternX + Math.cos(backAngle - KELVIN_WAKE_HALF_ANGLE_RAD) * wakeLength),
    Math.round(sternY + Math.sin(backAngle - KELVIN_WAKE_HALF_ANGLE_RAD) * wakeLength),
    color
  );
}

function drawShip() {
  if (!ship || !shipImage) return;
  const frame = shipHeadingFrame();
  const sx = (frame % SHIP_SHEET_COLS) * SHIP_SHEET_FRAME_SIZE;
  const sy = Math.floor(frame / SHIP_SHEET_COLS) * SHIP_SHEET_FRAME_SIZE;
  const x = Math.round(localLayout.viewX - SHIP_SHEET_FRAME_SIZE / 2);
  const y = Math.round(localLayout.viewY - SHIP_SHEET_FRAME_SIZE / 2);
  ctx.drawImage(
    shipImage,
    sx,
    sy,
    SHIP_SHEET_FRAME_SIZE,
    SHIP_SHEET_FRAME_SIZE,
    x,
    y,
    SHIP_SHEET_FRAME_SIZE,
    SHIP_SHEET_FRAME_SIZE
  );
}

function shipHeadingFrame() {
  const heading = shipScreenHeading();
  const angle = Math.atan2(-heading.y, heading.x);
  const raw = Math.round(angle / (Math.PI * 2) * SHIP_HEADING_COUNT);
  return ((raw % SHIP_HEADING_COUNT) + SHIP_HEADING_COUNT) % SHIP_HEADING_COUNT;
}

function shipScreenHeading() {
  const hx = dot3(ship.heading, camera.right);
  const hy = dot3(ship.heading, camera.up);
  const length = Math.hypot(hx, hy);
  if (length <= 1e-6) return { x: 0, y: -1 };
  return { x: hx / length, y: -hy / length };
}

function drawWindIndicator() {
  if (!ship) return;
  const wind = windForTile(centerTileId);
  const flowDir = wind.directionRad + Math.PI;
  const cx = Math.round(localLayout.viewX + Math.cos(flowDir) * WIND_INDICATOR_RADIUS_PX);
  const cy = Math.round(localLayout.viewY - Math.sin(flowDir) * WIND_INDICATOR_RADIUS_PX);
  const tipX = Math.round(cx + Math.cos(flowDir) * 3);
  const tipY = Math.round(cy - Math.sin(flowDir) * 3);
  const baseX = Math.round(cx - Math.cos(flowDir) * 2);
  const baseY = Math.round(cy + Math.sin(flowDir) * 2);
  const sideX = -Math.sin(flowDir);
  const sideY = -Math.cos(flowDir);
  const leftX = Math.round(baseX + sideX * 3);
  const leftY = Math.round(baseY + sideY * 3);
  const rightX = Math.round(baseX - sideX * 3);
  const rightY = Math.round(baseY - sideY * 3);
  const color = "rgba(177, 229, 236, 0.46)";
  drawPixelLine(tipX, tipY, leftX, leftY, color);
  drawPixelLine(leftX, leftY, rightX, rightY, color);
  drawPixelLine(rightX, rightY, tipX, tipY, color);
}

function drawPixelLine(x0, y0, x1, y1, color) {
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  ctx.fillStyle = color;
  while (true) {
    ctx.fillRect(x, y, 1, 1);
    if (x === x1 && y === y1) break;
    const e2 = err * 2;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

function drawTinyStatus(nowMs) {
  const row = earthById[centerTileId];
  const lat = graph.latDeg[centerTileId].toFixed(2);
  const lon = graph.lonDeg[centerTileId].toFixed(2);
  const flags = weatherFlagsForTile(centerTileId);
  const wind = windForTile(centerTileId);
  const flowDir = wind.directionRad + Math.PI;
  const iced = Boolean(seaIceMask?.[centerTileId] || freshwaterIceMask?.[centerTileId]);
  const shipSpeed = ship ? vectorLength(ship.velocity) * PIXELS_PER_RADIAN : 0;
  const line1 = `${centerTileId}${graph.isPentagon[centerTileId] ? " P" : ""} ${row.t} ${lat},${lon}`;
  const line2 = `${weatherDateLabel()} ${weatherLabelFor(flags, iced)} wind ${windDirectionName(flowDir)} ${wind.strength.toFixed(1)} spd ${shipSpeed.toFixed(0)}`;
  const width = Math.min(SCREEN_W - 8, Math.max(line1.length, line2.length) * 5 + 8);
  ctx.fillStyle = "rgba(15, 18, 14, 0.62)";
  ctx.fillRect(4, SCREEN_H - 24, width, 20);
  ctx.fillStyle = "#d7d9bf";
  ctx.font = "8px monospace";
  ctx.fillText(line1, 8, SCREEN_H - 16);
  ctx.fillText(line2, 8, SCREEN_H - 6);

  void nowMs;
}

function weatherFlagsForTile(tileId) {
  return discreteWeatherFlagsForTile(weatherBake, tileId, weatherParts.dayIndex);
}

function windForTile(tileId) {
  return windAtLatLonDeg(
    graph.latDeg[tileId],
    graph.lonDeg[tileId],
    dateToSubsolarLatDeg(weatherParts.date),
    {
      seed: WEATHER_WIND_SEED,
      simMinute: Math.floor(weatherClockMinutes)
    }
  );
}

function weatherDateLabel() {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const d = weatherParts.date;
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hour = String(d.getUTCHours()).padStart(2, "0");
  const minute = String(d.getUTCMinutes()).padStart(2, "0");
  return `${months[d.getUTCMonth()]} ${day} ${hour}:${minute}`;
}

function weatherLabelFor(flags, iced) {
  if (iced) return "ice";
  if ((flags & TILE_DAY_SNOW_FALL) !== 0) return "snowfall";
  if ((flags & TILE_DAY_RAIN) !== 0) return "rain";
  if ((flags & TILE_DAY_SNOW_GROUND) !== 0) return "snow";
  if ((flags & TILE_DAY_WET_SOIL) !== 0) return "wet";
  return "clear";
}

function windDirectionName(directionRad) {
  const deg = ((directionRad * 180 / Math.PI) % 360 + 360) % 360;
  const names = ["E", "NE", "N", "NW", "W", "SW", "S", "SE"];
  return names[Math.round(deg / 45) % names.length];
}

function faceColorFor(call) {
  if (isCoastFace(call)) return beachFaceColor(call);
  const key = spriteForTerrain(call.ownerRow, call.ownerId);
  const color = spriteColors.get(key);
  if (!color) throw new Error(`Missing dominant terrain color for sprite: ${key}`);
  if (Math.abs(call.ownerLevel - call.otherLevel) < 2) return color;
  return call.ownerLevel > call.otherLevel ? shadeHex(color, -18) : shadeHex(color, 14);
}

function isCoastFace(call) {
  return isWaterLikeRow(call.row) !== isWaterLikeRow(call.nrow);
}

function beachFaceColor(call) {
  const key = `sand_0${1 + (hashInt(call.a ^ Math.imul(call.b, 0x27d4eb2d)) % 5)}`;
  const color = spriteColors.get(key);
  if (!color) throw new Error(`Missing dominant terrain color for beach transition sprite: ${key}`);
  return paleBeachColor(color);
}

function beachWaterColor(call) {
  const waterIsA = isWaterLikeRow(call.row);
  const waterRow = waterIsA ? call.row : call.nrow;
  const waterId = waterIsA ? call.a : call.b;
  const key = spriteForTerrain(waterRow, waterId);
  const color = spriteColors.get(key);
  if (!color) throw new Error(`Missing dominant terrain color for beach wave sprite: ${key}`);
  return rgbaFromHex(color, BEACH_WAVE_WATER_ALPHA);
}

function paleBeachColor(hex) {
  const { r, g, b } = parseHexColor(hex);
  const target = { r: 244, g: 226, b: 142 };
  return rgbToHex(
    Math.round(r * 0.22 + target.r * 0.78),
    Math.round(g * 0.22 + target.g * 0.78),
    Math.round(b * 0.22 + target.b * 0.78)
  );
}

function spriteForTerrain(row, id) {
  const t = row.t || "";
  const variant = hashInt(id) % 4;
  const latAbs = Math.abs(graph.latDeg[id]);

  if (t === "water") return waterSpriteForTile(id);
  if (t === "lake" || t === "beach") return `water_shallow_0${waterFrameFor(id)}`;
  if (t.includes("ice_cap")) return "snow_01";
  if (t === "ice") return "ice_01";
  if (t.includes("tundra") || t === "snow") return "snow_01";
  if (t === "mountain" || row.e > 0.13) return latAbs > 45 ? "mountain_snowy_01" : mountainVariant(id);
  if (row.h === 1 || row.e > 0.075) return variant % 2 === 0 ? "earth_rocky" : mountainVariant(id);
  if (t.includes("desert") || t.includes("steppe")) return t.includes("cold") ? "earth_stone" : sandVariant(id);
  if (t.includes("tropical")) return variant === 0 ? "jungle_palm_01" : `jungle_dense_0${1 + (variant % 3)}`;
  if (t.includes("subarctic") || t.includes("continental")) return variant === 0 ? "pine_forest_01" : `grass_0${1 + variant}`;
  if (t.includes("oceanic") || t.includes("humid") || t.includes("mediterranean")) return variant === 0 ? "forest_broadleaf_01" : `grass_0${1 + variant}`;
  if (t === "forest") return variant % 2 === 0 ? "forest_broadleaf_01" : "forest_broadleaf_02";
  if (t === "desert") return sandVariant(id);
  return `grass_0${1 + variant}`;
}

function waterSpriteForTile(id) {
  const frame = waterFrameFor(id);
  const band = waterDepthBands?.[id] ?? (WATER_DEPTH_GRADATION_COUNT + 1);
  if (band >= 1 && band <= WATER_DEPTH_GRADATION_COUNT) {
    return `water_depth_0${band}_0${frame}`;
  }
  return `water_deep_01_0${frame}`;
}

function waterFrameFor(id) {
  const staggerMs = hashInt(id) % WATER_FRAME_MS;
  return (Math.floor((waterAnimationClockMs + staggerMs) / WATER_FRAME_MS) % 2) + 1;
}

function terrainLevel(row, id) {
  const t = row.t || "";
  if (t === "water") return -2;
  if (t === "lake" || t === "beach") return -1;
  if (t.includes("ice")) return 0;
  if (t === "mountain" || row.e > 0.13) return 3;
  if (row.h === 1 || row.e > 0.075) return 1 + (hashInt(id) % 2);
  return 0;
}

function sandVariant(id) {
  return `sand_0${1 + (hashInt(id) % 5)}`;
}

function mountainVariant(id) {
  return `mountain_stone_0${1 + (hashInt(id) % 3)}`;
}

function segmentNearScreen(ax, ay, bx, by, margin = VIEW_MARGIN) {
  const minX = Math.min(ax, bx);
  const maxX = Math.max(ax, bx);
  const minY = Math.min(ay, by);
  const maxY = Math.max(ay, by);
  return maxX >= -margin && minX <= SCREEN_W + margin && maxY >= -margin && minY <= SCREEN_H + margin;
}

function dotTile(id, v) {
  const k = id * 3;
  return graph.centers[k] * v[0] + graph.centers[k + 1] * v[1] + graph.centers[k + 2] * v[2];
}

function latLonToDirection(latDeg, lonDeg) {
  const lat = latDeg * Math.PI / 180;
  const lon = lonDeg * Math.PI / 180;
  const c = Math.cos(lat);
  return [c * Math.cos(lon), Math.sin(lat), -c * Math.sin(lon)];
}

function isControlKey(key) {
  return key === "ArrowLeft" ||
    key === "ArrowRight" ||
    key === "ArrowUp" ||
    key === "ArrowDown" ||
    key === "w" ||
    key === "W" ||
    key === "a" ||
    key === "A" ||
    key === "s" ||
    key === "S" ||
    key === "d" ||
    key === "D";
}

function isWeatherControlKey(key) {
  return key === "[" ||
    key === "]" ||
    key === "," ||
    key === "." ||
    key === " ";
}

function handleWeatherControlKey(key) {
  if (key === "[") adjustWeatherClock(-WEATHER_MINUTES_PER_DAY);
  if (key === "]") adjustWeatherClock(WEATHER_MINUTES_PER_DAY);
  if (key === ",") adjustWeatherClock(-60);
  if (key === ".") adjustWeatherClock(60);
  if (key === " ") toggleWeatherClock();
}

function adjustWeatherClock(deltaMinutes) {
  weatherClockMinutes += deltaMinutes;
  refreshWeatherState(true);
  dirty = true;
}

function toggleWeatherClock() {
  if (weatherTimeScale > 0) {
    pausedWeatherTimeScale = weatherTimeScale;
    weatherTimeScale = 0;
  } else {
    weatherTimeScale = pausedWeatherTimeScale || WEATHER_DEFAULT_TIME_SCALE;
  }
  dirty = true;
}

function drawLoading() {
  ctx.fillStyle = "#172437";
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  ctx.fillStyle = "#d7d9bf";
  ctx.font = "8px monospace";
  ctx.fillText("Loading pixel globe...", 8, 14);
}

function drawFatalError(err) {
  ctx.fillStyle = "#1d1513";
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  ctx.fillStyle = "#f0d2be";
  ctx.font = "8px monospace";
  const lines = String(err?.message || err).match(/.{1,70}/g) || ["Unknown error"];
  ctx.fillText("Prototype failed to start", 8, 14);
  for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], 8, 28 + i * 10);
}

function hashInt(n) {
  let x = n | 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x >>> 0;
}

function hash2(a, b) {
  return (hashInt((a * 73856093) ^ (b * 19349663)) & 0xffff) / 0xffff;
}

function shadeHex(hex, delta) {
  const clean = hex.startsWith("#") ? hex.slice(1) : hex;
  const n = Number.parseInt(clean, 16);
  const r = clamp(((n >> 16) & 255) + delta, 0, 255);
  const g = clamp(((n >> 8) & 255) + delta, 0, 255);
  const b = clamp((n & 255) + delta, 0, 255);
  return `rgb(${r},${g},${b})`;
}
