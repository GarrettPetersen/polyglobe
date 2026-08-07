import { SHIP_WATERLINE_LEVEL } from "./shipWaterline.js";

export const STORM_BREAKING_WAVE_MIN_INTENSITY = 0.5;
export const STORM_BREAKING_WAVE_DURATION_SECONDS = 4.8;
export const STORM_BREAKING_WAVE_IMPACT_PROGRESS = 0.5;
export const OVERBOARD_SWIM_MIN_SECONDS = 60;
export const OVERBOARD_SWIM_MAX_SECONDS = 180;
export const OVERBOARD_FLIGHT_MIN_SECONDS = 0.72;
export const OVERBOARD_FLIGHT_MAX_SECONDS = 1.08;

const FIRST_WAVE_MIN_SECONDS = 6;
const FIRST_WAVE_MAX_SECONDS = 11;
const REPEAT_WAVE_MIN_SECONDS = 24;
const REPEAT_WAVE_MAX_SECONDS = 40;
const CREST_MARGIN_PX = 26;
const CREST_SPACING_PX = 3;

export function createStormWaveState() {
  return {
    active: null,
    secondsUntilNextWave: null,
    serial: 0
  };
}

export function resetStormWaveState(state) {
  validateState(state);
  state.active = null;
  state.secondsUntilNextWave = null;
  state.serial = 0;
  return state;
}

export function updateStormWaveState(state, {
  dt,
  intensity,
  eligible,
  flow,
  random = Math.random,
  immediate = false
}) {
  validateState(state);
  validateUpdate({ dt, intensity, eligible, flow, random, immediate });

  let changed = false;
  let impact = null;
  if (!eligible || intensity < STORM_BREAKING_WAVE_MIN_INTENSITY) {
    if (state.active !== null || state.secondsUntilNextWave !== null) changed = true;
    state.active = null;
    state.secondsUntilNextWave = null;
    return { changed, impact };
  }

  if (!state.active) {
    if (state.secondsUntilNextWave === null) {
      state.secondsUntilNextWave = immediate
        ? 0
        : randomBetween(random, FIRST_WAVE_MIN_SECONDS, FIRST_WAVE_MAX_SECONDS);
    }
    state.secondsUntilNextWave -= dt;
    if (state.secondsUntilNextWave <= 0) {
      state.serial += 1;
      state.active = createBreakingWave({
        id: state.serial,
        intensity,
        flow,
        seed: Math.floor(random() * 0x100000000) >>> 0
      });
      state.secondsUntilNextWave = null;
      changed = true;
    }
    return { changed, impact };
  }

  const wave = state.active;
  const previousProgress = wave.elapsedSeconds / STORM_BREAKING_WAVE_DURATION_SECONDS;
  wave.elapsedSeconds += dt;
  const progress = wave.elapsedSeconds / STORM_BREAKING_WAVE_DURATION_SECONDS;
  if (!wave.impactResolved &&
      previousProgress < STORM_BREAKING_WAVE_IMPACT_PROGRESS &&
      progress >= STORM_BREAKING_WAVE_IMPACT_PROGRESS) {
    wave.impactResolved = true;
    impact = Object.freeze({
      id: wave.id,
      intensity: wave.intensity,
      flow: Object.freeze({ ...wave.flow }),
      seed: wave.seed
    });
  }
  if (progress >= 1) {
    state.active = null;
    state.secondsUntilNextWave = randomBetween(
      random,
      REPEAT_WAVE_MIN_SECONDS,
      REPEAT_WAVE_MAX_SECONDS
    );
  }
  return { changed: true, impact };
}

export function stormWaveFrame(wave, screenWidth, screenHeight) {
  validateWave(wave);
  if (!Number.isFinite(screenWidth) || screenWidth <= 0 ||
      !Number.isFinite(screenHeight) || screenHeight <= 0) {
    throw new Error(`Storm wave frame requires a positive viewport: ${screenWidth}x${screenHeight}`);
  }
  const progress = clamp(
    wave.elapsedSeconds / STORM_BREAKING_WAVE_DURATION_SECONDS,
    0,
    1
  );
  const extent = Math.hypot(screenWidth, screenHeight) / 2 + CREST_MARGIN_PX;
  const travel = lerp(-extent, extent, smootherstep(progress));
  const center = {
    x: screenWidth / 2 + wave.flow.x * travel,
    y: screenHeight / 2 + wave.flow.y * travel
  };
  const perpendicular = { x: -wave.flow.y, y: wave.flow.x };
  const wash = clamp(1 - Math.abs(progress - STORM_BREAKING_WAVE_IMPACT_PROGRESS) / 0.15, 0, 1);
  return Object.freeze({
    center: Object.freeze(center),
    perpendicular: Object.freeze(perpendicular),
    progress,
    wash,
    washSurfaceLevel: SHIP_WATERLINE_LEVEL + wash * 0.38,
    washAlpha: wash * (0.5 + wave.intensity * 0.3)
  });
}

export function stormWaveCrestParticles(wave, screenWidth, screenHeight) {
  const frame = stormWaveFrame(wave, screenWidth, screenHeight);
  const halfLength = Math.hypot(screenWidth, screenHeight) * 0.62 + CREST_MARGIN_PX;
  const count = Math.ceil(halfLength * 2 / CREST_SPACING_PX);
  const particles = [];
  for (let index = 0; index <= count; index++) {
    const hash = hash32(wave.seed ^ Math.imul(index + 1, 0x9e3779b1));
    if ((hash & 7) === 0) continue;
    const along = -halfLength + index * CREST_SPACING_PX;
    const broken = ((hash >>> 4) & 3) - 1;
    const x = Math.round(
      frame.center.x + frame.perpendicular.x * along + wave.flow.x * broken
    );
    const y = Math.round(
      frame.center.y + frame.perpendicular.y * along + wave.flow.y * broken
    );
    particles.push(Object.freeze({ x, y, alpha: 0.58 + ((hash >>> 8) & 7) * 0.05 }));
    if ((hash & 3) === 0) {
      const trail = 2 + ((hash >>> 12) & 3);
      particles.push(Object.freeze({
        x: Math.round(x - wave.flow.x * trail),
        y: Math.round(y - wave.flow.y * trail),
        alpha: 0.24 + ((hash >>> 16) & 3) * 0.06
      }));
    }
  }
  return Object.freeze(particles);
}

export function stormWaveCrewLossChance({ seaworthiness, intensity }) {
  if (!Number.isInteger(seaworthiness) || seaworthiness < 1 || seaworthiness > 10) {
    throw new Error(`Storm wave requires seaworthiness from 1 to 10: ${seaworthiness}`);
  }
  if (!Number.isFinite(intensity) || intensity < 0 || intensity > 1) {
    throw new Error(`Storm wave requires intensity from 0 to 1: ${intensity}`);
  }
  if (intensity < STORM_BREAKING_WAVE_MIN_INTENSITY) return 0;
  const vulnerability = (11 - seaworthiness) / 10;
  const stormSeverity = clamp(
    (intensity - STORM_BREAKING_WAVE_MIN_INTENSITY) /
      (1 - STORM_BREAKING_WAVE_MIN_INTENSITY),
    0,
    1
  );
  return clamp(
    0.48 * vulnerability ** 3.4 * (0.55 + stormSeverity * 0.45),
    0,
    0.48
  );
}

export function stormWaveSweptCrewCount({ crew, seaworthiness, intensity, random = Math.random }) {
  if (!Number.isInteger(crew) || crew < 0) throw new Error(`Invalid storm-wave crew: ${crew}`);
  if (typeof random !== "function") throw new Error("Storm-wave casualties require a random source");
  const available = Math.max(0, crew - 1);
  if (available === 0 || random() >= stormWaveCrewLossChance({ seaworthiness, intensity })) return 0;
  const maximum = Math.min(
    available,
    crew >= 120 ? 5 : crew >= 70 ? 4 : crew >= 35 ? 3 : crew >= 16 ? 2 : 1
  );
  const minimum = crew >= 70 ? Math.min(2, maximum) : 1;
  return minimum + Math.floor(random() * (maximum - minimum + 1));
}

export function stormWaveImpactSoundVolume({ intensity, sweptCrewCount }) {
  if (!Number.isFinite(intensity) || intensity < 0 || intensity > 1) {
    throw new Error(`Storm wave sound requires intensity from 0 to 1: ${intensity}`);
  }
  if (!Number.isInteger(sweptCrewCount) || sweptCrewCount < 0) {
    throw new Error(`Storm wave sound requires a nonnegative swept crew count: ${sweptCrewCount}`);
  }
  const severity = clamp(
    (intensity - STORM_BREAKING_WAVE_MIN_INTENSITY) /
      (1 - STORM_BREAKING_WAVE_MIN_INTENSITY),
    0,
    1
  );
  const sweepBoost = sweptCrewCount > 0
    ? 0.14 + Math.min(0.06, (sweptCrewCount - 1) * 0.02)
    : 0;
  return clamp(lerp(0.18, 0.38, severity) + sweepBoost, 0, 0.58);
}

export function overboardSwimDurationSeconds(random = Math.random) {
  if (typeof random !== "function") throw new Error("Overboard swim duration requires a random source");
  return randomBetween(random, OVERBOARD_SWIM_MIN_SECONDS, OVERBOARD_SWIM_MAX_SECONDS);
}

export function overboardFlightDurationSeconds(random = Math.random) {
  if (typeof random !== "function") throw new Error("Overboard flight duration requires a random source");
  return randomBetween(random, OVERBOARD_FLIGHT_MIN_SECONDS, OVERBOARD_FLIGHT_MAX_SECONDS);
}

export function overboardFlightLiftPx(ageSeconds, flightSeconds) {
  if (!Number.isFinite(ageSeconds) || ageSeconds < 0 ||
      !Number.isFinite(flightSeconds) || flightSeconds <= 0) {
    throw new Error(`Invalid overboard flight timing: ${ageSeconds}/${flightSeconds}`);
  }
  const progress = clamp(ageSeconds / flightSeconds, 0, 1);
  if (progress === 0 || progress === 1) return 0;
  return -Math.sin(progress * Math.PI) * 11;
}

export function snapshotOverboardCrew(entries) {
  if (!Array.isArray(entries)) throw new Error("Overboard crew snapshot requires an array");
  return entries.map((entry) => snapshotOverboardEntry(validateOverboardEntry(entry)));
}

export function restoreOverboardCrew(entries) {
  if (entries === undefined) return [];
  if (!Array.isArray(entries)) throw new Error("Saved overboard crew must be an array");
  const ids = new Set();
  return entries.map((entry) => {
    validateOverboardEntry(entry);
    if (ids.has(entry.id)) throw new Error(`Duplicate saved overboard sailor: ${entry.id}`);
    ids.add(entry.id);
    return snapshotOverboardEntry(entry);
  });
}

function createBreakingWave({ id, intensity, flow, seed }) {
  const length = Math.hypot(flow.x, flow.y);
  if (length <= 1e-9) throw new Error("Storm wave flow cannot be zero");
  return {
    id,
    intensity,
    flow: { x: flow.x / length, y: flow.y / length },
    seed: seed >>> 0,
    elapsedSeconds: 0,
    impactResolved: false
  };
}

function validateOverboardEntry(entry) {
  if (!entry || typeof entry !== "object") throw new Error("Overboard crew entry is missing");
  if (typeof entry.id !== "string" || entry.id.trim() === "") {
    throw new Error("Overboard crew entry requires an id");
  }
  if (entry.kind !== "generic" && entry.kind !== "named") {
    throw new Error(`Invalid overboard crew kind: ${entry.kind}`);
  }
  if (entry.kind === "named" && (!entry.character || typeof entry.character !== "object")) {
    throw new Error(`Named overboard sailor ${entry.id} requires character data`);
  }
  for (const [label, vector] of [["position", entry.position], ["startPosition", entry.startPosition]]) {
    if (!Array.isArray(vector) || vector.length !== 3 || vector.some((value) => !Number.isFinite(value)) ||
        Math.hypot(...vector) < 0.5) {
      throw new Error(`Overboard sailor ${entry.id} has an invalid ${label}`);
    }
  }
  for (const [label, value] of [
    ["ageSeconds", entry.ageSeconds],
    ["flightSeconds", entry.flightSeconds],
    ["remainingSeconds", entry.remainingSeconds]
  ]) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Overboard sailor ${entry.id} has invalid ${label}: ${value}`);
    }
  }
  if (entry.flightSeconds <= 0) {
    throw new Error(`Overboard sailor ${entry.id} requires a positive flight time`);
  }
  if (!Number.isInteger(entry.seed) || entry.seed < 0 || !Number.isInteger(entry.variant) || entry.variant < 0) {
    throw new Error(`Overboard sailor ${entry.id} has invalid visual metadata`);
  }
  if (typeof entry.splashed !== "boolean") {
    throw new Error(`Overboard sailor ${entry.id} has invalid splash state`);
  }
  return entry;
}

function snapshotOverboardEntry(entry) {
  return {
    id: entry.id,
    kind: entry.kind,
    character: entry.character ? structuredClone(entry.character) : null,
    position: entry.position.slice(),
    startPosition: entry.startPosition.slice(),
    ageSeconds: entry.ageSeconds,
    flightSeconds: entry.flightSeconds,
    remainingSeconds: entry.remainingSeconds,
    seed: entry.seed,
    variant: entry.variant,
    splashed: entry.splashed
  };
}

function validateState(state) {
  if (!state || typeof state !== "object") throw new Error("Storm wave state is missing");
  if (!Number.isInteger(state.serial) || state.serial < 0) {
    throw new Error(`Invalid storm wave serial: ${state.serial}`);
  }
  if (state.secondsUntilNextWave !== null && !Number.isFinite(state.secondsUntilNextWave)) {
    throw new Error(`Invalid storm wave timer: ${state.secondsUntilNextWave}`);
  }
  if (state.active !== null) validateWave(state.active);
}

function validateWave(wave) {
  if (!wave || typeof wave !== "object" || !Number.isInteger(wave.id) || wave.id <= 0) {
    throw new Error("Invalid active storm wave");
  }
  if (!Number.isFinite(wave.elapsedSeconds) || wave.elapsedSeconds < 0 ||
      !Number.isFinite(wave.intensity) || wave.intensity < 0 || wave.intensity > 1 ||
      !Number.isInteger(wave.seed) || typeof wave.impactResolved !== "boolean") {
    throw new Error(`Malformed active storm wave: ${wave.id}`);
  }
  const flowLength = Math.hypot(wave.flow?.x, wave.flow?.y);
  if (!Number.isFinite(flowLength) || Math.abs(flowLength - 1) > 1e-6) {
    throw new Error(`Storm wave ${wave.id} has invalid flow`);
  }
}

function validateUpdate({ dt, intensity, eligible, flow, random, immediate }) {
  if (!Number.isFinite(dt) || dt < 0) throw new Error(`Invalid storm wave dt: ${dt}`);
  if (!Number.isFinite(intensity) || intensity < 0 || intensity > 1) {
    throw new Error(`Invalid storm wave intensity: ${intensity}`);
  }
  if (typeof eligible !== "boolean" || typeof immediate !== "boolean") {
    throw new Error("Storm wave eligibility flags must be boolean");
  }
  if (!flow || !Number.isFinite(flow.x) || !Number.isFinite(flow.y)) {
    throw new Error("Storm wave update requires finite screen flow");
  }
  if (typeof random !== "function") throw new Error("Storm wave update requires a random source");
}

function randomBetween(random, min, max) {
  return min + random() * (max - min);
}

function hash32(value) {
  let result = value >>> 0;
  result ^= result >>> 16;
  result = Math.imul(result, 0x7feb352d);
  result ^= result >>> 15;
  result = Math.imul(result, 0x846ca68b);
  result ^= result >>> 16;
  return result >>> 0;
}

function smootherstep(value) {
  const x = clamp(value, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
