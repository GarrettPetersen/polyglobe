/**
 * Puffy clouds: distinct cloud puffs over groups of hexes in high-precipitation regions.
 */

import * as THREE from "three";
import type { Globe } from "../core/Globe.js";
import { tileCenterToLatLon } from "../earth/earthSampling.js";
import {
  marchingCubes,
  smoothMax,
  smoothUnionSdf,
  type SphereSdf,
} from "./marchingCubes.js";

function seededRandom(seed: number): () => number {
  return function next() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
}

export interface PuffyCloudOptions {
  /** Height above tile center in globe units. Default 0.08 */
  heightOffset?: number;
  /** Min precip (0–1) to place a cloud in a cell. Default 0.2 */
  minPrecip?: number;
  /** Grid cell size in degrees (lon and lat). Larger = fewer, more spread clouds. Default 8 */
  gridDeg?: number;
  /** Base puff size (half-width) in globe units. Default 0.09 */
  puffSize?: number;
  /** Random size scale range [min, max]. Default [0.8, 1.4] */
  sizeScaleRange?: [number, number];
  /** Opacity. Default 0.5 */
  opacity?: number;
  /** Seed for reproducible placement/size. Default 44444 */
  seed?: number;
}

const DEFAULT_OPTIONS: Required<PuffyCloudOptions> = {
  heightOffset: 0.08,
  minPrecip: 0.2,
  gridDeg: 8,
  puffSize: 0.09,
  sizeScaleRange: [0.8, 1.4],
  opacity: 0.5,
  seed: 44444,
};

/** Soft circular puff texture (white with radial alpha falloff). */
function createPuffTexture(size: number = 64): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const r = size / 2;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, "rgba(255,255,255,0.85)");
  g.addColorStop(0.4, "rgba(255,255,255,0.5)");
  g.addColorStop(0.7, "rgba(255,255,255,0.15)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Select tile IDs for cloud placement: one cloud per grid cell where max precip in cell exceeds threshold.
 */
function selectCloudTiles(
  globe: Globe,
  precipByTile: Map<number, number>,
  minPrecip: number,
  gridDeg: number,
  seed: number
): number[] {
  const rng = seededRandom(seed);
  type CellKey = string;
  const cellToTiles = new Map<CellKey, { tileId: number; precip: number }[]>();

  for (const tile of globe.tiles) {
    const precip = precipByTile.get(tile.id) ?? 0;
    if (precip < minPrecip) continue;
    const { lat, lon } = tileCenterToLatLon(tile.center);
    const latDeg = (lat * 180) / Math.PI;
    const lonDeg = (lon * 180) / Math.PI;
    const ci = Math.floor(lonDeg / gridDeg);
    const cj = Math.floor(latDeg / gridDeg);
    const key: CellKey = `${ci},${cj}`;
    let list = cellToTiles.get(key);
    if (!list) {
      list = [];
      cellToTiles.set(key, list);
    }
    list.push({ tileId: tile.id, precip });
  }

  const out: number[] = [];
  for (const list of cellToTiles.values()) {
    if (list.length === 0) continue;
    list.sort((a, b) => b.precip - a.precip);
    const chosen = list[Math.floor(rng() * Math.min(3, list.length))];
    out.push(chosen.tileId);
  }
  return out;
}

/** Max hexes per small cluster (1–2 cells). */
const MAX_TILES_SMALL = 48;
/** Max hexes for largest blobs (continent-scale). */
const MAX_TILES_LARGE = 520;
/** Power-law exponent: smaller = more large blobs. 1.8 gives many small, few huge. */
const POWER_LAW_ALPHA = 1.8;
/** Max grid cells to merge for one blob (continent-sized when ~40–50). */
const MAX_CELLS_PER_BLOB = 52;

/** Latitude (degrees) above which we use a lower precip threshold so poles get clouds. */
const POLAR_LAT_DEG = 62;
/** Min precip for polar tiles so we still place clouds near poles. */
const POLAR_MIN_PRECIP = 0.05;

const NEIGHBOR_OFFSETS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [-1, -1],
  [1, -1],
  [-1, 1],
];

/**
 * Select hex clusters for low-poly clouds: patchy placement with both small/medium
 * clusters and occasional large "full cloud cover" systems. Clouds extend to poles.
 * Returns one array of tile IDs per cloud.
 */
function selectHexClusters(
  globe: Globe,
  precipByTile: Map<number, number>,
  minPrecip: number,
  gridDeg: number,
  seed: number
): number[][] {
  const rng = seededRandom(seed);
  type CellKey = string;
  const cellToTiles = new Map<CellKey, { tileId: number; precip: number }[]>();

  for (const tile of globe.tiles) {
    const precip = precipByTile.get(tile.id) ?? 0;
    const { lat, lon } = tileCenterToLatLon(tile.center);
    const latDeg = (lat * 180) / Math.PI;
    const effectiveMin = Math.abs(latDeg) >= POLAR_LAT_DEG ? POLAR_MIN_PRECIP : minPrecip;
    if (precip < effectiveMin) continue;
    const lonDeg = (lon * 180) / Math.PI;
    const ci = Math.floor(lonDeg / gridDeg);
    const cj = Math.floor(latDeg / gridDeg);
    const key: CellKey = `${ci},${cj}`;
    let list = cellToTiles.get(key);
    if (!list) {
      list = [];
      cellToTiles.set(key, list);
    }
    list.push({ tileId: tile.id, precip });
  }

  const keys = [...cellToTiles.keys()];
  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [keys[i], keys[j]] = [keys[j], keys[i]];
  }

  const consumed = new Set<CellKey>();
  const clusters: number[][] = [];

  for (const key of keys) {
    if (consumed.has(key)) continue;
    const list = cellToTiles.get(key)!;
    if (list.length === 0) continue;

    if (rng() > 0.42) continue;

    const u = Math.max(0.002, 1 - rng());
    const targetCells = Math.min(
      MAX_CELLS_PER_BLOB,
      Math.max(1, Math.floor(Math.pow(u, -1 / POWER_LAW_ALPHA) * 3.8))
    );
    const maxTiles =
      targetCells <= 2
        ? MAX_TILES_SMALL
        : Math.min(MAX_TILES_LARGE, 50 + targetCells * 10);

    const clusterCells: CellKey[] = [key];
    consumed.add(key);
    let combined = [...list];

    while (clusterCells.length < targetCells) {
      const candidates: CellKey[] = [];
      for (const k of clusterCells) {
        const [ii, jj] = k.split(",").map(Number);
        for (const [di, dj] of NEIGHBOR_OFFSETS) {
          const nk: CellKey = `${ii + di},${jj + dj}`;
          if (cellToTiles.has(nk) && !consumed.has(nk) && cellToTiles.get(nk)!.length > 0) {
            candidates.push(nk);
          }
        }
      }
      const unique = [...new Set(candidates)];
      if (unique.length === 0) break;
      const chosen = unique[Math.floor(rng() * unique.length)];
      consumed.add(chosen);
      clusterCells.push(chosen);
      combined = [...combined, ...cellToTiles.get(chosen)!];
    }

    combined.sort((a, b) => b.precip - a.precip);
    const tileIds = combined
      .slice(0, maxTiles)
      .map((x) => x.tileId);
    clusters.push(tileIds);
  }

  return clusters;
}

/**
 * Pose above a cluster: centroid of tile centers (on sphere), raised by heightOffset.
 */
function getClusterPose(
  globe: Globe,
  tileIds: number[],
  heightOffset: number
): { position: THREE.Vector3; up: THREE.Vector3 } {
  const sum = new THREE.Vector3(0, 0, 0);
  for (const id of tileIds) {
    const pos = globe.getTileCenter(id);
    if (pos) sum.add(pos);
  }
  sum.divideScalar(tileIds.length);
  const up = sum.clone().normalize();
  const position = up.clone().multiplyScalar(globe.radius + heightOffset);
  return { position, up };
}

/**
 * Create a group of puffy clouds: instanced quads over selected hex groups (high-precip grid cells).
 */
export function createPuffyClouds(
  globe: Globe,
  precipByTile: Map<number, number>,
  options: PuffyCloudOptions = {}
): THREE.Group {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const rng = seededRandom(opts.seed + 1);
  const tileIds = selectCloudTiles(
    globe,
    precipByTile,
    opts.minPrecip,
    opts.gridDeg,
    opts.seed
  );
  if (tileIds.length === 0) {
    const group = new THREE.Group();
    group.name = "PuffyClouds";
    return group;
  }

  const group = new THREE.Group();
  group.name = "PuffyClouds";
  const [sizeMin, sizeMax] = opts.sizeScaleRange;
  const plane = new THREE.PlaneGeometry(1, 1, 1, 1);
  const tex = createPuffTexture(64);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity: opts.opacity,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.InstancedMesh(plane, mat, tileIds.length);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(mesh);

  const dummy = new THREE.Object3D();
  const worldUp = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i < tileIds.length; i++) {
    const tileId = tileIds[i];
    const pose = globe.getTilePose(tileId);
    if (!pose) continue;
    const { position, up } = pose;
    dummy.position.copy(position).add(up.clone().multiplyScalar(opts.heightOffset));
    const east = new THREE.Vector3().crossVectors(worldUp, up).normalize();
    if (east.lengthSq() < 1e-6) east.set(1, 0, 0).cross(up).normalize();
    dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), up);
    const scale = opts.puffSize * 2 * (sizeMin + (sizeMax - sizeMin) * rng());
    dummy.scale.set(scale, scale, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.count = tileIds.length;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.renderOrder = 5;

  return group;
}

/** Same layout as original multi-puff cloud but returns sphere list for SDF + marching cubes. */
function collectCloudSpheres(
  rng: () => number,
  baseScale: number,
  flatDeck: boolean
): SphereSdf[] {
  const spheres: SphereSdf[] = [];
  const baseCount = flatDeck
    ? 6 + Math.floor(rng() * 8)
    : 4 + Math.floor(rng() * 4);
  const baseY = flatDeck ? -0.06 * baseScale : -0.08 * baseScale;
  const radiusMin = flatDeck ? 0.5 : 0.35;
  const radiusMax = flatDeck ? 1.1 : 0.75;
  const baseScaleXZ = baseScale * (flatDeck ? 0.42 : 0.5) * (0.85 + rng() * 0.3);
  const baseScaleY = baseScale * (flatDeck ? 0.08 : 0.1) * (0.75 + rng() * 0.35);

  for (let i = 0; i < baseCount; i++) {
    const angle = (i / baseCount) * Math.PI * 2 + rng() * 0.8;
    const r = baseScale * (radiusMin + (radiusMax - radiusMin) * rng());
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const sx = baseScaleXZ * (0.85 + rng() * 0.3);
    const sy = baseScaleY;
    const sz = baseScaleXZ * (0.85 + rng() * 0.3);
    spheres.push({ x, y: baseY, z, radius: (sx + sy + sz) / 3 });
  }

  if (flatDeck) {
    const fluffCount = 3 + Math.floor(rng() * 4);
    const fluffY = 0.01 * baseScale;
    for (let i = 0; i < fluffCount; i++) {
      const angle = rng() * Math.PI * 2;
      const r = baseScale * (0.3 + rng() * 0.7);
      const s = baseScale * 0.18 * (0.7 + rng() * 0.6);
      spheres.push({
        x: Math.cos(angle) * r,
        y: fluffY,
        z: Math.sin(angle) * r,
        radius: s * 0.97,
      });
    }
    return spheres;
  }

  const topCount = 2 + Math.floor(rng() * 2);
  const topY = 0.02 * baseScale;
  for (let i = 0; i < topCount; i++) {
    const angle = (i / topCount) * Math.PI * 2 + rng() * 0.6;
    const r = 0.35 * baseScale * (0.6 + rng() * 0.8);
    const sx = 0.38 * baseScale * (0.9 + rng() * 0.25);
    const sy = 0.28 * baseScale * (0.85 + rng() * 0.35);
    spheres.push({
      x: Math.cos(angle) * r,
      y: topY,
      z: Math.sin(angle) * r,
      radius: (sx + sy + sx) / 3,
    });
  }

  const fluffCount = 8 + Math.floor(rng() * 6);
  for (let i = 0; i < fluffCount; i++) {
    const angle = rng() * Math.PI * 2;
    const r = baseScale * (0.25 + rng() * 0.85);
    const yFrac = 0.3 + rng() * 0.7;
    const fluffY = topY * 0.3 + yFrac * (topY * 1.4);
    const s = baseScale * 0.2 * (0.6 + rng() * 0.7);
    spheres.push({
      x: Math.cos(angle) * r,
      y: fluffY,
      z: Math.sin(angle) * r,
      radius: s,
    });
  }
  // Extra small bulbs on top for bulbous cumulus cauliflower
  const topBulbCount = 6 + Math.floor(rng() * 6);
  const topBulbY = topY * 1.2 + baseScale * 0.015 * (0.5 + rng());
  for (let i = 0; i < topBulbCount; i++) {
    const angle = rng() * Math.PI * 2;
    const r = baseScale * (0.2 + rng() * 0.6);
    const bulbY = topBulbY + baseScale * 0.02 * rng();
    const s = baseScale * 0.14 * (0.7 + rng() * 0.6);
    spheres.push({
      x: Math.cos(angle) * r,
      y: bulbY,
      z: Math.sin(angle) * r,
      radius: s,
    });
  }
  return spheres;
}

/** Default SDF marching-cubes resolution per axis (was 20; lower = faster, blockier, good for stylized look). */
export const DEFAULT_CLOUD_SDF_GRID_RES = 16;
const SDF_SMOOTH_K = 0.12;

/**
 * Earth-centered sphere (world space) subtracted from the cloud SDF so the underside follows the
 * globe instead of a round blob “dangling” below the shell.
 */
interface CloudGlobeBottomClip {
  worldPos: THREE.Vector3;
  worldQuat: THREE.Quaternion;
  /** Remove volume with ||p_world|| < shellRadius (typically ≈ anchor distance from origin). */
  shellRadius: number;
  /** 0 = hard cut; small positive = slightly soft junction. */
  smoothK: number;
}

const _clipWorld = new THREE.Vector3();

/**
 * Build a single cloud as one mesh from smooth SDF union + marching cubes (low-poly blob).
 */
function createSingleCumulusCloudSdf(
  rng: () => number,
  baseScale: number,
  opacity: number,
  flatDeck: boolean,
  globeBottomClip: CloudGlobeBottomClip | null,
  receiveShadow: boolean,
  castShadow: boolean,
  marchingCubesGridRes: number,
): THREE.Group {
  const gridN = Math.max(
    8,
    Math.min(32, Math.round(marchingCubesGridRes)),
  );
  const spheres = collectCloudSpheres(rng, baseScale, flatDeck);
  if (spheres.length === 0) {
    const g = new THREE.Group();
    return g;
  }

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const s of spheres) {
    minX = Math.min(minX, s.x - s.radius);
    minY = Math.min(minY, s.y - s.radius);
    minZ = Math.min(minZ, s.z - s.radius);
    maxX = Math.max(maxX, s.x + s.radius);
    maxY = Math.max(maxY, s.y + s.radius);
    maxZ = Math.max(maxZ, s.z + s.radius);
  }
  const pad = baseScale * 0.15;
  minX -= pad; minY -= pad; minZ -= pad;
  maxX += pad; maxY += pad; maxZ += pad;

  const unionSdf = smoothUnionSdf(spheres, baseScale * SDF_SMOOTH_K);
  const sdf =
    globeBottomClip === null
      ? unionSdf
      : (x: number, y: number, z: number) => {
          const dCloud = unionSdf(x, y, z);
          _clipWorld
            .set(x, y, z)
            .applyQuaternion(globeBottomClip.worldQuat)
            .add(globeBottomClip.worldPos);
          const dGlobe = _clipWorld.length() - globeBottomClip.shellRadius;
          const k = globeBottomClip.smoothK;
          if (k <= 1e-12) {
            return Math.max(dCloud, -dGlobe);
          }
          return smoothMax(dCloud, -dGlobe, k);
        };

  const geom = marchingCubes(
    sdf,
    minX, minY, minZ,
    maxX, maxY, maxZ,
    gridN,
    { isoLevel: 0 }
  );
  const posAttr = geom.getAttribute("position") as THREE.BufferAttribute | undefined;
  if (!posAttr || posAttr.count === 0) {
    geom.dispose();
    return new THREE.Group();
  }
  const mat = new THREE.MeshStandardMaterial({
    color: 0xe5e8ec,
    transparent: true,
    opacity,
    depthTest: true,
    depthWrite: true,
    flatShading: true,
    roughness: 1.0,
    metalness: 0.0,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.receiveShadow = receiveShadow;
  mesh.castShadow = castShadow;

  const cloudGroup = new THREE.Group();
  cloudGroup.add(mesh);
  return cloudGroup;
}

export interface LowPolyCloudOptions {
  /** Height above cluster centroid in globe units. Default 0.04 (low altitude). */
  heightOffset?: number;
  /** Min precip (0–1) to place a cloud in a cell. Default 0.2 */
  minPrecip?: number;
  /** Grid cell size in degrees. Larger = fewer, more spread clouds. Default 8 */
  gridDeg?: number;
  /** Base cloud size (scale of puffs). Default 0.032 — small relative to globe radius 1. */
  cloudScale?: number;
  /** Random scale range [min, max]. Default [0.75, 1.35] */
  sizeScaleRange?: [number, number];
  /** Opacity. Default 0.92 — high so overlapping puffs read as one mass (union). */
  opacity?: number;
  /** Seed for reproducible placement. Default 44444 */
  seed?: number;
  /** If true, each cloud casts a diffuse shadow via one proxy mesh (good performance). Default true. */
  castShadows?: boolean;
  /**
   * Subtract an Earth-centered sphere (through the cloud anchor on the shell) so bottoms are capped
   * by the globe instead of smooth SDF bulbs below the layer.
   */
  clipBottomToGlobe?: boolean;
  /** Added to the clip sphere radius (globe units). Positive = larger sphere = more underside removed. Default 0. */
  clipGlobeShellRadiusOffset?: number;
  /** Softness at the spherical cut; 0 = hard difference. Default 0. */
  clipGlobeSmoothK?: number;
  /**
   * Marching-cubes grid resolution per axis (~O(n³) SDF samples). Typical 12–20; default
   * {@link DEFAULT_CLOUD_SDF_GRID_RES}.
   */
  marchingCubesGridRes?: number;
}

const LOW_POLY_CLOUD_DEFAULTS: Required<LowPolyCloudOptions> = {
  heightOffset: 0.04,
  minPrecip: 0.2,
  gridDeg: 8,
  cloudScale: 0.032,
  sizeScaleRange: [0.75, 1.35],
  opacity: 0.92,
  seed: 44444,
  castShadows: true,
  clipBottomToGlobe: true,
  clipGlobeShellRadiusOffset: 0,
  clipGlobeSmoothK: 0,
  marchingCubesGridRes: DEFAULT_CLOUD_SDF_GRID_RES,
};

/** Layer for shadow-proxy meshes (kept for API compatibility; proxies now use layer 0 so they are always in the shadow map). */
export const CLOUD_SHADOW_LAYER = 1;

/**
 * Add one shadow-proxy mesh to a cloud group (flat disc-like) and disable shadow casting on puffs.
 * Proxy stays on layer 0 with transparent opacity and no depth write so it is always included in
 * the shadow map and does not occlude clouds in the main view.
 */
function addShadowProxy(cloudGroup: THREE.Group, scale: number, flatDeck: boolean): void {
  const radius = scale * (flatDeck ? 2.2 : 1.8);
  const height = scale * 0.22;
  const geom = new THREE.CylinderGeometry(radius, radius * 1.05, height, 12);
  const mat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.001,
    depthWrite: false,
  });
  const proxy = new THREE.Mesh(geom, mat);
  proxy.name = "CloudShadowProxy";
  proxy.castShadow = true;
  proxy.receiveShadow = false;
  proxy.visible = true;
  proxy.layers.set(0);
  cloudGroup.add(proxy);
  cloudGroup.traverse((child) => {
    if (child !== proxy && child instanceof THREE.Mesh) {
      child.castShadow = false;
    }
  });
}

/** One simulated cloud instance for mesh sync (see {@link createLowPolyCloudGroupAtAnchor}). */
export interface SimCloudVisualSpec {
  /** Unit outward anchor from globe center (world space). */
  anchor: THREE.Vector3;
  /** Visual size scale (globe-relative). */
  scale: number;
  /** Seeded appearance (SDF puff layout). */
  meshSeed: number;
  /** Larger masses use flatter deck puffs. */
  flatDeck: boolean;
}

/**
 * Build one low-poly marching-cubes cloud at a world anchor (for simulated clouds).
 * Caller sets `group.position`/`quaternion` to identity if anchor already encodes shell position via this helper placing geometry in local space — here we match {@link createLowPolyClouds}: mesh is in group local space with group at shell position.
 */
export function createLowPolyCloudGroupAtAnchor(
  globe: Globe,
  spec: SimCloudVisualSpec,
  options: Pick<
    LowPolyCloudOptions,
    | "heightOffset"
    | "opacity"
    | "castShadows"
    | "clipBottomToGlobe"
    | "clipGlobeShellRadiusOffset"
    | "clipGlobeSmoothK"
    | "marchingCubesGridRes"
  > = {}
): THREE.Group {
  const heightOffset = options.heightOffset ?? LOW_POLY_CLOUD_DEFAULTS.heightOffset;
  const opacity = options.opacity ?? LOW_POLY_CLOUD_DEFAULTS.opacity;
  const castShadows = options.castShadows ?? LOW_POLY_CLOUD_DEFAULTS.castShadows;
  const clipBottomToGlobe = options.clipBottomToGlobe ?? LOW_POLY_CLOUD_DEFAULTS.clipBottomToGlobe;
  const clipGlobeShellRadiusOffset =
    options.clipGlobeShellRadiusOffset ?? LOW_POLY_CLOUD_DEFAULTS.clipGlobeShellRadiusOffset;
  const clipGlobeSmoothK = options.clipGlobeSmoothK ?? LOW_POLY_CLOUD_DEFAULTS.clipGlobeSmoothK;
  const marchingCubesGridRes =
    options.marchingCubesGridRes ?? LOW_POLY_CLOUD_DEFAULTS.marchingCubesGridRes;

  const worldUp = new THREE.Vector3(0, 1, 0);
  const up = spec.anchor.clone().normalize();
  const position = up.clone().multiplyScalar(globe.radius + heightOffset);
  const quat = new THREE.Quaternion().setFromUnitVectors(worldUp, up);
  const shellR = position.length() + clipGlobeShellRadiusOffset;
  const globeBottomClip: CloudGlobeBottomClip | null = clipBottomToGlobe
    ? {
        worldPos: position.clone(),
        worldQuat: quat.clone(),
        shellRadius: shellR,
        smoothK: clipGlobeSmoothK,
      }
    : null;

  const rng = seededRandom(spec.meshSeed >>> 0);
  const cloud = createSingleCumulusCloudSdf(
    rng,
    spec.scale,
    opacity,
    spec.flatDeck,
    globeBottomClip,
    castShadows,
    castShadows,
    marchingCubesGridRes,
  );
  if (castShadows) {
    addShadowProxy(cloud, spec.scale, spec.flatDeck);
  }
  cloud.traverse((c) => {
    if (c instanceof THREE.Mesh && c.name !== "CloudShadowProxy") {
      c.castShadow = castShadows;
    }
  });
  cloud.position.copy(position);
  cloud.quaternion.copy(quat);
  cloud.renderOrder = 5;
  return cloud;
}

const _shellTwistQuat = new THREE.Quaternion();

/** Move an existing low-poly cloud group to a new shell anchor without rebuilding marching cubes. */
export function setLowPolyCloudGroupShellPose(
  globe: Globe,
  group: THREE.Object3D,
  anchor: THREE.Vector3,
  heightOffset = LOW_POLY_CLOUD_DEFAULTS.heightOffset,
  /** Roll (rad) about the outward radial through the anchor; 0 = default “pole-up” orientation only. */
  radialTwistRad = 0
): void {
  const worldUp = new THREE.Vector3(0, 1, 0);
  const up = anchor.clone().normalize();
  const position = up.clone().multiplyScalar(globe.radius + heightOffset);
  group.position.copy(position);
  group.quaternion.setFromUnitVectors(worldUp, up);
  if (Math.abs(radialTwistRad) > 1e-8) {
    _shellTwistQuat.setFromAxisAngle(up, radialTwistRad);
    group.quaternion.multiply(_shellTwistQuat);
  }
}

/**
 * Adjust marching-cubes shell scale and material opacity without rebuilding geometry.
 * `builtReferenceScale` is the `spec.scale` used when the mesh was created; `targetScale` is the desired world scale.
 */
export function updateLowPolyCloudGroupVisualScaleOpacity(
  group: THREE.Object3D,
  builtReferenceScale: number,
  targetScale: number,
  opacity: number
): void {
  const k = builtReferenceScale > 1e-10 ? targetScale / builtReferenceScale : 1;
  group.scale.setScalar(k);
  group.traverse((ch) => {
    if (
      ch instanceof THREE.Mesh &&
      ch.name !== "CloudShadowProxy" &&
      ch.material instanceof THREE.MeshStandardMaterial
    ) {
      ch.material.opacity = opacity;
    }
  });
}

const _hemiNight = new THREE.Color();
const _hemiDay = new THREE.Color();
const _hemiOut = new THREE.Color();

export interface LowPolyCloudHemisphereShadeOptions {
  /** Lit-side base (hex). Default low-poly cumulus gray. */
  dayColor?: THREE.ColorRepresentation;
  /** Unlit side (hex). Default darker gray. */
  nightColor?: THREE.ColorRepresentation;
  /** `dot(outward, sunDir)` at or below this → full night color. */
  terminatorDark?: number;
  /** `dot` at or above this → full day color. */
  terminatorLight?: number;
}

/**
 * Lit-side / night-side terminator tint for low-poly clouds (same model as
 * {@link updateLowPolyCloudGroupHemisphereShade}).
 */
export function computeLowPolyCloudHemisphereColor(
  outwardUnit: THREE.Vector3,
  sunDirUnit: THREE.Vector3,
  target: THREE.Color,
  opts?: LowPolyCloudHemisphereShadeOptions
): void {
  const tDark = opts?.terminatorDark ?? -0.14;
  const tLight = opts?.terminatorLight ?? 0.1;
  const dot = outwardUnit.dot(sunDirUnit);
  const span = Math.max(1e-5, tLight - tDark);
  const u = THREE.MathUtils.clamp((dot - tDark) / span, 0, 1);
  _hemiDay.set(opts?.dayColor ?? 0xe5e8ec);
  _hemiNight.set(opts?.nightColor ?? 0x3a424c);
  target.copy(_hemiNight).lerp(_hemiDay, u);
}

/**
 * Fake terminator without shadow maps: outward is unit vector from planet center through the cloud
 * shell; sunDir is unit vector from planet center toward the sun (same frame as scene lighting).
 */
export function updateLowPolyCloudGroupHemisphereShade(
  group: THREE.Object3D,
  outwardUnit: THREE.Vector3,
  sunDirUnit: THREE.Vector3,
  opts?: LowPolyCloudHemisphereShadeOptions,
): void {
  computeLowPolyCloudHemisphereColor(outwardUnit, sunDirUnit, _hemiOut, opts);
  group.traverse((ch) => {
    if (
      ch instanceof THREE.Mesh &&
      ch.name !== "CloudShadowProxy" &&
      ch.material instanceof THREE.MeshStandardMaterial
    ) {
      ch.material.color.copy(_hemiOut);
    }
  });
}

const _instProtoColor = new THREE.Color(0xffffff);

/**
 * Build one marching-cubes cloud mesh for {@link THREE.InstancedMesh} (geometry + material clones).
 * Geometry matches {@link createLowPolyCloudGroupAtAnchor} at the given spec (pole anchor for a
 * neutral globe clip). Caller owns lifecycle disposal.
 */
export function createLowPolyCloudInstancedPrototype(
  globe: Globe,
  spec: SimCloudVisualSpec,
  options: {
    marchingCubesGridRes: number;
    castShadows: boolean;
    opacity: number;
    heightOffset?: number;
  }
): { geometry: THREE.BufferGeometry; material: THREE.MeshStandardMaterial } {
  const heightOffset = options.heightOffset ?? LOW_POLY_CLOUD_DEFAULTS.heightOffset;
  const temp = createLowPolyCloudGroupAtAnchor(globe, spec, {
    opacity: options.opacity,
    castShadows: options.castShadows,
    clipBottomToGlobe: true,
    heightOffset,
    marchingCubesGridRes: options.marchingCubesGridRes,
  });
  let foundGeom: THREE.BufferGeometry | undefined;
  let foundMat: THREE.MeshStandardMaterial | undefined;
  temp.traverse((ch) => {
    if (
      ch instanceof THREE.Mesh &&
      ch.name !== "CloudShadowProxy" &&
      foundGeom === undefined &&
      ch.material instanceof THREE.MeshStandardMaterial
    ) {
      foundGeom = ch.geometry as THREE.BufferGeometry;
      foundMat = ch.material;
    }
  });
  if (!foundGeom || !foundMat) {
    temp.traverse((ch) => {
      if (ch instanceof THREE.Mesh) {
        ch.geometry.dispose();
        if (ch.material instanceof THREE.Material) ch.material.dispose();
      }
    });
    return {
      geometry: new THREE.BufferGeometry(),
      material: new THREE.MeshStandardMaterial({
        color: 0xe5e8ec,
        transparent: true,
        opacity: options.opacity,
        depthTest: true,
        depthWrite: true,
        flatShading: true,
        roughness: 1,
        metalness: 0,
      }),
    };
  }
  const geometry = foundGeom.clone();
  const material = foundMat.clone();
  material.color.copy(_instProtoColor);
  temp.traverse((ch) => {
    if (ch instanceof THREE.Mesh) {
      ch.geometry.dispose();
      if (ch.material instanceof THREE.Material) ch.material.dispose();
    }
  });
  return { geometry, material };
}

/**
 * Create low-poly cumulus clouds: each cloud is a group of stretched icospheres
 * (flat bottom + top puffs) placed above a cluster of 1–20 hexes in high-precip regions.
 */
export function createLowPolyClouds(
  globe: Globe,
  precipByTile: Map<number, number>,
  options: LowPolyCloudOptions = {}
): THREE.Group {
  const opts = { ...LOW_POLY_CLOUD_DEFAULTS, ...options };
  const rng = seededRandom(opts.seed);
  const clusters = selectHexClusters(
    globe,
    precipByTile,
    opts.minPrecip,
    opts.gridDeg,
    opts.seed
  );
  if (clusters.length === 0) {
    const group = new THREE.Group();
    group.name = "LowPolyClouds";
    return group;
  }

  const root = new THREE.Group();
  root.name = "LowPolyClouds";
  const [sizeMin, sizeMax] = opts.sizeScaleRange;
  const worldUp = new THREE.Vector3(0, 1, 0);

  const flatDeckThreshold = 50;
  for (const tileIds of clusters) {
    const pose = getClusterPose(globe, tileIds, opts.heightOffset);
    const { position, up } = pose;
    const sizeRandom = sizeMin + (sizeMax - sizeMin) * rng();
    const clusterSizeMultiplier = Math.min(4, 0.5 + tileIds.length / 65);
    const scale = opts.cloudScale * sizeRandom * clusterSizeMultiplier;
    const flatDeck = tileIds.length >= flatDeckThreshold;
    const quat = new THREE.Quaternion().setFromUnitVectors(worldUp, up);
    const shellR = position.length() + opts.clipGlobeShellRadiusOffset;
    const globeBottomClip: CloudGlobeBottomClip | null = opts.clipBottomToGlobe
      ? {
          worldPos: position.clone(),
          worldQuat: quat.clone(),
          shellRadius: shellR,
          smoothK: opts.clipGlobeSmoothK,
        }
      : null;
    const cloud = createSingleCumulusCloudSdf(
      rng,
      scale,
      opts.opacity,
      flatDeck,
      globeBottomClip,
      opts.castShadows,
      opts.castShadows,
      opts.marchingCubesGridRes,
    );
    if (opts.castShadows) {
      addShadowProxy(cloud, scale, flatDeck);
    }
    cloud.traverse((c) => {
      if (c instanceof THREE.Mesh && c.name !== "CloudShadowProxy") {
        c.castShadow = opts.castShadows;
      }
    });
    cloud.position.copy(position);
    cloud.quaternion.copy(quat);
    cloud.renderOrder = 5;
    root.add(cloud);
  }

  return root;
}

const _cameraPos = new THREE.Vector3();
const _meshPos = new THREE.Vector3();

/**
 * Sort each cloud's puff meshes back-to-front by camera distance so that with
 * depthWrite the overlapping puffs read as one union shape. Call once per frame
 * before render (e.g. in your render loop).
 */
export function sortLowPolyCloudsByCamera(
  cloudGroup: THREE.Group,
  camera: THREE.Camera
): void {
  camera.getWorldPosition(_cameraPos);
  for (let i = 0; i < cloudGroup.children.length; i++) {
    const cloud = cloudGroup.children[i];
    if (cloud instanceof THREE.InstancedMesh) continue;
    if (!(cloud instanceof THREE.Group)) continue;
    const puffs: THREE.Mesh[] = [];
    let proxy: THREE.Object3D | null = null;
    for (const c of cloud.children) {
      if (c instanceof THREE.Mesh && c.name === "CloudShadowProxy") proxy = c;
      else if (c instanceof THREE.Mesh) puffs.push(c);
    }
    if (puffs.length === 0) continue;
    cloud.updateMatrixWorld(true);
    puffs.sort((a, b) => {
      a.getWorldPosition(_meshPos);
      const da = _cameraPos.distanceToSquared(_meshPos);
      b.getWorldPosition(_meshPos);
      const db = _cameraPos.distanceToSquared(_meshPos);
      return db - da;
    });
    cloud.children.length = 0;
    for (const p of puffs) cloud.add(p);
    if (proxy) cloud.add(proxy);
  }
}

/**
 * Update low-poly clouds after precip or options changed (e.g. date change).
 */
export function updateLowPolyClouds(
  group: THREE.Group,
  globe: Globe,
  precipByTile: Map<number, number>,
  options: LowPolyCloudOptions = {}
): void {
  while (group.children.length > 0) {
    const c = group.children[0];
    group.remove(c);
    if (c instanceof THREE.Group) {
      c.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) child.material.dispose();
        }
      });
    }
  }
  const fresh = createLowPolyClouds(globe, precipByTile, options);
  for (const c of fresh.children) group.add(c);
}

/**
 * Update puffy clouds after precip map or options changed (e.g. date change).
 */
export function updatePuffyClouds(
  group: THREE.Group,
  globe: Globe,
  precipByTile: Map<number, number>,
  options: PuffyCloudOptions = {}
): void {
  while (group.children.length > 0) {
    const c = group.children[0];
    group.remove(c);
    if (c instanceof THREE.InstancedMesh) {
      c.geometry.dispose();
      const mat = c.material as THREE.MeshBasicMaterial;
      if (mat.map) mat.map.dispose();
      mat.dispose();
    }
  }
  const fresh = createPuffyClouds(globe, precipByTile, options);
  for (const c of fresh.children) group.add(c);
}

// --- Sphere cloud layer (texture-mapped, patchy procedural) ---
// Matches the common approach: single sphere slightly above globe + transparent cloud texture
// (see e.g. three-globe, webgl-earth, NASA Blue Marble style)

export interface CloudSphereOptions {
  /** Radius in globe units. Default 1.004 (0.4% above surface, like three-globe). */
  radius?: number;
  /** Texture width. Default 1024 */
  width?: number;
  /** Texture height. Default 512 */
  height?: number;
  /** Opacity of cloud layer. Default 0.4 */
  opacity?: number;
  /** Seed for procedural noise. Default 55555 */
  seed?: number;
  /** Segment count for sphere. Default 64 */
  segments?: number;
}

const CLOUD_SPHERE_DEFAULTS: Required<CloudSphereOptions> = {
  radius: 1.004,
  width: 1024,
  height: 512,
  opacity: 0.72,
  seed: 55555,
  segments: 64,
};

/** 2D value noise: grid of random values, bilinear interpolated (smoothstep). Seeded. */
function valueNoise2d(
  x: number,
  y: number,
  gridSize: number,
  seed: number
): number {
  const gx = Math.floor(x) % gridSize;
  const gy = Math.floor(y) % gridSize;
  const fx = x - Math.floor(x);
  const fy = y - Math.floor(y);
  const s = (t: number) => t * t * (3 - 2 * t);
  const sx = s(fx);
  const sy = s(fy);
  const hash = (a: number, b: number) => {
    const h = ((a + gridSize) % gridSize) * 73856093 ^ ((b + gridSize) % gridSize) * 19349663 ^ seed;
    return ((h >>> 0) % 65536) / 65535;
  };
  const v00 = hash(gx, gy);
  const v10 = hash(gx + 1, gy);
  const v01 = hash(gx, gy + 1);
  const v11 = hash(gx + 1, gy + 1);
  const v0 = v00 * (1 - sx) + v10 * sx;
  const v1 = v01 * (1 - sx) + v11 * sx;
  return v0 * (1 - sy) + v1 * sy;
}

/** Multi-octave noise for cloud detail (wispy structure). */
function cloudDetail(u: number, v: number, seed: number): number {
  const o1 = valueNoise2d(u * 8, v * 4, 32, seed);
  const o2 = valueNoise2d(u * 16, v * 8, 32, seed + 1) * 0.6;
  const o3 = valueNoise2d(u * 32, v * 16, 32, seed + 2) * 0.3;
  return Math.max(0, Math.min(1, o1 + o2 + o3));
}

/**
 * Cloud system placement: combine low-freq "regions" with mid-freq "patchiness" so we get
 * many scattered cloud systems, not one giant hemisphere-sized blob.
 */
function chunkMask(u: number, v: number, seed: number): number {
  const s = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const low = valueNoise2d(u * 1.2, v * 1.2, 16, seed);
  const mid = valueNoise2d(u * 5, v * 2.5, 32, seed + 5);
  const combined = low * 0.5 + mid * 0.5;
  return s((combined - 0.48) * 4);
}

/**
 * Wind-driven distortion: stretch along latitude (trade-wind wisps at equator), swirl at mid-lat.
 * Returns (u_sample, v_sample) for sampling the detail noise.
 */
function windDistort(u: number, v: number): { u: number; v: number } {
  const latNorm = 0.5 - v;
  const absLat = Math.abs(latNorm);
  const stretchLon = 0.12 + 0.88 * (1 - absLat * 2);
  const uStretch = u * stretchLon;
  const swirl = 0.04 * Math.sin(v * Math.PI * 6) * Math.cos(u * Math.PI * 4);
  const swirlV = 0.04 * Math.cos(v * Math.PI * 6) * Math.sin(u * Math.PI * 4);
  return { u: uStretch + swirl, v: v + swirlV };
}

/**
 * Create a wind-driven wispy cloud texture (equirectangular).
 * - Sparse: only ~20–25% of globe is in cloud systems; rest is fully clear (no whitening).
 * - High contrast: clear = 0 alpha, clouds = 0.7–0.95 alpha so they read as white patches.
 * - Wind distortion and feathered edges within each system.
 */
function createPatchyCloudTexture(
  width: number,
  height: number,
  seed: number
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.createImageData(width, height);
  const s = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = x / width;
      const v = y / height;
      const chunk = chunkMask(u, v, seed);
      if (chunk < 0.02) {
        imageData.data[(y * width + x) * 4 + 3] = 0;
        imageData.data[(y * width + x) * 4] = 255;
        imageData.data[(y * width + x) * 4 + 1] = 255;
        imageData.data[(y * width + x) * 4 + 2] = 255;
        continue;
      }
      const { u: uD, v: vD } = windDistort(u, v);
      const detail = cloudDetail(uD, vD, seed);
      const t = s((detail - 0.32) * 2.2);
      const rawAlpha = chunk * t;
      if (rawAlpha < 0.03) {
        imageData.data[(y * width + x) * 4 + 3] = 0;
        imageData.data[(y * width + x) * 4] = 255;
        imageData.data[(y * width + x) * 4 + 1] = 255;
        imageData.data[(y * width + x) * 4 + 2] = 255;
        continue;
      }
      const alpha = Math.min(0.95, rawAlpha * 1.1);
      const i = (y * width + x) * 4;
      imageData.data[i] = 255;
      imageData.data[i + 1] = 255;
      imageData.data[i + 2] = 255;
      imageData.data[i + 3] = Math.round(alpha * 255);
    }
  }
  ctx.putImageData(imageData, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Create a cloud layer mesh: single sphere with patchy procedural texture.
 * Follows the common pattern (three-globe, webgl-earth): sphere at radius ~1.004, transparent material.
 */
export function createCloudSphereLayer(
  _subsolarLatDeg: number,
  options: CloudSphereOptions = {}
): THREE.Mesh {
  const opts = { ...CLOUD_SPHERE_DEFAULTS, ...options };
  const tex = createPatchyCloudTexture(opts.width, opts.height, opts.seed);
  const geom = new THREE.SphereGeometry(opts.radius, opts.segments, Math.floor(opts.segments / 2));
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity: opts.opacity,
    depthWrite: false,
    side: THREE.FrontSide,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.name = "CloudSphereLayer";
  mesh.renderOrder = 5;
  return mesh;
}

/**
 * Update cloud sphere texture and material (e.g. on date change; currently texture is static by seed).
 */
export function updateCloudSphereLayer(
  mesh: THREE.Mesh,
  _subsolarLatDeg: number,
  options: CloudSphereOptions = {}
): void {
  const opts = { ...CLOUD_SPHERE_DEFAULTS, ...options };
  const mat = mesh.material as THREE.MeshBasicMaterial;
  if (mat.map) mat.map.dispose();
  mat.map = createPatchyCloudTexture(opts.width, opts.height, opts.seed);
  mat.opacity = opts.opacity;
}

// Legacy / alternative APIs
export interface CloudLayerOptions {
  radius?: number;
  width?: number;
  height?: number;
  opacity?: number;
  noiseWeight?: number;
  seed?: number;
}

/** @deprecated Use createCloudSphereLayer for a texture-mapped sphere, or createPuffyClouds for puffs. */
export function createCloudLayer(
  subsolarLatDeg: number,
  options: CloudLayerOptions = {}
): THREE.Mesh {
  return createCloudSphereLayer(subsolarLatDeg, options);
}

/** @deprecated Use updateCloudSphereLayer. */
export function updateCloudLayer(
  mesh: THREE.Mesh,
  subsolarLatDeg: number,
  options: CloudLayerOptions = {}
): void {
  updateCloudSphereLayer(mesh, subsolarLatDeg, options);
}