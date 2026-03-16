#!/usr/bin/env node
/**
 * Find rings in world-atlas land that touch the North Atlantic (Norway–Greenland–Iceland).
 * These can cause "land bridge" (ocean filled as land) or "Iceland as lake" (island as hole).
 * Run from examples/globe-demo: node scripts/inspect-north-atlantic-rings.mjs
 */

import * as topojson from "topojson-client";

const LAND_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json";

// North Atlantic: ocean between Norway, Iceland, Greenland. Rough box.
const NORTH_ATLANTIC_LAT_MIN = 58;
const NORTH_ATLANTIC_LAT_MAX = 85;
const NORTH_ATLANTIC_LON_MIN = -45;
const NORTH_ATLANTIC_LON_MAX = 25;

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

function ringCentroid(ring) {
  let cx = 0, cy = 0;
  for (const [lon, lat] of ring) {
    cx += lon;
    cy += lat;
  }
  const n = ring.length;
  return [cx / n, cy / n];
}

function ringBbox(ring) {
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const [lon, lat] of ring) {
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  return { minLon, maxLon, minLat, maxLat };
}

function isArtifactGlobeLine(ring) {
  if (ring.length < 3) return false;
  const { minLon, maxLon, minLat, maxLat } = ringBbox(ring);
  const latSpan = maxLat - minLat;
  const lonSpan = maxLon - minLon;
  return latSpan < 2 && lonSpan >= 350;
}

function pointInNorthAtlantic(lon, lat) {
  return lat >= NORTH_ATLANTIC_LAT_MIN && lat <= NORTH_ATLANTIC_LAT_MAX &&
    lon >= NORTH_ATLANTIC_LON_MIN && lon <= NORTH_ATLANTIC_LON_MAX;
}

async function main() {
  const res = await fetch(LAND_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const topology = await res.json();
  const land = topojson.feature(topology, topology.objects.land);

  const geom = land.features ? { type: "GeometryCollection", geometries: land.features.map((f) => f.geometry) } : land.geometry;
  const multi = geom.type === "GeometryCollection" ? geom.geometries[0] : geom;
  if (multi.type !== "MultiPolygon") {
    console.log("Unexpected geometry type:", multi.type);
    return;
  }

  console.log("North Atlantic box: lat", NORTH_ATLANTIC_LAT_MIN, "-", NORTH_ATLANTIC_LAT_MAX, ", lon", NORTH_ATLANTIC_LON_MIN, "-", NORTH_ATLANTIC_LON_MAX);
  console.log("(Ocean between Norway, Iceland, Greenland)\n");

  const suspects = [];
  let ringIndex = 0;
  for (let pi = 0; pi < multi.coordinates.length; pi++) {
    const polygon = multi.coordinates[pi];
    for (let ri = 0; ri < polygon.length; ri++) {
      const ring = polygon[ri];
      const area = ringSignedArea(ring);
      const isCw = area < 0;
      const bbox = ringBbox(ring);
      const [clon, clat] = ringCentroid(ring);
      const latSpan = bbox.maxLat - bbox.minLat;
      const lonSpan = bbox.maxLon - bbox.minLon;
      const isArtifact = isArtifactGlobeLine(ring);

      // Exterior (ring 0) with CCW: "inside" = land. If centroid is in North Atlantic ocean, we're filling ocean as land.
      // Hole (ring 1+) with CW: "inside" = empty. If centroid is Iceland, we're punching Iceland out = Iceland as lake.
      const centroidInNA = pointInNorthAtlantic(clon, clat);
      const bboxOverlapsNA = bbox.maxLat >= NORTH_ATLANTIC_LAT_MIN && bbox.minLat <= NORTH_ATLANTIC_LAT_MAX &&
        bbox.maxLon >= NORTH_ATLANTIC_LON_MIN && bbox.minLon <= NORTH_ATLANTIC_LON_MAX;

      if (bboxOverlapsNA && (centroidInNA || lonSpan >= 180)) {
        suspects.push({
          polygonIndex: pi,
          ringIndex: ri,
          isExterior: ri === 0,
          winding: isCw ? "CW" : "CCW",
          area,
          centroid: [clat.toFixed(1), clon.toFixed(1)],
          bbox: { minLat: bbox.minLat.toFixed(1), maxLat: bbox.maxLat.toFixed(1), minLon: bbox.minLon.toFixed(1), maxLon: bbox.maxLon.toFixed(1) },
          latSpan: latSpan.toFixed(1),
          lonSpan: lonSpan.toFixed(1),
          isArtifactGlobeLine: isArtifact,
          centroidInNA,
        });
      }
      ringIndex++;
    }
  }

  console.log("Rings overlapping North Atlantic with centroid in NA or lonSpan>=180:\n");
  for (const s of suspects) {
    console.log(JSON.stringify(s, null, 0));
    if (s.isExterior && s.centroidInNA && !s.isArtifactGlobeLine) {
      console.log("  ^ EXTERIOR ring with centroid in North Atlantic → we fill this as LAND → ocean becomes land bridge");
    }
    if (!s.isExterior && s.centroidInNA) {
      console.log("  ^ HOLE with centroid in North Atlantic → we punch this out → could make Iceland a lake");
    }
  }

  // Also list rings that wrap longitude (lonSpan >= 350) but we don't skip (latSpan >= 2)
  console.log("\n\nRings with lonSpan >= 350 that we do NOT skip (latSpan >= 2):");
  ringIndex = 0;
  for (let pi = 0; pi < multi.coordinates.length; pi++) {
    const polygon = multi.coordinates[pi];
    for (let ri = 0; ri < polygon.length; ri++) {
      const ring = polygon[ri];
      const bbox = ringBbox(ring);
      const latSpan = bbox.maxLat - bbox.minLat;
      const lonSpan = bbox.maxLon - bbox.minLon;
      if (lonSpan >= 350 && latSpan >= 2) {
        const [clon, clat] = ringCentroid(ring);
        const area = ringSignedArea(ring);
        console.log({ polygonIndex: pi, ringIndex: ri, isExterior: ri === 0, latSpan: latSpan.toFixed(1), lonSpan: lonSpan.toFixed(1), centroidLat: clat.toFixed(1), centroidLon: clon.toFixed(1), area });
      }
      ringIndex++;
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
