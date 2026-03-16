#!/usr/bin/env node
/**
 * Build public/elevation.bin (360×180 float32, meters). Same-origin so demo can load it.
 * Run from examples/globe-demo: node scripts/build-elevation.mjs
 *
 * 1) Tries to download ETOPO1 global elevation from NOAA, then run scripts/etopo1_to_bin.py
 *    (requires Python 3 + netCDF4: pip install netCDF4) to produce 360×180 float32.
 * 2) If download or Python step fails, writes synthetic peaks (Himalayas, Rockies, etc.).
 *
 * Output: row 0 = north (90°N), longitude -180..180. Negative = bathymetry.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createWriteStream } from "fs";
import { createGunzip } from "zlib";
import { spawn } from "child_process";
import { tmpdir } from "os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEMO_ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(DEMO_ROOT, "public");
const OUT_PATH = path.join(PUBLIC_DIR, "elevation.bin");

const W = 360;
const H = 180;

const ETOPO1_GZ_URL =
  "https://www.ngdc.noaa.gov/mgg/global/relief/ETOPO1/data/bedrock/grid_registered/netcdf/ETOPO1_Bed_g_gmt4.grd.gz";
// Set to true to skip download and use synthetic (e.g. in CI or when offline)
const SKIP_ETOPO1_DOWNLOAD = process.env.SKIP_ETOPO1_DOWNLOAD === "1";

// Synthetic peaks (lat_deg, lon_deg, amplitude_m, sigma_deg) when ETOPO1 unavailable
const PEAKS = [
  [28, 87, 6000, 8], [30, 81, 5500, 8], [35, 76, 5500, 8], [27, 88, 5800, 8],
  [53, -118, 3500, 6], [51, -115, 3600, 6], [45, -110, 3200, 6], [43, -109, 3800, 6],
  [40, -105, 4000, 6], [38, -106, 4200, 6], [35, -106, 3200, 6], [32, -107, 2800, 6],
  [-15, -72, 5000, 8], [-2, -78, 5800, 8], [-33, -70, 5500, 8], [-35, -70, 4000, 6],
  [46, 10, 3500, 6], [45, 7, 3800, 6], [43, 12, 2800, 6], [42, 44, 4500, 8], [35, 65, 2500, 8],
  [-35, 148, 2000, 8], [60, -140, 4500, 6], [63, -150, 3500, 6],
];

function bump(latDeg, lonDeg, lat0, lon0, amp, sigma) {
  let dlon = lonDeg - lon0;
  while (dlon > 180) dlon -= 360;
  while (dlon < -180) dlon += 360;
  const d2 = (latDeg - lat0) ** 2 + dlon ** 2;
  return amp * Math.exp(-d2 / (2 * sigma * sigma));
}

function writeSynthetic() {
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
  console.log("[build-elevation] Wrote", OUT_PATH, "(synthetic peaks, no ETOPO1).");
}

function streamDownload(url, destPath) {
  return new Promise((resolve, reject) => {
    fetch(url, { redirect: "follow" })
      .then((res) => {
        if (!res.ok) {
          reject(new Error(`Download failed: ${res.status}`));
          return;
        }
        const file = createWriteStream(destPath);
        res.body.pipe(file);
        file.on("finish", () => file.close(() => resolve(destPath)));
        file.on("error", reject);
      })
      .catch(reject);
  });
}

function gunzipFile(srcPath, destPath) {
  return new Promise((resolve, reject) => {
    const src = fs.createReadStream(srcPath);
    const dest = createWriteStream(destPath);
    const gunzip = createGunzip();
    src.pipe(gunzip).pipe(dest);
    dest.on("finish", () => resolve(destPath));
    gunzip.on("error", reject);
    dest.on("error", reject);
  });
}

function runPython(scriptPath, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn("python3", [scriptPath, ...args], { stdio: "inherit" });
    proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error("Python exited " + code))));
    proc.on("error", reject);
  });
}

async function main() {
  const pythonScript = path.join(__dirname, "etopo1_to_bin.py");
  const ts = Date.now();
  const tmpGz = path.join(tmpdir(), `etopo1_${ts}.grd.gz`);
  const tmpGrd = path.join(tmpdir(), `etopo1_${ts}.grd`);

  try {
    if (SKIP_ETOPO1_DOWNLOAD) throw new Error("SKIP_ETOPO1_DOWNLOAD=1");
    console.log("[build-elevation] Downloading ETOPO1 from NOAA (~383 MB)...");
    await streamDownload(ETOPO1_GZ_URL, tmpGz);
    if (!fs.existsSync(tmpGz)) throw new Error("Downloaded file not found");
    console.log("[build-elevation] Decompressing...");
    await gunzipFile(tmpGz, tmpGrd);
    if (!fs.existsSync(tmpGrd)) throw new Error("Decompress failed");
    if (!fs.existsSync(pythonScript)) throw new Error("etopo1_to_bin.py not found");
    console.log("[build-elevation] Running etopo1_to_bin.py...");
    if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });
    await runPython(pythonScript, [tmpGrd, OUT_PATH]);
    try { fs.unlinkSync(tmpGz); } catch (_) {}
    try { fs.unlinkSync(tmpGrd); } catch (_) {}
    console.log("[build-elevation] Wrote", OUT_PATH, "(ETOPO1 360×180 float32 m).");
  } catch (e) {
    console.warn("[build-elevation] ETOPO1 failed:", e.message);
    console.log("[build-elevation] Using synthetic elevation.");
    writeSynthetic();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
