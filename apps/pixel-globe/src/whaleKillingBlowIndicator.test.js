import assert from "node:assert/strict";
import test from "node:test";

import {
  WHALE_KILLING_BLOW_BOB_PERIOD_MS,
  whaleKillingBlowIndicatorHitRect,
  whaleKillingBlowIndicatorRect
} from "./whaleKillingBlowIndicator.js";

test("killing-blow indicator stays centered above the whale and bobs on the pixel grid", () => {
  const whale = { id: "whale-1", x: 100, y: 80, scale: 1 };

  assert.deepEqual(whaleKillingBlowIndicatorRect(whale, 48, 0), {
    x: 92,
    y: 37,
    w: 16,
    h: 16
  });
  assert.deepEqual(
    whaleKillingBlowIndicatorRect(whale, 48, WHALE_KILLING_BLOW_BOB_PERIOD_MS / 4),
    { x: 92, y: 39, w: 16, h: 16 }
  );
});

test("killing-blow indicator has a forgiving click target", () => {
  const whale = { id: "whale-1", x: 100, y: 80, scale: 1 };
  assert.deepEqual(whaleKillingBlowIndicatorHitRect(whale, 48, 0), {
    x: 89,
    y: 34,
    w: 22,
    h: 22
  });
});

test("killing-blow indicator rejects malformed calls", () => {
  assert.throws(
    () => whaleKillingBlowIndicatorRect({ id: "whale-1", x: 0, y: 0, scale: 0 }, 48, 0),
    /invalid interaction call/
  );
});
