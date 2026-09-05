import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  SUBDIVISION_SEVEN_PORT_MIGRATION_COUNT,
  SUBDIVISION_SEVEN_TO_EIGHT_PORT_TILE_IDS,
  orphanedSubdivisionSevenPortTileIds,
  subdivisionSevenPortMigrationForWorld,
  subdivisionSevenPortReferenceCatalog
} from "./subdivisionSevenPortMigration.js";

const currentPortBake = JSON.parse(readFileSync(
  new URL("../public/assets/data/port-sailing-distances.json", import.meta.url),
  "utf8"
));
const currentCities = JSON.parse(readFileSync(
  new URL("../city-visualizer/data/cities.json", import.meta.url), "utf8"
)).cities;
const currentCitiesByTileId = new Map(currentCities.map((city) => [city.tileId, city]));
const currentReferences = currentPortBake.endpoints.map((endpoint) => {
  const city = currentCitiesByTileId.get(endpoint.tileId);
  assert.ok(city, `missing canonical fixture city at ${endpoint.tileId}`);
  return { ...endpoint, cityId: city.cityId };
});

test("every released subdivision-seven port reference resolves to a current port or colony site", () => {
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

test("restore migration admits colony sites before founded colonies rejoin the dockable roster", () => {
  const portCities = currentReferences.filter((endpoint) => endpoint.kind !== "colony");
  const colonySites = currentReferences.filter((endpoint) => endpoint.kind === "colony");
  const references = subdivisionSevenPortReferenceCatalog(portCities, colonySites);
  const referencesByTileId = new Map(references.map((reference) => [reference.tileId, reference]));

  assert.equal(portCities.some((port) => port.tileId === 294413), false);
  assert.equal(referencesByTileId.get(294413)?.name, "St. Augustine");
  assert.equal(SUBDIVISION_SEVEN_TO_EIGHT_PORT_TILE_IDS.get(18401), 294413);
  assert.throws(
    () => subdivisionSevenPortReferenceCatalog(
      portCities,
      colonySites.filter((site) => site.tileId !== 294413)
    ),
    /Saved port tile 18401 targets missing current port or colony site 294413/
  );
});

test("every founded colony can coexist with its original site during repeated save restoration", () => {
  const ports = currentReferences.filter((entry) => entry.kind !== "colony");
  const sites = currentReferences.filter((entry) => entry.kind === "colony");
  assert.ok(sites.some(({ cityId, tileId }) => cityId === "lima|peru" && tileId === 538749));
  const founded = sites.map((site) => ({ ...site, kind: "port", population: 2400,
    displayCity: `Player's ${site.name}`, factionId: "england", colonizationQuestSite: true }));
  const before = structuredClone({ ports, sites, founded });
  for (const colony of founded) {
    const references = subdivisionSevenPortReferenceCatalog([...ports, colony], sites);
    assert.equal(references.filter(({ cityId }) => cityId === colony.cityId).length, 1);
    assert.equal(references.find(({ cityId }) => cityId === colony.cityId), colony,
      "live city history takes precedence over the site's original metadata");
  }
  const allFounded = subdivisionSevenPortReferenceCatalog([...ports, ...founded], sites);
  assert.equal(allFounded.length, currentReferences.length);
  assert.deepEqual(subdivisionSevenPortReferenceCatalog(allFounded, sites), allFounded);
  assert.deepEqual({ ports, sites, founded }, before);
});

test("restore catalogs reject ambiguous identities and actual conflicting placements", () => {
  const lima = currentReferences.find(({ cityId }) => cityId === "lima|peru");
  assert.throws(() => subdivisionSevenPortReferenceCatalog(currentReferences,
    [{ ...lima, cityId: "another-city|peru", preexistingSettlement: true }]), /Conflicting.*538749/);
  assert.throws(() => subdivisionSevenPortReferenceCatalog(currentReferences,
    [{ ...lima, tileId: 999999 }]), /conflicting tiles.*lima\|peru/i);
  assert.throws(() => subdivisionSevenPortReferenceCatalog([...currentReferences, lima], []), /duplicate.*lima\|peru/i);
  assert.throws(() => subdivisionSevenPortReferenceCatalog(currentReferences,
    [{ ...lima, cityId: undefined }]), /canonical id/);
});

test("the reported Cempoala, Angra, and Ozette references have authored migrations", () => {
  assert.equal(SUBDIVISION_SEVEN_TO_EIGHT_PORT_TILE_IDS.get(79421), 317231);
  assert.equal(SUBDIVISION_SEVEN_TO_EIGHT_PORT_TILE_IDS.get(72876), 291080);
  assert.equal(SUBDIVISION_SEVEN_TO_EIGHT_PORT_TILE_IDS.get(46523), 185827);
});

test("released Dienne references follow the corrected river city and remain distinct from Timbuktu", () => {
  assert.equal(SUBDIVISION_SEVEN_TO_EIGHT_PORT_TILE_IDS.get(158826), 162642);
  assert.equal(SUBDIVISION_SEVEN_TO_EIGHT_PORT_TILE_IDS.get(163712), 654806);
});

test("released North Maluku references target the separated subdivision-eight islands", () => {
  assert.equal(SUBDIVISION_SEVEN_TO_EIGHT_PORT_TILE_IDS.get(23005), 366292);
  assert.equal(SUBDIVISION_SEVEN_TO_EIGHT_PORT_TILE_IDS.get(91718), 366350);
  assert.equal(SUBDIVISION_SEVEN_TO_EIGHT_PORT_TILE_IDS.get(91735), 366359);
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

test("orphan recovery repairs escaped old tiles without rewriting current placed cities", () => {
  const orphaned = orphanedSubdivisionSevenPortTileIds(currentPortBake.endpoints);
  assert.equal(orphaned.get(160888), 643413, "old Utrecht must recover to current Utrecht");
  assert.equal(orphaned.has(160923), false, "current York must not be mistaken for old Hull");
  assert.equal(orphaned.has(366350), false, "current Tidore must not be mistaken for old Makian");
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
