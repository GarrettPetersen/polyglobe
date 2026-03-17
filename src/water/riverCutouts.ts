/**
 * Shared precomputed hex river cutouts: opposite vertex pair for two river edges,
 * and slot span on an outer edge so terrain bowl matches the water ribbon.
 */

import * as THREE from "three";
import type { GeodesicTile } from "../core/geodesic.js";

/**
 * Regular hex: edge i runs from vertex i to (i+1)%6.
 * For gap 1,2,3 between the two river edges (canonical: edge 0 and edge gap),
 * which opposite pair {0,3},{1,4},{2,5} is most ⊥ to mid(0)→mid(gap).
 */
const HEX_TWO_EDGE_VERTEX_PAIR: Record<1 | 2 | 3, [number, number]> = (() => {
  const vx: number[] = [];
  const vy: number[] = [];
  for (let i = 0; i < 6; i++) {
    const ang = (Math.PI / 3) * i - Math.PI / 6;
    vx.push(Math.cos(ang));
    vy.push(Math.sin(ang));
  }
  const mid = (e: number) => ({
    x: (vx[e] + vx[(e + 1) % 6]) * 0.5,
    y: (vy[e] + vy[(e + 1) % 6]) * 0.5,
  });
  const oppositePairs: Array<[number, number]> = [
    [0, 3],
    [1, 4],
    [2, 5],
  ];
  const out: Record<1 | 2 | 3, [number, number]> = { 1: [0, 3], 2: [0, 3], 3: [1, 4] };
  for (const gap of [1, 2, 3] as const) {
    const m0 = mid(0);
    const mg = mid(gap);
    let rdx = mg.x - m0.x;
    let rdy = mg.y - m0.y;
    const rlen = Math.hypot(rdx, rdy) || 1;
    rdx /= rlen;
    rdy /= rlen;
    let best: [number, number] = oppositePairs[0];
    let bestAbsDot = Infinity;
    for (const [ia, ib] of oppositePairs) {
      let sx = vx[ib] - vx[ia];
      let sy = vy[ib] - vy[ia];
      const slen = Math.hypot(sx, sy) || 1;
      sx /= slen;
      sy /= slen;
      const absDot = Math.abs(sx * rdx + sy * rdy);
      if (absDot < bestAbsDot) {
        bestAbsDot = absDot;
        best = [ia, ib];
      }
    }
    out[gap] = best;
  }
  return out;
})();

/** Map two river edges on a hex to global vertex indices (same frame as rivers mesh). */
export function hexRiverVertexPairForTwoEdges(e0: number, e1: number): [number, number] {
  const a = Math.min(e0, e1);
  const b = Math.max(e0, e1);
  const fwd = b - a;
  const bwd = 6 - fwd;
  let anchor: number;
  let gap: 1 | 2 | 3;
  if (fwd <= bwd) {
    anchor = a;
    gap = (fwd === 0 ? 3 : fwd) as 1 | 2 | 3;
  } else {
    anchor = b;
    gap = bwd as 1 | 2 | 3;
  }
  const [va, vb] = HEX_TWO_EDGE_VERTEX_PAIR[gap];
  return [(va + anchor) % 6, (vb + anchor) % 6];
}

const scratchV0 = new THREE.Vector3();
const scratchV1 = new THREE.Vector3();
const scratchTangent = new THREE.Vector3();
const scratchPerp = new THREE.Vector3();
const scratchEdge = new THREE.Vector3();

/**
 * Parameter range [tMin,tMax] on outer edge O0→O1 (t=0 at O0, t=1 at O1) covered by the
 * same ribbon quad as createRiverMeshFromTileEdges (hex, two river edges).
 * Aligns terrain river slots with the blue river strip on the real map.
 */
export function riverBowlSlotTRangeForHexTwoEdges(
  tile: GeodesicTile,
  _edgeIdx: number,
  riverE0: number,
  riverE1: number,
  r: number,
  centerNormal: THREE.Vector3,
  riverBowlInnerScale: number,
  o0: THREE.Vector3,
  o1: THREE.Vector3
): { tMin: number; tMax: number } | null {
  if (tile.vertices.length !== 6) return null;
  const [v0i, v1i] = hexRiverVertexPairForTwoEdges(riverE0, riverE1);
  const widthScale = riverBowlInnerScale * 0.5;
  scratchV0.copy(tile.vertices[v0i]).normalize().multiplyScalar(r);
  scratchV1.copy(tile.vertices[v1i]).normalize().multiplyScalar(r);
  scratchTangent.subVectors(scratchV1, scratchV0);
  const len = scratchTangent.length();
  if (len < 1e-9) return null;
  scratchTangent.divideScalar(len);
  scratchPerp.crossVectors(centerNormal, scratchTangent);
  if (scratchPerp.lengthSq() < 1e-12) return null;
  scratchPerp.normalize();
  const halfWidth = widthScale * Math.max(0.0001, len);
  scratchPerp.multiplyScalar(halfWidth);
  const ox = scratchPerp.x;
  const oy = scratchPerp.y;
  const oz = scratchPerp.z;

  scratchEdge.subVectors(o1, o0);
  const elen2 = scratchEdge.lengthSq();
  if (elen2 < 1e-14) return null;
  const inv = 1 / elen2;

  const tOf = (wx: number, wy: number, wz: number) =>
    ((wx - o0.x) * scratchEdge.x + (wy - o0.y) * scratchEdge.y + (wz - o0.z) * scratchEdge.z) * inv;

  const vx0 = scratchV0.x;
  const vy0 = scratchV0.y;
  const vz0 = scratchV0.z;
  const vx1 = scratchV1.x;
  const vy1 = scratchV1.y;
  const vz1 = scratchV1.z;
  let tMin = Infinity;
  let tMax = -Infinity;
  const ts = [
    tOf(vx0 - ox, vy0 - oy, vz0 - oz),
    tOf(vx0 + ox, vy0 + oy, vz0 + oz),
    tOf(vx1 + ox, vy1 + oy, vz1 + oz),
    tOf(vx1 - ox, vy1 - oy, vz1 - oz),
  ];
  for (const tt of ts) {
    tMin = Math.min(tMin, tt);
    tMax = Math.max(tMax, tt);
  }

  tMin = Math.max(0, tMin);
  tMax = Math.min(1, tMax);
  if (tMax <= tMin + 1e-4) return null;
  return { tMin, tMax };
}
