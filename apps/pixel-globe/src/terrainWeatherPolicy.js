export const TERRAIN_WEATHER_MODE_WORLD = "world";
export const TERRAIN_WEATHER_MODE_STATIC = "static";

export function terrainRowUsesWorldWeather(row) {
  if (!row || typeof row !== "object") throw new Error("Terrain weather policy requires a terrain row");
  const mode = row.weatherMode ?? TERRAIN_WEATHER_MODE_WORLD;
  if (mode === TERRAIN_WEATHER_MODE_WORLD) return true;
  if (mode === TERRAIN_WEATHER_MODE_STATIC) return false;
  throw new Error(`Unknown terrain weather mode: ${mode}`);
}
