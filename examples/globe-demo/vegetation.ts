/**
 * Biome vegetation and rocks: place instanced low-poly plants and rocks by terrain type
 * with draw-distance culling. Up to 12 items per hex (biome-dependent), tiny scale.
 * Realistic mix: no grass in dense forests (canopy); rocks in mountains, desert, tundra;
 * grass dominant in grasslands/savanna. Only instances within maxDrawDistance are rendered.
 *
 * Pass in options.geometries: { tree, bush, grass, rock } (GLTF mesh geometry per type).
 *
 * Plant selection: we use one 3D model per category (tree, bush, grass, rock) and tint by
 * biome (getBiomeColor). Tree variants (acacia, pine, bamboo, palm, etc.) are chosen in main via
 * getTreeVariantIndex (biome + lat/lon).
 *
 * River hexes: samples only along rays to tile corners (vertices), never the mid-tile channel.
 */

import * as THREE from "three";
import type { Globe } from "polyglobe";
import type { TileTerrainData } from "polyglobe";
import {
  getTileTangentFrame,
  tilePlanePoint,
  tileMeanCornerRadius,
  tileCenterToLatLon,
  latLonToDegrees,
} from "polyglobe";

export type PlantType = "tree" | "bush" | "grass" | "rock";

export interface VegetationOptions {
  /** Max distance from camera to render plants (globe units). Default 5.5. */
  maxDrawDistance?: number;
  /** Globe radius + elevation scale (same as terrain). Default 0.08. */
  elevationScale?: number;
  /** Max plants per hex (capped ~20). Default 12. */
  maxPlantsPerHex?: number;
  /** Base instance scale so N plants fit spaciously on a hex (globe radius ≈ 1). Default 0.006. */
  baseScale?: number;
  /** Max instances to draw per plant type (GPU budget). Default 2048. */
  maxInstancesPerType?: number;
  /**
   * Height of hill bump in globe units; must match terrain mesh so vegetation sits on the surface.
   * Default 0.003. Only used when tile has isHilly.
   */
  hillyBumpHeight?: number;
  /**
   * Optional: peak (mountain) apex height per tile; when set, vegetation follows pyramid shape.
   * Same as mesh getPeak: (tileId) => ({ apexElevationM }) or undefined.
   */
  getPeak?: (tileId: number) => { apexElevationM: number } | undefined;
  /** Scale for peak apex (meters → globe units). Default 0.00002; must match terrain mesh. */
  peakElevationScale?: number;
  /**
   * Optional: when set, tiles with river edges only get plants on the bank (outside the channel).
   * (tileId) => Set<number> of edge indices or undefined. Matches getRiverEdges from terrain.
   */
  getRiverEdges?: (tileId: number) => Set<number> | undefined;
  /** Optional: custom geometry per plant type; omit to use built-in placeholders. */
  geometries?: {
    tree?: THREE.BufferGeometry;
    bush?: THREE.BufferGeometry;
    grass?: THREE.BufferGeometry | THREE.BufferGeometry[];
    rock?: THREE.BufferGeometry;
    /** When both set, trees use trunk (brown) + foliage (tinted) instead of a single geometry. */
    treeTrunk?: THREE.BufferGeometry;
    treeFoliage?: THREE.BufferGeometry;
    /** Multiple geometries per type: one InstancedMesh per variant. Use with getXxxVariantIndex. */
    trees?: THREE.BufferGeometry[];
    /** When set, trees are drawn as trunk (brown) + foliage (tinted) per variant. Overrides trees for tree type. */
    treeTrunkFoliage?: ({ trunk: THREE.BufferGeometry; foliage: THREE.BufferGeometry } | undefined)[];
    bushes?: THREE.BufferGeometry[];
    rocks?: THREE.BufferGeometry[];
  };
  /**
   * Uniform scale multiplier for instanced trees by variant index (thin clumps e.g. bamboo may need &gt;1).
   * Default 1. Only applied to tree placements.
   */
  getTreeVariantScale?: (variantIndex: number) => number;
  /** Pick tree variant index (0..trees.length-1) from biome and lon/lat (degrees). For region-specific e.g. bamboo. */
  getTreeVariantIndex?: (biome: string, latDeg: number, lonDeg: number, rnd: () => number) => number;
  getBushVariantIndex?: (biome: string, latDeg: number, lonDeg: number, rnd: () => number) => number;
  getGrassVariantIndex?: (biome: string, latDeg: number, lonDeg: number, rnd: () => number) => number;
  getRockVariantIndex?: (biome: string, latDeg: number, lonDeg: number, rnd: () => number) => number;
  /** Current date for seasonal foliage (deciduous fall/winter). When set, deciduous trees use fall colors and drop leaves in winter; Southern hemisphere and tropics (dry/wet) are handled. */
  getDate?: () => Date;
  /**
   * Skip full vegetation CPU work on most frames (still draws last frame’s instance data).
   * Use 2 on dense globes (~160k tiles) to roughly halve sort/cull cost.
   */
  updateEveryNFrames?: number;
  /**
   * Skip plants on the back side of the planet (cheap dot test vs camera direction from origin).
   * Default true. Set false only if the camera can go inside the globe.
   */
  hemisphereCull?: boolean;
  /**
   * Dot(plant direction, camera direction from origin) below this → skip. Default -0.22.
   * Values closer to 0 cull more aggressively (e.g. -0.05 for dense globes).
   */
  hemisphereCullDot?: number;
  /**
   * When a variant’s placement list is this long or more, use a K-nearest heap instead of
   * sorting all in-range plants (faster when K ≪ n). Default 38_000.
   */
  heapCullMinPlacements?: number;
  /**
   * When the camera is at least this distance from the origin (globe at ~radius 1), use
   * {@link orbitViewMaxDrawDistance} instead of {@link maxDrawDistance} so orbital views
   * skip almost all plants. Zoom in past this distance to restore normal ground detail.
   */
  orbitViewCameraDistance?: number;
  /** Tight max draw distance in orbit (globe units). Default 0.2. */
  orbitViewMaxDrawDistance?: number;
  /**
   * Skip the O(n) cull/sort/instance pass when camera pose and (if {@link getDate} is set) the UTC
   * minute are unchanged since the last pass. Large CPU win when the view is idle. Default true.
   */
  skipCullWhenCameraStable?: boolean;
  /** When set, wet tiles (e.g. recent rain) get a slightly cooler, brighter instance color. */
  getTileWetness?: (tileId: number) => number;
  /** When set, snow cover 0–1 (sim + climate); tints foliage/bushes/grass white, not tree trunks. */
  getTileSnowCover?: (tileId: number) => number;
  /** Min squared world-space camera movement to force a refresh. Default 4e-6. */
  cameraStablePosEpsSq?: number;
  /** Max deviation of |quat dot| from 1 to still treat rotation as unchanged. Default 8e-5. */
  cameraStableQuatEps?: number;
}

/**
 * Non-river tiles: max offset from center in tangent plane (× mean corner radius).
 * ~0.78 fills most of the hex without clustering in the middle.
 */
const PLANT_JITTER_FRAC = 0.78;

/**
 * River tiles: place only along rays toward hex **vertices**. The channel sits mid-tile along edges;
 * corners stay on land regardless of river orientation, so we never sample the water.
 * Fraction of the way from center to corner (avoid exact vertex for float robustness).
 */
const RIVER_BANK_CORNER_FRAC_MIN = 0.68;
const RIVER_BANK_CORNER_FRAC_MAX = 0.96;

/** Match geodesic flat-top hill: inner flat disk at this fraction of hex radius, then slope to edge. */
const HILL_FLAT_TOP_RADIUS_FRAC = 0.78;

/**
 * Radius at (lx, ly) in tile tangent plane so vegetation sits on the terrain surface.
 * Flat tile = r; hilly = raised flat top + slope; peak = pyramid (center highest).
 */
function radiusAtPoint(
  lx: number,
  ly: number,
  r: number,
  frame: { corners2d: [number, number][] },
  isHilly: boolean,
  hillyBumpHeight: number,
  peakApexM: number | undefined,
  peakElevationScale: number
): number {
  let baseRadius2d = 0;
  for (const c of frame.corners2d) {
    const d = Math.hypot(c[0], c[1]);
    if (d > baseRadius2d) baseRadius2d = d;
  }
  if (baseRadius2d <= 0) return r;
  const dist = Math.hypot(lx, ly);

  if (peakApexM != null && peakApexM > 0 && peakElevationScale > 0) {
    const rCenter = r + peakElevationScale * peakApexM;
    const t = Math.min(1, dist / baseRadius2d);
    return rCenter + (r - rCenter) * t;
  }
  if (!isHilly) return r;
  const innerRadius2d = baseRadius2d * HILL_FLAT_TOP_RADIUS_FRAC;
  if (dist <= innerRadius2d) return r + hillyBumpHeight;
  if (dist >= baseRadius2d) return r;
  const t = (dist - innerRadius2d) / (baseRadius2d - innerRadius2d);
  return r + hillyBumpHeight * (1 - t);
}

interface Placement {
  position: THREE.Vector3;
  normal: THREE.Vector3;
  scale: number;
  type: PlantType;
  color: THREE.Color;
  /** Index into geometries.trees/bushes/grass/rocks array when using multi-variant. */
  variantIndex: number;
  /** Host hex for wetness / snow styling. */
  tileId: number;
  /** Tile center lat/lon (degrees) for seasonal phase (deciduous fall/winter, tropics dry/wet). */
  latDeg: number;
  lonDeg: number;
}

/**
 * Season phase from date and latitude. Southern hemisphere is inverted; tropics use dry/wet.
 * Fall = gradual 0..1 (Sep→Nov north, Mar→May south). Winter = leaves off (Dec–Feb north, Jun–Aug south).
 */
export function getSeasonPhase(
  date: Date,
  latDeg: number,
): { fallProgress: number; isWinter: boolean; isTropical: boolean; dryFactor: number } {
  const month = date.getUTCMonth();
  const dayOfYear =
    (Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) -
      Date.UTC(date.getUTCFullYear(), 0, 0)) /
    86400000;
  const isTropical = Math.abs(latDeg) < 23.5;
  if (isTropical) {
    const dryFactor =
      latDeg >= 0
        ? month >= 10 || month <= 2
          ? 1
          : month >= 3 && month <= 5
            ? 0.5
            : 0
        : month >= 4 && month <= 8
          ? 1
          : month >= 9 && month <= 10
            ? 0.5
            : 0;
    return { fallProgress: 0, isWinter: false, isTropical: true, dryFactor };
  }
  const northern = latDeg >= 0;
  const effectiveDay = northern ? dayOfYear : (dayOfYear + 365 / 2) % 365;
  const fallStart = 266;
  const fallEnd = 334;
  const winterStart = 355;
  const winterEnd = 59;
  const fallProgress =
    effectiveDay >= fallStart && effectiveDay <= fallEnd
      ? (effectiveDay - fallStart) / (fallEnd - fallStart)
      : effectiveDay >= 0 && effectiveDay <= 59
        ? 1
        : 0;
  const isWinter =
    (northern && (month === 11 || month === 0 || month === 1)) ||
    (!northern && (month >= 5 && month <= 7));
  return { fallProgress, isWinter, isTropical: false, dryFactor: 0 };
}

/** Köppen land types that get vegetation. No generic "land" — only real climate zones. */
const LAND_BIOMES = new Set<string>([
  "tropical_rainforest",
  "tropical_monsoon",
  "tropical_savanna",
  "hot_desert",
  "cold_desert",
  "hot_steppe",
  "cold_steppe",
  "mediterranean_hot",
  "mediterranean_warm",
  "mediterranean_cold",
  "humid_subtropical",
  "subtropical_highland",
  "subtropical_highland_cold",
  "humid_subtropical_hot",
  "oceanic",
  "subpolar_oceanic",
  "hot_summer_continental",
  "warm_summer_continental",
  "subarctic_dry",
  "subarctic_very_cold_dry",
  "humid_continental_hot",
  "humid_continental_warm",
  "subarctic_dry_winter",
  "subarctic_very_cold_dry_winter",
  "humid_continental",
  "warm_summer_humid",
  "subarctic",
  "subarctic_very_cold",
  "tundra",
  "mountain",
  "snow",
  "swamp",
  "forest",
  "grassland",
  "desert",
]);
const SKIP_BIOMES = new Set<string>(["water", "beach", "ice", "ice_cap"]);

/** Returns number of plants for this hex (0–max). Rainforest dense, savanna sparse, desert very few. */
function getPlantCount(biome: string, maxPerHex: number, rnd: () => number): number {
  const cap = Math.max(0, Math.min(20, maxPerHex));
  if (biome === "tropical_rainforest" || biome === "tropical_monsoon") {
    return Math.floor(8 + rnd() * (cap - 7)); // 8–12 dense
  }
  if (biome === "tropical_savanna") {
    return Math.floor(2 + rnd() * 4); // 2–5 much sparser than rainforest
  }
  if (
    biome === "grassland" ||
    biome === "humid_subtropical" ||
    biome === "humid_subtropical_hot" ||
    biome === "swamp"
  ) {
    return Math.floor(5 + rnd() * 5); // 5–9
  }
  if (
    biome === "hot_steppe" ||
    biome === "cold_steppe" ||
    biome === "mediterranean_hot" ||
    biome === "mediterranean_warm" ||
    biome === "mediterranean_cold" ||
    biome === "oceanic" ||
    biome === "subpolar_oceanic" ||
    biome === "subtropical_highland" ||
    biome === "subtropical_highland_cold" ||
    biome === "humid_continental" ||
    biome === "humid_continental_hot" ||
    biome === "humid_continental_warm" ||
    biome === "warm_summer_humid" ||
    biome === "hot_summer_continental" ||
    biome === "warm_summer_continental" ||
    biome === "forest"
  ) {
    return Math.floor(5 + rnd() * 7); // 5–11 temperate / boreal forest
  }
  if (
    biome === "subarctic" ||
    biome === "subarctic_dry" ||
    biome === "subarctic_very_cold_dry" ||
    biome === "subarctic_dry_winter" ||
    biome === "subarctic_very_cold_dry_winter" ||
    biome === "subarctic_very_cold"
  ) {
    return Math.floor(6 + rnd() * 7); // 6–12 dense taiga / boreal pine forest
  }
  if (biome === "desert" || biome === "hot_desert" || biome === "cold_desert") {
    return rnd() < 0.4 ? 1 : 0; // 0–1
  }
  if (biome === "tundra" || biome === "snow") {
    return Math.floor(rnd() * 3); // 0–2
  }
  if (biome === "mountain") {
    return Math.floor(1 + rnd() * 4); // 1–4
  }
  return Math.floor(2 + rnd() * 4); // fallback 2–5
}

/** Realistic mix: rainforest = trees + understory, no grass; savanna = grass dominant, few trees; desert/mountain = rocks. */
function getPlantType(biome: string, rnd: () => number): PlantType {
  const t = rnd();
  if (biome === "tropical_rainforest" || biome === "tropical_monsoon") {
    return t < 0.72 ? "tree" : "bush"; // Dense canopy — no grass
  }
  if (biome === "tropical_savanna") {
    /** ~12% trees (was ~7%) — enough instances for palm/acacia; still grass + bush dominant. */
    return t < 0.60 ? "grass" : t < 0.88 ? "bush" : "tree";
  }
  if (
    biome === "grassland" ||
    biome === "humid_subtropical" ||
    biome === "humid_subtropical_hot"
  ) {
    return t < 0.55 ? "grass" : t < 0.85 ? "bush" : "tree";
  }
  if (biome === "hot_steppe" || biome === "cold_steppe") {
    return t < 0.58 ? "grass" : t < 0.88 ? "bush" : t < 0.95 ? "tree" : "rock";
  }
  if (biome === "desert" || biome === "hot_desert" || biome === "cold_desert") {
    return t < 0.5 ? "rock" : t < 0.8 ? "bush" : "grass";
  }
  if (biome === "mountain") {
    return t < 0.45 ? "rock" : t < 0.72 ? "bush" : "tree";
  }
  if (biome === "tundra" || biome === "snow") {
    return t < 0.3 ? "rock" : t < 0.6 ? "grass" : "bush"; // No trees
  }
  if (biome === "swamp") {
    return t < 0.4 ? "tree" : t < 0.75 ? "grass" : "bush";
  }
  if (
    biome === "mediterranean_hot" ||
    biome === "mediterranean_warm" ||
    biome === "mediterranean_cold"
  ) {
    return t < 0.4 ? "grass" : t < 0.75 ? "bush" : "tree";
  }
  if (
    biome === "oceanic" ||
    biome === "subpolar_oceanic" ||
    biome === "subtropical_highland" ||
    biome === "subtropical_highland_cold" ||
    biome === "humid_continental" ||
    biome === "humid_continental_hot" ||
    biome === "humid_continental_warm" ||
    biome === "warm_summer_humid" ||
    biome === "hot_summer_continental" ||
    biome === "warm_summer_continental" ||
    biome === "forest"
  ) {
    /** ~42% trees — conifer/broadleaf forest reads better than mostly understory. */
    return t < 0.33 ? "grass" : t < 0.58 ? "bush" : "tree";
  }
  if (
    biome === "subarctic" ||
    biome === "subarctic_dry" ||
    biome === "subarctic_very_cold_dry" ||
    biome === "subarctic_dry_winter" ||
    biome === "subarctic_very_cold_dry_winter" ||
    biome === "subarctic_very_cold"
  ) {
    /** Dense taiga: mostly pines, some understory. */
    return t < 0.62 ? "tree" : t < 0.82 ? "bush" : t < 0.95 ? "grass" : "rock";
  }
  return t < 0.35 ? "tree" : t < 0.68 ? "grass" : t < 0.92 ? "bush" : "rock";
}

/** Per-biome palette: rainforest deep green, savanna tan/yellow, desert grey/tan, temperate greens, boreal darker, tundra muted. */
function getBiomeColor(biome: string, plantType: PlantType, _rnd: () => number): THREE.Color {
  const c = new THREE.Color();
  if (plantType === "rock") {
    if (biome === "hot_desert" || biome === "desert") return c.setHex(0xc9b896);
    if (biome === "cold_desert") return c.setHex(0xa89880);
    return c.setHex(0x6a6a62); // grey
  }
  if (plantType === "grass") {
    if (biome === "tropical_rainforest" || biome === "tropical_monsoon") return c.setHex(0x2d5016); // shade green
    if (biome === "tropical_savanna") return c.setHex(0xb8a050); // dry yellow-tan
    if (biome === "hot_steppe" || biome === "cold_steppe") return c.setHex(0x9a8c40);
    if (biome === "hot_desert" || biome === "cold_desert" || biome === "desert") return c.setHex(0x8b7a35);
    if (biome === "tundra" || biome === "snow") return c.setHex(0x6b6b50); // muted
    if (biome === "mediterranean_hot" || biome === "mediterranean_warm" || biome === "mediterranean_cold") return c.setHex(0x7a9a48);
    if (biome.startsWith("subarctic") || biome === "tundra") return c.setHex(0x5a6b40);
    return c.setHex(0x4a7c23); // default green
  }
  if (plantType === "bush") {
    if (biome === "tropical_rainforest" || biome === "tropical_monsoon") return c.setHex(0x1e4a1e);
    if (biome === "tropical_savanna") return c.setHex(0x6b8035); // olive / acacia understory
    if (biome === "hot_desert" || biome === "cold_desert" || biome === "desert") return c.setHex(0x7a6b40);
    if (biome === "mediterranean_hot" || biome === "mediterranean_warm" || biome === "mediterranean_cold") return c.setHex(0x5a7a38);
    if (biome.startsWith("subarctic") || biome === "tundra") return c.setHex(0x3d5030);
    return c.setHex(0x3d6b1a);
  }
  if (plantType === "tree") {
    if (biome === "tropical_rainforest" || biome === "tropical_monsoon") return c.setHex(0x1a4a1a); // deep jungle
    if (biome === "tropical_savanna") return c.setHex(0x5a7030); // acacia / sparse green
    if (biome === "mediterranean_hot" || biome === "mediterranean_warm" || biome === "mediterranean_cold") return c.setHex(0x4a6a28);
    if (biome === "humid_continental" || biome === "warm_summer_humid" || biome === "oceanic") return c.setHex(0x3d6020); // temperate green
    if (biome.startsWith("subarctic") || biome === "humid_continental_hot" || biome === "humid_continental_warm") return c.setHex(0x2d4520); // boreal darker
    if (biome === "tundra" || biome === "snow") return c.setHex(0x3a4030); // stunted
    return c.setHex(0x2d5016);
  }
  return c.setHex(0x4a7c23);
}

function makePlaceholderGeometry(type: PlantType): THREE.BufferGeometry {
  switch (type) {
    case "tree":
      return new THREE.ConeGeometry(0.012, 0.045, 5);
    case "bush":
      return new THREE.SphereGeometry(0.008, 4, 3);
    case "grass":
      return new THREE.ConeGeometry(0.004, 0.018, 4);
    case "rock":
      return new THREE.DodecahedronGeometry(0.006, 0);
    default:
      return new THREE.ConeGeometry(0.008, 0.025, 5);
  }
}

const _camPos = new THREE.Vector3();
const _camQuatWorld = new THREE.Quaternion();
const _lastStableCullPos = new THREE.Vector3();
const _lastStableCullQuat = new THREE.Quaternion();
const _camUnit = new THREE.Vector3();
/** Reused for K-nearest heap cull (avoids sorting huge in-range lists). */
const _distHeap: { distSq: number; idx: number }[] = [];

/**
 * Max-heap helper: keep up to `cap` smallest distSq values (largest of the K at root).
 * After all pushes, sort `heap` by distSq for near-to-far draw order.
 */
function heapPushCap(
  heap: { distSq: number; idx: number }[],
  cap: number,
  distSq: number,
  idx: number,
): void {
  if (heap.length < cap) {
    heap.push({ distSq, idx });
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p]!.distSq >= heap[i]!.distSq) break;
      const tmp = heap[p]!;
      heap[p] = heap[i]!;
      heap[i] = tmp;
      i = p;
    }
    return;
  }
  if (distSq >= heap[0]!.distSq) return;
  heap[0] = { distSq, idx };
  let i = 0;
  const n = heap.length;
  for (;;) {
    const l = i * 2 + 1;
    const r = l + 1;
    let largest = i;
    if (l < n && heap[l]!.distSq > heap[largest]!.distSq) largest = l;
    if (r < n && heap[r]!.distSq > heap[largest]!.distSq) largest = r;
    if (largest === i) break;
    const tmp = heap[i]!;
    heap[i] = heap[largest]!;
    heap[largest] = tmp;
    i = largest;
  }
}
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _mat = new THREE.Matrix4();
const _positionOut = new THREE.Vector3();
/** World +Y; reused for every instance quaternion (avoid allocating in update loop). */
const _treeUp = new THREE.Vector3(0, 1, 0);

export function createVegetationLayer(
  globe: Globe,
  tileTerrain: Map<number, TileTerrainData>,
  options: VegetationOptions = {}
): {
  group: THREE.Group;
  update: (camera: THREE.Camera) => void;
  dispose: () => void;
} {
  const maxDrawDistance = options.maxDrawDistance ?? 5.5;
  const elevationScale = options.elevationScale ?? 0.08;
  const maxPlantsPerHex = Math.max(0, Math.min(20, options.maxPlantsPerHex ?? 12));
  const baseScale = options.baseScale ?? 0.006;
  const maxInstances = options.maxInstancesPerType ?? 2048;
  const hillyBumpHeight = options.hillyBumpHeight ?? 0.003;
  const getPeak = options.getPeak;
  const getRiverEdges = options.getRiverEdges;
  const peakElevationScale = options.peakElevationScale ?? 0.00002;
  const getTreeVariantScale = options.getTreeVariantScale;
  const getDate = options.getDate;
  const updateEveryNFrames = Math.max(1, Math.floor(options.updateEveryNFrames ?? 1));
  const hemisphereCull = options.hemisphereCull !== false;
  const hemisphereCullDot = options.hemisphereCullDot ?? -0.22;
  const radius = globe.radius;
  const heapCullMinList = options.heapCullMinPlacements ?? 38_000;
  const orbitCamDist = options.orbitViewCameraDistance;
  const orbitMaxDraw =
    options.orbitViewMaxDrawDistance ?? 0.2;
  const skipCullWhenCameraStable = options.skipCullWhenCameraStable !== false;
  const cameraStablePosEpsSq = options.cameraStablePosEpsSq ?? 4e-6;
  const cameraStableQuatEps = options.cameraStableQuatEps ?? 8e-5;
  const getTileWetness = options.getTileWetness;
  const getTileSnowCover = options.getTileSnowCover;
  let lastStableTimeKey = 0;
  let hasStableCullSample = false;

  function isDeciduousVariant(variantIndex: number): boolean {
    return (variantIndex >= 0 && variantIndex <= 2) || (variantIndex >= 10 && variantIndex <= 12);
  }

  const fallYellow = new THREE.Color(0xddbb44);
  const fallRed = new THREE.Color(0xbb4433);
  const foliageSeasonScratch = new THREE.Color();
  const tropicalDryTint = new THREE.Color(0x8a7a50);
  const wetShine = new THREE.Color(0xc8d8e8);
  const wetScratch = new THREE.Color();
  const snowTint = new THREE.Color(0xf2f8ff);

  const placements: Placement[] = [];
  const rnd = seededRandom(42);

  for (const tile of globe.tiles) {
    const data = tileTerrain.get(tile.id);
    if (!data) continue;
    const typeStr = data.type;
    if (SKIP_BIOMES.has(typeStr)) continue;
    if (!LAND_BIOMES.has(typeStr)) continue;
    /* Skip mountains: sloped peak surface looks bad with plants/rocks. */
    const peak = getPeak?.(tile.id);
    if (peak != null && (peak.apexElevationM ?? 0) > 0) continue;

    const count = getPlantCount(typeStr, maxPlantsPerHex, rnd);
    if (count <= 0) continue;

    const elev = (data.elevation ?? 0) * elevationScale;
    const r = radius + elev;
    const frame = getTileTangentFrame(tile);
    const meanRadius = tileMeanCornerRadius(frame);
    const jitterRadius = PLANT_JITTER_FRAC * meanRadius;

    const isHilly = data.isHilly ?? false;
    const peakApexM = peak?.apexElevationM;
    const hasRiver = (getRiverEdges?.(tile.id)?.size ?? 0) > 0;
    const { lat, lon } = tileCenterToLatLon(tile.center);
    const { latDeg, lonDeg } = latLonToDegrees(lat, lon);
    const corners2d = frame.corners2d;
    for (let i = 0; i < count; i++) {
      let lx = 0;
      let ly = 0;
      if (hasRiver && corners2d.length >= 3) {
        /** Bank-only: random corner + distance along center→vertex (never in channel). */
        const c = corners2d[Math.floor(rnd() * corners2d.length)]!;
        const t =
          RIVER_BANK_CORNER_FRAC_MIN +
          rnd() * (RIVER_BANK_CORNER_FRAC_MAX - RIVER_BANK_CORNER_FRAC_MIN);
        lx = c[0] * t;
        ly = c[1] * t;
      } else {
        const angle = rnd() * Math.PI * 2;
        /** Uniform disk: sqrt(rnd) spreads samples by area (not clumped toward center). */
        const rad = Math.sqrt(rnd()) * jitterRadius;
        lx = rad * Math.cos(angle);
        ly = rad * Math.sin(angle);
      }
      const rPoint = radiusAtPoint(
        lx,
        ly,
        r,
        frame,
        isHilly,
        hillyBumpHeight,
        peakApexM,
        peakElevationScale
      );
      tilePlanePoint(frame, lx, ly, rPoint, _positionOut);
      const position = _positionOut.clone();
      const normal = frame.normal.clone();
      const scale = baseScale * (0.85 + rnd() * 0.3);
      const plantType = getPlantType(typeStr, rnd);
      const color = getBiomeColor(typeStr, plantType, rnd);
      const variantIndex = getVariantIndex(plantType, typeStr, latDeg, lonDeg, rnd);
      placements.push({
        position,
        normal,
        scale,
        type: plantType,
        color,
        variantIndex,
        tileId: tile.id,
        latDeg,
        lonDeg,
      });
    }
  }

  function getVariantIndex(
    plantType: PlantType,
    biome: string,
    latDeg: number,
    lonDeg: number,
    rnd: () => number
  ): number {
    const nT =
      options.geometries?.trees?.length ??
      options.geometries?.treeTrunkFoliage?.length ??
      0;
    const nB = options.geometries?.bushes?.length ?? 0;
    const grassOpt = options.geometries?.grass;
    const nG = Array.isArray(grassOpt) ? grassOpt.length : 0;
    const nR = options.geometries?.rocks?.length ?? 0;
    if (plantType === "tree" && nT > 0) {
      const i = options.getTreeVariantIndex?.(biome, latDeg, lonDeg, rnd) ?? 0;
      return Math.max(0, Math.min(i, nT - 1));
    }
    if (plantType === "bush" && nB > 0) {
      const i = options.getBushVariantIndex?.(biome, latDeg, lonDeg, rnd) ?? 0;
      return Math.max(0, Math.min(i, nB - 1));
    }
    if (plantType === "grass" && nG > 0) {
      const i = options.getGrassVariantIndex?.(biome, latDeg, lonDeg, rnd) ?? 0;
      return Math.max(0, Math.min(i, nG - 1));
    }
    if (plantType === "rock" && nR > 0) {
      const i = options.getRockVariantIndex?.(biome, latDeg, lonDeg, rnd) ?? 0;
      return Math.max(0, Math.min(i, nR - 1));
    }
    return 0;
  }

  const group = new THREE.Group();
  group.name = "Vegetation";

  const byType: Record<PlantType, Placement[]> = { tree: [], bush: [], grass: [], rock: [] };
  for (const p of placements) {
    byType[p.type].push(p);
  }

  /** Matches `treeUrls` order in globe-demo main (variant index → species group). */
  function treeSpeciesGroup(variantIndex: number): string {
    if (variantIndex >= 0 && variantIndex <= 2) return "deciduous_round";
    if (variantIndex >= 3 && variantIndex <= 5) return "acacia";
    if (variantIndex >= 6 && variantIndex <= 8) return "pine";
    if (variantIndex === 9) return "bamboo";
    if (variantIndex >= 10 && variantIndex <= 12) return "deciduous_boxy";
    if (variantIndex >= 13 && variantIndex <= 15) return "palm";
    return `other_${variantIndex}`;
  }

  const TREE_LOG = "[tree-debug]";
  console.log(TREE_LOG, "placements by type", {
    tree: byType.tree.length,
    bush: byType.bush.length,
    grass: byType.grass.length,
    rock: byType.rock.length,
  });
  {
    const bySpecies: Record<string, number> = {};
    const byVariantIndex: Record<string, number> = {};
    for (const p of byType.tree) {
      const g = treeSpeciesGroup(p.variantIndex);
      bySpecies[g] = (bySpecies[g] ?? 0) + 1;
      const k = String(p.variantIndex);
      byVariantIndex[k] = (byVariantIndex[k] ?? 0) + 1;
    }
    console.log(TREE_LOG, "tree counts by species", bySpecies);
    console.log(TREE_LOG, "tree counts by variant index", byVariantIndex);
  }

  type MeshEntry = { type: PlantType; list: Placement[]; geometry: THREE.BufferGeometry; name: string; isTrunk?: boolean };
  const entries: MeshEntry[] = [];

  function addEntriesForType(type: PlantType): void {
    const list = byType[type];
    if (list.length === 0) return;

    const treesArr = options.geometries?.trees;
    const treeTrunkFoliageArr = options.geometries?.treeTrunkFoliage;
    const bushesArr = options.geometries?.bushes;
    const grassArr = options.geometries?.grass;
    const rocksArr = options.geometries?.rocks;

    if (type === "tree" && treeTrunkFoliageArr && treeTrunkFoliageArr.length > 0) {
      const firstLoadedTree = treeTrunkFoliageArr.find(
        (p): p is { trunk: THREE.BufferGeometry; foliage: THREE.BufferGeometry } =>
          p != null &&
          !!p.trunk.getAttribute("position") &&
          !!p.foliage.getAttribute("position")
      );
      const byVariant = new Map<number, Placement[]>();
      for (const p of list) {
        const v = p.variantIndex;
        if (!byVariant.has(v)) byVariant.set(v, []);
        byVariant.get(v)!.push(p);
      }
      let addedAnyTree = false;
      for (const [variantIndex, variantList] of byVariant) {
        /** Prefer exact treeUrls slot; if missing or empty verts, reuse first OK tree so placements aren't invisible. */
        let pair: { trunk: THREE.BufferGeometry; foliage: THREE.BufferGeometry } | undefined =
          treeTrunkFoliageArr[variantIndex];
        const ok =
          pair &&
          pair.trunk.getAttribute("position") &&
          pair.foliage.getAttribute("position");
        if (!ok) pair = firstLoadedTree;
        if (!pair || variantList.length === 0) continue;
        const { trunk, foliage } = pair;
        if (trunk.getAttribute("position") && foliage.getAttribute("position")) {
          entries.push({ type: "tree", list: variantList, geometry: trunk, name: `Vegetation-tree-v${variantIndex}-trunk`, isTrunk: true });
          entries.push({ type: "tree", list: variantList, geometry: foliage, name: `Vegetation-tree-v${variantIndex}-foliage` });
          addedAnyTree = true;
        }
      }
      if (addedAnyTree) return;
      console.warn(TREE_LOG, "tree trunk/foliage: no variant had geometry; falling back to placeholder cones", {
        placements: list.length,
        slots: treeTrunkFoliageArr.length,
      });
      /** fall through — same as no GLTF trees */
    }
    if (type === "tree" && treesArr && treesArr.length > 0) {
      const byVariant = new Map<number, Placement[]>();
      for (const p of list) {
        const v = p.variantIndex;
        if (!byVariant.has(v)) byVariant.set(v, []);
        byVariant.get(v)!.push(p);
      }
      for (const [variantIndex, variantList] of byVariant) {
        const geom = treesArr[variantIndex] ?? treesArr[variantIndex % treesArr.length];
        if (geom && variantList.length > 0)
          entries.push({ type: "tree", list: variantList, geometry: geom, name: `Vegetation-tree-v${variantIndex}` });
      }
      return;
    }
    if (type === "bush" && bushesArr && bushesArr.length > 0) {
      const byVariant = new Map<number, Placement[]>();
      for (const p of list) {
        const v = p.variantIndex;
        if (!byVariant.has(v)) byVariant.set(v, []);
        byVariant.get(v)!.push(p);
      }
      for (const [variantIndex, variantList] of byVariant) {
        const geom = bushesArr[variantIndex] ?? bushesArr[variantIndex % bushesArr.length];
        if (geom && variantList.length > 0)
          entries.push({ type: "bush", list: variantList, geometry: geom, name: `Vegetation-bush-v${variantIndex}` });
      }
      return;
    }
    if (type === "grass" && Array.isArray(grassArr) && grassArr.length > 0) {
      const byVariant = new Map<number, Placement[]>();
      for (const p of list) {
        const v = p.variantIndex;
        if (!byVariant.has(v)) byVariant.set(v, []);
        byVariant.get(v)!.push(p);
      }
      for (const [variantIndex, variantList] of byVariant) {
        const geom = grassArr[variantIndex] ?? grassArr[variantIndex % grassArr.length];
        if (geom && variantList.length > 0)
          entries.push({ type: "grass", list: variantList, geometry: geom, name: `Vegetation-grass-v${variantIndex}` });
      }
      return;
    }
    if (type === "rock" && rocksArr && rocksArr.length > 0) {
      const byVariant = new Map<number, Placement[]>();
      for (const p of list) {
        const v = p.variantIndex;
        if (!byVariant.has(v)) byVariant.set(v, []);
        byVariant.get(v)!.push(p);
      }
      for (const [variantIndex, variantList] of byVariant) {
        const geom = rocksArr[variantIndex] ?? rocksArr[variantIndex % rocksArr.length];
        if (geom && variantList.length > 0)
          entries.push({ type: "rock", list: variantList, geometry: geom, name: `Vegetation-rock-v${variantIndex}` });
      }
      return;
    }

    const useSplitTree =
      type === "tree" &&
      options.geometries?.treeTrunk != null &&
      options.geometries?.treeFoliage != null;

    if (useSplitTree) {
      entries.push({ type: "tree", list, geometry: options.geometries!.treeTrunk!, name: "Vegetation-tree-trunk", isTrunk: true });
      entries.push({ type: "tree", list, geometry: options.geometries!.treeFoliage!, name: "Vegetation-tree-foliage" });
      return;
    }

    const geom = options.geometries?.[type] ?? makePlaceholderGeometry(type);
    if (type === "tree") {
      console.log(TREE_LOG, "tree geometry source", options.geometries?.tree == null ? "PLACEHOLDER (cone)" : "loaded GLTF", {
        positionCount: geom.getAttribute("position")?.count ?? 0,
        indexCount: geom.index?.count ?? 0,
      });
    }
    entries.push({ type, list, geometry: geom, name: `Vegetation-${type}` });
  }

  addEntriesForType("tree");
  addEntriesForType("bush");
  addEntriesForType("grass");
  addEntriesForType("rock");

  const treeEntries = entries.filter((e) => e.type === "tree");
  console.log(TREE_LOG, "all entries", {
    total: entries.length,
    treeEntries: treeEntries.length,
    treePlacementSum: treeEntries.reduce((s, e) => s + e.list.length, 0),
  });
  if (treeEntries.length > 0 && treeEntries[0]!.list.length > 0) {
    const p0 = treeEntries[0]!.list[0]!;
    console.log(TREE_LOG, "first tree placement", {
      scale: p0.scale,
      position: [p0.position.x.toFixed(4), p0.position.y.toFixed(4), p0.position.z.toFixed(4)],
    });
  }

  const meshes: { mesh: THREE.InstancedMesh; placements: Placement[] }[] = [];
  const trunkBrown = 0x5c4033;

  for (const { type, list, geometry: geom, name, isTrunk } of entries) {
    const material = new THREE.MeshStandardMaterial({
      color: isTrunk ? trunkBrown : 0xffffff,
      flatShading: true,
    });
    const mesh = new THREE.InstancedMesh(geom, material, Math.min(list.length, maxInstances));
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.name = name;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if (!isTrunk) {
      mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(maxInstances * 3), 3);
      mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    }
    meshes.push({ mesh, placements: list });
    group.add(mesh);
  }

  const sortedIndices: number[] = [];
  const distSq = (a: THREE.Vector3, b: THREE.Vector3) =>
    a.distanceToSquared(b);

  let treeDrawLogFrames = 0;
  /** -1 so first increment → 0 and throttle (N=2) still runs on first frame. */
  let vegetationFrame = -1;
  function update(camera: THREE.Camera): void {
    vegetationFrame++;
    if (
      updateEveryNFrames > 1 &&
      vegetationFrame % updateEveryNFrames !== 0
    ) {
      return;
    }

    camera.getWorldPosition(_camPos);
    camera.getWorldQuaternion(_camQuatWorld);
    const timeKey = getDate ? Math.floor(getDate().getTime() / 60000) : 0;
    if (skipCullWhenCameraStable && hasStableCullSample) {
      if (
        timeKey === lastStableTimeKey &&
        _camPos.distanceToSquared(_lastStableCullPos) < cameraStablePosEpsSq &&
        Math.abs(_camQuatWorld.dot(_lastStableCullQuat)) > 1 - cameraStableQuatEps
      ) {
        return;
      }
    }

    if (hemisphereCull) _camUnit.copy(_camPos).normalize();
    const camDist = _camPos.length();
    const effectiveMaxDraw =
      orbitCamDist != null && camDist >= orbitCamDist
        ? orbitMaxDraw
        : maxDrawDistance;
    const maxSq = effectiveMaxDraw * effectiveMaxDraw;

    /** Tight orbit cull: no plant is within ~0.25 globe units of a camera at ~2.5+ — skip O(n) work. */
    if (
      orbitCamDist != null &&
      camDist >= orbitCamDist &&
      orbitMaxDraw <= 0.25
    ) {
      for (const { mesh } of meshes) {
        mesh.count = 0;
      }
      lastStableTimeKey = timeKey;
      _lastStableCullPos.copy(_camPos);
      _lastStableCullQuat.copy(_camQuatWorld);
      hasStableCullSample = true;
      return;
    }

    const treeDrawCounts: { name: string; inRange: number; drawCount: number }[] = [];

    for (const { mesh, placements: list } of meshes) {
      sortedIndices.length = 0;
      let inRangeCount = 0;
      const useHeapCull = list.length >= heapCullMinList;

      if (useHeapCull) {
        const heap = _distHeap;
        heap.length = 0;
        for (let i = 0; i < list.length; i++) {
          const pl = list[i]!;
          if (hemisphereCull) {
            const face =
              pl.position.x * _camUnit.x +
              pl.position.y * _camUnit.y +
              pl.position.z * _camUnit.z;
            if (face < hemisphereCullDot) continue;
          }
          const dSq = distSq(_camPos, pl.position);
          if (dSq > maxSq) continue;
          inRangeCount++;
          heapPushCap(heap, maxInstances, dSq, i);
        }
        heap.sort((a, b) => a.distSq - b.distSq);
        for (let h = 0; h < heap.length; h++) {
          sortedIndices.push(heap[h]!.idx);
        }
      } else {
        for (let i = 0; i < list.length; i++) {
          const pl = list[i]!;
          if (hemisphereCull) {
            const face =
              pl.position.x * _camUnit.x +
              pl.position.y * _camUnit.y +
              pl.position.z * _camUnit.z;
            if (face < hemisphereCullDot) continue;
          }
          const dSq = distSq(_camPos, pl.position);
          if (dSq <= maxSq) sortedIndices.push(i);
        }
        sortedIndices.sort(
          (a, b) =>
            distSq(_camPos, list[a]!.position) -
            distSq(_camPos, list[b]!.position),
        );
        inRangeCount = sortedIndices.length;
      }

      const drawCount = Math.min(sortedIndices.length, maxInstances);

      if (mesh.name?.includes("tree")) {
        treeDrawCounts.push({
          name: mesh.name,
          inRange: inRangeCount,
          drawCount,
        });
      }

      const isDeciduousFoliage =
        mesh.instanceColor != null &&
        list[0] != null &&
        list[0].type === "tree" &&
        isDeciduousVariant(list[0].variantIndex);
      const date = getDate?.();

      for (let k = 0; k < drawCount; k++) {
        const p = list[sortedIndices[k]!];
        _q.setFromUnitVectors(_treeUp, p.normal);
        const mul =
          p.type === "tree" ? (getTreeVariantScale?.(p.variantIndex) ?? 1) : 1;
        let s = p.scale * mul;
        let color: THREE.Color = p.color;

        if (date && isDeciduousFoliage && isDeciduousVariant(p.variantIndex)) {
          const phase = getSeasonPhase(date, p.latDeg);
          if (phase.isWinter) {
            s = 1e-7;
          } else if (phase.fallProgress > 0) {
            if (phase.fallProgress <= 0.4) {
              foliageSeasonScratch
                .copy(p.color)
                .lerpColors(p.color, fallYellow, phase.fallProgress / 0.4);
              color = foliageSeasonScratch;
            } else {
              foliageSeasonScratch
                .copy(fallYellow)
                .lerpColors(
                  fallYellow,
                  fallRed,
                  (phase.fallProgress - 0.4) / 0.6,
                );
              color = foliageSeasonScratch;
            }
          } else if (phase.isTropical && phase.dryFactor > 0) {
            foliageSeasonScratch
              .copy(p.color)
              .lerp(tropicalDryTint, phase.dryFactor * 0.4);
            color = foliageSeasonScratch;
          }
        }

        if (getTileWetness) {
          const w = getTileWetness(p.tileId);
          if (w > 0.03) {
            const tw = Math.min(1, w);
            wetScratch.copy(color).lerp(wetShine, tw * 0.3);
            color = wetScratch;
          }
        }

        if (getTileSnowCover && !mesh.name.includes("-trunk")) {
          const sn = getTileSnowCover(p.tileId);
          if (sn > 0.002) {
            color = snowTint;
          }
        }

        _mat.compose(p.position, _q, _s.set(s, s, s));
        mesh.setMatrixAt(k, _mat);
        if (mesh.instanceColor) mesh.setColorAt(k, color);
      }
      mesh.count = drawCount;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }

    if (treeDrawCounts.length > 0 && treeDrawLogFrames < 3) {
      console.log(TREE_LOG, "update tree drawCounts", treeDrawCounts);
      const treeEntry = meshes.find((m) => m.mesh.name?.includes("tree"));
      if (treeEntry && treeDrawLogFrames === 0) {
        const mesh = treeEntry.mesh;
        const list = treeEntry.placements;
        const firstPos = list[0]?.position;
        console.log(TREE_LOG, "tree mesh state", {
          visible: mesh.visible,
          layers: mesh.layers.mask,
          count: mesh.count,
          frustumCulled: mesh.frustumCulled,
          geometryVertices: mesh.geometry.getAttribute("position")?.count ?? 0,
          firstPlacementPosition: firstPos ? [firstPos.x.toFixed(4), firstPos.y.toFixed(4), firstPos.z.toFixed(4)] : null,
          cameraPosition: [_camPos.x.toFixed(4), _camPos.y.toFixed(4), _camPos.z.toFixed(4)],
          parentName: mesh.parent?.name ?? mesh.parent?.type ?? null,
          groupParent: (mesh.parent as THREE.Object3D)?.parent?.type ?? null,
        });
      }
      treeDrawLogFrames++;
    }

    lastStableTimeKey = timeKey;
    _lastStableCullPos.copy(_camPos);
    _lastStableCullQuat.copy(_camQuatWorld);
    hasStableCullSample = true;
  }

  function dispose(): void {
    for (const { mesh } of meshes) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
  }

  return { group, update, dispose };
}

function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}
