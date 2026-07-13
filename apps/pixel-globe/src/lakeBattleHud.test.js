import assert from "node:assert/strict";
import test from "node:test";

import { lakeBattleHudLayout } from "./lakeBattleHud.js";

test("wide lake battle HUD panels expand to preserve long ship names", () => {
  const layout = lakeBattleHudLayout({
    screenWidth: 455,
    labelWidths: [92, 164]
  });

  assert.equal(layout.stacked, false);
  assert.equal(layout.player.w, 172);
  assert.equal(layout.enemy.w, 172);
  assert.ok(layout.player.w - 8 >= 164);
  assert.ok(layout.player.x + layout.player.w < layout.enemy.x);
  assert.equal(layout.pauseButton.y, 32);
});

test("portrait lake battle HUD stacks full-width health panels", () => {
  const layout = lakeBattleHudLayout({
    screenWidth: 256,
    labelWidths: [180, 164]
  });

  assert.equal(layout.stacked, true);
  assert.deepEqual(layout.player, { x: 4, y: 4, w: 248, h: 24, alignRight: false });
  assert.deepEqual(layout.enemy, { x: 4, y: 32, w: 248, h: 24, alignRight: true });
  assert.ok(layout.enemy.w - 8 >= 180);
  assert.deepEqual(layout.pauseButton, { x: 230, y: 60, w: 22, h: 22 });
});

test("lake battle HUD rejects incomplete geometry inputs", () => {
  assert.throws(
    () => lakeBattleHudLayout({ screenWidth: 455, labelWidths: [100] }),
    /exactly two label widths/
  );
  assert.throws(
    () => lakeBattleHudLayout({ screenWidth: 0, labelWidths: [100, 100] }),
    /Invalid lake battle HUD width/
  );
});
