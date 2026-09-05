import { CITY_DATA_URL } from "./cityCatalogData.js";
import { fetchStaticAsset } from "./staticAssetFetch.js";

// The source server reads the authored files. Production replaces this module
// with the exact catalog bytes inside each JavaScript bundle, so a cached game
// can never combine its city policies with a later deployment's roads or scenes.
export async function loadCityCatalogCsv() {
  return (await catalogResponse(CITY_DATA_URL, "city dataset")).text();
}

export async function loadLandRoadData() {
  return (await catalogResponse("/assets/data/land-roads.json", "land roads")).json();
}

export async function loadSailingDistanceData() {
  return (await catalogResponse("/assets/data/port-sailing-distances.json", "port sailing distances")).json();
}

export async function loadCitySceneCatalog() {
  return (await catalogResponse("/city-visualizer/data/cities.json", "city scene catalog")).json();
}

async function catalogResponse(path, label) {
  const response = await fetchStaticAsset(path, { label });
  if (!response.ok) throw new Error(`Failed to load ${label}: HTTP ${response.status}`);
  return response;
}
