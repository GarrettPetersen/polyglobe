import {
  WATER_SOURCE_BASE_HEX,
  waterLatitudeBand,
  waterPaletteHexForRgb
} from "../src/waterLatitudePalette.js";
import { PORT_SCENE_OCEAN_SLICES } from "./citySceneRules.js";

export const CITY_WATER_DEPTH_LEVELS = 6;
export const CITY_WATER_ART_BASE_HEX = "4d65b4";

const CITY_WATER_ART_BASE_RGB = parseHex(CITY_WATER_ART_BASE_HEX);
const CITY_WATER_ART_BASE_BRIGHTNESS = perceptualBrightness(CITY_WATER_ART_BASE_RGB);
const WATER_SOURCE_BASE_RGB = WATER_SOURCE_BASE_HEX.map(parseHex);

export function cityWaterDepthIndex(masterY) {
  if (!Number.isFinite(masterY)) throw new Error(`City water row must be finite, got ${masterY}`);
  const top = PORT_SCENE_OCEAN_SLICES[0].top;
  const bottom = PORT_SCENE_OCEAN_SLICES[2].bottom - 1;
  const progress = Math.max(0, Math.min(1, (masterY - top) / (bottom - top)));
  return Math.round((1 - progress) * (CITY_WATER_DEPTH_LEVELS - 1));
}

export function cityWaterLatitudeBand(latitudeDeg) {
  return waterLatitudeBand(latitudeDeg);
}

export function cityWaterAnimatedLayerUsesPalette(layerName) {
  if (layerName !== "Waves" && layerName !== "Surf") {
    throw new Error(`Invalid city water animation layer: ${layerName}`);
  }
  return layerName === "Waves";
}

export function cityWaterPaletteHexForSourceHex(sourceHex, latitudeDeg, masterY) {
  const source = parseHex(sourceHex);
  const mapped = cityWaterPaletteRgb(source.r, source.g, source.b, latitudeDeg, masterY);
  return toHex(mapped);
}

export function cityWaterPaletteRgb(red, green, blue, latitudeDeg, masterY) {
  assertChannel(red, "red");
  assertChannel(green, "green");
  assertChannel(blue, "blue");
  const depthIndex = cityWaterDepthIndex(masterY);
  const sourceBaseBrightness = perceptualBrightness(WATER_SOURCE_BASE_RGB[depthIndex]);
  const artBrightnessRatio = perceptualBrightness({ r: red, g: green, b: blue }) /
    CITY_WATER_ART_BASE_BRIGHTNESS;
  const neutralBrightness = Math.round(Math.max(
    0,
    Math.min(255, sourceBaseBrightness * artBrightnessRatio)
  ));
  const hex = waterPaletteHexForRgb(
    neutralBrightness,
    neutralBrightness,
    neutralBrightness,
    cityWaterLatitudeBand(latitudeDeg),
    depthIndex
  );
  return Object.freeze({
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16)
  });
}

function parseHex(value) {
  const hex = value.startsWith("#") ? value.slice(1).toLowerCase() : value.toLowerCase();
  if (!/^[0-9a-f]{6}$/.test(hex)) throw new Error(`Invalid city water color: ${value}`);
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16)
  };
}

function perceptualBrightness({ r, g, b }) {
  return r * 0.299 + g * 0.587 + b * 0.114;
}

function assertChannel(value, label) {
  if (!Number.isInteger(value) || value < 0 || value > 255) {
    throw new Error(`Invalid city water ${label} channel: ${value}`);
  }
}

function toHex({ r, g, b }) {
  return [r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("");
}
