import {
  LOADING_CAPSULE_HEIGHT,
  LOADING_CAPSULE_HORIZON_Y,
  LOADING_CAPSULE_WIDTH,
  loadingLayerMotion,
  loadingScreenCoverCrop,
  loadingScreenForegroundLayout,
  loadingWaveOffset
} from "./loadingScreenMotion.js";
import {
  hardenPixelTextAlpha,
  pixelTextScratchRasterLayout
} from "./pixelText.js";
import { fetchStaticAsset } from "./staticAssetFetch.js";

const SCENE_SCALE = 2;
const LOADING_STATUS_FONT = '8px "Loading Silkscreen"';
const LOADING_STATUS_INSET = 4;
const LOADING_STATUS_WAKE_GAP = 4;
const LOADING_STATUS_WAKE_DIAMOND_SIZE = 3;
const LOADING_STATUS_WAKE_DIAMOND_GAP = 2;
const BASE_LAYER_URLS = Object.freeze({
  background: new URL("../assets/loading/background.png", import.meta.url).toString(),
  reflection: new URL("../assets/loading/reflection.png", import.meta.url).toString(),
  ship: new URL("../assets/loading/ship.png", import.meta.url).toString()
});

let displayCanvas = null;
let displayContext = null;
let sceneCanvas = null;
let sceneContext = null;
let foregroundCanvas = null;
let foregroundContext = null;
let images = null;
let statusRaster = null;
let reducedMotion = false;
let animationStartedAtMs = 0;
let animationFrameId = null;
let failed = false;

self.addEventListener("message", (event) => {
  try {
    if (event.data?.type === "start") {
      void start(event.data).catch(reportError);
    } else if (event.data?.type === "resize") {
      resize(event.data.width, event.data.height);
    } else {
      throw new Error(`Unknown capsule loading worker command: ${event.data?.type}`);
    }
  } catch (error) {
    reportError(error);
  }
});

async function start(message) {
  if (displayCanvas) throw new Error("Capsule loading worker cannot start twice");
  if (!(message.canvas instanceof OffscreenCanvas)) {
    throw new Error("Capsule loading worker requires a transferred OffscreenCanvas");
  }
  if (typeof self.requestAnimationFrame !== "function") {
    throw new Error("Capsule loading worker requires worker animation-frame support");
  }
  displayCanvas = message.canvas;
  displayContext = displayCanvas.getContext("2d", { alpha: false });
  if (!displayContext) throw new Error("Capsule loading worker could not create its display context");
  sceneCanvas = new OffscreenCanvas(
    LOADING_CAPSULE_WIDTH * SCENE_SCALE,
    LOADING_CAPSULE_HEIGHT * SCENE_SCALE
  );
  sceneContext = sceneCanvas.getContext("2d");
  if (!sceneContext) throw new Error("Capsule loading worker could not create its scene context");
  foregroundCanvas = new OffscreenCanvas(
    LOADING_CAPSULE_WIDTH * SCENE_SCALE,
    LOADING_CAPSULE_HEIGHT * SCENE_SCALE
  );
  foregroundContext = foregroundCanvas.getContext("2d");
  if (!foregroundContext) {
    throw new Error("Capsule loading worker could not create its foreground context");
  }
  displayContext.imageSmoothingEnabled = false;
  sceneContext.imageSmoothingEnabled = false;
  foregroundContext.imageSmoothingEnabled = false;
  reducedMotion = message.reducedMotion === true;
  resize(message.width, message.height);
  const [loadedImages] = await Promise.all([
    loadCapsuleLayers(message.titleAtlasFile),
    loadLoadingStatusFont()
  ]);
  images = loadedImages;
  validateLayerDimensions(images);
  statusRaster = createLoadingStatusRaster(message.statusText);
  animationStartedAtMs = performance.now();
  render(animationStartedAtMs);
  self.postMessage({ type: "ready" });
}

function resize(width, height) {
  assertPositiveInteger(width, "width");
  assertPositiveInteger(height, "height");
  if (!displayCanvas) return;
  if (displayCanvas.width === width && displayCanvas.height === height) return;
  displayCanvas.width = width;
  displayCanvas.height = height;
  if (displayContext) displayContext.imageSmoothingEnabled = false;
}

function render(nowMs) {
  if (failed || !images) return;
  drawLoadingScene(nowMs - animationStartedAtMs);
  drawSceneCover(nowMs - animationStartedAtMs);
  if (!reducedMotion) animationFrameId = self.requestAnimationFrame(render);
}

function drawLoadingScene(elapsedMs) {
  sceneContext.clearRect(0, 0, sceneCanvas.width, sceneCanvas.height);
  sceneContext.drawImage(
    images.background,
    0,
    0,
    LOADING_CAPSULE_WIDTH,
    LOADING_CAPSULE_HORIZON_Y,
    0,
    0,
    sceneCanvas.width,
    LOADING_CAPSULE_HORIZON_Y * SCENE_SCALE
  );
  drawRippleRows(sceneContext, images.background, elapsedMs);
  foregroundContext.clearRect(0, 0, foregroundCanvas.width, foregroundCanvas.height);
  drawRippleRows(foregroundContext, images.reflection, elapsedMs);
  const motion = loadingLayerMotion(elapsedMs, reducedMotion);
  drawScaledTitleAtlasLayer(foregroundContext, images.title, 0, motion.upperTextY);
  drawScaledLayer(foregroundContext, images.ship, motion.shipY);
  drawScaledTitleAtlasLayer(
    foregroundContext,
    images.title,
    LOADING_CAPSULE_HEIGHT,
    motion.lowerTextY
  );
}

function drawRippleRows(context, image, elapsedMs) {
  let bandY = LOADING_CAPSULE_HORIZON_Y;
  let bandOffset = rippleOffsetAtRow(bandY, elapsedMs);
  for (let y = LOADING_CAPSULE_HORIZON_Y + 1; y <= LOADING_CAPSULE_HEIGHT; y++) {
    const offset = y === LOADING_CAPSULE_HEIGHT
      ? Number.NaN
      : rippleOffsetAtRow(y, elapsedMs);
    if (offset === bandOffset) continue;
    drawWrappedBand(context, image, bandY, y - bandY, bandOffset);
    bandY = y;
    bandOffset = offset;
  }
}

function rippleOffsetAtRow(y, elapsedMs) {
  return reducedMotion ? 0 : Math.round(loadingWaveOffset(y, elapsedMs) * SCENE_SCALE);
}

function drawWrappedBand(context, image, y, height, offset) {
  const scaledY = y * SCENE_SCALE;
  const scaledHeight = height * SCENE_SCALE;
  context.drawImage(
    image,
    0,
    y,
    LOADING_CAPSULE_WIDTH,
    height,
    offset,
    scaledY,
    sceneCanvas.width,
    scaledHeight
  );
  if (offset > 0) {
    const sourceWidth = offset / SCENE_SCALE;
    context.drawImage(
      image,
      LOADING_CAPSULE_WIDTH - sourceWidth,
      y,
      sourceWidth,
      height,
      0,
      scaledY,
      offset,
      scaledHeight
    );
  } else if (offset < 0) {
    const sourceWidth = -offset / SCENE_SCALE;
    context.drawImage(
      image,
      0,
      y,
      sourceWidth,
      height,
      context.canvas.width + offset,
      scaledY,
      -offset,
      scaledHeight
    );
  }
}

function drawScaledLayer(context, image, yOffset) {
  context.drawImage(
    image,
    0,
    0,
    LOADING_CAPSULE_WIDTH,
    LOADING_CAPSULE_HEIGHT,
    0,
    Math.round(yOffset * SCENE_SCALE),
    context.canvas.width,
    context.canvas.height
  );
}

function drawScaledTitleAtlasLayer(context, image, sourceY, yOffset) {
  context.drawImage(
    image,
    0,
    sourceY,
    LOADING_CAPSULE_WIDTH,
    LOADING_CAPSULE_HEIGHT,
    0,
    Math.round(yOffset * SCENE_SCALE),
    context.canvas.width,
    context.canvas.height
  );
}

function drawSceneCover(elapsedMs) {
  const crop = loadingScreenCoverCrop(displayCanvas.width, displayCanvas.height);
  const foreground = loadingScreenForegroundLayout(displayCanvas.width, displayCanvas.height);
  displayContext.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
  displayContext.drawImage(
    sceneCanvas,
    crop.x * SCENE_SCALE,
    crop.y * SCENE_SCALE,
    crop.width * SCENE_SCALE,
    crop.height * SCENE_SCALE,
    0,
    0,
    displayCanvas.width,
    displayCanvas.height
  );
  displayContext.drawImage(
    foregroundCanvas,
    0,
    0,
    foregroundCanvas.width,
    foregroundCanvas.height,
    foreground.x,
    foreground.y,
    foreground.width,
    foreground.height
  );
  drawLoadingStatus(elapsedMs);
}

function drawLoadingStatus(elapsedMs) {
  if (!statusRaster) throw new Error("Capsule loading status raster is missing");
  const wakeWidth = LOADING_STATUS_WAKE_DIAMOND_SIZE * 3 +
    LOADING_STATUS_WAKE_DIAMOND_GAP * 2;
  const totalWidth = statusRaster.width + LOADING_STATUS_WAKE_GAP + wakeWidth;
  const x = Math.max(LOADING_STATUS_INSET, displayCanvas.width - LOADING_STATUS_INSET - totalWidth);
  const y = Math.max(
    LOADING_STATUS_INSET,
    displayCanvas.height - LOADING_STATUS_INSET - statusRaster.height
  );
  displayContext.drawImage(statusRaster, x, y);
  const wakeX = x + statusRaster.width + LOADING_STATUS_WAKE_GAP;
  const wakeY = y + Math.max(0, Math.floor((statusRaster.height - 3) / 2));
  const activeDiamond = Math.floor(elapsedMs / 300) % 3;
  for (let index = 0; index < 3; index++) {
    drawLoadingWakeDiamond(
      wakeX + index * (LOADING_STATUS_WAKE_DIAMOND_SIZE + LOADING_STATUS_WAKE_DIAMOND_GAP),
      wakeY,
      index === activeDiamond ? "#ffd27a" : "#f3aa57"
    );
  }
}

function drawLoadingWakeDiamond(x, y, color) {
  displayContext.fillStyle = "#201b2a";
  displayContext.fillRect(x + 2, y + 1, 1, 1);
  displayContext.fillRect(x + 1, y + 2, 3, 1);
  displayContext.fillRect(x + 2, y + 3, 1, 1);
  displayContext.fillStyle = color;
  displayContext.fillRect(x + 1, y, 1, 1);
  displayContext.fillRect(x, y + 1, 3, 1);
  displayContext.fillRect(x + 1, y + 2, 1, 1);
}

async function loadLoadingStatusFont() {
  if (typeof FontFace !== "function" || !self.fonts) {
    throw new Error("Capsule loading worker requires worker font support");
  }
  const url = new URL("../assets/fonts/Silkscreen-Regular.ttf", import.meta.url).toString();
  const response = await fetchStaticAsset(url, { label: "capsule status font" });
  if (!response.ok) {
    throw new Error(`Failed to load capsule status font: HTTP ${response.status} at ${url}`);
  }
  const face = new FontFace("Loading Silkscreen", await response.arrayBuffer());
  await face.load();
  self.fonts.add(face);
}

function createLoadingStatusRaster(text) {
  if (typeof text !== "string" || text.trim() === "" || text.length > 64) {
    throw new Error(`Capsule loading status text is invalid: ${text}`);
  }
  const metricsCanvas = new OffscreenCanvas(1, 1);
  const metricsContext = metricsCanvas.getContext("2d");
  if (!metricsContext) throw new Error("Capsule loading status font cannot be measured");
  metricsContext.font = LOADING_STATUS_FONT;
  const measuredWidth = Math.ceil(metricsContext.measureText(text).width);
  const layout = pixelTextScratchRasterLayout(
    LOADING_STATUS_FONT,
    metricsContext.measureText("PIXEL 1522 gy")
  );
  const scratch = new OffscreenCanvas(measuredWidth + layout.padding * 2, layout.scratchHeight);
  const scratchContext = scratch.getContext("2d", { willReadFrequently: true });
  if (!scratchContext) throw new Error("Capsule loading status raster cannot be created");
  scratchContext.imageSmoothingEnabled = false;
  scratchContext.font = LOADING_STATUS_FONT;
  scratchContext.textAlign = "left";
  scratchContext.textBaseline = "alphabetic";
  scratchContext.fillStyle = "#f4f0eb";
  scratchContext.fillText(text, layout.padding, layout.baselineY);
  const glyph = scratchContext.getImageData(
    layout.padding,
    layout.padding,
    measuredWidth,
    layout.height
  );
  if (hardenPixelTextAlpha(glyph.data) === 0) {
    throw new Error(`Capsule loading status contains no visible glyphs: ${text}`);
  }

  const raster = new OffscreenCanvas(measuredWidth + 1, layout.height + 1);
  const rasterContext = raster.getContext("2d", { willReadFrequently: true });
  if (!rasterContext) throw new Error("Capsule loading status output cannot be created");
  const output = rasterContext.createImageData(raster.width, raster.height);
  for (let sourceY = 0; sourceY < layout.height; sourceY++) {
    for (let sourceX = 0; sourceX < measuredWidth; sourceX++) {
      const sourceOffset = (sourceY * measuredWidth + sourceX) * 4;
      if (glyph.data[sourceOffset + 3] === 0) continue;
      setOpaquePixel(output.data, raster.width, sourceX + 1, sourceY + 1, 32, 27, 42);
    }
  }
  for (let sourceY = 0; sourceY < layout.height; sourceY++) {
    for (let sourceX = 0; sourceX < measuredWidth; sourceX++) {
      const sourceOffset = (sourceY * measuredWidth + sourceX) * 4;
      if (glyph.data[sourceOffset + 3] === 0) continue;
      setOpaquePixel(output.data, raster.width, sourceX, sourceY, 244, 240, 235);
    }
  }
  rasterContext.putImageData(output, 0, 0);
  return raster;
}

function setOpaquePixel(pixels, width, x, y, red, green, blue) {
  const offset = (y * width + x) * 4;
  pixels[offset] = red;
  pixels[offset + 1] = green;
  pixels[offset + 2] = blue;
  pixels[offset + 3] = 255;
}

async function loadCapsuleLayers(titleAtlasFile) {
  if (typeof titleAtlasFile !== "string" || !/^title_[a-z]+\.png$/.test(titleAtlasFile)) {
    throw new Error(`Capsule loading worker received an invalid title atlas: ${titleAtlasFile}`);
  }
  const layerUrls = {
    ...BASE_LAYER_URLS,
    title: new URL(`../assets/loading/${titleAtlasFile}`, import.meta.url).toString()
  };
  const entries = await Promise.all(Object.entries(layerUrls).map(async ([key, url]) => {
    const response = await fetchStaticAsset(url, {
      label: `capsule ${key} layer`
    });
    if (!response.ok) throw new Error(`Failed to load capsule ${key} layer: HTTP ${response.status} at ${url}`);
    const image = await createImageBitmap(await response.blob());
    return [key, image];
  }));
  return Object.freeze(Object.fromEntries(entries));
}

function validateLayerDimensions(loadedImages) {
  for (const [name, image] of Object.entries(loadedImages)) {
    const expectedHeight = name === "title"
      ? LOADING_CAPSULE_HEIGHT * 2
      : LOADING_CAPSULE_HEIGHT;
    if (image.width !== LOADING_CAPSULE_WIDTH || image.height !== expectedHeight) {
      throw new Error(
        `Capsule ${name} layer must be ${LOADING_CAPSULE_WIDTH}x${expectedHeight}, ` +
        `got ${image.width}x${image.height}`
      );
    }
  }
}

function reportError(error) {
  if (failed) return;
  failed = true;
  if (animationFrameId !== null) self.cancelAnimationFrame(animationFrameId);
  self.postMessage({
    type: "error",
    message: error instanceof Error ? error.message : String(error)
  });
}

function assertPositiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Capsule loading canvas ${label} must be a positive integer, got ${value}`);
  }
}
