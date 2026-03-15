/**
 * Coast mask texture: 1 where water meets land (for foam), 0 elsewhere.
 * Sample in the water shader with UV from world position to restrict foam to coastlines.
 */

import * as THREE from "three";
import type { Globe } from "../core/Globe.js";

const TAU = 2 * Math.PI;

/**
 * Create a DataTexture encoding coast pixels (1 = water tile adjacent to land, 0 = elsewhere).
 * UV mapping: u = longitude in [0,1], v = latitude in [0,1] (v=0 south, v=1 north).
 * So direction from (u,v): lon = u*TAU - PI, lat = (v - 0.5)*PI.
 */
export function createCoastMaskTexture(
  globe: Globe,
  tileTerrain: Map<number, { type: string }>,
  width: number = 256,
  height: number = 128
): THREE.DataTexture {
  const data = new Uint8Array(width * height);
  const dir = new THREE.Vector3();

  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      const u = (i + 0.5) / width;
      const v = (j + 0.5) / height;
      const lon = u * TAU - Math.PI;
      const lat = (v - 0.5) * Math.PI;
      const cosLat = Math.cos(lat);
      dir.set(Math.cos(lon) * cosLat, Math.sin(lat), Math.sin(lon) * cosLat);

      const tileId = globe.getTileIdAtDirection(dir);
      const tile = globe.getTile(tileId);
      const type = tileTerrain.get(tileId)?.type ?? "water";
      const isWater = type === "water" || type === "beach";
      const hasLandNeighbor =
        tile?.neighbors.some((n) => {
          const t = tileTerrain.get(n)?.type ?? "water";
          return t !== "water" && t !== "beach";
        }) ?? false;
      const isCoast = isWater && hasLandNeighbor;
      data[i + j * width] = isCoast ? 255 : 0;
    }
  }

  const tex = new THREE.DataTexture(data, width, height, THREE.RedFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Coast LAND mask: 1 on land (non-water, non-beach) tiles that border water/beach.
 * Used to draw left-behind foam on the beach (high-water mark).
 * Same UV mapping as createCoastMaskTexture.
 */
export function createCoastLandMaskTexture(
  globe: Globe,
  tileTerrain: Map<number, { type: string }>,
  width: number = 256,
  height: number = 128
): THREE.DataTexture {
  const data = new Uint8Array(width * height);
  const dir = new THREE.Vector3();

  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      const u = (i + 0.5) / width;
      const v = (j + 0.5) / height;
      const lon = u * TAU - Math.PI;
      const lat = (v - 0.5) * Math.PI;
      const cosLat = Math.cos(lat);
      dir.set(Math.cos(lon) * cosLat, Math.sin(lat), Math.sin(lon) * cosLat);

      const tileId = globe.getTileIdAtDirection(dir);
      const tile = globe.getTile(tileId);
      const type = tileTerrain.get(tileId)?.type ?? "water";
      const isLand = type !== "water" && type !== "beach";
      const hasWaterNeighbor =
        tile?.neighbors.some((n) => {
          const t = tileTerrain.get(n)?.type ?? "water";
          return t === "water" || t === "beach";
        }) ?? false;
      const isCoastLand = isLand && hasWaterNeighbor;
      data[i + j * width] = isCoastLand ? 255 : 0;
    }
  }

  const tex = new THREE.DataTexture(data, width, height, THREE.RedFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}
