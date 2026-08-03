import assert from "node:assert/strict";
import test from "node:test";

import {
  shipHandoverHistoryForSlug,
  validateShipHandoverHistoryCoverage
} from "./shipHandoverDialogue.js";
import { SHIP_STATS, shipLabelForSlug } from "./shipStats.js";

test("every ship type has its own substantial handover history", () => {
  assert.equal(validateShipHandoverHistoryCoverage(), true);
  const histories = SHIP_STATS.map(({ slug }) => shipHandoverHistoryForSlug(slug));

  assert.equal(new Set(histories).size, SHIP_STATS.length);
  for (let index = 0; index < SHIP_STATS.length; index += 1) {
    const label = shipLabelForSlug(SHIP_STATS[index].slug);
    assert.doesNotMatch(histories[index], new RegExp(`\\b${escapeRegExp(label)}\\b`, "i"),
      `${label} history repeats its heading`);
    assert.match(histories[index], /^[A-Z]/);
    assert.ok(histories[index].length >= 100, `${label} handover history is too brief`);
    assert.match(histories[index], /\.$/);
  }
});

test("unknown ships cannot fall back to generic handover copy", () => {
  assert.throws(
    () => shipHandoverHistoryForSlug("future-unwritten-hull"),
    /Missing ship stats/
  );
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
