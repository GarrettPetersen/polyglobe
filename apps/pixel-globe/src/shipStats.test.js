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
    ketch: "Lateen Barque"
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

test("native canoe hulls are small, unarmed, and regionally distinct", () => {
  const polynesian = shipStatsForSlug("polynesian-voyaging-canoe");
  const mesoamerican = shipStatsForSlug("mesoamerican-dugout-canoe");

  assert.equal(shipLabelForSlug(polynesian.slug), "Polynesian Voyaging Canoe");
  assert.equal(shipLabelForSlug(mesoamerican.slug), "Mesoamerican Dugout Canoe");
  assert.equal(polynesian.cannons, 0);
  assert.equal(mesoamerican.cannons, 0);
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
