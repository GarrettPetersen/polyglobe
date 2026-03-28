import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import * as THREE from "three";
import { Globe, type TileTerrainData } from "../../../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "..", "public");
const INPUT_CSV = join(
  PUBLIC,
  "datasets",
  "urbanization-reba-2016",
  "urbanization-merged.csv",
);
const CANADA_OVERRIDE_CSV = join(
  PUBLIC,
  "datasets",
  "urbanization-overrides-canada",
  "canada-ports-override.csv",
);
const OUTPUT_DIR = join(PUBLIC, "datasets", "urbanization-dominance-pruned");
const OUTPUT_CSV = join(OUTPUT_DIR, "urbanization-dominance-pruned.csv");
const OUTPUT_README = join(OUTPUT_DIR, "README.md");
const DEFAULT_SUBDIVISIONS = 7;
const DOMINANCE_MAX_RINGS = 6;
const DOMINANCE_MIN_RINGS = 1;
const ISOLATION_KEEP_RINGS = 4;
const COASTAL_PORT_KEEP_RINGS = 10;

type CsvRow = {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  year: number;
  population: number;
  source: string;
};

type CitySeries = {
  id: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  yearlyPopulation: Array<{ year: number; population: number }>;
};

type Candidate = {
  id: string;
  city: string;
  population: number;
  tileId: number;
  originalTileId: number;
  landmassId?: number;
};

function parseReasonableYear(raw: string): number | null {
  const y = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(y)) return null;
  if (Math.abs(y) <= 5000) return y;
  const ay = Math.abs(y);
  if (ay >= 10000101 && ay <= 99991231) {
    const yyyy = Math.floor(ay / 10000);
    const signed = y < 0 ? -yyyy : yyyy;
    if (Math.abs(signed) <= 5000) return signed;
  }
  return null;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let i = 0;
  let inQuotes = false;
  while (i < text.length) {
    const ch = text[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    if (ch === "\r") {
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function csvEscape(v: string | number): string {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function normalizeToken(s: string): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cityKey(city: string, country: string): string {
  return `${normalizeToken(city)}|${normalizeToken(country)}`;
}

function latLonDegToDirection(latDeg: number, lonDeg: number): THREE.Vector3 {
  const latRad = (latDeg * Math.PI) / 180;
  const lonRad = (lonDeg * Math.PI) / 180;
  const cosLat = Math.cos(latRad);
  return new THREE.Vector3(
    cosLat * Math.cos(lonRad),
    Math.sin(latRad),
    -cosLat * Math.sin(lonRad),
  ).normalize();
}

function interpolatePopulationAtYear(
  ys: Array<{ year: number; population: number }>,
  year: number,
): number {
  if (ys.length === 0) return 0;
  if (year < ys[0]!.year) return 0;
  if (year === ys[0]!.year) return ys[0]!.population;
  if (year >= ys[ys.length - 1]!.year) return ys[ys.length - 1]!.population;
  for (let i = 0; i < ys.length - 1; i++) {
    const a = ys[i]!;
    const b = ys[i + 1]!;
    if (year === a.year) return a.population;
    if (year === b.year) return b.population;
    if (year > a.year && year < b.year) {
      const t = (year - a.year) / (b.year - a.year);
      return a.population + (b.population - a.population) * t;
    }
  }
  return 0;
}

function isBuildableLandType(type: string | undefined): boolean {
  if (!type) return false;
  return type !== "water" && type !== "beach" && type !== "ice";
}

function areOnDifferentKnownLandmasses(
  a: number | undefined,
  b: number | undefined,
): boolean {
  return a != null && b != null && a !== b;
}

function canDominanceCompareLandmass(
  a: number | undefined,
  b: number | undefined,
): boolean {
  if (a == null || b == null) return true;
  return a === b;
}

function collectSameOrNeighborTileIds(globe: Globe, tileId: number): number[] {
  const out = [tileId];
  const tile = globe.getTile(tileId);
  if (!tile) return out;
  for (const n of tile.neighbors) out.push(n);
  return out;
}

function dominanceInfluenceRings(population: number): number {
  const raw = 0.8 + 1.25 * Math.log10(Math.max(1, population));
  return Math.max(
    DOMINANCE_MIN_RINGS,
    Math.min(DOMINANCE_MAX_RINGS, Math.round(raw)),
  );
}

function dominanceRatioThreshold(distance: number, radius: number): number {
  const t = Math.max(0, Math.min(1, distance / Math.max(1, radius)));
  return 0.35 + (0.15 - 0.35) * t;
}

function findNearestBuildableTileId(
  globe: Globe,
  startTileId: number,
  terrain: Map<number, TileTerrainData>,
  desiredLandmassId?: number,
): number {
  const startTerrain = terrain.get(startTileId);
  if (
    isBuildableLandType(startTerrain?.type) &&
    (desiredLandmassId == null || startTerrain?.landmassId === desiredLandmassId)
  ) {
    return startTileId;
  }
  const q: number[] = [startTileId];
  const seen = new Set<number>([startTileId]);
  let bestAnyBuildable: number | null = null;
  let qi = 0;
  while (qi < q.length) {
    const id = q[qi++]!;
    const tile = globe.getTile(id);
    if (!tile) continue;
    for (const nId of tile.neighbors) {
      if (seen.has(nId)) continue;
      seen.add(nId);
      const nTerrain = terrain.get(nId);
      if (isBuildableLandType(nTerrain?.type)) {
        if (bestAnyBuildable == null) bestAnyBuildable = nId;
        if (desiredLandmassId == null || nTerrain?.landmassId === desiredLandmassId) {
          return nId;
        }
      }
      q.push(nId);
    }
    if (q.length > 1500) break;
  }
  return bestAnyBuildable ?? startTileId;
}

function resolveCrossLandmassAdjacencyConflicts(
  candidates: Candidate[],
  globe: Globe,
  tileTerrain: Map<number, TileTerrainData>,
): Candidate[] {
  const sorted = [...candidates].sort((a, b) => b.population - a.population);
  const accepted: Candidate[] = [];
  const acceptedByTile = new Map<number, Candidate[]>();
  const excluded: Candidate[] = [];
  const hasConflict = (tileId: number, landmassId?: number): boolean => {
    const local = collectSameOrNeighborTileIds(globe, tileId);
    for (const tid of local) {
      const onTile = acceptedByTile.get(tid);
      if (!onTile) continue;
      for (const c of onTile) {
        if (areOnDifferentKnownLandmasses(landmassId, c.landmassId)) return true;
      }
    }
    return false;
  };
  const accept = (c: Candidate, tileId: number): void => {
    c.tileId = tileId;
    accepted.push(c);
    let arr = acceptedByTile.get(tileId);
    if (!arr) {
      arr = [];
      acceptedByTile.set(tileId, arr);
    }
    arr.push(c);
  };
  for (const c of sorted) {
    if (hasConflict(c.tileId, c.landmassId)) excluded.push(c);
    else accept(c, c.tileId);
  }
  for (const c of excluded) {
    if (c.landmassId == null) continue;
    let bestTileId: number | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const tid of collectSameOrNeighborTileIds(globe, c.originalTileId)) {
      const t = tileTerrain.get(tid);
      if (!isBuildableLandType(t?.type)) continue;
      if (t?.landmassId !== c.landmassId) continue;
      if (hasConflict(tid, c.landmassId)) continue;
      const hasSameTileCity = (acceptedByTile.get(tid)?.length ?? 0) > 0;
      const score =
        (tid === c.originalTileId ? 0 : 1) + (hasSameTileCity ? -0.25 : 0);
      if (score < bestScore) {
        bestScore = score;
        bestTileId = tid;
      }
    }
    if (bestTileId != null) accept(c, bestTileId);
  }
  return accepted;
}

function parseSubdivisionArg(): number {
  const raw = process.argv.slice(2).find((a) => /^\d+$/.test(a));
  if (!raw) return DEFAULT_SUBDIVISIONS;
  const n = Number.parseInt(raw, 10);
  return Number.isInteger(n) && n > 0 ? n : DEFAULT_SUBDIVISIONS;
}

function loadOptionalOverrideRows(path: string): CsvRow[] {
  try {
    if (!readFileSync(path, "utf8")) return [];
  } catch {
    return [];
  }
  const text = readFileSync(path, "utf8");
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const h = rows[0]!;
  const idxCity = h.indexOf("city");
  const idxCountry = h.indexOf("country");
  const idxLat = h.indexOf("latitude");
  const idxLon = h.indexOf("longitude");
  const idxYear = h.indexOf("year");
  const idxPop = h.indexOf("population");
  const idxSource = h.indexOf("source");
  if (
    idxCity < 0 ||
    idxCountry < 0 ||
    idxLat < 0 ||
    idxLon < 0 ||
    idxYear < 0 ||
    idxPop < 0
  ) {
    return [];
  }
  const out: CsvRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]!;
    const city = r[idxCity] ?? "";
    const country = r[idxCountry] ?? "";
    const latitude = Number.parseFloat(r[idxLat] ?? "");
    const longitude = Number.parseFloat(r[idxLon] ?? "");
    const year = parseReasonableYear(r[idxYear] ?? "");
    const population = Number.parseFloat(r[idxPop] ?? "");
    const source = idxSource >= 0 ? (r[idxSource] ?? "") : "manual_override";
    if (!city || !country) continue;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    if (year == null || !Number.isFinite(population) || population <= 0) continue;
    out.push({ city, country, latitude, longitude, year, population, source });
  }
  return out;
}

function main(): void {
  const subdivisions = parseSubdivisionArg();
  const cachePath = join(PUBLIC, `earth-globe-cache-${subdivisions}.json`);
  const cache = JSON.parse(readFileSync(cachePath, "utf8")) as {
    tileCount: number;
    tiles: Array<{ id: number; t: string; m?: number }>;
  };
  const globe = new Globe({ radius: 1, subdivisions });
  if (cache.tileCount !== globe.tileCount) {
    throw new Error(
      `Tile count mismatch: cache=${cache.tileCount}, globe=${globe.tileCount} for subdivisions=${subdivisions}`,
    );
  }
  const tileTerrain = new Map<number, TileTerrainData>();
  for (const row of cache.tiles) {
    tileTerrain.set(row.id, {
      tileId: row.id,
      type: row.t as TileTerrainData["type"],
      elevation: 0,
      landmassId: row.m,
    });
  }

  const rows = parseCsv(readFileSync(INPUT_CSV, "utf8"));
  if (rows.length < 2) throw new Error("Input urbanization CSV is empty");
  const h = rows[0]!;
  const idxCity = h.indexOf("city");
  const idxCountry = h.indexOf("country");
  const idxLat = h.indexOf("latitude");
  const idxLon = h.indexOf("longitude");
  const idxYear = h.indexOf("year");
  const idxPop = h.indexOf("population");
  const idxSource = h.indexOf("source");
  if (
    idxCity < 0 ||
    idxCountry < 0 ||
    idxLat < 0 ||
    idxLon < 0 ||
    idxYear < 0 ||
    idxPop < 0
  ) {
    throw new Error(
      "Input CSV missing required columns: city,country,latitude,longitude,year,population",
    );
  }
  const allRows: CsvRow[] = [];
  let minYear = Number.POSITIVE_INFINITY;
  let maxYear = Number.NEGATIVE_INFINITY;
  let ignoredUnreasonableYears = 0;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]!;
    const city = r[idxCity] ?? "";
    const country = r[idxCountry] ?? "";
    const latitude = Number.parseFloat(r[idxLat] ?? "");
    const longitude = Number.parseFloat(r[idxLon] ?? "");
    const year = parseReasonableYear(r[idxYear] ?? "");
    const population = Number.parseFloat(r[idxPop] ?? "");
    const source = idxSource >= 0 ? (r[idxSource] ?? "") : "";
    if (!city || !country) continue;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    if (year == null) {
      ignoredUnreasonableYears++;
      continue;
    }
    if (!Number.isFinite(population) || population <= 0) continue;
    allRows.push({ city, country, latitude, longitude, year, population, source });
    if (year < minYear) minYear = year;
    if (year > maxYear) maxYear = year;
  }
  const canadaOverrideRows = loadOptionalOverrideRows(CANADA_OVERRIDE_CSV);
  if (canadaOverrideRows.length > 0) {
    for (const r of canadaOverrideRows) {
      allRows.push(r);
      if (r.year < minYear) minYear = r.year;
      if (r.year > maxYear) maxYear = r.year;
    }
    console.log("[urbanization-prune] merged manual Canada override rows", {
      rows: canadaOverrideRows.length,
      path: CANADA_OVERRIDE_CSV,
    });
  }
  const cityMap = new Map<string, CitySeries>();
  for (const r of allRows) {
    const id = cityKey(r.city, r.country);
    let s = cityMap.get(id);
    if (!s) {
      s = {
        id,
        city: r.city,
        country: r.country,
        lat: r.latitude,
        lon: r.longitude,
        yearlyPopulation: [],
      };
      cityMap.set(id, s);
    }
    s.yearlyPopulation.push({ year: r.year, population: r.population });
  }
  const series = [...cityMap.values()];
  for (const s of series) {
    s.yearlyPopulation.sort((a, b) => a.year - b.year);
    const deduped: Array<{ year: number; population: number }> = [];
    for (const yp of s.yearlyPopulation) {
      const prev = deduped[deduped.length - 1];
      if (prev && prev.year === yp.year) {
        if (yp.population > prev.population) prev.population = yp.population;
      } else {
        deduped.push({ year: yp.year, population: yp.population });
      }
    }
    s.yearlyPopulation = deduped;
  }

  const mappedByCityId = new Map<
    string,
    { tileId: number; originalTileId: number; landmassId?: number }
  >();
  for (const s of series) {
    const dir = latLonDegToDirection(s.lat, s.lon);
    const rawTileId = globe.getTileIdAtDirection(dir);
    const desiredLandmassId = tileTerrain.get(rawTileId)?.landmassId;
    const tileId = findNearestBuildableTileId(
      globe,
      rawTileId,
      tileTerrain,
      desiredLandmassId,
    );
    mappedByCityId.set(s.id, {
      tileId,
      originalTileId: tileId,
      landmassId: desiredLandmassId,
    });
  }

  const neighborhoodCache = new Map<number, Map<number, number>>();
  const coastalTileCache = new Map<number, boolean>();
  const getNeighborhood = (tileId: number): Map<number, number> => {
    const cached = neighborhoodCache.get(tileId);
    if (cached) return cached;
    const out = new Map<number, number>();
    out.set(tileId, 0);
    const q: Array<{ id: number; d: number }> = [{ id: tileId, d: 0 }];
    let qi = 0;
    while (qi < q.length) {
      const cur = q[qi++]!;
      if (cur.d >= DOMINANCE_MAX_RINGS) continue;
      const tile = globe.getTile(cur.id);
      if (!tile) continue;
      for (const nid of tile.neighbors) {
        if (out.has(nid)) continue;
        const nd = cur.d + 1;
        out.set(nid, nd);
        q.push({ id: nid, d: nd });
      }
    }
    neighborhoodCache.set(tileId, out);
    return out;
  };
  const isCoastalTile = (tileId: number): boolean => {
    const cached = coastalTileCache.get(tileId);
    if (cached != null) return cached;
    const tile = globe.getTile(tileId);
    if (!tile) return false;
    let coastal = false;
    for (const nid of tile.neighbors) {
      const t = tileTerrain.get(nid)?.type;
      if (t === "water" || t === "beach") {
        coastal = true;
        break;
      }
    }
    coastalTileCache.set(tileId, coastal);
    return coastal;
  };

  let prevIncluded = new Set<string>();
  const firstIncludedYearByCity = new Map<string, number>();
  let lastYearSelectedCount = 0;

  for (let year = minYear; year <= maxYear; year++) {
    const activeCandidates: Candidate[] = [];
    for (const s of series) {
      const p = interpolatePopulationAtYear(s.yearlyPopulation, year);
      if (!(p > 0)) continue;
      const mapped = mappedByCityId.get(s.id);
      if (!mapped) continue;
      activeCandidates.push({
        id: s.id,
        city: s.city,
        population: p,
        tileId: mapped.tileId,
        originalTileId: mapped.originalTileId,
        landmassId: mapped.landmassId,
      });
    }
    const accepted = resolveCrossLandmassAdjacencyConflicts(
      activeCandidates,
      globe,
      tileTerrain,
    );
    const acceptedById = new Map<string, Candidate>();
    for (const c of accepted) acceptedById.set(c.id, c);
    const selected: Candidate[] = [];
    const selectedIds = new Set<string>();
    const selectedByTile = new Map<number, Candidate[]>();
    const addSelected = (c: Candidate): void => {
      selected.push(c);
      selectedIds.add(c.id);
      let arr = selectedByTile.get(c.tileId);
      if (!arr) {
        arr = [];
        selectedByTile.set(c.tileId, arr);
      }
      arr.push(c);
    };
    for (const id of prevIncluded) {
      const c = acceptedById.get(id);
      if (!c) continue;
      addSelected(c);
    }
    const remaining = accepted
      .filter((c) => !selectedIds.has(c.id))
      .sort((a, b) => b.population - a.population);
    for (const c of remaining) {
      let dominated = false;
      const near = getNeighborhood(c.tileId);
      for (const [tid, d] of near) {
        const keepers = selectedByTile.get(tid);
        if (!keepers) continue;
        for (const k of keepers) {
          if (!canDominanceCompareLandmass(c.landmassId, k.landmassId)) continue;
          const radius = dominanceInfluenceRings(k.population);
          if (d > radius) continue;
          const ratio = c.population / Math.max(1, k.population);
          if (ratio < dominanceRatioThreshold(d, radius)) {
            dominated = true;
            break;
          }
        }
        if (dominated) break;
      }
      if (dominated) {
        let nearKept = false;
        for (const [tid, d] of near) {
          if (d > ISOLATION_KEEP_RINGS) continue;
          const keepers = selectedByTile.get(tid);
          if (!keepers) continue;
          for (const k of keepers) {
            if (!canDominanceCompareLandmass(c.landmassId, k.landmassId)) continue;
            nearKept = true;
            break;
          }
          if (nearKept) break;
        }
        if (!nearKept) dominated = false;
      }
      if (dominated && isCoastalTile(c.tileId)) {
        let hasNearbySelectedCoastal = false;
        for (const [tid, d] of near) {
          if (d > COASTAL_PORT_KEEP_RINGS) continue;
          const keepers = selectedByTile.get(tid);
          if (!keepers) continue;
          for (const k of keepers) {
            if (!canDominanceCompareLandmass(c.landmassId, k.landmassId)) continue;
            if (!isCoastalTile(k.tileId)) continue;
            hasNearbySelectedCoastal = true;
            break;
          }
          if (hasNearbySelectedCoastal) break;
        }
        if (!hasNearbySelectedCoastal) dominated = false;
      }
      if (!dominated) addSelected(c);
    }
    for (const id of selectedIds) {
      if (!firstIncludedYearByCity.has(id)) firstIncludedYearByCity.set(id, year);
    }
    prevIncluded = selectedIds;
    lastYearSelectedCount = selectedIds.size;
    if (year % 100 === 0 || year === minYear || year === maxYear) {
      console.log("[urbanization-prune] year progress", {
        year,
        activeCandidates: activeCandidates.length,
        acceptedCrossLandmass: accepted.length,
        selected: selectedIds.size,
      });
    }
  }

  const outRows = allRows.filter((r) => {
    const id = cityKey(r.city, r.country);
    const first = firstIncludedYearByCity.get(id);
    if (first == null) return false;
    return r.population > 0 && r.year >= first;
  });
  outRows.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    if (a.country !== b.country) return a.country.localeCompare(b.country);
    return a.city.localeCompare(b.city);
  });

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const lines = [
    "city,country,latitude,longitude,year,population,source",
    ...outRows.map((r) =>
      [
        csvEscape(r.city),
        csvEscape(r.country),
        csvEscape(r.latitude),
        csvEscape(r.longitude),
        csvEscape(r.year),
        csvEscape(r.population),
        csvEscape(r.source),
      ].join(","),
    ),
  ];
  writeFileSync(OUTPUT_CSV, `${lines.join("\n")}\n`, "utf8");
  const readme = [
    "# Dominance-Pruned Urbanization Dataset",
    "",
    "- Source: `datasets/urbanization-reba-2016/urbanization-merged.csv`",
    `- Tile map: \`earth-globe-cache-${subdivisions}.json\` landmass IDs`,
    "- Method: year-by-year city selection with carry-forward inclusion and local dominance pruning.",
    "",
    "Generated by `npm run build-urbanization-dominance-pruned`.",
    "",
  ].join("\n");
  writeFileSync(OUTPUT_README, readme, "utf8");

  console.log("[urbanization-prune] wrote dataset", {
    output: OUTPUT_CSV,
    sourceRows: allRows.length,
    outputRows: outRows.length,
    citySeriesInput: series.length,
    citySeriesOutput: new Set(outRows.map((r) => cityKey(r.city, r.country))).size,
    firstYear: minYear,
    lastYear: maxYear,
    lastYearSelectedCount,
    ignoredUnreasonableYears,
  });
}

main();
