export const STEAM_WISHLIST_URL = "https://store.steampowered.com/app/4516500/Marque__Reprisal/";

export function wishlistPromotionEnabled({ editionId, platformId }) {
  if (!["full", "demo"].includes(editionId)) throw new Error(`Unknown wishlist edition: ${editionId}`);
  if (!["browser", "steam"].includes(platformId)) throw new Error(`Unknown wishlist platform: ${platformId}`);
  return editionId === "demo" || platformId === "browser";
}

export function wishlistPulse(nowMs, reducedMotion) {
  return reducedMotion ? 0.5 : (1 + Math.sin(nowMs / 420)) / 2;
}

export function wishlistModalLayout(width, height) {
  const w = Math.min(310, width - 24);
  const h = Math.min(154, height - 24);
  const panel = { x: Math.floor((width - w) / 2), y: Math.floor((height - h) / 2), w, h };
  return { panel, wishlist: { x: panel.x + 14, y: panel.y + h - 76, w: w - 28, h: 32 },
    back: { x: panel.x + 14, y: panel.y + h - 36, w: w - 28, h: 24 } };
}



export function startWishlistRect(panel) {
  const w = Math.min(224, panel.w - 24);
  return { x: panel.x + Math.floor((panel.w - w) / 2), y: panel.y + 38, w, h: 22 };
}
