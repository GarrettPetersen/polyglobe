import { RESURRECT_64_HEX } from "../src/waterLatitudePalette.js";
import { cityRegionalBuildingFrame } from "./cityRegionalBuildings.js";

export const BACKGROUND_CITY_BASE_LAYER = "Background City Base";
export const BACKGROUND_CITY_BUILDING_LAYERS = Object.freeze([
  "Inn",
  "Smith",
  "Home",
  "Home 2"
]);
export const BACKGROUND_CITY_CHURCH_LAYER = "Church";

export const BACKGROUND_CITY_FRONT_DEPTH = 0.86;
export const BACKGROUND_CITY_REAR_DEPTH = 0.8;
export const BACKGROUND_CITY_MAX_ROWS = 8;
export const BACKGROUND_CITY_PARALLAX_ANCHOR = 1;
export const BACKGROUND_CITY_QUAY_CLEARANCE = 15;
export const BACKGROUND_CITY_FOUNDATION_SOURCE_HEIGHT = 12;
export const BACKGROUND_CITY_CHURCH_FOUNDATION_SOURCE_HEIGHT = 36;
export const BACKGROUND_CITY_CHURCH_SCALE_MULTIPLIER = 0.72;
export const BACKGROUND_CITY_STREET_COLOR = "#9babb2";
export const BACKGROUND_CITY_FOUNDATION_RISE_PER_PIXEL = 1 / 24;
export const BACKGROUND_CITY_FOUNDATION_TOLERANCE = 3;
export const BACKGROUND_CITY_NEAR_SCALE = 0.5;
export const BACKGROUND_CITY_FAR_SCALE = 0.32;

export const BACKGROUND_CITY_POINT_SPACING_X = 30;
export const BACKGROUND_CITY_POINT_SPACING_Y = 7;
const BACKGROUND_CITY_BUILDING_MIX_LAYERS = Object.freeze({
  homeA: "Home",
  homeB: "Home 2",
  inn: "Inn",
  smith: "Smith"
});
const BACKGROUND_CITY_DENSITY_OVERLAP = Object.freeze({
  sparse: Object.freeze({ minimum: 0.07, variation: 0.05, spacingX: 38, spacingY: 10 }),
  moderate: Object.freeze({ minimum: 0.12, variation: 0.08, spacingX: 30, spacingY: 7 }),
  dense: Object.freeze({ minimum: 0.18, variation: 0.08, spacingX: 24, spacingY: 6 })
});
const ATMOSPHERE_FOG_RGB = Object.freeze([0x4d, 0x65, 0xb4]);
const ATMOSPHERE_STRENGTH = Object.freeze([0, 0.2, 0.38]);
const RESURRECT_64_RGB = Object.freeze(RESURRECT_64_HEX.map(parseHexRgb));
const ATMOSPHERE_RGB_CACHE = Object.freeze([
  new Map(),
  new Map(),
  new Map()
]);

export function cityBackgroundEnabled(city) {
  if (!city || typeof city !== "object") throw new Error("Background city requires a city record");
  return city.settlementType !== "village";
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

export function cityBackgroundFoundationPoints({
  cityId,
  density = "moderate",
  baseFrame,
  baseTopYByX,
  seedPoints = []
}) {
  if (typeof cityId !== "string" || cityId === "") {
    throw new Error("Background city foundation points require a city id");
  }
  requireFoundationBand({ baseFrame, baseTopYByX });
  const spacing = BACKGROUND_CITY_DENSITY_OVERLAP[density];
  if (!spacing) throw new Error(`Invalid background city density: ${density}`);
  if (!Array.isArray(seedPoints) || !seedPoints.every(validFoundationPoint)) {
    throw new Error("Invalid background city foundation point seeds");
  }
  const random = seededRandom(hashString(`${cityId}|foundation-points`));
  const baseLeft = baseFrame.spriteSourceSize.x;
  const cityLeft = baseLeft + BACKGROUND_CITY_QUAY_CLEARANCE;
  const cityRight = baseLeft + baseFrame.spriteSourceSize.w;
  const anchorY = baseTopYByX[0];
  const maximumPerspective = 1;
  let bandArea = 0;
  for (let x = cityLeft; x < cityRight; x++) {
    const shorelineY = baseTopYByX[Math.floor(x - baseLeft)];
    const slopeY = cityBackgroundFoundationTargetY(baseLeft, anchorY, x);
    bandArea += Math.max(0, (shorelineY - slopeY) * maximumPerspective);
  }
  const targetCount = Math.max(0, Math.round(
    bandArea / (spacing.spacingX * spacing.spacingY * 0.9)
  ));
  const accepted = seedPoints.map((point) => ({ ...point }));
  const generated = [];
  const attempts = Math.max(240, targetCount * 80);

  for (let attempt = 0; attempt < attempts && generated.length < targetCount; attempt++) {
    let best = null;
    for (let candidateIndex = 0; candidateIndex < 18; candidateIndex++) {
      const candidate = randomFoundationPoint({
        random,
        baseLeft,
        cityLeft,
        cityRight,
        anchorY,
        baseTopYByX,
        maximumPerspective
      });
      if (!candidate) continue;
      const separation = normalizedFoundationPointSeparation(candidate, accepted, spacing);
      if (!best || separation > best.separation) best = { candidate, separation };
    }
    if (!best || best.separation < 0.86) break;
    accepted.push(best.candidate);
    generated.push(best.candidate);
  }

  const gapCandidates = [];
  const scanStepX = Math.max(5, Math.round(spacing.spacingX / 2));
  const scanStepY = Math.max(3, Math.round(spacing.spacingY / 2));
  for (let x = cityLeft + Math.floor(scanStepX / 2); x < cityRight; x += scanStepX) {
    const profileX = Math.max(0, Math.min(baseTopYByX.length - 1, Math.floor(x - baseLeft)));
    const shorelineY = baseTopYByX[profileX];
    const slopeY = cityBackgroundFoundationTargetY(baseLeft, anchorY, x);
    const highestY = Math.round(shorelineY - (shorelineY - slopeY) * maximumPerspective);
    for (let foundationY = shorelineY - scanStepY; foundationY >= highestY; foundationY -= scanStepY) {
      const perspective = cityBackgroundFoundationPerspective({
        foundationY,
        shorelineY,
        slopeY
      });
      if (perspective < 0.08) continue;
      gapCandidates.push({ x, foundationY, perspective });
    }
  }
  shuffleInPlace(gapCandidates, random);
  for (const candidate of gapCandidates) {
    if (normalizedFoundationPointSeparation(candidate, accepted, spacing) < 0.72) continue;
    accepted.push(candidate);
    generated.push(candidate);
  }
  generated.sort((left, right) => left.perspective - right.perspective || left.x - right.x);
  return Object.freeze(generated.map((point) => Object.freeze(point)));
}

export function cityBackgroundLayout({ city, frames, baseFrame, baseTopYByX }) {
  if (!city || typeof city !== "object" || typeof city.id !== "string" || city.id === "") {
    throw new Error("Background city layout requires a stable city id");
  }
  if (!cityBackgroundEnabled(city)) return Object.freeze([]);
  requireFrame(baseFrame, BACKGROUND_CITY_BASE_LAYER);
  if (
    (!Array.isArray(baseTopYByX) && !ArrayBuffer.isView(baseTopYByX)) ||
    baseTopYByX.length !== baseFrame.frame.w ||
    !Array.from(baseTopYByX).every(Number.isInteger)
  ) {
    throw new Error("Background city layout requires the base top-edge profile");
  }
  const frameByLayer = new Map(frames.map((frame) => [frame.layer, frame]));
  BACKGROUND_CITY_BUILDING_LAYERS.forEach((layerName) => {
    const frame = frameByLayer.get(layerName);
    requireFrame(frame, layerName);
  });
  const skylineReferenceFrame = frameByLayer.get("Inn");
  const buildingPool = backgroundCityBuildingPool(city, frameByLayer);
  const eligibleBuildingFrames = [...new Set(buildingPool)];
  const densityOverlap = backgroundCityDensityOverlap(city);
  const densityName = city.backgroundCity?.density || "moderate";
  const random = seededRandom(hashString(`${city.id}|buildings`));
  const baseLeft = baseFrame.spriteSourceSize.x;
  const baseRight = baseLeft + baseFrame.spriteSourceSize.w;
  const cityLeft = baseLeft + BACKGROUND_CITY_QUAY_CLEARANCE;
  const foundationAnchorY = baseTopYByX[0];
  const churchCount = backgroundCityChurchCount(city);
  const churchFrame = churchCount > 0
    ? frameByLayer.get(BACKGROUND_CITY_CHURCH_LAYER)
    : null;
  if (churchCount > 0) {
    requireFrame(churchFrame, BACKGROUND_CITY_CHURCH_LAYER);
  }
  const churchPlans = cityBackgroundChurchPlans({
    cityId: city.id,
    count: churchCount
  });
  const placements = [];
  const cycleOffset = randomInteger(random, 0, buildingPool.length - 1);
  let x = cityLeft;
  let buildingIndex = 0;
  let previousLayer = null;
  while (x < baseRight) {
    const preferred = buildingPool[(cycleOffset + buildingIndex) % buildingPool.length];
    const frame = chooseCityBuildingFrame({
      preferred,
      candidates: eligibleBuildingFrames,
      previousLayer,
      centerX: x,
      perspective: 0,
      placements,
      random
    });
    const geometry = cityBackgroundGeometryAtX({
      frame,
      x,
      foundationY: Number.POSITIVE_INFINITY,
      foundationSourceHeight: BACKGROUND_CITY_FOUNDATION_SOURCE_HEIGHT,
      groundOnRibbon: true,
      baseLeft,
      baseRight,
      baseTopYByX,
      foundationAnchorY
    });
    if (!geometry) break;
    placements.push(cityBackgroundBuilding(frame, geometry));
    previousLayer = frame.layer;
    buildingIndex++;
    const overlap = Math.max(3, Math.round(geometry.width * (
      densityOverlap.minimum + random() * densityOverlap.variation
    )));
    x += geometry.width - overlap;
  }

  const points = cityBackgroundFoundationPoints({
    cityId: city.id,
    density: densityName,
    baseFrame,
    baseTopYByX,
    seedPoints: placements.map((building) => ({
      x: building.x,
      foundationY: building.wallBottomY,
      perspective: 0
    }))
  });
  for (const point of points) {
    const placement = placeScatteredCityBuilding({
      point,
      buildingPool,
      eligibleBuildingFrames,
      placements,
      random,
      baseLeft,
      baseRight,
      baseTopYByX,
      foundationAnchorY
    });
    if (placement) placements.push(placement);
  }

  fillBackgroundCityFoundationGaps({
    placements,
    buildingPool,
    eligibleBuildingFrames,
    random,
    baseLeft,
    baseRight,
    baseTopYByX,
    foundationAnchorY
  });

  insertBackgroundCityChurches({
    placements,
    churchPlans,
    churchFrame,
    skylineReferenceFrame,
    baseLeft,
    baseRight,
    baseTopYByX,
    foundationAnchorY
  });

  return backgroundCityPlacementBuckets(placements);
}

export function cityBackgroundChurchPlans({ cityId, count }) {
  if (typeof cityId !== "string" || cityId === "") {
    throw new Error("Background city church plans require a city id");
  }
  if (!Number.isInteger(count) || count < 0 || count > 6) {
    throw new Error(`Invalid background city church count: ${count}`);
  }
  if (count === 0) return Object.freeze([]);
  const admittedCount = count;
  const random = seededRandom(hashString(`${cityId}|church-districts`));
  const minimumPerspective = 0.68;
  const maximumPerspective = 0.92;
  const plans = [];
  for (let index = 0; index < admittedCount; index++) {
    const progress = admittedCount === 1 ? 0.5 : index / (admittedCount - 1);
    const targetPerspective = roundTo(admittedCount === 1
      ? 0.84
      : minimumPerspective + (maximumPerspective - minimumPerspective) * progress, 3);
    const baseFraction = admittedCount === 1 ? 0.58 : 0.3 + progress * 0.46;
    const targetFraction = roundTo(Math.max(0.2, Math.min(
      0.84,
      baseFraction + (random() - 0.5) * 0.08
    )), 3);
    plans.push(Object.freeze({ targetPerspective, targetFraction }));
  }
  return Object.freeze(plans);
}

export function oppositeBankCityBackgroundLayout({
  city,
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
      depth: building.depth ?? row.depth,
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

export function cityBackgroundFlyingBuildings(rows) {
  if (
    !Array.isArray(rows) ||
    !rows.every((row) => (
      Number.isInteger(row?.distanceFromFront) &&
      row.distanceFromFront >= 0 &&
      Array.isArray(row?.buildings) &&
      row.buildings.every((building) => (
        Number.isFinite(building?.x) &&
        Number.isFinite(building?.y) &&
        Number.isFinite(building?.wallBottomY) &&
        Number.isFinite(building?.bottomY) &&
        Number.isInteger(building?.width) &&
        building.width > 0
      ))
    ))
  ) {
    throw new Error("Invalid background city rows for flying-building detection");
  }
  const entries = rows.flatMap((row) => row.buildings.map((building) => ({ row, building })));
  const flying = [];
  for (const { row, building } of entries) {
    if (building.groundedOnRibbon === true) continue;
    if (building.groundedOnRibbon === undefined && row.distanceFromFront === 0) continue;
    const nearerBuildings = entries.filter((candidate) => (
      candidate.building !== building && (
        Number.isFinite(candidate.building.perspective) && Number.isFinite(building.perspective)
          ? candidate.building.perspective < building.perspective
          : candidate.row.distanceFromFront < row.distanceFromFront
      )
    )).map((candidate) => candidate.building);
    if (!foundationSpanIsOccluded({ building, nearerBuildings })) flying.push(building);
  }
  return Object.freeze(flying);
}

export function cityBackgroundFoundationEnvelope(rows) {
  if (
    !Array.isArray(rows) ||
    !rows.every((row) => (
      Array.isArray(row?.buildings) &&
      row.buildings.every((building) => (
        Number.isFinite(building?.x) &&
        Number.isFinite(building?.wallBottomY) &&
        Number.isInteger(building?.width) &&
        building.width > 0
      ))
    ))
  ) {
    throw new Error("Invalid background city rows for foundation envelope");
  }
  const buildings = rows.flatMap((row) => row.buildings);
  if (buildings.length === 0) return Object.freeze([]);
  const leftX = Math.floor(Math.min(...buildings.map((building) => building.x)));
  const rightX = Math.ceil(Math.max(...buildings.map((building) => (
    building.x + building.width
  ))));
  const envelope = [];
  for (let x = leftX; x < rightX; x++) {
    const foundations = buildings.filter((building) => (
      x >= building.x && x < building.x + building.width
    )).map((building) => building.wallBottomY);
    if (foundations.length === 0) continue;
    envelope.push(Object.freeze({ x, foundationY: Math.min(...foundations) }));
  }
  return Object.freeze(envelope);
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
      Number.isFinite(building?.skylineTopY) &&
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
    )).map((building) => building.skylineTopY));
    return Object.freeze({ x, topY });
  }));
}

export function cityBackgroundColumnFoundations(rows) {
  if (
    !Array.isArray(rows) ||
    !rows.every((row) => (
      Number.isInteger(row?.distanceFromFront) &&
      Array.isArray(row?.buildings) &&
      row.buildings.every((building) => (
        Number.isFinite(building?.x) &&
        Number.isFinite(building?.wallBottomY) &&
        Number.isInteger(building?.width) &&
        building.width > 0
      ))
    ))
  ) {
    throw new Error("Invalid background city rows for foundation measurement");
  }
  const buildings = rows.flatMap((row) => row.buildings);
  const frontRow = rows.find((row) => row.distanceFromFront === 0);
  if (!frontRow || buildings.length === 0) return Object.freeze([]);
  return Object.freeze(frontRow.buildings.map((frontBuilding) => {
    const x = frontBuilding.x + frontBuilding.width / 2;
    const foundationY = Math.min(...buildings.filter((building) => (
      x >= building.x && x < building.x + building.width
    )).map((building) => building.wallBottomY));
    return Object.freeze({ x, foundationY });
  }));
}

export function cityBackgroundFoundationTargetY(anchorX, anchorY, x) {
  if (![anchorX, anchorY, x].every(Number.isFinite) || x < anchorX) {
    throw new Error(`Invalid background city foundation target: ${anchorX},${anchorY}→${x}`);
  }
  return anchorY - Math.round((x - anchorX) * BACKGROUND_CITY_FOUNDATION_RISE_PER_PIXEL);
}

export function cityBackgroundFoundationPerspective({ foundationY, shorelineY, slopeY }) {
  if (
    ![foundationY, shorelineY, slopeY].every(Number.isFinite) ||
    shorelineY < slopeY ||
    foundationY < slopeY - BACKGROUND_CITY_FOUNDATION_TOLERANCE ||
    foundationY > shorelineY + BACKGROUND_CITY_FOUNDATION_TOLERANCE
  ) {
    throw new Error(
      `Invalid background city foundation perspective: ${foundationY} in ${slopeY}–${shorelineY}`
    );
  }
  if (shorelineY === slopeY) return 0;
  return Math.max(0, Math.min(1, (shorelineY - foundationY) / (shorelineY - slopeY)));
}

export function cityBackgroundVisualPerspective({ foundationY, nearY, farY }) {
  if (
    ![foundationY, nearY, farY].every(Number.isFinite) ||
    nearY <= farY
  ) {
    throw new Error(
      `Invalid background city visual perspective: ${foundationY} in ${farY}–${nearY}`
    );
  }
  return Math.max(0, Math.min(1, (nearY - foundationY) / (nearY - farY)));
}

export function cityBackgroundScaleForPerspective(perspective) {
  if (!Number.isFinite(perspective) || perspective < 0 || perspective > 1) {
    throw new Error(`Invalid background city scale perspective: ${perspective}`);
  }
  return roundTo(
    BACKGROUND_CITY_NEAR_SCALE -
      (BACKGROUND_CITY_NEAR_SCALE - BACKGROUND_CITY_FAR_SCALE) * perspective,
    3
  );
}

export function cityBackgroundDepthForPerspective(perspective) {
  if (!Number.isFinite(perspective) || perspective < 0 || perspective > 1) {
    throw new Error(`Invalid background city depth perspective: ${perspective}`);
  }
  return roundTo(
    BACKGROUND_CITY_FRONT_DEPTH -
      (BACKGROUND_CITY_FRONT_DEPTH - BACKGROUND_CITY_REAR_DEPTH) * perspective,
    3
  );
}

export function cityBackgroundAtmosphereLevelForPerspective(perspective) {
  if (!Number.isFinite(perspective) || perspective < 0 || perspective > 1) {
    throw new Error(`Invalid background city atmosphere perspective: ${perspective}`);
  }
  if (perspective < 0.12) return 0;
  return perspective < 0.68 ? 1 : 2;
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

function backgroundCityBuildingPool(city, frameByLayer) {
  const frames = [...frameByLayer.values()];
  const configuredMix = city.backgroundCity?.buildingMix;
  if (configuredMix === undefined) {
    return BACKGROUND_CITY_BUILDING_LAYERS.map((layerName) => (
      cityRegionalBuildingFrame(frames, city.cityType, layerName)
    ));
  }
  if (!configuredMix || typeof configuredMix !== "object" || Array.isArray(configuredMix)) {
    throw new Error("Invalid background city building mix");
  }
  const pool = [];
  for (const [mixKey, layerName] of Object.entries(BACKGROUND_CITY_BUILDING_MIX_LAYERS)) {
    const weight = configuredMix[mixKey];
    if (!Number.isInteger(weight) || weight < 0 || weight > 12) {
      throw new Error(`Invalid background city ${mixKey} weight: ${weight}`);
    }
    const frame = cityRegionalBuildingFrame(frames, city.cityType, layerName);
    requireFrame(frame, frame.layer);
    for (let copy = 0; copy < weight; copy++) pool.push(frame);
  }
  if (pool.length === 0) throw new Error("Background city building mix cannot be empty");
  return Object.freeze(pool);
}

function backgroundCityDensityOverlap(city) {
  const density = city.backgroundCity?.density || "moderate";
  const overlap = BACKGROUND_CITY_DENSITY_OVERLAP[density];
  if (!overlap) throw new Error(`Invalid background city density: ${density}`);
  return overlap;
}

function backgroundCityChurchCount(city) {
  const configuredCount = city.backgroundCity?.landmarks?.church;
  if (configuredCount === undefined) {
    return city.religiousLandmarks?.includes("church") ? 1 : 0;
  }
  if (!Number.isInteger(configuredCount) || configuredCount < 0 || configuredCount > 6) {
    throw new Error(`Invalid background city church count: ${configuredCount}`);
  }
  return configuredCount;
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

function requireFoundationBand({ baseFrame, baseTopYByX }) {
  requireFrame(baseFrame, BACKGROUND_CITY_BASE_LAYER);
  if (
    (!Array.isArray(baseTopYByX) && !ArrayBuffer.isView(baseTopYByX)) ||
    baseTopYByX.length !== baseFrame.frame.w ||
    !Array.from(baseTopYByX).every(Number.isInteger)
  ) {
    throw new Error("Invalid background city foundation band");
  }
}

function cityBackgroundGeometryAtX({
  frame,
  x,
  foundationY,
  foundationSourceHeight,
  scaleMultiplier = 1,
  groundOnRibbon,
  baseLeft,
  baseRight,
  baseTopYByX,
  foundationAnchorY
}) {
  if (
    !Number.isFinite(x) ||
    (!groundOnRibbon && !Number.isFinite(foundationY)) ||
    !Number.isFinite(scaleMultiplier) ||
    scaleMultiplier <= 0 ||
    scaleMultiplier > 1
  ) return null;
  x = Math.round(x);
  const visualNearY = maximumValue(baseTopYByX, 0, baseTopYByX.length);
  const visualFarY = cityBackgroundFoundationTargetY(
    baseLeft,
    foundationAnchorY,
    baseRight - 1
  );
  let scale = groundOnRibbon
    ? BACKGROUND_CITY_NEAR_SCALE * scaleMultiplier
    : cityBackgroundScaleForPerspective(0.5) * scaleMultiplier;
  let geometry = null;
  for (let iteration = 0; iteration < 8; iteration++) {
    const width = Math.max(1, Math.round(frame.frame.w * scale));
    const height = Math.max(1, Math.round(frame.frame.h * scale));
    if (x < baseLeft + BACKGROUND_CITY_QUAY_CLEARANCE || x >= baseRight) return null;
    const foundationHeight = Math.min(
      height - 1,
      Math.max(1, Math.round(foundationSourceHeight * scale))
    );
    const profileStartX = Math.max(0, Math.floor(x - baseLeft));
    const profileEndX = Math.min(
      baseTopYByX.length,
      Math.ceil(x + width - baseLeft)
    );
    const shorelineTopY = minimumValue(baseTopYByX, profileStartX, profileEndX);
    const authoredSlopeY = cityBackgroundFoundationTargetY(baseLeft, foundationAnchorY, x);
    if (!groundOnRibbon && shorelineTopY <= authoredSlopeY) return null;
    const slopeY = groundOnRibbon ? Math.min(authoredSlopeY, shorelineTopY) : authoredSlopeY;
    const sampledWallBottomY = groundOnRibbon
      ? shorelineTopY
      : Math.max(slopeY, Math.min(shorelineTopY, Math.round(foundationY)));
    const wallBottomY = sampledWallBottomY;
    const groundedOnRibbon = groundOnRibbon || wallBottomY === shorelineTopY;
    const perspective = cityBackgroundVisualPerspective({
      foundationY: wallBottomY,
      nearY: visualNearY,
      farY: visualFarY
    });
    const nextScale = cityBackgroundScaleForPerspective(perspective) * scaleMultiplier;
    geometry = {
      x,
      scale,
      perspective,
      depth: groundedOnRibbon
        ? BACKGROUND_CITY_FRONT_DEPTH
        : cityBackgroundDepthForPerspective(perspective),
      atmosphereLevel: cityBackgroundAtmosphereLevelForPerspective(perspective),
      width,
      height,
      foundationHeight,
      shorelineTopY,
      wallBottomY,
      sampledWallBottomY,
      slopeY,
      groundedOnRibbon
    };
    if (nextScale === scale) break;
    scale = nextScale;
  }
  return geometry;
}

function cityBackgroundBuilding(frame, geometry) {
  const y = geometry.wallBottomY - (geometry.height - geometry.foundationHeight);
  return {
    frame,
    x: geometry.x,
    y,
    bottomY: y + geometry.height,
    wallBottomY: geometry.wallBottomY,
    admittedWallBottomY: geometry.wallBottomY,
    shorelineTopY: geometry.shorelineTopY,
    rowGroundTopY: geometry.shorelineTopY,
    sampledWallBottomY: geometry.sampledWallBottomY,
    occlusionOffset: geometry.wallBottomY - geometry.sampledWallBottomY,
    foundationHeight: geometry.foundationHeight,
    skylineTopY: y,
    scale: geometry.scale,
    perspective: geometry.perspective,
    depth: geometry.depth,
    atmosphereLevel: geometry.atmosphereLevel,
    groundedOnRibbon: geometry.groundedOnRibbon,
    rightRise: 0,
    width: geometry.width,
    height: geometry.height
  };
}

function chooseCityBuildingFrame({
  preferred,
  candidates,
  previousLayer,
  centerX,
  perspective,
  placements,
  random
}) {
  const nonRepeating = candidates.filter((candidate) => candidate.layer !== previousLayer);
  const pool = nonRepeating.length > 0 ? nonRepeating : candidates;
  const scores = new Map(pool.map((candidate) => [
    candidate,
    directlyBehindDuplicateCount(candidate, centerX, perspective, placements)
  ]));
  const minimumScore = Math.min(...scores.values());
  const best = pool.filter((candidate) => scores.get(candidate) === minimumScore);
  if (best.includes(preferred)) return preferred;
  return best[randomInteger(random, 0, best.length - 1)];
}

function directlyBehindDuplicateCount(frame, anchorX, perspective, placements) {
  const width = Math.max(1, Math.round(
    frame.frame.w * cityBackgroundScaleForPerspective(perspective)
  ));
  const centerX = anchorX + width / 2;
  return placements.filter((building) => (
    building.frame.layer === frame.layer &&
    Math.abs(building.perspective - perspective) > 0.04 &&
    Math.abs(centerX - (building.x + building.width / 2)) <=
      Math.min(width, building.width) * 0.35
  )).length;
}

function placeScatteredCityBuilding({
  point,
  buildingPool,
  eligibleBuildingFrames,
  placements,
  random,
  baseLeft,
  baseRight,
  baseTopYByX,
  foundationAnchorY
}) {
  const preferred = buildingPool[randomInteger(random, 0, buildingPool.length - 1)];
  const previousLayer = placements
    .filter((building) => Math.abs(building.perspective - point.perspective) < 0.08)
    .sort((left, right) => Math.abs(left.x - point.x) - Math.abs(right.x - point.x))[0]
    ?.frame.layer;
  const first = chooseCityBuildingFrame({
    preferred,
    candidates: eligibleBuildingFrames,
    previousLayer,
    centerX: point.x,
    perspective: point.perspective,
    placements,
    random
  });
  const orderedFrames = [first, ...eligibleBuildingFrames.filter((frame) => frame !== first)];
  for (let foundationDrop = 0; foundationDrop <= BACKGROUND_CITY_POINT_SPACING_Y; foundationDrop++) {
    for (const frame of orderedFrames) {
      const geometry = cityBackgroundGeometryAtX({
        frame,
        x: point.x,
        foundationY: point.foundationY + foundationDrop,
        foundationSourceHeight: BACKGROUND_CITY_FOUNDATION_SOURCE_HEIGHT,
        groundOnRibbon: false,
        baseLeft,
        baseRight,
        baseTopYByX,
        foundationAnchorY
      });
      if (!geometry) continue;
      const building = cityBackgroundBuilding(frame, geometry);
      if (
        building.groundedOnRibbon ||
        foundationSpanIsOccluded({ building, nearerBuildings: placements })
      ) return building;
    }
  }
  return null;
}

function fillBackgroundCityFoundationGaps({
  placements,
  buildingPool,
  eligibleBuildingFrames,
  random,
  baseLeft,
  baseRight,
  baseTopYByX,
  foundationAnchorY
}) {
  const maximumPerspective = 1;
  const scanStepX = 1;
  for (let pass = 0; pass < 2; pass++) {
    const gaps = [];
    for (let x = baseLeft + BACKGROUND_CITY_QUAY_CLEARANCE; x < baseRight; x += scanStepX) {
      const profileX = Math.max(0, Math.min(baseTopYByX.length - 1, Math.floor(x - baseLeft)));
      const shorelineY = baseTopYByX[profileX];
      const slopeY = cityBackgroundFoundationTargetY(baseLeft, foundationAnchorY, x);
      if (shorelineY <= slopeY) continue;
      const targetFoundationY = Math.round(
        shorelineY - (shorelineY - slopeY) * maximumPerspective
      );
      const existingFoundationY = Math.min(...placements.filter((building) => (
        x >= building.x && x < building.x + building.width
      )).map((building) => building.wallBottomY));
      if (existingFoundationY <= targetFoundationY + BACKGROUND_CITY_FOUNDATION_TOLERANCE) continue;
      const perspective = cityBackgroundFoundationPerspective({
        foundationY: targetFoundationY,
        shorelineY,
        slopeY
      });
      gaps.push({ x, foundationY: targetFoundationY, perspective });
    }
    gaps.sort((left, right) => left.perspective - right.perspective || left.x - right.x);
    let additions = 0;
    for (const point of gaps) {
      const currentFoundationY = Math.min(...placements.filter((building) => (
        point.x >= building.x && point.x < building.x + building.width
      )).map((building) => building.wallBottomY));
      if (currentFoundationY <= point.foundationY + BACKGROUND_CITY_FOUNDATION_TOLERANCE) continue;
      const placement = placeScatteredCityBuilding({
        point,
        buildingPool,
        eligibleBuildingFrames,
        placements,
        random,
        baseLeft,
        baseRight,
        baseTopYByX,
        foundationAnchorY
      });
      if (!placement) continue;
      placements.push(placement);
      additions++;
    }
    if (additions === 0) break;
  }
}

function insertBackgroundCityChurches({
  placements,
  churchPlans,
  churchFrame,
  skylineReferenceFrame,
  baseLeft,
  baseRight,
  baseTopYByX,
  foundationAnchorY
}) {
  if (!churchFrame || churchPlans.length === 0) return;
  const used = new Set();
  for (const plan of churchPlans) {
    const targetX = baseLeft + BACKGROUND_CITY_QUAY_CLEARANCE +
      (baseRight - baseLeft - BACKGROUND_CITY_QUAY_CLEARANCE) * plan.targetFraction;
    const targetPerspective = plan.targetPerspective;
    const candidates = placements.map((building, index) => ({ building, index }))
      .filter(({ index, building }) => !used.has(index) && !building.groundedOnRibbon)
      .sort((left, right) => (
        Math.abs(left.building.x - targetX) +
          Math.abs(left.building.perspective - targetPerspective) * 180 -
        (Math.abs(right.building.x - targetX) +
          Math.abs(right.building.perspective - targetPerspective) * 180)
      ));
    for (const { building: replaced, index } of candidates) {
      const geometry = cityBackgroundGeometryAtX({
        frame: churchFrame,
        x: replaced.x,
        foundationY: replaced.wallBottomY,
        foundationSourceHeight: BACKGROUND_CITY_CHURCH_FOUNDATION_SOURCE_HEIGHT,
        scaleMultiplier: BACKGROUND_CITY_CHURCH_SCALE_MULTIPLIER,
        groundOnRibbon: false,
        baseLeft,
        baseRight,
        baseTopYByX,
        foundationAnchorY
      });
      if (!geometry) continue;
      const church = cityBackgroundBuilding(churchFrame, geometry);
      const otherBuildings = placements.filter((_, candidateIndex) => candidateIndex !== index);
      if (!foundationSpanIsOccluded({ building: church, nearerBuildings: otherBuildings })) continue;
      const churchSkylineHeight = Math.max(1, Math.round(
        (skylineReferenceFrame.frame.h - BACKGROUND_CITY_FOUNDATION_SOURCE_HEIGHT) * church.scale
      ));
      church.skylineTopY = church.wallBottomY - churchSkylineHeight;
      placements[index] = church;
      if (flyingCityPlacements(placements).length > 0) {
        placements[index] = replaced;
        continue;
      }
      used.add(index);
      break;
    }
  }
}

function backgroundCityPlacementBuckets(placements) {
  const grouped = new Map();
  for (const placement of placements) {
    const distanceFromFront = Math.max(0, Math.min(
      BACKGROUND_CITY_MAX_ROWS - 1,
      Math.round(placement.perspective * (BACKGROUND_CITY_MAX_ROWS - 1))
    ));
    const building = Object.freeze({ ...placement, distanceFromFront });
    if (!grouped.has(distanceFromFront)) grouped.set(distanceFromFront, []);
    grouped.get(distanceFromFront).push(building);
  }
  const distances = [...grouped.keys()].sort((left, right) => right - left);
  return Object.freeze(distances.map((distanceFromFront, rowIndex) => {
    const buildings = grouped.get(distanceFromFront).sort((left, right) => left.x - right.x);
    return Object.freeze({
      rowIndex,
      distanceFromFront,
      scale: buildings[0].scale,
      depth: buildings[0].depth,
      parallaxAnchor: BACKGROUND_CITY_PARALLAX_ANCHOR,
      verticalOffset: -Math.round(buildings[0].perspective * 56),
      rowFoundationHeight: buildings[0].foundationHeight,
      buildings: Object.freeze(buildings)
    });
  }));
}

function foundationSpanIsOccluded({ building, nearerBuildings }) {
  const leftX = Math.floor(building.x);
  const rightX = Math.ceil(building.x + building.width);
  for (let x = leftX; x < rightX; x++) {
    const covered = nearerBuildings.some((nearer) => (
      nearer !== building &&
      (!Number.isFinite(nearer.perspective) ||
        !Number.isFinite(building.perspective) ||
        nearer.perspective < building.perspective) &&
      x >= nearer.x &&
      x < nearer.x + nearer.width &&
      nearer.y <= building.wallBottomY &&
      nearer.bottomY >= building.bottomY
    ));
    if (!covered) return false;
  }
  return true;
}

function flyingCityPlacements(placements) {
  return placements.filter((building) => (
    !building.groundedOnRibbon &&
    !foundationSpanIsOccluded({ building, nearerBuildings: placements })
  ));
}

function randomFoundationPoint({
  random,
  baseLeft,
  cityLeft,
  cityRight,
  anchorY,
  baseTopYByX,
  maximumPerspective
}) {
  const x = randomInteger(random, cityLeft, cityRight - 1);
  const profileX = Math.max(0, Math.min(baseTopYByX.length - 1, x - baseLeft));
  const shorelineY = baseTopYByX[profileX];
  const slopeY = cityBackgroundFoundationTargetY(baseLeft, anchorY, x);
  const availableHeight = shorelineY - slopeY;
  if (availableHeight * maximumPerspective < 2) return null;
  const minimumPerspective = Math.min(maximumPerspective, 0.08);
  const perspective = minimumPerspective + random() * (maximumPerspective - minimumPerspective);
  const foundationY = Math.round(shorelineY - availableHeight * perspective);
  return {
    x,
    foundationY,
    perspective: cityBackgroundFoundationPerspective({ foundationY, shorelineY, slopeY })
  };
}

function normalizedFoundationPointSeparation(point, points, spacing) {
  if (points.length === 0) return Number.POSITIVE_INFINITY;
  return Math.min(...points.map((other) => Math.hypot(
    (point.x - other.x) / spacing.spacingX,
    (point.foundationY - other.foundationY) / spacing.spacingY
  )));
}

function validFoundationPoint(point) {
  return Number.isFinite(point?.x) &&
    Number.isFinite(point?.foundationY) &&
    Number.isFinite(point?.perspective) &&
    point.perspective >= 0 &&
    point.perspective <= 1;
}

function shuffleInPlace(values, random) {
  for (let index = values.length - 1; index > 0; index--) {
    const other = randomInteger(random, 0, index);
    [values[index], values[other]] = [values[other], values[index]];
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

function maximumValue(values, start, end) {
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end > values.length || start >= end) {
    throw new Error(`Invalid background city ribbon span: ${start}–${end}`);
  }
  let maximum = Number.NEGATIVE_INFINITY;
  for (let index = start; index < end; index++) maximum = Math.max(maximum, values[index]);
  return maximum;
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
