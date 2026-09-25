// Baked port-to-port distance divided by cruising speed. Wind can lengthen the
// passage, so the spoken sail time rounds up and the spoken stores round down.
export const WAYPOINT_PROVISION_WARNING_DECISION_KEY = "navigation.provision-shortfall-warning";

export function waypointProvisionWarningSeen(decisions) {
  assertDecisionMemory(decisions);
  const value = decisions[WAYPOINT_PROVISION_WARNING_DECISION_KEY] || 0;
  return Number.isFinite(value) && value > 0;
}

export function rememberWaypointProvisionWarning(decisions) {
  assertDecisionMemory(decisions);
  decisions[WAYPOINT_PROVISION_WARNING_DECISION_KEY] = 1;
}

export function waypointProvisionShortfall({
  distanceKm,
  cruisingKmPerGameDay,
  foodDays,
  drinkDays,
  alreadyWarned
}) {
  if (typeof alreadyWarned !== "boolean") {
    throw new Error(`Waypoint provision warning requires a seen flag: ${alreadyWarned}`);
  }
  if (alreadyWarned) return null;
  const sailDays = sailDayCount(distanceKm, cruisingKmPerGameDay);
  if (sailDays === null) return null;
  const provisionDays = wholeProvisionDays(foodDays, drinkDays);
  if (sailDays <= provisionDays) return null;
  return Object.freeze({ sailDays, provisionDays });
}

export function provisionShortfallWarningText(cityName, sailDayCount, provisionDayCount) {
  if (typeof cityName !== "string" || cityName.trim() === "") {
    throw new Error("Provision warning requires a destination name");
  }
  if (!Number.isInteger(sailDayCount) || sailDayCount < 1) {
    throw new Error(`Provision warning requires a positive sail day count: ${sailDayCount}`);
  }
  if (!Number.isInteger(provisionDayCount) || provisionDayCount < 0) {
    throw new Error(`Provision warning requires a provision day count: ${provisionDayCount}`);
  }
  return `${cityName.trim()} is about ${sailDayCount} days' sail, and we only have enough provisions for ${provisionDayCount} days. We'll need to change loadouts or plan to stop for supplies en route.`;
}

function sailDayCount(distanceKm, cruisingKmPerGameDay) {
  if (distanceKm === null) return null;
  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    throw new Error(`Waypoint sail estimate requires a distance in kilometers: ${distanceKm}`);
  }
  if (!Number.isFinite(cruisingKmPerGameDay) || cruisingKmPerGameDay <= 0) {
    throw new Error(`Waypoint sail estimate requires cruising kilometers per day: ${cruisingKmPerGameDay}`);
  }
  if (distanceKm === 0) return 0;
  return Math.max(1, Math.ceil(distanceKm / cruisingKmPerGameDay));
}

function wholeProvisionDays(foodDays, drinkDays) {
  if (!Number.isFinite(foodDays) || foodDays < 0 || !Number.isFinite(drinkDays) || drinkDays < 0) {
    throw new Error(`Waypoint provision estimate requires food and drink days: ${foodDays}, ${drinkDays}`);
  }
  return Math.floor(Math.min(foodDays, drinkDays));
}

function assertDecisionMemory(decisions) {
  if (!decisions || typeof decisions !== "object" || Array.isArray(decisions)) {
    throw new Error("Waypoint provision warning requires decision memory");
  }
}
