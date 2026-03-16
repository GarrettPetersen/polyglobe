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

async function main() {
  console.log("Fetching 10m and 50m elevation points...");
  const [res10, res50] = await Promise.all([
    fetch(NATURAL_EARTH_10M_URL),
    fetch(NATURAL_EARTH_50M_URL),
  ]);
  if (!res10.ok) throw new Error(`10m HTTP ${res10.status}`);
  const geojson10 = await res10.json();
  const peaks10 = extractPeaks(geojson10);
  let entries = [...peaks10];
  if (res50.ok) {
    const geojson50 = await res50.json();
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
