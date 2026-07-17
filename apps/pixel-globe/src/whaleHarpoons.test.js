import assert from "node:assert/strict";
import test from "node:test";

import {
  WHALE_HARPOONS,
  resolveWhaleHarpoon,
  whaleHarpoonById,
  whaleHarpoonHitChance
} from "./whaleHarpoons.js";

test("whale harpoons form a more accurate, stronger, longer-ranged upgrade ramp", () => {
  for (let index = 1; index < WHALE_HARPOONS.length; index++) {
    assert.ok(WHALE_HARPOONS[index].price > WHALE_HARPOONS[index - 1].price);
    assert.ok(WHALE_HARPOONS[index].accuracy > WHALE_HARPOONS[index - 1].accuracy);
    assert.ok(WHALE_HARPOONS[index].breakChance < WHALE_HARPOONS[index - 1].breakChance);
    assert.ok(WHALE_HARPOONS[index].rangePx > WHALE_HARPOONS[index - 1].rangePx);
    assert.ok(WHALE_HARPOONS[index].exhaustionSeconds < WHALE_HARPOONS[index - 1].exhaustionSeconds);
  }
  assert.equal(whaleHarpoonById("masterwork-harpoon"), WHALE_HARPOONS.at(-1));
});

test("harpoon resolution distinguishes misses, broken ropes, and secure tethers", () => {
  const harpoon = WHALE_HARPOONS[0];
  const hitChance = whaleHarpoonHitChance(harpoon, 20);
  assert.ok(hitChance > 0 && hitChance < 1);
  assert.equal(resolveWhaleHarpoon(harpoon, 20, { hitRoll: hitChance, breakRoll: 0.99 }).outcome, "missed");
  assert.equal(resolveWhaleHarpoon(harpoon, 20, { hitRoll: 0, breakRoll: 0 }).outcome, "broke");
  assert.equal(resolveWhaleHarpoon(harpoon, 20, { hitRoll: 0, breakRoll: 0.99 }).outcome, "tethered");
  assert.equal(whaleHarpoonHitChance(harpoon, harpoon.rangePx + 1), 0);
});
