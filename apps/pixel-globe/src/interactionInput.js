export const INTERACTION_INPUT_DIALOGUE = "dialogue";
export const INTERACTION_INPUT_FISHING = "fishing";

export function interactionInputOwner({ dialogueActive, fishingActive }) {
  if (dialogueActive) return INTERACTION_INPUT_DIALOGUE;
  if (fishingActive) return INTERACTION_INPUT_FISHING;
  return null;
}
