import * as THREE from "three";
import type { Globe, GeodesicTile, TileTerrainData } from "polyglobe";
import { BUILDING_DEFS } from "./buildings.js";
import {
  type UrbanDataset,
  type UrbanCityAtYear,
  interpolateUrbanCitiesAtYear,
} from "./urbanization.js";

export const MODERN_APARTMENT_YEAR = 1880;

interface SettlementStyle {
  key: string;
  wall: number;
  roof: number;
  detail: number;
  window: number;
}

const STYLE_DEFAULT: SettlementStyle = {
  key: "default",
  wall: 0xb8c6d2,
  roof: 0x646e79,
  detail: 0x7d6f60,
  window: 0xffe8a5,
};
const STYLE_MEDITERRANEAN: SettlementStyle = {
  key: "mediterranean",
  wall: 0xe8e3d8,
  roof: 0x9f4137,
  detail: 0xb49a7d,
  window: 0xffedb8,
};
const STYLE_DESERT: SettlementStyle = {
  key: "desert",
  wall: 0xc7a97b,
  roof: 0x9e7f58,
  detail: 0x7c654a,
  window: 0xfce1a2,
};
const STYLE_FOREST: SettlementStyle = {
  key: "forest",
  wall: 0x8d6e51,
  roof: 0x4f3d2f,
  detail: 0x6a4f39,
  window: 0xffde93,
};
const STYLE_BAMBOO: SettlementStyle = {
  key: "bamboo",
  wall: 0xc5c08e,
  roof: 0x4d603c,
  detail: 0x667145,
  window: 0xffe3a0,
};
const STYLE_POLAR: SettlementStyle = {
  key: "polar",
  wall: 0xdde5ef,
  roof: 0x7d8a99,
  detail: 0xaeb7c2,
  window: 0xf7fbff,
};
const STYLE_CONCRETE: SettlementStyle = {
  key: "concrete",
  wall: 0x98a1aa,
  roof: 0x79828c,
  detail: 0x6b737d,
  window: 0xffeead,
};

const _dir = new THREE.Vector3();
const _normal = new THREE.Vector3();
const _tangent = new THREE.Vector3();
const _bitangent = new THREE.Vector3();
const _pos = new THREE.Vector3();
const _tmp = new THREE.Vector3();
const _edgeN = new THREE.Vector3();
const _footBox = new THREE.Box3();
const _footSize = new THREE.Vector3();
const _quatUp = new THREE.Quaternion();
const _quatYaw = new THREE.Quaternion();
const _up = new THREE.Vector3(0, 1, 0);
const _basisUp = new THREE.Vector3(0, 1, 0);
const _basisAlt = new THREE.Vector3(1, 0, 0);

const templateCache = new Map<string, THREE.Group>();
const footprintRadiusCache = new Map<string, number>();

const MAX_VISIBLE_SETTLEMENTS = 24;
const MAX_VISIBLE_BUILDINGS = 280;
const MAX_VISIBLE_DISTANCE = 1.05;
const LABEL_VISIBLE_DISTANCE = 0.78;
const LABEL_MAX_SCREEN_PX = 24;
const LABEL_MIN_SCREEN_PX = 12;
const LABEL_BASE_WORLD_Y = 0.03;
const LABEL_ASPECT = 0.115 / 0.03;
const BUILDING_SIZE_SCALE = 0.9;
const MAX_BUILDINGS_PER_CITY = 6;
const CORNER_SLOT_BLEND = 0.68;
const ADJACENT_CORNER_RADIUS_FRAC = 0.42;
const URBAN_TERRAIN_ELEVATION_SCALE = 0.08;
const URBAN_SURFACE_LIFT = 0.00055;
const URBAN_ENABLE_LABELS = false;
const VISIBILITY_UPDATE_FRAME_STRIDE = 6;

function buildingScaleBase(id: string): number {
  if (id === "small-house") return 0.00325 * BUILDING_SIZE_SCALE;
  if (id === "medium-house") return 0.0037 * BUILDING_SIZE_SCALE;
  if (id === "medium-block") return 0.00385 * BUILDING_SIZE_SCALE;
  if (id === "large-apartment") return 0.0041 * BUILDING_SIZE_SCALE;
  if (id === "train-station") return 0.00395 * BUILDING_SIZE_SCALE;
  return 0.0039 * BUILDING_SIZE_SCALE;
}

function buildingFootprintRadius(id: string): number {
  const cached = footprintRadiusCache.get(id);
  if (cached != null) return cached;
  const tpl = getTemplate(id, STYLE_DEFAULT);
  tpl.updateMatrixWorld(true);
  _footBox.setFromObject(tpl);
  _footBox.getSize(_footSize);
  const radius = Math.hypot(_footSize.x * 0.5, _footSize.z * 0.5) * 1.08;
  footprintRadiusCache.set(id, radius);
  return radius;
}

interface TileSettlement {
  tileId: number;
  population: number;
  cityLabel: string;
  lat: number;
  lon: number;
  leadingPopulation: number;
}

interface SettlementRenderEntry {
  tileId: number;
  cityLabel: string;
  population: number;
  lat: number;
  lon: number;
  normal: THREE.Vector3;
  bankVertexDirs: THREE.Vector3[];
  hasRiver: boolean;
  style: SettlementStyle;
  buildingIds: string[];
  baseSurfaceRadius: number;
  group: THREE.Group | null;
  label: THREE.Sprite | null;
}

interface PlacementClampStats {
  attempted: number;
  clampSkipped: number;
  overlapSkipped: number;
  drawn: number;
}

interface PlacementFootprint {
  pos: THREE.Vector3;
  radius: number;
}

interface CandidateCityPlacement {
  id: string;
  city: string;
  population: number;
  lat: number;
  lon: number;
  tileId: number;
  originalTileId: number;
  landmassId?: number;
}

interface MountainLatLonEntry {
  lat: number;
  lon: number;
}

export interface UrbanSettlementRuntime {
  buildingsGroup: THREE.Group;
  labelsGroup: THREE.Group;
  cityCount: number;
  clearedTileIds: Set<number>;
  cityInfoByTileId: ReadonlyMap<number, { cityLabel: string; population: number }>;
  cityExpectedLandmassByCityId: ReadonlyMap<string, number>;
  cityPlacedLandmassByCityId: ReadonlyMap<string, number>;
  update: (camera: THREE.Camera) => void;
  dispose: () => void;
}

function latLonDegToDirection(latDeg: number, lonDeg: number): THREE.Vector3 {
  const latRad = (latDeg * Math.PI) / 180;
  const lonRad = (lonDeg * Math.PI) / 180;
  const cosLat = Math.cos(latRad);
  return _dir
    .set(
      cosLat * Math.cos(lonRad),
      Math.sin(latRad),
      -cosLat * Math.sin(lonRad),
    )
    .normalize();
}

function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function rng(seed: number): () => number {
  let x = seed >>> 0;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

function pickStyleForTerrain(
  terrainType: string | undefined,
  isBambooRegion: boolean,
): SettlementStyle {
  const t = (terrainType ?? "").toLowerCase();
  if (isBambooRegion) return STYLE_BAMBOO;
  if (t.includes("mediterranean")) return STYLE_MEDITERRANEAN;
  if (
    t.includes("desert") ||
    t.includes("steppe") ||
    t.includes("arid") ||
    t.includes("hot_")
  ) {
    return STYLE_DESERT;
  }
  if (
    t.includes("forest") ||
    t.includes("oceanic") ||
    t.includes("subarctic") ||
    t.includes("humid")
  ) {
    return STYLE_FOREST;
  }
  if (t.includes("ice") || t.includes("tundra")) return STYLE_POLAR;
  return STYLE_DEFAULT;
}

function applyStyleToTemplate(
  base: THREE.Group,
  style: SettlementStyle,
  buildingId: string,
): THREE.Group {
  const out = base.clone(true);
  out.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const role = (child.userData.role as string | undefined) ?? "wall";
    const src = child.material;
    if (!src || Array.isArray(src)) return;
    const mat = src.clone() as
      | THREE.MeshStandardMaterial
      | THREE.MeshBasicMaterial;
    const effective = buildingId === "large-apartment" ? STYLE_CONCRETE : style;
    if (role === "window") mat.color.setHex(effective.window);
    else if (role === "roof") mat.color.setHex(effective.roof);
    else if (role === "detail") mat.color.setHex(effective.detail);
    else mat.color.setHex(effective.wall);
    child.material = mat;
  });
  return out;
}

function getTemplate(buildingId: string, style: SettlementStyle): THREE.Group {
  const key = `${buildingId}|${style.key}`;
  const cached = templateCache.get(key);
  if (cached) return cached;
  const def = BUILDING_DEFS.find((d) => d.id === buildingId);
  if (!def) throw new Error(`Unknown building type: ${buildingId}`);
  const tpl = applyStyleToTemplate(def.create(), style, buildingId);
  templateCache.set(key, tpl);
  return tpl;
}

function createLabelSprite(text: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  const w = 300;
  const h = 80;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(8, 12, 18, 0.7)";
  ctx.fillRect(0, 16, w, 48);
  ctx.strokeStyle = "rgba(164, 208, 232, 0.75)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 17, w - 2, 46);
  ctx.fillStyle = "#e8f6ff";
  ctx.font = "600 30px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, w * 0.5, h * 0.5 + 1);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    sizeAttenuation: true,
  });
  const s = new THREE.Sprite(mat);
  s.scale.set(0.115, 0.03, 1);
  s.renderOrder = 50;
  return s;
}

function normalizedPopulation(pop: number, pMin: number, pMax: number): number {
  const lo = Math.max(1, pMin);
  const hi = Math.max(lo + 1, pMax);
  const n =
    (Math.log(Math.max(pop, lo)) - Math.log(lo)) / (Math.log(hi) - Math.log(lo));
  return Math.max(0, Math.min(1, n));
}

function expandBuildingProgram(
  tile: TileSettlement,
  year: number,
  norm: number,
  count: number,
): string[] {
  const ids: string[] = [];
  const apartmentAllowed = year >= MODERN_APARTMENT_YEAR;
  const nApartment = apartmentAllowed
    ? Math.floor(count * Math.max(0, (norm - 0.55) / 0.45))
    : 0;
  if (apartmentAllowed && norm >= 0.98) {
    for (let i = 0; i < count; i++) ids.push("large-apartment");
    return ids;
  }
  const nBlock = Math.max(0, Math.floor((count - nApartment) * 0.35));
  const nMedium = Math.max(
    0,
    Math.floor((count - nApartment - nBlock) * 0.45),
  );
  const nSmall = Math.max(1, count - nApartment - nBlock - nMedium);
  for (let i = 0; i < nApartment; i++) ids.push("large-apartment");
  for (let i = 0; i < nBlock; i++) ids.push("medium-block");
  for (let i = 0; i < nMedium; i++) ids.push("medium-house");
  for (let i = 0; i < nSmall; i++) ids.push("small-house");
  return ids;
}

function shuffleInPlace<T>(arr: T[], rnd: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = t;
  }
}

function tileToNormal(tile: GeodesicTile): THREE.Vector3 {
  _normal.copy(tile.center).normalize();
  return _normal;
}

function makeBasis(normal: THREE.Vector3): void {
  const ref = Math.abs(normal.dot(_basisUp)) < 0.98 ? _basisUp : _basisAlt;
  _tangent.copy(ref).cross(normal).normalize();
  _bitangent.copy(normal).cross(_tangent).normalize();
}

function isBuildableLandType(type: string | undefined): boolean {
  if (!type) return false;
  return type !== "water" && type !== "beach" && type !== "ice";
}

function isDirectionInsideTile(
  dir: THREE.Vector3,
  center: THREE.Vector3,
  verts: readonly THREE.Vector3[],
): boolean {
  if (verts.length < 3) return true;
  for (let i = 0; i < verts.length; i++) {
    const a = verts[i]!;
    const b = verts[(i + 1) % verts.length]!;
    _edgeN.copy(a).cross(b);
    const centerDot = center.dot(_edgeN);
    const pointDot = dir.dot(_edgeN);
    if (centerDot >= 0) {
      if (pointDot < -1e-8) return false;
    } else if (pointDot > 1e-8) {
      return false;
    }
  }
  return true;
}

function findNearestBuildableTileId(
  globe: Globe,
  startTileId: number,
  terrain: Map<number, TileTerrainData>,
  desiredLandmassId?: number,
): number {
  const startTerrain = terrain.get(startTileId);
  if (
    isBuildableLandType(startTerrain?.type) &&
    (desiredLandmassId == null || startTerrain?.landmassId === desiredLandmassId)
  ) {
    return startTileId;
  }
  const q: number[] = [startTileId];
  const seen = new Set<number>([startTileId]);
  let bestAnyBuildable: number | null = null;
  let qi = 0;
  while (qi < q.length) {
    const id = q[qi++]!;
    const tile = globe.getTile(id);
    if (!tile) continue;
    for (let i = 0; i < tile.neighbors.length; i++) {
      const nId = tile.neighbors[i]!;
      if (seen.has(nId)) continue;
      seen.add(nId);
      const nTerrain = terrain.get(nId);
      if (isBuildableLandType(nTerrain?.type)) {
        if (bestAnyBuildable == null) bestAnyBuildable = nId;
        if (desiredLandmassId == null || nTerrain?.landmassId === desiredLandmassId) {
          return nId;
        }
      }
      q.push(nId);
    }
    if (q.length > 1500) break;
  }
  return bestAnyBuildable ?? startTileId;
}

function areOnDifferentKnownLandmasses(
  a: number | undefined,
  b: number | undefined,
): boolean {
  return a != null && b != null && a !== b;
}

function collectSameOrNeighborTileIds(globe: Globe, tileId: number): number[] {
  const out = [tileId];
  const tile = globe.getTile(tileId);
  if (!tile) return out;
  for (const n of tile.neighbors) out.push(n);
  return out;
}

function buildMountainDirsByTile(
  globe: Globe,
  mountainEntries: readonly MountainLatLonEntry[] | null | undefined,
): Map<number, THREE.Vector3[]> {
  const out = new Map<number, THREE.Vector3[]>();
  if (!mountainEntries || mountainEntries.length === 0) return out;
  for (const m of mountainEntries) {
    const dir = latLonDegToDirection(m.lat, m.lon).clone();
    const tileId = globe.getTileIdAtDirection(dir);
    let arr = out.get(tileId);
    if (!arr) {
      arr = [];
      out.set(tileId, arr);
    }
    arr.push(dir);
  }
  return out;
}

function findNearestBuildableNonMountainTileId(
  globe: Globe,
  startTileId: number,
  terrain: Map<number, TileTerrainData>,
  mountainDirsByTile: ReadonlyMap<number, THREE.Vector3[]>,
  desiredLandmassId?: number,
  maxRings = 3,
): number | null {
  const q: Array<{ id: number; d: number }> = [{ id: startTileId, d: 0 }];
  const seen = new Set<number>([startTileId]);
  let qi = 0;
  while (qi < q.length) {
    const cur = q[qi++]!;
    if (cur.d > maxRings) continue;
    const data = terrain.get(cur.id);
    if (
      cur.d > 0 &&
      isBuildableLandType(data?.type) &&
      (desiredLandmassId == null || data?.landmassId === desiredLandmassId) &&
      !mountainDirsByTile.has(cur.id)
    ) {
      return cur.id;
    }
    const tile = globe.getTile(cur.id);
    if (!tile || cur.d >= maxRings) continue;
    for (const nid of tile.neighbors) {
      if (seen.has(nid)) continue;
      seen.add(nid);
      q.push({ id: nid, d: cur.d + 1 });
    }
  }
  return null;
}

function deconflictCityMountainTileId(
  globe: Globe,
  tileId: number,
  cityDir: THREE.Vector3,
  terrain: Map<number, TileTerrainData>,
  mountainDirsByTile: ReadonlyMap<number, THREE.Vector3[]>,
  desiredLandmassId?: number,
): number {
  const mountains = mountainDirsByTile.get(tileId);
  if (!mountains || mountains.length === 0) return tileId;
  // Mountains are static terrain features; move city to preserve separation.
  let nearestMountainDir = mountains[0]!;
  let bestDot = -Infinity;
  for (const md of mountains) {
    const dot = cityDir.dot(md);
    if (dot > bestDot) {
      bestDot = dot;
      nearestMountainDir = md;
    }
  }
  const away = cityDir.clone().sub(nearestMountainDir);
  if (away.lengthSq() < 1e-10) {
    const center = globe.getTile(tileId)?.center.clone().normalize();
    if (center) away.copy(cityDir).sub(center);
  }
  if (away.lengthSq() < 1e-10) away.copy(cityDir);
  away.normalize();
  let bestTileId: number | null = null;
  let bestScore = -Infinity;
  const q: Array<{ id: number; d: number }> = [{ id: tileId, d: 0 }];
  const seen = new Set<number>([tileId]);
  let qi = 0;
  const maxRings = 3;
  while (qi < q.length) {
    const cur = q[qi++]!;
    const data = terrain.get(cur.id);
    if (
      cur.d > 0 &&
      isBuildableLandType(data?.type) &&
      (desiredLandmassId == null || data?.landmassId === desiredLandmassId) &&
      !mountainDirsByTile.has(cur.id)
    ) {
      const t = globe.getTile(cur.id);
      if (t) {
        const dir = t.center.clone().normalize();
        const score =
          away.dot(dir) * 3.0 - cur.d * 0.7 - cityDir.angleTo(dir) * 0.6;
        if (score > bestScore) {
          bestScore = score;
          bestTileId = cur.id;
        }
      }
    }
    if (cur.d >= maxRings) continue;
    const tile = globe.getTile(cur.id);
    if (!tile) continue;
    for (const nid of tile.neighbors) {
      if (seen.has(nid)) continue;
      seen.add(nid);
      q.push({ id: nid, d: cur.d + 1 });
    }
  }
  if (bestTileId != null) return bestTileId;
  return (
    findNearestBuildableNonMountainTileId(
      globe,
      tileId,
      terrain,
      mountainDirsByTile,
      desiredLandmassId,
      4,
    ) ?? tileId
  );
}


function mapCitiesToCandidatePlacements(
  cities: UrbanCityAtYear[],
  globe: Globe,
  tileTerrain: Map<number, TileTerrainData>,
  mountainEntries: readonly MountainLatLonEntry[] | null | undefined,
): CandidateCityPlacement[] {
  const mountainDirsByTile = buildMountainDirsByTile(globe, mountainEntries);
  const candidates: CandidateCityPlacement[] = [];
  for (const c of cities) {
    const cityDir = latLonDegToDirection(c.lat, c.lon).clone();
    const rawTileId = globe.getTileIdAtDirection(cityDir);
    const desiredLandmassId = tileTerrain.get(rawTileId)?.landmassId;
    const initialTileId = findNearestBuildableTileId(
      globe,
      rawTileId,
      tileTerrain,
      desiredLandmassId,
    );
    const tileId = deconflictCityMountainTileId(
      globe,
      initialTileId,
      cityDir,
      tileTerrain,
      mountainDirsByTile,
      desiredLandmassId,
    );
    candidates.push({
      id: c.id,
      city: c.city,
      population: c.population,
      lat: c.lat,
      lon: c.lon,
      tileId,
      originalTileId: tileId,
      landmassId: desiredLandmassId,
    });
  }
  return candidates;
}

function resolveCrossLandmassAdjacencyConflicts(
  candidates: CandidateCityPlacement[],
  globe: Globe,
  tileTerrain: Map<number, TileTerrainData>,
): CandidateCityPlacement[] {
  candidates.sort((a, b) => b.population - a.population);
  const accepted: CandidateCityPlacement[] = [];
  const acceptedByTile = new Map<number, CandidateCityPlacement[]>();
  const excludedCrossLandmass: CandidateCityPlacement[] = [];
  const hasCrossLandmassConflict = (tileId: number, landmassId?: number): boolean => {
    const local = collectSameOrNeighborTileIds(globe, tileId);
    for (const tid of local) {
      const onTile = acceptedByTile.get(tid);
      if (!onTile) continue;
      for (const c of onTile) {
        if (areOnDifferentKnownLandmasses(landmassId, c.landmassId)) return true;
      }
    }
    return false;
  };
  const acceptCandidate = (c: CandidateCityPlacement, targetTileId: number): void => {
    c.tileId = targetTileId;
    accepted.push(c);
    let bucket = acceptedByTile.get(targetTileId);
    if (!bucket) {
      bucket = [];
      acceptedByTile.set(targetTileId, bucket);
    }
    bucket.push(c);
  };
  for (const c of candidates) {
    if (hasCrossLandmassConflict(c.tileId, c.landmassId)) {
      excludedCrossLandmass.push(c);
      continue;
    }
    acceptCandidate(c, c.tileId);
  }
  for (const c of excludedCrossLandmass) {
    if (c.landmassId == null) continue;
    let bestTileId: number | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const tid of collectSameOrNeighborTileIds(globe, c.originalTileId)) {
      const t = tileTerrain.get(tid);
      if (!isBuildableLandType(t?.type)) continue;
      if (t?.landmassId !== c.landmassId) continue;
      if (hasCrossLandmassConflict(tid, c.landmassId)) continue;
      const hasSameTileCity = (acceptedByTile.get(tid)?.length ?? 0) > 0;
      const score =
        (tid === c.originalTileId ? 0 : 1) + (hasSameTileCity ? -0.25 : 0);
      if (score < bestScore) {
        bestScore = score;
        bestTileId = tid;
      }
    }
    if (bestTileId != null) acceptCandidate(c, bestTileId);
  }
  return accepted;
}

function collectTilesWithinRings(
  globe: Globe,
  originId: number,
  rings: number,
  out: Set<number>,
): void {
  out.add(originId);
  if (rings <= 0) return;
  const q: Array<{ id: number; d: number }> = [{ id: originId, d: 0 }];
  const seen = new Set<number>([originId]);
  let qi = 0;
  while (qi < q.length) {
    const cur = q[qi++]!;
    if (cur.d >= rings) continue;
    const tile = globe.getTile(cur.id);
    if (!tile) continue;
    for (let i = 0; i < tile.neighbors.length; i++) {
      const nId = tile.neighbors[i]!;
      if (seen.has(nId)) continue;
      seen.add(nId);
      out.add(nId);
      q.push({ id: nId, d: cur.d + 1 });
    }
  }
}

function ensureSettlementBuilt(
  entry: SettlementRenderEntry,
  clampStats: PlacementClampStats,
): { overlapDetected: boolean } {
  if (entry.group) return { overlapDetected: false };
  const group = new THREE.Group();
  group.name = `Settlement-${entry.tileId}-${entry.cityLabel}`;
  const normal = entry.normal;
  makeBasis(normal);
  _quatUp.setFromUnitVectors(_up, normal);
  const r = rng(hashString(`${entry.tileId}`));
  const ids = entry.buildingIds;
  const baseRadius = entry.baseSurfaceRadius;
  const placed: PlacementFootprint[] = [];
  let overlapDetected = false;
  const buildingPlan = ids
    .map((id) => {
      const scale = buildingScaleBase(id) * (0.9 + r() * 0.22);
      return {
        id,
        scale,
        radius: buildingFootprintRadius(id) * scale,
      };
    })
    .sort((a, b) => b.radius - a.radius);
  const slots = entry.bankVertexDirs.slice();
  const start = slots.length > 0 ? Math.floor(r() * slots.length) : 0;
  const orderedSlots: THREE.Vector3[] = [];
  for (let i = 0; i < slots.length; i++) {
    orderedSlots.push(slots[(start + i) % slots.length]!);
  }
  const plannedPos: THREE.Vector3[] = [];
  const distToCorner: number[] = [];
  for (let i = 0; i < buildingPlan.length; i++) {
    const corner = orderedSlots[i] ?? normal;
    _tmp.copy(normal).lerp(corner, CORNER_SLOT_BLEND);
    _tmp.normalize();
    plannedPos.push(_tmp.clone().multiplyScalar(baseRadius + r() * 0.0002));
    _pos.copy(corner).multiplyScalar(baseRadius);
    distToCorner.push(plannedPos[i]!.distanceTo(_pos));
  }
  let scaleFit = 1;
  for (let i = 0; i < buildingPlan.length; i++) {
    for (let j = i + 1; j < buildingPlan.length; j++) {
      const a = buildingPlan[i]!;
      const b = buildingPlan[j]!;
      const d = plannedPos[i]!.distanceTo(plannedPos[j]!);
      const need = a.radius + b.radius;
      if (need <= 1e-9) continue;
      const s = (d / need) * 0.98;
      if (s < scaleFit) scaleFit = s;
    }
  }
  if (!Number.isFinite(scaleFit) || scaleFit <= 0) scaleFit = 1;
  scaleFit = Math.min(1, Math.max(0.35, scaleFit));

  for (let i = 0; i < buildingPlan.length; i++) {
    const bld = buildingPlan[i]!;
    const id = bld.id;
    clampStats.attempted++;
    _pos.copy(plannedPos[i]!);
    const dir = _tmp.copy(_pos).normalize();
    if (!isDirectionInsideTile(dir, normal, entry.bankVertexDirs)) {
      clampStats.clampSkipped++;
      continue;
    }
    const cornerSafeRadius = distToCorner[i]! * ADJACENT_CORNER_RADIUS_FRAC;
    const effRadius = Math.min(bld.radius * scaleFit, cornerSafeRadius);
    let intersects = false;
    for (let p = 0; p < placed.length; p++) {
      const other = placed[p]!;
      const minDist = effRadius + other.radius;
      if (_pos.distanceToSquared(other.pos) < minDist * minDist) {
        intersects = true;
        break;
      }
    }
    if (intersects) {
      overlapDetected = true;
      clampStats.overlapSkipped++;
      continue;
    }
    const template = getTemplate(id, entry.style);
    const mesh = template.clone(true);
    mesh.position.copy(_pos);
    _quatYaw.setFromAxisAngle(normal, r() * Math.PI * 2);
    mesh.quaternion.copy(_quatUp).premultiply(_quatYaw);
    mesh.scale.setScalar(bld.scale * scaleFit);
    mesh.updateMatrix();
    mesh.matrixAutoUpdate = false;
    placed.push({ pos: _pos.clone(), radius: effRadius });
    group.add(mesh);
    clampStats.drawn++;
  }
  group.updateMatrix();
  group.matrixAutoUpdate = false;
  group.visible = false;
  entry.group = group;
  return { overlapDetected };
}

function ensureLabelBuilt(entry: SettlementRenderEntry): void {
  if (entry.label) return;
  const label = createLabelSprite(entry.cityLabel);
  label.position.copy(entry.normal).multiplyScalar(1.016);
  label.scale.set(LABEL_BASE_WORLD_Y * LABEL_ASPECT, LABEL_BASE_WORLD_Y, 1);
  label.visible = false;
  entry.label = label;
}

function updateLabelScaleForCamera(
  label: THREE.Sprite,
  camera: THREE.Camera,
): void {
  if (!(camera instanceof THREE.PerspectiveCamera)) return;
  const viewportH = Math.max(1, window.innerHeight || 1);
  const d = Math.max(1e-6, label.position.distanceTo(camera.position));
  const fovRad = (camera.fov * Math.PI) / 180;
  const worldPerPixel = (2 * d * Math.tan(fovRad * 0.5)) / viewportH;
  const maxWorldY = LABEL_MAX_SCREEN_PX * worldPerPixel;
  const minWorldY = LABEL_MIN_SCREEN_PX * worldPerPixel;
  const y = Math.max(minWorldY, Math.min(LABEL_BASE_WORLD_Y, maxWorldY));
  label.scale.set(y * LABEL_ASPECT, y, 1);
}

function disposeGroupMaterials(group: THREE.Group): void {
  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const mat = child.material;
    if (!mat) return;
    if (Array.isArray(mat)) {
      for (const m of mat) m.dispose();
    } else {
      mat.dispose();
    }
  });
}

export function buildUrbanSettlementVisuals(
  dataset: UrbanDataset,
  globe: Globe,
  tileTerrain: Map<number, TileTerrainData>,
  year: number,
  riverFlowByTile: Map<number, { exitEdge: number; directionRad: number }> | null,
  isBambooRegionFn: (latDeg: number, lonDeg: number) => boolean,
  mountainEntries?: readonly MountainLatLonEntry[] | null,
): UrbanSettlementRuntime {
  const cities = interpolateUrbanCitiesAtYear(dataset, year);
  const candidates = mapCitiesToCandidatePlacements(
    cities,
    globe,
    tileTerrain,
    mountainEntries,
  );
  const accepted = resolveCrossLandmassAdjacencyConflicts(
    candidates,
    globe,
    tileTerrain,
  );
  const acceptedSelected = accepted;

  const cityExpectedLandmassByCityId = new Map<string, number>();
  const cityPlacedLandmassByCityId = new Map<string, number>();
  const wrongLandmassCities: Array<{
    city: string;
    population: number;
    expectedLandmassId: number;
    placedLandmassId: number;
    tileId: number;
  }> = [];
  for (const c of acceptedSelected) {
    if (c.landmassId != null) cityExpectedLandmassByCityId.set(c.id, c.landmassId);
    const placedLandmassId = tileTerrain.get(c.tileId)?.landmassId;
    if (placedLandmassId == null) continue;
    cityPlacedLandmassByCityId.set(c.id, placedLandmassId);
    if (c.landmassId != null && c.landmassId !== placedLandmassId) {
      wrongLandmassCities.push({
        city: c.city,
        population: c.population,
        expectedLandmassId: c.landmassId,
        placedLandmassId,
        tileId: c.tileId,
      });
    }
  }
  if (wrongLandmassCities.length > 0) {
    wrongLandmassCities.sort((a, b) => b.population - a.population);
    const top = wrongLandmassCities.slice(0, 80);
    console.log(
      `[urban-settlements] Cities on wrong landmass (year ${year}): ${wrongLandmassCities.length}`,
      top.map((c) => ({
        city: c.city,
        pop: Math.round(c.population),
        expectedLandmassId: c.expectedLandmassId,
        placedLandmassId: c.placedLandmassId,
        tileId: c.tileId,
      })),
    );
    if (wrongLandmassCities.length > top.length) {
      console.log(
        `[urban-settlements] ...and ${wrongLandmassCities.length - top.length} more wrong-landmass cities.`,
      );
    }
  } else {
    console.log(`[urban-settlements] Wrong-landmass city check (year ${year}): none.`);
  }
  const byTile = new Map<number, TileSettlement>();
  for (const c of acceptedSelected) {
    const existing = byTile.get(c.tileId);
    if (!existing) {
      byTile.set(c.tileId, {
        tileId: c.tileId,
        population: c.population,
        cityLabel: c.city,
        lat: c.lat,
        lon: c.lon,
        leadingPopulation: c.population,
      });
      continue;
    }
    existing.population += c.population;
    if (c.population > existing.leadingPopulation) {
      existing.leadingPopulation = c.population;
      existing.cityLabel = c.city;
    }
  }

  const settlements = [...byTile.values()].sort((a, b) => b.population - a.population);
  const cityInfoByTileId = new Map<number, { cityLabel: string; population: number }>();
  for (const s of settlements) {
    cityInfoByTileId.set(s.tileId, {
      cityLabel: s.cityLabel,
      population: s.population,
    });
  }
  const entries: SettlementRenderEntry[] = [];
  const clearedTileIds = new Set<number>();

  for (const s of settlements) {
    const tile = globe.getTile(s.tileId);
    if (!tile) continue;
    const norm = normalizedPopulation(
      s.population,
      dataset.minPopulationPositive,
      dataset.maxPopulationModern,
    );
    const maxSlots = Math.min(MAX_BUILDINGS_PER_CITY, tile.vertices.length);
    const count = Math.max(
      1,
      Math.min(maxSlots, Math.round((1 + norm * 24) * 0.5)),
    );
    const style = pickStyleForTerrain(
      tileTerrain.get(s.tileId)?.type,
      isBambooRegionFn(s.lat, s.lon),
    );
    const ids = expandBuildingProgram(
      s,
      year,
      norm,
      count,
    );
    const r = rng(hashString(`${s.tileId}|${year}`));
    shuffleInPlace(ids, r);
    const clearRadiusRings = Math.min(4, Math.max(0, Math.round(norm * 4)));
    collectTilesWithinRings(globe, s.tileId, clearRadiusRings, clearedTileIds);
    entries.push({
      tileId: s.tileId,
      cityLabel: s.cityLabel,
      population: s.population,
      lat: s.lat,
      lon: s.lon,
      normal: tileToNormal(tile).clone(),
      bankVertexDirs: tile.vertices.map((v) => v.clone().normalize()),
      hasRiver: riverFlowByTile?.has(s.tileId) ?? false,
      style,
      buildingIds: ids,
      baseSurfaceRadius:
        globe.radius +
        (tileTerrain.get(s.tileId)?.elevation ?? 0) * URBAN_TERRAIN_ELEVATION_SCALE +
        ((tileTerrain.get(s.tileId)?.isHilly ?? false) ? 0.001 : 0) +
        URBAN_SURFACE_LIFT,
      group: null,
      label: null,
    });
  }

  const buildingsGroup = new THREE.Group();
  buildingsGroup.name = "UrbanSettlements";
  const labelsGroup = new THREE.Group();
  labelsGroup.name = "UrbanSettlementLabels";

  const ranked = entries.map((e, idx) => ({ idx, distSq: Infinity }));
  let frameCounter = 0;
  const clampStats: PlacementClampStats = {
    attempted: 0,
    clampSkipped: 0,
    overlapSkipped: 0,
    drawn: 0,
  };
  let lastClampStatsLoggedAttempted = -1;
  let hasShownOverlapAlert = false;

  function update(camera: THREE.Camera): void {
    frameCounter++;
    const camPos = camera.position;
    if (frameCounter % VISIBILITY_UPDATE_FRAME_STRIDE !== 0) return;
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i]!;
      ranked[i]!.distSq = camPos.distanceToSquared(e.normal);
      ranked[i]!.idx = i;
    }
    ranked.sort((a, b) => a.distSq - b.distSq);

    const visible = new Set<number>();
    let buildingBudget = MAX_VISIBLE_BUILDINGS;
    let selectedCount = 0;
    for (let i = 0; i < ranked.length; i++) {
      if (selectedCount >= MAX_VISIBLE_SETTLEMENTS) break;
      const r = ranked[i]!;
      if (r.distSq > MAX_VISIBLE_DISTANCE * MAX_VISIBLE_DISTANCE) break;
      const e = entries[r.idx]!;
      const cost = Math.max(1, e.buildingIds.length);
      if (buildingBudget - cost < 0) continue;
      buildingBudget -= cost;
      visible.add(r.idx);
      selectedCount++;
    }

    for (let i = 0; i < entries.length; i++) {
      const e = entries[i]!;
      const isVisible = visible.has(i);
      if (isVisible) {
        const buildRes = ensureSettlementBuilt(e, clampStats);
        if (buildRes.overlapDetected && !hasShownOverlapAlert) {
          hasShownOverlapAlert = true;
          if (typeof window !== "undefined" && typeof window.alert === "function") {
            window.alert(
              "Urban overlap detected: some building footprints intersect.",
            );
          }
        }
        if (!e.group!.parent) buildingsGroup.add(e.group!);
        e.group!.visible = true;
        if (URBAN_ENABLE_LABELS) {
          const distSq = camPos.distanceToSquared(e.normal);
          if (distSq <= LABEL_VISIBLE_DISTANCE * LABEL_VISIBLE_DISTANCE) {
            ensureLabelBuilt(e);
            if (!e.label!.parent) labelsGroup.add(e.label!);
            updateLabelScaleForCamera(e.label!, camera);
            e.label!.visible = true;
          } else if (e.label) {
            e.label.visible = false;
          }
        } else if (e.label) {
          e.label.visible = false;
        }
      } else {
        if (e.group) e.group.visible = false;
        if (e.label) e.label.visible = false;
      }
    }
    if (
      clampStats.attempted > 0 &&
      clampStats.attempted !== lastClampStatsLoggedAttempted
    ) {
      lastClampStatsLoggedAttempted = clampStats.attempted;
      const clampFrac = clampStats.clampSkipped / clampStats.attempted;
      const overlapFrac = clampStats.overlapSkipped / clampStats.attempted;
      const totalSkip = clampStats.clampSkipped + clampStats.overlapSkipped;
      const totalSkipFrac = totalSkip / clampStats.attempted;
      console.log("[urban-settlements] placement stats", {
        attempted: clampStats.attempted,
        drawn: clampStats.drawn,
        clampSkipped: clampStats.clampSkipped,
        overlapSkipped: clampStats.overlapSkipped,
        totalSkipped: totalSkip,
        clampFraction: Number(clampFrac.toFixed(4)),
        overlapFraction: Number(overlapFrac.toFixed(4)),
        totalSkipFraction: Number(totalSkipFrac.toFixed(4)),
      });
    }
  }

  function dispose(): void {
    for (const e of entries) {
      if (e.group) disposeGroupMaterials(e.group);
      if (e.label) {
        const mat = e.label.material;
        if (!Array.isArray(mat)) {
          mat.map?.dispose();
          mat.dispose();
        } else {
          for (const m of mat) {
            (m as THREE.SpriteMaterial).map?.dispose();
            m.dispose();
          }
        }
      }
    }
  }

  return {
    buildingsGroup,
    labelsGroup,
    cityCount: entries.length,
    clearedTileIds,
    cityInfoByTileId,
    cityExpectedLandmassByCityId,
    cityPlacedLandmassByCityId,
    update,
    dispose,
  };
}

