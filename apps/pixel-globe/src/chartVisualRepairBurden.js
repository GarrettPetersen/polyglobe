const SWELL_PASS_WEIGHT = 0.08;
const PARTIAL_CLOUD_WEIGHT = 0.8;
const FULL_CLOUD_WEIGHT = 3;
const CLOSING_FOG_WEIGHT = 6;
const FOG_DEPTH_WEIGHT = 2;
const VIEWPORT_COVER_WEIGHT = 0.25;

export function chartVisualRepairBurden(stats) {
  if (!stats || typeof stats !== "object" || Array.isArray(stats)) {
    throw new Error("Chart visual repair burden requires repair statistics");
  }
  const values = {};
  for (const key of [
    "swellRepairPasses",
    "cloudBanksStarted",
    "partialCloudBanksStarted",
    "closingFogsStarted",
    "maximumFogDepthRatio",
    "cloudTargetViewportEquivalents"
  ]) {
    const value = stats[key] ?? 0;
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Chart visual repair burden has invalid ${key}: ${value}`);
    }
    values[key] = value;
  }
  if (values.partialCloudBanksStarted > values.cloudBanksStarted) {
    throw new Error("Partial chart cloud count cannot exceed total cloud count");
  }
  const fullCloudBanks = values.cloudBanksStarted - values.partialCloudBanksStarted;
  const score =
    values.swellRepairPasses * SWELL_PASS_WEIGHT +
    values.partialCloudBanksStarted * PARTIAL_CLOUD_WEIGHT +
    fullCloudBanks * FULL_CLOUD_WEIGHT +
    values.closingFogsStarted * CLOSING_FOG_WEIGHT +
    values.maximumFogDepthRatio * FOG_DEPTH_WEIGHT +
    values.cloudTargetViewportEquivalents * VIEWPORT_COVER_WEIGHT;
  return Object.freeze({
    fullCloudBanks,
    burdenScore: Math.round(score * 100) / 100
  });
}
