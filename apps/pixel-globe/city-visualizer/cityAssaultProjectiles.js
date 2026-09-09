import { portAssaultProjectileFlightMs } from "../src/portAssaultAttackTiming.js";

export function cityAssaultProjectile(attackType, start, end, ageMs) {
  if (!["arrow", "firearm"].includes(attackType) ||
      ![start?.x, start?.y, end?.x, end?.y, ageMs].every(Number.isFinite)) {
    throw new Error("Invalid city assault projectile geometry");
  }
  const durationMs = portAssaultProjectileFlightMs(attackType);
  if (ageMs < 0 || ageMs >= durationMs) return null;
  const progress = ageMs / durationMs;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const arcHeight = attackType === "arrow" ? Math.min(18, Math.abs(dx) * 0.12) : 0;
  const tangentY = dy - 4 * arcHeight * (1 - 2 * progress);
  const length = Math.hypot(dx, tangentY) || 1;
  const tailLength = attackType === "arrow" ? 7 : 4;
  const head = {
    x: Math.round(start.x + dx * progress),
    y: Math.round(start.y + dy * progress - 4 * arcHeight * progress * (1 - progress))
  };
  return {
    head,
    tail: { x: Math.round(head.x - dx / length * tailLength),
      y: Math.round(head.y - tangentY / length * tailLength) }
  };
}

export function drawCityAssaultProjectile(context, attackType, start, end, ageMs) {
  const projectile = cityAssaultProjectile(attackType, start, end, ageMs);
  if (!projectile) return;
  const { head, tail } = projectile;
  const steps = Math.max(Math.abs(head.x - tail.x), Math.abs(head.y - tail.y), 1);
  // Integer pixels keep thin projectiles legible without antialiased smearing.
  context.fillStyle = "#2e222f";
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(tail.x + (head.x - tail.x) * i / steps);
    const y = Math.round(tail.y + (head.y - tail.y) * i / steps);
    context.fillRect(x, y, 1, 2);
  }
  context.fillStyle = attackType === "arrow" ? "#e8c170" : "#ffffff";
  for (let i = 0; i <= steps; i++) {
    context.fillRect(Math.round(tail.x + (head.x - tail.x) * i / steps),
      Math.round(tail.y + (head.y - tail.y) * i / steps), 1, 1);
  }
  context.fillStyle = "#ffffff";
  context.fillRect(head.x, head.y, attackType === "firearm" ? 2 : 1, 1);
}
