import { SHIP_WATERLINE_LEVEL } from "./shipWaterline.js";

export const SHIP_SINK_EFFECT_DURATION_MS = 5200;
export const SHIP_SINK_DEPTH_CHANNEL_TOLERANCE = 4;

const SHIP_SINK_BURST_SHARE = 0.28;
const SHIP_SINK_START_MS = 320;
const SHIP_SINK_MAX_SETTLE_SHARE = 0.18;
const SHIP_SINK_SURFACE_LEVEL = 0.2;
const SHIP_SINK_RIPPLE_COLOR = "#fff1bf";
const SHIP_SINK_SUBMERSION_FADE_RANGE = 0.24;
const SHIP_SINK_REFRACTION_BAND_HEIGHT = 3;

export function shipSinkDepthByte(red, green, blue, location = "") {
  for (const [channel, value] of Object.entries({ red, green, blue })) {
    if (!Number.isInteger(value) || value < 0 || value > 255) {
      throw new Error(`Ship sinking depth map has invalid ${channel} channel${location}: ${value}`);
    }
  }
  const minimum = Math.min(red, green, blue);
  const maximum = Math.max(red, green, blue);
  const spread = maximum - minimum;
  if (spread > SHIP_SINK_DEPTH_CHANNEL_TOLERANCE) {
    throw new Error(
      `Ship sinking depth map is materially non-grayscale${location}: rgb(${red},${green},${blue})`
    );
  }
  return red + green + blue - minimum - maximum;
}

export function createShipSinkEffect({
  id,
  pixels,
  frameSize,
  originX,
  originY,
  startedAtMs,
  seed
}) {
  if (!id) throw new Error("Ship sink effect requires an id");
  if (!Array.isArray(pixels) || pixels.length === 0) {
    throw new Error(`Ship sink effect ${id} requires opaque sprite pixels`);
  }
  if (!Number.isInteger(frameSize) || frameSize <= 0) {
    throw new Error(`Ship sink effect ${id} has invalid frame size: ${frameSize}`);
  }
  for (const [label, value] of Object.entries({ originX, originY, startedAtMs, seed })) {
    if (!Number.isFinite(value)) throw new Error(`Ship sink effect ${id} has invalid ${label}: ${value}`);
  }

  const validatedPixels = pixels.map((pixel, index) => validatePixel(pixel, index, id, frameSize));
  const particleFlags = validatedPixels.map((pixel, index) => (
    unitRandom(seed, pixel.x, pixel.y, index, 0x42555253) < SHIP_SINK_BURST_SHARE
  ));
  if (validatedPixels.length > 1) {
    if (!particleFlags.some(Boolean)) particleFlags[bestFlagIndex(validatedPixels, seed, true)] = true;
    if (particleFlags.every(Boolean)) particleFlags[bestFlagIndex(validatedPixels, seed, false)] = false;
  }

  const hullPixels = [];
  const particles = [];
  for (let index = 0; index < validatedPixels.length; index++) {
    const pixel = validatedPixels[index];
    if (!particleFlags[index]) {
      hullPixels.push(pixel);
      continue;
    }
    particles.push(createBurstParticle(pixel, index, frameSize, seed));
  }
  const surface = inferSinkSurface(validatedPixels, originX, originY);

  return Object.freeze({
    id: String(id),
    frameSize,
    originX,
    originY,
    startedAtMs,
    seed: seed >>> 0,
    surfaceX: surface.x,
    waterlineY: surface.y,
    surfaceHalfWidth: surface.halfWidth,
    hullPixels: Object.freeze(hullPixels),
    particles: Object.freeze(particles)
  });
}

export function shipSinkFrame(effect, nowMs) {
  if (!effect?.hullPixels || !effect?.particles) throw new Error("Invalid ship sink effect state");
  if (!Number.isFinite(nowMs)) throw new Error(`Invalid ship sink frame time: ${nowMs}`);
  const elapsedMs = Math.max(0, nowMs - effect.startedAtMs);
  if (elapsedMs >= SHIP_SINK_EFFECT_DURATION_MS) {
    return { complete: true, hullPixels: [], particles: [], ripples: [] };
  }

  const timelineProgress = clamp(
    (elapsedMs - SHIP_SINK_START_MS) / (SHIP_SINK_EFFECT_DURATION_MS - SHIP_SINK_START_MS),
    0,
    1
  );
  const sinkProgress = SHIP_WATERLINE_LEVEL +
    (1 - SHIP_WATERLINE_LEVEL) * smootherstep(timelineProgress);
  const settleProgress = smoothstep(clamp((timelineProgress - 0.12) / 0.88, 0, 1));
  const maxSettleOffset = Math.max(2, Math.round(effect.frameSize * SHIP_SINK_MAX_SETTLE_SHARE));
  const sinkOffset = Math.round(settleProgress * maxSettleOffset);
  const hullFade = 1 - smoothstep(clamp((sinkProgress - 0.72) / 0.28, 0, 1));
  const hullPixels = [];
  for (const pixel of effect.hullPixels) {
    const y = Math.round(effect.originY + pixel.y + sinkOffset);
    const underwaterDepth = clamp(
      (sinkProgress - pixel.sinkHeight) / SHIP_SINK_SUBMERSION_FADE_RANGE,
      0,
      1
    );
    const underwater = sinkProgress >= pixel.sinkHeight;
    const refractionOffset = underwater
      ? underwaterRefractionOffset(effect, pixel, elapsedMs, sinkOffset, underwaterDepth)
      : 0;
    const submersionFade = 1 - smoothstep(underwaterDepth) * 0.9;
    hullPixels.push({
      x: Math.round(effect.originX + pixel.x + refractionOffset),
      y,
      color: pixel.color,
      alpha: pixel.alpha * hullFade * submersionFade,
      sinkHeight: pixel.sinkHeight,
      underwater,
      refractionOffset
    });
  }

  const particles = [];
  for (const particle of effect.particles) {
    const ageMs = elapsedMs - particle.delayMs;
    if (ageMs < 0 || ageMs >= particle.ttlMs) continue;
    const seconds = ageMs / 1000;
    const y = Math.round(effect.originY + particle.y + particle.vy * seconds + 0.5 * particle.gravity * seconds * seconds);
    if (y >= effect.waterlineY) continue;
    particles.push({
      x: Math.round(effect.originX + particle.x + particle.vx * seconds),
      y,
      color: particle.color,
      alpha: particle.alpha * (1 - smoothstep(ageMs / particle.ttlMs))
    });
  }

  return {
    complete: false,
    hullPixels,
    particles,
    ripples: sinkRipples(effect, elapsedMs)
  };
}

export function shipSinkEffectComplete(effect, nowMs) {
  if (!effect || !Number.isFinite(effect.startedAtMs)) throw new Error("Invalid ship sink effect state");
  if (!Number.isFinite(nowMs)) throw new Error(`Invalid ship sink completion time: ${nowMs}`);
  return nowMs - effect.startedAtMs >= SHIP_SINK_EFFECT_DURATION_MS;
}

function createBurstParticle(pixel, index, frameSize, seed) {
  const center = (frameSize - 1) / 2;
  const dx = pixel.x - center;
  const dy = pixel.y - center;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const speed = 10 + unitRandom(seed, pixel.x, pixel.y, index, 0x53504545) * 22;
  const jitter = (unitRandom(seed, pixel.x, pixel.y, index, 0x4a495454) - 0.5) * 13;
  return Object.freeze({
    ...pixel,
    vx: dx / distance * speed + jitter,
    vy: dy / distance * speed * 0.32 - 10 - unitRandom(seed, pixel.x, pixel.y, index, 0x4c494654) * 13,
    gravity: 24 + unitRandom(seed, pixel.x, pixel.y, index, 0x47524156) * 16,
    delayMs: Math.floor(unitRandom(seed, pixel.x, pixel.y, index, 0x44454c59) * 110),
    ttlMs: 1150 + Math.floor(unitRandom(seed, pixel.x, pixel.y, index, 0x4c494645) * 950)
  });
}

function sinkRipples(effect, elapsedMs) {
  const ripples = [];
  for (let ring = 0; ring < 4; ring++) {
    const delayMs = ring * 1250;
    const ageMs = elapsedMs - delayMs;
    if (ageMs < 0) continue;
    const life = clamp(ageMs / 1900, 0, 1);
    if (life >= 1) continue;
    const halfWidth = Math.max(3, Math.round(effect.surfaceHalfWidth * 0.7)) +
      Math.floor(life * (effect.frameSize * 0.42));
    const innerWidth = Math.max(0, halfWidth - 5);
    for (let dx = -halfWidth; dx <= halfWidth; dx++) {
      if (Math.abs(dx) < innerWidth) continue;
      if ((hash32(effect.seed ^ Math.imul(dx + 97, 0x9e3779b1) ^ ring) & 3) === 0) continue;
      ripples.push({
        x: Math.round(effect.surfaceX + dx),
        y: Math.round(effect.waterlineY + (ring & 1)),
        color: SHIP_SINK_RIPPLE_COLOR,
        alpha: (1 - smoothstep(life)) * (ring === 0 ? 0.86 : 0.62)
      });
    }
  }
  return ripples;
}

function inferSinkSurface(pixels, originX, originY) {
  const surfacePixels = pixels.filter((pixel) => pixel.sinkHeight <= SHIP_SINK_SURFACE_LEVEL);
  const sample = surfacePixels.length > 0 ? surfacePixels : pixels;
  let xTotal = 0;
  let yTotal = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  for (const pixel of sample) {
    xTotal += pixel.x;
    yTotal += pixel.y;
    minX = Math.min(minX, pixel.x);
    maxX = Math.max(maxX, pixel.x);
  }
  return Object.freeze({
    x: originX + Math.round(xTotal / sample.length),
    y: originY + Math.round(yTotal / sample.length),
    halfWidth: Math.max(2, Math.round((maxX - minX + 1) / 2))
  });
}

function underwaterRefractionOffset(effect, pixel, elapsedMs, sinkOffset, underwaterDepth) {
  if (underwaterDepth <= 0) return 0;
  const band = Math.floor((pixel.y + sinkOffset) / SHIP_SINK_REFRACTION_BAND_HEIGHT);
  const phase = elapsedMs / 150 + band * 1.17 + (effect.seed & 1023) * 0.017;
  return Math.round(Math.sin(phase) * Math.min(1, underwaterDepth * 2));
}

function validatePixel(pixel, index, id, frameSize) {
  if (!pixel || !Number.isInteger(pixel.x) || !Number.isInteger(pixel.y)) {
    throw new Error(`Ship sink effect ${id} has invalid pixel ${index}`);
  }
  if (pixel.x < 0 || pixel.x >= frameSize || pixel.y < 0 || pixel.y >= frameSize) {
    throw new Error(`Ship sink effect ${id} pixel ${index} is outside its frame`);
  }
  if (typeof pixel.color !== "string" || pixel.color.length === 0) {
    throw new Error(`Ship sink effect ${id} pixel ${index} has no color`);
  }
  if (!Number.isFinite(pixel.alpha) || pixel.alpha <= 0 || pixel.alpha > 1) {
    throw new Error(`Ship sink effect ${id} pixel ${index} has invalid alpha`);
  }
  if (!Number.isFinite(pixel.sinkHeight) || pixel.sinkHeight < 0 || pixel.sinkHeight > 1) {
    throw new Error(`Ship sink effect ${id} pixel ${index} has invalid sink height`);
  }
  return Object.freeze({
    x: pixel.x,
    y: pixel.y,
    color: pixel.color,
    alpha: pixel.alpha,
    sinkHeight: pixel.sinkHeight
  });
}

function bestFlagIndex(pixels, seed, selectParticle) {
  let bestIndex = 0;
  let bestValue = selectParticle ? Infinity : -Infinity;
  for (let index = 0; index < pixels.length; index++) {
    const pixel = pixels[index];
    const value = unitRandom(seed, pixel.x, pixel.y, index, 0x464c4147);
    if ((selectParticle && value < bestValue) || (!selectParticle && value > bestValue)) {
      bestIndex = index;
      bestValue = value;
    }
  }
  return bestIndex;
}

function unitRandom(seed, x, y, index, salt) {
  const value = (seed >>> 0) ^ Math.imul(x + 1, 0x85ebca6b) ^
    Math.imul(y + 1, 0xc2b2ae35) ^ Math.imul(index + 1, 0x27d4eb2f) ^ salt;
  return hash32(value) / 0x100000000;
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

function smoothstep(value) {
  const x = clamp(value, 0, 1);
  return x * x * (3 - 2 * x);
}

function smootherstep(value) {
  const x = clamp(value, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
