/**
 * Terrain coloring and elevation applied to globe geometry.
 * Uses vertex colors and optional displacement by tile.
 */

import * as THREE from "three";
import type { Globe } from "../core/Globe.js";
import { climateSurfaceSnowVisualForTerrain } from "../climate/seasonalClimate.js";
import type { TerrainType } from "./types.js";

export interface TerrainStyle {
  color: THREE.ColorRepresentation;
  roughness?: number;
  metalness?: number;
}

export const TERRAIN_STYLES: Record<TerrainType, TerrainStyle> = {
  // Water / special
  water: { color: 0x2a5a8a, roughness: 0.2, metalness: 0.1 },
  beach: { color: 0xe8d8a8, roughness: 0.9, metalness: 0 },
  mountain: { color: 0x8b8b8b, roughness: 0.95, metalness: 0 },
  
  // Tropical (A) - lush greens
  tropical_rainforest: { color: 0x1a5c1a, roughness: 0.9, metalness: 0 },  // Deep jungle green
  tropical_monsoon: { color: 0x2d6b2d, roughness: 0.9, metalness: 0 },     // Slightly lighter jungle
  tropical_savanna: { color: 0x8ba84a, roughness: 0.85, metalness: 0 },    // Yellow-green savanna
  
  // Arid (B) - browns and tans
  hot_desert: { color: 0xe5c890, roughness: 0.85, metalness: 0 },          // Sandy tan
  cold_desert: { color: 0xc4a875, roughness: 0.85, metalness: 0 },         // Cooler brown
  hot_steppe: { color: 0xb8a060, roughness: 0.85, metalness: 0 },          // Dry grass
  cold_steppe: { color: 0x9a9055, roughness: 0.85, metalness: 0 },         // Dried grass
  
  // Temperate (C) - varied greens
  mediterranean_hot: { color: 0x7a9a50, roughness: 0.85, metalness: 0 },   // Olive/scrub
  mediterranean_warm: { color: 0x6d8d48, roughness: 0.85, metalness: 0 },  // Slightly darker olive
  mediterranean_cold: { color: 0x5f7f40, roughness: 0.85, metalness: 0 },  // Mountain scrub
  humid_subtropical: { color: 0x4a7a35, roughness: 0.9, metalness: 0 },    // Rich green
  subtropical_highland: { color: 0x558844, roughness: 0.9, metalness: 0 }, // Highland green
  subtropical_highland_cold: { color: 0x4a7040, roughness: 0.9, metalness: 0 },
  humid_subtropical_hot: { color: 0x3d6d2d, roughness: 0.9, metalness: 0 }, // Deep subtropical
  oceanic: { color: 0x4a8a4a, roughness: 0.9, metalness: 0 },              // Lush oceanic green
  subpolar_oceanic: { color: 0x3d7040, roughness: 0.9, metalness: 0 },     // Cooler oceanic
  
  // Continental (D) - boreal/taiga greens and browns
  hot_summer_continental: { color: 0x5a8545, roughness: 0.9, metalness: 0 },
  warm_summer_continental: { color: 0x4d7540, roughness: 0.9, metalness: 0 },
  subarctic_dry: { color: 0x4a6a3d, roughness: 0.9, metalness: 0 },        // Sparse taiga
  subarctic_very_cold_dry: { color: 0x3d5a35, roughness: 0.9, metalness: 0 },
  humid_continental_hot: { color: 0x558050, roughness: 0.9, metalness: 0 },
  humid_continental_warm: { color: 0x4a7048, roughness: 0.9, metalness: 0 },
  subarctic_dry_winter: { color: 0x3d6038, roughness: 0.9, metalness: 0 },
  subarctic_very_cold_dry_winter: { color: 0x355530, roughness: 0.9, metalness: 0 },
  humid_continental: { color: 0x4d7545, roughness: 0.9, metalness: 0 },    // Mixed forest
  warm_summer_humid: { color: 0x457040, roughness: 0.9, metalness: 0 },    // Deciduous
  subarctic: { color: 0x3a5535, roughness: 0.9, metalness: 0 },            // Taiga/boreal
  subarctic_very_cold: { color: 0x304a2d, roughness: 0.9, metalness: 0 },  // Sparse taiga
  
  // Polar (E) - whites and grays
  tundra: { color: 0xa0a890, roughness: 0.85, metalness: 0 },              // Lichen/moss gray-green
  ice_cap: { color: 0xe8f0f8, roughness: 0.7, metalness: 0.05 },           // Pure ice
  
  // Legacy/fallback types (keep for compatibility)
  land: { color: 0x6b9b5c, roughness: 0.9, metalness: 0 },
  desert: { color: 0xe5d4a0, roughness: 0.85, metalness: 0 },
  snow: { color: 0xe2e6eb, roughness: 0.8, metalness: 0 },
  ice: { color: 0xd8e8f0, roughness: 0.7, metalness: 0.05 },
  forest: { color: 0x3d7028, roughness: 0.9, metalness: 0 },
  grassland: { color: 0x7aac50, roughness: 0.85, metalness: 0 },
  swamp: { color: 0x5d6d3d, roughness: 0.9, metalness: 0 },
};

export interface TileTerrainData {
  tileId: number;
  type: TerrainType;
  elevation: number;
  /** Linear RGB 0–1 from {@link TERRAIN_STYLES}[type]; filled by {@link precomputeTileTerrainWeatherFields}. */
  baseR?: number;
  baseG?: number;
  baseB?: number;
  /** If set, this tile is a lake (not ocean); used to keep lake tiles water-colored instead of beach. */
  lakeId?: number;
  /** If true, this tile has hilly terrain (high local variance) and gets rounded bump geometry. */
  isHilly?: boolean;
  /**
   * Twelve monthly mean temperatures (°C), index 0 = January … 11 = December, from a global
   * equirectangular layer (e.g. WorldClim). Values vary with longitude and latitude per cell.
   */
  monthlyMeanTempC?: Float32Array;
}

function positionKey(x: number, y: number, z: number): string {
  const p = 1e6;
  return `${Math.round(x * p)},${Math.round(y * p)},${Math.round(z * p)}`;
}

const _precomputeColor = new THREE.Color();

/**
 * Fills {@link TileTerrainData.baseR}/G/B from terrain type and returns water tile ids (`type === "water"` only).
 * Call after terrain types are final for a map (and whenever geometry colors are rebuilt from that map).
 */
export function precomputeTileTerrainWeatherFields(
  tileTerrain: Map<number, TileTerrainData>,
): ReadonlySet<number> {
  const waterIds = new Set<number>();
  for (const [id, data] of tileTerrain) {
    const style = TERRAIN_STYLES[data.type];
    _precomputeColor.set(style.color);
    data.baseR = _precomputeColor.r;
    data.baseG = _precomputeColor.g;
    data.baseB = _precomputeColor.b;
    if (data.type === "water") waterIds.add(id);
  }
  return waterIds;
}

/**
 * Set vertex colors by tileId using a callback (e.g. for lerped animation).
 * Use with flat hex geometry from createGeodesicGeometryFlat.
 * tileId may be negative for special vertices (e.g. snow cap); callback receives it as-is.
 */
export function applyVertexColorsByTileId(
  geometry: THREE.BufferGeometry,
  getColor: (tileId: number) => THREE.ColorRepresentation
): void {
  const tileIdAttr = geometry.getAttribute("tileId") as THREE.BufferAttribute;
  if (!tileIdAttr) return;
  const count = tileIdAttr.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const tid = Math.round(tileIdAttr.getX(i));
    const c = new THREE.Color(getColor(tid));
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

/**
 * Set vertex colors by tileId only (no position change).
 * Use with flat hex geometry from createGeodesicGeometryFlat.
 */
export function applyTerrainColorsToGeometry(
  geometry: THREE.BufferGeometry,
  tileTerrain: Map<number, TileTerrainData>
): void {
  const snowCapColor = TERRAIN_STYLES.snow.color;
  applyVertexColorsByTileId(geometry, (tid) => {
    if (Number(tid) < 0) return snowCapColor;
    const data = tileTerrain.get(tid) ?? {
      tileId: tid,
      type: "water" as TerrainType,
      elevation: 0,
    };
    return TERRAIN_STYLES[data.type].color;
  });
  precomputeTileTerrainWeatherFields(tileTerrain);
}

/**
 * Build vertex attributes for terrain: color and optional elevation offset per vertex.
 * Assumes geometry has position, normal, and tileId (from createGeodesicGeometry).
 * Boundary vertices (shared between tiles) get averaged elevation so adjacent hexes
 * with different elevations stay welded and don't show gaps.
 */
export function applyTerrainToGeometry(
  geometry: THREE.BufferGeometry,
  tileTerrain: Map<number, TileTerrainData>,
  elevationScale: number = 0.1
): void {
  const pos = geometry.getAttribute("position") as THREE.BufferAttribute;
  const norm = geometry.getAttribute("normal") as THREE.BufferAttribute;
  const tileIdAttr = geometry.getAttribute("tileId") as THREE.BufferAttribute;
  if (!pos || !norm || !tileIdAttr) return;

  const count = pos.count;
  const colors = new Float32Array(count * 3);
  const newPos = new Float32Array(pos.array.length);

  const positionToVertices = new Map<string, { indices: number[]; tileIds: number[] }>();
  for (let i = 0; i < count; i++) {
    const tid = Math.round(tileIdAttr.getX(i));
    const key = positionKey(pos.getX(i), pos.getY(i), pos.getZ(i));
    if (!positionToVertices.has(key)) {
      positionToVertices.set(key, { indices: [], tileIds: [] });
    }
    const entry = positionToVertices.get(key)!;
    entry.indices.push(i);
    entry.tileIds.push(tid);
  }

  const vertexLift = new Float32Array(count);
  for (const { indices, tileIds } of positionToVertices.values()) {
    let sumLift = 0;
    for (const tid of tileIds) {
      const data = tileTerrain.get(tid) ?? { tileId: tid, type: "water" as TerrainType, elevation: 0 };
      sumLift += data.elevation * elevationScale;
    }
    const lift = sumLift / tileIds.length;
    for (const i of indices) {
      vertexLift[i] = lift;
    }
  }

  // One canonical position per shared location so adjacent tiles meet exactly (no gaps).
  const i0 = (idx: number) => idx * 3;
  for (const { indices } of positionToVertices.values()) {
    const first = indices[0];
    const lift = vertexLift[first];
    const cx = pos.getX(first) + norm.getX(first) * lift;
    const cy = pos.getY(first) + norm.getY(first) * lift;
    const cz = pos.getZ(first) + norm.getZ(first) * lift;
    for (const i of indices) {
      newPos[i0(i)] = cx;
      newPos[i0(i) + 1] = cy;
      newPos[i0(i) + 2] = cz;
    }
  }

  for (let i = 0; i < count; i++) {
    const tid = Math.round(tileIdAttr.getX(i));
    const data = tileTerrain.get(tid) ?? {
      tileId: tid,
      type: "water" as TerrainType,
      elevation: 0,
    };
    const style = TERRAIN_STYLES[data.type];
    const c = new THREE.Color(style.color);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("position", new THREE.BufferAttribute(newPos, 3));
  geometry.attributes.position.needsUpdate = true;
  geometry.computeVertexNormals();
}

/**
 * Return a new geometry that only draws triangles for tiles whose id is NOT in waterTileIds.
 * Use so the globe mesh shows only land; the ocean can be a separate WaterSphere with the water shader.
 */
export function geometryLandOnly(
  geometry: THREE.BufferGeometry,
  waterTileIds: Set<number>
): THREE.BufferGeometry {
  const indexAttr = geometry.index;
  const tileIdAttr = geometry.getAttribute("tileId") as THREE.BufferAttribute;
  if (!indexAttr || !tileIdAttr) return geometry.clone();

  const landIndices: number[] = [];
  const index = indexAttr.array;
  for (let i = 0; i < index.length; i += 3) {
    const tid = Math.round(tileIdAttr.getX(index[i]));
    if (!waterTileIds.has(tid)) {
      landIndices.push(index[i], index[i + 1], index[i + 2]);
    }
  }
  const out = geometry.clone();
  out.setIndex(landIndices);
  return out;
}

/**
 * Return a new geometry with only water tiles, scaled to oceanFloorRadius (e.g. 0.98).
 * Use as a mesh behind the water surface so we don't see through to the other side of the planet.
 */
export function geometryOceanFloor(
  geometry: THREE.BufferGeometry,
  waterTileIds: Set<number>,
  oceanFloorRadius: number = 0.98
): THREE.BufferGeometry {
  const indexAttr = geometry.index;
  const tileIdAttr = geometry.getAttribute("tileId") as THREE.BufferAttribute;
  if (!indexAttr || !tileIdAttr) return geometry.clone();

  const waterIndices: number[] = [];
  const index = indexAttr.array;
  for (let i = 0; i < index.length; i += 3) {
    const tid = Math.round(tileIdAttr.getX(index[i]));
    if (waterTileIds.has(tid)) {
      waterIndices.push(index[i], index[i + 1], index[i + 2]);
    }
  }
  const out = geometry.clone();
  const pos = out.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    pos.setX(i, pos.getX(i) * oceanFloorRadius);
    pos.setY(i, pos.getY(i) * oceanFloorRadius);
    pos.setZ(i, pos.getZ(i) * oceanFloorRadius);
  }
  pos.needsUpdate = true;
  out.setIndex(waterIndices);
  out.computeVertexNormals();
  return out;
}

/**
 * Return geometry for a patch of tiles at a given surface radius (e.g. for lake water).
 * Keeps only triangles whose tileId is in tileIds; scales those vertices to surfaceRadius.
 * Use with the water shader so lakes render as water at the correct elevation.
 */
export function geometryWaterSurfacePatch(
  geometry: THREE.BufferGeometry,
  tileIds: Set<number>,
  surfaceRadius: number
): THREE.BufferGeometry {
  const indexAttr = geometry.index;
  const tileIdAttr = geometry.getAttribute("tileId") as THREE.BufferAttribute;
  const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
  if (!indexAttr || !tileIdAttr || !posAttr) return geometry.clone();

  const index = indexAttr.array;
  const patchIndices: number[] = [];
  const verticesToScale = new Set<number>();

  for (let i = 0; i < index.length; i += 3) {
    const tid = Math.round(tileIdAttr.getX(index[i]));
    if (tileIds.has(tid)) {
      patchIndices.push(index[i], index[i + 1], index[i + 2]);
      verticesToScale.add(index[i]);
      verticesToScale.add(index[i + 1]);
      verticesToScale.add(index[i + 2]);
    }
  }

  const out = geometry.clone();
  const pos = out.getAttribute("position") as THREE.BufferAttribute;

  for (const vi of verticesToScale) {
    const x = pos.getX(vi);
    const y = pos.getY(vi);
    const z = pos.getZ(vi);
    const len = Math.sqrt(x * x + y * y + z * z) || 1;
    const s = surfaceRadius / len;
    pos.setX(vi, x * s);
    pos.setY(vi, y * s);
    pos.setZ(vi, z * s);
  }
  pos.needsUpdate = true;
  out.setIndex(patchIndices);
  out.computeVertexNormals();
  return out;
}

/**
 * Build geometry for a "coast skirt": vertical quads from each land-water boundary edge
 * down to the water surface radius. Fills the gap under the sides of coastal hexes so
 * you don't see through to space. Call with the same geometry (after applyTerrainToGeometry)
 * and waterTileIds used for geometryLandOnly; waterSurfaceRadius should match the
 * WaterSphere radius (e.g. 0.995).
 */
export function geometryCoastSkirt(
  geometry: THREE.BufferGeometry,
  waterTileIds: Set<number>,
  waterSurfaceRadius: number = 0.995
): THREE.BufferGeometry {
  const indexAttr = geometry.index;
  const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
  const tileIdAttr = geometry.getAttribute("tileId") as THREE.BufferAttribute;
  if (!indexAttr || !posAttr || !tileIdAttr) return new THREE.BufferGeometry();

  const index = indexAttr.array;
  const edgeToTiles = new Map<string, Set<number>>();
  for (let i = 0; i < index.length; i += 3) {
    const tid = Math.round(tileIdAttr.getX(index[i]));
    const a = index[i];
    const b = index[i + 1];
    const c = index[i + 2];
    const addEdge = (u: number, v: number) => {
      const key = u < v ? `${u},${v}` : `${v},${u}`;
      if (!edgeToTiles.has(key)) edgeToTiles.set(key, new Set());
      edgeToTiles.get(key)!.add(tid);
    };
    addEdge(a, b);
    addEdge(b, c);
    addEdge(c, a);
  }

  const positions: number[] = [];
  const indices: number[] = [];
  const processed = new Set<string>();
  const v = new THREE.Vector3();
  const vWater = new THREE.Vector3();

  for (const [edgeKey, tileSet] of edgeToTiles) {
    if (tileSet.size !== 2 || processed.has(edgeKey)) continue;
    const [id1, id2] = Array.from(tileSet);
    const landFirst = !waterTileIds.has(id1);
    const waterFirst = !waterTileIds.has(id2);
    if (!(landFirst !== waterFirst)) continue;
    processed.add(edgeKey);
    const [idxA, idxB] = edgeKey.split(",").map(Number);

    const ax = posAttr.getX(idxA);
    const ay = posAttr.getY(idxA);
    const az = posAttr.getZ(idxA);
    const bx = posAttr.getX(idxB);
    const by = posAttr.getY(idxB);
    const bz = posAttr.getZ(idxB);

    v.set(ax, ay, az).normalize();
    vWater.set(v.x * waterSurfaceRadius, v.y * waterSurfaceRadius, v.z * waterSurfaceRadius);
    const axw = vWater.x;
    const ayw = vWater.y;
    const azw = vWater.z;

    v.set(bx, by, bz).normalize();
    vWater.set(v.x * waterSurfaceRadius, v.y * waterSurfaceRadius, v.z * waterSurfaceRadius);
    const bxw = vWater.x;
    const byw = vWater.y;
    const bzw = vWater.z;

    const base = positions.length / 3;
    positions.push(axw, ayw, azw, bxw, byw, bzw, bx, by, bz, ax, ay, az);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

const _snowTopTint = new THREE.Color(0xf6faff);
const _wetCoolTint = new THREE.Color(0x6a8a9a);
const _landWeatherPackScratch = new THREE.Color();

/** Pack linear RGB (0–1) into one uint32 for per-tile dedupe maps (8 bits / channel). */
function packLandWeatherRgb(r: number, g: number, b: number): number {
  const R = Math.min(255, Math.max(0, Math.round(r * 255)));
  const G = Math.min(255, Math.max(0, Math.round(g * 255)));
  const B = Math.min(255, Math.max(0, Math.round(b * 255)));
  return ((R << 16) | (G << 8) | B) >>> 0;
}

function unpackLandWeatherRgb(packed: number, colors: Float32Array, i: number): void {
  const o = i * 3;
  colors[o] = ((packed >>> 16) & 255) / 255;
  colors[o + 1] = ((packed >>> 8) & 255) / 255;
  colors[o + 2] = (packed & 255) / 255;
}

function packStyleColor(rep: THREE.ColorRepresentation): number {
  _landWeatherPackScratch.set(rep);
  return packLandWeatherRgb(
    _landWeatherPackScratch.r,
    _landWeatherPackScratch.g,
    _landWeatherPackScratch.b,
  );
}

const PACK_LAND_WEATHER_WATER = packStyleColor(TERRAIN_STYLES.water.color);
const PACK_LAND_WEATHER_POLAR_SNOW = packStyleColor(TERRAIN_STYLES.snow.color);

/**
 * Sim snow depth (0–1) plus seasonal/latitude visual snow (0–1), capped at 1.
 * Use for terrain and vegetation so both match.
 */
export function combinedLandSnowCover(
  snowSim: number,
  climateSnowVisual: number
): number {
  const s = Math.max(0, snowSim);
  const c = Math.max(0, climateSnowVisual);
  return Math.min(1, s + c * (1 - 0.5 * s));
}

/** When passed to {@link applyLandSurfaceWeatherVertexColors}, blends seasonal/latitude snow so cold high latitudes look white even with sparse sim snow. */
export interface LandSurfaceWeatherVertexOptions {
  globe: Globe;
  subsolarLatDeg: number;
  /** Calendar instant for monthly mean temperature lookup (UTC). */
  calendarUtc: Date;
}

/** Optional CPU saver: update only a random subset of *land* tiles per call (all vertices on a tile match). */
export interface ApplyLandSurfaceWeatherPaintOptions {
  /**
   * Approximate fraction of **land** tiles to repaint this call (0–1]. Snow caps (negative tileId) and
   * water tiles are always updated. Omitted or `1` → full land pass (default).
   */
  stochasticLandTileFraction?: number;
  /** Changes which tiles are chosen; e.g. increment each flush. */
  stochasticSalt?: number;
}

/** Deterministic: same `tileId` + `salt` always agrees for a given `fraction`. */
export function landWeatherStochasticPickLandTile(
  tileId: number,
  salt: number,
  fraction: number
): boolean {
  if (!(fraction > 0) || fraction >= 1) return true;
  let h = Math.imul((tileId ^ salt) | 0, 0x9e3779b1 | 0);
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d | 0);
  h ^= h >>> 15;
  const u = (h >>> 0) / 0x1_0000_0000;
  return u < fraction;
}

/**
 * Rebuilds land vertex colors from {@link tileTerrain}, then tints by per-tile wetness / snow.
 *
 * **Per tile, not per vertex:** snow/wet tints are uniform across a hex; the heavy work (terrain base +
 * climate snow + sim wet/snow) runs **once per distinct land tile id** per call, then every vertex on
 * that tile copies the packed RGB. The loop is still O(vertices) to **write** the buffer (Three.js
 * single-mesh model). A future win is a small **2D data texture** (one texel per tile) + vertex shader
 * lookup by `tileId` to avoid touching every vertex on CPU.
 *
 * **Precomputing “change times”:** seasonal **climate** snow is deterministic on the calendar and could
 * be baked (e.g. 365× per-tile samples or analytic change-segments vs day-of-year). **Sim** wetness /
 * snow from cloud precip is **stateful** and not on a fixed annual loop — it still needs the live maps
 * each time they change (or a diff from the last revision).
 *
 * @returns false if required attributes are missing or counts mismatch (nothing written).
 */
export function applyLandSurfaceWeatherVertexColors(
  geometry: THREE.BufferGeometry,
  tileTerrain: Map<number, TileTerrainData>,
  waterTileIds: ReadonlySet<number>,
  wetness: ReadonlyMap<number, number>,
  snowCover: ReadonlyMap<number, number>,
  climateOpts?: LandSurfaceWeatherVertexOptions,
  paintOpts?: ApplyLandSurfaceWeatherPaintOptions
): boolean {
  const tileIdAttr = geometry.getAttribute("tileId") as THREE.BufferAttribute | undefined;
  const pos = geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
  if (!tileIdAttr || !pos) return false;
  if (tileIdAttr.count !== pos.count) {
    console.warn(
      "[polyglobe] applyLandSurfaceWeatherVertexColors: tileId vs position vertex count mismatch; skipping paint",
      { tileIdCount: tileIdAttr.count, positionCount: pos.count },
    );
    return false;
  }

  /** One climate snow value per land tile — same for all vertices on that tile (was O(vertices), now O(tiles)). */
  const climateSnowByTile =
    climateOpts != null ? new Map<number, number>() : null;
  const climateSnowForTile = (tid: number): number => {
    if (!climateOpts || climateSnowByTile == null) return 0;
    const cached = climateSnowByTile.get(tid);
    if (cached !== undefined) return cached;
    const latDeg = climateOpts.globe.getTileCenterLatDeg(tid);
    if (latDeg == null || !Number.isFinite(latDeg)) {
      climateSnowByTile.set(tid, 0);
      return 0;
    }
    const row = tileTerrain.get(tid);
    const sn = climateSurfaceSnowVisualForTerrain(
      latDeg,
      climateOpts.subsolarLatDeg,
      row?.type,
      row?.monthlyMeanTempC,
      climateOpts.calendarUtc,
    );
    climateSnowByTile.set(tid, sn);
    return sn;
  };

  const stFrac = paintOpts?.stochasticLandTileFraction;
  const stSalt = paintOpts?.stochasticSalt ?? 0;
  const useStochasticLand =
    stFrac != null && stFrac > 0 && stFrac < 1 && Number.isFinite(stFrac);

  const c = new THREE.Color();
  /** One packed RGB per land tile id — snow/wet logic runs once per tile, not once per vertex. */
  const landRgbByTileId = new Map<number, number>();

  function computeLandTilePackedRgb(
    tid: number,
    data: TileTerrainData,
  ): number {
    if (
      data.baseR !== undefined &&
      data.baseG !== undefined &&
      data.baseB !== undefined
    ) {
      c.setRGB(data.baseR, data.baseG, data.baseB);
    } else {
      c.set(TERRAIN_STYLES[data.type].color);
    }

    const w = wetness.get(tid) ?? 0;
    const snSim = snowCover.get(tid) ?? 0;
    const snClim = climateSnowForTile(tid);
    const sn = combinedLandSnowCover(snSim, snClim);
    /** Match vegetation {@link getTileSnowCover} threshold so hex tops and plants agree. */
    if (sn > 0.002) {
      c.copy(_snowTopTint);
    } else if (w > 0.03) {
      const tw = Math.min(1, w);
      c.lerp(_wetCoolTint, tw * 0.28);
      c.multiplyScalar(Math.min(1.1, 1 + 0.08 * tw));
    }

    return packLandWeatherRgb(c.r, c.g, c.b);
  }

  const vtx = pos.count;
  let colorAttr = geometry.getAttribute("color") as THREE.BufferAttribute | undefined;
  if (!colorAttr || colorAttr.count !== vtx || !(colorAttr.array instanceof Float32Array)) {
    colorAttr = new THREE.BufferAttribute(new Float32Array(vtx * 3), 3);
    geometry.setAttribute("color", colorAttr);
  }
  const colors = colorAttr.array as Float32Array;

  for (let i = 0; i < vtx; i++) {
    const tid = Math.round(tileIdAttr.getX(i));
    if (Number(tid) < 0) {
      unpackLandWeatherRgb(PACK_LAND_WEATHER_POLAR_SNOW, colors, i);
      continue;
    }
    const data = tileTerrain.get(tid) ?? {
      tileId: tid,
      type: "water" as TerrainType,
      elevation: 0,
    };
    if (waterTileIds.has(tid) || data.type === "water") {
      unpackLandWeatherRgb(PACK_LAND_WEATHER_WATER, colors, i);
      continue;
    }

    if (
      useStochasticLand &&
      !landWeatherStochasticPickLandTile(tid, stSalt, stFrac)
    ) {
      continue;
    }

    let packed = landRgbByTileId.get(tid);
    if (packed === undefined) {
      packed = computeLandTilePackedRgb(tid, data);
      landRgbByTileId.set(tid, packed);
    }
    unpackLandWeatherRgb(packed, colors, i);
  }
  colorAttr.needsUpdate = true;
  return true;
}
