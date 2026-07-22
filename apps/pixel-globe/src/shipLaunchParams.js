export const START_SHIP_QUERY_PARAM = "startShip";

export function startShipSlugFromSearch(search, knownShipSlugs) {
  if (!knownShipSlugs || typeof knownShipSlugs.has !== "function") {
    throw new Error("Starting ship query requires a ship slug registry");
  }
  const requested = new URLSearchParams(search).get(START_SHIP_QUERY_PARAM);
  if (!requested) return null;
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(requested)) {
    throw new Error(`Invalid starting ship type: ${requested}`);
  }
  if (!knownShipSlugs.has(requested)) {
    throw new Error(`Unknown starting ship type: ${requested}`);
  }
  return requested;
}
