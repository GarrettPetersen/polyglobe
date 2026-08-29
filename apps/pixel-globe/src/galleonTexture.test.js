import assert from "node:assert/strict";
import test from "node:test";

import {
  GALLEON_SAIL_MATERIAL,
  PROCEDURAL_FURLED_SAIL_MATERIAL,
  simplifyGalleonTextureColor
} from "./galleonTexture.js";

test("galleon sailcloth becomes one intentional flat color", () => {
  for (const sourceMaterialName of [
    GALLEON_SAIL_MATERIAL,
    PROCEDURAL_FURLED_SAIL_MATERIAL
  ]) {
    assert.deepEqual(
      simplifyGalleonTextureColor(
        { r: 73, g: 57, b: 45 },
        { sourceMaterialName }
      ),
      { r: 226, g: 215, b: 177 }
    );
  }
});

test("galleon hull texture retains broad timber and accent families", () => {
  assert.deepEqual(
    simplifyGalleonTextureColor(
      { r: 88, g: 54, b: 29 },
      { sourceMaterialName: "3d66-Standardmaterial-15910671-004", normal: { y: 0 } }
    ),
    { r: 126, g: 80, b: 45 }
  );
});

test("galleon material classification fails without source identity", () => {
  assert.throws(
    () => simplifyGalleonTextureColor({ r: 88, g: 54, b: 29 }, {}),
    /source material name/
  );
});
