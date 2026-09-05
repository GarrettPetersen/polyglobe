const FAST_SCENARIO_IDS = Object.freeze([
  "reachability-sail-open-ocean",
  "reachability-fight-broadside",
  "reachability-port-assault-fortified",
  "reachability-colony-found",
  "reachability-whale-tow"
]);

export const GAMEPLAY_REACHABILITY_SCENARIOS = deepFreeze({
  "reachability-colony-found": colonyScenario("reachability-colony-found", "found"),
  "reachability-colony-resupply": colonyScenario("reachability-colony-resupply", "resupply"),
  "reachability-colony-city": colonyScenario("reachability-colony-city", "city"),
  "reachability-colony-port-royal": {
    id: "reachability-colony-port-royal", title: "Colonist", seed: "reachability-colony-port-royal-v1",
    player: { ...vessel("france", "galleon", 44.741944, -65.515556, 45), homeCityId: "bordeaux|france" },
    world: world(184, 16, 35), diplomacy: [], encounters: [],
    sequence: {
      kind: "colonize", variant: "found", durationSeconds: 14,
      cityId: "port royal|canada", originCityId: "bordeaux|france",
      organizerPortraitSourceId: "merchant-portrait-pack-by-captainskolot-portrait-merchant",
      modalPolicy: "show"
    }
  },
  "reachability-whale-tow": whaleScenario("reachability-whale-tow", "harpoon", "north-atlantic-right-whale"),
  "reachability-whale-finish": whaleScenario("reachability-whale-finish", "finish", "sperm-whale"),
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
  "reachability-fight-2v2": {
    id: "reachability-fight-2v2",
    title: "Sailing ship",
    seed: "reachability-fight-2v2-v1",
    player: vessel("portugal", "portuguese-carrack", 36.25, -29, 90),
    world: world(205, 16, 10),
    diplomacy: [
      relation("portugal", "england", "ally"),
      relation("portugal", "spain", "war"),
      relation("england", "spain", "war")
    ],
    encounters: [
      {
        ...encounter(
        "reachability-2v2-spanish-galleon",
        "spain",
        "seville|spain",
        "galleon",
        36.25,
        -28.42,
        90
        ),
        hitPoints: 20
      },
      encounter(
        "reachability-2v2-spanish-caravel",
        "spain",
        "seville|spain",
        "caravel",
        35.25,
        -27.84,
        90
      ),
      encounter(
        "reachability-2v2-english-brigantine",
        "england",
        "london|united kingdom",
        "brigantine",
        35.25,
        -28.42,
        90
      )
    ],
    sequence: {
      kind: "fight",
      variant: "2v2-broadside",
      durationSeconds: 30,
      encounterId: "reachability-2v2-spanish-galleon",
      broadsideSide: "starboard",
      modalPolicy: "suppress",
      evaluatedNpcIds: [
        "reachability-2v2-spanish-galleon",
        "reachability-2v2-spanish-caravel",
        "reachability-2v2-english-brigantine"
      ]
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

function whaleScenario(id, variant, speciesId) {
  return {
    id, title: "Sailing ship", seed: `${id}-v1`,
    player: vessel("england", "brigantine", 42.4, -48, 90),
    world: world(120, 15, 5), diplomacy: [], encounters: [],
    sequence: { kind: "whale", variant, speciesId, durationSeconds: 10, modalPolicy: "show" }
  };
}

function colonyScenario(id, variant) {
  return {
    id, title: "Colonist", seed: `${id}-v1`,
    player: { ...vessel("spain", "galleon", -34.61, -58.38, 45), homeCityId: "seville|spain" },
    world: world(184, 16, 35), diplomacy: [], encounters: [],
    sequence: {
      kind: "colonize", variant, durationSeconds: 14,
      cityId: "buenos aires|argentina", originCityId: "seville|spain",
      organizerPortraitSourceId: "merchant-portrait-pack-by-captainskolot-portrait-merchant",
      modalPolicy: "show"
    }
  };
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
