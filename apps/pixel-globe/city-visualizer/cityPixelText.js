import {
  hardenPixelTextAlpha,
  pixelFontCompatibleText,
  pixelTextOrigin,
  pixelTextScratchRasterLayout,
  snapPointToTransformedPixelGrid
} from "../src/pixelText.js";

export const CITY_PIXEL_FONT_SMALL_8 = '8px "Silkscreen", monospace';
export const CITY_PIXEL_FONT_TITLE_8 = '8px "Pixel Pirate", monospace';

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

  function measure(text, font = CITY_PIXEL_FONT_SMALL_8) {
    const compatibleText = compatible(text, font);
    const key = `${font}\u0000${compatibleText}`;
    const cached = widthCache.get(key);
    if (cached !== undefined) return cached;
    context.font = font;
    context.textAlign = "left";
    context.textBaseline = "top";
    const width = Math.ceil(context.measureText(compatibleText).width);
    cache(widthCache, key, width);
    return width;
  }

  function draw(text, x, y, options = {}) {
    const font = options.font || CITY_PIXEL_FONT_SMALL_8;
    const color = options.color || "#ffffff";
    const compatibleText = compatible(text, font);
    const width = measure(compatibleText, font);
    const aligned = pixelTextOrigin({
      x,
      y,
      width,
      align: options.align || "left"
    });
    const origin = snapPointToTransformedPixelGrid(aligned, context.getTransform());
    context.save();
    context.imageSmoothingEnabled = false;
    context.drawImage(raster(compatibleText, font, color, width), origin.x, origin.y);
    context.restore();
    return Object.freeze({ x: origin.x, y: origin.y, width });
  }

  function raster(text, font, color, width) {
    const key = `${font}\u0000${color}\u0000${text}`;
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
    scratch.fillText(text, layout.padding, layout.baselineY);
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

  return Object.freeze({ draw, measure });
}

function compatible(text, font) {
  if (typeof text !== "string") throw new Error(`City pixel text must be a string: ${text}`);
  return pixelFontCompatibleText(text, font);
}

function nextPowerOfTwo(value) {
  return 2 ** Math.ceil(Math.log2(value));
}
