import assert from "node:assert/strict";
import test from "node:test";

import { requirePixelPerfectSpriteScale } from "./pixelPerfectSpriteScale.js";

test("pixel-perfect sprite scales are positive whole-number multiples", () => {
  assert.equal(requirePixelPerfectSpriteScale(1), 1);
  assert.equal(requirePixelPerfectSpriteScale(2), 2);
  assert.throws(() => requirePixelPerfectSpriteScale(1.5, "City person sprite"), /positive integer scale/);
  assert.throws(() => requirePixelPerfectSpriteScale(0), /positive integer scale/);
});
