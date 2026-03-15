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
  snow: { color: 0xf5f5f5, roughness: 0.8, metalness: 0 },
  forest: { color: 0x3d7028, roughness: 0.9, metalness: 0 },
  grassland: { color: 0x7aac50, roughness: 0.85, metalness: 0 },
  swamp: { color: 0x5d6d3d, roughness: 0.9, metalness: 0 },
};

export interface TileTerrainData {
  tileId: number;
  type: TerrainType;
  elevation: number;
}

/**
 * Build vertex attributes for terrain: color and optional elevation offset per vertex.
 * Assumes geometry has position, normal, and tileId (from createGeodesicGeometry).
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

    const nx = norm.getX(i);
    const ny = norm.getY(i);
    const nz = norm.getZ(i);
    const lift = data.type === "water" ? 0 : data.elevation * elevationScale;
    newPos[i * 3] = pos.getX(i) + nx * lift;
    newPos[i * 3 + 1] = pos.getY(i) + ny * lift;
    newPos[i * 3 + 2] = pos.getZ(i) + nz * lift;
  }

  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("position", new THREE.BufferAttribute(newPos, 3));
  geometry.attributes.position.needsUpdate = true;
  geometry.computeVertexNormals();
}
