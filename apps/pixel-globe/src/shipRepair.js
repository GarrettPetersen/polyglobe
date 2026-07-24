import { WEATHER_MINUTES_PER_DAY } from "./weather.js";

export function repairShipHullOverTime(
  ship,
  elapsedMinutes,
  repairHitPointsPerDay,
  { paused = false } = {}
) {
  validateRepairShip(ship);
  if (!Number.isFinite(elapsedMinutes) || elapsedMinutes < 0) {
    throw new Error(`Invalid passive hull repair time: ${elapsedMinutes}`);
  }
  if (!Number.isFinite(repairHitPointsPerDay) || repairHitPointsPerDay < 0) {
    throw new Error(`Invalid passive hull repair rate: ${repairHitPointsPerDay}`);
  }
  if (typeof paused !== "boolean") {
    throw new Error(`Invalid passive hull repair pause state: ${paused}`);
  }
  if (
    paused ||
    elapsedMinutes === 0 ||
    repairHitPointsPerDay === 0 ||
    ship.hitPoints === 0 ||
    ship.hitPoints === ship.maxHitPoints
  ) return 0;

  const missingHitPoints = ship.maxHitPoints - ship.hitPoints;
  const requestedRepair = repairHitPointsPerDay *
    elapsedMinutes /
    WEATHER_MINUTES_PER_DAY;
  const repaired = Math.min(missingHitPoints, requestedRepair);
  ship.hitPoints += repaired;
  return repaired;
}

function validateRepairShip(ship) {
  if (!ship || typeof ship !== "object" || Array.isArray(ship)) {
    throw new Error("Passive hull repair requires a ship");
  }
  if (!Number.isFinite(ship.maxHitPoints) || ship.maxHitPoints <= 0) {
    throw new Error(`Invalid maximum hull for passive repair: ${ship.maxHitPoints}`);
  }
  if (
    !Number.isFinite(ship.hitPoints) ||
    ship.hitPoints < 0 ||
    ship.hitPoints > ship.maxHitPoints
  ) {
    throw new Error(
      `Invalid current hull for passive repair: ${ship.hitPoints}/${ship.maxHitPoints}`
    );
  }
}
