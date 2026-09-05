import assert from "node:assert/strict";
import test from "node:test";
import { cityCatalogBundleSource } from "../tools/cityCatalogBundle.mjs";
import { validateCatalogReleaseHashes, validateReleasedCatalogMigration, verifyCityCatalogRelease } from "../tools/cityCatalogRelease.mjs";

test("the committed city catalog is a complete validated release", async () => {
  const snapshot = await verifyCityCatalogRelease();
  assert.ok(snapshot.ports.length > 300);
});

test("catalog validation rejects changed inputs, missing producers and stale generated files", () => {
  const manifest = { format: "pixel-globe-city-catalog-release", version: 1,
    inputs: { "city-policy.js": "original", "earth.json": "original" },
    artifacts: { "roads.json": "original", "sailing.json": "original", "scenes.json": "original" } };
  assert.doesNotThrow(() => validateCatalogReleaseHashes(manifest, structuredClone(manifest)));
  for (const kind of ["inputs", "artifacts"]) {
    for (const key of Object.keys(manifest[kind])) {
      for (const mutation of ["change", "remove"]) {
        const changed = structuredClone(manifest);
        if (mutation === "remove") delete changed[kind][key];
        else changed[kind][key] = "stale";
        assert.throws(() => validateCatalogReleaseHashes(manifest, changed), /catalog:update/);
      }
    }
  }
  const newDependency = structuredClone(manifest);
  newDependency.inputs["new-geography-policy.js"] = "new";
  assert.throws(() => validateCatalogReleaseHashes(manifest, newDependency), /new-geography-policy/);
});

test("catalog relocations require a version bump and a migration preserving canonical identity", () => {
  const previous = { version: 4, subdivisions: 8, ports: [{ cityId: "dienne|senegal", tileId: 100 }] };
  const moved = { ...previous, ports: [{ cityId: "dienne|senegal", tileId: 200 }] };
  assert.throws(() => validateReleasedCatalogMigration(previous, moved, new Map([[100, 200]])), /PORT_CATALOG_VERSION/);
  moved.version = 5;
  assert.throws(() => validateReleasedCatalogMigration(previous, moved, null), /Missing catalog migration/);
  assert.doesNotThrow(() => validateReleasedCatalogMigration(previous, moved, new Map([[100, 200]])));
  assert.throws(() => validateReleasedCatalogMigration(previous, { ...moved, ports: [] }, null), /no canonical successor/);
  assert.throws(() => validateReleasedCatalogMigration(previous, { ...moved, ports: [...moved.ports, ...moved.ports] }, null), /duplicate canonical/);
  const gateway = { ...moved, ports: [{ cityId: "gateway|senegal", tileId: 200 }] };
  assert.doesNotThrow(() => validateReleasedCatalogMigration(previous, gateway, new Map([[100, 200]]), () => "gateway|senegal"));
});

test("a cached game bundle keeps its own catalog generation without fetching a later deployment", async () => {
  const original = { csv: "city,lat,lon\nDienne,15,-16\n", roads: { cities: [{ name: "Dienne", tileId: 100 }] },
    sailing: { endpoints: [{ name: "Dienne", tileId: 100 }] }, scenes: { cities: [{ id: "dienne|senegal", tileId: 100 }] } };
  const next = structuredClone(original);
  next.roads.cities[0] = { name: "Djenne", tileId: 200 };
  const oldBundle = await import(`data:text/javascript;base64,${Buffer.from(cityCatalogBundleSource(original)).toString("base64")}`);
  const newBundle = await import(`data:text/javascript;base64,${Buffer.from(cityCatalogBundleSource(next)).toString("base64")}`);
  assert.deepEqual(await oldBundle.loadLandRoadData(), original.roads);
  assert.deepEqual(await newBundle.loadLandRoadData(), next.roads);
  assert.equal(await oldBundle.loadCityCatalogCsv(), original.csv);
  assert.deepEqual(await oldBundle.loadSailingDistanceData(), original.sailing);
  assert.deepEqual(await oldBundle.loadCitySceneCatalog(), original.scenes);
  const changed = await oldBundle.loadLandRoadData();
  changed.cities.length = 0;
  assert.deepEqual(await oldBundle.loadLandRoadData(), original.roads, "runtime mutation must not modify the bundled source");
});
