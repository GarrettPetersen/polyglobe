import assert from "node:assert/strict";
import test from "node:test";

import { cargoCrateStatusLayout } from "./cargoCrateStatus.js";

test("small holds leave crates readable until compression is needed", () => {
  const layout = crateLayout({ used: 4, capacity: 10 });

  assert.deepEqual(layout.panel, { x: 5, y: 5, width: 120, height: 52 });
  assert.equal(layout.rowCount, 1);
  assert.equal(layout.pitch, 7);
  assert.equal(layout.rowPitch, 6);
  assert.deepEqual(layout.value, { right: 120, y: 47, width: 35, text: "4/10" });
  assert.equal(layout.entries.filter((entry) => entry.full).length, 4);
  assert.deepEqual(layout.drawEntries.map((entry) => entry.index), [4, 5, 6, 7, 8, 9, 0, 1, 2, 3]);
  assert.deepEqual(layout.entries.slice(0, 3).map(({ x, y }) => [x, y]), [
    [10, 48],
    [17, 48],
    [24, 48]
  ]);
});

test("the 520-unit Urca packs touching crates into rows without widening the HUD", () => {
  const layout = crateLayout({ used: 319.2, capacity: 520 });

  assert.equal(layout.panel.width, 120);
  assert.equal(layout.panel.height, 66);
  assert.equal(layout.rowCount, 8);
  assert.equal(layout.rowCapacity, 65);
  assert.equal(layout.pitch, 1);
  assert.equal(layout.rowPitch, 2);
  assert.equal(layout.entries.length, 520);
  assert.equal(layout.entries.filter((entry) => entry.full).length, 320);
  assert.equal(layout.entries[64].y, 48);
  assert.equal(layout.entries[65].y, 50);
  assert.equal(layout.entries[455].y, 62);
  assert.ok(
    layout.drawEntries.findIndex((entry) => entry.index === 320) <
    layout.drawEntries.findIndex((entry) => entry.index === 319)
  );
  assert.ok(
    Math.max(...layout.drawEntries
      .map((entry, drawIndex) => ({ entry, drawIndex }))
      .filter(({ entry }) => entry.row === 0)
      .map(({ drawIndex }) => drawIndex)) <
    Math.min(...layout.drawEntries
      .map((entry, drawIndex) => ({ entry, drawIndex }))
      .filter(({ entry }) => entry.row === 1)
      .map(({ drawIndex }) => drawIndex))
  );
  assert.ok(layout.entries.every((entry) => Number.isInteger(entry.x) && Number.isInteger(entry.y)));
});

test("inventory amount changes fill ordering without changing panel geometry", () => {
  const empty = crateLayout({ used: 0, capacity: 520 });
  const nearlyFull = crateLayout({ used: 519.2, capacity: 520 });

  assert.deepEqual(nearlyFull.panel, empty.panel);
  assert.equal(nearlyFull.rowCount, empty.rowCount);
  assert.equal(nearlyFull.rowCapacity, empty.rowCapacity);
  assert.equal(nearlyFull.pitch, empty.pitch);
  assert.equal(nearlyFull.rowPitch, empty.rowPitch);
  assert.equal(nearlyFull.occupiedCount, 520);
});

test("crate layout rejects impossible or inconsistent holds", () => {
  assert.throws(() => crateLayout({ used: 11, capacity: 10 }), /outside the hold/);
  assert.throws(() => crateLayout({ used: 0, capacity: 0 }), /must be positive/);
  assert.throws(() => crateLayout({ used: 0, capacity: 10, panelWidth: 40 }), /panel width is invalid/);
  assert.throws(
    () => crateLayout({ used: 0, capacity: 520, maximumPanelHeight: 55 }),
    /cannot fit/
  );
});

function crateLayout(overrides) {
  return cargoCrateStatusLayout({
    panelX: 5,
    panelY: 5,
    panelWidth: 120,
    valueWidth: 35,
    ...overrides
  });
}
