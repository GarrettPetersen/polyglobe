export const TERRAIN_WEATHER_MODE_WORLD = "world";
export const TERRAIN_WEATHER_MODE_STATIC = "static";

export function terrainRowUsesWorldWeather(row) {
  if (!row || typeof row !== "object") throw new Error("Terrain weather policy requires a terrain row");
  const mode = row.weatherMode ?? TERRAIN_WEATHER_MODE_WORLD;
  if (mode === TERRAIN_WEATHER_MODE_WORLD) return true;
  if (mode === TERRAIN_WEATHER_MODE_STATIC) return false;
  throw new Error(`Unknown terrain weather mode: ${mode}`);
}

export function assertStaticTerrainCells(cells, context) {
  if (!Array.isArray(cells) || typeof context !== "string" || context === "") {
    throw new Error("Static terrain validation requires cells and a context");
  }
  for (const cell of cells) {
    if (!cell || !Number.isInteger(cell.id) || !cell.terrain) {
      throw new Error(`${context} has a malformed terrain cell`);
    }
    if (terrainRowUsesWorldWeather(cell.terrain)) {
      throw new Error(`${context} cell ${cell.id} must not use world weather`);
    }
  }
  return cells;
}
