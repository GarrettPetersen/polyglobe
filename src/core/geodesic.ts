/**
 * Geodesic sphere: 12 pentagons + N hexagons.
 * Built by subdividing an icosahedron and taking the dual (Voronoi-like cells).
 */

import * as THREE from "three";
import { riverBowlSlotTRangeForHexTwoEdges } from "../water/riverCutouts.js";

const T = (1 + Math.sqrt(5)) / 2;

/** Icosahedron vertices (normalized to unit sphere). */
const ICOSA_VERTICES = [
  [-1, T, 0], [1, T, 0], [-1, -T, 0], [1, -T, 0],
  [0, -1, T], [0, 1, T], [0, -1, -T], [0, 1, -T],
  [T, 0, -1], [T, 0, 1], [-T, 0, -1], [-T, 0, 1],
].map(([x, y, z]) => {
  const v = new THREE.Vector3(x, y, z).normalize();
  return v;
});

/** Icosahedron faces (indices into ICOSA_VERTICES). */
const ICOSA_FACES = [
  [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
  [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
  [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
  [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
];

export type TileKind = "pentagon" | "hexagon";

export interface GeodesicTile {
  /** Unique index across all tiles (pentagons first, then hexagons). */
  id: number;
  kind: TileKind;
  /** Face center on unit sphere (normalized). */
  center: THREE.Vector3;
  /** Vertices of this tile on unit sphere (ordered counter-clockwise when viewed from outside). */
  vertices: THREE.Vector3[];
  /** Adjacent tile IDs. */
  neighbors: number[];
}


/**
 * Build geodesic sphere: subdivide icosahedron, then dual to get hexagons + 12 pentagons.
 * @param subdivisions Number of edge subdivisions (0 = just dual of icosahedron → 12 pentagons only; 1+ adds hexagons).
 */
export function buildGeodesicTiles(subdivisions: number): GeodesicTile[] {
  const verts: THREE.Vector3[] = ICOSA_VERTICES.map((v) => v.clone());
  const faces: number[][] = ICOSA_FACES.map((f) => [...f]);

  // Subdivide
  const edgeMidpoint = new Map<string, number>();
  const getMid = (i: number, j: number): number => {
    const key = i < j ? `${i},${j}` : `${j},${i}`;
    if (!edgeMidpoint.has(key)) {
      const a = verts[i].clone().add(verts[j]).normalize();
      verts.push(a);
      edgeMidpoint.set(key, verts.length - 1);
    }
    return edgeMidpoint.get(key)!;
  };

  for (let s = 0; s < subdivisions; s++) {
    const newFaces: number[][] = [];
    for (const [a, b, c] of faces) {
      const mab = getMid(a, b);
      const mac = getMid(a, c);
      const mbc = getMid(b, c);
      newFaces.push([a, mab, mac], [b, mbc, mab], [c, mac, mbc], [mab, mbc, mac]);
    }
    faces.length = 0;
    for (let fi = 0; fi < newFaces.length; fi++) {
      faces.push(newFaces[fi]!);
    }
  }

  // Face centers
  const faceCenters: THREE.Vector3[] = faces.map(([a, b, c]) =>
    verts[a].clone().add(verts[b]).add(verts[c]).normalize()
  );

  // Vertex → adjacent faces (in cyclic order)
  const vertToFaces = new Map<number, number[]>();
  for (let fi = 0; fi < faces.length; fi++) {
    for (const vi of faces[fi]) {
      if (!vertToFaces.has(vi)) vertToFaces.set(vi, []);
      vertToFaces.get(vi)!.push(fi);
    }
  }

  // Order faces around each vertex: build vertex–face adjacency and order by shared edge
  const orderedVertFaces = new Map<number, number[]>();
  for (const [vi, faceList] of vertToFaces) {
    if (faceList.length === 0) continue;
    const ordered: number[] = [];
    const used = new Set<number>();
    let current = faceList[0];
    while (ordered.length < faceList.length) {
      ordered.push(current);
      used.add(current);
      const [pa, pb, pc] = faces[current];
      const idx = [pa, pb, pc].indexOf(vi);
      const nextVert = faces[current][(idx + 1) % 3];
      const nextFace = faceList.find(
        (f) => !used.has(f) && faces[f].includes(vi) && faces[f].includes(nextVert)
      );
      if (nextFace === undefined) break;
      current = nextFace;
    }
    orderedVertFaces.set(vi, ordered);
  }

  // Vertex index -> neighbor vertex indices (share an edge)
  const vertNeighbors = new Map<number, Set<number>>();
  for (const [a, b, c] of faces) {
    for (const v of [a, b, c]) {
      if (!vertNeighbors.has(v)) vertNeighbors.set(v, new Set());
      vertNeighbors.get(v)!.add(a).add(b).add(c);
    }
  }
  for (const [v, set] of vertNeighbors) {
    set.delete(v);
  }

  const tiles: GeodesicTile[] = [];
  const vertToTileId = new Map<number, number>();
  const numVerts = verts.length;
  for (let vi = 0; vi < numVerts; vi++) {
    const orderedFaces = orderedVertFaces.get(vi);
    if (!orderedFaces) continue;
    const tileId = tiles.length;
    vertToTileId.set(vi, tileId);
    const centers = orderedFaces.map((f) => faceCenters[f].clone());
    const kind: TileKind = centers.length === 5 ? "pentagon" : "hexagon";
    const center = verts[vi].clone();
    tiles.push({
      id: tileId,
      kind,
      center,
      vertices: centers,
      neighbors: [],
    });
  }
  for (let vi = 0; vi < numVerts; vi++) {
    const tileId = vertToTileId.get(vi);
    if (tileId === undefined) continue;
    const neighborSet = vertNeighbors.get(vi);
    tiles[tileId].neighbors = neighborSet
      ? Array.from(neighborSet)
          .map((v) => vertToTileId.get(v))
          .filter((id): id is number => id !== undefined)
      : [];
  }

  return tiles;
}

export interface GeodesicMeshOptions {
  radius?: number;
  subdivisions?: number;
}

const EPS = 1e-6;
function vec3Equal(a: THREE.Vector3, b: THREE.Vector3): boolean {
  return Math.abs(a.x - b.x) < EPS && Math.abs(a.y - b.y) < EPS && Math.abs(a.z - b.z) < EPS;
}

/** Which neighbor tile shares the edge from vertices[edgeIndex] to vertices[(edgeIndex+1)%n]. */
export function getEdgeNeighbor(
  tile: GeodesicTile,
  edgeIndex: number,
  tiles: GeodesicTile[]
): number | undefined {
  const n = tile.vertices.length;
  const va = tile.vertices[edgeIndex];
  const vb = tile.vertices[(edgeIndex + 1) % n];
  for (const neighborId of tile.neighbors) {
    const N = tiles[neighborId];
    const nn = N.vertices.length;
    for (let j = 0; j < nn; j++) {
      const na = N.vertices[j];
      const nb = N.vertices[(j + 1) % nn];
      if (
        (vec3Equal(va, na) && vec3Equal(vb, nb)) ||
        (vec3Equal(va, nb) && vec3Equal(vb, na))
      ) {
        return neighborId;
      }
    }
  }
  return undefined;
}

/** Neighbor's edge index for the same physical edge as `tile` edge `edgeIndex`. */
export function getNeighborEdgeIndex(
  tile: GeodesicTile,
  edgeIndex: number,
  neighbor: GeodesicTile
): number | undefined {
  const n = tile.vertices.length;
  const va = tile.vertices[edgeIndex];
  const vb = tile.vertices[(edgeIndex + 1) % n];
  const nn = neighbor.vertices.length;
  for (let j = 0; j < nn; j++) {
    const na = neighbor.vertices[j];
    const nb = neighbor.vertices[(j + 1) % nn];
    if (
      (vec3Equal(va, na) && vec3Equal(vb, nb)) ||
      (vec3Equal(va, nb) && vec3Equal(vb, na))
    ) {
      return j;
    }
  }
  return undefined;
}

/** If present, this tile is drawn as a pyramid (apex above base) instead of a flat top. */
export interface TilePeak {
  /** Peak height in meters; scaled by peakElevationScale for globe units. */
  apexElevationM: number;
}

export interface GeodesicFlatMeshOptions {
  radius?: number;
  /** Elevation per tile (same scale as terrain). Will be scaled by elevationScale in applyTerrainToGeometry. */
  getElevation: (tileId: number) => number;
  elevationScale?: number;
  /**
   * Optional: minimum terrain elevation to treat a tile as land (for flat tops and peaks).
   * Use when sea-level land uses a negative value (e.g. -0.042). Tiles with getElevation(id) >= minLandElevation are land.
   * If omitted, land is determined by (getElevation(id) * elevationScale) >= 0.
   */
  minLandElevation?: number;
  /** Optional: tiles that are 3D peaks (pyramid with apex). Base ring uses getElevation; apex = base + peakElevationScale * apexElevationM. */
  getPeak?: (tileId: number) => TilePeak | undefined;
  /** Scale meters → globe units for peak apex height. Default 0.00002 (e.g. Everest ~0.18 units above base). */
  peakElevationScale?: number;
  /** Optional: tiles with hilly terrain get a gentle rounded bump (center raised). */
  getHilly?: (tileId: number) => boolean;
  /** Height of hill bump in globe units. Default 0.003. */
  hillyBumpHeight?: number;
  /**
   * Optional: for tiles with river, build a hex-shaped bowl (inner hex cut out, sides cut for river directions).
   * Also suppresses elevation step-walls on those edges so the channel stays open across height changes.
   */
  getRiverEdges?: (tileId: number) => Set<number> | undefined;
  /** Optional: for river bowls, set of edge indices that connect to ocean/lake; those sides get a full opening instead of a slot. */
  getRiverEdgeToWater?: (tileId: number) => Set<number> | undefined;
  /** Depth of river bowl below tile surface (globe units). Default 0.012. */
  riverBowlDepth?: number;
  /** Inner hex radius as fraction of center-to-corner (0–1). Default 0.4. */
  riverBowlInnerScale?: number;
}

export interface FlatGeometryData {
  positions: Float32Array;
  normals: Float32Array;
  tileIds: Float32Array;
  indices: number[];
}

/**
 * Build position, normal, tileId and index arrays for flat hex geometry.
 * Used by createGeodesicGeometryFlat and updateFlatGeometryFromTerrain.
 */
export function buildFlatGeometryData(
  tiles: GeodesicTile[],
  options: GeodesicFlatMeshOptions
): FlatGeometryData {
  const radius = options.radius ?? 1;
  const elevationScale = options.elevationScale ?? 1;
  const peakElevationScale = options.peakElevationScale ?? 0.00002;
  const getPeak = options.getPeak;
  const getHilly = options.getHilly;
  const hillyBumpHeight = options.hillyBumpHeight ?? 0.003;
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const tileIds: number[] = [];
  let vertexOffset = 0;

  const projectVertexOntoTilePlane = (
    v: THREE.Vector3,
    center: THREE.Vector3,
    r: number,
    out: THREE.Vector3
  ) => {
    const dot = v.dot(center);
    out.copy(center).multiplyScalar(r).add(v).addScaledVector(center, -dot);
    return out;
  };
  const vaOut = new THREE.Vector3();
  const vbOut = new THREE.Vector3();
  const cn = new THREE.Vector3();
  const cnTmp = new THREE.Vector3();
  const fv = new THREE.Vector3();
  const evb = new THREE.Vector3();
  const inPlaneScratch = new THREE.Vector3();
  const topPosScratch = new THREE.Vector3();

  const minLandElevation = options.minLandElevation;
  const getRiverEdges = options.getRiverEdges;
  const getRiverEdgeToWater = options.getRiverEdgeToWater;
  const riverBowlDepth = options.riverBowlDepth ?? 0.012;
  const riverBowlInnerScale = options.riverBowlInnerScale ?? 0.4;

  for (const tile of tiles) {
    const rawElev = options.getElevation(tile.id);
    const elev = rawElev * elevationScale;
    const r = radius + elev;
    const n = tile.vertices.length;
    const base = vertexOffset;
    cn.copy(tile.center).normalize();
    const isLand =
      minLandElevation != null ? rawElev >= minLandElevation : elev >= 0;
    const peak = getPeak?.(tile.id);
    const riverEdges = getRiverEdges?.(tile.id);
    const isHexRiver =
      isLand && riverEdges != null && riverEdges.size > 0 && n === 6;
    const isRiverBowl =
      isLand && riverEdges != null && riverEdges.size > 0 && n !== 6;

    if (isHexRiver) {
      continue;
    }

    if (isRiverBowl) {
      const rTop = r;
      const rBot = r - riverBowlDepth;
      const inPlaneVec = new THREE.Vector3();
      const inPlaneByVertex: THREE.Vector3[] = [];
      for (let i = 0; i < n; i++) {
        fv.copy(tile.vertices[i]).normalize();
        const dot = fv.dot(cn);
        cnTmp.copy(cn).multiplyScalar(dot);
        inPlaneVec.copy(fv).sub(cnTmp);
        inPlaneByVertex.push(inPlaneVec.clone());
        topPosScratch.copy(cn).multiplyScalar(rTop).add(inPlaneVec);
        positions.push(topPosScratch.x, topPosScratch.y, topPosScratch.z);
        normals.push(cn.x, cn.y, cn.z);
        tileIds.push(tile.id);
        vertexOffset++;
      }
      const innerTopBase = vertexOffset;
      for (let i = 0; i < n; i++) {
        const i1 = (i + 1) % n;
        inPlaneScratch
          .copy(inPlaneByVertex[i])
          .add(inPlaneByVertex[i1])
          .multiplyScalar(0.5 * riverBowlInnerScale);
        topPosScratch.copy(cn).multiplyScalar(rTop).add(inPlaneScratch);
        positions.push(topPosScratch.x, topPosScratch.y, topPosScratch.z);
        normals.push(cn.x, cn.y, cn.z);
        tileIds.push(tile.id);
        vertexOffset++;
      }
      const innerBotBase = vertexOffset;
      for (let i = 0; i < n; i++) {
        const i1 = (i + 1) % n;
        inPlaneScratch
          .copy(inPlaneByVertex[i])
          .add(inPlaneByVertex[i1])
          .multiplyScalar(0.5 * riverBowlInnerScale);
        topPosScratch.copy(cn).multiplyScalar(rBot).add(inPlaneScratch);
        positions.push(topPosScratch.x, topPosScratch.y, topPosScratch.z);
        normals.push(cn.x, cn.y, cn.z);
        tileIds.push(tile.id);
        vertexOffset++;
      }
      const centerBotIdx = vertexOffset;
      positions.push(
        cn.x * rBot,
        cn.y * rBot,
        cn.z * rBot
      );
      normals.push(cn.x, cn.y, cn.z);
      tileIds.push(tile.id);
      vertexOffset++;

      const readPos = (vi: number, out: THREE.Vector3) => {
        out.set(positions[vi * 3], positions[vi * 3 + 1], positions[vi * 3 + 2]);
      };
      const pushVertex = (p: THREE.Vector3) => {
        positions.push(p.x, p.y, p.z);
        normals.push(cn.x, cn.y, cn.z);
        tileIds.push(tile.id);
        vertexOffset++;
      };
      const vo = new THREE.Vector3();
      const v1 = new THREE.Vector3();
      const v2 = new THREE.Vector3();
      const riverHexTwo: [number, number] | null =
        n === 6 && riverEdges.size === 2
          ? (() => {
              const a = [...riverEdges].sort((x, y) => x - y);
              return [a[0], a[1]] as [number, number];
            })()
          : null;

      for (let i = 0; i < n; i++) {
        const i1 = (i + 1) % n;
        const o0 = base + i;
        const o1 = base + i1;
        const it0 = innerTopBase + i;
        const it1 = innerTopBase + i1;
        const ib0 = innerBotBase + i;
        const ib1 = innerBotBase + i1;
        const isRiverSide = riverEdges.has(i);
        const isEdgeToWater = isRiverSide && getRiverEdgeToWater?.(tile.id)?.has(i);

        if (isEdgeToWater) {
          // Full opening toward ocean/lake: no slot geometry, bowl opens fully on this side
        } else if (isRiverSide) {
          readPos(o0, vo);
          readPos(o1, v1);
          let tLeft: number;
          let tRight: number;
          if (riverHexTwo) {
            const span = riverBowlSlotTRangeForHexTwoEdges(
              tile,
              i,
              riverHexTwo[0],
              riverHexTwo[1],
              rTop,
              cn,
              riverBowlInnerScale,
              vo,
              v1
            );
            if (span) {
              tLeft = span.tMin;
              tRight = span.tMax;
            } else {
              const frac = Math.min(1, riverBowlInnerScale);
              tLeft = Math.max(0, 0.5 - frac * 0.5);
              tRight = Math.min(1, 0.5 + frac * 0.5);
            }
          } else {
            const frac = Math.min(1, riverBowlInnerScale);
            tLeft = Math.max(0, 0.5 - frac * 0.5);
            tRight = Math.min(1, 0.5 + frac * 0.5);
          }

          readPos(o0, vo);
          readPos(o1, v1);
          v2.lerpVectors(vo, v1, tLeft);
          const outerLeftIdx = vertexOffset;
          pushVertex(v2);
          v2.lerpVectors(vo, v1, tRight);
          const outerRightIdx = vertexOffset;
          pushVertex(v2);

          readPos(it0, vo);
          readPos(it1, v1);
          v2.lerpVectors(vo, v1, tLeft);
          const innerLeftIdx = vertexOffset;
          pushVertex(v2);
          v2.lerpVectors(vo, v1, tRight);
          const innerRightIdx = vertexOffset;
          pushVertex(v2);

          readPos(ib0, vo);
          readPos(ib1, v1);
          v2.lerpVectors(vo, v1, tLeft);
          const innerLeftBotIdx = vertexOffset;
          pushVertex(v2);
          v2.lerpVectors(vo, v1, tRight);
          const innerRightBotIdx = vertexOffset;
          pushVertex(v2);

          indices.push(o0, outerLeftIdx, innerLeftIdx, o0, innerLeftIdx, it0);
          indices.push(outerRightIdx, o1, it1, outerRightIdx, it1, innerRightIdx);
          indices.push(it0, innerLeftIdx, innerLeftBotIdx, it0, innerLeftBotIdx, ib0);
          indices.push(innerRightIdx, it1, ib1, innerRightIdx, ib1, innerRightBotIdx);
        } else {
          indices.push(o0, o1, it1, o0, it1, it0);
          indices.push(it0, it1, ib1, it0, ib1, ib0);
        }
        // Floor triangle: wind so front face is toward globe center (visible when looking into bowl)
        indices.push(centerBotIdx, innerBotBase + i1, innerBotBase + i);
      }
      continue;
    }

    for (let i = 0; i < n; i++) {
      fv.copy(tile.vertices[i]).normalize();
      if (isLand) {
        const dot = fv.dot(cn);
        cnTmp.copy(cn).multiplyScalar(dot);
        inPlaneScratch.copy(fv).sub(cnTmp);
        topPosScratch.copy(cn).multiplyScalar(r).add(inPlaneScratch);
        positions.push(topPosScratch.x, topPosScratch.y, topPosScratch.z);
      } else {
        positions.push(fv.x * r, fv.y * r, fv.z * r);
      }
      normals.push(cn.x, cn.y, cn.z);
      tileIds.push(tile.id);
      vertexOffset++;
    }

    if (peak && isLand) {
      let baseRadius = 0;
      for (let i = 0; i < n; i++) {
        fv.copy(tile.vertices[i]).normalize();
        const dot = fv.dot(cn);
        const inPlaneLen = Math.sqrt(1 - dot * dot);
        baseRadius = Math.max(baseRadius, r * inPlaneLen);
      }
      const rawHeight = peak.apexElevationM * peakElevationScale;
      const h = Math.min(rawHeight, baseRadius);
      const rApex = r + h;
      topPosScratch.copy(cn).multiplyScalar(rApex);
      const apexIdx = vertexOffset;
      positions.push(topPosScratch.x, topPosScratch.y, topPosScratch.z);
      normals.push(cn.x, cn.y, cn.z);
      tileIds.push(tile.id);
      vertexOffset++;
      for (let i = 0; i < n; i++) {
        indices.push(apexIdx, base + ((i + 1) % n), base + i);
      }
      const capHeight = 0.85;
      const capRadiusFrac = 0.28;
      const rCap = r + h * capHeight;
      const snowApexIdx = vertexOffset;
      positions.push(topPosScratch.x, topPosScratch.y, topPosScratch.z);
      normals.push(cn.x, cn.y, cn.z);
      /** Negative id encodes parent tile for GPU land-weather sampling: decode as `-(id+1)` → `tile.id`. */
      const snowCapTileIdEnc = -(tile.id + 1);
      tileIds.push(snowCapTileIdEnc);
      vertexOffset++;
      const capBase = vertexOffset;
      for (let i = 0; i < n; i++) {
        fv.copy(tile.vertices[i]).normalize();
        const dot = fv.dot(cn);
        cnTmp.copy(cn).multiplyScalar(dot);
        inPlaneScratch.copy(fv).sub(cnTmp);
        if (inPlaneScratch.lengthSq() > 1e-20) inPlaneScratch.normalize();
        inPlaneScratch.multiplyScalar(baseRadius * capRadiusFrac);
        topPosScratch.copy(cn).multiplyScalar(rCap).add(inPlaneScratch);
        positions.push(topPosScratch.x, topPosScratch.y, topPosScratch.z);
        normals.push(cn.x, cn.y, cn.z);
        tileIds.push(snowCapTileIdEnc);
        vertexOffset++;
      }
      for (let i = 0; i < n; i++) {
        indices.push(snowApexIdx, capBase + ((i + 1) % n), capBase + i);
      }
    } else if (getHilly?.(tile.id) && isLand) {
      // Hilly terrain: flat-topped truncated cone (mesa/plateau shape)
      // Distinct from pyramidal mountains
      const rHillTop = r + hillyBumpHeight;
      const flatTopRadiusFrac = 0.78; // Size of flat top relative to hex size (wider = gentler slope)
      
      // Compute base radius for scaling the flat top
      let baseRadius = 0;
      for (let i = 0; i < n; i++) {
        fv.copy(tile.vertices[i]).normalize();
        const dot = fv.dot(cn);
        const inPlaneLen = Math.sqrt(1 - dot * dot);
        baseRadius = Math.max(baseRadius, r * inPlaneLen);
      }
      
      // Create flat top center vertex
      topPosScratch.copy(cn).multiplyScalar(rHillTop);
      const hillCenterIdx = vertexOffset;
      positions.push(topPosScratch.x, topPosScratch.y, topPosScratch.z);
      normals.push(cn.x, cn.y, cn.z);
      tileIds.push(tile.id);
      vertexOffset++;
      
      // Create flat top edge vertices (inner ring at raised height)
      const hillTopBase = vertexOffset;
      for (let i = 0; i < n; i++) {
        fv.copy(tile.vertices[i]).normalize();
        const dot = fv.dot(cn);
        cnTmp.copy(cn).multiplyScalar(dot);
        inPlaneScratch.copy(fv).sub(cnTmp);
        if (inPlaneScratch.lengthSq() > 1e-20) inPlaneScratch.normalize();
        inPlaneScratch.multiplyScalar(baseRadius * flatTopRadiusFrac);
        topPosScratch.copy(cn).multiplyScalar(rHillTop).add(inPlaneScratch);
        positions.push(topPosScratch.x, topPosScratch.y, topPosScratch.z);
        normals.push(cn.x, cn.y, cn.z);
        tileIds.push(tile.id);
        vertexOffset++;
      }
      
      // Flat top triangles (center to inner ring)
      for (let i = 0; i < n; i++) {
        indices.push(hillCenterIdx, hillTopBase + ((i + 1) % n), hillTopBase + i);
      }
      
      // Sloped sides (inner ring to outer base edge). Wind CCW as seen from outside the solid
      // (same convention as river-bowl walls: base+i → base+i1 → inner top), so FrontSide does
      // not cull the outward faces.
      for (let i = 0; i < n; i++) {
        const i1 = (i + 1) % n;
        indices.push(base + i, base + i1, hillTopBase + i1);
        indices.push(base + i, hillTopBase + i1, hillTopBase + i);
      }
    } else {
      for (let i = 1; i + 1 < n; i++) {
        indices.push(base, base + i + 1, base + i);
      }
    }
  }

  for (const tile of tiles) {
    const elev = options.getElevation(tile.id) * elevationScale;
    const rThis = radius + elev;
    const n = tile.vertices.length;
    for (let i = 0; i < n; i++) {
      const neighborId = getEdgeNeighbor(tile, i, tiles);
      if (neighborId === undefined || tile.id >= neighborId) continue;
      const neighbor = tiles[neighborId];
      if (getRiverEdges) {
        const nj = getNeighborEdgeIndex(tile, i, neighbor);
        if (getRiverEdges(tile.id)?.has(i) || (nj !== undefined && getRiverEdges(neighborId)?.has(nj))) {
          continue;
        }
      }
      const neighborElev = options.getElevation(neighborId) * elevationScale;
      const rNeighbor = radius + neighborElev;
      if (Math.abs(rThis - rNeighbor) < 1e-9) continue;
      const rTop = Math.max(rThis, rNeighbor);
      const rBot = Math.min(rThis, rNeighbor);
      const topTile = rThis >= rNeighbor ? tile : neighbor;
      const botTile = rThis >= rNeighbor ? neighbor : tile;
      const topElev = rThis >= rNeighbor ? elev : neighborElev;
      const botElev = rThis >= rNeighbor ? neighborElev : elev;
      const topTileId = rThis >= rNeighbor ? tile.id : neighborId;
      const botTileId = rThis >= rNeighbor ? neighborId : tile.id;
      fv.copy(tile.vertices[i]).normalize();
      evb.copy(tile.vertices[(i + 1) % n]).normalize();
      if (topElev >= 0) {
        projectVertexOntoTilePlane(fv, topTile.center, rTop, vaOut);
        projectVertexOntoTilePlane(evb, topTile.center, rTop, vbOut);
      } else {
        vaOut.set(fv.x * rTop, fv.y * rTop, fv.z * rTop);
        vbOut.set(evb.x * rTop, evb.y * rTop, evb.z * rTop);
      }
      const aTop = vertexOffset;
      positions.push(vaOut.x, vaOut.y, vaOut.z);
      normals.push(fv.x, fv.y, fv.z);
      tileIds.push(topTileId);
      vertexOffset++;
      const bTop = vertexOffset;
      positions.push(vbOut.x, vbOut.y, vbOut.z);
      normals.push(evb.x, evb.y, evb.z);
      tileIds.push(topTileId);
      vertexOffset++;
      if (botElev >= 0) {
        projectVertexOntoTilePlane(fv, botTile.center, rBot, vaOut);
        projectVertexOntoTilePlane(evb, botTile.center, rBot, vbOut);
      } else {
        vaOut.set(fv.x * rBot, fv.y * rBot, fv.z * rBot);
        vbOut.set(evb.x * rBot, evb.y * rBot, evb.z * rBot);
      }
      const bBot = vertexOffset;
      positions.push(vbOut.x, vbOut.y, vbOut.z);
      normals.push(evb.x, evb.y, evb.z);
      tileIds.push(botTileId);
      vertexOffset++;
      const aBot = vertexOffset;
      positions.push(vaOut.x, vaOut.y, vaOut.z);
      normals.push(fv.x, fv.y, fv.z);
      tileIds.push(botTileId);
      vertexOffset++;
      indices.push(aTop, bTop, bBot, aTop, bBot, aBot);
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    tileIds: new Float32Array(tileIds),
    indices,
  };
}

/**
 * Create BufferGeometry with flat hex/pentagon tops and vertical steps between different elevations.
 * Each tile is a true hex or pentagon: land in plane through center*r, water on sphere at r.
 * Small gaps can appear at shared edges; walls fill vertical steps between elevations.
 */
export function createGeodesicGeometryFlat(
  tiles: GeodesicTile[],
  options: GeodesicFlatMeshOptions
): THREE.BufferGeometry {
  const { positions, normals, tileIds, indices } = buildFlatGeometryData(tiles, options);
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geom.setAttribute("tileId", new THREE.Float32BufferAttribute(tileIds, 1));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Update an existing flat geometry's positions (and normals) in place from new elevation/peak options.
 * Use when the set of tiles with peaks is unchanged (same vertex count); otherwise replace the geometry.
 */
export function updateFlatGeometryFromTerrain(
  geometry: THREE.BufferGeometry,
  tiles: GeodesicTile[],
  options: GeodesicFlatMeshOptions
): void {
  const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
  if (!posAttr) return;
  const { positions, normals } = buildFlatGeometryData(tiles, options);
  if (positions.length !== posAttr.count * 3) return;
  (posAttr.array as Float32Array).set(positions);
  posAttr.needsUpdate = true;
  const normAttr = geometry.getAttribute("normal") as THREE.BufferAttribute;
  if (normAttr && normAttr.count * 3 === normals.length) {
    (normAttr.array as Float32Array).set(normals);
    normAttr.needsUpdate = true;
  } else {
    geometry.computeVertexNormals();
  }
}

/**
 * Create a Three.js BufferGeometry for the geodesic globe (flat shading per tile).
 */
export function createGeodesicGeometry(
  tiles: GeodesicTile[],
  options: GeodesicMeshOptions = {}
): THREE.BufferGeometry {
  const { radius = 1 } = options;
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const tileIds: number[] = [];
  let vertexOffset = 0;
  const c = new THREE.Vector3();
  const corner = new THREE.Vector3();

  for (const tile of tiles) {
    c.copy(tile.center).multiplyScalar(radius);
    const n = tile.vertices.length;
    const base = vertexOffset;
    positions.push(c.x, c.y, c.z);
    normals.push(tile.center.x, tile.center.y, tile.center.z);
    tileIds.push(tile.id);
    vertexOffset++;
    for (let i = 0; i < n; i++) {
      corner.copy(tile.vertices[i]).multiplyScalar(radius);
      positions.push(corner.x, corner.y, corner.z);
      normals.push(corner.x / radius, corner.y / radius, corner.z / radius);
      tileIds.push(tile.id);
      vertexOffset++;
    }
    for (let i = 0; i < n; i++) {
      indices.push(base, base + 1 + ((i + 1) % n), base + 1 + i);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geom.setAttribute("tileId", new THREE.Float32BufferAttribute(tileIds, 1));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}
