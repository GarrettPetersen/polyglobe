import { requireCityId } from "./entityIds.js";

// Every settlement, including a pirate haven, owns its canonical chart identity.
export function chartCityLocationId(city) {
  return requireCityId(city, "Chart city location");
}

export function indexChartCityLocations(calls) {
  const index = new Map();
  for (const call of calls) {
    const locationId = chartCityLocationId(call);
    if (index.has(locationId)) throw new Error(`Chart contains duplicate city location: ${locationId}`);
    index.set(locationId, call);
  }
  return index;
}
