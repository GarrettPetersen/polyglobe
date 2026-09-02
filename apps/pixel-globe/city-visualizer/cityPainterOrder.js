export const CITY_GROUND_REAR_PAINTER_Z = 62;
export const CITY_GROUND_FOREGROUND_PAINTER_Z = 74;
export const CITY_GROUND_FOREGROUND_START_Y = 552;
export const CITY_GATE_TRAVERSAL_PAINTER_Z = 71.8;

export const CITY_PORT_ASSAULT_LANE_FEET_Y = Object.freeze([516, 524, 532, 540]);

export const CITY_NPC_PATHS = Object.freeze([
  npcPath(900, 1005, 518),
  npcPath(960, 1070, 544),
  npcPath(1020, 1132, 518),
  npcPath(1080, 1185, 548),
  npcPath(1140, 1242, 520),
  npcPath(970, 1120, 565)
]);

export const CITY_GATE_TRAVERSAL_PATHS = Object.freeze([
  npcPath(1212, 1292, 578, {
    endFeetY: 520,
    painterZ: CITY_GATE_TRAVERSAL_PAINTER_Z
  }),
  npcPath(1198, 1287, 568, {
    endFeetY: 512,
    painterZ: CITY_GATE_TRAVERSAL_PAINTER_Z
  })
]);

export const CITY_GATE_FRONT_PAINTER_Z = 71.9;

export function cityNpcPaths({ fortified }) {
  if (typeof fortified !== "boolean") {
    throw new Error("City NPC paths require a fortification state");
  }
  if (!fortified) return CITY_NPC_PATHS;
  return Object.freeze([
    ...CITY_NPC_PATHS.slice(0, CITY_NPC_PATHS.length - CITY_GATE_TRAVERSAL_PATHS.length),
    ...CITY_GATE_TRAVERSAL_PATHS
  ]);
}

// Grounded entities share the road until the authored foreground terrain begins.
// Keep rear walkers between the gate and inn, then step onto the foreground band
// so feet/base Y can decide whether a person, tree, or cargo pile is in front.
export function cityGroundPainterZ(groundY) {
  if (!Number.isFinite(groundY) || groundY < 0 || groundY > 910) {
    throw new Error(`Invalid city ground painter y: ${groundY}`);
  }
  return groundY < CITY_GROUND_FOREGROUND_START_Y
    ? CITY_GROUND_REAR_PAINTER_Z + (groundY - 518) / 1000
    : CITY_GROUND_FOREGROUND_PAINTER_Z +
      (groundY - CITY_GROUND_FOREGROUND_START_Y) / 1000;
}

export function cityPortAssaultLanePainterZ(lane) {
  if (!Number.isInteger(lane) || lane < 0 || lane >= CITY_PORT_ASSAULT_LANE_FEET_Y.length) {
    throw new Error(`Invalid city port-assault lane: ${lane}`);
  }
  return cityGroundPainterZ(CITY_PORT_ASSAULT_LANE_FEET_Y[lane]);
}

export const CITY_PORT_ASSAULT_SHIP_FOREGROUND_PAINTER_Z = cityGroundPainterZ(
  CITY_PORT_ASSAULT_LANE_FEET_Y.at(-1) + 1
);

export function cityNpcPathPoint(path, progress) {
  if (!path || ![path.startX, path.endX, path.feetY, path.endFeetY].every(Number.isFinite)) {
    throw new Error("City NPC path point requires complete path geometry");
  }
  if (!Number.isFinite(progress) || progress < 0 || progress > 1) {
    throw new Error(`Invalid city NPC path progress: ${progress}`);
  }
  return Object.freeze({
    x: path.startX + (path.endX - path.startX) * progress,
    feetY: path.feetY + (path.endFeetY - path.feetY) * progress
  });
}

function npcPath(startX, endX, feetY, { endFeetY = feetY, painterZ } = {}) {
  if (endFeetY !== feetY && painterZ === undefined) {
    throw new Error("A sloped city NPC path requires explicit painter order");
  }
  return Object.freeze({
    startX,
    endX,
    feetY,
    endFeetY,
    ...(painterZ === undefined ? {} : { painterZ })
  });
}
