/**
 * Wind arrow overlay: instanced arrows above each tile showing wind direction and strength.
 */

import * as THREE from "three";
import type { Globe } from "../core/Globe.js";
import type { TileWind } from "./windPatterns.js";

export interface WindArrowsOptions {
  /** Height above tile center in globe units. Default 0.08 */
  heightOffset?: number;
  /** Arrow length scale (length = strength * arrowScale). Default 0.06 */
  arrowScale?: number;
  /** Base color. Default 0x88ccff */
  color?: THREE.ColorRepresentation;
  /** Minimum strength to show (hide very calm). Default 0.05 */
  minStrength?: number;
  /**
   * When true, iterate only entries in `windByTile` instead of every globe tile (large win when the map
   * is a small subset, e.g. near-player sailing sim).
   */
  sparseInstances?: boolean;
}

const _arrowYAxis = new THREE.Vector3(0, 1, 0);
const _poseDummy = new THREE.Object3D();
const _worldUp = new THREE.Vector3(0, 1, 0);
const _east = new THREE.Vector3();
const _north = new THREE.Vector3();
const _arrowDir = new THREE.Vector3();

function instancedMatrixCapacity(mesh: THREE.InstancedMesh): number {
  return mesh.instanceMatrix.array.length / 16;
}

function disposeInstancedConeChildren(group: THREE.Group): void {
  while (group.children.length > 0) {
    const c = group.children[0]!;
    group.remove(c);
    if (c instanceof THREE.InstancedMesh) {
      c.geometry.dispose();
      if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose());
      else c.material.dispose();
    }
  }
}

function ensureConeInstancedMesh(
  group: THREE.Group,
  globe: Globe,
  color: THREE.ColorRepresentation,
): THREE.InstancedMesh {
  const cap = Math.max(1, globe.tileCount);
  const first = group.children[0];
  if (
    first instanceof THREE.InstancedMesh &&
    instancedMatrixCapacity(first) >= cap
  ) {
    return first;
  }
  disposeInstancedConeChildren(group);
  const arrowGeom = new THREE.ConeGeometry(0.015, 0.08, 6);
  const arrowMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.85,
    depthTest: true,
    depthWrite: false,
  });
  const mesh = new THREE.InstancedMesh(arrowGeom, arrowMat, cap);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(mesh);
  return mesh;
}

/**
 * Create a group containing instanced arrow meshes for wind visualization.
 * Call {@link updateWindArrows} when the wind map or options change.
 */
export function createWindArrows(
  globe: Globe,
  windByTile: Map<number, TileWind>,
  options: WindArrowsOptions = {},
): THREE.Group {
  const group = new THREE.Group();
  group.name = "WindArrows";
  updateWindArrows(group, globe, windByTile, options);
  return group;
}

/**
 * Update wind arrows in place: reuses one {@link THREE.InstancedMesh} + cone geometry instead of
 * disposing and rebuilding every call (large win on high tile counts when the UTC minute advances).
 */
export function updateWindArrows(
  group: THREE.Group,
  globe: Globe,
  windByTile: Map<number, TileWind>,
  options: WindArrowsOptions = {},
): void {
  const {
    heightOffset = 0.08,
    arrowScale = 0.06,
    color = 0x88ccff,
    minStrength = 0.05,
    sparseInstances = false,
  } = options;

  if (windByTile.size === 0) {
    disposeInstancedConeChildren(group);
    return;
  }

  const mesh = ensureConeInstancedMesh(group, globe, color);
  (mesh.material as THREE.MeshBasicMaterial).color.set(color);

  let idx = 0;
  const pushArrow = (tileId: number, w: TileWind) => {
    if (w.strength < minStrength) return;
    const pose = globe.getTilePose(tileId);
    if (!pose) return;
    const { position, up } = pose;
    _poseDummy.position.copy(position).addScaledVector(up, heightOffset);
    const blow = w.directionRad + Math.PI;
    _east.crossVectors(_worldUp, up).normalize();
    if (_east.lengthSq() < 1e-6) _east.set(1, 0, 0).cross(up).normalize();
    _north.crossVectors(up, _east).normalize();
    _arrowDir
      .copy(_east)
      .multiplyScalar(Math.cos(blow))
      .addScaledVector(_north, Math.sin(blow))
      .normalize();
    _poseDummy.quaternion.setFromUnitVectors(_arrowYAxis, _arrowDir);
    _poseDummy.scale.setScalar(w.strength * arrowScale);
    _poseDummy.updateMatrix();
    mesh.setMatrixAt(idx, _poseDummy.matrix);
    idx++;
  };

  if (sparseInstances) {
    for (const [tileId, w] of windByTile) {
      pushArrow(tileId, w);
    }
  } else {
    for (const tile of globe.tiles) {
      const w = windByTile.get(tile.id);
      if (!w) continue;
      pushArrow(tile.id, w);
    }
  }
  mesh.count = idx;
  mesh.instanceMatrix.needsUpdate = true;
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
 * directionRad is the direction water flows; the arrow points in this direction.
 */
export function createFlowArrows(
  globe: Globe,
  flowByTile: Map<number, HexFlow>,
  options: FlowArrowsOptions = {},
): THREE.Group {
  const group = new THREE.Group();
  group.name = "FlowArrows";
  updateFlowArrows(group, globe, flowByTile, options);
  return group;
}

/**
 * Update flow arrows in place (same reuse strategy as {@link updateWindArrows}).
 */
export function updateFlowArrows(
  group: THREE.Group,
  globe: Globe,
  flowByTile: Map<number, HexFlow>,
  options: FlowArrowsOptions = {},
): void {
  const {
    heightOffset = 0.08,
    arrowScale = 0.06,
    color = 0x44aacc,
    minStrength = 0.05,
    sparseInstances = false,
  } = options;

  if (flowByTile.size === 0) {
    disposeInstancedConeChildren(group);
    return;
  }

  const mesh = ensureConeInstancedMesh(group, globe, color);
  (mesh.material as THREE.MeshBasicMaterial).color.set(color);

  let idx = 0;
  const pushArrow = (tileId: number, f: HexFlow) => {
    if (f.strength < minStrength) return;
    const pose = globe.getTilePose(tileId);
    if (!pose) return;
    const { position, up } = pose;
    _poseDummy.position.copy(position).addScaledVector(up, heightOffset);
    _east.crossVectors(_worldUp, up).normalize();
    if (_east.lengthSq() < 1e-6) _east.set(1, 0, 0).cross(up).normalize();
    _north.crossVectors(up, _east).normalize();
    _arrowDir
      .copy(_east)
      .multiplyScalar(Math.cos(f.directionRad))
      .addScaledVector(_north, Math.sin(f.directionRad))
      .normalize();
    _poseDummy.quaternion.setFromUnitVectors(_arrowYAxis, _arrowDir);
    _poseDummy.scale.setScalar(f.strength * arrowScale);
    _poseDummy.updateMatrix();
    mesh.setMatrixAt(idx, _poseDummy.matrix);
    idx++;
  };

  if (sparseInstances) {
    for (const [tileId, f] of flowByTile) {
      pushArrow(tileId, f);
    }
  } else {
    for (const tile of globe.tiles) {
      const f = flowByTile.get(tile.id);
      if (!f) continue;
      pushArrow(tile.id, f);
    }
  }
  mesh.count = idx;
  mesh.instanceMatrix.needsUpdate = true;
}
