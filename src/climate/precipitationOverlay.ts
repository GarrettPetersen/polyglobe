/**
 * Precipitation overlay: instanced semi-transparent quads per tile showing rain intensity.
 */

import * as THREE from "three";
import type { Globe } from "../core/Globe.js";
import { tileCenterToLatLon } from "../earth/earthSampling.js";
import { getPrecipitation } from "./seasonalClimate.js";

export interface PrecipitationOverlayOptions {
  /** Height above tile center in globe units. Default 0.06 */
  heightOffset?: number;
  /** Quad size (half-extent) in globe units. Default 0.08 */
  quadSize?: number;
  /** Base opacity. Default 0.5 */
  opacity?: number;
  /** Min precip to show (skip tiles below). Default 0.05 */
  minPrecip?: number;
}

/**
 * Build precip-by-tile from globe tiles and subsolar latitude.
 */
export function getPrecipitationByTile(
  tiles: { id: number; center: THREE.Vector3 }[],
  subsolarLatDeg: number
): Map<number, number> {
  const out = new Map<number, number>();
  for (const tile of tiles) {
    const { lat, lon } = tileCenterToLatLon(tile.center);
    const latDeg = (lat * 180) / Math.PI;
    const lonDeg = (lon * 180) / Math.PI;
    out.set(tile.id, getPrecipitation(latDeg, subsolarLatDeg, lonDeg));
  }
  return out;
}

/**
 * Create a group containing an instanced mesh of quads for precipitation overlay.
 */
export function createPrecipitationOverlay(
  globe: Globe,
  precipByTile: Map<number, number>,
  options: PrecipitationOverlayOptions = {}
): THREE.Group {
  const {
    heightOffset = 0.06,
    quadSize = 0.08,
    opacity = 0.5,
    minPrecip = 0.05,
  } = options;

  const group = new THREE.Group();
  group.name = "PrecipitationOverlay";

  const tiles = globe.tiles;
  const count = tiles.length;
  const plane = new THREE.PlaneGeometry(1, 1, 1, 1);
  const mat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: true,
    vertexColors: true,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.InstancedMesh(plane, mat, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
  group.add(mesh);

  const dummy = new THREE.Object3D();
  const worldUp = new THREE.Vector3(0, 1, 0);
  const east = new THREE.Vector3();
  const north = new THREE.Vector3();
  const color = new THREE.Color();

  let idx = 0;
  for (const tile of tiles) {
    const p = precipByTile.get(tile.id) ?? 0;
    if (p < minPrecip) continue;
    const pose = globe.getTilePose(tile.id);
    if (!pose) continue;
    const { position, up } = pose;
    dummy.position.copy(position).add(up.clone().multiplyScalar(heightOffset));
    east.crossVectors(worldUp, up).normalize();
    if (east.lengthSq() < 1e-6) east.set(1, 0, 0).cross(up).normalize();
    north.crossVectors(up, east).normalize();
    dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), up);
    dummy.scale.set(quadSize * 2, quadSize * 2, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);
    const intensity = 0.25 + 0.6 * p;
    color.setRGB(0.2 * intensity, 0.4 * intensity, 0.9 * intensity);
    mesh.setColorAt(idx, color);
    idx++;
  }
  mesh.count = idx;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

  return group;
}

/**
 * Update existing precipitation overlay after precip map or options changed.
 */
export function updatePrecipitationOverlay(
  group: THREE.Group,
  globe: Globe,
  precipByTile: Map<number, number>,
  options: PrecipitationOverlayOptions = {}
): void {
  while (group.children.length > 0) {
    const c = group.children[0];
    group.remove(c);
    if (c instanceof THREE.InstancedMesh) {
      c.geometry.dispose();
      if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose());
      else c.material.dispose();
    }
  }
  const fresh = createPrecipitationOverlay(globe, precipByTile, options);
  for (const c of fresh.children) group.add(c);
}
