import { factionHasFlag } from "../src/factions.js";

export const CITY_GATEHOUSE_FLAG_LAYER = "Far Castle";
export const CITY_GATEHOUSE_FLAG_WIDTH = 14;
export const CITY_GATEHOUSE_FLAG_HEIGHT = 9;
export const CITY_GATEHOUSE_FLAG_WAVE_SPEED_RAD_PER_MS = 0.002;

const FAR_TOWER_CENTER_X = 45;
const POLE_TOP_ABOVE_FRAME = 15;
const POLE_BOTTOM_BELOW_FRAME_TOP = 20;
const FLAG_TOP_ABOVE_FRAME = 13;

export function cityGatehouseFlagVisible({ fortified, factionId }) {
  if (typeof fortified !== "boolean") {
    throw new Error(`Invalid gatehouse fortification flag: ${fortified}`);
  }
  if (typeof factionId !== "string" || factionId === "") {
    throw new Error(`Invalid gatehouse faction: ${factionId}`);
  }
  return fortified && factionHasFlag(factionId);
}

export function cityGatehouseFlagGeometry(frame) {
  const logicalLayer = frame?.regionalOf || frame?.layer;
  if (
    logicalLayer !== CITY_GATEHOUSE_FLAG_LAYER ||
    !Number.isInteger(frame?.spriteSourceSize?.x) ||
    !Number.isInteger(frame?.spriteSourceSize?.y)
  ) {
    throw new Error(`Invalid far gatehouse flag frame: ${frame?.layer}`);
  }
  const poleX = frame.spriteSourceSize.x + FAR_TOWER_CENTER_X;
  return Object.freeze({
    poleX,
    poleTopY: frame.spriteSourceSize.y - POLE_TOP_ABOVE_FRAME,
    poleBottomY: frame.spriteSourceSize.y + POLE_BOTTOM_BELOW_FRAME_TOP,
    flagX: poleX + 1,
    flagY: frame.spriteSourceSize.y - FLAG_TOP_ABOVE_FRAME,
    flagWidth: CITY_GATEHOUSE_FLAG_WIDTH,
    flagHeight: CITY_GATEHOUSE_FLAG_HEIGHT
  });
}

export function cityGatehouseFlagPhase(timeMs) {
  if (!Number.isFinite(timeMs) || timeMs < 0) {
    throw new Error(`Invalid gatehouse flag time: ${timeMs}`);
  }
  return timeMs * CITY_GATEHOUSE_FLAG_WAVE_SPEED_RAD_PER_MS;
}
