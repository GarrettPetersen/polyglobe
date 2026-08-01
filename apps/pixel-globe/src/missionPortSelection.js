export function selectAccessibleFactionMissionPort(ports, factionId, accessibleTileIds) {
  if (!Array.isArray(ports)) throw new Error("Mission port selection requires a port list");
  if (typeof factionId !== "string" || factionId.trim() === "") {
    throw new Error("Mission port selection requires a faction");
  }
  if (!(accessibleTileIds instanceof Set)) {
    throw new Error("Mission port selection requires an accessible tile set");
  }
  return ports
    .filter((port) => port.factionId === factionId && accessibleTileIds.has(port.tileId))
    .sort((left, right) => (
      Number(right.capitalOfFactionId === factionId) - Number(left.capitalOfFactionId === factionId) ||
      Number(right.population || 0) - Number(left.population || 0) ||
      String(left.displayCity || left.city).localeCompare(String(right.displayCity || right.city))
    ))[0] || null;
}
