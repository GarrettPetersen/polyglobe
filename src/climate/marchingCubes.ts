/**
 * Marching cubes: extract a mesh from a 3D scalar field (SDF) via iso-surface.
 * Used for smooth SDF cloud blobs.
 */

import * as THREE from "three";
import { EDGE_TABLE, TRIANGLE_TABLE } from "./marchingCubesTables.js";

/** Cube corner index to (i,j,k) offset in grid cell. Order matches standard MC: v0=(0,0,0), v1=(0,1,0), v2=(1,1,0), v3=(1,0,0), v4=(0,0,1), ... */
const CORNER_OFFSETS: [number, number, number][] = [
  [0, 0, 0],
  [0, 1, 0],
  [1, 1, 0],
  [1, 0, 0],
  [0, 0, 1],
  [0, 1, 1],
  [1, 1, 1],
  [1, 0, 1],
];

/** For each edge 0..11, the two corner indices. */
const EDGE_CORNERS: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 4],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
];

export interface MarchingCubesOptions {
  /** Iso-surface value. Points with sdf < isoLevel are "inside". Default 0. */
  isoLevel?: number;
}

/**
 * Run marching cubes on a scalar field (e.g. SDF) over a 3D grid.
 * Returns a BufferGeometry with positions and normals (no UVs).
 */
export function marchingCubes(
  sdf: (x: number, y: number, z: number) => number,
  minX: number,
  minY: number,
  minZ: number,
  maxX: number,
  maxY: number,
  maxZ: number,
  resolution: number,
  options: MarchingCubesOptions = {}
): THREE.BufferGeometry {
  const isoLevel = options.isoLevel ?? 0;
  const stepX = (maxX - minX) / resolution;
  const stepY = (maxY - minY) / resolution;
  const stepZ = (maxZ - minZ) / resolution;

  const vertices: number[] = [];
  const indices: number[] = [];
  const vertexToIndex = new Map<string, number>();

  function getCornerValue(i: number, j: number, k: number): number {
    const x = minX + i * stepX;
    const y = minY + j * stepY;
    const z = minZ + k * stepZ;
    return sdf(x, y, z);
  }

  function getCornerPos(i: number, j: number, k: number): THREE.Vector3 {
    return new THREE.Vector3(
      minX + i * stepX,
      minY + j * stepY,
      minZ + k * stepZ
    );
  }

  function edgeVertexKey(
    i: number,
    j: number,
    k: number,
    cornerA: number,
    cornerB: number
  ): string {
    const [ci, cj, ck] = CORNER_OFFSETS[cornerA];
    const [ni, nj, nk] = CORNER_OFFSETS[cornerB];
    const keyA = `${i + ci},${j + cj},${k + ck}`;
    const keyB = `${i + ni},${j + nj},${k + nk}`;
    return keyA < keyB ? `${keyA}|${keyB}` : `${keyB}|${keyA}`;
  }

  function interpolate(
    v0: number,
    v1: number,
    p0: THREE.Vector3,
    p1: THREE.Vector3
  ): THREE.Vector3 {
    const t = (isoLevel - v0) / (v1 - v0);
    return new THREE.Vector3().lerpVectors(p0, p1, t);
  }

  function getOrCreateVertex(
    i: number,
    j: number,
    k: number,
    cornerA: number,
    cornerB: number,
    values: number[]
  ): number {
    const key = edgeVertexKey(i, j, k, cornerA, cornerB);
    let idx = vertexToIndex.get(key);
    if (idx !== undefined) return idx;
    const [ci, cj, ck] = CORNER_OFFSETS[cornerA];
    const [ni, nj, nk] = CORNER_OFFSETS[cornerB];
    const p0 = getCornerPos(i + ci, j + cj, k + ck);
    const p1 = getCornerPos(i + ni, j + nj, k + nk);
    const p = interpolate(values[cornerA], values[cornerB], p0, p1);
    idx = vertices.length / 3;
    vertices.push(p.x, p.y, p.z);
    vertexToIndex.set(key, idx);
    return idx;
  }

  for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution; j++) {
      for (let k = 0; k < resolution; k++) {
        const values: number[] = [];
        const positions: THREE.Vector3[] = [];
        for (let c = 0; c < 8; c++) {
          const [di, dj, dk] = CORNER_OFFSETS[c];
          values.push(getCornerValue(i + di, j + dj, k + dk));
          positions.push(getCornerPos(i + di, j + dj, k + dk));
        }

        let index = 0;
        if (values[0] < isoLevel) index |= 1;
        if (values[1] < isoLevel) index |= 2;
        if (values[2] < isoLevel) index |= 4;
        if (values[3] < isoLevel) index |= 8;
        if (values[4] < isoLevel) index |= 16;
        if (values[5] < isoLevel) index |= 32;
        if (values[6] < isoLevel) index |= 64;
        if (values[7] < isoLevel) index |= 128;

        const edgeMask = EDGE_TABLE[index];
        if (edgeMask === 0 || edgeMask === 255) continue;

        const triRow = TRIANGLE_TABLE[index];
        const edgeVerts: (number | null)[] = new Array(12).fill(null);
        for (let e = 0; e < 12; e++) {
          if (edgeMask & (1 << e)) {
            const [a, b] = EDGE_CORNERS[e];
            edgeVerts[e] = getOrCreateVertex(i, j, k, a, b, values);
          }
        }

        for (let t = 0; t < 16; t += 3) {
          const e0 = triRow[t];
          const e1 = triRow[t + 1];
          const e2 = triRow[t + 2];
          if (e0 === -1) break;
          const i0 = edgeVerts[e0];
          const i1 = edgeVerts[e1];
          const i2 = edgeVerts[e2];
          if (i0 != null && i1 != null && i2 != null) {
            indices.push(i0, i1, i2);
          }
        }
      }
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/** Smooth minimum of two SDF values (polynomial blend). Larger k = more rounding at the junction. */
export function smoothMin(a: number, b: number, k: number): number {
  const h = Math.max(0, Math.min(1, 0.5 + (0.5 * (b - a)) / k));
  return a * h + b * (1 - h) - k * h * (1 - h);
}

/** SDF for a sphere: distance from p to center minus radius. */
export function sdfSphere(
  px: number,
  py: number,
  pz: number,
  cx: number,
  cy: number,
  cz: number,
  r: number
): number {
  const dx = px - cx;
  const dy = py - cy;
  const dz = pz - cz;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - r;
}

export interface SphereSdf {
  x: number;
  y: number;
  z: number;
  radius: number;
}

/**
 * Build an SDF function that is the smooth union of the given spheres.
 * Use with marchingCubes() to get a single blended mesh.
 */
export function smoothUnionSdf(
  spheres: SphereSdf[],
  k: number
): (x: number, y: number, z: number) => number {
  return (x, y, z) => {
    if (spheres.length === 0) return 1e10;
    let d = sdfSphere(x, y, z, spheres[0].x, spheres[0].y, spheres[0].z, spheres[0].radius);
    for (let i = 1; i < spheres.length; i++) {
      const s = spheres[i];
      d = smoothMin(d, sdfSphere(x, y, z, s.x, s.y, s.z, s.radius), k);
    }
    return d;
  };
}
