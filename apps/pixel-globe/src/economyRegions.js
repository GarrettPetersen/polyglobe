import { cityTerritoryId } from "./entityIds.js";

export const ECONOMY_REGION_IDS = Object.freeze([
  "northern-european",
  "mediterranean",
  "islamic-desert",
  "east-asian",
  "south-asian",
  "southeast-asian",
  "polynesian",
  "mesoamerican",
  "native-north-american",
  "caribbean-indigenous",
  "caribbean",
  "brazilian-coast",
  "rio-de-la-plata",
  "temperate-american-colony",
  "tropical-american-colony",
  "atlantic-island-colony",
  "andean",
  "andean-coast",
  "sub-saharan"
]);

const ECONOMY_REGION_ID_SET = new Set(ECONOMY_REGION_IDS);
const NATIVE_NORTH_AMERICAN_TERRITORIES = new Set([
  "canada",
  "makah",
  "nuu-chah-nulth",
  "united states of america"
]);
const INDIGENOUS_CARIBBEAN_TERRITORIES = new Set([
  "bahamas"
]);
const COLONIAL_CARIBBEAN_TERRITORIES = new Set([
  "barbados",
  "bermuda",
  "cuba",
  "dominican republic"
]);
const MESOAMERICAN_TERRITORIES = new Set([
  "guatemala",
  "mexico",
  "panama"
]);

export function economyRegionForCity(city) {
  if (!city || typeof city !== "object") throw new Error("Economy region requires a city record");
  const territoryId = cityTerritoryId(city, "Economy region city");
  if (city.economyRegion !== undefined && city.economyRegion !== null) {
    return requiredEconomyRegionId(city.economyRegion);
  }
  if (NATIVE_NORTH_AMERICAN_TERRITORIES.has(territoryId) ||
      city.manualRegion === "great-lakes" ||
      city.manualRegion === "northwest-coast" ||
      city.manualRegion === "ohio-valley") {
    return "native-north-american";
  }
  if (INDIGENOUS_CARIBBEAN_TERRITORIES.has(territoryId)) return "caribbean-indigenous";
  if (COLONIAL_CARIBBEAN_TERRITORIES.has(territoryId)) return "caribbean";
  if (MESOAMERICAN_TERRITORIES.has(territoryId)) return "mesoamerican";
  if (territoryId === "brazil") return "brazilian-coast";
  if (city.manualRegion === "inca-coast") return "andean-coast";
  return requiredEconomyRegionId(city.cityType);
}

function requiredEconomyRegionId(value) {
  if (typeof value !== "string" || !ECONOMY_REGION_ID_SET.has(value)) {
    throw new Error(`Unknown economy region: ${value}`);
  }
  return value;
}
