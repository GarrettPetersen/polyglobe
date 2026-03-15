/**
 * Place assets on the globe by tile ID (hex/pentagon) instead of x/y/z.
 */

import * as THREE from "three";
import type { Globe } from "../core/Globe.js";

export interface PlaceOptions {
  /** Tile ID (hex or pentagon index from the globe). */
  tileId: number;
  /** Offset along the tile normal (positive = above surface). Default 0. */
  heightOffset?: number;
  /** Rotate around the tile normal (radians). Default 0. */
  bearing?: number;
  /** Scale. Default 1. */
  scale?: number;
}

/**
 * Get a matrix that places an object at the given tile: position at tile center (plus height),
 * oriented so +Y is "up" (away from planet center).
 */
export function getPlacementMatrix(globe: Globe, options: PlaceOptions): THREE.Matrix4 {
  const pose = globe.getTilePose(options.tileId);
  if (!pose) {
    return new THREE.Matrix4();
  }
  const { position, up } = pose;
  const heightOffset = options.heightOffset ?? 0;
  const bearing = options.bearing ?? 0;
  const scale = options.scale ?? 1;

  const pos = position.clone().add(up.clone().multiplyScalar(heightOffset));
  const quat = new THREE.Quaternion();
  quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
  if (bearing !== 0) {
    const qBear = new THREE.Quaternion().setFromAxisAngle(up, bearing);
    quat.premultiply(qBear);
  }
  const mat = new THREE.Matrix4();
  mat.compose(pos, quat, new THREE.Vector3(scale, scale, scale));
  return mat;
}

/**
 * Place a Three.js object on the globe at the given tile. Modifies object's matrix.
 */
export function placeObject(
  object: THREE.Object3D,
  globe: Globe,
  options: PlaceOptions
): void {
  object.matrix.copy(getPlacementMatrix(globe, options));
  object.matrixAutoUpdate = false;
}

/**
 * Get world position and quaternion for a tile (e.g. for attaching to a moving globe).
 */
export function getTileTransform(
  globe: Globe,
  options: PlaceOptions
): { position: THREE.Vector3; quaternion: THREE.Quaternion; scale: THREE.Vector3 } {
  const pose = globe.getTilePose(options.tileId);
  if (!pose) {
    return {
      position: new THREE.Vector3(),
      quaternion: new THREE.Quaternion(),
      scale: new THREE.Vector3(1, 1, 1),
    };
  }
  const heightOffset = options.heightOffset ?? 0;
  const bearing = options.bearing ?? 0;
  const s = options.scale ?? 1;
  const position = pose.position.clone().add(pose.up.clone().multiplyScalar(heightOffset));
  const quaternion = new THREE.Quaternion();
  quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pose.up);
  if (bearing !== 0) {
    const qBear = new THREE.Quaternion().setFromAxisAngle(pose.up, bearing);
    quaternion.premultiply(qBear);
  }
  return { position, quaternion, scale: new THREE.Vector3(s, s, s) };
}
