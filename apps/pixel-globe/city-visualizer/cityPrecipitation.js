export const CITY_PRECIPITATION_PARTICLE_COUNT = Object.freeze({
  rain: 72,
  snow: 46
});

export function cityPrecipitationParticles({
  kind,
  intensity,
  timeMs,
  width,
  height,
  wind
}) {
  if (!Object.hasOwn(CITY_PRECIPITATION_PARTICLE_COUNT, kind)) {
    throw new Error(`Unknown city precipitation kind: ${kind}`);
  }
  if (!Number.isFinite(intensity) || intensity < 0 || intensity > 1) {
    throw new Error(`City precipitation intensity must be within 0..1: ${intensity}`);
  }
  if (!Number.isFinite(timeMs) || timeMs < 0) {
    throw new Error(`Invalid city precipitation time: ${timeMs}`);
  }
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new Error(`Invalid city precipitation viewport: ${width}x${height}`);
  }
  if (!Number.isFinite(wind?.flowX) || !Number.isFinite(wind?.flowY) ||
      !Number.isFinite(wind?.strength)) {
    throw new Error("City precipitation requires a finite wind vector");
  }
  const count = Math.max(1, Math.round(CITY_PRECIPITATION_PARTICLE_COUNT[kind] * intensity));
  return Object.freeze(Array.from({ length: count }, (_entry, index) => (
    cityPrecipitationParticle({ kind, index, timeMs, width, height, wind })
  )));
}

function cityPrecipitationParticle({ kind, index, timeMs, width, height, wind }) {
  const rain = kind === "rain";
  const durationMs = rain ? 560 + hashUnit(index, 7) * 360 : 2600 + hashUnit(index, 11) * 1900;
  const phaseMs = hashUnit(index, 13) * durationMs;
  const progress = positiveModulo(timeMs + phaseMs, durationMs) / durationMs;
  const travelMargin = rain ? 54 : 28;
  const baseX = hashUnit(index, 17) * (width + travelMargin * 2) - travelMargin;
  const windTravel = wind.flowX * wind.strength * (rain ? 48 : 30) * progress;
  const wave = rain ? 0 : Math.sin(progress * Math.PI * 4 + hashUnit(index, 19) * Math.PI * 2) * 5;
  const x = Math.round(positiveModulo(baseX + windTravel + wave + travelMargin, width + travelMargin * 2) - travelMargin);
  const y = Math.round(progress * (height + 14) - 7 + wind.flowY * wind.strength * 8 * progress);
  return Object.freeze({
    x,
    y,
    length: rain ? 3 + Math.round(wind.strength * 2) : 1,
    alpha: rain ? 0.55 : 0.82
  });
}

function hashUnit(index, salt) {
  let value = Math.imul(index + 1, 0x45d9f3b) ^ Math.imul(salt, 0x27d4eb2d);
  value ^= value >>> 16;
  value = Math.imul(value, 0x45d9f3b);
  value ^= value >>> 16;
  return (value >>> 0) / 0x100000000;
}

function positiveModulo(value, modulus) {
  return ((value % modulus) + modulus) % modulus;
}
