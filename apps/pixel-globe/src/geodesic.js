const T = (1 + Math.sqrt(5)) / 2;

const ICOSA_VERTICES = [
  [-1, T, 0], [1, T, 0], [-1, -T, 0], [1, -T, 0],
  [0, -1, T], [0, 1, T], [0, -1, -T], [0, 1, -T],
  [T, 0, -1], [T, 0, 1], [-T, 0, -1], [-T, 0, 1]
].map(([x, y, z]) => normalize3([x, y, z]));

const ICOSA_FACES = [
  [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
  [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
  [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
  [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
];

export function buildGeodesicGraph(subdivisions) {
  if (!Number.isInteger(subdivisions) || subdivisions < 0 || subdivisions > 8) {
    throw new Error(`Unsupported subdivision count: ${subdivisions}`);
  }

  const verts = ICOSA_VERTICES.map((v) => v.slice());
  let faces = ICOSA_FACES.map((f) => f.slice());
  const edgeMidpoint = new Map();

  const getMid = (i, j) => {
    const a = Math.min(i, j);
    const b = Math.max(i, j);
    const key = `${a},${b}`;
    const existing = edgeMidpoint.get(key);
    if (existing !== undefined) return existing;
    const va = verts[a];
    const vb = verts[b];
    const mid = normalize3([va[0] + vb[0], va[1] + vb[1], va[2] + vb[2]]);
    verts.push(mid);
    const id = verts.length - 1;
    edgeMidpoint.set(key, id);
    return id;
  };

  for (let s = 0; s < subdivisions; s++) {
    const next = [];
    for (const [a, b, c] of faces) {
      const ab = getMid(a, b);
      const ac = getMid(a, c);
      const bc = getMid(b, c);
      next.push([a, ab, ac], [b, bc, ab], [c, ac, bc], [ab, bc, ac]);
    }
    faces = next;
  }

  const orderedFacesByVertex = orderedFaceIdsAroundVertices(faces, verts.length);
  const dualEdgeOwners = new Map();
  const edgeNeighbors = new Array(verts.length);

  for (let id = 0; id < verts.length; id++) {
    const orderedFaces = orderedFacesByVertex.get(id);
    if (!orderedFaces) throw new Error(`Missing ordered geodesic faces for tile ${id}`);
    edgeNeighbors[id] = new Array(orderedFaces.length).fill(undefined);
    for (let e = 0; e < orderedFaces.length; e++) {
      const key = dualEdgeKey(orderedFaces[e], orderedFaces[(e + 1) % orderedFaces.length]);
      let owners = dualEdgeOwners.get(key);
      if (!owners) {
        owners = [];
        dualEdgeOwners.set(key, owners);
      }
      owners.push({ id, edge: e });
    }
  }

  for (const [key, owners] of dualEdgeOwners.entries()) {
    if (owners.length !== 2) throw new Error(`Expected 2 owners for dual edge ${key}, got ${owners.length}`);
    edgeNeighbors[owners[0].id][owners[0].edge] = owners[1].id;
    edgeNeighbors[owners[1].id][owners[1].edge] = owners[0].id;
  }

  const neighborSets = Array.from({ length: verts.length }, () => new Set());
  for (const [a, b, c] of faces) {
    neighborSets[a].add(b);
    neighborSets[a].add(c);
    neighborSets[b].add(a);
    neighborSets[b].add(c);
    neighborSets[c].add(a);
    neighborSets[c].add(b);
  }

  const centers = new Float32Array(verts.length * 3);
  const latDeg = new Float32Array(verts.length);
  const lonDeg = new Float32Array(verts.length);
  const neighbors = new Array(verts.length);
  const isPentagon = new Uint8Array(verts.length);
  const edgeCount = new Uint8Array(verts.length);

  for (let i = 0; i < verts.length; i++) {
    const v = verts[i];
    centers[i * 3] = v[0];
    centers[i * 3 + 1] = v[1];
    centers[i * 3 + 2] = v[2];
    latDeg[i] = Math.asin(clamp(v[1], -1, 1)) * 180 / Math.PI;
    lonDeg[i] = -Math.atan2(v[2], v[0]) * 180 / Math.PI;
    neighbors[i] = Array.from(neighborSets[i]);
    isPentagon[i] = neighbors[i].length === 5 ? 1 : 0;
    edgeCount[i] = edgeNeighbors[i].length;
  }

  return { subdivisions, tileCount: verts.length, centers, latDeg, lonDeg, neighbors, edgeNeighbors, edgeCount, isPentagon };
}

function orderedFaceIdsAroundVertices(faces, vertexCount) {
  const faceIdsByVertex = new Map();
  for (let fi = 0; fi < faces.length; fi++) {
    for (const vi of faces[fi]) {
      let list = faceIdsByVertex.get(vi);
      if (!list) {
        list = [];
        faceIdsByVertex.set(vi, list);
      }
      list.push(fi);
    }
  }

  const ordered = new Map();
  for (let vi = 0; vi < vertexCount; vi++) {
    const faceList = faceIdsByVertex.get(vi);
    if (!faceList || faceList.length === 0) continue;
    const ring = [];
    const used = new Set();
    let current = faceList[0];
    while (ring.length < faceList.length) {
      ring.push(current);
      used.add(current);
      const face = faces[current];
      const idx = face.indexOf(vi);
      if (idx < 0) throw new Error(`Face ${current} does not contain vertex ${vi}`);
      const nextVert = face[(idx + 1) % 3];
      const nextFace = faceList.find((f) => !used.has(f) && faces[f].includes(vi) && faces[f].includes(nextVert));
      if (nextFace === undefined) break;
      current = nextFace;
    }
    if (ring.length !== faceList.length) {
      throw new Error(`Could not order ${faceList.length} faces around tile ${vi}; ordered ${ring.length}`);
    }
    ordered.set(vi, ring);
  }
  return ordered;
}

function dualEdgeKey(a, b) {
  return a < b ? `${a},${b}` : `${b},${a}`;
}

export function createDirectionIndex(graph, lonCells = 144, latCells = 72) {
  const cells = Array.from({ length: lonCells * latCells }, () => []);
  for (let id = 0; id < graph.tileCount; id++) {
    const { i, j } = lonLatCell(graph.lonDeg[id], graph.latDeg[id], lonCells, latCells);
    cells[i + j * lonCells].push(id);
  }
  return { lonCells, latCells, cells };
}

export function findNearestTileId(graph, index, dir) {
  const lat = Math.asin(clamp(dir[1], -1, 1)) * 180 / Math.PI;
  const lon = -Math.atan2(dir[2], dir[0]) * 180 / Math.PI;
  const c = lonLatCell(lon, lat, index.lonCells, index.latCells);
  let bestId = 0;
  let bestDot = -Infinity;

  for (let radius = 0; radius <= 3; radius++) {
    for (let dj = -radius; dj <= radius; dj++) {
      for (let di = -radius; di <= radius; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== radius) continue;
        const i = wrap(c.i + di, index.lonCells);
        const j = clamp(c.j + dj, 0, index.latCells - 1);
        const ids = index.cells[i + j * index.lonCells];
        for (const id of ids) {
          const d = dotGraphCenter(graph, id, dir);
          if (d > bestDot) {
            bestDot = d;
            bestId = id;
          }
        }
      }
    }
    if (bestDot > -Infinity) {
      // The nearest center may lie across a latitude/longitude bucket edge.
      // The index supplies a nearby seed; ascend the convex geodesic mesh to
      // the actual nearest center instead of treating a bucket as a boundary.
      while (true) {
        let nextId = bestId;
        for (const neighborId of graph.neighbors[bestId]) {
          const d = dotGraphCenter(graph, neighborId, dir);
          if (d > bestDot || (d === bestDot && neighborId < nextId)) {
            bestDot = d;
            nextId = neighborId;
          }
        }
        if (nextId === bestId) return bestId;
        bestId = nextId;
      }
    }
  }

  for (let id = 0; id < graph.tileCount; id++) {
    const d = dotGraphCenter(graph, id, dir);
    if (d > bestDot) {
      bestDot = d;
      bestId = id;
    }
  }
  return bestId;
}

function lonLatCell(lonDeg, latDeg, lonCells, latCells) {
  const lonWrapped = ((((lonDeg + 180) % 360) + 360) % 360) - 180;
  const i = wrap(Math.floor(((lonWrapped + 180) / 360) * lonCells), lonCells);
  const j = clamp(Math.floor(((latDeg + 90) / 180) * latCells), 0, latCells - 1);
  return { i, j };
}

function dotGraphCenter(graph, id, v) {
  const k = id * 3;
  return graph.centers[k] * v[0] + graph.centers[k + 1] * v[1] + graph.centers[k + 2] * v[2];
}

export function graphCenter(graph, id, out = [0, 0, 0]) {
  const k = id * 3;
  out[0] = graph.centers[k];
  out[1] = graph.centers[k + 1];
  out[2] = graph.centers[k + 2];
  return out;
}

export function normalize3(v) {
  const m = Math.hypot(v[0], v[1], v[2]);
  if (m <= 0) throw new Error("Cannot normalize zero vector");
  return [v[0] / m, v[1] / m, v[2] / m];
}

export function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross3(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}

export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function wrap(v, n) {
  return ((v % n) + n) % n;
}
