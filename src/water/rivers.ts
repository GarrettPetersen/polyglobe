/**
 * Rivers: trace a polyline through geodesic tiles and render as a channel with water shader.
 * Each segment is (tileId, entryEdge?, exitEdge?); the channel can enter/exit any of the 6 (or 5) tile edges.
 */

import * as THREE from "three";
import type { GeodesicTile } from "../core/geodesic.js";
import { getEdgeNeighbor } from "../core/geodesic.js";
import { hexRiverVertexPairForTwoEdges } from "./riverCutouts.js";
import { getTileTangentFrame, tileCornerWorldFlat } from "../core/tileLocalFrame.js";
// Globe is only used for getTileIdAtDirection and .tiles, .radius
interface GlobeLike {
  tiles: GeodesicTile[];
  radius: number;
  getTileIdAtDirection(direction: THREE.Vector3): number;
}

export interface RiverSegment {
  tileId: number;
  /** Edge index (0..n-1) where the river enters this tile; undefined at river start. */
  entryEdge?: number;
  /** Edge index where the river exits; undefined at river end. */
  exitEdge?: number;
  /** If true, this segment is part of a delta: prefer connecting to sea over other sea-adjacent river segments. */
  isDelta?: boolean;
}

export interface RiverMeshOptions {
  /** Radius of the globe. Default from globe.radius. */
  radius?: number;
  /** Elevation per tile (globe units). River surface = radius + getElevation(id)*elevationScale - surfaceOffset. */
  getElevation: (tileId: number) => number;
  elevationScale?: number;
  /** How far below the tile surface (bowl lip) the river base sits (globe units). Default: wave amplitude so crests reach the lip. */
  surfaceOffset?: number;
  /** Half-width of the river in globe units. Ignored if riverWidthFraction is set. */
  riverWidth?: number;
  /** Half-width as fraction of segment length (e.g. 0.28 = narrow ribbon relative to hex). Use this to scale to hex size. */
  riverWidthFraction?: number;
  /** For per-hex river: channel half-width as fraction of center-to-edge (e.g. 0.45 = 90% of hex, boat-sized). Ignored if riverBowlInnerScale is set. */
  channelWidthFraction?: number;
  /** If set, strip width matches the bowl slot (same as geodesic riverBowlInnerScale) and a central water hex fills the bowl interior. */
  riverBowlInnerScale?: number;
  /** When false, skip the center water disk (use with extruded river banks). Default true. */
  fillInnerRiverHex?: boolean;
  /** Sun direction for water specular. */
  sunDirection?: THREE.Vector3;
  /** If set with isWater, adds a ramp quad from each river edge that connects to water up to this radius (e.g. 0.995 for ocean sphere), so river mouths blend into the water surface. */
  waterSurfaceRadius?: number;
  /** Used with waterSurfaceRadius to decide which edges get a transition strip to the ocean/lake. */
  isWater?: (tileId: number) => boolean;
}

/** Max radial wave displacement (sum of Gerstner amps) so default surfaceOffset aligns wave crests with bowl lip. */
const RIVER_MAX_WAVE_AMPLITUDE = 0.0004 * (1 + 0.85 + 0.6);
function convexHull2dWorld(
  pts: { x: number; y: number; world: THREE.Vector3 }[]
): { x: number; y: number; world: THREE.Vector3 }[] {
  if (pts.length <= 2) return pts;
  const sorted = [...pts].sort((p, q) => (p.x === q.x ? p.y - q.y : p.x - q.x));
  const cross = (
    o: { x: number; y: number },
    p: { x: number; y: number },
    q: { x: number; y: number }
  ) => (p.x - o.x) * (q.y - o.y) - (p.y - o.y) * (q.x - o.x);
  const lower: typeof sorted = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 1e-10) lower.pop();
    lower.push(p);
  }
  const upper: typeof sorted = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 1e-10) upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

/** Options for getRiverEdgesByTile: if provided, end segments (tiles with only one river edge) get an extra opening toward any adjacent water tile so the river connects to ocean/lake. */
export interface GetRiverEdgesOptions {
  tiles: GeodesicTile[];
  isWater: (tileId: number) => boolean;
}

/**
 * Map from tile ID to set of edge indices (0..n-1) where the river crosses the hex boundary.
 * After building from segments: edges are symmetrized between adjacent river tiles; every edge
 * bordering water (ocean/lake per `isWater`) is added so mouths and coast matches reference tiles.
 * Confluences/deltas may have 3+ edges. Delta tiles may drop edges between sea-adjacent river neighbors.
 */
export function getRiverEdgesByTile(
  segments: RiverSegment[],
  options?: GetRiverEdgesOptions
): Map<number, Set<number>> {
  const byTile = new Map<number, Set<number>>();
  for (const seg of segments) {
    let set = byTile.get(seg.tileId);
    if (!set) {
      set = new Set<number>();
      byTile.set(seg.tileId, set);
    }
    if (seg.entryEdge !== undefined) set.add(seg.entryEdge);
    if (seg.exitEdge !== undefined) set.add(seg.exitEdge);
  }
  if (options) {
    const { tiles, isWater } = options;
    const tileById = new Map(tiles.map((t) => [t.id, t]));

    const deltaTileIds = new Set(
      segments.filter((s) => s.isDelta).map((s) => s.tileId)
    );
    const seaAdjacent = new Set<number>();
    for (const [tileId] of byTile) {
      const tile = tileById.get(tileId);
      if (!tile) continue;
      for (let e = 0; e < tile.vertices.length; e++) {
        const neighborId = getEdgeNeighbor(tile, e, tiles);
        if (neighborId !== undefined && isWater(neighborId)) {
          seaAdjacent.add(tileId);
          break;
        }
      }
    }
    for (const tileId of deltaTileIds) {
      if (!seaAdjacent.has(tileId)) continue;
      const edgeSet = byTile.get(tileId);
      const tile = tileById.get(tileId);
      if (!edgeSet || !tile) continue;
      for (const e of [...edgeSet]) {
        const neighborId = getEdgeNeighbor(tile, e, tiles);
        if (
          neighborId !== undefined &&
          byTile.has(neighborId) &&
          seaAdjacent.has(neighborId)
        ) {
          edgeSet.delete(e);
        }
      }
    }

    // Add ocean/lake edge to terminus tiles (size 1) that border water
    for (const [tileId, edgeSet] of byTile) {
      if (edgeSet.size !== 1) continue;
      const tile = tileById.get(tileId);
      if (!tile) continue;
      for (let e = 0; e < tile.vertices.length; e++) {
        if (edgeSet.has(e)) continue;
        const neighborId = getEdgeNeighbor(tile, e, tiles);
        if (neighborId !== undefined && isWater(neighborId)) edgeSet.add(e);
      }
    }

    // Aggressive: terminuses that still have no water edge may end one tile inland. Walk backward
    // along the river and add an ocean edge to the first tile we find that borders the ocean.
    const MAX_TERMINUS_WALK = 5;
    for (const [tileId, edgeSet] of byTile) {
      if (edgeSet.size !== 1) continue;
      const tile = tileById.get(tileId);
      if (!tile) continue;
      const hasWaterNeighbor = tile.vertices.some((_, e) => {
        const nid = getEdgeNeighbor(tile, e, tiles);
        return nid !== undefined && isWater(nid);
      });
      if (hasWaterNeighbor) continue; // already connected

      let currentId: number | undefined = tileId;
      let currentSet = edgeSet;
      let steps = 0;
      while (currentId !== undefined && steps < MAX_TERMINUS_WALK) {
        const t = tileById.get(currentId);
        if (!t || !currentSet) break;
        for (let e = 0; e < t.vertices.length; e++) {
          const neighborId = getEdgeNeighbor(t, e, tiles);
          if (neighborId === undefined || !isWater(neighborId)) continue;
          const targetSet = byTile.get(currentId);
          if (targetSet) targetSet.add(e);
          currentId = undefined;
          break;
        }
        if (currentId === undefined) break;
        const singleEdge = [...currentSet][0];
        const upstreamId = getEdgeNeighbor(t, singleEdge, tiles);
        const nextSet = upstreamId !== undefined ? byTile.get(upstreamId) : undefined;
        if (upstreamId === undefined || nextSet === undefined) break;
        currentId = upstreamId;
        currentSet = nextSet;
        steps++;
      }
    }

    for (const [tileId, edgeSet] of byTile) {
      const tile = tileById.get(tileId);
      if (!tile) continue;
      for (const e of [...edgeSet]) {
        const nid = getEdgeNeighbor(tile, e, tiles);
        if (nid === undefined) continue;
        const nset = byTile.get(nid);
        if (!nset) continue;
        const neighbor = tileById.get(nid);
        if (!neighbor) continue;
        for (let k = 0; k < neighbor.vertices.length; k++) {
          if (getEdgeNeighbor(neighbor, k, tiles) === tileId) {
            nset.add(k);
            break;
          }
        }
      }
    }

    for (const tileId of byTile.keys()) {
      const tile = tileById.get(tileId);
      if (!tile) continue;
      const edgeSet = byTile.get(tileId)!;
      for (let e = 0; e < tile.vertices.length; e++) {
        const nid = getEdgeNeighbor(tile, e, tiles);
        if (nid !== undefined && isWater(nid)) edgeSet.add(e);
      }
    }
  }

  return byTile;
}

/**
 * Land tiles that share a river edge both ways (reciprocal edge indices).
 */
function reciprocalRiverNeighbors(
  tileId: number,
  byTile: Map<number, Set<number>>,
  tileById: Map<number, GeodesicTile>,
  tiles: GeodesicTile[],
  isWater: (tileId: number) => boolean
): Set<number> {
  const out = new Set<number>();
  const tile = tileById.get(tileId);
  const set = byTile.get(tileId);
  if (!tile || !set || isWater(tileId)) return out;
  for (const e of set) {
    const nid = getEdgeNeighbor(tile, e, tiles);
    if (nid === undefined || isWater(nid) || !byTile.has(nid)) continue;
    const ntile = tileById.get(nid);
    const nset = byTile.get(nid);
    if (!ntile || !nset) continue;
    for (let k = 0; k < ntile.vertices.length; k++) {
      if (getEdgeNeighbor(ntile, k, tiles) === tileId && nset.has(k)) {
        out.add(nid);
        break;
      }
    }
  }
  return out;
}

function riverEdgeLinkExists(
  a: number,
  b: number,
  byTile: Map<number, Set<number>>,
  tileById: Map<number, GeodesicTile>,
  tiles: GeodesicTile[]
): boolean {
  const ta = tileById.get(a);
  const sa = byTile.get(a);
  if (!ta || !sa) return false;
  for (const e of sa) {
    if (getEdgeNeighbor(ta, e, tiles) === b) return true;
  }
  return false;
}

function removeRiverEdgeBetween(
  a: number,
  b: number,
  byTile: Map<number, Set<number>>,
  tileById: Map<number, GeodesicTile>,
  tiles: GeodesicTile[]
): void {
  const at = tileById.get(a);
  const bt = tileById.get(b);
  const aset = byTile.get(a);
  const bset = byTile.get(b);
  if (!at || !bt || !aset || !bset) return;
  for (const e of [...aset]) {
    if (getEdgeNeighbor(at, e, tiles) === b) aset.delete(e);
  }
  for (let k = 0; k < bt.vertices.length; k++) {
    if (getEdgeNeighbor(bt, k, tiles) === a) {
      bset.delete(k);
      break;
    }
  }
}

/**
 * Only removes a river link when it is one edge of a **triangle**: three land hexes pairwise
 * connected by river edges. Removing that edge still leaves those three hexes connected through the
 * other two edges, so the river cannot be severed. Star confluences (one hex adjacent to three
 * others that are not mutually adjacent) are never pruned.
 */
export function pruneThreeWayRiverJunctions(
  byTile: Map<number, Set<number>>,
  tiles: GeodesicTile[],
  isWater: (tileId: number) => boolean
): number {
  const tileById = new Map(tiles.map((t) => [t.id, t]));

  const adj = (id: number) =>
    reciprocalRiverNeighbors(id, byTile, tileById, tiles, isWater);

  const triangleKeys = new Set<string>();
  for (const tid of byTile.keys()) {
    if (isWater(tid)) continue;
    const n = adj(tid);
    const arr = [...n].sort((x, y) => x - y);
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const u = arr[i];
        const v = arr[j];
        if (adj(u).has(v)) {
          const s = [tid, u, v].sort((x, y) => x - y);
          triangleKeys.add(`${s[0]},${s[1]},${s[2]}`);
        }
      }
    }
  }

  let removed = 0;
  for (const key of triangleKeys) {
    const parts = key.split(",").map(Number);
    const a = parts[0]!;
    const b = parts[1]!;
    const c = parts[2]!;
    if (
      !riverEdgeLinkExists(a, b, byTile, tileById, tiles) ||
      !riverEdgeLinkExists(b, c, byTile, tileById, tiles) ||
      !riverEdgeLinkExists(a, c, byTile, tileById, tiles)
    ) {
      continue;
    }
    const pairs: [number, number][] = [
      [Math.min(a, b), Math.max(a, b)],
      [Math.min(b, c), Math.max(b, c)],
      [Math.min(a, c), Math.max(a, c)],
    ];
    pairs.sort((p, q) => (p[0] !== q[0] ? p[0] - q[0] : p[1] - q[1]));
    const [x, y] = pairs[1]!;
    removeRiverEdgeBetween(x, y, byTile, tileById, tiles);
    removed++;
  }

  return removed;
}

function edgeIndexTowardNeighbor(
  tile: GeodesicTile,
  neighborTileId: number,
  tiles: GeodesicTile[]
): number | undefined {
  for (let k = 0; k < tile.vertices.length; k++) {
    if (getEdgeNeighbor(tile, k, tiles) === neighborTileId) return k;
  }
  return undefined;
}

/** True if this tile shares at least one river edge with a reciprocal edge on an adjacent river tile (land). */
function riverTileTouchesAnotherRiverTile(
  tileId: number,
  byTile: Map<number, Set<number>>,
  tileById: Map<number, GeodesicTile>,
  tiles: GeodesicTile[],
  isWater: (tileId: number) => boolean
): boolean {
  const tile = tileById.get(tileId);
  const set = byTile.get(tileId);
  if (!tile || !set) return false;
  for (const e of set) {
    const nid = getEdgeNeighbor(tile, e, tiles);
    if (nid === undefined || isWater(nid) || !byTile.has(nid)) continue;
    const ntile = tileById.get(nid);
    const nset = byTile.get(nid);
    if (!ntile || !nset) continue;
    const k = edgeIndexTowardNeighbor(ntile, tileId, tiles);
    if (k !== undefined && nset.has(k)) return true;
  }
  return false;
}

/**
 * Tiles that appear in the river graph but share no reciprocal river edge with any other river tile
 * (orphan hexes) get bidirectional river edges added along every shared boundary with adjacent
 * tiles that are also in the graph—so they connect to the surrounding river network.
 */
export function connectIsolatedRiverTiles(
  byTile: Map<number, Set<number>>,
  tiles: GeodesicTile[],
  isWater: (tileId: number) => boolean
): number {
  const tileById = new Map(tiles.map((t) => [t.id, t]));
  let added = 0;
  const toFix: number[] = [];
  for (const tid of byTile.keys()) {
    if (isWater(tid)) continue;
    if (!riverTileTouchesAnotherRiverTile(tid, byTile, tileById, tiles, isWater)) {
      toFix.push(tid);
    }
  }
  for (const tid of toFix) {
    const tile = tileById.get(tid);
    if (!tile || isWater(tid)) continue;
    let tset = byTile.get(tid);
    if (!tset) {
      tset = new Set<number>();
      byTile.set(tid, tset);
    }
    for (let e = 0; e < tile.vertices.length; e++) {
      const nid = getEdgeNeighbor(tile, e, tiles);
      if (nid === undefined || isWater(nid) || !byTile.has(nid)) continue;
      const ntile = tileById.get(nid);
      if (!ntile) continue;
      const k = edgeIndexTowardNeighbor(ntile, tid, tiles);
      if (k === undefined) continue;
      const beforeT = tset.has(e);
      const nset = byTile.get(nid)!;
      const beforeN = nset.has(k);
      tset.add(e);
      nset.add(k);
      if (!beforeT || !beforeN) added++;
    }
  }
  return added;
}

/**
 * If land river tile N has a river edge toward J, ensure J has the reciprocal edge toward N (and vice versa).
 * Fixes one-sided links from tracing/delta logic so channels render through instead of a center “dot”.
 */
export function symmetrizeRiverNeighborEdges(
  byTile: Map<number, Set<number>>,
  tiles: GeodesicTile[],
  isWater: (tileId: number) => boolean
): number {
  const tileById = new Map(tiles.map((t) => [t.id, t]));
  let added = 0;
  for (const tid of byTile.keys()) {
    if (isWater(tid)) continue;
    const tile = tileById.get(tid);
    const tset = byTile.get(tid);
    if (!tile || !tset) continue;
    for (let e = 0; e < tile.vertices.length; e++) {
      const nid = getEdgeNeighbor(tile, e, tiles);
      if (nid === undefined || isWater(nid) || !byTile.has(nid)) continue;
      const ntile = tileById.get(nid);
      const nset = byTile.get(nid);
      if (!ntile || !nset) continue;
      const k = edgeIndexTowardNeighbor(ntile, tid, tiles);
      if (k === undefined) continue;
      const tHas = tset.has(e);
      const nHas = nset.has(k);
      if (nHas && !tHas) {
        tset.add(e);
        added++;
      } else if (tHas && !nHas) {
        nset.add(k);
        added++;
      }
    }
  }
  return added;
}

/**
 * Force reciprocity: if a river tile has an edge pointing to a land neighbor,
 * ensure that neighbor exists in the river data with the reciprocal edge.
 * This is more aggressive than symmetrizeRiverNeighborEdges - it adds new tiles to byTile.
 */
export function forceRiverReciprocity(
  byTile: Map<number, Set<number>>,
  tiles: GeodesicTile[],
  isWater: (tileId: number) => boolean
): number {
  const tileById = new Map(tiles.map((t) => [t.id, t]));
  let added = 0;
  
  // Collect all edges we need to add (to avoid modifying while iterating)
  const toAdd: Array<{ tileId: number; edge: number }> = [];
  
  for (const [tid, tset] of byTile) {
    if (isWater(tid)) continue;
    const tile = tileById.get(tid);
    if (!tile) continue;
    
    for (const e of tset) {
      const nid = getEdgeNeighbor(tile, e, tiles);
      if (nid === undefined || isWater(nid)) continue;
      
      const ntile = tileById.get(nid);
      if (!ntile) continue;
      
      const k = edgeIndexTowardNeighbor(ntile, tid, tiles);
      if (k === undefined) continue;
      
      // Check if neighbor has the reciprocal edge
      const nset = byTile.get(nid);
      if (!nset || !nset.has(k)) {
        toAdd.push({ tileId: nid, edge: k });
      }
    }
  }
  
  // Apply all additions
  for (const { tileId, edge } of toAdd) {
    let set = byTile.get(tileId);
    if (!set) {
      set = new Set<number>();
      byTile.set(tileId, set);
    }
    if (!set.has(edge)) {
      set.add(edge);
      added++;
    }
  }
  
  return added;
}

/**
 * Fill in "gap" tiles that should be part of the river network.
 * A gap tile is a non-river land tile where 2+ adjacent river tiles have edges pointing toward it.
 * This fixes cases where the river polyline skipped a tile due to low sampling resolution.
 */
export function fillRiverGaps(
  byTile: Map<number, Set<number>>,
  tiles: GeodesicTile[],
  isWater: (tileId: number) => boolean,
  debug: boolean = false
): number {
  const tileById = new Map(tiles.map((t) => [t.id, t]));
  let filled = 0;

  // Count how many river tiles point at each non-river land tile
  const incomingCount = new Map<number, { fromTiles: number[]; fromEdges: number[] }>();
  
  for (const tid of byTile.keys()) {
    if (isWater(tid)) continue;
    const tile = tileById.get(tid);
    const tset = byTile.get(tid);
    if (!tile || !tset) continue;
    
    for (const e of tset) {
      const nid = getEdgeNeighbor(tile, e, tiles);
      if (nid === undefined || isWater(nid)) continue;
      // Only consider tiles not already in river data
      if (byTile.has(nid)) continue;
      
      let entry = incomingCount.get(nid);
      if (!entry) {
        entry = { fromTiles: [], fromEdges: [] };
        incomingCount.set(nid, entry);
      }
      entry.fromTiles.push(tid);
      // Find which edge of the gap tile points back to this river tile
      const gapTile = tileById.get(nid);
      if (gapTile) {
        const backEdge = edgeIndexTowardNeighbor(gapTile, tid, tiles);
        if (backEdge !== undefined) {
          entry.fromEdges.push(backEdge);
        }
      }
    }
  }

  if (debug && incomingCount.size > 0) {
    console.log("[fillRiverGaps] Candidates with 2+ incoming:");
    for (const [gapTid, { fromTiles, fromEdges }] of incomingCount) {
      if (fromTiles.length >= 2) {
        console.log(`  gap tile ${gapTid}: from tiles [${fromTiles.join(", ")}], back edges [${fromEdges.join(", ")}]`);
      }
    }
  }

  // Fill gaps: tiles with 2+ incoming river connections
  for (const [gapTid, { fromTiles, fromEdges }] of incomingCount) {
    if (fromTiles.length >= 2) {
      // Create river edges for this gap tile pointing back to all the river tiles that point to it
      const gapSet = new Set<number>(fromEdges);
      byTile.set(gapTid, gapSet);
      filled++;
    }
  }

  return filled;
}

/** Run symmetrize until stable (usually 1–2 passes). */
export function symmetrizeRiverNeighborEdgesUntilStable(
  byTile: Map<number, Set<number>>,
  tiles: GeodesicTile[],
  isWater: (tileId: number) => boolean,
  maxPasses: number = 4
): number {
  let total = 0;
  for (let p = 0; p < maxPasses; p++) {
    const n = symmetrizeRiverNeighborEdges(byTile, tiles, isWater);
    total += n;
    if (n === 0) break;
  }
  return total;
}

/** Convert lon/lat (degrees) to unit direction vector. Uses same convention as tileCenterToLatLon (lon = -atan2(z,x)) so getTileIdAtDirection returns the tile the Earth raster uses for that lon/lat. */
export function lonLatToDirection(lonDeg: number, latDeg: number): THREE.Vector3 {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const cosLat = Math.cos(lat);
  return new THREE.Vector3(
    cosLat * Math.cos(lon),
    Math.sin(lat),
    -cosLat * Math.sin(lon)
  ).normalize();
}

/** Sample a polyline at roughly even steps (in degrees), return [lon, lat][] in degrees. */
function samplePolyline(
  coords: number[][],
  stepDeg: number = 0.15
): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i];
    const b = coords[i + 1];
    const lon0 = a[0], lat0 = a[1], lon1 = b[0], lat1 = b[1];
    const dist = Math.sqrt((lon1 - lon0) ** 2 + (lat1 - lat0) ** 2);
    const n = Math.max(1, Math.ceil(dist / stepDeg));
    for (let k = 0; k <= n; k++) {
      if (k === 0 && i > 0) continue;
      const t = k / n;
      out.push([lon0 + t * (lon1 - lon0), lat0 + t * (lat1 - lat0)]);
    }
  }
  if (coords.length >= 1 && out.length === 0) out.push(coords[0]);
  return out;
}

/**
 * Trace a polyline (lon/lat in degrees) through the globe's tiles.
 * Returns one segment per tile the river passes through, with entry/exit edge indices.
 */
export function traceRiverThroughTiles(
  globe: GlobeLike,
  lineLonLat: number[][]
): RiverSegment[] {
  const points = samplePolyline(lineLonLat);
  if (points.length === 0) return [];
  const tiles = globe.tiles;
  const tileById = new Map(tiles.map((t) => [t.id, t]));

  const tileSeq: number[] = [];
  for (const [lon, lat] of points) {
    const dir = lonLatToDirection(lon, lat);
    const id = globe.getTileIdAtDirection(dir);
    tileSeq.push(id);
  }

  const runs: { tileId: number; start: number; end: number }[] = [];
  let i = 0;
  while (i < tileSeq.length) {
    const tileId = tileSeq[i];
    const start = i;
    while (i < tileSeq.length && tileSeq[i] === tileId) i++;
    runs.push({ tileId, start, end: i - 1 });
  }

  const segments: RiverSegment[] = [];
  for (let r = 0; r < runs.length; r++) {
    const tile = tileById.get(runs[r].tileId);
    if (!tile) continue;
    let entryEdge: number | undefined;
    let exitEdge: number | undefined;
    if (r > 0) {
      const prevId = runs[r - 1].tileId;
      for (let e = 0; e < tile.vertices.length; e++) {
        if (getEdgeNeighbor(tile, e, tiles) === prevId) {
          entryEdge = e;
          break;
        }
      }
    }
    if (r < runs.length - 1) {
      const nextId = runs[r + 1].tileId;
      for (let e = 0; e < tile.vertices.length; e++) {
        if (getEdgeNeighbor(tile, e, tiles) === nextId) {
          exitEdge = e;
          break;
        }
      }
    }
    segments.push({ tileId: runs[r].tileId, entryEdge, exitEdge });
  }
  return segments;
}

/** Get world position of the midpoint of an edge of a tile at radius r (with optional land-style projection). */
function edgeMidpoint(
  tile: GeodesicTile,
  edgeIndex: number,
  r: number,
  centerNormal: THREE.Vector3,
  usePlaneProjection: boolean,
  out: THREE.Vector3
): THREE.Vector3 {
  const n = tile.vertices.length;
  const va = tile.vertices[edgeIndex].clone().normalize();
  const vb = tile.vertices[(edgeIndex + 1) % n].clone().normalize();
  const mid = va.add(vb).normalize();
  if (usePlaneProjection) {
    const dot = mid.dot(centerNormal);
    const inPlane = mid.clone().sub(centerNormal.clone().multiplyScalar(dot));
    return out.copy(centerNormal).multiplyScalar(r).add(inPlane);
  }
  return out.copy(mid).multiplyScalar(r);
}

/** Hex corner on land plane at r (matches geodesic land); on ocean, on sphere. */
function vertexOnTileSurface(
  tile: GeodesicTile,
  vi: number,
  r: number,
  centerNormal: THREE.Vector3,
  usePlane: boolean,
  out: THREE.Vector3
): void {
  const v = tile.vertices[vi].clone().normalize();
  if (!usePlane) {
    out.copy(v).multiplyScalar(r);
    return;
  }
  const dot = v.dot(centerNormal);
  const inPlane = v.clone().sub(centerNormal.clone().multiplyScalar(dot));
  out.copy(centerNormal).multiplyScalar(r).add(inPlane);
}

const _arcMidA = new THREE.Vector3();
const _arcMidB = new THREE.Vector3();
const _arcCorner = new THREE.Vector3();

/**
 * World points along hex perimeter from mid(ea) to mid(eb) on the **shorter** arc (so we do not
 * flood the dry side of the hex). Used for 3+ river edges so water reaches tile boundaries and
 * meets neighbor ribbons (convex hull of midpoints alone stays inset and looks disconnected).
 */
function hexRiverPerimeterArcWorld(
  tile: GeodesicTile,
  ea: number,
  eb: number,
  r: number,
  centerNormal: THREE.Vector3,
  usePlane: boolean,
  out: THREE.Vector3[]
): void {
  const n = 6;
  if (ea === eb) {
    edgeMidpoint(tile, ea, r, centerNormal, usePlane, _arcMidA);
    out.push(_arcMidA.clone());
    return;
  }
  const forwardSteps = (eb - ea + n) % n;
  const backwardSteps = (ea - eb + n) % n;
  const useFwd = forwardSteps <= backwardSteps;
  if (useFwd) {
    edgeMidpoint(tile, ea, r, centerNormal, usePlane, _arcMidA);
    out.push(_arcMidA.clone());
    let cur = ea;
    while (cur !== eb) {
      vertexOnTileSurface(tile, (cur + 1) % n, r, centerNormal, usePlane, _arcCorner);
      out.push(_arcCorner.clone());
      cur = (cur + 1) % n;
    }
    edgeMidpoint(tile, eb, r, centerNormal, usePlane, _arcMidB);
    out.push(_arcMidB.clone());
  } else {
    edgeMidpoint(tile, ea, r, centerNormal, usePlane, _arcMidA);
    out.push(_arcMidA.clone());
    let cur = ea;
    while (cur !== eb) {
      vertexOnTileSurface(tile, cur, r, centerNormal, usePlane, _arcCorner);
      out.push(_arcCorner.clone());
      cur = (cur - 1 + n) % n;
    }
    edgeMidpoint(tile, eb, r, centerNormal, usePlane, _arcMidB);
    out.push(_arcMidB.clone());
  }
}

type XY = { x: number; y: number };

function cross2(ax: number, ay: number, bx: number, by: number): number {
  return ax * by - ay * bx;
}

function lineIntersectInfinite(p1: XY, p2: XY, p3: XY, p4: XY, out: XY): boolean {
  const x1 = p1.x,
    y1 = p1.y,
    x2 = p2.x,
    y2 = p2.y;
  const x3 = p3.x,
    y3 = p3.y,
    x4 = p4.x,
    y4 = p4.y;
  const d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(d) < 1e-14) return false;
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / d;
  out.x = x1 + t * (x2 - x1);
  out.y = y1 + t * (y2 - y1);
  return true;
}

/** Clip subject polygon (CCW) to inside convex CCW clipBoundary. */
function clipPolygonToConvex(subject: XY[], clipBoundary: XY[]): XY[] {
  let output = subject.length > 0 ? subject.map((p) => ({ x: p.x, y: p.y })) : [];
  const cn = clipBoundary.length;
  for (let i = 0; i < cn; i++) {
    const a = clipBoundary[i];
    const b = clipBoundary[(i + 1) % cn];
    const input = output;
    output = [];
    if (input.length === 0) break;
    const inside = (p: XY) => cross2(b.x - a.x, b.y - a.y, p.x - a.x, p.y - a.y) >= -1e-8;
    const ip: XY = { x: 0, y: 0 };
    let prev = input[input.length - 1];
    let prevIn = inside(prev);
    for (let j = 0; j < input.length; j++) {
      const cur = input[j];
      const curIn = inside(cur);
      if (curIn) {
        if (!prevIn && lineIntersectInfinite(prev, cur, a, b, ip)) {
          output.push({ x: ip.x, y: ip.y });
        }
        output.push(cur);
      } else if (prevIn && lineIntersectInfinite(prev, cur, a, b, ip)) {
        output.push({ x: ip.x, y: ip.y });
      }
      prev = cur;
      prevIn = curIn;
    }
  }
  return output;
}

function signedArea2(poly: XY[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length;
    s += poly[i].x * poly[j].y - poly[j].x * poly[i].y;
  }
  return s * 0.5;
}

function worldToUv(
  p: THREE.Vector3,
  centerPos: THREE.Vector3,
  basisU: THREE.Vector3,
  basisV: THREE.Vector3,
  out: XY
): void {
  const dx = p.x - centerPos.x;
  const dy = p.y - centerPos.y;
  const dz = p.z - centerPos.z;
  out.x = dx * basisU.x + dy * basisU.y + dz * basisU.z;
  out.y = dx * basisV.x + dy * basisV.y + dz * basisV.z;
}

/**
 * Create a mesh for the river: a strip of quads through each segment, using a water-like shader.
 * Channel is drawn as a ribbon at surfaceOffset below the tile surface.
 */
export function createRiverMesh(
  globe: GlobeLike,
  segments: RiverSegment[],
  options: RiverMeshOptions
): THREE.Mesh {
  const radius = options.radius ?? globe.radius;
  const elevationScale = options.elevationScale ?? 1;
  const surfaceOffset = options.surfaceOffset ?? RIVER_MAX_WAVE_AMPLITUDE;
  const tiles = globe.tiles;
  const tileById = new Map(tiles.map((t) => [t.id, t]));

  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  let vertexOffset = 0;

  const centerNormal = new THREE.Vector3();
  const posA = new THREE.Vector3();
  const posB = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const perp = new THREE.Vector3();

  for (const seg of segments) {
    const tile = tileById.get(seg.tileId);
    if (!tile) continue;
    const elev = options.getElevation(seg.tileId) * elevationScale;
    const r = radius + elev - surfaceOffset;
    centerNormal.copy(tile.center).normalize();

    let pEntry: THREE.Vector3;
    let pExit: THREE.Vector3;
    const usePlane = elev >= 0;

    if (seg.entryEdge !== undefined && seg.exitEdge !== undefined) {
      edgeMidpoint(tile, seg.entryEdge, r, centerNormal, usePlane, posA);
      edgeMidpoint(tile, seg.exitEdge, r, centerNormal, usePlane, posB);
      pEntry = posA.clone();
      pExit = posB.clone();
    } else if (seg.entryEdge !== undefined) {
      edgeMidpoint(tile, seg.entryEdge, r, centerNormal, usePlane, posA);
      const c = centerNormal.clone().multiplyScalar(r);
      pEntry = posA.clone();
      pExit = c;
    } else if (seg.exitEdge !== undefined) {
      const c = centerNormal.clone().multiplyScalar(r);
      edgeMidpoint(tile, seg.exitEdge, r, centerNormal, usePlane, posB);
      pEntry = c;
      pExit = posB.clone();
    } else {
      const c = centerNormal.clone().multiplyScalar(r);
      const v0 = tile.vertices[0].clone().normalize();
      posB.copy(v0).multiplyScalar(r);
      pEntry = c;
      pExit = posB.clone();
    }

    tangent.subVectors(pExit, pEntry);
    const len = tangent.length();
    if (len < 1e-6) continue;
    tangent.normalize();
    perp.crossVectors(centerNormal, tangent).normalize();
    if (perp.lengthSq() < 1e-10) {
      tangent.set(1, 0, 0);
      perp.crossVectors(centerNormal, tangent).normalize();
    }
    const halfWidth =
      options.riverWidthFraction != null
        ? len * options.riverWidthFraction
        : (options.riverWidth ?? len * 0.28);
    perp.multiplyScalar(halfWidth);

    const a0 = vertexOffset;
    positions.push(pEntry.x - perp.x, pEntry.y - perp.y, pEntry.z - perp.z);
    normals.push(centerNormal.x, centerNormal.y, centerNormal.z);
    vertexOffset++;
    positions.push(pEntry.x + perp.x, pEntry.y + perp.y, pEntry.z + perp.z);
    normals.push(centerNormal.x, centerNormal.y, centerNormal.z);
    vertexOffset++;
    positions.push(pExit.x + perp.x, pExit.y + perp.y, pExit.z + perp.z);
    normals.push(centerNormal.x, centerNormal.y, centerNormal.z);
    vertexOffset++;
    positions.push(pExit.x - perp.x, pExit.y - perp.y, pExit.z - perp.z);
    normals.push(centerNormal.x, centerNormal.y, centerNormal.z);
    vertexOffset++;
    indices.push(a0, a0 + 1, a0 + 2, a0, a0 + 2, a0 + 3);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  const material = createRiverWaterMaterial(options);
  const mesh = new THREE.Mesh(geom, material);
  mesh.name = "River";
  mesh.renderOrder = 2;
  return mesh;
}

/**
 * Create river mesh from per-hex river edges. Each hex with a river gets a channel from its center
 * toward each river edge; channel width is a fraction of center-to-edge (e.g. 0.45 = 90% of hex so a boat fits).
 * Tied to exact hex positions (tile center and edge midpoints at radius + elev - surfaceOffset).
 */
export function createRiverMeshFromTileEdges(
  globe: GlobeLike,
  riverEdgesByTile: Map<number, Set<number>>,
  options: RiverMeshOptions
): THREE.Mesh {
  const radius = options.radius ?? globe.radius;
  const elevationScale = options.elevationScale ?? 1;
  const surfaceOffset = options.surfaceOffset ?? RIVER_MAX_WAVE_AMPLITUDE;
  const riverBowlInnerScale = options.riverBowlInnerScale;
  const fillInnerRiverHex = options.fillInnerRiverHex !== false;
  const channelWidthFraction = options.channelWidthFraction ?? 0.45;
  const tiles = globe.tiles;
  const tileById = new Map(tiles.map((t) => [t.id, t]));

  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  let vertexOffset = 0;

  const centerNormal = new THREE.Vector3();
  const centerPos = new THREE.Vector3();
  const edgeMid = new THREE.Vector3();
  const basisU = new THREE.Vector3();
  const basisV = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const perp = new THREE.Vector3();
  const innerPoint = new THREE.Vector3();
  const tempVec = new THREE.Vector3();
  const scratchRiverV0 = new THREE.Vector3();
  const scratchRiverV1 = new THREE.Vector3();
  const cornerW = [
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
  ];
  const ribUv: XY[] = [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ];

  const projectToPlane = (p: THREE.Vector3, origin: THREE.Vector3) => {
    tempVec.copy(p).sub(origin);
    return {
      x: tempVec.dot(basisU),
      y: tempVec.dot(basisV),
      world: p.clone(),
    };
  };

  for (const [tileId, edgeSet] of riverEdgesByTile) {
    if (edgeSet.size === 0) continue;
    const tile = tileById.get(tileId);
    if (!tile) continue;
    const elev = options.getElevation(tileId) * elevationScale;
    const r = radius + elev - surfaceOffset;
    centerNormal.copy(tile.center).normalize();
    centerPos.copy(centerNormal).multiplyScalar(r);
    const usePlane = elev >= 0;
    const n = tile.vertices.length;
    const tileFrame = getTileTangentFrame(tile);
    basisU.copy(tileFrame.ex);
    basisV.copy(tileFrame.ey);

    if (riverBowlInnerScale != null && fillInnerRiverHex) {
      // Create inner water hex using actual hex corners (not edge midpoints)
      // This matches the hex shape for consistent appearance
      const centerIdx = vertexOffset;
      positions.push(centerPos.x, centerPos.y, centerPos.z);
      normals.push(centerNormal.x, centerNormal.y, centerNormal.z);
      vertexOffset++;
      const innerBase = vertexOffset;
      for (let v = 0; v < n; v++) {
        // Use tile vertex (corner) instead of edge midpoint
        const corner = tile.vertices[v].clone().normalize().multiplyScalar(r);
        if (usePlane) {
          const d = corner.dot(centerNormal);
          corner.sub(centerNormal.clone().multiplyScalar(d - r));
        }
        innerPoint.lerpVectors(centerPos, corner, riverBowlInnerScale);
        positions.push(innerPoint.x, innerPoint.y, innerPoint.z);
        normals.push(centerNormal.x, centerNormal.y, centerNormal.z);
        vertexOffset++;
      }
      for (let v = 0; v < n; v++) {
        const i0 = innerBase + v;
        const i1 = innerBase + (v + 1) % n;
        indices.push(centerIdx, i0, i1);
      }
    }

    const edgeMidPts: { x: number; y: number; world: THREE.Vector3; edgeIndex: number }[] = [];
    for (const edgeIndex of edgeSet) {
      edgeMidpoint(tile, edgeIndex, r, centerNormal, usePlane, edgeMid);
      const pt = projectToPlane(edgeMid, centerPos);
      edgeMidPts.push({ ...pt, edgeIndex });
    }
    if (edgeMidPts.length === 0) continue;

    const edgeList = [...edgeSet].sort((a, b) => a - b);
    const widthScale =
      (riverBowlInnerScale != null ? riverBowlInnerScale : channelWidthFraction) * 0.5;

    const pushRibbonQuad = (p0w: THREE.Vector3, p1w: THREE.Vector3) => {
      tangent.subVectors(p1w, p0w);
      if (tangent.lengthSq() < 1e-12) return;
      tangent.normalize();
      perp.crossVectors(centerNormal, tangent).normalize();
      if (perp.lengthSq() < 1e-12) return;
      const halfWidth = widthScale * Math.max(0.0001, p0w.distanceTo(p1w));
      perp.multiplyScalar(halfWidth);
      const base = vertexOffset;
      positions.push(p0w.x - perp.x, p0w.y - perp.y, p0w.z - perp.z);
      normals.push(centerNormal.x, centerNormal.y, centerNormal.z);
      vertexOffset++;
      positions.push(p0w.x + perp.x, p0w.y + perp.y, p0w.z + perp.z);
      normals.push(centerNormal.x, centerNormal.y, centerNormal.z);
      vertexOffset++;
      positions.push(p1w.x + perp.x, p1w.y + perp.y, p1w.z + perp.z);
      normals.push(centerNormal.x, centerNormal.y, centerNormal.z);
      vertexOffset++;
      positions.push(p1w.x - perp.x, p1w.y - perp.y, p1w.z - perp.z);
      normals.push(centerNormal.x, centerNormal.y, centerNormal.z);
      vertexOffset++;
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    };

    /** Land ribbon clipped to tile footprint in tangent plane (hex or pent). */
    const pushLandRiverRibbonClipped = (p0w: THREE.Vector3, p1w: THREE.Vector3) => {
      tangent.subVectors(p1w, p0w);
      const tlen = tangent.length();
      if (tlen < 1e-9) return;
      tangent.divideScalar(tlen);
      perp.crossVectors(centerNormal, tangent);
      if (perp.lengthSq() < 1e-12) return;
      perp.normalize();
      const hw = widthScale * Math.max(0.0001, tlen);
      perp.multiplyScalar(hw);
      cornerW[0].copy(p0w).sub(perp);
      cornerW[1].copy(p0w).add(perp);
      cornerW[2].copy(p1w).add(perp);
      cornerW[3].copy(p1w).sub(perp);
      const footprintUv: XY[] = [];
      for (let i = 0; i < n; i++) {
        tileCornerWorldFlat(tileFrame, i, r, edgeMid);
        const xy = { x: 0, y: 0 };
        worldToUv(edgeMid, centerPos, basisU, basisV, xy);
        footprintUv.push(xy);
      }
      if (signedArea2(footprintUv) < 0) footprintUv.reverse();
      for (let k = 0; k < 4; k++) {
        worldToUv(cornerW[k], centerPos, basisU, basisV, ribUv[k]);
      }
      if (signedArea2(ribUv) < 0) {
        for (let k = 0; k < 2; k++) {
          const j = 3 - k;
          const tx = ribUv[k].x;
          const ty = ribUv[k].y;
          ribUv[k].x = ribUv[j].x;
          ribUv[k].y = ribUv[j].y;
          ribUv[j].x = tx;
          ribUv[j].y = ty;
        }
      }
      const clipped = clipPolygonToConvex(ribUv, footprintUv);
      if (clipped.length >= 3) {
        const base = vertexOffset;
        for (const p of clipped) {
          tempVec.copy(centerPos).addScaledVector(basisU, p.x).addScaledVector(basisV, p.y);
          positions.push(tempVec.x, tempVec.y, tempVec.z);
          normals.push(centerNormal.x, centerNormal.y, centerNormal.z);
          vertexOffset++;
        }
        for (let k = 1; k < clipped.length - 1; k++) {
          indices.push(base, base + k, base + k + 1);
        }
        return;
      }
      pushRibbonQuad(p0w, p1w);
    };

    if (n === 6 && edgeList.length === 2) {
      const [v0i, v1i] = hexRiverVertexPairForTwoEdges(edgeList[0], edgeList[1]);
      vertexOnTileSurface(tile, v0i, r, centerNormal, usePlane, scratchRiverV0);
      vertexOnTileSurface(tile, v1i, r, centerNormal, usePlane, scratchRiverV1);
      if (usePlane) {
        pushLandRiverRibbonClipped(scratchRiverV0, scratchRiverV1);
      } else {
        pushRibbonQuad(scratchRiverV0, scratchRiverV1);
      }
    } else if (n === 6 && edgeList.length === 1) {
      const e = edgeList[0];
      edgeMidpoint(tile, e, r, centerNormal, usePlane, edgeMid);
      const pm = projectToPlane(edgeMid, centerPos);
      const rlen = Math.hypot(pm.x, pm.y) || 1;
      const rdx = pm.x / rlen;
      const rdy = pm.y / rlen;
      const oppositeTriples: Array<[number, number]> = [
        [0, 3],
        [1, 4],
        [2, 5],
      ];
      let best: [number, number] = oppositeTriples[0];
      let bestScore = Infinity;
      for (const [ia, ib] of oppositeTriples) {
        const va = tile.vertices[ia].clone().normalize().multiplyScalar(r);
        const vb = tile.vertices[ib].clone().normalize().multiplyScalar(r);
        const pa = projectToPlane(va, centerPos);
        const pb = projectToPlane(vb, centerPos);
        let sx = pb.x - pa.x;
        let sy = pb.y - pa.y;
        const slen = Math.hypot(sx, sy) || 1;
        sx /= slen;
        sy /= slen;
        const score = Math.abs(sx * rdx + sy * rdy);
        if (score < bestScore) {
          bestScore = score;
          best = [ia, ib];
        }
      }
      vertexOnTileSurface(tile, best[0], r, centerNormal, usePlane, scratchRiverV0);
      vertexOnTileSurface(tile, best[1], r, centerNormal, usePlane, scratchRiverV1);
      if (usePlane) {
        pushLandRiverRibbonClipped(scratchRiverV0, scratchRiverV1);
      } else {
        pushRibbonQuad(scratchRiverV0, scratchRiverV1);
      }
    } else if (n === 6 && edgeList.length >= 3) {
      const es = edgeList.slice().sort((a, b) => a - b);
      const arcRing: THREE.Vector3[] = [];
      for (let k = 0; k < es.length; k++) {
        const ea = es[k]!;
        const eb = es[(k + 1) % es.length]!;
        arcRing.length = 0;
        hexRiverPerimeterArcWorld(tile, ea, eb, r, centerNormal, usePlane, arcRing);
        for (let i = 0; i < arcRing.length - 1; i++) {
          const a0 = vertexOffset;
          positions.push(centerPos.x, centerPos.y, centerPos.z);
          normals.push(centerNormal.x, centerNormal.y, centerNormal.z);
          vertexOffset++;
          positions.push(arcRing[i]!.x, arcRing[i]!.y, arcRing[i]!.z);
          normals.push(centerNormal.x, centerNormal.y, centerNormal.z);
          vertexOffset++;
          positions.push(arcRing[i + 1]!.x, arcRing[i + 1]!.y, arcRing[i + 1]!.z);
          normals.push(centerNormal.x, centerNormal.y, centerNormal.z);
          vertexOffset++;
          indices.push(a0, a0 + 1, a0 + 2);
        }
      }
    } else {
      const hull = convexHull2dWorld(edgeMidPts.map((p) => ({ x: p.x, y: p.y, world: p.world })));
      if (hull.length >= 3) {
        const hullBase = vertexOffset;
        for (const p of hull) {
          positions.push(p.world.x, p.world.y, p.world.z);
          normals.push(centerNormal.x, centerNormal.y, centerNormal.z);
          vertexOffset++;
        }
        for (let i = 1; i < hull.length - 1; i++) {
          indices.push(hullBase, hullBase + i, hullBase + i + 1);
        }
      } else if (hull.length === 2) {
        if (usePlane) {
          pushLandRiverRibbonClipped(hull[0].world, hull[1].world);
        } else {
          pushRibbonQuad(hull[0].world, hull[1].world);
        }
      }
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  const material = createRiverWaterMaterial(options);
  const mesh = new THREE.Mesh(geom, material);
  mesh.name = "River";
  mesh.renderOrder = 2;
  return mesh;
}

const RIVER_VERTEX = `
  uniform float uTime;
  uniform float uRadius;
  uniform vec3 uGerstnerAmps;
  uniform vec3 uGerstnerWL;
  uniform vec3 uGerstnerSpeed;
  uniform vec3 uGerstnerQ;
  uniform vec2 uGerstnerDir1;
  uniform vec2 uGerstnerDir2;
  uniform vec2 uGerstnerDir3;
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  const float PI = 3.14159265;
  void gerstnerWave(vec2 dir, float amp, float wl, float speed, float Q, vec3 pos, vec3 N,
    inout vec3 disp, inout vec3 normalTilt) {
    float k = 2.0 * PI / wl;
    float phase = (pos.x * dir.x + pos.z * dir.y) * k - uTime * speed;
    float c = cos(phase);
    float s = sin(phase);
    vec3 waveDir3D = vec3(dir.x, 0.0, dir.y);
    vec3 T = waveDir3D - N * dot(N, waveDir3D);
    float len = length(T);
    if (len > 0.001) T /= len;
    else T = vec3(0.0);
    disp += N * (amp * c) + T * (Q * amp * s);
    normalTilt += T * (amp * k * s);
  }
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vec3 pos = worldPos.xyz;
    vec3 N = normalize(pos);
    vec3 disp = vec3(0.0);
    vec3 normalTilt = vec3(0.0);
    gerstnerWave(uGerstnerDir1, uGerstnerAmps.x, uGerstnerWL.x, uGerstnerSpeed.x, uGerstnerQ.x, pos, N, disp, normalTilt);
    gerstnerWave(uGerstnerDir2, uGerstnerAmps.y, uGerstnerWL.y, uGerstnerSpeed.y, uGerstnerQ.y, pos, N, disp, normalTilt);
    gerstnerWave(uGerstnerDir3, uGerstnerAmps.z, uGerstnerWL.z, uGerstnerSpeed.z, uGerstnerQ.z, pos, N, disp, normalTilt);
    vec3 newPos = pos + disp;
    vWorldPosition = newPos;
    vNormal = normalize(N - normalTilt);
    vViewPosition = -(viewMatrix * vec4(newPos, 1.0)).xyz;
    gl_Position = projectionMatrix * viewMatrix * vec4(newPos, 1.0);
  }
`;

const RIVER_FRAGMENT = `
  uniform float uTime;
  uniform float uSize;
  uniform vec3 uSunDirection;
  uniform vec3 uSunColor;
  uniform vec3 uWaterColor;
  uniform vec3 uWaterColorPole;
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  void main() {
    vec2 uv = vWorldPosition.xz * uSize;
    float n0 = sin(uv.x * 2.0 + uTime) * cos(uv.y * 2.0 + uTime * 0.8);
    float n1 = sin(uv.x * 5.0 - uTime * 0.7) * cos(uv.y * 5.0 + uTime * 0.9);
    vec3 surfaceNormal = normalize(vNormal + vec3(n0, n1, n0) * 0.05);
    vec3 eyeDirection = normalize(vViewPosition);
    vec3 reflection = normalize(reflect(-uSunDirection, surfaceNormal));
    float spec = pow(max(0.0, dot(eyeDirection, reflection)), 80.0) * 0.9;
    float diff = max(dot(uSunDirection, surfaceNormal), 0.0) * 0.4;
    vec3 diffuseLight = uSunColor * diff;
    vec3 specularLight = uSunColor * spec;
    float theta = max(dot(eyeDirection, surfaceNormal), 0.0);
    float rf0 = 0.3;
    float reflectance = rf0 + (1.0 - rf0) * pow((1.0 - theta), 5.0);
    vec3 dir = normalize(vWorldPosition);
    float lat = asin(clamp(dir.y, -1.0, 1.0));
    float latNorm = abs(lat) / 1.5707963;
    vec3 waterColor = mix(uWaterColor, uWaterColorPole, latNorm);
    vec3 scatter = max(0.0, dot(surfaceNormal, eyeDirection)) * waterColor;
    vec3 skyReflection = vec3(0.4, 0.55, 0.7);
    vec3 albedo = mix(
      (uSunColor * diffuseLight * 0.3 + scatter),
      (vec3(0.1) + skyReflection * 0.9 + specularLight),
      reflectance
    );
    float sunFactor = 0.03 + 0.97 * max(0.0, dot(surfaceNormal, uSunDirection));
    /* Opaque + depth write so cracks/gaps don’t punch through to the far side of the globe. */
    gl_FragColor = vec4(albedo * sunFactor, 1.0);
  }
`;

function createRiverWaterMaterial(options: RiverMeshOptions): THREE.ShaderMaterial {
  const sunDir = options.sunDirection ?? new THREE.Vector3(0.5, 0.6, 0.4).normalize();
  const amp = 0.0004;
  const wl = 0.08;
  const q = 0.15;
  const a = (deg: number) => (deg * Math.PI) / 180;
  const d1 = new THREE.Vector2(Math.cos(a(0)), Math.sin(a(0)));
  const d2 = new THREE.Vector2(Math.cos(a(70)), Math.sin(a(70)));
  const d3 = new THREE.Vector2(Math.cos(a(140)), Math.sin(a(140)));

  return new THREE.ShaderMaterial({
    vertexShader: RIVER_VERTEX,
    fragmentShader: RIVER_FRAGMENT,
    uniforms: {
      uTime: { value: 0 },
      uRadius: { value: options.radius ?? 1 },
      uSize: { value: 2.0 },
      uSunDirection: { value: sunDir.clone() },
      uSunColor: { value: new THREE.Color(0xffffff) },
      uWaterColor: { value: new THREE.Color(0x2a7a8a) },
      uWaterColorPole: { value: new THREE.Color(0x2a3548) },
      uGerstnerAmps: { value: new THREE.Vector3(amp, amp * 0.85, amp * 0.6) },
      uGerstnerWL: { value: new THREE.Vector3(wl, wl * 0.8, wl * 0.65) },
      uGerstnerSpeed: { value: new THREE.Vector3(1.2, 1.0, 0.85) },
      uGerstnerQ: { value: new THREE.Vector3(q, q * 0.9, q * 0.85) },
      uGerstnerDir1: { value: d1 },
      uGerstnerDir2: { value: d2 },
      uGerstnerDir3: { value: d3 },
    },
    transparent: false,
    side: THREE.DoubleSide,
    depthWrite: true,
    depthTest: true,
  });
}

/** Call each frame to animate river waves. */
export function updateRiverMaterialTime(
  mesh: THREE.Mesh,
  time: number
): void {
  const mat = mesh.material as THREE.ShaderMaterial;
  if (mat.uniforms?.uTime) mat.uniforms.uTime.value = time;
}
