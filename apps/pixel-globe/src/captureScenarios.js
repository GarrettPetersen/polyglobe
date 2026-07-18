import { factionById } from "./factions.js";
import { NPC_SHIP_SLUGS } from "./npcSeaRoutes.js";
import { shipStatsForSlug } from "./shipStats.js";

export const CAPTURE_VIEWPORTS = Object.freeze({
  shorts: Object.freeze({ width: 270, height: 480 }),
  steam: Object.freeze({ width: 480, height: 270 })
});
export const CAPTURE_FORMAT_QUERY_PARAM = "captureFormat";
export const CAPTURE_MAX_SECONDS = 10 * 60;

export function captureViewportFromSearch(search) {
  const value = new URLSearchParams(search).get(CAPTURE_FORMAT_QUERY_PARAM) || "shorts";
  const viewport = CAPTURE_VIEWPORTS[value];
  if (!viewport) throw new Error(`Unknown capture format: ${value}`);
  return viewport;
}

const CAPTURE_SCENARIOS = Object.freeze({
  "icosahedron-earth": scenario({
    id: "icosahedron-earth",
    title: "Flat While You Look, Round While You Sail",
    seed: "short-icosahedron-earth-v1",
    player: {
      factionId: "portugal",
      shipSlug: "portuguese-carrack",
      lat: 58.283,
      lon: 0,
      headingDeg: 90,
      activePlaySeconds: 60
    },
    world: { day: 196, hour: 13, minute: 20, timeScale: 180 },
    diplomacy: [],
    encounters: []
  }),
  "icosahedron-earth-broll": scenario({
    id: "icosahedron-earth-broll",
    title: "Round Earth B-Roll: Spice Islands",
    seed: "short-icosahedron-earth-broll-v1",
    player: {
      factionId: "portugal",
      shipSlug: "portuguese-carrack",
      lat: 0,
      lon: 125.095,
      headingDeg: 270,
      activePlaySeconds: 60
    },
    world: { day: 196, hour: 5, minute: 20, timeScale: 180 },
    diplomacy: [],
    encounters: []
  }),
  "icosahedron-earth-cape-horn": scenario({
    id: "icosahedron-earth-cape-horn",
    title: "Round Earth B-Roll: Cape Horn",
    seed: "short-icosahedron-earth-cape-horn-v1",
    player: {
      factionId: "portugal",
      shipSlug: "portuguese-carrack",
      lat: -55.196,
      lon: -66.838,
      headingDeg: 90,
      activePlaySeconds: 60
    },
    world: { day: 350, hour: 17, minute: 20, timeScale: 180 },
    diplomacy: [],
    encounters: []
  }),
  "turtle-ship-war": scenario({
    id: "turtle-ship-war",
    title: "Turtle Ship versus Atakebune",
    seed: "short-turtle-ship-war-v1",
    player: {
      factionId: "joseon",
      shipSlug: "joseon-turtle-ship",
      lat: 34.82,
      lon: 129.24,
      headingDeg: 18,
      activePlaySeconds: 60
    },
    world: { day: 196, hour: 13, minute: 20, timeScale: 180 },
    diplomacy: [
      { factionAId: "joseon", factionBId: "japan", relation: "war" }
    ],
    encounters: [
      {
        id: "capture-atakebune",
        factionId: "japan",
        shipSlug: "japanese-atakebune",
        role: "warship",
        lat: 34.65,
        lon: 129.95,
        headingDeg: 205
      }
    ]
  }),
  "land-trade": scenario({
    id: "land-trade",
    title: "Roads and Inland Trade",
    seed: "land-trade-qa-v1",
    player: {
      factionId: "france",
      shipSlug: "brigantine",
      lat: 42.9,
      lon: 5.4,
      headingDeg: 270,
      activePlaySeconds: 60
    },
    world: { day: 196, hour: 13, minute: 20, timeScale: 7200 },
    diplomacy: [],
    encounters: []
  }),
  "trailer-explore-fuji": trailerScenario({
    id: "trailer-explore-fuji",
    title: "Discover Mount Fuji",
    seed: "trailer-explore-fuji-v1",
    player: capturePlayer("japan", "small-junk", 34.72, 139.65, 315),
    world: captureWorld(112, 7, 40),
    sequence: trailerSequence("explore", "fuji", { discoveryName: "Mount Fuji" })
  }),
  "trailer-explore-pyramid": trailerScenario({
    id: "trailer-explore-pyramid",
    title: "Discover the Great Pyramid",
    seed: "trailer-explore-pyramid-v1",
    player: capturePlayer("ottoman", "felucca", 29.74, 31.22, 45),
    world: captureWorld(68, 16, 50),
    sequence: trailerSequence("explore", "pyramid", { discoveryName: "The Great Pyramid" })
  }),
  "trailer-trade-ternate": trailerScenario({
    id: "trailer-trade-ternate",
    title: "Buy Cloves in Ternate",
    seed: "trailer-trade-ternate-v1",
    player: capturePlayer("portugal", "portuguese-carrack", 0.79, 127.38, 180),
    world: captureWorld(196, 13, 10),
    sequence: trailerSequence("trade", "buy", { cityName: "Ternate", goodId: "cloves" })
  }),
  "trailer-trade-lisbon": trailerScenario({
    id: "trailer-trade-lisbon",
    title: "Sell Cinnamon in Lisbon",
    seed: "trailer-trade-lisbon-v1",
    player: capturePlayer("portugal", "portuguese-carrack", 38.72, -9.14, 90),
    world: captureWorld(196, 15, 20),
    sequence: trailerSequence("trade", "sell", { cityName: "Lisbon", goodId: "cinnamon" })
  }),
  "trailer-fish-cod": trailerScenario({
    id: "trailer-fish-cod",
    title: "Fish the Grand Banks",
    seed: "trailer-fish-cod-v1",
    player: capturePlayer("england", "fishing-lugger", 45.2, -50.4, 70),
    world: captureWorld(145, 8, 30),
    sequence: trailerSequence("fish", "cod")
  }),
  "trailer-fish-reef": trailerScenario({
    id: "trailer-fish-reef",
    title: "Fish a Caribbean Reef",
    seed: "trailer-fish-reef-v1",
    player: capturePlayer("spain", "caravel", 20.4, -87.0, 250),
    world: captureWorld(238, 10, 15),
    sequence: trailerSequence("fish", "reef")
  }),
  "trailer-whale-right": trailerScenario({
    id: "trailer-whale-right",
    title: "Harpoon a Right Whale",
    seed: "trailer-whale-right-v1",
    player: capturePlayer("england", "brigantine", 42.4, -48.0, 90),
    world: captureWorld(120, 9, 5),
    sequence: trailerSequence("whale", "harpoon", { speciesId: "north-atlantic-right-whale" })
  }),
  "trailer-whale-sperm": trailerScenario({
    id: "trailer-whale-sperm",
    title: "Finish a Sperm Whale Hunt",
    seed: "trailer-whale-sperm-v1",
    player: capturePlayer("portugal", "portuguese-carrack", 35.7, -29.0, 105),
    world: captureWorld(250, 17, 25),
    sequence: trailerSequence("whale", "finish", { speciesId: "sperm-whale" })
  }),
  "trailer-fight-turtle": trailerScenario({
    id: "trailer-fight-turtle",
    title: "Turtle Ship Battle",
    seed: "trailer-fight-turtle-v1",
    player: capturePlayer("joseon", "joseon-turtle-ship", 34.82, 129.24, 90),
    world: captureWorld(196, 13, 20),
    diplomacy: [{ factionAId: "joseon", factionBId: "japan", relation: "war" }],
    encounters: [captureEncounter("trailer-atakebune", "japan", "japanese-atakebune", 34.82, 129.64, 270)],
    sequence: trailerSequence("fight", "turtle", { encounterId: "trailer-atakebune" })
  }),
  "trailer-fight-atlantic": trailerScenario({
    id: "trailer-fight-atlantic",
    title: "Carrack Broadside",
    seed: "trailer-fight-atlantic-v1",
    player: capturePlayer("portugal", "portuguese-carrack", 36.0, -10.0, 90),
    world: captureWorld(205, 16, 10),
    diplomacy: [{ factionAId: "portugal", factionBId: "spain", relation: "war" }],
    encounters: [captureEncounter("trailer-spanish-galleon", "spain", "galleon", 36.0, -9.55, 270)],
    sequence: trailerSequence("fight", "atlantic", { encounterId: "trailer-spanish-galleon" })
  }),
  "trailer-pillage-havana": trailerScenario({
    id: "trailer-pillage-havana",
    title: "Bombard Havana",
    seed: "trailer-pillage-havana-v1",
    player: capturePlayer("england", "galleon", 23.11, -82.37, 0),
    world: captureWorld(210, 14, 40),
    diplomacy: [{ factionAId: "england", factionBId: "spain", relation: "war" }],
    sequence: trailerSequence("pillage", "bombard", { cityName: "Havana" })
  }),
  "trailer-pillage-alexandria": trailerScenario({
    id: "trailer-pillage-alexandria",
    title: "Take Alexandria",
    seed: "trailer-pillage-alexandria-v1",
    player: capturePlayer("venice", "galleon", 31.20, 29.91, 180),
    world: captureWorld(92, 11, 30),
    diplomacy: [{ factionAId: "venice", factionBId: "ottoman", relation: "war" }],
    sequence: trailerSequence("pillage", "assault", { cityName: "Alexandria" })
  }),
  "trailer-colonize-found": trailerScenario({
    id: "trailer-colonize-found",
    title: "Found Port Royal Colony",
    seed: "trailer-colonize-found-v1",
    player: capturePlayer("france", "carrack", 44.74, -65.52, 45),
    world: captureWorld(176, 9, 45),
    sequence: trailerSequence("colonize", "found", { cityName: "Port Royal" })
  }),
  "trailer-colonize-establish": trailerScenario({
    id: "trailer-colonize-establish",
    title: "Port Royal Becomes a City",
    seed: "trailer-colonize-establish-v1",
    player: capturePlayer("france", "carrack", 44.74, -65.52, 315),
    world: captureWorld(220, 15, 0),
    sequence: trailerSequence("colonize", "establish", { cityName: "Port Royal" })
  }),
  "trailer-survive-lightning": trailerScenario({
    id: "trailer-survive-lightning",
    title: "Survive a Lightning Strike",
    seed: "trailer-survive-lightning-v1",
    player: capturePlayer("england", "brigantine", 49.0, -18.0, 70),
    world: captureWorld(285, 21, 10),
    sequence: trailerSequence("survive", "lightning")
  }),
  "trailer-survive-dehydration": trailerScenario({
    id: "trailer-survive-dehydration",
    title: "Out of Fresh Water",
    seed: "trailer-survive-dehydration-v1",
    player: capturePlayer("portugal", "caravel", 18.5, 39.5, 330),
    world: captureWorld(130, 12, 20, 14400),
    sequence: trailerSequence("survive", "dehydration", { durationSeconds: 9 })
  })
});

export function captureScenarioFromSearch(search) {
  const params = new URLSearchParams(search);
  const id = params.get("capture");
  if (!id) return null;
  const scenarioValue = CAPTURE_SCENARIOS[id];
  if (!scenarioValue) {
    throw new Error(
      `Unknown capture scenario: ${id}. Available: ${Object.keys(CAPTURE_SCENARIOS).join(", ")}`
    );
  }
  return scenarioValue;
}

export function captureScenarioIds() {
  return Object.keys(CAPTURE_SCENARIOS);
}

function scenario(value) {
  validateCaptureScenario(value);
  return deepFreeze(structuredClone(value));
}

export function validateCaptureScenario(value) {
  if (!value || typeof value !== "object") throw new Error("Capture scenario must be an object");
  requiredString(value.id, "capture scenario id");
  requiredString(value.title, "capture scenario title");
  requiredString(value.seed, "capture scenario seed");
  validateVessel(value.player, "capture player");
  numberInRange(value.player.activePlaySeconds, 0, 86400, "capture active play seconds");
  if (!value.world || typeof value.world !== "object") throw new Error("Capture scenario needs world settings");
  integerInRange(value.world.day, 1, 365, "capture day");
  integerInRange(value.world.hour, 0, 23, "capture hour");
  integerInRange(value.world.minute, 0, 59, "capture minute");
  numberInRange(value.world.timeScale, 0, 86400, "capture time scale");
  if (!Array.isArray(value.diplomacy)) throw new Error("Capture scenario diplomacy must be an array");
  for (const relation of value.diplomacy) {
    factionById(relation.factionAId);
    factionById(relation.factionBId);
    if (!["ally", "friendly", "neutral", "hostile", "war"].includes(relation.relation)) {
      throw new Error(`Invalid capture diplomacy relation: ${relation.relation}`);
    }
  }
  if (!Array.isArray(value.encounters)) throw new Error("Capture scenario encounters must be an array");
  const encounterIds = new Set();
  for (const encounter of value.encounters) {
    validateVessel(encounter, "capture encounter");
    if (!NPC_SHIP_SLUGS.includes(encounter.shipSlug)) {
      throw new Error(`Capture encounter ship has no NPC sprite asset: ${encounter.shipSlug}`);
    }
    requiredString(encounter.id, "capture encounter id");
    if (encounterIds.has(encounter.id)) throw new Error(`Duplicate capture encounter id: ${encounter.id}`);
    encounterIds.add(encounter.id);
    if (!["merchant", "fisherman", "warship", "pirate"].includes(encounter.role)) {
      throw new Error(`Invalid capture encounter role: ${encounter.role}`);
    }
  }
  if (value.sequence !== undefined) validateCaptureSequence(value.sequence);
  return value;
}

function validateCaptureSequence(value) {
  if (!value || typeof value !== "object") throw new Error("Capture sequence must be an object");
  if (!["explore", "trade", "fish", "whale", "fight", "pillage", "colonize", "survive"].includes(value.kind)) {
    throw new Error(`Invalid capture sequence kind: ${value.kind}`);
  }
  requiredString(value.variant, "capture sequence variant");
  numberInRange(value.durationSeconds, 3, 30, "capture sequence duration");
  const requiredByKind = {
    explore: ["discoveryName"],
    trade: ["cityName", "goodId"],
    fish: [],
    whale: ["speciesId"],
    fight: ["encounterId"],
    pillage: ["cityName"],
    colonize: ["cityName"],
    survive: []
  };
  for (const key of requiredByKind[value.kind]) requiredString(value[key], `capture sequence ${key}`);
}

function trailerScenario(value) {
  return {
    ...value,
    diplomacy: value.diplomacy || [],
    encounters: value.encounters || []
  };
}

function capturePlayer(factionId, shipSlug, lat, lon, headingDeg) {
  return { factionId, shipSlug, lat, lon, headingDeg, activePlaySeconds: 90 };
}

function captureWorld(day, hour, minute, timeScale = 180) {
  return { day, hour, minute, timeScale };
}

function trailerSequence(kind, variant, values = {}) {
  return {
    kind,
    variant,
    durationSeconds: values.durationSeconds || 10,
    ...values
  };
}

function captureEncounter(id, factionId, shipSlug, lat, lon, headingDeg) {
  return { id, factionId, shipSlug, role: "warship", lat, lon, headingDeg };
}

function validateVessel(value, label) {
  if (!value || typeof value !== "object") throw new Error(`${label} must be an object`);
  factionById(value.factionId);
  shipStatsForSlug(value.shipSlug);
  numberInRange(value.lat, -89.999, 89.999, `${label} latitude`);
  numberInRange(value.lon, -180, 180, `${label} longitude`);
  numberInRange(value.headingDeg, 0, 359.999, `${label} heading`);
}

function requiredString(value, label) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${label} is required`);
}

function integerInRange(value, min, max, label) {
  if (!Number.isInteger(value)) throw new Error(`${label} must be an integer`);
  numberInRange(value, min, max, label);
}

function numberInRange(value, min, max, label) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${label} must be ${min}..${max}, got ${value}`);
  }
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
