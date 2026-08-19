import { chartRepairCloudMostlyCoversCircle } from "./chartRepairCloudBank.js";
import { chartFogPixelDensity } from "./chartRepairFog.js";

const REPAIR_BLUR_VISIBLE_THRESHOLD = 0.05;
const LABEL_MASK_SAMPLE_SPACING_PX = 12;

export function repairWeatherObscuresScreenRect({
  rect,
  fogFrames = [],
  cloudFrame = null
}) {
  validateScreenRect(rect);
  if (!Array.isArray(fogFrames)) {
    throw new Error("World label repair-weather occlusion requires fog frames");
  }
  if (fogFrames.length === 0 && !cloudFrame) return false;

  for (const point of screenRectSamplePoints(rect)) {
    if (fogFrames.some((frame) => fogBlurIsVisibleAtPoint(frame, point.x, point.y))) {
      return true;
    }
    if (
      cloudFrame &&
      chartRepairCloudMostlyCoversCircle(cloudFrame, point.x, point.y, 0)
    ) {
      return true;
    }
  }
  return false;
}

function fogBlurIsVisibleAtPoint(frame, x, y) {
  if (!frame) return false;
  if (!Number.isFinite(frame.edgeOpacity) || frame.edgeOpacity < 0 || frame.edgeOpacity > 1) {
    throw new Error(`World label fog has invalid edge opacity: ${frame.edgeOpacity}`);
  }
  const blurStrength = Math.min(1, frame.edgeOpacity * 1.25);
  return chartFogPixelDensity(frame, x, y) * blurStrength > REPAIR_BLUR_VISIBLE_THRESHOLD;
}

function screenRectSamplePoints(rect) {
  const columns = Math.max(1, Math.ceil(rect.w / LABEL_MASK_SAMPLE_SPACING_PX));
  const rows = Math.max(1, Math.ceil(rect.h / LABEL_MASK_SAMPLE_SPACING_PX));
  const points = [];
  for (let row = 0; row <= rows; row++) {
    for (let column = 0; column <= columns; column++) {
      points.push(Object.freeze({
        x: rect.x + rect.w * column / columns,
        y: rect.y + rect.h * row / rows
      }));
    }
  }
  return points;
}

function validateScreenRect(rect) {
  if (!rect || typeof rect !== "object") {
    throw new Error("World label repair-weather occlusion requires a rectangle");
  }
  for (const [label, value] of Object.entries(rect)) {
    if (!Number.isFinite(value)) {
      throw new Error(`World label rectangle has invalid ${label}: ${value}`);
    }
  }
  if (rect.w <= 0 || rect.h <= 0) {
    throw new Error(`World label rectangle must be positive: ${rect.w}x${rect.h}`);
  }
}
