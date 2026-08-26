import { factionById } from "./factions.js";
import { religionById } from "./characterReligion.js";
import { ICEBERG_VARIANTS } from "./icebergSystem.js";
import { NPC_SHIP_SLUGS } from "./npcSeaRoutes.js";
import { shipStatsForSlug } from "./shipStats.js";

export const CAPTURE_VIEWPORTS = Object.freeze({
  shorts: Object.freeze({ width: 270, height: 480 }),
  steam: Object.freeze({ width: 480, height: 270 })
});
export const CAPTURE_FORMAT_QUERY_PARAM = "captureFormat";
export const CAPTURE_MAX_SECONDS = 10 * 60;
const PANDA_TRAILER_CAPTAIN_SOURCE_ID =
  "women-knight-portrait-pack-by-captainskeleto-women-knight-portrait";
const PANDA_TRAILER_NATURALIST_SOURCE_ID =
  "curated-historical-portraits-by-captainskolot-old-scholar";
const TRAILER_TERNATE_FACTOR_SOURCE_ID =
  "women-black-hair-portrait-by-captainskolot-women-black-hair-portrait";
const TRAILER_LISBON_FACTOR_SOURCE_ID =
  "blond-villager-women-portrait-pack-by-captainskeleto-blond-villager-women";
const TRAILER_ALEXANDRIA_CAPTAIN_SOURCE_ID =
  "women-knight-portrait-pack-by-captainskeleto-women-knight-portrait";
const TRAILER_TERNATE_CAPTAIN_SOURCE_ID = TRAILER_ALEXANDRIA_CAPTAIN_SOURCE_ID;
const TRAILER_LISBON_CAPTAIN_SOURCE_ID =
  "merchant-portrait-pack-by-captainskolot-portrait-merchant";
const PAPAL_SHORT_CAPTAIN_SOURCE_ID = TRAILER_ALEXANDRIA_CAPTAIN_SOURCE_ID;
const PAPAL_SHORT_NUNCIO_SOURCE_ID =
  "curated-historical-portraits-by-captainskolot-old-scholar";
const PAPAL_SHORT_BOOKSELLER_SOURCE_ID = TRAILER_LISBON_CAPTAIN_SOURCE_ID;
const PAPAL_SHORT_ROME_CITY = "Rome";
const PAPAL_SHORT_HAMBURG_CITY = "Hamburg";
const PAPAL_SHORT_HOME_PORT = "Seville";
const PAPAL_SHORT_BIBLE_DESTINATION = "Antwerp";
const PAPAL_SHORT_SCENE_ROME = "The Papal States at Rome";
const PAPAL_SHORT_SCENE_ACTIONS = "Papal Decrees and Diplomacy";
const PAPAL_SHORT_SCENE_NUNCIO = "Accept a Papal Nuncio's Commission";
const PAPAL_SHORT_SCENE_BIBLES = "Smuggle the September Testament";
const PAPAL_SHORT_SCENE_NUNCIO_ROUTE = "Carry a Papal Nuncio through the Aegean";
const PAPAL_SHORT_SCENE_BIBLE_ROUTE = "Smuggle Bibles through the North Sea";
const COLONY_SHORT_CAPTAIN_SOURCE_ID = TRAILER_ALEXANDRIA_CAPTAIN_SOURCE_ID;
const COLONY_SHORT_ORGANIZER_SOURCE_ID = TRAILER_LISBON_CAPTAIN_SOURCE_ID;
const COLONY_SHORT_PORT_ROYAL = "Port Royal";
const COLONY_SHORT_BORDEAUX = "Bordeaux";
const COLONY_SHORT_BUENOS_AIRES = "Buenos Aires";
const COLONY_SHORT_SEVILLE = "Seville";
const COLONY_SHORT_JAMESTOWN = "Jamestown";
const COLONY_SHORT_LONDON = "London";
const COLONY_SHORT_RECIFE = "Recife";
const COLONY_SHORT_RIO = "Rio de Janeiro";
const COLONY_SHORT_LISBON = "Lisbon";
const COLONY_SHORT_MANILA = "Manila";
const COLONY_SHORT_SCENE_OFFER_CAPTURE = "A Colonial Expedition Is Proposed in Bordeaux";
const COLONY_SHORT_SCENE_EMBARK = "Colonists Embark at Bordeaux";
const COLONY_SHORT_SCENE_OUTBOUND = "A Spanish Colonial Expedition Leaves Europe";
const COLONY_SHORT_SCENE_ATLANTIC = "An English Colonial Expedition Crosses the North Atlantic";
const COLONY_SHORT_SCENE_ACADIA = "Colonists Reach Acadia";
const COLONY_SHORT_SCENE_FOUND = "Found Buenos Aires";
const COLONY_SHORT_SCENE_DEADLINE_CAPTURE = "Jamestown Awaits Grain";
const COLONY_SHORT_SCENE_RESUPPLY = "Resupply Recife";
const COLONY_SHORT_SCENE_DEFENSE = "Defend Rio de Janeiro from War Canoes";
const COLONY_SHORT_SCENE_CITY = "Manila Becomes a Permanent City";
const LOADOUT_SHORT_CAPTAIN_SOURCE_ID = TRAILER_LISBON_CAPTAIN_SOURCE_ID;
const LOADOUT_SHORT_PORT = "Lisbon";
const TRADE_GOODS_SHORT_CAPTAIN_SOURCE_ID = TRAILER_LISBON_CAPTAIN_SOURCE_ID;
const TRADE_GOODS_SHORT_FACTOR_SOURCE_ID = TRAILER_TERNATE_FACTOR_SOURCE_ID;
const TRADE_GOODS_SHORT_ALEXANDRIA = "Alexandria";
const TRADE_GOODS_SHORT_BORDEAUX = COLONY_SHORT_BORDEAUX;
const TRADE_GOODS_SHORT_TITLE_GRAIN = "The Crew Can Eat Trade Grain";
const TRADE_GOODS_SHORT_TITLE_WINE = "Wine Is a Drinkable Trade Good";
const TRADE_GOODS_SHORT_TITLE_RIVER = "Fishing a River";
const TRADE_GOODS_SHORT_TITLE_LAKE = "Fishing a Lake";
const TRADE_GOODS_SHORT_TITLE_EMERGENCY = "The Water Casks Are Dry";
const TRADE_GOODS_SHORT_TITLE_DRUNK = "The Factor Notices a Drunk Arrival";
const TRADE_GOODS_SHORT_TITLE_REMEMBERED = "The Factor Remembers Last Time";
const COMPANIONS_SHORT_CAPTAIN_SOURCE_ID = TRAILER_LISBON_CAPTAIN_SOURCE_ID;
const COMPANIONS_SHORT_LONDON = "London";
const COMPANIONS_SHORT_HOME = "Lisbon";
const COMPANIONS_SHORT_WANTED_PORT = "Seville";
const COMPANIONS_SHORT_REVENGE_SHIP_ID =
  "companions-pirate-ship:false-captive-revenge:1";
const COMPANIONS_SHORT_SCENE_PASSENGER = "Take a Passenger from London to Lisbon";
const COMPANIONS_SHORT_TITLE_PASSENGER_ARRIVAL = "Deliver a Passenger to Lisbon";
const COMPANIONS_SHORT_SCENE_CASTAWAY = "Find a Castaway at a Remote Shore";
const COMPANIONS_SHORT_TITLE_CASTAWAY_REUNION = "Reunite a Castaway with Family";
const COMPANIONS_SHORT_TITLE_CASTAWAY_RECRUIT = "A Castaway Joins the Crew";
const COMPANIONS_SHORT_SCENE_CAPTIVE = "Rescue a Captive from a Pirate Ship";
const COMPANIONS_SHORT_TITLE_PIRATE_ESCAPE = "The Pirate Captive Escapes";
const COMPANIONS_SHORT_TITLE_PIRATE_REVENGE = "The Escaped Pirate Returns in a Galleon";
const RELIGION_SHORT_EUROPEAN_CAPTAIN_SOURCE_ID =
  "women-knight-portrait-pack-by-captainskeleto-women-knight-portrait";
const RELIGION_SHORT_MALE_CAPTAIN_SOURCE_ID =
  "old-warrior-grey-beard-by-captainskolot-old-warrior-grey-beard";
const RELIGION_SHORT_CITY_ADEN = "Aden";
const RELIGION_SHORT_CITY_HAMBURG = "Hamburg";
const RELIGION_SHORT_CITY_JEDDAH = "Jeddah";
const RELIGION_SHORT_CITY_KHOLMOGORY = "Kholmogory";
const RELIGION_SHORT_CITY_KRAKOW = "Krakow";
const RELIGION_SHORT_CITY_LISBON = "Lisbon";
const RELIGION_SHORT_CITY_THESSALONIKI = "Thessaloniki";
const RELIGION_SHORT_TITLE_CATHOLIC = "A Portuguese Catholic Captain";
const RELIGION_SHORT_TITLE_CANOE = "A Dugout Canoe in the Great Lakes";
const RELIGION_SHORT_TITLE_HAJJ = "Undertake the Hajj with a Pilgrim";
const RELIGION_SHORT_TITLE_LUTHERAN = "A Lutheran Captain in 1522";
const RELIGION_SHORT_TITLE_ORTHODOX = "A Muscovite Orthodox Captain";
const RELIGION_SHORT_TITLE_SUNNI = "An Ottoman Sunni Captain";

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
      headingDeg: 0,
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
  "iceberg-drift": scenario({
    id: "iceberg-drift",
    title: "Large Iceberg",
    seed: "iceberg-drift-qa-v1",
    player: {
      factionId: "denmark-norway",
      shipSlug: "viking-longship",
      lat: 55,
      lon: -40.15,
      headingDeg: 0,
      activePlaySeconds: 60
    },
    world: { day: 196, hour: 13, minute: 20, timeScale: 180 },
    diplomacy: [],
    encounters: [],
    icebergs: [
      { variantId: "iceberg-large", lat: 55, lon: -39.98, headingDeg: 210 }
    ],
    sequence: trailerSequence("sail", "beam-reach", {
      durationSeconds: 9,
      beamSide: "port"
    })
  }),
  "five-weeks-arctic-ice": scenario({
    id: "five-weeks-arctic-ice",
    title: "Large Iceberg",
    seed: "five-weeks-arctic-ice-v1",
    player: {
      factionId: "denmark-norway",
      shipSlug: "viking-longship",
      lat: 64.95,
      lon: -59.47,
      headingDeg: 90,
      activePlaySeconds: 60
    },
    world: { day: 15, hour: 11, minute: 20, timeScale: 180 },
    diplomacy: [],
    encounters: [],
    sequence: trailerSequence("sail", "beam-reach", {
      durationSeconds: 9,
      beamSide: "starboard"
    })
  }),
  "diagnostic-chart-recovery-ocean": scenario({
    id: "diagnostic-chart-recovery-ocean",
    title: "chart-recovery-ocean",
    seed: "diagnostic-chart-recovery-ocean-v1",
    player: {
      factionId: "portugal",
      shipSlug: "caravel",
      lat: 0,
      lon: -30,
      headingDeg: 90,
      activePlaySeconds: 90
    },
    world: { day: 196, hour: 13, minute: 20, timeScale: 180 },
    diplomacy: [],
    encounters: []
  }),
  "diagnostic-chart-recovery-north-sea": scenario({
    id: "diagnostic-chart-recovery-north-sea",
    title: "chart-recovery-north-sea",
    seed: "diagnostic-chart-recovery-north-sea-v1",
    player: {
      factionId: "england",
      shipSlug: "caravel",
      lat: 53.05,
      lon: 3.61,
      headingDeg: 90,
      activePlaySeconds: 90
    },
    world: { day: 196, hour: 13, minute: 20, timeScale: 180 },
    diplomacy: [],
    encounters: []
  }),
  "diagnostic-chart-recovery-scandinavia": scenario({
    id: "diagnostic-chart-recovery-scandinavia",
    title: "chart-recovery-scandinavia",
    seed: "diagnostic-chart-recovery-scandinavia-v1",
    player: {
      factionId: "denmark-norway",
      shipSlug: "viking-longship",
      lat: 68,
      lon: 4,
      headingDeg: 205,
      activePlaySeconds: 90
    },
    world: { day: 196, hour: 13, minute: 20, timeScale: 180 },
    diplomacy: [],
    encounters: []
  }),
  "diagnostic-chart-coverage-norwegian-sea": scenario({
    id: "diagnostic-chart-coverage-norwegian-sea",
    title: "chart-coverage-norwegian-sea",
    seed: "diagnostic-chart-coverage-norwegian-sea-v1",
    player: {
      factionId: "scotland",
      shipSlug: "fishing-lugger",
      lat: 58,
      lon: -3,
      headingDeg: 90,
      activePlaySeconds: 90
    },
    world: { day: 196, hour: 13, minute: 20, timeScale: 180 },
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
  "great-barrier-reef": scenario({
    id: "great-barrier-reef",
    title: "Great Barrier Reef Discovery",
    seed: "great-barrier-reef-qa-v1",
    player: {
      factionId: "portugal",
      shipSlug: "caravel",
      lat: -18.4,
      lon: 147.2,
      headingDeg: 45,
      activePlaySeconds: 60
    },
    world: { day: 196, hour: 11, minute: 20, timeScale: 180 },
    diplomacy: [],
    encounters: [],
    sequence: trailerSequence("explore", "reef", {
      discoveryName: "Great Barrier Reef"
    })
  }),
  "benchmark-busy-world": scenario({
    id: "benchmark-busy-world",
    title: "Busy World Performance Benchmark",
    seed: "benchmark-busy-world-v1",
    player: {
      factionId: "ming",
      shipSlug: "medium-junk",
      lat: 31.1,
      lon: 121.9,
      headingDeg: 90,
      activePlaySeconds: 90
    },
    world: { day: 196, hour: 11, minute: 20, timeScale: 180 },
    diplomacy: [],
    encounters: busyWorldBenchmarkEncounters()
  }),
  "benchmark-cloud-cover": scenario({
    id: "benchmark-cloud-cover",
    title: "Cloud Cover Performance Benchmark",
    seed: "benchmark-cloud-cover-v1",
    player: {
      factionId: "ottoman",
      shipSlug: "mediterranean-galley",
      lat: 39.3,
      lon: 25.2,
      headingDeg: 180,
      activePlaySeconds: 90
    },
    world: { day: 83, hour: 11, minute: 20, timeScale: 180 },
    diplomacy: [],
    encounters: []
  }),
  "benchmark-combat-hotspot": scenario({
    id: "benchmark-combat-hotspot",
    title: "Eastern Mediterranean Combat Performance Benchmark",
    seed: "benchmark-combat-hotspot-v1",
    player: {
      factionId: "venice",
      shipSlug: "brigantine",
      lat: 34.65,
      lon: 25.4,
      headingDeg: 90,
      activePlaySeconds: 20
    },
    world: { day: 196, hour: 11, minute: 20, timeScale: 180 },
    diplomacy: [],
    encounters: combatHotspotBenchmarkEncounters()
  }),
  "benchmark-nanjing-hotspot": scenario({
    id: "benchmark-nanjing-hotspot",
    title: "Nanjing Performance Benchmark",
    seed: "benchmark-nanjing-hotspot-v1",
    player: {
      factionId: "ming",
      shipSlug: "medium-junk",
      lat: 32.06,
      lon: 118.8,
      headingDeg: 90,
      activePlaySeconds: 90
    },
    world: { day: 196, hour: 11, minute: 20, timeScale: 180 },
    diplomacy: [],
    encounters: nanjingHotspotBenchmarkEncounters()
  }),
  "benchmark-gibraltar-hotspot": scenario({
    id: "benchmark-gibraltar-hotspot",
    title: "Straits of Gibraltar Traffic Performance Benchmark",
    seed: "benchmark-gibraltar-hotspot-v1",
    player: {
      factionId: "spain",
      shipSlug: "caravel",
      lat: 36.02,
      lon: -5.55,
      headingDeg: 90,
      activePlaySeconds: 90
    },
    world: { day: 196, hour: 11, minute: 20, timeScale: 180 },
    diplomacy: [],
    encounters: gibraltarHotspotBenchmarkEncounters()
  }),
  "benchmark-naples-approach": scenario({
    id: "benchmark-naples-approach",
    title: "Naples Approach Performance Benchmark",
    seed: "benchmark-naples-approach-v1",
    player: {
      factionId: "spain",
      shipSlug: "caravel",
      lat: 40.72,
      lon: 12.15,
      headingDeg: 90,
      activePlaySeconds: 90
    },
    world: { day: 196, hour: 11, minute: 20, timeScale: 180 },
    diplomacy: [],
    encounters: []
  }),
  "benchmark-patagonia-chart": scenario({
    id: "benchmark-patagonia-chart",
    title: "Round Earth B-Roll: Cape Horn",
    seed: "benchmark-patagonia-chart-v1",
    player: {
      factionId: "spain",
      shipSlug: "galleon",
      lat: -52.2,
      lon: -74.33,
      headingDeg: 0,
      activePlaySeconds: 90
    },
    world: { day: 232, hour: 11, minute: 20, timeScale: 180 },
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
    title: "Discover the Pyramids of Meroe",
    seed: "trailer-explore-pyramid-v2",
    player: capturePlayer("ottoman", "felucca", 17.82, 33.63, 270),
    world: captureWorld(68, 16, 50),
    sequence: trailerSequence("explore", "pyramid", {
      discoveryName: "The Pyramids of Meroe",
      riverStart: { lat: 17.82, lon: 33.63 },
      sailingTarget: { lat: 15.6, lon: 32.55 },
      requireOpenWaterCourse: true
    })
  }),
  "trailer-trade-ternate": trailerScenario({
    id: "trailer-trade-ternate",
    title: "Buy Cloves in Ternate",
    seed: "trailer-trade-ternate-v1",
    player: capturePlayer("portugal", "portuguese-carrack", 0.79, 127.38, 180, {
      characterPortraitSourceId: TRAILER_TERNATE_CAPTAIN_SOURCE_ID,
      homeCityName: "Lisbon"
    }),
    world: captureWorld(196, 13, 10),
    sequence: trailerSequence("trade", "buy", {
      cityName: "Ternate",
      goodId: "cloves",
      transactionCount: 6,
      factorPortraitSourceId: TRAILER_TERNATE_FACTOR_SOURCE_ID
    })
  }),
  "trailer-trade-lisbon": trailerScenario({
    id: "trailer-trade-lisbon",
    title: "Sell Cinnamon in Lisbon",
    seed: "trailer-trade-lisbon-v1",
    player: capturePlayer("portugal", "portuguese-carrack", 38.72, -9.14, 90, {
      characterPortraitSourceId: TRAILER_LISBON_CAPTAIN_SOURCE_ID,
      homeCityName: "Lisbon"
    }),
    world: captureWorld(196, 15, 20),
    sequence: trailerSequence("trade", "sell", {
      cityName: "Lisbon",
      goodId: "cinnamon",
      transactionCount: 6,
      factorPortraitSourceId: TRAILER_LISBON_FACTOR_SOURCE_ID
    })
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
  "trailer-sail-caravel": sailingTrailerScenario({
    id: "trailer-sail-caravel",
    title: "Caravel on a Beam Reach",
    seed: "trailer-sail-caravel-v1",
    factionId: "portugal",
    shipSlug: "caravel",
    lat: 18,
    lon: -42,
    day: 72,
    hour: 8,
    minute: 20,
    beamSide: "starboard"
  }),
  "trailer-sail-large-junk": sailingTrailerScenario({
    id: "trailer-sail-large-junk",
    title: "Large Junk on a Beam Reach",
    seed: "trailer-sail-large-junk-v1",
    factionId: "ming",
    shipSlug: "large-junk",
    lat: 24,
    lon: 137,
    day: 126,
    hour: 6,
    minute: 35,
    beamSide: "port"
  }),
  "trailer-sail-xebec": sailingTrailerScenario({
    id: "trailer-sail-xebec",
    title: "Xebec on a Beam Reach",
    seed: "trailer-sail-xebec-v1",
    factionId: "ottoman",
    shipSlug: "xebec",
    lat: 32,
    lon: 20,
    day: 184,
    hour: 12,
    minute: 5,
    beamSide: "starboard"
  }),
  "trailer-sail-brigantine": sailingTrailerScenario({
    id: "trailer-sail-brigantine",
    title: "Brigantine on a Beam Reach",
    seed: "trailer-sail-brigantine-v2",
    factionId: "england",
    shipSlug: "brigantine",
    lat: 40,
    lon: -50,
    day: 218,
    hour: 15,
    minute: 40,
    beamSide: "port"
  }),
  "trailer-sail-portuguese-carrack": sailingTrailerScenario({
    id: "trailer-sail-portuguese-carrack",
    title: "Portuguese Carrack on a Beam Reach",
    seed: "trailer-sail-portuguese-carrack-v1",
    factionId: "portugal",
    shipSlug: "portuguese-carrack",
    lat: -22,
    lon: -18,
    day: 258,
    hour: 17,
    minute: 15,
    beamSide: "starboard"
  }),
  "trailer-sail-dhow": sailingTrailerScenario({
    id: "trailer-sail-dhow",
    title: "Dhow on a Beam Reach",
    seed: "trailer-sail-dhow-v1",
    factionId: "ottoman",
    shipSlug: "dhow",
    lat: 4,
    lon: 66,
    day: 302,
    hour: 7,
    minute: 10,
    beamSide: "port"
  }),
  "trailer-sail-galleon": sailingTrailerScenario({
    id: "trailer-sail-galleon",
    title: "Galleon on a Beam Reach",
    seed: "trailer-sail-galleon-v1",
    factionId: "spain",
    shipSlug: "galleon",
    lat: -12,
    lon: -112,
    day: 336,
    hour: 18,
    minute: 5,
    beamSide: "starboard"
  }),
  "trailer-sail-felucca": sailingTrailerScenario({
    id: "trailer-sail-felucca",
    title: "Felucca on a Beam Reach",
    seed: "trailer-sail-felucca-v1",
    factionId: "ottoman",
    shipSlug: "felucca",
    lat: 16,
    lon: 62,
    day: 24,
    hour: 10,
    minute: 45,
    beamSide: "port"
  }),
  "screenshot-sail-great-barrier-reef": sailingTrailerScenario({
    id: "screenshot-sail-great-barrier-reef",
    title: "Sailing ship",
    seed: "screenshot-sail-great-barrier-reef-v1",
    factionId: "portugal",
    shipSlug: "caravel",
    lat: -18.4,
    lon: 147.2,
    day: 196,
    hour: 2,
    minute: 20,
    beamSide: "starboard"
  }),
  "screenshot-sail-ternate": sailingTrailerScenario({
    id: "screenshot-sail-ternate",
    title: "Sailing ship",
    seed: "screenshot-sail-ternate-v1",
    factionId: "ternate",
    shipSlug: "kelulus",
    lat: 0.8,
    lon: 127.3,
    day: 220,
    hour: 3,
    minute: 40,
    beamSide: "port"
  }),
  "screenshot-sail-seto": sailingTrailerScenario({
    id: "screenshot-sail-seto",
    title: "Sailing ship",
    seed: "screenshot-sail-seto-v1",
    factionId: "japan",
    shipSlug: "japanese-sekibune",
    lat: 34.3,
    lon: 133.1,
    day: 148,
    hour: 3,
    minute: 10,
    beamSide: "starboard"
  }),
  "screenshot-sail-bosporus": sailingTrailerScenario({
    id: "screenshot-sail-bosporus",
    title: "Sailing ship",
    seed: "screenshot-sail-bosporus-v1",
    factionId: "ottoman",
    shipSlug: "ottoman-coastal-trader",
    lat: 40.8,
    lon: 28.8,
    day: 172,
    hour: 12,
    minute: 30,
    beamSide: "port"
  }),
  "screenshot-sail-lake-victoria": sailingTrailerScenario({
    id: "screenshot-sail-lake-victoria",
    title: "Sailing ship",
    seed: "screenshot-sail-lake-victoria-v1",
    factionId: "ethiopia",
    shipSlug: "dhow",
    lat: -1.0,
    lon: 33.0,
    day: 90,
    hour: 13,
    minute: 0,
    timeScale: 1,
    beamSide: "starboard"
  }),
  "short-datasets-panama": sailingTrailerScenario({
    id: "short-datasets-panama",
    title: "Sailing ship",
    seed: "short-datasets-panama-v3",
    factionId: "spain",
    shipSlug: "caravel",
    lat: 7.0,
    lon: -79.65,
    day: 64,
    hour: 11,
    minute: 20,
    timeScale: 1,
    beamSide: "port"
  }),
  "short-datasets-gibraltar": sailingTrailerScenario({
    id: "short-datasets-gibraltar",
    title: "Sailing ship",
    seed: "short-datasets-gibraltar-v1",
    factionId: "spain",
    shipSlug: "caravel",
    lat: 35.94,
    lon: -5.75,
    day: 196,
    hour: 11,
    minute: 20,
    timeScale: 1,
    beamSide: "starboard"
  }),
  "short-upwind-voyage": upwindSailingScenario({
    id: "short-upwind-voyage",
    seed: "short-upwind-voyage-v10",
    factionId: "portugal",
    shipSlug: "caravel",
    lat: 15,
    lon: -24,
    day: 196,
    hour: 10,
    minute: 20,
    variant: "upwind-voyage",
    cityName: "Ribeira Grande",
    durationSeconds: 37
  }),
  "short-upwind-turtle-ship": upwindSailingScenario({
    id: "short-upwind-turtle-ship",
    seed: "short-upwind-turtle-ship-v1",
    factionId: "joseon",
    shipSlug: "joseon-turtle-ship",
    lat: 32,
    lon: 128,
    day: 60,
    hour: 3,
    minute: 40,
    variant: "row-upwind",
    durationSeconds: 6
  }),
  "short-upwind-galley": upwindSailingScenario({
    id: "short-upwind-galley",
    seed: "short-upwind-galley-v2",
    factionId: "ottoman",
    shipSlug: "mediterranean-galley",
    lat: -20,
    lon: -25,
    day: 140,
    hour: 12,
    minute: 20,
    variant: "row-upwind",
    durationSeconds: 6
  }),
  "short-upwind-galleass": upwindSailingScenario({
    id: "short-upwind-galleass",
    seed: "short-upwind-galleass-v2",
    factionId: "venice",
    shipSlug: "galleass",
    lat: -30,
    lon: -20,
    day: 110,
    hour: 11,
    minute: 0,
    variant: "row-upwind",
    durationSeconds: 6
  }),
  "trailer-fight-turtle": trailerScenario({
    id: "trailer-fight-turtle",
    title: "Turtle Ship Battle",
    seed: "trailer-fight-turtle-v1",
    player: capturePlayer("joseon", "joseon-turtle-ship", 34.82, 129.24, 90),
    world: captureWorld(196, 13, 20),
    diplomacy: [{ factionAId: "joseon", factionBId: "japan", relation: "war" }],
    encounters: [captureEncounter("trailer-atakebune", "japan", "japanese-atakebune", 34.82, 130.63, 90)],
    sequence: trailerSequence("fight", "turtle", {
      encounterId: "trailer-atakebune",
      broadsideSide: "starboard"
    })
  }),
  "trailer-fight-atlantic": trailerScenario({
    id: "trailer-fight-atlantic",
    title: "Carrack Broadside",
    seed: "trailer-fight-atlantic-v1",
    player: capturePlayer("portugal", "portuguese-carrack", 35.7, -29.0, 90),
    world: captureWorld(205, 16, 10),
    diplomacy: [{ factionAId: "portugal", factionBId: "spain", relation: "war" }],
    encounters: [captureEncounter("trailer-spanish-galleon", "spain", "galleon", 35.7, -27.62, 90)],
    sequence: trailerSequence("fight", "atlantic", {
      encounterId: "trailer-spanish-galleon",
      broadsideSide: "starboard"
    })
  }),
  "short-fight-small-arms": trailerScenario({
    id: "short-fight-small-arms",
    title: "Crossbows",
    seed: "short-fight-small-arms-v2",
    player: capturePlayer("portugal", "portuguese-carrack", 35.7, -29.0, 90),
    world: captureWorld(205, 14, 20),
    diplomacy: [{ factionAId: "portugal", factionBId: "spain", relation: "war" }],
    encounters: [
      captureFightEncounter("short-small-arms-galleon", "spain", "galleon", 35.7, -27.88, 0)
    ],
    sequence: trailerSequence("fight", "small-arms", {
      durationSeconds: 30,
      encounterId: "short-small-arms-galleon"
    })
  }),
  "short-fight-small-arms-korea": trailerScenario({
    id: "short-fight-small-arms-korea",
    title: "Crossbows",
    seed: "short-fight-small-arms-korea-v1",
    player: capturePlayer("joseon", "joseon-turtle-ship", 33.2, 128.2, 90),
    world: captureWorld(196, 11, 20),
    diplomacy: [{ factionAId: "joseon", factionBId: "japan", relation: "war" }],
    encounters: [
      captureFightEncounter(
        "short-small-arms-atakebune",
        "japan",
        "japanese-atakebune",
        33.2,
        129.35,
        0
      )
    ],
    sequence: trailerSequence("fight", "small-arms", {
      durationSeconds: 30,
      encounterId: "short-small-arms-atakebune"
    })
  }),
  "short-fight-small-arms-mediterranean": trailerScenario({
    id: "short-fight-small-arms-mediterranean",
    title: "Crossbows",
    seed: "short-fight-small-arms-mediterranean-v1",
    player: capturePlayer("ottoman", "xebec", 35.5, 17.0, 90),
    world: captureWorld(184, 12, 20),
    diplomacy: [{ factionAId: "ottoman", factionBId: "venice", relation: "war" }],
    encounters: [
      captureFightEncounter(
        "short-small-arms-galleass",
        "venice",
        "galleass",
        35.5,
        18.25,
        0
      )
    ],
    sequence: trailerSequence("fight", "small-arms", {
      durationSeconds: 30,
      encounterId: "short-small-arms-galleass"
    })
  }),
  "trailer-pillage-havana": trailerScenario({
    id: "trailer-pillage-havana",
    title: "Bombard Havana",
    seed: "trailer-pillage-havana-v1",
    player: capturePlayer("england", "galleon", 23.11, -82.37, 0),
    world: captureWorld(210, 14, 40),
    diplomacy: [{ factionAId: "england", factionBId: "spain", relation: "war" }],
    sequence: trailerSequence("pillage", "bombard", {
      cityName: "Havana",
      broadsideSide: "starboard"
    })
  }),
  "trailer-pillage-alexandria": trailerScenario({
    id: "trailer-pillage-alexandria",
    title: "Take Alexandria",
    seed: "trailer-pillage-alexandria-v1",
    player: capturePlayer("venice", "galleon", 31.20, 29.91, 180, {
      characterPortraitSourceId: TRAILER_ALEXANDRIA_CAPTAIN_SOURCE_ID,
      homeCityName: "Venice"
    }),
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
  "short-colony-offer": trailerScenario({
    id: "short-colony-offer",
    title: COLONY_SHORT_SCENE_OFFER_CAPTURE,
    seed: "short-colony-offer-v1",
    player: capturePlayer("france", "carrack", 44.84, -1.26, 15, {
      characterPortraitSourceId: COLONY_SHORT_CAPTAIN_SOURCE_ID,
      homeCityName: COLONY_SHORT_BORDEAUX
    }),
    world: captureWorld(176, 9, 45),
    sequence: trailerSequence("colonize", "offer", {
      durationSeconds: 14,
      cityName: COLONY_SHORT_PORT_ROYAL,
      originCityName: COLONY_SHORT_BORDEAUX,
      organizerPortraitSourceId: COLONY_SHORT_ORGANIZER_SOURCE_ID
    })
  }),
  "short-colony-embark": trailerScenario({
    id: "short-colony-embark",
    title: COLONY_SHORT_SCENE_EMBARK,
    seed: "short-colony-embark-v1",
    player: capturePlayer("france", "carrack", 44.84, -1.26, 15, {
      characterPortraitSourceId: COLONY_SHORT_CAPTAIN_SOURCE_ID,
      homeCityName: COLONY_SHORT_BORDEAUX
    }),
    world: captureWorld(176, 10, 30),
    sequence: trailerSequence("colonize", "embark", {
      durationSeconds: 12,
      cityName: COLONY_SHORT_PORT_ROYAL,
      originCityName: COLONY_SHORT_BORDEAUX,
      organizerPortraitSourceId: COLONY_SHORT_ORGANIZER_SOURCE_ID
    })
  }),
  "short-colony-sail-outbound": sailingTrailerScenario({
    id: "short-colony-sail-outbound",
    title: COLONY_SHORT_SCENE_OUTBOUND,
    seed: "short-colony-sail-outbound-v2",
    factionId: "spain",
    shipSlug: "galleon",
    lat: 31,
    lon: -20,
    day: 176,
    hour: 11,
    minute: 20,
    beamSide: "starboard"
  }),
  "short-colony-sail-atlantic": sailingTrailerScenario({
    id: "short-colony-sail-atlantic",
    title: COLONY_SHORT_SCENE_ATLANTIC,
    seed: "short-colony-sail-atlantic-v1",
    factionId: "england",
    shipSlug: "brigantine",
    lat: 42,
    lon: -38,
    day: 180,
    hour: 13,
    minute: 15,
    beamSide: "port"
  }),
  "short-colony-sail-acadia": sailingTrailerScenario({
    id: "short-colony-sail-acadia",
    title: COLONY_SHORT_SCENE_ACADIA,
    seed: "short-colony-sail-acadia-v1",
    factionId: "france",
    shipSlug: "carrack",
    lat: 44.2,
    lon: -62.2,
    day: 184,
    hour: 16,
    minute: 10,
    beamSide: "starboard"
  }),
  "short-colony-found": trailerScenario({
    id: "short-colony-found",
    title: COLONY_SHORT_SCENE_FOUND,
    seed: "short-colony-found-v1",
    player: capturePlayer("spain", "galleon", -34.61, -58.38, 45, {
      characterPortraitSourceId: COLONY_SHORT_CAPTAIN_SOURCE_ID,
      homeCityName: COLONY_SHORT_SEVILLE
    }),
    world: captureWorld(184, 16, 35),
    sequence: trailerSequence("colonize", "found", {
      durationSeconds: 12,
      cityName: COLONY_SHORT_BUENOS_AIRES,
      originCityName: COLONY_SHORT_SEVILLE,
      organizerPortraitSourceId: COLONY_SHORT_ORGANIZER_SOURCE_ID
    })
  }),
  "short-colony-deadline": trailerScenario({
    id: "short-colony-deadline",
    title: COLONY_SHORT_SCENE_DEADLINE_CAPTURE,
    seed: "short-colony-deadline-v2",
    player: capturePlayer("england", "brigantine", 37.21, -76.78, 315, {
      characterPortraitSourceId: COLONY_SHORT_CAPTAIN_SOURCE_ID,
      homeCityName: COLONY_SHORT_LONDON
    }),
    world: captureWorld(214, 16, 15),
    sequence: trailerSequence("colonize", "deadline", {
      durationSeconds: 12,
      cityName: COLONY_SHORT_JAMESTOWN,
      originCityName: COLONY_SHORT_LONDON,
      organizerPortraitSourceId: COLONY_SHORT_ORGANIZER_SOURCE_ID
    })
  }),
  "short-colony-resupply": trailerScenario({
    id: "short-colony-resupply",
    title: COLONY_SHORT_SCENE_RESUPPLY,
    seed: "short-colony-resupply-v1",
    player: capturePlayer("portugal", "portuguese-carrack", -8.05, -34.88, 315, {
      characterPortraitSourceId: COLONY_SHORT_CAPTAIN_SOURCE_ID,
      homeCityName: COLONY_SHORT_LISBON
    }),
    world: captureWorld(220, 15, 0),
    sequence: trailerSequence("colonize", "resupply", {
      durationSeconds: 12,
      cityName: COLONY_SHORT_RECIFE,
      originCityName: COLONY_SHORT_LISBON,
      organizerPortraitSourceId: COLONY_SHORT_ORGANIZER_SOURCE_ID
    })
  }),
  "short-colony-defense": trailerScenario({
    id: "short-colony-defense",
    title: COLONY_SHORT_SCENE_DEFENSE,
    seed: "short-colony-defense-v1",
    player: capturePlayer("portugal", "galleon", -22.9, -43.21, 90, {
      characterPortraitSourceId: COLONY_SHORT_CAPTAIN_SOURCE_ID,
      homeCityName: COLONY_SHORT_LISBON
    }),
    world: captureWorld(238, 12, 20),
    sequence: trailerSequence("colonize", "defend", {
      durationSeconds: 16,
      cityName: COLONY_SHORT_RIO,
      originCityName: COLONY_SHORT_LISBON,
      organizerPortraitSourceId: COLONY_SHORT_ORGANIZER_SOURCE_ID
    })
  }),
  "short-colony-city": trailerScenario({
    id: "short-colony-city",
    title: COLONY_SHORT_SCENE_CITY,
    seed: "short-colony-city-v1",
    player: capturePlayer("spain", "galleon", 14.58, 121, 315, {
      characterPortraitSourceId: COLONY_SHORT_CAPTAIN_SOURCE_ID,
      homeCityName: COLONY_SHORT_SEVILLE
    }),
    world: captureWorld(240, 14, 20),
    sequence: trailerSequence("colonize", "city", {
      durationSeconds: 14,
      cityName: COLONY_SHORT_MANILA,
      originCityName: COLONY_SHORT_SEVILLE,
      organizerPortraitSourceId: COLONY_SHORT_ORGANIZER_SOURCE_ID
    })
  }),
  "trailer-survive-lightning": trailerScenario({
    id: "trailer-survive-lightning",
    title: "Survive a Lightning Strike",
    seed: "trailer-survive-lightning-v1",
    player: capturePlayer("england", "brigantine", 49.0, -18.0, 70),
    world: captureWorld(285, 21, 10),
    sequence: trailerSequence("survive", "lightning")
  }),
  "trailer-demo-trade-naples": trailerScenario({
    id: "trailer-demo-trade-naples",
    debugCaption: "Buy Olive Oil in Naples",
    seed: "trailer-demo-trade-naples-v1",
    player: capturePlayer("spain", "brigantine", 40.85, 14.27, 180, {
      characterPortraitSourceId: TRAILER_LISBON_CAPTAIN_SOURCE_ID,
      homeCityName: "Venice"
    }),
    world: captureWorld(118, 13, 40),
    sequence: trailerSequence("trade", "buy", {
      cityName: captureNaplesCityId(),
      goodId: "olive-oil",
      transactionCount: 4,
      factorPortraitSourceId: TRAILER_TERNATE_FACTOR_SOURCE_ID
    })
  }),
  "trailer-demo-explore-great-pyramid": trailerScenario({
    id: "trailer-demo-explore-great-pyramid",
    debugCaption: "Discover the Great Pyramid",
    seed: "trailer-demo-explore-great-pyramid-v1",
    player: capturePlayer("ottoman", "felucca", 31.5, 29.0, 135),
    world: captureWorld(68, 15, 30),
    sequence: trailerSequence("explore", "great-pyramid", {
      discoveryName: "The Great Pyramid",
      sailingTarget: { lat: 32.4, lon: 28.5 },
      requireOpenWaterCourse: true
    })
  }),
  "trailer-demo-trade-alexandria": trailerScenario({
    id: "trailer-demo-trade-alexandria",
    debugCaption: "Sell Olive Oil in Alexandria",
    seed: "trailer-demo-trade-alexandria-v1",
    player: capturePlayer("venice", "brigantine", 31.2, 29.91, 180, {
      characterPortraitSourceId: TRAILER_LISBON_CAPTAIN_SOURCE_ID,
      homeCityName: "Venice"
    }),
    world: captureWorld(118, 15, 10),
    sequence: trailerSequence("trade", "sell", {
      cityName: "Alexandria",
      goodId: "olive-oil",
      transactionCount: 4,
      factorPortraitSourceId: TRAILER_TERNATE_FACTOR_SOURCE_ID
    })
  }),
  "trailer-demo-fish-ionian": trailerScenario({
    id: "trailer-demo-fish-ionian",
    debugCaption: "Fish the Ionian Sea",
    seed: "trailer-demo-fish-ionian-v1",
    player: capturePlayer("venice", "fusta", 37.4, 25.2, 90),
    world: captureWorld(146, 10, 20),
    sequence: trailerSequence("fish", "ionian", {
      durationSeconds: 4.5,
      requireOpenWaterCourse: true
    })
  }),
  "trailer-demo-fish-aegean": trailerScenario({
    id: "trailer-demo-fish-aegean",
    debugCaption: "Fish the Aegean Sea",
    seed: "trailer-demo-fish-aegean-v1",
    player: capturePlayer("ottoman", "felucca", 37.0, 24.2, 270),
    world: captureWorld(146, 10, 20),
    sequence: trailerSequence("fish", "aegean", {
      durationSeconds: 4.5,
      requireOpenWaterCourse: true
    })
  }),
  "trailer-demo-whale-harpoon": trailerScenario({
    id: "trailer-demo-whale-harpoon",
    debugCaption: "Harpoon a Mediterranean Sperm Whale",
    seed: "trailer-demo-whale-harpoon-v1",
    player: capturePlayer("venice", "brigantine", 36.0, 18.5, 90),
    world: captureWorld(118, 11, 30),
    sequence: trailerSequence("whale", "harpoon", {
      durationSeconds: 3,
      speciesId: "sperm-whale",
      requireOpenWaterCourse: true
    })
  }),
  "trailer-demo-whale-finish": trailerScenario({
    id: "trailer-demo-whale-finish",
    debugCaption: "Finish an Atlantic Sperm Whale Hunt",
    seed: "trailer-whale-sperm-v1",
    player: capturePlayer("venice", "brigantine", 35.7, -29.0, 105),
    world: captureWorld(250, 17, 25),
    sequence: trailerSequence("whale", "finish", {
      speciesId: "sperm-whale",
      requireOpenWaterCourse: true
    })
  }),
  "trailer-demo-sail-galleass": demoTrailerSailingScenario({
    id: "trailer-demo-sail-galleass",
    debugCaption: "Galleass in the Mediterranean",
    seed: "trailer-demo-sail-galleass-v1",
    factionId: "venice",
    shipSlug: "galleass",
    lat: 34.0,
    lon: 22.0,
    day: 118,
    hour: 11,
    minute: 20,
    beamSide: "starboard"
  }),
  "trailer-demo-sail-fusta": demoTrailerSailingScenario({
    id: "trailer-demo-sail-fusta",
    debugCaption: "Fusta off Sicily",
    seed: "trailer-demo-sail-fusta-v1",
    factionId: "venice",
    shipSlug: "fusta",
    lat: 34.0,
    lon: 22.0,
    day: 156,
    hour: 15,
    minute: 10,
    beamSide: "port"
  }),
  "trailer-demo-sail-galley": demoTrailerSailingScenario({
    id: "trailer-demo-sail-galley",
    debugCaption: "Mediterranean Galley off Crete",
    seed: "trailer-demo-sail-galley-v1",
    factionId: "ottoman",
    shipSlug: "mediterranean-galley",
    lat: 37.0,
    lon: 25.0,
    day: 136,
    hour: 13,
    minute: 10,
    beamSide: "starboard"
  }),
  "trailer-demo-sail-dhow": demoTrailerSailingScenario({
    id: "trailer-demo-sail-dhow",
    debugCaption: "Dhow in the Levant",
    seed: "trailer-demo-sail-dhow-v1",
    factionId: "ottoman",
    shipSlug: "dhow",
    lat: 34.0,
    lon: 24.0,
    day: 220,
    hour: 16,
    minute: 0,
    beamSide: "port"
  }),
  "trailer-demo-sail-xebec": demoTrailerSailingScenario({
    id: "trailer-demo-sail-xebec",
    debugCaption: "Xebec in the Libyan Sea",
    seed: "trailer-demo-sail-xebec-v1",
    factionId: "ottoman",
    shipSlug: "xebec",
    lat: 32.8,
    lon: 20.5,
    day: 248,
    hour: 12,
    minute: 20,
    beamSide: "starboard"
  }),
  "trailer-demo-sail-carrack": demoTrailerSailingScenario({
    id: "trailer-demo-sail-carrack",
    debugCaption: "Carrack in the Libyan Sea",
    seed: "trailer-demo-sail-carrack-v1",
    factionId: "spain",
    shipSlug: "carrack",
    lat: 32.8,
    lon: 20.5,
    day: 248,
    hour: 12,
    minute: 20,
    beamSide: "starboard"
  }),
  "trailer-demo-sail-felucca": demoTrailerSailingScenario({
    id: "trailer-demo-sail-felucca",
    debugCaption: "Felucca in the Nile Delta",
    seed: "trailer-demo-sail-felucca-v1",
    factionId: "ottoman",
    shipSlug: "felucca",
    lat: 33.0,
    lon: 28.0,
    day: 82,
    hour: 9,
    minute: 50,
    beamSide: "starboard"
  }),
  "trailer-demo-sail-coastal-trader": demoTrailerSailingScenario({
    id: "trailer-demo-sail-coastal-trader",
    debugCaption: "Ottoman Coastal Trader off Alexandria",
    seed: "trailer-demo-sail-coastal-trader-v1",
    factionId: "ottoman",
    shipSlug: "ottoman-coastal-trader",
    lat: 33.0,
    lon: 28.0,
    day: 106,
    hour: 14,
    minute: 30,
    beamSide: "port"
  }),
  "trailer-demo-sail-nao": demoTrailerSailingScenario({
    id: "trailer-demo-sail-nao",
    debugCaption: "Spanish Nao in the Eastern Mediterranean",
    seed: "trailer-demo-sail-nao-v1",
    factionId: "spain",
    shipSlug: "spanish-nao",
    lat: 37.0,
    lon: 25.0,
    day: 136,
    hour: 13,
    minute: 10,
    beamSide: "starboard"
  }),
  "trailer-demo-fleet-approach-east": demoTrailerGalleassFleetScenario({
    id: "trailer-demo-fleet-approach-east",
    debugCaption: "A Venetian Galleass Closes on an Ottoman Squadron",
    seed: "trailer-demo-fleet-approach-east-v1",
    lat: 35.5,
    lon: 17.0,
    side: "starboard",
    variant: "approach"
  }),
  "trailer-demo-fleet-approach-west": demoTrailerGalleassFleetScenario({
    id: "trailer-demo-fleet-approach-west",
    debugCaption: "A Venetian Galleass Crosses an Ottoman Squadron",
    seed: "trailer-demo-fleet-approach-west-v1",
    lat: 32.0,
    lon: 17.5,
    side: "port",
    variant: "approach"
  }),
  "trailer-demo-fight-galleass-starboard": demoTrailerGalleassFleetScenario({
    id: "trailer-demo-fight-galleass-starboard",
    debugCaption: "A Venetian Galleass Fires into an Ottoman Squadron",
    seed: "trailer-demo-fight-galleass-starboard-v1",
    lat: 35.5,
    lon: 17.0,
    side: "starboard",
    variant: "fight"
  }),
  "trailer-demo-fight-galleass-port": demoTrailerGalleassFleetScenario({
    id: "trailer-demo-fight-galleass-port",
    debugCaption: "A Venetian Galleass Fires Its Port Broadside",
    seed: "trailer-demo-fight-galleass-port-v1",
    lat: 37.0,
    lon: 17.5,
    side: "port",
    variant: "fight"
  }),
  "trailer-demo-pillage-alexandria": trailerScenario({
    id: "trailer-demo-pillage-alexandria",
    debugCaption: "Bombard Alexandria",
    seed: "trailer-demo-pillage-alexandria-v1",
    player: capturePlayer("venice", "galleass", 31.2, 29.91, 180),
    world: captureWorld(92, 12, 10),
    diplomacy: [{ factionAId: "venice", factionBId: "ottoman", relation: "war" }],
    sequence: trailerSequence("pillage", "bombard", {
      cityName: "Alexandria",
      broadsideSide: "starboard",
      holdBroadsideAim: true
    })
  }),
  "trailer-demo-survive-sinking": trailerScenario({
    id: "trailer-demo-survive-sinking",
    debugCaption: "A Mediterranean Storm Sinks a Fusta",
    seed: "trailer-demo-survive-sinking-v1",
    player: capturePlayer("venice", "fusta", 32.5, 20.0, 70),
    world: captureWorld(285, 14, 10),
    sequence: trailerSequence("survive", "lightning-sinking", {
      durationSeconds: 3,
      requireOpenWaterCourse: true
    })
  }),
  "trailer-demo-survive-lightning": trailerScenario({
    id: "trailer-demo-survive-lightning",
    debugCaption: "Lightning Strikes in the Mediterranean",
    seed: "trailer-demo-survive-lightning-v1",
    player: capturePlayer("ottoman", "xebec", 32.5, 19.0, 70),
    world: captureWorld(285, 20, 10),
    sequence: trailerSequence("survive", "lightning", {
      durationSeconds: 3,
      requireOpenWaterCourse: true
    })
  }),
  "short-storm-lightning-sinking": trailerScenario({
    id: "short-storm-lightning-sinking",
    title: "Lightning struck the ship during a storm.",
    seed: "short-storm-lightning-sinking-v1",
    player: capturePlayer("england", "fishing-lugger", 49.0, -18.0, 70),
    world: captureWorld(285, 21, 10),
    sequence: trailerSequence("survive", "lightning-sinking", { durationSeconds: 8 })
  }),
  "short-storm-sail-fishing-lugger": sailingTrailerScenario({
    id: "short-storm-sail-fishing-lugger",
    title: "Sailing ship",
    seed: "short-storm-sail-fishing-lugger-v1",
    factionId: "scotland",
    shipSlug: "fishing-lugger",
    lat: 57.5,
    lon: -12.0,
    day: 196,
    hour: 13,
    minute: 20,
    beamSide: "starboard"
  }),
  "short-storm-sail-mediterranean-galley": sailingTrailerScenario({
    id: "short-storm-sail-mediterranean-galley",
    title: "Sailing ship",
    seed: "short-storm-sail-mediterranean-galley-v1",
    factionId: "ottoman",
    shipSlug: "mediterranean-galley",
    lat: 33.0,
    lon: 20.0,
    day: 196,
    hour: 14,
    minute: 10,
    beamSide: "port"
  }),
  "short-storm-overboard-rescue": trailerScenario({
    id: "short-storm-overboard-rescue",
    title: "Sailing ship",
    seed: "short-storm-overboard-rescue-v1",
    player: capturePlayer("ottoman", "mediterranean-galley", 25.0, -40.0, 90),
    world: captureWorld(285, 14, 10),
    sequence: trailerSequence("survive", "overboard-rescue", { durationSeconds: 18 })
  }),
  "short-loadout-deprivation": trailerScenario({
    id: "short-loadout-deprivation",
    title: "NO FRESH WATER",
    seed: "short-loadout-deprivation-v1",
    player: capturePlayer("portugal", "caravel", 18.5, -39.5, 90, {
      characterPortraitSourceId: LOADOUT_SHORT_CAPTAIN_SOURCE_ID,
      homeCityName: LOADOUT_SHORT_PORT
    }),
    world: captureWorld(130, 12, 20, 180),
    sequence: trailerSequence("survive", "deprivation-death", { durationSeconds: 12 })
  }),
  "short-loadout-presets": trailerScenario({
    id: "short-loadout-presets",
    title: "Choose the targets we should automatically restore whenever you dock.",
    seed: "short-loadout-presets-v1",
    player: capturePlayer("portugal", "portuguese-carrack", 38.72, -9.14, 45, {
      characterPortraitSourceId: LOADOUT_SHORT_CAPTAIN_SOURCE_ID,
      homeCityName: LOADOUT_SHORT_PORT
    }),
    world: captureWorld(196, 13, 10),
    sequence: trailerSequence("loadout", "presets", {
      durationSeconds: 16,
      cityName: LOADOUT_SHORT_PORT
    })
  }),
  "short-loadout-custom": trailerScenario({
    id: "short-loadout-custom",
    title: "Set crew, guns, and stores. Extra hands improve field work and gun loading. Smaller stores dump excess provisions without refund.",
    seed: "short-loadout-custom-v1",
    player: capturePlayer("portugal", "portuguese-carrack", 38.72, -9.14, 45, {
      characterPortraitSourceId: LOADOUT_SHORT_CAPTAIN_SOURCE_ID,
      homeCityName: LOADOUT_SHORT_PORT
    }),
    world: captureWorld(196, 14, 10),
    sequence: trailerSequence("loadout", "custom", {
      durationSeconds: 18,
      cityName: LOADOUT_SHORT_PORT
    })
  }),
  "short-trade-goods-grain": trailerScenario({
    id: "short-trade-goods-grain",
    title: TRADE_GOODS_SHORT_TITLE_GRAIN,
    seed: "short-trade-goods-grain-v1",
    player: capturePlayer("ottoman", "felucca", 31.2, 29.91, 180, {
      characterPortraitSourceId: RELIGION_SHORT_MALE_CAPTAIN_SOURCE_ID,
      homeCityName: RELIGION_SHORT_CITY_THESSALONIKI
    }),
    world: captureWorld(196, 14, 5),
    sequence: trailerSequence("trade", "sell", {
      durationSeconds: 9,
      cityName: TRADE_GOODS_SHORT_ALEXANDRIA,
      goodId: "grain",
      transactionCount: 3,
      factorPortraitSourceId: TRADE_GOODS_SHORT_FACTOR_SOURCE_ID
    })
  }),
  "short-trade-goods-wine": trailerScenario({
    id: "short-trade-goods-wine",
    title: TRADE_GOODS_SHORT_TITLE_WINE,
    seed: "short-trade-goods-wine-v1",
    player: capturePlayer("france", "brigantine", 45.7, -1.1, 90, {
      characterPortraitSourceId: TRADE_GOODS_SHORT_CAPTAIN_SOURCE_ID,
      homeCityName: TRADE_GOODS_SHORT_BORDEAUX
    }),
    world: captureWorld(196, 15, 20),
    sequence: trailerSequence("trade", "sell", {
      durationSeconds: 9,
      cityName: TRADE_GOODS_SHORT_BORDEAUX,
      goodId: "wine",
      transactionCount: 3,
      factorPortraitSourceId: TRADE_GOODS_SHORT_FACTOR_SOURCE_ID
    })
  }),
  "short-trade-goods-river-fishing": trailerScenario({
    id: "short-trade-goods-river-fishing",
    title: TRADE_GOODS_SHORT_TITLE_RIVER,
    seed: "short-trade-goods-river-fishing-v1",
    player: capturePlayer("neutral", "mesoamerican-dugout-canoe", 48, -123, 25),
    world: captureWorld(280, 11, 15),
    sequence: trailerSequence("fish", "river", { durationSeconds: 10 })
  }),
  "short-trade-goods-lake-fishing": trailerScenario({
    id: "short-trade-goods-lake-fishing",
    title: TRADE_GOODS_SHORT_TITLE_LAKE,
    seed: "short-trade-goods-lake-fishing-v1",
    player: capturePlayer("neutral", "mesoamerican-dugout-canoe", 45, -84, 210),
    world: captureWorld(196, 12, 10),
    sequence: trailerSequence("fish", "lake", { durationSeconds: 10 })
  }),
  "short-trade-goods-wine-emergency": trailerScenario({
    id: "short-trade-goods-wine-emergency",
    title: TRADE_GOODS_SHORT_TITLE_EMERGENCY,
    seed: "short-trade-goods-wine-emergency-v1",
    player: capturePlayer("portugal", "caravel", 33, -24, 90, {
      characterPortraitSourceId: TRADE_GOODS_SHORT_CAPTAIN_SOURCE_ID,
      homeCityName: LOADOUT_SHORT_PORT
    }),
    world: captureWorld(210, 13, 20),
    sequence: trailerSequence("survive", "wine-emergency", { durationSeconds: 13 })
  }),
  "short-trade-goods-drunk-arrival": trailerScenario({
    id: "short-trade-goods-drunk-arrival",
    title: TRADE_GOODS_SHORT_TITLE_DRUNK,
    seed: "short-trade-goods-drunk-arrival-v1",
    player: capturePlayer("france", "brigantine", 45.7, -1.1, 90, {
      characterPortraitSourceId: TRADE_GOODS_SHORT_CAPTAIN_SOURCE_ID,
      homeCityName: TRADE_GOODS_SHORT_BORDEAUX
    }),
    world: captureWorld(210, 15, 10),
    sequence: trailerSequence("survive", "drunk-arrival", {
      durationSeconds: 16,
      cityName: TRADE_GOODS_SHORT_BORDEAUX
    })
  }),
  "short-trade-goods-remembered-arrival": trailerScenario({
    id: "short-trade-goods-remembered-arrival",
    title: TRADE_GOODS_SHORT_TITLE_REMEMBERED,
    seed: "short-trade-goods-remembered-arrival-v1",
    player: capturePlayer("france", "brigantine", 45.7, -1.1, 90, {
      characterPortraitSourceId: TRADE_GOODS_SHORT_CAPTAIN_SOURCE_ID,
      homeCityName: TRADE_GOODS_SHORT_BORDEAUX
    }),
    world: captureWorld(214, 12, 10),
    sequence: trailerSequence("survive", "remembered-arrival", {
      durationSeconds: 12,
      cityName: TRADE_GOODS_SHORT_BORDEAUX
    })
  }),
  "short-companions-passenger-offer": trailerScenario({
    id: "short-companions-passenger-offer",
    title: COMPANIONS_SHORT_SCENE_PASSENGER,
    seed: "short-companions-passenger-offer-v1",
    player: capturePlayer("england", "brigantine", 51.5, 0.1, 90, {
      characterPortraitSourceId: COMPANIONS_SHORT_CAPTAIN_SOURCE_ID,
      homeCityName: COMPANIONS_SHORT_LONDON
    }),
    world: captureWorld(196, 11, 20),
    sequence: trailerSequence("companions", "passenger-offer", {
      durationSeconds: 12,
      originCityName: COMPANIONS_SHORT_LONDON,
      destinationCityName: COMPANIONS_SHORT_HOME
    })
  }),
  "short-companions-passenger-arrival": trailerScenario({
    id: "short-companions-passenger-arrival",
    title: COMPANIONS_SHORT_TITLE_PASSENGER_ARRIVAL,
    seed: "short-companions-passenger-arrival-v1",
    player: capturePlayer("england", "brigantine", 49.3, 0.2, 180, {
      characterPortraitSourceId: COMPANIONS_SHORT_CAPTAIN_SOURCE_ID,
      homeCityName: COMPANIONS_SHORT_LONDON
    }),
    world: captureWorld(198, 15, 10),
    sequence: trailerSequence("companions", "passenger-arrival", {
      durationSeconds: 12,
      originCityName: COMPANIONS_SHORT_LONDON,
      destinationCityName: COMPANIONS_SHORT_HOME
    })
  }),
  "short-companions-castaway-offer": trailerScenario({
    id: "short-companions-castaway-offer",
    title: COMPANIONS_SHORT_SCENE_CASTAWAY,
    seed: "short-companions-castaway-offer-v1",
    player: capturePlayer("portugal", "caravel", 46.8, -53.2, 225, {
      characterPortraitSourceId: COMPANIONS_SHORT_CAPTAIN_SOURCE_ID,
      homeCityName: COMPANIONS_SHORT_HOME
    }),
    world: captureWorld(196, 13, 20),
    sequence: trailerSequence("companions", "castaway-offer", {
      durationSeconds: 13,
      homeCityName: COMPANIONS_SHORT_HOME
    })
  }),
  "short-companions-castaway-reunion": trailerScenario({
    id: "short-companions-castaway-reunion",
    title: COMPANIONS_SHORT_TITLE_CASTAWAY_REUNION,
    seed: "short-companions-castaway-reunion-v1",
    player: capturePlayer("portugal", "caravel", 38.72, -9.14, 45, {
      characterPortraitSourceId: COMPANIONS_SHORT_CAPTAIN_SOURCE_ID,
      homeCityName: COMPANIONS_SHORT_HOME
    }),
    world: captureWorld(202, 15, 20),
    sequence: trailerSequence("companions", "castaway-reunion", {
      durationSeconds: 19,
      homeCityName: COMPANIONS_SHORT_HOME
    })
  }),
  "short-companions-castaway-recruit": trailerScenario({
    id: "short-companions-castaway-recruit",
    title: COMPANIONS_SHORT_TITLE_CASTAWAY_RECRUIT,
    seed: "short-companions-castaway-recruit-v1",
    player: capturePlayer("portugal", "caravel", 38.72, -9.14, 45, {
      characterPortraitSourceId: COMPANIONS_SHORT_CAPTAIN_SOURCE_ID,
      homeCityName: COMPANIONS_SHORT_HOME
    }),
    world: captureWorld(205, 16, 10),
    sequence: trailerSequence("companions", "castaway-recruit", {
      durationSeconds: 15,
      homeCityName: COMPANIONS_SHORT_HOME
    })
  }),
  "short-companions-pirate-offer": trailerScenario({
    id: "short-companions-pirate-offer",
    title: COMPANIONS_SHORT_SCENE_CAPTIVE,
    seed: "short-companions-pirate-offer-v1",
    player: capturePlayer("portugal", "portuguese-carrack", 35.7, -29, 90, {
      characterPortraitSourceId: COMPANIONS_SHORT_CAPTAIN_SOURCE_ID,
      homeCityName: COMPANIONS_SHORT_HOME
    }),
    world: captureWorld(205, 14, 10),
    sequence: trailerSequence("companions", "pirate-offer", {
      durationSeconds: 13,
      homeCityName: COMPANIONS_SHORT_HOME,
      wantedCityName: COMPANIONS_SHORT_WANTED_PORT
    })
  }),
  "short-companions-pirate-escape": trailerScenario({
    id: "short-companions-pirate-escape",
    title: COMPANIONS_SHORT_TITLE_PIRATE_ESCAPE,
    seed: "short-companions-pirate-escape-v1",
    player: capturePlayer("portugal", "portuguese-carrack", 35.7, -29, 90, {
      characterPortraitSourceId: COMPANIONS_SHORT_CAPTAIN_SOURCE_ID,
      homeCityName: COMPANIONS_SHORT_HOME
    }),
    world: captureWorld(206, 15, 10),
    sequence: trailerSequence("companions", "pirate-escape", {
      durationSeconds: 14,
      homeCityName: COMPANIONS_SHORT_HOME,
      wantedCityName: COMPANIONS_SHORT_WANTED_PORT
    })
  }),
  "short-companions-pirate-revenge": trailerScenario({
    id: "short-companions-pirate-revenge",
    title: COMPANIONS_SHORT_TITLE_PIRATE_REVENGE,
    seed: "short-companions-pirate-revenge-v1",
    player: capturePlayer("portugal", "portuguese-carrack", 35.7, -29, 90, {
      characterPortraitSourceId: COMPANIONS_SHORT_CAPTAIN_SOURCE_ID,
      homeCityName: COMPANIONS_SHORT_HOME
    }),
    world: captureWorld(209, 16, 10),
    encounters: [
      {
        ...captureEncounter(
          COMPANIONS_SHORT_REVENGE_SHIP_ID,
          "pirate",
          "galleon",
          35.7,
          -27.62,
          90
        ),
        role: "pirate"
      }
    ],
    sequence: trailerSequence("companions", "pirate-revenge", {
      durationSeconds: 15,
      homeCityName: COMPANIONS_SHORT_HOME,
      wantedCityName: COMPANIONS_SHORT_WANTED_PORT,
      encounterId: COMPANIONS_SHORT_REVENGE_SHIP_ID,
      broadsideSide: "starboard"
    })
  }),
  "short-religion-portuguese-profile": trailerScenario({
    id: "short-religion-portuguese-profile",
    title: RELIGION_SHORT_TITLE_CATHOLIC,
    seed: "short-religion-portuguese-profile-v1",
    player: capturePlayer("portugal", "caravel", 38.72, -9.14, 45, {
      characterPortraitSourceId: RELIGION_SHORT_EUROPEAN_CAPTAIN_SOURCE_ID,
      homeCityName: RELIGION_SHORT_CITY_LISBON,
      religionId: "roman-catholic"
    }),
    world: captureWorld(196, 11, 20),
    sequence: trailerSequence("religion", "profile", {
      durationSeconds: 10,
      cityName: RELIGION_SHORT_CITY_LISBON
    })
  }),
  "short-religion-great-lakes-canoe": sailingTrailerScenario({
    id: "short-religion-great-lakes-canoe",
    title: RELIGION_SHORT_TITLE_CANOE,
    seed: "short-religion-great-lakes-canoe-v1",
    factionId: "neutral",
    shipSlug: "mesoamerican-dugout-canoe",
    lat: 44.7,
    lon: -82.5,
    day: 196,
    hour: 12,
    minute: 20,
    beamSide: "starboard"
  }),
  "short-religion-ottoman-profile": trailerScenario({
    id: "short-religion-ottoman-profile",
    title: RELIGION_SHORT_TITLE_SUNNI,
    seed: "short-religion-ottoman-profile-v1",
    player: capturePlayer("ottoman", "felucca", 40.64, 22.94, 120, {
      characterPortraitSourceId: RELIGION_SHORT_MALE_CAPTAIN_SOURCE_ID,
      homeCityName: RELIGION_SHORT_CITY_THESSALONIKI,
      religionId: "sunni-islam"
    }),
    world: captureWorld(196, 12, 10),
    sequence: trailerSequence("religion", "profile", {
      durationSeconds: 10,
      cityName: RELIGION_SHORT_CITY_THESSALONIKI
    })
  }),
  "short-religion-orthodox-profile": trailerScenario({
    id: "short-religion-orthodox-profile",
    title: RELIGION_SHORT_TITLE_ORTHODOX,
    seed: "short-religion-orthodox-profile-v1",
    player: capturePlayer("muscovy", "small-cog", 64.225, 41.65, 210, {
      characterPortraitSourceId: RELIGION_SHORT_EUROPEAN_CAPTAIN_SOURCE_ID,
      homeCityName: RELIGION_SHORT_CITY_KHOLMOGORY,
      religionId: "eastern-orthodox"
    }),
    world: captureWorld(196, 13, 5),
    sequence: trailerSequence("religion", "profile", {
      durationSeconds: 10,
      cityName: RELIGION_SHORT_CITY_KHOLMOGORY
    })
  }),
  "short-religion-lutheran-profile": trailerScenario({
    id: "short-religion-lutheran-profile",
    title: RELIGION_SHORT_TITLE_LUTHERAN,
    seed: "short-religion-lutheran-profile-v1",
    player: capturePlayer("denmark-norway", "small-cog", 53.54, 9.76, 305, {
      characterPortraitSourceId: RELIGION_SHORT_MALE_CAPTAIN_SOURCE_ID,
      homeCityName: RELIGION_SHORT_CITY_HAMBURG,
      religionId: "lutheran"
    }),
    world: captureWorld(196, 14, 15),
    sequence: trailerSequence("religion", "profile", {
      durationSeconds: 10,
      cityName: RELIGION_SHORT_CITY_HAMBURG
    })
  }),
  "short-religion-hajj": trailerScenario({
    id: "short-religion-hajj",
    title: RELIGION_SHORT_TITLE_HAJJ,
    seed: "short-religion-hajj-v1",
    player: capturePlayer("ottoman", "dhow", 21.49, 39.18, 315, {
      characterPortraitSourceId: RELIGION_SHORT_MALE_CAPTAIN_SOURCE_ID,
      homeCityName: RELIGION_SHORT_CITY_THESSALONIKI,
      religionId: "sunni-islam"
    }),
    world: captureWorld(196, 15, 10),
    sequence: trailerSequence("religion", "hajj", {
      durationSeconds: 16,
      cityName: RELIGION_SHORT_CITY_JEDDAH,
      originCityName: RELIGION_SHORT_CITY_ADEN,
      passengerHomeCityName: RELIGION_SHORT_CITY_THESSALONIKI
    })
  }),
  "short-religion-jewish-mission": trailerScenario({
    id: "short-religion-jewish-mission",
    title: "A Question for the Rabbis",
    seed: "short-religion-jewish-mission-v1",
    player: capturePlayer("poland-lithuania", "small-cog", 50.06, 19.94, 90, {
      characterPortraitSourceId: RELIGION_SHORT_MALE_CAPTAIN_SOURCE_ID,
      homeCityName: RELIGION_SHORT_CITY_KRAKOW,
      religionId: "judaism"
    }),
    world: captureWorld(196, 10, 40),
    sequence: trailerSequence("religion", "mission", {
      durationSeconds: 14,
      cityName: RELIGION_SHORT_CITY_KRAKOW,
      religiousMissionId: "jewish-responsum"
    })
  }),
  "trailer-survive-dehydration": trailerScenario({
    id: "trailer-survive-dehydration",
    title: "Out of Fresh Water",
    seed: "trailer-survive-dehydration-v1",
    player: capturePlayer("portugal", "caravel", 18.5, 39.5, 330),
    world: captureWorld(130, 12, 20, 14400),
    sequence: trailerSequence("survive", "dehydration", { durationSeconds: 9 })
  }),
  "trailer-panda-sail-east-china": trailerScenario({
    id: "trailer-panda-sail-east-china",
    title: "Sailing the East China Sea Before Meeting the Panda",
    seed: "trailer-panda-sail-east-china-v1",
    player: pandaTrailerPlayer(28.4, 123.0, 90),
    world: captureWorld(118, 7, 10),
    sequence: trailerSequence("panda", "sail", {
      durationSeconds: 4.5,
      beamSide: "starboard",
      pandaAboard: false
    })
  }),
  "trailer-panda-sail-south-china": trailerScenario({
    id: "trailer-panda-sail-south-china",
    title: "Sailing the South China Sea Before Meeting the Panda",
    seed: "trailer-panda-sail-south-china-v1",
    player: pandaTrailerPlayer(18.5, 113.5, 60),
    world: captureWorld(104, 17, 35),
    sequence: trailerSequence("panda", "sail", {
      durationSeconds: 4.5,
      beamSide: "port",
      pandaAboard: false
    })
  }),
  "trailer-panda-sail-seto": trailerScenario({
    id: "trailer-panda-sail-seto",
    title: "Panda Aboard in the Seto Inland Sea",
    seed: "trailer-panda-sail-seto-v1",
    player: pandaTrailerPlayer(34.3, 133.1, 270),
    world: captureWorld(196, 16, 40),
    sequence: trailerSequence("panda", "sail", {
      durationSeconds: 4.5,
      beamSide: "port"
    })
  }),
  "trailer-panda-sail-taiwan": trailerScenario({
    id: "trailer-panda-sail-taiwan",
    title: "Panda Aboard East of Taiwan",
    seed: "trailer-panda-sail-taiwan-v1",
    player: pandaTrailerPlayer(23.5, 122.0, 300),
    world: captureWorld(184, 11, 25),
    sequence: trailerSequence("panda", "sail", {
      durationSeconds: 4.5,
      beamSide: "starboard"
    })
  }),
  "trailer-panda-encounter": trailerScenario({
    id: "trailer-panda-encounter",
    title: "Meet a Panda in Sichuan",
    seed: "trailer-panda-encounter-v1",
    player: pandaTrailerPlayer(30.57, 104.07, 270),
    world: captureWorld(142, 10, 20),
    sequence: trailerSequence("panda", "encounter", {
      durationSeconds: 22,
      cityName: "Chengdu"
    })
  }),
  "trailer-panda-fish-yellow-sea": trailerScenario({
    id: "trailer-panda-fish-yellow-sea",
    title: "Fish the Yellow Sea with a Panda Aboard",
    seed: "trailer-panda-fish-yellow-sea-v1",
    player: pandaTrailerPlayer(36.0, 124.0, 120),
    world: captureWorld(168, 9, 15),
    sequence: trailerSequence("panda", "fish", { durationSeconds: 7 })
  }),
  "trailer-panda-port-lisbon": trailerScenario({
    id: "trailer-panda-port-lisbon",
    title: "A Lisbon Factor Meets the Panda",
    seed: "trailer-panda-port-lisbon-v1",
    player: pandaTrailerPlayer(38.72, -9.14, 45),
    world: captureWorld(224, 12, 30),
    sequence: trailerSequence("panda", "port-reaction", {
      durationSeconds: 8,
      cityName: "Lisbon"
    })
  }),
  "trailer-panda-port-nanjing": trailerScenario({
    id: "trailer-panda-port-nanjing",
    title: "A Nanjing Factor Meets the Panda",
    seed: "trailer-panda-port-nanjing-v1",
    player: pandaTrailerPlayer(32.06, 118.79, 315),
    world: captureWorld(240, 14, 5),
    sequence: trailerSequence("panda", "port-reaction", {
      durationSeconds: 8,
      cityName: "Nanjing"
    })
  }),
  "trailer-panda-naturalist": trailerScenario({
    id: "trailer-panda-naturalist",
    title: "The Naturalist Makes an Offer for the Panda",
    seed: "trailer-panda-naturalist-v1",
    player: pandaTrailerPlayer(48.21, 16.37, 225),
    world: captureWorld(266, 15, 20),
    sequence: trailerSequence("panda", "naturalist", {
      durationSeconds: 14,
      cityName: "Vienna",
      naturalistPortraitSourceId: PANDA_TRAILER_NATURALIST_SOURCE_ID
    })
  }),
  "trailer-panda-sail-atlantic": trailerScenario({
    id: "trailer-panda-sail-atlantic",
    title: "European Captain Sails for Asia",
    seed: "trailer-panda-sail-atlantic-v1",
    player: pandaTrailerPlayer(31.0, -22.0, 100),
    world: captureWorld(91, 15, 10),
    sequence: trailerSequence("panda", "sail", {
      durationSeconds: 4.5,
      beamSide: "starboard",
      pandaAboard: false
    })
  }),
  "trailer-panda-sail-indian-ocean": trailerScenario({
    id: "trailer-panda-sail-indian-ocean",
    title: "Panda Aboard in the Indian Ocean",
    seed: "trailer-panda-sail-indian-ocean-v1",
    player: pandaTrailerPlayer(-4.0, 69.0, 250),
    world: captureWorld(218, 13, 20),
    sequence: trailerSequence("panda", "sail", {
      durationSeconds: 4.5,
      beamSide: "port"
    })
  }),
  "trailer-panda-sail-adriatic": trailerScenario({
    id: "trailer-panda-sail-adriatic",
    title: "Panda Aboard on the Homeward Voyage",
    seed: "trailer-panda-sail-adriatic-v1",
    player: pandaTrailerPlayer(43.3, 15.0, 320),
    world: captureWorld(247, 16, 30),
    sequence: trailerSequence("panda", "sail", {
      durationSeconds: 4.5,
      beamSide: "starboard"
    })
  }),
  "trailer-papal-rome": trailerScenario({
    id: "trailer-papal-rome",
    title: PAPAL_SHORT_SCENE_ROME,
    seed: "trailer-papal-rome-v1",
    player: capturePlayer("spain", "caravel", 41.68, 12.18, 25, {
      characterPortraitSourceId: PAPAL_SHORT_CAPTAIN_SOURCE_ID,
      homeCityName: PAPAL_SHORT_HOME_PORT
    }),
    world: captureWorld(196, 10, 20),
    sequence: trailerSequence("papal", "rome", {
      durationSeconds: 12,
      cityName: PAPAL_SHORT_ROME_CITY,
      beamSide: "starboard"
    })
  }),
  "trailer-papal-actions": trailerScenario({
    id: "trailer-papal-actions",
    title: PAPAL_SHORT_SCENE_ACTIONS,
    seed: "trailer-papal-actions-v1",
    player: capturePlayer("spain", "caravel", 41.68, 12.18, 25, {
      characterPortraitSourceId: PAPAL_SHORT_CAPTAIN_SOURCE_ID,
      homeCityName: PAPAL_SHORT_HOME_PORT
    }),
    world: captureWorld(196, 11, 5),
    sequence: trailerSequence("papal", "actions", {
      durationSeconds: 12,
      cityName: PAPAL_SHORT_ROME_CITY
    })
  }),
  "trailer-papal-nuncio-route": sailingTrailerScenario({
    id: "trailer-papal-nuncio-route",
    title: PAPAL_SHORT_SCENE_NUNCIO_ROUTE,
    seed: "trailer-papal-nuncio-route-v1",
    factionId: "spain",
    shipSlug: "xebec",
    lat: 32,
    lon: 20,
    day: 184,
    hour: 8,
    minute: 20,
    beamSide: "starboard"
  }),
  "trailer-papal-nuncio": trailerScenario({
    id: "trailer-papal-nuncio",
    title: PAPAL_SHORT_SCENE_NUNCIO,
    seed: "trailer-papal-nuncio-v1",
    player: capturePlayer("spain", "caravel", 41.68, 12.18, 25, {
      characterPortraitSourceId: PAPAL_SHORT_CAPTAIN_SOURCE_ID,
      homeCityName: PAPAL_SHORT_HOME_PORT
    }),
    world: captureWorld(196, 12, 10),
    sequence: trailerSequence("papal", "nuncio", {
      durationSeconds: 18,
      cityName: PAPAL_SHORT_ROME_CITY,
      nuncioPortraitSourceId: PAPAL_SHORT_NUNCIO_SOURCE_ID
    })
  }),
  "trailer-papal-bible-route": sailingTrailerScenario({
    id: "trailer-papal-bible-route",
    title: PAPAL_SHORT_SCENE_BIBLE_ROUTE,
    seed: "trailer-papal-bible-route-v1",
    factionId: "england",
    shipSlug: "small-cog",
    lat: 54,
    lon: 4,
    day: 196,
    hour: 15,
    minute: 20,
    beamSide: "port"
  }),
  "trailer-papal-bibles": trailerScenario({
    id: "trailer-papal-bibles",
    title: PAPAL_SHORT_SCENE_BIBLES,
    seed: "trailer-papal-bibles-v1",
    player: capturePlayer("spain", "caravel", 53.54, 9.76, 305, {
      characterPortraitSourceId: PAPAL_SHORT_CAPTAIN_SOURCE_ID,
      homeCityName: PAPAL_SHORT_HOME_PORT
    }),
    world: captureWorld(196, 13, 15),
    sequence: trailerSequence("papal", "bibles", {
      durationSeconds: 18,
      cityName: PAPAL_SHORT_HAMBURG_CITY,
      destinationName: PAPAL_SHORT_BIBLE_DESTINATION,
      booksellerPortraitSourceId: PAPAL_SHORT_BOOKSELLER_SOURCE_ID
    })
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
  if (value.player.characterPortraitSourceId !== undefined) {
    requiredString(value.player.characterPortraitSourceId, "capture player portrait source id");
  }
  if (value.player.homeCityName !== undefined) {
    requiredString(value.player.homeCityName, "capture player home city name");
  }
  if (value.player.religionId !== undefined) religionById(value.player.religionId);
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
    const encounterStats = shipStatsForSlug(encounter.shipSlug);
    if (encounter.hitPoints !== undefined &&
        (!Number.isFinite(encounter.hitPoints) || encounter.hitPoints <= 0 ||
         encounter.hitPoints > encounterStats.hitPoints)) {
      throw new Error(`Invalid capture encounter hit points: ${encounter.id}`);
    }
    if (encounter.replaceOnSink !== undefined && typeof encounter.replaceOnSink !== "boolean") {
      throw new Error(`Invalid capture encounter replacement flag: ${encounter.id}`);
    }
  }
  if (value.icebergs !== undefined) {
    if (!Array.isArray(value.icebergs)) throw new Error("Capture scenario icebergs must be an array");
    const variantIds = new Set(ICEBERG_VARIANTS.map((variant) => variant.id));
    for (const iceberg of value.icebergs) {
      if (!iceberg || !variantIds.has(iceberg.variantId)) {
        throw new Error(`Invalid capture iceberg variant: ${iceberg?.variantId}`);
      }
      numberInRange(iceberg.lat, -89.999, 89.999, "capture iceberg latitude");
      numberInRange(iceberg.lon, -180, 180, "capture iceberg longitude");
      numberInRange(iceberg.headingDeg, 0, 360, "capture iceberg heading");
    }
  }
  if (value.sequence !== undefined) validateCaptureSequence(value.sequence);
  return value;
}

function validateCaptureSequence(value) {
  if (!value || typeof value !== "object") throw new Error("Capture sequence must be an object");
  if (!["explore", "trade", "fish", "whale", "sail", "fight", "pillage", "colonize", "survive", "panda", "papal", "loadout", "religion", "companions"].includes(value.kind)) {
    throw new Error(`Invalid capture sequence kind: ${value.kind}`);
  }
  requiredString(value.variant, "capture sequence variant");
  const maximumDuration = value.kind === "sail" && value.variant === "upwind-voyage" ? 40 : 30;
  numberInRange(value.durationSeconds, 3, maximumDuration, "capture sequence duration");
  const requiredByKind = {
    explore: ["discoveryName"],
    trade: ["cityName", "goodId"],
    fish: [],
    whale: ["speciesId"],
    sail: [],
    fight: ["encounterId"],
    pillage: ["cityName"],
    colonize: ["cityName"],
    survive: [],
    panda: [],
    papal: ["cityName"],
    loadout: ["cityName"],
    religion: ["cityName"],
    companions: []
  };
  for (const key of requiredByKind[value.kind]) requiredString(value[key], `capture sequence ${key}`);
  if (value.kind === "trade") {
    integerInRange(value.transactionCount, 2, 12, "capture trade transaction count");
    requiredString(value.factorPortraitSourceId, "capture trade factor portrait source id");
  }
  if (value.factorPortraitSourceId !== undefined && value.kind !== "trade") {
    throw new Error("Capture factor portrait source requires a trade sequence");
  }
  if ((value.kind === "fight" && value.variant !== "small-arms") ||
      (value.kind === "pillage" && value.variant === "bombard") ||
      (value.kind === "companions" && value.variant === "pirate-revenge")) {
    if (!["port", "starboard"].includes(value.broadsideSide)) {
      throw new Error(`Invalid capture sequence broadside side: ${value.broadsideSide}`);
    }
  } else if (value.broadsideSide !== undefined) {
    throw new Error("Capture broadside side requires a fight, bombardment, or revenge sequence");
  }
  if (value.holdBroadsideAim !== undefined && typeof value.holdBroadsideAim !== "boolean") {
    throw new Error("Capture broadside aim hold must be boolean");
  }
  if (value.kind === "sail") {
    if (!["beam-reach", "upwind-voyage", "row-upwind"].includes(value.variant)) {
      throw new Error(`Invalid sailing capture variant: ${value.variant}`);
    }
    if (value.variant === "beam-reach" && !["port", "starboard"].includes(value.beamSide)) {
      throw new Error(`Invalid capture sequence beam side: ${value.beamSide}`);
    }
    if (value.variant !== "beam-reach" && value.beamSide !== undefined) {
      throw new Error("Capture beam side requires a beam-reach sailing sequence");
    }
    if (value.variant === "upwind-voyage") {
      requiredString(value.cityName, "capture upwind destination city name");
    } else if (value.cityName !== undefined) {
      throw new Error("Capture sailing city requires the upwind-voyage variant");
    }
    if (["upwind-voyage", "row-upwind"].includes(value.variant) &&
        value.requireOpenWaterCourse !== true) {
      throw new Error("Upwind capture sequences must require an open-water course");
    }
    if (value.requireOpenWaterCourse !== undefined &&
        typeof value.requireOpenWaterCourse !== "boolean") {
      throw new Error("Capture open-water course requirement must be boolean");
    }
  }
  if (value.kind === "survive" &&
      !["lightning", "lightning-sinking", "dehydration", "deprivation-death", "overboard-rescue", "wine-emergency", "drunk-arrival", "remembered-arrival"].includes(value.variant)) {
    throw new Error(`Invalid survival capture variant: ${value.variant}`);
  }
  if (value.kind === "survive" && ["drunk-arrival", "remembered-arrival"].includes(value.variant)) {
    requiredString(value.cityName, "drunk arrival capture city name");
  }
  if (value.kind === "loadout" && !["presets", "custom"].includes(value.variant)) {
    throw new Error(`Invalid loadout capture variant: ${value.variant}`);
  }
  if (value.kind === "religion") {
    if (!["profile", "hajj", "mission"].includes(value.variant)) {
      throw new Error(`Invalid religion capture variant: ${value.variant}`);
    }
    if (value.variant === "hajj") {
      requiredString(value.originCityName, "religion capture Hajj origin city name");
      requiredString(value.passengerHomeCityName, "religion capture Hajj passenger home city name");
    }
    if (value.variant === "mission") {
      requiredString(value.religiousMissionId, "religion capture mission id");
    }
  }
  if (value.kind === "companions") {
    const variants = [
      "passenger-offer",
      "passenger-arrival",
      "castaway-offer",
      "castaway-reunion",
      "castaway-recruit",
      "pirate-offer",
      "pirate-escape",
      "pirate-revenge"
    ];
    if (!variants.includes(value.variant)) {
      throw new Error(`Invalid companions capture variant: ${value.variant}`);
    }
    if (value.variant.startsWith("passenger-")) {
      requiredString(value.originCityName, "companions capture passenger origin city name");
      requiredString(value.destinationCityName, "companions capture passenger destination city name");
    } else {
      requiredString(value.homeCityName, "companions capture home city name");
    }
    if (value.variant.startsWith("pirate-")) {
      requiredString(value.wantedCityName, "companions capture wanted city name");
    }
    if (value.variant === "pirate-revenge") {
      requiredString(value.encounterId, "companions capture revenge ship id");
      if (!["port", "starboard"].includes(value.broadsideSide)) {
        throw new Error(`Invalid companions capture broadside side: ${value.broadsideSide}`);
      }
    }
  }
  if (value.kind === "panda") {
    if (!["encounter", "sail", "fish", "port-reaction", "naturalist"].includes(value.variant)) {
      throw new Error(`Invalid panda capture variant: ${value.variant}`);
    }
    if (["encounter", "port-reaction", "naturalist"].includes(value.variant)) {
      requiredString(value.cityName, "panda capture city name");
    }
    if (value.naturalistPortraitSourceId !== undefined) {
      if (value.variant !== "naturalist") {
        throw new Error("Panda naturalist portrait source requires the naturalist capture variant");
      }
      requiredString(value.naturalistPortraitSourceId, "panda naturalist portrait source id");
    }
    if (value.variant === "sail" && !["port", "starboard"].includes(value.beamSide)) {
      throw new Error(`Invalid panda capture beam side: ${value.beamSide}`);
    }
    if (value.variant === "sail" && value.pandaAboard !== undefined &&
        typeof value.pandaAboard !== "boolean") {
      throw new Error("Panda capture aboard state must be boolean");
    }
  }
  if (value.kind === "colonize") {
    if (!["offer", "embark", "found", "deadline", "resupply", "establish", "defend", "city"].includes(value.variant)) {
      throw new Error(`Invalid colonization capture variant: ${value.variant}`);
    }
    if (value.originCityName !== undefined) {
      requiredString(value.originCityName, "colonization capture origin city name");
    }
    if (value.organizerPortraitSourceId !== undefined) {
      requiredString(value.organizerPortraitSourceId, "colonization capture organizer portrait source id");
    }
    if (["offer", "embark", "deadline", "defend", "city"].includes(value.variant)) {
      requiredString(value.originCityName, "colonization capture origin city name");
      requiredString(value.organizerPortraitSourceId, "colonization capture organizer portrait source id");
    }
  }
  if (value.kind === "papal") {
    if (!["rome", "actions", "nuncio", "bibles"].includes(value.variant)) {
      throw new Error(`Invalid Papal capture variant: ${value.variant}`);
    }
    if (value.variant === "rome" && !["port", "starboard"].includes(value.beamSide)) {
      throw new Error(`Invalid Papal capture beam side: ${value.beamSide}`);
    }
    if (value.variant === "nuncio") {
      requiredString(value.nuncioPortraitSourceId, "Papal capture nuncio portrait source id");
    }
    if (value.variant === "bibles") {
      requiredString(value.destinationName, "Papal capture Bible destination name");
      requiredString(value.booksellerPortraitSourceId, "Papal capture bookseller portrait source id");
    }
  }
  if (value.sailingTarget !== undefined) {
    if (!value.sailingTarget || typeof value.sailingTarget !== "object") {
      throw new Error("Capture sequence sailing target must be an object");
    }
    numberInRange(value.sailingTarget.lat, -89.999, 89.999, "capture sequence sailing target latitude");
    numberInRange(value.sailingTarget.lon, -180, 180, "capture sequence sailing target longitude");
  }
  if (value.riverStart !== undefined) {
    if (!value.riverStart || typeof value.riverStart !== "object") {
      throw new Error("Capture sequence river start must be an object");
    }
    numberInRange(value.riverStart.lat, -89.999, 89.999, "capture sequence river start latitude");
    numberInRange(value.riverStart.lon, -180, 180, "capture sequence river start longitude");
  }
}

function trailerScenario(value) {
  const { debugCaption, ...scenarioValue } = value;
  if (debugCaption !== undefined && scenarioValue.title !== undefined) {
    throw new Error("Capture scenario cannot define both title and debugCaption");
  }
  return scenario({
    ...scenarioValue,
    title: debugCaption ?? scenarioValue.title,
    diplomacy: scenarioValue.diplomacy || [],
    encounters: scenarioValue.encounters || []
  });
}

function sailingTrailerScenario(value) {
  const caption = value.debugCaption === undefined
    ? { title: value.title }
    : { debugCaption: value.debugCaption };
  return trailerScenario({
    id: value.id,
    ...caption,
    seed: value.seed,
    player: capturePlayer(value.factionId, value.shipSlug, value.lat, value.lon, 0),
    world: captureWorld(value.day, value.hour, value.minute, value.timeScale),
    sequence: trailerSequence("sail", "beam-reach", {
      durationSeconds: value.durationSeconds || 6,
      beamSide: value.beamSide,
      requireOpenWaterCourse: true
    })
  });
}

function demoTrailerSailingScenario(value) {
  return sailingTrailerScenario({ ...value, durationSeconds: 3.5 });
}

function upwindSailingScenario(value) {
  return trailerScenario({
    id: value.id,
    title: "Sailing ship",
    seed: value.seed,
    player: capturePlayer(value.factionId, value.shipSlug, value.lat, value.lon, 0),
    world: captureWorld(value.day, value.hour, value.minute, 1),
    sequence: trailerSequence("sail", value.variant, {
      durationSeconds: value.durationSeconds,
      cityName: value.cityName,
      requireOpenWaterCourse: true
    })
  });
}

function capturePlayer(factionId, shipSlug, lat, lon, headingDeg, options = {}) {
  return { factionId, shipSlug, lat, lon, headingDeg, activePlaySeconds: 90, ...options };
}

function pandaTrailerPlayer(lat, lon, headingDeg) {
  return {
    ...capturePlayer("portugal", "caravel", lat, lon, headingDeg),
    characterPortraitSourceId: PANDA_TRAILER_CAPTAIN_SOURCE_ID,
    homeCityName: "Lisbon"
  };
}

function captureWorld(day, hour, minute, timeScale = 180) {
  return { day, hour, minute, timeScale };
}

function captureNaplesCityId() {
  return "Naples";
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

function captureFightEncounter(id, factionId, shipSlug, lat, lon, headingDeg) {
  return {
    ...captureEncounter(id, factionId, shipSlug, lat, lon, headingDeg),
    encounter: { kind: "capture-fight", forceAttack: true }
  };
}

function demoTrailerGalleassFleetScenario(value) {
  const direction = value.side === "starboard" ? 1 : -1;
  const targetId = `${value.id}-target`;
  const targetLon = value.lon + direction * 0.85;
  const encounters = [
    value.variant === "fight"
      ? captureFightEncounter(targetId, "ottoman", "mediterranean-galley", value.lat, targetLon, 0)
      : captureEncounter(targetId, "ottoman", "mediterranean-galley", value.lat, targetLon, 0),
    captureEncounter(
      `${value.id}-xebec`,
      "ottoman",
      "xebec",
      value.lat + 0.65,
      value.lon + direction * 1.35,
      210
    ),
    captureEncounter(
      `${value.id}-trader`,
      "ottoman",
      "ottoman-coastal-trader",
      value.lat - 0.65,
      value.lon + direction * 1.3,
      330
    )
  ];
  const sequence = value.variant === "fight"
    ? trailerSequence("fight", "broadside", {
        durationSeconds: 5,
        encounterId: targetId,
        broadsideSide: value.side,
        holdBroadsideAim: true,
        requireOpenWaterCourse: true
      })
    : trailerSequence("sail", "beam-reach", {
        durationSeconds: 3,
        beamSide: value.side,
        requireOpenWaterCourse: true
      });
  return trailerScenario({
    id: value.id,
    debugCaption: value.debugCaption,
    seed: value.seed,
    player: capturePlayer("venice", "galleass", value.lat, value.lon, 90),
    world: captureWorld(184, 13, 10),
    diplomacy: [{ factionAId: "venice", factionBId: "ottoman", relation: "war" }],
    encounters,
    sequence
  });
}

function busyWorldBenchmarkEncounters() {
  const slugs = [
    "sampan",
    "small-junk",
    "medium-junk",
    "large-junk",
    "joseon-turtle-ship",
    "japanese-atakebune"
  ];
  const encounters = [];
  for (let row = 0; row < 4; row++) {
    for (let column = 0; column < 6; column++) {
      const index = row * 6 + column;
      encounters.push({
        id: `benchmark-ship-${String(index + 1).padStart(2, "0")}`,
        factionId: "ming",
        shipSlug: slugs[index % slugs.length],
        role: "merchant",
        lat: 30.58 + row * 0.34,
        lon: 122.1 + column * 0.26,
        headingDeg: (index * 47) % 360
      });
    }
  }
  return encounters;
}

function combatHotspotBenchmarkEncounters() {
  return [
    {
      id: "benchmark-med-pirate",
      factionId: "pirate",
      shipSlug: "xebec",
      role: "pirate",
      lat: 34.68,
      lon: 25.63,
      headingDeg: 180,
      replaceOnSink: false
    },
    {
      id: "benchmark-med-damaged",
      factionId: "ottoman",
      shipSlug: "felucca",
      role: "merchant",
      lat: 34.62,
      lon: 25.58,
      headingDeg: 210,
      hitPoints: 2,
      replaceOnSink: false
    },
    {
      id: "benchmark-med-escort",
      factionId: "ottoman",
      shipSlug: "xebec",
      role: "warship",
      lat: 34.57,
      lon: 25.55,
      headingDeg: 135,
      replaceOnSink: false
    },
    {
      id: "benchmark-med-merchant",
      factionId: "venice",
      shipSlug: "small-cog",
      role: "merchant",
      lat: 34.74,
      lon: 25.52,
      headingDeg: 45,
      replaceOnSink: false
    }
  ];
}

function nanjingHotspotBenchmarkEncounters() {
  const ships = [
    ["small-junk", "merchant"],
    ["medium-junk", "merchant"],
    ["large-junk", "merchant"],
    ["sampan", "fisherman"]
  ];
  const positions = [
    [32.02, 118.56], [32.06, 118.66], [32.1, 118.76], [32.14, 118.86],
    [31.98, 118.92], [32.03, 119.02], [32.08, 119.12], [32.13, 119.22],
    [31.95, 118.72], [31.99, 118.82], [32.17, 118.96], [32.2, 119.08]
  ];
  return positions.map(([lat, lon], index) => {
    const [shipSlug, role] = ships[index % ships.length];
    return {
      id: `benchmark-nanjing-ship-${String(index + 1).padStart(2, "0")}`,
      factionId: "ming",
      shipSlug,
      role,
      lat,
      lon,
      headingDeg: (index * 53) % 360,
      replaceOnSink: false
    };
  });
}

function gibraltarHotspotBenchmarkEncounters() {
  const ships = [
    ["caravel", "merchant", "spain"],
    ["small-cog", "merchant", "portugal"],
    ["xebec", "merchant", "ottoman"],
    ["fishing-lugger", "fisherman", "spain"],
    ["mediterranean-galley", "warship", "spain"],
    ["felucca", "merchant", "ottoman"]
  ];
  const positions = [
    [35.94, -5.94], [36.00, -5.86], [36.06, -5.78], [35.97, -5.70],
    [36.04, -5.64], [35.96, -5.58], [36.03, -5.52], [35.97, -5.46],
    [36.04, -5.40], [35.98, -5.34], [36.05, -5.28], [35.99, -5.22],
    [36.06, -5.16], [36.00, -5.10], [36.07, -5.04], [36.01, -4.98],
    [36.08, -4.92], [36.02, -4.86]
  ];
  return positions.map(([lat, lon], index) => {
    const [shipSlug, role, factionId] = ships[index % ships.length];
    return {
      id: `benchmark-gibraltar-ship-${String(index + 1).padStart(2, "0")}`,
      factionId,
      shipSlug,
      role,
      lat,
      lon,
      headingDeg: index % 2 === 0 ? 88 : 272,
      replaceOnSink: false
    };
  });
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
