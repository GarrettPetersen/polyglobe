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
  "andean",
  "andean-coast",
  "sub-saharan"
]);

const ECONOMY_REGION_ID_SET = new Set(ECONOMY_REGION_IDS);
const NATIVE_NORTH_AMERICAN_COUNTRIES = new Set([
  "Canada",
  "Makah",
  "Nuu-chah-nulth",
  "United States of America"
]);
const INDIGENOUS_CARIBBEAN_COUNTRIES = new Set([
  "Bahamas"
]);
const COLONIAL_CARIBBEAN_COUNTRIES = new Set([
  "Barbados",
  "Bermuda",
  "Cuba",
  "Dominican Republic"
]);
const MESOAMERICAN_COUNTRIES = new Set([
  "Guatemala",
  "Mexico",
  "Panama"
]);

export function economyRegionForCity(city) {
  if (!city || typeof city !== "object") throw new Error("Economy region requires a city record");
  if (city.economyRegion !== undefined && city.economyRegion !== null) {
    return requiredEconomyRegionId(city.economyRegion);
  }
  if (NATIVE_NORTH_AMERICAN_COUNTRIES.has(city.country) ||
      city.manualRegion === "great-lakes" ||
      city.manualRegion === "northwest-coast" ||
      city.manualRegion === "ohio-valley") {
    return "native-north-american";
  }
  if (INDIGENOUS_CARIBBEAN_COUNTRIES.has(city.country)) return "caribbean-indigenous";
  if (COLONIAL_CARIBBEAN_COUNTRIES.has(city.country)) return "caribbean";
  if (MESOAMERICAN_COUNTRIES.has(city.country)) return "mesoamerican";
  if (city.country === "Brazil") return "brazilian-coast";
  if (city.manualRegion === "inca-coast") return "andean-coast";
  return requiredEconomyRegionId(city.cityType);
}

function requiredEconomyRegionId(value) {
  if (typeof value !== "string" || !ECONOMY_REGION_ID_SET.has(value)) {
    throw new Error(`Unknown economy region: ${value}`);
  }
  return value;
}
