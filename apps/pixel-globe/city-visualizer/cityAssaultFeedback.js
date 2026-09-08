import { CITY_PORT_ASSAULT_LANE_FEET_Y } from "./cityPainterOrder.js";

// Render bands interleave soldiers with scenery; they do not snap soldier depth.
export function cityAssaultDepthBand(groundY) {
  if (!Number.isFinite(groundY)) throw new Error(`Invalid assault ground depth: ${groundY}`);
  for (let band = 0; band < CITY_PORT_ASSAULT_LANE_FEET_Y.length - 1; band++) {
    if (groundY < (CITY_PORT_ASSAULT_LANE_FEET_Y[band] + CITY_PORT_ASSAULT_LANE_FEET_Y[band + 1]) / 2) return band;
  }
  return CITY_PORT_ASSAULT_LANE_FEET_Y.length - 1;
}

export function cityAssaultDepthOrder(left, right) {
  return left.groundY - right.groundY || left.unit.id.localeCompare(right.unit.id);
}

// Consume each hit once, on its first displayed frame, even if rendering skips
// over the exact simulation timestamp. Replaying/rewinding starts a fresh ledger.
export class CityAssaultHitFlashes {
  constructor() { this.reset(); }
  reset() { this.hits = new Map(); this.elapsedMs = 0; }
  consume(unitId, events, elapsedMs) {
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw new Error("Invalid assault flash clock");
    if (elapsedMs < this.elapsedMs) this.reset();
    this.elapsedMs = elapsedMs;
    let hitTime = -1;
    for (const event of events) {
      if (event.unitId === unitId && (event.type === "hit" || event.type === "death") &&
          event.timeMs <= elapsedMs) hitTime = Math.max(hitTime, event.timeMs);
    }
    if (hitTime < 0 || hitTime <= (this.hits.get(unitId) ?? -1)) return false;
    this.hits.set(unitId, hitTime);
    return true;
  }
}
