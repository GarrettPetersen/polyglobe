#!/usr/bin/env node
/**
 * Build public/tavg_monthly.bin: PG12 header + 12 × (W×H) float32 °C, month-major.
 * Full equirectangular grid (−180…180° lon, −90…90° lat): **each pixel has its own value**
 * (longitude enters explicitly — not a latitude-only profile).
 *
 * This default is a coarse analytic stand-in. For real climates use WorldClim via
 * `npm run build-tavg-worldclim` (after `wc2.1_10m_tavg.zip` is in public/, e.g. from `npm run download-data`).
 *
 * Run from examples/globe-demo: node scripts/build-tavg-monthly.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEMO_ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(DEMO_ROOT, "public");
const OUT_PATH = path.join(PUBLIC_DIR, "tavg_monthly.bin");

/** Match koppen.bin / land raster convenience; any W×H ≥ 2 works. */
const W = 360;
const H = 180;
const cells = W * H;

function buildLayers() {
  const data = new Float32Array(12 * cells);
  const hScale = H > 1 ? H - 1 : 1;
  const wScale = W > 1 ? W - 1 : 1;
  for (let m = 0; m < 12; m++) {
    const monthAngle = ((m + 0.5) / 12) * Math.PI * 2;
    for (let j = 0; j < H; j++) {
      const latDeg = 90 - (j / hScale) * 180;
      const lr = (latDeg * Math.PI) / 180;
      const cosLat = Math.cos(lr);
      const absLat = Math.abs(latDeg);
      for (let i = 0; i < W; i++) {
        const lonDeg = (i / wScale) * 360 - 180;
        const lor = (lonDeg * Math.PI) / 180;
        const seasonal = 14 * Math.sin(monthAngle - lr);
        const zonal = 26 * cosLat - 2;
        const continental =
          5.5 * Math.sin(lor * 2 + 0.9) + 3.8 * Math.cos(lor * 3 - 0.4);
        const polar =
          absLat > 58 ? (-0.45 * (absLat - 58) * (absLat - 58)) / 32 : 0;
        data[m * cells + j * W + i] =
          zonal + seasonal + continental + polar;
      }
    }
  }
  return data;
}

function main() {
  const layers = buildLayers();
  const header = Buffer.alloc(12);
  header.write("PG12", 0, 4, "ascii");
  header.writeUInt32LE(W, 4);
  header.writeUInt32LE(H, 8);
  const body = Buffer.from(layers.buffer, layers.byteOffset, layers.byteLength);
  if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  fs.writeFileSync(OUT_PATH, Buffer.concat([header, body]));
  console.log(
    "[build-tavg-monthly] Wrote",
    OUT_PATH,
    `(${W}×${H} × 12 months, float32 °C).`,
  );
}

main();
