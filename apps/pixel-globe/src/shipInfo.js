import { cargoRows, cargoUsed } from "./gameState.js";
import { SHIP_STATS, shipLabelForSlug, shipStatsForSlug } from "./shipStats.js";

export const SHIP_INFO_CARGO_ROWS_PER_PAGE = 8;

const RATING_FIELDS = Object.freeze({
  speed: { key: "topSpeedRad", invert: false },
  acceleration: { key: "accelerationRad", invert: false },
  turning: { key: "turnRateRad", invert: false },
  windward: { key: "upwindStallAngleDeg", invert: true }
});

const RATING_RANGES = Object.freeze(Object.fromEntries(
  Object.entries(RATING_FIELDS).map(([name, field]) => {
    const values = SHIP_STATS.map((stats) => stats[field.key]);
    return [name, Object.freeze({ min: Math.min(...values), max: Math.max(...values), ...field })];
  })
));

export function createShipInfoView(ship, gameState) {
  if (!ship || typeof ship !== "object") throw new Error("Ship information requires the player ship");
  if (!gameState || typeof gameState !== "object") throw new Error("Ship information requires game state");
  const stats = shipStatsForSlug(ship.typeSlug);
  if (!Number.isFinite(ship.hitPoints) || !Number.isFinite(ship.maxHitPoints)) {
    throw new Error(`Ship ${ship.typeSlug} has invalid hull points`);
  }
  const used = cargoUsed(gameState);
  if (gameState.cargoCapacity !== stats.cargoCapacity) {
    throw new Error(
      `Ship ${ship.typeSlug} cargo capacity mismatch: state=${gameState.cargoCapacity} stats=${stats.cargoCapacity}`
    );
  }
  const manifest = cargoRows(gameState).map(({ good, quantity }) => ({
    id: good.id,
    label: good.label,
    quantity,
    space: good.unitSize * quantity
  }));
  return {
    slug: ship.typeSlug,
    label: shipLabelForSlug(ship.typeSlug),
    hull: Math.max(0, Math.round(ship.hitPoints)),
    maxHull: Math.round(ship.maxHitPoints),
    cannons: stats.cannons,
    doubloons: gameState.doubloons,
    cargoUsed: used,
    cargoCapacity: stats.cargoCapacity,
    upwindStallAngleDeg: stats.upwindStallAngleDeg,
    ratings: Object.freeze({
      speed: shipPerformanceRating(stats, "speed"),
      acceleration: shipPerformanceRating(stats, "acceleration"),
      turning: shipPerformanceRating(stats, "turning"),
      windward: shipPerformanceRating(stats, "windward")
    }),
    cargo: manifest
  };
}

export function shipPerformanceRating(stats, ratingName) {
  const range = RATING_RANGES[ratingName];
  if (!range) throw new Error(`Unknown ship performance rating: ${ratingName}`);
  const value = stats[range.key];
  if (!Number.isFinite(value)) throw new Error(`Invalid ship ${range.key}: ${value}`);
  const fraction = range.max === range.min ? 1 : (value - range.min) / (range.max - range.min);
  const usefulFraction = range.invert ? 1 - fraction : fraction;
  return Math.max(1, Math.min(10, 1 + Math.round(usefulFraction * 9)));
}

export function shipInfoCargoPage(view, page) {
  if (!view || !Array.isArray(view.cargo)) throw new Error("Invalid ship information view");
  const pageCount = Math.max(1, Math.ceil(view.cargo.length / SHIP_INFO_CARGO_ROWS_PER_PAGE));
  if (!Number.isInteger(page)) throw new Error(`Invalid cargo page: ${page}`);
  const normalizedPage = ((page % pageCount) + pageCount) % pageCount;
  const start = normalizedPage * SHIP_INFO_CARGO_ROWS_PER_PAGE;
  return {
    page: normalizedPage,
    pageCount,
    rows: view.cargo.slice(start, start + SHIP_INFO_CARGO_ROWS_PER_PAGE)
  };
}
