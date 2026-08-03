export function shipWakeAnchorMaxOffset(frameSize) {
  if (!Number.isInteger(frameSize) || frameSize <= 0) {
    throw new Error(`Invalid ship wake frame size: ${frameSize}`);
  }
  return Math.floor(frameSize / 2) + 2;
}

export function validateShipWakeAnchors(slug, anchors, headings, frameSize) {
  if (typeof slug !== "string" || slug.length === 0) {
    throw new Error("Ship wake anchors require a ship slug");
  }
  if (!Number.isInteger(headings) || headings <= 0) {
    throw new Error(`Invalid ship wake heading count: ${headings}`);
  }
  if (!Array.isArray(anchors) || anchors.length !== headings) {
    throw new Error(`Ship ${slug} must have ${headings} wake anchor frames`);
  }
  return anchors.map((anchor, frame) => {
    if (!anchor || typeof anchor !== "object") {
      throw new Error(`Ship ${slug} has an invalid wake anchor at frame ${frame}`);
    }
    return {
      stern: validateShipWakePoint(slug, frame, "stern", anchor.stern, frameSize),
      positiveShoulder: validateShipWakePoint(
        slug,
        frame,
        "positive shoulder",
        anchor.positiveShoulder,
        frameSize
      ),
      negativeShoulder: validateShipWakePoint(
        slug,
        frame,
        "negative shoulder",
        anchor.negativeShoulder,
        frameSize
      )
    };
  });
}

export function alignHorizontalShipWakeShoulders(anchors, direction, frameSize) {
  validateWakeAlignmentInput(anchors, direction);
  if (Math.abs(direction.y) > 1e-6) return anchors;
  const limit = shipWakeAnchorMaxOffset(frameSize);
  const shoulderCenterY = (anchors.positiveShoulder.y + anchors.negativeShoulder.y) / 2;
  const desiredOffset = Math.round(anchors.stern.y - shoulderCenterY);
  const minimumOffset = -limit - Math.min(
    anchors.positiveShoulder.y,
    anchors.negativeShoulder.y
  );
  const maximumOffset = limit - Math.max(
    anchors.positiveShoulder.y,
    anchors.negativeShoulder.y
  );
  const yOffset = Math.max(minimumOffset, Math.min(maximumOffset, desiredOffset));
  return {
    stern: anchors.stern,
    positiveShoulder: {
      x: anchors.positiveShoulder.x,
      y: anchors.positiveShoulder.y + yOffset
    },
    negativeShoulder: {
      x: anchors.negativeShoulder.x,
      y: anchors.negativeShoulder.y + yOffset
    }
  };
}

function validateShipWakePoint(slug, frame, label, point, frameSize) {
  if (!point || !Number.isInteger(point.x) || !Number.isInteger(point.y)) {
    throw new Error(`Ship ${slug} frame ${frame} has an invalid ${label} wake point`);
  }
  const maxOffset = shipWakeAnchorMaxOffset(frameSize);
  if (Math.abs(point.x) > maxOffset || Math.abs(point.y) > maxOffset) {
    throw new Error(
      `Ship ${slug} frame ${frame} ${label} wake point is outside the sprite: ${point.x},${point.y}`
    );
  }
  return { x: point.x, y: point.y };
}

function validateWakeAlignmentInput(anchors, direction) {
  for (const key of ["stern", "positiveShoulder", "negativeShoulder"]) {
    if (!Number.isFinite(anchors?.[key]?.x) || !Number.isFinite(anchors?.[key]?.y)) {
      throw new Error(`Horizontal ship wake alignment requires a finite ${key} point`);
    }
  }
  if (!Number.isFinite(direction?.x) || !Number.isFinite(direction?.y)) {
    throw new Error("Horizontal ship wake alignment requires a finite direction");
  }
}
