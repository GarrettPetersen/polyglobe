const GEODESIC_BAKE_MAGIC = "PGEO";
const GEODESIC_BAKE_VERSION = 1;
const GEODESIC_BAKE_HEADER_BYTES = 24;
const GEODESIC_ROW_WIDTH = 6;
const EMPTY_NEIGHBOR = 0xffffffff;
const PACKED_GRAPH_ROWS = Symbol("packedGraphRows");

export function encodeGeodesicGraphBake(graph) {
  validateGraphForBake(graph);
  const tileCount = graph.tileCount;
  const byteLength = geodesicGraphBakeByteLength(tileCount);
  const buffer = new ArrayBuffer(byteLength);
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  writeMagic(bytes, GEODESIC_BAKE_MAGIC);
  view.setUint32(4, GEODESIC_BAKE_VERSION, true);
  view.setUint32(8, graph.subdivisions, true);
  view.setUint32(12, tileCount, true);
  view.setUint32(16, GEODESIC_ROW_WIDTH, true);
  view.setUint32(20, 0, true);

  const layout = geodesicGraphBakeLayout(tileCount);
  new Float32Array(buffer, layout.centers, tileCount * 3).set(graph.centers);
  new Float32Array(buffer, layout.latDeg, tileCount).set(graph.latDeg);
  new Float32Array(buffer, layout.lonDeg, tileCount).set(graph.lonDeg);
  const packedNeighbors = new Uint32Array(buffer, layout.neighbors, tileCount * GEODESIC_ROW_WIDTH);
  const packedEdgeNeighbors = new Uint32Array(
    buffer,
    layout.edgeNeighbors,
    tileCount * GEODESIC_ROW_WIDTH
  );
  packedNeighbors.fill(EMPTY_NEIGHBOR);
  packedEdgeNeighbors.fill(EMPTY_NEIGHBOR);
  for (let tileId = 0; tileId < tileCount; tileId++) {
    writeNeighborRow(packedNeighbors, tileId, graph.neighbors[tileId], "neighbor");
    writeNeighborRow(packedEdgeNeighbors, tileId, graph.edgeNeighbors[tileId], "edge-neighbor");
  }
  new Uint8Array(buffer, layout.edgeCount, tileCount).set(graph.edgeCount);
  new Uint8Array(buffer, layout.isPentagon, tileCount).set(graph.isPentagon);
  return buffer;
}

export function decodeGeodesicGraphBake(buffer, expectedSubdivisions) {
  if (!(buffer instanceof ArrayBuffer)) throw new Error("Geodesic graph bake must be an ArrayBuffer");
  if (buffer.byteLength < GEODESIC_BAKE_HEADER_BYTES) {
    throw new Error(`Geodesic graph bake is too small: ${buffer.byteLength}`);
  }
  const bytes = new Uint8Array(buffer);
  requireMagic(bytes, GEODESIC_BAKE_MAGIC);
  const view = new DataView(buffer);
  const version = view.getUint32(4, true);
  if (version !== GEODESIC_BAKE_VERSION) {
    throw new Error(`Unsupported geodesic graph bake version ${version}`);
  }
  const subdivisions = view.getUint32(8, true);
  if (subdivisions !== expectedSubdivisions) {
    throw new Error(`Geodesic graph bake subdivision ${subdivisions}; expected ${expectedSubdivisions}`);
  }
  const tileCount = view.getUint32(12, true);
  const rowWidth = view.getUint32(16, true);
  const reserved = view.getUint32(20, true);
  if (rowWidth !== GEODESIC_ROW_WIDTH || reserved !== 0) {
    throw new Error(`Malformed geodesic graph bake header: rowWidth=${rowWidth}, reserved=${reserved}`);
  }
  const expectedBytes = geodesicGraphBakeByteLength(tileCount);
  if (buffer.byteLength !== expectedBytes) {
    throw new Error(`Geodesic graph bake has ${buffer.byteLength} bytes; expected ${expectedBytes}`);
  }

  const layout = geodesicGraphBakeLayout(tileCount);
  const edgeCount = new Uint8Array(buffer, layout.edgeCount, tileCount);
  const graph = {
    subdivisions,
    tileCount,
    centers: new Float32Array(buffer, layout.centers, tileCount * 3),
    latDeg: new Float32Array(buffer, layout.latDeg, tileCount),
    lonDeg: new Float32Array(buffer, layout.lonDeg, tileCount),
    neighbors: packedGraphRows(
      new Uint32Array(buffer, layout.neighbors, tileCount * GEODESIC_ROW_WIDTH),
      edgeCount
    ),
    edgeNeighbors: packedGraphRows(
      new Uint32Array(buffer, layout.edgeNeighbors, tileCount * GEODESIC_ROW_WIDTH),
      edgeCount
    ),
    edgeCount,
    isPentagon: new Uint8Array(buffer, layout.isPentagon, tileCount)
  };
  validateDecodedGraph(graph);
  return graph;
}

export function isGraphRowCollection(value) {
  return Boolean(Array.isArray(value) || value?.[PACKED_GRAPH_ROWS] === true);
}

export function isGraphNeighborRow(value) {
  return Boolean(Array.isArray(value) || value instanceof Uint32Array);
}

export function geodesicGraphBakeByteLength(tileCount) {
  if (!Number.isInteger(tileCount) || tileCount <= 0) {
    throw new Error(`Invalid geodesic graph bake tile count: ${tileCount}`);
  }
  return geodesicGraphBakeLayout(tileCount).byteLength;
}

function packedGraphRows(values, counts) {
  if (!(values instanceof Uint32Array) || !(counts instanceof Uint8Array)) {
    throw new Error("Packed graph rows require typed values and counts");
  }
  if (values.length !== counts.length * GEODESIC_ROW_WIDTH) {
    throw new Error("Packed graph row values do not match their tile counts");
  }
  const target = Object.freeze({
    [PACKED_GRAPH_ROWS]: true,
    length: counts.length,
    values,
    counts,
    row(tileId) {
      return packedGraphRow(values, counts, tileId);
    },
    *[Symbol.iterator]() {
      for (let tileId = 0; tileId < counts.length; tileId++) {
        yield packedGraphRow(values, counts, tileId);
      }
    }
  });
  return new Proxy(target, {
    get(object, property, receiver) {
      if (typeof property === "string" && /^(0|[1-9][0-9]*)$/.test(property)) {
        return packedGraphRow(values, counts, Number(property));
      }
      return Reflect.get(object, property, receiver);
    }
  });
}

function packedGraphRow(values, counts, tileId) {
  if (!Number.isInteger(tileId) || tileId < 0 || tileId >= counts.length) return undefined;
  const count = counts[tileId];
  return values.subarray(tileId * GEODESIC_ROW_WIDTH, tileId * GEODESIC_ROW_WIDTH + count);
}

function geodesicGraphBakeLayout(tileCount) {
  let offset = GEODESIC_BAKE_HEADER_BYTES;
  const centers = offset;
  offset += tileCount * 3 * Float32Array.BYTES_PER_ELEMENT;
  const latDeg = offset;
  offset += tileCount * Float32Array.BYTES_PER_ELEMENT;
  const lonDeg = offset;
  offset += tileCount * Float32Array.BYTES_PER_ELEMENT;
  const neighbors = offset;
  offset += tileCount * GEODESIC_ROW_WIDTH * Uint32Array.BYTES_PER_ELEMENT;
  const edgeNeighbors = offset;
  offset += tileCount * GEODESIC_ROW_WIDTH * Uint32Array.BYTES_PER_ELEMENT;
  const edgeCount = offset;
  offset += tileCount;
  const isPentagon = offset;
  offset += tileCount;
  return { centers, latDeg, lonDeg, neighbors, edgeNeighbors, edgeCount, isPentagon, byteLength: offset };
}

function validateGraphForBake(graph) {
  if (!graph || !Number.isInteger(graph.subdivisions) || !Number.isInteger(graph.tileCount)) {
    throw new Error("Geodesic graph bake requires subdivisions and a tile count");
  }
  const tileCount = graph.tileCount;
  if (!(graph.centers instanceof Float32Array) || graph.centers.length !== tileCount * 3 ||
      !(graph.latDeg instanceof Float32Array) || graph.latDeg.length !== tileCount ||
      !(graph.lonDeg instanceof Float32Array) || graph.lonDeg.length !== tileCount ||
      !(graph.edgeCount instanceof Uint8Array) || graph.edgeCount.length !== tileCount ||
      !(graph.isPentagon instanceof Uint8Array) || graph.isPentagon.length !== tileCount ||
      !isGraphRowCollection(graph.neighbors) || graph.neighbors.length !== tileCount ||
      !isGraphRowCollection(graph.edgeNeighbors) || graph.edgeNeighbors.length !== tileCount) {
    throw new Error("Geodesic graph bake received incomplete graph arrays");
  }
}

function validateDecodedGraph(graph) {
  let pentagons = 0;
  for (let tileId = 0; tileId < graph.tileCount; tileId++) {
    const count = graph.edgeCount[tileId];
    if (count !== 5 && count !== 6) {
      throw new Error(`Geodesic graph tile ${tileId} has ${count} neighbors`);
    }
    if (graph.neighbors[tileId].some((neighborId) => neighborId >= graph.tileCount) ||
        graph.edgeNeighbors[tileId].some((neighborId) => neighborId >= graph.tileCount)) {
      throw new Error(`Geodesic graph tile ${tileId} has an out-of-range neighbor`);
    }
    if (graph.isPentagon[tileId]) pentagons++;
  }
  if (pentagons !== 12) throw new Error(`Geodesic graph bake has ${pentagons} pentagons; expected 12`);
}

function writeNeighborRow(target, tileId, row, label) {
  if (!isGraphNeighborRow(row) || row.length < 5 || row.length > GEODESIC_ROW_WIDTH) {
    throw new Error(`Geodesic tile ${tileId} has an invalid ${label} row`);
  }
  const offset = tileId * GEODESIC_ROW_WIDTH;
  for (let index = 0; index < row.length; index++) target[offset + index] = row[index];
}

function writeMagic(bytes, magic) {
  for (let index = 0; index < magic.length; index++) bytes[index] = magic.charCodeAt(index);
}

function requireMagic(bytes, magic) {
  for (let index = 0; index < magic.length; index++) {
    if (bytes[index] !== magic.charCodeAt(index)) {
      throw new Error(`Invalid geodesic graph bake magic; expected ${magic}`);
    }
  }
}
