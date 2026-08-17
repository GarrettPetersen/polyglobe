export function createSurfaceDetailLayerBounds({
  viewport,
  screenWidth,
  screenHeight,
  layerMargin,
  tileMargin
}) {
  validateViewport(viewport);
  validatePositiveFinite(screenWidth, "surface detail screen width");
  validatePositiveFinite(screenHeight, "surface detail screen height");
  validateNonNegativeFinite(layerMargin, "surface detail layer margin");
  validateNonNegativeFinite(tileMargin, "surface detail tile margin");

  const padding = layerMargin + tileMargin;
  return Object.freeze({
    x: Math.floor(viewport.minX - padding),
    y: Math.floor(viewport.minY - padding),
    width: Math.ceil(screenWidth + padding * 2),
    height: Math.ceil(screenHeight + padding * 2)
  });
}

export function surfaceDetailLayerCoversViewport(layer, viewport, tileMargin) {
  validateLayerBounds(layer);
  validateViewport(viewport);
  validateNonNegativeFinite(tileMargin, "surface detail tile margin");
  return (
    viewport.minX - tileMargin >= layer.x &&
    viewport.minY - tileMargin >= layer.y &&
    viewport.maxX + tileMargin <= layer.x + layer.width &&
    viewport.maxY + tileMargin <= layer.y + layer.height
  );
}

export function surfaceDetailCallsForLayer({
  tileCalls,
  riverConnectorCalls,
  layer,
  margin,
  tileCallFilter = null
}) {
  if (!Array.isArray(tileCalls)) throw new Error("Surface detail tile calls must be an array");
  if (!Array.isArray(riverConnectorCalls)) {
    throw new Error("Surface detail river connector calls must be an array");
  }
  validateLayerBounds(layer);
  validateNonNegativeFinite(margin, "surface detail call margin");
  if (tileCallFilter !== null && typeof tileCallFilter !== "function") {
    throw new Error("Surface detail tile filter must be a function");
  }

  const bounds = {
    minX: layer.x,
    minY: layer.y,
    maxX: layer.x + layer.width,
    maxY: layer.y + layer.height
  };
  return {
    tileCalls: tileCalls.filter((call) => (
      (tileCallFilter === null || tileCallFilter(call)) &&
      pointNearBounds(call.drawSurfaceX, call.drawSurfaceY, bounds, margin)
    )),
    riverConnectorCalls: riverConnectorCalls.filter((call) => segmentNearBounds(
      call.ax,
      call.ay,
      call.bx,
      call.by,
      bounds,
      margin
    ))
  };
}

export function surfaceDetailCallsHaveSameGeometry(left, right) {
  validateSurfaceDetailCallSet(left, "cached");
  validateSurfaceDetailCallSet(right, "current");
  if (left.riverGeometryKey !== right.riverGeometryKey) return false;
  if (left.tileCalls.length !== right.tileCalls.length ||
      left.riverConnectorCalls.length !== right.riverConnectorCalls.length) {
    return false;
  }
  for (let index = 0; index < left.tileCalls.length; index++) {
    const a = left.tileCalls[index];
    const b = right.tileCalls[index];
    if (a.id !== b.id ||
        a.drawSurfaceX !== b.drawSurfaceX ||
        a.drawSurfaceY !== b.drawSurfaceY ||
        a.level !== b.level ||
        a.row !== b.row) {
      return false;
    }
  }
  for (let index = 0; index < left.riverConnectorCalls.length; index++) {
    const a = left.riverConnectorCalls[index];
    const b = right.riverConnectorCalls[index];
    if (a.a !== b.a || a.b !== b.b ||
        a.ax !== b.ax || a.ay !== b.ay ||
        a.bx !== b.bx || a.by !== b.by ||
        a.aMouth !== b.aMouth || a.bMouth !== b.bMouth ||
        a.aWater !== b.aWater || a.bWater !== b.bWater) {
      return false;
    }
  }
  return true;
}

function pointNearBounds(x, y, bounds, margin) {
  return (
    x >= bounds.minX - margin &&
    x <= bounds.maxX + margin &&
    y >= bounds.minY - margin &&
    y <= bounds.maxY + margin
  );
}

function segmentNearBounds(ax, ay, bx, by, bounds, margin) {
  const minX = Math.min(ax, bx);
  const maxX = Math.max(ax, bx);
  const minY = Math.min(ay, by);
  const maxY = Math.max(ay, by);
  return (
    maxX >= bounds.minX - margin &&
    minX <= bounds.maxX + margin &&
    maxY >= bounds.minY - margin &&
    minY <= bounds.maxY + margin
  );
}

function validateSurfaceDetailCallSet(value, label) {
  if (!value || !Array.isArray(value.tileCalls) || !Array.isArray(value.riverConnectorCalls)) {
    throw new Error(`${label} surface detail geometry requires tile and river connector calls`);
  }
}

function validateViewport(viewport) {
  if (
    !viewport ||
    !Number.isFinite(viewport.minX) ||
    !Number.isFinite(viewport.minY) ||
    !Number.isFinite(viewport.maxX) ||
    !Number.isFinite(viewport.maxY) ||
    viewport.maxX < viewport.minX ||
    viewport.maxY < viewport.minY
  ) {
    throw new Error("Surface detail viewport is invalid");
  }
}

function validateLayerBounds(layer) {
  if (
    !layer ||
    !Number.isFinite(layer.x) ||
    !Number.isFinite(layer.y) ||
    !Number.isFinite(layer.width) ||
    !Number.isFinite(layer.height) ||
    layer.width <= 0 ||
    layer.height <= 0
  ) {
    throw new Error("Surface detail layer bounds are invalid");
  }
}

function validatePositiveFinite(value, label) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} must be positive`);
}

function validateNonNegativeFinite(value, label) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} cannot be negative`);
}
