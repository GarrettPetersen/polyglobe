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
