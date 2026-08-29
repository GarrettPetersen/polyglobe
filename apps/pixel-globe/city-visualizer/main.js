import { responsiveLogicalViewport } from "../src/responsiveViewport.js";
import {
  PORT_SCENE_DEPTH,
  activePortSceneLayers,
  layerParallaxDepth,
  logicalSceneWindow,
  resolveCitySceneFeatures,
  sceneReasonRows
} from "./citySceneRules.js";

const canvas = document.querySelector("#scene");
const context = canvas.getContext("2d", { alpha: false });
const stage = document.querySelector("#stage");
const loading = document.querySelector("#loading");
const citySelect = document.querySelector("#city-select");
const viewportSelect = document.querySelector("#viewport-select");
const shipSelect = document.querySelector("#ship-select");
const approachOverride = document.querySelector("#approach-override");
const dockOverride = document.querySelector("#dock-override");
const fortOverride = document.querySelector("#fort-override");
const mountainOverride = document.querySelector("#mountain-override");
const leftTerrainOverride = document.querySelector("#left-terrain-override");
const rightTerrainOverride = document.querySelector("#right-terrain-override");
const resetOverrides = document.querySelector("#reset-overrides");
const ruleLedger = document.querySelector("#rule-ledger");
const destinationDialog = document.querySelector("#destination-dialog");
const destinationTitle = document.querySelector("#destination-title");
const destinationCopy = document.querySelector("#destination-copy");

const prefersReducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const DEFAULT_PARALLAX = -0.35;
const imageCache = new Map();
const frameCanvasCache = new Map();
const alphaCache = new Map();
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
  shipSlug: null,
  city: null,
  features: null,
  parallax: DEFAULT_PARALLAX,
  pointer: null,
  hoveredDestination: null,
  npcAgents: []
};

const DESTINATIONS = Object.freeze([
  Object.freeze({
    id: "shipyard",
    label: "Shipyard",
    layers: Object.freeze(["Shipyard"]),
    copy: "This will open the existing shipyard modal: repairs, outfitting, and available hulls."
  }),
  Object.freeze({
    id: "market",
    label: "Market",
    layers: Object.freeze(["Market Stall", "Market Stall Copy", "Market Stall Copy Copy"]),
    copy: "This will open the existing market modal for regional cargo and prices."
  }),
  Object.freeze({
    id: "store",
    label: "Item store",
    layers: Object.freeze(["Smith"]),
    copy: "This will open the existing item-store modal for weapons, tools, and supplies."
  }),
  Object.freeze({
    id: "inn",
    label: "Inn",
    layers: Object.freeze(["Inn"]),
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
      document.fonts?.load?.('10px "Silkscreen"') || Promise.resolve()
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

function prepareControls() {
  citySelect.replaceChildren(...state.catalog.cities.map((city) => option(city.id, `${city.label} — ${city.country}`)));
  shipSelect.replaceChildren(...state.shipManifest.ships.map((ship) => option(ship.slug, humanize(ship.slug))));
  setOptions(approachOverride, ["auto", "ocean", "river", "lake"]);
  setOptions(dockOverride, ["auto", "none", "wood", "stone"]);
  setOptions(fortOverride, ["auto", "on", "off"]);
  setOptions(mountainOverride, ["auto", "none", "left", "right", "both"]);
  setOptions(leftTerrainOverride, ["auto", "grass", "forest", "desert", "rocky"]);
  setOptions(rightTerrainOverride, ["auto", "grass", "forest", "desert", "rocky"]);

  citySelect.addEventListener("change", () => selectCity(citySelect.value));
  viewportSelect.addEventListener("change", resizeLogicalCanvas);
  shipSelect.addEventListener("change", () => selectShip(shipSelect.value));
  for (const control of [
    approachOverride,
    dockOverride,
    fortOverride,
    mountainOverride,
    leftTerrainOverride,
    rightTerrainOverride
  ]) control.addEventListener("change", applyFeatureOverrides);
  resetOverrides.addEventListener("click", () => {
    for (const control of [
      approachOverride,
      dockOverride,
      fortOverride,
      mountainOverride,
      leftTerrainOverride,
      rightTerrainOverride
    ]) control.value = "auto";
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
    dockOverride,
    fortOverride,
    mountainOverride,
    leftTerrainOverride,
    rightTerrainOverride
  ]) control.value = "auto";
  applyFeatureOverrides();
  selectShip(city.defaultShip);
  const url = new URL(location.href);
  url.searchParams.set("city", city.id);
  history.replaceState(null, "", url);
}

function applyFeatureOverrides() {
  const mountain = mountainOverride.value;
  const overrides = {
    approach: autoValue(approachOverride.value),
    dock: autoValue(dockOverride.value),
    fortified: fortOverride.value === "auto" ? undefined : fortOverride.value === "on",
    mountainsLeft: mountain === "auto" ? undefined : mountain === "left" || mountain === "both",
    mountainsRight: mountain === "auto" ? undefined : mountain === "right" || mountain === "both",
    leftTerrain: autoValue(leftTerrainOverride.value),
    rightTerrain: autoValue(rightTerrainOverride.value)
  };
  state.features = resolveCitySceneFeatures(state.city, overrides);
  updateRuleLedger();
  updateHover();
}

async function selectShip(slug) {
  const ship = state.shipManifest.ships.find((candidate) => candidate.slug === slug) || state.shipManifest.ships[0];
  state.shipSlug = ship.slug;
  shipSelect.value = ship.slug;
  state.shipImage = await loadImage(`/assets/vehicles/unity-ships/port-assault/${ship.slug}-dockside.png`);
}

function updateRuleLedger() {
  ruleLedger.replaceChildren(...sceneReasonRows(state.city, state.features).flatMap((row) => {
    const term = document.createElement("dt");
    term.textContent = row.label;
    const detail = document.createElement("dd");
    detail.textContent = `${humanize(row.value)} — ${row.reason}`;
    return [term, detail];
  }));
}

function resizeLogicalCanvas() {
  const preset = viewportSelect.value;
  const logical = preset === "auto"
    ? responsiveLogicalViewport({
        viewportWidth: Math.max(1, stage.clientWidth),
        viewportHeight: Math.max(1, stage.clientHeight)
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
  const availableScale = Math.min(stage.clientWidth / logical.width, stage.clientHeight / logical.height);
  const scale = availableScale >= 1 ? Math.max(1, Math.floor(availableScale)) : availableScale;
  canvas.style.width = `${Math.max(1, Math.floor(logical.width * scale))}px`;
  canvas.style.height = `${Math.max(1, Math.floor(logical.height * scale))}px`;
  context.imageSmoothingEnabled = false;
  updateHover();
}

new ResizeObserver(() => {
  if (viewportSelect.value === "auto") resizeLogicalCanvas();
  else resizeLogicalCanvas();
}).observe(stage);

canvas.addEventListener("pointermove", (event) => {
  state.pointer = canvasPoint(event);
  state.parallax = clamp(state.pointer.x / canvas.width * 2 - 1, -1, 1);
  updateHover();
});

canvas.addEventListener("pointerleave", () => {
  state.pointer = null;
  state.parallax = DEFAULT_PARALLAX;
  state.hoveredDestination = null;
  canvas.classList.remove("is-actionable");
});

canvas.addEventListener("click", () => {
  const destination = state.hoveredDestination;
  if (!destination) return;
  destinationTitle.textContent = destination.label;
  destinationCopy.textContent = destination.copy;
  destinationDialog.showModal();
});

function render(timeMs) {
  if (!state.ready) return;
  context.imageSmoothingEnabled = false;
  context.fillStyle = "#6385c5";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const activeLayers = activePortSceneLayers(state.features);
  const staticOccurrence = new Map();
  let shipDrawn = false;
  let npcsDrawn = false;

  for (const layerName of state.portManifest.layerOrder) {
    if (!shipDrawn && layerName === "Dock Background") {
      drawDocksideShip();
      shipDrawn = true;
    }
    if (!npcsDrawn && layerName.startsWith("Foreground ")) {
      drawNpcs(timeMs);
      npcsDrawn = true;
    }
    if (!activeLayers.has(layerName)) {
      if (layerName !== "Waves" && layerName !== "Surf") incrementOccurrence(staticOccurrence, layerName);
      continue;
    }
    if (layerName === "Waves" || layerName === "Surf") {
      drawAnimatedLayer(layerName, timeMs);
      continue;
    }
    const occurrence = incrementOccurrence(staticOccurrence, layerName) - 1;
    const frames = state.portManifest.staticFrames.filter((frame) => frame.layer === layerName);
    const frame = frames[occurrence];
    if (!frame) throw new Error(`Missing ${layerName} layer occurrence ${occurrence}`);
    drawStaticFrame(frame, layerName);
  }
  if (!shipDrawn) drawDocksideShip();
  if (!npcsDrawn) drawNpcs(timeMs);
  drawSceneLabels();
  requestAnimationFrame(render);
}

function drawStaticFrame(frame, layerName) {
  const window = logicalSceneWindow({
    width: canvas.width,
    height: canvas.height,
    parallax: state.parallax,
    depth: layerParallaxDepth(layerName)
  });
  if (state.hoveredDestination?.layers.includes(layerName)) drawFrameOutline(frame, window);
  drawAtlasFrame(state.staticAtlas, frame, window);
}

function drawAnimatedLayer(layerName, timeMs) {
  const animation = state.portManifest.animated[layerName];
  const frame = animationFrame(animation.frames, prefersReducedMotion.matches ? 0 : timeMs);
  const window = logicalSceneWindow({
    width: canvas.width,
    height: canvas.height,
    parallax: state.parallax,
    depth: layerParallaxDepth(layerName)
  });
  drawAtlasFrame(layerName === "Waves" ? state.waveAtlas : state.surfAtlas, frame, window);
}

function drawAtlasFrame(atlas, frame, window) {
  context.drawImage(
    atlas,
    frame.frame.x,
    frame.frame.y,
    frame.frame.w,
    frame.frame.h,
    Math.round(frame.spriteSourceSize.x - window.x),
    Math.round(frame.spriteSourceSize.y - window.y),
    frame.frame.w,
    frame.frame.h
  );
}

function drawFrameOutline(frame, window) {
  const mask = tintedFrameCanvas(frame);
  const x = Math.round(frame.spriteSourceSize.x - window.x);
  const y = Math.round(frame.spriteSourceSize.y - window.y);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    context.drawImage(mask, x + dx, y + dy);
  }
}

function tintedFrameCanvas(frame) {
  if (frameCanvasCache.has(frame.id)) return frameCanvasCache.get(frame.id);
  const mask = document.createElement("canvas");
  mask.width = frame.frame.w;
  mask.height = frame.frame.h;
  const maskContext = mask.getContext("2d");
  maskContext.imageSmoothingEnabled = false;
  maskContext.drawImage(
    state.staticAtlas,
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
  frameCanvasCache.set(frame.id, mask);
  return mask;
}

function drawDocksideShip() {
  if (!state.shipImage || !state.shipManifest || !state.features) return;
  const ship = state.shipManifest.ships.find((candidate) => candidate.slug === state.shipSlug);
  if (!ship) return;
  const window = logicalSceneWindow({
    width: canvas.width,
    height: canvas.height,
    parallax: state.parallax,
    depth: PORT_SCENE_DEPTH.foreground
  });
  const berth = state.features.dock === "none" ? { x: 802, y: 528 } : { x: 690, y: 514 };
  context.drawImage(
    state.shipImage,
    Math.round(berth.x - ship.deckEntryAnchor.x - window.x),
    Math.round(berth.y - ship.deckEntryAnchor.y - window.y)
  );
}

function drawNpcs(timeMs) {
  if (!state.minifolkManifest || !state.features) return;
  const window = logicalSceneWindow({
    width: canvas.width,
    height: canvas.height,
    parallax: state.parallax,
    depth: PORT_SCENE_DEPTH.foreground
  });
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
  context.save();
  context.textBaseline = "top";
  context.font = '10px "Silkscreen", monospace';
  const cityLabel = state.city.label;
  const cityWidth = Math.ceil(context.measureText(cityLabel).width);
  drawLabelPlate(7, 7, cityWidth + 8, 15);
  context.fillStyle = "#fff2bc";
  context.fillText(cityLabel, 11, 9);

  if (state.hoveredDestination) {
    context.font = '9px "Silkscreen", monospace';
    const label = state.hoveredDestination.label;
    const width = Math.ceil(context.measureText(label).width) + 10;
    const x = Math.round((canvas.width - width) / 2);
    const y = canvas.height - 22;
    drawLabelPlate(x, y, width, 15);
    context.fillStyle = "#ffe55c";
    context.fillText(label, x + 5, y + 2);
  }
  context.restore();
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
    !destination.requiresFortification || state.features.fortified
  ));
  state.hoveredDestination = destinations.find((destination) => destination.layers.some((layerName) => {
    if (!activeLayers.has(layerName)) return false;
    const window = logicalSceneWindow({
      width: canvas.width,
      height: canvas.height,
      parallax: state.parallax,
      depth: layerParallaxDepth(layerName)
    });
    const masterX = state.pointer.x + window.x;
    const masterY = state.pointer.y + window.y;
    return state.portManifest.staticFrames
      .filter((frame) => frame.layer === layerName)
      .some((frame) => frameContainsOpaquePixel(frame, masterX, masterY));
  })) || null;
  canvas.classList.toggle("is-actionable", Boolean(state.hoveredDestination));
  canvas.setAttribute(
    "aria-label",
    `${state.city.label}, ${state.city.country}${state.hoveredDestination ? `, ${state.hoveredDestination.label}` : ""}`
  );
}

function frameContainsOpaquePixel(frame, masterX, masterY) {
  const localX = Math.floor(masterX - frame.spriteSourceSize.x);
  const localY = Math.floor(masterY - frame.spriteSourceSize.y);
  if (localX < -1 || localY < -1 || localX > frame.frame.w || localY > frame.frame.h) return false;
  const alpha = frameAlpha(frame);
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

function frameAlpha(frame) {
  if (alphaCache.has(frame.id)) return alphaCache.get(frame.id);
  const buffer = document.createElement("canvas");
  buffer.width = frame.frame.w;
  buffer.height = frame.frame.h;
  const bufferContext = buffer.getContext("2d", { willReadFrequently: true });
  bufferContext.drawImage(
    state.staticAtlas,
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
  alphaCache.set(frame.id, alpha);
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
    x: (event.clientX - rect.left) / rect.width * canvas.width,
    y: (event.clientY - rect.top) / rect.height * canvas.height
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
