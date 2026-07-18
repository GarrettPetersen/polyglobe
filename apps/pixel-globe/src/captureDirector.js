export const CAPTURE_AUTOPLAY_QUERY_PARAM = "autocapture";

export function automaticCaptureRequested(search) {
  const params = new URLSearchParams(search);
  const value = params.get(CAPTURE_AUTOPLAY_QUERY_PARAM);
  if (value === null) return false;
  if (value !== "1") {
    throw new Error(`Invalid ${CAPTURE_AUTOPLAY_QUERY_PARAM} query value: ${value}`);
  }
  return true;
}

export function createCaptureDirector(sequence) {
  if (!sequence || typeof sequence !== "object") throw new Error("Capture director needs a sequence");
  if (!Number.isFinite(sequence.durationSeconds) || sequence.durationSeconds <= 0) {
    throw new Error(`Invalid capture sequence duration: ${sequence.durationSeconds}`);
  }
  return {
    sequence,
    elapsedSeconds: 0,
    lastWallClockMs: null,
    firedCues: new Set(),
    stopping: false,
    steeringTarget: null
  };
}

export function advanceCaptureDirectorClock(director, nowMs) {
  if (!director || !(director.firedCues instanceof Set)) throw new Error("Invalid capture director state");
  if (!Number.isFinite(nowMs) || nowMs < 0) throw new Error(`Invalid capture director clock: ${nowMs}`);
  if (director.lastWallClockMs === null) {
    director.lastWallClockMs = nowMs;
    return director.elapsedSeconds;
  }
  if (nowMs < director.lastWallClockMs) {
    throw new Error(`Capture director clock moved backward: ${nowMs} < ${director.lastWallClockMs}`);
  }
  const dt = (nowMs - director.lastWallClockMs) / 1000;
  director.lastWallClockMs = nowMs;
  return advanceCaptureDirector(director, dt);
}

export function advanceCaptureDirector(director, dt) {
  if (!director || !(director.firedCues instanceof Set)) throw new Error("Invalid capture director state");
  if (!Number.isFinite(dt) || dt < 0) throw new Error(`Invalid capture director step: ${dt}`);
  director.elapsedSeconds += dt;
  return director.elapsedSeconds;
}

export function captureDirectorCue(director, cueId, atSeconds) {
  if (!director || !(director.firedCues instanceof Set)) throw new Error("Invalid capture director state");
  if (typeof cueId !== "string" || cueId.trim() === "") throw new Error("Capture cue id is required");
  if (!Number.isFinite(atSeconds) || atSeconds < 0) throw new Error(`Invalid capture cue time: ${atSeconds}`);
  if (director.elapsedSeconds < atSeconds || director.firedCues.has(cueId)) return false;
  director.firedCues.add(cueId);
  return true;
}

export function captureDirectorComplete(director) {
  if (!director || !director.sequence) throw new Error("Invalid capture director state");
  return director.elapsedSeconds >= director.sequence.durationSeconds;
}
