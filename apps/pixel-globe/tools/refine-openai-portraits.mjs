import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

import sharp from "sharp";

import {
  RESURRECT_64_HEX,
  nearestResurrect64Hex
} from "../src/waterLatitudePalette.js";
import { cleanPortraitChromaMatte } from "../src/portraitMatteCleanup.js";

const API_BASE_URL = "https://api.retrodiffusion.ai/v1";
const PORTRAIT_SIZE = 64;
const GRID_SIZE = 4;
const MAX_API_SOURCE_SIZE = 640;
const NEURAL_INTERVAL_MS = 6_200;
const DEFAULT_STAGING_DIR = "/tmp/marque-retro-diffusion-portrait-review";
const RESURRECT_SET = new Set(RESURRECT_64_HEX);

const PACKS = Object.freeze([
  pack("indian-ocean", "indian-ocean-1522-source.png", "Indian Ocean Portrait Pack by OpenAI"),
  pack("japanese", "japanese-1522-source.png", "Japanese Portrait Pack by OpenAI"),
  pack("joseon-korean", "joseon-korean-1522-source.png", "Joseon Korean Portrait Pack by OpenAI"),
  pack("ming-chinese", "ming-chinese-1522-source.png", "Ming Chinese Portrait Pack by OpenAI"),
  pack("polynesian", "polynesian-1522-source.png", "Polynesian Portrait Pack by OpenAI"),
  pack("south-asian", "south-asian-1522-source.png", "South Asian Portrait Pack by OpenAI"),
  pack("southeast-asian", "southeast-asian-1522-source.png", "Southeast Asian Portrait Pack by OpenAI"),
  pack("sub-saharan-african", "sub-saharan-african-1522-source.png", "Sub-Saharan African Portrait Pack by OpenAI")
]);

const args = parseArgs(process.argv.slice(2));
const appRoot = resolve(import.meta.dirname, "..");
const stagingRoot = resolve(args.stagingDir);
const apiKey = process.env.RETRO_DIFFUSION_API_KEY;
let lastNeuralStartedAt = 0;

if (!apiKey && !args.reviewOnly && !args.cleanMatte) {
  throw new Error("RETRO_DIFFUSION_API_KEY is required unless --review-only is used");
}

await main();

function pack(slug, sourceFilename, productionDirectory) {
  return Object.freeze({ slug, sourceFilename, productionDirectory });
}

async function main() {
  mkdirSync(stagingRoot, { recursive: true });
  const allJobs = await buildJobs();
  if (args.cleanMatte) {
    await cleanProductionPortraits(allJobs);
    await rebuildProductionSheets();
    return;
  }
  const palettePng = await resurrectPalettePng();
  const selectedJobs = args.id === null ? allJobs : allJobs.filter((job) => job.id === args.id);
  if (args.id !== null && selectedJobs.length !== 1) throw new Error(`Unknown portrait id: ${args.id}`);
  const jobs = args.limit === null ? selectedJobs : selectedJobs.slice(0, args.limit);
  const results = [];

  for (let index = 0; index < jobs.length; index += 1) {
    const job = jobs[index];
    const neuralPath = join(stagingRoot, "neural", `${job.id}.png`);
    const nearestPath = join(stagingRoot, "candidates-nearest", `${job.id}.png`);
    const rdPalettePath = join(stagingRoot, "candidates-rd-palette", `${job.id}.png`);
    const preparedPath = join(stagingRoot, "prepared", `${job.id}.png`);
    mkdirSync(dirname(neuralPath), { recursive: true });
    mkdirSync(dirname(nearestPath), { recursive: true });
    mkdirSync(dirname(rdPalettePath), { recursive: true });
    mkdirSync(dirname(preparedPath), { recursive: true });

    if ((!existsSync(nearestPath) || !existsSync(rdPalettePath)) && !args.reviewOnly) {
      const prepared = await prepareSource(job);
      await sharp(prepared.data, {
        raw: { width: prepared.width, height: prepared.height, channels: 4 }
      }).png().toFile(preparedPath);
      const fixed = existsSync(neuralPath)
        ? readFileSync(neuralPath)
        : await neuralFix(readFileSync(preparedPath));
      if (!existsSync(neuralPath)) writeFileSync(neuralPath, fixed);
      if (!existsSync(nearestPath)) await normalizeNearestCandidate(fixed, nearestPath);
      if (!existsSync(rdPalettePath)) {
        const converted = await convertPalette(fixed, palettePng);
        await normalizePaletteCandidate(converted, rdPalettePath);
      }
    }

    if (!existsSync(nearestPath) || !existsSync(rdPalettePath)) {
      throw new Error(`Missing candidate variants for ${job.id}`);
    }

    const prepared = existsSync(preparedPath)
      ? await readRgba(preparedPath)
      : await prepareSource(job);
    const metrics = await compareCandidates(job, prepared, { nearestPath, rdPalettePath });
    results.push({ ...jobReport(job), metrics });
    console.log(
      `[${String(index + 1).padStart(3, " ")}/${jobs.length}] ${job.id}: ` +
      `${metrics.recommendation} (current ${metrics.current.cost.toFixed(4)}, ` +
      `nearest ${metrics.nearest.cost.toFixed(4)}, RD palette ${metrics.rdPalette.cost.toFixed(4)})`
    );
  }

  const reportPath = join(stagingRoot, "report.json");
  writeFileSync(reportPath, `${JSON.stringify({ version: 1, results }, null, 2)}\n`);
  await buildReviewSheets(jobs, results);

  if (args.applyVariant !== null || args.applyRecommended) {
    applyCandidates(jobs, results, args.applyVariant);
    await cleanProductionPortraits(jobs);
    await rebuildProductionSheets();
  }

  console.log(`Report: ${reportPath}`);
  console.log(`Review sheets: ${join(stagingRoot, "review")}`);
}

async function buildJobs() {
  const jobs = [];
  for (const packConfig of PACKS) {
    const sourcePath = join(appRoot, "assets-source", "characters", "openai", packConfig.sourceFilename);
    const metadata = await sharp(sourcePath).metadata();
    if (!metadata.width || !metadata.height || Math.abs(metadata.width - metadata.height) > 2) {
      throw new Error(`OpenAI portrait sheet must be square: ${sourcePath}`);
    }
    const sourceRects = await detectGridRects(sourcePath, metadata.width, metadata.height);
    for (let row = 0; row < GRID_SIZE; row += 1) {
      for (let column = 0; column < GRID_SIZE; column += 1) {
        const number = row * GRID_SIZE + column + 1;
        const filename = `${packConfig.slug}-${String(number).padStart(2, "0")}.png`;
        jobs.push({
          id: `${packConfig.slug}-${String(number).padStart(2, "0")}`,
          group: packConfig.slug,
          sourcePath,
          productionPath: join(appRoot, "public", "assets", "characters", packConfig.productionDirectory, filename),
          sourceRect: sourceRects[row * GRID_SIZE + column]
        });
      }
    }
  }

  const otterSource = join(appRoot, "assets-source", "animals", "openai", "otter-source.png");
  if (existsSync(otterSource)) {
    const metadata = await sharp(otterSource).metadata();
    jobs.push({
      id: "otter",
      group: "animals",
      sourcePath: otterSource,
      productionPath: join(appRoot, "public", "assets", "animals", "portraits", "otter.png"),
      sourceRect: { left: 0, top: 0, width: metadata.width, height: metadata.height }
    });
  }
  return jobs;
}

async function detectGridRects(sourcePath, width, height) {
  const { data } = await sharp(sourcePath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const columnOccupancy = new Uint32Array(width);
  const rowOccupancy = new Uint32Array(height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 3;
      if (isChromaGreen(data[offset], data[offset + 1], data[offset + 2])) continue;
      columnOccupancy[x] += 1;
      rowOccupancy[y] += 1;
    }
  }
  const xCuts = detectGutterCuts(columnOccupancy, width, basename(sourcePath), "column");
  const yCuts = detectGutterCuts(rowOccupancy, height, basename(sourcePath), "row");
  const xBounds = [0, ...xCuts, width];
  const yBounds = [0, ...yCuts, height];
  const rects = [];
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let column = 0; column < GRID_SIZE; column += 1) {
      rects.push({
        left: xBounds[column],
        top: yBounds[row],
        width: xBounds[column + 1] - xBounds[column],
        height: yBounds[row + 1] - yBounds[row]
      });
    }
  }
  console.log(`${basename(sourcePath)} gutters: x=${xCuts.join(",")} y=${yCuts.join(",")}`);
  return rects;
}

function detectGutterCuts(occupancy, length, label, axis) {
  const cuts = [];
  const searchRadius = Math.round(length * 0.1);
  for (let quarter = 1; quarter < GRID_SIZE; quarter += 1) {
    const target = Math.round((quarter * length) / GRID_SIZE);
    const start = Math.max(1, target - searchRadius);
    const end = Math.min(length - 2, target + searchRadius);
    let minimum = Infinity;
    for (let position = start; position <= end; position += 1) {
      minimum = Math.min(minimum, occupancy[position]);
    }
    const threshold = minimum + Math.max(1, Math.floor(minimum * 0.08));
    const runs = [];
    let runStart = null;
    for (let position = start; position <= end + 1; position += 1) {
      const inGutter = position <= end && occupancy[position] <= threshold;
      if (inGutter && runStart === null) runStart = position;
      if (!inGutter && runStart !== null) {
        runs.push({ start: runStart, end: position - 1 });
        runStart = null;
      }
    }
    if (runs.length === 0) throw new Error(`${label} has no detectable ${axis} gutter near ${target}`);
    runs.sort((first, second) => {
      const firstWidth = first.end - first.start;
      const secondWidth = second.end - second.start;
      if (firstWidth !== secondWidth) return secondWidth - firstWidth;
      const firstCenter = (first.start + first.end) / 2;
      const secondCenter = (second.start + second.end) / 2;
      return Math.abs(firstCenter - target) - Math.abs(secondCenter - target);
    });
    cuts.push(Math.round((runs[0].start + runs[0].end) / 2));
  }
  if (new Set(cuts).size !== GRID_SIZE - 1 || cuts.some((cut, index) => index > 0 && cut <= cuts[index - 1])) {
    throw new Error(`${label} produced invalid ${axis} gutters: ${cuts.join(",")}`);
  }
  return cuts;
}

async function prepareSource(job) {
  const { data, info } = await sharp(job.sourcePath)
    .extract(job.sourceRect)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const cleaned = Buffer.from(data);
  const mask = new Uint8Array(info.width * info.height);

  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    const offset = pixel * 4;
    const red = cleaned[offset];
    const green = cleaned[offset + 1];
    const blue = cleaned[offset + 2];
    const visible = cleaned[offset + 3] >= 128 && !isChromaGreen(red, green, blue);
    mask[pixel] = visible ? 1 : 0;
    cleaned[offset + 3] = visible ? 255 : 0;
    if (!visible) {
      cleaned[offset] = 0;
      cleaned[offset + 1] = 0;
      cleaned[offset + 2] = 0;
    }
  }

  removeDetachedEdgeFragments(cleaned, mask, info.width, info.height, job.id);
  return constrainPreparedSource(frameSourceSilhouette(cleaned, mask, info.width, info.height, job.id));
}

function isChromaGreen(red, green, blue) {
  return green >= 150 && green - red >= 60 && green - blue >= 60;
}

function removeDetachedEdgeFragments(data, mask, width, height, id) {
  const components = connectedComponents(mask, width, height);
  if (components.length === 0) throw new Error(`${id} has no visible source silhouette`);
  components.sort((a, b) => b.pixels.length - a.pixels.length);
  const primary = components[0];
  if (primary.pixels.length < width * height * 0.08) {
    throw new Error(`${id} source silhouette is implausibly small: ${primary.pixels.length}px`);
  }

  for (const component of components.slice(1)) {
    if (!component.touchesEdge) continue;
    for (const pixel of component.pixels) {
      mask[pixel] = 0;
      const offset = pixel * 4;
      data[offset] = 0;
      data[offset + 1] = 0;
      data[offset + 2] = 0;
      data[offset + 3] = 0;
    }
  }
}

function frameSourceSilhouette(data, mask, width, height, id) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    if (!mask[pixel]) continue;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  if (maxX < minX || maxY < minY) throw new Error(`${id} has an empty cleaned silhouette`);
  const subjectWidth = maxX - minX + 1;
  const subjectHeight = maxY - minY + 1;
  const margin = Math.max(4, Math.round(Math.max(subjectWidth, subjectHeight) * 0.025));
  const side = Math.max(subjectWidth + margin * 2, subjectHeight + margin * 2);
  const framed = Buffer.alloc(side * side * 4);
  const targetLeft = Math.floor((side - subjectWidth) / 2);
  const targetTop = side - margin - subjectHeight;
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const sourcePixel = y * width + x;
      if (!mask[sourcePixel]) continue;
      const sourceOffset = sourcePixel * 4;
      const targetX = targetLeft + x - minX;
      const targetY = targetTop + y - minY;
      const targetOffset = (targetY * side + targetX) * 4;
      data.copy(framed, targetOffset, sourceOffset, sourceOffset + 4);
    }
  }
  return { data: framed, width: side, height: side };
}

async function constrainPreparedSource(prepared) {
  if (prepared.width <= MAX_API_SOURCE_SIZE && prepared.height <= MAX_API_SOURCE_SIZE) return prepared;
  const { data, info } = await sharp(prepared.data, {
    raw: { width: prepared.width, height: prepared.height, channels: 4 }
  })
    .resize(MAX_API_SOURCE_SIZE, MAX_API_SOURCE_SIZE, { fit: "inside", kernel: "lanczos3" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

function connectedComponents(mask, width, height) {
  const seen = new Uint8Array(mask.length);
  const components = [];
  const queue = new Int32Array(mask.length);
  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || seen[start]) continue;
    let read = 0;
    let write = 1;
    queue[0] = start;
    seen[start] = 1;
    const pixels = [];
    let touchesEdge = false;
    while (read < write) {
      const pixel = queue[read++];
      pixels.push(pixel);
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) touchesEdge = true;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const neighbor = ny * width + nx;
          if (!mask[neighbor] || seen[neighbor]) continue;
          seen[neighbor] = 1;
          queue[write++] = neighbor;
        }
      }
    }
    components.push({ pixels, touchesEdge });
  }
  return components;
}

async function neuralFix(inputPng) {
  const elapsed = Date.now() - lastNeuralStartedAt;
  if (elapsed < NEURAL_INTERVAL_MS) await sleep(NEURAL_INTERVAL_MS - elapsed);
  lastNeuralStartedAt = Date.now();
  const response = await postJsonWithRetry(`${API_BASE_URL}/pixel-fixer/neural`, {
    input_image: inputPng.toString("base64"),
    width: PORTRAIT_SIZE,
    height: PORTRAIT_SIZE
  });
  if (!Array.isArray(response.base64_images) || response.base64_images.length !== 1) {
    throw new Error("Retro Diffusion neural fixer returned an unexpected image count");
  }
  return decodeBase64Image(response.base64_images[0]);
}

async function convertPalette(inputPng, palettePng) {
  const response = await postJsonWithRetry(`${API_BASE_URL}/edit/tools/palette_converter`, {
    input_image: inputPng.toString("base64"),
    input_palette: palettePng.toString("base64"),
    dither_mode: "none",
    dither_strength: 0
  });
  if (!Array.isArray(response.base64_images) || response.base64_images.length !== 1) {
    throw new Error("Retro Diffusion palette converter returned an unexpected image count");
  }
  return decodeBase64Image(response.base64_images[0]);
}

async function postJsonWithRetry(url, payload) {
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-RD-Token": apiKey
      },
      body: JSON.stringify(payload)
    });
    if (response.ok) return response.json();
    const body = await response.text();
    const transient = response.status === 429 || response.status === 502 || response.status === 503 || response.status === 504;
    if (!transient || attempt === 6) {
      throw new Error(`Retro Diffusion HTTP ${response.status}: ${body.slice(0, 500)}`);
    }
    const retrySeconds = Number(response.headers.get("retry-after")) || Math.min(30, 4 * attempt);
    await sleep(retrySeconds * 1_000);
  }
  throw new Error("Retro Diffusion retry loop exhausted");
}

function decodeBase64Image(value) {
  return Buffer.from(value.includes(",") ? value.split(",", 2)[1] : value, "base64");
}

async function normalizePaletteCandidate(inputPng, outputPath) {
  const { data, info } = await sharp(inputPng)
    .resize(PORTRAIT_SIZE, PORTRAIT_SIZE, { fit: "fill", kernel: "nearest" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let opaque = 0;
  for (let offset = 0; offset < data.length; offset += 4) {
    if (data[offset + 3] < 128) {
      data[offset] = 0;
      data[offset + 1] = 0;
      data[offset + 2] = 0;
      data[offset + 3] = 0;
      continue;
    }
    const hex = rgbHex(data[offset], data[offset + 1], data[offset + 2]);
    if (!RESURRECT_SET.has(hex)) {
      throw new Error(`Retro Diffusion returned non-Resurrect color #${hex}`);
    }
    data[offset + 3] = 255;
    opaque += 1;
  }
  if (opaque < 450 || opaque > 3_700) {
    throw new Error(`Candidate has implausible opaque coverage: ${opaque}px`);
  }
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toFile(outputPath);
}

async function normalizeNearestCandidate(inputPng, outputPath) {
  const { data, info } = await sharp(inputPng)
    .resize(PORTRAIT_SIZE, PORTRAIT_SIZE, { fit: "fill", kernel: "nearest" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let opaque = 0;
  for (let offset = 0; offset < data.length; offset += 4) {
    if (data[offset + 3] < 128) {
      data[offset] = 0;
      data[offset + 1] = 0;
      data[offset + 2] = 0;
      data[offset + 3] = 0;
      continue;
    }
    const target = nearestResurrect64Hex(data[offset], data[offset + 1], data[offset + 2]);
    data[offset] = Number.parseInt(target.slice(0, 2), 16);
    data[offset + 1] = Number.parseInt(target.slice(2, 4), 16);
    data[offset + 2] = Number.parseInt(target.slice(4, 6), 16);
    data[offset + 3] = 255;
    opaque += 1;
  }
  if (opaque < 450 || opaque > 3_700) {
    throw new Error(`Nearest-palette candidate has implausible opaque coverage: ${opaque}px`);
  }
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toFile(outputPath);
}

async function compareCandidates(job, prepared, paths) {
  const reference = await referencePortrait(prepared);
  const current = await readRgba(job.productionPath);
  const nearest = await readRgba(paths.nearestPath);
  const rdPalette = await readRgba(paths.rdPalettePath);
  assertPortrait(current, `${job.id} current`);
  assertPortrait(nearest, `${job.id} nearest-palette candidate`);
  assertPortrait(rdPalette, `${job.id} RD-palette candidate`);
  const currentMetrics = candidateMetrics(current, reference);
  const nearestMetrics = candidateMetrics(nearest, reference);
  const rdPaletteMetrics = candidateMetrics(rdPalette, reference);
  const variants = [
    { id: "nearest", metrics: nearestMetrics },
    { id: "rd-palette", metrics: rdPaletteMetrics }
  ].filter((variant) => isSafeImprovement(variant.metrics, currentMetrics));
  variants.sort((first, second) => first.metrics.cost - second.metrics.cost);
  const recommendation = variants[0]?.id ?? "current";
  return {
    recommendation,
    current: currentMetrics,
    nearest: nearestMetrics,
    rdPalette: rdPaletteMetrics
  };
}

function isSafeImprovement(candidate, current) {
  const coverageRatio = candidate.opaquePixels / current.opaquePixels;
  const silhouetteFloor = Math.max(0.78, current.alphaIou - 0.045);
  const structurallySafe = candidate.alphaIou >= silhouetteFloor && coverageRatio >= 0.82 && coverageRatio <= 1.2;
  const meaningfullyCleaner = candidate.noiseDensity <= current.noiseDensity * 0.97;
  const fidelitySafe = candidate.colorError <= current.colorError * 1.22;
  const lowerCost = candidate.cost < current.cost * 0.985;
  return structurallySafe && fidelitySafe && (meaningfullyCleaner || lowerCost);
}

async function referencePortrait(prepared) {
  const { data, info } = await sharp(prepared.data, {
    raw: { width: prepared.width, height: prepared.height, channels: 4 }
  })
    .resize(PORTRAIT_SIZE, PORTRAIT_SIZE, { fit: "fill", kernel: "lanczos3" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let offset = 0; offset < data.length; offset += 4) {
    if (data[offset + 3] < 128) {
      data[offset] = 0;
      data[offset + 1] = 0;
      data[offset + 2] = 0;
      data[offset + 3] = 0;
      continue;
    }
    const target = nearestResurrect64Hex(data[offset], data[offset + 1], data[offset + 2]);
    data[offset] = Number.parseInt(target.slice(0, 2), 16);
    data[offset + 1] = Number.parseInt(target.slice(2, 4), 16);
    data[offset + 2] = Number.parseInt(target.slice(4, 6), 16);
    data[offset + 3] = 255;
  }
  return { data, width: info.width, height: info.height };
}

function candidateMetrics(image, reference) {
  let intersection = 0;
  let union = 0;
  let opaquePixels = 0;
  let colorError = 0;
  let comparedColors = 0;
  for (let offset = 0; offset < image.data.length; offset += 4) {
    const visible = image.data[offset + 3] === 255;
    const referenceVisible = reference.data[offset + 3] === 255;
    if (visible) opaquePixels += 1;
    if (visible && referenceVisible) {
      intersection += 1;
      const red = image.data[offset] - reference.data[offset];
      const green = image.data[offset + 1] - reference.data[offset + 1];
      const blue = image.data[offset + 2] - reference.data[offset + 2];
      colorError += (red * red + green * green + blue * blue) / (3 * 255 * 255);
      comparedColors += 1;
    }
    if (visible || referenceVisible) union += 1;
  }
  colorError = comparedColors > 0 ? colorError / comparedColors : 1;
  const alphaIou = union > 0 ? intersection / union : 0;
  const noise = pixelNoise(image);
  const noiseDensity = (noise.tinyColorPixels * 2 + noise.transitions * 0.12) / Math.max(1, opaquePixels);
  const cost = colorError * 0.56 + (1 - alphaIou) * 0.34 + noiseDensity * 0.1;
  return {
    alphaIou,
    colorError,
    cost,
    opaquePixels,
    noiseDensity,
    ...noise
  };
}

function pixelNoise(image) {
  const width = image.width;
  const height = image.height;
  const seen = new Uint8Array(width * height);
  let transitions = 0;
  let tinyColorPixels = 0;
  let paletteSize = 0;
  const palette = new Set();
  const queue = new Int32Array(width * height);

  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const offset = pixel * 4;
    if (image.data[offset + 3] !== 255) continue;
    const color = rgbHex(image.data[offset], image.data[offset + 1], image.data[offset + 2]);
    palette.add(color);
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    if (x + 1 < width && differentOpaqueColor(image.data, offset, offset + 4)) transitions += 1;
    if (y + 1 < height && differentOpaqueColor(image.data, offset, offset + width * 4)) transitions += 1;
    if (seen[pixel]) continue;
    let read = 0;
    let write = 1;
    queue[0] = pixel;
    seen[pixel] = 1;
    while (read < write) {
      const current = queue[read++];
      const cx = current % width;
      const cy = Math.floor(current / width);
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const neighbor = ny * width + nx;
        if (seen[neighbor]) continue;
        const neighborOffset = neighbor * 4;
        if (image.data[neighborOffset + 3] !== 255) continue;
        if (rgbHex(image.data[neighborOffset], image.data[neighborOffset + 1], image.data[neighborOffset + 2]) !== color) continue;
        seen[neighbor] = 1;
        queue[write++] = neighbor;
      }
    }
    if (write <= 2) tinyColorPixels += write;
  }
  paletteSize = palette.size;
  return { paletteSize, tinyColorPixels, transitions };
}

function differentOpaqueColor(data, first, second) {
  return data[second + 3] === 255 && (
    data[first] !== data[second] ||
    data[first + 1] !== data[second + 1] ||
    data[first + 2] !== data[second + 2]
  );
}

async function readRgba(path) {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

function assertPortrait(image, label) {
  if (image.width !== PORTRAIT_SIZE || image.height !== PORTRAIT_SIZE) {
    throw new Error(`${label} must be ${PORTRAIT_SIZE}x${PORTRAIT_SIZE}, got ${image.width}x${image.height}`);
  }
  for (let offset = 0; offset < image.data.length; offset += 4) {
    const alpha = image.data[offset + 3];
    if (alpha !== 0 && alpha !== 255) throw new Error(`${label} has non-binary alpha ${alpha}`);
    if (alpha === 0) continue;
    const hex = rgbHex(image.data[offset], image.data[offset + 1], image.data[offset + 2]);
    if (!RESURRECT_SET.has(hex)) throw new Error(`${label} has non-Resurrect color #${hex}`);
  }
}

async function resurrectPalettePng() {
  const data = Buffer.alloc(RESURRECT_64_HEX.length * 3);
  for (let index = 0; index < RESURRECT_64_HEX.length; index += 1) {
    const hex = RESURRECT_64_HEX[index];
    data[index * 3] = Number.parseInt(hex.slice(0, 2), 16);
    data[index * 3 + 1] = Number.parseInt(hex.slice(2, 4), 16);
    data[index * 3 + 2] = Number.parseInt(hex.slice(4, 6), 16);
  }
  return sharp(data, { raw: { width: 8, height: 8, channels: 3 } }).png().toBuffer();
}

async function buildReviewSheets(jobs, results) {
  const resultById = new Map(results.map((result) => [result.id, result]));
  for (const group of [...new Set(jobs.map((job) => job.group))]) {
    const groupJobs = jobs.filter((job) => job.group === group);
    const columns = group === "animals" ? 1 : 4;
    const rows = Math.ceil(groupJobs.length / columns);
    const pairWidth = PORTRAIT_SIZE * 3 + 4;
    const pairHeight = PORTRAIT_SIZE + 3;
    const width = columns * pairWidth;
    const height = rows * pairHeight;
    const background = checkerboard(width, height);
    const composites = [];
    for (let index = 0; index < groupJobs.length; index += 1) {
      const job = groupJobs[index];
      const column = index % columns;
      const row = Math.floor(index / columns);
      const left = column * pairWidth;
      const top = row * pairHeight;
      composites.push({ input: job.productionPath, left, top });
      composites.push({ input: join(stagingRoot, "candidates-nearest", `${job.id}.png`), left: left + PORTRAIT_SIZE + 1, top });
      composites.push({ input: join(stagingRoot, "candidates-rd-palette", `${job.id}.png`), left: left + PORTRAIT_SIZE * 2 + 2, top });
      const recommendation = resultById.get(job.id).metrics.recommendation;
      const marker = Buffer.from(recommendation === "current" ? [234, 79, 54, 255] : [30, 188, 115, 255]);
      const markerLeft = recommendation === "nearest"
        ? left + PORTRAIT_SIZE + 1
        : recommendation === "rd-palette"
          ? left + PORTRAIT_SIZE * 2 + 2
          : left;
      composites.push({
        input: marker,
        raw: { width: 1, height: 1, channels: 4 },
        left: markerLeft,
        top: top + PORTRAIT_SIZE
      });
    }
    const outputPath = join(stagingRoot, "review", `${group}-current-nearest-rd-palette.png`);
    mkdirSync(dirname(outputPath), { recursive: true });
    const assembled = await sharp(background, { raw: { width, height, channels: 4 } })
      .composite(composites)
      .png()
      .toBuffer();
    await sharp(assembled)
      .resize(width * 4, height * 4, { kernel: "nearest" })
      .png()
      .toFile(outputPath);
  }
}

function checkerboard(width, height) {
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const shade = (Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0 ? 52 : 74;
      const offset = (y * width + x) * 4;
      data[offset] = shade;
      data[offset + 1] = shade;
      data[offset + 2] = shade;
      data[offset + 3] = 255;
    }
  }
  return data;
}

function applyCandidates(jobs, results, fixedVariant) {
  const resultById = new Map(results.map((result) => [result.id, result]));
  let applied = 0;
  for (const job of jobs) {
    const recommendation = fixedVariant ?? resultById.get(job.id).metrics.recommendation;
    if (recommendation === "current") continue;
    const directory = recommendation === "nearest" ? "candidates-nearest" : "candidates-rd-palette";
    copyFileSync(join(stagingRoot, directory, `${job.id}.png`), job.productionPath);
    applied += 1;
  }
  console.log(`Applied ${applied} ${fixedVariant ?? "recommended"} portrait refinements`);
}

async function cleanProductionPortraits(jobs) {
  let changedPortraits = 0;
  let changedPixels = 0;
  for (const job of jobs) {
    const image = await readRgba(job.productionPath);
    assertPortrait(image, `${job.id} production portrait`);
    const cleaned = cleanPortraitChromaMatte(image);
    if (cleaned.changedPixels === 0) continue;
    await sharp(cleaned.data, {
      raw: { width: image.width, height: image.height, channels: 4 }
    }).png().toFile(job.productionPath);
    changedPortraits += 1;
    changedPixels += cleaned.changedPixels;
  }
  console.log(`Cleaned ${changedPixels} chroma-matte pixels from ${changedPortraits} portraits`);
}

async function rebuildProductionSheets() {
  for (const packConfig of PACKS) {
    const directory = join(appRoot, "public", "assets", "characters", packConfig.productionDirectory);
    const composites = [];
    for (let index = 0; index < GRID_SIZE * GRID_SIZE; index += 1) {
      const filename = `${packConfig.slug}-${String(index + 1).padStart(2, "0")}.png`;
      composites.push({
        input: join(directory, filename),
        left: (index % GRID_SIZE) * PORTRAIT_SIZE,
        top: Math.floor(index / GRID_SIZE) * PORTRAIT_SIZE
      });
    }
    await sharp({
      create: {
        width: GRID_SIZE * PORTRAIT_SIZE,
        height: GRID_SIZE * PORTRAIT_SIZE,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite(composites)
      .png()
      .toFile(join(directory, `${packConfig.slug}-sheet.png`));
  }
}

function jobReport(job) {
  return {
    id: job.id,
    group: job.group,
    source: job.sourcePath.slice(appRoot.length + 1),
    production: job.productionPath.slice(appRoot.length + 1),
    nearestCandidate: join(stagingRoot, "candidates-nearest", `${job.id}.png`),
    rdPaletteCandidate: join(stagingRoot, "candidates-rd-palette", `${job.id}.png`)
  };
}

function parseArgs(values) {
  const options = {
    applyRecommended: false,
    applyVariant: null,
    id: null,
    limit: null,
    reviewOnly: false,
    cleanMatte: false,
    stagingDir: DEFAULT_STAGING_DIR
  };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--apply-recommended") options.applyRecommended = true;
    else if (value === "--clean-matte") options.cleanMatte = true;
    else if (value === "--apply-variant") options.applyVariant = values[++index];
    else if (value === "--id") options.id = values[++index];
    else if (value === "--limit") options.limit = Number.parseInt(values[++index], 10);
    else if (value === "--review-only") options.reviewOnly = true;
    else if (value === "--staging-dir") options.stagingDir = values[++index];
    else throw new Error(`Unknown argument: ${value}`);
  }
  if (!options.stagingDir) throw new Error("--staging-dir requires a path");
  if (options.applyRecommended && options.applyVariant !== null) {
    throw new Error("Use either --apply-recommended or --apply-variant, not both");
  }
  if (options.cleanMatte && (options.applyRecommended || options.applyVariant !== null || options.id !== null)) {
    throw new Error("--clean-matte cannot be combined with candidate selection");
  }
  if (options.applyVariant !== null && !["nearest", "rd-palette"].includes(options.applyVariant)) {
    throw new Error("--apply-variant requires nearest or rd-palette");
  }
  if (options.id !== null && !options.id) throw new Error("--id requires a portrait id");
  if (options.limit !== null && (!Number.isInteger(options.limit) || options.limit <= 0)) {
    throw new Error("--limit requires a positive integer");
  }
  return options;
}

function rgbHex(red, green, blue) {
  return [red, green, blue].map((channel) => channel.toString(16).padStart(2, "0")).join("");
}

function sleep(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}
