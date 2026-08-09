const CLOUD_BANK_EDGE_MARGIN_PX = 64;
const CLOUD_BANK_START_MARGIN_PX = 32;
const CLOUD_BANK_SOLID_HALF_DEPTH_PX = 30;

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
  const targetSpan = Math.abs(dy) * targetWidth / 2 + Math.abs(dx) * targetHeight / 2;
  const halfSpan = targetSpan + CLOUD_BANK_EDGE_MARGIN_PX;
  const targetOffsetDepth = Math.abs(
    (targetX - viewportWidth / 2) * dx + (targetY - viewportHeight / 2) * dy
  );
  const travelLimit = viewportDepth + targetOffsetDepth +
    CLOUD_BANK_SOLID_HALF_DEPTH_PX + CLOUD_BANK_START_MARGIN_PX;
  return Object.freeze({
    startedAtMs: nowMs,
    durationMs: travelLimit * 2 / speedPxPerSecond * 1000,
    dx,
    dy,
    targetX,
    targetY,
    targetWidth,
    targetHeight,
    solidHalfDepth: CLOUD_BANK_SOLID_HALF_DEPTH_PX,
    halfSpan,
    travelLimit,
    speedPxPerSecond
  });
}

export function chartRepairCloudBankFrame(bank, nowMs) {
  if (!bank || !Number.isFinite(nowMs)) {
    throw new Error("Chart repair cloud bank frame requires state and time");
  }
  const progress = Math.max(0, Math.min(1, (nowMs - bank.startedAtMs) / bank.durationMs));
  const travel = -bank.travelLimit + bank.travelLimit * 2 * progress;
  return Object.freeze({
    progress,
    centerX: bank.targetX + bank.dx * travel,
    centerY: bank.targetY + bank.dy * travel,
    dx: bank.dx,
    dy: bank.dy,
    targetX: bank.targetX,
    targetY: bank.targetY,
    targetWidth: bank.targetWidth,
    targetHeight: bank.targetHeight,
    angleRad: Math.atan2(bank.dy, bank.dx),
    solidHalfDepth: bank.solidHalfDepth,
    halfSpan: bank.halfSpan,
    finished: progress >= 1
  });
}

export function chartRepairCloudTargetContainsCircle(frame, x, y, radius = 0) {
  if (!frame) return false;
  for (const [label, value] of Object.entries({ x, y, radius })) {
    if (!Number.isFinite(value)) throw new Error(`Chart cloud target has invalid ${label}`);
  }
  if (radius < 0) throw new Error(`Chart cloud target radius cannot be negative: ${radius}`);
  return Math.abs(x - frame.targetX) + radius <= frame.targetWidth / 2 &&
    Math.abs(y - frame.targetY) + radius <= frame.targetHeight / 2;
}

export function chartRepairCloudFullyCoversCircle(frame, x, y, radius = 0) {
  if (!frame) return false;
  for (const [label, value] of Object.entries({ x, y, radius })) {
    if (!Number.isFinite(value)) throw new Error(`Chart cloud coverage has invalid ${label}`);
  }
  if (radius < 0) throw new Error(`Chart cloud coverage radius cannot be negative: ${radius}`);
  const deltaX = x - frame.centerX;
  const deltaY = y - frame.centerY;
  const depth = deltaX * frame.dx + deltaY * frame.dy;
  const span = -deltaX * frame.dy + deltaY * frame.dx;
  return Math.abs(depth) + radius <= frame.solidHalfDepth &&
    Math.abs(span) + radius <= frame.halfSpan;
}

export function chartRepairCloudSpriteCenter(frame, span, depth = 0) {
  if (!frame) throw new Error("Chart cloud sprite placement requires a frame");
  for (const [label, value] of Object.entries({ span, depth })) {
    if (!Number.isFinite(value)) throw new Error(`Chart cloud sprite has invalid ${label}`);
  }
  return Object.freeze({
    x: frame.centerX - frame.dy * span + frame.dx * depth,
    y: frame.centerY + frame.dx * span + frame.dy * depth
  });
}
