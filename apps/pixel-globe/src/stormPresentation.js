export const STORM_PASSAGE_ENTERED = "entered";
export const STORM_PASSAGE_CLEARED = "cleared";

const FOG_COLORS = Object.freeze([
  Object.freeze([137, 153, 157]),
  Object.freeze([169, 182, 181]),
  Object.freeze([199, 204, 195])
]);

export function createStormPassageState(active = false) {
  if (typeof active !== "boolean") throw new Error(`Storm passage active state must be boolean: ${active}`);
  return {
    active,
    warningPending: false,
    clearancePending: false,
    belowExitSinceMs: null
  };
}

export function updateStormPassage(
  state,
  intensity,
  { enterIntensity, exitIntensity, clearanceDelayMs },
  nowMs
) {
  validateStormPassageState(state);
  validateStormThresholds(intensity, enterIntensity, exitIntensity, clearanceDelayMs, nowMs);

  if (!state.active && intensity >= enterIntensity) {
    state.active = true;
    state.warningPending = true;
    state.clearancePending = false;
    state.belowExitSinceMs = null;
    return STORM_PASSAGE_ENTERED;
  }
  if (state.active && intensity < exitIntensity) {
    if (state.belowExitSinceMs === null) {
      state.belowExitSinceMs = nowMs;
      return null;
    }
    if (nowMs - state.belowExitSinceMs < clearanceDelayMs) return null;
    state.active = false;
    state.warningPending = false;
    state.clearancePending = true;
    state.belowExitSinceMs = null;
    return STORM_PASSAGE_CLEARED;
  }
  state.belowExitSinceMs = null;
  return null;
}

export function markStormWarningDelivered(state) {
  validateStormPassageState(state);
  if (!state.warningPending) throw new Error("Storm warning is not pending");
  state.warningPending = false;
}

export function markStormClearanceDelivered(state) {
  validateStormPassageState(state);
  if (!state.clearancePending) throw new Error("Storm clearance is not pending");
  state.clearancePending = false;
}

export function stormFogStrength(intensity, enterIntensity, fullIntensity) {
  for (const [label, value] of Object.entries({ intensity, enterIntensity, fullIntensity })) {
    if (!Number.isFinite(value)) throw new Error(`Storm fog ${label} must be finite: ${value}`);
  }
  if (enterIntensity < 0 || fullIntensity <= enterIntensity || fullIntensity > 1) {
    throw new Error(`Invalid storm fog thresholds: ${enterIntensity}, ${fullIntensity}`);
  }
  const normalized = clamp((intensity - enterIntensity) / (fullIntensity - enterIntensity), 0, 1);
  const smoothStrength = normalized * normalized * (3 - 2 * normalized);
  return Math.sqrt(smoothStrength);
}

export function fillStormEdgeFogPixels(pixels, width, height, seed = 0x464f4721) {
  if (!(pixels instanceof Uint8ClampedArray)) {
    throw new Error("Storm fog pixels must be Uint8ClampedArray data");
  }
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new Error(`Storm fog dimensions must be positive integers: ${width}x${height}`);
  }
  if (pixels.length !== width * height * 4) {
    throw new Error(`Storm fog pixel length ${pixels.length} does not match ${width}x${height}`);
  }
  if (!Number.isInteger(seed)) throw new Error(`Storm fog seed must be an integer: ${seed}`);

  pixels.fill(0);
  const depth = Math.max(8, Math.min(54, Math.floor(Math.min(width, height) * 0.22)));
  const maxDepth = Math.ceil(depth * 1.3);
  const topDepths = edgeDepths(width, depth, seed, 0);
  const bottomDepths = edgeDepths(width, depth, seed, 1);
  const leftDepths = edgeDepths(height, depth, seed, 2);
  const rightDepths = edgeDepths(height, depth, seed, 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const edgeDistance = Math.min(x, y, width - 1 - x, height - 1 - y);
      if (edgeDistance >= maxDepth) continue;
      const top = fogEdgeBand(y, topDepths[x]);
      const bottom = fogEdgeBand(height - 1 - y, bottomDepths[x]);
      const left = fogEdgeBand(x, leftDepths[y]);
      const right = fogEdgeBand(width - 1 - x, rightDepths[y]);
      const density = Math.max(top, bottom, left, right);
      if (density <= 0) continue;

      // Break up only the thinnest inner fringe. Broad fog banks remain calm
      // and contiguous instead of reading as high-frequency screen noise.
      if (density < 0.24) {
        const fringeCoverage = density / 0.24;
        if (fogNoise(Math.floor(x / 2), y, seed ^ 0x2c1b3c6d) > fringeCoverage) continue;
      }

      const shade = density >= 0.7 ? 2 : density >= 0.34 ? 1 : 0;
      const color = FOG_COLORS[shade];
      const offset = (y * width + x) * 4;
      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
      pixels[offset + 3] = Math.round(64 + Math.ceil(density * 5) / 5 * 144);
    }
  }
  return depth;
}

function validateStormPassageState(state) {
  if (
    !state ||
    typeof state.active !== "boolean" ||
    typeof state.warningPending !== "boolean" ||
    typeof state.clearancePending !== "boolean" ||
    (state.belowExitSinceMs !== null && (!Number.isFinite(state.belowExitSinceMs) || state.belowExitSinceMs < 0))
  ) {
    throw new Error("Invalid storm passage state");
  }
}

function validateStormThresholds(intensity, enterIntensity, exitIntensity, clearanceDelayMs, nowMs) {
  for (const [label, value] of Object.entries({ intensity, enterIntensity, exitIntensity, clearanceDelayMs, nowMs })) {
    if (!Number.isFinite(value)) throw new Error(`Storm passage ${label} must be finite: ${value}`);
  }
  if (exitIntensity < 0 || enterIntensity <= exitIntensity || enterIntensity > 1) {
    throw new Error(`Invalid storm passage thresholds: ${exitIntensity}, ${enterIntensity}`);
  }
  if (clearanceDelayMs < 0) throw new Error(`Invalid storm clearance delay: ${clearanceDelayMs}`);
  if (nowMs < 0) throw new Error(`Invalid storm passage time: ${nowMs}`);
}

function fogNoise(x, y, seed) {
  let value = seed ^ Math.imul(x + 1, 0x9e3779b1) ^ Math.imul(y + 1, 0x85ebca6b);
  value = Math.imul(value ^ value >>> 16, 0x7feb352d);
  value = Math.imul(value ^ value >>> 15, 0x846ca68b);
  return ((value ^ value >>> 16) >>> 0) / 0xffffffff;
}

function fogEdgeDepth(position, baseDepth, seed, edge) {
  const phase = fogNoise(edge, 0, seed) * Math.PI * 2;
  const broad = Math.sin(position * 0.038 + phase) * 0.15;
  const ripple = Math.sin(position * 0.11 + phase * 1.7) * 0.07;
  const block = (fogNoise(Math.floor(position / 18), edge, seed ^ 0x51f15e) - 0.5) * 0.18;
  return baseDepth * (0.86 + broad + ripple + block);
}

function edgeDepths(length, baseDepth, seed, edge) {
  return Float32Array.from({ length }, (_, position) => fogEdgeDepth(position, baseDepth, seed, edge));
}

function fogEdgeBand(distance, depth) {
  return clamp(1 - distance / depth, 0, 1);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
