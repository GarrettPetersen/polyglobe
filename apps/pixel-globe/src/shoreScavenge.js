import { isPermanentSeaIceRow } from "./terrainSurface.js";

export const SHORE_SCAVENGE_WATER = "water";
export const SHORE_SCAVENGE_FOOD = "food";
export const SHORE_SCAVENGE_NOTHING = "nothing";
export const SHORE_SCAVENGE_CASUALTY = "casualty";
export const SHORE_SCAVENGE_CASUALTY_CHANCE = 0.01;

export const SHORE_SCAVENGE_TEMPERATE = "temperate";
export const SHORE_SCAVENGE_ARCTIC = "arctic";
export const SHORE_SCAVENGE_ANTARCTIC = "antarctic";

const TEMPERATE_NARRATIVES = Object.freeze({
  [SHORE_SCAVENGE_WATER]: Object.freeze([
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

const ARCTIC_NARRATIVES = Object.freeze({
  [SHORE_SCAVENGE_WATER]: Object.freeze([
    "The shore party cut clean snow from a deep drift and melted it into drinking water.",
    "The party chipped clean ice from a sheltered ridge and carried it back to melt aboard.",
    "Fresh snow lay deep along the ice cap. The party filled sacks and melted it over the galley fire."
  ]),
  [SHORE_SCAVENGE_FOOD]: Object.freeze([
    "The shore party found seals resting beside an ice lead and returned with fresh meat.",
    "Hunters followed broad tracks across the snow and brought down a polar bear for the stores.",
    "A seal colony provided enough meat to replenish the ship's dwindling stores."
  ]),
  [SHORE_SCAVENGE_NOTHING]: Object.freeze([
    "The party crossed miles of wind-scoured ice and returned with empty sledges.",
    "They found old seal holes and buried tracks, but no fresh water or game.",
    "A rising whiteout drove the party back before they found anything fit for the stores."
  ]),
  [SHORE_SCAVENGE_CASUALTY]: Object.freeze([
    "A concealed crevasse opened beneath a sailor. The party returned one fewer.",
    "A polar bear charged through the blowing snow and killed a sailor before the hunters drove it off.",
    "Breaking shore ice carried a sailor into the freezing sea. The search found no trace."
  ])
});

const ANTARCTIC_NARRATIVES = Object.freeze({
  [SHORE_SCAVENGE_WATER]: Object.freeze([
    "The shore party cut clean snow from the ice shelf and melted it into drinking water.",
    "The party chipped clean blue ice from a sheltered face and carried it back to melt aboard.",
    "Fresh snow lay deep behind a pressure ridge. The party filled sacks and melted it over the galley fire."
  ]),
  [SHORE_SCAVENGE_FOOD]: Object.freeze([
    "The shore party found seals resting beside an ice lead and returned with fresh meat.",
    "A crowded penguin rookery provided meat enough to replenish the ship's stores.",
    "Hunters found a seal colony beyond the pressure ridges and hauled their catch back over the ice."
  ]),
  [SHORE_SCAVENGE_NOTHING]: Object.freeze([
    "The party crossed miles of empty shelf ice and returned with empty sledges.",
    "They found abandoned nests and old seal holes, but nothing fit for the stores.",
    "A rising whiteout drove the party back before they found fresh water or game."
  ]),
  [SHORE_SCAVENGE_CASUALTY]: Object.freeze([
    "A concealed crevasse opened beneath a sailor. The party returned one fewer.",
    "A slab of shelf ice broke loose and carried a sailor into the freezing sea.",
    "A sudden katabatic gale swept a sailor from the ridge. The search found no trace."
  ])
});

const NARRATIVES_BY_CONTEXT = Object.freeze({
  [SHORE_SCAVENGE_TEMPERATE]: TEMPERATE_NARRATIVES,
  [SHORE_SCAVENGE_ARCTIC]: ARCTIC_NARRATIVES,
  [SHORE_SCAVENGE_ANTARCTIC]: ANTARCTIC_NARRATIVES
});

export function shoreScavengeContextForTerrain(row, latitudeDeg, hasSnowGround) {
  if (!row || typeof row !== "object") throw new Error("Shore scavenge terrain row is required");
  if (!Number.isFinite(latitudeDeg)) throw new Error(`Invalid shore scavenge latitude: ${latitudeDeg}`);
  const terrain = row.t || "";
  const permanentIce = isPermanentSeaIceRow(row) || terrain === "ice_cap";
  const polarFrozenTerrain = Math.abs(latitudeDeg) >= 60 && (
    hasSnowGround === true || terrain.includes("snow") || terrain.includes("tundra") || terrain.includes("cold")
  );
  const frozen = permanentIce || polarFrozenTerrain;
  if (!frozen) return SHORE_SCAVENGE_TEMPERATE;
  return latitudeDeg >= 0 ? SHORE_SCAVENGE_ARCTIC : SHORE_SCAVENGE_ANTARCTIC;
}

export function rollShoreScavenge(random = Math.random) {
  const roll = random();
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) {
    throw new Error(`Invalid shore scavenge roll: ${roll}`);
  }
  if (roll < 0.28) return SHORE_SCAVENGE_WATER;
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

export function shoreScavengeNoticeLabel(outcome, context) {
  requireScavengeContext(context);
  if (outcome === SHORE_SCAVENGE_WATER) {
    return context === SHORE_SCAVENGE_TEMPERATE ? "FOUND A SPRING" : "MELTED SNOW";
  }
  if (outcome === SHORE_SCAVENGE_FOOD) {
    return context === SHORE_SCAVENGE_TEMPERATE ? "FOUND WILD GAME" : "FOUND POLAR GAME";
  }
  throw new Error(`Shore scavenge outcome has no supply label: ${outcome}`);
}

export function shoreScavengeNarrative(outcome, context, random = Math.random) {
  const narratives = requireScavengeContext(context)[outcome];
  if (!narratives) throw new Error(`Unknown shore scavenge outcome: ${outcome}`);
  const roll = random();
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) {
    throw new Error(`Invalid shore scavenge narrative roll: ${roll}`);
  }
  return narratives[Math.floor(roll * narratives.length)];
}

function requireScavengeContext(context) {
  const narratives = NARRATIVES_BY_CONTEXT[context];
  if (!narratives) throw new Error(`Unknown shore scavenge context: ${context}`);
  return narratives;
}
