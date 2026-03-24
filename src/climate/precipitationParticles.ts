/**
 * Lightweight instanced “streaks” under active cloud precip: blue rain vs white snow from temperature.
 */

import * as THREE from "three";
import type { Globe } from "../core/Globe.js";
import { tileCenterToLatLon } from "../earth/earthSampling.js";
import type { TerrainType } from "../terrain/types.js";
import {
  getTileTemperature01,
  SNOW_PRECIPITATION_TEMPERATURE_THRESHOLD_01,
} from "./seasonalClimate.js";

function mixHash(a: number, b: number): number {
  let h = (2166136261 ^ a) >>> 0;
  h = Math.imul(h ^ b, 16777619) >>> 0;
  return h >>> 0;
}

export interface PrecipitationParticlesOptions {
  maxStreaks?: number;
  streakLength?: number;
}

export function createPrecipitationParticlesGroup(
  options: PrecipitationParticlesOptions = {}
): THREE.Group {
  const maxStreaks = options.maxStreaks ?? 420;
  const streakLen = options.streakLength ?? 0.042;
  const g = new THREE.Group();
  g.name = "PrecipitationParticles";

  const geom = new THREE.CylinderGeometry(0.0011, 0.0011, streakLen, 4, 1, true);
  const mat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
    vertexColors: true,
    toneMapped: false,
    fog: false,
  });
  const mesh = new THREE.InstancedMesh(geom, mat, maxStreaks);
  mesh.count = 0;
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(maxStreaks * 3), 3);
  g.add(mesh);
  g.userData.maxStreaks = maxStreaks;
  return g;
}

export function disposePrecipitationParticlesGroup(group: THREE.Group): void {
  for (const ch of group.children) {
    if (ch instanceof THREE.InstancedMesh) {
      ch.geometry.dispose();
      (ch.material as THREE.Material).dispose();
    }
  }
  group.clear();
}

const _dummy = new THREE.Object3D();
const _east = new THREE.Vector3();
const _north = new THREE.Vector3();
const _worldUp = new THREE.Vector3(0, 1, 0);
const _col = new THREE.Color();
const _particleCandScratch: number[] = [];

/**
 * Repopulates instances from tiles with active overlay precip. `simUtcMinute` seeds layout; `timeSec`
 * animates fall along tile normal.
 *
 * When `candidateTileIds` is set (e.g. from {@link CloudClipField.getPrecipParticleCandidateTileIds}),
 * skips scanning `precipOverlay` each frame.
 */
export function updatePrecipitationParticles(
  group: THREE.Group,
  globe: Globe,
  precipOverlay: ReadonlyMap<number, number>,
  subsolarLatDeg: number,
  simUtcMinute: number,
  timeSec: number,
  getTerrainTypeForTile?: (tileId: number) => TerrainType | undefined,
  getMonthlyMeanTempCForTile?: (tileId: number) => Float32Array | undefined,
  candidateTileIds?: readonly number[]
): void {
  const mesh = group.children[0] as THREE.InstancedMesh | undefined;
  if (!mesh?.instanceColor) return;
  const maxStreaks = (group.userData.maxStreaks as number) ?? 420;

  let pool: readonly number[];
  if (candidateTileIds != null) {
    pool = candidateTileIds;
  } else {
    const scratch = _particleCandScratch;
    scratch.length = 0;
    for (const [tid, v] of precipOverlay) {
      if (v > 0.055) scratch.push(tid);
    }
    pool = scratch;
  }

  const seed = (Math.floor(simUtcMinute) ^ Math.floor(timeSec * 30)) >>> 0;
  let ci = 0;

  for (let k = 0; k < maxStreaks && pool.length > 0; k++) {
    const pick = (seed + k * 0x9e3779b9) >>> 0;
    const j = pick % pool.length;
    const tid = pool[j]!;
    const pose = globe.getTilePose(tid);
    if (!pose) continue;

    _east.copy(pose.position).normalize();
    const { lat } = tileCenterToLatLon(_east);
    const latDeg = (lat * 180) / Math.PI;
    const terrain = getTerrainTypeForTile?.(tid);
    const monthly = getMonthlyMeanTempCForTile?.(tid);
    const cal = new Date(Math.floor(simUtcMinute) * 60000);
    const temp = getTileTemperature01(
      latDeg,
      subsolarLatDeg,
      terrain,
      monthly,
      cal
    );
    const isSnow = temp < SNOW_PRECIPITATION_TEMPERATURE_THRESHOLD_01;

    const h = mixHash(pick, tid);
    const phase = ((timeSec * (isSnow ? 0.9 : 3.4) + (h >>> 8) * 1e-4) % 1 + 1) % 1;
    const ang = (unitF(h) * Math.PI * 2) % (Math.PI * 2);
    const jitterR = 0.024 * unitF(h >>> 16);

    const { position: pos, up } = pose;
    _east.copy(_worldUp).cross(up);
    if (_east.lengthSq() < 1e-8) _east.set(1, 0, 0).cross(up);
    _east.normalize();
    _north.copy(up).cross(_east).normalize();

    _dummy.position.copy(pos);
    _dummy.position.addScaledVector(_east, Math.cos(ang) * jitterR * pos.length());
    _dummy.position.addScaledVector(_north, Math.sin(ang) * jitterR * pos.length());
    _dummy.position.addScaledVector(up, 0.065 + phase * (isSnow ? 0.055 : 0.095));

    _dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
    const sx = isSnow ? 1.35 : 0.82;
    const sy = isSnow ? 0.5 : 1.15;
    const sz = isSnow ? 1.35 : 0.82;
    _dummy.scale.set(sx, sy, sz);
    _dummy.updateMatrix();
    mesh.setMatrixAt(ci, _dummy.matrix);

    if (isSnow) _col.setRGB(0.93, 0.96, 1);
    else _col.setRGB(0.32, 0.52, 0.95);
    mesh.setColorAt(ci, _col);
    ci++;
  }

  mesh.count = ci;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;
}

function unitF(h: number): number {
  return (h >>> 0) / 0xffffffff;
}
