import { RESURRECT_64_HEX } from "../src/waterLatitudePalette.js";

export const BACKGROUND_CITY_BASE_LAYER = "Background City Base";
export const BACKGROUND_CITY_BUILDING_LAYERS = Object.freeze([
  "Inn",
  "Smith",
  "Home",
  "Home 2"
]);
export const BACKGROUND_CITY_CHURCH_LAYER = "Church";

export const BACKGROUND_CITY_FRONT_DEPTH = 0.86;
export const BACKGROUND_CITY_MAX_ROWS = 8;
export const BACKGROUND_CITY_PARALLAX_ANCHOR = 1;
export const BACKGROUND_CITY_QUAY_CLEARANCE = 15;
export const BACKGROUND_CITY_FOUNDATION_SOURCE_HEIGHT = 12;
export const BACKGROUND_CITY_CHURCH_FOUNDATION_SOURCE_HEIGHT = 36;
export const BACKGROUND_CITY_STREET_COLOR = "#9babb2";
export const BACKGROUND_CITY_SKYLINE_RISE_PER_PIXEL = 1 / 32;
export const BACKGROUND_CITY_SKYLINE_TOLERANCE = 3;

const FRONT_SCALE = 0.5;
const SCALE_STEP = 0.055;
const DEPTH_STEP = 0.01;
const BASELINE_STEP = 12;
const ROW_START_OCCLUSION_OVERLAP = 8;
const ATMOSPHERE_FOG_RGB = Object.freeze([0x4d, 0x65, 0xb4]);
const ATMOSPHERE_STRENGTH = Object.freeze([0, 0.2, 0.38]);
const RESURRECT_64_RGB = Object.freeze(RESURRECT_64_HEX.map(parseHexRgb));
const ATMOSPHERE_RGB_CACHE = Object.freeze([
  new Map(),
  new Map(),
  new Map()
]);

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
          : BACKGROUND_CITY_MAX_ROWS;
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

export function mirrorCityBackgroundStreetRows({ rows, sceneWidth }) {
  if (
    !Array.isArray(rows) ||
    !Number.isInteger(sceneWidth) ||
    sceneWidth <= 0 ||
    !rows.every((row) => (
      Number.isInteger(row?.y) &&
      Number.isInteger(row?.leftX) &&
      Number.isInteger(row?.rightX) &&
      row.leftX < row.rightX &&
      row.leftX >= 0 &&
      row.rightX <= sceneWidth
    ))
  ) {
    throw new Error("Invalid background city street rows to mirror");
  }
  return Object.freeze(rows.map((row) => Object.freeze({
    y: row.y,
    leftX: sceneWidth - row.rightX,
    rightX: sceneWidth - row.leftX
  })));
}

export function cityBackgroundLayout({ city, rowCount, frames, baseFrame, baseTopYByX }) {
  if (!city || typeof city !== "object" || typeof city.id !== "string" || city.id === "") {
    throw new Error("Background city layout requires a stable city id");
  }
  if (!Number.isInteger(rowCount) || rowCount < 0 || rowCount > BACKGROUND_CITY_MAX_ROWS) {
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
  const churchFrame = city.religiousLandmarks?.includes("church")
    ? frameByLayer.get(BACKGROUND_CITY_CHURCH_LAYER)
    : null;
  if (city.religiousLandmarks?.includes("church")) {
    requireFrame(churchFrame, BACKGROUND_CITY_CHURCH_LAYER);
  }
  const churchDistanceFromFront = Math.min(2, rowCount - 1);
  const random = seededRandom(hashString(city.id));
  const baseLeft = baseFrame.spriteSourceSize.x;
  const baseRight = baseLeft + baseFrame.spriteSourceSize.w;
  const rowsNearToFar = [];
  let skylineAnchorX = null;
  let skylineAnchorY = null;

  for (let distanceFromFront = 0; distanceFromFront < rowCount; distanceFromFront++) {
    const scale = roundTo(FRONT_SCALE - distanceFromFront * SCALE_STEP, 3);
    const depth = roundTo(BACKGROUND_CITY_FRONT_DEPTH - distanceFromFront * DEPTH_STEP, 3);
    const verticalOffset = -distanceFromFront * BASELINE_STEP;
    const buildings = [];
    const rowFoundationHeight = Math.max(
      1,
      Math.round(BACKGROUND_CITY_FOUNDATION_SOURCE_HEIGHT * scale)
    );
    const deficitX = distanceFromFront === 0
      ? baseLeft + BACKGROUND_CITY_QUAY_CLEARANCE
      : firstCitySkylineDeficitX({
          rows: rowsNearToFar,
          leftX: baseLeft + BACKGROUND_CITY_QUAY_CLEARANCE,
          rightX: baseRight,
          anchorX: skylineAnchorX,
          anchorY: skylineAnchorY
        });
    if (deficitX < 0) break;
    let x = distanceFromFront === 0
      ? deficitX
      : Math.max(
          baseLeft + BACKGROUND_CITY_QUAY_CLEARANCE,
          deficitX - ROW_START_OCCLUSION_OVERLAP
        );
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
      const nonRepeatingFrames = fittingFrames.filter((candidate) => candidate.layer !== previousLayer);
      const candidates = nonRepeatingFrames.length > 0 ? nonRepeatingFrames : fittingFrames;
      const duplicateCounts = new Map(candidates.map((candidate) => [
        candidate,
        directlyBehindDuplicateCount(candidate, x, scale, rowsNearToFar)
      ]));
      const minimumDuplicateCount = Math.min(...duplicateCounts.values());
      const leastDuplicatedFrames = candidates.filter((candidate) => (
        duplicateCounts.get(candidate) === minimumDuplicateCount
      ));
      if (!leastDuplicatedFrames.includes(frame)) {
        frame = leastDuplicatedFrames[randomInteger(random, 0, leastDuplicatedFrames.length - 1)];
      }
      const width = Math.max(1, Math.round(frame.frame.w * scale));
      const height = Math.max(1, Math.round(frame.frame.h * scale));
      const foundationHeight = Math.min(height - 1, rowFoundationHeight);
      const profileStartX = Math.max(0, Math.floor(x - baseLeft));
      const profileEndX = Math.min(
        baseTopYByX.length,
        Math.ceil(x + width - baseLeft)
      );
      const shorelineTopY = minimumValue(baseTopYByX, profileStartX, profileEndX);
      const rowGroundTopY = shorelineTopY;
      const rightRise = 0;
      const unoccludedWallBottomY = rowGroundTopY + verticalOffset;
      const unoccludedBottomY = unoccludedWallBottomY + foundationHeight;
      const foregroundTopY = citySkylineTopYAtX(rowsNearToFar, x + width / 2);
      const occlusionDrop = Number.isFinite(foregroundTopY)
        ? Math.min(-verticalOffset, Math.max(0, foregroundTopY - unoccludedBottomY))
        : 0;
      const admittedWallBottomY = unoccludedWallBottomY + occlusionDrop;
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
        shorelineTopY,
        rowGroundTopY,
        occlusionDrop,
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

    if (churchFrame && distanceFromFront === churchDistanceFromFront && buildings.length > 0) {
      const churchWidth = Math.max(1, Math.round(churchFrame.frame.w * scale));
      const churchHeight = Math.max(1, Math.round(churchFrame.frame.h * scale));
      const targetCenterX = baseLeft + BACKGROUND_CITY_QUAY_CLEARANCE + Math.round(
        (baseRight - baseLeft - BACKGROUND_CITY_QUAY_CLEARANCE) * 0.58
      );
      const replacementIndex = buildings.reduce((closestIndex, building, index) => (
        Math.abs(building.x + building.width / 2 - targetCenterX) <
          Math.abs(buildings[closestIndex].x + buildings[closestIndex].width / 2 - targetCenterX)
          ? index
          : closestIndex
      ), 0);
      const replaced = buildings[replacementIndex];
      const churchX = Math.max(
        baseLeft + BACKGROUND_CITY_QUAY_CLEARANCE,
        Math.min(baseRight - churchWidth, Math.round(replaced.x + replaced.width / 2 - churchWidth / 2))
      );
      const churchFoundationHeight = Math.min(
        churchHeight - 1,
        Math.max(1, Math.round(BACKGROUND_CITY_CHURCH_FOUNDATION_SOURCE_HEIGHT * scale))
      );
      const profileStartX = Math.max(0, Math.floor(churchX - baseLeft));
      const profileEndX = Math.min(
        baseTopYByX.length,
        Math.ceil(churchX + churchWidth - baseLeft)
      );
      const shorelineTopY = minimumValue(baseTopYByX, profileStartX, profileEndX);
      const unoccludedWallBottomY = shorelineTopY + verticalOffset;
      const unoccludedBottomY = unoccludedWallBottomY + churchFoundationHeight;
      const foregroundTopY = citySkylineTopYAtX(
        rowsNearToFar,
        churchX + churchWidth / 2
      );
      const occlusionDrop = Number.isFinite(foregroundTopY)
        ? Math.min(-verticalOffset, Math.max(0, foregroundTopY - unoccludedBottomY))
        : 0;
      const wallBottomY = unoccludedWallBottomY + occlusionDrop;
      const y = wallBottomY - (churchHeight - churchFoundationHeight);
      buildings[replacementIndex] = Object.freeze({
        frame: churchFrame,
        x: churchX,
        y,
        bottomY: y + churchHeight,
        wallBottomY,
        admittedWallBottomY: wallBottomY,
        shorelineTopY,
        rowGroundTopY: shorelineTopY,
        occlusionDrop,
        foundationHeight: churchFoundationHeight,
        rightRise: 0,
        width: churchWidth,
        height: churchHeight
      });
    }

    if (buildings.length === 0) break;
    const row = Object.freeze({
      rowIndex: distanceFromFront,
      distanceFromFront,
      scale,
      depth,
      parallaxAnchor: BACKGROUND_CITY_PARALLAX_ANCHOR,
      verticalOffset,
      rowFoundationHeight,
      buildings: Object.freeze(buildings)
    });
    rowsNearToFar.push(row);
    if (distanceFromFront === 0) {
      skylineAnchorX = buildings[0].x;
      skylineAnchorY = buildings[0].y;
    }
  }
  return Object.freeze(rowsNearToFar.reverse().map((row, rowIndex) => Object.freeze({
    ...row,
    rowIndex
  })));
}

export function oppositeBankCityBackgroundLayout({
  city,
  rowCount,
  frames,
  baseFrame,
  baseTopYByX,
  sceneWidth,
  parallaxAnchor
}) {
  if (!Number.isInteger(sceneWidth) || sceneWidth <= 0) {
    throw new Error(`Invalid opposite-bank city scene width: ${sceneWidth}`);
  }
  if (!Number.isFinite(parallaxAnchor) || parallaxAnchor < -1 || parallaxAnchor > 1) {
    throw new Error(`Invalid opposite-bank city parallax anchor: ${parallaxAnchor}`);
  }
  const generatedRows = cityBackgroundLayout({
    city: Object.freeze({ ...city, id: `${city.id}|opposite-bank` }),
    rowCount,
    frames,
    baseFrame,
    baseTopYByX
  });
  return Object.freeze(generatedRows.map((row) => Object.freeze({
    ...row,
    parallaxAnchor,
    buildings: Object.freeze(row.buildings.map((building) => Object.freeze({
      ...building,
      x: sceneWidth - building.x - building.width
    })).sort((left, right) => left.x - right.x))
  })));
}

export function cityBackgroundPainterOrder(rows) {
  if (
    !Array.isArray(rows) ||
    !rows.every((row) => (
      Number.isFinite(row?.depth) &&
      Number.isFinite(row?.parallaxAnchor) &&
      Number.isInteger(row?.distanceFromFront) &&
      row.distanceFromFront >= 0 &&
      Array.isArray(row?.buildings) &&
      row.buildings.every((building) => Number.isFinite(building?.bottomY))
    ))
  ) {
    throw new Error("Invalid background city rows for painter ordering");
  }
  const entries = rows.flatMap((row, rowOrder) => (
    row.buildings.map((building, buildingOrder) => ({
      building,
      depth: row.depth,
      parallaxAnchor: row.parallaxAnchor,
      distanceFromFront: row.distanceFromFront,
      rowOrder,
      buildingOrder
    }))
  ));
  entries.sort((left, right) => (
    left.building.bottomY - right.building.bottomY ||
    left.depth - right.depth ||
    left.rowOrder - right.rowOrder ||
    left.buildingOrder - right.buildingOrder
  ));
  return Object.freeze(entries.map((entry) => Object.freeze(entry)));
}

export function cityBackgroundColumnSkyline(rows) {
  if (
    !Array.isArray(rows) ||
    !rows.every((row) => (
      Number.isInteger(row?.distanceFromFront) &&
      Array.isArray(row?.buildings) &&
      row.buildings.every((building) => (
      Number.isFinite(building?.x) &&
      Number.isFinite(building?.y) &&
      Number.isInteger(building?.width) &&
      building.width > 0
      ))
    ))
  ) {
    throw new Error("Invalid background city rows for skyline measurement");
  }
  const buildings = rows.flatMap((row) => row.buildings);
  const frontRow = rows.find((row) => row.distanceFromFront === 0);
  if (!frontRow || buildings.length === 0) return Object.freeze([]);
  return Object.freeze(frontRow.buildings.map((frontBuilding) => {
    const x = frontBuilding.x + frontBuilding.width / 2;
    const topY = Math.min(...buildings.filter((building) => (
      x >= building.x && x < building.x + building.width
    )).map((building) => building.y));
    return Object.freeze({ x, topY });
  }));
}

export function cityBackgroundSkylineTargetY(anchorX, anchorY, x) {
  if (![anchorX, anchorY, x].every(Number.isFinite) || x < anchorX) {
    throw new Error(`Invalid background city skyline target: ${anchorX},${anchorY}→${x}`);
  }
  return anchorY - Math.round((x - anchorX) * BACKGROUND_CITY_SKYLINE_RISE_PER_PIXEL);
}

export function cityBackgroundAtmosphereLevel(distanceFromFront, rowCount) {
  if (!Number.isInteger(distanceFromFront) || distanceFromFront < 0) {
    throw new Error(`Invalid background city row distance: ${distanceFromFront}`);
  }
  if (!Number.isInteger(rowCount) || rowCount < 0 || distanceFromFront >= Math.max(1, rowCount)) {
    throw new Error(`Invalid background city atmospheric row count: ${rowCount}`);
  }
  if (distanceFromFront === 0 || rowCount <= 1) return 0;
  return distanceFromFront >= Math.max(2, rowCount - 2) ? 2 : 1;
}

export function cityBackgroundAtmosphereRgb(red, green, blue, level) {
  if (
    ![red, green, blue].every((value) => Number.isInteger(value) && value >= 0 && value <= 255) ||
    !Number.isInteger(level) ||
    level < 0 ||
    level >= ATMOSPHERE_STRENGTH.length
  ) {
    throw new Error(`Invalid background city atmosphere color: ${red},${green},${blue}@${level}`);
  }
  if (level === 0) return Object.freeze({ red, green, blue });
  const colorKey = red << 16 | green << 8 | blue;
  const cached = ATMOSPHERE_RGB_CACHE[level].get(colorKey);
  if (cached) return cached;
  const strength = ATMOSPHERE_STRENGTH[level];
  const fogged = [red, green, blue].map((channel, index) => (
    channel + (ATMOSPHERE_FOG_RGB[index] - channel) * strength
  ));
  const nearest = RESURRECT_64_RGB.reduce((best, candidate) => {
    const distance = candidate.reduce((sum, channel, index) => (
      sum + (channel - fogged[index]) ** 2
    ), 0);
    return distance < best.distance ? { color: candidate, distance } : best;
  }, { color: null, distance: Number.POSITIVE_INFINITY }).color;
  const shifted = Object.freeze({ red: nearest[0], green: nearest[1], blue: nearest[2] });
  ATMOSPHERE_RGB_CACHE[level].set(colorKey, shifted);
  return shifted;
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

function directlyBehindDuplicateCount(frame, x, scale, rows) {
  const width = Math.max(1, Math.round(frame.frame.w * scale));
  const centerX = x + width / 2;
  let duplicates = 0;
  for (const row of rows) {
    for (const building of row.buildings) {
      if (building.frame.layer !== frame.layer) continue;
      const backgroundCenterX = building.x + building.width / 2;
      const directAlignmentWidth = Math.min(width, building.width) * 0.35;
      if (Math.abs(centerX - backgroundCenterX) <= directAlignmentWidth) duplicates++;
    }
  }
  return duplicates;
}

function firstCitySkylineDeficitX({ rows, leftX, rightX, anchorX, anchorY }) {
  for (let x = Math.ceil(leftX); x < rightX; x++) {
    const skylineTopY = citySkylineTopYAtX(rows, x);
    const targetY = cityBackgroundSkylineTargetY(anchorX, anchorY, x);
    if (skylineTopY > targetY + BACKGROUND_CITY_SKYLINE_TOLERANCE) return x;
  }
  return -1;
}

function citySkylineTopYAtX(rows, x) {
  let skylineTopY = Number.POSITIVE_INFINITY;
  for (const row of rows) {
    for (const building of row.buildings) {
      if (x < building.x || x >= building.x + building.width) continue;
      skylineTopY = Math.min(skylineTopY, building.y);
    }
  }
  return skylineTopY;
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

function parseHexRgb(hex) {
  return Object.freeze([
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16)
  ]);
}
