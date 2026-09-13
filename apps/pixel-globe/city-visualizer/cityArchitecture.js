import { settlementTypeForCity } from "../src/settlementTypes.js";
import { portCityServiceProfile } from "../src/portCityServices.js";

export const EARTHEN_VILLAGE_BUILDING_STYLE = "earthen-village";
export const JAPANESE_BUILDING_STYLE = "japanese";
export const WOODEN_PALISADE_STYLE = "wooden-palisade";

// A visual development tier, not a change to the settlement's combat strength.
export function cityUsesWoodenPalisade(city) {
  if (city.isPirateHideout === true) return true;
  if (city.cityId === "roanoke|united states of america") return true;
  const foundingType = city.colonialFoundingType || city.colonialFounding?.type;
  return foundingType === "settler-colony" && city.population >= 500 && city.population < 25000;
}

const HOUSING_LAYERS = new Set(["Home", "Home 2"]);
const SERVICE_BUILDING_LAYERS = new Set(["Inn", "Smith"]);
const FORTIFICATION_LAYERS = new Set([
  "Far Castle",
  "Gate",
  "Gate Front Edge",
  "Near Castle"
]);
const SETTLEMENT_FORMS = new Set(["sparse-village", "urban"]);

export function deriveCityArchitectureProfile(city) {
  requireCityArchitectureSource(city);
  if (city.isPirateHideout === true) {
    const style = city.pirateArchitectureStyle;
    return architectureProfile({ housingStyle: style, serviceStyle: style,
      fortificationStyle: WOODEN_PALISADE_STYLE, settlementForm: "sparse-village" });
  }
  const settlementType = settlementTypeForCity(city);
  const sparseEarthenVillage = settlementType === "village";
  const swahiliCoast = city.manualRegion === "swahili-coast";
  const regionalStyle = city.country === "Japan"
    ? JAPANESE_BUILDING_STYLE
    : city.cityType;
  return architectureProfile({
    housingStyle: sparseEarthenVillage || swahiliCoast
      ? EARTHEN_VILLAGE_BUILDING_STYLE
      : regionalStyle,
    serviceStyle: swahiliCoast ? "islamic-desert" : regionalStyle,
    fortificationStyle: cityUsesWoodenPalisade(city) ? WOODEN_PALISADE_STYLE : swahiliCoast ? "islamic-desert" : regionalStyle,
    settlementForm: sparseEarthenVillage ? "sparse-village" : "urban"
  });
}

export function cityArchitectureProfile(city) {
  requireCityArchitectureSource(city);
  if (city.architecture === undefined) return deriveCityArchitectureProfile(city);
  return architectureProfile(city.architecture);
}

export function cityArchitectureStyleForLayer(city, layerName) {
  if (typeof layerName !== "string" || layerName === "") {
    throw new Error("City architecture requires a building layer");
  }
  const profile = cityArchitectureProfile(city);
  if (HOUSING_LAYERS.has(layerName)) return profile.housingStyle;
  if (SERVICE_BUILDING_LAYERS.has(layerName)) return profile.serviceStyle;
  if (FORTIFICATION_LAYERS.has(layerName)) return profile.fortificationStyle;
  return city.cityType;
}

export function deriveCityServiceProfile(city) {
  const architecture = cityArchitectureProfile(city);
  const sparseVillage = architecture.settlementForm === "sparse-village";
  if (sparseVillage && (!Number.isFinite(city.population) || city.population < 0)) {
    throw new Error("Sparse village services require a valid population");
  }
  return serviceProfile(portCityServiceProfile({
    ...city,
    settlementType: sparseVillage ? "village" : "city"
  }));
}

export function cityServiceProfile(city) {
  requireCityArchitectureSource(city);
  if (city.services === undefined) return deriveCityServiceProfile(city);
  return serviceProfile(city.services);
}

function architectureProfile({ housingStyle, serviceStyle, fortificationStyle, settlementForm }) {
  for (const [label, value] of [
    ["housing", housingStyle],
    ["service", serviceStyle],
    ["fortification", fortificationStyle]
  ]) {
    if (typeof value !== "string" || value === "") {
      throw new Error(`Invalid city ${label} architecture style`);
    }
  }
  if (!SETTLEMENT_FORMS.has(settlementForm)) {
    throw new Error(`Invalid city settlement form: ${settlementForm}`);
  }
  return Object.freeze({ housingStyle, serviceStyle, fortificationStyle, settlementForm });
}

function serviceProfile({ inn, smith, market, shipyard }) {
  const profile = { inn, smith, market, shipyard };
  for (const [service, available] of Object.entries(profile)) {
    if (typeof available !== "boolean") {
      throw new Error(`Invalid city ${service} service availability`);
    }
  }
  return Object.freeze(profile);
}

function requireCityArchitectureSource(city) {
  if (!city || typeof city !== "object" || typeof city.cityType !== "string" || city.cityType === "") {
    throw new Error("City architecture requires a city type");
  }
  if (
    city.settlementType !== undefined &&
    (typeof city.settlementType !== "string" || city.settlementType === "")
  ) {
    throw new Error("City architecture requires a settlement type");
  }
}
