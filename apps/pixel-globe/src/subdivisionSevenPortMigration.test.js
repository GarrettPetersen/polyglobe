import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  SUBDIVISION_SEVEN_PORT_MIGRATION_COUNT,
  SUBDIVISION_SEVEN_TO_EIGHT_PORT_TILE_IDS,
  subdivisionSevenPortMigrationForWorld
} from "./subdivisionSevenPortMigration.js";

const currentPortBake = JSON.parse(readFileSync(
  new URL("../public/assets/data/port-sailing-distances.json", import.meta.url),
  "utf8"
));

test("every released subdivision-seven port reference resolves to a current dockable port", () => {
  const currentPortTileIds = new Set(currentPortBake.endpoints.map((endpoint) => endpoint.tileId));

  assert.equal(SUBDIVISION_SEVEN_TO_EIGHT_PORT_TILE_IDS.size, 310);
  assert.equal(
    SUBDIVISION_SEVEN_TO_EIGHT_PORT_TILE_IDS.size,
    SUBDIVISION_SEVEN_PORT_MIGRATION_COUNT
  );
  for (const [savedTileId, currentTileId] of SUBDIVISION_SEVEN_TO_EIGHT_PORT_TILE_IDS) {
    assert.equal(Number.isInteger(savedTileId), true);
    assert.equal(
      currentPortTileIds.has(currentTileId),
      true,
      `saved port ${savedTileId} targets missing current port ${currentTileId}`
    );
  }
});

test("the reported Cempoala, Angra, and Ozette references have authored migrations", () => {
  assert.equal(SUBDIVISION_SEVEN_TO_EIGHT_PORT_TILE_IDS.get(79421), 317231);
  assert.equal(SUBDIVISION_SEVEN_TO_EIGHT_PORT_TILE_IDS.get(72876), 291080);
  assert.equal(SUBDIVISION_SEVEN_TO_EIGHT_PORT_TILE_IDS.get(46523), 185827);
});

test("legacy tile collisions resolve by saved topology rather than current tile coincidence", () => {
  assert.equal(
    SUBDIVISION_SEVEN_TO_EIGHT_PORT_TILE_IDS.get(74340),
    18641,
    "subdivision-seven Plymouth must not become subdivision-eight Boston"
  );
  assert.equal(
    SUBDIVISION_SEVEN_TO_EIGHT_PORT_TILE_IDS.get(160923),
    643561,
    "subdivision-seven Hull must not become subdivision-eight York"
  );
});

test("port migration is selected only for the authored world-topology change", () => {
  assert.equal(subdivisionSevenPortMigrationForWorld({
    savedSubdivisions: 8,
    currentSubdivisions: 8
  }), null);
  assert.equal(subdivisionSevenPortMigrationForWorld({
    savedSubdivisions: 7,
    currentSubdivisions: 8
  }), SUBDIVISION_SEVEN_TO_EIGHT_PORT_TILE_IDS);
  assert.throws(
    () => subdivisionSevenPortMigrationForWorld({
      savedSubdivisions: 6,
      currentSubdivisions: 8
    }),
    /No port migration exists/
  );
});
