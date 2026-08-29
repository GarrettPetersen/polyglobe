import { RESURRECT_64_HEX } from "./waterLatitudePalette.js";

const WARM_SHIP_HEX = new Set([
  "4c3e24", "625565", "6e2727", "966c6c", "9e4539", "cd683d", "e6904e", "ab947a",
  "b33831", "ea4f36", "f57d4a", "ae2334", "e83b3b",
  "fb6b1d", "f79617", "f9c22b", "fbb954", "f68181", "fca790",
  "fdcbb0"
]);

const RESURRECT_COLORS = RESURRECT_64_HEX.map((hex) => Object.freeze({
  hex,
  r: Number.parseInt(hex.slice(0, 2), 16),
  g: Number.parseInt(hex.slice(2, 4), 16),
  b: Number.parseInt(hex.slice(4, 6), 16)
}));

export function isWarmShipColor(r, g, b) {
  for (const [label, channel] of [["red", r], ["green", g], ["blue", b]]) {
    if (!Number.isFinite(channel)) throw new Error(`Invalid ship ${label} channel: ${channel}`);
  }
  const redBrown = r >= g * 1.08 && g >= b * 1.08;
  const yellowBrown = r >= g * 0.95 && g >= b * 1.3;
  return (redBrown || yellowBrown) && r - b >= 18;
}

export function nearestShipResurrectColor(r, g, b) {
  const warm = isWarmShipColor(r, g, b);
  let best = null;
  let bestDistance = Infinity;
  for (const color of RESURRECT_COLORS) {
    if (warm && !WARM_SHIP_HEX.has(color.hex)) continue;
    const dr = r - color.r;
    const dg = g - color.g;
    const db = b - color.b;
    const distance = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
    if (distance >= bestDistance) continue;
    best = color;
    bestDistance = distance;
  }
  if (!best) throw new Error("Ship Resurrect palette has no eligible colors");
  return best;
}
