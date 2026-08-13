export function recoveringPortBlocksArrival({
  entryStatus,
  recoveryStatus,
  attackStatus,
  conquestStatus
}) {
  if (!recoveryStatus) return false;
  if (!entryStatus || typeof entryStatus.hostile !== "boolean") {
    throw new Error("Recovering-port entry requires a diplomatic entry status");
  }
  if (!attackStatus || typeof attackStatus.commissioned !== "boolean") {
    throw new Error("Recovering-port entry requires a port attack status");
  }
  if (!conquestStatus || typeof conquestStatus.playerAssaultActive !== "boolean") {
    throw new Error("Recovering-port entry requires a conquest status");
  }
  return !entryStatus.hostile &&
    !attackStatus.commissioned &&
    !conquestStatus.playerAssaultActive;
}
