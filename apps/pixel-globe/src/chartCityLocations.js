import { requireCityId } from "./entityIds.js";

// A revealed cove and its host city are separate interaction locations. They
// deliberately share the host's cityId/portId for markets, routes and saves.
export function chartCityLocationId(city) {
  const cityId = requireCityId(city, "Chart city location");
  return city.isPirateHideout === true ? `pirate-hideout:${cityId}` : cityId;
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
