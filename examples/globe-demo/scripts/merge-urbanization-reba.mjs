#!/usr/bin/env node
/**
 * Merge Reba/Reitsma/Seto city-population datasets into one long-form table.
 *
 * Inputs (default):
 *   public/datasets/urbanization-reba-2016/chandlerV2.csv
 *   public/datasets/urbanization-reba-2016/modelskiAncientV2.csv
 *   public/datasets/urbanization-reba-2016/modelskiModernV2.csv
 *
 * Outputs:
 *   public/datasets/urbanization-reba-2016/urbanization-merged.csv
 *   public/datasets/urbanization-reba-2016/urbanization-merge-report.json
 *
 * Policy:
 * - Years <= AD 1000: prefer Modelski Ancient over Chandler.
 * - Years AD 1001..1975: prefer Chandler.
 * - Year AD 2000: prefer Modelski Modern.
 * - If preferred source missing for a city-year, fallback to any available source.
 *
 * Rationale:
 * The source paper explicitly used Modelski in the ancient overlap period because his
 * work focused on that era, while Chandler dominates the later historical window.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const DATA_DIR = join(ROOT, "public", "datasets", "urbanization-reba-2016");

const INPUTS = [
  { source: "chandler", path: join(DATA_DIR, "chandlerV2.csv") },
  { source: "modelski_ancient", path: join(DATA_DIR, "modelskiAncientV2.csv") },
  { source: "modelski_modern", path: join(DATA_DIR, "modelskiModernV2.csv") },
];

const OUT_CSV = join(DATA_DIR, "urbanization-merged.csv");
const OUT_REPORT = join(DATA_DIR, "urbanization-merge-report.json");

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

function normalizeToken(s) {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cityKey(city, country) {
  return `${normalizeToken(city)}|${normalizeToken(country)}`;
}

function parseYearColumn(col) {
  if (col.startsWith("BC_")) {
    const n = Number.parseInt(col.slice(3), 10);
    return Number.isFinite(n) ? -n : null;
  }
  if (col.startsWith("AD_")) {
    const n = Number.parseInt(col.slice(3), 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parsePopulation(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s || s === "E" || s === "x" || s === "X") return null;
  const clean = s.replace(/,/g, "");
  const n = Number.parseFloat(clean);
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

function parseNumber(raw) {
  const n = Number.parseFloat(String(raw ?? "").trim());
  return Number.isFinite(n) ? n : null;
}

function sourcePriority(year, source) {
  if (year <= 1000) {
    if (source === "modelski_ancient") return 0;
    if (source === "chandler") return 1;
    return 2;
  }
  if (year === 2000) {
    if (source === "modelski_modern") return 0;
    if (source === "chandler") return 1;
    return 2;
  }
  if (source === "chandler") return 0;
  if (source === "modelski_ancient") return 1;
  return 2;
}

const candidatesByCityYear = new Map();
const metadataByCity = new Map();
const inputCoverage = {};

for (const src of INPUTS) {
  const text = readFileSync(src.path, "utf8");
  const rows = parseCsv(text);
  const header = rows[0] ?? [];
  const yearCols = [];
  for (let i = 0; i < header.length; i++) {
    const y = parseYearColumn(header[i] ?? "");
    if (y != null) yearCols.push({ idx: i, year: y });
  }
  inputCoverage[src.source] = {
    rows: Math.max(0, rows.length - 1),
    yearColumns: yearCols.length,
    minYear: yearCols.length ? Math.min(...yearCols.map((c) => c.year)) : null,
    maxYear: yearCols.length ? Math.max(...yearCols.map((c) => c.year)) : null,
  };

  const idxCity = header.indexOf("City");
  const idxOther = header.indexOf("OtherName");
  const idxCountry = header.indexOf("Country");
  const idxLat = header.indexOf("Latitude");
  const idxLon = header.indexOf("Longitude");
  const idxCert = header.indexOf("Certainty");

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;
    const city = row[idxCity] ?? "";
    const country = row[idxCountry] ?? "";
    if (!city || !country) continue;
    const key = cityKey(city, country);
    if (!metadataByCity.has(key)) {
      metadataByCity.set(key, {
        city,
        otherName: row[idxOther] ?? "",
        country,
        latitude: parseNumber(row[idxLat]),
        longitude: parseNumber(row[idxLon]),
      });
    }
    if (!candidatesByCityYear.has(key)) candidatesByCityYear.set(key, new Map());
    const byYear = candidatesByCityYear.get(key);
    const certainty = parseNumber(row[idxCert]);
    for (const yc of yearCols) {
      const pop = parsePopulation(row[yc.idx]);
      if (pop == null) continue;
      if (!byYear.has(yc.year)) byYear.set(yc.year, []);
      byYear.get(yc.year).push({
        source: src.source,
        population: pop,
        certainty: certainty == null ? 99 : certainty,
      });
    }
  }
}

const mergedRows = [];
const sourceUsage = { chandler: 0, modelski_ancient: 0, modelski_modern: 0 };
let overlapRows = 0;
let overlapAgreeRows = 0;
let overlapDisagreeRows = 0;
const disagreements = [];

for (const [key, byYear] of candidatesByCityYear) {
  const meta = metadataByCity.get(key);
  for (const [year, cands] of byYear) {
    const sorted = [...cands].sort((a, b) => {
      const pa = sourcePriority(year, a.source);
      const pb = sourcePriority(year, b.source);
      if (pa !== pb) return pa - pb;
      if (a.certainty !== b.certainty) return a.certainty - b.certainty;
      return b.population - a.population;
    });
    const chosen = sorted[0];
    sourceUsage[chosen.source]++;
    const populations = new Set(cands.map((c) => c.population));
    if (cands.length > 1) {
      overlapRows++;
      if (populations.size === 1) {
        overlapAgreeRows++;
      } else {
        overlapDisagreeRows++;
        const pops = [...populations].sort((a, b) => a - b);
        disagreements.push({
          city: meta.city,
          country: meta.country,
          year,
          chosenSource: chosen.source,
          chosenPopulation: chosen.population,
          alternatives: cands,
          minPopulation: pops[0],
          maxPopulation: pops[pops.length - 1],
          spread: pops[pops.length - 1] - pops[0],
        });
      }
    }
    mergedRows.push({
      city: meta.city,
      otherName: meta.otherName,
      country: meta.country,
      latitude: meta.latitude,
      longitude: meta.longitude,
      year,
      population: chosen.population,
      certainty: chosen.certainty,
      source: chosen.source,
      overlapCandidateCount: cands.length,
    });
  }
}

mergedRows.sort((a, b) => {
  if (a.year !== b.year) return a.year - b.year;
  const ak = cityKey(a.city, a.country);
  const bk = cityKey(b.city, b.country);
  return ak.localeCompare(bk);
});

const header = [
  "city",
  "otherName",
  "country",
  "latitude",
  "longitude",
  "year",
  "population",
  "certainty",
  "source",
  "overlapCandidateCount",
];
const lines = [header.join(",")];
for (const r of mergedRows) {
  lines.push(
    [
      r.city,
      r.otherName,
      r.country,
      r.latitude ?? "",
      r.longitude ?? "",
      r.year,
      r.population,
      r.certainty,
      r.source,
      r.overlapCandidateCount,
    ]
      .map(csvEscape)
      .join(","),
  );
}
writeFileSync(OUT_CSV, `${lines.join("\n")}\n`, "utf8");

disagreements.sort((a, b) => b.spread - a.spread);
const years = mergedRows.map((r) => r.year);
const report = {
  generatedAtUtc: new Date().toISOString(),
  inputs: INPUTS.map((s) => s.path),
  outputCsv: OUT_CSV,
  mergePolicy: {
    description:
      "Prefer Modelski Ancient for <=AD1000; Chandler for AD1001..1975; Modelski Modern for AD2000; fallback when preferred missing.",
    note: "Matches paper-era preference for ancient overlap while preserving Chandler later coverage.",
  },
  inputCoverage,
  totals: {
    mergedRows: mergedRows.length,
    uniqueCities: candidatesByCityYear.size,
    minYear: years.length ? Math.min(...years) : null,
    maxYear: years.length ? Math.max(...years) : null,
  },
  sourceUsage,
  overlap: {
    overlapRows,
    overlapAgreeRows,
    overlapDisagreeRows,
  },
  topDisagreementsByPopulationSpread: disagreements.slice(0, 25),
};
writeFileSync(OUT_REPORT, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log("[merge-urbanization-reba] wrote", OUT_CSV);
console.log("[merge-urbanization-reba] wrote", OUT_REPORT);
console.log(
  "[merge-urbanization-reba] rows:",
  mergedRows.length,
  "overlap:",
  overlapRows,
  "disagree:",
  overlapDisagreeRows,
);
