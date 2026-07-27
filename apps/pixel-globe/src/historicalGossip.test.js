import assert from "node:assert/strict";
import test from "node:test";

import { HISTORICAL_GOSSIP_EVENTS, recentHistoricalGossipForPort } from "./historicalGossip.js";
import { gameMinuteForDate } from "./rulers.js";

const WORMS = port("Worms", "Germany", "habsburg");
const ROME = port("Rome", "Italy", "papal-states");
const DELHI = port("Delhi", "India", "delhi");
const KYOTO = port("Kyoto", "Japan", "japan");
const RHODES = port("Rhodes", "Greece", "hospitallers");
const WORLD_CITIES = [RHODES];

test("German ports begin with local gossip about the Diet of Worms", () => {
  const gossip = recentHistoricalGossipForPort(WORMS, 0, WORLD_CITIES);

  assert.equal(gossip.id, "diet-of-worms");
  assert.match(gossip.report, /Martin Luther refused to recant/);
  assert.equal(recentHistoricalGossipForPort(ROME, 0, WORLD_CITIES), null);
});

test("historical gossip follows its region and expires", () => {
  const panipatNews = recentHistoricalGossipForPort(DELHI, gameMinuteForDate(1526, 6, 1), WORLD_CITIES);
  const distantNews = recentHistoricalGossipForPort(KYOTO, gameMinuteForDate(1526, 6, 1), WORLD_CITIES);

  assert.equal(panipatNews.id, "first-battle-of-panipat");
  assert.notEqual(distantNews?.id, "first-battle-of-panipat");
  assert.equal(recentHistoricalGossipForPort(WORMS, gameMinuteForDate(1523, 1, 1), WORLD_CITIES), null);
});

test("the fall of Rhodes is reported from the moment Ottoman control becomes real", () => {
  const beforeConquest = recentHistoricalGossipForPort(ROME, gameMinuteForDate(1522, 3, 1), WORLD_CITIES);
  assert.equal(beforeConquest, null);

  const conqueredCities = [{ ...RHODES, factionId: "ottoman" }];
  const afterConquest = recentHistoricalGossipForPort(ROME, gameMinuteForDate(1522, 3, 1), conqueredCities);
  assert.equal(afterConquest.id, "fall-of-rhodes");

  const retakenCities = [{ ...RHODES, factionId: "hospitallers" }];
  assert.equal(
    recentHistoricalGossipForPort(ROME, gameMinuteForDate(1522, 6, 1), retakenCities),
    null
  );
});

test("historical gossip registry is unique and chronological", () => {
  assert.equal(new Set(HISTORICAL_GOSSIP_EVENTS.map((event) => event.id)).size, HISTORICAL_GOSSIP_EVENTS.length);
  assert.ok(HISTORICAL_GOSSIP_EVENTS.every((event, index) => (
    index === 0 || HISTORICAL_GOSSIP_EVENTS[index - 1].fromMinute <= event.fromMinute
  )));
  assert.ok(HISTORICAL_GOSSIP_EVENTS.every((event) => event.untilMinute > event.fromMinute));
});

function port(city, country, factionId) {
  return { city, country, factionId };
}
