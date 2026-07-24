import assert from "node:assert/strict";
import test from "node:test";

import { FACTIONS, NEUTRAL_FACTION_ID, PIRATE_FACTION_ID } from "./factions.js";
import {
  RULER_TIMELINES,
  gameMinuteForDate,
  recentRegionalRulerChange,
  rulerAtMinute,
  rulerChangesBetween
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
  }
  assert.equal(rulerAtMinute(NEUTRAL_FACTION_ID, 0), null);
  assert.equal(rulerAtMinute(PIRATE_FACTION_ID, 0), null);
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
