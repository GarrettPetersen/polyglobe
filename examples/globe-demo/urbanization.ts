export interface UrbanCitySeries {
  id: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  yearlyPopulation: Array<{ year: number; population: number }>;
}

export interface UrbanDataset {
  cities: UrbanCitySeries[];
  minPopulationPositive: number;
  maxPopulationModern: number;
}

export interface UrbanCityAtYear {
  id: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  population: number;
}

interface ParsedUrbanRow {
  city: string;
  country: string;
  lat: number;
  lon: number;
  year: number;
  population: number;
}

const DEFAULT_DOMINANCE_PREBAKED_URL =
  "/datasets/urbanization-dominance-pruned/urbanization-dominance-pruned.csv";
const LOW_PERCENTILE_PRUNE = 0.1;
const LOW_PERCENTILE_MAX_POP_CAP = 120_000;
const LOW_PERCENTILE_MIN_OBSERVATIONS = 3;

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

async function tryLoadRowsFromCsv(
  url: string,
  sourceName: string,
): Promise<ParsedUrbanRow[]> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to load ${sourceName} urbanization dataset (${url}): ${res.status}`,
    );
  }
  const text = await res.text();
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error(`${sourceName} dataset is empty`);
  const header = rows[0]!;
  const idxCity = header.indexOf("city");
  const idxCountry = header.indexOf("country");
  const idxLat = header.indexOf("latitude");
  const idxLon = header.indexOf("longitude");
  const idxYear = header.indexOf("year");
  const idxPop = header.indexOf("population");
  if (
    idxCity < 0 ||
    idxCountry < 0 ||
    idxLat < 0 ||
    idxLon < 0 ||
    idxYear < 0 ||
    idxPop < 0
  ) {
    throw new Error(
      `${sourceName} dataset missing required columns (city,country,latitude,longitude,year,population)`,
    );
  }
  const out: ParsedUrbanRow[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]!;
    if (!row || row.length === 0) continue;
    const city = row[idxCity] ?? "";
    const country = row[idxCountry] ?? "";
    const lat = Number.parseFloat(row[idxLat] ?? "");
    const lon = Number.parseFloat(row[idxLon] ?? "");
    const year = Number.parseInt(row[idxYear] ?? "", 10);
    const pop = Number.parseFloat(row[idxPop] ?? "");
    if (!city || !country) continue;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (!Number.isFinite(year) || !Number.isFinite(pop)) continue;
    if (pop <= 0) continue;
    out.push({ city, country, lat, lon, year, population: pop });
  }
  return out;
}

function buildDatasetFromRows(rows: ParsedUrbanRow[]): UrbanDataset {
  const cityMap = new Map<string, UrbanCitySeries>();

  for (const row of rows) {
    const key = cityKey(row.city, row.country);
    let c = cityMap.get(key);
    if (!c) {
      c = {
        id: key,
        city: row.city,
        country: row.country,
        lat: row.lat,
        lon: row.lon,
        yearlyPopulation: [],
      };
      cityMap.set(key, c);
    }
    c.yearlyPopulation.push({ year: row.year, population: row.population });
  }
  const cities = [...cityMap.values()];
  for (const c of cities) {
    c.yearlyPopulation.sort((a, b) => a.year - b.year);
    const deduped: Array<{ year: number; population: number }> = [];
    for (const yp of c.yearlyPopulation) {
      const prev = deduped[deduped.length - 1];
      if (prev && prev.year === yp.year) {
        if (yp.population > prev.population) prev.population = yp.population;
      } else {
        deduped.push({ year: yp.year, population: yp.population });
      }
    }
    c.yearlyPopulation = deduped;
  }
  const prunedCities = prunePersistentLowPercentileCities(cities);
  let minPopKept = Number.POSITIVE_INFINITY;
  let maxModernKept = 0;
  for (const c of prunedCities) {
    for (const yp of c.yearlyPopulation) {
      if (yp.population < minPopKept) minPopKept = yp.population;
      if (yp.year >= 1900 && yp.population > maxModernKept) maxModernKept = yp.population;
    }
  }
  return {
    cities: prunedCities,
    minPopulationPositive: Number.isFinite(minPopKept)
      ? minPopKept
      : 1,
    maxPopulationModern:
      maxModernKept > 0
        ? maxModernKept
        : Number.isFinite(minPopKept)
          ? minPopKept
          : 1,
  };
}

function quantileFromSorted(values: number[], q: number): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0]!;
  const qq = Math.max(0, Math.min(1, q));
  const idx = qq * (values.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  const t = idx - lo;
  const a = values[lo]!;
  const b = values[hi]!;
  return a + (b - a) * t;
}

function prunePersistentLowPercentileCities(
  cities: UrbanCitySeries[],
): UrbanCitySeries[] {
  const popsByYear = new Map<number, number[]>();
  for (const c of cities) {
    for (const yp of c.yearlyPopulation) {
      let arr = popsByYear.get(yp.year);
      if (!arr) {
        arr = [];
        popsByYear.set(yp.year, arr);
      }
      arr.push(yp.population);
    }
  }
  const thresholdByYear = new Map<number, number>();
  for (const [year, arr] of popsByYear) {
    arr.sort((a, b) => a - b);
    thresholdByYear.set(year, quantileFromSorted(arr, LOW_PERCENTILE_PRUNE));
  }
  const kept: UrbanCitySeries[] = [];
  let pruned = 0;
  for (const c of cities) {
    let seen = 0;
    let maxPop = 0;
    let alwaysLow = true;
    for (const yp of c.yearlyPopulation) {
      seen++;
      if (yp.population > maxPop) maxPop = yp.population;
      const thr = thresholdByYear.get(yp.year);
      if (thr == null || yp.population > thr) {
        alwaysLow = false;
        break;
      }
    }
    if (
      alwaysLow &&
      seen >= LOW_PERCENTILE_MIN_OBSERVATIONS &&
      maxPop <= LOW_PERCENTILE_MAX_POP_CAP
    ) {
      pruned++;
      continue;
    }
    kept.push(c);
  }
  if (pruned > 0) {
    console.log("[urbanization] pruned persistent low-percentile city series", {
      percentile: LOW_PERCENTILE_PRUNE,
      maxPopulationCap: LOW_PERCENTILE_MAX_POP_CAP,
      minObservations: LOW_PERCENTILE_MIN_OBSERVATIONS,
      pruned,
      kept: kept.length,
    });
  }
  return kept;
}

export async function loadUrbanizationDataset(
): Promise<UrbanDataset> {
  const prebakedRows = await tryLoadRowsFromCsv(
    DEFAULT_DOMINANCE_PREBAKED_URL,
    "dominance-prebaked",
  );
  if (prebakedRows.length === 0) {
    throw new Error(
      `[urbanization] Dominance-prebaked dataset is empty (${DEFAULT_DOMINANCE_PREBAKED_URL})`,
    );
  }
  console.log("[urbanization] using dominance-prebaked dataset", {
    url: DEFAULT_DOMINANCE_PREBAKED_URL,
    rows: prebakedRows.length,
  });
  return buildDatasetFromRows(prebakedRows);
}

function interpolatePopulationAtYear(
  ys: Array<{ year: number; population: number }>,
  year: number,
): number {
  if (ys.length === 0) return 0;
  // Do not backfill cities before their first observed year.
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

export function interpolateUrbanCitiesAtYear(
  dataset: UrbanDataset,
  year: number,
): UrbanCityAtYear[] {
  const out: UrbanCityAtYear[] = [];
  for (const c of dataset.cities) {
    const pop = interpolatePopulationAtYear(c.yearlyPopulation, year);
    if (!(pop > 0)) continue;
    out.push({
      id: c.id,
      city: c.city,
      country: c.country,
      lat: c.lat,
      lon: c.lon,
      population: pop,
    });
  }
  return out;
}

