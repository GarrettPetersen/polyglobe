/**
 * Precipitation overlay: instanced semi-transparent quads per tile showing rain intensity.
 */

import * as THREE from "three";
import type { Globe } from "../core/Globe.js";
import { tileCenterToLatLon } from "../earth/earthSampling.js";
import {
  getPrecipitation,
  getPrecipitationItczOnly,
} from "./seasonalClimate.js";

/** How {@link fillPrecipitationForGlobeTilesIntoMap} evaluates rain potential per tile. */
export type GlobePrecipFillMode = "full" | "itcz";

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
 * ITCZ-style potential from {@link getPrecipitationByTile}, multiplied per tile by Köppen/terrain
 * moisture (0.07–1.12 typical), then clamped to [0, 1].
 */
export function getPrecipitationByTileWithMoisture(
  tiles: { id: number; center: THREE.Vector3 }[],
  subsolarLatDeg: number,
  moistureByTile: Map<number, number> | null | undefined
): Map<number, number> {
  const base = getPrecipitationByTile(tiles, subsolarLatDeg);
  if (!moistureByTile || moistureByTile.size === 0) return base;
  const out = new Map<number, number>();
  for (const tile of tiles) {
    const p = base.get(tile.id) ?? 0;
    const mul = moistureByTile.get(tile.id) ?? 0.65;
    out.set(tile.id, Math.max(0, Math.min(1, p * mul)));
  }
  return out;
}

/**
 * Same result as {@link getPrecipitationByTileWithMoisture} but writes into `out` (reuse one Map).
 * Skips {@link Map.clear} when `out.size === tiles.length` so keys are overwritten in place.
 */
export function fillPrecipitationByTileWithMoistureIntoMap(
  tiles: { id: number; center: THREE.Vector3 }[],
  subsolarLatDeg: number,
  moistureByTile: Map<number, number> | null | undefined,
  out: Map<number, number>,
): void {
  const n = tiles.length;
  if (out.size !== n) {
    out.clear();
  }
  if (!moistureByTile || moistureByTile.size === 0) {
    for (const tile of tiles) {
      const { lat, lon } = tileCenterToLatLon(tile.center);
      const latDeg = (lat * 180) / Math.PI;
      const lonDeg = (lon * 180) / Math.PI;
      out.set(
        tile.id,
        getPrecipitation(latDeg, subsolarLatDeg, lonDeg),
      );
    }
    return;
  }
  for (const tile of tiles) {
    const { lat, lon } = tileCenterToLatLon(tile.center);
    const latDeg = (lat * 180) / Math.PI;
    const lonDeg = (lon * 180) / Math.PI;
    const p = getPrecipitation(latDeg, subsolarLatDeg, lonDeg);
    const mul = moistureByTile.get(tile.id) ?? 0.65;
    out.set(tile.id, Math.max(0, Math.min(1, p * mul)));
  }
}

/**
 * Same as {@link fillPrecipitationByTileWithMoistureIntoMap} but uses {@link Globe.tileCenterLatDeg} /
 * {@link Globe.tileCenterLonDeg} (no per-tile {@link tileCenterToLatLon}). `itcz` skips polar band and
 * longitude noise for a large CPU win on high subdivisions.
 */
export function fillPrecipitationForGlobeTilesIntoMap(
  globe: Globe,
  subsolarLatDeg: number,
  moistureByTile: Map<number, number> | null | undefined,
  out: Map<number, number>,
  mode: GlobePrecipFillMode,
): void {
  const n = globe.tileCount;
  if (out.size !== n) {
    out.clear();
  }
  const latArr = globe.tileCenterLatDeg;
  const lonArr = globe.tileCenterLonDeg;
  const hasMoisture = moistureByTile && moistureByTile.size > 0;

  if (mode === "itcz") {
    if (!hasMoisture) {
      for (let i = 0; i < n; i++) {
        out.set(
          i,
          getPrecipitationItczOnly(latArr[i]!, subsolarLatDeg),
        );
      }
      return;
    }
    for (let i = 0; i < n; i++) {
      const p = getPrecipitationItczOnly(latArr[i]!, subsolarLatDeg);
      const mul = moistureByTile!.get(i) ?? 0.65;
      out.set(i, Math.max(0, Math.min(1, p * mul)));
    }
    return;
  }

  if (!hasMoisture) {
    for (let i = 0; i < n; i++) {
      out.set(
        i,
        getPrecipitation(latArr[i]!, subsolarLatDeg, lonArr[i]!),
      );
    }
    return;
  }
  for (let i = 0; i < n; i++) {
    const p = getPrecipitation(latArr[i]!, subsolarLatDeg, lonArr[i]!);
    const mul = moistureByTile!.get(i) ?? 0.65;
    out.set(i, Math.max(0, Math.min(1, p * mul)));
  }
}

function instancedMatrixCapacity(mesh: THREE.InstancedMesh): number {
  return mesh.instanceMatrix.array.length / 16;
}

function disposePrecipOverlayMesh(mesh: THREE.InstancedMesh): void {
  mesh.geometry.dispose();
  const mat = mesh.material;
  if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
  else mat.dispose();
}

function resolvePrecipitationOverlayOpts(
  options: PrecipitationOverlayOptions,
): Required<PrecipitationOverlayOptions> {
  return {
    heightOffset: options.heightOffset ?? 0.06,
    quadSize: options.quadSize ?? 0.08,
    opacity: options.opacity ?? 0.5,
    minPrecip: options.minPrecip ?? 0.05,
  };
}

/**
 * Reuse or create the instanced mesh when capacity / globe size is compatible; otherwise replace.
 */
function ensurePrecipitationOverlayMesh(
  group: THREE.Group,
  globe: Globe,
  opts: Required<PrecipitationOverlayOptions>,
): THREE.InstancedMesh {
  const cap = Math.max(1, globe.tileCount);
  const first = group.children[0];
  if (
    first instanceof THREE.InstancedMesh &&
    instancedMatrixCapacity(first) >= cap
  ) {
    (first.material as THREE.MeshBasicMaterial).opacity = opts.opacity;
    return first;
  }
  while (group.children.length > 0) {
    const c = group.children[0]!;
    group.remove(c);
    if (c instanceof THREE.InstancedMesh) disposePrecipOverlayMesh(c);
  }
  const plane = new THREE.PlaneGeometry(1, 1, 1, 1);
  const mat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: opts.opacity,
    depthWrite: false,
    depthTest: true,
    /** Instance tints only; avoid vertexColors so we never multiply by missing per-vertex colors. */
    vertexColors: false,
    toneMapped: false,
    fog: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.InstancedMesh(plane, mat, cap);
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const colorInit = new Float32Array(cap * 3);
  colorInit.fill(1);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(colorInit, 3);
  mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  group.add(mesh);
  return mesh;
}

const _precipDummy = new THREE.Object3D();
const _precipColor = new THREE.Color();
const _precipZ = new THREE.Vector3(0, 0, 1);

function writePrecipitationOverlayInstances(
  mesh: THREE.InstancedMesh,
  globe: Globe,
  precipByTile: Map<number, number>,
  opts: Required<PrecipitationOverlayOptions>,
): void {
  const { heightOffset, quadSize, minPrecip } = opts;
  let idx = 0;
  for (const tile of globe.tiles) {
    const p = precipByTile.get(tile.id) ?? 0;
    if (p < minPrecip) continue;
    const pose = globe.getTilePose(tile.id);
    if (!pose) continue;
    const { position, up } = pose;
    _precipDummy.position.copy(position).addScaledVector(up, heightOffset);
    _precipDummy.quaternion.setFromUnitVectors(_precipZ, up);
    _precipDummy.scale.set(quadSize * 2, quadSize * 2, 1);
    _precipDummy.updateMatrix();
    mesh.setMatrixAt(idx, _precipDummy.matrix);
    const intensity = 0.25 + 0.6 * p;
    _precipColor.setRGB(0.2 * intensity, 0.4 * intensity, 0.9 * intensity);
    mesh.setColorAt(idx, _precipColor);
    idx++;
  }
  mesh.count = idx;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

/**
 * Create a group containing an instanced mesh of quads for precipitation overlay.
 */
export function createPrecipitationOverlay(
  globe: Globe,
  precipByTile: Map<number, number>,
  options: PrecipitationOverlayOptions = {}
): THREE.Group {
  const group = new THREE.Group();
  group.name = "PrecipitationOverlay";
  const opts = resolvePrecipitationOverlayOpts(options);
  const mesh = ensurePrecipitationOverlayMesh(group, globe, opts);
  writePrecipitationOverlayInstances(mesh, globe, precipByTile, opts);
  return group;
}

/**
 * Update existing precipitation overlay after precip map or options changed.
 * Reuses geometry and material (same strategy as {@link updateWindArrows}) so sim-minute refreshes
 * do not allocate or churn GPU resources.
 */
export function updatePrecipitationOverlay(
  group: THREE.Group,
  globe: Globe,
  precipByTile: Map<number, number>,
  options: PrecipitationOverlayOptions = {}
): void {
  const opts = resolvePrecipitationOverlayOpts(options);
  const mesh = ensurePrecipitationOverlayMesh(group, globe, opts);
  writePrecipitationOverlayInstances(mesh, globe, precipByTile, opts);
}
