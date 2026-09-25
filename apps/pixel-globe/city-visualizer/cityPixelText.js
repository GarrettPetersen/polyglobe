import { isRuntimeDiagnosticAssertionError } from "../src/diagnosticMode.js";
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
const CITY_PORT_TITLE_MARGIN_PX = 4;
const CITY_PORT_TITLE_OBSTACLE_GAP_PX = 4;

export function cityPortTitleLayout({
  textWidth,
  textHeight,
  viewportWidth,
  obstacles = []
}) {
  for (const [label, value] of Object.entries({ textWidth, textHeight, viewportWidth })) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`Invalid city port title ${label}: ${value}`);
    }
  }
  const reserved = validateTitleObstacles(obstacles);
  const preferred = {
    x: Math.round((viewportWidth - textWidth) / 2),
    y: CITY_PORT_TITLE_Y,
    width: textWidth,
    height: textHeight,
    scale: 1
  };
  if (!titleHitsObstacles(preferred, reserved)) return Object.freeze(preferred);

  const lowestObstacleBottom = reserved.reduce(
    (bottom, obstacle) => Math.max(bottom, obstacle.y + obstacle.height),
    preferred.y
  );
  for (let y = preferred.y; y <= lowestObstacleBottom; y++) {
    const placed = titleInRow({ ...preferred, y }, reserved, viewportWidth);
    if (placed) return Object.freeze(placed);
  }
  return Object.freeze(preferred);
}

function titleInRow(title, obstacles, viewportWidth) {
  const gaps = titleRowGaps(title, obstacles, viewportWidth);
  if (gaps.length === 0) return null;
  const center = viewportWidth / 2;
  gaps.sort((left, right) => (
    Math.abs((left[0] + left[1]) / 2 - center) - Math.abs((right[0] + right[1]) / 2 - center) ||
    (right[1] - right[0]) - (left[1] - left[0]) ||
    left[0] - right[0]
  ));
  const [gapStart, gapEnd] = gaps[0];
  return {
    ...title,
    x: Math.round(gapStart + (gapEnd - gapStart - title.width) / 2)
  };
}

function validateTitleObstacles(obstacles) {
  if (!Array.isArray(obstacles)) {
    throw new Error("City port title obstacles must be an array");
  }
  return obstacles.map((obstacle) => {
    if (!obstacle || !["x", "y", "width", "height"].every((key) => Number.isFinite(obstacle[key]))) {
      throw new Error("City port title obstacle requires a finite rectangle");
    }
    if (obstacle.width <= 0 || obstacle.height <= 0) {
      throw new Error("City port title obstacle must have positive size");
    }
    return obstacle;
  });
}

function titleHitsObstacles(title, obstacles) {
  return obstacles.some((obstacle) => (
    title.x < obstacle.x + obstacle.width + CITY_PORT_TITLE_OBSTACLE_GAP_PX &&
    title.x + title.width + CITY_PORT_TITLE_OBSTACLE_GAP_PX > obstacle.x &&
    title.y < obstacle.y + obstacle.height + CITY_PORT_TITLE_OBSTACLE_GAP_PX &&
    title.y + title.height + CITY_PORT_TITLE_OBSTACLE_GAP_PX > obstacle.y
  ));
}

function titleRowGaps(title, obstacles, viewportWidth) {
  const blocked = obstacles
    .filter((obstacle) => (
      title.y < obstacle.y + obstacle.height + CITY_PORT_TITLE_OBSTACLE_GAP_PX &&
      title.y + title.height + CITY_PORT_TITLE_OBSTACLE_GAP_PX > obstacle.y
    ))
    .map((obstacle) => [
      obstacle.x - CITY_PORT_TITLE_OBSTACLE_GAP_PX,
      obstacle.x + obstacle.width + CITY_PORT_TITLE_OBSTACLE_GAP_PX
    ])
    .sort((left, right) => left[0] - right[0] || left[1] - right[1]);
  const merged = [];
  for (const range of blocked) {
    const last = merged.at(-1);
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([range[0], range[1]]);
  }
  const limit = viewportWidth - CITY_PORT_TITLE_MARGIN_PX;
  let cursor = CITY_PORT_TITLE_MARGIN_PX;
  const gaps = [];
  for (const [start, end] of merged) {
    const gapEnd = Math.min(start, limit);
    if (gapEnd - cursor >= title.width) gaps.push([cursor, gapEnd]);
    cursor = Math.max(cursor, end);
  }
  if (limit - cursor >= title.width) gaps.push([cursor, limit]);
  return gaps;
}

const RASTER_CACHE_LIMIT = 128;

export function createCityPixelTextRenderer(context, createCanvas, reportPresentationFailure = null) {
  if (!context || typeof context.drawImage !== "function") {
    throw new Error("City pixel text requires a canvas context");
  }
  if (typeof createCanvas !== "function") {
    throw new Error("City pixel text requires a canvas factory");
  }
  if (reportPresentationFailure !== null && typeof reportPresentationFailure !== "function") {
    throw new Error("City pixel text recovery requires a reporter");
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
    try {
      return drawText(text, x, y, options);
    } catch (error) {
      if (!reportPresentationFailure || isRuntimeDiagnosticAssertionError(error)) throw error;
      reportPresentationFailure(error, "city-pixel-text-render");
      return Object.freeze({
        x: Math.round(Number(x) || 0),
        y: Math.round(Number(y) || 0),
        width: 0,
        height: 0
      });
    }
  }

  function drawText(text, x, y, options = {}) {
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
    // Rasterize the glyph shape independently from its paint. A fade or other
    // transparent fill must not look like a missing font to the raster check.
    scratch.fillStyle = "#ffffff";
    drawTextWithWordSpacing(scratch, text, layout.padding, layout.baselineY, wordSpacingPx);
    const imageData = scratch.getImageData(layout.padding, layout.padding, Math.max(1, width), layout.height);
    const opaquePixels = hardenPixelTextAlpha(imageData.data);
    if (text.trim().length > 0 && opaquePixels === 0) {
      const error = new Error(`City pixel text raster contains no opaque glyphs: ${text}`);
      if (!reportPresentationFailure) throw error;
      reportPresentationFailure(error, "city-pixel-text-empty-raster");
    }
    const output = createCanvas();
    output.width = Math.max(1, width);
    output.height = layout.height;
    const outputContext = output.getContext("2d", { willReadFrequently: true });
    if (!outputContext) throw new Error(`Could not create city pixel text raster: ${text}`);
    outputContext.imageSmoothingEnabled = false;
    outputContext.putImageData(imageData, 0, 0);
    outputContext.globalCompositeOperation = "source-in";
    outputContext.fillStyle = color;
    outputContext.fillRect(0, 0, output.width, output.height);
    outputContext.globalCompositeOperation = "source-over";
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
