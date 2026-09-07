import { RESURRECT_64_HEX } from "./waterLatitudePalette.js";

export const DOCKSIDE_KEY_COLOR = Object.freeze([146, 169, 132]);

/** The green backdrop is a chroma key, never a candidate ship pigment. */
export function isDocksideKeyColor(r, g, b) {
  return g - r >= 8 && g - b >= 15 &&
    (r - 146) ** 2 + (g - 169) ** 2 + (b - 132) ** 2 <= 50 ** 2;
}

export function shipPaintoverQuantizer(paletteHex) {
  if (!Array.isArray(paletteHex) || paletteHex.length === 0 ||
      new Set(paletteHex).size !== paletteHex.length ||
      paletteHex.some(hex => !RESURRECT_64_HEX.includes(hex) || hex === "92a984")) {
    throw new Error("Ship paintover palette must contain unique Resurrect64 pigments without the backdrop");
  }
  const colors = paletteHex.map(hex => [0, 2, 4].map(offset => parseInt(hex.slice(offset, offset + 2), 16)));
  return (r, g, b) => {
    if (![r, g, b].every(channel => Number.isFinite(channel) && channel >= 0 && channel <= 255)) {
      throw new Error("Ship paintover RGB channels must be in 0–255");
    }
    let best = colors[0];
    let distance = Infinity;
    for (const color of colors) {
      const next = (r - color[0]) ** 2 + (g - color[1]) ** 2 + (b - color[2]) ** 2;
      if (next < distance) { best = color; distance = next; }
    }
    return best;
  };
}

/** Finish an existing bake without changing its silhouette or registration. */
export function finishShipSpritePixels(rgba, paletteHex, { mutedGalleonTimber = false } = {}) {
  if (rgba.length % 4 !== 0) throw new Error("Ship sprite requires complete RGBA pixels");
  const quantize = shipPaintoverQuantizer(paletteHex);
  const result = new Uint8ClampedArray(rgba.length);
  const cache = new Map();
  for (let offset = 0; offset < rgba.length; offset += 4) {
    if (rgba[offset + 3] === 0) continue;
    if (rgba[offset + 3] !== 255) throw new Error("Ship sprite requires binary alpha");
    const [r, g, b] = rgba.subarray(offset, offset + 3);
    const key = r * 65536 + g * 256 + b;
    let color = cache.get(key);
    if (!color) {
      // The approved galleon uses mauve timber. Preserve the original material
      // lightness hierarchy while replacing the source model's ochre ramp.
      const timber = mutedGalleonTimber && r > g * 1.1 && g > b * 1.1;
      const paleCloth = mutedGalleonTimber && !timber && r >= 150 && g - b >= 20;
      color = timber
        ? quantize(...(r < 55 ? [46, 34, 47] : r < 95 ? [98, 85, 101] : r < 145 ? [150, 108, 108] : [171, 148, 122]))
        : paleCloth ? quantize(199, 220, 208) : quantize(r, g, b);
      cache.set(key, color);
    }
    result.set(color, offset);
    result[offset + 3] = 255;
  }
  return result;
}
