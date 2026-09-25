import assert from "node:assert/strict";
import test from "node:test";

import {
  WAYPOINT_PROVISION_WARNING_DECISION_KEY,
  provisionShortfallWarningText,
  rememberWaypointProvisionWarning,
  waypointProvisionShortfall,
  waypointProvisionWarningSeen
} from "./waypointProvisionWarning.js";

const WITHIN_REACH = Object.freeze({
  distanceKm: 200,
  cruisingKmPerGameDay: 100,
  foodDays: 8.4,
  drinkDays: 12
});

const BEYOND_REACH = Object.freeze({
  distanceKm: 450,
  cruisingKmPerGameDay: 100,
  foodDays: 8.4,
  drinkDays: 3.9
});

test("the first waypoint beyond current food or water warns once", () => {
  const decisions = {};
  const withinReach = considerWaypoint(decisions, WITHIN_REACH);
  assert.equal(withinReach, null);
  assert.equal(waypointProvisionWarningSeen(decisions), false);

  const first = considerWaypoint(decisions, BEYOND_REACH);
  assert.deepEqual(first, { sailDays: 5, provisionDays: 3 });
  assert.equal(decisions[WAYPOINT_PROVISION_WARNING_DECISION_KEY], 1);
  assert.equal(considerWaypoint(decisions, {
    ...BEYOND_REACH,
    distanceKm: 900
  }), null);

  assert.equal(
    provisionShortfallWarningText("Lisbon", first.sailDays, first.provisionDays),
    "Lisbon is about 5 days' sail, and we only have enough provisions for 3 days. We'll need to change loadouts or plan to stop for supplies en route."
  );
});

test("water and food each limit the passage, and an unknown distance does not invent one", () => {
  assert.deepEqual(waypointProvisionShortfall({
    distanceKm: 301,
    cruisingKmPerGameDay: 100,
    foodDays: 20,
    drinkDays: 3.2,
    alreadyWarned: false
  }), { sailDays: 4, provisionDays: 3 });
  assert.deepEqual(waypointProvisionShortfall({
    distanceKm: 301,
    cruisingKmPerGameDay: 100,
    foodDays: 2.8,
    drinkDays: 40,
    alreadyWarned: false
  }), { sailDays: 4, provisionDays: 2 });
  assert.equal(waypointProvisionShortfall({
    ...BEYOND_REACH,
    distanceKm: null,
    alreadyWarned: false
  }), null);
  assert.equal(waypointProvisionShortfall({
    ...BEYOND_REACH,
    distanceKm: 0,
    alreadyWarned: false
  }), null);
  assert.equal(waypointProvisionShortfall({
    distanceKm: 250,
    cruisingKmPerGameDay: 100,
    foodDays: 3.2,
    drinkDays: 9,
    alreadyWarned: false
  }), null);
});

test("a provision warning rejects an unusable estimate", () => {
  assert.throws(() => waypointProvisionShortfall({
    ...BEYOND_REACH,
    alreadyWarned: 1
  }), /seen flag/);
  assert.throws(() => waypointProvisionShortfall({
    ...BEYOND_REACH,
    distanceKm: Number.NaN,
    alreadyWarned: false
  }), /distance in kilometers/);
  assert.throws(() => waypointProvisionShortfall({
    ...BEYOND_REACH,
    cruisingKmPerGameDay: 0,
    alreadyWarned: false
  }), /cruising kilometers per day/);
  assert.throws(() => provisionShortfallWarningText("  ", 4, 2), /destination name/);
  assert.throws(() => rememberWaypointProvisionWarning(null), /decision memory/);
});

function considerWaypoint(decisions, estimate) {
  const shortfall = waypointProvisionShortfall({
    ...estimate,
    alreadyWarned: waypointProvisionWarningSeen(decisions)
  });
  if (!shortfall) return null;
  rememberWaypointProvisionWarning(decisions);
  return shortfall;
}
