const FAST_SCENARIO_IDS = Object.freeze([
  "reachability-sail-open-ocean",
  "reachability-fight-broadside",
  "reachability-port-assault-fortified"
]);

export const GAMEPLAY_REACHABILITY_SCENARIOS = deepFreeze({
  "reachability-sail-open-ocean": {
    id: "reachability-sail-open-ocean",
    title: "Sailing ship",
    seed: "reachability-sail-open-ocean-v1",
    player: vessel("england", "brigantine", 40, -50, 0),
    world: world(218, 15, 40),
    diplomacy: [],
    encounters: [],
    sequence: {
      kind: "sail",
      variant: "beam-reach",
      durationSeconds: 6,
      beamSide: "port",
      requireOpenWaterCourse: true,
      modalPolicy: "suppress"
    }
  },
  "reachability-sail-oared": {
    id: "reachability-sail-oared",
    title: "Sailing ship",
    seed: "reachability-sail-oared-v1",
    player: vessel("ottoman", "mediterranean-galley", -20, -25, 0),
    world: world(140, 12, 20),
    diplomacy: [],
    encounters: [],
    sequence: {
      kind: "sail",
      variant: "row-upwind",
      durationSeconds: 6,
      requireOpenWaterCourse: true,
      modalPolicy: "suppress"
    }
  },
  "reachability-fight-broadside": {
    id: "reachability-fight-broadside",
    title: "Sailing ship",
    seed: "reachability-fight-broadside-v1",
    player: vessel("portugal", "portuguese-carrack", 35.7, -29, 90),
    world: world(205, 16, 10),
    diplomacy: [relation("portugal", "spain", "war")],
    encounters: [encounter(
      "reachability-spanish-galleon",
      "spain",
      "seville|spain",
      "galleon",
      35.7,
      -28.38,
      90
    )],
    sequence: {
      kind: "fight",
      variant: "broadside",
      durationSeconds: 10,
      encounterId: "reachability-spanish-galleon",
      broadsideSide: "starboard",
      modalPolicy: "suppress"
    }
  },
  "reachability-fight-small-arms": {
    id: "reachability-fight-small-arms",
    title: "Sailing ship",
    seed: "reachability-fight-small-arms-v1",
    player: vessel("portugal", "portuguese-carrack", 35.7, -29, 90),
    world: world(205, 14, 20),
    diplomacy: [relation("portugal", "spain", "war")],
    encounters: [{
      ...encounter(
        "reachability-small-arms-galleon",
        "spain",
        "seville|spain",
        "galleon",
        35.7,
        -28.38,
        0
      ),
      encounter: { kind: "capture-fight", forceAttack: true }
    }],
    sequence: {
      kind: "fight",
      variant: "small-arms",
      durationSeconds: 12,
      encounterId: "reachability-small-arms-galleon",
      modalPolicy: "suppress"
    }
  },
  "reachability-port-bombardment": {
    id: "reachability-port-bombardment",
    title: "Sailing ship",
    seed: "reachability-port-bombardment-v1",
    player: vessel("england", "galleon", 23.11, -82.37, 0),
    world: world(210, 14, 40),
    diplomacy: [relation("england", "spain", "war")],
    encounters: [],
    sequence: {
      kind: "pillage",
      variant: "bombard",
      durationSeconds: 6,
      cityId: "havana|cuba",
      broadsideSide: "starboard",
      modalPolicy: "suppress"
    }
  },
  "reachability-port-assault-fortified": {
    id: "reachability-port-assault-fortified",
    title: "Sailing ship",
    seed: "reachability-port-assault-fortified-v1",
    player: vessel("france", "galleon", 51.51, -0.13, 180),
    world: world(166, 13, 10),
    diplomacy: [relation("france", "england", "war")],
    encounters: [],
    sequence: {
      kind: "pillage",
      variant: "assault",
      durationSeconds: 24,
      cityId: "london|united kingdom",
      modalPolicy: "suppress"
    }
  },
  "reachability-port-assault-unfortified": {
    id: "reachability-port-assault-unfortified",
    title: "Sailing ship",
    seed: "reachability-port-assault-unfortified-v1",
    player: vessel("japan", "japanese-atakebune", 43.04, 144.85, 180),
    world: world(196, 13, 25),
    diplomacy: [relation("japan", "ainu", "war")],
    encounters: [],
    sequence: {
      kind: "pillage",
      variant: "assault",
      durationSeconds: 24,
      cityId: "akkeshi kotan|japan",
      modalPolicy: "suppress"
    }
  }
});

export function gameplayReachabilityScenarioIds(profile = "fast") {
  if (profile === "fast") return FAST_SCENARIO_IDS;
  if (profile === "release") return Object.freeze(Object.keys(GAMEPLAY_REACHABILITY_SCENARIOS));
  throw new Error(`Unknown gameplay reachability profile: ${profile}`);
}

function vessel(factionId, shipSlug, lat, lon, headingDeg) {
  return { factionId, shipSlug, lat, lon, headingDeg, activePlaySeconds: 90 };
}

function world(day, hour, minute) {
  return { day, hour, minute, timeScale: 180 };
}

function relation(factionAId, factionBId, value) {
  return { factionAId, factionBId, relation: value };
}

function encounter(id, factionId, captainHomeCityId, shipSlug, lat, lon, headingDeg) {
  return {
    id,
    captainHomeCityId,
    factionId,
    shipSlug,
    role: "warship",
    lat,
    lon,
    headingDeg,
    replaceOnSink: false
  };
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
