import assert from "node:assert/strict";
import test from "node:test";

import {
  cityForestSeason,
  cityForestSeasonalPaletteRgb
} from "./cityForestSeason.js";

test("only changing foreground deciduous trees season the distant forest", () => {
  const placements = [
    placement("near-cherry", "cherry", 1),
    placement("near-pine", "evergreen", 1),
    placement("rear-larch", "larch", 0.88)
  ];
  assert.deepEqual(cityForestSeason({
    placements,
    presentations: presentations({
      "near-cherry": "falling-leaf",
      "near-pine": "foliage",
      "rear-larch": "autumn"
    })
  }), { kind: "autumn", coverage: 0.61 });
  assert.deepEqual(cityForestSeason({
    placements,
    presentations: presentations({
      "near-cherry": "bare",
      "near-pine": "foliage",
      "rear-larch": "autumn"
    })
  }), { kind: "winter", coverage: 0.61 });
  assert.deepEqual(cityForestSeason({
    placements,
    presentations: presentations({
      "near-cherry": "falling-blossom",
      "near-pine": "foliage",
      "rear-larch": "bare"
    })
  }), { kind: "foliage", coverage: 0 });
});

test("autumn forest clusters mix unchanged evergreen, yellow, and red crowns", () => {
  const season = { kind: "autumn", coverage: 0.61 };
  const colors = new Set();
  for (let y = 0; y < 60; y += 6) {
    for (let x = 0; x < 120; x += 6) {
      const color = cityForestSeasonalPaletteRgb({
        season,
        seed: "london|united kingdom:Distant Forest",
        x,
        y,
        red: 35,
        green: 144,
        blue: 99
      });
      colors.add(rgbHex(color));
    }
  }
  assert.ok(colors.has("239063"), "some implied trees remain evergreen");
  assert.ok(colors.has("a2a947"), "some crowns turn yellow");
  assert.ok(colors.has("cd683d"), "some crowns turn red-orange");
});

test("winter forest clusters use trunk colors and preserve non-forest pixels", () => {
  assert.deepEqual(cityForestSeasonalPaletteRgb({
    season: { kind: "winter", coverage: 1 },
    seed: "winter-port:Distant Forest",
    x: 0,
    y: 0,
    red: 35,
    green: 144,
    blue: 99
  }), { red: 98, green: 85, blue: 101 });
  assert.deepEqual(cityForestSeasonalPaletteRgb({
    season: { kind: "winter", coverage: 1 },
    seed: "winter-port:Distant Forest",
    x: 0,
    y: 0,
    red: 49,
    green: 54,
    blue: 56
  }), { red: 49, green: 54, blue: 56 });
});

function placement(id, presentationPolicy, depth) {
  return Object.freeze({ id, presentationPolicy, depth });
}

function presentations(phases) {
  return new Map(Object.entries(phases).map(([id, phase]) => [id, Object.freeze({ phase })]));
}

function rgbHex({ red, green, blue }) {
  return [red, green, blue].map((value) => value.toString(16).padStart(2, "0")).join("");
}
