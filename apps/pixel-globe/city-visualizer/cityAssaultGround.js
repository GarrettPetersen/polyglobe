// Coordinates are local to the authored beach alpha mask. The same depth
// applies in either travel direction and to either army, with no landing timer.
export function cityAssaultWaterDepthPx(x, y, opaqueRows) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Array.isArray(opaqueRows)) {
    throw new Error("Invalid assault shoreline observation");
  }
  const runs = opaqueRows[Math.round(y)];
  if (!runs?.length) return 6;
  // The first opaque pixel is the shoreline. Inland the road and city layers
  // replace parts of the beach; the end of its paint is not another sea.
  const shoreX = runs[0][0];
  return x >= shoreX ? 0 : Math.min(6, Math.max(1, Math.ceil((shoreX - x) / 6)));
}
import { PORT_ASSAULT_REAR_FEET_Y, PORT_ASSAULT_LANE_COUNT,
  PORT_ASSAULT_LANE_SPACING, PORT_ASSAULT_TRACK_SPAN_PX,
  PORT_ASSAULT_GROUND_DEPTH_SCALE } from "../src/portAssaultGround.js";

// Every regional gate shares this opening in authored scene coordinates. Its
// rear jamb reaches y=518; the near jamb hides the passage beyond x=1291.
// Compress street depth into the ground-level opening as people approach it.
// This is scene perspective, not a combat lane or a change to body spacing.
export const CITY_GATE_GROUND = Object.freeze({
  approachX: 1210, entranceX: 1254, rearFeetY: 522, frontFeetY: 536
});

export function cityGateGroundFeetY(x, feetY, fortified) {
  if (!Number.isFinite(x) || !Number.isFinite(feetY) || typeof fortified !== "boolean") {
    throw new Error(`Invalid city gate ground position: ${x}/${feetY}/${fortified}`);
  }
  if (!fortified || x <= CITY_GATE_GROUND.approachX) return feetY;
  const streetDepth = (PORT_ASSAULT_LANE_COUNT - 1) * PORT_ASSAULT_LANE_SPACING *
    PORT_ASSAULT_TRACK_SPAN_PX * PORT_ASSAULT_GROUND_DEPTH_SCALE;
  const depth = Math.max(0, Math.min(1, (feetY - PORT_ASSAULT_REAR_FEET_Y) / streetDepth));
  const gateFeetY = CITY_GATE_GROUND.rearFeetY + depth *
    (CITY_GATE_GROUND.frontFeetY - CITY_GATE_GROUND.rearFeetY);
  const progress = Math.min(1, (x - CITY_GATE_GROUND.approachX) /
    (CITY_GATE_GROUND.entranceX - CITY_GATE_GROUND.approachX));
  const weight = progress * progress * (3 - 2 * progress);
  return feetY + (gateFeetY - feetY) * weight;
}
