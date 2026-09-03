import {
  hardenPixelTextAlpha,
  pixelFontCompatibleText,
  pixelTextOrigin,
  pixelTextScratchRasterLayout,
  snapPointToTransformedPixelGrid
} from "../src/pixelText.js";

export const CITY_PIXEL_FONT_SMALL_8 = '8px "Silkscreen", monospace';
export const CITY_PIXEL_FONT_TITLE_8 = '8px "Pixel Pirate", monospace';
export const CITY_PORT_TITLE_Y = 14;

export function cityPortTitleLayout({ textWidth, textHeight, viewportWidth }) {
  for (const [label, value] of Object.entries({ textWidth, textHeight, viewportWidth })) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`Invalid city port title ${label}: ${value}`);
    }
  }
  return Object.freeze({
    x: Math.round((viewportWidth - textWidth) / 2),
    y: CITY_PORT_TITLE_Y,
    width: textWidth,
    height: textHeight,
    scale: 1
  });
}

const RASTER_CACHE_LIMIT = 128;

export function createCityPixelTextRenderer(context, createCanvas) {
  if (!context || typeof context.drawImage !== "function") {
    throw new Error("City pixel text requires a canvas context");
  }
  if (typeof createCanvas !== "function") {
    throw new Error("City pixel text requires a canvas factory");
  }

  const rasterCache = new Map();
  const layoutCache = new Map();
  const widthCache = new Map();
  let scratchCanvas = null;
  let scratchContext = null;

  function measure(text, font = CITY_PIXEL_FONT_SMALL_8, options = {}) {
    const compatibleText = compatible(text, font);
    const wordSpacingPx = requireWordSpacing(options.wordSpacingPx);
    const key = `${font}\u0000${wordSpacingPx ?? "font"}\u0000${compatibleText}`;
    const cached = widthCache.get(key);
    if (cached !== undefined) return cached;
    context.font = font;
    context.textAlign = "left";
    context.textBaseline = "top";
    const width = Math.ceil(measuredWidth(context, compatibleText, wordSpacingPx));
    cache(widthCache, key, width);
    return width;
  }

  function height(font = CITY_PIXEL_FONT_SMALL_8) {
    return fontLayout(font).height;
  }

  function draw(text, x, y, options = {}) {
    const font = options.font || CITY_PIXEL_FONT_SMALL_8;
    const color = options.color || "#ffffff";
    const wordSpacingPx = requireWordSpacing(options.wordSpacingPx);
    const scale = requireScale(options.scale);
    const compatibleText = compatible(text, font);
    const width = measure(compatibleText, font, { wordSpacingPx });
    const aligned = pixelTextOrigin({
      x,
      y,
      width: width * scale,
      align: options.align || "left"
    });
    const origin = snapPointToTransformedPixelGrid(aligned, context.getTransform());
    const image = raster(compatibleText, font, color, width, wordSpacingPx);
    context.save();
    context.imageSmoothingEnabled = false;
    context.drawImage(
      image,
      origin.x,
      origin.y,
      image.width * scale,
      image.height * scale
    );
    context.restore();
    return Object.freeze({
      x: origin.x,
      y: origin.y,
      width: width * scale,
      height: image.height * scale
    });
  }

  function raster(text, font, color, width, wordSpacingPx) {
    const key = `${font}\u0000${color}\u0000${wordSpacingPx ?? "font"}\u0000${text}`;
    const cached = rasterCache.get(key);
    if (cached) return cached;
    const layout = fontLayout(font);
    const scratch = reusableScratch(width + layout.padding * 2, layout.scratchHeight);
    scratch.clearRect(0, 0, scratchCanvas.width, scratchCanvas.height);
    scratch.imageSmoothingEnabled = false;
    scratch.font = font;
    scratch.textAlign = "left";
    scratch.textBaseline = "alphabetic";
    scratch.fillStyle = color;
    drawTextWithWordSpacing(scratch, text, layout.padding, layout.baselineY, wordSpacingPx);
    const imageData = scratch.getImageData(layout.padding, layout.padding, Math.max(1, width), layout.height);
    const opaquePixels = hardenPixelTextAlpha(imageData.data);
    if (text.trim().length > 0 && opaquePixels === 0) {
      throw new Error(`City pixel text raster contains no opaque glyphs: ${text}`);
    }
    const output = createCanvas();
    output.width = Math.max(1, width);
    output.height = layout.height;
    const outputContext = output.getContext("2d", { willReadFrequently: true });
    if (!outputContext) throw new Error(`Could not create city pixel text raster: ${text}`);
    outputContext.imageSmoothingEnabled = false;
    outputContext.putImageData(imageData, 0, 0);
    cache(rasterCache, key, output);
    return output;
  }

  function fontLayout(font) {
    const cached = layoutCache.get(font);
    if (cached) return cached;
    const metricsCanvas = createCanvas();
    const metricsContext = metricsCanvas.getContext("2d");
    if (!metricsContext) throw new Error(`Could not measure city pixel font: ${font}`);
    metricsContext.font = font;
    const layout = pixelTextScratchRasterLayout(font, metricsContext.measureText("PIXEL 1522 gy"));
    layoutCache.set(font, layout);
    return layout;
  }

  function reusableScratch(requiredWidth, requiredHeight) {
    if (!scratchCanvas) {
      scratchCanvas = createCanvas();
      scratchContext = scratchCanvas.getContext("2d", { willReadFrequently: true });
      if (!scratchContext) throw new Error("Could not create city pixel text scratch raster");
    }
    const width = Math.max(scratchCanvas.width, nextPowerOfTwo(requiredWidth));
    const height = Math.max(scratchCanvas.height, nextPowerOfTwo(requiredHeight));
    if (scratchCanvas.width !== width) scratchCanvas.width = width;
    if (scratchCanvas.height !== height) scratchCanvas.height = height;
    return scratchContext;
  }

  function cache(target, key, value) {
    if (target.size >= RASTER_CACHE_LIMIT) target.delete(target.keys().next().value);
    target.set(key, value);
  }

  return Object.freeze({ draw, height, measure });
}

function measuredWidth(context, text, wordSpacingPx) {
  if (wordSpacingPx === null) return context.measureText(text).width;
  let width = 0;
  for (const run of text.split(/( +)/)) {
    width += /^ +$/.test(run) ? run.length * wordSpacingPx : context.measureText(run).width;
  }
  return width;
}

function drawTextWithWordSpacing(context, text, x, y, wordSpacingPx) {
  if (wordSpacingPx === null) {
    context.fillText(text, x, y);
    return;
  }
  let cursorX = x;
  for (const run of text.split(/( +)/)) {
    if (/^ +$/.test(run)) {
      cursorX += run.length * wordSpacingPx;
      continue;
    }
    context.fillText(run, Math.round(cursorX), y);
    cursorX += context.measureText(run).width;
  }
}

function requireWordSpacing(value) {
  if (value === undefined || value === null) return null;
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Invalid city pixel word spacing: ${value}`);
  }
  return value;
}

function requireScale(value) {
  if (value === undefined) return 1;
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid city pixel text scale: ${value}`);
  }
  return value;
}

function compatible(text, font) {
  if (typeof text !== "string") throw new Error(`City pixel text must be a string: ${text}`);
  return pixelFontCompatibleText(text, font);
}

function nextPowerOfTwo(value) {
  return 2 ** Math.ceil(Math.log2(value));
}
