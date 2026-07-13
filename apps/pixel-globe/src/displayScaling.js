export function canvasDisplayLayout({
  viewportWidth,
  viewportHeight,
  canvasWidth,
  canvasHeight,
  devicePixelRatio = 1,
  fitScreen = false
}) {
  for (const [label, value] of Object.entries({
    viewportWidth,
    viewportHeight,
    canvasWidth,
    canvasHeight,
    devicePixelRatio
  })) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`Invalid ${label} for canvas display: ${value}`);
    }
  }

  const maximumScale = Math.min(viewportWidth / canvasWidth, viewportHeight / canvasHeight);
  const desiredScale = fitScreen || maximumScale < 1
    ? maximumScale
    : Math.max(1, Math.floor(maximumScale));
  const desiredPhysicalScale = desiredScale * devicePixelRatio;
  const physicalScale = desiredPhysicalScale >= 1
    ? Math.max(1, Math.floor(desiredPhysicalScale + 1e-9))
    : null;
  const scale = physicalScale === null ? desiredScale : physicalScale / devicePixelRatio;
  const width = physicalScale === null
    ? floorCssPixel(canvasWidth * scale, devicePixelRatio)
    : canvasWidth * physicalScale / devicePixelRatio;
  const height = physicalScale === null
    ? floorCssPixel(canvasHeight * scale, devicePixelRatio)
    : canvasHeight * physicalScale / devicePixelRatio;
  return {
    scale,
    physicalScale,
    width,
    height,
    left: snapCssPixel((viewportWidth - width) / 2, devicePixelRatio),
    top: snapCssPixel((viewportHeight - height) / 2, devicePixelRatio)
  };
}

function snapCssPixel(value, devicePixelRatio) {
  return Math.round(value * devicePixelRatio) / devicePixelRatio;
}

function floorCssPixel(value, devicePixelRatio) {
  return Math.floor(value * devicePixelRatio) / devicePixelRatio;
}
