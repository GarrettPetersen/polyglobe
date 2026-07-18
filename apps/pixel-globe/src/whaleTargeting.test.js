import assert from "node:assert/strict";
import test from "node:test";

import { selectWhaleTargetAtPoint } from "./whaleTargeting.js";

test("the full scaled whale sprite is clickable with a small touch pad", () => {
  const adult = { id: "adult", x: 100, y: 80, scale: 1 };
  const calf = { id: "calf", x: 160, y: 80, scale: 0.43 };

  assert.equal(selectWhaleTargetAtPoint([adult], { x: 127, y: 80 }, 48), adult);
  assert.equal(selectWhaleTargetAtPoint([adult], { x: 130, y: 80 }, 48), null);
  assert.equal(selectWhaleTargetAtPoint([calf], { x: 173, y: 80 }, 48), calf);
});

test("overlapping whale targets select the one nearest the pointer", () => {
  const left = { id: "left", x: 100, y: 80, scale: 1 };
  const right = { id: "right", x: 110, y: 80, scale: 1 };

  assert.equal(selectWhaleTargetAtPoint([left, right], { x: 108, y: 80 }, 48), right);
});

test("whale targeting rejects malformed calls instead of hiding them", () => {
  assert.throws(
    () => selectWhaleTargetAtPoint([{ id: "bad", x: 0, y: 0, scale: 0 }], { x: 0, y: 0 }, 48),
    /invalid interaction call/
  );
});
