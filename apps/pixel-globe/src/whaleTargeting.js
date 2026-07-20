export const WHALE_TARGET_CLICK_PADDING_PX = 4;

export function whaleTargetRect(call, frameSize) {
  validateWhaleCall(call);
  if (!Number.isFinite(frameSize) || frameSize <= 0) {
    throw new Error(`Whale targeting requires a positive frame size: ${frameSize}`);
  }
  const size = frameSize * call.scale;
  return {
    x: call.x - size / 2 - WHALE_TARGET_CLICK_PADDING_PX,
    y: call.y - size / 2 - WHALE_TARGET_CLICK_PADDING_PX,
    w: size + WHALE_TARGET_CLICK_PADDING_PX * 2,
    h: size + WHALE_TARGET_CLICK_PADDING_PX * 2
  };
}

function validateWhaleCall(call) {
  if (!call || typeof call.id !== "string" || call.id === "" ||
      !Number.isFinite(call.x) || !Number.isFinite(call.y) ||
      !Number.isFinite(call.scale) || call.scale <= 0) {
    throw new Error("Whale targeting received an invalid interaction call");
  }
}
