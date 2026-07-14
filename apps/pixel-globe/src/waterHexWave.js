export const WATER_HEX_WAVE_PERIOD_MS = 9000;
export const WATER_HEX_WAVE_AMPLITUDE_PX = 1;
export const WATER_HEX_WAVE_ROW_WAVELENGTH_PX = 16;
export const WATER_HEX_WAVE_FRAME_COUNT = 16;

const TAU = Math.PI * 2;
const GLOBE_LONGITUDE_WAVELENGTH_DEG = 30;
const GLOBE_LATITUDE_WAVELENGTH_DEG = 60;
const LOCAL_X_WAVELENGTH_PX = 240;
const LOCAL_Y_WAVELENGTH_PX = 200;

export function globeWaterHexWaveFrame(nowMs, latitudeDeg, longitudeDeg) {
  return waterHexWaveFrame(
    nowMs,
    longitudeDeg / GLOBE_LONGITUDE_WAVELENGTH_DEG + latitudeDeg / GLOBE_LATITUDE_WAVELENGTH_DEG
  );
}

export function localWaterHexWaveFrame(nowMs, x, y) {
  return waterHexWaveFrame(
    nowMs,
    x / LOCAL_X_WAVELENGTH_PX + y / LOCAL_Y_WAVELENGTH_PX
  );
}

export function waterHexWaveBandsForFrame(frame, height) {
  if (!Number.isInteger(frame) || frame < 0 || frame >= WATER_HEX_WAVE_FRAME_COUNT) {
    throw new Error(`Water hex wave received invalid frame: ${frame}`);
  }
  if (!Number.isInteger(height) || height <= 0) {
    throw new Error(`Water hex wave received invalid sprite height: ${height}`);
  }
  const cycle = frame / WATER_HEX_WAVE_FRAME_COUNT;
  const bands = [];
  for (let y = 0; y < height; y++) {
    const offsetX = waterPixelRowOffset(cycle, y);
    const previous = bands[bands.length - 1];
    if (previous?.offsetX === offsetX) {
      previous.height++;
    } else {
      bands.push({ y, height: 1, offsetX });
    }
  }
  return bands;
}

function waterHexWaveFrame(nowMs, spatialCycles) {
  validateWavePhaseInputs(nowMs, spatialCycles);
  const normalizedSpatialCycles = ((spatialCycles % 1) + 1) % 1;
  const cycle = ((nowMs / WATER_HEX_WAVE_PERIOD_MS + normalizedSpatialCycles) % 1 + 1) % 1;
  return Math.floor(cycle * WATER_HEX_WAVE_FRAME_COUNT) % WATER_HEX_WAVE_FRAME_COUNT;
}

function waterPixelRowOffset(cycle, row) {
  const phase = TAU * (
    cycle
    + row / WATER_HEX_WAVE_ROW_WAVELENGTH_PX
  );
  const offset = Math.round(Math.sin(phase) * WATER_HEX_WAVE_AMPLITUDE_PX);
  return Object.is(offset, -0) ? 0 : offset;
}

function validateWavePhaseInputs(nowMs, spatialCycles) {
  if (!Number.isFinite(nowMs)) throw new Error(`Water hex wave received invalid time: ${nowMs}`);
  if (!Number.isFinite(spatialCycles)) {
    throw new Error(`Water hex wave received invalid spatial phase: ${spatialCycles}`);
  }
}
