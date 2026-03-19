/**
 * Biome vegetation and rocks: place instanced low-poly plants and rocks by terrain type
 * with draw-distance culling. Up to 12 items per hex (biome-dependent), tiny scale.
 * Realistic mix: no grass in dense forests (canopy); rocks in mountains, desert, tundra;
 * grass dominant in grasslands/savanna. Only instances within maxDrawDistance are rendered.
 *
 * Pass in options.geometries: { tree, bush, grass, rock } (GLTF mesh geometry per type).
 */

import * as THREE from "three";
import type { Globe } from "polyglobe";
import type { TileTerrainData } from "polyglobe";
import {
  getTileTangentFrame,
  tilePlanePoint,
  tileMeanCornerRadius,
} from "polyglobe";

export type PlantType = "tree" | "bush" | "grass" | "rock";

export interface VegetationOptions {
  /** Max distance from camera to render plants (globe units). Default 2.5. */
  maxDrawDistance?: number;
  /** Globe radius + elevation scale (same as terrain). Default 0.08. */
  elevationScale?: number;
  /** Max plants per hex (0–12). Default 12. */
  maxPlantsPerHex?: number;
  /** Base instance scale so N plants fit spaciously on a hex. Default 0.2. */
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
  /** Optional: custom geometry per plant type; omit to use built-in placeholders. */
  geometries?: Partial<Record<PlantType, THREE.BufferGeometry>>;
}

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
}

const LAND_BIOMES = new Set<string>([
  "land",
  "forest",
  "grassland",
  "desert",
  "mountain",
  "snow",
  "swamp",
  "tropical_rainforest",
  "tropical_monsoon",
  "tropical_savanna",
  "hot_desert",
  "cold_desert",
  "hot_steppe",
  "cold_steppe",
  "mediterranean_hot",
  "mediterranean_warm",
  "humid_subtropical",
  "oceanic",
  "humid_continental",
  "warm_summer_humid",
  "tundra",
]);
const SKIP_BIOMES = new Set<string>(["water", "beach", "ice", "ice_cap"]);

/** Returns number of plants for this hex (0–max). Forests get many, desert very few. */
function getPlantCount(biome: string, maxPerHex: number, rnd: () => number): number {
  const cap = Math.max(0, Math.min(12, maxPerHex));
  if (biome === "forest" || biome === "tropical_rainforest" || biome === "tropical_monsoon") {
    return Math.floor(8 + rnd() * (cap - 7)); // 8–12
  }
  if (biome === "grassland" || biome === "tropical_savanna" || biome === "humid_subtropical" || biome === "swamp") {
    return Math.floor(4 + rnd() * 5); // 4–8
  }
  if (biome === "hot_steppe" || biome === "cold_steppe" || biome === "mediterranean_hot" || biome === "mediterranean_warm" || biome === "oceanic" || biome === "humid_continental" || biome === "warm_summer_humid") {
    return Math.floor(2 + rnd() * 5); // 2–6
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
  return Math.floor(rnd() * (cap + 1)); // 0–cap for land / unknown
}

/** Realistic mix: dense forest = no grass (canopy); grassland = grass dominant; desert/mountain = rocks. */
function getPlantType(biome: string, rnd: () => number): PlantType {
  const t = rnd();
  if (biome === "forest" || biome === "tropical_rainforest" || biome === "tropical_monsoon") {
    return t < 0.72 ? "tree" : "bush"; // Dense canopy — no grass
  }
  if (biome === "grassland" || biome === "humid_subtropical") {
    return t < 0.55 ? "grass" : t < 0.85 ? "bush" : "tree";
  }
  if (biome === "tropical_savanna") {
    return t < 0.5 ? "grass" : t < 0.78 ? "bush" : "tree";
  }
  if (biome === "hot_steppe" || biome === "cold_steppe") {
    return t < 0.58 ? "grass" : t < 0.88 ? "bush" : t < 0.95 ? "tree" : "rock";
  }
  if (biome === "desert" || biome === "hot_desert" || biome === "cold_desert") {
    return t < 0.5 ? "rock" : t < 0.8 ? "bush" : "grass"; // Sparse; few grass
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
  if (biome === "mediterranean_hot" || biome === "mediterranean_warm") {
    return t < 0.4 ? "grass" : t < 0.75 ? "bush" : "tree";
  }
  if (biome === "oceanic" || biome === "humid_continental" || biome === "warm_summer_humid") {
    return t < 0.4 ? "grass" : t < 0.72 ? "bush" : "tree";
  }
  return t < 0.35 ? "tree" : t < 0.68 ? "grass" : t < 0.92 ? "bush" : "rock";
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
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _mat = new THREE.Matrix4();
const _positionOut = new THREE.Vector3();

export function createVegetationLayer(
  globe: Globe,
  tileTerrain: Map<number, TileTerrainData>,
  options: VegetationOptions = {}
): {
  group: THREE.Group;
  update: (camera: THREE.Camera) => void;
  dispose: () => void;
} {
  const maxDrawDistance = options.maxDrawDistance ?? 2.5;
  const elevationScale = options.elevationScale ?? 0.08;
  const maxPlantsPerHex = Math.max(0, Math.min(12, options.maxPlantsPerHex ?? 12));
  const baseScale = options.baseScale ?? 0.2;
  const maxInstances = options.maxInstancesPerType ?? 2048;
  const hillyBumpHeight = options.hillyBumpHeight ?? 0.003;
  const getPeak = options.getPeak;
  const peakElevationScale = options.peakElevationScale ?? 0.00002;
  const radius = globe.radius;

  const placements: Placement[] = [];
  const rnd = seededRandom(42);

  for (const tile of globe.tiles) {
    const data = tileTerrain.get(tile.id);
    if (!data) continue;
    const typeStr = data.type;
    if (SKIP_BIOMES.has(typeStr)) continue;
    if (!LAND_BIOMES.has(typeStr) && typeStr !== "mountain" && typeStr !== "snow") continue;

    const count = getPlantCount(typeStr, maxPlantsPerHex, rnd);
    if (count <= 0) continue;

    const elev = (data.elevation ?? 0) * elevationScale;
    const r = radius + elev;
    const frame = getTileTangentFrame(tile);
    const meanRadius = tileMeanCornerRadius(frame);
    const jitterRadius = 0.42 * meanRadius;

    const isHilly = data.isHilly ?? false;
    const peak = getPeak?.(tile.id);
    const peakApexM = peak?.apexElevationM;
    for (let i = 0; i < count; i++) {
      const angle = rnd() * Math.PI * 2;
      const rad = Math.sqrt(rnd()) * jitterRadius;
      const lx = rad * Math.cos(angle);
      const ly = rad * Math.sin(angle);
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
      placements.push({ position, normal, scale, type: plantType });
    }
  }

  const group = new THREE.Group();
  group.name = "Vegetation";

  const byType: Record<PlantType, Placement[]> = { tree: [], bush: [], grass: [], rock: [] };
  for (const p of placements) {
    byType[p.type].push(p);
  }

  const meshes: { mesh: THREE.InstancedMesh; placements: Placement[] }[] = [];
  const types: PlantType[] = ["tree", "bush", "grass", "rock"];

  for (const type of types) {
    const list = byType[type];
    if (list.length === 0) continue;
    const geom = options.geometries?.[type] ?? makePlaceholderGeometry(type);
    const material = new THREE.MeshStandardMaterial({
      color:
        type === "tree"
          ? 0x2d5016
          : type === "bush"
            ? 0x3d6b1a
            : type === "grass"
              ? 0x4a7c23
              : 0x5c5c5c,
      flatShading: true,
    });
    const mesh = new THREE.InstancedMesh(geom, material, Math.min(list.length, maxInstances));
    mesh.count = 0;
    mesh.frustumCulled = true;
    mesh.name = `Vegetation-${type}`;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    meshes.push({ mesh, placements: list });
    group.add(mesh);
  }

  const sortedIndices: number[] = [];
  const distSq = (a: THREE.Vector3, b: THREE.Vector3) =>
    a.distanceToSquared(b);

  function update(camera: THREE.Camera): void {
    camera.getWorldPosition(_camPos);
    const maxSq = maxDrawDistance * maxDrawDistance;

    for (const { mesh, placements: list } of meshes) {
      sortedIndices.length = 0;
      for (let i = 0; i < list.length; i++) {
        const dSq = distSq(_camPos, list[i].position);
        if (dSq <= maxSq) sortedIndices.push(i);
      }
      sortedIndices.sort(
        (a, b) =>
          distSq(_camPos, list[a].position) - distSq(_camPos, list[b].position)
      );
      const drawCount = Math.min(sortedIndices.length, maxInstances);

      for (let k = 0; k < drawCount; k++) {
        const p = list[sortedIndices[k]!];
        _q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p.normal);
        _mat.compose(p.position, _q, _s.set(p.scale, p.scale, p.scale));
        mesh.setMatrixAt(k, _mat);
      }
      mesh.count = drawCount;
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  update({ getWorldPosition: (v: THREE.Vector3) => v.set(0, 0, 2.8) } as THREE.Camera);

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
