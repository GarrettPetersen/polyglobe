export const CITY_DESTINATION_LABEL_MARGIN_PX = 4;
export const CITY_DESTINATION_LABEL_TOP_PX = 34;
export const CITY_DESTINATION_LABEL_BOTTOM_PX = 4;
export const CITY_DESTINATION_LABEL_GAP_PX = 2;
export const CITY_DESTINATION_LABEL_ANCHOR_GAP_PX = 5;

export function layoutCityDestinationLabels({ entries, viewportWidth, viewportHeight }) {
  requireViewport(viewportWidth, viewportHeight);
  if (!Array.isArray(entries)) throw new Error("City destination label layout requires entries");
  const seenIds = new Set();
  const prepared = entries.map((entry) => {
    validateEntry(entry, viewportWidth, viewportHeight);
    if (seenIds.has(entry.id)) throw new Error(`Duplicate city destination label: ${entry.id}`);
    seenIds.add(entry.id);
    const maximumX = viewportWidth - CITY_DESTINATION_LABEL_MARGIN_PX - entry.width;
    const maximumY = viewportHeight - CITY_DESTINATION_LABEL_BOTTOM_PX - entry.height;
    const anchorVisible = pointIsInsideViewport(entry.anchor, viewportWidth, viewportHeight);
    const desiredX = entry.anchor.x < 0
      ? CITY_DESTINATION_LABEL_MARGIN_PX
      : entry.anchor.x >= viewportWidth
        ? maximumX
        : entry.preferredSide === "left"
          ? entry.anchor.x - entry.width - CITY_DESTINATION_LABEL_ANCHOR_GAP_PX
          : entry.preferredSide === "right"
            ? entry.anchor.x + CITY_DESTINATION_LABEL_ANCHOR_GAP_PX
            : entry.anchor.x - entry.width / 2;
    const desiredY = anchorVisible && entry.preferredSide === "above"
      ? entry.anchor.y - entry.height - CITY_DESTINATION_LABEL_ANCHOR_GAP_PX
      : entry.anchor.y - entry.height / 2;
    return {
      ...entry,
      anchorVisible,
      desiredX: clamp(Math.round(desiredX), CITY_DESTINATION_LABEL_MARGIN_PX, maximumX),
      desiredY: clamp(
        Math.round(desiredY),
        CITY_DESTINATION_LABEL_TOP_PX,
        maximumY
      )
    };
  });

  const placed = [];
  for (const entry of prepared) {
    const maximumY = viewportHeight - CITY_DESTINATION_LABEL_BOTTOM_PX - entry.height;
    const y = nearestFreeY(entry, placed, maximumY);
    placed.push(Object.freeze({
      id: entry.id,
      label: entry.label,
      font: entry.font,
      textWidth: entry.textWidth,
      anchor: Object.freeze({ x: entry.anchor.x, y: entry.anchor.y }),
      anchorVisible: entry.anchorVisible,
      x: entry.desiredX,
      y,
      width: entry.width,
      height: entry.height
    }));
  }
  return Object.freeze(placed);
}

export function cityDestinationLabelContainsPoint(label, x, y) {
  validatePlacedLabel(label);
  if (![x, y].every(Number.isFinite)) {
    throw new Error("City destination label hit test requires finite coordinates");
  }
  return x >= label.x && x < label.x + label.width &&
    y >= label.y && y < label.y + label.height;
}

export function cityDestinationLeader(label, viewportWidth, viewportHeight) {
  validatePlacedLabel(label);
  requireViewport(viewportWidth, viewportHeight);
  const target = Object.freeze({
    x: clamp(Math.round(label.anchor.x), 1, viewportWidth - 2),
    y: clamp(Math.round(label.anchor.y), 1, viewportHeight - 2)
  });
  const rect = {
    left: label.x,
    right: label.x + label.width - 1,
    top: label.y,
    bottom: label.y + label.height - 1
  };
  const candidates = [
    { side: "left", x: rect.left, y: clamp(target.y, rect.top, rect.bottom) },
    { side: "right", x: rect.right, y: clamp(target.y, rect.top, rect.bottom) },
    { side: "top", x: clamp(target.x, rect.left, rect.right), y: rect.top },
    { side: "bottom", x: clamp(target.x, rect.left, rect.right), y: rect.bottom }
  ];
  const start = candidates.reduce((best, candidate) => (
    manhattanDistance(candidate, target) < manhattanDistance(best, target) ? candidate : best
  ));
  const bend = start.side === "left" || start.side === "right"
    ? Object.freeze({ x: target.x, y: start.y })
    : Object.freeze({ x: start.x, y: target.y });
  const segments = [];
  if (start.x !== bend.x || start.y !== bend.y) {
    segments.push(pixelSegment(start, bend));
  }
  if (bend.x !== target.x || bend.y !== target.y) {
    segments.push(pixelSegment(bend, target));
  }
  return Object.freeze({
    target,
    direction: offscreenDirection(label.anchor, viewportWidth, viewportHeight),
    segments: Object.freeze(segments)
  });
}

function nearestFreeY(entry, placed, maximumY) {
  const minimumY = CITY_DESTINATION_LABEL_TOP_PX;
  const maximumOffset = Math.max(
    entry.desiredY - minimumY,
    maximumY - entry.desiredY
  );
  for (let offset = 0; offset <= maximumOffset; offset++) {
    for (const direction of offset === 0 ? [0] : [-1, 1]) {
      const candidateY = entry.desiredY + offset * direction;
      if (candidateY < minimumY || candidateY > maximumY) continue;
      const candidate = {
        x: entry.desiredX,
        y: candidateY,
        width: entry.width,
        height: entry.height
      };
      if (!placed.some((other) => rectanglesOverlapWithGap(
        candidate,
        other,
        CITY_DESTINATION_LABEL_GAP_PX
      ))) return candidateY;
    }
  }
  throw new Error(
    `City destination labels cannot fit without overlap: ${entry.id} in ${maximumY - minimumY}px`
  );
}

function rectanglesOverlapWithGap(left, right, gap) {
  return left.x < right.x + right.width + gap &&
    left.x + left.width + gap > right.x &&
    left.y < right.y + right.height + gap &&
    left.y + left.height + gap > right.y;
}

function pixelSegment(start, end) {
  if (start.x !== end.x && start.y !== end.y) {
    throw new Error("City destination leader segments must be orthogonal");
  }
  return Object.freeze({ x1: start.x, y1: start.y, x2: end.x, y2: end.y });
}

function offscreenDirection(anchor, width, height) {
  if (anchor.x < 0) return "left";
  if (anchor.x >= width) return "right";
  if (anchor.y < 0) return "up";
  if (anchor.y >= height) return "down";
  return null;
}

function pointIsInsideViewport(point, width, height) {
  return point.x >= 0 && point.x < width && point.y >= 0 && point.y < height;
}

function validateEntry(entry, viewportWidth, viewportHeight) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new Error("City destination label entry must be an object");
  }
  if (typeof entry.id !== "string" || entry.id.length === 0) {
    throw new Error("City destination label requires a canonical destination ID");
  }
  if (typeof entry.label !== "string" || entry.label.length === 0) {
    throw new Error(`City destination label has no text: ${entry.id}`);
  }
  if (typeof entry.font !== "string" || entry.font.length === 0) {
    throw new Error(`City destination label has no font: ${entry.id}`);
  }
  for (const [label, value] of [
    ["text width", entry.textWidth],
    ["width", entry.width],
    ["height", entry.height]
  ]) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`City destination label has invalid ${label}: ${entry.id}`);
    }
  }
  if (!entry.anchor || ![entry.anchor.x, entry.anchor.y].every(Number.isFinite)) {
    throw new Error(`City destination label has invalid anchor: ${entry.id}`);
  }
  if (!["above", "left", "right"].includes(entry.preferredSide)) {
    throw new Error(`City destination label has invalid preferred side: ${entry.id}`);
  }
  const availableWidth = viewportWidth - CITY_DESTINATION_LABEL_MARGIN_PX * 2;
  const availableHeight = viewportHeight -
    CITY_DESTINATION_LABEL_TOP_PX - CITY_DESTINATION_LABEL_BOTTOM_PX;
  if (entry.width > availableWidth || entry.height > availableHeight) {
    throw new Error(`City destination label exceeds the viewport: ${entry.id}`);
  }
}

function validatePlacedLabel(label) {
  if (!label || typeof label !== "object" || Array.isArray(label) ||
      typeof label.id !== "string" || label.id.length === 0 ||
      ![label.x, label.y, label.width, label.height].every(Number.isInteger) ||
      label.width <= 0 || label.height <= 0 ||
      !label.anchor || ![label.anchor.x, label.anchor.y].every(Number.isFinite)) {
    throw new Error("Invalid placed city destination label");
  }
}

function requireViewport(width, height) {
  if (!Number.isInteger(width) || width <= CITY_DESTINATION_LABEL_MARGIN_PX * 2 ||
      !Number.isInteger(height) ||
      height <= CITY_DESTINATION_LABEL_TOP_PX + CITY_DESTINATION_LABEL_BOTTOM_PX) {
    throw new Error(`Invalid city destination label viewport: ${width}x${height}`);
  }
}

function manhattanDistance(left, right) {
  return Math.abs(left.x - right.x) + Math.abs(left.y - right.y);
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}
