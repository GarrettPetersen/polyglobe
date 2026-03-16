#!/usr/bin/env node
/**
 * Build public/koppen.bin from Peel et al. Köppen ASCII (no CORS in Node).
 * Run from examples/globe-demo: node scripts/build-koppen.mjs
 * Then the demo loads /koppen.bin and gets correct deserts/rainforest without zip fetch.
 */

import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import JSZip from "jszip";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEMO_ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(DEMO_ROOT, "public");
const OUT_PATH = path.join(PUBLIC_DIR, "koppen.bin");
const ZIP_LOCAL = path.join(PUBLIC_DIR, "koppen_ascii.zip");
const KOPPEN_ZIP_URL =
  "https://people.eng.unimelb.edu.au/mpeel/Koppen/koppen_ascii.zip";

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

function parseArcGisAscii(content) {
  const lines = content.trim().split(/\r?\n/);
  const header = {};
  let i = 0;
  while (i < lines.length) {
    const m = lines[i].match(/^\s*(\w+)\s+(-?\d+(?:\.\d*)?)\s*$/);
    if (!m) break;
    header[m[1].toLowerCase()] = Number(m[2]);
    i++;
  }
  const ncols = header.ncols ?? 0;
  const nrows = header.nrows ?? 0;
  const nodata = header.nodata_value ?? -9999;
  if (ncols <= 0 || nrows <= 0) throw new Error("Invalid ncols/nrows");
  const data = new Uint8Array(ncols * nrows);
  let idx = 0;
  for (; i < lines.length && idx < data.length; i++) {
    const tokens = lines[i].trim().split(/\s+/);
    for (const t of tokens) {
      if (idx >= data.length) break;
      const v = Number(t);
      data[idx++] =
        Number.isFinite(v) && v !== nodata && v >= 0 && v <= 31
          ? Math.round(v)
          : 0;
    }
  }
  return { width: ncols, height: nrows, data };
}

function downsampleTo360x180(grid) {
  const w = 360;
  const h = 180;
  const out = new Uint8Array(w * h);
  const blockW = Math.floor(grid.width / w);
  const blockH = Math.floor(grid.height / h);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const counts = new Map();
      for (let dy = 0; dy < blockH; dy++) {
        for (let dx = 0; dx < blockW; dx++) {
          const sy = j * blockH + dy;
          const sx = i * blockW + dx;
          if (sy >= grid.height || sx >= grid.width) continue;
          const v = grid.data[sy * grid.width + sx];
          if (v > 0) counts.set(v, (counts.get(v) ?? 0) + 1);
        }
      }
      let mode = 0;
      let maxCount = 0;
      for (const [val, count] of counts) {
        if (count > maxCount) {
          maxCount = count;
          mode = val;
        }
      }
      out[j * w + i] = mode;
    }
  }
  return out;
}

async function main() {
  let zipBuf;
  if (fs.existsSync(ZIP_LOCAL)) {
    console.log("Reading", ZIP_LOCAL, "...");
    zipBuf = fs.readFileSync(ZIP_LOCAL);
  } else {
    console.log("Fetching", KOPPEN_ZIP_URL, "...");
    zipBuf = await fetchUrl(KOPPEN_ZIP_URL);
    if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });
    fs.writeFileSync(ZIP_LOCAL, zipBuf);
    console.log("Saved", ZIP_LOCAL, "for next time.");
  }
  const zip = await JSZip.loadAsync(zipBuf);
  const names = Object.keys(zip.files).filter((n) => /\.(asc|txt)$/i.test(n));
  const name = names[0] ?? Object.keys(zip.files)[0];
  if (!name) {
    console.error("No .asc/.txt in zip");
    process.exit(1);
  }
  const text = await zip.files[name].async("string");
  console.log("Parsing ASCII...");
  const grid = parseArcGisAscii(text);
  console.log("Source grid:", grid.width, "x", grid.height);
  const out = downsampleTo360x180(grid);
  if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  fs.writeFileSync(OUT_PATH, out);
  console.log("Wrote", OUT_PATH, out.length, "bytes");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
