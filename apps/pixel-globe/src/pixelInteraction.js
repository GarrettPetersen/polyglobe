function requireFinitePoint(point, label) {
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) {
    throw new Error(`${label} requires a finite point`);
  }
}

function requirePositiveRect(rect, label) {
  if (!rect || !Number.isFinite(rect.x) || !Number.isFinite(rect.y) ||
      !Number.isFinite(rect.w) || rect.w <= 0 ||
      !Number.isFinite(rect.h) || rect.h <= 0) {
    throw new Error(`${label} requires a positive rectangle`);
  }
}

export function pointHitsOpaqueSpritePixel({
  point,
  mask,
  sourceRect,
  destinationRect,
  flipX = false
}) {
  requireFinitePoint(point, "Pixel sprite hit test");
  requirePositiveRect(sourceRect, "Pixel sprite source");
  requirePositiveRect(destinationRect, "Pixel sprite destination");
  if (!Number.isInteger(mask?.width) || mask.width <= 0 ||
      !Number.isInteger(mask?.height) || mask.height <= 0 ||
      !mask.alpha || mask.alpha.length !== mask.width * mask.height) {
    throw new Error("Pixel sprite hit test requires a valid alpha mask");
  }
  if (!Number.isInteger(sourceRect.x) || !Number.isInteger(sourceRect.y) ||
      !Number.isInteger(sourceRect.w) || !Number.isInteger(sourceRect.h) ||
      sourceRect.x < 0 || sourceRect.y < 0 ||
      sourceRect.x + sourceRect.w > mask.width ||
      sourceRect.y + sourceRect.h > mask.height) {
    throw new Error("Pixel sprite source lies outside its alpha mask");
  }
  if (point.x < destinationRect.x || point.x >= destinationRect.x + destinationRect.w ||
      point.y < destinationRect.y || point.y >= destinationRect.y + destinationRect.h) {
    return false;
  }

  let sourceX = Math.floor((point.x - destinationRect.x) / destinationRect.w * sourceRect.w);
  const sourceY = Math.floor((point.y - destinationRect.y) / destinationRect.h * sourceRect.h);
  if (flipX) sourceX = sourceRect.w - sourceX - 1;
  const maskX = sourceRect.x + sourceX;
  const maskY = sourceRect.y + sourceY;
  return mask.alpha[maskY * mask.width + maskX] > 0;
}

export function selectPixelInteractionCandidate(candidates) {
  if (!Array.isArray(candidates)) throw new Error("Pixel interaction selection requires candidates");
  let best = null;
  for (const candidate of candidates) {
    validateCandidate(candidate);
    if (!best || compareCandidates(candidate, best) < 0) best = candidate;
  }
  return best;
}

function compareCandidates(a, b) {
  if (a.exact !== b.exact) return a.exact ? -1 : 1;
  if (a.exact && a.visualPriority !== b.visualPriority) {
    return b.visualPriority - a.visualPriority;
  }
  if (a.distanceSquared !== b.distanceSquared) return a.distanceSquared - b.distanceSquared;
  if (a.visualPriority !== b.visualPriority) return b.visualPriority - a.visualPriority;
  return a.order - b.order;
}

function validateCandidate(candidate) {
  if (!candidate?.target || typeof candidate.exact !== "boolean" ||
      !Number.isFinite(candidate.visualPriority) ||
      !Number.isFinite(candidate.distanceSquared) || candidate.distanceSquared < 0 ||
      !Number.isInteger(candidate.order) || candidate.order < 0) {
    throw new Error("Pixel interaction selection received an invalid candidate");
  }
}
