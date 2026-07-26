const DEFAULT_WIDTH = 455;
const DEFAULT_HEIGHT = 256;
const DEFAULT_MAXIMUM_EXTENDED_DIMENSION = 910;

export function resolveBrowserViewportDimensions({
  shellWidth,
  shellHeight,
  windowWidth,
  windowHeight,
  visualViewportWidth,
  visualViewportHeight
}) {
  const width = smallestPositiveDimension(shellWidth, windowWidth, visualViewportWidth);
  const height = smallestPositiveDimension(shellHeight, windowHeight, visualViewportHeight);
  return width == null || height == null ? null : { width, height };
}

export function responsiveLogicalViewport({
  viewportWidth,
  viewportHeight,
  maximumDimension = DEFAULT_WIDTH,
  minimumDimension = DEFAULT_HEIGHT,
  targetArea = DEFAULT_WIDTH * DEFAULT_HEIGHT,
  maximumExtendedDimension = DEFAULT_MAXIMUM_EXTENDED_DIMENSION
}) {
  for (const [label, value] of Object.entries({
    viewportWidth,
    viewportHeight,
    maximumDimension,
    minimumDimension,
    targetArea,
    maximumExtendedDimension
  })) {
    if (!Number.isFinite(value) || value <= 0) throw new Error(`Invalid ${label}: ${value}`);
  }
  if (minimumDimension > maximumDimension) {
    throw new Error("minimumDimension cannot exceed maximumDimension");
  }
  if (maximumExtendedDimension < maximumDimension) {
    throw new Error("maximumExtendedDimension cannot be smaller than maximumDimension");
  }

  const aspect = viewportWidth / viewportHeight;
  let width = Math.sqrt(targetArea * aspect);
  let height = targetArea / width;

  if (width > maximumDimension) {
    height = minimumDimension;
    width = height * aspect;
  } else if (height > maximumDimension) {
    width = minimumDimension;
    height = width / aspect;
  }

  width = clamp(Math.round(width), minimumDimension, maximumExtendedDimension);
  height = clamp(Math.round(height), minimumDimension, maximumExtendedDimension);
  return { width, height };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function smallestPositiveDimension(...values) {
  const usable = values.filter((value) => Number.isFinite(value) && value > 0);
  return usable.length === 0 ? null : Math.min(...usable);
}
