#!/usr/bin/env node
/**
 * Build public/elevation.bin (360×180 float32, meters). Same-origin so demo can load it.
 * Run from examples/globe-demo: node scripts/build-elevation.mjs
 *
 * Downloads ETOPO1 global elevation from NOAA, then runs scripts/etopo1_to_bin.py
 * (requires Python 3 + netCDF4: pip install netCDF4) to produce PGEL float32.
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

/** Equirectangular DEM resolution (PGEL format). ~0.083° cells at 4320×2160 (~8km). */
const EW = 4320;
const EH = 2160;

const ETOPO1_GZ_URL =
  "https://www.ngdc.noaa.gov/mgg/global/relief/ETOPO1/data/bedrock/grid_registered/netcdf/ETOPO1_Bed_g_gmt4.grd.gz";
const SKIP_ETOPO1_DOWNLOAD = process.env.SKIP_ETOPO1_DOWNLOAD === "1";

import { Readable } from "stream";

async function streamDownload(url, destPath) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`Download failed: ${res.status}`);
  }
  const file = createWriteStream(destPath);
  // Convert web ReadableStream to Node.js stream
  const nodeStream = Readable.fromWeb(res.body);
  return new Promise((resolve, reject) => {
    nodeStream.pipe(file);
    file.on("finish", () => file.close(() => resolve(destPath)));
    file.on("error", reject);
    nodeStream.on("error", reject);
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

function runOnePython(python, scriptPath, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(python, [scriptPath, ...args], { stdio: "inherit" });
    proc.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${python} exited ${code}`)),
    );
    proc.on("error", reject);
  });
}

async function runPython(scriptPath, args) {
  const candidates = [
    process.env.PYTHON3_PATH,
    "python3",
    "python",
    "/Library/Frameworks/Python.framework/Versions/3.11/bin/python3",
  ].filter(Boolean);
  let lastErr = null;
  for (const py of candidates) {
    try {
      console.log("[build-elevation] Trying Python:", py);
      await runOnePython(py, scriptPath, args);
      return;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("No working Python interpreter found");
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
    console.log("[build-elevation] Running etopo1_to_bin.py on", tmpGrd, "...");
    console.log("[build-elevation] tmpGrd exists:", fs.existsSync(tmpGrd), "size:", fs.existsSync(tmpGrd) ? fs.statSync(tmpGrd).size : 0);
    if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });
    await runPython(pythonScript, [tmpGrd, OUT_PATH, String(EW), String(EH)]);
    try { fs.unlinkSync(tmpGz); } catch (_) {}
    try { fs.unlinkSync(tmpGrd); } catch (_) {}
    console.log("[build-elevation] Wrote", OUT_PATH, `(ETOPO1 PGEL ${EW}×${EH} m).`);
  } catch (e) {
    console.warn("[build-elevation] ETOPO1 failed:", e.message);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
