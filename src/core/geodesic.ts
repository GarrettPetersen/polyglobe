/**
 * Geodesic sphere: 12 pentagons + N hexagons.
 * Built by subdividing an icosahedron and taking the dual (Voronoi-like cells).
 */

import * as THREE from "three";

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
    faces.push(...newFaces);
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

export interface GeodesicFlatMeshOptions {
  radius?: number;
  /** Elevation per tile (same scale as terrain). Will be scaled by elevationScale in applyTerrainToGeometry. */
  getElevation: (tileId: number) => number;
  elevationScale?: number;
}

/**
 * Create BufferGeometry with flat hex/pentagon tops and vertical steps between different elevations.
 * No vertex sharing: each tile has its own vertices at (radius + elevation) * normal.
 */
export function createGeodesicGeometryFlat(
  tiles: GeodesicTile[],
  options: GeodesicFlatMeshOptions
): THREE.BufferGeometry {
  const radius = options.radius ?? 1;
  const elevationScale = options.elevationScale ?? 1;
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const tileIds: number[] = [];
  let vertexOffset = 0;

  for (const tile of tiles) {
    const elev = options.getElevation(tile.id) * elevationScale;
    const r = radius + elev;
    const n = tile.vertices.length;
    const base = vertexOffset;
    const centerNormal = tile.center.clone().normalize();
    for (let i = 0; i < n; i++) {
      const v = tile.vertices[i].clone().normalize();
      positions.push(v.x * r, v.y * r, v.z * r);
      normals.push(centerNormal.x, centerNormal.y, centerNormal.z);
      tileIds.push(tile.id);
      vertexOffset++;
    }
    for (let i = 1; i + 1 < n; i++) {
      indices.push(base, base + i, base + i + 1);
    }
  }

  for (const tile of tiles) {
    const elev = options.getElevation(tile.id) * elevationScale;
    const rThis = radius + elev;
    const n = tile.vertices.length;
    for (let i = 0; i < n; i++) {
      const neighborId = getEdgeNeighbor(tile, i, tiles);
      if (neighborId === undefined || tile.id >= neighborId) continue;
      const neighborElev = options.getElevation(neighborId) * elevationScale;
      const rNeighbor = radius + neighborElev;
      if (Math.abs(rThis - rNeighbor) < 1e-9) continue;
      const rTop = Math.max(rThis, rNeighbor);
      const rBot = Math.min(rThis, rNeighbor);
      const topTileId = rThis >= rNeighbor ? tile.id : neighborId;
      const botTileId = rThis >= rNeighbor ? neighborId : tile.id;
      const va = tile.vertices[i].clone().normalize();
      const vb = tile.vertices[(i + 1) % n].clone().normalize();
      const aTop = vertexOffset;
      positions.push(va.x * rTop, va.y * rTop, va.z * rTop);
      normals.push(va.x, va.y, va.z);
      tileIds.push(topTileId);
      vertexOffset++;
      const bTop = vertexOffset;
      positions.push(vb.x * rTop, vb.y * rTop, vb.z * rTop);
      normals.push(vb.x, vb.y, vb.z);
      tileIds.push(topTileId);
      vertexOffset++;
      const bBot = vertexOffset;
      positions.push(vb.x * rBot, vb.y * rBot, vb.z * rBot);
      normals.push(vb.x, vb.y, vb.z);
      tileIds.push(botTileId);
      vertexOffset++;
      const aBot = vertexOffset;
      positions.push(va.x * rBot, va.y * rBot, va.z * rBot);
      normals.push(va.x, va.y, va.z);
      tileIds.push(botTileId);
      vertexOffset++;
      indices.push(aTop, bTop, bBot, aTop, bBot, aBot);
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

  for (const tile of tiles) {
    const center = tile.center.clone().multiplyScalar(radius);
    const verts = tile.vertices.map((v) => v.clone().multiplyScalar(radius));
    const n = verts.length;
    const base = vertexOffset;
    positions.push(center.x, center.y, center.z);
    normals.push(tile.center.x, tile.center.y, tile.center.z);
    tileIds.push(tile.id);
    vertexOffset++;
    for (const v of verts) {
      positions.push(v.x, v.y, v.z);
      normals.push(v.x / radius, v.y / radius, v.z / radius);
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
