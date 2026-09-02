export function cityAssaultCameraTargetPosition(units) {
  if (!Array.isArray(units)) throw new Error("City assault camera requires a unit list");
  let attackerFront = null;
  let defenderFront = null;
  for (const unit of units) {
    if (!unit || !["attacker", "defender"].includes(unit.side) ||
        !Number.isFinite(unit.position) || unit.position < 0 || unit.position > 1 ||
        typeof unit.alive !== "boolean") {
      throw new Error("City assault camera received an invalid unit");
    }
    if (!unit.alive) continue;
    if (unit.side === "attacker") {
      attackerFront = attackerFront === null ? unit.position : Math.max(attackerFront, unit.position);
    } else {
      defenderFront = defenderFront === null ? unit.position : Math.min(defenderFront, unit.position);
    }
  }
  if (attackerFront === null && defenderFront === null) return null;
  if (attackerFront === null) return defenderFront;
  if (defenderFront === null) return attackerFront;
  const gap = defenderFront - attackerFront;
  return gap > 0.22
    ? Math.min(defenderFront, attackerFront + 0.08)
    : (attackerFront + defenderFront) / 2;
}
