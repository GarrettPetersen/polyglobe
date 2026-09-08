import { activeCombatCrew } from "./combatWounds.js";

const SHORE_REACH_PX = 8;
const HAUL_SPEED_PX_PER_SECOND = 6;
const SWEEP_STEP_PX = 0.5;
const SLIDE_ANGLES = [0, Math.PI / 6, -Math.PI / 6, Math.PI / 3, -Math.PI / 3, Math.PI / 2, -Math.PI / 2];

// Hauling follows the player's requested direction independently of the bow.
// Each arena supplies its own full-hull clearance test; no terrain is bypassed.
export function haulFlatBattleShipAlongShore({ ship, dt, desiredHeadingRad, previousX, previousY, canOccupy }) {
  if (!Number.isFinite(dt) || dt < 0 || !Number.isFinite(ship?.x) || !Number.isFinite(ship?.y) ||
      !Number.isFinite(previousX) || !Number.isFinite(previousY) ||
      (desiredHeadingRad !== null && !Number.isFinite(desiredHeadingRad)) || typeof canOccupy !== "function") {
    throw new Error("Shore hauling requires finite motion and a hull clearance predicate");
  }
  if (desiredHeadingRad === null || dt === 0 || activeCombatCrew(ship.crew, ship.woundedCrew) === 0) return 0;
  let nearShore = false;
  for (let index = 0; index < 8; index++) {
    const angle = index * Math.PI / 4;
    if (!canOccupy(ship.x + Math.cos(angle) * SHORE_REACH_PX, ship.y + Math.sin(angle) * SHORE_REACH_PX)) {
      nearShore = true;
      break;
    }
  }
  if (!nearShore) return 0;
  const forwardProgress = (ship.x - previousX) * Math.cos(desiredHeadingRad) +
    (ship.y - previousY) * Math.sin(desiredHeadingRad);
  // Assistance is a minimum maneuvering pace, never a bonus to normal sailing.
  const distance = Math.max(0, HAUL_SPEED_PX_PER_SECOND * dt - Math.max(0, forwardProgress));
  if (distance === 0) return 0;
  for (const offset of SLIDE_ANGLES) {
    const angle = desiredHeadingRad + offset;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;
    const steps = Math.ceil(distance / SWEEP_STEP_PX);
    let clear = true;
    for (let step = 1; step <= steps; step++) {
      if (!canOccupy(ship.x + dx * step / steps, ship.y + dy * step / steps)) {
        clear = false;
        break;
      }
    }
    if (!clear) continue;
    ship.x += dx;
    ship.y += dy;
    return distance;
  }
  return 0;
}
