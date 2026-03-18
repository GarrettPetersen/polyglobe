import { readFileSync } from "fs";
import { join } from "path";
import {
  tileCenterToLatLon,
  type GeodesicTile,
  type RegionScores,
  type RasterWindow,
  type EarthRaster,
} from "../../src/index.js";

const EARTH_LAKES = "ne_110m_lakes.json";
const EARTH_MARINE = "ne_110m_geography_marine_polys.json";
const EARTH_BIN = "earth-region-grid.bin";

type GeoJSONPolygon = { type: "Polygon"; coordinates: number[][][] };
type GeoJSONMultiPolygon = { type: "MultiPolygon"; coordinates: number[][][][] };
type GeoJSONGeometry = GeoJSONPolygon | GeoJSONMultiPolygon | { type: "GeometryCollection"; geometries: GeoJSONGeometry[] };

/** Signed area of a ring in (lon, 90-lat) space; positive = counter-clockwise (exterior per GeoJSON). TopoJSON often uses CW for outer rings, which inverts fill. */
function ringSignedArea(ring: number[][]): number {
  let sum = 0;
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const [x0, ,] = ring[i];
    const [x1, ,] = ring[(i + 1) % n];
    const y0 = 90 - ring[i][1];
    const y1 = 90 - ring[(i + 1) % n][1];
    sum += (x1 - x0) * (y1 + y0);
  }
  return sum * 0.5;
}

/** Rewind for canvas nonzero: exterior (first ring) = CCW so inside = land; holes (later rings) = CW so inside = empty. Fixes inverted holes (e.g. rings through Greenland, Brazil). */
function rewindRing(ring: number[][], isExterior: boolean): number[][] {
  const area = ringSignedArea(ring);
  const wantCcw = isExterior;
  const isCcw = area > 0;
  return isCcw !== wantCcw ? [...ring].reverse() : ring;
}
/**
 * Point-in-polygon via ray casting. Edges that cross the antimeridian (|Δlon| > 180°) are
 * treated as the short path (two segments at ±180°) so land/water is correct for any lon.
 */
/** Test if horizontal ray from (px, py) eastward intersects segment (xa,ya)-(xb,yb); count once if so. */
function segmentCrossesRay(xa: number, ya: number, xb: number, yb: number, px: number, py: number): boolean {
  if (ya === yb) return false;
  if ((ya <= py && py < yb) || (yb <= py && py < ya)) {
    const t = (py - ya) / (yb - ya);
    if (t >= 0 && t <= 1) {
      const xHit = xa + t * (xb - xa);
      return xHit >= px;
    }
  }
  return false;
}

function rayCrossingCount(ring: number[][], px: number, py: number): number {
  const n = ring.length;
  let count = 0;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[(i + 1) % n];
    const rawD = x1 - x0;
    if (Math.abs(rawD) > 180) {
      const crossLon = rawD > 0 ? -180 : 180;
      const totalShort = 360 - Math.abs(rawD);
      const distToCross = rawD > 0 ? x0 - crossLon : crossLon - x0;
      const tCross = distToCross / totalShort;
      const yCross = y0 + tCross * (y1 - y0);
      const otherLon = crossLon === 180 ? -180 : 180;
      if (segmentCrossesRay(x0, y0, crossLon, yCross, px, py)) count++;
      if (segmentCrossesRay(otherLon, yCross, x1, y1, px, py)) count++;
    } else {
      if (segmentCrossesRay(x0, y0, x1, y1, px, py)) count++;
    }
  }
  return count;
}

function pointInRing(ring: number[][], lonDeg: number, latDeg: number): boolean {
  return rayCrossingCount(ring, lonDeg, latDeg) % 2 === 1;
}

function pointInPolygon(polygon: number[][][], lonDeg: number, latDeg: number): boolean {
  if (polygon.length === 0) return false;
  const exterior = polygon[0];
  if (!pointInRing(exterior, lonDeg, latDeg)) return false;
  for (let i = 1; i < polygon.length; i++) {
    if (pointInRing(polygon[i], lonDeg, latDeg)) return false;
  }
  return true;
}
function collectLakePolygons(geom: GeoJSONGeometry): number[][][][] {
  const out: number[][][][] = [];
  const push = (g: GeoJSONGeometry) => {
    if (g.type === "Polygon") {
      out.push(g.coordinates.map((ring, i) => rewindRing(ring, i === 0)));
    } else if (g.type === "MultiPolygon") {
      for (const polygon of g.coordinates) {
        out.push(polygon.map((ring, i) => rewindRing(ring, i === 0)));
      }
    } else if (g.type === "GeometryCollection") {
      for (const child of g.geometries) push(child);
    }
  };
  push(geom);
  return out;
}
function createGetRasterWindow(
  width: number,
  height: number,
  landData: Uint8Array
): (tile: GeodesicTile) => RasterWindow | null {
  const PAD = 4;
  return (tile: GeodesicTile) => {
    const points = [tileCenterToLatLon(tile.center)];
    for (const v of tile.vertices) points.push(tileCenterToLatLon(v));
    let iMin = width;
    let iMax = -1;
    let jMin = height;
    let jMax = -1;
    for (const { lat, lon } of points) {
      const latDeg = (lat * 180) / Math.PI;
      const lonDeg = (lon * 180) / Math.PI;
      const i = Math.round(((lonDeg + 180) / 360) * (width - 1));
      const j = Math.round(((90 - latDeg) / 180) * (height - 1));
      iMin = Math.min(iMin, i);
      iMax = Math.max(iMax, i);
      jMin = Math.min(jMin, j);
      jMax = Math.max(jMax, j);
    }
    iMin = Math.max(0, iMin - PAD);
    iMax = Math.min(width - 1, iMax + PAD);
    jMin = Math.max(0, jMin - PAD);
    jMax = Math.min(height - 1, jMax + PAD);
    const w = iMax - iMin + 1;
    const h = jMax - jMin + 1;
    if (w < 2 || h < 2) return null;
    const data = new Uint8Array(w * h);
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const si = iMin + i;
        const sj = jMin + j;
        data[j * w + i] = (landData[sj * width + si] ?? 0) >= 128 ? 255 : 0;
      }
    }
    return { width: w, height: h, data };
  };
}

/** Same as createRegionScorer but lakes come from on-demand point-in-polygon (for precomputed bin; no lake grid). */
function createRegionScorerFromBin(
  landmassId: Uint32Array,
  oceanRegionId: Uint32Array,
  width: number,
  height: number,
  lakePolygons: number[][][][]
): (tile: GeodesicTile) => RegionScores {
  return (tile: GeodesicTile) => {
    const points: { lat: number; lon: number }[] = [tileCenterToLatLon(tile.center)];
    for (const v of tile.vertices) {
      points.push(tileCenterToLatLon(v));
    }
    const landmassCounts = new Map<number, number>();
    const oceanCounts = new Map<number, number>();
    const lakeCounts = new Map<number, number>();
    let landTotal = 0;
    for (const { lat, lon } of points) {
      const latDeg = (lat * 180) / Math.PI;
      const lonDeg = (lon * 180) / Math.PI;
      const i = Math.max(0, Math.min(width - 1, Math.round(((lonDeg + 180) / 360) * (width - 1))));
      const j = Math.max(0, Math.min(height - 1, Math.round(((90 - latDeg) / 180) * (height - 1))));
      const idx = j * width + i;
      const lm = landmassId[idx];
      const oc = oceanRegionId[idx];
      if (lm !== 0) {
        landTotal++;
        landmassCounts.set(lm, (landmassCounts.get(lm) ?? 0) + 1);
      }
      if (oc !== 0) oceanCounts.set(oc, (oceanCounts.get(oc) ?? 0) + 1);
      for (let k = 0; k < lakePolygons.length; k++) {
        if (pointInPolygon(lakePolygons[k], lonDeg, latDeg)) {
          lakeCounts.set(k + 1, (lakeCounts.get(k + 1) ?? 0) + 1);
          break;
        }
      }
    }
    const n = points.length;
    const landmassFractions = new Map<number, number>();
    for (const [id, count] of landmassCounts) landmassFractions.set(id, count / n);
    const oceanFractions = new Map<number, number>();
    for (const [id, count] of oceanCounts) oceanFractions.set(id, count / n);
    const lakeFractions = new Map<number, number>();
    for (const [id, count] of lakeCounts) lakeFractions.set(id, count / n);
    return {
      landFraction: landTotal / n,
      landmassFractions,
      oceanFractions,
      lakeFractions,
    };
  };
}

function loadMarinePolygonsSync(publicDir: string): number[][][][] {
  const out: number[][][][] = [];
  try {
    const raw = readFileSync(join(publicDir, EARTH_MARINE), "utf8");
    const fc = JSON.parse(raw) as {
      features?: Array<{ geometry: GeoJSONGeometry; properties?: { featurecla?: string } }>;
    };
    for (const f of fc.features ?? []) {
      const cla = f.properties?.featurecla;
      if ((cla === "sea" || cla === "bay") && f.geometry) {
        out.push(...collectLakePolygons(f.geometry));
      }
    }
  } catch {
    /* optional */
  }
  return out;
}

/** Same bin + lakes + marine path as browser loadEarthLandRaster (public/). */
export function loadEarthBinRasterForCache(publicDir: string): {
  raster: EarthRaster;
  getRegionScores: (tile: GeodesicTile) => RegionScores;
  getRasterWindow: (tile: GeodesicTile) => RasterWindow | null;
} | null {
  let buf: Buffer;
  try {
    buf = readFileSync(join(publicDir, EARTH_BIN));
  } catch {
    return null;
  }
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const width = dv.getUint32(0, true);
  const height = dv.getUint32(4, true);
  const n = width * height;
  const off = buf.byteOffset + 8;
  const landmassId = new Uint32Array(buf.buffer, off, n);
  const oceanRegionId = new Uint32Array(buf.buffer, off + n * 4, n);
  let lakePolygons: number[][][][] = [];
  try {
    const lakes = JSON.parse(readFileSync(join(publicDir, EARTH_LAKES), "utf8")) as {
      features?: Array<{ geometry: GeoJSONGeometry }>;
    };
    for (const f of lakes.features ?? []) {
      if (f.geometry) lakePolygons = lakePolygons.concat(collectLakePolygons(f.geometry));
    }
  } catch {
    /* optional */
  }
  lakePolygons = lakePolygons.concat(loadMarinePolygonsSync(publicDir));
  const getRegionScores = createRegionScorerFromBin(landmassId, oceanRegionId, width, height, lakePolygons);
  const rasterData = new Uint8Array(n);
  for (let i = 0; i < n; i++) rasterData[i] = landmassId[i] !== 0 ? 255 : 0;
  const raster: EarthRaster = { width, height, data: rasterData };
  const getRasterWindow = createGetRasterWindow(width, height, rasterData);
  return { raster, getRegionScores, getRasterWindow };
}
