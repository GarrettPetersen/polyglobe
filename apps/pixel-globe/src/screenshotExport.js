import { downloadBlob } from "./browserDownload.js";

export const SHARE_SCREENSHOT_SCALE = 5;

export function createShareScreenshotCanvas(sourceCanvas, options = {}) {
  validateSourceCanvas(sourceCanvas);
  const scale = options.scale ?? SHARE_SCREENSHOT_SCALE;
  if (!Number.isInteger(scale) || scale < 1) {
    throw new Error(`Share screenshot requires a positive integer scale: ${scale}`);
  }
  const createCanvas = options.createCanvas ?? (() => document.createElement("canvas"));
  const output = createCanvas();
  output.width = sourceCanvas.width * scale;
  output.height = sourceCanvas.height * scale;
  const outputCtx = output.getContext("2d");
  if (!outputCtx) throw new Error("Could not create share screenshot canvas context");
  outputCtx.imageSmoothingEnabled = false;
  outputCtx.drawImage(sourceCanvas, 0, 0, output.width, output.height);
  return output;
}

export async function saveShareScreenshot(sourceCanvas, options = {}) {
  const output = createShareScreenshotCanvas(sourceCanvas, options);
  const blob = await canvasPngBlob(output);
  const filename = shareScreenshotFilename(options.now ?? new Date());
  const download = options.download ?? downloadBlob;
  download(blob, filename);
  return Object.freeze({ filename, width: output.width, height: output.height });
}

export function shareScreenshotFilename(now) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new Error("Share screenshot filename requires a valid date");
  }
  return `marque-and-reprisal-${now.toISOString().replace(/[:.]/g, "-")}.png`;
}

function canvasPngBlob(canvas) {
  if (typeof canvas.toBlob !== "function") throw new Error("PNG canvas export is unavailable");
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Browser returned an empty screenshot PNG"));
    }, "image/png");
  });
}

function validateSourceCanvas(canvas) {
  if (
    !canvas ||
    !Number.isInteger(canvas.width) ||
    !Number.isInteger(canvas.height) ||
    canvas.width <= 0 ||
    canvas.height <= 0
  ) {
    throw new Error("Share screenshot requires a non-empty canvas");
  }
}
