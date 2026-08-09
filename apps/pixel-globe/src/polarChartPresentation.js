export const PERMANENT_POLAR_CAP_LATITUDE_DEG = 74;

const EMPTY_POLAR_SNOW_ROW = Object.freeze({
  t: "ice_cap",
  e: 0,
  h: 0
});

export function isBeyondPermanentPolarCap(latitudeDeg) {
  if (!Number.isFinite(latitudeDeg)) {
    throw new Error(`Polar chart latitude must be finite: ${latitudeDeg}`);
  }
  return Math.abs(latitudeDeg) >= PERMANENT_POLAR_CAP_LATITUDE_DEG;
}

export function polarChartTerrainRow(row, latitudeDeg) {
  if (!row || typeof row !== "object") {
    throw new Error("Polar chart terrain requires a source row");
  }
  return isBeyondPermanentPolarCap(latitudeDeg) ? EMPTY_POLAR_SNOW_ROW : row;
}

