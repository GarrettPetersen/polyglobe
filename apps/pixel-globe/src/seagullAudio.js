export function seagullScreenPresence(calls, {
  screenWidth,
  screenHeight,
  spriteSize,
  fadeMargin,
  fullPresenceCount
}) {
  if (!Array.isArray(calls)) throw new Error("Seagull screen presence requires draw calls");
  for (const [label, value] of Object.entries({
    screenWidth,
    screenHeight,
    spriteSize,
    fadeMargin,
    fullPresenceCount
  })) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`Invalid seagull audio ${label}: ${value}`);
    }
  }

  let visiblePresence = 0;
  for (const call of calls) {
    if (!Number.isFinite(call?.x) || !Number.isFinite(call?.y)) {
      throw new Error("Seagull audio draw call requires finite coordinates");
    }
    visiblePresence += spriteScreenPresence(call.x, call.y, {
      screenWidth,
      screenHeight,
      spriteSize,
      fadeMargin
    });
  }
  return clamp01(visiblePresence / fullPresenceCount);
}

function spriteScreenPresence(x, y, { screenWidth, screenHeight, spriteSize, fadeMargin }) {
  const halfSize = spriteSize / 2;
  const centerX = x + halfSize;
  const centerY = y + halfSize;
  const visibleDepth = Math.min(
    centerX + halfSize,
    screenWidth + halfSize - centerX,
    centerY + halfSize,
    screenHeight + halfSize - centerY
  );
  return clamp01(visibleDepth / fadeMargin);
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}
