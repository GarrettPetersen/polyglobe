import {
  SHIP_CANNON_LAYOUT_BROADSIDE,
  SHIP_CANNON_LAYOUT_FORWARD
} from "./shipStats.js";
import {
  createNavalBroadsideVolley,
  createNavalForwardVolley,
  navalBroadsideSideForTarget,
  navalForwardTargetIsInArc
} from "./navalBroadsideVolley.js";

const BATTERY_SIDES = Object.freeze(["port", "starboard"]);

export function navalCannonVolleyCount(shipStats) {
  validateCannonLayout(shipStats);
  if (!Number.isInteger(shipStats.cannons) || shipStats.cannons <= 0) {
    throw new Error(`Cannon volley requires a positive cannon count: ${shipStats.cannons}`);
  }
  return shipStats.cannonLayout === SHIP_CANNON_LAYOUT_FORWARD
    ? shipStats.cannons
    : Math.max(1, Math.ceil(shipStats.cannons / 2));
}

export function cannonBatteryIsReady(cooldowns, shipStats, requestedSide) {
  validateBatteryRequest(cooldowns, shipStats, requestedSide);
  return batterySidesForLayout(shipStats.cannonLayout, requestedSide)
    .every((sideName) => cooldowns[sideName] <= 0);
}

export function reloadCannonBattery(cooldowns, shipStats, requestedSide, reloadSeconds) {
  validateBatteryRequest(cooldowns, shipStats, requestedSide);
  if (!Number.isFinite(reloadSeconds) || reloadSeconds <= 0) {
    throw new Error(`Invalid cannon reload duration: ${reloadSeconds}`);
  }
  for (const sideName of batterySidesForLayout(shipStats.cannonLayout, requestedSide)) {
    cooldowns[sideName] = reloadSeconds;
  }
}

export function createNavalCannonVolley({ shipStats, sideName, ...volleyInput }) {
  validateCannonLayout(shipStats);
  validateSide(sideName);
  return shipStats.cannonLayout === SHIP_CANNON_LAYOUT_FORWARD
    ? createNavalForwardVolley(volleyInput)
    : createNavalBroadsideVolley({ ...volleyInput, sideName });
}

export function cannonBatterySideForTarget(shipStats, heading, origin, targetPoint) {
  validateCannonLayout(shipStats);
  if (shipStats.cannonLayout === SHIP_CANNON_LAYOUT_FORWARD) {
    return navalForwardTargetIsInArc(heading, origin, targetPoint) ? "port" : null;
  }
  return navalBroadsideSideForTarget(heading, origin, targetPoint);
}

function batterySidesForLayout(cannonLayout, requestedSide) {
  return cannonLayout === SHIP_CANNON_LAYOUT_FORWARD ? BATTERY_SIDES : [requestedSide];
}

function validateBatteryRequest(cooldowns, shipStats, requestedSide) {
  validateCannonLayout(shipStats);
  validateSide(requestedSide);
  if (!cooldowns || !Number.isFinite(cooldowns.port) || !Number.isFinite(cooldowns.starboard)) {
    throw new Error("Cannon battery requires port and starboard cooldowns");
  }
}

function validateSide(sideName) {
  if (sideName !== "port" && sideName !== "starboard") {
    throw new Error(`Unknown cannon battery control: ${sideName}`);
  }
}

function validateCannonLayout(shipStats) {
  if (!shipStats || (shipStats.cannonLayout !== SHIP_CANNON_LAYOUT_BROADSIDE &&
      shipStats.cannonLayout !== SHIP_CANNON_LAYOUT_FORWARD)) {
    throw new Error(`Unknown ship cannon layout: ${shipStats?.cannonLayout}`);
  }
}
