const TERRAIN_DRAW_LAYER_FLAT = 0;
const TERRAIN_DRAW_LAYER_ROUGH_GROUND = 1;
const TERRAIN_DRAW_LAYER_HILL = 2;
const TERRAIN_DRAW_LAYER_FOREST = 3;
const TERRAIN_DRAW_LAYER_JUNGLE = 4;
const TERRAIN_DRAW_LAYER_MOUNTAIN = 5;
export const TERRAIN_MOUNTAIN_LEVEL = 3;

export function terrainSpriteDrawLayer(spriteKey) {
  if (typeof spriteKey !== "string" || spriteKey === "") {
    throw new Error("Terrain draw ordering requires a sprite key");
  }
  if (hasPrefix(spriteKey, ["water_", "sand_", "grass_", "snow_", "ice_", "mud_"])) {
    return TERRAIN_DRAW_LAYER_FLAT;
  }
  if (hasPrefix(spriteKey, ["earth_"])) return TERRAIN_DRAW_LAYER_ROUGH_GROUND;
  if (spriteKey === "grassy_hill") return TERRAIN_DRAW_LAYER_HILL;
  if (hasPrefix(spriteKey, ["forest_", "pine_forest_"])) return TERRAIN_DRAW_LAYER_FOREST;
  if (hasPrefix(spriteKey, ["jungle_", "jungle_palm_"])) return TERRAIN_DRAW_LAYER_JUNGLE;
  if (hasPrefix(spriteKey, ["mountain_"])) return TERRAIN_DRAW_LAYER_MOUNTAIN;
  throw new Error(`No terrain draw layer is defined for sprite: ${spriteKey}`);
}

export function terrainSpriteOccludesShips(spriteKey) {
  return terrainSpriteDrawLayer(spriteKey) >= TERRAIN_DRAW_LAYER_ROUGH_GROUND;
}

export function terrainBaseSpriteKey(spriteKey) {
  if (typeof spriteKey !== "string" || spriteKey === "") {
    throw new Error("Terrain base composition requires a sprite key");
  }
  return spriteKey.startsWith("mountain_") ? "earth_rocky" : spriteKey;
}

export function terrainConnectorNeedsSlopeDetail(levelA, levelB) {
  if (!Number.isFinite(levelA) || !Number.isFinite(levelB)) {
    throw new Error("Terrain connector slope detail requires finite levels");
  }
  return Math.max(levelA, levelB) < TERRAIN_MOUNTAIN_LEVEL && Math.abs(levelA - levelB) >= 2;
}

export function compareTerrainDrawCalls(a, b) {
  const yDifference = a.sortY - b.sortY;
  if (yDifference !== 0) return yDifference;
  const layerDifference = a.drawLayer - b.drawLayer;
  if (layerDifference !== 0) return layerDifference;
  return a.id - b.id;
}

function hasPrefix(value, prefixes) {
  return prefixes.some((prefix) => value.startsWith(prefix));
}
