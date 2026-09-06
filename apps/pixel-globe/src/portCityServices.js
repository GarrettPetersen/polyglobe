export function portCityServiceProfile(city) {
  if (!city || typeof city !== "object") throw new Error("Port services require a city");
  if (city.settlementType !== undefined &&
      (typeof city.settlementType !== "string" || city.settlementType === "")) {
    throw new Error("Port services require a settlement type");
  }
  const sparseVillage = (city.settlementType || "city") === "village";
  if ((city.population !== undefined || sparseVillage) &&
      (!Number.isFinite(city.population) || city.population < 0)) {
    throw new Error("Port services require a non-negative population");
  }
  return Object.freeze({
    // Villages host travelers and recruit crew in their communal house.
    inn: true,
    smith: !sparseVillage,
    market: true,
    shipyard: !sparseVillage || city.population >= 2500
  });
}
