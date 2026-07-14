import assert from "node:assert/strict";
import test from "node:test";

import {
  SHIP_PROPULSION_OAR,
  SHIP_PROPULSION_OAR_SAIL,
  SHIP_PROPULSION_SAIL,
  SHIP_STATS,
  shipLabelForSlug,
  shipStatsForSlug
} from "./shipStats.js";
import { SHIP_TOP_SPEED_SCALE } from "./gamePacing.js";
import { NAVAL_WEAPON_ARROW } from "./navalWeapons.js";

test("later asset silhouettes use period-appropriate game identities", () => {
  const periodIdentities = {
    "fishing-lugger": "Fishing Barque",
    "pirate-brig": "Heavy Caravel",
    "pirate-frigate": "Armed Galleon",
    frigate: "Great Galleon",
    fluyt: "Urca",
    "ship-of-the-line": "Great Carrack",
    "pirate-brigantine": "Light Brigantine",
    brigantine: "Brigantine",
    corvette: "Armed Caravel",
    "pirate-sloop": "Small Pinnace",
    cutter: "Coastal Pinnace",
    ketch: "Lateen Barque",
    "spanish-nao": "Spanish Nao",
    "portuguese-carrack": "Portuguese Carrack"
  };

  for (const [slug, label] of Object.entries(periodIdentities)) {
    assert.equal(shipStatsForSlug(slug).slug, slug);
    assert.equal(shipLabelForSlug(slug), label);
  }
});

test("hull points count one-point cannonball hits while mass preserves ship scale", () => {
  const pinnace = shipStatsForSlug("pirate-sloop");
  const galleon = shipStatsForSlug("galleon");
  const greatCarrack = shipStatsForSlug("ship-of-the-line");

  assert.deepEqual(
    [pinnace.mass, pinnace.hitPoints],
    [75, 8]
  );
  assert.deepEqual(
    [galleon.mass, galleon.hitPoints],
    [360, 36]
  );
  assert.deepEqual(
    [greatCarrack.mass, greatCarrack.hitPoints],
    [620, 62]
  );
});

test("all hulls share the gentler cruise-speed scale", () => {
  assert.equal(shipStatsForSlug("brigantine").topSpeedRad, 0.040 * SHIP_TOP_SPEED_SCALE);
  assert.equal(shipStatsForSlug("felucca").topSpeedRad, 0.031 * SHIP_TOP_SPEED_SCALE);
  assert.ok(SHIP_STATS.every((stats) => stats.topSpeedRad > 0.006));
});

test("native canoe hulls are small, arrow-armed, and regionally distinct", () => {
  const polynesian = shipStatsForSlug("polynesian-voyaging-canoe");
  const mesoamerican = shipStatsForSlug("mesoamerican-dugout-canoe");

  assert.equal(shipLabelForSlug(polynesian.slug), "Polynesian Voyaging Canoe");
  assert.equal(shipLabelForSlug(mesoamerican.slug), "Mesoamerican Dugout Canoe");
  assert.equal(polynesian.cannons, 0);
  assert.equal(mesoamerican.cannons, 0);
  assert.equal(polynesian.navalWeaponKind, NAVAL_WEAPON_ARROW);
  assert.equal(mesoamerican.navalWeaponKind, NAVAL_WEAPON_ARROW);
  assert.ok(polynesian.seaworthiness > mesoamerican.seaworthiness);
  assert.ok(polynesian.cargoCapacity > mesoamerican.cargoCapacity);
  assert.ok(mesoamerican.turnRateRad > polynesian.turnRateRad);
  assert.equal(mesoamerican.propulsion, SHIP_PROPULSION_OAR);
  assert.equal(mesoamerican.upwindStallAngleDeg, 0);
  assert.equal(polynesian.propulsion, SHIP_PROPULSION_SAIL);
  assert.ok(polynesian.upwindStallAngleDeg > 0);
  assert.equal(shipStatsForSlug("sampan").propulsion, SHIP_PROPULSION_SAIL);
  assert.equal(shipStatsForSlug("sampan").upwindStallAngleDeg, 45);
  assert.ok(mesoamerican.topSpeedRad < shipStatsForSlug("fishing-lugger").topSpeedRad);
});

test("the Mediterranean galley is a period hybrid warship", () => {
  const galley = shipStatsForSlug("mediterranean-galley");

  assert.equal(shipLabelForSlug(galley.slug), "Mediterranean Galley");
  assert.equal(galley.propulsion, SHIP_PROPULSION_OAR_SAIL);
  assert.ok(galley.cannons > 0);
  assert.ok(galley.seaworthiness < shipStatsForSlug("carrack").seaworthiness);
  assert.ok(galley.cargoCapacity < shipStatsForSlug("carrack").cargoCapacity);
});

test("the Joseon turtle ship is a heavy cannon-armed oar-and-sail warship", () => {
  const turtleShip = shipStatsForSlug("joseon-turtle-ship");

  assert.equal(shipLabelForSlug(turtleShip.slug), "Turtle Ship");
  assert.equal(turtleShip.propulsion, SHIP_PROPULSION_OAR_SAIL);
  assert.equal(turtleShip.cannons, 30);
  assert.ok(turtleShip.hitPoints > shipStatsForSlug("large-junk").hitPoints);
  assert.ok(turtleShip.cargoCapacity < shipStatsForSlug("large-junk").cargoCapacity);
});

test("the Panokseon represents the Joseon decked oar-and-sail warship lineage", () => {
  const panokseon = shipStatsForSlug("joseon-panokseon");

  assert.equal(shipLabelForSlug(panokseon.slug), "Panokseon");
  assert.equal(panokseon.propulsion, SHIP_PROPULSION_OAR_SAIL);
  assert.equal(panokseon.cannons, 20);
  assert.ok(panokseon.hitPoints > shipStatsForSlug("large-junk").hitPoints);
  assert.ok(panokseon.cargoCapacity > shipStatsForSlug("joseon-turtle-ship").cargoCapacity);
});

test("the Japanese Atakebune is a slow heavy coastal oar-and-sail fortress", () => {
  const atakebune = shipStatsForSlug("japanese-atakebune");

  assert.equal(shipLabelForSlug(atakebune.slug), "Atakebune");
  assert.equal(atakebune.propulsion, SHIP_PROPULSION_OAR_SAIL);
  assert.equal(atakebune.cannons, 6);
  assert.ok(atakebune.hitPoints > shipStatsForSlug("galleon").hitPoints);
  assert.ok(atakebune.topSpeedRad < shipStatsForSlug("large-junk").topSpeedRad);
  assert.ok(atakebune.turnRateRad < shipStatsForSlug("large-junk").turnRateRad);
});

test("the Spanish Nao is a small seaworthy exploration carrack", () => {
  const nao = shipStatsForSlug("spanish-nao");

  assert.equal(shipLabelForSlug(nao.slug), "Spanish Nao");
  assert.equal(nao.propulsion, SHIP_PROPULSION_SAIL);
  assert.equal(nao.cannons, 8);
  assert.ok(nao.mass > shipStatsForSlug("small-cog").mass);
  assert.ok(nao.cargoCapacity > shipStatsForSlug("small-cog").cargoCapacity);
  assert.ok(nao.seaworthiness > shipStatsForSlug("small-cog").seaworthiness);
});

test("the Portuguese Carrack is a large armed ocean-going merchant", () => {
  const portugueseCarrack = shipStatsForSlug("portuguese-carrack");
  const spanishNao = shipStatsForSlug("spanish-nao");
  const greatCarrack = shipStatsForSlug("ship-of-the-line");

  assert.equal(shipLabelForSlug(portugueseCarrack.slug), "Portuguese Carrack");
  assert.equal(portugueseCarrack.propulsion, SHIP_PROPULSION_SAIL);
  assert.ok(portugueseCarrack.cannons > spanishNao.cannons);
  assert.ok(portugueseCarrack.cargoCapacity > spanishNao.cargoCapacity);
  assert.ok(portugueseCarrack.mass > spanishNao.mass);
  assert.ok(portugueseCarrack.mass < greatCarrack.mass);
  assert.ok(portugueseCarrack.seaworthiness >= spanishNao.seaworthiness);
});

test("the Viking longship is a fast seaworthy oar-and-sail arrow ship", () => {
  const longship = shipStatsForSlug("viking-longship");

  assert.equal(shipLabelForSlug(longship.slug), "Viking Longship");
  assert.equal(longship.propulsion, SHIP_PROPULSION_OAR_SAIL);
  assert.equal(longship.navalWeaponKind, "arrow");
  assert.equal(longship.cannons, 0);
  assert.ok(longship.seaworthiness >= 9);
  assert.ok(longship.topSpeedRad > shipStatsForSlug("brigantine").topSpeedRad);
});
