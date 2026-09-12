// Only the velocity perpendicular to the shore contributes to the impact.
// Repeated contacts are one scrape; narrow waterways need a longer quiet gap.
export function landCollisionSoundVolume({ velocityRad, normal, topSpeedRad, nowMs, lastContactAtMs, isRiver = false }) {
  if (typeof isRiver !== "boolean" || !Array.isArray(velocityRad) || velocityRad.length !== 3 || !velocityRad.every(Number.isFinite) ||
      !Array.isArray(normal) || normal.length !== 3 || !normal.every(Number.isFinite) ||
      !Number.isFinite(topSpeedRad) || topSpeedRad <= 0 || !Number.isFinite(nowMs) ||
      (lastContactAtMs !== null && (!Number.isFinite(lastContactAtMs) || lastContactAtMs > nowMs))) {
    throw new Error("Invalid land-collision sound velocity or clock");
  }
  const normalLength = Math.hypot(...normal);
  if (normalLength === 0) throw new Error("Land-collision sound requires a nonzero contact normal");
  if (lastContactAtMs !== null && nowMs - lastContactAtMs < (isRiver ? 2500 : 300)) return 0;
  const impactSpeedRad = Math.abs(velocityRad.reduce((sum, value, index) => sum + value * normal[index], 0)) / normalLength;
  const speedRatio = Math.min(1, impactSpeedRad / topSpeedRad);
  if (speedRatio < 0.04) return 0;
  return (0.1 + 0.55 * speedRatio ** 0.7) * (isRiver ? 0.08 : 1);
}
