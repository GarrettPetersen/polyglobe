import assert from "node:assert/strict";
import test from "node:test";

import {
  MINIMAP_CITY_COLOR,
  MINIMAP_VILLAGE_COLOR,
  minimapSettlementColor,
  minimapSettlementMarkers
} from "./minimapSettlements.js";
import { RESURRECT_64_HEX } from "./waterLatitudePalette.js";

test("revealed cities and villages receive distinct pixel markers", () => {
  const markers = minimapSettlementMarkers([
    { tileId: 4, settlementType: "city" },
    { tileId: 8, settlementType: "village" },
    { tileId: 12, settlementType: "city" }
  ], {
    isRevealed: (settlement) => settlement.tileId !== 12,
    project: (settlement) => ({ x: settlement.tileId, y: 2 })
  });
  assert.deepEqual(markers, [
    { x: 4, y: 2, kind: "city" },
    { x: 8, y: 2, kind: "village" }
  ]);
});

test("a city takes precedence when settlements share one map pixel", () => {
  const markers = minimapSettlementMarkers([
    { tileId: 1, settlementType: "village" },
    { tileId: 2, settlementType: "city" },
    { tileId: 3, settlementType: "village" }
  ], {
    isRevealed: () => true,
    project: () => ({ x: 7, y: 5 })
  });
  assert.deepEqual(markers, [{ x: 7, y: 5, kind: "city" }]);
});

test("settlement marker colors are restrained Resurrect 64 tones", () => {
  const palette = new Set(RESURRECT_64_HEX.map((hex) => `#${hex}`));
  assert.equal(minimapSettlementColor("city"), MINIMAP_CITY_COLOR);
  assert.equal(minimapSettlementColor("village"), MINIMAP_VILLAGE_COLOR);
  assert.ok(palette.has(MINIMAP_CITY_COLOR));
  assert.ok(palette.has(MINIMAP_VILLAGE_COLOR));
  assert.notEqual(MINIMAP_CITY_COLOR, MINIMAP_VILLAGE_COLOR);
  assert.throws(() => minimapSettlementColor("port"), /Unknown minimap settlement kind/);
});
