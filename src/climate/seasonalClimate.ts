/**
 * Simple seasonal climate: precipitation (ITCZ band) and temperature.
 * Used to scale river flow by "rainy season" and to support future snow/ice.
 */

/** Latitude (degrees) above which we add extended polar precip. */
const POLAR_PRECIP_LAT = 52;

/**
 * Deterministic "noise" in [0, 1] from lat/lon for variation without a seed.
 */
function latLonNoise(latDeg: number, lonDeg: number): number {
  const x = Math.sin(latDeg * 0.01745) * 7.3 + Math.cos(lonDeg * 0.01745) * 5.1;
  const y = Math.cos(latDeg * 0.021) * 4.7 + Math.sin(lonDeg * 0.013) * 6.2;
  const n = Math.sin(x) * 0.5 + Math.sin(y) * 0.5 + 0.5;
  return Math.max(0, Math.min(1, n));
}

/**
 * Precipitation factor 0–1: ITCZ band (high near subsolar) plus extended
 * precipitation toward the poles with deterministic randomization so high
 * latitudes still get clouds and precip overlay.
 * @param lonDeg Optional longitude in degrees for spatial variation in polar precip.
 */
export function getPrecipitation(
  latDeg: number,
  subsolarLatDeg: number,
  lonDeg?: number
): number {
  const dist = Math.abs(latDeg - subsolarLatDeg);
  const halfWidth = 18;
  const itcz = Math.exp(-(dist * dist) / (2 * halfWidth * halfWidth));
  let precip = Math.max(0, Math.min(1, itcz * 1.2));

  const absLat = Math.abs(latDeg);
  if (absLat > POLAR_PRECIP_LAT) {
    const t = (absLat - POLAR_PRECIP_LAT) / (90 - POLAR_PRECIP_LAT);
    const ramp = t * t;
    const lon = lonDeg ?? subsolarLatDeg;
    const noise = latLonNoise(latDeg, lon);
    const polarAdd = ramp * 0.28 * (0.4 + 0.6 * noise);
    precip = Math.max(precip, Math.min(1, polarAdd));
  }

  return Math.max(0, Math.min(1, precip));
}

/**
 * Rough temperature factor 0–1 (1 = warm, 0 = cold). Colder at poles and when far from sun.
 * Can drive snow line / freeze in future.
 */
export function getTemperature(latDeg: number, subsolarLatDeg: number): number {
  const pole = Math.abs(latDeg) > 75 ? 0.3 : 1 - Math.abs(latDeg) / 90;
  const season = Math.exp(-Math.pow((latDeg - subsolarLatDeg) / 40, 2));
  let t = Math.max(0, Math.min(1, 0.4 * pole + 0.6 * season));
  const absLat = Math.abs(latDeg);
  if (absLat > 58) {
    const u = Math.min(1, (absLat - 58) / 32);
    t *= 1 - 0.24 * u * u;
  }
  return Math.max(0, Math.min(1, t));
}
