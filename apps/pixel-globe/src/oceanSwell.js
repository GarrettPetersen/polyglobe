export const OCEAN_SWELL_FRAME_COUNT = 32;
export const CALM_SWELL_PACKET_PERIOD_MS = 26000;
export const CALM_SWELL_PACKET_DURATION_MS = 7000;
export const CALM_SWELL_MAX_AMPLITUDE_PX = 1;
export const STORM_SWELL_MAX_AMPLITUDE_PX = 3;

const STORM_SWELL_PERIOD_MS = 5000;
const CALM_SWELL_WAVE_PERIOD_MS = 12000;
const GLOBE_WAVE_AXIS = normalize3([0.71, 0.43, -0.56]);
const GLOBE_WAVE_CYCLES = 12;
const TAU = Math.PI * 2;

export function oceanSwellState({ nowMs, stormStrength, flowDirectionRad }) {
  for (const [label, value] of Object.entries({ nowMs, stormStrength, flowDirectionRad })) {
    if (!Number.isFinite(value)) throw new Error(`Ocean swell ${label} must be finite: ${value}`);
  }
  if (nowMs < 0) throw new Error(`Ocean swell time must be non-negative: ${nowMs}`);
  if (stormStrength < 0 || stormStrength > 1) {
    throw new Error(`Ocean swell storm strength must be within 0..1: ${stormStrength}`);
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
  const settlingActive = stormStrength > 0 || calmEnvelope >= 0.58;

  return Object.freeze({
    amplitudePx,
    cacheKey: `${frame}:${directionBin}:${amplitudeBin}`,
    cycle,
    flow: Object.freeze({
      x: Math.cos(flowDirectionRad),
      y: -Math.sin(flowDirectionRad)
    }),
    frame,
    settlingActive,
    settlementStepPx: settlingActive
      ? (stormStrength >= 0.55 ? 2 : 1)
      : 0,
    stormStrength
  });
}

export function oceanSwellOffset(state, globePosition) {
  if (!state || !Number.isFinite(state.amplitudePx) || !Number.isFinite(state.cycle)) {
    throw new Error("Ocean swell offset requires a valid swell state");
  }
  if (!Array.isArray(globePosition) || globePosition.length !== 3 ||
      globePosition.some((value) => !Number.isFinite(value))) {
    throw new Error("Ocean swell offset requires a finite globe position");
  }
  if (state.amplitudePx <= 0) return { x: 0, y: 0 };

  const spatialCycles = dot3(globePosition, GLOBE_WAVE_AXIS) * GLOBE_WAVE_CYCLES;
  const displacement = Math.sin(TAU * (state.cycle - spatialCycles)) * state.amplitudePx;
  return {
    x: roundPixel(state.flow.x * displacement),
    y: roundPixel(state.flow.y * displacement)
  };
}

export function calmSwellEnvelope(nowMs) {
  if (!Number.isFinite(nowMs) || nowMs < 0) {
    throw new Error(`Calm swell time must be non-negative: ${nowMs}`);
  }
  const packetTime = modulo(nowMs, CALM_SWELL_PACKET_PERIOD_MS);
  if (packetTime >= CALM_SWELL_PACKET_DURATION_MS) return 0;
  const progress = packetTime / CALM_SWELL_PACKET_DURATION_MS;
  return Math.sin(Math.PI * progress) ** 2;
}

function normalize3(vector) {
  const length = Math.hypot(...vector);
  return vector.map((value) => value / length);
}

function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function modulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function roundPixel(value) {
  const rounded = Math.round(value);
  return Object.is(rounded, -0) ? 0 : rounded;
}
