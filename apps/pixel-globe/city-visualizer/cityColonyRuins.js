import { cityGroundPainterZ } from "./cityPainterOrder.js";

export const CROATOAN_CLUE = Object.freeze({
  id: "croatoan", iconId: "good:timber",
  x: 1010, y: 500, width: 32, height: 32,
  z: cityGroundPainterZ(532)
});

// Keep the authored foundation and a low, broken wall. Removing from the top
// prevents floating roof fragments and leaves most of each building absent.
export function cityRuinsDamage({ alpha, width, height, foundationHeight, seed }) {
  if (!(alpha instanceof Uint8Array) || ![width, height, foundationHeight].every(Number.isInteger) ||
      width < 1 || foundationHeight < 1 || height <= foundationHeight + 4 ||
      alpha.length !== width * height || !Number.isInteger(seed)) {
    throw new Error(`Invalid ruined building mask: ${width}x${height}, foundation ${foundationHeight}`);
  }
  const hole = new Uint8Array(alpha.length);
  const rim = new Uint8Array(alpha.length);
  const wallHeight = height - foundationHeight;
  const maximumRemnant = Math.max(2, Math.min(12, Math.floor(wallHeight * 0.15)));
  for (let x = 0; x < width; x++) {
    // Two-pixel ledges give a broken masonry edge without single-pixel fizz.
    let hash = Math.imul(seed ^ Math.floor(x / 2), 0x45d9f3b);
    hash ^= hash >>> 16;
    const remnantHeight = 2 + (hash >>> 0) % maximumRemnant;
    const cutY = wallHeight - remnantHeight;
    for (let y = 0; y < height; y++) {
      const index = y * width + x;
      if (alpha[index] === 0) continue;
      if (y < cutY) hole[index] = 1;
      else if (y < cutY + 2) rim[index] = 1;
    }
  }
  return Object.freeze({ hole, rim });
}

export function croatoanClueScreenRect(window) {
  if (![window?.x, window?.y].every(Number.isFinite)) {
    throw new Error("CROATOAN clue requires a finite scene window");
  }
  return Object.freeze({
    x: Math.round(CROATOAN_CLUE.x - window.x),
    y: Math.round(CROATOAN_CLUE.y - window.y),
    width: CROATOAN_CLUE.width, height: CROATOAN_CLUE.height
  });
}

export function croatoanClueContainsPoint(rect, x, y) {
  if (![rect?.x, rect?.y, rect?.width, rect?.height, x, y].every(Number.isFinite)) {
    throw new Error("CROATOAN clue hit test requires finite coordinates");
  }
  return x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height;
}
