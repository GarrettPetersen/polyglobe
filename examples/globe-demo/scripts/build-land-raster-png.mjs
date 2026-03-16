#!/usr/bin/env node
/**
 * Generate public/land-raster-debug.png (3600×1800) from the same TopoJSON + lakes the demo uses.
 * Matches in-browser demo resolution; raw land/water so straits show as water. Run from examples/globe-demo:
 * npm run build-land-raster-png
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createCanvas } from "canvas";
import * as topojson from "topojson-client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEMO_ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(DEMO_ROOT, "public");
const OUT_PATH = path.join(PUBLIC_DIR, "land-raster-debug.png");
const BIN_PATH = path.join(PUBLIC_DIR, "earth-region-grid.bin");

const LAND_LOCAL = path.join(PUBLIC_DIR, "land-110m.json");
const LAKES_LOCAL = path.join(PUBLIC_DIR, "ne_110m_lakes.json");
const MARINE_LOCAL = path.join(PUBLIC_DIR, "ne_110m_geography_marine_polys.json");
const LAND_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json";
const LAKES_URL = "https://cdn.jsdelivr.net/gh/martynafford/natural-earth-geojson@master/110m/physical/ne_110m_lakes.json";
const MARINE_POLYS_URL = "https://cdn.jsdelivr.net/gh/martynafford/natural-earth-geojson@master/110m/physical/ne_110m_geography_marine_polys.json";
/** Inland (landlocked) seas to punch out of land; open/connected seas (e.g. Caribbean) are already ocean. */
const INLAND_SEAS_WHITELIST = new Set(["Caspian Sea"]);

// Signed area in (lon, 90-lat); positive = CCW. Exterior = CCW (inside land), holes = CW (inside empty).
function ringSignedArea(ring) {
  let sum = 0;
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const x0 = ring[i][0], y0 = 90 - ring[i][1];
    const x1 = ring[(i + 1) % n][0], y1 = 90 - ring[(i + 1) % n][1];
    sum += (x1 - x0) * (y1 + y0);
  }
  return sum * 0.5;
}
function unwrapLon(currentLon, nextLon) {
  let n = nextLon;
  const d = n - currentLon;
  if (d > 180) n -= 360;
  else if (d < -180) n += 360;
  return n;
}

function ringBounds(ring) {
  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
  for (const [lon, lat] of ring) {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
  }
  return { latSpan: maxLat - minLat, lonSpan: maxLon - minLon };
}

function isArtifactGlobeLine(ring) {
  if (ring.length < 3) return false;
  const { latSpan, lonSpan } = ringBounds(ring);
  return latSpan < 2 && lonSpan >= 350;
}

function drawRingUnwrapped(ctx, ring, isExterior, toX, toY) {
  if (ring.length < 3) return;
  if (isExterior && isArtifactGlobeLine(ring)) return;
  const r = rewindRing(ring, isExterior);
  const [first, ...rest] = r;
  let currentLon = first[0];
  ctx.moveTo(toX(currentLon), toY(first[1]));
  for (const [lon, lat] of rest) {
    currentLon = unwrapLon(currentLon, lon);
    ctx.lineTo(toX(currentLon), toY(lat));
  }
  currentLon = unwrapLon(currentLon, first[0]);
  ctx.lineTo(toX(currentLon), toY(first[1]));
  ctx.closePath();
}

function lineToLonLat(ctx, fromLon, fromLat, toLon, toLat, toX, toY) {
  const rawD = toLon - fromLon;
  if (rawD > 180) {
    const totalShort = 360 - rawD;
    const distToCross = fromLon - (-180);
    const t = distToCross / totalShort;
    const latCross = fromLat + t * (toLat - fromLat);
    ctx.lineTo(toX(-180), toY(latCross));
    ctx.lineTo(toX(180), toY(latCross));
  } else if (rawD < -180) {
    const totalShort = 360 + rawD;
    const distToCross = 180 - fromLon;
    const t = distToCross / totalShort;
    const latCross = fromLat + t * (toLat - fromLat);
    ctx.lineTo(toX(180), toY(latCross));
    ctx.lineTo(toX(-180), toY(latCross));
  }
  ctx.lineTo(toX(toLon), toY(toLat));
}

function drawRing(ctx, ring, isExterior, toX, toY) {
  if (ring.length < 3) return;
  if (isExterior && isArtifactGlobeLine(ring)) return;
  const r = rewindRing(ring, isExterior);
  const [first, ...rest] = r;
  ctx.moveTo(toX(first[0]), toY(first[1]));
  let prevLon = first[0], prevLat = first[1];
  for (const [lon, lat] of rest) {
    lineToLonLat(ctx, prevLon, prevLat, lon, lat, toX, toY);
    prevLon = lon;
    prevLat = lat;
  }
  lineToLonLat(ctx, prevLon, prevLat, first[0], first[1], toX, toY);
  ctx.closePath();
}

function rewindRing(ring, isExterior) {
  const area = ringSignedArea(ring);
  const wantCcw = isExterior;
  const isCcw = area > 0;
  return isCcw !== wantCcw ? [...ring].reverse() : ring;
}

function drawGeometry(ctx, geom, toX, toY) {
  if (geom.type === "GeometryCollection") {
    for (const g of geom.geometries) drawGeometry(ctx, g, toX, toY);
    return;
  }
  if (geom.type === "Polygon") {
    ctx.beginPath();
    geom.coordinates.forEach((ring, i) => drawRing(ctx, ring, i === 0, toX, toY));
    ctx.fill("nonzero");
    return;
  }
  if (geom.type === "MultiPolygon") {
    ctx.beginPath();
    for (const polygon of geom.coordinates) {
      polygon.forEach((ring, i) => drawRing(ctx, ring, i === 0, toX, toY));
    }
    ctx.fill("nonzero");
  }
}

function drawGeometryUnwrapped(ctx, geom, toX, toY) {
  if (geom.type === "GeometryCollection") {
    for (const g of geom.geometries) drawGeometryUnwrapped(ctx, g, toX, toY);
    return;
  }
  if (geom.type === "Polygon") {
    ctx.beginPath();
    geom.coordinates.forEach((ring, i) => drawRingUnwrapped(ctx, ring, i === 0, toX, toY));
    ctx.fill("nonzero");
    return;
  }
  if (geom.type === "MultiPolygon") {
    ctx.beginPath();
    for (const polygon of geom.coordinates) {
      polygon.forEach((ring, i) => drawRingUnwrapped(ctx, ring, i === 0, toX, toY));
    }
    ctx.fill("nonzero");
  }
}

/** 8-connected components with x-wraparound. Filled cells (data[idx] !== 0) get id 1..N; rest 0. */
function connectedComponentsWrap(data, width, height) {
  const n = width * height;
  const out = new Uint32Array(n);
  let nextId = 1;
  const stack = [];
  const dx = [-1, 0, 1, -1, 1, -1, 0, 1];
  const dy = [-1, -1, -1, 0, 0, 1, 1, 1];
  for (let idx = 0; idx < n; idx++) {
    if (data[idx] === 0 || out[idx] !== 0) continue;
    const id = nextId++;
    stack.length = 0;
    stack.push(idx);
    out[idx] = id;
    while (stack.length > 0) {
      const c = stack.pop();
      const ci = c % width;
      const cj = Math.floor(c / width);
      for (let d = 0; d < 8; d++) {
        let ni = ci + dx[d];
        const nj = cj + dy[d];
        ni = ((ni % width) + width) % width;
        if (nj < 0 || nj >= height) continue;
        const nidx = nj * width + ni;
        if (data[nidx] === 0 || out[nidx] !== 0) continue;
        out[nidx] = id;
        stack.push(nidx);
      }
    }
  }
  return out;
}

async function main() {
  const width = 3600;
  const height = 1800;
  const wideWidth = 10800;

  async function loadJson(localPath, url) {
    if (fs.existsSync(localPath)) {
      return JSON.parse(fs.readFileSync(localPath, "utf8"));
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
    return res.json();
  }

  console.log("Loading land topology (local or fetch)...");
  const topology = await loadJson(LAND_LOCAL, LAND_URL);
  const land = topojson.feature(topology, topology.objects.land);

  const canvas = createCanvas(wideWidth, height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, wideWidth, height);
  ctx.fillStyle = "white";

  const scaleX = (wideWidth - 1) / 1080;
  const wrapLon = (lon) => ((lon + 180) % 360 + 360) % 360 - 180;
  const toXCenter = (lon) =>
    Math.max(0, Math.min(wideWidth - 1, (lon + 540) * scaleX));
  const toXLeft = (lon) =>
    Math.max(0, Math.min(wideWidth - 1, (lon + 180) * scaleX));
  const toXRight = (lon) =>
    Math.max(0, Math.min(wideWidth - 1, (lon + 900) * scaleX));
  const toY = (lat) =>
    Math.max(0, Math.min(height - 1, ((90 - lat) / 180) * (height - 1)));
  const toXLeftInThird = (lon) => toXLeft(wrapLon(lon));
  const toXRightInThird = (lon) => toXRight(wrapLon(lon));

  const threeWorlds = [toXLeftInThird, toXCenter, toXRightInThird];

  if (land.features) {
    for (const f of land.features) drawGeometryUnwrapped(ctx, f.geometry, toXCenter, toY);
  } else if (land.geometry) {
    drawGeometryUnwrapped(ctx, land.geometry, toXCenter, toY);
  }
  try {
    let lakes = null;
    if (fs.existsSync(LAKES_LOCAL)) {
      lakes = JSON.parse(fs.readFileSync(LAKES_LOCAL, "utf8"));
    } else {
      const lakesRes = await fetch(LAKES_URL);
      if (lakesRes.ok) lakes = await lakesRes.json();
    }
    if (lakes) {
      ctx.fillStyle = "black";
      if (lakes.features) {
        for (const toX of threeWorlds) {
          for (const f of lakes.features) {
            if (f.geometry) drawGeometryUnwrapped(ctx, f.geometry, toX, toY);
          }
        }
      }
    }
  } catch (e) {
    console.warn("Lakes load failed:", e.message);
  }
  const afterLandAndLakes = ctx.getImageData(0, 0, wideWidth, height);
  try {
    let fc = null;
    if (fs.existsSync(MARINE_LOCAL)) {
      fc = JSON.parse(fs.readFileSync(MARINE_LOCAL, "utf8"));
    } else {
      const marineRes = await fetch(MARINE_POLYS_URL);
      if (marineRes.ok) fc = await marineRes.json();
    }
    if (fc) {
      ctx.fillStyle = "black";
      if (fc.features) {
        for (const toX of threeWorlds) {
          for (const f of fc.features) {
            const name = (f.properties?.name ?? "").trim();
            if (!INLAND_SEAS_WHITELIST.has(name) || !f.geometry) continue;
            drawGeometryUnwrapped(ctx, f.geometry, toX, toY);
          }
        }
      }
      const marineDrawn = ctx.getImageData(0, 0, wideWidth, height);
      for (let i = 0; i < wideWidth * height * 4; i += 4) {
        if ((afterLandAndLakes.data[i] ?? 0) >= 128) {
          marineDrawn.data[i] = 255;
          marineDrawn.data[i + 1] = 255;
          marineDrawn.data[i + 2] = 255;
        }
      }
      ctx.putImageData(marineDrawn, 0, 0);
    }
  } catch (e) {
    console.warn("Marine polys load failed:", e.message);
  }

  const SOUTH_POLE_CAP_LAT = -80;
  const wideData = ctx.getImageData(0, 0, wideWidth, height);
  const scale = (wideWidth - 1) / 1080;
  const rawData = new Uint8Array(width * height);
  for (let j = 0; j < height; j++) {
    const lat = (height - 1) > 0 ? 90 - (180 * j) / (height - 1) : 0;
    const inSouthCap = lat <= SOUTH_POLE_CAP_LAT;
    for (let i = 0; i < width; i++) {
      const lon = (width - 1) > 0 ? -180 + (360 * i) / (width - 1) : 0;
      const xLeft = Math.max(0, Math.min(wideWidth - 1, Math.round((lon + 180) * scale)));
      const xCenter = Math.max(0, Math.min(wideWidth - 1, Math.round((lon + 540) * scale)));
      const xRight = Math.max(0, Math.min(wideWidth - 1, Math.round((lon + 900) * scale)));
      const land =
        inSouthCap ||
        (wideData.data[(j * wideWidth + xLeft) * 4] ?? 0) >= 128 ||
        (wideData.data[(j * wideWidth + xCenter) * 4] ?? 0) >= 128 ||
        (wideData.data[(j * wideWidth + xRight) * 4] ?? 0) >= 128;
      rawData[j * width + i] = land ? 255 : 0;
    }
  }

  console.log("Computing connected components (land)...");
  const landmassId = connectedComponentsWrap(rawData, width, height);
  const oceanMask = new Uint8Array(width * height);
  for (let idx = 0; idx < width * height; idx++) {
    oceanMask[idx] = rawData[idx] === 0 ? 255 : 0;
  }
  console.log("Computing connected components (ocean)...");
  const oceanRegionId = connectedComponentsWrap(oceanMask, width, height);

  if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });

  const n = width * height;
  const binBuf = Buffer.allocUnsafe(8 + n * 4 * 2);
  let off = 0;
  binBuf.writeUInt32LE(width, off); off += 4;
  binBuf.writeUInt32LE(height, off); off += 4;
  for (let i = 0; i < n; i++) binBuf.writeUInt32LE(landmassId[i], off + i * 4);
  off += n * 4;
  for (let i = 0; i < n; i++) binBuf.writeUInt32LE(oceanRegionId[i], off + i * 4);
  fs.writeFileSync(BIN_PATH, binBuf);
  console.log("Wrote", BIN_PATH, `(${width}×${height}, landmass + ocean IDs)`);

  const outCanvas = createCanvas(width, height);
  const outCtx = outCanvas.getContext("2d");
  const collapsed = outCtx.createImageData(width, height);
  for (let idx = 0; idx < n; idx++) {
    const v = rawData[idx] > 0 ? 255 : 0;
    collapsed.data[idx * 4] = v;
    collapsed.data[idx * 4 + 1] = v;
    collapsed.data[idx * 4 + 2] = v;
    collapsed.data[idx * 4 + 3] = 255;
  }
  outCtx.putImageData(collapsed, 0, 0);
  const pngBuf = outCanvas.toBuffer("image/png");
  fs.writeFileSync(OUT_PATH, pngBuf);
  console.log("Wrote", OUT_PATH, `(${width}×${height}, raw land/water)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
