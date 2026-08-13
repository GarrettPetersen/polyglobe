import { isPermanentSeaIceRow } from "./terrainSurface.js";
import { crewScaledSuccessChance } from "./crewEffectiveness.js";
import { TERRAIN_TRAIT, terrainHasTrait } from "./terrainMetadata.js";

export const SHORE_SCAVENGE_WATER = "water";
export const SHORE_SCAVENGE_FOOD = "food";
export const SHORE_SCAVENGE_NOTHING = "nothing";
export const SHORE_SCAVENGE_CASUALTY = "casualty";
export const SHORE_SCAVENGE_SEABIRD = "seabird";
export const SHORE_SCAVENGE_CASUALTY_CHANCE = 0.01;

export const SHORE_SCAVENGE_TEMPERATE = "temperate";
export const SHORE_SCAVENGE_DESERT = "desert";
export const SHORE_SCAVENGE_FROZEN = "frozen";
export const SHORE_SCAVENGE_ARCTIC = "arctic";
export const SHORE_SCAVENGE_ANTARCTIC = "antarctic";

const SCAVENGE_PROBABILITIES = Object.freeze({
  [SHORE_SCAVENGE_TEMPERATE]: Object.freeze({ waterMax: 0.28, foodMax: 0.68 }),
  [SHORE_SCAVENGE_DESERT]: Object.freeze({ waterMax: 0.04, foodMax: 0.18 }),
  [SHORE_SCAVENGE_FROZEN]: Object.freeze({ waterMax: 0.28, foodMax: 0.58 }),
  [SHORE_SCAVENGE_ARCTIC]: Object.freeze({ waterMax: 0.28, foodMax: 0.68 }),
  [SHORE_SCAVENGE_ANTARCTIC]: Object.freeze({ waterMax: 0.28, foodMax: 0.68 })
});

const SCAVENGE_WATER_SHARE_BOUNDS = Object.freeze({
  [SHORE_SCAVENGE_TEMPERATE]: Object.freeze({ min: 0.12, max: 0.82 }),
  [SHORE_SCAVENGE_DESERT]: Object.freeze({ min: 0.05, max: 0.38 }),
  [SHORE_SCAVENGE_FROZEN]: Object.freeze({ min: 0.16, max: 0.86 }),
  [SHORE_SCAVENGE_ARCTIC]: Object.freeze({ min: 0.12, max: 0.82 }),
  [SHORE_SCAVENGE_ANTARCTIC]: Object.freeze({ min: 0.12, max: 0.82 })
});

const SEABIRDS_BY_CONTEXT = Object.freeze({
  [SHORE_SCAVENGE_TEMPERATE]: Object.freeze([
    seabird("gull", 2),
    seabird("cormorant", 3),
    seabird("gannet", 3)
  ]),
  [SHORE_SCAVENGE_DESERT]: Object.freeze([
    seabird("gull", 2),
    seabird("cormorant", 3),
    seabird("tern", 1)
  ]),
  [SHORE_SCAVENGE_FROZEN]: Object.freeze([
    seabird("gull", 2),
    seabird("duck", 2),
    seabird("goose", 3)
  ]),
  [SHORE_SCAVENGE_ARCTIC]: Object.freeze([
    seabird("kittiwake", 2),
    seabird("gull", 2),
    seabird("guillemot", 2)
  ]),
  [SHORE_SCAVENGE_ANTARCTIC]: Object.freeze([
    seabird("petrel", 2),
    seabird("skua", 3),
    seabird("albatross", 5)
  ])
});

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

const FROZEN_NARRATIVES = Object.freeze({
  [SHORE_SCAVENGE_WATER]: Object.freeze([
    "The shore party cut clean ice from the frozen water and melted it into the casks.",
    "Fresh snow had gathered in sheltered drifts. The party carried it aboard to melt over the galley fire.",
    "The party chipped clear freshwater ice and hauled it back to the ship for melting."
  ]),
  [SHORE_SCAVENGE_FOOD]: Object.freeze([
    "The shore party cut a hole through the ice and returned with a small catch of fish.",
    "Hunters followed tracks along the snowy bank and returned with winter game.",
    "A flock of waterfowl resting beside open water provided meat for the stores."
  ]),
  [SHORE_SCAVENGE_NOTHING]: Object.freeze([
    "The party searched the frozen shore until dusk and returned with empty sledges.",
    "They found only wind-polished ice and old tracks beneath the snow.",
    "Thin ice and gathering snow forced the party back before they found usable supplies."
  ]),
  [SHORE_SCAVENGE_CASUALTY]: Object.freeze([
    "Thin ice broke beneath a sailor before the party could pull them free.",
    "A sailor vanished into deep snow beside the frozen shore. The search found no trace.",
    "A sailor succumbed to the cold before the party could carry them back to the ship."
  ])
});

const DESERT_NARRATIVES = Object.freeze({
  [SHORE_SCAVENGE_WATER]: Object.freeze([
    "After hours probing a dry wadi, the shore party uncovered a muddy seep and filled the casks slowly.",
    "The party found damp sand beneath a shaded rock face and dug until a thin trickle gathered.",
    "Before sunrise, the party collected dew from canvas sheets stretched across the cold desert stones."
  ]),
  [SHORE_SCAVENGE_FOOD]: Object.freeze([
    "The shore party gathered shellfish from the tidal rocks and carried the small catch back aboard.",
    "Hunters found desert hares among the scrub and returned with a little fresh meat.",
    "A nesting colony of shore birds yielded eggs and meat enough to add to the stores."
  ]),
  [SHORE_SCAVENGE_NOTHING]: Object.freeze([
    "The party searched the wadis until dusk and returned with empty casks beneath a pitiless sun.",
    "They found salt crust, thorn scrub, and dry gullies, but nothing fit for the ship's stores.",
    "Every hollow was dry and every distant patch of green proved to be bare stone shimmering in the heat."
  ]),
  [SHORE_SCAVENGE_CASUALTY]: Object.freeze([
    "A sailor collapsed from the heat before the party could carry them back to the shore.",
    "A venomous snake struck among the rocks. The party returned to the ship one fewer.",
    "Loose stone gave way beneath a sailor crossing a dry ravine. The fall proved fatal."
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
  [SHORE_SCAVENGE_DESERT]: DESERT_NARRATIVES,
  [SHORE_SCAVENGE_FROZEN]: FROZEN_NARRATIVES,
  [SHORE_SCAVENGE_ARCTIC]: ARCTIC_NARRATIVES,
  [SHORE_SCAVENGE_ANTARCTIC]: ANTARCTIC_NARRATIVES
});

export function shoreScavengeContextForTerrain(row, latitudeDeg, hasSnowGround, hasSurfaceIce = false) {
  if (!row || typeof row !== "object") throw new Error("Shore scavenge terrain row is required");
  if (!Number.isFinite(latitudeDeg)) throw new Error(`Invalid shore scavenge latitude: ${latitudeDeg}`);
  const terrain = row.t || "";
  const permanentIce = isPermanentSeaIceRow(row) || terrain === "ice_cap";
  const polarFrozenTerrain = Math.abs(latitudeDeg) >= 60 && (
    hasSnowGround === true ||
    terrainHasTrait(terrain, TERRAIN_TRAIT.SNOW) ||
    terrainHasTrait(terrain, TERRAIN_TRAIT.TUNDRA) ||
    terrainHasTrait(terrain, TERRAIN_TRAIT.COLD)
  );
  if (typeof hasSurfaceIce !== "boolean") throw new Error("Shore scavenge surface ice flag must be boolean");
  const polarFrozen = permanentIce || polarFrozenTerrain || (hasSurfaceIce && Math.abs(latitudeDeg) >= 60);
  if (polarFrozen) return latitudeDeg >= 0 ? SHORE_SCAVENGE_ARCTIC : SHORE_SCAVENGE_ANTARCTIC;
  if (hasSurfaceIce) return SHORE_SCAVENGE_FROZEN;
  if (terrainHasTrait(terrain, TERRAIN_TRAIT.DESERT)) return SHORE_SCAVENGE_DESERT;
  return SHORE_SCAVENGE_TEMPERATE;
}

export function rollShoreScavenge(
  context,
  needs = { water: 0, food: 0 },
  random = Math.random,
  crewMultiplier = 1
) {
  requireScavengeContext(context);
  const probabilities = SCAVENGE_PROBABILITIES[context];
  if (!probabilities) throw new Error(`Missing shore scavenge probabilities: ${context}`);
  const waterNeed = requireNeedFraction(needs?.water, "water");
  const foodNeed = requireNeedFraction(needs?.food, "food");
  const baseSupplyChance = probabilities.foodMax;
  const supplyChance = crewScaledSuccessChance(baseSupplyChance, crewMultiplier, 0, 0.95);
  const baseWaterShare = probabilities.waterMax / baseSupplyChance;
  const waterShareBounds = SCAVENGE_WATER_SHARE_BOUNDS[context];
  const needDifference = waterNeed - foodNeed;
  const waterShare = needDifference >= 0
    ? lerp(baseWaterShare, waterShareBounds.max, needDifference)
    : lerp(baseWaterShare, waterShareBounds.min, -needDifference);
  const waterMax = supplyChance * waterShare;
  const roll = random();
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) {
    throw new Error(`Invalid shore scavenge roll: ${roll}`);
  }
  if (roll < waterMax) return SHORE_SCAVENGE_WATER;
  if (roll < supplyChance) return SHORE_SCAVENGE_FOOD;
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

export function replaceFailedScavengeWithSeabird(outcome, hasNearbyLandedSeabird) {
  if (typeof hasNearbyLandedSeabird !== "boolean") {
    throw new Error("Seabird scavenging requires an explicit nearby-bird state");
  }
  if (![SHORE_SCAVENGE_WATER, SHORE_SCAVENGE_FOOD, SHORE_SCAVENGE_NOTHING, SHORE_SCAVENGE_CASUALTY].includes(outcome)) {
    throw new Error(`Unknown shore scavenge outcome: ${outcome}`);
  }
  if (!hasNearbyLandedSeabird) return outcome;
  return outcome === SHORE_SCAVENGE_NOTHING || outcome === SHORE_SCAVENGE_CASUALTY
    ? SHORE_SCAVENGE_SEABIRD
    : outcome;
}

export function caughtSeabird(context, random = Math.random) {
  requireScavengeContext(context);
  const birds = SEABIRDS_BY_CONTEXT[context];
  if (!birds || birds.length === 0) throw new Error(`Missing scavenged seabirds for context: ${context}`);
  const roll = random();
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) {
    throw new Error(`Invalid scavenged seabird roll: ${roll}`);
  }
  return birds[Math.floor(roll * birds.length)];
}

export function shoreScavengeNoticeLabel(outcome, context) {
  requireScavengeContext(context);
  if (outcome === SHORE_SCAVENGE_WATER) {
    if (context === SHORE_SCAVENGE_TEMPERATE) return "FOUND A SPRING";
    if (context === SHORE_SCAVENGE_DESERT) return "FOUND A SEEP";
    if (context === SHORE_SCAVENGE_FROZEN) return "MELTED ICE";
    return "MELTED SNOW";
  }
  if (outcome === SHORE_SCAVENGE_FOOD) {
    if (context === SHORE_SCAVENGE_TEMPERATE) return "FOUND WILD GAME";
    if (context === SHORE_SCAVENGE_DESERT) return "FOUND COASTAL FOOD";
    if (context === SHORE_SCAVENGE_FROZEN) return "FOUND WINTER FOOD";
    return "FOUND POLAR GAME";
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

function requireNeedFraction(value, label) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`Invalid shore scavenge ${label} need: ${value}`);
  }
  return value;
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function seabird(name, foodRations) {
  if (typeof name !== "string" || name === "") throw new Error("Scavenged seabird requires a name");
  if (!Number.isInteger(foodRations) || foodRations <= 0) {
    throw new Error(`Invalid ${name} food ration yield: ${foodRations}`);
  }
  return Object.freeze({ name, foodRations });
}
