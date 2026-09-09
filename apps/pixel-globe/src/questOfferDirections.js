import { initialBearingDeg } from "./worldDistance.js";

const COMPASS_POINTS = Object.freeze(["N", "NE", "E", "SE", "S", "SW", "W", "NW"]);

// This is the destination's bearing, not a sailing course through land. Keep
// the offer's existing baked sailing distance and eligibility explanation.
export function questOfferDirections(view, { origin, citiesById, passengerQuest = null }) {
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
      const heading = `${direction} ${Math.round(bearing) % 360}°`;
      return { ...option, detail: option.detail ? `${option.detail} / ${heading}` : heading };
    })
  };
}
