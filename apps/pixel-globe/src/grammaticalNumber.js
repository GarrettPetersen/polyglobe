export const GRAMMATICAL_NUMBER_SINGULAR = "singular";
export const GRAMMATICAL_NUMBER_PLURAL = "plural";

const GRAMMATICAL_NUMBERS = new Set([
  GRAMMATICAL_NUMBER_SINGULAR,
  GRAMMATICAL_NUMBER_PLURAL
]);

export function validateGrammaticalNumber(value, subject) {
  if (!GRAMMATICAL_NUMBERS.has(value)) {
    throw new Error(`Invalid grammatical number for ${subject}: ${value}`);
  }
  return value;
}

export function usesPluralAgreement(value, subject) {
  return validateGrammaticalNumber(value, subject) === GRAMMATICAL_NUMBER_PLURAL;
}
