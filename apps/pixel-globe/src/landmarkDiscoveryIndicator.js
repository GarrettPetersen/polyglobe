import { createItemAcquisitionEffect } from "./itemAcquisitionEffect.js";

export const LANDMARK_DISCOVERY_ICON_ID = "action:discover";
export const LANDMARK_DISCOVERY_ICON_SIZE = 16;
export const LANDMARK_DISCOVERY_ICON_GAP_PX = 3;
export const LANDMARK_DISCOVERY_BOB_PX = 2;
export const LANDMARK_DISCOVERY_BOB_PERIOD_MS = 1800;

const WORLD_DISCOVERY_KINDS = new Set(["mountain", "landmark", "legend"]);

export function discoveryHasLandmarkIndicator(discovery) {
  if (!discovery || typeof discovery !== "object") {
    throw new Error("Landmark indicator requires a discovery");
  }
  return WORLD_DISCOVERY_KINDS.has(discovery.kind);
}

export function landmarkDiscoveryIndicatorRect({
  discoveryId,
  centerX,
  centerY,
  landmarkHalfSize,
  nowMs,
  reducedMotion = false
}) {
  if (typeof discoveryId !== "string" || discoveryId.length === 0) {
    throw new Error("Landmark indicator requires a discovery id");
  }
  for (const [label, value] of Object.entries({ centerX, centerY, landmarkHalfSize, nowMs })) {
    if (!Number.isFinite(value)) throw new Error(`Landmark indicator has invalid ${label}: ${value}`);
  }
  if (landmarkHalfSize <= 0 || nowMs < 0) {
    throw new Error("Landmark indicator requires positive geometry and animation time");
  }
  const phaseMs = discoveryIndicatorPhaseMs(discoveryId);
  const phase = (nowMs + phaseMs) / LANDMARK_DISCOVERY_BOB_PERIOD_MS * Math.PI * 2;
  const bob = reducedMotion ? 0 : Math.round(Math.sin(phase) * LANDMARK_DISCOVERY_BOB_PX);
  return Object.freeze({
    x: Math.round(centerX - LANDMARK_DISCOVERY_ICON_SIZE / 2),
    y: Math.round(
      centerY - landmarkHalfSize - LANDMARK_DISCOVERY_ICON_SIZE -
      LANDMARK_DISCOVERY_ICON_GAP_PX + bob
    ),
    w: LANDMARK_DISCOVERY_ICON_SIZE,
    h: LANDMARK_DISCOVERY_ICON_SIZE
  });
}

export function createLandmarkDiscoveryCollectionEffect({
  startRect,
  startedAtMs,
  targetX,
  targetY,
  arrivalSoundId
}) {
  if (!startRect || !Number.isFinite(startRect.x) || !Number.isFinite(startRect.y)) {
    throw new Error("Landmark discovery collection requires a start rectangle");
  }
  return createItemAcquisitionEffect({
    iconId: LANDMARK_DISCOVERY_ICON_ID,
    startX: startRect.x,
    startY: startRect.y,
    startedAtMs,
    iconSize: LANDMARK_DISCOVERY_ICON_SIZE,
    targetX,
    targetY,
    arrivalSoundId
  });
}

function discoveryIndicatorPhaseMs(discoveryId) {
  let hash = 2166136261;
  for (let index = 0; index < discoveryId.length; index++) {
    hash ^= discoveryId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % LANDMARK_DISCOVERY_BOB_PERIOD_MS;
}
