// Authored port ground coordinates, shared by movement and scene projection.
// The quays occupy a narrow strip; land broadens into the full street inland.
export const PORT_ASSAULT_LANE_COUNT = 4;
export const PORT_ASSAULT_LANE_SPACING = 0.06;
export const PORT_ASSAULT_TRACK_SPAN_PX = 640;
export const PORT_ASSAULT_TRACK_START_X = 692;
export const PORT_ASSAULT_GROUND_DEPTH_SCALE = 0.5;
export const PORT_ASSAULT_REAR_FEET_Y = 490;
const clamp01 = value => Math.max(0, Math.min(1, value));

export function portAssaultGroundLaneBounds(position, dockKind) {
  if (!Number.isFinite(position) || position < 0 || position > 1) throw new Error(`Invalid assault ground position: ${position}`);
  if (dockKind === "none") return { minimum: 0, maximum: PORT_ASSAULT_LANE_COUNT - 1 };
  if (dockKind !== "wood" && dockKind !== "stone") throw new Error(`Invalid assault ground dock: ${dockKind}`);
  return {
    minimum: 1.3 * (1 - clamp01((position - .24) / .12)),
    maximum: 2.3 + .7 * clamp01((position - .1) / .1)
  };
}

// Clip a swept segment against each piecewise-linear shoreline boundary.
// This constrains walking, sidesteps, lunges and knockback identically.
export function portAssaultGroundStepFraction(unit, end) {
  if (unit.dockKind === undefined || unit.dockKind === "none") return 1;
  const boundaries = [0, 1];
  const dx = end.position - unit.position;
  if (dx !== 0) for (const position of [.1, .2, .24, .36]) {
    const t = (position - unit.position) / dx;
    if (t > 0 && t < 1) boundaries.push(t);
  }
  boundaries.sort((a,b)=>a-b);
  let previous = 0;
  let previousBounds = portAssaultGroundLaneBounds(unit.position, unit.dockKind);
  let previousLane = unit.lane;
  for (const t of boundaries.slice(1)) {
    const lane = unit.lane + (end.lane - unit.lane) * t;
    const bounds = portAssaultGroundLaneBounds(unit.position + dx * t, unit.dockKind);
    for (const edge of ["minimum", "maximum"]) {
      const sign = edge === "minimum" ? 1 : -1;
      const before = (previousLane - previousBounds[edge]) * sign;
      const after = (lane - bounds[edge]) * sign;
      if (after < -1e-9) return previous + (t - previous) * Math.max(0, before) / (Math.max(0, before) - after);
    }
    previous = t; previousLane = lane; previousBounds = bounds;
  }
  return 1;
}
