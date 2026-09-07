// Settlement form describes civic institutions and buildings, not population,
// sovereignty, continent, or a judgment about the people who live there.
export const SETTLEMENT_TYPES = Object.freeze(["city", "town", "village"]);

export function settlementTypeForCity(city) {
  if (!city || typeof city !== "object") throw new Error("Settlement type requires a city");
  const type = city.settlementType === undefined ? "city" : city.settlementType;
  if (!SETTLEMENT_TYPES.includes(type)) throw new Error(`Unknown settlement type: ${type}`);
  return type;
}
