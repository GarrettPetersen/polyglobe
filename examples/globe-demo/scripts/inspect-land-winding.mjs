#!/usr/bin/env node
/**
 * Inspect world-atlas land TopoJSON: list rings that touch polar regions and their winding.
 * Run from examples/globe-demo: node scripts/inspect-land-winding.mjs
 * Source of northern/southern stripe: TopoJSON uses CW for outer rings; canvas "nonzero" then fills the wrong side. Fix: rewind rings to CCW before drawing (see main.ts rewindRing).
 */

import * as topojson from "topojson-client";

const LAND_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json";

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

function ringsInGeometry(geom, out = []) {
  if (geom.type === "GeometryCollection") {
    for (const g of geom.geometries) ringsInGeometry(g, out);
    return out;
  }
  if (geom.type === "Polygon") {
    for (const ring of geom.coordinates) out.push(ring);
    return out;
  }
  if (geom.type === "MultiPolygon") {
    for (const polygon of geom.coordinates) {
      for (const ring of polygon) out.push(ring);
    }
    return out;
  }
  return out;
}

function maxAbsLat(ring) {
  let m = 0;
  for (const [, lat] of ring) m = Math.max(m, Math.abs(lat));
  return m;
}

async function main() {
  const res = await fetch(LAND_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const topology = await res.json();
  const land = topojson.feature(topology, topology.objects.land);
  const bbox = topology.bbox || [];
  console.log("Topology bbox (lon, lat):", bbox);
  console.log("(Data does not extend to ±90°; polar bands are at the limit of the geometry.)\n");

  const rings = ringsInGeometry(land.features ? { type: "GeometryCollection", geometries: land.features.map((f) => f.geometry) } : land.geometry);
  let polarCw = 0, polarCcw = 0, otherCw = 0, otherCcw = 0;
  const polarRings = [];
  for (let i = 0; i < rings.length; i++) {
    const ring = rings[i];
    const area = ringSignedArea(ring);
    const isCw = area < 0;
    const lat = maxAbsLat(ring);
    if (lat >= 70) {
      polarRings.push({ index: i, maxAbsLat: lat.toFixed(1), winding: isCw ? "CW" : "CCW", area });
      if (isCw) polarCw++; else polarCcw++;
    } else {
      if (isCw) otherCw++; else otherCcw++;
    }
  }
  console.log("Rings with max |lat| >= 70° (polar):", polarRings.length);
  console.log("  Clockwise (CW):", polarCw, "→ with canvas nonzero these fill as WATER (inverted)");
  console.log("  Counter-clockwise (CCW):", polarCcw);
  if (polarRings.length <= 20) {
    console.log("  Polar rings:", polarRings);
  } else {
    console.log("  First 10 polar rings:", polarRings.slice(0, 10));
  }
  console.log("\nOther rings (|lat| < 70): CW =", otherCw, ", CCW =", otherCcw);
  console.log("\nConclusion: TopoJSON outer rings are often CW. Rewind to CCW before drawing to fix the stripe.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
