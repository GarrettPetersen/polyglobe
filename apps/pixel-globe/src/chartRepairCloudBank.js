const CLOUD_BANK_START_MARGIN_PX = 32;
const CLOUD_SPRITE_HALF_SIZE_PX = 32;
const CLOUD_REPAIR_CORE_RADIUS_PX = 31;
const CLOUD_REPAIR_VISIBLE_RADIUS_WEIGHT = 0.35;
const CLOUD_CROSSWIND_SPACING_PX = 44;
const CLOUD_BANK_MAX_SPRITES = 5;
const CLOUD_BANK_SPEED_DIVISOR = 3;

export const CHART_REPAIR_CLOUD_SPRITE_ALPHA = 0.62;
export const CHART_REPAIR_CLOUD_BLUR_STRENGTH = 0.88;

export function createChartRepairCloudBank({
  nowMs,
  viewportWidth,
  viewportHeight,
  directionX,
  directionY,
  speedPxPerSecond,
  targetX = viewportWidth / 2,
  targetY = viewportHeight / 2,
  targetWidth = viewportWidth,
  targetHeight = viewportHeight
}) {
  for (const [label, value] of Object.entries({
    nowMs,
    viewportWidth,
    viewportHeight,
    directionX,
    directionY,
    speedPxPerSecond,
    targetX,
    targetY,
    targetWidth,
    targetHeight
  })) {
    if (!Number.isFinite(value)) throw new Error(`Chart repair cloud bank has invalid ${label}`);
  }
  if (viewportWidth <= 0 || viewportHeight <= 0) {
    throw new Error("Chart repair cloud bank requires a non-empty viewport");
  }
  if (targetWidth <= 0 || targetHeight <= 0) {
    throw new Error("Chart repair cloud bank requires a non-empty target");
  }
  if (speedPxPerSecond <= 0) {
    throw new Error("Chart repair cloud bank speed must be positive");
  }
  const directionLength = Math.hypot(directionX, directionY);
  if (directionLength < 1e-6) {
    throw new Error("Chart repair cloud bank direction cannot be zero");
  }
  const dx = directionX / directionLength;
  const dy = directionY / directionLength;
  const viewportDepth = Math.abs(dx) * viewportWidth / 2 +
    Math.abs(dy) * viewportHeight / 2;
  const targetOffsetDepth = Math.abs(
    (targetX - viewportWidth / 2) * dx + (targetY - viewportHeight / 2) * dy
  );
  const travelLimit = viewportDepth + targetOffsetDepth +
    CLOUD_SPRITE_HALF_SIZE_PX + CLOUD_BANK_START_MARGIN_PX;
  const crosswindTargetSpan = Math.abs(dy) * targetWidth + Math.abs(dx) * targetHeight;
  const cloudCount = sparseCloudCount(crosswindTargetSpan);
  const cloudOffsets = Object.freeze(Array.from({ length: cloudCount }, (_, index) => {
    const centeredIndex = index - (cloudCount - 1) / 2;
    return Object.freeze({
      span: centeredIndex * CLOUD_CROSSWIND_SPACING_PX,
      depth: staggeredDepth(centeredIndex),
      variantIndex: index
    });
  }));
  return Object.freeze({
    startedAtMs: nowMs,
    durationMs: travelLimit * 2 / speedPxPerSecond * 1000,
    dx,
    dy,
    targetX,
    targetY,
    targetWidth,
    targetHeight,
    travelLimit,
    speedPxPerSecond,
    cloudOffsets
  });
}

export function slowedChartRepairCloudSpeed(speedPxPerSecond) {
  if (!Number.isFinite(speedPxPerSecond) || speedPxPerSecond <= 0) {
    throw new Error(`Chart repair cloud speed must be positive: ${speedPxPerSecond}`);
  }
  return speedPxPerSecond / CLOUD_BANK_SPEED_DIVISOR;
}

export function chartRepairCloudBankFrame(bank, nowMs) {
  if (!bank || !Number.isFinite(nowMs)) {
    throw new Error("Chart repair cloud bank frame requires state and time");
  }
  const progress = Math.max(0, Math.min(1, (nowMs - bank.startedAtMs) / bank.durationMs));
  const travel = -bank.travelLimit + bank.travelLimit * 2 * progress;
  const centerX = bank.targetX + bank.dx * travel;
  const centerY = bank.targetY + bank.dy * travel;
  const clouds = Object.freeze(bank.cloudOffsets.map((offset) => Object.freeze({
    x: centerX - bank.dy * offset.span + bank.dx * offset.depth,
    y: centerY + bank.dx * offset.span + bank.dy * offset.depth,
    variantIndex: offset.variantIndex
  })));
  return Object.freeze({
    progress,
    centerX,
    centerY,
    dx: bank.dx,
    dy: bank.dy,
    targetX: bank.targetX,
    targetY: bank.targetY,
    targetWidth: bank.targetWidth,
    targetHeight: bank.targetHeight,
    clouds,
    finished: progress >= 1
  });
}

export function chartRepairCloudFullyCoversCircle(frame, x, y, radius = 0) {
  if (!frame) return false;
  for (const [label, value] of Object.entries({ x, y, radius })) {
    if (!Number.isFinite(value)) throw new Error(`Chart cloud coverage has invalid ${label}`);
  }
  if (radius < 0) throw new Error(`Chart cloud coverage radius cannot be negative: ${radius}`);
  const centerTolerance = CLOUD_REPAIR_CORE_RADIUS_PX - radius;
  if (centerTolerance < 0) return false;
  return frame.clouds.some((cloud) => (
    Math.hypot(x - cloud.x, y - cloud.y) <= centerTolerance
  ));
}

export function chartRepairCloudMostlyCoversCircle(frame, x, y, radius = 0) {
  if (!frame) return false;
  validateCloudCoveragePoint(x, y, radius, "repair coverage");
  const centerTolerance = CLOUD_REPAIR_CORE_RADIUS_PX -
    radius * CLOUD_REPAIR_VISIBLE_RADIUS_WEIGHT;
  return frame.clouds.some((cloud) => (
    Math.hypot(x - cloud.x, y - cloud.y) <= centerTolerance
  ));
}

export function chartRepairCloudMayFullyCoverCircle(bank, x, y, radius = 0) {
  if (!bank) return false;
  validateCloudCoveragePoint(x, y, radius, "path");
  const centerTolerance = CLOUD_REPAIR_CORE_RADIUS_PX - radius;
  return cloudPathPassesWithin(bank, x, y, centerTolerance);
}

export function chartRepairCloudMayMostlyCoverCircle(bank, x, y, radius = 0) {
  if (!bank) return false;
  validateCloudCoveragePoint(x, y, radius, "repair path");
  const centerTolerance = CLOUD_REPAIR_CORE_RADIUS_PX -
    radius * CLOUD_REPAIR_VISIBLE_RADIUS_WEIGHT;
  return cloudPathPassesWithin(bank, x, y, centerTolerance);
}

function validateCloudCoveragePoint(x, y, radius, subject) {
  for (const [label, value] of Object.entries({ x, y, radius })) {
    if (!Number.isFinite(value)) throw new Error(`Chart cloud ${subject} has invalid ${label}`);
  }
  if (radius < 0) throw new Error(`Chart cloud ${subject} radius cannot be negative: ${radius}`);
}

function cloudPathPassesWithin(bank, x, y, centerTolerance) {
  if (centerTolerance < 0) return false;
  return bank.cloudOffsets.some((offset) => {
    const centerX = bank.targetX - bank.dy * offset.span + bank.dx * offset.depth;
    const centerY = bank.targetY + bank.dx * offset.span + bank.dy * offset.depth;
    const along = (x - centerX) * bank.dx + (y - centerY) * bank.dy;
    const clampedAlong = Math.max(-bank.travelLimit, Math.min(bank.travelLimit, along));
    const nearestX = centerX + bank.dx * clampedAlong;
    const nearestY = centerY + bank.dy * clampedAlong;
    return Math.hypot(x - nearestX, y - nearestY) <= centerTolerance;
  });
}

function sparseCloudCount(crosswindTargetSpan) {
  const desired = Math.max(1, Math.ceil(crosswindTargetSpan / 110));
  const oddCount = desired % 2 === 0 ? desired + 1 : desired;
  return Math.min(CLOUD_BANK_MAX_SPRITES, oddCount);
}

function staggeredDepth(centeredIndex) {
  if (centeredIndex === 0) return 0;
  if (centeredIndex === -2) return -16;
  if (centeredIndex === -1) return 20;
  if (centeredIndex === 1) return -22;
  if (centeredIndex === 2) return 17;
  throw new Error(`Chart repair cloud has unsupported stagger index: ${centeredIndex}`);
}
