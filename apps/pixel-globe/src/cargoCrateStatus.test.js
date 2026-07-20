import assert from "node:assert/strict";
import test from "node:test";

import { cargoCrateStatusLayout } from "./cargoCrateStatus.js";

test("small holds leave crates readable until compression is needed", () => {
  const layout = crateLayout({ used: 4, capacity: 10, maximumPanelWidth: 280 });

  assert.deepEqual(layout.panel, { x: 5, y: 5, width: 120, height: 52 });
  assert.equal(layout.rowCount, 1);
  assert.equal(layout.pitch, 7);
  assert.deepEqual(layout.value, { right: 120, y: 47, width: 35, text: "4/10" });
  assert.equal(layout.entries.filter((entry) => entry.full).length, 4);
  assert.deepEqual(layout.entries.slice(0, 3).map(({ x, y }) => [x, y]), [
    [10, 48],
    [17, 48],
    [24, 48]
  ]);
});

test("the 520-unit Urca keeps two touching rows and a value column in the landscape HUD", () => {
  const layout = crateLayout({ used: 319.2, capacity: 520, maximumPanelWidth: 320 });

  assert.equal(layout.panel.width, 314);
  assert.equal(layout.panel.height, 58);
  assert.equal(layout.rowCount, 2);
  assert.equal(layout.rowCapacity, 260);
  assert.equal(layout.pitch, 1);
  assert.equal(layout.entries.length, 520);
  assert.equal(layout.entries.filter((entry) => entry.full).length, 320);
  assert.equal(layout.entries[259].y, 48);
  assert.equal(layout.entries[260].y, 54);
  assert.ok(layout.entries.every((entry) => Number.isInteger(entry.x) && Number.isInteger(entry.y)));
});

test("the Urca uses four touching rows beside its value column in the narrow portrait HUD", () => {
  const layout = crateLayout({ used: 0, capacity: 520, maximumPanelWidth: 216 });

  assert.equal(layout.panel.width, 184);
  assert.equal(layout.panel.height, 70);
  assert.equal(layout.rowCount, 4);
  assert.equal(layout.rowCapacity, 130);
  assert.equal(layout.entries[129].y, 48);
  assert.equal(layout.entries[130].y, 54);
  assert.equal(layout.entries[260].y, 60);
  assert.equal(layout.entries[390].y, 66);
});

test("crate layout rejects impossible or inconsistent holds", () => {
  assert.throws(() => crateLayout({ used: 11, capacity: 10, maximumPanelWidth: 120 }), /outside the hold/);
  assert.throws(() => crateLayout({ used: 0, capacity: 0, maximumPanelWidth: 120 }), /must be positive/);
  assert.throws(() => crateLayout({ used: 0, capacity: 10, maximumPanelWidth: 100 }), /panel width is invalid/);
});

function crateLayout(overrides) {
  return cargoCrateStatusLayout({
    panelX: 5,
    panelY: 5,
    minimumPanelWidth: 120,
    valueWidth: 35,
    ...overrides
  });
}
