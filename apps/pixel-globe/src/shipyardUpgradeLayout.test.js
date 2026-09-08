import test from "node:test";
import assert from "node:assert/strict";
import { shipyardUpgradeCardLayout } from "./shipyardUpgradeLayout.js";

test("upgrade cards support an empty list and many variable-height future upgrades", () => {
  assert.equal(shipyardUpgradeCardLayout([], 150, 0).maxScrollOffsetPx, 0);
  const cards = Array.from({ length: 30 }, (_, index) => ({ id: `upgrade-${index}`, heightPx: 65 + index % 3 * 20 }));
  const first = shipyardUpgradeCardLayout(cards, 150, 0);
  assert.equal(first.rows[0].yPx, 0);
  assert.equal(first.rows.at(-1).visible, false);
  const last = shipyardUpgradeCardLayout(cards, 150, first.maxScrollOffsetPx);
  assert.equal(last.rows.at(-1).yPx + last.rows.at(-1).heightPx, 150);
  assert.equal(last.rows[0].visible, false);
  const focused = shipyardUpgradeCardLayout(cards, 150, 0, cards.at(-1).id);
  assert.equal(focused.scrollOffsetPx, last.scrollOffsetPx);
});

test("oversized cards can scroll to their purchase controls and shrinking lists clamp their offset", () => {
  const cards = [{ id: "long-description", heightPx: 500 }];
  assert.equal(shipyardUpgradeCardLayout(cards, 100, 999).scrollOffsetPx, 400);
  assert.equal(shipyardUpgradeCardLayout([{ id: "owned", heightPx: 50 }], 100, 400).scrollOffsetPx, 0);
  assert.throws(() => shipyardUpgradeCardLayout([{ id: "same", heightPx: 50 }, { id: "same", heightPx: 50 }], 100, 0), /Invalid shipyard upgrade card/);
  assert.throws(() => shipyardUpgradeCardLayout(cards, 0, 0), /viewport/);
});
