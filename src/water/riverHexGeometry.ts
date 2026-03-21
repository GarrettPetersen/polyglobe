/**
 * Hex river terrain on the geodesic footprint (actual corner projections).
 *
 * **Straight-through tiles** (one river axis = two opposite hex edges, including single-edge + virtual
 * opposite): additive **U-channel** — flat bed quad + two banks built by lofting outer perimeter chains
 * down to the bed (north/south style banks on irregular hexes). Pentagons are skipped (no 6-corner frame).
 *
 * **Forks / bends** (non-opposite wedge set): boolean cutout (outer − void) + extruded land + mouth U’s;
 * bed from void multipolygon when cutout land is empty so the channel still has a floor.
 */

import * as THREE from "three";
import earcut from "earcut";
import polygonClipping from "polygon-clipping";
import { getEdgeNeighbor, getNeighborEdgeIndex, type GeodesicTile } from "../core/geodesic.js";
import {
  getTileTangentFrame,
  tilePlanePoint,
  type TileTangentFrame,
} from "../core/tileLocalFrame.js";
import { TERRAIN_STYLES } from "../terrain/terrainMaterial.js";

/** Closed ring + polygon = multipolygon entry (each polygon: outer ring + optional holes). */
type Ring2 = [number, number][];
type MultiPoly = Ring2[][];

const m = (k: number) => ((k % 6) + 6) % 6;

/**
 * Inset river mouth midpoint along the edge normal (tile-plane units). Scales with edge length so
 * seams stay tight on all zoom levels; void + U-mouth geometry must use the same rule.
 */
const RIVER_MOUTH_INSET_ALONG_NORMAL_MIN = 1e-9;
const RIVER_MOUTH_INSET_ALONG_NORMAL_FRAC = 0.0065;
function riverMouthInsetAlongNormal(edgeLen: number): number {
  return Math.max(RIVER_MOUTH_INSET_ALONG_NORMAL_MIN, edgeLen * RIVER_MOUTH_INSET_ALONG_NORMAL_FRAC);
}

/** Convex hull as closed CCW ring (first point repeated at end). */
function convexHull2dClosed(pts: [number, number][]): Ring2 {
  const D = 1e-9;
  const dedup: [number, number][] = [];
  for (const p of pts) {
    if (dedup.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < D)) continue;
    dedup.push([p[0], p[1]]);
  }
  if (dedup.length < 3) {
    const r: Ring2 = dedup.map((p) => [p[0], p[1]]);
    if (r.length > 0) r.push([r[0][0], r[0][1]]);
    return r;
  }
  dedup.sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]));
  const cross = (o: [number, number], a: [number, number], b: [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [];
  for (const p of dedup) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: [number, number][] = [];
  for (let i = dedup.length - 1; i >= 0; i--) {
    const p = dedup[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  const hull = lower.concat(upper);
  let a = 0;
  for (let i = 0; i < hull.length; i++) {
    const j = (i + 1) % hull.length;
    a += hull[i][0] * hull[j][1] - hull[j][0] * hull[i][1];
  }
  if (a < 0) hull.reverse();
  const ring: Ring2 = hull.map((p) => [p[0], p[1]]);
  ring.push([hull[0][0], hull[0][1]]);
  return ring;
}

/** Hex-only alias for {@link getTileTangentFrame} (same planar basis as flat land). */
export function tileHexPlanarBasis6(tile: GeodesicTile): {
  centerNormal: THREE.Vector3;
  ex: THREE.Vector3;
  ey: THREE.Vector3;
  corners2d: [number, number][];
} | null {
  if (tile.vertices.length !== 6) return null;
  const f = getTileTangentFrame(tile);
  return { centerNormal: f.normal, ex: f.ex, ey: f.ey, corners2d: f.corners2d };
}

/** @deprecated Prefer getTileTangentFrame + tileMeanCornerRadius from polyglobe. */
export function tileCanonicalHexBasis6(tile: GeodesicTile): {
  centerNormal: THREE.Vector3;
  ex: THREE.Vector3;
  ey: THREE.Vector3;
  rOut: number;
} | null {
  const p = tileHexPlanarBasis6(tile);
  if (!p) return null;
  let rSum = 0;
  for (const c of p.corners2d) rSum += Math.hypot(c[0], c[1]);
  return { centerNormal: p.centerNormal, ex: p.ex, ey: p.ey, rOut: rSum / 6 };
}

/**
 * Boolean using actual hex corners O[i] (2D, CCW) and inner points I[i] = innerFrac * O[i].
 */
export function buildRiverLandAndVoidFromCorners(
  O: [number, number][],
  riverEdges: Set<number>,
  innerFrac: number,
  debugTileId?: number
): { landMp: MultiPoly; voidMp: MultiPoly } {
  const DEBUG = debugTileId !== undefined;
  if (O.length !== 6) {
    return { landMp: [], voidMp: [] };
  }
  const f = Math.min(0.98, Math.max(0.05, innerFrac));
  let avgEdge = 0;
  let avgRO = 0;
  for (let i = 0; i < 6; i++) {
    const u = O[i];
    const v = O[(i + 1) % 6];
    avgEdge += Math.hypot(v[0] - u[0], v[1] - u[1]);
    avgRO += Math.hypot(u[0], u[1]);
  }
  avgEdge /= 6;
  avgRO /= 6;
  const edgeLen = (e: number) => {
    const o0 = O[m(e)];
    const o1 = O[m(e + 1)];
    return Math.hypot(o1[0] - o0[0], o1[1] - o0[1]) || 1;
  };
  /** Narrow mouth (for inner-pool sizing only). */
  const halfWNarrow = (e: number) =>
    Math.max(1e-10, Math.min(f * avgEdge * 0.5, edgeLen(e) * 0.49));
  let minMouth = Infinity;
  for (let e = 0; e < 6; e++) {
    if (!riverEdges.has(e)) continue;
    minMouth = Math.min(minMouth, 2 * halfWNarrow(e));
  }
  if (minMouth === Infinity) minMouth = f * avgEdge;
  /** Inner hex flat-to-flat ≈ √3 × mean |I|; cap so pool is not wider than narrowest river mouth. */
  const fInner = Math.min(f, (minMouth * 0.99) / (avgRO * Math.sqrt(3)));
  const I: [number, number][] = O.map(([x, y]) => [x * fInner, y * fInner]);

  // Returns mouth opening points slightly INSET from outer edge to avoid coincident edges
  const outerOpeningEnds = (e: number): [[number, number], [number, number]] => {
    const o0 = O[m(e)];
    const o1 = O[m(e + 1)];
    let ux = o1[0] - o0[0];
    let uy = o1[1] - o0[1];
    const el = Math.hypot(ux, uy) || 1;
    ux /= el;
    uy /= el;
    // Edge normal pointing inward (toward hex center)
    const nx = -uy;
    const ny = ux;
    const insetN = riverMouthInsetAlongNormal(el);
    const midx = (o0[0] + o1[0]) * 0.5 + nx * insetN;
    const midy = (o0[1] + o1[1]) * 0.5 + ny * insetN;
    const halfW = halfWNarrow(e);
    return [
      [midx - ux * halfW, midy - uy * halfW],
      [midx + ux * halfW, midy + uy * halfW],
    ];
  };

  /**
   * Edges that get an outer-hex mouth in the void. For exactly one logical river edge, the water
   * ribbon still spans across the tile (toward the opposite side); without a second mouth, land
   * would close off the far hex edge like a dam.
   */
  const wedgeEdges =
    riverEdges.size === 1
      ? new Set([...riverEdges, m([...riverEdges][0] + 3)])
      : riverEdges;

  // Build void by unioning inner hex with wedge shapes.
  // Each wedge: A, B (mouth points) + 4 inner corners on far side → convex hull.
  // All points slightly inset from outer edge to avoid polygon-clipping coincident edge issues.
  
  const innerRev = [...I].reverse();
  const innerRing: Ring2 = innerRev.map((p) => [p[0], p[1]]);
  innerRing.push([innerRev[0][0], innerRev[0][1]]);
  
  let voidMp: MultiPoly = [[innerRing]];
  
  for (let e = 0; e < 6; e++) {
    if (!wedgeEdges.has(e)) continue;
    const [A, B] = outerOpeningEnds(e);
    // Include 4 inner corners on the "far" side of this edge
    const wedgePts: [number, number][] = [
      A,
      B,
      I[m(e + 2)],
      I[m(e + 1)],
      I[e],
      I[m(e - 1)],
    ];
    const hullRing = convexHull2dClosed(wedgePts);
    if (hullRing.length >= 4) {
      try {
        voidMp = polygonClipping.union(voidMp, [hullRing]);
      } catch {
        // If union fails, just skip this wedge (better than crashing)
        if (DEBUG) {
          console.warn(`[buildRiverLandAndVoid] tile ${debugTileId}: union failed for edge ${e}`);
        }
      }
    }
  }

  if (DEBUG) {
    for (const e of wedgeEdges) {
      const [A, B] = outerOpeningEnds(e);
      const o0 = O[m(e)];
      const o1 = O[m(e + 1)];
      console.log(`[buildRiverLandAndVoid] tile ${debugTileId} edge ${e}:`);
      console.log(`  outer edge: [${o0[0].toFixed(4)},${o0[1].toFixed(4)}] -> [${o1[0].toFixed(4)},${o1[1].toFixed(4)}]`);
      console.log(`  mouth A=[${A[0].toFixed(4)},${A[1].toFixed(4)}], B=[${B[0].toFixed(4)},${B[1].toFixed(4)}]`);
    }
    console.log(`[buildRiverLandAndVoid] tile ${debugTileId}: void has ${voidMp[0]?.[0]?.length ?? 0} pts`);
  }

  // Now do the difference: outer hex minus void
  const outerRing: Ring2 = O.map((p) => [p[0], p[1]]);
  outerRing.push([O[0][0], O[0][1]]);
  const outerMp: MultiPoly = [[outerRing]];
  
  let landMp: MultiPoly;
  try {
    landMp = polygonClipping.difference(outerMp, voidMp);
  } catch (e) {
    throw new Error(
      `[buildRiverLandAndVoid] tile ${debugTileId}: polygon-clipping.difference threw. ` +
      `outerMp=${JSON.stringify(outerMp)}, voidMp=${JSON.stringify(voidMp)}, error=${e}`
    );
  }
  
  if (landMp.length === 0) {
    throw new Error(
      `[buildRiverLandAndVoid] tile ${debugTileId}: polygon-clipping.difference returned empty. ` +
      `outerMp=${JSON.stringify(outerMp)}, voidMp=${JSON.stringify(voidMp)}`
    );
  }
  
  return { landMp, voidMp };
}

/**
 * Validate that a river hex land polygon has the expected openings.
 * Returns null if valid, or an error message describing what's wrong.
 */
export function validateRiverHexOpenings(
  landMp: MultiPoly,
  O: [number, number][],
  riverEdges: Set<number>,
  tileId: number
): string | null {
  if (O.length !== 6) return null; // skip pentagons
  
  const wedgeEdges = hexRiverWedgeEdgeIndices(riverEdges);
  const expectedOpenings = wedgeEdges.size;
  
  // Get the land polygon's outer ring
  const landRing = landMp[0]?.[0];
  if (!landRing || landRing.length < 3) {
    return `Tile ${tileId}: land polygon has no valid outer ring (expected ${expectedOpenings} openings for edges [${[...wedgeEdges].join(",")}])`;
  }
  
  // For each expected opening edge, check if there's a gap in the land polygon
  const openingsFound: number[] = [];
  const edgesClosed: number[] = [];
  
  for (const e of wedgeEdges) {
    const o0 = O[m(e)];
    const o1 = O[m(e + 1)];
    const edgeVec = [o1[0] - o0[0], o1[1] - o0[1]];
    const edgeLen = Math.hypot(edgeVec[0], edgeVec[1]);
    
    // Find all land ring segments that lie on this hex edge
    let coveredLength = 0;
    for (let i = 0; i < landRing.length - 1; i++) {
      const a = landRing[i];
      const b = landRing[i + 1];
      
      // Check if segment is on this edge
      const distA = Math.abs((a[0] - o0[0]) * (-edgeVec[1]) + (a[1] - o0[1]) * edgeVec[0]) / edgeLen;
      const distB = Math.abs((b[0] - o0[0]) * (-edgeVec[1]) + (b[1] - o0[1]) * edgeVec[0]) / edgeLen;
      
      if (distA < 0.0005 && distB < 0.0005) {
        // Both points on edge line, measure length along edge
        const tA = ((a[0] - o0[0]) * edgeVec[0] + (a[1] - o0[1]) * edgeVec[1]) / (edgeLen * edgeLen);
        const tB = ((b[0] - o0[0]) * edgeVec[0] + (b[1] - o0[1]) * edgeVec[1]) / (edgeLen * edgeLen);
        if (tA >= -0.01 && tA <= 1.01 && tB >= -0.01 && tB <= 1.01) {
          coveredLength += Math.abs(tB - tA) * edgeLen;
        }
      }
    }
    
    // If land covers more than 95% of the edge, there's no opening
    const coverageRatio = coveredLength / edgeLen;
    if (coverageRatio > 0.95) {
      edgesClosed.push(e);
    } else if (coverageRatio < 0.85) {
      // Less than 85% covered means there's a gap (opening)
      openingsFound.push(e);
    }
  }
  
  if (edgesClosed.length > 0) {
    return `Tile ${tileId}: expected openings on edges [${[...wedgeEdges].join(",")}] but edges [${edgesClosed.join(",")}] are CLOSED (no gap in land polygon). Land ring has ${landRing.length} vertices. River edges: [${[...riverEdges].join(",")}]`;
  }
  
  return null; // validation passed
}

/**
 * Hex edges that get a void mouth (includes opposite edge for single-edge tiles where the ribbon
 * spans the hex). Used to omit outer perimeter walls so the channel can open to neighbors.
 */
export function hexRiverWedgeEdgeIndices(riverEdges: Set<number>): Set<number> {
  if (riverEdges.size === 1) {
    const e0 = riverEdges.values().next().value as number;
    return new Set([e0, m(e0 + 3)]);
  }
  return new Set(riverEdges);
}

/**
 * River mouth segment [A,B] on each wedge edge (same geometry as void cutouts).
 * Used to build U-shaped bank mouths (vertical legs on land beside opening, bed across A–B).
 */
export function riverMouthOpeningsByEdge(
  O: [number, number][],
  riverEdges: Set<number>,
  innerFrac: number
): Map<number, [[number, number], [number, number]]> {
  const map = new Map<number, [[number, number], [number, number]]>();
  if (O.length !== 6 || riverEdges.size === 0) return map;
  const f = Math.min(0.98, Math.max(0.05, innerFrac));
  let avgEdge = 0;
  for (let i = 0; i < 6; i++) {
    const u = O[i];
    const v = O[(i + 1) % 6];
    avgEdge += Math.hypot(v[0] - u[0], v[1] - u[1]);
  }
  avgEdge /= 6;
  const edgeLen = (e: number) => {
    const o0 = O[m(e)];
    const o1 = O[m(e + 1)];
    return Math.hypot(o1[0] - o0[0], o1[1] - o0[1]) || 1;
  };
  const halfWNarrow = (e: number) =>
    Math.max(1e-10, Math.min(f * avgEdge * 0.5, edgeLen(e) * 0.49));
  const outerOpeningEnds = (e: number): [[number, number], [number, number]] => {
    const o0 = O[m(e)];
    const o1 = O[m(e + 1)];
    let ux = o1[0] - o0[0];
    let uy = o1[1] - o0[1];
    const el = Math.hypot(ux, uy) || 1;
    ux /= el;
    uy /= el;
    const nx = -uy;
    const ny = ux;
    const insetN = riverMouthInsetAlongNormal(el);
    const midx = (o0[0] + o1[0]) * 0.5 + nx * insetN;
    const midy = (o0[1] + o1[1]) * 0.5 + ny * insetN;
    const halfW = halfWNarrow(e);
    return [
      [midx - ux * halfW, midy - uy * halfW],
      [midx + ux * halfW, midy + uy * halfW],
    ];
  };
  const wedgeEdges =
    riverEdges.size === 1
      ? new Set([...riverEdges, m([...riverEdges][0] + 3)])
      : riverEdges;
  for (const e of wedgeEdges) {
    map.set(e, outerOpeningEnds(e));
  }
  return map;
}

const MOUTH_LEG_EPS = 1e-7;

/** U-shaped mouth: vertical legs on hex edge beside opening + bed-level span A–B. */
function appendRiverMouthUGeometry(
  frame: TileTangentFrame,
  edgeIndex: number,
  A: [number, number],
  B: [number, number],
  O: [number, number][],
  rTop: number,
  rBot: number,
  positions: number[],
  normals: number[],
  indices: number[],
  tileIds: number[],
  tileId: number,
  bankColors: number[] | null,
  rgb: [number, number, number]
): void {
  const o0 = O[m(edgeIndex)];
  const o1 = O[m(edgeIndex + 1)];
  const pTop = new THREE.Vector3();
  const pBot = new THREE.Vector3();
  const wallN = new THREE.Vector3();
  const ex = frame.ex;
  const ey = frame.ey;
  const nUp = frame.normal;
  const [cr, cg, cb] = rgb;
  /** Slightly below bank top so mouth wall tops don’t Z-fight with lofted caps / neighbor tiles. */
  const depth = Math.max(0, rTop - rBot);
  const rLegTop = rTop - depth * 0.11;
  const pushVert = (x: number, y: number, z: number, nx: number, ny: number, nz: number) => {
    positions.push(x, y, z);
    normals.push(nx, ny, nz);
    tileIds.push(tileId);
    if (bankColors) bankColors.push(cr, cg, cb);
  };

  const pushLeg = (
    ax: number,
    ay: number,
    bx: number,
    by: number
  ): void => {
    if (Math.hypot(bx - ax, by - ay) < MOUTH_LEG_EPS) return;
    wallNormal2dTowardChannel(ax, ay, bx, by, ex, ey, wallN);
    const b0 = positions.length / 3;
    tilePlanePoint(frame, ax, ay, rLegTop, pTop);
    pushVert(pTop.x, pTop.y, pTop.z, wallN.x, wallN.y, wallN.z);
    tilePlanePoint(frame, bx, by, rLegTop, pTop);
    pushVert(pTop.x, pTop.y, pTop.z, wallN.x, wallN.y, wallN.z);
    tilePlanePoint(frame, bx, by, rBot, pBot);
    pushVert(pBot.x, pBot.y, pBot.z, wallN.x, wallN.y, wallN.z);
    tilePlanePoint(frame, ax, ay, rBot, pBot);
    pushVert(pBot.x, pBot.y, pBot.z, wallN.x, wallN.y, wallN.z);
    indices.push(b0, b0 + 1, b0 + 2, b0, b0 + 2, b0 + 3);
  };

  pushLeg(o0[0], o0[1], A[0], A[1]);
  pushLeg(B[0], B[1], o1[0], o1[1]);

  // Do not add a flat rTop quad here: it created visible “bridges” at hex seams where two
  // river tiles meet. Mouth A/B now match `buildRiverLandAndVoidFromCorners` (inset from edge).

  if (Math.hypot(B[0] - A[0], B[1] - A[1]) < MOUTH_LEG_EPS) return;
  const nx = nUp.x;
  const ny = nUp.y;
  const nz = nUp.z;
  /** Inset toward tile center so the bed “sill” quad has area (matches channel direction). */
  const inset = Math.min(0.22, Math.max(0.04, 0.12));
  const Ai = [A[0] * (1 - inset), A[1] * (1 - inset)] as [number, number];
  const Bi = [B[0] * (1 - inset), B[1] * (1 - inset)] as [number, number];
  const bBed = positions.length / 3;
  tilePlanePoint(frame, A[0], A[1], rBot, pBot);
  pushVert(pBot.x, pBot.y, pBot.z, nx, ny, nz);
  tilePlanePoint(frame, B[0], B[1], rBot, pBot);
  pushVert(pBot.x, pBot.y, pBot.z, nx, ny, nz);
  tilePlanePoint(frame, Bi[0], Bi[1], rBot, pBot);
  pushVert(pBot.x, pBot.y, pBot.z, nx, ny, nz);
  tilePlanePoint(frame, Ai[0], Ai[1], rBot, pBot);
  pushVert(pBot.x, pBot.y, pBot.z, nx, ny, nz);
  indices.push(bBed, bBed + 1, bBed + 2, bBed, bBed + 2, bBed + 3);
}

/** If segment ab lies on hex boundary edge e (2D), return e; else null. */
function segmentOnHexEdgeIndex(
  a: [number, number],
  b: [number, number],
  O: [number, number][]
): number | null {
  const mx = (a[0] + b[0]) * 0.5;
  const my = (a[1] + b[1]) * 0.5;
  let best: number | null = null;
  let bestScore = Infinity;
  for (let e = 0; e < 6; e++) {
    const o0 = O[m(e)];
    const o1 = O[m(e + 1)];
    const dx = o1[0] - o0[0];
    const dy = o1[1] - o0[1];
    const el2 = dx * dx + dy * dy;
    const el = Math.sqrt(el2) || 1;
    const tol = el * 0.045;
    const crossA = Math.abs((a[0] - o0[0]) * dy - (a[1] - o0[1]) * dx) / el;
    const crossB = Math.abs((b[0] - o0[0]) * dy - (b[1] - o0[1]) * dx) / el;
    const crossM = Math.abs((mx - o0[0]) * dy - (my - o0[1]) * dx) / el;
    if (crossA > tol || crossB > tol) continue;
    const tA = ((a[0] - o0[0]) * dx + (a[1] - o0[1]) * dy) / el2;
    const tB = ((b[0] - o0[0]) * dx + (b[1] - o0[1]) * dy) / el2;
    const tLo = Math.min(tA, tB);
    const tHi = Math.max(tA, tB);
    if (tHi < -0.06 || tLo > 1.06) continue;
    const overlap = Math.min(tHi, 1 + 0.02) - Math.max(tLo, -0.02);
    if (overlap < el * 0.008) continue;
    const score = crossM + Math.abs(tLo + tHi - 1) * el * 0.01;
    if (score < bestScore) {
      bestScore = score;
      best = e;
    }
  }
  return best;
}

/** Ideal regular hex (circumradius 1) — for demos / tests. */
export function buildRiverLandAndVoidMultipolygon(
  riverEdges: Set<number>,
  rInFraction: number
): { landMp: MultiPoly; voidMp: MultiPoly } {
  const O: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const ang = (Math.PI / 3) * i - Math.PI / 6;
    O.push([Math.cos(ang), Math.sin(ang)]);
  }
  return buildRiverLandAndVoidFromCorners(O, riverEdges, rInFraction);
}

/** Unit 2D normal pointing from edge midpoint toward channel (origin). */
function wallNormal2dTowardChannel(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  ex: THREE.Vector3,
  ey: THREE.Vector3,
  out: THREE.Vector3
): THREE.Vector3 {
  const mx = (ax + bx) * 0.5;
  const my = (ay + by) * 0.5;
  const h = Math.hypot(mx, my) || 1;
  return out.copy(ex).multiplyScalar(-mx / h).addScaledVector(ey, -my / h).normalize();
}

/** Remove duplicate consecutive vertices; returns closed ring or null if < 3 corners. */
function dedupeClosedRing(ring: Ring2, eps = 1e-8): Ring2 | null {
  if (ring.length < 2) return null;
  const pts: [number, number][] = [];
  for (let i = 0; i < ring.length - 1; i++) {
    const p = ring[i];
    if (
      pts.length === 0 ||
      Math.hypot(p[0] - pts[pts.length - 1][0], p[1] - pts[pts.length - 1][1]) > eps
    ) {
      pts.push([p[0], p[1]]);
    }
  }
  if (
    pts.length >= 2 &&
    Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) <= eps
  ) {
    pts.pop();
  }
  if (pts.length < 3) return null;
  const closed: Ring2 = pts.map((p) => [p[0], p[1]]);
  closed.push([pts[0][0], pts[0][1]]);
  return closed;
}

/** CCW outer so earcut + front faces point along +tile normal (otherwise tops are culled). */
function orientOuterCCW(ring: Ring2): Ring2 {
  const pts = ring.slice(0, -1);
  if (pts.length < 3) return ring;
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    a += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1];
  }
  if (a < 0) pts.reverse();
  const out: Ring2 = pts.map((p) => [p[0], p[1]]);
  out.push([pts[0][0], pts[0][1]]);
  return out;
}

/** Clockwise hole for earcut (negative signed area in same axis as outer). */
function orientHoleCW(ring: Ring2): Ring2 {
  const pts = ring.slice(0, -1);
  if (pts.length < 3) return ring;
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    a += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1];
  }
  if (a > 0) pts.reverse();
  const out: Ring2 = pts.map((p) => [p[0], p[1]]);
  out.push([pts[0][0], pts[0][1]]);
  return out;
}

/** Inner hole boundary includes chord A–B at each river mouth; skip extruding that edge (else a vertical slab blocks the opening). */
function segmentIsRiverMouthChord(
  a: [number, number],
  b: [number, number],
  chords: Array<[[number, number], [number, number]]>
): boolean {
  const d = (p: [number, number], q: [number, number]) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  const len = d(a, b);
  if (len < 1e-12) return false;
  for (const [A, B] of chords) {
    const mlen = d(A, B);
    if (mlen < 1e-12) continue;
    const tol = Math.max(2e-5, mlen * 2e-4);
    if ((d(a, A) < tol && d(b, B) < tol) || (d(a, B) < tol && d(b, A) < tol)) {
      return true;
    }
    const mx = (a[0] + b[0]) * 0.5;
    const my = (a[1] + b[1]) * 0.5;
    const Mx = (A[0] + B[0]) * 0.5;
    const My = (A[1] + B[1]) * 0.5;
    if (Math.hypot(mx - Mx, my - My) > Math.max(len, mlen) * 0.12) continue;
    if (Math.abs(len - mlen) > Math.max(len, mlen) * 0.15) continue;
    const dot =
      ((b[0] - a[0]) * (B[0] - A[0]) + (b[1] - a[1]) * (B[1] - A[1])) / (len * mlen);
    if (Math.abs(dot) > 0.9) return true;
  }
  return false;
}

function appendExtrudedLand(
  landMp: MultiPoly,
  rTop: number,
  rBot: number,
  frame: TileTangentFrame,
  positions: number[],
  normals: number[],
  indices: number[],
  tileIds: number[],
  tileId: number,
  bankColors: number[] | null,
  rgb: [number, number, number],
  /** 0 = vertical channel walls; 0.2–0.4 pulls bottom toward tile center → sloped banks. */
  channelWallBottomInset = 0,
  wallOpts?: {
    /** Omit tall outer walls on these hex edges so the river can pass through to neighbors. */
    skipOuterWallsOnHexEdges?: Set<number>;
    hexCorners2d?: [number, number][];
    /** Mouth chords A–B: no inner channel wall here (opening to ocean / neighbor). */
    riverMouthChordsAB?: Array<[[number, number], [number, number]]>;
  }
): void {
  const pTop = new THREE.Vector3();
  const pBot = new THREE.Vector3();
  const wallN = new THREE.Vector3();
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  const faceN = new THREE.Vector3();
  const nUp = frame.normal;
  const nDown = frame.normal.clone().multiplyScalar(-1);
  const ex = frame.ex;
  const ey = frame.ey;
  const [cr, cg, cb] = rgb;

  const pushVert = (x: number, y: number, z: number, nx: number, ny: number, nz: number) => {
    positions.push(x, y, z);
    normals.push(nx, ny, nz);
    tileIds.push(tileId);
    if (bankColors) {
      bankColors.push(cr, cg, cb);
    }
  };

  for (const polygon of landMp) {
    const outerDedup = dedupeClosedRing(polygon[0]);
    if (!outerDedup) continue;
    const outer = orientOuterCCW(outerDedup);
    const holes: Ring2[] = [];
    for (const h of polygon.slice(1)) {
      const dh = dedupeClosedRing(h);
      if (dh) holes.push(orientHoleCW(dh));
    }

    const flat: number[] = [];
    const holeIdx: number[] = [];
    let v = 0;
    for (let i = 0; i < outer.length - 1; i++) {
      flat.push(outer[i][0], outer[i][1]);
      v++;
    }
    for (const h of holes) {
      holeIdx.push(v);
      for (let i = 0; i < h.length - 1; i++) {
        flat.push(h[i][0], h[i][1]);
        v++;
      }
    }
    const tris = earcut(flat, holeIdx.length ? holeIdx : undefined, 2);
    if (tris.length === 0) continue;
    const baseTop = positions.length / 3;
    for (let i = 0; i < flat.length; i += 2) {
      tilePlanePoint(frame, flat[i], flat[i + 1], rTop, pTop);
      pushVert(pTop.x, pTop.y, pTop.z, nUp.x, nUp.y, nUp.z);
    }
    /** Earcut winding is in (ex,ey); after mapping to 3D, faces can point −normal → culled. Orient each tri toward +nUp. */
    const nx = nUp.x;
    const ny = nUp.y;
    const nz = nUp.z;
    for (let ti = 0; ti < tris.length; ti += 3) {
      const ia = baseTop + tris[ti];
      const ib = baseTop + tris[ti + 1];
      const ic = baseTop + tris[ti + 2];
      const ax = positions[ia * 3];
      const ay = positions[ia * 3 + 1];
      const az = positions[ia * 3 + 2];
      const bx = positions[ib * 3];
      const by = positions[ib * 3 + 1];
      const bz = positions[ib * 3 + 2];
      const cx = positions[ic * 3];
      const cy = positions[ic * 3 + 1];
      const cz = positions[ic * 3 + 2];
      const e1x = bx - ax;
      const e1y = by - ay;
      const e1z = bz - az;
      const e2x = cx - ax;
      const e2y = cy - ay;
      const e2z = cz - az;
      const gx = e1y * e2z - e1z * e2y;
      const gy = e1z * e2x - e1x * e2z;
      const gz = e1x * e2y - e1y * e2x;
      if (gx * nx + gy * ny + gz * nz < 0) {
        indices.push(ia, ic, ib);
      } else {
        indices.push(ia, ib, ic);
      }
    }
    const baseBot = positions.length / 3;
    for (let i = 0; i < flat.length; i += 2) {
      tilePlanePoint(frame, flat[i], flat[i + 1], rBot, pBot);
      pushVert(pBot.x, pBot.y, pBot.z, nDown.x, nDown.y, nDown.z);
    }
    for (let i = 0; i < tris.length; i += 3) {
      indices.push(baseBot + tris[i + 2], baseBot + tris[i + 1], baseBot + tris[i]);
    }

    const skipOuter = wallOpts?.skipOuterWallsOnHexEdges;
    const hexO = wallOpts?.hexCorners2d;
    const mouthChords = wallOpts?.riverMouthChordsAB;

    const pushRingWall = (
      ring: Ring2,
      landLeftOfForward: boolean,
      slopeBottomTowardCenter: number,
      isOuterHexRing: boolean
    ) => {
      const L = ring.length - 1;
      if (L < 2) return;
      const inset = Math.min(0.55, Math.max(0, slopeBottomTowardCenter));
      for (let i = 0; i < L; i++) {
        const j = landLeftOfForward ? (i + 1) % L : (i + L - 1) % L;
        const a = ring[i];
        const b = ring[j];
        if (
          isOuterHexRing &&
          skipOuter &&
          skipOuter.size > 0 &&
          hexO &&
          hexO.length === 6
        ) {
          const ei = segmentOnHexEdgeIndex(a, b, hexO);
          if (ei != null && skipOuter.has(ei)) continue;
        }
        if (
          mouthChords &&
          mouthChords.length > 0 &&
          segmentIsRiverMouthChord(a, b, mouthChords)
        ) {
          continue;
        }
        wallNormal2dTowardChannel(a[0], a[1], b[0], b[1], ex, ey, wallN);
        const b0 = positions.length / 3;
        if (inset <= 1e-6) {
          tilePlanePoint(frame, a[0], a[1], rTop, pTop);
          pushVert(pTop.x, pTop.y, pTop.z, wallN.x, wallN.y, wallN.z);
          tilePlanePoint(frame, b[0], b[1], rTop, pTop);
          pushVert(pTop.x, pTop.y, pTop.z, wallN.x, wallN.y, wallN.z);
          tilePlanePoint(frame, b[0], b[1], rBot, pBot);
          pushVert(pBot.x, pBot.y, pBot.z, wallN.x, wallN.y, wallN.z);
          tilePlanePoint(frame, a[0], a[1], rBot, pBot);
          pushVert(pBot.x, pBot.y, pBot.z, wallN.x, wallN.y, wallN.z);
        } else {
          const ax = a[0] * (1 - inset);
          const ay = a[1] * (1 - inset);
          const bx = b[0] * (1 - inset);
          const by = b[1] * (1 - inset);
          tilePlanePoint(frame, a[0], a[1], rTop, pTop);
          const t0x = pTop.x;
          const t0y = pTop.y;
          const t0z = pTop.z;
          tilePlanePoint(frame, b[0], b[1], rTop, pTop);
          const t1x = pTop.x;
          const t1y = pTop.y;
          const t1z = pTop.z;
          tilePlanePoint(frame, bx, by, rBot, pBot);
          let bbx = pBot.x;
          let bby = pBot.y;
          let bbz = pBot.z;
          tilePlanePoint(frame, ax, ay, rBot, pBot);
          let bax = pBot.x;
          let bay = pBot.y;
          let baz = pBot.z;
          e1.set(t1x - t0x, t1y - t0y, t1z - t0z);
          e2.set(bax - t0x, bay - t0y, baz - t0z);
          faceN.crossVectors(e1, e2);
          if (faceN.lengthSq() < 1e-22) {
            faceN.copy(wallN);
          } else {
            faceN.normalize();
            if (faceN.dot(wallN) < 0) {
              const sx = bax;
              const sy = bay;
              const sz = baz;
              bax = bbx;
              bay = bby;
              baz = bbz;
              bbx = sx;
              bby = sy;
              bbz = sz;
              e2.set(bax - t0x, bay - t0y, baz - t0z);
              faceN.crossVectors(e1, e2).normalize();
            }
          }
          const fnx = faceN.x;
          const fny = faceN.y;
          const fnz = faceN.z;
          pushVert(t0x, t0y, t0z, fnx, fny, fnz);
          pushVert(t1x, t1y, t1z, fnx, fny, fnz);
          pushVert(bbx, bby, bbz, fnx, fny, fnz);
          pushVert(bax, bay, baz, fnx, fny, fnz);
        }
        indices.push(b0, b0 + 1, b0 + 2, b0, b0 + 2, b0 + 3);
      }
    };

    pushRingWall(outer, true, 0, true);
    for (const h of holes) {
      pushRingWall(h, true, channelWallBottomInset, false);
    }
  }
}

function ringArea(ring: Ring2): number {
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const j = i + 1;
    a += ring[i][0] * ring[j][1] - ring[j][0] * ring[i][1];
  }
  return a * 0.5;
}

/** Wedge mouths are exactly two opposite edges (channel runs straight through hex). */
function isOppositePairRiverWedge(riverEdges: Set<number>): boolean {
  const w = hexRiverWedgeEdgeIndices(riverEdges);
  if (w.size !== 2) return false;
  const a = [...w].sort((x, y) => x - y);
  return a[1] - a[0] === 3;
}

/** Vertices O[j] strictly between start of edge e0 and start of edge e1 when walking CCW around hex. */
function hexVertexIndicesBetweenEdgesCCW(e0: number, e1: number): number[] {
  const verts: number[] = [];
  let j = m(e0 + 1);
  while (j !== m(e1)) {
    verts.push(j);
    j = m(j + 1);
  }
  return verts;
}

/**
 * U-shaped river: flat bed quad + two banks built by lofting outer hex chains down to the bed
 * (additive “north/south” banks for a through-channel), instead of boolean cutout land.
 */
function appendUShapedOppositeRiverTerrain(
  O: [number, number][],
  riverEdges: Set<number>,
  innerFrac: number,
  frame: TileTangentFrame,
  rTop: number,
  rBot: number,
  bankPos: number[],
  bankNorm: number[],
  bankIdx: number[],
  bankTileIds: number[],
  bedPos: number[],
  bedIdx: number[],
  bedTileIds: number[],
  tileId: number,
  bankColors: number[] | null,
  rgb: [number, number, number],
  nUp: THREE.Vector3
): boolean {
  if (!isOppositePairRiverWedge(riverEdges)) return false;
  const w = hexRiverWedgeEdgeIndices(riverEdges);
  const [e0, e1] = [...w].sort((a, b) => a - b);
  const mouths = riverMouthOpeningsByEdge(O, riverEdges, innerFrac);
  const m0 = mouths.get(e0);
  const m1 = mouths.get(e1);
  if (!m0 || !m1) return false;
  const [A0, B0] = m0;
  const [A1, B1] = m1;
  const fi = Math.min(0.9, Math.max(0.28, innerFrac * 0.92));
  const ins = (p: [number, number]): [number, number] => [p[0] * fi, p[1] * fi];
  const iA0 = ins(A0);
  const iB0 = ins(B0);
  const iA1 = ins(A1);
  const iB1 = ins(B1);

  const p3 = new THREE.Vector3();
  const [cr, cg, cb] = rgb;
  const pushBankVert = (x: number, y: number, z: number, nx: number, ny: number, nz: number) => {
    bankPos.push(x, y, z);
    bankNorm.push(nx, ny, nz);
    bankTileIds.push(tileId);
    if (bankColors) bankColors.push(cr, cg, cb);
  };

  /* Bed: quad so edges 0–1 and 2–3 match wall bottoms (iA1–iB0, iA0–iB1). Order [iB0, iA1, iA0, iB1]. */
  const b0 = bedPos.length / 3;
  const p0 = new THREE.Vector3();
  const p1 = new THREE.Vector3();
  const p2 = new THREE.Vector3();
  for (const q of [iB0, iA1, iA0, iB1]) {
    tilePlanePoint(frame, q[0], q[1], rBot, p3);
    bedPos.push(p3.x, p3.y, p3.z);
    bedTileIds.push(tileId);
  }
  tilePlanePoint(frame, iB0[0], iB0[1], rBot, p0);
  tilePlanePoint(frame, iA1[0], iA1[1], rBot, p1);
  tilePlanePoint(frame, iA0[0], iA0[1], rBot, p2);
  const ex1 = p1.x - p0.x,
    ey1 = p1.y - p0.y,
    ez1 = p1.z - p0.z;
  const ex2 = p2.x - p0.x,
    ey2 = p2.y - p0.y,
    ez2 = p2.z - p0.z;
  const gx = ey1 * ez2 - ez1 * ey2,
    gy = ez1 * ex2 - ex1 * ez2,
    gz = ex1 * ey2 - ey1 * ex2;
  const flip = gx * nUp.x + gy * nUp.y + gz * nUp.z < 0;
  if (flip) {
    bedIdx.push(b0, b0 + 2, b0 + 1, b0, b0 + 3, b0 + 2);
  } else {
    bedIdx.push(b0, b0 + 1, b0 + 2, b0, b0 + 2, b0 + 3);
  }

  const dedupeConsecutive2d = (chain: [number, number][], eps = 1e-6): [number, number][] => {
    const out: [number, number][] = [];
    for (const p of chain) {
      if (
        out.length === 0 ||
        Math.hypot(p[0] - out[out.length - 1][0], p[1] - out[out.length - 1][1]) > eps
      ) {
        out.push([p[0], p[1]]);
      }
    }
    return out;
  };

  const appendLoftedBank = (
    outer2d: [number, number][],
    /** Top edge of wall = cap closing chord (actual drawn boundary). */
    topStart: [number, number],
    topEnd: [number, number],
    /** Bottom edge of wall = bed edge (inset). */
    botStart: [number, number],
    botEnd: [number, number]
  ): void => {
    const outer = dedupeConsecutive2d(outer2d, 1e-10);
    const k = outer.length;
    if (k < 2) return;

    const flat: number[] = [];
    for (const p of outer) flat.push(p[0], p[1]);
    let tris = earcut(flat, undefined, 2);
    const baseTop = bankPos.length / 3;
    for (const p of outer) {
      tilePlanePoint(frame, p[0], p[1], rTop, p3);
      pushBankVert(p3.x, p3.y, p3.z, nUp.x, nUp.y, nUp.z);
    }
    const nx = nUp.x;
    const ny = nUp.y;
    const nz = nUp.z;
    if (tris.length === 0 && k >= 3) {
      const fan: number[] = [];
      for (let i = 1; i < k - 1; i++) fan.push(0, i, i + 1);
      tris = fan;
    }
    for (let ti = 0; ti < tris.length; ti += 3) {
      const ia = baseTop + tris[ti];
      const ib = baseTop + tris[ti + 1];
      const ic = baseTop + tris[ti + 2];
      const ax = bankPos[ia * 3],
        ay = bankPos[ia * 3 + 1],
        az = bankPos[ia * 3 + 2];
      const bx = bankPos[ib * 3],
        by = bankPos[ib * 3 + 1],
        bz = bankPos[ib * 3 + 2];
      const cx = bankPos[ic * 3],
        cy = bankPos[ic * 3 + 1],
        cz = bankPos[ic * 3 + 2];
      const e1x = bx - ax,
        e1y = by - ay,
        e1z = bz - az;
      const e2x = cx - ax,
        e2y = cy - ay,
        e2z = cz - az;
      const gx = e1y * e2z - e1z * e2y;
      const gy = e1z * e2x - e1x * e2z;
      const gz = e1x * e2y - e1y * e2x;
      if (gx * nx + gy * ny + gz * nz < 0) bankIdx.push(ia, ic, ib);
      else bankIdx.push(ia, ib, ic);
    }

    const e1 = new THREE.Vector3();
    const e2 = new THREE.Vector3();
    const wallN = new THREE.Vector3();
    const toChannel = new THREE.Vector3();
    /* Wall from cap chord (top) down to bed (bottom): same 2D as what draws the bank top. */
    tilePlanePoint(frame, topStart[0], topStart[1], rTop, p3);
    const t0x = p3.x,
      t0y = p3.y,
      t0z = p3.z;
    tilePlanePoint(frame, topEnd[0], topEnd[1], rTop, p3);
    const t1x = p3.x,
      t1y = p3.y,
      t1z = p3.z;
    tilePlanePoint(frame, botEnd[0], botEnd[1], rBot, p3);
    const bbx = p3.x,
      bby = p3.y,
      bbz = p3.z;
    tilePlanePoint(frame, botStart[0], botStart[1], rBot, p3);
    const bax = p3.x,
      bay = p3.y,
      baz = p3.z;
    e1.set(t1x - t0x, t1y - t0y, t1z - t0z);
    e2.set(bax - t0x, bay - t0y, baz - t0z);
    wallN.crossVectors(e1, e2);
    if (wallN.lengthSq() < 1e-20) wallN.copy(nUp);
    else wallN.normalize();
    toChannel.set(
      (bax + bbx) * 0.5 - (t0x + t1x) * 0.5,
      (bay + bby) * 0.5 - (t0y + t1y) * 0.5,
      (baz + bbz) * 0.5 - (t0z + t1z) * 0.5
    );
    if (toChannel.lengthSq() > 1e-20 && wallN.dot(toChannel) < 0) wallN.negate();
    const w0 = bankPos.length / 3;
    pushBankVert(t0x, t0y, t0z, wallN.x, wallN.y, wallN.z);
    pushBankVert(t1x, t1y, t1z, wallN.x, wallN.y, wallN.z);
    pushBankVert(bbx, bby, bbz, wallN.x, wallN.y, wallN.z);
    pushBankVert(bax, bay, baz, wallN.x, wallN.y, wallN.z);
    bankIdx.push(w0, w0 + 1, w0 + 2, w0, w0 + 2, w0 + 3);
  };

  /**
   * Full outer-perimeter chain from mouth on e0 (B0 → O[e0+1]) to mouth on e1 (… → O[e1] → A1).
   * hexVertexIndicesBetweenEdgesCCW omits O[e1] / O[e0], which left a diagonal cut and a “missing” corner.
   */
  const verts01 = hexVertexIndicesBetweenEdgesCCW(e0, e1);
  const outer1: [number, number][] = [B0];
  for (const vi of verts01) outer1.push(O[vi]);
  outer1.push(O[e1]);
  outer1.push(A1);

  const verts10 = hexVertexIndicesBetweenEdgesCCW(e1, e0);
  const outer2: [number, number][] = [B1];
  for (const vi of verts10) outer2.push(O[vi]);
  outer2.push(O[e0]);
  outer2.push(A0);

  /* Top edge of bank = cap closing chord (outer1 closes A1→B0, outer2 closes A0→B1). Bottom = bed inset. */
  appendLoftedBank(outer1, A1, B0, iA1, iB0);
  appendLoftedBank(outer2, A0, B1, iA0, iB1);

  return true;
}

function appendVoidBed(
  voidMp: MultiPoly,
  rBot: number,
  frame: TileTangentFrame,
  positions: number[],
  indices: number[],
  tileIds: number[],
  tileId: number
): void {
  const p = new THREE.Vector3();
  for (const polygon of voidMp) {
    if (!polygon.length) continue;
    let outer = polygon[0];
    if (ringArea(outer) < 0) {
      outer = [...outer].reverse();
    }
    const holes = polygon.slice(1);
    const flat: number[] = [];
    const holeIdx: number[] = [];
    let v = 0;
    for (let i = 0; i < outer.length - 1; i++) {
      flat.push(outer[i][0], outer[i][1]);
      v++;
    }
    for (const h of holes) {
      let hr = h;
      if (ringArea(h) > 0) hr = [...h].reverse();
      holeIdx.push(v);
      for (let i = 0; i < hr.length - 1; i++) {
        flat.push(hr[i][0], hr[i][1]);
        v++;
      }
    }
    if (flat.length < 6) continue;
    const tris = earcut(flat, holeIdx.length ? holeIdx : undefined, 2);
    const base = positions.length / 3;
    for (let i = 0; i < flat.length; i += 2) {
      tilePlanePoint(frame, flat[i], flat[i + 1], rBot, p);
      positions.push(p.x, p.y, p.z);
      tileIds.push(tileId);
    }
    const nx = frame.normal.x,
      ny = frame.normal.y,
      nz = frame.normal.z;
    const idx0 = indices.length;
    for (let i = 0; i < tris.length; i++) {
      indices.push(base + tris[i]);
    }
    for (let ti = 0; ti < tris.length; ti += 3) {
      const ia = indices[idx0 + ti] * 3;
      const ib = indices[idx0 + ti + 1] * 3;
      const ic = indices[idx0 + ti + 2] * 3;
      const e1x = positions[ib] - positions[ia];
      const e1y = positions[ib + 1] - positions[ia + 1];
      const e1z = positions[ib + 2] - positions[ia + 2];
      const e2x = positions[ic] - positions[ia];
      const e2y = positions[ic + 1] - positions[ia + 1];
      const e2z = positions[ic + 2] - positions[ia + 2];
      const gx = e1y * e2z - e1z * e2y;
      const gy = e1z * e2x - e1x * e2z;
      const gz = e1x * e2y - e1y * e2x;
      if (gx * nx + gy * ny + gz * nz < 0) {
        const t = indices[idx0 + ti + 1];
        indices[idx0 + ti + 1] = indices[idx0 + ti + 2];
        indices[idx0 + ti + 2] = t;
      }
    }
  }
}

export interface RiverTerrainMeshesOptions {
  radius?: number;
  getElevation: (tileId: number) => number;
  elevationScale?: number;
  riverBedDepth?: number;
  /** Inner channel: corners scaled toward tile center (0.38 ≈ narrow, 0.55+ wider). */
  riverVoidInnerRadiusFraction?: number;
  /** Solid bank color when getBankVertexRgb is omitted. Default: terrain land green. */
  bankColor?: number;
  /** Per-tile bank tint (0–1 RGB); enables vertexColors on bank mesh. */
  getBankVertexRgb?: (tileId: number) => [number, number, number];
  /**
   * Extra radial offset on bank tops (globe units). Default 0 so banks match flat land at
   * `radius + elevation`. Set a small positive value only if transparent river quads still
   * paint over bank lips.
   */
  bankTopLift?: number;
  /**
   * Channel-facing bank walls: bottom edge moves toward tile center in the tangent plane (0–0.55).
   * 0 = vertical walls; ~0.28–0.36 reads as natural sloped banks instead of “dams”.
   */
  riverBankChannelWallInset?: number;
  bedColor?: number;
  bankRoughness?: number;
  bedRoughness?: number;
  metalness?: number;
}

interface GlobeTiles {
  tiles: GeodesicTile[];
  radius: number;
}

/**
 * One extruded river-bank mesh using the same pipeline as {@link createRiverTerrainMeshes}
 * ({@link buildRiverLandAndVoidFromCorners} + extrusion). For debugging or viewers.
 */
export interface BuildRiverBankExtrusionParams {
  corners2d: [number, number][];
  riverEdges: Set<number>;
  innerFrac: number;
  rTop: number;
  rBot: number;
  normal: THREE.Vector3;
  ex: THREE.Vector3;
  ey: THREE.Vector3;
  /** @see RiverTerrainMeshesOptions.riverBankChannelWallInset */
  channelWallBottomInset?: number;
}

export function buildRiverBankExtrusionGeometry(
  params: BuildRiverBankExtrusionParams
): THREE.BufferGeometry {
  const { landMp } = buildRiverLandAndVoidFromCorners(
    params.corners2d,
    params.riverEdges,
    params.innerFrac
  );
  const frame: TileTangentFrame = {
    normal: params.normal.clone().normalize(),
    ex: params.ex.clone().normalize(),
    ey: params.ey.clone().normalize(),
    corners2d: params.corners2d,
  };
  const bankPos: number[] = [];
  const bankNorm: number[] = [];
  const bankIdx: number[] = [];
  const bankTileIds: number[] = [];
  const mouths = riverMouthOpeningsByEdge(params.corners2d, params.riverEdges, params.innerFrac);
  const riverMouthChordsAB: Array<[[number, number], [number, number]]> = [];
  for (const e of hexRiverWedgeEdgeIndices(params.riverEdges)) {
    const ends = mouths.get(e);
    if (ends) riverMouthChordsAB.push([[ends[0][0], ends[0][1]], [ends[1][0], ends[1][1]]]);
  }
  appendExtrudedLand(
    landMp,
    params.rTop,
    params.rBot,
    frame,
    bankPos,
    bankNorm,
    bankIdx,
    bankTileIds,
    0,
    null,
    [0.4, 0.55, 0.35],
    params.channelWallBottomInset ?? 0.32,
    {
      hexCorners2d: params.corners2d,
      skipOuterWallsOnHexEdges: hexRiverWedgeEdgeIndices(params.riverEdges),
      riverMouthChordsAB,
    }
  );
  const rgb: [number, number, number] = [0.4, 0.55, 0.35];
  for (const e of hexRiverWedgeEdgeIndices(params.riverEdges)) {
    const ends = mouths.get(e);
    if (!ends) continue;
    appendRiverMouthUGeometry(
      frame,
      e,
      ends[0],
      ends[1],
      params.corners2d,
      params.rTop,
      params.rBot,
      bankPos,
      bankNorm,
      bankIdx,
      bankTileIds,
      0,
      null,
      rgb
    );
  }
  const g = new THREE.BufferGeometry();
  if (bankPos.length > 0) {
    g.setAttribute("position", new THREE.Float32BufferAttribute(bankPos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(bankNorm, 3));
    g.setIndex(bankIdx);
  }
  return g;
}

export function createRiverTerrainMeshes(
  globe: GlobeTiles,
  riverEdgesByTile: Map<number, Set<number>>,
  options: RiverTerrainMeshesOptions
): { banks: THREE.Mesh; bed: THREE.Mesh } {
  const radius = options.radius ?? globe.radius;
  const elevationScale = options.elevationScale ?? 1;
  const depth = options.riverBedDepth ?? 0.012;
  const rInFrac = options.riverVoidInnerRadiusFraction ?? 0.42;
  const bankTopLift = options.bankTopLift ?? 0;
  const channelWallInset = options.riverBankChannelWallInset ?? 0.32;

  const bankPos: number[] = [];
  const bankNorm: number[] = [];
  const bankIdx: number[] = [];
  const bankTileIds: number[] = [];
  const bankColors: number[] | null = options.getBankVertexRgb ? [] : null;
  const defaultBankRgb = (() => {
    const c = new THREE.Color(options.bankColor ?? TERRAIN_STYLES.land.color);
    return [c.r, c.g, c.b] as [number, number, number];
  })();
  const bedPos: number[] = [];
  const bedIdx: number[] = [];
  const bedTileIds: number[] = [];

  const tileById = new Map(globe.tiles.map((t) => [t.id, t]));

  // Debug specific tiles - add IDs here to inspect
  const DEBUG_TILE_IDS = new Set<number>([]); // e.g. [1602] for debugging
  
  // Check if debug tiles are in the input data
  for (const tid of DEBUG_TILE_IDS) {
    if (riverEdgesByTile.has(tid)) {
      console.log(`[riverHexGeometry] DEBUG: tile ${tid} IS in riverEdgesByTile with edges [${[...riverEdgesByTile.get(tid)!].join(",")}]`);
    } else {
      console.log(`[riverHexGeometry] DEBUG: tile ${tid} is NOT in riverEdgesByTile (total tiles: ${riverEdgesByTile.size})`);
      // Check if neighbors are river tiles
      const debugTile = tileById.get(tid);
      if (debugTile) {
        const neighborInfo: string[] = [];
        for (let e = 0; e < debugTile.vertices.length; e++) {
          const nid = getEdgeNeighbor(debugTile, e, globe.tiles);
          const isRiver = nid !== undefined && riverEdgesByTile.has(nid);
          neighborInfo.push(`edge${e}→${nid}${isRiver ? "(RIVER)" : ""}`);
        }
        console.log(`[riverHexGeometry] DEBUG: tile ${tid} neighbors: ${neighborInfo.join(", ")}`);
      }
    }
  }

  for (const [tileId, edgeSet] of riverEdgesByTile) {
    if (edgeSet.size === 0) continue;
    const tile = tileById.get(tileId);
    if (!tile || tile.vertices.length !== 6) continue;

    // Check connectivity: does each edge connect to another river tile with reciprocal edge?
    const edgeNeighborDebug: Array<{
      edge: number;
      neighborId: number | undefined;
      neighborHasRiver: boolean;
      neighborRiverEdges: number[] | null;
      reciprocalEdge: number | undefined;
      isReciprocal: boolean;
    }> = [];
    for (const e of edgeSet) {
      const neighborId = getEdgeNeighbor(tile, e, globe.tiles);
      const neighborTile = neighborId !== undefined ? tileById.get(neighborId) : undefined;
      const neighborEdges = neighborId !== undefined ? riverEdgesByTile.get(neighborId) : undefined;
      const neighborHasRiver = neighborEdges !== undefined && neighborEdges.size > 0;
      const reciprocalEdge = neighborTile ? getNeighborEdgeIndex(tile, e, neighborTile) : undefined;
      const isReciprocal = reciprocalEdge !== undefined && neighborEdges !== undefined && neighborEdges.has(reciprocalEdge);
      edgeNeighborDebug.push({
        edge: e,
        neighborId,
        neighborHasRiver,
        neighborRiverEdges: neighborEdges ? [...neighborEdges] : null,
        reciprocalEdge,
        isReciprocal,
      });
    }
    // Only warn for edges where neighbor IS a river tile but lacks reciprocal edge (data bug)
    // Edges to non-river tiles are expected river endpoints/termini
    const brokenEdges = edgeNeighborDebug.filter(e => e.neighborHasRiver && !e.isReciprocal);
    if (brokenEdges.length > 0) {
      console.warn(
        `[riverHexGeometry] BROKEN EDGE(S): tileId=${tileId}, edges=${[...edgeSet].join(",")}, ` +
        `broken=${brokenEdges.length}/${edgeSet.size}:`,
        brokenEdges.map(e => ({
          edge: e.edge,
          neighborId: e.neighborId,
          reciprocalEdge: e.reciprocalEdge,
          neighborRiverEdges: e.neighborRiverEdges
        }))
      );
    }
    // Log river endpoints (edges to non-river land tiles)
    const endpoints = edgeNeighborDebug.filter(e => e.neighborRiverEdges === null);
    if (endpoints.length > 0 && endpoints.length === edgeSet.size) {
      // ALL edges point to non-river tiles - this is a true orphan (isolated river hex)
      console.warn(
        `[riverHexGeometry] ISOLATED river hex: tileId=${tileId}, edges=${[...edgeSet].join(",")}, ` +
        `all ${endpoints.length} edges point to non-river tiles`
      );
    }

    // Debug specific tiles
    if (DEBUG_TILE_IDS.has(tileId)) {
      console.log(
        `[riverHexGeometry] DEBUG tile ${tileId}: edges=${[...edgeSet].join(",")}, ` +
        `neighbors:`, edgeNeighborDebug
      );
    }

    const elev = options.getElevation(tileId) * elevationScale;
    const rTop = radius + elev + bankTopLift;
    const rBot = radius + elev - depth;
    if (tile.vertices.length !== 6) continue;
    const frame = getTileTangentFrame(tile);
    const rgb = options.getBankVertexRgb?.(tileId) ?? defaultBankRgb;
    const nUp = frame.normal.clone().normalize();

    const bankIdxBefore = bankIdx.length;
    const bedIdxBefore = bedIdx.length;

    // Check which code path will be used
    const isOpposite = isOppositePairRiverWedge(edgeSet);
    if (DEBUG_TILE_IDS.has(tileId)) {
      console.log(`[riverHexGeometry] DECISION tile ${tileId}: edges=[${[...edgeSet].join(",")}], isOpposite=${isOpposite}`);
      console.log(`  -> will use ${isOpposite ? "U-SHAPED (opposite edges)" : "BOOLEAN CUTOUT (non-opposite)"} path`);
    }

    if (
      appendUShapedOppositeRiverTerrain(
        frame.corners2d,
        edgeSet,
        rInFrac,
        frame,
        rTop,
        rBot,
        bankPos,
        bankNorm,
        bankIdx,
        bankTileIds,
        bedPos,
        bedIdx,
        bedTileIds,
        tileId,
        bankColors,
        rgb,
        nUp
      )
    ) {
      const mouthsU = riverMouthOpeningsByEdge(frame.corners2d, edgeSet, rInFrac);
      for (const e of hexRiverWedgeEdgeIndices(edgeSet)) {
        const ends = mouthsU.get(e);
        if (!ends) continue;
        const [A, B] = ends;
        appendRiverMouthUGeometry(
          frame,
          e,
          A,
          B,
          frame.corners2d,
          rTop,
          rBot,
          bankPos,
          bankNorm,
          bankIdx,
          bankTileIds,
          tileId,
          bankColors,
          rgb
        );
      }
      const bankTrisAdded = (bankIdx.length - bankIdxBefore) / 3;
      const bedTrisAdded = (bedIdx.length - bedIdxBefore) / 3;
      if (bedTrisAdded === 0) {
        console.warn(
          `[riverHexGeometry] NO CHANNEL (U-path, 0 bed tris): tileId=${tileId}, edges=${[...edgeSet].join(",")}, ` +
          `bankTris=${bankTrisAdded}, bedTris=${bedTrisAdded}`
        );
      }
      continue;
    }

    const debugThisTile = DEBUG_TILE_IDS.has(tileId) ? tileId : undefined;
    const { landMp, voidMp } = buildRiverLandAndVoidFromCorners(frame.corners2d, edgeSet, rInFrac, debugThisTile);

    if (DEBUG_TILE_IDS.has(tileId)) {
      console.log(
        `[riverHexGeometry] DEBUG tile ${tileId} (boolean path): ` +
        `wedgeEdges=[${[...hexRiverWedgeEdgeIndices(edgeSet)].join(",")}], ` +
        `landMp.length=${landMp.length}, voidMp.length=${voidMp.length}`
      );
      // Log void polygon (what gets cut out)
      for (let pi = 0; pi < voidMp.length; pi++) {
        const poly = voidMp[pi];
        console.log(`  voidMp[${pi}]: ${poly.length} rings, outer has ${poly[0]?.length} points`);
        if (poly[0]) {
          console.log(`    void points:`, poly[0].map(p => `[${p[0].toFixed(3)},${p[1].toFixed(3)}]`).join(' '));
        }
      }
      // Log land polygon (what remains after cutting)
      for (let pi = 0; pi < landMp.length; pi++) {
        const poly = landMp[pi];
        console.log(`  landMp[${pi}]: ${poly.length} rings (outer + ${poly.length - 1} holes)`);
        for (let ri = 0; ri < poly.length; ri++) {
          console.log(`    ring[${ri}]: ${poly[ri].length} points`);
        }
      }
      // Log hex corners for reference
      console.log(`  hex corners:`, frame.corners2d.map(p => `[${p[0].toFixed(3)},${p[1].toFixed(3)}]`).join(' '));
    }

    // Warn if boolean path produces no void (no channel carved out)
    if (voidMp.length === 0) {
      console.warn(
        `[riverHexGeometry] NO CHANNEL: tileId=${tileId}, edges=${[...edgeSet].join(",")}, ` +
        `wedgeEdges=${[...hexRiverWedgeEdgeIndices(edgeSet)].join(",")}, ` +
        `landMp.length=${landMp.length}, voidMp.length=${voidMp.length}, ` +
        `corners2d:`, frame.corners2d
      );
    }

    // Validate that the land polygon has the expected openings
    const validationError = validateRiverHexOpenings(landMp, frame.corners2d, edgeSet, tileId);
    if (validationError) {
      console.error(`[riverHexGeometry] BROKEN OPENING: ${validationError}`);
    }

    const mouths = riverMouthOpeningsByEdge(frame.corners2d, edgeSet, rInFrac);
    const riverMouthChordsAB: Array<[[number, number], [number, number]]> = [];
    for (const e of hexRiverWedgeEdgeIndices(edgeSet)) {
      const ends = mouths.get(e);
      if (ends) riverMouthChordsAB.push([[ends[0][0], ends[0][1]], [ends[1][0], ends[1][1]]]);
    }

    if (landMp.length > 0) {
      appendExtrudedLand(
        landMp,
        rTop,
        rBot,
        frame,
        bankPos,
        bankNorm,
        bankIdx,
        bankTileIds,
        tileId,
        bankColors,
        rgb,
        channelWallInset,
        {
          hexCorners2d: frame.corners2d,
          skipOuterWallsOnHexEdges: hexRiverWedgeEdgeIndices(edgeSet),
          riverMouthChordsAB,
        }
      );
      for (const e of hexRiverWedgeEdgeIndices(edgeSet)) {
        const ends = mouths.get(e);
        if (!ends) continue;
        const [A, B] = ends;
        appendRiverMouthUGeometry(
          frame,
          e,
          A,
          B,
          frame.corners2d,
          rTop,
          rBot,
          bankPos,
          bankNorm,
          bankIdx,
          bankTileIds,
          tileId,
          bankColors,
          rgb
        );
      }
    }
    if (voidMp.length > 0) {
      appendVoidBed(voidMp, rBot, frame, bedPos, bedIdx, bedTileIds, tileId);
    }

    const bankTrisAdded = (bankIdx.length - bankIdxBefore) / 3;
    const bedTrisAdded = (bedIdx.length - bedIdxBefore) / 3;
    if (bankTrisAdded === 0 && bedTrisAdded === 0) {
      const edgeNeighborInfo: Array<{
        edge: number;
        neighborId: number | undefined;
        neighborHasRiver: boolean;
        neighborRiverEdges: number[] | null;
      }> = [];
      for (const e of edgeSet) {
        const neighborId = getEdgeNeighbor(tile, e, globe.tiles);
        const neighborHasRiver = neighborId !== undefined && riverEdgesByTile.has(neighborId);
        const neighborRiverEdges = neighborId !== undefined ? riverEdgesByTile.get(neighborId) : null;
        edgeNeighborInfo.push({
          edge: e,
          neighborId,
          neighborHasRiver,
          neighborRiverEdges: neighborRiverEdges ? [...neighborRiverEdges] : null,
        });
      }
      console.warn(
        `[riverHexGeometry] Orphan river hex (boolean path, 0 tris): tileId=${tileId}, edges=${[...edgeSet].join(",")}, landMp=${landMp.length}, voidMp=${voidMp.length}, neighbors:`,
        edgeNeighborInfo
      );
    }
  }

  const bankGeom = new THREE.BufferGeometry();
  if (bankPos.length > 0) {
    bankGeom.setAttribute("position", new THREE.Float32BufferAttribute(bankPos, 3));
    bankGeom.setAttribute("normal", new THREE.Float32BufferAttribute(bankNorm, 3));
    bankGeom.setAttribute("tileId", new THREE.Float32BufferAttribute(bankTileIds, 1));
    if (bankColors && bankColors.length === bankPos.length) {
      bankGeom.setAttribute("color", new THREE.Float32BufferAttribute(bankColors, 3));
    }
    bankGeom.setIndex(bankIdx);
  }

  const bedGeom = new THREE.BufferGeometry();
  if (bedPos.length > 0) {
    bedGeom.setAttribute("position", new THREE.Float32BufferAttribute(bedPos, 3));
    bedGeom.setAttribute("tileId", new THREE.Float32BufferAttribute(bedTileIds, 1));
    bedGeom.setIndex(bedIdx);
    bedGeom.computeVertexNormals();
  }

  const useVertexColors = bankColors != null && bankColors.length > 0;
  const bankMat = new THREE.MeshStandardMaterial({
    color: useVertexColors ? 0xffffff : options.bankColor ?? TERRAIN_STYLES.land.color,
    vertexColors: useVertexColors,
    roughness: options.bankRoughness ?? TERRAIN_STYLES.land.roughness,
    metalness: options.metalness ?? TERRAIN_STYLES.land.metalness,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const bedMat = new THREE.MeshStandardMaterial({
    color: options.bedColor ?? 0x1a2520,
    roughness: options.bedRoughness ?? 0.92,
    metalness: 0,
    flatShading: true,
    /** Inward-facing bed tris were culled → apparent holes through the globe; double-side is a safety net. */
    side: THREE.DoubleSide,
    depthWrite: true,
    depthTest: true,
  });

  const banks = new THREE.Mesh(bankGeom, bankMat);
  banks.name = "RiverBanks";
  /** After river water (2) so bank tops win the color pass over transparent water where they overlap. */
  banks.renderOrder = 4;

  const bed = new THREE.Mesh(bedGeom, bedMat);
  bed.name = "RiverBed";
  bed.renderOrder = -0.5;

  return { banks, bed };
}
