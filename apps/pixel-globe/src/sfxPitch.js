export const SFX_PITCH_VARIATION_CENTS = 32;

export function randomizedSfxPlaybackRate(baseRate = 1, random = Math.random) {
  if (!Number.isFinite(baseRate) || baseRate <= 0) {
    throw new Error(`Invalid SFX base playback rate: ${baseRate}`);
  }
  if (typeof random !== "function") throw new Error("SFX pitch variation requires a random function");
  const sample = random();
  if (!Number.isFinite(sample) || sample < 0 || sample > 1) {
    throw new Error(`Invalid SFX pitch sample: ${sample}`);
  }
  const cents = (sample * 2 - 1) * SFX_PITCH_VARIATION_CENTS;
  return baseRate * 2 ** (cents / 1200);
}
