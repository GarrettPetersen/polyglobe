/**
 * Terrain coloring and elevation applied to globe geometry.
 * Uses vertex colors and optional displacement by tile.
 */

import * as THREE from "three";
import type { TerrainType } from "./types.js";

export interface TerrainStyle {
  color: THREE.ColorRepresentation;
  roughness?: number;
  metalness?: number;
}

export const TERRAIN_STYLES: Record<TerrainType, TerrainStyle> = {
  water: { color: 0x2a5a8a, roughness: 0.2, metalness: 0.1 },
  land: { color: 0x6b9b5c, roughness: 0.9, metalness: 0 },
  mountain: { color: 0x8b8b8b, roughness: 0.95, metalness: 0 },
  desert: { color: 0xe5d4a0, roughness: 0.85, metalness: 0 },
  snow: { color: 0xffffff, roughness: 0.8, metalness: 0 },
  ice: { color: 0xd8e8f0, roughness: 0.7, metalness: 0.05 },
  forest: { color: 0x3d7028, roughness: 0.9, metalness: 0 },
  grassland: { color: 0x7aac50, roughness: 0.85, metalness: 0 },
  swamp: { color: 0x5d6d3d, roughness: 0.9, metalness: 0 },
  beach: { color: 0xe8d8a8, roughness: 0.9, metalness: 0 },
};

export interface TileTerrainData {
  tileId: number;
  type: TerrainType;
  elevation: number;
  /** If set, this tile is a lake (not ocean); used to keep lake tiles water-colored instead of beach. */
  lakeId?: number;
}

function positionKey(x: number, y: number, z: number): string {
  const p = 1e6;
  return `${Math.round(x * p)},${Math.round(y * p)},${Math.round(z * p)}`;
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
