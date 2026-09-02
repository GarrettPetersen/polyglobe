export const CITY_GROUND_REAR_PAINTER_Z = 62;
export const CITY_GROUND_FOREGROUND_PAINTER_Z = 74;
export const CITY_GROUND_FOREGROUND_START_Y = 552;
export const CITY_GATE_TRAVERSAL_PAINTER_Z = 71.8;

export const CITY_NPC_PATHS = Object.freeze([
  npcPath(900, 1005, 518),
  npcPath(960, 1070, 544),
  npcPath(1020, 1132, 518),
  npcPath(1080, 1185, 548),
  npcPath(1140, 1242, 520),
  npcPath(970, 1120, 565)
]);

export const CITY_GATE_TRAVERSAL_PATHS = Object.freeze([
  npcPath(1224, 1294, 570, CITY_GATE_TRAVERSAL_PAINTER_Z),
  npcPath(1208, 1290, 581, CITY_GATE_TRAVERSAL_PAINTER_Z)
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

function npcPath(startX, endX, feetY, painterZ = undefined) {
  return Object.freeze({
    startX,
    endX,
    feetY,
    ...(painterZ === undefined ? {} : { painterZ })
  });
}
