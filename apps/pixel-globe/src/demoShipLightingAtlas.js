import {
  SHIP_SHADOW_FRAME_SIZE,
  SHIP_SPRITE_SHEET_COLS,
  SHIP_SPRITE_SHEET_HEIGHT,
  SHIP_SPRITE_SHEET_ROWS,
  SHIP_SPRITE_SHEET_WIDTH
} from "./shipSpriteLayout.js";

const LIGHTING_MASK_HEIGHT = SHIP_SPRITE_SHEET_HEIGHT * 2;
const SHADOW_MASK_WIDTH = SHIP_SHADOW_FRAME_SIZE * SHIP_SPRITE_SHEET_COLS;
const SHADOW_MASK_HEIGHT = SHIP_SHADOW_FRAME_SIZE * SHIP_SPRITE_SHEET_ROWS * 2;

export const DEMO_SHIP_LIGHTING_ATLAS_SLICES = Object.freeze({
  light: Object.freeze({ x: 0, y: 0, width: SHIP_SPRITE_SHEET_WIDTH, height: LIGHTING_MASK_HEIGHT }),
  shade: Object.freeze({
    x: 0,
    y: LIGHTING_MASK_HEIGHT,
    width: SHIP_SPRITE_SHEET_WIDTH,
    height: LIGHTING_MASK_HEIGHT
  }),
  shadow: Object.freeze({
    x: 0,
    y: LIGHTING_MASK_HEIGHT * 2,
    width: SHADOW_MASK_WIDTH,
    height: SHADOW_MASK_HEIGHT
  })
});

export const DEMO_SHIP_LIGHTING_ATLAS_WIDTH = SHADOW_MASK_WIDTH;
export const DEMO_SHIP_LIGHTING_ATLAS_HEIGHT = LIGHTING_MASK_HEIGHT * 2 + SHADOW_MASK_HEIGHT;

export function demoShipLightingAtlasSlice(kind) {
  const slice = DEMO_SHIP_LIGHTING_ATLAS_SLICES[kind];
  if (!slice) throw new Error(`Unknown demo ship-lighting atlas layer: ${kind}`);
  return slice;
}
