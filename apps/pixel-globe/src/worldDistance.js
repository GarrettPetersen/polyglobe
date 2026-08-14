export const EARTH_RADIUS_KM = 6371;
export const MAX_GREAT_CIRCLE_DISTANCE_KM = Math.PI * EARTH_RADIUS_KM;

export function greatCircleDistanceKm(a, b) {
  assertCoordinate(a, "origin");
  assertCoordinate(b, "destination");
  const latA = degreesToRadians(a.lat);
  const latB = degreesToRadians(b.lat);
  const dLat = latB - latA;
  const dLon = degreesToRadians(b.lon - a.lon);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat + Math.cos(latA) * Math.cos(latB) * sinLon * sinLon;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

export function initialBearingDeg(a, b) {
  assertCoordinate(a, "bearing origin");
  assertCoordinate(b, "bearing destination");
  const fromLat = degreesToRadians(a.lat);
  const toLat = degreesToRadians(b.lat);
  const deltaLon = degreesToRadians(b.lon - a.lon);
  const y = Math.sin(deltaLon) * Math.cos(toLat);
  const x = Math.cos(fromLat) * Math.sin(toLat) -
    Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLon);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function assertCoordinate(point, label) {
  if (!Number.isFinite(point?.lat) || !Number.isFinite(point?.lon)) {
    throw new Error(`Great-circle ${label} requires finite latitude and longitude`);
  }
}

function degreesToRadians(value) {
  return value * Math.PI / 180;
}
