import { factionHasFlag } from "../src/factions.js";

export const CITY_GATEHOUSE_FLAG_LAYER = "Far Castle";
export const CITY_GATEHOUSE_FLAG_SCALE = 2.5;
export const CITY_GATEHOUSE_FLAG_WIDTH = Math.round(14 * CITY_GATEHOUSE_FLAG_SCALE);
export const CITY_GATEHOUSE_FLAG_HEIGHT = Math.round(9 * CITY_GATEHOUSE_FLAG_SCALE);
export const CITY_GATEHOUSE_FLAG_WAVE_SPEED_RAD_PER_MS = 0.002;

const FAR_TOWER_CENTER_X = 45;
const FLAG_BOTTOM_CLEARANCE_ABOVE_FRAME = 4;
const FLAG_TOP_ABOVE_FRAME = CITY_GATEHOUSE_FLAG_HEIGHT + FLAG_BOTTOM_CLEARANCE_ABOVE_FRAME;
const POLE_TOP_ABOVE_FRAME = FLAG_TOP_ABOVE_FRAME + 2;
const POLE_BOTTOM_BELOW_FRAME_TOP = 20;

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
    flagHeight: CITY_GATEHOUSE_FLAG_HEIGHT,
    waveAmplitudeScale: CITY_GATEHOUSE_FLAG_SCALE
  });
}

export function cityGatehouseFlagPhase(timeMs) {
  if (!Number.isFinite(timeMs) || timeMs < 0) {
    throw new Error(`Invalid gatehouse flag time: ${timeMs}`);
  }
  return timeMs * CITY_GATEHOUSE_FLAG_WAVE_SPEED_RAD_PER_MS;
}
