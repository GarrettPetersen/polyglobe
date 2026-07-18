export const BEAVER_RANGE_NORTH_AMERICA = "north-america";
export const BEAVER_RANGE_SIBERIA = "siberia";

const CATCH_CHANCE_BY_RANGE = Object.freeze({
  [BEAVER_RANGE_NORTH_AMERICA]: 0.38,
  [BEAVER_RANGE_SIBERIA]: 0.28
});

const UNSUITABLE_RIVER_TERRAIN = Object.freeze([
  "desert",
  "ice",
  "mountain",
  "snow",
  "steppe",
  "tropical",
  "tundra"
]);

const BEAVER_CATCH_NARRATIVES = Object.freeze([
  "Fresh-cut willow and webbed tracks led the shore party to a beaver lodge hidden in a quiet backwater.",
  "The party followed a line of gnawed saplings to a dam and trapped a beaver in the shallows.",
  "A broad tail slapped the water beside the reeds. The hunters surrounded the pool and caught the beaver as it made for its lodge."
]);

export function beaverRangeForCoordinates(latitudeDeg, longitudeDeg) {
  assertCoordinates(latitudeDeg, longitudeDeg);
  if (
    latitudeDeg >= 35 && latitudeDeg <= 68 &&
    longitudeDeg >= -168 && longitudeDeg <= -52
  ) {
    return BEAVER_RANGE_NORTH_AMERICA;
  }
  if (
    latitudeDeg >= 48 && latitudeDeg <= 66 &&
    longitudeDeg >= 40 && longitudeDeg <= 145
  ) {
    return BEAVER_RANGE_SIBERIA;
  }
  return null;
}

export function beaverRiverHabitat({ isRiver, latitudeDeg, longitudeDeg, terrain }) {
  if (typeof isRiver !== "boolean") throw new Error("Beaver habitat requires an explicit river state");
  assertCoordinates(latitudeDeg, longitudeDeg);
  if (typeof terrain !== "string") throw new Error("Beaver habitat requires a terrain type");
  if (!isRiver || UNSUITABLE_RIVER_TERRAIN.some((fragment) => terrain.includes(fragment))) return null;
  return beaverRangeForCoordinates(latitudeDeg, longitudeDeg);
}

export function beaverSettlementProductionRate(port) {
  if (!port || typeof port !== "object") throw new Error("Beaver settlement production requires a port");
  const eligibleSettlement = port.settlementType === "village" || port.playerFoundedColony === true;
  if (!eligibleSettlement) return 0;
  assertCoordinates(port.lat, port.lon);
  const range = beaverRangeForCoordinates(port.lat, port.lon);
  if (range === BEAVER_RANGE_NORTH_AMERICA) return 1.05;
  if (range === BEAVER_RANGE_SIBERIA) return 0.72;
  return 0;
}

export function rollBeaverCatch(range, random = Math.random) {
  const chance = CATCH_CHANCE_BY_RANGE[range];
  if (!Number.isFinite(chance)) throw new Error(`Unknown beaver range: ${range}`);
  const roll = validRandomRoll(random(), "beaver catch");
  return roll < chance;
}

export function beaverCatchYield(random = Math.random) {
  const roll = validRandomRoll(random(), "beaver food yield");
  return Object.freeze({ pelts: 1, foodRations: 4 + Math.floor(roll * 4) });
}

export function beaverCatchNarrative(random = Math.random) {
  const roll = validRandomRoll(random(), "beaver narrative");
  return BEAVER_CATCH_NARRATIVES[Math.floor(roll * BEAVER_CATCH_NARRATIVES.length)];
}

function assertCoordinates(latitudeDeg, longitudeDeg) {
  if (!Number.isFinite(latitudeDeg) || latitudeDeg < -90 || latitudeDeg > 90) {
    throw new Error(`Invalid beaver latitude: ${latitudeDeg}`);
  }
  if (!Number.isFinite(longitudeDeg) || longitudeDeg < -180 || longitudeDeg > 180) {
    throw new Error(`Invalid beaver longitude: ${longitudeDeg}`);
  }
}

function validRandomRoll(roll, label) {
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) {
    throw new Error(`Invalid ${label} roll: ${roll}`);
  }
  return roll;
}
