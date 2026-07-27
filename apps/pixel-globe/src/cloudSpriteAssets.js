export const CLOUD_SPRITE_ASSET_VERSION = "cloud-sprites-2";
export const CLOUD_SPRITE_FRAME_SIZE = 64;
export const CLOUD_SPRITE_VARIANT_COUNT = 5;
export const CLOUD_SPRITE_SHEET_PATH = "assets/clouds/clouds-Sheet.png";
export const CLOUD_SPRITE_SHEET_WIDTH = CLOUD_SPRITE_FRAME_SIZE * CLOUD_SPRITE_VARIANT_COUNT;
export const CLOUD_SPRITE_SHEET_HEIGHT = CLOUD_SPRITE_FRAME_SIZE;
export const CLOUD_MAX_ALPHA = 0.3;
export const CLOUD_ASSEMBLY_STAGE_COUNT = 8;
export const CLOUD_PARTICLE_DRIFT_PX = 2;

export function cloudSpriteFrameIndex(templateIndex) {
  if (!Number.isInteger(templateIndex)) {
    throw new Error(`Cloud sprite template index must be an integer: ${templateIndex}`);
  }
  return ((templateIndex % CLOUD_SPRITE_VARIANT_COUNT) + CLOUD_SPRITE_VARIANT_COUNT) %
    CLOUD_SPRITE_VARIANT_COUNT;
}

export function cloudSpriteSourceRect(templateIndex) {
  const frameIndex = cloudSpriteFrameIndex(templateIndex);
  return Object.freeze({
    x: frameIndex * CLOUD_SPRITE_FRAME_SIZE,
    y: 0,
    width: CLOUD_SPRITE_FRAME_SIZE,
    height: CLOUD_SPRITE_FRAME_SIZE
  });
}

export function cloudLifecycleVisualState(lifecycleU, fadeRatio = 0.22) {
  const x = validatedLifecyclePosition(lifecycleU, fadeRatio);
  let phase = "stable";
  let visibility = 1;
  if (x < fadeRatio) {
    phase = "forming";
    visibility = smoothstep(0, fadeRatio, x);
  } else if (x > 1 - fadeRatio) {
    phase = "dispersing";
    visibility = 1 - smoothstep(1 - fadeRatio, 1, x);
  }
  return Object.freeze({
    phase,
    visibility,
    alpha: visibility * CLOUD_MAX_ALPHA,
    stageIndex: visibility <= 0
      ? -1
      : Math.min(
          CLOUD_ASSEMBLY_STAGE_COUNT - 1,
          Math.ceil(visibility * CLOUD_ASSEMBLY_STAGE_COUNT) - 1
        )
  });
}

export function cloudParticleAssembly(frameIndex, x, y, visibility) {
  if (!Number.isInteger(frameIndex) || frameIndex < 0 || frameIndex >= CLOUD_SPRITE_VARIANT_COUNT) {
    throw new Error(`Invalid cloud particle frame index: ${frameIndex}`);
  }
  for (const [label, value] of Object.entries({ x, y })) {
    if (!Number.isInteger(value) || value < 0 || value >= CLOUD_SPRITE_FRAME_SIZE) {
      throw new Error(`Invalid cloud particle ${label}: ${value}`);
    }
  }
  if (!Number.isFinite(visibility) || visibility <= 0 || visibility > 1) {
    throw new Error(`Invalid cloud particle visibility: ${visibility}`);
  }
  const seed = cloudParticleHash(
    frameIndex ^
    Math.imul(x + 1, 0x9e3779b1) ^
    Math.imul(y + 1, 0x85ebca6b)
  );
  const distance = Math.hypot(
    x - (CLOUD_SPRITE_FRAME_SIZE - 1) / 2,
    y - (CLOUD_SPRITE_FRAME_SIZE - 1) / 2
  ) / (CLOUD_SPRITE_FRAME_SIZE * Math.SQRT1_2);
  const rank = clamp(((seed & 0xffff) / 0xffff) * 0.72 + distance * 0.28, 0, 1);
  if (rank <= visibility) {
    return Object.freeze({ visible: true, x, y, alpha: 1, settled: true });
  }

  const particleBand = 0.16;
  if (rank > visibility + particleBand) {
    return Object.freeze({ visible: false, x, y, alpha: 0, settled: false });
  }
  const center = (CLOUD_SPRITE_FRAME_SIZE - 1) / 2;
  const dx = x - center;
  const dy = y - center;
  const length = Math.hypot(dx, dy) || 1;
  const drift = 1 + ((seed >>> 17) % CLOUD_PARTICLE_DRIFT_PX);
  return Object.freeze({
    visible: true,
    x: clamp(Math.round(x + dx / length * drift), 0, CLOUD_SPRITE_FRAME_SIZE - 1),
    y: clamp(Math.round(y + dy / length * drift), 0, CLOUD_SPRITE_FRAME_SIZE - 1),
    alpha: clamp(1 - (rank - visibility) / particleBand, 0.18, 0.72),
    settled: false
  });
}

function validatedLifecyclePosition(lifecycleU, fadeRatio) {
  if (!Number.isFinite(lifecycleU)) {
    throw new Error(`Cloud lifecycle position must be finite: ${lifecycleU}`);
  }
  if (!Number.isFinite(fadeRatio) || fadeRatio <= 0 || fadeRatio >= 0.5) {
    throw new Error(`Cloud fade ratio must be between zero and one half: ${fadeRatio}`);
  }
  return clamp(lifecycleU, 0, 1);
}

function cloudParticleHash(value) {
  let x = value | 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x >>> 0;
}

function smoothstep(edge0, edge1, value) {
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
