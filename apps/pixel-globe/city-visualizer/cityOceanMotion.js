import {
  LOADING_CAPSULE_HEIGHT,
  LOADING_CAPSULE_HORIZON_Y,
  loadingWaveAmplitude,
  loadingWaveOffset
} from "../src/loadingScreenMotion.js";
import { PORT_SCENE_DEPTH, PORT_SCENE_OCEAN_SLICES } from "./citySceneRules.js";

export const CITY_OCEAN_WAVE_MIN_AMPLITUDE_PX = 1;
export const CITY_OCEAN_WAVE_MAX_AMPLITUDE_PX = 20;

export function cityOceanParallaxDepth(masterY) {
  assertFiniteRow(masterY);
  const horizonY = PORT_SCENE_OCEAN_SLICES[0].top;
  const distantShoreY = PORT_SCENE_OCEAN_SLICES[1].top;
  const foregroundShoreY = PORT_SCENE_OCEAN_SLICES[2].top;
  if (masterY <= horizonY) return PORT_SCENE_DEPTH.horizon;
  if (masterY <= distantShoreY) {
    return interpolateDepth(
      PORT_SCENE_DEPTH.horizon,
      PORT_SCENE_DEPTH.shoreline,
      (masterY - horizonY) / (distantShoreY - horizonY)
    );
  }
  if (masterY <= foregroundShoreY) {
    return interpolateDepth(
      PORT_SCENE_DEPTH.shoreline,
      PORT_SCENE_DEPTH.foreground,
      (masterY - distantShoreY) / (foregroundShoreY - distantShoreY)
    );
  }
  return PORT_SCENE_DEPTH.foreground;
}

export function cityOceanWaveAmplitude(masterY) {
  const progress = cityOceanDepthProgress(masterY);
  return CITY_OCEAN_WAVE_MIN_AMPLITUDE_PX +
    (CITY_OCEAN_WAVE_MAX_AMPLITUDE_PX - CITY_OCEAN_WAVE_MIN_AMPLITUDE_PX) * progress ** 1.65;
}

export function cityOceanRowOffset(masterY, timeMs) {
  if (!Number.isFinite(timeMs)) throw new Error(`City ocean animation time must be finite, got ${timeMs}`);
  const progress = cityOceanDepthProgress(masterY);
  const loadingRow = LOADING_CAPSULE_HORIZON_Y + progress *
    (LOADING_CAPSULE_HEIGHT - 1 - LOADING_CAPSULE_HORIZON_Y);
  const unitWave = loadingWaveOffset(loadingRow, timeMs) / loadingWaveAmplitude(loadingRow);
  return Math.round(unitWave * cityOceanWaveAmplitude(masterY));
}

function cityOceanDepthProgress(masterY) {
  assertFiniteRow(masterY);
  const oceanTop = PORT_SCENE_OCEAN_SLICES[0].top;
  const oceanBottom = PORT_SCENE_OCEAN_SLICES.at(-1).bottom - 1;
  return Math.max(0, Math.min(1, (masterY - oceanTop) / (oceanBottom - oceanTop)));
}

function interpolateDepth(start, end, progress) {
  return start + (end - start) * progress;
}

function assertFiniteRow(masterY) {
  if (!Number.isFinite(masterY)) throw new Error(`City ocean row must be finite, got ${masterY}`);
}
