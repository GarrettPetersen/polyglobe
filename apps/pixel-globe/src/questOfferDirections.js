import { initialBearingDeg } from "./worldDistance.js";

const COMPASS_POINTS = Object.freeze([
  "north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"
]);

// This is the destination's bearing, not a sailing course through land. Keep
// the offer's existing baked sailing distance and eligibility explanation.
export function questOfferDirections(view, {
  origin,
  citiesById,
  passengerQuest = null,
  formatDistanceDirection = defaultDistanceDirection
}) {
  if (typeof formatDistanceDirection !== "function") {
    throw new Error("Quest offer directions require a distance-direction formatter");
  }
  return {
    ...view,
    options: view.options.map(option => {
      const action = option.action;
      const quest = action.type === "accept-passenger" ? passengerQuest
        : ["accept-quest", "open-passenger"].includes(action.type) ? action.quest : null;
      const cityId = quest?.destinationCityId || quest?.targetCityId;
      if (!cityId) return option; // Local tasks have no travel destination.
      const destination = citiesById.get(cityId);
      if (!destination) throw new Error(`Quest offer ${quest.id} has no destination city: ${cityId}`);
      const bearing = initialBearingDeg(origin, destination);
      const direction = COMPASS_POINTS[Math.round(bearing / 45) % COMPASS_POINTS.length];
      const distanceKm = quest.distanceKm;
      if (!Number.isFinite(distanceKm) || distanceKm < 0) {
        throw new Error(`Quest offer ${quest.id} has invalid distance: ${distanceKm}`);
      }
      const distance = `${Math.round(distanceKm).toLocaleString("en-US")} km`;
      const route = formatDistanceDirection({ distanceKm, direction });
      if (typeof route !== "string" || route.length === 0) {
        throw new Error(`Quest offer ${quest.id} produced no distance-direction text`);
      }
      const detail = option.detail
        ? option.detail.includes(distance)
          ? option.detail.replace(distance, route)
          : `${route} / ${option.detail}`
        : route;
      return { ...option, detail };
    })
  };
}

function defaultDistanceDirection({ distanceKm, direction }) {
  return `${Math.round(distanceKm).toLocaleString("en-US")} km to the ${direction}`;
}
