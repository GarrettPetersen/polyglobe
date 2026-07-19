export const CARGO_SPACE_TICKS_PER_UNIT = 12;

const CARGO_TICK_EPSILON = 1e-8;

function cargoTickValue(units, label) {
  if (!Number.isFinite(units) || units < 0) {
    throw new Error(`Invalid ${label}: ${units}`);
  }
  return units * CARGO_SPACE_TICKS_PER_UNIT;
}

function snappedCargoTicks(rawTicks) {
  const nearest = Math.round(rawTicks);
  return Math.abs(rawTicks - nearest) <= CARGO_TICK_EPSILON ? nearest : null;
}

export function occupiedCargoTicks(units, label = "occupied cargo space") {
  const rawTicks = cargoTickValue(units, label);
  return snappedCargoTicks(rawTicks) ?? Math.ceil(rawTicks);
}

export function availableCargoTicks(units, label = "available cargo space") {
  const rawTicks = cargoTickValue(units, label);
  return snappedCargoTicks(rawTicks) ?? Math.floor(rawTicks);
}

export function cargoUnitsFromTicks(ticks) {
  if (!Number.isInteger(ticks)) {
    throw new Error(`Invalid cargo space ticks: ${ticks}`);
  }
  return ticks / CARGO_SPACE_TICKS_PER_UNIT;
}

export function wholeCargoUnitsAvailable(units) {
  return Math.floor(availableCargoTicks(units) / CARGO_SPACE_TICKS_PER_UNIT);
}
