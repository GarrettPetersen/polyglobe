import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  PORT_CATALOG_VERSION,
  PRE_NORTH_MALUKU_PORT_TILE_IDS,
  PRE_RIVER_OUTLET_PORT_TILE_IDS,
  PRE_DJENNE_CORRECTION_TILE_IDS,
  PRE_GEOGRAPHY_REVIEW_PORT_TILE_IDS,
  PRE_EXACT_NEAREST_PORT_TILE_IDS,
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
  const migration = sameTopologyPortMigrationForSavedVoyage({}, topology);
  for (const [oldTile, tile] of [...PRE_NORTH_MALUKU_PORT_TILE_IDS, ...PRE_RIVER_OUTLET_PORT_TILE_IDS,
    ...PRE_DJENNE_CORRECTION_TILE_IDS, ...PRE_GEOGRAPHY_REVIEW_PORT_TILE_IDS]) {
    assert.equal(migration.get(oldTile), PRE_EXACT_NEAREST_PORT_TILE_IDS.get(tile) ?? tile);
  }
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
  assert.equal(migration.has(160888), false, "Utrecht now occupies its actual geographic tile");
  assert.equal(migration.get(160923), 643561, "escaped subdivision-seven Hull follows its authored migration");
  assert.equal(migration.has(366350), false, "placed Tidore must retain its current identity");
});

test("older catalogs move Asuncion to the restored Paraguay-Parana route without moving other ports", () => {
  for (const portCatalogVersion of [1, 2]) {
    const migration = sameTopologyPortMigrationForSavedVoyage({ portCatalogVersion }, {
      savedSubdivisions: 8, currentSubdivisions: 8
    });
    assert.equal(migration.get(431742), 430596);
    assert.equal(migration.get(636087), 162642);
    assert.equal(migration.has(366350), false, "current Tidore must keep its identity");
  }
  assert.equal(currentPortBake.endpoints.find(({ name }) => name === "Asuncion").tileId, 430596);
});

test("the Djenne correction migrates old tiles without moving current saves or Timbuktu", () => {
  const topology = { savedSubdivisions: 8, currentSubdivisions: 8 };
  const migration = sameTopologyPortMigrationForSavedVoyage({ portCatalogVersion: 3 }, topology);
  assert.equal(migration.get(636087), 162642);
  assert.equal(migration.has(654806), false, "previously redirected Timbuktu jobs remain Timbuktu jobs");
  assert.equal(sameTopologyPortMigrationForSavedVoyage({ portCatalogVersion: PORT_CATALOG_VERSION }, topology), null);
  const djenne = currentPortBake.endpoints.find(({ name }) => name === "Djenne");
  assert.equal(djenne.tileId, 162642);
  assert.equal(djenne.country, "Mali");
});

test("same-topology port migration rejects unknown catalog versions and topologies", () => {
  assert.throws(
    () => sameTopologyPortMigrationForSavedVoyage({ portCatalogVersion: PORT_CATALOG_VERSION + 1 }, {
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


test("catalog version disambiguates old York from subdivision-seven Hull on the same tile", () => {
  const topology = {savedSubdivisions: 8, currentSubdivisions: 8};
  assert.equal(portReferenceMigrationForSavedVoyage({portCatalogVersion: 4}, topology,
    currentPortBake.endpoints).get(160923), 643564);
  assert.equal(portReferenceMigrationForSavedVoyage({portCatalogVersion: 5}, topology,
    currentPortBake.endpoints).get(160923), 643561);
  assert.equal(sameTopologyPortMigrationForSavedVoyage({portCatalogVersion: PORT_CATALOG_VERSION}, topology), null);
});

test("nearest-tile migration composes old Copenhagen and disambiguates Trakai from Vilnius", () => {
  const topology = {savedSubdivisions: 8, currentSubdivisions: 8};
  const v4 = sameTopologyPortMigrationForSavedVoyage({portCatalogVersion: 4}, topology);
  const v5 = sameTopologyPortMigrationForSavedVoyage({portCatalogVersion: 5}, topology);
  assert.equal(v4.get(393189), 393293);
  assert.equal(v5.get(393304), 393293);
  assert.equal(v5.get(397387), 99518, "old Trakai becomes new Trakai, not new Vilnius");
  assert.equal(v5.get(99518), 397385, "old Vilnius retains its own identity");
  assert.equal(v5.has(393189), false, "already migrated saves do not reapply an earlier catalog's positions");
});

test("released Exeter voyages go to Topsham once while current inland identity stays Exeter", () => {
  const topology = { savedSubdivisions: 8, currentSubdivisions: 8 };
  const old = JSON.parse(readFileSync(new URL("./test-fixtures/city-catalog-releases/6.json", import.meta.url)));
  const exeter = old.ports.find(({ cityId }) => cityId === "exeter|united kingdom");
  const topsham = currentPortBake.endpoints.find(({ name }) => name === "Topsham");
  assert.ok(exeter && topsham);
  assert.equal(sameTopologyPortMigrationForSavedVoyage({ portCatalogVersion: 6 }, topology).get(exeter.tileId), topsham.tileId);
  assert.equal(sameTopologyPortMigrationForSavedVoyage({ portCatalogVersion: PORT_CATALOG_VERSION }, topology), null);
});
