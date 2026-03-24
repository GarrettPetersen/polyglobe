/**
 * Pre-baked Earth demo assets: water-table geometry, coast R8 masks, annual cloud spawn table,
 * and river seasonal flow strengths. Written by `build-earth-globe-cache`; loaded by the demo when
 * magic + cache version + tile order + layout fingerprints match.
 */

import type {
  AnnualSpawnSpec,
  CloudClipFieldConfig,
} from "./cloudClipSystem.js";
import type { AnnualRiverFlowStrength } from "./annualWeatherTables.js";
import { discreteWeatherBakeEarthCacheVersionU32 } from "./discreteWeatherYearBake.js";

/** ASCII `PGRB` — polyglobe **r**untime **b**ake. */
const FILE_MAGIC = new Uint8Array([0x50, 0x47, 0x52, 0x42]);

export const GLOBE_RUNTIME_BAKE_FILE_VERSION = 1;

const HEADER_BYTE_LENGTH = 64;
const SPAWN_RECORD_BYTES = 24;
const DAYS = 365;

function u32Hash(parts: readonly number[]): number {
  let h = 2166136261 >>> 0;
  for (const p of parts) {
    h ^= p >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function floatBits(x: number): number {
  const b = new ArrayBuffer(4);
  new Float32Array(b)[0] = x;
  return new Uint32Array(b)[0]!;
}

/** Coast raster size — must match `examples/globe-demo/main.ts`. */
export function globeRuntimeBakeCoastResolution(tileCount: number): {
  w: number;
  h: number;
} {
  if (tileCount > 100_000) return { w: 192, h: 96 };
  if (tileCount > 70_000) return { w: 224, h: 112 };
  return { w: 256, h: 128 };
}

/** Cloud slot cap — must match `createEarthDemoCloudClipField` / demo `main.ts`. */
export function globeRuntimeBakeMaxCloudSlots(tileCount: number): number {
  const maxClouds = tileCount > 85_000 ? 72 : 96;
  return Math.min(maxClouds, tileCount);
}

/** Interior ocean sphere segments — must match demo water table setup. */
export function globeRuntimeBakeInteriorOceanSegments(tileCount: number): {
  widthSegments: number;
  heightSegments: number;
} {
  return tileCount > 100_000
    ? { widthSegments: 28, heightSegments: 20 }
    : { widthSegments: 44, heightSegments: 30 };
}

/**
 * Fingerprint for params that affect {@link import("./cloudClipSystem.js").buildAnnualCloudSpawnTable}.
 * Bump {@link GLOBE_RUNTIME_BAKE_FILE_VERSION} if spawn logic uses more of `cfg`.
 */
export function globeRuntimeBakeCloudSpawnConfigHash(
  cfg: CloudClipFieldConfig,
): number {
  return u32Hash([
    cfg.seed >>> 0,
    cfg.windSeed >>> 0,
    floatBits(cfg.cloudScale),
    floatBits(cfg.sizePowerMinMul),
    floatBits(cfg.sizePowerMaxMul),
    floatBits(cfg.sizePowerExponent),
  ]);
}

/** Water table numeric options — must match demo `main.ts` (`setWaterTableGeometry`). */
export function globeRuntimeBakeWaterTableFingerprint(tileCount: number): number {
  const seg = globeRuntimeBakeInteriorOceanSegments(tileCount);
  return u32Hash([
    floatBits(0.08),
    floatBits(-0.006),
    floatBits(0.995),
    seg.widthSegments >>> 0,
    seg.heightSegments >>> 0,
  ]);
}

export interface GlobeRuntimeBakeEncodeInput {
  earthGlobeCacheVersionKey: string;
  subdivisions: number;
  tileCount: number;
  coastW: number;
  coastH: number;
  maxCloudSlots: number;
  spawnConfigHash: number;
  waterTableFingerprint: number;
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint16Array | Uint32Array;
  coastWaterMask: Uint8Array;
  coastLandMask: Uint8Array;
  annualSpawnTable: AnnualSpawnSpec[][];
  river: AnnualRiverFlowStrength | null;
}

export interface GlobeRuntimeBakeDecoded {
  readonly positions: Float32Array;
  readonly normals: Float32Array;
  readonly indices: Uint16Array | Uint32Array;
  readonly coastWaterMask: Uint8Array;
  readonly coastLandMask: Uint8Array;
  readonly coastW: number;
  readonly coastH: number;
  readonly annualSpawnTable: AnnualSpawnSpec[][];
  readonly riverFlowStrength: AnnualRiverFlowStrength | null;
}

function readHeaderMagic(buf: Uint8Array): boolean {
  return (
    buf[0] === FILE_MAGIC[0] &&
    buf[1] === FILE_MAGIC[1] &&
    buf[2] === FILE_MAGIC[2] &&
    buf[3] === FILE_MAGIC[3]
  );
}

export function encodeGlobeRuntimeBakeFile(
  input: GlobeRuntimeBakeEncodeInput,
): Uint8Array {
  const {
    earthGlobeCacheVersionKey,
    subdivisions,
    tileCount,
    coastW,
    coastH,
    maxCloudSlots,
    spawnConfigHash,
    waterTableFingerprint,
    positions,
    normals,
    indices,
    coastWaterMask,
    coastLandMask,
    annualSpawnTable,
    river,
  } = input;

  if (coastWaterMask.length !== coastW * coastH || coastLandMask.length !== coastW * coastH) {
    throw new Error("[globeRuntimeBake] coast mask size mismatch");
  }
  if (annualSpawnTable.length !== maxCloudSlots) {
    throw new Error("[globeRuntimeBake] annualSpawnTable row count != maxCloudSlots");
  }
  for (let s = 0; s < maxCloudSlots; s++) {
    if (annualSpawnTable[s]!.length !== DAYS) {
      throw new Error(`[globeRuntimeBake] slot ${s} expected ${DAYS} days`);
    }
  }

  const vertCount = positions.length / 3;
  if (normals.length !== positions.length) {
    throw new Error("[globeRuntimeBake] normals length != positions");
  }
  const indexCount = indices.length;
  const index32 = indices instanceof Uint32Array;
  if (!index32 && !(indices instanceof Uint16Array)) {
    throw new Error("[globeRuntimeBake] indices must be Uint16 or Uint32");
  }

  const riverTileCount = river?.riverTileIds.length ?? 0;
  const riverIdsBytes = riverTileCount * 4;
  const riverPackedFloats = riverTileCount * DAYS;
  const riverPackedBytes = riverPackedFloats * 4;

  const waterBodyBytes =
    4 + // vertCount
    4 + // indexCount
    4 + // indexType + pad
    vertCount * 12 +
    vertCount * 12 +
    indexCount * (index32 ? 4 : 2);
  const coastBodyBytes = coastWaterMask.length + coastLandMask.length;
  const cloudBodyBytes = 4 + maxCloudSlots * DAYS * SPAWN_RECORD_BYTES;
  const riverBodyBytes = riverIdsBytes + riverPackedBytes;

  const total =
    HEADER_BYTE_LENGTH +
    waterBodyBytes +
    coastBodyBytes +
    cloudBodyBytes +
    riverBodyBytes;

  const out = new Uint8Array(total);
  out.set(FILE_MAGIC, 0);
  const dv = new DataView(out.buffer, out.byteOffset, out.byteLength);
  let h = 4;
  dv.setUint32(h, GLOBE_RUNTIME_BAKE_FILE_VERSION, true);
  h += 4;
  dv.setUint32(h, discreteWeatherBakeEarthCacheVersionU32(earthGlobeCacheVersionKey), true);
  h += 4;
  dv.setUint32(h, subdivisions >>> 0, true);
  h += 4;
  dv.setUint32(h, tileCount >>> 0, true);
  h += 4;
  dv.setUint32(h, coastW >>> 0, true);
  h += 4;
  dv.setUint32(h, coastH >>> 0, true);
  h += 4;
  dv.setUint32(h, maxCloudSlots >>> 0, true);
  h += 4;
  dv.setUint32(h, spawnConfigHash >>> 0, true);
  h += 4;
  dv.setUint32(h, waterTableFingerprint >>> 0, true);
  h += 4;
  dv.setUint32(h, riverTileCount >>> 0, true);
  h += 4;
  while (h < HEADER_BYTE_LENGTH) {
    dv.setUint8(h++, 0);
  }

  let o = HEADER_BYTE_LENGTH;

  dv.setUint32(o, vertCount >>> 0, true);
  o += 4;
  dv.setUint32(o, indexCount >>> 0, true);
  o += 4;
  dv.setUint32(o, index32 ? 1 : 0, true);
  o += 4;
  out.set(new Uint8Array(positions.buffer, positions.byteOffset, positions.byteLength), o);
  o += vertCount * 12;
  out.set(new Uint8Array(normals.buffer, normals.byteOffset, normals.byteLength), o);
  o += vertCount * 12;
  if (index32) {
    out.set(new Uint8Array(indices.buffer, indices.byteOffset, indices.byteLength), o);
    o += indexCount * 4;
  } else {
    out.set(new Uint8Array(indices.buffer, indices.byteOffset, indices.byteLength), o);
    o += indexCount * 2;
  }

  out.set(coastWaterMask, o);
  o += coastWaterMask.length;
  out.set(coastLandMask, o);
  o += coastLandMask.length;

  dv.setUint32(o, maxCloudSlots >>> 0, true);
  o += 4;
  for (let s = 0; s < maxCloudSlots; s++) {
    for (let d = 0; d < DAYS; d++) {
      const spec = annualSpawnTable[s]![d]!;
      const rec = o;
      dv.setUint32(rec + 0, spec.spawnTileId >>> 0, true);
      dv.setUint32(rec + 4, spec.templateIndex >>> 0, true);
      dv.setFloat32(rec + 8, spec.baseScale, true);
      dv.setFloat32(rec + 12, spec.birthWindDirectionRad, true);
      dv.setFloat32(rec + 16, spec.birthWindStrength, true);
      dv.setFloat32(rec + 20, spec.lifecyclePhase, true);
      o += SPAWN_RECORD_BYTES;
    }
  }

  if (river && riverTileCount > 0) {
    for (let i = 0; i < riverTileCount; i++) {
      dv.setUint32(o, river.riverTileIds[i]! >>> 0, true);
      o += 4;
    }
    const sp = river.strengthPacked;
    out.set(
      new Uint8Array(sp.buffer, sp.byteOffset, sp.byteLength),
      o,
    );
    o += riverPackedBytes;
  }

  if (o !== total) {
    throw new Error(`[globeRuntimeBake] size mismatch o=${o} total=${total}`);
  }

  return out;
}

export function decodeGlobeRuntimeBakeFile(
  buffer: ArrayBuffer,
  globeTileIds: readonly number[],
  expectedEarthGlobeCacheVersionKey: string,
  expectedSubdivisions: number,
  expectedCoastW: number,
  expectedCoastH: number,
  expectedMaxCloudSlots: number,
  expectedSpawnConfigHash: number,
  expectedWaterTableFingerprint: number,
  sortedRiverTileIds: readonly number[],
): GlobeRuntimeBakeDecoded | null {
  const u8 = new Uint8Array(buffer);
  if (u8.byteLength < HEADER_BYTE_LENGTH) return null;
  if (!readHeaderMagic(u8)) return null;

  const dv = new DataView(buffer);
  let p = 4;
  const fileVersion = dv.getUint32(p, true);
  p += 4;
  if (fileVersion !== GLOBE_RUNTIME_BAKE_FILE_VERSION) return null;

  const cacheVer = dv.getUint32(p, true);
  p += 4;
  if (cacheVer !== discreteWeatherBakeEarthCacheVersionU32(expectedEarthGlobeCacheVersionKey)) {
    return null;
  }

  const subdivisions = dv.getUint32(p, true);
  p += 4;
  if (subdivisions !== expectedSubdivisions) return null;

  const tileCount = dv.getUint32(p, true);
  p += 4;
  if (tileCount !== globeTileIds.length) return null;

  const coastW = dv.getUint32(p, true);
  p += 4;
  const coastH = dv.getUint32(p, true);
  p += 4;
  if (coastW !== expectedCoastW || coastH !== expectedCoastH) return null;

  const maxCloudSlots = dv.getUint32(p, true);
  p += 4;
  if (maxCloudSlots !== expectedMaxCloudSlots) return null;

  const spawnHash = dv.getUint32(p, true);
  p += 4;
  if (spawnHash !== expectedSpawnConfigHash) return null;

  const waterFp = dv.getUint32(p, true);
  p += 4;
  if (waterFp !== expectedWaterTableFingerprint) return null;

  const riverTileCount = dv.getUint32(p, true);
  p += 4;
  p = HEADER_BYTE_LENGTH;

  if (sortedRiverTileIds.length !== riverTileCount) return null;

  let o = p;
  if (o + 12 > u8.byteLength) return null;
  const vertCount = dv.getUint32(o, true);
  o += 4;
  const indexCount = dv.getUint32(o, true);
  o += 4;
  const indexType = dv.getUint32(o, true);
  o += 4;
  const use32 = indexType === 1;
  if (indexType !== 0 && indexType !== 1) return null;

  const posBytes = vertCount * 12;
  const norBytes = vertCount * 12;
  const idxBytes = indexCount * (use32 ? 4 : 2);
  if (o + posBytes + norBytes + idxBytes > u8.byteLength) return null;

  const positions = new Float32Array(buffer, o, vertCount * 3);
  o += posBytes;
  const normals = new Float32Array(buffer, o, vertCount * 3);
  o += norBytes;
  const indices = use32
    ? new Uint32Array(buffer, o, indexCount)
    : new Uint16Array(buffer, o, indexCount);
  o += idxBytes;

  const coastPixels = coastW * coastH;
  if (o + coastPixels * 2 > u8.byteLength) return null;
  const coastWaterMask = new Uint8Array(buffer, o, coastPixels);
  o += coastPixels;
  const coastLandMask = new Uint8Array(buffer, o, coastPixels);
  o += coastPixels;

  if (o + 4 > u8.byteLength) return null;
  const cloudSlotsCheck = dv.getUint32(o, true);
  o += 4;
  if (cloudSlotsCheck !== maxCloudSlots) return null;

  const cloudBytes = maxCloudSlots * DAYS * SPAWN_RECORD_BYTES;
  if (o + cloudBytes > u8.byteLength) return null;

  const annualSpawnTable: AnnualSpawnSpec[][] = [];
  for (let s = 0; s < maxCloudSlots; s++) {
    const row: AnnualSpawnSpec[] = [];
    for (let d = 0; d < DAYS; d++) {
      const rec = o;
      row.push({
        spawnTileId: dv.getUint32(rec + 0, true),
        templateIndex: dv.getUint32(rec + 4, true),
        baseScale: dv.getFloat32(rec + 8, true),
        birthWindDirectionRad: dv.getFloat32(rec + 12, true),
        birthWindStrength: dv.getFloat32(rec + 16, true),
        lifecyclePhase: dv.getFloat32(rec + 20, true),
      });
      o += SPAWN_RECORD_BYTES;
    }
    annualSpawnTable.push(row);
  }

  let riverFlowStrength: AnnualRiverFlowStrength | null = null;
  if (riverTileCount > 0) {
    if (o + riverTileCount * 4 + riverTileCount * DAYS * 4 > u8.byteLength) {
      return null;
    }
    const riverTileIds: number[] = [];
    for (let i = 0; i < riverTileCount; i++) {
      const id = dv.getUint32(o, true);
      if (id !== sortedRiverTileIds[i]) return null;
      riverTileIds.push(id);
      o += 4;
    }
    const strengthView = new Float32Array(buffer, o, riverTileCount * DAYS);
    o += riverTileCount * DAYS * 4;
    riverFlowStrength = {
      riverTileIds,
      strengthPacked: new Float32Array(strengthView),
    };
  } else if (sortedRiverTileIds.length > 0) {
    return null;
  }

  if (o !== u8.byteLength) return null;

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: use32
      ? new Uint32Array(indices)
      : new Uint16Array(indices),
    coastWaterMask: new Uint8Array(coastWaterMask),
    coastLandMask: new Uint8Array(coastLandMask),
    coastW,
    coastH,
    annualSpawnTable,
    riverFlowStrength,
  };
}
