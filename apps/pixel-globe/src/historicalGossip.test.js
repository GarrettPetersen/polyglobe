import assert from "node:assert/strict";
import test from "node:test";

import { HISTORICAL_GOSSIP_EVENTS, recentHistoricalGossipForPort } from "./historicalGossip.js";
import { gameMinuteForDate } from "./rulers.js";

const WORMS = port("Worms", "Germany", "habsburg");
const ROME = port("Rome", "Italy", "papal-states");
const DELHI = port("Delhi", "India", "delhi");
const KYOTO = port("Kyoto", "Japan", "japan");

test("German ports begin with local gossip about the Diet of Worms", () => {
  const gossip = recentHistoricalGossipForPort(WORMS, 0);

  assert.equal(gossip.id, "diet-of-worms");
  assert.match(gossip.report, /Martin Luther refused to recant/);
  assert.equal(recentHistoricalGossipForPort(ROME, 0), null);
});

test("historical gossip follows its region and expires", () => {
  const panipatNews = recentHistoricalGossipForPort(DELHI, gameMinuteForDate(1526, 6, 1));
  const distantNews = recentHistoricalGossipForPort(KYOTO, gameMinuteForDate(1526, 6, 1));

  assert.equal(panipatNews.id, "first-battle-of-panipat");
  assert.notEqual(distantNews?.id, "first-battle-of-panipat");
  assert.equal(recentHistoricalGossipForPort(WORMS, gameMinuteForDate(1523, 1, 1)), null);
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
