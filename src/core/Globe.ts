/**
 * Main globe object: holds geodesic tiles, mesh, and tile lookup.
 */

import * as THREE from "three";
import {
  buildGeodesicTiles,
  createGeodesicGeometry,
  type GeodesicTile,
  type GeodesicMeshOptions,
} from "./geodesic.js";

export interface GlobeOptions extends GeodesicMeshOptions {
  subdivisions?: number;
}

const DIR_GRID_LON = 72;
const DIR_GRID_LAT = 36;

function directionToLonLat(dir: THREE.Vector3): { lon: number; lat: number } {
  const y = THREE.MathUtils.clamp(dir.y, -1, 1);
  return {
    lat: Math.asin(y),
    lon: Math.atan2(dir.z, dir.x),
  };
}

function lonLatToGridCell(lon: number, lat: number): { i: number; j: number } {
  const i = Math.floor(((lon + Math.PI) / (2 * Math.PI)) * DIR_GRID_LON) % DIR_GRID_LON;
  const j = Math.max(0, Math.min(DIR_GRID_LAT - 1, Math.floor((lat + Math.PI / 2) / Math.PI * DIR_GRID_LAT)));
  return { i: i < 0 ? i + DIR_GRID_LON : i, j };
}

export class Globe {
  readonly radius: number;
  readonly subdivisions: number;
  readonly tiles: GeodesicTile[];
  readonly mesh: THREE.Mesh;
  /** Tile-center latitude in degrees (geodesic center, same convention as {@link tileCenterToLatLon} on unit sphere). */
  readonly tileCenterLatDeg: Float32Array;
  private tileById: Map<number, GeodesicTile>;
  /** Spatial index: cell index -> tile IDs to test. Makes getTileIdAtDirection O(1) in tile count. */
  private directionGrid: number[][];

  constructor(options: GlobeOptions = {}) {
    const { radius = 1, subdivisions = 3 } = options;
    this.radius = radius;
    this.subdivisions = subdivisions;
    this.tiles = buildGeodesicTiles(subdivisions);
    this.tileById = new Map(this.tiles.map((t) => [t.id, t]));
    const n = this.tiles.length;
    this.tileCenterLatDeg = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const y = THREE.MathUtils.clamp(this.tiles[i]!.center.y, -1, 1);
      this.tileCenterLatDeg[i] = (Math.asin(y) * 180) / Math.PI;
    }
    this.directionGrid = this.buildDirectionGrid();

    const geometry = createGeodesicGeometry(this.tiles, { radius, subdivisions });
    this.mesh = new THREE.Mesh(geometry);
    this.mesh.name = "Polyglobe";
    this.mesh.userData = { globe: this };
  }

  private buildDirectionGrid(): number[][] {
    const size = DIR_GRID_LON * DIR_GRID_LAT;
    const grid: number[][] = [];
    for (let k = 0; k < size; k++) grid.push([]);

    for (const tile of this.tiles) {
      let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
      const verts = [tile.center, ...tile.vertices];
      for (const v of verts) {
        const { lon, lat } = directionToLonLat(v);
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      }
      const iLo = Math.max(0, Math.floor(((minLon + Math.PI) / (2 * Math.PI)) * DIR_GRID_LON));
      const iHi = Math.min(DIR_GRID_LON - 1, Math.ceil(((maxLon + Math.PI) / (2 * Math.PI)) * DIR_GRID_LON));
      const jLo = Math.max(0, Math.floor((minLat + Math.PI / 2) / Math.PI * DIR_GRID_LAT));
      const jHi = Math.min(DIR_GRID_LAT - 1, Math.ceil((maxLat + Math.PI / 2) / Math.PI * DIR_GRID_LAT));
      for (let j = jLo; j <= jHi; j++) {
        for (let i = iLo; i <= iHi; i++) {
          grid[i + j * DIR_GRID_LON].push(tile.id);
        }
      }
    }
    return grid;
  }

  /** Get tile by ID (hex or pentagon index). */
  getTile(id: number): GeodesicTile | undefined {
    return this.tileById.get(id);
  }

  /** Number of tiles (12 pentagons + hexagons). */
  get tileCount(): number {
    return this.tiles.length;
  }

  /** World position of tile center (for placement). */
  getTileCenter(id: number): THREE.Vector3 | undefined {
    const t = this.getTile(id);
    return t ? t.center.clone().multiplyScalar(this.radius) : undefined;
  }

  /** Latitude (degrees) of tile center on the unit sphere; O(1), no allocations. */
  getTileCenterLatDeg(id: number): number | undefined {
    if (!Number.isInteger(id) || id < 0 || id >= this.tileCenterLatDeg.length) {
      return undefined;
    }
    return this.tileCenterLatDeg[id]!;
  }

  /** World position + “up” (normal) for a tile, e.g. for placing objects. */
  getTilePose(id: number): { position: THREE.Vector3; up: THREE.Vector3 } | undefined {
    const t = this.getTile(id);
    if (!t) return undefined;
    return {
      position: t.center.clone().multiplyScalar(this.radius),
      up: t.center.clone().normalize(),
    };
  }

  /**
   * Return the tile ID that contains the given direction (unit vector on the sphere).
   * Uses a spatial index so cost is O(1) in tile count (constant candidates per cell).
   */
  getTileIdAtDirection(direction: THREE.Vector3): number {
    const p = direction.clone().normalize();
    const { lon, lat } = directionToLonLat(p);
    const { i, j } = lonLatToGridCell(lon, lat);
    const k = i + j * DIR_GRID_LON;
    const candidates = this.directionGrid[k];
    if (!candidates) return 0;
    const edgeNormal = new THREE.Vector3();
    for (const id of candidates) {
      const tile = this.tileById.get(id);
      if (!tile) continue;
      const c = tile.center;
      const verts = tile.vertices;
      const n = verts.length;
      let inside = true;
      for (let e = 0; e < n && inside; e++) {
        const va = verts[e];
        const vb = verts[(e + 1) % n];
        edgeNormal.crossVectors(va, vb).normalize();
        const sideC = c.dot(edgeNormal);
        const sideP = p.dot(edgeNormal);
        if (sideC * sideP < -1e-6) inside = false;
      }
      if (inside) return tile.id;
    }
    return 0;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
  }
}
