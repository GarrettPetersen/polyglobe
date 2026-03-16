#!/usr/bin/env node
/**
 * Generate public/mountains.json from Natural Earth 10m elevation points.
 * Run from examples/globe-demo: npm run build-mountains
 * Uses 10m scale for ~1000+ peaks so high-tile-count globes show many 3D peaks.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEMO_ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(DEMO_ROOT, "public");
const OUT_PATH = path.join(PUBLIC_DIR, "mountains.json");

const NE_10M_LOCAL = path.join(PUBLIC_DIR, "ne_10m_geography_regions_elevation_points.json");
const NE_50M_LOCAL = path.join(PUBLIC_DIR, "ne_50m_geography_regions_elevation_points.json");
const NATURAL_EARTH_10M_URL =
  "https://cdn.jsdelivr.net/gh/martynafford/natural-earth-geojson@master/10m/physical/ne_10m_geography_regions_elevation_points.json";
const NATURAL_EARTH_50M_URL =
  "https://cdn.jsdelivr.net/gh/martynafford/natural-earth-geojson@master/50m/physical/ne_50m_geography_regions_elevation_points.json";

function extractPeaks(geojson) {
  const out = [];
  for (const f of geojson.features || []) {
    const fc = f.properties?.featurecla;
    if (fc !== "mountain" && fc !== "spot elevation") continue;
    if (f.geometry?.type !== "Point") continue;
    const elev = Number(f.properties.elevation);
    if (!Number.isFinite(elev) || elev <= 0) continue;
    const [lon, lat] = f.geometry.coordinates;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    out.push({
      name: f.properties.name || "Peak",
      lat: Number(lat),
      lon: Number(lon),
      elevationM: Math.round(elev),
    });
  }
  return out;
}

async function loadJson(localPath, url) {
  if (fs.existsSync(localPath)) {
    return JSON.parse(fs.readFileSync(localPath, "utf8"));
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return res.json();
}

async function main() {
  console.log("Loading 10m elevation points (local or fetch)...");
  const geojson10 = await loadJson(NE_10M_LOCAL, NATURAL_EARTH_10M_URL);
  const peaks10 = extractPeaks(geojson10);
  let entries = [...peaks10];
  let geojson50 = null;
  if (fs.existsSync(NE_50M_LOCAL)) {
    geojson50 = JSON.parse(fs.readFileSync(NE_50M_LOCAL, "utf8"));
  } else {
    const res50 = await fetch(NATURAL_EARTH_50M_URL);
    if (res50.ok) geojson50 = await res50.json();
  }
  if (geojson50) {
    const peaks50 = extractPeaks(geojson50);
    const key = (e) => `${Math.round(e.lat * 100)}_${Math.round(e.lon * 100)}`;
    const byKey = new Map();
    for (const e of entries) byKey.set(key(e), e);
    for (const e of peaks50) {
      const k = key(e);
      if (!byKey.has(k) || e.elevationM > byKey.get(k).elevationM) byKey.set(k, e);
    }
    entries = [...byKey.values()];
  }
  entries.sort((a, b) => b.elevationM - a.elevationM);

  if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(entries, null, 2) + "\n", "utf8");
  console.log("Wrote", OUT_PATH, "(" + entries.length + " peaks from Natural Earth 10m + 50m).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
