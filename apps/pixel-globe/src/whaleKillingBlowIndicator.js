export const WHALE_KILLING_BLOW_ICON_SIZE = 16;
export const WHALE_KILLING_BLOW_ICON_GAP_PX = 3;
export const WHALE_KILLING_BLOW_BOB_PX = 2;
export const WHALE_KILLING_BLOW_BOB_PERIOD_MS = 1600;
export const WHALE_KILLING_BLOW_CLICK_PADDING_PX = 3;

export function whaleKillingBlowIndicatorRect(call, frameSize, nowMs) {
  validateCall(call);
  if (!Number.isFinite(frameSize) || frameSize <= 0) {
    throw new Error(`Whale killing-blow indicator requires a positive frame size: ${frameSize}`);
  }
  if (!Number.isFinite(nowMs) || nowMs < 0) {
    throw new Error(`Whale killing-blow indicator requires valid animation time: ${nowMs}`);
  }
  const whaleTop = call.y - frameSize * call.scale / 2;
  const phase = nowMs / WHALE_KILLING_BLOW_BOB_PERIOD_MS * Math.PI * 2;
  const bob = Math.round(Math.sin(phase) * WHALE_KILLING_BLOW_BOB_PX);
  return {
    x: Math.round(call.x - WHALE_KILLING_BLOW_ICON_SIZE / 2),
    y: Math.round(
      whaleTop - WHALE_KILLING_BLOW_ICON_SIZE - WHALE_KILLING_BLOW_ICON_GAP_PX + bob
    ),
    w: WHALE_KILLING_BLOW_ICON_SIZE,
    h: WHALE_KILLING_BLOW_ICON_SIZE
  };
}

export function whaleKillingBlowIndicatorHitRect(call, frameSize, nowMs) {
  const rect = whaleKillingBlowIndicatorRect(call, frameSize, nowMs);
  return {
    x: rect.x - WHALE_KILLING_BLOW_CLICK_PADDING_PX,
    y: rect.y - WHALE_KILLING_BLOW_CLICK_PADDING_PX,
    w: rect.w + WHALE_KILLING_BLOW_CLICK_PADDING_PX * 2,
    h: rect.h + WHALE_KILLING_BLOW_CLICK_PADDING_PX * 2
  };
}

function validateCall(call) {
  if (
    !call ||
    typeof call.id !== "string" ||
    call.id === "" ||
    !Number.isFinite(call.x) ||
    !Number.isFinite(call.y) ||
    !Number.isFinite(call.scale) ||
    call.scale <= 0
  ) {
    throw new Error("Whale killing-blow indicator received an invalid interaction call");
  }
}
