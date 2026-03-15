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

export class Globe {
  readonly radius: number;
  readonly subdivisions: number;
  readonly tiles: GeodesicTile[];
  readonly mesh: THREE.Mesh;
  private tileById: Map<number, GeodesicTile>;

  constructor(options: GlobeOptions = {}) {
    const { radius = 1, subdivisions = 3 } = options;
    this.radius = radius;
    this.subdivisions = subdivisions;
    this.tiles = buildGeodesicTiles(subdivisions);
    this.tileById = new Map(this.tiles.map((t) => [t.id, t]));

    const geometry = createGeodesicGeometry(this.tiles, { radius, subdivisions });
    this.mesh = new THREE.Mesh(geometry);
    this.mesh.name = "Polyglobe";
    this.mesh.userData = { globe: this };
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
   */
  getTileIdAtDirection(direction: THREE.Vector3): number {
    const p = direction.clone().normalize();
    for (const tile of this.tiles) {
      const c = tile.center;
      const verts = tile.vertices;
      const n = verts.length;
      let inside = true;
      for (let i = 0; i < n && inside; i++) {
        const va = verts[i];
        const vb = verts[(i + 1) % n];
        const edgeNormal = new THREE.Vector3().crossVectors(va, vb).normalize();
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
