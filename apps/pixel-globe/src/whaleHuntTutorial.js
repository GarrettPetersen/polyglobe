export const WHALE_EXHAUSTION_TUTORIAL_DECISION = "tutorial.whale-exhaustion";

export function whaleExhaustionTutorialShouldOpen(decisions) {
  assertDecisions(decisions);
  const value = decisions[WHALE_EXHAUSTION_TUTORIAL_DECISION];
  if (value === undefined) return true;
  if (value !== true) {
    throw new Error(`Invalid whale exhaustion tutorial memory: ${value}`);
  }
  return false;
}

export function markWhaleExhaustionTutorialShown(decisions) {
  assertDecisions(decisions);
  if (!whaleExhaustionTutorialShouldOpen(decisions)) {
    throw new Error("Whale exhaustion tutorial was already shown");
  }
  decisions[WHALE_EXHAUSTION_TUTORIAL_DECISION] = true;
}

function assertDecisions(decisions) {
  if (!decisions || typeof decisions !== "object" || Array.isArray(decisions)) {
    throw new Error("Whale exhaustion tutorial requires voyage decision memory");
  }
}
