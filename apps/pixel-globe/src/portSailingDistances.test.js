import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { COLONIZATION_TARGETS } from "./colonialCities.js";
import {
  PORT_SAILING_DISTANCE_FORMAT,
  PORT_SAILING_DISTANCE_VERSION,
  assertPortSailingDistanceCoverage,
  parsePortSailingDistances,
  portSailingDistanceKm
} from "./portSailingDistances.js";

const appRoot = new URL("../", import.meta.url);

test("port sailing distance bakes are strict, symmetric, and support unreachable routes", () => {
  const bake = parsePortSailingDistances({
    format: PORT_SAILING_DISTANCE_FORMAT,
    version: PORT_SAILING_DISTANCE_VERSION,
    subdivisions: 7,
    earthCacheVersion: "test-earth",
    endpoints: [
      { tileId: 10, name: "Alpha", country: "A", kind: "port" },
      { tileId: 20, name: "Beta", country: "B", kind: "colony" }
    ],
    distancesKm: [[0, null], [null, 0]]
  }, { subdivisions: 7, earthCacheVersion: "test-earth" });

  assert.equal(portSailingDistanceKm(bake, { tileId: 10 }, 20), null);
  assert.doesNotThrow(() => assertPortSailingDistanceCoverage(bake, [{ tileId: 10 }, { tileId: 20 }]));
  assert.throws(() => portSailingDistanceKm(bake, 10, 30), /no destination tile 30/);
  assert.throws(
    () => parsePortSailingDistances({
      format: PORT_SAILING_DISTANCE_FORMAT,
      version: PORT_SAILING_DISTANCE_VERSION,
      subdivisions: 7,
      earthCacheVersion: "test-earth",
      endpoints: [
        { tileId: 10, name: "Alpha", country: "A", kind: "port" },
        { tileId: 20, name: "Beta", country: "B", kind: "port" }
      ],
      distancesKm: [[0, 12], [11, 0]]
    }),
    /asymmetric/
  );
});

test("the checked-in bake covers colony sites and uses navigable sailing distances", async () => {
  const raw = JSON.parse(await readFile(
    new URL("public/assets/data/port-sailing-distances.json", appRoot),
    "utf8"
  ));
  const bake = parsePortSailingDistances(raw, { subdivisions: 7 });
  const colonyNames = new Set(bake.endpoints.filter((endpoint) => endpoint.kind === "colony").map((endpoint) => endpoint.name));
  const expectedColonyNames = COLONIZATION_TARGETS
    .filter((target) => target.waterAccess !== "inland")
    .map((target) => target.city);
  for (const name of expectedColonyNames) assert.equal(colonyNames.has(name), true, `${name} must be baked`);

  const istanbul = requiredEndpoint(bake, "Istanbul");
  const cairo = requiredEndpoint(bake, "Cairo");
  const wuhan = requiredEndpoint(bake, "Wuhan");
  const kholmogory = requiredEndpoint(bake, "Kholmogory");
  const salerno = requiredEndpoint(bake, "Salerno");
  assert.ok(portSailingDistanceKm(bake, istanbul, wuhan) > portSailingDistanceKm(bake, istanbul, cairo) * 10);
  assert.ok(portSailingDistanceKm(bake, kholmogory, salerno) > 0);
  assert.equal(
    bake.distancesKm.some((row) => row.some((distance) => distance === null)),
    false,
    "all current ports and colony sites should share the open-water sailing network"
  );
});

function requiredEndpoint(bake, name) {
  const endpoint = bake.endpoints.find((candidate) => candidate.name === name);
  if (!endpoint) throw new Error(`Missing checked-in sailing endpoint: ${name}`);
  return endpoint;
}
