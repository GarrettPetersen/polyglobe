const DEFAULT_WIDTH = 455;
const DEFAULT_HEIGHT = 256;

export function responsiveLogicalViewport({
  viewportWidth,
  viewportHeight,
  maximumDimension = DEFAULT_WIDTH,
  minimumDimension = DEFAULT_HEIGHT,
  targetArea = DEFAULT_WIDTH * DEFAULT_HEIGHT
}) {
  for (const [label, value] of Object.entries({
    viewportWidth,
    viewportHeight,
    maximumDimension,
    minimumDimension,
    targetArea
  })) {
    if (!Number.isFinite(value) || value <= 0) throw new Error(`Invalid ${label}: ${value}`);
  }
  if (minimumDimension > maximumDimension) {
    throw new Error("minimumDimension cannot exceed maximumDimension");
  }

  const aspect = viewportWidth / viewportHeight;
  let width = Math.sqrt(targetArea * aspect);
  let height = targetArea / width;

  if (width > maximumDimension) {
    width = maximumDimension;
    height = Math.max(minimumDimension, targetArea / width);
  } else if (height > maximumDimension) {
    height = maximumDimension;
    width = Math.max(minimumDimension, targetArea / height);
  }

  width = clamp(Math.round(width), minimumDimension, maximumDimension);
  height = clamp(Math.round(height), minimumDimension, maximumDimension);
  return { width, height };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
