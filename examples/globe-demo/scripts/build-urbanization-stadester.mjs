#!/usr/bin/env node
/**
 * Build a normalized Stadester city-year CSV for globe-demo ingestion.
 *
 * Output schema:
 *   city,country,latitude,longitude,year,population,source
 *
 * Usage examples:
 *   npm run build-urbanization-stadester -- --input ./tmp/stadester.json
 *   npm run build-urbanization-stadester -- --input ./tmp/stadester.csv
 *
 * Notes:
 * - Keeps rows with year >= 1800 and population > 0 only.
 * - Tries to support common city-record JSON shapes:
 *   { city|name, country, lat|latitude, lon|lng|longitude, population: { "1800": ... } }
 *   { ..., yearlyPopulation: [{ year, population }] }
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";

const ROOT = process.cwd();
const DEFAULT_OUT = join(
  ROOT,
  "public",
  "datasets",
  "urbanization-stadester-1",
  "urbanization-stadester-merged.csv",
);

const args = process.argv.slice(2);
function getArg(name, fallback = "") {
  const idx = args.indexOf(name);
  if (idx >= 0 && idx + 1 < args.length) return args[idx + 1];
  return fallback;
}

const inPath = getArg("--input", "");
const outPath = getArg("--output", DEFAULT_OUT);
const fromYear = Number.parseInt(getArg("--fromYear", "1800"), 10);

if (!inPath) {
  console.error(
    "[build-urbanization-stadester] missing --input <path-to-json-or-csv>",
  );
  process.exit(1);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let i = 0;
  let inQuotes = false;
  while (i < text.length) {
    const ch = text[i];
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

function csvEscape(v) {
  const s = v == null ? "" : String(v);
  if (!/[",\n\r]/.test(s)) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

function num(v) {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).trim().replace(/,/g, "");
  if (!s) return null;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function pick(obj, keys) {
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] != null) {
      return obj[k];
    }
  }
  return null;
}

function normalizeJsonRecords(payload) {
  const rows = [];
  const records = [];
  if (Array.isArray(payload)) {
    for (const rec of payload) records.push({ rec, key: null });
  } else if (Array.isArray(payload?.cities)) {
    for (const rec of payload.cities) records.push({ rec, key: null });
  } else if (payload && typeof payload === "object") {
    for (const [key, rec] of Object.entries(payload)) {
      records.push({ rec, key });
    }
  }

  for (const { rec, key } of records) {
    if (!rec || typeof rec !== "object") continue;
    const city = String(pick(rec, ["city", "name", "cityName"]) ?? "").trim();
    let country = String(
      pick(rec, ["country", "countryName", "nation", "state"]) ?? "",
    ).trim();
    if (!country && typeof key === "string") {
      const dash = key.lastIndexOf("-");
      if (dash > 0 && dash < key.length - 1) {
        country = key.slice(dash + 1).trim();
      }
    }
    let lat = num(pick(rec, ["lat", "latitude", "y"]));
    let lon = num(pick(rec, ["lon", "lng", "longitude", "x"]));
    if ((lat == null || lon == null) && Array.isArray(rec.coords) && rec.coords.length >= 2) {
      lat = num(rec.coords[0]);
      lon = num(rec.coords[1]);
    }
    if (!city || !country || lat == null || lon == null) continue;

    const popObj = pick(rec, ["population", "populations", "yearly", "years"]);
    if (popObj && typeof popObj === "object" && !Array.isArray(popObj)) {
      for (const [yearRaw, popRaw] of Object.entries(popObj)) {
        const year = Number.parseInt(String(yearRaw), 10);
        const pop = num(popRaw);
        if (!Number.isFinite(year) || pop == null || pop <= 0) continue;
        rows.push({ city, country, latitude: lat, longitude: lon, year, pop });
      }
      continue;
    }

    const yp = pick(rec, ["yearlyPopulation", "series", "populationSeries"]);
    if (Array.isArray(yp)) {
      for (const ypr of yp) {
        const year = Number.parseInt(String(ypr?.year ?? ""), 10);
        const pop = num(ypr?.population ?? ypr?.pop ?? ypr?.value);
        if (!Number.isFinite(year) || pop == null || pop <= 0) continue;
        rows.push({ city, country, latitude: lat, longitude: lon, year, pop });
      }
    }
  }
  return rows;
}

function normalizeCsvRecords(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const h = rows[0].map((s) => String(s ?? "").trim().toLowerCase());
  const idx = (aliases) => {
    for (const a of aliases) {
      const i = h.indexOf(a);
      if (i >= 0) return i;
    }
    return -1;
  };
  const iCity = idx(["city", "name", "city_name"]);
  const iCountry = idx(["country", "country_name", "nation"]);
  const iLat = idx(["latitude", "lat", "y"]);
  const iLon = idx(["longitude", "lon", "lng", "x"]);
  const iYear = idx(["year"]);
  const iPop = idx(["population", "pop", "value"]);
  if (iCity < 0 || iCountry < 0 || iLat < 0 || iLon < 0 || iYear < 0 || iPop < 0) {
    throw new Error(
      "CSV missing required columns. Need city,country,latitude,longitude,year,population (or aliases).",
    );
  }
  const out = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;
    const city = String(row[iCity] ?? "").trim();
    const country = String(row[iCountry] ?? "").trim();
    const latitude = num(row[iLat]);
    const longitude = num(row[iLon]);
    const year = Number.parseInt(String(row[iYear] ?? ""), 10);
    const pop = num(row[iPop]);
    if (!city || !country) continue;
    if (latitude == null || longitude == null) continue;
    if (!Number.isFinite(year) || pop == null || pop <= 0) continue;
    out.push({ city, country, latitude, longitude, year, pop });
  }
  return out;
}

const absInput = resolve(ROOT, inPath);
const inputText = readFileSync(absInput, "utf8");
const isJson = extname(absInput).toLowerCase() === ".json";
const normalized = isJson
  ? normalizeJsonRecords(JSON.parse(inputText))
  : normalizeCsvRecords(inputText);

const filtered = normalized.filter(
  (r) => Number.isFinite(r.year) && r.year >= fromYear && r.pop > 0,
);

const dedup = new Map();
for (const r of filtered) {
  const key = `${r.city}|${r.country}|${r.year}`;
  const prev = dedup.get(key);
  if (!prev || r.pop > prev.pop) dedup.set(key, r);
}

const outRows = [...dedup.values()].sort((a, b) => {
  if (a.year !== b.year) return a.year - b.year;
  const ac = `${a.city}|${a.country}`;
  const bc = `${b.city}|${b.country}`;
  return ac.localeCompare(bc);
});

mkdirSync(dirname(outPath), { recursive: true });
const outLines = [
  "city,country,latitude,longitude,year,population,source",
  ...outRows.map((r) =>
    [
      r.city,
      r.country,
      r.latitude,
      r.longitude,
      r.year,
      Math.round(r.pop),
      "stadester_1_0",
    ]
      .map(csvEscape)
      .join(","),
  ),
];
writeFileSync(outPath, `${outLines.join("\n")}\n`, "utf8");

console.log("[build-urbanization-stadester] input:", absInput);
console.log("[build-urbanization-stadester] output:", outPath);
console.log("[build-urbanization-stadester] rows:", outRows.length);
console.log("[build-urbanization-stadester] fromYear:", fromYear);
