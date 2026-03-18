/**
 * Regenerate public/earth-globe-cache.json for subdivisions=6 Earth mode.
 * Run from globe-demo: npm run build-earth-globe-cache
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import * as THREE from "three";
import {
  Globe,
  buildTerrainFromEarthRaster,
  parseElevationBin,
  applyCoastalBeach,
  traceRiverThroughTiles,
  getRiverEdgesByTile,
  getEdgeNeighbor,
  pruneThreeWayRiverJunctions,
  connectIsolatedRiverTiles,
  fillRiverGaps,
  forceRiverReciprocity,
  symmetrizeRiverNeighborEdgesUntilStable,
} from "../../../src/index.js";
import { loadEarthBinRasterForCache } from "../earthLandRasterBin.js";
import { EARTH_GLOBE_CACHE_VERSION } from "../earthGlobeCacheVersion.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "..", "public");

const SEA_LEVEL_LAND_ELEVATION = -0.042;
const LAKE_ELEVATION = -0.04;

function latLonDegToDirection(latDeg: number, lonDeg: number): THREE.Vector3 {
  const latRad = (latDeg * Math.PI) / 180;
  const lonRad = (lonDeg * Math.PI) / 180;
  const cosLat = Math.cos(latRad);
  return new THREE.Vector3(
    cosLat * Math.cos(lonRad),
    Math.sin(latRad),
    -cosLat * Math.sin(lonRad)
  ).normalize();
}

interface MountainEntry {
  lat: number;
  lon: number;
  elevationM: number;
}

function loadMountains(): MountainEntry[] | null {
  try {
    const raw = JSON.parse(readFileSync(join(PUBLIC, "mountains.json"), "utf8"));
    if (!Array.isArray(raw)) return null;
    return raw.filter(
      (e: unknown) =>
        e != null &&
        typeof e === "object" &&
        typeof (e as MountainEntry).lat === "number" &&
        typeof (e as MountainEntry).lon === "number" &&
        typeof (e as MountainEntry).elevationM === "number"
    ) as MountainEntry[];
  } catch {
    return null;
  }
}

const RIVER_MAX_SCALERANK = 3;

function loadRiverLines(): { lines: number[][][]; lineIsDelta: boolean[] } {
  const lines: number[][][] = [];
  const lineIsDelta: boolean[] = [];
  const alwaysInclude = /\b(saint\s*lawrence|st\.?\s*lawrence)\b/i;
  try {
    const rivers = JSON.parse(
      readFileSync(join(PUBLIC, "ne_10m_rivers_lake_centerlines.json"), "utf8")
    ) as {
      features?: Array<{
        properties?: { name_en?: string; name?: string; featurecla?: string; scalerank?: number };
        geometry?: { type: string; coordinates: number[][] | number[][][] };
      }>;
    };
    for (const f of rivers.features ?? []) {
      const cla = f.properties?.featurecla ?? "";
      if (cla !== "River" && cla !== "Lake Centerline") continue;
      const name = f.properties?.name_en ?? f.properties?.name ?? "";
      const sr = f.properties?.scalerank;
      const withinScale = sr == null || sr <= RIVER_MAX_SCALERANK;
      if (!withinScale && !alwaysInclude.test(name)) continue;
      const isDelta = /\b(rosetta|damietta)\b/i.test(name);
      const g = f.geometry;
      if (!g?.coordinates) continue;
      if (g.type === "LineString") {
        const c = g.coordinates as number[][];
        if (c.length >= 2) {
          lines.push(c);
          lineIsDelta.push(isDelta);
        }
      } else if (g.type === "MultiLineString") {
        for (const ring of g.coordinates as number[][][]) {
          if (ring.length >= 2) {
            lines.push(ring);
            lineIsDelta.push(isDelta);
          }
        }
      }
    }
  } catch (e) {
    console.warn("rivers load failed", e);
  }
  return { lines, lineIsDelta };
}

function loadKoppen(): Uint8Array | null {
  try {
    const buf = readFileSync(join(PUBLIC, "koppen.bin"));
    if (buf.length !== 360 * 180) return null;
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
  } catch {
    return null;
  }
}

function loadElevation() {
  try {
    const buf = readFileSync(join(PUBLIC, "elevation.bin"));
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    return parseElevationBin(ab);
  } catch {
    return null;
  }
}

async function main() {
  const loaded = loadEarthBinRasterForCache(PUBLIC);
  if (!loaded) {
    console.error(
      "Missing public/earth-region-grid.bin (not in git — large file).\n" +
        "  From examples/globe-demo run:\n" +
        "    npm run download-data && npm run build-land-raster-png\n" +
        "  Or full setup: npm run setup-data"
    );
    process.exit(1);
  }
  const { raster, getRegionScores, getRasterWindow } = loaded;
  const koppen = loadKoppen();
  const elev = loadElevation();
  if (koppen) raster.climate = { width: 360, height: 180, data: koppen };
  if (elev) raster.elevation = elev;

  console.log("Globe subdivisions=6…");
  const globe = new Globe({ radius: 1, subdivisions: 6 });
  console.log("buildTerrainFromEarthRaster…", globe.tileCount, "tiles");
  const tileTerrain = await buildTerrainFromEarthRaster(globe.tiles, raster, {
    waterElevation: -0.18,
    lakeElevation: LAKE_ELEVATION,
    landElevation: SEA_LEVEL_LAND_ELEVATION,
    elevationScale: 0.00004,
    latitudeTerrain: true,
    getRegionScores,
    resolveOptions: {
      useGreedyLandmassPlacement: true,
      getRasterWindow,
      knownStraitTileIds: new Set([40361, 24757, 4129, 25328]),
    },
  });
  applyCoastalBeach(globe.tiles, tileTerrain);

  const mountains = loadMountains();
  const peaks: [number, number][] = [];
  if (mountains?.length) {
    const target = Math.max(24, Math.floor(globe.tileCount / 20));
    const peakMap = new Map<number, number>();
    for (const m of mountains) {
      if (peakMap.size >= target) break;
      const tid = globe.getTileIdAtDirection(latLonDegToDirection(m.lat, m.lon));
      const prev = peakMap.get(tid) ?? 0;
      if (m.elevationM > prev) peakMap.set(tid, m.elevationM);
    }
    for (const [id, m] of peakMap) peaks.push([id, m]);
  }

  const { lines, lineIsDelta } = loadRiverLines();
  const riverEdges: Record<string, number[]> = {};
  const riverEdgeToWater: Record<string, number[]> = {};
  if (lines.length > 0) {
    const segments: ReturnType<typeof traceRiverThroughTiles> = [];
    for (let i = 0; i < lines.length; i++) {
      const segs = traceRiverThroughTiles(globe, lines[i]);
      const isDelta = lineIsDelta[i] ?? false;
      for (const s of segs) segments.push({ ...s, isDelta });
    }
    if (segments.length > 0) {
      const raw = getRiverEdgesByTile(segments, {
        tiles: globe.tiles,
        isWater: (id) => tileTerrain.get(id)?.type === "water",
      });
      const pruned = pruneThreeWayRiverJunctions(raw, globe.tiles, (id) => tileTerrain.get(id)?.type === "water");
      if (pruned > 0) console.log("pruned", pruned, "3-way river junction edges");
      let sym = symmetrizeRiverNeighborEdgesUntilStable(raw, globe.tiles, (id) => tileTerrain.get(id)?.type === "water");
      // Fill gap tiles where river data has low resolution
      const gaps = fillRiverGaps(raw, globe.tiles, (id) => tileTerrain.get(id)?.type === "water");
      if (gaps > 0) console.log("filled", gaps, "river gap tiles");
      sym += symmetrizeRiverNeighborEdgesUntilStable(raw, globe.tiles, (id) => tileTerrain.get(id)?.type === "water");
      const iso = connectIsolatedRiverTiles(raw, globe.tiles, (id) => tileTerrain.get(id)?.type === "water");
      if (iso > 0) console.log("connected", iso, "orphan river tile edges");
      sym += symmetrizeRiverNeighborEdgesUntilStable(raw, globe.tiles, (id) => tileTerrain.get(id)?.type === "water");
      // Force reciprocity: ensure every river edge has a reciprocal edge on the neighbor
      const forced = forceRiverReciprocity(raw, globe.tiles, (id) => tileTerrain.get(id)?.type === "water");
      if (forced > 0) console.log("forced", forced, "reciprocal river edges");
      // Run symmetrize again after forcing reciprocity
      sym += symmetrizeRiverNeighborEdgesUntilStable(raw, globe.tiles, (id) => tileTerrain.get(id)?.type === "water");
      if (sym > 0) console.log("symmetrized", sym, "river neighbor edges");
      const tileById = new Map(globe.tiles.map((t) => [t.id, t]));
      const isWaterNeighbor = (id: number) => {
        const t = tileTerrain.get(id)?.type;
        return t === "water" || t === "beach";
      };
      // Validate and collect
      let brokenCount = 0;
      for (const [tid, set] of raw) {
        const type = tileTerrain.get(tid)?.type;
        if (type === "water" || type === "beach") continue;
        riverEdges[String(tid)] = [...set];
        const tile = tileById.get(tid);
        if (!tile) continue;
        const toWater = new Set<number>();
        for (const e of set) {
          const nid = getEdgeNeighbor(tile, e, globe.tiles);
          if (nid !== undefined && isWaterNeighbor(nid)) toWater.add(e);
        }
        if (toWater.size > 0) riverEdgeToWater[String(tid)] = [...toWater];
        
        // Check for broken edges (non-reciprocal)
        for (const e of set) {
          const nid = getEdgeNeighbor(tile, e, globe.tiles);
          if (nid === undefined) continue;
          const ntype = tileTerrain.get(nid)?.type;
          if (ntype === "water" || ntype === "beach") continue; // pointing to water is OK
          const nset = raw.get(nid);
          if (!nset) {
            console.warn(`BROKEN: tile ${tid} edge ${e} -> neighbor ${nid} NOT in river map`);
            brokenCount++;
            continue;
          }
          const ntile = tileById.get(nid);
          if (!ntile) continue;
          // Find reciprocal edge
          let reciprocal: number | undefined;
          for (let k = 0; k < ntile.vertices.length; k++) {
            if (getEdgeNeighbor(ntile, k, globe.tiles) === tid) {
              reciprocal = k;
              break;
            }
          }
          if (reciprocal === undefined) {
            console.warn(`BROKEN: tile ${tid} edge ${e} -> neighbor ${nid} has no edge back`);
            brokenCount++;
          } else if (!nset.has(reciprocal)) {
            console.warn(`BROKEN: tile ${tid} edge ${e} -> neighbor ${nid} edge ${reciprocal} not in neighbor's river edges [${[...nset].join(",")}]`);
            brokenCount++;
          }
        }
      }
      if (brokenCount > 0) {
        console.log(`Found ${brokenCount} broken river edges`);
      }
    }
  }

  const tiles: Array<{ id: number; t: string; e: number; l?: number }> = [];
  for (let i = 0; i < globe.tileCount; i++) {
    const d = tileTerrain.get(i)!;
    const o: { id: number; t: string; e: number; l?: number } = {
      id: i,
      t: d.type,
      e: d.elevation,
    };
    if (d.lakeId != null) o.l = d.lakeId;
    tiles.push(o);
  }

  const out = {
    version: EARTH_GLOBE_CACHE_VERSION,
    subdivisions: 6,
    tileCount: globe.tileCount,
    tiles,
    peaks,
    riverEdges,
    riverEdgeToWater,
  };
  const outPath = join(PUBLIC, "earth-globe-cache.json");
  writeFileSync(outPath, JSON.stringify(out), "utf8");
  const sz = readFileSync(outPath).length;
  console.log("Wrote", outPath, `(${Math.round(sz / 1024)} KB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
