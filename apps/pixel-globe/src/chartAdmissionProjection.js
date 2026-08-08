import { cross3, dot3, normalize3 } from "./geodesic.js";

const WORLD_NORTH = [0, 1, 0];
const MIN_STABLE_NORTH_PROJECTION = 1e-6;

export function predictiveAdmissionProjection({
  projectedTiles,
  directionForTile,
  camera,
  viewportWidth,
  viewportHeight,
  tileVisualRadius,
  pixelsPerRadian,
  maximumLookaheadPx
}) {
  if (!Array.isArray(projectedTiles)) {
    throw new Error("Predictive chart admission requires projected tiles");
  }
  if (typeof directionForTile !== "function") {
    throw new Error("Predictive chart admission requires tile directions");
  }
  assertCamera(camera);
  for (const [label, value] of Object.entries({
    viewportWidth,
    viewportHeight,
    tileVisualRadius,
    pixelsPerRadian,
    maximumLookaheadPx
  })) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Predictive chart admission ${label} must be non-negative: ${value}`);
    }
  }
  if (viewportWidth === 0 || viewportHeight === 0 || pixelsPerRadian === 0) {
    throw new Error("Predictive chart admission requires a non-empty projection");
  }

  const centerX = viewportWidth / 2;
  const centerY = viewportHeight / 2;
  return new Map(projectedTiles.map((tile) => {
    assertProjectedTile(tile);
    const outsideX = distanceOutsideAxis(tile.x, -tileVisualRadius, viewportWidth + tileVisualRadius);
    const outsideY = distanceOutsideAxis(tile.y, -tileVisualRadius, viewportHeight + tileVisualRadius);
    const outsideDistance = Math.hypot(outsideX, outsideY);
    const lookaheadPx = Math.min(outsideDistance, maximumLookaheadPx);
    if (lookaheadPx < 1e-6) return [tile.id, tile];

    const screenDx = tile.x - centerX;
    const screenDy = tile.y - centerY;
    const screenDistance = Math.hypot(screenDx, screenDy);
    if (screenDistance < 1e-6) return [tile.id, tile];
    const travelDirection = normalize3([
      camera.right[0] * screenDx - camera.up[0] * screenDy,
      camera.right[1] * screenDx - camera.up[1] * screenDy,
      camera.right[2] * screenDx - camera.up[2] * screenDy
    ]);
    const travelAngle = lookaheadPx / pixelsPerRadian;
    const futureCenter = normalize3([
      camera.center[0] * Math.cos(travelAngle) + travelDirection[0] * Math.sin(travelAngle),
      camera.center[1] * Math.cos(travelAngle) + travelDirection[1] * Math.sin(travelAngle),
      camera.center[2] * Math.cos(travelAngle) + travelDirection[2] * Math.sin(travelAngle)
    ]);
    const futureCamera = northUpCamera(futureCenter, camera.right);
    const futureCenterInCurrentFrame = projectDirection(
      futureCenter,
      camera,
      viewportWidth,
      viewportHeight,
      pixelsPerRadian
    );
    const tileInFutureFrame = projectDirection(
      directionForTile(tile.id),
      futureCamera,
      viewportWidth,
      viewportHeight,
      pixelsPerRadian
    );
    if (!futureCenterInCurrentFrame || !tileInFutureFrame) return [tile.id, tile];
    return [tile.id, {
      id: tile.id,
      x: Math.round(futureCenterInCurrentFrame.x + tileInFutureFrame.x - centerX),
      y: Math.round(futureCenterInCurrentFrame.y + tileInFutureFrame.y - centerY)
    }];
  }));
}

function distanceOutsideAxis(value, minimum, maximum) {
  if (value < minimum) return minimum - value;
  if (value > maximum) return value - maximum;
  return 0;
}

function northUpCamera(center, fallbackRight) {
  let up = projectToTangent(WORLD_NORTH, center);
  if (length3(up) > MIN_STABLE_NORTH_PROJECTION) {
    up = normalize3(up);
    return { center, right: normalize3(cross3(up, center)), up };
  }
  let right = projectToTangent(fallbackRight, center);
  if (length3(right) <= MIN_STABLE_NORTH_PROJECTION) {
    right = projectToTangent([1, 0, 0], center);
  }
  if (length3(right) <= MIN_STABLE_NORTH_PROJECTION) {
    right = projectToTangent([0, 0, 1], center);
  }
  right = normalize3(right);
  return { center, right, up: normalize3(cross3(center, right)) };
}

function projectDirection(direction, camera, viewportWidth, viewportHeight, pixelsPerRadian) {
  const depth = dot3(direction, camera.center);
  if (depth <= 0.2) return null;
  const tangentX = dot3(direction, camera.right);
  const tangentY = dot3(direction, camera.up);
  const sinTheta = Math.sqrt(Math.max(0, 1 - depth * depth));
  const scale = sinTheta > 1e-6
    ? Math.acos(Math.max(-1, Math.min(1, depth))) / sinTheta
    : 1;
  return {
    x: viewportWidth / 2 + tangentX * scale * pixelsPerRadian,
    y: viewportHeight / 2 - tangentY * scale * pixelsPerRadian
  };
}

function projectToTangent(vector, normal) {
  const projection = dot3(vector, normal);
  return [
    vector[0] - normal[0] * projection,
    vector[1] - normal[1] * projection,
    vector[2] - normal[2] * projection
  ];
}

function length3(vector) {
  return Math.hypot(vector[0], vector[1], vector[2]);
}

function assertCamera(camera) {
  for (const field of ["center", "right", "up"]) {
    if (!Array.isArray(camera?.[field]) || camera[field].length !== 3 ||
        camera[field].some((value) => !Number.isFinite(value))) {
      throw new Error(`Predictive chart admission requires a finite camera ${field}`);
    }
  }
}

function assertProjectedTile(tile) {
  if (!Number.isInteger(tile?.id) || !Number.isFinite(tile.x) || !Number.isFinite(tile.y)) {
    throw new Error("Predictive chart admission requires finite projected tiles");
  }
}
