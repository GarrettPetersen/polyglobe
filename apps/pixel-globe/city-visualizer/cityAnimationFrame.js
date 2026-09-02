export const CITY_ANIMATION_PLAYBACK = Object.freeze({
  LOOP: "loop",
  ONCE: "once"
});

export function cityAnimationFrame(frames, elapsedMs, playback = CITY_ANIMATION_PLAYBACK.LOOP) {
  if (!Array.isArray(frames) || frames.length === 0) {
    throw new Error("City animation requires at least one frame");
  }
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
    throw new Error(`Invalid city animation elapsed time: ${elapsedMs}`);
  }
  if (playback !== CITY_ANIMATION_PLAYBACK.LOOP && playback !== CITY_ANIMATION_PLAYBACK.ONCE) {
    throw new Error(`Invalid city animation playback: ${playback}`);
  }
  let durationMs = 0;
  for (const frame of frames) {
    if (!Number.isFinite(frame?.duration) || frame.duration <= 0) {
      throw new Error(`Invalid city animation frame duration: ${frame?.duration}`);
    }
    durationMs += frame.duration;
  }
  if (playback === CITY_ANIMATION_PLAYBACK.ONCE && elapsedMs >= durationMs) {
    return frames[frames.length - 1];
  }
  let remainingMs = elapsedMs % durationMs;
  for (const frame of frames) {
    if (remainingMs < frame.duration) return frame;
    remainingMs -= frame.duration;
  }
  throw new Error("City animation frame resolution exhausted its duration");
}
