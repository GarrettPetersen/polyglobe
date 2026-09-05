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
const WATER_TOP = PORT_SCENE_OCEAN_SLICES[0].top;
const WATER_BOTTOM = PORT_SCENE_OCEAN_SLICES[2].bottom - 1;

export function cityWaterDepthIndex(masterY) {
  return cityWaterDepthIndexAt(0, masterY);
}

export function cityWaterDepthIndexAt(masterX, masterY) {
  if (!Number.isFinite(masterY)) throw new Error(`City water row must be finite, got ${masterY}`);
  if (!Number.isFinite(masterX)) throw new Error(`City water column must be finite, got ${masterX}`);
  if (masterY <= WATER_TOP) return CITY_WATER_DEPTH_LEVELS - 1;
  if (masterY >= WATER_BOTTOM) return 0;

  let depthIndex = CITY_WATER_DEPTH_LEVELS - 1;
  for (let boundaryIndex = 0; boundaryIndex < CITY_WATER_DEPTH_BOUNDARIES; boundaryIndex++) {
    if (masterY >= cityWaterBoundaryY(masterX, boundaryIndex)) {
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
  return cityWaterRgbAtDepth(red, green, blue, cityWaterLatitudeBand(latitudeDeg), depthIndex);
}

// Raster preparation shares contour geometry by column and colour decisions by
// depth. Neither depends on the number of pixels painted with the same colour.
export function applyCityWaterPalette({ pixels, width, height, latitudeDeg, masterX, masterY }) {
  if (!(pixels instanceof Uint8ClampedArray) ||
      !Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0 ||
      pixels.length !== width * height * 4) {
    throw new Error("City water palette requires a complete clamped RGBA raster");
  }
  if (!Number.isFinite(masterX) || !Number.isFinite(masterY)) {
    throw new Error("City water palette requires finite scene coordinates");
  }
  const latitudeBand = cityWaterLatitudeBand(latitudeDeg);
  const colorsByDepth = Array.from({ length: CITY_WATER_DEPTH_LEVELS }, () => new Map());
  const boundaries = new Float64Array(width * CITY_WATER_DEPTH_BOUNDARIES);
  for (let x = 0; x < width; x++) {
    for (let boundary = 0; boundary < CITY_WATER_DEPTH_BOUNDARIES; boundary++) {
      boundaries[x * CITY_WATER_DEPTH_BOUNDARIES + boundary] = cityWaterBoundaryY(masterX + x, boundary);
    }
  }
  for (let y = 0; y < height; y++) {
    const sceneY = masterY + y;
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      if (pixels[offset + 3] === 0) continue;
      let depth = CITY_WATER_DEPTH_LEVELS - 1;
      if (sceneY >= WATER_BOTTOM) depth = 0;
      else if (sceneY > WATER_TOP) {
        for (let boundary = 0; boundary < CITY_WATER_DEPTH_BOUNDARIES; boundary++) {
          if (sceneY >= boundaries[x * CITY_WATER_DEPTH_BOUNDARIES + boundary]) depth--;
        }
      }
      const red = pixels[offset];
      const green = pixels[offset + 1];
      const blue = pixels[offset + 2];
      const key = red << 16 | green << 8 | blue;
      const colors = colorsByDepth[depth];
      let mapped = colors.get(key);
      if (!mapped) {
        mapped = cityWaterRgbAtDepth(red, green, blue, latitudeBand, depth);
        colors.set(key, mapped);
      }
      pixels[offset] = mapped.r;
      pixels[offset + 1] = mapped.g;
      pixels[offset + 2] = mapped.b;
    }
  }
}

function cityWaterRgbAtDepth(red, green, blue, latitudeBand, depthIndex) {
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
    latitudeBand,
    depthIndex
  );
  return Object.freeze({
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16)
  });
}

function cityWaterBoundaryY(masterX, boundaryIndex) {
  return WATER_TOP + (
    (boundaryIndex + 0.5) * (WATER_BOTTOM - WATER_TOP) / CITY_WATER_DEPTH_BOUNDARIES
  ) + cityWaterContourOffset(masterX, boundaryIndex);
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
