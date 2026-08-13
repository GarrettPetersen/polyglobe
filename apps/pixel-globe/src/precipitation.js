export const PRECIPITATION_RAIN = "rain";
export const PRECIPITATION_SNOW = "snow";

export function precipitationKindForConditions({ raining, snowing, storming }) {
  for (const [label, value] of Object.entries({ raining, snowing, storming })) {
    if (typeof value !== "boolean") {
      throw new Error(`Precipitation ${label} flag must be boolean: ${value}`);
    }
  }
  if (snowing) return PRECIPITATION_SNOW;
  if (raining || storming) return PRECIPITATION_RAIN;
  return null;
}

export function snowWaveOffset(elapsedMs, phaseRad, amplitudePx, periodMs) {
  if (!Number.isFinite(elapsedMs)) throw new Error(`Invalid snow elapsed time: ${elapsedMs}`);
  if (!Number.isFinite(phaseRad)) throw new Error(`Invalid snow wave phase: ${phaseRad}`);
  if (!Number.isFinite(amplitudePx) || amplitudePx < 0) {
    throw new Error(`Invalid snow wave amplitude: ${amplitudePx}`);
  }
  if (!Number.isFinite(periodMs) || periodMs <= 0) {
    throw new Error(`Invalid snow wave period: ${periodMs}`);
  }
  return Math.sin((elapsedMs / periodMs) * Math.PI * 2 + phaseRad) * amplitudePx;
}

export function snowfallPresentationStrength({
  snowDay,
  coldWater,
  cloudOpacity,
  stormIntensity
}) {
  for (const [label, value] of Object.entries({ snowDay, coldWater })) {
    if (typeof value !== "boolean") {
      throw new Error(`Snowfall ${label} flag must be boolean: ${value}`);
    }
  }
  for (const [label, value] of Object.entries({ cloudOpacity, stormIntensity })) {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new Error(`Snowfall ${label} must be within 0..1: ${value}`);
    }
  }
  if (!snowDay && !coldWater) return 0;

  const stormMoisture = Math.max(0, (stormIntensity - 0.28) / 0.62);
  const moisture = Math.max(cloudOpacity, stormMoisture);
  if (moisture <= 0.08) return 0;
  return Math.min(1, (moisture - 0.08) / 0.72);
}

export function snowParticleOffset({
  progress,
  elapsedMs,
  phaseRad,
  waveAmplitudePx,
  wavePeriodMs,
  windFlowX,
  windFlowY,
  windTravelPx,
  fallDistancePx
}) {
  for (const [label, value] of Object.entries({
    progress,
    elapsedMs,
    phaseRad,
    waveAmplitudePx,
    wavePeriodMs,
    windFlowX,
    windFlowY,
    windTravelPx,
    fallDistancePx
  })) {
    if (!Number.isFinite(value)) throw new Error(`Snow particle ${label} must be finite: ${value}`);
  }
  if (progress < 0 || progress > 1) {
    throw new Error(`Snow particle progress must be within 0..1: ${progress}`);
  }
  if (waveAmplitudePx < 0 || wavePeriodMs <= 0 || windTravelPx < 0 || fallDistancePx < 0) {
    throw new Error("Snow particle distances must be non-negative and its wave period must be positive");
  }
  const windLength = Math.hypot(windFlowX, windFlowY);
  if (Math.abs(windLength - 1) > 1e-6) {
    throw new Error(`Snow particle wind flow must be normalized: ${windLength}`);
  }

  const windProgress = windTravelPx * progress;
  return {
    x: windFlowX * windProgress + snowWaveOffset(
      elapsedMs,
      phaseRad,
      waveAmplitudePx,
      wavePeriodMs
    ),
    y: fallDistancePx * progress + windFlowY * windProgress * 0.55
  };
}

export function snowLandingOpacity(progress) {
  if (!Number.isFinite(progress) || progress < 0 || progress > 1) {
    throw new Error(`Snow landing progress must be within 0..1: ${progress}`);
  }
  if (progress <= 0.84) return 1;
  return Math.max(0, (1 - progress) / 0.16);
}
