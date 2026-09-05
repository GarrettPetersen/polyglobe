import { dateToSubsolarLatDeg, weatherClockParts } from "./weather.js";

export function dateToSubsolarPoint(date) {
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = (date.getTime() - yearStart) / 86400000;
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600 + date.getUTCMilliseconds() / 3600000;
  const b = (2 * Math.PI / 365.25) * (dayOfYear - 81);
  const eotMinutes = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
  const longitude = -15 * (utcHours - 12 + eotMinutes / 60);
  return {
    latDeg: dateToSubsolarLatDeg(date),
    lonDeg: ((((longitude + 180) % 360) + 360) % 360) - 180
  };
}

export function sunAltitudeAtMinute(minute, latitudeDeg, longitudeDeg) {
  if (![minute, latitudeDeg, longitudeDeg].every(Number.isFinite) || minute < 0 ||
      Math.abs(latitudeDeg) > 90 || Math.abs(longitudeDeg) > 180) {
    throw new Error("Solar clock requires a nonnegative minute and valid latitude/longitude");
  }
  const sun = dateToSubsolarPoint(weatherClockParts(minute).date);
  const radians = Math.PI / 180;
  const latitude = latitudeDeg * radians;
  const declination = sun.latDeg * radians;
  return Math.sin(latitude) * Math.sin(declination) + Math.cos(latitude) *
    Math.cos(declination) * Math.cos((longitudeDeg - sun.lonDeg) * radians);
}

export function nextChefFeastMinute({ currentMinute, latitudeDeg, longitudeDeg, phase }) {
  let previous = sunAltitudeAtMinute(currentMinute, latitudeDeg, longitudeDeg);
  if (phase !== "served" && phase !== "afterwards") throw new Error(`Unknown feast clock phase: ${phase}`);
  const threshold = phase === "served" ? 0 : -0.45;
  // Allow 25 hours: the next day's sunset can be a few minutes later. At polar latitudes the sun may never
  // cross the horizon/night threshold; those feasts use local evening/midnight,
  // rather than stranding a normal quest action until the season changes.
  for (let offset = 1; offset <= 1500; offset++) {
    const minute = Math.floor(currentMinute) + offset;
    const altitude = sunAltitudeAtMinute(minute, latitudeDeg, longitudeDeg);
    if (previous > threshold && altitude <= threshold) return minute;
    previous = altitude;
  }
  const localMinute = currentMinute + longitudeDeg * 4;
  const hour = phase === "served" ? 18 : 0;
  let target = Math.floor(localMinute / 1440) * 1440 + hour * 60 - longitudeDeg * 4;
  if (target <= currentMinute) target += 1440;
  return target;
}
