export const WATER_HEX_WAVE_PERIOD_MS = 9000;
export const WATER_HEX_WAVE_AMPLITUDE_PX = 1;

const TAU = Math.PI * 2;
const GLOBE_LONGITUDE_WAVELENGTH_DEG = 30;
const GLOBE_LATITUDE_WAVELENGTH_DEG = 60;
const LOCAL_X_WAVELENGTH_PX = 240;
const LOCAL_Y_WAVELENGTH_PX = 200;

export function globeWaterHexWaveOffset(nowMs, latitudeDeg, longitudeDeg) {
  return waterHexWaveOffset(
    nowMs,
    longitudeDeg / GLOBE_LONGITUDE_WAVELENGTH_DEG + latitudeDeg / GLOBE_LATITUDE_WAVELENGTH_DEG
  );
}

export function localWaterHexWaveOffset(nowMs, x, y) {
  return waterHexWaveOffset(
    nowMs,
    x / LOCAL_X_WAVELENGTH_PX + y / LOCAL_Y_WAVELENGTH_PX
  );
}

function waterHexWaveOffset(nowMs, spatialCycles) {
  if (!Number.isFinite(nowMs)) throw new Error(`Water hex wave received invalid time: ${nowMs}`);
  if (!Number.isFinite(spatialCycles)) {
    throw new Error(`Water hex wave received invalid spatial phase: ${spatialCycles}`);
  }
  const phase = TAU * (nowMs / WATER_HEX_WAVE_PERIOD_MS + spatialCycles);
  const offset = Math.round(Math.sin(phase) * WATER_HEX_WAVE_AMPLITUDE_PX);
  return Object.is(offset, -0) ? 0 : offset;
}
