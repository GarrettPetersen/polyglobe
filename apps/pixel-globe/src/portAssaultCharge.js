import { portAssaultBodyRadius, portAssaultPositionIsFree, PORT_ASSAULT_LANE_SPACING } from "./portAssaultFormation.js";
import { portAssaultGroundLaneBounds } from "./portAssaultGround.js";

export const PORT_ASSAULT_CHARGE_FLIGHT_MS = 600;
export const PORT_ASSAULT_CHARGE_BOUNCE_MS = 200;
export const PORT_ASSAULT_CHARGE_RECOVERY_MS = 400;
export const PORT_ASSAULT_CHARGE_MOTION_MS = PORT_ASSAULT_CHARGE_FLIGHT_MS + PORT_ASSAULT_CHARGE_BOUNCE_MS;
export const PORT_ASSAULT_CHARGE_STAGGER_MS = PORT_ASSAULT_CHARGE_MOTION_MS + PORT_ASSAULT_CHARGE_RECOVERY_MS;
export const PORT_ASSAULT_CHARGE_MIN_MOMENTUM = 0.5;

// A charge throws a body over intervening ranks, unlike ground knockback.
// Reserve a clear landing on real ground; never teleport into another body.
export function portAssaultChargeLanding(target, direction, occupants, momentum = 1) {
  if (![direction.position, direction.lane].every(Number.isFinite)) throw new Error("Invalid charge direction");
  const width = portAssaultBodyRadius(target) * 2;
  if (!Number.isFinite(momentum) || momentum < 0 || momentum > 1) throw new Error("Invalid charge momentum");
  // Try the intended throw, then beyond the press, before accepting a shorter
  // landing. The finite battlefield bounds keep this search small and bounded.
  const distances = [5,6,7,8,9,10,12,14,16,18,20,4.5,4,3.5,3,2.5,2,1.5,1,.5];
  for (const widths of distances) {
    const distance = width * widths * momentum;
    const rawPosition = target.position + direction.position * distance;
    if (rawPosition < 0 && target.side === "attacker") {
      return {position:0,lane:target.lane,surface:"deck"};
    }
    const position = Math.max(0, Math.min(1, rawPosition));
    const bounds = portAssaultGroundLaneBounds(position, target.dockKind);
    for (const lateral of [0, 1, -1, 2, -2]) {
      const lane = Math.max(bounds.minimum, Math.min(bounds.maximum,
        target.lane + direction.lane * distance + lateral * width / PORT_ASSAULT_LANE_SPACING));
      const landing = {position,lane};
      if (portAssaultPositionIsFree({...target,...landing},occupants)) return landing;
    }
  }
  // A packed field edge can have no landing slot. The charge still deals
  // damage and knocks the victim down, without overlapping occupied ground.
  return {position:target.position,lane:target.lane};
}

export const PORT_ASSAULT_CHARGE_ACCELERATION_MS = 1800;

export function portAssaultChargeMomentumAfterImpact(momentum, mountedTarget) {
  if (!Number.isFinite(momentum) || momentum < 0 || momentum > 1) throw new Error("Invalid charge momentum");
  return Math.max(0,momentum-(mountedTarget ? 0.4 : 0.24));
}
