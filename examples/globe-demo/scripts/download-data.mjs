#!/usr/bin/env node
/**
 * Download all remote data assets into public/ so the app and build scripts can run
 * without hitting CDNs or external servers. Run once, then commit public/ for offline use.
 *
 * Run from examples/globe-demo: npm run download-data
 *
 * Writes to public/:
 *   land-50m.json, ne_110m_lakes.json, ne_110m_geography_marine_polys.json,
 *   koppen_ascii.zip, ne_10m_geography_regions_elevation_points.json,
 *   ne_50m_geography_regions_elevation_points.json, ne_10m_rivers_lake_centerlines.json,
 *   lroc_color_2k.jpg (NASA moon texture),
 *   wc2.1_10m_tavg.zip (~37 MB, WorldClim 2.1 mean monthly °C — run npm run build-tavg-worldclim after)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEMO_ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(DEMO_ROOT, "public");

/** WAFs (e.g. Imperva on university hosts) often block default `fetch` — send a browser-like UA. */
const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "*/*",
};

const ASSETS = [
  { url: "https://cdn.jsdelivr.net/npm/world-atlas@2/land-50m.json", file: "land-50m.json" },
  { url: "https://cdn.jsdelivr.net/gh/martynafford/natural-earth-geojson@master/110m/physical/ne_110m_lakes.json", file: "ne_110m_lakes.json" },
  { url: "https://cdn.jsdelivr.net/gh/martynafford/natural-earth-geojson@master/110m/physical/ne_110m_geography_marine_polys.json", file: "ne_110m_geography_marine_polys.json" },
  { url: "https://people.eng.unimelb.edu.au/mpeel/Koppen/koppen_ascii.zip", file: "koppen_ascii.zip" },
  { url: "https://cdn.jsdelivr.net/gh/martynafford/natural-earth-geojson@master/10m/physical/ne_10m_geography_regions_elevation_points.json", file: "ne_10m_geography_regions_elevation_points.json" },
  { url: "https://cdn.jsdelivr.net/gh/martynafford/natural-earth-geojson@master/50m/physical/ne_50m_geography_regions_elevation_points.json", file: "ne_50m_geography_regions_elevation_points.json" },
  { url: "https://cdn.jsdelivr.net/gh/martynafford/natural-earth-geojson@master/10m/physical/ne_10m_rivers_lake_centerlines.json", file: "ne_10m_rivers_lake_centerlines.json" },
  { url: "https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_2k.jpg", file: "lroc_color_2k.jpg" },
  {
    url: "https://geodata.ucdavis.edu/climate/worldclim/2_1/base/wc2.1_10m_tavg.zip",
    file: "wc2.1_10m_tavg.zip",
  },
];

async function fetchUrl(url) {
  const res = await fetch(url, { redirect: "follow", headers: FETCH_HEADERS });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return Buffer.from(await res.arrayBuffer());
}

function assertLooksLikeZip(buf, fileLabel) {
  if (buf.length >= 2 && buf[0] === 0x50 && buf[1] === 0x4b) return;
  const head = buf.slice(0, 120).toString("utf8").replace(/\s+/g, " ");
  throw new Error(
    `${fileLabel}: not a ZIP (expected PK header); got: ${head.slice(0, 200)}`,
  );
}

async function main() {
  if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });

  for (const { url, file } of ASSETS) {
    const dest = path.join(PUBLIC_DIR, file);
    console.log("[download-data]", file, "...");
    try {
      const data = await fetchUrl(url);
      if (file.endsWith(".zip")) assertLooksLikeZip(data, file);
      fs.writeFileSync(dest, data);
      console.log("[download-data] Wrote", file);
    } catch (e) {
      console.error("[download-data] Failed", file, e.message);
      throw e;
    }
  }

  console.log("[download-data] Done. Commit public/ to use data locally.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
