import {
  WATER_SOURCE_BASE_HEX,
  waterLatitudeBand,
  waterPaletteHexForRgb
} from "../src/waterLatitudePalette.js";
import { PORT_SCENE_MASTER, PORT_SCENE_OCEAN_SLICES } from "./citySceneRules.js";

export const CITY_WATER_DEPTH_LEVELS = 6;
export const CITY_WATER_ART_BASE_HEX = "4d65b4";

const CITY_WATER_DEPTH_BOUNDARIES = CITY_WATER_DEPTH_LEVELS - 1;
const TAU = Math.PI * 2;

const CITY_WATER_ART_BASE_RGB = parseHex(CITY_WATER_ART_BASE_HEX);
const CITY_WATER_ART_BASE_BRIGHTNESS = perceptualBrightness(CITY_WATER_ART_BASE_RGB);
const WATER_SOURCE_BASE_RGB = WATER_SOURCE_BASE_HEX.map(parseHex);

export function cityWaterDepthIndex(masterY) {
  return cityWaterDepthIndexAt(0, masterY);
}

export function cityWaterDepthIndexAt(masterX, masterY) {
  if (!Number.isFinite(masterY)) throw new Error(`City water row must be finite, got ${masterY}`);
  if (!Number.isFinite(masterX)) throw new Error(`City water column must be finite, got ${masterX}`);
  const top = PORT_SCENE_OCEAN_SLICES[0].top;
  const bottom = PORT_SCENE_OCEAN_SLICES[2].bottom - 1;
  if (masterY <= top) return CITY_WATER_DEPTH_LEVELS - 1;
  if (masterY >= bottom) return 0;

  let depthIndex = CITY_WATER_DEPTH_LEVELS - 1;
  for (let boundaryIndex = 0; boundaryIndex < CITY_WATER_DEPTH_BOUNDARIES; boundaryIndex++) {
    const baseY = top + (
      (boundaryIndex + 0.5) * (bottom - top) / CITY_WATER_DEPTH_BOUNDARIES
    );
    if (masterY >= baseY + cityWaterContourOffset(masterX, boundaryIndex)) {
      depthIndex--;
    }
  }
  return depthIndex;
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
  return cityWaterPaletteHexForSourceHexAt(sourceHex, latitudeDeg, 0, masterY);
}

export function cityWaterPaletteHexForSourceHexAt(sourceHex, latitudeDeg, masterX, masterY) {
  const source = parseHex(sourceHex);
  const mapped = cityWaterPaletteRgbAt(
    source.r,
    source.g,
    source.b,
    latitudeDeg,
    masterX,
    masterY
  );
  return toHex(mapped);
}

export function cityWaterPaletteRgb(red, green, blue, latitudeDeg, masterY) {
  return cityWaterPaletteRgbAt(red, green, blue, latitudeDeg, 0, masterY);
}

export function cityWaterPaletteRgbAt(red, green, blue, latitudeDeg, masterX, masterY) {
  assertChannel(red, "red");
  assertChannel(green, "green");
  assertChannel(blue, "blue");
  const depthIndex = cityWaterDepthIndexAt(masterX, masterY);
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

function cityWaterContourOffset(masterX, boundaryIndex) {
  const normalizedX = positiveModulo(masterX, PORT_SCENE_MASTER.width) /
    PORT_SCENE_MASTER.width;
  const sharedContour =
    Math.sin(TAU * 2 * normalizedX + 0.35) * 6 +
    Math.sin(TAU * 5 * normalizedX + 2.1) * 3;
  const detailFrequency = 7 + boundaryIndex % 3;
  const phase = boundaryIndex * 1.71;
  return Math.round(
    sharedContour +
    Math.sin(TAU * detailFrequency * normalizedX + phase) * 1.75
  );
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
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
