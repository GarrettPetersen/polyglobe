export const SHIP_SPRITE_REGISTRATION_MARGIN = 2;

export function anchoredShipFrameRegistration({
  boundsByHeading,
  sourceAnchor,
  frameSize,
  requestedScale = null,
  margin = SHIP_SPRITE_REGISTRATION_MARGIN
}) {
  validateRegistrationInputs(boundsByHeading, sourceAnchor, frameSize, requestedScale, margin);
  const envelope = anchorRelativeEnvelope(boundsByHeading, sourceAnchor);
  const drawableSize = frameSize - margin * 2;
  const fitScale = Math.min(
    drawableSize / envelope.width,
    drawableSize / envelope.height
  );
  const scale = requestedScale === null ? fitScale : Math.min(requestedScale, fitScale);
  const contentWidth = envelope.width * scale;
  const contentHeight = envelope.height * scale;
  const targetAnchor = Object.freeze({
    x: (frameSize - contentWidth) / 2 - envelope.minX * scale,
    y: (frameSize - contentHeight) / 2 - envelope.minY * scale
  });
  const drawX = Math.max(margin, Math.floor(targetAnchor.x + envelope.minX * scale));
  const drawY = Math.max(margin, Math.floor(targetAnchor.y + envelope.minY * scale));
  const drawMaxX = Math.min(
    frameSize - margin,
    Math.ceil(targetAnchor.x + envelope.maxX * scale)
  );
  const drawMaxY = Math.min(
    frameSize - margin,
    Math.ceil(targetAnchor.y + envelope.maxY * scale)
  );
  const draw = Object.freeze({
    x: drawX,
    y: drawY,
    width: drawMaxX - drawX,
    height: drawMaxY - drawY
  });
  const sourceBounds = Object.freeze({
    minX: sourceAnchor.x + (draw.x - targetAnchor.x) / scale,
    minY: sourceAnchor.y + (draw.y - targetAnchor.y) / scale,
    width: draw.width / scale,
    height: draw.height / scale
  });
  return Object.freeze({
    scale,
    fitScale,
    targetAnchor,
    draw,
    sourceBounds,
    envelope: Object.freeze(envelope)
  });
}

export function anchorRelativeEnvelope(boundsByHeading, sourceAnchor) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const bounds of boundsByHeading) {
    validateBounds(bounds);
    minX = Math.min(minX, bounds.minX - sourceAnchor.x);
    minY = Math.min(minY, bounds.minY - sourceAnchor.y);
    maxX = Math.max(maxX, bounds.minX + bounds.width - sourceAnchor.x);
    maxY = Math.max(maxY, bounds.minY + bounds.height - sourceAnchor.y);
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}

export function registeredSourcePoint(registration, sourcePoint) {
  if (!registration?.sourceBounds || !Number.isFinite(registration.scale)) {
    throw new Error("Ship sprite point projection requires a frame registration");
  }
  if (!Number.isFinite(sourcePoint?.x) || !Number.isFinite(sourcePoint?.y)) {
    throw new Error("Ship sprite point projection requires a finite source point");
  }
  return {
    x: registration.draw.x +
      (sourcePoint.x - registration.sourceBounds.minX) * registration.scale,
    y: registration.draw.y +
      (sourcePoint.y - registration.sourceBounds.minY) * registration.scale
  };
}

function validateRegistrationInputs(boundsByHeading, sourceAnchor, frameSize, requestedScale, margin) {
  if (!Array.isArray(boundsByHeading) || boundsByHeading.length === 0) {
    throw new Error("Ship sprite registration requires heading bounds");
  }
  if (!Number.isFinite(sourceAnchor?.x) || !Number.isFinite(sourceAnchor?.y)) {
    throw new Error("Ship sprite registration requires a finite source anchor");
  }
  if (!Number.isInteger(frameSize) || frameSize <= 0) {
    throw new Error(`Ship sprite registration has invalid frame size: ${frameSize}`);
  }
  if (!Number.isInteger(margin) || margin < 0 || margin * 2 >= frameSize) {
    throw new Error(`Ship sprite registration has invalid margin: ${margin}`);
  }
  if (requestedScale !== null && (!Number.isFinite(requestedScale) || requestedScale <= 0)) {
    throw new Error(`Ship sprite registration has invalid requested scale: ${requestedScale}`);
  }
}

function validateBounds(bounds) {
  if (
    !Number.isFinite(bounds?.minX) || !Number.isFinite(bounds?.minY) ||
    !Number.isFinite(bounds?.width) || !Number.isFinite(bounds?.height) ||
    bounds.width <= 0 || bounds.height <= 0
  ) {
    throw new Error("Ship sprite registration received invalid heading bounds");
  }
}
