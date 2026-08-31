export function characterIdentityConflict(first, second) {
  assertCharacterIdentity(first, "First character");
  assertCharacterIdentity(second, "Second character");
  if (first.id === second.id) return "id";
  if (first.sourceId === second.sourceId) return "portrait";
  return null;
}

export function conflictingCharacterIdentity(character, reservedCharacters) {
  assertCharacterIdentity(character, "Candidate character");
  if (!Array.isArray(reservedCharacters)) {
    throw new Error("Character identity reservation requires a character list");
  }
  for (const reserved of reservedCharacters) {
    const reason = characterIdentityConflict(character, reserved);
    if (reason) return Object.freeze({ character: reserved, reason });
  }
  return null;
}

export function assertUniqueCharacterIdentities(characters, label = "Character roster") {
  if (!Array.isArray(characters)) throw new Error(`${label} must be a character list`);
  for (let index = 0; index < characters.length; index++) {
    for (let otherIndex = index + 1; otherIndex < characters.length; otherIndex++) {
      const reason = characterIdentityConflict(characters[index], characters[otherIndex]);
      if (!reason) continue;
      throw new Error(
        `${label} repeats ${reason}: ${characters[index].name} / ${characters[otherIndex].name}`
      );
    }
  }
  return characters;
}

function assertCharacterIdentity(character, label) {
  if (!character || typeof character !== "object" || Array.isArray(character)) {
    throw new Error(`${label} must be an object`);
  }
  for (const field of ["id", "sourceId", "name"]) {
    if (typeof character[field] !== "string" || character[field].trim() === "") {
      throw new Error(`${label} requires ${field}`);
    }
  }
}
