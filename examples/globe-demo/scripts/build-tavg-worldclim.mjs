#!/usr/bin/env node
/**
 * Build public/tavg_monthly.bin from WorldClim 2.1 10 arc-minute mean monthly temperature (1970–2000).
 *
 * Downloads https://geodata.ucdavis.edu/climate/worldclim/2_1/base/wc2.1_10m_tavg.zip (~37 MB)
 * unless public/wc2.1_10m_tavg.zip already exists (or pass path as argv[2]).
 *
 * Outputs PG12 + 12×(360×180) float32 °C (same layout as {@link parseTemperatureMonthlyBin}).
 *
 * Run from examples/globe-demo:
 *   node scripts/build-tavg-worldclim.mjs
 *   node scripts/build-tavg-worldclim.mjs /path/to/wc2.1_10m_tavg.zip
 *
 * Requires: npm i -D geotiff (globe-demo devDependency).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import JSZip from "jszip";
import { fromArrayBuffer } from "geotiff";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEMO_ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(DEMO_ROOT, "public");
const OUT_BIN = path.join(PUBLIC_DIR, "tavg_monthly.bin");
const ZIP_NAME = "wc2.1_10m_tavg.zip";
const ZIP_CANDIDATES = [
  process.argv[2],
  path.join(PUBLIC_DIR, ZIP_NAME),
].filter(Boolean);

const WC_URL =
  "https://geodata.ucdavis.edu/climate/worldclim/2_1/base/wc2.1_10m_tavg.zip";

const OUT_W = 360;
const OUT_H = 180;
const OUT_CELLS = OUT_W * OUT_H;

const NODATA_MAX = -100;

function isValidT(v) {
  return Number.isFinite(v) && v > NODATA_MAX && v < 70;
}

/**
 * Bilinear sample; returns NaN if all corners invalid.
 */
function sampleBilinear(data, sw, sh, lonDeg, latDeg) {
  const px = ((lonDeg + 180) / 360) * sw - 0.5;
  const py = ((90 - latDeg) / 180) * sh - 0.5;
  const x0 = Math.floor(px);
  const y0 = Math.floor(py);
  const fx = px - x0;
  const fy = py - y0;
  let wSum = 0;
  let vSum = 0;
  for (let dy = 0; dy <= 1; dy++) {
    for (let dx = 0; dx <= 1; dx++) {
      const xi = Math.max(0, Math.min(sw - 1, x0 + dx));
      const yi = Math.max(0, Math.min(sh - 1, y0 + dy));
      const v = data[yi * sw + xi];
      if (!isValidT(v)) continue;
      const wx = dx === 0 ? 1 - fx : fx;
      const wy = dy === 0 ? 1 - fy : fy;
      const w = wx * wy;
      wSum += w;
      vSum += w * v;
    }
  }
  if (wSum < 1e-6) return Number.NaN;
  return vSum / wSum;
}

/** Nearest valid sample (expanding box) for ocean / nodata holes. */
function sampleNearest(data, sw, sh, lonDeg, latDeg) {
  const px = Math.round(((lonDeg + 180) / 360) * sw - 0.5);
  const py = Math.round(((90 - latDeg) / 180) * sh - 0.5);
  const maxR = Math.min(80, Math.max(sw, sh));
  for (let r = 0; r <= maxR; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const xi = Math.max(0, Math.min(sw - 1, px + dx));
        const yi = Math.max(0, Math.min(sh - 1, py + dy));
        const v = data[yi * sw + xi];
        if (isValidT(v)) return v;
      }
    }
  }
  return Number.NaN;
}

function sampleTemp(data, sw, sh, lonDeg, latDeg) {
  let t = sampleBilinear(data, sw, sh, lonDeg, latDeg);
  if (!Number.isFinite(t)) t = sampleNearest(data, sw, sh, lonDeg, latDeg);
  return t;
}

async function loadZipBuffer() {
  for (const p of ZIP_CANDIDATES) {
    if (p && fs.existsSync(p)) {
      console.log("[build-tavg-worldclim] Using zip:", p);
      return fs.readFileSync(p);
    }
  }
  console.log("[build-tavg-worldclim] Downloading", WC_URL);
  const res = await fetch(WC_URL, { redirect: "follow" });
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  fs.writeFileSync(path.join(PUBLIC_DIR, ZIP_NAME), buf);
  console.log("[build-tavg-worldclim] Saved", path.join(PUBLIC_DIR, ZIP_NAME));
  return buf;
}

async function main() {
  const zipBuf = await loadZipBuffer();
  const zip = await JSZip.loadAsync(zipBuf);

  const out = new Float32Array(12 * OUT_CELLS);
  const hScale = OUT_H > 1 ? OUT_H - 1 : 1;
  const wScale = OUT_W > 1 ? OUT_W - 1 : 1;

  for (let month = 1; month <= 12; month++) {
    const name = `wc2.1_10m_tavg_${String(month).padStart(2, "0")}.tif`;
    const entry = zip.file(name);
    if (!entry) throw new Error(`Zip missing ${name}`);
    const ab = await entry.async("arraybuffer");
    const tif = await fromArrayBuffer(ab);
    const img = await tif.getImage();
    const sw = img.getWidth();
    const sh = img.getHeight();
    const r = await img.readRasters();
    const src = r[0];
    let missing = 0;
    for (let j = 0; j < OUT_H; j++) {
      const latDeg = 90 - (j / hScale) * 180;
      for (let i = 0; i < OUT_W; i++) {
        const lonDeg = (i / wScale) * 360 - 180;
        const t = sampleTemp(src, sw, sh, lonDeg, latDeg);
        const oi = (month - 1) * OUT_CELLS + j * OUT_W + i;
        if (!Number.isFinite(t)) {
          out[oi] = 0;
          missing++;
        } else {
          out[oi] = t;
        }
      }
    }
    if (missing > 0) {
      console.warn(
        `[build-tavg-worldclim] Month ${month}: ${missing} cells had no valid sample (filled 0)`,
      );
    }
    console.log("[build-tavg-worldclim] Layer", month, "/", 12, "←", sw, "×", sh);
  }

  const header = Buffer.alloc(12);
  header.write("PG12", 0, 4, "ascii");
  header.writeUInt32LE(OUT_W, 4);
  header.writeUInt32LE(OUT_H, 8);
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  fs.writeFileSync(
    OUT_BIN,
    Buffer.concat([header, Buffer.from(out.buffer, out.byteOffset, out.byteLength)]),
  );
  console.log(
    "[build-tavg-worldclim] Wrote",
    OUT_BIN,
    `(${OUT_W}×${OUT_H} × 12, WorldClim 2.1 10m tavg, °C).`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
