import assert from "node:assert/strict";
import test from "node:test";
import { CROATOAN_CLUE, cityRuinsDamage, croatoanClueScreenRect, croatoanClueContainsPoint } from "./cityColonyRuins.js";
import { gameIconAtlasRect } from "../src/gameIcons.js";

test("ruins remove most of each building, keep its foundation, and have a deterministic rough edge", () => {
  for (const [width, height] of [[40, 60], [72, 100], [128, 180]]) {
    for (const seed of [1, 42, 9943]) {
      const alpha = new Uint8Array(width * height).fill(255);
      const before = alpha.slice();
      const input = { alpha, width, height, foundationHeight: 12, seed };
      const damage = cityRuinsDamage(input);
      assert.deepEqual(damage, cityRuinsDamage(input));
      assert.deepEqual(alpha, before);
      assert.ok(damage.hole.reduce((sum, pixel) => sum + pixel, 0) > alpha.length * 0.65);
      assert.ok(damage.hole.slice((height - 12) * width).every((pixel) => pixel === 0));
      const tops = Array.from({ length: width }, (_, x) => {
        for (let y = 0; y < height; y++) if (damage.hole[y * width + x] === 0) return y;
      });
      assert.ok(new Set(tops).size > 2);
      assert.ok(tops.every((top) => top > height * 0.6));
      assert.ok(damage.rim.some((pixel) => pixel === 1));
    }
  }
  assert.throws(() => cityRuinsDamage({ alpha: new Uint8Array(20), width: 4, height: 5,
    foundationHeight: 12, seed: 1 }), /Invalid ruined building/);
});

test("CROATOAN uses the timber icon and its hit region follows the rendered scene coordinates", () => {
  assert.deepEqual(gameIconAtlasRect(CROATOAN_CLUE.iconId), gameIconAtlasRect("good:timber"));
  for (const window of [{ x: 900, y: 330 }, { x: 800.6, y: 325.2 }]) {
    const rect = croatoanClueScreenRect(window);
    assert.equal(rect.x, Math.round(CROATOAN_CLUE.x - window.x));
    assert.ok(croatoanClueContainsPoint(rect, rect.x + 10, rect.y + 10));
    assert.equal(croatoanClueContainsPoint(rect, rect.x - 1, rect.y), false);
    assert.equal(croatoanClueContainsPoint(rect, rect.x + rect.width, rect.y), false);
  }
});
