import assert from "node:assert/strict";
import test from "node:test";

import { simplifyDetailedSailShipTextureColor } from "./shipTextureSimplification.js";

test("detailed sail ship texture simplification preserves broad material families", () => {
  assert.deepEqual(simplifyDetailedSailShipTextureColor({ r: 226, g: 220, b: 203 }), {
    r: 226, g: 215, b: 177
  });
  assert.deepEqual(simplifyDetailedSailShipTextureColor({ r: 132, g: 22, b: 18 }), {
    r: 157, g: 55, b: 43
  });
  assert.deepEqual(simplifyDetailedSailShipTextureColor({ r: 75, g: 76, b: 81 }), {
    r: 75, g: 77, b: 80
  });
  assert.deepEqual(simplifyDetailedSailShipTextureColor({ r: 24, g: 15, b: 10 }), {
    r: 52, g: 34, b: 24
  });
  assert.deepEqual(simplifyDetailedSailShipTextureColor({ r: 88, g: 54, b: 29 }), {
    r: 126, g: 80, b: 45
  });
});

test("detailed sail ship texture simplification fails loudly for malformed colors", () => {
  assert.throws(
    () => simplifyDetailedSailShipTextureColor({ r: 20, g: Number.NaN, b: 10 }),
    /finite RGB color/
  );
});
