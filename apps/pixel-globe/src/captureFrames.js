export const AUTOMATIC_CAPTURE_SAMPLE_FPS = 10;

export function createCaptureFrameSampler(frameRate = AUTOMATIC_CAPTURE_SAMPLE_FPS) {
  if (!Number.isFinite(frameRate) || frameRate <= 0) {
    throw new Error(`Invalid capture frame rate: ${frameRate}`);
  }
  return {
    frameRate,
    startedAtMs: null,
    lastBucket: -1,
    frames: []
  };
}

export function startCaptureFrameSampler(sampler, nowMs) {
  validateSampler(sampler);
  if (!Number.isFinite(nowMs) || nowMs < 0) throw new Error(`Invalid capture frame start: ${nowMs}`);
  if (sampler.startedAtMs !== null) throw new Error("Capture frame sampler has already started");
  sampler.startedAtMs = nowMs;
}

export function captureFrameDue(sampler, nowMs) {
  validateSampler(sampler);
  if (sampler.startedAtMs === null) return false;
  if (!Number.isFinite(nowMs) || nowMs < sampler.startedAtMs) {
    throw new Error(`Invalid capture frame time: ${nowMs}`);
  }
  const bucket = Math.floor((nowMs - sampler.startedAtMs) * sampler.frameRate / 1000);
  return bucket > sampler.lastBucket;
}

export function recordCaptureFrame(sampler, nowMs, pngDataUrl) {
  if (!captureFrameDue(sampler, nowMs)) return false;
  if (typeof pngDataUrl !== "string" || !pngDataUrl.startsWith("data:image/png;base64,")) {
    throw new Error("Automatic capture frame must be a PNG data URL");
  }
  const elapsedMs = Math.max(0, Math.round(nowMs - sampler.startedAtMs));
  sampler.lastBucket = Math.floor(elapsedMs * sampler.frameRate / 1000);
  sampler.frames.push({ t: elapsedMs, pngDataUrl });
  return true;
}

export function captureFrameSamplerSnapshot(sampler) {
  validateSampler(sampler);
  if (sampler.startedAtMs === null) throw new Error("Capture frame sampler has not started");
  if (sampler.frames.length < 2) {
    throw new Error(`Automatic capture produced only ${sampler.frames.length} rendered frames`);
  }
  return Object.freeze({
    frameRate: sampler.frameRate,
    frames: sampler.frames.map((frame) => Object.freeze({ ...frame }))
  });
}

function validateSampler(sampler) {
  if (!sampler || !Number.isFinite(sampler.frameRate) || !Array.isArray(sampler.frames)) {
    throw new Error("Invalid capture frame sampler");
  }
}
