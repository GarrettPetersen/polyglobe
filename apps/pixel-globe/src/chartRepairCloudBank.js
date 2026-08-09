const CLOUD_BANK_EDGE_MARGIN_PX = 64;
const CLOUD_BANK_START_MARGIN_PX = 32;
const CLOUD_BANK_SOFT_EDGE_PX = 18;

export function createChartRepairCloudBank({
  nowMs,
  viewportWidth,
  viewportHeight,
  directionX,
  directionY,
  windStrength,
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
    windStrength,
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
  const directionLength = Math.hypot(directionX, directionY);
  if (directionLength < 1e-6) {
    throw new Error("Chart repair cloud bank direction cannot be zero");
  }
  const dx = directionX / directionLength;
  const dy = directionY / directionLength;
  const viewportDepth = Math.abs(dx) * viewportWidth / 2 +
    Math.abs(dy) * viewportHeight / 2;
  const targetDepth = Math.abs(dx) * targetWidth / 2 + Math.abs(dy) * targetHeight / 2;
  const targetSpan = Math.abs(dy) * targetWidth / 2 + Math.abs(dx) * targetHeight / 2;
  const halfDepth = targetDepth + CLOUD_BANK_EDGE_MARGIN_PX + CLOUD_BANK_SOFT_EDGE_PX;
  const halfSpan = targetSpan + CLOUD_BANK_EDGE_MARGIN_PX;
  const targetOffsetDepth = Math.abs(
    (targetX - viewportWidth / 2) * dx + (targetY - viewportHeight / 2) * dy
  );
  const travelLimit = viewportDepth + targetOffsetDepth + halfDepth + CLOUD_BANK_START_MARGIN_PX;
  const speedPxPerSecond = 160 + Math.max(0, Math.min(1.2, windStrength)) * 110;
  return Object.freeze({
    startedAtMs: nowMs,
    durationMs: travelLimit * 2 / speedPxPerSecond * 1000,
    viewportWidth,
    viewportHeight,
    dx,
    dy,
    targetX,
    targetY,
    targetWidth,
    targetHeight,
    targetDepth,
    targetSpan,
    halfDepth,
    halfSpan,
    travelLimit
  });
}

export function chartRepairCloudBankFrame(bank, nowMs) {
  if (!bank || !Number.isFinite(nowMs)) {
    throw new Error("Chart repair cloud bank frame requires state and time");
  }
  const progress = Math.max(0, Math.min(1, (nowMs - bank.startedAtMs) / bank.durationMs));
  const travel = -bank.travelLimit + bank.travelLimit * 2 * progress;
  const solidHalfDepth = bank.halfDepth - CLOUD_BANK_SOFT_EDGE_PX;
  const viewportDepth = (
    Math.abs(bank.dx) * bank.viewportWidth / 2 +
    Math.abs(bank.dy) * bank.viewportHeight / 2
  );
  const viewportSpan = (
    Math.abs(bank.dy) * bank.viewportWidth / 2 +
    Math.abs(bank.dx) * bank.viewportHeight / 2
  );
  const fullCoverDepth = solidHalfDepth - viewportDepth;
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
    halfDepth: bank.halfDepth,
    solidHalfDepth,
    halfSpan: bank.halfSpan,
    coversTarget: Math.abs(travel) <= solidHalfDepth - bank.targetDepth,
    coversViewport: bank.targetX === bank.viewportWidth / 2 &&
      bank.targetY === bank.viewportHeight / 2 &&
      bank.halfSpan >= viewportSpan &&
      Math.abs(travel) <= fullCoverDepth,
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
