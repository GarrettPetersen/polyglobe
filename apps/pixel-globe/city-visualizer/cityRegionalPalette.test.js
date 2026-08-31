import assert from "node:assert/strict";
import test from "node:test";

import { RESURRECT_64_HEX } from "../src/waterLatitudePalette.js";
import {
  CITY_FORTIFICATION_LAYERS,
  cityFortificationPaletteApplies,
  cityFortificationPaletteRgb,
  cityRegionalPaletteApplies,
  cityRegionalPaletteRgb
} from "./cityRegionalPalette.js";

function rgb(hex) {
  return {
    red: Number.parseInt(hex.slice(0, 2), 16),
    green: Number.parseInt(hex.slice(2, 4), 16),
    blue: Number.parseInt(hex.slice(4, 6), 16)
  };
}

function hex(color) {
  return [color.red, color.green, color.blue]
    .map((component) => component.toString(16).padStart(2, "0"))
    .join("");
}

test("Mediterranean fortifications use the warm limestone ramp", () => {
  const expected = new Map([
    ["3e3546", "625565"],
    ["625565", "966c6c"],
    ["7f708a", "ab947a"],
    ["9babb2", "c7dcd0"]
  ]);

  for (const layerName of CITY_FORTIFICATION_LAYERS) {
    for (const [source, target] of expected) {
      assert.equal(
        hex(cityFortificationPaletteRgb("mediterranean", layerName, ...Object.values(rgb(source)))),
        target
      );
    }
  }
});

test("Mediterranean castle source ramp remains a four-colour target ramp", () => {
  const targets = ["3e3546", "625565", "7f708a", "9babb2"].map((source) => (
    hex(cityFortificationPaletteRgb("mediterranean", "Gate", ...Object.values(rgb(source))))
  ));
  assert.deepEqual(targets, ["625565", "966c6c", "ab947a", "c7dcd0"]);
});

test("regional palette is limited to Mediterranean fortification pieces", () => {
  assert.equal(cityFortificationPaletteApplies("mediterranean", "Gate"), true);
  assert.equal(cityFortificationPaletteApplies("northern-european", "Gate"), false);
  assert.equal(cityFortificationPaletteApplies("mediterranean", "Inn"), false);

  assert.equal(
    hex(cityFortificationPaletteRgb("northern-european", "Gate", ...Object.values(rgb("7f708a")))),
    "7f708a"
  );
  assert.equal(
    hex(cityFortificationPaletteRgb("mediterranean", "Inn", ...Object.values(rgb("7f708a")))),
    "7f708a"
  );
});

test("every Mediterranean fortification target belongs to Resurrect 64", () => {
  for (const source of ["3e3546", "625565", "655565", "7f708a", "9babb2"]) {
    const target = hex(
      cityFortificationPaletteRgb("mediterranean", "Near Castle", ...Object.values(rgb(source)))
    );
    assert.equal(RESURRECT_64_HEX.includes(target), true, target);
  }
});

test("Mediterranean churches exchange only the two red roof tones for terracotta", () => {
  assert.equal(cityRegionalPaletteApplies("mediterranean", "Church"), true);
  assert.equal(
    hex(cityRegionalPaletteRgb("mediterranean", "Church", ...Object.values(rgb("6e2727")))),
    "9e4539"
  );
  assert.equal(
    hex(cityRegionalPaletteRgb("mediterranean", "Church", ...Object.values(rgb("b33831")))),
    "cd683d"
  );
  for (const unchanged of ["2e222f", "3e3546", "9babb2", "c7dcd0"]) {
    assert.equal(
      hex(cityRegionalPaletteRgb("mediterranean", "Church", ...Object.values(rgb(unchanged)))),
      unchanged
    );
  }
});

test("church roof swap does not affect non-Mediterranean churches", () => {
  assert.equal(cityRegionalPaletteApplies("northern-european", "Church"), false);
  assert.equal(
    hex(cityRegionalPaletteRgb("northern-european", "Church", ...Object.values(rgb("b33831")))),
    "b33831"
  );
});
