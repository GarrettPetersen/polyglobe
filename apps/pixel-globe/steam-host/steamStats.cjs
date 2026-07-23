const MAX_STEAM_INT = 2_147_483_647;
const STEAM_STAT_NAME_PATTERN = /^[A-Z][A-Z0-9_]{0,63}$/;

function updateHighWaterStats(statsApi, values) {
  assertStatsApi(statsApi);
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    throw new Error("Steam stat values must be an object");
  }
  const entries = Object.entries(values);
  if (entries.length === 0) throw new Error("Steam stat update is empty");

  const pending = [];
  for (const [name, value] of entries) {
    if (!STEAM_STAT_NAME_PATTERN.test(name)) {
      throw new Error(`Invalid Steam stat API name: ${name}`);
    }
    if (!Number.isInteger(value) || value < 0 || value > MAX_STEAM_INT) {
      throw new Error(`Invalid Steam stat value: ${name}=${value}`);
    }
    const current = statsApi.getInt(name);
    if (current === null) {
      throw new Error(`Steam stat is unavailable: ${name}`);
    }
    if (!Number.isInteger(current) || current < 0 || current > MAX_STEAM_INT) {
      throw new Error(`Steam returned invalid stat value: ${name}=${current}`);
    }
    if (value > current) pending.push([name, value]);
  }

  const updatedNames = [];
  for (const [name, value] of pending) {
    if (!statsApi.setInt(name, value)) {
      throw new Error(`Steam rejected stat update: ${name}=${value}`);
    }
    updatedNames.push(name);
  }

  if (updatedNames.length > 0 && !statsApi.store()) {
    throw new Error(`Steam could not store ${updatedNames.length} stat updates`);
  }
  return Object.freeze({
    changed: updatedNames.length > 0,
    updatedNames: Object.freeze(updatedNames)
  });
}

function assertStatsApi(statsApi) {
  for (const method of ["getInt", "setInt", "store"]) {
    if (typeof statsApi?.[method] !== "function") {
      throw new Error(`Steam stats API has no ${method} function`);
    }
  }
}

module.exports = {
  MAX_STEAM_INT,
  updateHighWaterStats
};
