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
const paintingPath = join(
  appRoot,
  "capsule_art/source/embarkation-of-henry-viii-at-dover.jpg"
);
const generatorOptions = parseGeneratorOptions(process.argv.slice(2));
const titlePath = resolve(appRoot, generatorOptions.titlePath);
const clientIconWaterPath = join(
  appRoot,
  "public/assets/terrain/resurrect-64/water_depth_03_01.png"
);
const outputDir = resolve(appRoot, generatorOptions.outputDir);
const CLIENT_ICON_SHIP_SLUG = "carrack";
const CLIENT_ICON_HEADING_FRAME = 28;
const CLIENT_ICON_BACKGROUND = "#3b7180";
const PAINTING_GRADE = Object.freeze({
  saturation: 1.34,
  contrast: 1.14,
  shadowDepth: 0.16,
  deepShadowThreshold: 90,
  deepShadowDepth: 0.13
});

function parseGeneratorOptions(args) {
  const options = {
    titlePath: "public/assets/capsule/detailed_title.png",
    outputDir: "capsule_art/generated",
    onlyName: null
  };
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === "--title") {
      options.titlePath = requiredOptionValue(args[++index], "--title");
    } else if (argument.startsWith("--title=")) {
      options.titlePath = requiredOptionValue(argument.slice("--title=".length), "--title");
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

const OUTPUTS = Object.freeze([
  capsule("capsule_header_en.png", 920, 430, {
    titleWidth: 0.52,
    titleCenterX: 0.72,
    titleTop: 0.12
  }),
  capsule("capsule_small_en.png", 462, 174, {
    titleWidth: 0.56,
    titleCenterX: 0.72,
    titleTop: 0.06
  }),
  capsule("capsule_main_en.png", 1232, 706, {
    titleWidth: 0.54,
    titleCenterX: 0.71,
    titleTop: 0.11
  }),
  capsule("capsule_vertical_en.png", 748, 896, {
    focalX: 0.5,
    focalY: 0.48,
    titleWidth: 0.78,
    titleCenterX: 0.5,
    titleTop: 0.07
  }),
  artwork("capsule_background.png", 1438, 810),
  capsule("library_capsule_en.png", 600, 900, {
    focalX: 0.5,
    focalY: 0.47,
    titleWidth: 0.8,
    titleCenterX: 0.5,
    titleTop: 0.06
  }),
  capsule("library_header_en.png", 920, 430, {
    titleWidth: 0.52,
    titleCenterX: 0.72,
    titleTop: 0.12
  }),
  artwork("library_hero.png", 3840, 1240, { focalX: 0.5, focalY: 0.48 }),
  Object.freeze({
    name: "library_logo_en.png",
    width: 1280,
    height: 720,
    kind: "logo"
  }),
  artwork("community_icon_184.png", 184, 184, { focalX: 0.47, focalY: 0.48 }),
  Object.freeze({ name: "client_icon_32.png", width: 32, height: 32, kind: "client-icon" }),
  artwork("shortcut_icon_256.png", 256, 256, { focalX: 0.47, focalY: 0.48 }),
  capsule("event_cover_en.png", 800, 450, {
    titleWidth: 0.58,
    titleCenterX: 0.7,
    titleTop: 0.1
  }),
  capsule("event_header_en.png", 1920, 622, {
    titleWidth: 0.48,
    titleCenterX: 0.72,
    titleTop: 0.08
  }),
  capsule("social_share_en.png", 1200, 630, {
    titleWidth: 0.54,
    titleCenterX: 0.71,
    titleTop: 0.1
  }),
  capsule("itchio_cover_en.png", 630, 500, {
    focalX: 0.5,
    focalY: 0.48,
    titleWidth: 0.76,
    titleCenterX: 0.5,
    titleTop: 0.07
  })
]);

function capsule(name, width, height, options = {}) {
  return Object.freeze({
    name,
    width,
    height,
    kind: "capsule",
    focalX: options.focalX ?? 0.5,
    focalY: options.focalY ?? 0.5,
    titleWidth: options.titleWidth,
    titleCenterX: options.titleCenterX,
    titleTop: options.titleTop
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
  const needsClientIcon = selectedOutputs.some((output) => output.kind === "client-icon");
  const [painting, titleImage] = await Promise.all([
    loadImage(paintingPath),
    loadImage(titlePath)
  ]);
  const clientIconWater = needsClientIcon ? await loadImage(clientIconWaterPath) : null;
  const clientIconShips = needsClientIcon ? await loadClientIconShips() : [];
  const selectedClientIconShip = needsClientIcon
    ? clientIconShips.find((entry) => entry.slug === CLIENT_ICON_SHIP_SLUG)
    : null;
  if (needsClientIcon && !selectedClientIconShip) {
    throw new Error(
      `Client icon ship is absent from the active roster: ${CLIENT_ICON_SHIP_SLUG}`
    );
  }
  const gradedPainting = gradePainting(painting, PAINTING_GRADE);
  const title = trimTransparentImage(titleImage);
  await mkdir(outputDir, { recursive: true });

  const rendered = [];
  for (const output of selectedOutputs) {
    const canvas = createCanvas(output.width, output.height);
    const context = canvas.getContext("2d");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    if (output.kind === "logo") {
      drawLogo(context, canvas, title);
    } else if (output.kind === "client-icon") {
      drawClientIcon(context, canvas, selectedClientIconShip.image, clientIconWater);
    } else {
      drawPainting(context, canvas, gradedPainting, output);
      if (output.kind === "capsule") drawCapsuleTitle(context, canvas, title, output);
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

function drawPainting(context, canvas, image, output) {
  drawCover(
    context,
    canvas,
    image,
    output.focalX,
    output.focalY
  );
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
}

function drawCapsuleTitle(context, canvas, title, output) {
  const maxWidth = canvas.width * output.titleWidth;
  const maxHeight = canvas.height * 0.7;
  const scale = Math.min(maxWidth / title.width, maxHeight / title.height);
  const width = Math.round(title.width * scale);
  const height = Math.round(title.height * scale);
  const x = Math.round(clamp(
    canvas.width * output.titleCenterX - width / 2,
    canvas.width * 0.025,
    canvas.width * 0.975 - width
  ));
  const y = Math.round(canvas.height * output.titleTop);
  drawTitleWithShadow(context, title, x, y, width, height, canvas.width, canvas.height);
}

function drawLogo(context, canvas, title) {
  context.clearRect(0, 0, canvas.width, canvas.height);
  const scale = Math.min(
    canvas.width * 0.9 / title.width,
    canvas.height * 0.86 / title.height
  );
  const width = Math.round(title.width * scale);
  const height = Math.round(title.height * scale);
  const x = Math.round((canvas.width - width) / 2);
  const y = Math.round((canvas.height - height) / 2);
  drawTitleWithShadow(context, title, x, y, width, height, canvas.width, canvas.height);
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

function drawTitleWithShadow(context, title, x, y, width, height, canvasWidth, canvasHeight) {
  const shadowOffset = Math.max(2, Math.round(Math.min(canvasWidth, canvasHeight) * 0.007));

  context.save();
  context.shadowColor = "rgba(0, 0, 0, 0.98)";
  context.shadowBlur = Math.max(1, Math.round(shadowOffset * 0.5));
  context.shadowOffsetX = shadowOffset;
  context.shadowOffsetY = shadowOffset;
  context.drawImage(title, x, y, width, height);
  context.restore();

  context.save();
  context.shadowColor = "rgba(0, 0, 0, 0.82)";
  context.shadowBlur = shadowOffset * 4;
  context.shadowOffsetX = shadowOffset;
  context.shadowOffsetY = shadowOffset;
  context.drawImage(title, x, y, width, height);
  context.restore();
}

function gradePainting(image, grade) {
  const {
    saturation,
    contrast,
    shadowDepth,
    deepShadowThreshold,
    deepShadowDepth
  } = grade;
  if (!Number.isFinite(saturation) || saturation <= 0) {
    throw new Error(`Invalid capsule painting saturation: ${saturation}`);
  }
  if (!Number.isFinite(contrast) || contrast <= 0) {
    throw new Error(`Invalid capsule painting contrast: ${contrast}`);
  }
  if (!Number.isFinite(shadowDepth) || shadowDepth < 0 || shadowDepth > 1) {
    throw new Error(`Invalid capsule painting shadow depth: ${shadowDepth}`);
  }
  if (
    !Number.isFinite(deepShadowThreshold) ||
    deepShadowThreshold <= 0 ||
    deepShadowThreshold > 255
  ) {
    throw new Error(`Invalid capsule painting deep-shadow threshold: ${deepShadowThreshold}`);
  }
  if (!Number.isFinite(deepShadowDepth) || deepShadowDepth < 0 || deepShadowDepth > 1) {
    throw new Error(`Invalid capsule painting deep-shadow depth: ${deepShadowDepth}`);
  }
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const imageData = context.getImageData(0, 0, image.width, image.height);
  const pixels = imageData.data;
  for (let offset = 0; offset < pixels.length; offset += 4) {
    const red = pixels[offset];
    const green = pixels[offset + 1];
    const blue = pixels[offset + 2];
    const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
    const shadowWeight = clamp((128 - luminance) / 128, 0, 1);
    const deepShadowWeight = clamp(
      (deepShadowThreshold - luminance) / deepShadowThreshold,
      0,
      1
    );
    const shadowScale =
      (1 - shadowDepth * shadowWeight) *
      (1 - deepShadowDepth * deepShadowWeight);
    pixels[offset] = gradeChannel(red, luminance, saturation, contrast, shadowScale);
    pixels[offset + 1] = gradeChannel(green, luminance, saturation, contrast, shadowScale);
    pixels[offset + 2] = gradeChannel(blue, luminance, saturation, contrast, shadowScale);
  }
  context.putImageData(imageData, 0, 0);
  return canvas;
}

function gradeChannel(channel, luminance, saturation, contrast, shadowScale) {
  const saturated = luminance + (channel - luminance) * saturation;
  const contrasted = (saturated - 128) * contrast + 128;
  return clampByte(contrasted * shadowScale);
}

function trimTransparentImage(image) {
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
      const alpha = pixels[(y * image.width + x) * 4 + 3];
      if (alpha === 0) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX || maxY < minY) throw new Error("Detailed capsule title contains no opaque pixels");
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const trimmed = createCanvas(width, height);
  trimmed.getContext("2d").drawImage(
    source,
    minX,
    minY,
    width,
    height,
    0,
    0,
    width,
    height
  );
  return trimmed;
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

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
