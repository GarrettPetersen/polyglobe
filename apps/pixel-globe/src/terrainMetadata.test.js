import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { applyManualTerrainOverrides } from "./manualTerrainOverrides.js";
import {
  KNOWN_TERRAIN_KINDS,
  TERRAIN_RENDER_FAMILY,
  TERRAIN_TRAIT,
  assertKnownTerrainKind,
  terrainHasTrait,
  terrainRenderFamily,
  terrainRoadPenalty
} from "./terrainMetadata.js";

const repoRoot = new URL("../../../", import.meta.url);

test("the terrain catalog explicitly covers every terrain in the production world", () => {
  const earth = JSON.parse(readFileSync(
    new URL("examples/globe-demo/public/earth-globe-cache-7.json", repoRoot),
    "utf8"
  ));
  const rows = applyManualTerrainOverrides(earth.tiles, 7);
  const worldKinds = new Set(rows.map((row) => row.t));

  for (const kind of worldKinds) assert.equal(assertKnownTerrainKind(kind), kind);
  assert.ok(worldKinds.size > 25);
  assert.ok(KNOWN_TERRAIN_KINDS.length >= worldKinds.size);
});

test("terrain behavior is exact metadata rather than a substring convention", () => {
  assert.equal(terrainHasTrait("humid_subtropical", TERRAIN_TRAIT.FOREST), true);
  assert.equal(terrainHasTrait("tropical_savanna", TERRAIN_TRAIT.SAVANNA), true);
  assert.equal(terrainHasTrait("cold_desert", TERRAIN_TRAIT.DESERT), true);
  assert.equal(terrainRenderFamily("subarctic_dry_winter"), TERRAIN_RENDER_FAMILY.CONIFER);
  assert.ok(terrainRoadPenalty("tropical_rainforest") > terrainRoadPenalty("hot_desert"));
  assert.throws(() => terrainHasTrait("humid_subtropical_typo", TERRAIN_TRAIT.HUMID));
  assert.throws(() => terrainHasTrait("forest-fire", TERRAIN_TRAIT.FOREST));
  assert.throws(() => terrainHasTrait("forest", "wooded-ish"));
});

test("domain behavior does not regress to inferring metadata from identifier fragments", () => {
  const checks = [
    ["animalEncounters.js", /\bterrain\.(?:includes|startsWith|endsWith)\(/],
    ["beaverEcology.js", /\bterrain\.(?:includes|startsWith|endsWith)\(/],
    ["chartRepairHeatHaze.js", /\bterrain(?:Kind)?\.(?:includes|startsWith|endsWith)\(/],
    ["main.js", /\bterrain\.(?:includes|startsWith|endsWith)\(/],
    ["roadTerrain.js", /\bterrain\.(?:includes|startsWith|endsWith)\(/],
    ["shoreScavenge.js", /\bterrain\.(?:includes|startsWith|endsWith)\(/],
    ["historicalBattle.js", /squadronValue\.id\.(?:includes|startsWith|endsWith)\(/],
    ["campaignGoals.js", /session\.phase\.(?:includes|startsWith|endsWith)\(/],
    ["passengerMissions.js", /scenarioId\.(?:includes|startsWith|endsWith)\(/],
    ["voyageHistory.js", /record\.outcome\.(?:includes|startsWith|endsWith)\(/]
  ];

  for (const [file, pattern] of checks) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.doesNotMatch(source, pattern, file);
  }
});
