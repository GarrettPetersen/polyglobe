import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  PLAYER_STARTER_SHIPS,
  generatePlayerStartingProfile,
  playerStartRegionForPort,
  resolvePlayerCharacterIdentityKey,
  selectPlayerHomePort,
  whalingStarterShipForRegion
} from "./playerCharacter.js";
import { shipStatsForSlug } from "./shipStats.js";

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
  port(10, "Tenochtitlan", "Mexico", "mesoamerican", "aztec", 19.43, -99.13),
  port(11, "Goa", "India", "south-asian", "portugal", 15.49, 73.83),
  {
    ...port(12, "Veracruz", "Mexico", "mediterranean", "spain", 19.17, -96.13),
    playerHomeExcluded: true
  }
];

test("starting profiles are deterministic and internally consistent", () => {
  const generate = () => generatePlayerStartingProfile({
    identityKey: "profile-seed",
    ports: PORTS,
    manifest: MANIFEST,
    usedNames: new Set()
  });
  const profile = generate();

  assert.deepEqual(profile, generate());
  assert.equal(profile.character.sex, profile.character.gender);
  assert.equal(profile.character.nationalityId, profile.homePort.factionId);
  assert.equal(profile.character.homePortRealmName, profile.nationality.name);
  assert.equal(profile.character.startRegion, profile.startRegion);
  assert.equal(profile.character.starterShipSlug, PLAYER_STARTER_SHIPS[profile.startRegion]);
  assert.equal(profile.character.homePortName, profile.homePort.displayCity);
  assert.ok(profile.character.expressions.length >= 1);
  assert.ok(profile.character.age >= profile.character.minAge);
  assert.ok(profile.character.age <= profile.character.maxAge);
  assert.equal("paletteSwapped" in profile.character, false);
  assert.equal("palette" in profile.character, false);
  assert.match(profile.character.birthDateLabel, /^\d{1,2} [A-Z][a-z]+ (?:14|15)\d{2}$/);
});

test("whaling campaigns receive the cheapest regionally plausible blue-water hull", () => {
  for (const region of Object.keys(PLAYER_STARTER_SHIPS)) {
    const starter = shipStatsForSlug(PLAYER_STARTER_SHIPS[region]);
    const whaler = shipStatsForSlug(whalingStarterShipForRegion(region));
    assert.ok(whaler.seaworthiness >= 5, `${region}: ${whaler.slug}`);
    assert.ok(whaler.cargoCapacity >= starter.cargoCapacity, `${region}: ${whaler.slug}`);
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

test("home selection balances the four allowed regions and excludes implausible starts", () => {
  const seenRegions = new Set();
  const seenCities = new Set();
  for (let i = 0; i < 200; i++) {
    const selection = selectPlayerHomePort(`captain-${i}`, PORTS);
    seenRegions.add(selection.startRegion);
    seenCities.add(selection.homePort.city);
    assert.ok(!["Kilwa", "Tenochtitlan", "Goa", "Veracruz"].includes(selection.homePort.city));
  }

  assert.deepEqual([...seenRegions].sort(), ["east-asia", "europe", "india", "ottoman"]);
  assert.ok(seenCities.size >= 8);
});

test("regional starter ships are the smallest unarmed local vessels", () => {
  assert.deepEqual(PLAYER_STARTER_SHIPS, {
    europe: "fishing-lugger",
    ottoman: "felucca",
    "east-asia": "sampan",
    india: "dhow"
  });
  for (const slug of Object.values(PLAYER_STARTER_SHIPS)) {
    const stats = shipStatsForSlug(slug);
    assert.equal(stats.cannons, 0);
    assert.ok(stats.hitPoints <= 4);
  }
});

test("port classification accepts only the intended cultures", () => {
  assert.equal(playerStartRegionForPort(PORTS[0]), "europe");
  assert.equal(playerStartRegionForPort(PORTS[2]), "ottoman");
  assert.equal(playerStartRegionForPort(PORTS[4]), "east-asia");
  assert.equal(playerStartRegionForPort(PORTS[6]), "india");
  assert.equal(playerStartRegionForPort(PORTS[8]), null);
  assert.equal(playerStartRegionForPort(PORTS[9]), null);
  assert.equal(playerStartRegionForPort(PORTS[10]), null);
  assert.equal(playerStartRegionForPort(PORTS[11]), null);
});

test("player-facing home labels use the 1522 realm instead of the modern country", () => {
  const profile = generatePlayerStartingProfile({
    identityKey: "sudak-profile",
    ports: [port(12, "Sudak", "Russian Federation", "mediterranean", "ottoman", 44.85, 34.97)],
    manifest: MANIFEST,
    usedNames: new Set()
  });

  assert.equal(profile.character.homePortName, "Sudak");
  assert.equal(profile.character.homePortCountry, "Russian Federation");
  assert.equal(profile.character.homePortRealmName, "Ottoman Empire");
  assert.equal(profile.character.nationalityAdjective, "Ottoman");
  assert.ok(["slavic", "ottoman"].includes(profile.character.nameCulture));
});

function port(tileId, city, country, cityType, factionId, lat, lon) {
  return { tileId, city, displayCity: city, country, cityType, factionId, lat, lon };
}
