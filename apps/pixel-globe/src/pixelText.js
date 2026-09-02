const PIXEL_FONT_DESIGN_SIZES = Object.freeze(new Map([
  ["Silkscreen", 8],
  ["Dogica", 8],
  ["Pixel Pirate", 8],
  ["zpix", 12],
  ["Galmuri11", 11],
  // Pirata One is used only for the oversized battle result lettering. It is
  // rasterized once, snapped to the logical pixel grid, and alpha-hardened by
  // the same path as the native bitmap fonts.
  ["Pirata One", 1]
]));

export function pixelTextOrigin({ x, y, width, align = "left" }) {
  for (const [label, value] of Object.entries({ x, y, width })) {
    if (!Number.isFinite(value)) throw new Error(`Invalid pixel text ${label}: ${value}`);
  }
  if (!new Set(["left", "center", "right"]).has(align)) {
    throw new Error(`Invalid pixel text alignment: ${align}`);
  }

  const alignedX = align === "center"
    ? x - width / 2
    : align === "right"
      ? x - width
      : x;
  return {
    x: Math.round(alignedX),
    y: Math.round(y)
  };
}

export function resolvedPixelTextColor(currentFillStyle, requestedColor) {
  const color = requestedColor === undefined ? currentFillStyle : requestedColor;
  if (typeof color !== "string" || color.trim() === "") {
    throw new Error("Pixel text requires a solid CSS fill color");
  }
  return color;
}

export function pixelFontCompatibleText(text, font) {
  if (typeof text !== "string") throw new Error(`Pixel-font text must be a string: ${text}`);
  if (typeof font !== "string" || font.length === 0) {
    throw new Error(`Pixel-font compatibility requires a font: ${font}`);
  }
  if (!/(?:Silkscreen|Dogica|Pixel Pirate)/.test(font)) return text;

  return Array.from(text, (character) => {
    const codePoint = character.codePointAt(0);
    if (codePoint < 0xc0 || codePoint > 0x24f) return character;
    const replacement = EXTENDED_LATIN_PIXEL_REPLACEMENTS[character];
    if (replacement) return replacement;
    const decomposed = character.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return /^[A-Za-z]+$/.test(decomposed) ? decomposed : character;
  }).join("");
}

const EXTENDED_LATIN_PIXEL_REPLACEMENTS = Object.freeze({
  Ł: "L",
  ł: "l",
  Đ: "D",
  đ: "d",
  Ħ: "H",
  ħ: "h",
  ı: "i",
  Ŧ: "T",
  ŧ: "t"
});

export function snapPointToTransformedPixelGrid(point, transform) {
  const values = {
    x: point?.x,
    y: point?.y,
    a: transform?.a,
    b: transform?.b,
    c: transform?.c,
    d: transform?.d,
    e: transform?.e,
    f: transform?.f
  };
  for (const [label, value] of Object.entries(values)) {
    if (!Number.isFinite(value)) throw new Error(`Invalid transformed pixel ${label}: ${value}`);
  }

  const determinant = values.a * values.d - values.b * values.c;
  if (Math.abs(determinant) < 1e-9) throw new Error("Cannot snap text through a singular canvas transform");
  const canvasX = values.a * values.x + values.c * values.y + values.e;
  const canvasY = values.b * values.x + values.d * values.y + values.f;
  const snappedX = Math.round(canvasX);
  const snappedY = Math.round(canvasY);
  const translatedX = snappedX - values.e;
  const translatedY = snappedY - values.f;
  return {
    x: (values.d * translatedX - values.c * translatedY) / determinant,
    y: (-values.b * translatedX + values.a * translatedY) / determinant
  };
}

export function pixelFontSizePx(font) {
  if (typeof font !== "string" || font.length === 0) {
    throw new Error(`Invalid pixel font: ${font}`);
  }
  const match = font.match(/(?:^|\s)(\d+(?:\.\d+)?)px(?:\s|$)/);
  if (!match) throw new Error(`Pixel font has no px size: ${font}`);
  const size = Number(match[1]);
  const family = [...PIXEL_FONT_DESIGN_SIZES.keys()].find((candidate) => (
    new RegExp(`(?:^|[\\s,\"'])${candidate}(?:$|[\\s,\"'])`).test(font)
  ));
  if (!family) {
    throw new Error(`Unsupported pixel font family: ${font}`);
  }
  const designSize = PIXEL_FONT_DESIGN_SIZES.get(family);
  if (!Number.isInteger(size) || size <= 0 || size % designSize !== 0) {
    throw new Error(`Pixel font size must be a positive multiple of ${designSize}px: ${font}`);
  }
  return size;
}

export function pixelTextRasterHeight(font) {
  return pixelFontSizePx(font) * 2;
}

export function pixelTextScratchRasterLayout(font, metrics = {}) {
  const fontSize = pixelFontSizePx(font);
  const height = pixelTextRasterHeight(font);
  const ascent = firstPositiveMetric(metrics.fontBoundingBoxAscent, metrics.actualBoundingBoxAscent, fontSize);
  const descent = firstNonNegativeMetric(
    metrics.fontBoundingBoxDescent,
    metrics.actualBoundingBoxDescent,
    Math.ceil(fontSize / 4)
  );
  const inkHeight = Math.ceil(ascent + descent);
  if (inkHeight > height) {
    throw new Error(`Pixel font metrics exceed the ${height}px raster: ${inkHeight}px for ${font}`);
  }
  const padding = height;
  return Object.freeze({
    baselineY: padding + Math.ceil(ascent),
    height,
    padding,
    scratchHeight: padding * 2 + height
  });
}

function firstPositiveMetric(...values) {
  return values.find((value) => Number.isFinite(value) && value > 0);
}

function firstNonNegativeMetric(...values) {
  return values.find((value) => Number.isFinite(value) && value >= 0);
}

export function hardenPixelTextAlpha(pixels, threshold = 128) {
  if (!(pixels instanceof Uint8ClampedArray) || pixels.length % 4 !== 0) {
    throw new Error("Pixel text raster must be RGBA Uint8ClampedArray data");
  }
  if (!Number.isInteger(threshold) || threshold < 1 || threshold > 255) {
    throw new Error(`Invalid pixel text alpha threshold: ${threshold}`);
  }

  let strongestAlpha = 0;
  for (let offset = 0; offset < pixels.length; offset += 4) {
    strongestAlpha = Math.max(strongestAlpha, pixels[offset + 3]);
  }
  if (strongestAlpha === 0) return 0;

  // Mobile Safari can rasterize the same loaded pixel font with a lower alpha
  // ceiling than desktop browsers. Normalize that ceiling, then keep the
  // output strictly binary so text remains pixel-perfect.
  const effectiveThreshold = Math.min(threshold, Math.max(1, Math.ceil(strongestAlpha / 2)));
  let opaquePixels = 0;
  for (let offset = 0; offset < pixels.length; offset += 4) {
    if (pixels[offset + 3] < effectiveThreshold) {
      pixels[offset + 3] = 0;
      continue;
    }
    pixels[offset + 3] = 255;
    opaquePixels += 1;
  }
  return opaquePixels;
}
