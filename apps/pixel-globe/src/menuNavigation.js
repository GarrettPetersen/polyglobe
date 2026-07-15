export function clampMenuIndex(index, itemCount) {
  if (!Number.isFinite(index)) throw new Error(`Invalid menu index: ${index}`);
  if (!Number.isInteger(itemCount) || itemCount <= 0) {
    throw new Error(`Invalid menu item count: ${itemCount}`);
  }
  return Math.max(0, Math.min(itemCount - 1, Math.trunc(index)));
}

export function stepMenuIndex(index, direction, itemCount) {
  if (!Number.isFinite(direction)) throw new Error(`Invalid menu direction: ${direction}`);
  return clampMenuIndex(index + Math.sign(direction), itemCount);
}

export const BINARY_CONFIRM_YES_INDEX = 0;
export const BINARY_CONFIRM_NO_INDEX = 1;

export function createBinaryConfirmationState() {
  return {
    selectedIndex: BINARY_CONFIRM_NO_INDEX,
    buttonRects: []
  };
}

export function toggleBinaryConfirmationIndex(index) {
  if (index === BINARY_CONFIRM_YES_INDEX) return BINARY_CONFIRM_NO_INDEX;
  if (index === BINARY_CONFIRM_NO_INDEX) return BINARY_CONFIRM_YES_INDEX;
  throw new Error(`Invalid binary confirmation index: ${index}`);
}
