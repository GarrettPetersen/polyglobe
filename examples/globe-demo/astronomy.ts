/**
 * Subsolar and sublunar point from UTC date/time.
 * Formulas are simplified but sufficient for globe visualization (~1° accuracy for sun, ~few ° for moon).
 */

/** J2000.0 = 2000-01-01 12:00 UTC in ms */
const J2000_MS = new Date(Date.UTC(2000, 0, 1, 12, 0, 0, 0)).getTime();

/** Obliquity of ecliptic (deg) */
const OBLIQUITY_DEG = 23.4397;

/** Synodic month in days (new moon to new moon) */
const SYNODIC_MONTH_DAYS = 29.530588;

/** Approximate new moon at J2000 epoch (2000-01-06 18:14 UTC) in ms */
const NEW_MOON_J2000_MS = new Date(Date.UTC(2000, 0, 6, 18, 14, 0, 0)).getTime();

export interface LatLonDeg {
  latDeg: number;
  lonDeg: number;
}

/**
 * Subsolar point: where the sun is at zenith on Earth.
 * Longitude is east-positive; latitude in degrees.
 */
export function dateToSubsolarPoint(date: Date): LatLonDeg {
  const utcMs = date.getTime();
  const n = (utcMs - J2000_MS) / 86400000; // days since J2000
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 0, 0, 0, 0, 0));
  const dayOfYear = (utcMs - yearStart.getTime()) / 86400000;
  const utcHours =
    date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600 +
    date.getUTCMilliseconds() / 3600000;

  // Solar declination (degrees): 23.44° * sin(2π/365.25 * (N - 81))
  const declinationDeg =
    OBLIQUITY_DEG *
    Math.sin((2 * Math.PI / 365.25) * (dayOfYear - 81));

  // Equation of time (minutes): simple 2-term approximation
  const B = (2 * Math.PI / 365.25) * (dayOfYear - 81);
  const eotMinutes = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);

  // Subsolar longitude (east positive): λ = -15(T - 12 + E/60)
  const subsolarLonDeg = -15 * (utcHours - 12 + eotMinutes / 60);

  return {
    latDeg: declinationDeg,
    lonDeg: subsolarLonDeg,
  };
}

/**
 * Sublunar point: where the moon is at zenith on Earth.
 * Simplified model: moon moves ~12.2°/day relative to sun; latitude ±5.14°.
 */
export function dateToSublunarPoint(date: Date): LatLonDeg {
  const sun = dateToSubsolarPoint(date);
  const utcMs = date.getTime();
  const daysSinceNewMoon =
    ((utcMs - NEW_MOON_J2000_MS) / 86400000) % SYNODIC_MONTH_DAYS;
  const phaseFrac = daysSinceNewMoon < 0 ? daysSinceNewMoon + SYNODIC_MONTH_DAYS : daysSinceNewMoon;
  const phaseAngleDeg = (phaseFrac / SYNODIC_MONTH_DAYS) * 360;

  // Moon moves ~360° in synodic month relative to sun
  const sublunarLonDeg = sun.lonDeg + phaseAngleDeg;
  // Normalize to -180..180 (east positive)
  const lonNorm =
    sublunarLonDeg <= 180
      ? sublunarLonDeg > -180
        ? sublunarLonDeg
        : sublunarLonDeg + 360
      : sublunarLonDeg - 360;

  // Lunar inclination to ecliptic ~5.14°; declination varies over month
  const sublunarLatDeg = 5.14 * Math.sin((phaseAngleDeg * Math.PI) / 180);

  return {
    latDeg: sublunarLatDeg,
    lonDeg: lonNorm,
  };
}

/**
 * Format a Date as YYYY-MM-DDTHH:mm:ss for datetime-local input (UTC, second precision).
 */
export function dateToDatetimeLocalUTC(date: Date): string {
  const y = date.getUTCFullYear();
  const mo = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const h = String(date.getUTCHours()).padStart(2, "0");
  const min = String(date.getUTCMinutes()).padStart(2, "0");
  const sec = String(date.getUTCSeconds()).padStart(2, "0");
  const yearStr =
    y >= 0
      ? String(y).padStart(4, "0")
      : `-${String(Math.abs(y)).padStart(4, "0")}`;
  return `${yearStr}-${mo}-${d}T${h}:${min}:${sec}`;
}

/**
 * Parse a datetime-local string as UTC (no timezone in string, we treat as UTC).
 * Accepts HH:mm or HH:mm:ss.
 */
export function datetimeLocalUTCToDate(s: string): Date {
  if (!s) return new Date();
  const m = s
    .trim()
    .match(/^([+-]?\d+)-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return new Date();
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const h = Number(m[4]);
  const min = Number(m[5]);
  const sec = m[6] != null ? Number(m[6]) : 0;
  if (
    !Number.isFinite(y) ||
    !Number.isFinite(mo) ||
    !Number.isFinite(d) ||
    !Number.isFinite(h) ||
    !Number.isFinite(min) ||
    !Number.isFinite(sec)
  ) {
    return new Date();
  }
  return new Date(Date.UTC(y, mo - 1, d, h, min, sec, 0));
}

/** Modified Julian Date at 0h UT for a given UTC date (integer day). */
function mjdUtcMidnight(date: Date): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  const a = Math.floor((14 - m) / 12);
  const y2 = y + 4800 - a;
  const m2 = m + 12 * a - 3;
  let jd =
    d +
    Math.floor((153 * m2 + 2) / 5) +
    365 * y2 +
    Math.floor(y2 / 4) -
    Math.floor(y2 / 100) +
    Math.floor(y2 / 400) -
    32045;
  return jd - 2400000.5 - 0.5;
}

/**
 * Greenwich Mean Sidereal Time in radians (0 to 2π).
 * Approximate formula; sufficient for starfield orientation (~0.1°).
 */
export function dateToGreenwichMeanSiderealTimeRad(date: Date): number {
  const mjd = mjdUtcMidnight(date);
  const utHours =
    date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600 +
    date.getUTCMilliseconds() / 3600000;
  const d = mjd - 51544.5 + utHours / 24;
  const gmstDeg =
    (280.46061837 + 360.98564736629 * d) % 360;
  const gmstNorm = gmstDeg < 0 ? gmstDeg + 360 : gmstDeg;
  return (gmstNorm * Math.PI) / 180;
}
