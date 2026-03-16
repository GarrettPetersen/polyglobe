#!/usr/bin/env node
/**
 * Generate public/land-raster-debug.png (360×180) from the same TopoJSON + lakes
 * the demo uses. Run from examples/globe-demo: npm run build-land-raster-png
 * Use this to inspect whether northern-hemisphere rings are in the map data.
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

const LAND_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json";
const LAKES_URL =
  "https://cdn.jsdelivr.net/gh/martynafford/natural-earth-geojson@master/110m/physical/ne_110m_lakes.json";

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

async function main() {
  const width = 360;
  const height = 180;
  const wideWidth = 1080;

  console.log("Fetching", LAND_URL, "...");
  const landRes = await fetch(LAND_URL);
  if (!landRes.ok) throw new Error(`Land HTTP ${landRes.status}`);
  const topology = await landRes.json();
  const land = topojson.feature(topology, topology.objects.land);

  const canvas = createCanvas(wideWidth, height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, wideWidth, height);
  ctx.fillStyle = "white";

  const toX = (lon) =>
    Math.max(0, Math.min(wideWidth - 1, (lon + 540) * (wideWidth - 1) / 1080));
  const toY = (lat) =>
    Math.max(0, Math.min(height - 1, ((90 - lat) / 180) * (height - 1)));

  if (land.features) {
    for (const f of land.features) drawGeometryUnwrapped(ctx, f.geometry, toX, toY);
  } else if (land.geometry) {
    drawGeometryUnwrapped(ctx, land.geometry, toX, toY);
  }

  try {
    const lakesRes = await fetch(LAKES_URL);
    if (lakesRes.ok) {
      const lakes = await lakesRes.json();
      ctx.fillStyle = "black";
      if (lakes.features) {
        for (const f of lakes.features) {
          if (f.geometry) drawGeometryUnwrapped(ctx, f.geometry, toX, toY);
        }
      }
    }
  } catch (e) {
    console.warn("Lakes fetch failed:", e.message);
  }

  const SOUTH_POLE_CAP_LAT = -80;
  const wideData = ctx.getImageData(0, 0, wideWidth, height);
  const scale = (wideWidth - 1) / 1080;
  const outCanvas = createCanvas(width, height);
  const outCtx = outCanvas.getContext("2d");
  const collapsed = outCtx.createImageData(width, height);
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
      const v = land ? 255 : 0;
      const outIdx = (j * width + i) * 4;
      collapsed.data[outIdx] = v;
      collapsed.data[outIdx + 1] = v;
      collapsed.data[outIdx + 2] = v;
      collapsed.data[outIdx + 3] = 255;
    }
  }
  outCtx.putImageData(collapsed, 0, 0);

  if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  const buf = outCanvas.toBuffer("image/png");
  fs.writeFileSync(OUT_PATH, buf);
  console.log("Wrote", OUT_PATH, "(360×180, 3×-wide unwrapped then OR-collapsed)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
