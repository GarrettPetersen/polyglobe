import { WORLD_DISCOVERY_SPECS } from "../src/discoveries.js";
import { greatCircleDistanceKm } from "../src/worldDistance.js";

export const CITY_HORIZON_LANDMARK = Object.freeze({
  PYRAMID: "pyramid"
});

export const CITY_PYRAMID_VISIBILITY_RADIUS_KM = 50;

const CITY_HORIZON_LANDMARK_IDS = new Set(Object.values(CITY_HORIZON_LANDMARK));

const PYRAMID_DISCOVERY_IDS = Object.freeze([
  "landmark-great-pyramid",
  "landmark-pyramids-of-meroe"
]);

const pyramidSites = Object.freeze(PYRAMID_DISCOVERY_IDS.map((discoveryId) => {
  const discovery = WORLD_DISCOVERY_SPECS.find(({ id }) => id === discoveryId);
  if (!discovery) throw new Error(`Missing canonical pyramid discovery: ${discoveryId}`);
  return Object.freeze({ id: discovery.id, lat: discovery.lat, lon: discovery.lon });
}));

export function cityHorizonLandmarks(city) {
  if (!city || typeof city !== "object") {
    throw new Error("City horizon landmarks require a city record");
  }
  if (!Number.isFinite(city.lat) || !Number.isFinite(city.lon)) {
    throw new Error(`City horizon landmarks require finite coordinates: ${city.cityId || "unknown city"}`);
  }
  const pyramidVisible = pyramidSites.some((site) => (
    greatCircleDistanceKm(city, site) <= CITY_PYRAMID_VISIBILITY_RADIUS_KM
  ));
  return Object.freeze(pyramidVisible ? [CITY_HORIZON_LANDMARK.PYRAMID] : []);
}

export function cityHasHorizonLandmark(city, landmarkId) {
  if (!CITY_HORIZON_LANDMARK_IDS.has(landmarkId)) {
    throw new Error(`Unknown city horizon landmark: ${landmarkId}`);
  }
  if (!Array.isArray(city?.horizonLandmarks)) {
    throw new Error(`City has no explicit horizon landmark list: ${city?.cityId || "unknown city"}`);
  }
  const uniqueLandmarks = new Set(city.horizonLandmarks);
  if (uniqueLandmarks.size !== city.horizonLandmarks.length) {
    throw new Error(`City has duplicate horizon landmarks: ${city.cityId || "unknown city"}`);
  }
  for (const candidateId of uniqueLandmarks) {
    if (!CITY_HORIZON_LANDMARK_IDS.has(candidateId)) {
      throw new Error(`City has unknown horizon landmark ${candidateId}: ${city.cityId || "unknown city"}`);
    }
  }
  return uniqueLandmarks.has(landmarkId);
}
