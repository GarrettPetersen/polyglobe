const WAKE_MINIMUM_SPEED_PX = 2.5;
const WAKE_EMISSION_DISTANCE_PX = 2.25;
const WAKE_RESET_DISTANCE_PX = 26;
const WAKE_TRAILING_DISTANCE_PX = 5;
const WAKE_SHOULDER_DISTANCE_PX = 3;
const WAKE_TTL_SECONDS = 3.8;
const WAKE_MAX_PARTICLES = 260;
const WAKE_SIDE_SPEED_RATIO = Math.tan(19.47 * Math.PI / 180);
const WAKE_FOAM_KEEP_YOUNG = 0.78;
const WAKE_FOAM_KEEP_OLD = 0.42;
const WAKE_FOAM_EXTRA_CHANCE = 0.18;

export function updateFlatBattleShipWake(ship, dt, wakeAnchors = null) {
  if (!ship || !Array.isArray(ship.wake)) {
    throw new Error("Flat battle wake requires a ship with a wake array");
  }
  if (!Number.isFinite(dt) || dt < 0) throw new Error(`Invalid flat battle wake time: ${dt}`);
  ship.wakeClockSeconds = (ship.wakeClockSeconds || 0) + dt;
  for (const particle of ship.wake) {
    particle.age += dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
  }
  ship.wake = ship.wake.filter((particle) => particle.age < particle.ttl);
  if (Math.abs(ship.speedPx) < WAKE_MINIMUM_SPEED_PX) {
    ship.lastWakePoint = null;
    return;
  }

  const source = wakeAnchors
    ? bakedWakeSourcePoint(ship, wakeAnchors)
    : approximateWakeSourcePoint(ship);
  const last = ship.lastWakePoint;
  if (
    !last ||
    last.frame !== source.frame ||
    Math.hypot(source.x - last.x, source.y - last.y) > WAKE_RESET_DISTANCE_PX
  ) {
    emitWake(ship, source);
    ship.lastWakePoint = source;
    return;
  }
  const distance = Math.hypot(source.x - last.x, source.y - last.y);
  if (distance < WAKE_EMISSION_DISTANCE_PX) return;
  const steps = Math.max(1, Math.floor(distance / WAKE_EMISSION_DISTANCE_PX));
  for (let index = 1; index <= steps; index++) {
    const t = index / steps;
    emitWake(ship, interpolateWakeSource(last, source, t));
  }
  ship.lastWakePoint = source;
}

export function flatBattleWakeDrawCalls(ships, isWater) {
  if (!Array.isArray(ships)) throw new Error("Flat battle wake drawing requires ships");
  if (typeof isWater !== "function") throw new Error("Flat battle wake drawing requires a water test");
  const calls = [];
  for (const ship of ships) {
    for (const particle of ship.wake || []) appendParticleCalls(calls, particle, isWater);
    if (!ship.wakeAnchors) continue;
    const style = shipBowWaveStyle({
      speedPx: ship.speedPx,
      minimumWakeSpeedPx: WAKE_MINIMUM_SPEED_PX,
      elapsedSeconds: ship.wakeClockSeconds || 0
    });
    if (!style) continue;
    const source = bakedWakeSourcePoint(ship, ship.wakeAnchors);
    for (const pixel of shipBowWavePixels({
      port: source.port,
      starboard: source.starboard,
      side: source.side,
      style
    })) {
      if (isWater(pixel.x, pixel.y)) calls.push({ ...pixel, seed: ship.seed || 0 });
    }
  }
  return calls;
}

function approximateWakeSourcePoint(ship) {
  const reverse = ship.speedPx < 0 ? -1 : 1;
  const heading = {
    x: Math.cos(ship.headingRad) * reverse,
    y: Math.sin(ship.headingRad) * reverse
  };
  const side = { x: -heading.y, y: heading.x };
  const center = {
    x: ship.x - heading.x * WAKE_TRAILING_DISTANCE_PX,
    y: ship.y - heading.y * WAKE_TRAILING_DISTANCE_PX
  };
  return {
    x: center.x,
    y: center.y,
    port: {
      x: center.x + side.x * WAKE_SHOULDER_DISTANCE_PX,
      y: center.y + side.y * WAKE_SHOULDER_DISTANCE_PX
    },
    starboard: {
      x: center.x - side.x * WAKE_SHOULDER_DISTANCE_PX,
      y: center.y - side.y * WAKE_SHOULDER_DISTANCE_PX
    },
    side,
    speedPx: Math.abs(ship.speedPx),
    frame: null
  };
}

function bakedWakeSourcePoint(ship, wakeAnchors) {
  if (!Array.isArray(wakeAnchors) || wakeAnchors.length === 0) {
    throw new Error(`Flat battle ship ${ship.id || ship.shipSlug || "unknown"} has no wake anchors`);
  }
  const frame = screenHeadingFrame(ship.headingRad, wakeAnchors.length);
  const anchor = wakeAnchors[frame];
  if (!anchor) throw new Error(`Missing flat battle wake anchor frame ${frame}`);
  const heading = frameScreenHeading(frame, wakeAnchors.length);
  const side = { x: -heading.y, y: heading.x };
  const point = (value) => ({ x: ship.x + value.x, y: ship.y + value.y });
  const port = point(anchor.positiveShoulder);
  const starboard = point(anchor.negativeShoulder);
  const stern = point(anchor.stern);
  return {
    x: (port.x + starboard.x) / 2,
    y: (port.y + starboard.y) / 2,
    port,
    starboard,
    stern,
    side,
    speedPx: Math.abs(ship.speedPx),
    frame
  };
}

function interpolateWakeSource(a, b, t) {
  return {
    x: mix(a.x, b.x, t),
    y: mix(a.y, b.y, t),
    port: { x: mix(a.port.x, b.port.x, t), y: mix(a.port.y, b.port.y, t) },
    starboard: {
      x: mix(a.starboard.x, b.starboard.x, t),
      y: mix(a.starboard.y, b.starboard.y, t)
    },
    side: { x: mix(a.side.x, b.side.x, t), y: mix(a.side.y, b.side.y, t) },
    speedPx: mix(a.speedPx, b.speedPx, t),
    frame: b.frame
  };
}

function emitWake(ship, source) {
  const drift = source.speedPx * WAKE_SIDE_SPEED_RATIO;
  emitWakeParticle(ship, source.port, source.side, drift, "bow");
  emitWakeParticle(ship, source.starboard, source.side, -drift, "bow");
  if (source.speedPx > WAKE_MINIMUM_SPEED_PX * 1.45) {
    emitWakeParticle(ship, source.stern || source, source.side, 0, "stern");
  }
  const particleLimit = ship.wakeParticleLimit ?? WAKE_MAX_PARTICLES;
  if (!Number.isInteger(particleLimit) || particleLimit <= 0) {
    throw new Error(`Invalid flat battle wake particle limit: ${particleLimit}`);
  }
  if (ship.wake.length > particleLimit) {
    ship.wake.splice(0, ship.wake.length - particleLimit);
  }
}

function emitWakeParticle(ship, source, side, drift, kind) {
  const sequence = ship.wakeSeedCounter || 0;
  ship.wakeSeedCounter = (sequence + 1) >>> 0;
  ship.wake.push({
    x: source.x,
    y: source.y,
    vx: side.x * drift,
    vy: side.y * drift,
    age: 0,
    ttl: kind === "stern" ? WAKE_TTL_SECONDS * 0.42 : WAKE_TTL_SECONDS,
    kind,
    seed: wakeHash(
      Math.round(source.x * 4) ^
      Math.imul(Math.round(source.y * 4), 0x45d9f3b) ^
      Math.imul(sequence, 0x9e3779b1) ^
      (kind === "bow" ? 0x8d701f53 : 0x4f1bbcdc)
    )
  });
}

function appendParticleCalls(calls, particle, isWater) {
  const life = clamp(particle.age / particle.ttl, 0, 1);
  const alphaBase = particle.kind === "stern" ? 0.28 : 0.5;
  const alpha = Number((alphaBase * Math.pow(1 - life, 1.35)).toFixed(3));
  const velocity = Math.hypot(particle.vx, particle.vy);
  if (particle.kind === "stern" || velocity <= 0.001) {
    appendPixel(calls, isWater, particle, Math.round(particle.x), Math.round(particle.y), alpha);
    return;
  }
  const ux = particle.vx / velocity;
  const uy = particle.vy / velocity;
  const px = -uy;
  const py = ux;
  const length = clamp(Math.round(2 + life * 4), 2, 5);
  const keepChance = mix(WAKE_FOAM_KEEP_YOUNG, WAKE_FOAM_KEEP_OLD, life);
  let drawn = false;
  for (let index = -length; index <= 1; index++) {
    const hash = wakeHash(particle.seed ^ Math.imul(index + length + 1, 0x9e3779b1));
    if (index !== 0 && wakeUnit(hash) > keepChance) continue;
    const sideJitter = (hash >>> 9) % 3 - 1;
    const x = Math.round(particle.x + ux * index + px * sideJitter);
    const y = Math.round(particle.y + uy * index + py * sideJitter);
    drawn = appendPixel(calls, isWater, particle, x, y, alpha) || drawn;
    if (wakeUnit(wakeHash(hash ^ index)) < WAKE_FOAM_EXTRA_CHANCE * (1 - life * 0.55)) {
      drawn = appendPixel(calls, isWater, particle, x + Math.round(px), y + Math.round(py), alpha) || drawn;
    }
  }
  if (!drawn) appendPixel(calls, isWater, particle, Math.round(particle.x), Math.round(particle.y), alpha);
}

function appendPixel(calls, isWater, particle, x, y, alpha) {
  if (!isWater(x, y)) return false;
  calls.push({ x, y, alpha, seed: particle.seed });
  const hash = wakeHash(particle.seed ^ Math.imul(x, 31) ^ Math.imul(y, 17));
  if (wakeUnit(hash) < WAKE_FOAM_EXTRA_CHANCE) {
    const extraX = x + (((hash >>> 11) & 1) === 0 ? -1 : 1);
    const extraY = y + (((hash >>> 12) & 1) === 0 ? 0 : 1);
    if (isWater(extraX, extraY)) calls.push({ x: extraX, y: extraY, alpha, seed: hash });
  }
  return true;
}

function wakeHash(value) {
  let hash = value >>> 0;
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x846ca68b);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

function wakeUnit(value) {
  return (value >>> 0) / 0x100000000;
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function screenHeadingFrame(headingRad, headingCount) {
  const raw = Math.round(-headingRad / (Math.PI * 2) * headingCount);
  return ((raw % headingCount) + headingCount) % headingCount;
}

function frameScreenHeading(frame, headingCount) {
  const angle = frame / headingCount * Math.PI * 2;
  return { x: Math.cos(angle), y: -Math.sin(angle) };
}
import { shipBowWavePixels, shipBowWaveStyle } from "./shipBowWave.js";
