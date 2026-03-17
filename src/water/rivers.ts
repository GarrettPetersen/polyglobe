/**
 * Rivers: trace a polyline through geodesic tiles and render as a channel with water shader.
 * Each segment is (tileId, entryEdge?, exitEdge?); the channel can enter/exit any of the 6 (or 5) tile edges.
 */

import * as THREE from "three";
import type { GeodesicTile } from "../core/geodesic.js";
import { getEdgeNeighbor } from "../core/geodesic.js";
// Globe is only used for getTileIdAtDirection and .tiles, .radius
interface GlobeLike {
  tiles: GeodesicTile[];
  radius: number;
  getTileIdAtDirection(direction: THREE.Vector3): number;
}

export interface RiverSegment {
  tileId: number;
  /** Edge index (0..n-1) where the river enters this tile; undefined at river start. */
  entryEdge?: number;
  /** Edge index where the river exits; undefined at river end. */
  exitEdge?: number;
  /** If true, this segment is part of a delta: prefer connecting to sea over other sea-adjacent river segments. */
  isDelta?: boolean;
}

export interface RiverMeshOptions {
  /** Radius of the globe. Default from globe.radius. */
  radius?: number;
  /** Elevation per tile (globe units). River surface = radius + getElevation(id)*elevationScale - surfaceOffset. */
  getElevation: (tileId: number) => number;
  elevationScale?: number;
  /** How far below the tile surface (bowl lip) the river base sits (globe units). Default: wave amplitude so crests reach the lip. */
  surfaceOffset?: number;
  /** Half-width of the river in globe units. Ignored if riverWidthFraction is set. */
  riverWidth?: number;
  /** Half-width as fraction of segment length (e.g. 0.28 = narrow ribbon relative to hex). Use this to scale to hex size. */
  riverWidthFraction?: number;
  /** For per-hex river: channel half-width as fraction of center-to-edge (e.g. 0.45 = 90% of hex, boat-sized). Used by createRiverMeshFromTileEdges. */
  channelWidthFraction?: number;
  /** Sun direction for water specular. */
  sunDirection?: THREE.Vector3;
  /** If set with isWater, adds a ramp quad from each river edge that connects to water up to this radius (e.g. 0.995 for ocean sphere), so river mouths blend into the water surface. */
  waterSurfaceRadius?: number;
  /** Used with waterSurfaceRadius to decide which edges get a transition strip to the ocean/lake. */
  isWater?: (tileId: number) => boolean;
}

/** Max radial wave displacement (sum of Gerstner amps) so default surfaceOffset aligns wave crests with bowl lip. */
const RIVER_MAX_WAVE_AMPLITUDE = 0.0004 * (1 + 0.85 + 0.6);

/** Options for getRiverEdgesByTile: if provided, end segments (tiles with only one river edge) get an extra opening toward any adjacent water tile so the river connects to ocean/lake. */
export interface GetRiverEdgesOptions {
  tiles: GeodesicTile[];
  isWater: (tileId: number) => boolean;
}

/** Map from tile ID to set of edge indices (0..n-1) where the river goes. Confluences/deltas have 3+. If options provided, end tiles next to water get that edge added so the river connects to the sea/lake. When segments are tagged isDelta, sea-adjacent delta tiles drop edges to other sea-adjacent river tiles so they connect to the sea instead of reconnecting with each other. */
export function getRiverEdgesByTile(
  segments: RiverSegment[],
  options?: GetRiverEdgesOptions
): Map<number, Set<number>> {
  const byTile = new Map<number, Set<number>>();
  for (const seg of segments) {
    let set = byTile.get(seg.tileId);
    if (!set) {
      set = new Set<number>();
      byTile.set(seg.tileId, set);
    }
    if (seg.entryEdge !== undefined) set.add(seg.entryEdge);
    if (seg.exitEdge !== undefined) set.add(seg.exitEdge);
  }
  if (options) {
    const { tiles, isWater } = options;
    const tileById = new Map(tiles.map((t) => [t.id, t]));

    const deltaTileIds = new Set(
      segments.filter((s) => s.isDelta).map((s) => s.tileId)
    );
    const seaAdjacent = new Set<number>();
    for (const [tileId] of byTile) {
      const tile = tileById.get(tileId);
      if (!tile) continue;
      for (let e = 0; e < tile.vertices.length; e++) {
        const neighborId = getEdgeNeighbor(tile, e, tiles);
        if (neighborId !== undefined && isWater(neighborId)) {
          seaAdjacent.add(tileId);
          break;
        }
      }
    }
    for (const tileId of deltaTileIds) {
      if (!seaAdjacent.has(tileId)) continue;
      const edgeSet = byTile.get(tileId);
      const tile = tileById.get(tileId);
      if (!edgeSet || !tile) continue;
      for (const e of [...edgeSet]) {
        const neighborId = getEdgeNeighbor(tile, e, tiles);
        if (
          neighborId !== undefined &&
          byTile.has(neighborId) &&
          seaAdjacent.has(neighborId)
        ) {
          edgeSet.delete(e);
        }
      }
    }

    for (const [tileId, edgeSet] of byTile) {
      if (edgeSet.size !== 1) continue;
      const tile = tileById.get(tileId);
      if (!tile) continue;
      for (let e = 0; e < tile.vertices.length; e++) {
        if (edgeSet.has(e)) continue;
        const neighborId = getEdgeNeighbor(tile, e, tiles);
        if (neighborId !== undefined && isWater(neighborId)) edgeSet.add(e);
      }
    }
  }
  return byTile;
}

/** Convert lon/lat (degrees) to unit direction vector. Uses same convention as tileCenterToLatLon (lon = -atan2(z,x)) so getTileIdAtDirection returns the tile the Earth raster uses for that lon/lat. */
export function lonLatToDirection(lonDeg: number, latDeg: number): THREE.Vector3 {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const cosLat = Math.cos(lat);
  return new THREE.Vector3(
    cosLat * Math.cos(lon),
    Math.sin(lat),
    -cosLat * Math.sin(lon)
  ).normalize();
}

/** Sample a polyline at roughly even steps (in degrees), return [lon, lat][] in degrees. */
function samplePolyline(
  coords: number[][],
  stepDeg: number = 0.15
): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i];
    const b = coords[i + 1];
    const lon0 = a[0], lat0 = a[1], lon1 = b[0], lat1 = b[1];
    const dist = Math.sqrt((lon1 - lon0) ** 2 + (lat1 - lat0) ** 2);
    const n = Math.max(1, Math.ceil(dist / stepDeg));
    for (let k = 0; k <= n; k++) {
      if (k === 0 && i > 0) continue;
      const t = k / n;
      out.push([lon0 + t * (lon1 - lon0), lat0 + t * (lat1 - lat0)]);
    }
  }
  if (coords.length >= 1 && out.length === 0) out.push(coords[0]);
  return out;
}

/**
 * Trace a polyline (lon/lat in degrees) through the globe's tiles.
 * Returns one segment per tile the river passes through, with entry/exit edge indices.
 */
export function traceRiverThroughTiles(
  globe: GlobeLike,
  lineLonLat: number[][]
): RiverSegment[] {
  const points = samplePolyline(lineLonLat);
  if (points.length === 0) return [];
  const tiles = globe.tiles;
  const tileById = new Map(tiles.map((t) => [t.id, t]));

  const tileSeq: number[] = [];
  for (const [lon, lat] of points) {
    const dir = lonLatToDirection(lon, lat);
    const id = globe.getTileIdAtDirection(dir);
    tileSeq.push(id);
  }

  const runs: { tileId: number; start: number; end: number }[] = [];
  let i = 0;
  while (i < tileSeq.length) {
    const tileId = tileSeq[i];
    const start = i;
    while (i < tileSeq.length && tileSeq[i] === tileId) i++;
    runs.push({ tileId, start, end: i - 1 });
  }

  const segments: RiverSegment[] = [];
  for (let r = 0; r < runs.length; r++) {
    const tile = tileById.get(runs[r].tileId);
    if (!tile) continue;
    let entryEdge: number | undefined;
    let exitEdge: number | undefined;
    if (r > 0) {
      const prevId = runs[r - 1].tileId;
      for (let e = 0; e < tile.vertices.length; e++) {
        if (getEdgeNeighbor(tile, e, tiles) === prevId) {
          entryEdge = e;
          break;
        }
      }
    }
    if (r < runs.length - 1) {
      const nextId = runs[r + 1].tileId;
      for (let e = 0; e < tile.vertices.length; e++) {
        if (getEdgeNeighbor(tile, e, tiles) === nextId) {
          exitEdge = e;
          break;
        }
      }
    }
    segments.push({ tileId: runs[r].tileId, entryEdge, exitEdge });
  }
  return segments;
}

/** Get world position of the midpoint of an edge of a tile at radius r (with optional land-style projection). */
function edgeMidpoint(
  tile: GeodesicTile,
  edgeIndex: number,
  r: number,
  centerNormal: THREE.Vector3,
  usePlaneProjection: boolean,
  out: THREE.Vector3
): THREE.Vector3 {
  const n = tile.vertices.length;
  const va = tile.vertices[edgeIndex].clone().normalize();
  const vb = tile.vertices[(edgeIndex + 1) % n].clone().normalize();
  const mid = va.add(vb).normalize();
  if (usePlaneProjection) {
    const dot = mid.dot(centerNormal);
    const inPlane = mid.clone().sub(centerNormal.clone().multiplyScalar(dot));
    return out.copy(centerNormal).multiplyScalar(r).add(inPlane);
  }
  return out.copy(mid).multiplyScalar(r);
}

/**
 * Create a mesh for the river: a strip of quads through each segment, using a water-like shader.
 * Channel is drawn as a ribbon at surfaceOffset below the tile surface.
 */
export function createRiverMesh(
  globe: GlobeLike,
  segments: RiverSegment[],
  options: RiverMeshOptions
): THREE.Mesh {
  const radius = options.radius ?? globe.radius;
  const elevationScale = options.elevationScale ?? 1;
  const surfaceOffset = options.surfaceOffset ?? RIVER_MAX_WAVE_AMPLITUDE;
  const tiles = globe.tiles;
  const tileById = new Map(tiles.map((t) => [t.id, t]));

  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  let vertexOffset = 0;

  const centerNormal = new THREE.Vector3();
  const posA = new THREE.Vector3();
  const posB = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const perp = new THREE.Vector3();

  for (const seg of segments) {
    const tile = tileById.get(seg.tileId);
    if (!tile) continue;
    const elev = options.getElevation(seg.tileId) * elevationScale;
    const r = radius + elev - surfaceOffset;
    centerNormal.copy(tile.center).normalize();

    let pEntry: THREE.Vector3;
    let pExit: THREE.Vector3;
    const usePlane = elev >= 0;

    if (seg.entryEdge !== undefined && seg.exitEdge !== undefined) {
      edgeMidpoint(tile, seg.entryEdge, r, centerNormal, usePlane, posA);
      edgeMidpoint(tile, seg.exitEdge, r, centerNormal, usePlane, posB);
      pEntry = posA.clone();
      pExit = posB.clone();
    } else if (seg.entryEdge !== undefined) {
      edgeMidpoint(tile, seg.entryEdge, r, centerNormal, usePlane, posA);
      const c = centerNormal.clone().multiplyScalar(r);
      pEntry = posA.clone();
      pExit = c;
    } else if (seg.exitEdge !== undefined) {
      const c = centerNormal.clone().multiplyScalar(r);
      edgeMidpoint(tile, seg.exitEdge, r, centerNormal, usePlane, posB);
      pEntry = c;
      pExit = posB.clone();
    } else {
      const c = centerNormal.clone().multiplyScalar(r);
      const v0 = tile.vertices[0].clone().normalize();
      posB.copy(v0).multiplyScalar(r);
      pEntry = c;
      pExit = posB.clone();
    }

    tangent.subVectors(pExit, pEntry);
    const len = tangent.length();
    if (len < 1e-6) continue;
    tangent.normalize();
    perp.crossVectors(centerNormal, tangent).normalize();
    if (perp.lengthSq() < 1e-10) {
      tangent.set(1, 0, 0);
      perp.crossVectors(centerNormal, tangent).normalize();
    }
    const halfWidth =
      options.riverWidthFraction != null
        ? len * options.riverWidthFraction
        : (options.riverWidth ?? len * 0.28);
    perp.multiplyScalar(halfWidth);

    const a0 = vertexOffset;
    positions.push(pEntry.x - perp.x, pEntry.y - perp.y, pEntry.z - perp.z);
    normals.push(centerNormal.x, centerNormal.y, centerNormal.z);
    vertexOffset++;
    positions.push(pEntry.x + perp.x, pEntry.y + perp.y, pEntry.z + perp.z);
    normals.push(centerNormal.x, centerNormal.y, centerNormal.z);
    vertexOffset++;
    positions.push(pExit.x + perp.x, pExit.y + perp.y, pExit.z + perp.z);
    normals.push(centerNormal.x, centerNormal.y, centerNormal.z);
    vertexOffset++;
    positions.push(pExit.x - perp.x, pExit.y - perp.y, pExit.z - perp.z);
    normals.push(centerNormal.x, centerNormal.y, centerNormal.z);
    vertexOffset++;
    indices.push(a0, a0 + 1, a0 + 2, a0, a0 + 2, a0 + 3);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  const material = createRiverWaterMaterial(options);
  const mesh = new THREE.Mesh(geom, material);
  mesh.name = "River";
  mesh.renderOrder = 2;
  return mesh;
}

/**
 * Create river mesh from per-hex river edges. Each hex with a river gets a channel from its center
 * toward each river edge; channel width is a fraction of center-to-edge (e.g. 0.45 = 90% of hex so a boat fits).
 * Tied to exact hex positions (tile center and edge midpoints at radius + elev - surfaceOffset).
 */
export function createRiverMeshFromTileEdges(
  globe: GlobeLike,
  riverEdgesByTile: Map<number, Set<number>>,
  options: RiverMeshOptions
): THREE.Mesh {
  const radius = options.radius ?? globe.radius;
  const elevationScale = options.elevationScale ?? 1;
  const surfaceOffset = options.surfaceOffset ?? RIVER_MAX_WAVE_AMPLITUDE;
  const channelWidthFraction = options.channelWidthFraction ?? 0.45;
  const waterSurfaceRadius = options.waterSurfaceRadius;
  const isWater = options.isWater;
  const addTransition = waterSurfaceRadius != null && isWater != null;
  const tiles = globe.tiles;
  const tileById = new Map(tiles.map((t) => [t.id, t]));

  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  let vertexOffset = 0;

  const centerNormal = new THREE.Vector3();
  const centerPos = new THREE.Vector3();
  const edgeMid = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const perp = new THREE.Vector3();
  const outer = new THREE.Vector3();

  for (const [tileId, edgeSet] of riverEdgesByTile) {
    if (edgeSet.size === 0) continue;
    const tile = tileById.get(tileId);
    if (!tile) continue;
    const elev = options.getElevation(tileId) * elevationScale;
    const r = radius + elev - surfaceOffset;
    centerNormal.copy(tile.center).normalize();
    centerPos.copy(centerNormal).multiplyScalar(r);
    const usePlane = elev >= 0;

    for (const edgeIndex of edgeSet) {
      edgeMidpoint(tile, edgeIndex, r, centerNormal, usePlane, edgeMid);
      tangent.subVectors(edgeMid, centerPos);
      const len = tangent.length();
      if (len < 1e-6) continue;
      tangent.normalize();
      perp.crossVectors(centerNormal, tangent).normalize();
      if (perp.lengthSq() < 1e-10) continue;
      const halfWidth = len * channelWidthFraction;
      perp.multiplyScalar(halfWidth);

      const a0 = vertexOffset;
      positions.push(centerPos.x - perp.x, centerPos.y - perp.y, centerPos.z - perp.z);
      normals.push(centerNormal.x, centerNormal.y, centerNormal.z);
      vertexOffset++;
      positions.push(centerPos.x + perp.x, centerPos.y + perp.y, centerPos.z + perp.z);
      normals.push(centerNormal.x, centerNormal.y, centerNormal.z);
      vertexOffset++;
      positions.push(edgeMid.x + perp.x, edgeMid.y + perp.y, edgeMid.z + perp.z);
      normals.push(centerNormal.x, centerNormal.y, centerNormal.z);
      vertexOffset++;
      positions.push(edgeMid.x - perp.x, edgeMid.y - perp.y, edgeMid.z - perp.z);
      normals.push(centerNormal.x, centerNormal.y, centerNormal.z);
      vertexOffset++;
      indices.push(a0, a0 + 1, a0 + 2, a0, a0 + 2, a0 + 3);

      if (addTransition) {
        const neighborId = getEdgeNeighbor(tile, edgeIndex, tiles);
        if (neighborId !== undefined && isWater(neighborId)) {
          outer.copy(edgeMid).normalize().multiplyScalar(waterSurfaceRadius);
          const t0 = vertexOffset;
          positions.push(outer.x - perp.x, outer.y - perp.y, outer.z - perp.z);
          normals.push(centerNormal.x, centerNormal.y, centerNormal.z);
          vertexOffset++;
          positions.push(outer.x + perp.x, outer.y + perp.y, outer.z + perp.z);
          normals.push(centerNormal.x, centerNormal.y, centerNormal.z);
          vertexOffset++;
          indices.push(a0 + 2, a0 + 3, t0, a0 + 2, t0, t0 + 1);
        }
      }
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  const material = createRiverWaterMaterial(options);
  const mesh = new THREE.Mesh(geom, material);
  mesh.name = "River";
  mesh.renderOrder = 2;
  return mesh;
}

const RIVER_VERTEX = `
  uniform float uTime;
  uniform float uRadius;
  uniform vec3 uGerstnerAmps;
  uniform vec3 uGerstnerWL;
  uniform vec3 uGerstnerSpeed;
  uniform vec3 uGerstnerQ;
  uniform vec2 uGerstnerDir1;
  uniform vec2 uGerstnerDir2;
  uniform vec2 uGerstnerDir3;
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  const float PI = 3.14159265;
  void gerstnerWave(vec2 dir, float amp, float wl, float speed, float Q, vec3 pos, vec3 N,
    inout vec3 disp, inout vec3 normalTilt) {
    float k = 2.0 * PI / wl;
    float phase = (pos.x * dir.x + pos.z * dir.y) * k - uTime * speed;
    float c = cos(phase);
    float s = sin(phase);
    vec3 waveDir3D = vec3(dir.x, 0.0, dir.y);
    vec3 T = waveDir3D - N * dot(N, waveDir3D);
    float len = length(T);
    if (len > 0.001) T /= len;
    else T = vec3(0.0);
    disp += N * (amp * c) + T * (Q * amp * s);
    normalTilt += T * (amp * k * s);
  }
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vec3 pos = worldPos.xyz;
    vec3 N = normalize(pos);
    vec3 disp = vec3(0.0);
    vec3 normalTilt = vec3(0.0);
    gerstnerWave(uGerstnerDir1, uGerstnerAmps.x, uGerstnerWL.x, uGerstnerSpeed.x, uGerstnerQ.x, pos, N, disp, normalTilt);
    gerstnerWave(uGerstnerDir2, uGerstnerAmps.y, uGerstnerWL.y, uGerstnerSpeed.y, uGerstnerQ.y, pos, N, disp, normalTilt);
    gerstnerWave(uGerstnerDir3, uGerstnerAmps.z, uGerstnerWL.z, uGerstnerSpeed.z, uGerstnerQ.z, pos, N, disp, normalTilt);
    vec3 newPos = pos + disp;
    vWorldPosition = newPos;
    vNormal = normalize(N - normalTilt);
    vViewPosition = -(viewMatrix * vec4(newPos, 1.0)).xyz;
    gl_Position = projectionMatrix * viewMatrix * vec4(newPos, 1.0);
  }
`;

const RIVER_FRAGMENT = `
  uniform float uTime;
  uniform float uSize;
  uniform vec3 uSunDirection;
  uniform vec3 uSunColor;
  uniform vec3 uWaterColor;
  uniform vec3 uWaterColorPole;
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  void main() {
    vec2 uv = vWorldPosition.xz * uSize;
    float n0 = sin(uv.x * 2.0 + uTime) * cos(uv.y * 2.0 + uTime * 0.8);
    float n1 = sin(uv.x * 5.0 - uTime * 0.7) * cos(uv.y * 5.0 + uTime * 0.9);
    vec3 surfaceNormal = normalize(vNormal + vec3(n0, n1, n0) * 0.05);
    vec3 eyeDirection = normalize(vViewPosition);
    vec3 reflection = normalize(reflect(-uSunDirection, surfaceNormal));
    float spec = pow(max(0.0, dot(eyeDirection, reflection)), 80.0) * 0.9;
    float diff = max(dot(uSunDirection, surfaceNormal), 0.0) * 0.4;
    vec3 diffuseLight = uSunColor * diff;
    vec3 specularLight = uSunColor * spec;
    float theta = max(dot(eyeDirection, surfaceNormal), 0.0);
    float rf0 = 0.3;
    float reflectance = rf0 + (1.0 - rf0) * pow((1.0 - theta), 5.0);
    vec3 dir = normalize(vWorldPosition);
    float lat = asin(clamp(dir.y, -1.0, 1.0));
    float latNorm = abs(lat) / 1.5707963;
    vec3 waterColor = mix(uWaterColor, uWaterColorPole, latNorm);
    vec3 scatter = max(0.0, dot(surfaceNormal, eyeDirection)) * waterColor;
    vec3 skyReflection = vec3(0.4, 0.55, 0.7);
    vec3 albedo = mix(
      (uSunColor * diffuseLight * 0.3 + scatter),
      (vec3(0.1) + skyReflection * 0.9 + specularLight),
      reflectance
    );
    float sunFactor = 0.03 + 0.97 * max(0.0, dot(surfaceNormal, uSunDirection));
    gl_FragColor = vec4(albedo * sunFactor, 0.92);
  }
`;

function createRiverWaterMaterial(options: RiverMeshOptions): THREE.ShaderMaterial {
  const sunDir = options.sunDirection ?? new THREE.Vector3(0.5, 0.6, 0.4).normalize();
  const amp = 0.0004;
  const wl = 0.08;
  const q = 0.15;
  const a = (deg: number) => (deg * Math.PI) / 180;
  const d1 = new THREE.Vector2(Math.cos(a(0)), Math.sin(a(0)));
  const d2 = new THREE.Vector2(Math.cos(a(70)), Math.sin(a(70)));
  const d3 = new THREE.Vector2(Math.cos(a(140)), Math.sin(a(140)));

  return new THREE.ShaderMaterial({
    vertexShader: RIVER_VERTEX,
    fragmentShader: RIVER_FRAGMENT,
    uniforms: {
      uTime: { value: 0 },
      uRadius: { value: options.radius ?? 1 },
      uSize: { value: 2.0 },
      uSunDirection: { value: sunDir.clone() },
      uSunColor: { value: new THREE.Color(0xffffff) },
      uWaterColor: { value: new THREE.Color(0x2a7a8a) },
      uWaterColorPole: { value: new THREE.Color(0x2a3548) },
      uGerstnerAmps: { value: new THREE.Vector3(amp, amp * 0.85, amp * 0.6) },
      uGerstnerWL: { value: new THREE.Vector3(wl, wl * 0.8, wl * 0.65) },
      uGerstnerSpeed: { value: new THREE.Vector3(1.2, 1.0, 0.85) },
      uGerstnerQ: { value: new THREE.Vector3(q, q * 0.9, q * 0.85) },
      uGerstnerDir1: { value: d1 },
      uGerstnerDir2: { value: d2 },
      uGerstnerDir3: { value: d3 },
    },
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: true,
  });
}

/** Call each frame to animate river waves. */
export function updateRiverMaterialTime(
  mesh: THREE.Mesh,
  time: number
): void {
  const mat = mesh.material as THREE.ShaderMaterial;
  if (mat.uniforms?.uTime) mat.uniforms.uTime.value = time;
}
