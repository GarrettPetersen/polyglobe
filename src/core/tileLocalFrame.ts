/**
 * Tangent-plane coordinates for any geodesic tile (hex or pentagon).
 * Use this to place geometry in (ex, ey) and map to world at a given radial distance — same basis as flat land mesh corners.
 */

import * as THREE from "three";
import type { GeodesicTile } from "./geodesic.js";

export interface TileTangentFrame {
  /** Outward unit normal (tile center on unit sphere). */
  normal: THREE.Vector3;
  /** First tangent axis: unit, points from tile center toward vertex 0 (in the face plane). */
  ex: THREE.Vector3;
  /** Second tangent axis: normal × ex (possibly flipped so vertices 0→1→… are CCW in (ex,ey) from outside). */
  ey: THREE.Vector3;
  /**
   * Vertex i projected into (ex, ey); matches flat-land corner i at radius r via tilePlanePoint(ex,ey).
   * Length equals tile.vertices.length (5 or 6).
   */
  corners2d: [number, number][];
}

function polygonAreaSigned2d(pts: [number, number][]): number {
  let a = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    a += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1];
  }
  return a * 0.5;
}

/**
 * Tangent frame for a tile: orthonormal (ex, ey) in the face plane and exact corner coordinates in that plane.
 * Works for hexagons and pentagons.
 */
export function getTileTangentFrame(tile: GeodesicTile): TileTangentFrame {
  const normal = tile.center.clone().normalize();
  const nv = tile.vertices.length;
  const inPlane: THREE.Vector3[] = [];
  for (let i = 0; i < nv; i++) {
    const v = tile.vertices[i].clone().normalize();
    const d = v.dot(normal);
    inPlane.push(v.clone().sub(normal.clone().multiplyScalar(d)));
  }
  const ex = inPlane[0].clone().normalize();
  let ey = new THREE.Vector3().crossVectors(normal, ex).normalize();
  let corners2d: [number, number][] = inPlane.map((ip) => [ip.dot(ex), ip.dot(ey)]);
  if (polygonAreaSigned2d(corners2d) < 0) {
    ey.crossVectors(ex, normal).normalize();
    corners2d = inPlane.map((ip) => [ip.dot(ex), ip.dot(ey)]);
  }
  return { normal, ex, ey, corners2d };
}

export function getTileTangentFrameById(
  tiles: GeodesicTile[],
  tileId: number
): TileTangentFrame | null {
  const tile = tiles[tileId];
  return tile ? getTileTangentFrame(tile) : null;
}

/**
 * World position on the flat tile plane at radial distance `r` from planet center:
 * `r * normal + lx * ex + ly * ey`.
 */
export function tilePlanePoint(
  frame: TileTangentFrame,
  lx: number,
  ly: number,
  r: number,
  out: THREE.Vector3
): THREE.Vector3 {
  return out
    .copy(frame.normal)
    .multiplyScalar(r)
    .addScaledVector(frame.ex, lx)
    .addScaledVector(frame.ey, ly);
}

/** Corner `vertexIndex` on the flat land surface at radius `r`. */
export function tileCornerWorldFlat(
  frame: TileTangentFrame,
  vertexIndex: number,
  r: number,
  out: THREE.Vector3
): THREE.Vector3 {
  const c = frame.corners2d[vertexIndex];
  return tilePlanePoint(frame, c[0], c[1], r, out);
}

/** Midpoint of edge `edgeIndex` (vertex edgeIndex → edgeIndex+1) on the flat surface at `r`. */
export function tileEdgeMidpointWorldFlat(
  frame: TileTangentFrame,
  edgeIndex: number,
  r: number,
  out: THREE.Vector3
): THREE.Vector3 {
  const n = frame.corners2d.length;
  const a = frame.corners2d[edgeIndex];
  const b = frame.corners2d[(edgeIndex + 1) % n];
  return tilePlanePoint(frame, (a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, r, out);
}

/**
 * Planar (lx, ly) for a world point relative to the tile plane at radius `r`
 * (closest point on that plane in tangent directions).
 */
export function worldToTilePlane(
  frame: TileTangentFrame,
  world: THREE.Vector3,
  r: number,
  out: { x: number; y: number }
): void {
  const o = frame.normal.clone().multiplyScalar(r);
  const d = world.clone().sub(o);
  out.x = d.dot(frame.ex);
  out.y = d.dot(frame.ey);
}

/** Mean distance from tile center to corners in the tangent plane. */
export function tileMeanCornerRadius(frame: TileTangentFrame): number {
  let s = 0;
  for (const c of frame.corners2d) s += Math.hypot(c[0], c[1]);
  return s / frame.corners2d.length;
}
