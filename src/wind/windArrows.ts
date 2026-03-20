/**
 * Wind arrow overlay: instanced arrows above each tile showing wind direction and strength.
 */

import * as THREE from "three";
import type { Globe } from "../core/Globe.js";
import type { TileWind } from "./windPatterns.js";

export interface WindArrowsOptions {
  /** Height above tile center in globe units. Default 0.08. */
  heightOffset?: number;
  /** Arrow length scale (length = strength * arrowScale). Default 0.06. */
  arrowScale?: number;
  /** Base color. Default 0x88ccff. */
  color?: THREE.ColorRepresentation;
  /** Minimum strength to show (hide very calm). Default 0.05. */
  minStrength?: number;
}

/**
 * Create a group containing instanced arrow meshes for wind visualization.
 * Call updateWindArrows when the wind map or options change.
 */
export function createWindArrows(
  globe: Globe,
  windByTile: Map<number, TileWind>,
  options: WindArrowsOptions = {}
): THREE.Group {
  const {
    heightOffset = 0.08,
    arrowScale = 0.06,
    color = 0x88ccff,
    minStrength = 0.05,
  } = options;

  const group = new THREE.Group();
  group.name = "WindArrows";

  const count = windByTile.size;
  if (count === 0) return group;

  // Single arrow: cone or thin box pointing in +Y (we'll rotate per instance)
  const arrowGeom = new THREE.ConeGeometry(0.015, 0.08, 6);
  const arrowMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.85,
    depthTest: true,
    depthWrite: false,
  });
  const mesh = new THREE.InstancedMesh(arrowGeom, arrowMat, count);
  mesh.count = 0; // set in update
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(mesh);

  const dummy = new THREE.Object3D();
  const worldUp = new THREE.Vector3(0, 1, 0);
  const east = new THREE.Vector3();
  const north = new THREE.Vector3();
  const arrowDir = new THREE.Vector3();

  let idx = 0;
  for (const tile of globe.tiles) {
    const w = windByTile.get(tile.id);
    if (!w || w.strength < minStrength) continue;
    const pose = globe.getTilePose(tile.id);
    if (!pose) continue;
    const { position, up } = pose;
    dummy.position.copy(position).add(up.clone().multiplyScalar(heightOffset));
    // Wind "from" direction = directionRad. Arrow points where wind blows = directionRad + π
    const blow = w.directionRad + Math.PI;
    east.crossVectors(worldUp, up).normalize();
    if (east.lengthSq() < 1e-6) east.set(1, 0, 0).cross(up).normalize();
    north.crossVectors(up, east).normalize();
    arrowDir.copy(east).multiplyScalar(Math.cos(blow)).addScaledVector(north, Math.sin(blow)).normalize();
    dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), arrowDir);
    dummy.scale.setScalar(w.strength * arrowScale);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);
    idx++;
  }
  mesh.count = idx;
  mesh.instanceMatrix.needsUpdate = true;

  return group;
}

/**
 * Update existing wind arrows group after wind map or options changed.
 * Clears the group and adds a fresh instanced mesh.
 */
export function updateWindArrows(
  group: THREE.Group,
  globe: Globe,
  windByTile: Map<number, TileWind>,
  options: WindArrowsOptions = {}
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
  const fresh = createWindArrows(globe, windByTile, options);
  for (const c of fresh.children) group.add(c);
}

/** Flow at a tile (river or ocean current): direction water flows, strength 0–1. */
export interface HexFlow {
  /** Direction of flow in tile tangent plane (radians). Arrow points this way. */
  directionRad: number;
  /** Relative strength (0–1). */
  strength: number;
}

/** Same options as wind arrows; used for flow (rivers + currents) overlay. */
export interface FlowArrowsOptions extends WindArrowsOptions {}

/**
 * Create a group of instanced arrows for hex flow (rivers + ocean currents).
 * directionRad is the direction water flows; the arrow points in that direction.
 */
export function createFlowArrows(
  globe: Globe,
  flowByTile: Map<number, HexFlow>,
  options: FlowArrowsOptions = {}
): THREE.Group {
  const {
    heightOffset = 0.08,
    arrowScale = 0.06,
    color = 0x44aacc,
    minStrength = 0.05,
  } = options;

  const group = new THREE.Group();
  group.name = "FlowArrows";

  const count = flowByTile.size;
  if (count === 0) return group;

  const arrowGeom = new THREE.ConeGeometry(0.015, 0.08, 6);
  const arrowMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.85,
    depthTest: true,
    depthWrite: false,
  });
  const mesh = new THREE.InstancedMesh(arrowGeom, arrowMat, count);
  mesh.count = 0;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(mesh);

  const dummy = new THREE.Object3D();
  const worldUp = new THREE.Vector3(0, 1, 0);
  const east = new THREE.Vector3();
  const north = new THREE.Vector3();
  const arrowDir = new THREE.Vector3();

  let idx = 0;
  for (const tile of globe.tiles) {
    const f = flowByTile.get(tile.id);
    if (!f || f.strength < minStrength) continue;
    const pose = globe.getTilePose(tile.id);
    if (!pose) continue;
    const { position, up } = pose;
    dummy.position.copy(position).add(up.clone().multiplyScalar(heightOffset));
    // Flow direction = directionRad (arrow points in flow direction, no +π)
    east.crossVectors(worldUp, up).normalize();
    if (east.lengthSq() < 1e-6) east.set(1, 0, 0).cross(up).normalize();
    north.crossVectors(up, east).normalize();
    arrowDir.copy(east).multiplyScalar(Math.cos(f.directionRad)).addScaledVector(north, Math.sin(f.directionRad)).normalize();
    dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), arrowDir);
    dummy.scale.setScalar(f.strength * arrowScale);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);
    idx++;
  }
  mesh.count = idx;
  mesh.instanceMatrix.needsUpdate = true;

  return group;
}

/**
 * Update existing flow arrows group after flow map or options changed.
 */
export function updateFlowArrows(
  group: THREE.Group,
  globe: Globe,
  flowByTile: Map<number, HexFlow>,
  options: FlowArrowsOptions = {}
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
  const fresh = createFlowArrows(globe, flowByTile, options);
  for (const c of fresh.children) group.add(c);
}
