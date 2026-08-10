import assert from "node:assert/strict";
import test from "node:test";

import {
  historicalBattleCommanderMenuLayout,
  historicalBattleMapMenuLayout,
  historicalBattleMarkerPoint,
  historicalBattleMenuPanelRect,
  stepHistoricalBattleCommanderIndex
} from "./historicalBattleMenu.js";

test("historical battle map and commander menus fit wide and tall viewports", () => {
  for (const [width, height] of [[455, 256], [256, 495]]) {
    const panel = historicalBattleMenuPanelRect(width, height);
    const mapLayout = historicalBattleMapMenuLayout(panel);
    const commanderLayout = historicalBattleCommanderMenuLayout(panel, 6);

    assertRectInside(panel, { x: 0, y: 0, w: width, h: height });
    assertRectInside(mapLayout.mapRect, panel);
    assertRectInside(mapLayout.backRect, panel);
    assertRectInside(commanderLayout.backRect, panel);
    for (const rect of commanderLayout.sideHeadingRects) assertRectInside(rect, panel);
    assert.equal(commanderLayout.cardRects.length, 6);
    for (const rect of commanderLayout.cardRects) assertRectInside(rect, panel);
    for (let index = 0; index < commanderLayout.cardRects.length; index++) {
      for (let other = index + 1; other < commanderLayout.cardRects.length; other++) {
        assert.equal(rectsOverlap(
          commanderLayout.cardRects[index],
          commanderLayout.cardRects[other]
        ), false);
      }
    }
  }
});

test("historical battle markers project geographic coordinates into the world map", () => {
  const map = { x: 10, y: 20, w: 360, h: 144 };
  assert.deepEqual(
    historicalBattleMarkerPoint({ longitudeDeg: 0, latitudeDeg: 0 }, map),
    { x: 190, y: 92 }
  );
  const lepanto = historicalBattleMarkerPoint({ longitudeDeg: 21.25, latitudeDeg: 38.2 }, map);
  assert.ok(lepanto.x > 190 && lepanto.x < 220);
  assert.ok(lepanto.y > map.y && lepanto.y < 60);
});

test("commander navigation crosses sides and reaches Back without pointer input", () => {
  assert.equal(stepHistoricalBattleCommanderIndex(0, "ArrowRight", 6), 3);
  assert.equal(stepHistoricalBattleCommanderIndex(3, "ArrowLeft", 6), 0);
  assert.equal(stepHistoricalBattleCommanderIndex(1, "ArrowDown", 6), 2);
  assert.equal(stepHistoricalBattleCommanderIndex(2, "ArrowDown", 6), 6);
  assert.equal(stepHistoricalBattleCommanderIndex(6, "ArrowUp", 6), 2);
  assert.equal(stepHistoricalBattleCommanderIndex(0, "ArrowUp", 6), 6);
});

function assertRectInside(inner, outer) {
  assert.ok(inner.x >= outer.x);
  assert.ok(inner.y >= outer.y);
  assert.ok(inner.x + inner.w <= outer.x + outer.w);
  assert.ok(inner.y + inner.h <= outer.y + outer.h);
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
