export const SHORE_SCAVENGE_SPRING = "spring";
export const SHORE_SCAVENGE_FOOD = "food";
export const SHORE_SCAVENGE_NOTHING = "nothing";
export const SHORE_SCAVENGE_CASUALTY = "casualty";
export const SHORE_SCAVENGE_CASUALTY_CHANCE = 0.01;

const SHORE_SCAVENGE_NARRATIVES = Object.freeze({
  [SHORE_SCAVENGE_SPRING]: Object.freeze([
    "The shore party found a clear spring running between the rocks.",
    "A thin stream led the party inland to cold, clean water.",
    "Beneath a stand of trees, the party uncovered a freshwater spring."
  ]),
  [SHORE_SCAVENGE_FOOD]: Object.freeze([
    "The shore party brought down wild game and carried the meat back.",
    "The party returned with birds and edible roots from the hills.",
    "Fresh tracks led the party to game enough to replenish the stores."
  ]),
  [SHORE_SCAVENGE_NOTHING]: Object.freeze([
    "The party searched until dusk and returned empty-handed.",
    "They found only brackish pools and bitter plants along the shore.",
    "The shore offered shells and scrub, but nothing fit for the stores."
  ]),
  [SHORE_SCAVENGE_CASUALTY]: Object.freeze([
    "A sailor fell from a sea cliff while searching for supplies. The party returned one fewer.",
    "A hidden current swept a sailor out to sea. The search found no trace.",
    "A venomous bite killed a sailor before the party could carry them back."
  ])
});

export function rollShoreScavenge(random = Math.random) {
  const roll = random();
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) {
    throw new Error(`Invalid shore scavenge roll: ${roll}`);
  }
  if (roll < 0.28) return SHORE_SCAVENGE_SPRING;
  if (roll < 0.68) return SHORE_SCAVENGE_FOOD;
  if (roll < 1 - SHORE_SCAVENGE_CASUALTY_CHANCE) return SHORE_SCAVENGE_NOTHING;
  return SHORE_SCAVENGE_CASUALTY;
}

export function foragedFoodQuantity(random = Math.random) {
  const roll = random();
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) {
    throw new Error(`Invalid foraged food roll: ${roll}`);
  }
  return 1 + Math.floor(roll * 3);
}

export function shoreScavengeNarrative(outcome, random = Math.random) {
  const narratives = SHORE_SCAVENGE_NARRATIVES[outcome];
  if (!narratives) throw new Error(`Unknown shore scavenge outcome: ${outcome}`);
  const roll = random();
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) {
    throw new Error(`Invalid shore scavenge narrative roll: ${roll}`);
  }
  return narratives[Math.floor(roll * narratives.length)];
}
