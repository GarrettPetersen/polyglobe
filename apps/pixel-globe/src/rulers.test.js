import assert from "node:assert/strict";
import test from "node:test";

import { FACTIONS, NEUTRAL_FACTION_ID, PIRATE_FACTION_ID } from "./factions.js";
import {
  ENGLISH_REFORMATION_MINUTE,
  RULER_TIMELINES,
  RULER_GOSSIP_MENTION_LIMIT,
  gameMinuteForDate,
  recordRulerGossipMention,
  recentRegionalRulerChange,
  rulerAtMinute,
  rulerChangesBetween,
  unheardRegionalRulerChange
} from "./rulers.js";

test("every sovereign faction has a named ruler in 1522", () => {
  const sovereignIds = FACTIONS
    .filter((faction) => faction.id !== NEUTRAL_FACTION_ID && faction.id !== PIRATE_FACTION_ID)
    .map((faction) => faction.id)
    .sort();

  assert.deepEqual(Object.keys(RULER_TIMELINES).sort(), sovereignIds);
  for (const factionId of sovereignIds) {
    const current = rulerAtMinute(factionId, 0);
    assert.ok(current.name.length > 0, factionId);
    assert.ok(current.title.length > 0, factionId);
    assert.match(current.displayName, new RegExp(current.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.equal(typeof current.religionId, "string");
    assert.ok(current.piety >= 0 && current.piety <= 1);
  }
  assert.equal(rulerAtMinute(NEUTRAL_FACTION_ID, 0), null);
  assert.equal(rulerAtMinute(PIRATE_FACTION_ID, 0), null);
  assert.equal(rulerAtMinute("hospitallers", 0).displayName, "Grand Master Philippe Villiers de L'Isle-Adam");
  assert.equal(rulerAtMinute("hospitallers", 0).religionId, "roman-catholic");
});

test("dated confessional changes alter rulers without inventing a succession", () => {
  assert.equal(
    rulerAtMinute("england", ENGLISH_REFORMATION_MINUTE - 1).religionId,
    "roman-catholic"
  );
  assert.equal(rulerAtMinute("england", ENGLISH_REFORMATION_MINUTE).religionId, "anglican");
  assert.equal(rulerAtMinute("denmark-norway", gameMinuteForDate(1534, 7, 4)).religionId, "lutheran");
  assert.equal(
    rulerChangesBetween(ENGLISH_REFORMATION_MINUTE - 1, ENGLISH_REFORMATION_MINUTE + 1)
      .some((event) => event.factionId === "england"),
    false
  );
});

test("ruler succession happens at its queued date", () => {
  const genoaChange = gameMinuteForDate(1522, 5, 31);
  assert.equal(rulerAtMinute("genoa", genoaChange - 1).name, "Ottaviano Fregoso");
  assert.equal(rulerAtMinute("genoa", genoaChange).name, "Antoniotto II Adorno");

  const safavidChange = gameMinuteForDate(1524, 5, 23);
  assert.equal(rulerAtMinute("safavid", safavidChange - 1).name, "Ismail I");
  assert.equal(rulerAtMinute("safavid", safavidChange).name, "Tahmasp I");

  assert.equal(rulerAtMinute("ternate", 0).name, "Abu Hayat");
  assert.equal(rulerAtMinute("ternate", gameMinuteForDate(1529, 1, 1)).name, "Dayal");
  assert.equal(rulerAtMinute("tidore", 0).name, "Al-Mansur");
  assert.equal(rulerAtMinute("tidore", gameMinuteForDate(1526, 1, 1)).name, "Mir");

  assert.equal(rulerAtMinute("sweden", 0).displayName, "Regent Gustav Eriksson");
  const swedishKingship = gameMinuteForDate(1523, 6, 6);
  assert.equal(rulerAtMinute("sweden", swedishKingship - 1).title, "Regent");
  assert.equal(rulerAtMinute("sweden", swedishKingship).displayName, "King Gustav I");
  assert.equal(rulerAtMinute("sweden", gameMinuteForDate(1527, 6, 18)).religionId, "lutheran");
});

test("ruler change queue is chronological and excludes its starting boundary", () => {
  const start = gameMinuteForDate(1523, 1, 1);
  const end = gameMinuteForDate(1525, 1, 1);
  const events = rulerChangesBetween(start, end);

  assert.ok(events.length >= 4);
  assert.ok(events.every((event) => event.fromMinute > start && event.fromMinute <= end));
  assert.ok(events.every((event, index) => index === 0 || events[index - 1].fromMinute <= event.fromMinute));
  assert.ok(events.some((event) => event.factionId === "safavid" && event.name === "Tahmasp I"));
});

test("regional ruler gossip reaches nearby courts but not distant ones", () => {
  const changeMinute = gameMinuteForDate(1524, 5, 23);
  const ottomanRumor = recentRegionalRulerChange("ottoman", changeMinute + 10 * 1440);
  const japaneseRumor = recentRegionalRulerChange("japan", changeMinute + 10 * 1440);

  assert.equal(ottomanRumor.factionId, "safavid");
  assert.equal(ottomanRumor.displayName, "Shah Tahmasp I");
  assert.equal(ottomanRumor.daysAgo, 10);
  assert.equal(japaneseRumor, null);
  assert.equal(recentRegionalRulerChange("ottoman", changeMinute + 181 * 1440), null);
});

test("regional ruler gossip skips successions in annexed states", () => {
  const changeMinute = gameMinuteForDate(1524, 5, 23);
  const rumor = recentRegionalRulerChange("ottoman", changeMinute + 10 * 1440, {
    excludedFactionIds: ["safavid"]
  });

  assert.notEqual(rumor?.factionId, "safavid");
});

test("each ruler change is mentioned at most twice across the voyage", () => {
  const decisions = {};
  const changeMinute = gameMinuteForDate(1523, 1, 20);

  for (let count = 0; count < RULER_GOSSIP_MENTION_LIMIT; count += 1) {
    const rumor = unheardRegionalRulerChange(decisions, "ottoman", changeMinute + 10);
    assert.equal(rumor.factionId, "denmark-norway");
    assert.equal(recordRulerGossipMention(decisions, rumor), count + 1);
  }

  assert.equal(unheardRegionalRulerChange(decisions, "ottoman", changeMinute + 10), null);
});
