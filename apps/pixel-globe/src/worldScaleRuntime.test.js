import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  WORLD_DISCRETE_WEATHER_SUBDIVISIONS,
  WORLD_GLOBE_SUBDIVISIONS,
  WORLD_RUNTIME_WEATHER_SUBDIVISIONS
} from "./worldScale.js";

const source = readFileSync(new URL("./main.js", import.meta.url), "utf8");

function functionSource(name, nextName) {
  const start = source.indexOf(`function ${name}(`);
  const end = source.indexOf(`function ${nextName}(`, start + 1);
  assert.ok(start >= 0, `${name} is missing`);
  assert.ok(end > start, `${name} has no ${nextName} boundary`);
  return source.slice(start, end);
}

test("weather state remains coarse instead of expanding across terrain cells", () => {
  assert.equal(WORLD_GLOBE_SUBDIVISIONS, 8);
  assert.equal(WORLD_DISCRETE_WEATHER_SUBDIVISIONS, 6);
  assert.equal(WORLD_RUNTIME_WEATHER_SUBDIVISIONS, 7);

  const refresh = functionSource("refreshWeatherState", "scheduleWeatherMaskRefresh");
  const scheduled = functionSource("scheduleWeatherMaskRefresh", "advancePendingWeatherMaskRefresh");
  const advance = functionSource("advancePendingWeatherMaskRefresh", "updateSurfaceIceTransition");
  const snow = functionSource("fillSnowGroundMaskForDay", "fitCanvasToDisplay");
  const weatherRuntime = `${refresh}\n${scheduled}\n${advance}\n${snow}`;
  assert.doesNotMatch(weatherRuntime, /graph\.tileCount/);
  assert.doesNotMatch(weatherRuntime, /expandCoarseTileMask|fillWorldIceMaskForDay/);
  assert.match(weatherRuntime, /fillIceMaskForDay/);
  assert.match(weatherRuntime, /fillDiscreteWeatherFlagMask/);
});

test("live quest and ecology placement do not scan every terrain tile", () => {
  const treasure = functionSource("treasureAmbushSpawnPoints", "ensureColonizationDefenseEncounter");
  const whales = functionSource("ensureWhalePopulation", "buildIcebergSpawnCandidates");
  const icebergBoundary = functionSource(
    "fineWaterTilesBorderingClimateTile",
    "currentIcebergSpawnCandidates"
  );
  for (const runtimeSearch of [treasure, whales, icebergBoundary]) {
    assert.doesNotMatch(runtimeSearch, /<\s*graph\.tileCount/);
  }
  assert.match(treasure, /worldTilesWithinArcRadius/);
  assert.match(whales, /WORLD_DISCRETE_WEATHER_SUBDIVISIONS/);
  assert.match(icebergBoundary, /runtimeWeatherTileIdForWorldTile/);
});

test("a weather-day change cancels staged iceberg work that captured the old ice mask", () => {
  const invalidate = functionSource(
    "invalidateIcebergSpawnCandidates",
    "beginIcebergSpawnCandidateRefresh"
  );
  assert.match(invalidate, /icebergAdvanceJob = null/);
});

test("incremental calving work follows the committed ice mask across midnight", () => {
  const lifecycle = functionSource(
    "currentIcebergSpawnCandidates",
    "icebergClearWaterCandidate"
  );
  assert.doesNotMatch(lifecycle, /weatherParts\.dayIndex/);
  assert.match(lifecycle, /maskDayIndex: weatherMaskDayIndex/);
  assert.match(lifecycle, /job\.maskDayIndex !== weatherMaskDayIndex/);
  assert.match(lifecycle, /activeIcebergSpawnCandidatesMaskDay !== weatherMaskDayIndex/);
});

test("world-to-climate maps are reused whenever weather resolutions match", () => {
  const mappingStart = source.indexOf("fineToCoarseWeatherTileId = buildFineToCoarseTileMapping");
  const mappingEnd = source.indexOf("const discreteWeatherTileCount", mappingStart);
  assert.ok(mappingStart >= 0 && mappingEnd > mappingStart);
  const mappingSetup = source.slice(mappingStart, mappingEnd);
  assert.match(
    mappingSetup,
    /WORLD_RUNTIME_WEATHER_SUBDIVISIONS === WORLD_DISCRETE_WEATHER_SUBDIVISIONS/
  );
  assert.match(mappingSetup, /\? fineToCoarseWeatherTileId/);
});
