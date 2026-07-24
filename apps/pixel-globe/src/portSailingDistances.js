export const PORT_SAILING_DISTANCE_FORMAT = "pixel-globe-port-sailing-distances";
export const PORT_SAILING_DISTANCE_VERSION = 2;

export function parsePortSailingDistances(raw, expected = {}) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Port sailing distance bake must be a JSON object");
  }
  if (raw.format !== PORT_SAILING_DISTANCE_FORMAT) {
    throw new Error(`Unknown port sailing distance format: ${raw.format}`);
  }
  if (raw.version !== PORT_SAILING_DISTANCE_VERSION) {
    throw new Error(`Unsupported port sailing distance version: ${raw.version}`);
  }
  if (!Number.isInteger(raw.subdivisions)) throw new Error("Port sailing distance bake has no subdivision level");
  if (expected.subdivisions !== undefined && raw.subdivisions !== expected.subdivisions) {
    throw new Error(
      `Port sailing distance subdivision mismatch: bake ${raw.subdivisions}, world ${expected.subdivisions}. ` +
      "Run npm run render:port-sailing-distances."
    );
  }
  if (typeof raw.earthCacheVersion !== "string" || raw.earthCacheVersion === "") {
    throw new Error("Port sailing distance bake has no Earth cache version");
  }
  if (expected.earthCacheVersion !== undefined && raw.earthCacheVersion !== String(expected.earthCacheVersion)) {
    throw new Error(
      `Port sailing distance Earth cache mismatch: bake ${raw.earthCacheVersion}, world ${expected.earthCacheVersion}. ` +
      "Run npm run render:port-sailing-distances."
    );
  }
  if (!Number.isInteger(raw.referenceWeatherDay) || raw.referenceWeatherDay < 0 || raw.referenceWeatherDay >= 365) {
    throw new Error(`Port sailing distance bake has an invalid reference weather day: ${raw.referenceWeatherDay}`);
  }
  if (!Array.isArray(raw.endpoints) || raw.endpoints.length === 0) {
    throw new Error("Port sailing distance bake has no endpoints");
  }
  if (!Array.isArray(raw.distancesKm) || raw.distancesKm.length !== raw.endpoints.length) {
    throw new Error("Port sailing distance matrix does not match its endpoint count");
  }

  const indexByTileId = new Map();
  const endpoints = raw.endpoints.map((endpoint, index) => {
    if (!Number.isInteger(endpoint?.tileId) || endpoint.tileId < 0) {
      throw new Error(`Port sailing endpoint ${index} has an invalid tile id`);
    }
    if (indexByTileId.has(endpoint.tileId)) {
      throw new Error(`Port sailing distance bake contains duplicate tile ${endpoint.tileId}`);
    }
    if (typeof endpoint.name !== "string" || endpoint.name.trim() === "") {
      throw new Error(`Port sailing endpoint ${endpoint.tileId} has no name`);
    }
    if (endpoint.kind !== "port" && endpoint.kind !== "colony") {
      throw new Error(`Port sailing endpoint ${endpoint.tileId} has invalid kind: ${endpoint.kind}`);
    }
    indexByTileId.set(endpoint.tileId, index);
    return Object.freeze({
      tileId: endpoint.tileId,
      name: endpoint.name,
      country: String(endpoint.country || ""),
      kind: endpoint.kind
    });
  });

  const distancesKm = raw.distancesKm.map((row, rowIndex) => {
    if (!Array.isArray(row) || row.length !== endpoints.length) {
      throw new Error(`Port sailing distance row ${rowIndex} has the wrong length`);
    }
    return Object.freeze(row.map((distance, columnIndex) => {
      if (distance === null && rowIndex !== columnIndex) return null;
      if (!Number.isInteger(distance) || distance < 0) {
        throw new Error(`Invalid port sailing distance at ${rowIndex},${columnIndex}: ${distance}`);
      }
      if (rowIndex === columnIndex && distance !== 0) {
        throw new Error(`Port sailing distance diagonal ${rowIndex} must be zero`);
      }
      return distance;
    }));
  });
  for (let a = 0; a < distancesKm.length; a++) {
    for (let b = a + 1; b < distancesKm.length; b++) {
      if (distancesKm[a][b] !== distancesKm[b][a]) {
        throw new Error(`Port sailing distance matrix is asymmetric at ${a},${b}`);
      }
    }
  }

  return Object.freeze({
    format: raw.format,
    version: raw.version,
    subdivisions: raw.subdivisions,
    earthCacheVersion: raw.earthCacheVersion,
    referenceWeatherDay: raw.referenceWeatherDay,
    endpoints: Object.freeze(endpoints),
    distancesKm: Object.freeze(distancesKm),
    indexByTileId
  });
}

export function portSailingDistanceKm(bake, origin, destination) {
  assertParsedBake(bake);
  const originTileId = requiredTileId(origin, "origin");
  const destinationTileId = requiredTileId(destination, "destination");
  if (originTileId === destinationTileId) return 0;
  const originIndex = bake.indexByTileId.get(originTileId);
  const destinationIndex = bake.indexByTileId.get(destinationTileId);
  if (originIndex === undefined) {
    throw new Error(`Port sailing distance bake has no origin tile ${originTileId}; run npm run render:port-sailing-distances`);
  }
  if (destinationIndex === undefined) {
    throw new Error(`Port sailing distance bake has no destination tile ${destinationTileId}; run npm run render:port-sailing-distances`);
  }
  return bake.distancesKm[originIndex][destinationIndex];
}

export function assertPortSailingDistanceCoverage(bake, records) {
  assertParsedBake(bake);
  if (!Array.isArray(records)) throw new Error("Port sailing coverage validation requires endpoint records");
  const requiredTileIds = new Set();
  for (const record of records) {
    const tileId = requiredTileId(record, "required endpoint");
    if (requiredTileIds.has(tileId)) throw new Error(`Duplicate required port sailing endpoint tile: ${tileId}`);
    requiredTileIds.add(tileId);
    if (!bake.indexByTileId.has(tileId)) {
      const name = record.displayCity || record.city || record.name || tileId;
      throw new Error(`Port sailing distance bake is missing ${name} on tile ${tileId}; run npm run render:port-sailing-distances`);
    }
  }
  if (requiredTileIds.size !== bake.endpoints.length) {
    const stale = bake.endpoints.filter((endpoint) => !requiredTileIds.has(endpoint.tileId));
    throw new Error(
      `Port sailing distance bake has ${stale.length} stale endpoint(s): ` +
      `${stale.map((endpoint) => endpoint.name).join(", ")}. Run npm run render:port-sailing-distances.`
    );
  }
}

function assertParsedBake(bake) {
  if (!(bake?.indexByTileId instanceof Map) || !Array.isArray(bake.distancesKm)) {
    throw new Error("Port sailing distances have not been parsed");
  }
}

function requiredTileId(record, label) {
  const tileId = Number.isInteger(record) ? record : record?.tileId;
  if (!Number.isInteger(tileId) || tileId < 0) throw new Error(`Port sailing ${label} requires a tile id`);
  return tileId;
}
