export const BACKGROUND_CITY_BASE_LAYER = "Background City Base";
export const BACKGROUND_CITY_BUILDING_LAYERS = Object.freeze([
  "Inn",
  "Smith",
  "Home",
  "Home 2"
]);

export const BACKGROUND_CITY_FRONT_DEPTH = 0.86;
export const BACKGROUND_CITY_PARALLAX_ANCHOR = 1;
export const BACKGROUND_CITY_QUAY_CLEARANCE = 15;
export const BACKGROUND_CITY_FOUNDATION_SOURCE_HEIGHT = 12;
export const BACKGROUND_CITY_STREET_COLOR = "#9babb2";

const FRONT_SCALE = 0.5;
const SCALE_STEP = 0.055;
const DEPTH_STEP = 0.01;
const BASELINE_STEP = 12;
const RIGHT_RISE_PER_ROW = 4;
const PARALLAX_CLEARANCE_PER_ROW = 7;
const ROW_START_STAGGER = 42;

export function cityBackgroundRowCount(city) {
  if (!city || typeof city !== "object") throw new Error("Background city requires a city record");
  if (city.settlementType === "village") return 0;
  const population = city.population === undefined ? 20_000 : Number(city.population);
  if (!Number.isFinite(population) || population < 0) {
    throw new Error(`Invalid background city population: ${city.population}`);
  }
  let rows = population < 2_500
    ? 1
    : population < 8_000
      ? 2
      : population < 20_000
        ? 3
        : population < 50_000
          ? 4
          : 5;
  if (city.capital) rows = Math.max(rows, 3);
  return rows;
}

export function cityBackgroundBaseTopProfile({ alpha, width, height, sourceY }) {
  if (
    (!Array.isArray(alpha) && !ArrayBuffer.isView(alpha)) ||
    !Number.isInteger(width) ||
    width <= 0 ||
    !Number.isInteger(height) ||
    height <= 0 ||
    alpha.length !== width * height ||
    !Number.isInteger(sourceY)
  ) {
    throw new Error("Invalid background city base pixels");
  }
  const topByX = new Int16Array(width).fill(-1);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      if (alpha[y * width + x] <= 16) continue;
      topByX[x] = sourceY + y;
      break;
    }
  }
  let firstOpaque = topByX.findIndex((value) => value >= 0);
  if (firstOpaque < 0) throw new Error("Background city base has no opaque pixels");
  for (let x = firstOpaque - 1; x >= 0; x--) topByX[x] = topByX[firstOpaque];
  let previousOpaque = firstOpaque;
  for (let x = firstOpaque + 1; x < width; x++) {
    if (topByX[x] >= 0) {
      if (x - previousOpaque > 1) {
        const from = topByX[previousOpaque];
        const to = topByX[x];
        for (let gapX = previousOpaque + 1; gapX < x; gapX++) {
          const progress = (gapX - previousOpaque) / (x - previousOpaque);
          topByX[gapX] = Math.round(from + (to - from) * progress);
        }
      }
      previousOpaque = x;
    }
  }
  for (let x = previousOpaque + 1; x < width; x++) topByX[x] = topByX[previousOpaque];
  return topByX;
}

export function cityBackgroundStreetRows({ alpha, width, height, sourceX, sourceY, rightX }) {
  if (
    (!Array.isArray(alpha) && !ArrayBuffer.isView(alpha)) ||
    !Number.isInteger(width) ||
    width <= 0 ||
    !Number.isInteger(height) ||
    height <= 0 ||
    alpha.length !== width * height ||
    !Number.isInteger(sourceX) ||
    !Number.isInteger(sourceY) ||
    !Number.isInteger(rightX) ||
    rightX <= sourceX
  ) {
    throw new Error("Invalid background city street pixels");
  }
  const rows = [];
  for (let y = 0; y < height; y++) {
    let leftmostOpaqueX = -1;
    for (let x = 0; x < width; x++) {
      if (alpha[y * width + x] <= 16) continue;
      leftmostOpaqueX = sourceX + x;
      break;
    }
    if (leftmostOpaqueX < 0) continue;
    rows.push(Object.freeze({
      y: sourceY + y,
      leftX: leftmostOpaqueX,
      rightX
    }));
  }
  if (rows.length === 0) throw new Error("Background city street requires opaque ribbon pixels");
  return Object.freeze(rows);
}

export function cityBackgroundLayout({ city, rowCount, frames, baseFrame, baseTopYByX }) {
  if (!city || typeof city !== "object" || typeof city.id !== "string" || city.id === "") {
    throw new Error("Background city layout requires a stable city id");
  }
  if (!Number.isInteger(rowCount) || rowCount < 0 || rowCount > 5) {
    throw new Error(`Invalid background city row count: ${rowCount}`);
  }
  if (rowCount === 0) return Object.freeze([]);
  requireFrame(baseFrame, BACKGROUND_CITY_BASE_LAYER);
  if (
    (!Array.isArray(baseTopYByX) && !ArrayBuffer.isView(baseTopYByX)) ||
    baseTopYByX.length !== baseFrame.frame.w ||
    !Array.from(baseTopYByX).every(Number.isInteger)
  ) {
    throw new Error("Background city layout requires the base top-edge profile");
  }
  const frameByLayer = new Map(frames.map((frame) => [frame.layer, frame]));
  const buildingFrames = BACKGROUND_CITY_BUILDING_LAYERS.map((layerName) => {
    const frame = frameByLayer.get(layerName);
    requireFrame(frame, layerName);
    return frame;
  });
  const random = seededRandom(hashString(city.id));
  const baseLeft = baseFrame.spriteSourceSize.x;
  const baseRight = baseLeft + baseFrame.spriteSourceSize.w;
  const rows = [];

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    const distanceFromFront = rowCount - rowIndex - 1;
    const scale = roundTo(FRONT_SCALE - distanceFromFront * SCALE_STEP, 3);
    const depth = roundTo(BACKGROUND_CITY_FRONT_DEPTH - distanceFromFront * DEPTH_STEP, 3);
    const verticalOffset = -distanceFromFront * BASELINE_STEP;
    const buildings = [];
    const parallaxClearance = distanceFromFront * PARALLAX_CLEARANCE_PER_ROW;
    const rowFoundationHeight = Math.max(
      1,
      Math.round(BACKGROUND_CITY_FOUNDATION_SOURCE_HEIGHT * scale)
    );
    let x = baseLeft + BACKGROUND_CITY_QUAY_CLEARANCE +
      distanceFromFront * ROW_START_STAGGER + parallaxClearance;
    let previousLayer = null;
    let buildingIndex = 0;
    const cycleOffset = randomInteger(random, 0, buildingFrames.length - 1);
    let finalBuilding = false;

    while (x < baseRight) {
      let fittingFrames = buildingFrames.filter((frame) => (
        x + Math.max(1, Math.round(frame.frame.w * scale)) <= baseRight
      ));
      if (fittingFrames.length === 0) {
        const smallestFrame = buildingFrames.reduce((smallest, frame) => (
          frame.frame.w < smallest.frame.w ? frame : smallest
        ));
        const smallestWidth = Math.max(1, Math.round(smallestFrame.frame.w * scale));
        const edgeX = baseRight - smallestWidth;
        if (buildings.length === 0 || edgeX <= buildings.at(-1).x) break;
        x = edgeX;
        fittingFrames = [smallestFrame];
        finalBuilding = true;
      }
      let frame = buildingFrames[(cycleOffset + buildingIndex) % buildingFrames.length];
      if (!fittingFrames.includes(frame)) frame = fittingFrames[0];
      if (frame.layer === previousLayer) {
        const alternatives = fittingFrames.filter((candidate) => candidate.layer !== previousLayer);
        if (alternatives.length > 0) {
          frame = alternatives[randomInteger(random, 0, alternatives.length - 1)];
        }
      }
      const width = Math.max(1, Math.round(frame.frame.w * scale));
      const height = Math.max(1, Math.round(frame.frame.h * scale));
      const foundationHeight = Math.min(height - 1, rowFoundationHeight);
      const centerX = x + width / 2;
      const profileX = Math.max(0, Math.min(
        baseTopYByX.length - 1,
        Math.round(centerX - baseLeft)
      ));
      const rightwardProgress = profileX / Math.max(1, baseTopYByX.length - 1);
      const rightRise = Math.round(rightwardProgress * distanceFromFront * RIGHT_RISE_PER_ROW);
      const profileStartX = Math.max(0, Math.floor(x - baseLeft - parallaxClearance));
      const profileEndX = Math.min(
        baseTopYByX.length,
        Math.ceil(x + width - baseLeft + parallaxClearance)
      );
      const ribbonTopY = minimumValue(baseTopYByX, profileStartX, profileEndX);
      const admittedWallBottomY = ribbonTopY + verticalOffset - rightRise;
      const y = admittedWallBottomY - (height - foundationHeight);
      const bottomY = y + height;
      const wallBottomY = bottomY - foundationHeight;
      buildings.push(Object.freeze({
        frame,
        x,
        y,
        bottomY,
        wallBottomY,
        admittedWallBottomY,
        foundationHeight,
        rightRise,
        width,
        height
      }));
      previousLayer = frame.layer;
      buildingIndex++;
      if (finalBuilding) break;
      const overlap = Math.max(3, Math.round(width * (0.12 + random() * 0.08)));
      x += width - overlap;
    }

    rows.push(Object.freeze({
      rowIndex,
      distanceFromFront,
      scale,
      depth,
      parallaxAnchor: BACKGROUND_CITY_PARALLAX_ANCHOR,
      verticalOffset,
      rowFoundationHeight,
      buildings: Object.freeze(buildings)
    }));
  }
  return Object.freeze(rows);
}

function requireFrame(frame, layerName) {
  if (
    !frame ||
    frame.layer !== layerName ||
    !Number.isInteger(frame.frame?.w) ||
    !Number.isInteger(frame.frame?.h) ||
    !Number.isInteger(frame.spriteSourceSize?.x) ||
    !Number.isInteger(frame.spriteSourceSize?.y) ||
    !Number.isInteger(frame.spriteSourceSize?.w) ||
    !Number.isInteger(frame.spriteSourceSize?.h)
  ) {
    throw new Error(`Invalid background city frame: ${layerName}`);
  }
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let state = seed || 1;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function randomInteger(random, minimum, maximum) {
  return minimum + Math.floor(random() * (maximum - minimum + 1));
}

function minimumValue(values, start, end) {
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end > values.length || start >= end) {
    throw new Error(`Invalid background city ribbon span: ${start}–${end}`);
  }
  let minimum = Number.POSITIVE_INFINITY;
  for (let index = start; index < end; index++) minimum = Math.min(minimum, values[index]);
  return minimum;
}

function roundTo(value, decimalPlaces) {
  const multiplier = 10 ** decimalPlaces;
  return Math.round(value * multiplier) / multiplier;
}
