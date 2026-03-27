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

export async function loadUrbanizationDataset(
  url = "/datasets/urbanization-reba-2016/urbanization-merged.csv",
): Promise<UrbanDataset> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load urbanization dataset: ${res.status}`);
  }
  const text = await res.text();
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error("Urbanization dataset is empty");
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
    throw new Error("Urbanization dataset missing required columns");
  }

  const cityMap = new Map<string, UrbanCitySeries>();
  let minPopulationPositive = Number.POSITIVE_INFINITY;
  let maxPopulationModern = 0;
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
    if (pop < minPopulationPositive) minPopulationPositive = pop;
    if (year >= 1900 && pop > maxPopulationModern) maxPopulationModern = pop;
    const key = cityKey(city, country);
    let c = cityMap.get(key);
    if (!c) {
      c = {
        id: key,
        city,
        country,
        lat,
        lon,
        yearlyPopulation: [],
      };
      cityMap.set(key, c);
    }
    c.yearlyPopulation.push({ year, population: pop });
  }
  const cities = [...cityMap.values()];
  for (const c of cities) {
    c.yearlyPopulation.sort((a, b) => a.year - b.year);
  }
  return {
    cities,
    minPopulationPositive: Number.isFinite(minPopulationPositive)
      ? minPopulationPositive
      : 1,
    maxPopulationModern:
      maxPopulationModern > 0 ? maxPopulationModern : minPopulationPositive,
  };
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

