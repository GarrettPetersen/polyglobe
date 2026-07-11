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
  const scale = Math.max(1, fitScreen ? maximumScale : Math.floor(maximumScale));
  const width = floorCssPixel(canvasWidth * scale, devicePixelRatio);
  const height = floorCssPixel(canvasHeight * scale, devicePixelRatio);
  return {
    scale,
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
