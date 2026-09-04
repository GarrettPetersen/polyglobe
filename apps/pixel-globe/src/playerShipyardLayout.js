export const PLAYER_SHIPYARD_FULL_YARD_MIN_HEIGHT = 180;

export function playerShipyardUsesCompactYardLayout(contentHeight) {
  if (!Number.isFinite(contentHeight) || contentHeight <= 0) {
    throw new Error(`Invalid player shipyard content height: ${contentHeight}`);
  }
  return contentHeight < PLAYER_SHIPYARD_FULL_YARD_MIN_HEIGHT;
}
