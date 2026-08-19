export const OCEAN_SWELL_FRAME_COUNT = 64;
export const CALM_SWELL_PACKET_PERIOD_MS = 20000;
export const CALM_SWELL_PACKET_DURATION_MS = 11000;
export const CALM_SWELL_PACKET_FADE_MS = 1000;
export const CALM_SWELL_MAX_AMPLITUDE_PX = 1;
export const STORM_SWELL_MAX_AMPLITUDE_PX = 3;
export const CALM_SWELL_WAVE_PERIOD_MS = 6500;
export const STORM_SWELL_PERIOD_MS = 6500;
export const OCEAN_SWELL_SPATIAL_CYCLES = 7;
export const CALM_SWELL_BAND_WIDTH = 0.14;
export const STORM_SWELL_BAND_WIDTH = 0.16;

const PHASE_AXIS_QUANTIZATION = 64;
const TAU = Math.PI * 2;

export function oceanSwellState({ nowMs, stormStrength, flowDirectionRad, phaseAxis }) {
  for (const [label, value] of Object.entries({ nowMs, stormStrength, flowDirectionRad })) {
    if (!Number.isFinite(value)) throw new Error(`Ocean swell ${label} must be finite: ${value}`);
  }
  if (nowMs < 0) throw new Error(`Ocean swell time must be non-negative: ${nowMs}`);
  if (stormStrength < 0 || stormStrength > 1) {
    throw new Error(`Ocean swell storm strength must be within 0..1: ${stormStrength}`);
  }
  if (!Array.isArray(phaseAxis) || phaseAxis.length !== 3 ||
      phaseAxis.some((value) => !Number.isFinite(value))) {
    throw new Error("Ocean swell phase axis must be a finite 3D vector");
  }

  const calmEnvelope = calmSwellEnvelope(nowMs);
  const stormAmplitude = stormStrength > 0
    ? 1 + stormStrength * (STORM_SWELL_MAX_AMPLITUDE_PX - 1)
    : 0;
  const amplitudePx = Math.max(
    calmEnvelope * CALM_SWELL_MAX_AMPLITUDE_PX,
    stormAmplitude
  );
  const periodMs = lerp(CALM_SWELL_WAVE_PERIOD_MS, STORM_SWELL_PERIOD_MS, stormStrength);
  const cycle = modulo(nowMs / periodMs, 1);
  const frame = Math.floor(cycle * OCEAN_SWELL_FRAME_COUNT) % OCEAN_SWELL_FRAME_COUNT;
  const directionBin = modulo(
    Math.round(flowDirectionRad / TAU * 16),
    16
  );
  const amplitudeBin = Math.round(amplitudePx * 4);
  const bandWidth = lerp(CALM_SWELL_BAND_WIDTH, STORM_SWELL_BAND_WIDTH, stormStrength);
  const bandWidthBin = Math.round(bandWidth * PHASE_AXIS_QUANTIZATION);
  const settled = amplitudeBin === 0;
  const cachedFrame = settled ? 0 : frame;
  const cachedDirectionBin = settled ? 0 : directionBin;
  const cachedDirectionRad = cachedDirectionBin / 16 * TAU;
  const cachedPhaseAxis = quantizedUnitVector(phaseAxis, PHASE_AXIS_QUANTIZATION);
  const phaseAxisKey = cachedPhaseAxis.map(
    (value) => Math.round(value * PHASE_AXIS_QUANTIZATION)
  ).join(":");
  return Object.freeze({
    amplitudePx: amplitudeBin / 4,
    bandWidth: bandWidthBin / PHASE_AXIS_QUANTIZATION,
    cacheKey: `${cachedFrame}:${cachedDirectionBin}:${amplitudeBin}:${bandWidthBin}:${phaseAxisKey}`,
    cycle: settled ? 0 : cachedFrame / OCEAN_SWELL_FRAME_COUNT,
    flow: Object.freeze({
      x: Math.cos(cachedDirectionRad),
      y: -Math.sin(cachedDirectionRad)
    }),
    frame: cachedFrame,
    phaseAxis: Object.freeze(cachedPhaseAxis),
    stormStrength,
    travelPeriodMs: periodMs
  });
}

export function oceanSwellOffset(state, globePosition) {
  const displacement = oceanSwellBandDisplacement(state, globePosition);
  if (displacement === 0) return { x: 0, y: 0 };
  return {
    x: roundPixel(state.flow.x * displacement),
    y: roundPixel(state.flow.y * displacement)
  };
}

export function oceanSwellLiftPx(state, globePosition) {
  return -roundPixel(oceanSwellBandDisplacement(state, globePosition));
}

function oceanSwellBandDisplacement(state, globePosition) {
  if (!state || !Number.isFinite(state.amplitudePx) || !Number.isFinite(state.cycle) ||
      !Number.isFinite(state.bandWidth) || state.bandWidth <= 0 || state.bandWidth >= 1) {
    throw new Error("Ocean swell offset requires a valid swell state");
  }
  if (!Array.isArray(globePosition) || globePosition.length !== 3 ||
      globePosition.some((value) => !Number.isFinite(value))) {
    throw new Error("Ocean swell offset requires a finite globe position");
  }
  if (state.amplitudePx <= 0) return 0;

  const spatialCycles = dot3(globePosition, state.phaseAxis) * OCEAN_SWELL_SPATIAL_CYCLES;
  const bandPhase = modulo(state.cycle - spatialCycles, 1);
  if (bandPhase >= state.bandWidth) return 0;
  const bandProgress = bandPhase / state.bandWidth;
  const bandEnvelope = Math.sin(Math.PI * bandProgress) ** 2;
  return Math.sin(TAU * bandProgress) * bandEnvelope * state.amplitudePx;
}

export function calmSwellEnvelope(nowMs) {
  if (!Number.isFinite(nowMs) || nowMs < 0) {
    throw new Error(`Calm swell time must be non-negative: ${nowMs}`);
  }
  const packetTime = modulo(nowMs, CALM_SWELL_PACKET_PERIOD_MS);
  if (packetTime >= CALM_SWELL_PACKET_DURATION_MS) return 0;
  if (packetTime < CALM_SWELL_PACKET_FADE_MS) {
    return smoothstep01(packetTime / CALM_SWELL_PACKET_FADE_MS);
  }
  const fadeOutStart = CALM_SWELL_PACKET_DURATION_MS - CALM_SWELL_PACKET_FADE_MS;
  if (packetTime > fadeOutStart) {
    return smoothstep01(
      (CALM_SWELL_PACKET_DURATION_MS - packetTime) / CALM_SWELL_PACKET_FADE_MS
    );
  }
  return 1;
}

function normalize3(vector) {
  const length = Math.hypot(...vector);
  if (length <= 1e-9) throw new Error("Ocean swell phase axis cannot be zero");
  return vector.map((value) => value / length);
}

function quantizedUnitVector(vector, scale) {
  const normalized = normalize3(vector);
  return normalize3(normalized.map((value) => Math.round(value * scale) / scale));
}

function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep01(value) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

function modulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function roundPixel(value) {
  const rounded = Math.round(value);
  return Object.is(rounded, -0) ? 0 : rounded;
}
