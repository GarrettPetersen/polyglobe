export function canvasDisplayLayout({
  viewportWidth,
  viewportHeight,
  canvasWidth,
  canvasHeight
}) {
  for (const [label, value] of Object.entries({
    viewportWidth,
    viewportHeight,
    canvasWidth,
    canvasHeight
  })) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`Invalid ${label} for canvas display: ${value}`);
    }
  }

  const scale = Math.min(viewportWidth / canvasWidth, viewportHeight / canvasHeight);
  const width = canvasWidth * scale;
  const height = canvasHeight * scale;
  return {
    scale,
    width,
    height,
    left: (viewportWidth - width) / 2,
    top: (viewportHeight - height) / 2
  };
}
