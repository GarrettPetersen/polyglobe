import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { Lensflare, LensflareElement } from "three/examples/jsm/objects/Lensflare.js";
import * as topojson from "topojson-client";
import * as JSZipNS from "jszip";
const JSZip = (JSZipNS as unknown as { default: typeof JSZipNS }).default ?? JSZipNS;
import {
  Globe,
  Sun,
  Atmosphere,
  WaterSphere,
  Starfield,
  createGeodesicGeometryFlat,
  applyTerrainColorsToGeometry,
  applyTerrainToGeometry,
  createCoastMaskTexture,
  createCoastLandMaskTexture,
  CoastFoamOverlay,
  buildTerrainFromEarthRaster,
  earthRasterFromImageData,
  applyCoastalBeach,
  parseKoppenAsciiGrid,
  applyPreset,
  getPreset,
  placeObject,
  type TileTerrainData,
  type EarthRaster,
  type ClimateGrid,
  type GeodesicTile,
} from "polyglobe";

const EARTH_LAND_TOPOLOGY_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json";
/** Natural Earth 110m lakes (Great Lakes, Baikal, Victoria, etc.) – drawn as water to punch holes in land. */
const EARTH_LAKES_GEOJSON_URL =
  "https://cdn.jsdelivr.net/gh/martynafford/natural-earth-geojson@master/110m/physical/ne_110m_lakes.json";
const KOPPEN_BIN_SAME_ORIGIN = "/koppen.bin";
const KOPPEN_ZIP_SAME_ORIGIN = "/koppen_ascii.zip";
const KOPPEN_ZIP_REMOTE =
  "https://people.eng.unimelb.edu.au/mpeel/Koppen/koppen_ascii.zip";
const ELEVATION_BIN_SAME_ORIGIN = "/elevation.bin";
const MOUNTAINS_JSON_SAME_ORIGIN = "/mountains.json";

/** Mountain entry: lat/lon in degrees, elevation in meters. Sorted by elevation (highest first). */
interface MountainEntry {
  name: string;
  lat: number;
  lon: number;
  elevationM: number;
}

/** Convert geographic lat/lon (degrees) to unit direction. Matches tileCenterToLatLon convention (lon = -atan2(z,x)) so getTileIdAtDirection finds the same tile the Earth raster uses. */
function latLonDegToDirection(latDeg: number, lonDeg: number): THREE.Vector3 {
  const latRad = (latDeg * Math.PI) / 180;
  const lonRad = (lonDeg * Math.PI) / 180;
  const cosLat = Math.cos(latRad);
  const dir = new THREE.Vector3(
    cosLat * Math.cos(lonRad),
    Math.sin(latRad),
    -cosLat * Math.sin(lonRad)
  );
  return dir.normalize();
}

export interface DemoState {
  useEarth: boolean;
  subdivisions: number;
  sunLongitude: number;
  sunLatitude: number;
  moonLongitude: number;
  moonLatitude: number;
  landFraction: number;
  blobiness: number;
  seed: number;
}

const DEFAULT_STATE: DemoState = {
  useEarth: true,
  subdivisions: 3,
  sunLongitude: 0.6,
  sunLatitude: 0.35,
  moonLongitude: -0.6,
  moonLatitude: -0.5,
  landFraction: 0.5,
  blobiness: 6,
  seed: 12345,
};

function seededRandom(seed: number) {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

function buildProceduralTerrain(
  tiles: GeodesicTile[],
  state: DemoState
): Map<number, TileTerrainData> {
  const rnd = seededRandom(state.seed);
  const landMask = new Float32Array(tiles.length);
  for (let i = 0; i < tiles.length; i++) landMask[i] = rnd();
  for (let iter = 0; iter < state.blobiness; iter++) {
    const next = new Float32Array(tiles.length);
    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i];
      let sum = landMask[i];
      let n = 1;
      for (const j of t.neighbors) {
        sum += landMask[j];
        n++;
      }
      next[i] = sum / n;
    }
    for (let i = 0; i < tiles.length; i++) landMask[i] = next[i];
  }
  const landThreshold = state.landFraction;
  const tileTerrain = new Map<number, TileTerrainData>();
  const midLandTypes: TileTerrainData["type"][] = ["land", "forest", "mountain", "grassland"];
  for (let i = 0; i < tiles.length; i++) {
    const isLand = landMask[i] > landThreshold;
    const y = tiles[i].center.y;
    const absLat = Math.abs(y);
    let type: TileTerrainData["type"];
    let elevation: number;
    if (!isLand) {
      type = "water";
      elevation = -0.18;
    } else {
      if (absLat > 0.82) {
        type = rnd() < 0.7 ? "ice" : "snow";
        elevation = 0.06;
      } else if (absLat < 0.32) {
        type = rnd() < 0.65 ? "desert" : rnd() < 0.6 ? "land" : "forest";
        elevation = type === "desert" ? 0.05 : 0.1;
      } else {
        type = midLandTypes[Math.floor(rnd() * midLandTypes.length)];
        elevation = type === "mountain" ? 0.28 : 0.1;
      }
    }
    tileTerrain.set(i, { tileId: i, type, elevation });
  }
  for (let i = 0; i < tiles.length; i++) {
    const data = tileTerrain.get(i)!;
    if (data.type !== "water") continue;
    const hasLandNeighbor = tiles[i].neighbors.some((n) => tileTerrain.get(n)?.type !== "water");
    if (hasLandNeighbor) tileTerrain.set(i, { ...data, type: "beach" });
  }
  return tileTerrain;
}

type GeoJSONPolygon = { type: "Polygon"; coordinates: number[][][] };
type GeoJSONMultiPolygon = { type: "MultiPolygon"; coordinates: number[][][][] };
type GeoJSONGeometry = GeoJSONPolygon | GeoJSONMultiPolygon | { type: "GeometryCollection"; geometries: GeoJSONGeometry[] };

function drawGeometry(
  ctx: CanvasRenderingContext2D,
  geom: GeoJSONGeometry,
  toX: (lon: number) => number,
  toY: (lat: number) => number
): void {
  if (geom.type === "GeometryCollection") {
    for (const g of geom.geometries) drawGeometry(ctx, g, toX, toY);
    return;
  }
  if (geom.type === "Polygon") {
    ctx.beginPath();
    for (const ring of geom.coordinates) {
      const [first, ...rest] = ring;
      ctx.moveTo(toX(first[0]), toY(first[1]));
      for (const [lon, lat] of rest) ctx.lineTo(toX(lon), toY(lat));
      ctx.closePath();
    }
    ctx.fill("evenodd");
    return;
  }
  if (geom.type === "MultiPolygon") {
    ctx.beginPath();
    for (const polygon of geom.coordinates) {
      for (const ring of polygon) {
        const [first, ...rest] = ring;
        ctx.moveTo(toX(first[0]), toY(first[1]));
        for (const [lon, lat] of rest) ctx.lineTo(toX(lon), toY(lat));
        ctx.closePath();
      }
    }
    ctx.fill("evenodd");
  }
}

/** Fetch world-atlas land TopoJSON, rasterize to 360×180 land/sea, return EarthRaster. */
async function loadEarthLandRaster(): Promise<EarthRaster> {
  const res = await fetch(EARTH_LAND_TOPOLOGY_URL);
  const topology = (await res.json()) as Parameters<typeof topojson.feature>[0];
  const land = topojson.feature(topology, topology.objects.land) as {
    type: string;
    geometry?: GeoJSONGeometry;
    features?: Array<{ geometry: GeoJSONGeometry }>;
  };

  const width = 360;
  const height = 180;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "white";

  // GeoJSON is [longitude, latitude]. Normalize lon to [-180, 180] and map to pixel bounds.
  const toX = (lon: number) => {
    let l = lon;
    while (l > 180) l -= 360;
    while (l < -180) l += 360;
    return Math.max(0, Math.min(width - 1, ((l + 180) / 360) * (width - 1)));
  };
  const toY = (lat: number) =>
    Math.max(0, Math.min(height - 1, ((90 - lat) / 180) * (height - 1)));

  if (land.features) {
    for (const f of land.features) drawGeometry(ctx, f.geometry, toX, toY);
  } else if (land.geometry) {
    drawGeometry(ctx, land.geometry, toX, toY);
  }

  // Punch out lakes (Great Lakes, Baikal, Victoria, etc.) so they render as water
  try {
    const lakesRes = await fetch(EARTH_LAKES_GEOJSON_URL);
    if (lakesRes.ok) {
      const lakes = (await lakesRes.json()) as {
        type: string;
        features?: Array<{ type: string; geometry: GeoJSONGeometry }>;
      };
      ctx.fillStyle = "black";
      if (lakes.features) {
        for (const f of lakes.features) {
          if (f.geometry) drawGeometry(ctx, f.geometry, toX, toY);
        }
      }
    }
  } catch {
    // Lakes optional; globe still works without them
  }

  const imageData = ctx.getImageData(0, 0, width, height);
  return earthRasterFromImageData(imageData, 128);
}

const KOPPEN_BIN_WIDTH = 360;
const KOPPEN_BIN_HEIGHT = 180;

/** Load pre-built 360×180 Köppen binary (run `npm run build-koppen` to generate). */
async function loadKoppenFromBinary(): Promise<ClimateGrid | null> {
  try {
    const res = await fetch(KOPPEN_BIN_SAME_ORIGIN);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength !== KOPPEN_BIN_WIDTH * KOPPEN_BIN_HEIGHT) return null;
    return {
      width: KOPPEN_BIN_WIDTH,
      height: KOPPEN_BIN_HEIGHT,
      data: new Uint8Array(buf),
    };
  } catch {
    return null;
  }
}

/** Load Köppen–Geiger climate: try bundled koppen.bin first, then zip. */
async function loadKoppenClimate(): Promise<ClimateGrid | null> {
  const fromBin = await loadKoppenFromBinary();
  if (fromBin) return fromBin;

  const tryFetch = async (url: string): Promise<ArrayBuffer | null> => {
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.arrayBuffer();
  };
  let buf: ArrayBuffer | null = await tryFetch(KOPPEN_ZIP_SAME_ORIGIN);
  if (!buf && KOPPEN_ZIP_REMOTE) {
    const proxyUrl = "https://corsproxy.io/?" + encodeURIComponent(KOPPEN_ZIP_REMOTE);
    buf = await tryFetch(proxyUrl);
  }
  if (!buf) return null;
  try {
    const zip = await JSZip.loadAsync(buf);
    const names = Object.keys(zip.files).filter((n) => /\.(asc|txt)$/i.test(n));
    const name = names[0] ?? Object.keys(zip.files)[0];
    if (!name) return null;
    const blob = await zip.files[name].async("blob");
    const text = await new Response(blob).text();
    return parseKoppenAsciiGrid(text);
  } catch {
    return null;
  }
}

/** Load elevation (meters) from same-origin binary. 360×180 float32, row 0 = north. Run `npm run build-elevation` to generate. */
async function loadElevation(): Promise<Float32Array | null> {
  try {
    const res = await fetch(ELEVATION_BIN_SAME_ORIGIN);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const size = 360 * 180 * 4;
    if (buf.byteLength !== size) return null;
    return new Float32Array(buf);
  } catch {
    return null;
  }
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x030508);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 4000);
const starfield = new Starfield({
  density: 70,
  sparsity: 0.12,
  twinkleSpeed: 0.5,
  twinkleAmount: 0.5,
  color: 0xf0f4ff,
});
starfield.attachToCamera(camera);
scene.add(camera);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x030508, 1);
document.body.appendChild(renderer.domElement);

let globe: Globe;
let water: WaterSphere;
let coastFoamOverlay: CoastFoamOverlay;
let coastMaskTexture: THREE.DataTexture;
let coastLandMaskTexture: THREE.DataTexture;
let controls: OrbitControls;
let marker: THREE.Mesh;
let earthRaster: EarthRaster | null = null;
/** Loaded from /mountains.json; used for 3D peak geometry (pyramid tiles) in Earth mode. */
let mountainsList: MountainEntry[] | null = null;

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

let buildInProgress = false;
let pendingState: DemoState | null = null;
let setLoading: (visible: boolean) => void = () => {};

function sunDirectionFromState(s: DemoState): THREE.Vector3 {
  const lon = s.sunLongitude * Math.PI;
  const lat = s.sunLatitude * Math.PI * 0.5;
  return new THREE.Vector3(
    Math.cos(lat) * Math.cos(lon),
    Math.sin(lat),
    Math.cos(lat) * Math.sin(lon)
  ).normalize();
}

function moonPositionFromState(s: DemoState, distance: number): THREE.Vector3 {
  const lon = s.moonLongitude * Math.PI;
  const lat = s.moonLatitude * Math.PI * 0.5;
  return new THREE.Vector3(
    Math.cos(lat) * Math.cos(lon),
    Math.sin(lat),
    Math.cos(lat) * Math.sin(lon)
  ).normalize().multiplyScalar(distance);
}

function createFlareTexture(size: number, soft: boolean = true): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const r = size / 2;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, "rgba(255,255,255,0.9)");
  g.addColorStop(soft ? 0.2 : 0.4, "rgba(255,255,255,0.3)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}

async function buildWorldAsync(state: DemoState): Promise<void> {
  setLoading(true);
  try {
    if (globe) {
      scene.remove(globe.mesh);
      globe.mesh.geometry.dispose();
      (globe.mesh as THREE.Mesh).material.dispose();
    }
    if (water) {
      scene.remove(water.mesh);
      water.dispose();
    }
    if (coastFoamOverlay) {
      scene.remove(coastFoamOverlay.mesh);
      coastFoamOverlay.dispose();
    }
    if (marker) scene.remove(marker);
    await yieldToMain();

    globe = new Globe({ radius: 1, subdivisions: state.subdivisions });
    scene.add(globe.mesh);
    await yieldToMain();

    let tileTerrain: Map<number, TileTerrainData>;
    if (state.useEarth && earthRaster) {
      tileTerrain = buildTerrainFromEarthRaster(globe.tiles, earthRaster, {
        waterElevation: -0.18,
        landElevation: 0.1,
        elevationScale: 0.00004,
        latitudeTerrain: true,
      });
      applyCoastalBeach(globe.tiles, tileTerrain);
    } else {
      tileTerrain = buildProceduralTerrain(globe.tiles, state);
    }
    await yieldToMain();

    const elevationScale = 0.08;
    const opts: Parameters<typeof createGeodesicGeometryFlat>[1] = {
      radius: globe.radius,
      getElevation: (id) => tileTerrain.get(id)?.elevation ?? 0,
      elevationScale,
    };
    if (state.useEarth && mountainsList && mountainsList.length > 0) {
      // Target distinct hexes with peaks (many list peaks share a hex), so iterate until we fill that many
      const targetDistinctTiles = Math.max(24, Math.floor(globe.tileCount / 40));
      const peakTiles = new Map<number, number>();
      for (const m of mountainsList) {
        if (peakTiles.size >= targetDistinctTiles) break;
        const dir = latLonDegToDirection(m.lat, m.lon);
        const tileId = globe.getTileIdAtDirection(dir);
        const terrain = tileTerrain.get(tileId);
        if (terrain && terrain.type !== "water" && terrain.type !== "ice") {
          const existing = peakTiles.get(tileId) ?? 0;
          if (m.elevationM > existing) peakTiles.set(tileId, m.elevationM);
        }
      }
      opts.getPeak = (id) => {
        const apexM = peakTiles.get(id);
        return apexM != null ? { apexElevationM: apexM } : undefined;
      };
      opts.peakElevationScale = 0.000006;
    }
    const flatGeometry = createGeodesicGeometryFlat(globe.tiles, opts);
    applyTerrainColorsToGeometry(flatGeometry, tileTerrain);
    globe.mesh.geometry = flatGeometry;
    (globe.mesh as THREE.Mesh).material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      side: THREE.DoubleSide,
    });
    globe.mesh.renderOrder = 0;
    await yieldToMain();

    coastMaskTexture = createCoastMaskTexture(globe, tileTerrain, 256, 128);
    coastLandMaskTexture = createCoastLandMaskTexture(globe, tileTerrain, 256, 128);
    await yieldToMain();

    water = new WaterSphere({
      radius: 0.995,
      color: 0x1a5a6a,
      colorPole: 0x2a3548,
      sunDirection: sunDirectionFromState(state),
      sunColor: 0xffffff,
      coastMask: coastMaskTexture,
      shorelineRadius: 1.0,
      size: 1.5,
      timeScale: 0.4,
      waveAmplitude: 0.0007,
    });
    scene.add(water.mesh);

    coastFoamOverlay = new CoastFoamOverlay(coastLandMaskTexture, {
      radius: 1.0,
      speed: 0.073,
      timeScale: 0.4,
    });
    scene.add(coastFoamOverlay.mesh);

    marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xff4444 })
    );
    const tileId = Math.min(42, globe.tileCount - 1);
    placeObject(marker, globe, { tileId, heightOffset: 0.06 });
    scene.add(marker);
  } finally {
    setLoading(false);
  }
}

function scheduleRebuild(state: DemoState) {
  if (buildInProgress) {
    pendingState = { ...state };
    return;
  }
  buildInProgress = true;
  pendingState = null;
  buildWorldAsync(state).then(() => {
    buildInProgress = false;
    if (pendingState) {
      const next = pendingState;
      pendingState = null;
      scheduleRebuild(next);
    }
  });
}

function createPanel(state: DemoState, onRebuild: () => void) {
  const panel = document.getElementById("panel")!;
  panel.innerHTML = "";

  const h3 = document.createElement("h3");
  h3.textContent = "Globe controls";
  panel.appendChild(h3);

  const loadingEl = document.createElement("div");
  loadingEl.className = "loading";
  loadingEl.textContent = "Building globe…";
  panel.appendChild(loadingEl);
  setLoading = (visible: boolean) => loadingEl.classList.toggle("visible", visible);

  const addSection = (title: string) => {
    const sec = document.createElement("section");
    sec.innerHTML = `<label>${title}</label>`;
    panel.appendChild(sec);
    return sec;
  };

  const addSlider = (
    parent: HTMLElement,
    label: string,
    key: keyof DemoState,
    min: number,
    max: number,
    step: number,
    format: (v: number) => string,
    triggerRebuild: boolean = true
  ) => {
    const row = document.createElement("div");
    row.className = "row";
    const valSpan = document.createElement("span");
    valSpan.className = "value";
    const input = document.createElement("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String((state as Record<string, number>)[key]);
    valSpan.textContent = format(Number(input.value));
    input.addEventListener("input", () => {
      (state as Record<string, number>)[key] = Number(input.value);
      valSpan.textContent = format(Number(input.value));
      if (triggerRebuild) onRebuild();
    });
    row.appendChild(document.createTextNode(label));
    row.appendChild(valSpan);
    parent.appendChild(row);
    parent.appendChild(input);
  };

  const addToggle = (parent: HTMLElement, label: string, key: keyof DemoState, onRebuild: () => void) => {
    const row = document.createElement("div");
    row.className = "row";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = (state as Record<string, boolean>)[key] as boolean;
    cb.addEventListener("change", () => {
      (state as Record<string, boolean>)[key] = cb.checked;
      onRebuild();
    });
    row.appendChild(cb);
    row.appendChild(document.createTextNode(label));
    parent.appendChild(row);
  };

  let sec = addSection("World");
  addToggle(sec, "Use Earth map", "useEarth", onRebuild);
  addSlider(sec, "Scale (subdivisions)", "subdivisions", 1, 6, 1, (v) => `${v} (~${2 + 10 * Math.pow(4, v)} tiles)`);

  sec = addSection("Sun");
  addSlider(sec, "Longitude", "sunLongitude", -1, 1, 0.02, (v) => (v * 180).toFixed(0) + "°", false);
  addSlider(sec, "Latitude", "sunLatitude", -0.5, 0.5, 0.02, (v) => (v * 90).toFixed(0) + "°", false);

  sec = addSection("Moon");
  addSlider(sec, "Longitude", "moonLongitude", -1, 1, 0.02, (v) => (v * 180).toFixed(0) + "°", false);
  addSlider(sec, "Latitude", "moonLatitude", -0.5, 0.5, 0.02, (v) => (v * 90).toFixed(0) + "°", false);

  sec = addSection("Procedural (when Earth off)");
  sec.classList.add("procedural");
  addSlider(sec, "Land fraction", "landFraction", 0.2, 0.8, 0.02, (v) => (v * 100).toFixed(0) + "%");
  addSlider(sec, "Blobiness (smoothing)", "blobiness", 0, 12, 1, (v) => String(v));
  addSlider(sec, "Seed", "seed", 1, 99999, 1, (v) => String(v));
}

async function init() {
  earthRaster = await loadEarthLandRaster();
  const res = await fetch(MOUNTAINS_JSON_SAME_ORIGIN);
  if (res.ok) {
    const raw = (await res.json()) as unknown;
    mountainsList =
      Array.isArray(raw) &&
      raw.every(
        (e: unknown) =>
          e != null &&
          typeof e === "object" &&
          "lat" in e &&
          "lon" in e &&
          "elevationM" in e &&
          typeof (e as MountainEntry).lat === "number" &&
          typeof (e as MountainEntry).lon === "number" &&
          typeof (e as MountainEntry).elevationM === "number"
      )
        ? (raw as MountainEntry[])
        : null;
  } else {
    mountainsList = null;
  }
  const climate = await loadKoppenClimate();
  if (climate) earthRaster.climate = climate;
  const elevation = await loadElevation();
  if (elevation) earthRaster.elevation = elevation;

  const state: DemoState = { ...DEFAULT_STATE };
  createPanel(state, () => scheduleRebuild(state));

  scheduleRebuild(state);

  applyPreset(camera, getPreset("strategy"), 1);
  camera.position.multiplyScalar(2.8);

  const sun = new Sun({
    direction: sunDirectionFromState(state),
    distance: 3500,
    intensity: 2.2,
    ambientIntensity: 0.15,
    ambientColor: 0x202830,
    sphereRadius: 90,
    sphereColor: 0xfff5e0,
  });
  sun.addTo(scene);
  const lensflare = new Lensflare();
  lensflare.addElement(new LensflareElement(createFlareTexture(64, true), 120, 0, new THREE.Color(0xffffee)));
  lensflare.addElement(new LensflareElement(createFlareTexture(32, true), 80, 0.4, new THREE.Color(0xffffee)));
  lensflare.addElement(new LensflareElement(createFlareTexture(128, false), 200, 0.6, new THREE.Color(0xffffff)));
  sun.directional.add(lensflare);

  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(innerWidth, innerHeight);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(
    new THREE.Vector2(innerWidth, innerHeight),
    0.9,
    0.4,
    0.55
  ));

  const atmosphere = new Atmosphere(scene, { timeOfDay: 0.5 });
  scene.background = new THREE.Color(0x030508);

  const moonRadius = 0.14;
  const moonDistance = 2.6;
  const moon = new Globe({ radius: moonRadius, subdivisions: 2 });
  const moonTerrain = new Map<number, TileTerrainData>();
  for (let i = 0; i < moon.tileCount; i++) {
    moonTerrain.set(i, {
      tileId: i,
      type: i % 2 === 0 ? "snow" : "mountain",
      elevation: 0.02,
    });
  }
  applyTerrainToGeometry(moon.mesh.geometry, moonTerrain, 0.04);
  (moon.mesh as THREE.Mesh).material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    side: THREE.FrontSide,
  });
  scene.add(moon.mesh);
  const moonLight = new THREE.PointLight(0xb0b8c8, 0.5, moonDistance * 2.5, 1.5);
  scene.add(moonLight);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 1.5;
  controls.maxDistance = 6;

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    starfield.update(camera);
    const sunDir = sunDirectionFromState(state);
    sun.directional.position.copy(sunDir).multiplyScalar(3500);
    if (sun.sphere) sun.sphere.position.copy(sun.directional.position);
    const moonPos = moonPositionFromState(state, moonDistance);
    moon.mesh.position.copy(moonPos);
    moonLight.position.copy(moonPos);
    if (water) {
      water.setSunDirection(sunDir);
      water.update();
    }
    if (coastFoamOverlay) {
      coastFoamOverlay.setSunDirection(sunDir);
      coastFoamOverlay.update();
    }
    composer.render();
  }

  window.addEventListener("resize", () => {
    const w = innerWidth;
    const h = innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    composer.setPixelRatio(renderer.getPixelRatio());
  });
  animate();
}
init();
