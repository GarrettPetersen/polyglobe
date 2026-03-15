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

async function main() {
  console.log("Fetching", NATURAL_EARTH_10M_URL, "...");
  const res = await fetch(NATURAL_EARTH_10M_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const geojson = await res.json();

  const entries = [];
  for (const f of geojson.features || []) {
    const fc = f.properties?.featurecla;
    if (fc !== "mountain" && fc !== "spot elevation") continue;
    if (f.geometry?.type !== "Point") continue;
    const elev = Number(f.properties.elevation);
    if (!Number.isFinite(elev) || elev <= 0) continue;
    const [lon, lat] = f.geometry.coordinates;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    entries.push({
      name: f.properties.name || "Peak",
      lat: Number(lat),
      lon: Number(lon),
      elevationM: Math.round(elev),
    });
  }
  entries.sort((a, b) => b.elevationM - a.elevationM);

  if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(entries, null, 2) + "\n", "utf8");
  console.log("Wrote", OUT_PATH, "(" + entries.length + " peaks from Natural Earth 10m).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
