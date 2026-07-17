export const LAND_ROAD_FORMAT = "pixel-globe-land-roads";
export const LAND_ROAD_VERSION = 1;

export function parseLandRoadNetwork(data, { subdivisions, earthCacheVersion } = {}) {
  if (!data || data.format !== LAND_ROAD_FORMAT || data.version !== LAND_ROAD_VERSION) {
    throw new Error("Unsupported land road network data");
  }
  if (data.subdivisions !== subdivisions || String(data.earthCacheVersion) !== String(earthCacheVersion)) {
    throw new Error(
      `Land road network targets Earth ${data.earthCacheVersion}/${data.subdivisions}, ` +
      `not ${earthCacheVersion}/${subdivisions}`
    );
  }
  if (!Array.isArray(data.cities) || !Array.isArray(data.routes) || data.cities.length === 0) {
    throw new Error("Land road network requires cities and routes");
  }
  const cityByTileId = new Map();
  for (const city of data.cities) {
    if (!Number.isInteger(city?.tileId) || city.tileId < 0 || typeof city.name !== "string" || city.name === "") {
      throw new Error(`Invalid road city: ${JSON.stringify(city)}`);
    }
    if (cityByTileId.has(city.tileId)) throw new Error(`Duplicate road city tile: ${city.tileId}`);
    cityByTileId.set(city.tileId, Object.freeze({ ...city }));
  }
  const routeById = new Map();
  const segmentsByTileId = new Map();
  const neighborRoutesByCityTileId = new Map([...cityByTileId.keys()].map((tileId) => [tileId, []]));
  for (const rawRoute of data.routes) {
    const route = validateRoadRoute(rawRoute, cityByTileId);
    if (routeById.has(route.id)) throw new Error(`Duplicate land road route: ${route.id}`);
    routeById.set(route.id, route);
    neighborRoutesByCityTileId.get(route.fromTileId).push(route);
    neighborRoutesByCityTileId.get(route.toTileId).push(route);
    for (let index = 1; index < route.tileIds.length; index++) {
      const segment = Object.freeze({
        id: `${route.id}:${index - 1}`,
        routeId: route.id,
        a: route.tileIds[index - 1],
        b: route.tileIds[index]
      });
      addIndexedSegment(segmentsByTileId, segment.a, segment);
      addIndexedSegment(segmentsByTileId, segment.b, segment);
    }
  }
  if (routeById.size === 0) throw new Error("Land road network contains no routes");
  return Object.freeze({
    format: data.format,
    version: data.version,
    subdivisions: data.subdivisions,
    earthCacheVersion: String(data.earthCacheVersion),
    cities: Object.freeze([...cityByTileId.values()]),
    routes: Object.freeze([...routeById.values()]),
    cityByTileId,
    routeById,
    segmentsByTileId,
    neighborRoutesByCityTileId
  });
}

function validateRoadRoute(rawRoute, cityByTileId) {
  if (!rawRoute || typeof rawRoute.id !== "string" || rawRoute.id === "" ||
      !Number.isInteger(rawRoute.fromTileId) || !Number.isInteger(rawRoute.toTileId) ||
      rawRoute.fromTileId === rawRoute.toTileId ||
      !cityByTileId.has(rawRoute.fromTileId) || !cityByTileId.has(rawRoute.toTileId) ||
      !Number.isFinite(rawRoute.distanceKm) || rawRoute.distanceKm <= 0 ||
      !Array.isArray(rawRoute.tileIds) || rawRoute.tileIds.length < 2 ||
      rawRoute.tileIds[0] !== rawRoute.fromTileId ||
      rawRoute.tileIds.at(-1) !== rawRoute.toTileId ||
      rawRoute.tileIds.some((tileId) => !Number.isInteger(tileId) || tileId < 0)) {
    throw new Error(`Invalid land road route: ${rawRoute?.id || "unknown"}`);
  }
  return Object.freeze({
    id: rawRoute.id,
    fromTileId: rawRoute.fromTileId,
    toTileId: rawRoute.toTileId,
    distanceKm: rawRoute.distanceKm,
    weightedCost: rawRoute.weightedCost,
    tileIds: Object.freeze([...rawRoute.tileIds])
  });
}

function addIndexedSegment(index, tileId, segment) {
  const segments = index.get(tileId) || [];
  segments.push(segment);
  index.set(tileId, segments);
}
