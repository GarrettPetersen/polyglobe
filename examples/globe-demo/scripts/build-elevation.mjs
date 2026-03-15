#!/usr/bin/env node
/**
 * Build public/elevation.bin (360×180 float32, meters). Same-origin so demo can load it.
 * Run from examples/globe-demo: node scripts/build-elevation.mjs
 *
 * Generates synthetic elevation with peaks at Himalayas, Rockies, Andes, Alps
 * so "mountain" tiles (gray) appear. For real DEM, use ETOPO1/SRTM → 360×180 float32.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEMO_ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(DEMO_ROOT, "public");
const OUT_PATH = path.join(PUBLIC_DIR, "elevation.bin");

const W = 360;
const H = 180;
const SIZE = W * H * 4;

// (lat_deg, lon_deg, amplitude_m, sigma_deg). Multiple peaks per range so relief is high (tile vs neighbors).
const PEAKS = [
  // Himalayas / Tibetan plateau – several peaks so the chain reads as mountains
  [28, 87, 6000, 8],
  [30, 81, 5500, 8],
  [35, 76, 5500, 8],
  [27, 88, 5800, 8],
  // Rockies – spine from Canada to NM so tiles have relief
  [53, -118, 3500, 6],
  [51, -115, 3600, 6],
  [45, -110, 3200, 6],
  [43, -109, 3800, 6],
  [40, -105, 4000, 6],
  [38, -106, 4200, 6],
  [35, -106, 3200, 6],
  [32, -107, 2800, 6],
  // Andes
  [-15, -72, 5000, 8],
  [-2, -78, 5800, 8],
  [-33, -70, 5500, 8],
  [-35, -70, 4000, 6],
  // Alps and Caucasus
  [46, 10, 3500, 6],
  [45, 7, 3800, 6],
  [43, 12, 2800, 6],
  [42, 44, 4500, 8],
  [35, 65, 2500, 8],
  // Others
  [-35, 148, 2000, 8],
  [60, -140, 4500, 6],
  [63, -150, 3500, 6],
];

function bump(latDeg, lonDeg, lat0, lon0, amp, sigma) {
  const dlat = latDeg - lat0;
  let dlon = lonDeg - lon0;
  while (dlon > 180) dlon -= 360;
  while (dlon < -180) dlon += 360;
  const d2 = dlat * dlat + dlon * dlon;
  return amp * Math.exp(-d2 / (2 * sigma * sigma));
}

function main() {
  if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  const view = new Float32Array(W * H);
  for (let j = 0; j < H; j++) {
    const latDeg = 90 - (j / (H - 1)) * 180;
    for (let i = 0; i < W; i++) {
      const lonDeg = (i / (W - 1)) * 360 - 180;
      let elev = 0;
      for (const [lat0, lon0, amp, sigma] of PEAKS) {
        elev += bump(latDeg, lonDeg, lat0, lon0, amp, sigma);
      }
      view[j * W + i] = Math.max(0, elev);
    }
  }
  fs.writeFileSync(OUT_PATH, Buffer.from(view.buffer));
  console.log("Wrote", OUT_PATH, SIZE, "bytes (synthetic peaks: Himalayas, Rockies, Andes, Alps).");
}

main();
