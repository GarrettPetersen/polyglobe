import assert from "node:assert/strict";
import test from "node:test";

import { repairWeatherObscuresScreenRect } from "./worldLabelOcclusion.js";

const LABEL_RECT = Object.freeze({ x: 90, y: 46, w: 40, h: 10 });

test("world labels remain visible without repair weather", () => {
  assert.equal(repairWeatherObscuresScreenRect({ rect: LABEL_RECT }), false);
});

test("world labels hide where fog blur is visible", () => {
  const fogFrame = Object.freeze({
    edgeOpacity: 0.8,
    focusX: 50,
    focusY: 50,
    clearRadius: 20,
    fadeBandPx: 20,
    raggednessPx: 0
  });
  assert.equal(repairWeatherObscuresScreenRect({
    rect: LABEL_RECT,
    fogFrames: [fogFrame]
  }), true);
  assert.equal(repairWeatherObscuresScreenRect({
    rect: { x: 45, y: 45, w: 10, h: 10 },
    fogFrames: [fogFrame]
  }), false);
});

test("world labels hide beneath a repair cloud", () => {
  const cloudFrame = Object.freeze({
    clouds: Object.freeze([{ x: 110, y: 51, variantIndex: 0 }])
  });
  assert.equal(repairWeatherObscuresScreenRect({
    rect: LABEL_RECT,
    cloudFrame
  }), true);
  assert.equal(repairWeatherObscuresScreenRect({
    rect: { x: 10, y: 10, w: 20, h: 10 },
    cloudFrame
  }), false);
});

test("world label occlusion rejects malformed rectangles", () => {
  assert.throws(
    () => repairWeatherObscuresScreenRect({ rect: { x: 0, y: 0, w: 0, h: 10 } }),
    /must be positive/
  );
});
