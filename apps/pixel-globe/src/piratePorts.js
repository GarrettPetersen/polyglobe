import { requireCityId } from "./entityIds.js";

export function buildPlayerPirateHideoutPorts(hideouts) {
  if (!Array.isArray(hideouts)) throw new Error("Pirate hideout ports require a hideout list");
  const seen = new Set();
  return hideouts.map(port => {
    const cityId = requireCityId(port, "Pirate haven");
    if (seen.has(cityId)) throw new Error(`Duplicate pirate haven: ${cityId}`);
    seen.add(cityId);
    if (!port.isPirateHideout || port.factionId !== "pirate" || !Number.isInteger(port.tileId)) {
      throw new Error(`Pirate haven must be an independently placed pirate settlement: ${cityId}`);
    }
    return Object.freeze({ ...port, portId: cityId, portAlias: port.displayCity || port.city });
  });
}
