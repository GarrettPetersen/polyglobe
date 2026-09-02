const BOMBARDMENT_SMOKE_COLORS = Object.freeze([
  "#2e222f",
  "#3e3546",
  "#625565"
]);

export const CITY_BOMBARDMENT_SMOKE_FRAME_MS = 100;
const BOMBARDMENT_EFFECT_OVERFLOW_PX = 120;

export function cityBombardmentEffectIntersectsViewport({
  destination,
  viewportWidth,
  viewportHeight
}) {
  if (
    !destination ||
    !Number.isFinite(destination.x) ||
    !Number.isFinite(destination.y) ||
    !Number.isFinite(destination.width) ||
    destination.width <= 0 ||
    !Number.isFinite(destination.height) ||
    destination.height <= 0 ||
    !Number.isInteger(viewportWidth) ||
    viewportWidth <= 0 ||
    !Number.isInteger(viewportHeight) ||
    viewportHeight <= 0
  ) {
    throw new Error("Invalid city bombardment effect viewport");
  }
  return destination.x < viewportWidth + BOMBARDMENT_EFFECT_OVERFLOW_PX &&
    destination.x + destination.width > -BOMBARDMENT_EFFECT_OVERFLOW_PX &&
    destination.y < viewportHeight + BOMBARDMENT_EFFECT_OVERFLOW_PX &&
    destination.y + destination.height > -BOMBARDMENT_EFFECT_OVERFLOW_PX;
}

export function cityBombardmentEffectGeometry({
  damage,
  sourceWidth,
  sourceHeight,
  destination,
  seed
}) {
  validateEffectInput({ damage, sourceWidth, sourceHeight, destination, seed });
  const bounds = damage.holeBounds;
  const sourceFireScale = clamp(
    Math.max(bounds.width / 13, bounds.height / 15),
    0.55,
    1.4
  );
  const breachWidth = FIRE_FRAME_WIDTH * sourceFireScale;
  const breachHeight = FIRE_FRAME_HEIGHT * sourceFireScale;
  const breachBottom = bounds.y + bounds.height + Math.max(1, Math.round(bounds.height * 0.2));
  const breachX = bounds.x + bounds.width / 2 - breachWidth / 2;
  const breachY = breachBottom - breachHeight;
  const exteriorScale = sourceFireScale * 0.72;
  const exteriorWidth = FIRE_FRAME_WIDTH * exteriorScale;
  const exteriorHeight = FIRE_FRAME_HEIGHT * exteriorScale;
  const exteriorBottom = bounds.y + Math.max(
    1,
    Math.round(bounds.height * (damage.edge === "top" ? 0.32 : 0.48))
  );
  const horizontalJitter = ((seed >>> 7) % 5) - 2;
  const exteriorX = bounds.x + bounds.width / 2 - exteriorWidth / 2 + horizontalJitter;
  const exteriorY = exteriorBottom - exteriorHeight;
  const breachFlame = scaledRect({
    x: breachX,
    y: breachY,
    width: breachWidth,
    height: breachHeight
  }, sourceWidth, sourceHeight, destination);
  const exteriorFlame = scaledRect({
    x: exteriorX,
    y: exteriorY,
    width: exteriorWidth,
    height: exteriorHeight
  }, sourceWidth, sourceHeight, destination);
  const spriteScale = Math.sqrt(
    destination.width / sourceWidth * destination.height / sourceHeight
  );
  const smokeScale = clamp(spriteScale, 0.3, 1.5);
  const smokeEmitter = Object.freeze({
    id: `bombardment-fire|${seed}`,
    layerName: "Bombardment fire",
    x: exteriorFlame.x + Math.floor(exteriorFlame.width / 2),
    y: exteriorFlame.y + Math.max(1, Math.round(exteriorFlame.height * 0.24)),
    emissionIntervalMs: Math.round(clamp(92 / smokeScale, 70, 280)),
    lifetimeMs: Math.round(clamp(4700 * Math.sqrt(smokeScale), 2800, 5600)),
    rise: Math.round(clamp(70 * smokeScale, 18, 100)),
    drift: Math.round(clamp(26 * smokeScale, 7, 38)),
    spread: Math.round(clamp(9 * smokeScale, 3, 14)),
    maximumSize: Math.round(clamp(4 * smokeScale, 1, 6)),
    opacity: clamp(0.86 * Math.sqrt(smokeScale), 0.56, 0.9),
    colors: BOMBARDMENT_SMOKE_COLORS
  });
  return Object.freeze({ breachFlame, exteriorFlame, smokeEmitter });
}

function scaledRect(rect, sourceWidth, sourceHeight, destination) {
  return Object.freeze({
    x: Math.round(destination.x + rect.x / sourceWidth * destination.width),
    y: Math.round(destination.y + rect.y / sourceHeight * destination.height),
    width: Math.max(1, Math.round(rect.width / sourceWidth * destination.width)),
    height: Math.max(1, Math.round(rect.height / sourceHeight * destination.height))
  });
}

function validateEffectInput({ damage, sourceWidth, sourceHeight, destination, seed }) {
  if (
    !damage?.holeBounds ||
    !["left", "top"].includes(damage.edge) ||
    !Number.isInteger(sourceWidth) ||
    sourceWidth <= 0 ||
    !Number.isInteger(sourceHeight) ||
    sourceHeight <= 0 ||
    !Number.isInteger(seed)
  ) {
    throw new Error("Invalid city bombardment effect source");
  }
  const bounds = damage.holeBounds;
  if (
    !Number.isInteger(bounds.x) ||
    !Number.isInteger(bounds.y) ||
    !Number.isInteger(bounds.width) ||
    bounds.width <= 0 ||
    !Number.isInteger(bounds.height) ||
    bounds.height <= 0 ||
    bounds.x < 0 ||
    bounds.y < 0 ||
    bounds.x + bounds.width > sourceWidth ||
    bounds.y + bounds.height > sourceHeight
  ) {
    throw new Error("Invalid city bombardment opening bounds");
  }
  if (
    !destination ||
    !Number.isFinite(destination.x) ||
    !Number.isFinite(destination.y) ||
    !Number.isFinite(destination.width) ||
    destination.width <= 0 ||
    !Number.isFinite(destination.height) ||
    destination.height <= 0
  ) {
    throw new Error("Invalid city bombardment effect destination");
  }
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}
import {
  FIRE_FRAME_HEIGHT,
  FIRE_FRAME_WIDTH
} from "../src/fireEffects.js";
