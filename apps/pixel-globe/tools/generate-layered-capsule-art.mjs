#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  createCanvas,
  loadImage
} from "../../../examples/globe-demo/node_modules/canvas/index.js";
import { SHIP_STATS, shipLabelForSlug } from "../src/shipStats.js";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const generatorOptions = parseGeneratorOptions(process.argv.slice(2));
const sourceDir = resolve(appRoot, generatorOptions.sourceDir);
const outputDir = resolve(appRoot, generatorOptions.outputDir);
const CLIENT_ICON_SHIP_SLUG = "carrack";
const CLIENT_ICON_HEADING_FRAME = 28;
const CLIENT_ICON_BACKGROUND = "#3b7180";

const LAYER_FILES = Object.freeze({
  background: "background.png",
  reflection: "reflection.png",
  upperText: "upper_text.png",
  ship: "ship.png",
  lowerText: "lower_text.png"
});
const FULL_LAYER_ORDER = Object.freeze([
  "background",
  "reflection",
  "upperText",
  "ship",
  "lowerText"
]);
const ARTWORK_LAYER_ORDER = Object.freeze(["background", "reflection", "ship"]);
const TEXT_LAYER_ORDER = Object.freeze(["upperText", "lowerText"]);
const LOCKUP_LAYER_ORDER = Object.freeze(["upperText", "ship", "lowerText"]);

const OUTPUTS = Object.freeze([
  capsule("capsule_header_en.png", 920, 430),
  capsule("capsule_small_en.png", 462, 174, { focalY: 0.47 }),
  capsule("capsule_main_en.png", 1232, 706),
  capsule("capsule_vertical_en.png", 748, 896, {
    layout: "fitted-lockup",
    lockupWidth: 0.92,
    centerLockupText: true
  }),
  artwork("capsule_background.png", 1438, 810),
  capsule("library_capsule_en.png", 600, 900, {
    layout: "fitted-lockup",
    lockupWidth: 0.92,
    centerLockupText: true
  }),
  capsule("library_header_en.png", 920, 430),
  artwork("library_hero.png", 3840, 1240, { focalY: 0.36 }),
  Object.freeze({
    name: "library_logo_en.png",
    width: 1280,
    height: 720,
    kind: "text-only"
  }),
  artwork("community_icon_184.png", 184, 184, { focalX: 0.63, focalY: 0.48 }),
  Object.freeze({ name: "client_icon_32.png", width: 32, height: 32, kind: "client-icon" }),
  artwork("shortcut_icon_256.png", 256, 256, { focalX: 0.63, focalY: 0.48 }),
  capsule("event_cover_en.png", 800, 450),
  capsule("event_header_en.png", 1920, 622, {
    layout: "fitted-lockup",
    focalY: 0.38,
    lockupWidth: 0.52,
    lockupHeight: 0.55
  }),
  capsule("social_share_en.png", 1200, 630),
  capsule("itchio_cover_en.png", 630, 500, { focalX: 0.48, focalY: 0.5 })
]);

function parseGeneratorOptions(args) {
  const options = {
    sourceDir: "capsule_art/source",
    outputDir: "capsule_art/generated",
    onlyName: null
  };
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === "--source-dir") {
      options.sourceDir = requiredOptionValue(args[++index], "--source-dir");
    } else if (argument.startsWith("--source-dir=")) {
      options.sourceDir = requiredOptionValue(
        argument.slice("--source-dir=".length),
        "--source-dir"
      );
    } else if (argument === "--output-dir") {
      options.outputDir = requiredOptionValue(args[++index], "--output-dir");
    } else if (argument.startsWith("--output-dir=")) {
      options.outputDir = requiredOptionValue(
        argument.slice("--output-dir=".length),
        "--output-dir"
      );
    } else if (argument === "--only") {
      options.onlyName = requiredOptionValue(args[++index], "--only");
    } else if (argument.startsWith("--only=")) {
      options.onlyName = requiredOptionValue(argument.slice("--only=".length), "--only");
    } else {
      throw new Error(`Unknown capsule generator argument: ${argument}`);
    }
  }
  return Object.freeze(options);
}

function requiredOptionValue(value, optionName) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${optionName} requires a path`);
  }
  return value;
}

function capsule(name, width, height, options = {}) {
  return Object.freeze({
    name,
    width,
    height,
    kind: "capsule",
    layout: options.layout ?? "cover",
    focalX: options.focalX ?? 0.5,
    focalY: options.focalY ?? 0.5,
    lockupWidth: options.lockupWidth,
    lockupHeight: options.lockupHeight,
    centerLockupText: options.centerLockupText ?? false
  });
}

function artwork(name, width, height, options = {}) {
  return Object.freeze({
    name,
    width,
    height,
    kind: "artwork",
    focalX: options.focalX ?? 0.5,
    focalY: options.focalY ?? 0.5
  });
}

async function main() {
  const selectedOutputs = generatorOptions.onlyName === null
    ? OUTPUTS
    : OUTPUTS.filter((output) => output.name === generatorOptions.onlyName);
  if (selectedOutputs.length === 0) {
    throw new Error(`Unknown capsule output requested by --only: ${generatorOptions.onlyName}`);
  }

  const layers = await loadSourceLayers();
  const sourceSize = validateLayerDimensions(layers);
  const textComposition = trimTransparentComposition(
    composeLayers(sourceSize, layers, TEXT_LAYER_ORDER)
  );
  const lockupComposition = trimTransparentComposition(
    composeLayers(sourceSize, layers, LOCKUP_LAYER_ORDER)
  );
  const reflectionComposition = trimTransparentComposition(layers.reflection);
  const composites = Object.freeze({
    full: composeLayers(sourceSize, layers, FULL_LAYER_ORDER),
    artwork: composeLayers(sourceSize, layers, ARTWORK_LAYER_ORDER),
    text: textComposition.image,
    lockup: lockupComposition.image
  });
  const shipBounds = opaqueBounds(layers.ship);
  const sourceShipAnchor = Object.freeze({
    x: (shipBounds.minX + shipBounds.maxX + 1) / 2,
    y: shipBounds.maxY + 1
  });
  const lockupShipAnchor = Object.freeze({
    x: sourceShipAnchor.x - lockupComposition.bounds.minX,
    y: sourceShipAnchor.y - lockupComposition.bounds.minY
  });
  const lockupTextHorizontalBounds = Object.freeze({
    minX: textComposition.bounds.minX - lockupComposition.bounds.minX,
    maxX: textComposition.bounds.maxX - lockupComposition.bounds.minX
  });
  const needsClientIcon = selectedOutputs.some((output) => output.kind === "client-icon");
  const clientIconWater = needsClientIcon
    ? await loadImage(join(
      appRoot,
      "public/assets/terrain/resurrect-64/water_depth_03_01.png"
    ))
    : null;
  const clientIconShips = needsClientIcon ? await loadClientIconShips() : [];
  const selectedClientIconShip = needsClientIcon
    ? clientIconShips.find((entry) => entry.slug === CLIENT_ICON_SHIP_SLUG)
    : null;
  if (needsClientIcon && !selectedClientIconShip) {
    throw new Error(
      `Client icon ship is absent from the active roster: ${CLIENT_ICON_SHIP_SLUG}`
    );
  }

  await mkdir(outputDir, { recursive: true });
  const rendered = [];
  for (const output of selectedOutputs) {
    const canvas = createCanvas(output.width, output.height);
    const context = canvas.getContext("2d");
    context.imageSmoothingEnabled = false;

    if (output.kind === "text-only") {
      drawContained(context, canvas, composites.text, {
        widthRatio: 0.9,
        heightRatio: 0.86
      });
    } else if (output.kind === "client-icon") {
      drawClientIcon(context, canvas, selectedClientIconShip.image, clientIconWater);
    } else if (output.kind === "artwork") {
      drawCover(context, canvas, composites.artwork, output.focalX, output.focalY);
    } else if (output.layout === "fitted-lockup") {
      const backgroundTransform = drawCover(
        context,
        canvas,
        layers.background,
        output.focalX,
        output.focalY
      );
      const targetShipAnchor = sourcePointToCanvas(
        backgroundTransform,
        sourceShipAnchor
      );
      const lockupTransform = containedTransform(canvas, composites.lockup, {
        widthRatio: output.lockupWidth,
        heightRatio: output.lockupHeight,
        imageAnchor: lockupShipAnchor,
        targetAnchor: targetShipAnchor,
        centeredHorizontalBounds: output.centerLockupText
          ? lockupTextHorizontalBounds
          : undefined
      });
      drawSourceAlignedComposition(
        context,
        reflectionComposition,
        lockupComposition.bounds,
        lockupTransform
      );
      drawWithTransform(context, composites.lockup, lockupTransform);
      assertVerticalAnchorAlignment(output.name, lockupTransform, lockupShipAnchor, targetShipAnchor);
    } else {
      drawCover(context, canvas, composites.full, output.focalX, output.focalY);
    }

    const path = join(outputDir, output.name);
    await writeFile(path, canvas.toBuffer("image/png"));
    rendered.push({ output, canvas });
    console.log(`Generated ${output.name} (${output.width}x${output.height})`);
  }
  if (generatorOptions.onlyName === null) {
    await writeContactSheet(rendered);
    await writeClientIconShipComparison(clientIconShips, clientIconWater);
  }
}

async function loadSourceLayers() {
  const entries = await Promise.all(Object.entries(LAYER_FILES).map(async ([name, filename]) => [
    name,
    await loadImage(join(sourceDir, filename))
  ]));
  return Object.freeze(Object.fromEntries(entries));
}

function validateLayerDimensions(layers) {
  const { width, height } = layers.background;
  for (const [name, image] of Object.entries(layers)) {
    if (image.width !== width || image.height !== height) {
      throw new Error(
        `${LAYER_FILES[name]} is ${image.width}x${image.height}; expected ${width}x${height}`
      );
    }
  }
  return Object.freeze({ width, height });
}

function composeLayers(size, layers, order) {
  const canvas = createCanvas(size.width, size.height);
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  for (const layerName of order) context.drawImage(layers[layerName], 0, 0);
  return canvas;
}

function drawCover(context, canvas, image, focalX, focalY) {
  const scale = Math.max(canvas.width / image.width, canvas.height / image.height);
  const sourceWidth = canvas.width / scale;
  const sourceHeight = canvas.height / scale;
  const sourceX = clamp(
    image.width * focalX - sourceWidth / 2,
    0,
    image.width - sourceWidth
  );
  const sourceY = clamp(
    image.height * focalY - sourceHeight / 2,
    0,
    image.height - sourceHeight
  );
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    canvas.width,
    canvas.height
  );
  return Object.freeze({ scale, sourceX, sourceY });
}

function drawContained(context, canvas, image, options = {}) {
  const transform = containedTransform(canvas, image, options);
  drawWithTransform(context, image, transform);
  return transform;
}

function containedTransform(canvas, image, options = {}) {
  const widthRatio = options.widthRatio ?? 0.9;
  const heightRatio = options.heightRatio ?? 0.86;
  const scale = Math.min(
    canvas.width * widthRatio / image.width,
    canvas.height * heightRatio / image.height
  );
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const scaleX = width / image.width;
  const scaleY = height / image.height;
  const anchored = options.imageAnchor !== undefined && options.targetAnchor !== undefined;
  let idealX;
  if (options.centeredHorizontalBounds !== undefined) {
    const left = options.centeredHorizontalBounds.minX * scaleX;
    const right = (options.centeredHorizontalBounds.maxX + 1) * scaleX;
    idealX = (canvas.width - (right - left)) / 2 - left;
  } else {
    idealX = anchored
      ? options.targetAnchor.x - options.imageAnchor.x * scaleX
      : canvas.width * (options.centerXRatio ?? 0.5) - width / 2;
  }
  const idealY = anchored
    ? options.targetAnchor.y - options.imageAnchor.y * scaleY
    : (canvas.height - height) / 2;
  const x = Math.round(clamp(idealX, 0, canvas.width - width));
  const y = Math.round(clamp(idealY, 0, canvas.height - height));
  return Object.freeze({ x, y, width, height, scaleX, scaleY });
}

function drawWithTransform(context, image, transform) {
  context.drawImage(
    image,
    transform.x,
    transform.y,
    transform.width,
    transform.height
  );
}

function drawSourceAlignedComposition(context, composition, referenceBounds, transform) {
  const left = Math.round(
    transform.x + (composition.bounds.minX - referenceBounds.minX) * transform.scaleX
  );
  const top = Math.round(
    transform.y + (composition.bounds.minY - referenceBounds.minY) * transform.scaleY
  );
  const right = Math.round(
    transform.x + (composition.bounds.maxX + 1 - referenceBounds.minX) * transform.scaleX
  );
  const bottom = Math.round(
    transform.y + (composition.bounds.maxY + 1 - referenceBounds.minY) * transform.scaleY
  );
  context.drawImage(composition.image, left, top, right - left, bottom - top);
}

function sourcePointToCanvas(coverTransform, point) {
  return Object.freeze({
    x: (point.x - coverTransform.sourceX) * coverTransform.scale,
    y: (point.y - coverTransform.sourceY) * coverTransform.scale
  });
}

function assertVerticalAnchorAlignment(name, transform, imageAnchor, targetAnchor) {
  const renderedY = transform.y + imageAnchor.y * transform.scaleY;
  if (Math.abs(renderedY - targetAnchor.y) > 1) {
    throw new Error(
      `${name} cannot align its fitted ship to the source waterline without clipping`
    );
  }
}

async function loadClientIconShips() {
  return Promise.all(SHIP_STATS.map(async ({ slug }) => ({
    slug,
    label: shipLabelForSlug(slug),
    image: await loadImage(join(
      appRoot,
      `public/assets/vehicles/unity-ships/${slug}-32-headings.png`
    ))
  })));
}

function drawClientIcon(context, canvas, shipSheet, water) {
  const frameSize = 47;
  const sheetColumns = shipSheet.width / frameSize;
  if (!Number.isInteger(sheetColumns)) {
    throw new Error(`Client icon ship sheet width is not divisible by ${frameSize}`);
  }
  const sourceX = CLIENT_ICON_HEADING_FRAME % sheetColumns * frameSize;
  const sourceY = Math.floor(CLIENT_ICON_HEADING_FRAME / sheetColumns) * frameSize;
  if (sourceY + frameSize > shipSheet.height) {
    throw new Error(`Client icon heading frame is outside the ship sheet: ${CLIENT_ICON_HEADING_FRAME}`);
  }
  const frame = createCanvas(frameSize, frameSize);
  const frameContext = frame.getContext("2d");
  frameContext.imageSmoothingEnabled = false;
  frameContext.drawImage(
    shipSheet,
    sourceX,
    sourceY,
    frameSize,
    frameSize,
    0,
    0,
    frameSize,
    frameSize
  );
  const ship = trimTransparentImage(frame);
  const scale = Math.min(27 / ship.width, 27 / ship.height);
  const width = Math.max(1, Math.round(ship.width * scale));
  const height = Math.max(1, Math.round(ship.height * scale));
  const x = Math.round((canvas.width - width) / 2);
  const y = Math.round((canvas.height - height) / 2);

  context.fillStyle = CLIENT_ICON_BACKGROUND;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = false;
  context.drawImage(
    water,
    Math.round((canvas.width - water.width) / 2),
    Math.round((canvas.height - water.height) / 2)
  );
  context.drawImage(ship, x, y, width, height);
  context.strokeStyle = "#d0ae72";
  context.lineWidth = 1;
  context.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
}

async function writeClientIconShipComparison(ships, water) {
  const columns = 5;
  const cellWidth = 180;
  const cellHeight = 130;
  const rows = Math.ceil(ships.length / columns);
  const sheet = createCanvas(columns * cellWidth, rows * cellHeight);
  const context = sheet.getContext("2d");
  context.fillStyle = "#17130f";
  context.fillRect(0, 0, sheet.width, sheet.height);
  context.textAlign = "center";
  context.textBaseline = "top";

  for (let index = 0; index < ships.length; index++) {
    const ship = ships[index];
    const column = index % columns;
    const row = Math.floor(index / columns);
    const cellX = column * cellWidth;
    const cellY = row * cellHeight;
    const icon = createCanvas(32, 32);
    drawClientIcon(icon.getContext("2d"), icon, ship.image, water);

    context.imageSmoothingEnabled = false;
    context.drawImage(icon, cellX + 42, cellY + 7, 96, 96);
    context.fillStyle = "#f0ddb1";
    context.font = fittedComparisonLabelFont(context, ship.label, cellWidth - 16);
    context.fillText(ship.label, cellX + cellWidth / 2, cellY + 108);
  }

  const path = join(outputDir, "client-icon-ship-comparison.png");
  await writeFile(path, sheet.toBuffer("image/png"));
  console.log(`Generated client-icon-ship-comparison.png (${sheet.width}x${sheet.height})`);
}

function fittedComparisonLabelFont(context, label, maxWidth) {
  for (let size = 14; size >= 9; size--) {
    const font = `${size}px sans-serif`;
    context.font = font;
    if (context.measureText(label).width <= maxWidth) return font;
  }
  throw new Error(`Client icon comparison label is too wide: ${label}`);
}

function trimTransparentImage(image) {
  return trimTransparentComposition(image).image;
}

function trimTransparentComposition(image) {
  const bounds = opaqueBounds(image);
  const source = createCanvas(image.width, image.height);
  const context = source.getContext("2d");
  context.drawImage(image, 0, 0);
  const width = bounds.maxX - bounds.minX + 1;
  const height = bounds.maxY - bounds.minY + 1;
  const trimmed = createCanvas(width, height);
  trimmed.getContext("2d").drawImage(
    source,
    bounds.minX,
    bounds.minY,
    width,
    height,
    0,
    0,
    width,
    height
  );
  return Object.freeze({ image: trimmed, bounds });
}

function opaqueBounds(image) {
  const source = createCanvas(image.width, image.height);
  const context = source.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, image.width, image.height).data;
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if (pixels[(y * image.width + x) * 4 + 3] === 0) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX || maxY < minY) {
    throw new Error("Capsule layer composition contains no opaque pixels");
  }
  return Object.freeze({ minX, minY, maxX, maxY });
}

async function writeContactSheet(rendered) {
  const columns = 3;
  const cellWidth = 520;
  const cellHeight = 350;
  const rows = Math.ceil(rendered.length / columns);
  const sheet = createCanvas(columns * cellWidth, rows * cellHeight);
  const context = sheet.getContext("2d");
  context.fillStyle = "#17130f";
  context.fillRect(0, 0, sheet.width, sheet.height);
  context.font = "18px sans-serif";
  context.textBaseline = "top";

  for (let index = 0; index < rendered.length; index++) {
    const { output, canvas } = rendered[index];
    const column = index % columns;
    const row = Math.floor(index / columns);
    const cellX = column * cellWidth;
    const cellY = row * cellHeight;
    const availableWidth = cellWidth - 32;
    const availableHeight = cellHeight - 62;
    const scale = Math.min(
      availableWidth / canvas.width,
      availableHeight / canvas.height
    );
    const width = Math.max(1, Math.round(canvas.width * scale));
    const height = Math.max(1, Math.round(canvas.height * scale));
    const x = cellX + Math.round((cellWidth - width) / 2);
    const y = cellY + 14 + Math.round((availableHeight - height) / 2);
    context.imageSmoothingEnabled = false;
    context.drawImage(canvas, x, y, width, height);
    context.fillStyle = "#f0ddb1";
    context.fillText(
      `${output.name}  ${output.width}x${output.height}`,
      cellX + 16,
      cellY + cellHeight - 34
    );
  }

  const path = join(outputDir, "contact-sheet.png");
  await writeFile(path, sheet.toBuffer("image/png"));
  console.log(`Generated contact-sheet.png (${sheet.width}x${sheet.height})`);
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
