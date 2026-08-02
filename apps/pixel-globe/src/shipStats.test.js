import assert from "node:assert/strict";
import test from "node:test";

import {
  SHIP_PROPULSION_OAR,
  SHIP_PROPULSION_OAR_SAIL,
  SHIP_PROPULSION_SAIL,
  SHIP_STATS,
  SHIP_UPWIND_FORGIVENESS_DEG,
  reconcileShipHullForCurrentStats,
  shipHullResistsDamage,
  shipLabelForSlug,
  shipStatsForSlug
} from "./shipStats.js";
import { SHIP_TOP_SPEED_SCALE } from "./gamePacing.js";
import { NAVAL_WEAPON_ARROW } from "./navalWeapons.js";

test("later asset silhouettes use period-appropriate game identities", () => {
  const periodIdentities = {
    "fishing-lugger": "Fishing Barque",
    "pirate-brig": "Heavy Caravel",
    fluyt: "Urca",
    "ship-of-the-line": "Great Carrack",
    brigantine: "Brigantine",
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
  const pinnace = shipStatsForSlug("cutter");
  const galleon = shipStatsForSlug("galleon");
  const greatCarrack = shipStatsForSlug("ship-of-the-line");

  assert.deepEqual(
    [pinnace.mass, pinnace.hitPoints],
    [60, 6]
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
  assert.equal(shipLabelForSlug(mesoamerican.slug), "Dugout Canoe");
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
  assert.equal(SHIP_UPWIND_FORGIVENESS_DEG, 8);
  assert.equal(shipStatsForSlug("sampan").upwindStallAngleDeg, 37);
  const fishingBarque = shipStatsForSlug("fishing-lugger");
  assert.equal(mesoamerican.topSpeedRad, 0.010 * SHIP_TOP_SPEED_SCALE);
  assert.ok(mesoamerican.topSpeedRad < fishingBarque.topSpeedRad * 0.4);
  assert.ok(mesoamerican.accelerationRad < fishingBarque.accelerationRad);
});

test("every sail plan receives the shared eight-degree close-hauled allowance", () => {
  assert.equal(shipStatsForSlug("felucca").upwindStallAngleDeg, 22);
  assert.equal(shipStatsForSlug("brigantine").upwindStallAngleDeg, 32);
  assert.equal(shipStatsForSlug("carrack").upwindStallAngleDeg, 52);
  assert.equal(shipStatsForSlug("polynesian-voyaging-canoe").upwindStallAngleDeg, 20);
  assert.equal(shipStatsForSlug("mesoamerican-dugout-canoe").upwindStallAngleDeg, 0);
});

test("the coastal Dhow is a tiny unarmed solo craft", () => {
  const dhow = shipStatsForSlug("dhow");
  const fishingBarque = shipStatsForSlug("fishing-lugger");

  assert.equal(dhow.cannons, 0);
  assert.equal(dhow.crewCapacity, 1);
  assert.ok(dhow.mass < fishingBarque.mass);
  assert.ok(dhow.cargoCapacity < fishingBarque.cargoCapacity);
  assert.ok(dhow.turnRateRad > fishingBarque.turnRateRad);
});

test("the Ocean Dhow fills the medium Indian Ocean merchant niche", () => {
  const coastalDhow = shipStatsForSlug("dhow");
  const oceanDhow = shipStatsForSlug("ocean-dhow");
  const mediumJunk = shipStatsForSlug("medium-junk");

  assert.equal(shipLabelForSlug(oceanDhow.slug), "Ocean Dhow");
  assert.equal(oceanDhow.cannons, 2);
  assert.equal(oceanDhow.crewCapacity, 10);
  assert.ok(oceanDhow.mass > coastalDhow.mass);
  assert.ok(oceanDhow.cargoCapacity > coastalDhow.cargoCapacity);
  assert.ok(oceanDhow.cargoCapacity < mediumJunk.cargoCapacity);
  assert.ok(oceanDhow.seaworthiness > coastalDhow.seaworthiness);
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
  const greatCarrack = shipStatsForSlug("ship-of-the-line");
  const panokseon = shipStatsForSlug("joseon-panokseon");

  assert.equal(shipLabelForSlug(turtleShip.slug), "Turtle Ship");
  assert.equal(turtleShip.propulsion, SHIP_PROPULSION_OAR_SAIL);
  assert.equal(turtleShip.cannons, 30);
  assert.equal(turtleShip.hitPoints, 45);
  assert.equal(turtleShip.armor, 40);
  assert.equal(turtleShip.seaworthiness, 9);
  assert.equal(shipHullResistsDamage(turtleShip, { roll: 0.39 }), true);
  assert.equal(shipHullResistsDamage(turtleShip, { roll: 0.4 }), false);
  assert.ok(turtleShip.hitPoints / (1 - turtleShip.armor / 100) > greatCarrack.hitPoints);
  assert.ok(turtleShip.accelerationRad < panokseon.accelerationRad);
  assert.ok(turtleShip.topSpeedRad < panokseon.topSpeedRad);
  assert.ok(turtleShip.turnRateRad < panokseon.turnRateRad);
  assert.ok(turtleShip.cargoCapacity < shipStatsForSlug("large-junk").cargoCapacity);
});

test("intrinsic turtle armor and perk resistance share one capped roll", () => {
  const turtleShip = shipStatsForSlug("joseon-turtle-ship");

  assert.equal(shipHullResistsDamage(turtleShip, {
    bonusResistanceChance: 0.2,
    roll: 0.599
  }), true);
  assert.equal(shipHullResistsDamage(turtleShip, {
    bonusResistanceChance: 0.2,
    roll: 0.6
  }), false);
  assert.equal(shipHullResistsDamage(turtleShip, {
    bonusResistanceChance: 0.2,
    includeIntrinsicArmor: false,
    roll: 0.2
  }), false);
});

test("old turtle ship saves preserve hull condition across its armor refit", () => {
  const turtleShip = shipStatsForSlug("joseon-turtle-ship");

  assert.deepEqual(reconcileShipHullForCurrentStats(turtleShip, 16, 32), {
    hitPoints: 22.5,
    maxHitPoints: 45
  });
  assert.deepEqual(reconcileShipHullForCurrentStats(turtleShip, 40, 32), {
    hitPoints: 45,
    maxHitPoints: 45
  });
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

test("the Kuribune is a light Japanese coastal oar-and-sail trader", () => {
  const kuribune = shipStatsForSlug("japanese-kuribune");

  assert.equal(shipLabelForSlug(kuribune.slug), "Kuribune");
  assert.equal(kuribune.propulsion, SHIP_PROPULSION_OAR_SAIL);
  assert.equal(kuribune.cannons, 0);
  assert.ok(kuribune.mass < shipStatsForSlug("small-junk").mass);
  assert.ok(kuribune.cargoCapacity < shipStatsForSlug("small-junk").cargoCapacity);
  assert.ok(kuribune.seaworthiness >= 5);
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

test("the Nusantaran outrigger is a seaworthy regional arrow ship and trader", () => {
  const outrigger = shipStatsForSlug("nusantaran-outrigger");

  assert.equal(shipLabelForSlug(outrigger.slug), "Nusantaran Outrigger");
  assert.equal(outrigger.propulsion, SHIP_PROPULSION_SAIL);
  assert.equal(outrigger.navalWeaponKind, NAVAL_WEAPON_ARROW);
  assert.equal(outrigger.cannons, 0);
  assert.ok(outrigger.cargoCapacity > shipStatsForSlug("small-junk").cargoCapacity);
  assert.ok(outrigger.cargoCapacity < shipStatsForSlug("medium-junk").cargoCapacity);
  assert.ok(outrigger.seaworthiness >= shipStatsForSlug("large-junk").seaworthiness);
});

test("the Kelulus is a fast compact Malay oar-and-sail raider", () => {
  const kelulus = shipStatsForSlug("kelulus");
  const smallJunk = shipStatsForSlug("small-junk");

  assert.equal(shipLabelForSlug(kelulus.slug), "Kelulus");
  assert.equal(kelulus.propulsion, SHIP_PROPULSION_OAR_SAIL);
  assert.equal(kelulus.cannons, 0);
  assert.equal(kelulus.navalWeaponKind, NAVAL_WEAPON_ARROW);
  assert.equal(kelulus.crewCapacity, 11);
  assert.ok(kelulus.topSpeedRad > smallJunk.topSpeedRad);
  assert.ok(kelulus.turnRateRad > smallJunk.turnRateRad);
  assert.ok(kelulus.cargoCapacity < smallJunk.cargoCapacity);
  assert.ok(kelulus.seaworthiness >= smallJunk.seaworthiness);
});

test("Malay warships form a distinct light-to-flagship progression", () => {
  const penjajap = shipStatsForSlug("penjajap");
  const lancaran = shipStatsForSlug("lancaran");
  const royal = shipStatsForSlug("royal-lancaran");

  assert.equal(shipLabelForSlug(penjajap.slug), "Penjajap");
  assert.equal(shipLabelForSlug(lancaran.slug), "Lancaran");
  assert.equal(shipLabelForSlug(royal.slug), "Royal Lancaran");
  for (const ship of [penjajap, lancaran, royal]) {
    assert.equal(ship.propulsion, SHIP_PROPULSION_OAR_SAIL);
  }
  assert.equal(penjajap.cannons, 2);
  assert.equal(lancaran.cannons, 6);
  assert.equal(royal.cannons, 10);
  assert.deepEqual(
    [penjajap.crewCapacity, lancaran.crewCapacity, royal.crewCapacity],
    [14, 27, 43]
  );
  assert.ok(penjajap.topSpeedRad > lancaran.topSpeedRad);
  assert.ok(lancaran.topSpeedRad > royal.topSpeedRad);
  assert.ok(penjajap.turnRateRad > lancaran.turnRateRad);
  assert.ok(lancaran.turnRateRad > royal.turnRateRad);
  assert.ok(penjajap.cannons < lancaran.cannons);
  assert.ok(lancaran.cannons < royal.cannons);
  assert.ok(penjajap.mass < lancaran.mass);
  assert.ok(lancaran.mass < royal.mass);
  assert.ok(penjajap.cargoCapacity < lancaran.cargoCapacity);
  assert.ok(lancaran.cargoCapacity < royal.cargoCapacity);
});

test("the Ottoman coastal trader is an armed regional merchant", () => {
  const trader = shipStatsForSlug("ottoman-coastal-trader");

  assert.equal(shipLabelForSlug(trader.slug), "Ottoman Coastal Trader");
  assert.equal(trader.propulsion, SHIP_PROPULSION_SAIL);
  assert.ok(trader.cannons > shipStatsForSlug("caravel").cannons - 1);
  assert.ok(trader.cargoCapacity > shipStatsForSlug("spanish-nao").cargoCapacity);
  assert.ok(trader.mass < shipStatsForSlug("galleon").mass);
});
