export function shipFlagLayout({ anchorX, anchorY, poleHeight, flagWidth, flagHeight }) {
  for (const [label, value] of Object.entries({ anchorX, anchorY })) {
    if (!Number.isInteger(value)) throw new Error(`Ship flag ${label} must be an integer: ${value}`);
  }
  for (const [label, value] of Object.entries({ poleHeight, flagWidth, flagHeight })) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`Ship flag ${label} must be a positive integer: ${value}`);
    }
  }
  const poleTopY = anchorY - poleHeight + 1;
  return Object.freeze({
    pole: Object.freeze({ x: anchorX, y: poleTopY, w: 1, h: poleHeight }),
    flag: Object.freeze({ x: anchorX + 1, y: poleTopY, w: flagWidth, h: flagHeight })
  });
}

export function npcShipFlagDisplay(combatGrace) {
  if (typeof combatGrace !== "boolean") {
    throw new Error(`NPC ship flag protection state must be boolean: ${combatGrace}`);
  }
  return combatGrace ? "surrender" : "colors";
}
