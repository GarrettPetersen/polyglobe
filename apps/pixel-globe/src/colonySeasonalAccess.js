import { COLONY_SEASONAL_ACCESS } from "./colonySeasonalAccessData.js";

export function colonySeasonalAccessWarning(cityId) {
  const access = COLONY_SEASONAL_ACCESS[cityId];
  if (!access) throw new Error(`Colony is missing its seasonal sailing access bake: ${cityId}`);
  return access.blockedDays.length > 0
    ? "Captain, ice closes the passage to this settlement for part of the year. Bring the stores before the freeze, lest you have to wait for the thaw."
    : "";
}
