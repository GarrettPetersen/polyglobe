export function dialoguePortraitPreloadEntries(characters) {
  if (!Array.isArray(characters)) {
    throw new Error("Dialogue portrait preload requires a character array");
  }
  const entriesByKey = new Map();
  for (const character of characters) {
    validateCharacter(character);
    for (const expression of character.expressions) {
      validateExpression(character, expression);
      const key = `${character.id}|${expression.id}`;
      const existing = entriesByKey.get(key);
      if (existing && !samePortraitFrame(existing.expression, expression)) {
        throw new Error(`Dialogue portrait preload has conflicting frames for ${key}`);
      }
      if (!existing) entriesByKey.set(key, { key, character, expression });
    }
  }
  return [...entriesByKey.values()];
}

export function portDialoguePortraitPreloadCharacters({
  playerCharacter,
  portCharacter,
  dockable
}) {
  if (typeof dockable !== "boolean") {
    throw new Error("Port dialogue portrait preload requires dockability");
  }
  validateCharacter(playerCharacter);
  // A visible quest site, inland market, or port whose access has changed may
  // retain a resident character without currently offering port dialogue.
  if (!dockable) return [];
  validateCharacter(portCharacter);
  return [playerCharacter, portCharacter];
}

function samePortraitFrame(left, right) {
  return left.src === right.src &&
    (left.atlasX ?? null) === (right.atlasX ?? null) &&
    (left.atlasY ?? null) === (right.atlasY ?? null) &&
    (left.width ?? null) === (right.width ?? null) &&
    (left.height ?? null) === (right.height ?? null);
}

function validateCharacter(character) {
  if (!character || typeof character !== "object" || Array.isArray(character)) {
    throw new Error("Dialogue portrait preload candidate must be a character object");
  }
  if (typeof character.id !== "string" || character.id === "") {
    throw new Error("Dialogue portrait preload candidate has no character id");
  }
  if (!Array.isArray(character.expressions) || character.expressions.length === 0) {
    throw new Error(`Dialogue portrait preload candidate ${character.id} has no expressions`);
  }
}

function validateExpression(character, expression) {
  if (!expression || typeof expression !== "object" || Array.isArray(expression)) {
    throw new Error(`Dialogue portrait preload candidate ${character.id} has a malformed expression`);
  }
  if (typeof expression.id !== "string" || expression.id === "") {
    throw new Error(`Dialogue portrait preload candidate ${character.id} has an expression without an id`);
  }
  if (typeof expression.src !== "string" || expression.src === "") {
    throw new Error(`Dialogue portrait preload candidate ${character.id}.${expression.id} has no asset`);
  }
}
