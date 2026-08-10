import assert from "node:assert/strict";
import test from "node:test";

import { createForeignSettlementExpulsionMemory, withForeignSettlements1522 } from "./foreignSettlements.js";
import { HISTORICAL_GOSSIP_EVENTS, recentHistoricalGossipForPort } from "./historicalGossip.js";
import { createPapalPolitics } from "./papalPolitics.js";
import { gameMinuteForDate } from "./rulers.js";
import {
  MING_TRADE_POLICY_ID,
  createSovereignTradeGrantMemory,
  grantSovereignTradeToFaction
} from "./sovereignTradeAccess.js";
import { createWorldDiplomacy, declareDiplomaticWar, makeDiplomaticPeace } from "./worldDiplomacy.js";

const WORMS = port("Worms", "Germany", "habsburg");
const ROME = port("Rome", "Italy", "papal-states");
const DELHI = port("Delhi", "India", "delhi");
const KYOTO = port("Kyoto", "Japan", "japan");
const RHODES = port("Rhodes", "Greece", "hospitallers");
const VIENNA = port("Vienna", "Austria", "habsburg");
const WORLD_CITIES = [
  RHODES,
  VIENNA,
  port("Pavia", "Italy", "habsburg"),
  DELHI,
  port("Buda", "Hungary", "hungary"),
  ROME,
  port("Ayutthaya", "Thailand", "ayutthaya"),
  withForeignSettlements1522(port("Ternate", "Indonesia", "ternate"))
];

test("German ports begin with local gossip about the Diet of Worms", () => {
  const state = worldState();
  const gossip = recentHistoricalGossipForPort(WORMS, 0, state);

  assert.equal(gossip.id, "diet-of-worms");
  assert.match(gossip.report, /Martin Luther refused to recant/);
  assert.equal(recentHistoricalGossipForPort(ROME, 0, state), null);
});

test("historical gossip follows its region and expires", () => {
  const state = worldState();
  const panipatNews = recentHistoricalGossipForPort(DELHI, gameMinuteForDate(1526, 6, 1), state);
  const distantNews = recentHistoricalGossipForPort(KYOTO, gameMinuteForDate(1526, 6, 1), state);

  assert.equal(panipatNews.id, "first-battle-of-panipat");
  assert.notEqual(distantNews?.id, "first-battle-of-panipat");
  assert.equal(recentHistoricalGossipForPort(WORMS, gameMinuteForDate(1523, 1, 1), state), null);
});

test("the fall of Rhodes is reported from the moment Ottoman control becomes real", () => {
  const beforeConquest = recentHistoricalGossipForPort(
    ROME,
    gameMinuteForDate(1522, 3, 1),
    worldState()
  );
  assert.equal(beforeConquest, null);

  const conqueredCities = [{ ...RHODES, factionId: "ottoman" }];
  const afterConquest = recentHistoricalGossipForPort(
    ROME,
    gameMinuteForDate(1522, 3, 1),
    worldState(replaceWorldCity(RHODES, conqueredCities[0]))
  );
  assert.equal(afterConquest.id, "fall-of-rhodes");

  assert.equal(
    recentHistoricalGossipForPort(ROME, gameMinuteForDate(1522, 6, 1), worldState()),
    null
  );
});

test("the siege of Vienna is only reported while its belligerents are actually at war", () => {
  const simMinute = gameMinuteForDate(1529, 10, 20);
  const state = worldState();

  assert.equal(recentHistoricalGossipForPort(VIENNA, simMinute, state), null);

  declareDiplomaticWar(state.diplomacy, "ottoman", "habsburg", simMinute - 2);
  assert.equal(recentHistoricalGossipForPort(VIENNA, simMinute, state).id, "siege-of-vienna");

  makeDiplomaticPeace(state.diplomacy, "ottoman", "habsburg", simMinute - 1);
  assert.equal(recentHistoricalGossipForPort(VIENNA, simMinute, state), null);
});

test("opened Ming trade suppresses stale gossip that Portugal remains excluded", () => {
  const state = worldState();
  const simMinute = gameMinuteForDate(1522, 6, 1);
  assert.equal(recentHistoricalGossipForPort(KYOTO, simMinute, state).id, "jiajing-expels-portuguese");

  grantSovereignTradeToFaction(state.tradeAccessGrants, MING_TRADE_POLICY_ID, "portugal");
  assert.notEqual(
    recentHistoricalGossipForPort(KYOTO, simMinute, state)?.id,
    "jiajing-expels-portuguese"
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

function worldState(worldCities = WORLD_CITIES) {
  return {
    worldCities,
    collapsedFactionIds: [],
    diplomacy: createWorldDiplomacy({ seedKey: "historical-gossip-test" }),
    papacy: createPapalPolitics({ seedKey: "historical-gossip-test" }),
    tradeAccessGrants: createSovereignTradeGrantMemory(),
    foreignSettlementExpulsions: createForeignSettlementExpulsionMemory()
  };
}

function replaceWorldCity(original, replacement) {
  return WORLD_CITIES.map((city) => city === original ? replacement : city);
}
