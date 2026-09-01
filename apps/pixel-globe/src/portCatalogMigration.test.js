import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  PORT_CATALOG_VERSION,
  PRE_NORTH_MALUKU_PORT_TILE_IDS,
  portReferenceMigrationForSavedVoyage,
  sameTopologyPortMigrationForSavedVoyage
} from "./portCatalogMigration.js";

const CURRENT_NORTH_MALUKU_TILES = Object.freeze({
  Ternate: 366292,
  Tidore: 366350,
  "Makian Village": 366359
});

const currentPortBake = JSON.parse(readFileSync(
  new URL("../public/assets/data/port-sailing-distances.json", import.meta.url),
  "utf8"
));

test("pre-version subdivision-eight saves migrate all North Maluku ports exactly once", () => {
  const topology = {
    savedSubdivisions: 8,
    currentSubdivisions: 8
  };
  assert.equal(
    sameTopologyPortMigrationForSavedVoyage({}, topology),
    PRE_NORTH_MALUKU_PORT_TILE_IDS
  );
  assert.deepEqual(
    Object.fromEntries(PRE_NORTH_MALUKU_PORT_TILE_IDS),
    {
      23005: 366292,
      366276: 366350,
      366350: 366359
    }
  );
  assert.equal(
    sameTopologyPortMigrationForSavedVoyage({
      portCatalogVersion: PORT_CATALOG_VERSION
    }, topology),
    null,
    "a current save must retain Tidore at the tile formerly occupied by Makian"
  );
});

test("North Maluku port migration targets the canonical current city catalog", () => {
  const tileByPortName = new Map(
    currentPortBake.endpoints.map((port) => [port.name, port.tileId])
  );
  assert.deepEqual(
    Object.fromEntries(Object.keys(CURRENT_NORTH_MALUKU_TILES).map((name) => (
      [name, tileByPortName.get(name)]
    ))),
    CURRENT_NORTH_MALUKU_TILES
  );
  for (const targetTileId of PRE_NORTH_MALUKU_PORT_TILE_IDS.values()) {
    assert.equal(
      currentPortBake.endpoints.some((city) => city.tileId === targetTileId),
      true,
      `migration target ${targetTileId} must remain in the canonical city catalog`
    );
  }
});

test("a current-topology save still repairs an orphaned subdivision-seven reference", () => {
  const migration = portReferenceMigrationForSavedVoyage(
    { portCatalogVersion: PORT_CATALOG_VERSION },
    { savedSubdivisions: 8, currentSubdivisions: 8 },
    currentPortBake.endpoints
  );
  assert.equal(migration.get(160888), 643413, "escaped Utrecht reference must be repaired");
  assert.equal(migration.has(160923), false, "placed York must retain its current identity");
  assert.equal(migration.has(366350), false, "placed Tidore must retain its current identity");
});

test("version-one saves remain compatible after maritime gateways are added", () => {
  assert.equal(sameTopologyPortMigrationForSavedVoyage({ portCatalogVersion: 1 }, {
    savedSubdivisions: 8,
    currentSubdivisions: 8
  }), null);
});

test("same-topology port migration rejects unknown catalog versions and topologies", () => {
  assert.throws(
    () => sameTopologyPortMigrationForSavedVoyage({ portCatalogVersion: 3 }, {
      savedSubdivisions: 8,
      currentSubdivisions: 8
    }),
    /cannot load/
  );
  assert.throws(
    () => sameTopologyPortMigrationForSavedVoyage({}, {
      savedSubdivisions: 7,
      currentSubdivisions: 7
    }),
    /No same-topology port catalog migration/
  );
  assert.equal(
    sameTopologyPortMigrationForSavedVoyage({}, {
      savedSubdivisions: 7,
      currentSubdivisions: 8
    }),
    null,
    "world-topology migrations own subdivision-seven references"
  );
});
