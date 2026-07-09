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

const SCREEN_W = 455;
const SCREEN_H = 256;
const SUBDIVISIONS = 7;
const PIXELS_PER_RADIAN = 2450;
const TILE_RADIUS_PX = 10;
const TILE_ART_SIZE = 36;
const TILE_ART_HALF = TILE_ART_SIZE / 2;
const SELECTED_DOT_SIZE = 4;
const FACE_HALF_WIDTH = 7;
const FRONT_FACE_OVERLAP_PX = 4;
const FRONT_FACE_MIN_DY = 2;
const VIEW_MARGIN = 58;
const CHART_REBUILD_RADIUS_PX = 28;
const CHART_MARGIN = VIEW_MARGIN + CHART_REBUILD_RADIUS_PX + TILE_ART_SIZE;
const MAX_CHART_TILES = 4200;
const START_LAT_DEG = 31.2;
const START_LON_DEG = 121.5;
const BASE_MOVE_RAD = 0.00075;
const FAST_MOVE_RAD = 0.0028;
const MOVE_PIXEL_STEP_RAD = 1 / PIXELS_PER_RADIAN;
const WATER_FRAME_MS = 2000;
const WATER_REDRAW_MS = 250;
const LOCAL_LAYOUT_CULL_MARGIN = 520;
const MINIMAP_W = 80;
const MINIMAP_H = 40;
const MINIMAP_X = SCREEN_W - MINIMAP_W - 5;
const MINIMAP_Y = 5;
const MINIMAP_MAX_LAT_DEG = 82.5;
const WORLD_NORTH = [0, 1, 0];
const TERRAIN_VARIANT = terrainVariantFromLocation();
const START_POSITION = startPositionFromLocation();

const terrainAssets = [
  "water_deep_01_01", "water_deep_01_02", "water_shallow_01", "water_shallow_02",
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
let spriteColors;
let camera;
let chart;
let localLayout;
let minimap;
let centerTileId = 0;
let dirty = true;
let lastFrameMs = performance.now();
let lastStatusMs = 0;
let lastOverlayMs = 0;
let moveResidualX = 0;
let moveResidualY = 0;
let waterAnimationClockMs = 0;
let waterAnimationDrawTick = -1;

fitCanvasToIntegerScale();
window.addEventListener("resize", fitCanvasToIntegerScale);

window.addEventListener("keydown", (event) => {
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
  const [loadedImages, earth] = await Promise.all([
    loadTerrainImages(),
    fetchEarthCache()
  ]);
  images = loadedImages;
  earthRows = earth.tiles;
  if (earth.subdivisions !== SUBDIVISIONS) {
    throw new Error(`Expected Earth cache subdivision ${SUBDIVISIONS}, got ${earth.subdivisions}`);
  }

  graph = buildGeodesicGraph(SUBDIVISIONS);
  if (graph.tileCount !== earth.tileCount || graph.tileCount !== earthRows.length) {
    throw new Error(`Tile count mismatch: graph=${graph.tileCount}, cache=${earth.tileCount}, rows=${earthRows.length}`);
  }
  directionIndex = createDirectionIndex(graph);
  earthById = earthRows;
  spriteColors = buildSpriteDominantColors(images);
  minimap = buildMinimap();
  camera = createCamera(START_POSITION.lat, START_POSITION.lon);
  syncVisibleCenterTile();
  localLayout = createLocalLayout(centerTileId);
  chart = buildChart(camera);
  requestAnimationFrame(loop);
}

async function fetchEarthCache() {
  const res = await fetch("/shared/earth-globe-cache-7.json");
  if (!res.ok) throw new Error(`Failed to load Earth cache: HTTP ${res.status}`);
  return res.json();
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
    img.src = `/assets/terrain/${TERRAIN_VARIANT}/${key}.png`;
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

function mostCommonOpaqueColor(key, imageData) {
  const counts = new Map();
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] <= 50) continue;
    const colorKey = `${data[i]},${data[i + 1]},${data[i + 2]}`;
    counts.set(colorKey, (counts.get(colorKey) || 0) + 1);
  }

  let bestKey = null;
  let bestCount = -1;
  for (const [colorKey, count] of counts.entries()) {
    if (count > bestCount) {
      bestKey = colorKey;
      bestCount = count;
    }
  }
  if (!bestKey) throw new Error(`Terrain sprite has no opaque pixels: ${key}`);

  const [r, g, b] = bestKey.split(",").map(Number);
  return rgbToHex(r, g, b);
}

function rgbToHex(r, g, b) {
  const parts = [r, g, b].map((v) => clamp(v, 0, 255).toString(16).padStart(2, "0"));
  return `#${parts.join("")}`;
}

function loop(nowMs) {
  const dt = Math.min(0.05, (nowMs - lastFrameMs) / 1000);
  lastFrameMs = nowMs;
  if (updateCamera(dt)) dirty = true;
  if (updateWaterAnimation(nowMs)) dirty = true;
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

function updateCamera(dt) {
  if (!hasMoveInput()) return false;

  const speed = (keys.has("Shift") ? FAST_MOVE_RAD : BASE_MOVE_RAD) * dt * 60;
  return applyInputStep(speed);
}

function syncVisibleCenterTile() {
  centerTileId = findNearestTileId(graph, directionIndex, camera.center);
}

function createLocalLayout(centerId) {
  return {
    viewX: 0,
    viewY: 0,
    positions: new Map([[centerId, { x: 0, y: 0 }]])
  };
}

function hasMoveInput() {
  return keys.has("ArrowLeft") ||
    keys.has("a") ||
    keys.has("A") ||
    keys.has("ArrowRight") ||
    keys.has("d") ||
    keys.has("D") ||
    keys.has("ArrowUp") ||
    keys.has("w") ||
    keys.has("W") ||
    keys.has("ArrowDown") ||
    keys.has("s") ||
    keys.has("S");
}

function applyInputStep(speed) {
  if (!graph || !camera || !directionIndex) return false;
  let dx = 0;
  let dy = 0;
  if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) dx -= 1;
  if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) dx += 1;
  if (keys.has("ArrowUp") || keys.has("w") || keys.has("W")) dy += 1;
  if (keys.has("ArrowDown") || keys.has("s") || keys.has("S")) dy -= 1;

  const mag = Math.hypot(dx, dy);
  if (mag === 0) return false;
  moveResidualX += (dx / mag) * speed;
  moveResidualY += (dy / mag) * speed;

  dx = quantizeMoveDelta(moveResidualX);
  dy = quantizeMoveDelta(moveResidualY);
  if (dx === 0 && dy === 0) return false;
  moveResidualX -= dx;
  moveResidualY -= dy;

  moveCamera(dx, dy);
  moveLocalView(dx, dy);
  syncVisibleCenterTile();
  return true;
}

function moveLocalView(dx, dy) {
  localLayout.viewX += dx * PIXELS_PER_RADIAN;
  localLayout.viewY -= dy * PIXELS_PER_RADIAN;
}

function quantizeMoveDelta(value) {
  if (Math.abs(value) < MOVE_PIXEL_STEP_RAD) return 0;
  return Math.trunc(value / MOVE_PIXEL_STEP_RAD) * MOVE_PIXEL_STEP_RAD;
}

function updateWaterAnimation(nowMs) {
  const tick = Math.floor(nowMs / WATER_REDRAW_MS);
  if (tick === waterAnimationDrawTick) return false;
  waterAnimationDrawTick = tick;
  waterAnimationClockMs = tick * WATER_REDRAW_MS;
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

function createCamera(latDeg, lonDeg) {
  const center = latLonToDirection(latDeg, lonDeg);
  return northUpCamera(center);
}

function moveCamera(dx, dy) {
  const nextCenter = normalize3([
    camera.center[0] + camera.right[0] * dx + camera.up[0] * dy,
    camera.center[1] + camera.right[1] * dx + camera.up[1] * dy,
    camera.center[2] + camera.right[2] * dx + camera.up[2] * dy
  ]);

  camera = northUpCamera(nextCenter, camera.right);
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

function render(nowMs) {
  ctx.fillStyle = "#1f3650";
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

  ensureChart();
  const offset = chartOffsetPixels(chart);

  ctx.save();
  ctx.translate(offset.x, offset.y);
  for (const call of chart.baseFaceCalls) drawFace(call, chart);

  for (const call of chart.tileCalls) {
    drawTile(call);
    const frontFaces = chart.frontFacesByTile.get(call.id);
    if (frontFaces) {
      for (const face of frontFaces) drawFace(face, chart, { coverFront: true });
    }
  }

  drawCursor(chart);
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
  tileCalls.sort((a, b) => a.sortY - b.sortY || a.id - b.id);
  for (const frontFaces of frontFacesByTile.values()) frontFaces.sort((a, b) => a.sortY - b.sortY);

  return {
    ...chartCamera,
    centerTileId: chartCenterTileId,
    visibleSet,
    tileById,
    baseFaceCalls,
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

function buildMinimap() {
  const land = new Float32Array(MINIMAP_W * MINIMAP_H);
  const total = new Float32Array(MINIMAP_W * MINIMAP_H);
  for (let id = 0; id < graph.tileCount; id++) {
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
      const fraction = total[k] > 0 ? land[k] / total[k] : 0;
      const color = minimapColor(fraction, y);
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
  ctx.fillStyle = "#0d1210";
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

function minimapColor(fraction, y) {
  const polar = y < 4 || y >= MINIMAP_H - 4;
  if (fraction >= 0.62) return polar ? [185, 190, 180] : [73, 101, 57];
  if (fraction >= 0.42) return [151, 133, 78];
  return polar ? [62, 91, 107] : [31, 63, 88];
}

function minimapX(lonDeg) {
  const lon = ((((lonDeg + 180) % 360) + 360) % 360) - 180;
  return clamp(Math.floor(((lon + 180) / 360) * MINIMAP_W), 0, MINIMAP_W - 1);
}

function minimapY(latDeg) {
  const lat = clamp(latDeg, -MINIMAP_MAX_LAT_DEG, MINIMAP_MAX_LAT_DEG) * Math.PI / 180;
  const mercator = Math.log(Math.tan(Math.PI / 4 + lat / 2));
  return clamp(Math.floor((0.5 - mercator / (2 * Math.PI)) * MINIMAP_H), 0, MINIMAP_H - 1);
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

  if (Math.abs(call.level - call.nlevel) >= 2) {
    ctx.strokeStyle = call.nlevel > call.level ? "#28261f" : "#d3cab0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.round(ax + nx * width), Math.round(ay + ny * width));
    ctx.lineTo(Math.round(mx + nx * (width + 1)), Math.round(my + ny * (width + 1)));
    ctx.lineTo(Math.round(bx + nx * width), Math.round(by + ny * width));
    ctx.stroke();
  }
}

function drawTile(call) {
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

function terrainImage(key) {
  const img = images.get(key);
  if (!img) throw new Error(`Missing terrain image for sprite key: ${key}`);
  return img;
}

function drawCursor(activeChart) {
  const focused = activeChart.tileById.get(centerTileId);
  if (!focused) return;
  const x = Math.round(focused.x);
  const y = Math.round(focused.y);

  for (const neighborId of graph.neighbors[centerTileId]) {
    const neighbor = activeChart.tileById.get(neighborId);
    if (!neighbor) continue;
    drawPixelLine(x, y, Math.round(neighbor.x), Math.round(neighbor.y), "rgba(244, 228, 160, 0.72)");
  }

  ctx.fillStyle = "#fff4a8";
  const dotOffset = Math.floor(SELECTED_DOT_SIZE / 2);
  ctx.fillRect(x - dotOffset, y - dotOffset, SELECTED_DOT_SIZE, SELECTED_DOT_SIZE);
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
  const k = centerTileId * 3;
  const lat = graph.latDeg[centerTileId].toFixed(2);
  const lon = graph.lonDeg[centerTileId].toFixed(2);
  const text = `${centerTileId}${graph.isPentagon[centerTileId] ? " P" : ""} ${row.t} ${lat},${lon}`;
  ctx.fillStyle = "rgba(15, 18, 14, 0.62)";
  ctx.fillRect(4, SCREEN_H - 14, Math.min(SCREEN_W - 8, text.length * 4 + 8), 10);
  ctx.fillStyle = "#d7d9bf";
  ctx.font = "8px monospace";
  ctx.fillText(text, 8, SCREEN_H - 6);

  void k;
}

function faceColorFor(call) {
  const key = spriteForTerrain(call.ownerRow, call.ownerId);
  const color = spriteColors.get(key);
  if (!color) throw new Error(`Missing dominant terrain color for sprite: ${key}`);
  if (Math.abs(call.ownerLevel - call.otherLevel) < 2) return color;
  return call.ownerLevel > call.otherLevel ? shadeHex(color, -18) : shadeHex(color, 14);
}

function spriteForTerrain(row, id) {
  const t = row.t || "";
  const variant = hashInt(id) % 4;
  const latAbs = Math.abs(graph.latDeg[id]);

  if (t === "water") return `water_deep_01_0${waterFrameFor(id)}`;
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
    key === "Shift" ||
    key === "w" ||
    key === "W" ||
    key === "a" ||
    key === "A" ||
    key === "s" ||
    key === "S" ||
    key === "d" ||
    key === "D";
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
