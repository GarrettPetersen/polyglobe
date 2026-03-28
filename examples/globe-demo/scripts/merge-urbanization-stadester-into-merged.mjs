#!/usr/bin/env node
/**
 * Replace baseline merged rows for year >= cutoff with Stadester rows.
 *
 * Inputs:
 *  - public/datasets/urbanization-reba-2016/urbanization-merged.csv
 *  - public/datasets/urbanization-stadester-1/urbanization-stadester-merged.csv
 *
 * Output:
 *  - public/datasets/urbanization-reba-2016/urbanization-merged.csv (overwritten)
 *  - public/datasets/urbanization-reba-2016/urbanization-merged.reba-only.csv (snapshot backup)
 */

import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const BASE_PATH = join(
  ROOT,
  "public",
  "datasets",
  "urbanization-reba-2016",
  "urbanization-merged.csv",
);
const BASE_BACKUP_PATH = join(
  ROOT,
  "public",
  "datasets",
  "urbanization-reba-2016",
  "urbanization-merged.reba-only.csv",
);
const STADESTER_PATH = join(
  ROOT,
  "public",
  "datasets",
  "urbanization-stadester-1",
  "urbanization-stadester-merged.csv",
);

const cutoffRaw = process.argv[2] ?? "1800";
const REPLACE_FROM_YEAR = Number.parseInt(cutoffRaw, 10);

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

function idxOf(header, name) {
  return header.findIndex((h) => String(h ?? "").trim() === name);
}

function toNumber(v) {
  const n = Number.parseFloat(String(v ?? "").trim());
  return Number.isFinite(n) ? n : null;
}

if (!Number.isFinite(REPLACE_FROM_YEAR)) {
  throw new Error(`Invalid cutoff year: ${cutoffRaw}`);
}

const baseRows = parseCsv(readFileSync(BASE_PATH, "utf8"));
const stadRows = parseCsv(readFileSync(STADESTER_PATH, "utf8"));
if (baseRows.length < 2) throw new Error("Base merged dataset is empty");
if (stadRows.length < 2) throw new Error("Stadester merged dataset is empty");

const baseHeader = baseRows[0];
const bCity = idxOf(baseHeader, "city");
const bOtherName = idxOf(baseHeader, "otherName");
const bCountry = idxOf(baseHeader, "country");
const bLat = idxOf(baseHeader, "latitude");
const bLon = idxOf(baseHeader, "longitude");
const bYear = idxOf(baseHeader, "year");
const bPopulation = idxOf(baseHeader, "population");
const bCertainty = idxOf(baseHeader, "certainty");
const bSource = idxOf(baseHeader, "source");
const bOverlap = idxOf(baseHeader, "overlapCandidateCount");
if (
  bCity < 0 ||
  bCountry < 0 ||
  bLat < 0 ||
  bLon < 0 ||
  bYear < 0 ||
  bPopulation < 0 ||
  bSource < 0
) {
  throw new Error("Base merged dataset missing required columns");
}

const stadHeader = stadRows[0];
const sCity = idxOf(stadHeader, "city");
const sCountry = idxOf(stadHeader, "country");
const sLat = idxOf(stadHeader, "latitude");
const sLon = idxOf(stadHeader, "longitude");
const sYear = idxOf(stadHeader, "year");
const sPopulation = idxOf(stadHeader, "population");
const sSource = idxOf(stadHeader, "source");
if (sCity < 0 || sCountry < 0 || sLat < 0 || sLon < 0 || sYear < 0 || sPopulation < 0) {
  throw new Error("Stadester merged dataset missing required columns");
}

const keptBaseRows = [];
for (let i = 1; i < baseRows.length; i++) {
  const row = baseRows[i];
  const y = toNumber(row[bYear]);
  if (y == null) continue;
  if (y < REPLACE_FROM_YEAR) keptBaseRows.push(row);
}

const outRows = [...keptBaseRows];
for (let i = 1; i < stadRows.length; i++) {
  const r = stadRows[i];
  const y = toNumber(r[sYear]);
  const pop = toNumber(r[sPopulation]);
  const lat = toNumber(r[sLat]);
  const lon = toNumber(r[sLon]);
  if (y == null || y < REPLACE_FROM_YEAR) continue;
  if (pop == null || pop <= 0) continue;
  if (lat == null || lon == null) continue;
  const out = new Array(baseHeader.length).fill("");
  out[bCity] = r[sCity] ?? "";
  if (bOtherName >= 0) out[bOtherName] = "";
  out[bCountry] = r[sCountry] ?? "";
  out[bLat] = String(lat);
  out[bLon] = String(lon);
  out[bYear] = String(Math.round(y));
  out[bPopulation] = String(Math.round(pop));
  if (bCertainty >= 0) out[bCertainty] = "1";
  out[bSource] = r[sSource] && String(r[sSource]).trim() ? r[sSource] : "stadester_1_0";
  if (bOverlap >= 0) out[bOverlap] = "1";
  outRows.push(out);
}

outRows.sort((a, b) => {
  const ya = toNumber(a[bYear]) ?? 0;
  const yb = toNumber(b[bYear]) ?? 0;
  if (ya !== yb) return ya - yb;
  const ca = String(a[bCity] ?? "");
  const cb = String(b[bCity] ?? "");
  const coA = String(a[bCountry] ?? "");
  const coB = String(b[bCountry] ?? "");
  const kA = `${ca}|${coA}`;
  const kB = `${cb}|${coB}`;
  return kA.localeCompare(kB);
});

const dedup = [];
let prevKey = "";
for (const row of outRows) {
  const key = `${row[bCity]}|${row[bCountry]}|${row[bYear]}`;
  if (key === prevKey) continue;
  dedup.push(row);
  prevKey = key;
}

copyFileSync(BASE_PATH, BASE_BACKUP_PATH);
const lines = [baseHeader.join(",")];
for (const row of dedup) lines.push(row.map(csvEscape).join(","));
writeFileSync(BASE_PATH, `${lines.join("\n")}\n`, "utf8");

console.log("[merge-urbanization-stadester-into-merged] cutoff:", REPLACE_FROM_YEAR);
console.log(
  "[merge-urbanization-stadester-into-merged] kept base rows:",
  keptBaseRows.length,
);
console.log(
  "[merge-urbanization-stadester-into-merged] added Stadester rows:",
  outRows.length - keptBaseRows.length,
);
console.log(
  "[merge-urbanization-stadester-into-merged] final rows:",
  dedup.length,
);
console.log(
  "[merge-urbanization-stadester-into-merged] backup:",
  BASE_BACKUP_PATH,
);
