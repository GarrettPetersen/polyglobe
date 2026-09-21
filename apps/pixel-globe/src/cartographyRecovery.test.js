import assert from "node:assert/strict";
import test from "node:test";

import { advanceCartographyRecovery } from "./cartographyRecovery.js";

test("cartography recovery advances in bounded yieldable chunks", () => {
  const revealed = [];
  const first = advanceCartographyRecovery([2, 4, 8, 16], 0, {
    maxTiles: 3,
    revealTile: (tileId) => revealed.push(tileId),
    shouldYield: () => revealed.length >= 2
  });
  assert.deepEqual(first, { nextIndex: 2, processed: 2, complete: false });
  assert.deepEqual(revealed, [2, 4]);

  const second = advanceCartographyRecovery([2, 4, 8, 16], first.nextIndex, {
    maxTiles: 3,
    revealTile: (tileId) => revealed.push(tileId),
    shouldYield: () => false
  });
  assert.deepEqual(second, { nextIndex: 4, processed: 2, complete: true });
  assert.deepEqual(revealed, [2, 4, 8, 16]);
});

test("cartography recovery always makes progress when an idle budget is exhausted", () => {
  const revealed = [];
  const result = advanceCartographyRecovery([3, 5], 0, {
    maxTiles: 10,
    revealTile: (tileId) => revealed.push(tileId),
    shouldYield: () => true
  });
  assert.deepEqual(result, { nextIndex: 1, processed: 1, complete: false });
  assert.deepEqual(revealed, [3]);
});
