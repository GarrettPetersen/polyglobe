/**
 * Emit `public/discrete-weather-bake-{n}.bin` from an existing `public/earth-globe-cache-{n}.json`
 * (no full raster / land–water rebuild). Use after updating globe JSON or discrete-bake logic.
 *
 *   npx tsx scripts/bake-discrete-weather-from-globe-cache.ts 7
 *   npx tsx scripts/bake-discrete-weather-from-globe-cache.ts 6 7
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  Globe,
  buildMoistureByTileFromTerrain,
  buildAnnualTileWeatherTables,
  buildDiscreteWeatherYearBake,
  encodeDiscreteWeatherYearBakeFile,
  parseTemperatureMonthlyBin,
  attachMonthlyTemperatureToTerrainFromRaster,
  type TileTerrainData,
} from "../../../src/index.js";
import { dateToSubsolarPoint } from "../astronomy.js";
import {
  EARTH_GLOBE_CACHE_VERSION,
  isEarthGlobeCacheVersionOk,
  MAX_EARTH_GLOBE_SUBDIVISIONS,
} from "../earthGlobeCacheVersion.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "..", "public");

interface CacheRow {
  id: number;
  t: TileTerrainData["type"];
  e: number;
  l?: number;
  h?: 1;
}

interface CacheJson {
  version: string;
  subdivisions: number;
  tileCount: number;
  tiles: CacheRow[];
}

function parseSubdivisionArgs(): number[] {
  const raw = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  if (raw.length === 0) return [7];
  const subs: number[] = [];
  for (const a of raw) {
    const n = parseInt(a, 10);
    if (
      !Number.isFinite(n) ||
      n < 1 ||
      n > MAX_EARTH_GLOBE_SUBDIVISIONS
    ) {
      console.error(
        `Invalid subdivision "${a}". Use 1–${MAX_EARTH_GLOBE_SUBDIVISIONS}.`,
      );
      process.exit(1);
    }
    subs.push(n);
  }
  return subs;
}

function terrainFromCache(j: CacheJson): Map<number, TileTerrainData> {
  const tileTerrain = new Map<number, TileTerrainData>();
  for (const row of j.tiles) {
    tileTerrain.set(row.id, {
      tileId: row.id,
      type: row.t,
      elevation: row.e,
      ...(row.l != null ? { lakeId: row.l } : {}),
      ...(row.h ? { isHilly: true } : {}),
    });
  }
  return tileTerrain;
}

function bakeForSubdivisions(subdivisions: number): void {
  const jsonPath = join(PUBLIC, `earth-globe-cache-${subdivisions}.json`);
  const raw = readFileSync(jsonPath, "utf8");
  const j = JSON.parse(raw) as CacheJson;
  if (!isEarthGlobeCacheVersionOk(j.version, subdivisions)) {
    console.error(
      `Cache version mismatch: file ${j.version}, need ${EARTH_GLOBE_CACHE_VERSION} for subdiv ${subdivisions}.`,
    );
    process.exit(1);
  }
  if (j.subdivisions !== subdivisions || j.tileCount !== j.tiles.length) {
    console.error("Cache subdivisions / tileCount / tiles.length inconsistent.");
    process.exit(1);
  }

  const globe = new Globe({ radius: 1, subdivisions });
  if (globe.tileCount !== j.tileCount) {
    console.error(
      `Globe tileCount ${globe.tileCount} !== cache tileCount ${j.tileCount}`,
    );
    process.exit(1);
  }

  const tileTerrain = terrainFromCache(j);

  try {
    const tpath = join(PUBLIC, "tavg_monthly.bin");
    const traw = readFileSync(tpath);
    const tab = traw.buffer.slice(
      traw.byteOffset,
      traw.byteOffset + traw.byteLength,
    );
    const layer = parseTemperatureMonthlyBin(tab);
    if (layer) {
      attachMonthlyTemperatureToTerrainFromRaster(
        globe.tiles,
        tileTerrain,
        layer,
      );
      console.log("Attached tavg_monthly.bin");
    }
  } catch {
    // optional
  }

  const moisture = buildMoistureByTileFromTerrain(tileTerrain);
  const getSub = (utcMin: number) =>
    dateToSubsolarPoint(new Date(utcMin * 60000)).latDeg;
  const annual = buildAnnualTileWeatherTables(globe, moisture, getSub, {
    baseStrength: 1,
    noiseDirectionRad: 0.12,
    noiseStrength: 0.08,
    seed: 45678,
    getTerrain: (id) => {
      const t = tileTerrain.get(id);
      if (!t) return undefined;
      const isWater = t.type === "water" || t.type === "beach";
      return { isWater, elevation: t.elevation };
    },
  });
  const waterTileIds = new Set<number>();
  for (const [id, t] of tileTerrain) {
    if (t.type === "water") waterTileIds.add(id);
  }
  console.log(
    `buildDiscreteWeatherYearBake… ${globe.tileCount} tiles × 365 days`,
  );
  const bake = buildDiscreteWeatherYearBake(
    globe,
    annual,
    waterTileIds,
    getSub,
    {
      getTerrainTypeForTile: (id) => tileTerrain.get(id)?.type,
      getMonthlyMeanTempCForTile: (id) =>
        tileTerrain.get(id)?.monthlyMeanTempC,
    },
  );
  const bin = encodeDiscreteWeatherYearBakeFile(
    bake,
    j.version,
    subdivisions,
  );
  const outPath = join(PUBLIC, `discrete-weather-bake-${subdivisions}.bin`);
  writeFileSync(outPath, bin);
  console.log(
    "Wrote",
    outPath,
    `(${Math.round(bin.byteLength / 1024 / 1024)} MiB, cache ${j.version})`,
  );
}

function main(): void {
  const list = parseSubdivisionArgs();
  console.log("Discrete weather bake from earth-globe-cache JSON:", list.join(", "));
  for (const sub of list) {
    bakeForSubdivisions(sub);
  }
}

main();
