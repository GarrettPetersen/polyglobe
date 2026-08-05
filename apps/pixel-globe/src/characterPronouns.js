const PRONOUNS_BY_SEX = Object.freeze({
  female: Object.freeze({
    subject: "she",
    object: "her",
    possessiveDeterminer: "her",
    possessivePronoun: "hers",
    reflexive: "herself"
  }),
  male: Object.freeze({
    subject: "he",
    object: "him",
    possessiveDeterminer: "his",
    possessivePronoun: "his",
    reflexive: "himself"
  })
});

export function characterPronouns(character, { capitalizeSubject = false } = {}) {
  if (!character || typeof character !== "object" || Array.isArray(character)) {
    throw new Error("Character pronouns require a character");
  }
  const sex = character.sex || character.gender;
  const pronouns = PRONOUNS_BY_SEX[sex];
  if (!pronouns) throw new Error(`Character pronouns require an explicit sex: ${sex}`);
  if (!capitalizeSubject) return pronouns;
  return Object.freeze({
    ...pronouns,
    subject: capitalizeFirst(pronouns.subject)
  });
}

function capitalizeFirst(value) {
  return `${value[0].toUpperCase()}${value.slice(1)}`;
}
