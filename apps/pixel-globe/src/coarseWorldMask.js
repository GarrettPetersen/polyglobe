export function coarseTileIdForWorldTile(mapping, worldTileId, coarseTileCount) {
  if (!(mapping instanceof Uint32Array) || mapping.length === 0) {
    throw new Error("Coarse world lookup requires a world-to-climate mapping");
  }
  if (!Number.isInteger(worldTileId) || worldTileId < 0 || worldTileId >= mapping.length) {
    throw new Error(`Invalid world tile for coarse lookup: ${worldTileId}`);
  }
  if (!Number.isInteger(coarseTileCount) || coarseTileCount <= 0) {
    throw new Error(`Invalid coarse tile count: ${coarseTileCount}`);
  }
  const coarseTileId = mapping[worldTileId];
  if (coarseTileId >= coarseTileCount) {
    throw new Error(
      `World tile ${worldTileId} maps outside ${coarseTileCount} climate tiles: ${coarseTileId}`
    );
  }
  return coarseTileId;
}

export function coarseMaskHasWorldTile(mask, mapping, worldTileId) {
  if (!(mask instanceof Uint8Array) || mask.length === 0) {
    throw new Error("Coarse world lookup requires a climate mask");
  }
  return mask[coarseTileIdForWorldTile(mapping, worldTileId, mask.length)] !== 0;
}

export function fillDiscreteWeatherFlagMask(bake, dayIndex, flag, outMask) {
  if (!bake || !Number.isInteger(bake.tileCount) || bake.tileCount <= 0 ||
      !(bake.ordinalByTileId instanceof Int32Array) ||
      !(bake.packed instanceof Uint8Array)) {
    throw new Error("Discrete weather flag mask requires a decoded weather bake");
  }
  if (!Number.isInteger(dayIndex) || !Number.isInteger(flag) || flag <= 0 || flag > 0xff) {
    throw new Error(`Invalid discrete weather mask request: day=${dayIndex}, flag=${flag}`);
  }
  if (!(outMask instanceof Uint8Array) || outMask.length !== bake.tileCount) {
    throw new Error(
      `Discrete weather mask has ${outMask?.length ?? "no"} cells; expected ${bake.tileCount}`
    );
  }
  const normalizedDay = ((dayIndex % WEATHER_DAYS) + WEATHER_DAYS) % WEATHER_DAYS;
  const dayOffset = normalizedDay * bake.tileCount;
  for (let climateTileId = 0; climateTileId < bake.tileCount; climateTileId++) {
    const ordinal = bake.ordinalByTileId[climateTileId];
    outMask[climateTileId] = ordinal >= 0 &&
      (bake.packed[dayOffset + ordinal] & flag) !== 0
      ? 1
      : 0;
  }
  return outMask;
}
import { WEATHER_DAYS } from "./weather.js";
