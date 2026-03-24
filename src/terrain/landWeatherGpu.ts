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

export interface LandWeatherGpuState {
  readonly texture: THREE.DataTexture;
  readonly data: Float32Array;
  readonly texWidth: number;
  readonly texHeight: number;
  readonly tileCount: number;
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
  return { texture, data, texWidth, texHeight, tileCount };
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
 * **Stochastic pass** (`stochasticLandTileFraction` in (0,1)): always refreshes **water** texels; for
 * **land**, only updates tiles that pass {@link landWeatherStochasticPickLandTile} so other land texels
 * keep their previous values (same idea as the old vertex-color path).
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
): void {
  const { data, texWidth, texHeight, tileCount } = gpu;
  const stFrac = paintOpts?.stochasticLandTileFraction;
  const stSalt = paintOpts?.stochasticSalt ?? 0;
  const useStochasticLand =
    stFrac != null && stFrac > 0 && stFrac < 1 && Number.isFinite(stFrac);

  const climateSnowByTile =
    climateOpts != null ? new Map<number, number>() : null;
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

  for (let tid = 0; tid < tileCount; tid++) {
    const o = texelByteOffset(tid, texWidth);
    const row = tileTerrain.get(tid) ?? {
      tileId: tid,
      type: "water" as const,
      elevation: 0,
    };
    if (waterTileIds.has(tid) || row.type === "water") {
      data[o] = 0;
      data[o + 1] = 0;
      data[o + 2] = 0;
      data[o + 3] = 0;
      continue;
    }
    if (
      useStochasticLand &&
      !landWeatherStochasticPickLandTile(tid, stSalt, stFrac)
    ) {
      continue;
    }
    const w = wetness.get(tid) ?? 0;
    const snSim = snowCover.get(tid) ?? 0;
    const snClim = climateSnowForTile(tid);
    data[o] = w;
    data[o + 1] = snSim;
    data[o + 2] = snClim;
    data[o + 3] = 1;
  }
  gpu.texture.needsUpdate = true;
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
