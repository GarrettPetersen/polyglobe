/**
 * GPU land-surface wet/snow tint: RGBA float data texture (one texel per tile) + MeshStandardMaterial hook.
 * Avoids rewriting every vertex color on the main globe mesh each time weather changes.
 */

import * as THREE from "three";
import type { Globe } from "../core/Globe.js";
import { climateSurfaceSnowVisualForTerrain } from "../climate/seasonalClimate.js";
import {
  landWeatherStochasticPickLandTile,
  type ApplyLandSurfaceWeatherPaintOptions,
  type LandSurfaceWeatherVertexOptions,
  type TileTerrainData,
} from "./terrainMaterial.js";

/** Fixed row width so tile `id` maps to texel `(id % width, floor(id / width))`. */
export const LAND_WEATHER_DATA_TEX_WIDTH = 2048;

/** How {@link uploadLandWeatherTextureTiles} wants the GPU buffer updated; consumed by {@link commitLandWeatherGpuTextureUpload}. */
export type LandWeatherTextureUploadPending =
  | { kind: "none" }
  | { kind: "full" }
  | { kind: "bbox"; minX: number; minY: number; maxX: number; maxY: number }
  /** Per-texel path when a tight bbox would still upload too many unchanged pixels. */
  | { kind: "tiles"; tileIds: readonly number[] };

export interface LandWeatherGpuState {
  readonly texture: THREE.DataTexture;
  readonly data: Float32Array;
  readonly texWidth: number;
  readonly texHeight: number;
  readonly tileCount: number;
  /** Scratch list of land tile ids written in the last stochastic upload (do not mutate outside upload). */
  readonly landWeatherWrittenTileScratch: number[];
  landWeatherUploadPending: LandWeatherTextureUploadPending;
  /**
   * Simulated UTC minute index (`floor(calendarUtc / 60s)`) for {@link climateSnowTexelCache}.
   * Cleared when the minute changes so climate snow values stay correct across the day boundary.
   */
  climateSnowTexelCacheUtcMin: number;
  /** Reused across stochastic flushes within the same sim UTC minute to avoid repeat Köppen/snow work. */
  climateSnowTexelCache: Map<number, number>;
}

function texelByteOffset(tileId: number, texWidth: number): number {
  const x = tileId % texWidth;
  const y = Math.floor(tileId / texWidth);
  return (y * texWidth + x) * 4;
}

export function createLandWeatherGpuState(tileCount: number): LandWeatherGpuState {
  const texWidth = LAND_WEATHER_DATA_TEX_WIDTH;
  const texHeight = Math.max(1, Math.ceil(tileCount / texWidth));
  const data = new Float32Array(texWidth * texHeight * 4);
  const texture = new THREE.DataTexture(
    data,
    texWidth,
    texHeight,
    THREE.RGBAFormat,
    THREE.FloatType,
  );
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  texture.colorSpace = THREE.NoColorSpace;
  return {
    texture,
    data,
    texWidth,
    texHeight,
    tileCount,
    landWeatherWrittenTileScratch: [],
    landWeatherUploadPending: { kind: "none" },
    climateSnowTexelCacheUtcMin: Number.NaN,
    climateSnowTexelCache: new Map(),
  };
}

export function disposeLandWeatherGpuState(state: LandWeatherGpuState | null): void {
  if (state) state.texture.dispose();
}

/**
 * Fills wetness (R), sim snow (G), climate snow visual (B), land mask (A: 1 = apply tint in shader).
 * Water tiles and unknown land use A = 0 so the fragment keeps base vertex color only.
 *
 * **Full pass** (omit `paintOpts` or fraction ≥ 1): clears the whole texture, then writes every tile
 * (required after globe build).
 *
 * **Stochastic pass** (`stochasticLandTileFraction` in (0,1)): does **not** clear the texture; only
 * overwrites selected **land** texels (water stays as set by the last full pass — ocean texels are
 * static). Pass {@link landTileIdsForStochasticLandPass} to iterate land ids only (skip scanning
 * every ocean hex).
 */
export function uploadLandWeatherTextureTiles(
  gpu: LandWeatherGpuState,
  globe: Globe,
  tileTerrain: Map<number, TileTerrainData>,
  waterTileIds: ReadonlySet<number>,
  wetness: ReadonlyMap<number, number>,
  snowCover: ReadonlyMap<number, number>,
  climateOpts?: LandSurfaceWeatherVertexOptions,
  paintOpts?: ApplyLandSurfaceWeatherPaintOptions,
  /** When stochastic sampling is on, optional list of land tile ids — avoids O(tileCount) ocean scans. */
  landTileIdsForStochasticLandPass?: readonly number[],
): void {
  const { data, texWidth, texHeight, tileCount } = gpu;
  const stFrac = paintOpts?.stochasticLandTileFraction;
  const stSalt = paintOpts?.stochasticSalt ?? 0;
  const useStochasticLand =
    stFrac != null && stFrac > 0 && stFrac < 1 && Number.isFinite(stFrac);

  gpu.landWeatherUploadPending = { kind: "none" };
  const scratch = gpu.landWeatherWrittenTileScratch;
  scratch.length = 0;
  let dminX = 0;
  let dminY = 0;
  let dmaxX = -1;
  let dmaxY = -1;

  const recordStochasticWrite = (tid: number): void => {
    const x = tid % texWidth;
    const y = Math.floor(tid / texWidth);
    if (dmaxX < 0) {
      dminX = dmaxX = x;
      dminY = dmaxY = y;
    } else {
      if (x < dminX) dminX = x;
      if (x > dmaxX) dmaxX = x;
      if (y < dminY) dminY = y;
      if (y > dmaxY) dmaxY = y;
    }
    scratch.push(tid);
  };

  const finalizeStochasticPending = (): void => {
    const n = scratch.length;
    if (n === 0) {
      gpu.landWeatherUploadPending = { kind: "none" };
      return;
    }
    const bw = dmaxX - dminX + 1;
    const bh = dmaxY - dminY + 1;
    const bArea = bw * bh;
    const texPixels = texWidth * texHeight;
    if (n <= 512 && bArea > n * 32) {
      gpu.landWeatherUploadPending = { kind: "tiles", tileIds: scratch };
    } else if (bArea > texPixels * 0.42) {
      gpu.landWeatherUploadPending = { kind: "full" };
    } else {
      gpu.landWeatherUploadPending = {
        kind: "bbox",
        minX: dminX,
        minY: dminY,
        maxX: dmaxX,
        maxY: dmaxY,
      };
    }
  };

  let climateSnowByTile: Map<number, number> | null = null;
  if (climateOpts != null) {
    const m = Math.floor(climateOpts.calendarUtc.getTime() / 60_000);
    if (m !== gpu.climateSnowTexelCacheUtcMin) {
      gpu.climateSnowTexelCacheUtcMin = m;
      gpu.climateSnowTexelCache.clear();
    }
    climateSnowByTile = gpu.climateSnowTexelCache;
  }
  const climateSnowForTile = (tid: number): number => {
    if (!climateOpts || climateSnowByTile == null) return 0;
    const cached = climateSnowByTile.get(tid);
    if (cached !== undefined) return cached;
    const latDeg = globe.getTileCenterLatDeg(tid);
    if (latDeg == null || !Number.isFinite(latDeg)) {
      climateSnowByTile.set(tid, 0);
      return 0;
    }
    const row = tileTerrain.get(tid);
    const sn = climateSurfaceSnowVisualForTerrain(
      latDeg,
      climateOpts.subsolarLatDeg,
      row?.type,
      row?.monthlyMeanTempC,
      climateOpts.calendarUtc,
    );
    climateSnowByTile.set(tid, sn);
    return sn;
  };

  const cap = texWidth * texHeight;
  if (!useStochasticLand) {
    for (let i = 0; i < cap; i++) {
      const o = i * 4;
      data[o] = 0;
      data[o + 1] = 0;
      data[o + 2] = 0;
      data[o + 3] = 0;
    }
  }

  const writeLandTexel = (tid: number): void => {
    const o = texelByteOffset(tid, texWidth);
    const row = tileTerrain.get(tid) ?? {
      tileId: tid,
      type: "water" as const,
      elevation: 0,
    };
    if (waterTileIds.has(tid) || row.type === "water") return;
    const w = wetness.get(tid) ?? 0;
    const snSim = snowCover.get(tid) ?? 0;
    const snClim = climateSnowForTile(tid);
    data[o] = w;
    data[o + 1] = snSim;
    data[o + 2] = snClim;
    data[o + 3] = 1;
    if (useStochasticLand) recordStochasticWrite(tid);
  };

  if (
    useStochasticLand &&
    landTileIdsForStochasticLandPass &&
    landTileIdsForStochasticLandPass.length > 0
  ) {
    for (let i = 0; i < landTileIdsForStochasticLandPass.length; i++) {
      const tid = landTileIdsForStochasticLandPass[i]!;
      if (!landWeatherStochasticPickLandTile(tid, stSalt, stFrac)) continue;
      writeLandTexel(tid);
    }
    finalizeStochasticPending();
    return;
  }

  for (let tid = 0; tid < tileCount; tid++) {
    const o = texelByteOffset(tid, texWidth);
    const row = tileTerrain.get(tid) ?? {
      tileId: tid,
      type: "water" as const,
      elevation: 0,
    };
    if (waterTileIds.has(tid) || row.type === "water") {
      if (!useStochasticLand) {
        data[o] = 0;
        data[o + 1] = 0;
        data[o + 2] = 0;
        data[o + 3] = 0;
      }
      continue;
    }
    if (
      useStochasticLand &&
      !landWeatherStochasticPickLandTile(tid, stSalt, stFrac)
    ) {
      continue;
    }
    writeLandTexel(tid);
  }
  if (useStochasticLand) finalizeStochasticPending();
  else gpu.landWeatherUploadPending = { kind: "full" };
}

type WebGLRendererProperties = { get(t: THREE.Texture): { __webglTexture?: WebGLTexture } };

/**
 * Applies CPU writes from {@link uploadLandWeatherTextureTiles} to the GPU.
 * Stochastic updates use WebGL2 `texSubImage2D` (bbox or per-tile) when possible so the driver does not
 * re-upload the whole float texture. Full passes use `texture.needsUpdate` (Three.js full upload).
 */
export function commitLandWeatherGpuTextureUpload(
  renderer: THREE.WebGLRenderer,
  gpu: LandWeatherGpuState,
): void {
  const pending = gpu.landWeatherUploadPending;
  const tex = gpu.texture;
  if (pending.kind === "none") return;

  if (pending.kind === "full") {
    tex.needsUpdate = true;
    gpu.landWeatherUploadPending = { kind: "none" };
    return;
  }

  if (!renderer.capabilities.isWebGL2) {
    tex.needsUpdate = true;
    gpu.landWeatherUploadPending = { kind: "none" };
    return;
  }

  renderer.initTexture(tex);
  const gl = renderer.getContext() as WebGL2RenderingContext;
  const webglTexture = (renderer as unknown as { properties: WebGLRendererProperties })
    .properties.get(tex).__webglTexture;
  if (!webglTexture) {
    tex.needsUpdate = true;
    gpu.landWeatherUploadPending = { kind: "none" };
    return;
  }

  tex.needsUpdate = false;

  const tw = gpu.texWidth;
  const unpackRowLen = gl.UNPACK_ROW_LENGTH;
  const unpackSkipPx = gl.UNPACK_SKIP_PIXELS;
  const unpackSkipRow = gl.UNPACK_SKIP_ROWS;

  const prevActive = gl.getParameter(gl.ACTIVE_TEXTURE) as number;
  const prevTex2d = gl.getParameter(gl.TEXTURE_BINDING_2D) as WebGLTexture | null;

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, webglTexture);

  const subRect = (minX: number, minY: number, maxX: number, maxY: number): void => {
    const rw = maxX - minX + 1;
    const rh = maxY - minY + 1;
    gl.pixelStorei(unpackRowLen, tw);
    gl.pixelStorei(unpackSkipPx, minX);
    gl.pixelStorei(unpackSkipRow, minY);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      minX,
      minY,
      rw,
      rh,
      gl.RGBA,
      gl.FLOAT,
      gpu.data,
    );
  };

  /** Merge `texSubImage2D(1×1)` into horizontal row spans (same `y`, consecutive `x`). */
  const subTilesBatched = (tileIds: readonly number[]): void => {
    if (tileIds.length === 0) return;
    const byRow = new Map<number, number[]>();
    for (let i = 0; i < tileIds.length; i++) {
      const tid = tileIds[i]!;
      const x = tid % tw;
      const y = Math.floor(tid / tw);
      let row = byRow.get(y);
      if (!row) {
        row = [];
        byRow.set(y, row);
      }
      row.push(x);
    }
    const yList = Array.from(byRow.keys());
    yList.sort((a, b) => a - b);
    for (let yi = 0; yi < yList.length; yi++) {
      const y = yList[yi]!;
      const xs = [...new Set(byRow.get(y)!)].sort((a, b) => a - b);
      let i = 0;
      while (i < xs.length) {
        const x0 = xs[i]!;
        let x1 = x0;
        i++;
        while (i < xs.length && xs[i] === x1 + 1) {
          x1 = xs[i]!;
          i++;
        }
        const rw = x1 - x0 + 1;
        gl.pixelStorei(unpackRowLen, tw);
        gl.pixelStorei(unpackSkipPx, x0);
        gl.pixelStorei(unpackSkipRow, y);
        gl.texSubImage2D(
          gl.TEXTURE_2D,
          0,
          x0,
          y,
          rw,
          1,
          gl.RGBA,
          gl.FLOAT,
          gpu.data,
        );
      }
    }
  };

  try {
    if (pending.kind === "bbox") {
      subRect(pending.minX, pending.minY, pending.maxX, pending.maxY);
    } else {
      subTilesBatched(pending.tileIds);
    }
  } finally {
    gl.pixelStorei(unpackRowLen, 0);
    gl.pixelStorei(unpackSkipPx, 0);
    gl.pixelStorei(unpackSkipRow, 0);
    gl.bindTexture(gl.TEXTURE_2D, prevTex2d);
    gl.activeTexture(prevActive);
    renderer.resetState();
  }

  gpu.landWeatherUploadPending = { kind: "none" };
}

const _snowTint = new THREE.Color(0xf6faff);
const _wetTint = new THREE.Color(0x6a8a9a);

/**
 * Patches a standard material so fragments sample {@link LandWeatherGpuState.texture} by `tileId`
 * attribute (same as globe / river geometry). Safe to call on multiple materials sharing one `gpu`.
 */
export function installLandWeatherOnMeshStandardMaterial(
  material: THREE.MeshStandardMaterial,
  gpu: LandWeatherGpuState,
): void {
  if (material.userData.landWeatherGpuRef === gpu) return;
  material.userData.landWeatherGpuRef = gpu;
  /** Bust program cache vs unmodified MeshStandardMaterial (see Three.js `onBeforeCompile`). */
  material.customProgramCacheKey = () => "polyglobe:landWeatherV1";

  const snowTint = new THREE.Vector3(_snowTint.r, _snowTint.g, _snowTint.b);
  const wetTint = new THREE.Vector3(_wetTint.r, _wetTint.g, _wetTint.b);

  material.onBeforeCompile = (shader) => {
    shader.uniforms.landWeatherMap = { value: gpu.texture };
    shader.uniforms.landWeatherTexWidth = { value: gpu.texWidth };
    shader.uniforms.landWeatherTexHeight = { value: gpu.texHeight };
    shader.uniforms.landWeatherSnowTint = { value: snowTint };
    shader.uniforms.landWeatherWetTint = { value: wetTint };

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <color_pars_vertex>",
        `#include <color_pars_vertex>
attribute float tileId;
varying float vLandWeatherTileId;
`,
      )
      .replace(
        "#include <color_vertex>",
        `#include <color_vertex>
vLandWeatherTileId = tileId;
`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <color_pars_fragment>",
        `#include <color_pars_fragment>
varying float vLandWeatherTileId;
uniform sampler2D landWeatherMap;
uniform float landWeatherTexWidth;
uniform float landWeatherTexHeight;
uniform vec3 landWeatherSnowTint;
uniform vec3 landWeatherWetTint;
`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
{
	float lwRawId = vLandWeatherTileId;
	if ( lwRawId >= 0.0 ) {
		float tw = landWeatherTexWidth;
		float th = landWeatherTexHeight;
		float fxid = floor( lwRawId + 0.5 );
		vec2 lwUv = ( vec2( mod( fxid, tw ), floor( fxid / tw ) ) + 0.5 ) / vec2( tw, th );
		vec4 lw = texture2D( landWeatherMap, lwUv );
		if ( lw.a > 0.5 ) {
			float w = lw.r;
			float snSim = lw.g;
			float snClim = lw.b;
			float sn = min( 1.0, snSim + snClim * ( 1.0 - 0.5 * snSim ) );
			vec3 baseTint = diffuseColor.rgb;
			if ( sn > 0.002 ) {
				diffuseColor.rgb = landWeatherSnowTint;
			} else if ( w > 0.03 ) {
				float twet = min( 1.0, w );
				diffuseColor.rgb = mix( baseTint, landWeatherWetTint, twet * 0.28 );
				diffuseColor.rgb *= min( 1.1, 1.0 + 0.08 * twet );
			}
		}
	}
}
`,
      );
  };
  material.needsUpdate = true;
}
