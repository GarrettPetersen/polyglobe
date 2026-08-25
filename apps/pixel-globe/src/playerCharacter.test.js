import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  PLAYER_STARTER_SHIPS,
  generatePlayerStartingProfile,
  playerStarterShipForFaction,
  playerStartAreaForPort,
  playerStartRegionForFaction,
  playerHomePortPools,
  resolvePlayerCharacterIdentityKey,
  selectPlayerHomePort
} from "./playerCharacter.js";
import { IMPERIAL_ESTATES_1522 } from "./imperialEstates.js";
import { npcFleetOriginWeightsForPorts } from "./npcSeaRoutes.js";
import { JAPANESE_SHIP_SLUGS, shipStatsForSlug } from "./shipStats.js";

const MANIFEST = JSON.parse(readFileSync(
  new URL("../public/assets/characters/generated/character-portraits.json", import.meta.url),
  "utf8"
));

const PORTS = [
  port(1, "Cadiz", "Spain", "mediterranean", "spain", 36.53, -6.29),
  port(2, "London", "United Kingdom", "northern-european", "england", 51.51, -0.13),
  port(3, "Constantinople", "Turkey", "mediterranean", "ottoman", 41.01, 28.98),
  port(4, "Alexandria", "Egypt", "islamic-desert", "ottoman", 31.2, 29.92),
  port(5, "Nanjing", "China", "east-asian", "ming", 32.06, 118.8),
  port(6, "Kyoto", "Japan", "east-asian", "japan", 35.01, 135.77),
  port(7, "Vijayanagar", "India", "south-asian", "vijayanagara", 15.34, 76.46),
  port(8, "Cambay", "India", "south-asian", "gujarat", 22.31, 72.62),
  port(9, "Kilwa", "Tanzania", "sub-saharan", "neutral", -8.96, 39.51),
  port(10, "Mexico City", "Mexico", "mesoamerican", "spain", 19.43, -99.13),
  port(11, "Goa", "India", "south-asian", "portugal", 15.49, 73.83),
  {
    ...port(12, "Veracruz", "Mexico", "mediterranean", "spain", 19.17, -96.13),
    playerHomeExcluded: true
  },
  port(13, "Ternate", "Indonesia", "southeast-asian", "ternate", 0.79, 127.38),
  port(14, "Tidore", "Indonesia", "southeast-asian", "tidore", 0.67, 127.45),
  port(15, "Ayutthaya", "Thailand", "southeast-asian", "ayutthaya", 14.36, 100.57),
  port(16, "Banda Village", "Indonesia", "southeast-asian", "neutral", -4.52, 129.9),
  port(17, "Malacca", "Malaysia", "southeast-asian", "portugal", 2.19, 102.25),
  port(18, "Hormuz", "Iran", "islamic-desert", "hormuz", 27.1, 56.45),
  port(19, "Siraf", "Iran", "islamic-desert", "safavid", 27.67, 52.34),
  port(20, "Azemmour", "Morocco", "islamic-desert", "morocco", 33.29, -8.34),
  port(21, "Bakhchiserai", "Ukraine", "mediterranean", "crimea", 44.76, 33.87),
  port(22, "Tripoli", "Libya", "islamic-desert", "spain", 32.89, 13.19),
  port(23, "Muscat", "Oman", "islamic-desert", "portugal", 23.59, 58.41)
];
const PORT_WEIGHTS = npcFleetOriginWeightsForPorts(PORTS);

test("starting profiles are deterministic and internally consistent", () => {
  const generate = () => generatePlayerStartingProfile({
    identityKey: "profile-seed",
    ports: PORTS,
    portWeights: PORT_WEIGHTS,
    manifest: MANIFEST,
    usedNames: new Set()
  });
  const profile = generate();

  assert.deepEqual(profile, generate());
  assert.equal(profile.character.sex, profile.character.gender);
  assert.equal(profile.character.nationalityId, profile.homePort.factionId);
  assert.equal(profile.character.homePortRealmName, profile.nationality.name);
  assert.equal(profile.character.startRegion, profile.startRegion);
  assert.equal(profile.character.starterShipSlug, playerStarterShipForFaction(
    profile.character.nationalityId,
    { identityKey: "profile-seed", startArea: profile.startArea }
  ));
  assert.equal(profile.startArea, playerStartAreaForPort(profile.homePort));
  assert.equal(profile.character.homePortName, profile.homePort.displayCity);
  assert.ok(profile.character.expressions.length >= 1);
  assert.ok(profile.character.age >= profile.character.minAge);
  assert.ok(profile.character.age <= profile.character.maxAge);
  assert.equal("paletteSwapped" in profile.character, false);
  assert.equal("palette" in profile.character, false);
  assert.match(profile.character.birthDateLabel, /^\d{1,2} [A-Z][a-z]+ (?:14|15)\d{2}$/);
});

test("whaling campaigns receive the cheapest regionally plausible blue-water hull", () => {
  for (const factionId of ["england", "ottoman", "ming", "vijayanagara", "ternate"]) {
    const starter = shipStatsForSlug(playerStarterShipForFaction(factionId));
    const whaler = shipStatsForSlug(playerStarterShipForFaction(factionId, { whaling: true }));
    assert.ok(whaler.seaworthiness >= 5, `${factionId}: ${whaler.slug}`);
    assert.ok(whaler.cargoCapacity >= starter.cargoCapacity, `${factionId}: ${whaler.slug}`);
  }
});

test("treasure campaigns receive a small regionally plausible armed hull", () => {
  for (const factionId of ["england", "ottoman", "ming", "japan", "vijayanagara", "ternate"]) {
    const armed = shipStatsForSlug(playerStarterShipForFaction(factionId, { armed: true }));
    assert.ok(armed.cannons > 0, `${factionId}: ${armed.slug}`);
  }
  assert.throws(
    () => playerStarterShipForFaction("england", { armed: true, whaling: true }),
    /cannot request separate whaling and armed campaigns/i
  );
});

test("Ming captains always receive Chinese starter vessels", () => {
  const profile = generatePlayerStartingProfile({
    identityKey: "ming-starter-regression",
    ports: [PORTS[4]],
    portWeights: npcFleetOriginWeightsForPorts([PORTS[4]]),
    manifest: MANIFEST,
    usedNames: new Set()
  });
  assert.equal(profile.character.nationalityId, "ming");
  assert.equal(profile.character.starterShipSlug, "sampan");
  assert.equal(playerStarterShipForFaction("ming"), "sampan");
  assert.equal(playerStarterShipForFaction("ming", { whaling: true }), "small-junk");
  assert.notEqual(playerStarterShipForFaction("ming"), "ketch");
  assert.notEqual(playerStarterShipForFaction("ming", { whaling: true }), "ketch");
});

test("Japanese captains use local hulls for every campaign start", () => {
  const starters = [
    playerStarterShipForFaction("japan"),
    playerStarterShipForFaction("japan", { whaling: true }),
    playerStarterShipForFaction("japan", { armed: true })
  ];
  assert.deepEqual(starters, ["japanese-kuribune", "japanese-kobaya", "japanese-atakebune"]);
  assert.ok(starters.every((slug) => JAPANESE_SHIP_SLUGS.includes(slug)));
  const kobaya = shipStatsForSlug("japanese-kobaya");
  assert.ok(kobaya.seaworthiness >= 5);
  assert.ok(kobaya.cargoCapacity >= shipStatsForSlug("japanese-kuribune").cargoCapacity);
  assert.equal(kobaya.cannons, 0);
  assert.ok(shipStatsForSlug("japanese-atakebune").cannons > 0);
});

test("every Imperial Estate can start a European voyage", () => {
  for (const estate of IMPERIAL_ESTATES_1522) {
    assert.equal(playerStartRegionForFaction(estate.factionId), "europe", estate.factionId);
    assert.equal(playerStarterShipForFaction(estate.factionId), "fishing-lugger", estate.factionId);
  }
});

test("a Hospitaller captain receives the European regional starter roster", () => {
  assert.equal(playerStarterShipForFaction("hospitallers"), "fishing-lugger");
  assert.equal(playerStarterShipForFaction("hospitallers", { armed: true }), "small-cog");
});

test("Mediterranean starts vary between small local hulls and use the fusta for armed campaigns", () => {
  const starters = new Set();
  for (let index = 0; index < 64; index++) {
    starters.add(playerStarterShipForFaction("venice", {
      identityKey: `venetian-${index}`,
      startArea: "mediterranean"
    }));
  }
  assert.deepEqual([...starters].sort(), ["fishing-lugger", "fusta"]);
  assert.equal(playerStarterShipForFaction("venice", {
    armed: true,
    identityKey: "armed-venetian",
    startArea: "mediterranean"
  }), "fusta");
  assert.equal(playerStarterShipForFaction("ottoman", {
    armed: true,
    identityKey: "armed-ottoman",
    startArea: "mediterranean"
  }), "fusta");
});

test("previously omitted Old World powers receive regional starter vessels", () => {
  for (const factionId of ["hormuz", "safavid"]) {
    assert.equal(playerStarterShipForFaction(factionId), "dhow");
    assert.equal(playerStarterShipForFaction(factionId, { armed: true }), "ketch");
  }
  for (const factionId of ["morocco", "crimea"]) {
    assert.equal(playerStarterShipForFaction(factionId), "felucca");
    assert.equal(playerStarterShipForFaction(factionId, { armed: true }), "ketch");
  }
});

test("player identity seeds use explicit query values or fresh generated values", () => {
  assert.equal(
    resolvePlayerCharacterIdentityKey({ querySeed: "debug-captain", generatedSeed: "random-captain" }),
    "debug-captain"
  );
  assert.equal(
    resolvePlayerCharacterIdentityKey({ querySeed: null, generatedSeed: "random-captain" }),
    "random-captain"
  );
  assert.equal(
    resolvePlayerCharacterIdentityKey({ querySeed: "bad seed", generatedSeed: "fresh_123" }),
    "fresh_123"
  );
  assert.throws(
    () => resolvePlayerCharacterIdentityKey({ querySeed: null, generatedSeed: "bad seed" }),
    /valid generated identity seed/
  );
});

test("home selection balances five geographic areas and includes all sovereign Old World ports", () => {
  const seenAreas = new Set();
  const seenCities = new Set();
  for (let i = 0; i < 1000; i++) {
    const selection = selectPlayerHomePort(`captain-${i}`, PORTS, PORT_WEIGHTS);
    seenAreas.add(selection.startArea);
    seenCities.add(selection.homePort.city);
    assert.ok(
      !["Kilwa", "Mexico City", "Veracruz", "Banda Village"]
        .includes(selection.homePort.city)
    );
  }

  assert.deepEqual(
    [...seenAreas].sort(),
    ["east-asia", "india", "mediterranean", "northern-europe", "southeast-asia"]
  );
  assert.ok(seenCities.has("Goa"));
  assert.ok(seenCities.has("Malacca"));
  for (const city of ["Hormuz", "Siraf", "Azemmour", "Bakhchiserai", "Tripoli", "Muscat"]) {
    assert.ok(seenCities.has(city), `${city} must be available as a home port`);
  }
});

test("maritime fleet weighting favors busy ports without removing quiet homes", () => {
  const london = port(101, "London", "United Kingdom", "northern-european", "england", 51.51, -0.13);
  const buda = port(102, "Buda", "Hungary", "northern-european", "hungary", 47.5, 19.04);
  const ports = [london, buda];
  const weights = new Map([
    [london.tileId, 9],
    [buda.tileId, 1]
  ]);
  const starts = { London: 0, Buda: 0 };
  for (let i = 0; i < 1000; i++) {
    starts[selectPlayerHomePort(`weighted-captain-${i}`, ports, weights).homePort.city]++;
  }

  assert.ok(starts.London > starts.Buda * 4, JSON.stringify(starts));
  assert.ok(starts.Buda > 0, JSON.stringify(starts));
});

test("Ottoman and European Mediterranean ports share one start-area draw", () => {
  const mediterraneanPorts = playerHomePortPools(PORTS).get("mediterranean");
  assert.deepEqual(
    mediterraneanPorts.map((port) => port.city).sort(),
    ["Alexandria", "Azemmour", "Bakhchiserai", "Cadiz", "Constantinople", "Tripoli"]
  );
});

test("Spice Island captains receive the local Southeast Asian roster", () => {
  const profile = generatePlayerStartingProfile({
    identityKey: "ternate-starter-regression",
    ports: [PORTS[12]],
    portWeights: npcFleetOriginWeightsForPorts([PORTS[12]]),
    manifest: MANIFEST,
    usedNames: new Set()
  });
  assert.equal(profile.startArea, "southeast-asia");
  assert.equal(profile.character.startRegion, "southeast-asia");
  assert.equal(profile.character.nationalityId, "ternate");
  assert.equal(profile.character.starterShipSlug, "kelulus");
  assert.equal(playerStarterShipForFaction("ternate", { whaling: true }), "kelulus");
  assert.equal(playerStarterShipForFaction("ternate", { armed: true }), "penjajap");
});

test("regional starter ships are unarmed local vessels", () => {
  assert.deepEqual(PLAYER_STARTER_SHIPS, {
    europe: "fishing-lugger",
    ottoman: "felucca",
    "east-asia": "sampan",
    india: "dhow",
    "southeast-asia": "kelulus"
  });
  for (const slug of Object.values(PLAYER_STARTER_SHIPS)) {
    const stats = shipStatsForSlug(slug);
    assert.equal(stats.cannons, 0);
    assert.ok(stats.hitPoints <= 10);
  }
});

test("port classification accepts only the intended geographic areas", () => {
  assert.equal(playerStartAreaForPort(PORTS[0]), "mediterranean");
  assert.equal(playerStartAreaForPort(PORTS[1]), "northern-europe");
  assert.equal(playerStartAreaForPort(PORTS[2]), "mediterranean");
  assert.equal(playerStartAreaForPort(PORTS[4]), "east-asia");
  assert.equal(playerStartAreaForPort(PORTS[6]), "india");
  assert.equal(playerStartAreaForPort(PORTS[12]), "southeast-asia");
  assert.equal(playerStartAreaForPort(PORTS[13]), "southeast-asia");
  assert.equal(playerStartAreaForPort(PORTS[14]), "southeast-asia");
  assert.equal(playerStartAreaForPort(PORTS[8]), null);
  assert.equal(playerStartAreaForPort(PORTS[9]), null);
  assert.equal(playerStartAreaForPort(PORTS[10]), "india");
  assert.equal(playerStartAreaForPort(PORTS[11]), null);
  assert.equal(playerStartAreaForPort(PORTS[15]), null);
  assert.equal(playerStartAreaForPort(PORTS[16]), "southeast-asia");
  assert.equal(playerStartAreaForPort(PORTS[17]), "india");
  assert.equal(playerStartAreaForPort(PORTS[18]), "india");
  assert.equal(playerStartAreaForPort(PORTS[19]), "mediterranean");
  assert.equal(playerStartAreaForPort(PORTS[20]), "mediterranean");
  assert.equal(playerStartAreaForPort(PORTS[21]), "mediterranean");
  assert.equal(playerStartAreaForPort(PORTS[22]), "india");
});

test("home classification excludes only non-national starts and the intended world regions", () => {
  const intendedExclusions = [
    port(31, "Neutral Port", "Italy", "mediterranean", "neutral", 42, 12),
    port(32, "Pirate Haven", "Unknown", "mediterranean", "pirate", 20, -30),
    port(33, "New World Port", "Mexico", "mesoamerican", "spain", 19, -96),
    port(34, "Andean Port", "Peru", "andean", "inca", -8, -79),
    port(35, "Sub-Saharan Port", "Ethiopia", "sub-saharan", "ethiopia", 15, 39),
    {
      ...port(43, "Sovereign Village", "Indonesia", "southeast-asian", "ternate", 1, 127),
      settlementType: "village"
    }
  ];
  assert.ok(intendedExclusions.every((candidate) => playerStartAreaForPort(candidate) === null));

  const intendedStarts = [
    port(36, "European Port", "France", "northern-european", "france", 49, 2),
    port(37, "Mediterranean Port", "Italy", "mediterranean", "venice", 45, 12),
    port(38, "North African Port", "Morocco", "islamic-desert", "morocco", 33, -8),
    port(39, "Persian Port", "Iran", "islamic-desert", "safavid", 28, 52),
    port(44, "Spanish Tripoli", "Libya", "islamic-desert", "spain", 33, 13),
    port(40, "East Asian Port", "Japan", "east-asian", "japan", 35, 136),
    port(41, "South Asian Port", "India", "south-asian", "gujarat", 22, 73),
    port(42, "Southeast Asian Port", "Thailand", "southeast-asian", "ayutthaya", 14, 101)
  ];
  assert.ok(intendedStarts.every((candidate) => playerStartAreaForPort(candidate) !== null));
  assert.equal(playerStartAreaForPort(intendedStarts[4]), "mediterranean");
});

test("Portuguese Asian home ports produce Portuguese captains", () => {
  for (const homePort of [PORTS[10], PORTS[16]]) {
    const profile = generatePlayerStartingProfile({
      identityKey: `portuguese-${homePort.city}`,
      ports: [homePort],
      portWeights: npcFleetOriginWeightsForPorts([homePort]),
      manifest: MANIFEST,
      usedNames: new Set()
    });
    assert.equal(profile.homePort.city, homePort.city);
    assert.equal(profile.character.nationalityId, "portugal");
    assert.equal(profile.startArea, playerStartAreaForPort(homePort));
  }
});

test("player-facing home labels use the 1522 realm instead of the modern country", () => {
  const ports = [
    port(112, "Sudak", "Russian Federation", "mediterranean", "ottoman", 44.85, 34.97)
  ];
  const profile = generatePlayerStartingProfile({
    identityKey: "sudak-profile",
    ports,
    portWeights: npcFleetOriginWeightsForPorts(ports),
    manifest: MANIFEST,
    usedNames: new Set()
  });

  assert.equal(profile.character.homePortName, "Sudak");
  assert.equal(profile.character.homePortCountry, "Russian Federation");
  assert.equal(profile.character.homePortRealmName, "Ottoman Empire");
  assert.equal(profile.character.nationalityAdjective, "Ottoman");
  assert.ok(["crimeanTatar", "ottoman"].includes(profile.character.nameCulture));
});

function port(tileId, city, country, cityType, factionId, lat, lon) {
  return {
    tileId,
    city,
    displayCity: city,
    country,
    cityType,
    factionId,
    lat,
    lon,
    population: 10000
  };
}
