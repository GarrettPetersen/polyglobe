const DEFAULT_RETRY_DELAYS_MS = Object.freeze([250, 750, 1500]);
export const STREAMED_IMAGE_RETRY_DELAYS_MS = Object.freeze([
  250,
  750,
  1500,
  3000,
  6000
]);

export async function loadImageWithRetry({
  src,
  label,
  createImage,
  retryDelaysMs = DEFAULT_RETRY_DELAYS_MS,
  beforeRetry = async () => {},
  sleep = defaultSleep
}) {
  if (typeof src !== "string" || src.length === 0) throw new Error("Image source is required");
  if (typeof label !== "string" || label.length === 0) throw new Error("Image label is required");
  if (typeof createImage !== "function") throw new Error("Image factory is required");
  if (!Array.isArray(retryDelaysMs) || retryDelaysMs.some((delay) => !Number.isFinite(delay) || delay < 0)) {
    throw new Error("Image retry delays must be non-negative numbers");
  }

  let lastError = null;
  const attemptCount = retryDelaysMs.length + 1;
  for (let attempt = 0; attempt < attemptCount; attempt++) {
    if (attempt > 0) {
      await beforeRetry({ attempt, error: lastError });
      await sleep(retryDelaysMs[attempt - 1]);
    }
    try {
      return await loadImageAttempt(createImage, retryImageSource(src, attempt));
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`Failed to load ${label} after ${attemptCount} attempts`, { cause: lastError });
}

function loadImageAttempt(createImage, src) {
  return new Promise((resolve, reject) => {
    const image = createImage();
    image.onload = () => {
      clearImageHandlers(image);
      resolve(image);
    };
    image.onerror = () => {
      clearImageHandlers(image);
      reject(new Error(`Image request failed: ${src}`));
    };
    image.src = src;
  });
}

function retryImageSource(src, attempt) {
  if (attempt === 0) return src;
  return `${src}${src.includes("?") ? "&" : "?"}retry=${attempt}`;
}

function clearImageHandlers(image) {
  image.onload = null;
  image.onerror = null;
}

function defaultSleep(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}
