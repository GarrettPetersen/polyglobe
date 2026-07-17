import assert from "node:assert/strict";
import test from "node:test";

import { ROAD_MOUNTAIN_ELEVATION, roadTerrainPenalty, roadTileIsPassable } from "./roadTerrain.js";

test("road routing rejects water, rivers, ice, peaks, and mountain-height terrain", () => {
  assert.equal(roadTileIsPassable({ t: "grass", e: 0.01 }), true);
  assert.equal(roadTileIsPassable({ t: "water", e: 0 }), false);
  assert.equal(roadTileIsPassable({ t: "lake", e: 0 }), false);
  assert.equal(roadTileIsPassable({ t: "grass", e: 0.01 }, { hasRiver: true }), false);
  assert.equal(roadTileIsPassable({ t: "grass", e: 0.01 }, { namedPeak: true }), false);
  assert.equal(roadTileIsPassable({ t: "ice", e: 0 }), false);
  assert.equal(roadTileIsPassable({ t: "mountain", e: 0.05 }), false);
  assert.equal(roadTileIsPassable({ t: "grass", e: ROAD_MOUNTAIN_ELEVATION }), false);
});

test("road terrain costs prefer flat plains over forests, deserts, jungle, and hills", () => {
  const plain = roadTerrainPenalty({ t: "grass", e: 0.01 });
  assert.ok(roadTerrainPenalty({ t: "forest", e: 0.01 }) > plain);
  assert.ok(roadTerrainPenalty({ t: "desert", e: 0.01 }) > plain);
  assert.ok(roadTerrainPenalty({ t: "tropical_jungle", e: 0.01 }) > roadTerrainPenalty({ t: "desert", e: 0.01 }));
  assert.ok(roadTerrainPenalty({ t: "grass", e: 0.08, h: 1 }) > plain * 2);
});
