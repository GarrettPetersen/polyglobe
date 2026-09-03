import assert from "node:assert/strict";
import test from "node:test";

import {
  npcShipHullBarColor,
  shipHullBarLayout,
  shipHullBarLayoutBelowRect,
  shipHullIsDamaged
} from "./shipHullBar.js";
import {
  ENEMY_SHIP_COMBAT_COLOR,
  FRIENDLY_SHIP_COMBAT_COLOR,
  NEUTRAL_SHIP_COMBAT_COLOR,
  PLAYER_SHIP_COMBAT_COLOR,
  shipCombatAllegianceColor
} from "./shipCombatPresentation.js";

test("player hull bars appear only below full strength", () => {
  assert.equal(shipHullIsDamaged(16, 16), false);
  assert.equal(shipHullIsDamaged(15, 16), true);
  assert.equal(shipHullIsDamaged(0, 16), true);
});

test("ship hull bars retain the NPC geometry below a centered sprite", () => {
  assert.deepEqual(shipHullBarLayout({
    x: 100,
    y: 50,
    frameSize: 64,
    hitPoints: 8,
    maxHitPoints: 16
  }), {
    x: 122,
    y: 112,
    width: 20,
    height: 3,
    fillWidth: 9
  });
});

test("dockside hull bars center beneath a rectangular ship silhouette", () => {
  assert.deepEqual(shipHullBarLayoutBelowRect({
    x: 80,
    y: 40,
    width: 160,
    height: 84,
    hitPoints: 30,
    maxHitPoints: 60,
    barWidth: 48,
    gap: 2
  }), {
    x: 136,
    y: 126,
    width: 48,
    height: 3,
    fillWidth: 23
  });
});

test("ship combat colors identify player, enemy, and friendly ships", () => {
  assert.equal(PLAYER_SHIP_COMBAT_COLOR, "#f9c22b");
  assert.equal(npcShipHullBarColor("enemy"), ENEMY_SHIP_COMBAT_COLOR);
  assert.equal(npcShipHullBarColor("friendly"), FRIENDLY_SHIP_COMBAT_COLOR);
  assert.equal(npcShipHullBarColor("ally"), FRIENDLY_SHIP_COMBAT_COLOR);
  assert.equal(npcShipHullBarColor(null), NEUTRAL_SHIP_COMBAT_COLOR);
});

test("ship hull bars reject malformed strength and geometry", () => {
  assert.throws(
    () => shipHullBarLayout({ x: 0, y: 0, frameSize: 64, hitPoints: 17, maxHitPoints: 16 }),
    /Invalid ship hull strength/
  );
  assert.throws(
    () => shipHullBarLayout({ x: 0, y: 0, frameSize: 10, hitPoints: 5, maxHitPoints: 10, width: 20 }),
    /dimensions are invalid/
  );
  assert.throws(
    () => shipHullBarLayoutBelowRect({
      x: 0, y: 0, width: 10, height: 10, hitPoints: 5, maxHitPoints: 10, barWidth: 11
    }),
    /rectangle is invalid/
  );
  assert.throws(
    () => shipCombatAllegianceColor("neutral"),
    /Unknown ship combat allegiance/
  );
});
