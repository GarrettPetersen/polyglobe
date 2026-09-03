import {
  applyDayNightPaletteGrade,
  DAY_NIGHT_VARIANT_STEPS
} from "../src/dayNightPalette.js";
import { dayNightLightForSunAltitude } from "../src/dayNightCycle.js";
import { darkerResurrect64Hex } from "../src/waterLatitudePalette.js";

const OPAQUE_ALPHA_THRESHOLD = 16;
const DAY_NIGHT_ALTITUDE_SAMPLES = 2048;
const SKYLINE_BUILDING_LAYERS = new Set([
  "Background City Base",
  "Shipyard",
  "Shipyard Front",
  "Home",
  "Home 2",
  "Smith",
  "Market Stall",
  "Market Stall Copy",
  "Market Stall Copy Copy",
  "Inn",
  "Far Castle",
  "Gate",
  "Gate Front Edge",
  "Near Castle",
  "Church",
  "Mosque",
  "Japan Pagoda",
  "China Pagoda"
]);
const REACHABLE_DAY_NIGHT_LIGHTS = reachableDayNightLights();
const GRADED_HEX_SIGNATURE_BY_SOURCE = new Map();

export function cityBuildingEdgeContrastApplies(layerName, frame = null) {
  if (typeof layerName !== "string" || layerName === "") {
    throw new Error("City building edge contrast requires a layer name");
  }
  const logicalLayer = frame?.regionalOf || layerName;
  return SKYLINE_BUILDING_LAYERS.has(logicalLayer) || SKYLINE_BUILDING_LAYERS.has(layerName);
}

export function citySkySourceColorsByRow({ pixels, width, height }) {
  validateRaster(pixels, width, height, "City sky source colors");
  return Object.freeze(Array.from({ length: height }, (_, y) => {
    const colors = new Set();
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      if (pixels[offset + 3] <= OPAQUE_ALPHA_THRESHOLD) continue;
      colors.add(rgbHex(pixels, offset));
    }
    if (colors.size === 0) throw new Error(`City sky row ${y} has no opaque colors`);
    return Object.freeze([...colors]);
  }));
}

export function applyCityBuildingEdgeContrast({
  pixels,
  width,
  height,
  masterY,
  renderedHeight = height,
  skyMasterY,
  skySourceColorsByRow
}) {
  validateRaster(pixels, width, height, "City building edge contrast");
  if (!Number.isFinite(masterY) || !Number.isFinite(skyMasterY)) {
    throw new Error("City building edge contrast requires finite scene rows");
  }
  if (!Number.isFinite(renderedHeight) || renderedHeight <= 0) {
    throw new Error(`Invalid rendered city building height: ${renderedHeight}`);
  }
  if (!Array.isArray(skySourceColorsByRow) || skySourceColorsByRow.length === 0) {
    throw new Error("City building edge contrast requires sky source rows");
  }
  const exterior = exteriorTransparentPixels(pixels, width, height);
  let changedPixels = 0;
  for (let y = 0; y < height; y += 1) {
    const sceneY = masterY + (y + 0.5) * renderedHeight / height;
    const skyRow = Math.floor(sceneY - skyMasterY);
    if (skyRow < 0 || skyRow >= skySourceColorsByRow.length) continue;
    const skyColors = skySourceColorsByRow[skyRow];
    if (!Array.isArray(skyColors) || skyColors.length === 0) {
      throw new Error(`City sky row ${skyRow} has no source colors`);
    }
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const offset = index * 4;
      if (pixels[offset + 3] <= OPAQUE_ALPHA_THRESHOLD) continue;
      if (isExteriorTransparent(exterior, width, height, x, y + 1)) continue;
      if (!(
        isExteriorTransparent(exterior, width, height, x - 1, y) ||
        isExteriorTransparent(exterior, width, height, x + 1, y) ||
        isExteriorTransparent(exterior, width, height, x, y - 1)
      )) continue;
      const sourceHex = rgbHex(pixels, offset);
      if (!collidesWithSkyGrade(sourceHex, skyColors)) continue;
      const contrastHex = darkerContrastingHex(sourceHex, skyColors);
      pixels[offset] = Number.parseInt(contrastHex.slice(0, 2), 16);
      pixels[offset + 1] = Number.parseInt(contrastHex.slice(2, 4), 16);
      pixels[offset + 2] = Number.parseInt(contrastHex.slice(4, 6), 16);
      changedPixels += 1;
    }
  }
  return changedPixels;
}

function darkerContrastingHex(sourceHex, skyColors) {
  for (let shadeSteps = 1; shadeSteps <= 8; shadeSteps += 1) {
    const candidate = darkerResurrect64Hex(sourceHex, shadeSteps);
    if (candidate !== sourceHex && !collidesWithSkyGrade(candidate, skyColors)) return candidate;
  }
  throw new Error(`City building edge #${sourceHex} cannot be darkened away from the sky palette`);
}

function collidesWithSkyGrade(sourceHex, skyColors) {
  const buildingSignature = gradedHexSignature(sourceHex);
  return skyColors.some((skyHex) => {
    const skySignature = gradedHexSignature(skyHex);
    return buildingSignature.some((hex, index) => hex === skySignature[index]);
  });
}

function gradedHexSignature(sourceHex) {
  const cached = GRADED_HEX_SIGNATURE_BY_SOURCE.get(sourceHex);
  if (cached) return cached;
  const signature = Object.freeze(REACHABLE_DAY_NIGHT_LIGHTS.map((light) => {
    const pixels = new Uint8ClampedArray([
      Number.parseInt(sourceHex.slice(0, 2), 16),
      Number.parseInt(sourceHex.slice(2, 4), 16),
      Number.parseInt(sourceHex.slice(4, 6), 16),
      255
    ]);
    applyDayNightPaletteGrade(pixels, 1, 1, light);
    return rgbHex(pixels, 0);
  }));
  GRADED_HEX_SIGNATURE_BY_SOURCE.set(sourceHex, signature);
  return signature;
}

function reachableDayNightLights() {
  const lightsByStage = new Map();
  for (let index = 0; index <= DAY_NIGHT_ALTITUDE_SAMPLES; index += 1) {
    const sunAltitude = -1 + index * 2 / DAY_NIGHT_ALTITUDE_SAMPLES;
    const light = dayNightLightForSunAltitude(sunAltitude);
    const sunsetStage = Math.round(light.sunset * DAY_NIGHT_VARIANT_STEPS);
    const nightStage = Math.round(light.night * DAY_NIGHT_VARIANT_STEPS);
    const key = `${sunsetStage}:${nightStage}`;
    if (!lightsByStage.has(key)) {
      lightsByStage.set(key, Object.freeze({
        sunset: sunsetStage / DAY_NIGHT_VARIANT_STEPS,
        night: nightStage / DAY_NIGHT_VARIANT_STEPS
      }));
    }
  }
  return Object.freeze([...lightsByStage.values()]);
}

function exteriorTransparentPixels(pixels, width, height) {
  const exterior = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  const visit = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const index = y * width + x;
    if (exterior[index] !== 0 || pixels[index * 4 + 3] > OPAQUE_ALPHA_THRESHOLD) return;
    exterior[index] = 1;
    queue[tail++] = index;
  };
  for (let x = 0; x < width; x += 1) {
    visit(x, 0);
    visit(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    visit(0, y);
    visit(width - 1, y);
  }
  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = Math.floor(index / width);
    visit(x - 1, y);
    visit(x + 1, y);
    visit(x, y - 1);
    visit(x, y + 1);
  }
  return exterior;
}

function isExteriorTransparent(exterior, width, height, x, y) {
  if (x < 0 || x >= width || y < 0 || y >= height) return true;
  return exterior[y * width + x] !== 0;
}

function validateRaster(pixels, width, height, label) {
  if (!(pixels instanceof Uint8ClampedArray)) {
    throw new Error(`${label} requires clamped RGBA pixels`);
  }
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new Error(`${label} has invalid dimensions: ${width}x${height}`);
  }
  if (pixels.length !== width * height * 4) {
    throw new Error(`${label} pixel length does not match its dimensions`);
  }
}

function rgbHex(pixels, offset) {
  return [pixels[offset], pixels[offset + 1], pixels[offset + 2]]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("");
}
