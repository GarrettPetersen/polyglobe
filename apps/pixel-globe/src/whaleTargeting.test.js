import assert from "node:assert/strict";
import test from "node:test";

import { whaleTargetRect } from "./whaleTargeting.js";

test("whale targeting surrounds the full scaled sprite with a small touch pad", () => {
  const adult = { id: "adult", x: 100, y: 80, scale: 1 };
  const calf = { id: "calf", x: 160, y: 80, scale: 0.43 };

  assert.deepEqual(whaleTargetRect(adult, 48), { x: 72, y: 52, w: 56, h: 56 });
  assert.deepEqual(whaleTargetRect(calf, 48), { x: 145.68, y: 65.68, w: 28.64, h: 28.64 });
});

test("whale targeting rejects malformed calls instead of hiding them", () => {
  assert.throws(
    () => whaleTargetRect({ id: "bad", x: 0, y: 0, scale: 0 }, 48),
    /invalid interaction call/
  );
});
