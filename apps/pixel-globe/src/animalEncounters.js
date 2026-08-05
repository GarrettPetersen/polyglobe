export const ANIMAL_ENCOUNTER_MEMORY_VERSION = 1;
export const ANIMAL_ENCOUNTER_ROLL_INTERVAL_MINUTES = 6 * 60;
export const ANIMAL_ENCOUNTER_CHANCE = 0.035;
export const ANIMAL_INITIAL_ANCHOR_ENCOUNTER_CHANCE = 0.12;
export const ANIMAL_COMPANION_ENCOUNTER_WEIGHT = 3;

const PORTRAIT_ROOT = "assets/animals/portraits";

export const ANIMAL_CATALOG = Object.freeze([
  animal("tiger", "Tiger", "A striped forest cat of Asia.", "roar", "tiger.png", tigerRange,
    ["A tiger. It is magnificent, provided it continues looking at us from over there."], "Rrrrraow!"),
  animal("brown-bear", "Brown Bear", "A powerful bear of northern forests and mountains.", "growl", "brown-bear.png", northernWilds,
    ["That bear has the confident walk of a creature that has never paid a harbor toll."], "Hrrrroooof!"),
  animal("elephant", "Elephant", "The immense long-nosed animal of Africa and Asia.", "trumpet", "elephant.png", elephantRange,
    ["Pliny wrote of elephants as the wisest of beasts. This one has already found our biscuit barrel."], "Prrrraaaah!"),
  animal("rhinoceros", "Rhinoceros", "A heavy horned browser of warm grasslands and forests.", "grunt", "rhinoceros.png", rhinoRange,
    ["I begin to understand why old bestiaries drew it wearing armor."], "Hrrumph!"),
  animal("otter", "Otter", "A playful fisher of rivers, lakes, and sheltered coasts.", "chirp", "otter.png", wetTemperateHabitat,
    ["It catches fish without a net and looks unbearably pleased with itself."], "Chrrrp-chrrp!"),
  animal("chipmunk", "Chipmunk", "A tiny striped hoarder of North American woodlands.", "chirp", "chipmunk.png", chipmunkRange,
    ["A very small merchant. Every seed is cargo and every hollow tree a warehouse."], "Chip-chip-chip!"),
  animal("giraffe", "Giraffe", "A towering leaf-eater of African savannas.", "hum", "giraffe.png", giraffeRange,
    ["No mariner will believe how tall it is. We shall need a larger margin in the logbook."], "Hmmmph."),
  animal("fox", "Fox", "A quick, watchful hunter of temperate lands.", "bark", "fox.png", temperateOpenHabitat,
    ["It has the expression of a factor who knows tomorrow's prices."], "Yip-yip!"),
  animal("kangaroo", "Kangaroo", "A great leaping animal of Australia.", "grunt", "kangaroo.png", australiaRange,
    ["It carries its young in a pouch. A sensible arrangement, though poor for cargo capacity."], "Chuff!"),
  animal("parrot", "Parrot", "A bright, loud bird of tropical forests.", "squawk", "parrot.png", tropicalForest,
    ["It has learned three sailors' oaths and not one useful word."], "AWK! Fair wind! AWK!"),
  animal("lion", "Lion", "A formidable great cat of Africa and western India.", "roar", "lion.png", lionRange,
    ["The lion regards us as if deciding whether sailors count as red meat."], "Rrrrroaaaah!"),
  animal("eagle", "Eagle", "A vast bird of prey seen over mountains and open country.", "screech", "eagle.png", eagleRange,
    ["It can see leagues of country from up there. A useful talent in a navigator."], "Kreeee!"),
  animal("moose", "Moose", "A gigantic deer of cold northern forests and wetlands.", "grunt", "moose.png", farNorthForest,
    ["A deer built to the dimensions of a small ship."], "Urrrgh!"),
  animal("wild-dog", "Wild Dog", "A tireless pack hunter of African grasslands.", "bark", "wild-dog.png", africanGrassland,
    ["The whole pack moves like a practiced gun crew, only considerably faster."], "Yap-yap-yap!"),
  animal("sloth", "Sloth", "A slow tree-dweller of tropical America.", "chirp", "sloth.png", tropicalAmericaForest,
    ["We have watched it cross one branch since breakfast. I admire its refusal to be hurried."], "Eeeh."),
  animalWithExpressions("panda", "Giant Panda", "A bamboo-eating bear of China's mountain forests.", "bleat", pandaRange,
    ["It has eaten every bamboo shoot in sight and appears to regard this as a full day's labor."], "Meee-eh!", {
      neutral: 14, happy: 5, surprised: 4, sad: 1, angry: 15, amused: 10
    }, {
      encounterWeight: ANIMAL_COMPANION_ENCOUNTER_WEIGHT,
      reactionExpression: "happy",
      reactionText: "The panda rolls onto its back, hugs the bamboo closer, and resumes chewing."
    }),
  animalWithExpressions("raccoon", "Raccoon", "A nimble masked forager of the Americas.", "chitter", raccoonRange,
    ["That little masked thief is aboard! Count the biscuits."], "Chrrr-chrrr-chrrr!", {
      neutral: 4, happy: 5, surprised: 13, sad: 1, angry: 9, amused: 10, mischievous: 15
    }, {
      encounterWeight: ANIMAL_COMPANION_ENCOUNTER_WEIGHT,
      effect: "steal-food",
      reactionExpression: "mischievous",
      reactionText: "Crunch. Crunch."
    }),
  animalWithExpressions("penguin", "Penguin", "A flightless seabird of the southern ice.", "bray", penguinRange,
    ["A bird dressed for court, marching over ice where no court has ever sat."], "Honk-hraaa!", {
      neutral: 8, happy: 2, surprised: 4, sad: 5, angry: 3, amused: 15, confused: 14
    }, {
      encounterWeight: ANIMAL_COMPANION_ENCOUNTER_WEIGHT,
      reactionExpression: "amused",
      reactionText: "The penguin gives a formal bow, then inspects our fish as though conducting an audit."
    }),
]);

export const ANIMAL_CATALOG_BY_ID = new Map(ANIMAL_CATALOG.map((animalEntry) => [animalEntry.id, animalEntry]));
if (ANIMAL_CATALOG_BY_ID.size !== ANIMAL_CATALOG.length) {
  throw new Error("Animal catalog contains duplicate ids");
}

export function createAnimalEncounterMemory() {
  return {
    version: ANIMAL_ENCOUNTER_MEMORY_VERSION,
    encountered: {},
    encounterOrder: [],
    nextRollMinute: 0
  };
}

export function validateAnimalEncounterMemory(memory) {
  if (!memory || memory.version !== ANIMAL_ENCOUNTER_MEMORY_VERSION) {
    throw new Error(`Unsupported animal encounter memory: ${memory?.version ?? "missing"}`);
  }
  if (!memory.encountered || typeof memory.encountered !== "object" || Array.isArray(memory.encountered)) {
    throw new Error("Animal encounter records must be an object");
  }
  if (!Array.isArray(memory.encounterOrder)) throw new Error("Animal encounter order must be an array");
  if (new Set(memory.encounterOrder).size !== memory.encounterOrder.length) {
    throw new Error("Animal encounter order contains duplicates");
  }
  for (const id of memory.encounterOrder) {
    if (!ANIMAL_CATALOG_BY_ID.has(id) || memory.encountered[id] !== true) {
      throw new Error(`Invalid animal encounter record: ${id}`);
    }
  }
  for (const [id, encountered] of Object.entries(memory.encountered)) {
    if (!ANIMAL_CATALOG_BY_ID.has(id) || encountered !== true || !memory.encounterOrder.includes(id)) {
      throw new Error(`Invalid animal encounter flag: ${id}`);
    }
  }
  if (!Number.isFinite(memory.nextRollMinute) || memory.nextRollMinute < 0) {
    throw new Error(`Invalid next animal encounter roll: ${memory.nextRollMinute}`);
  }
  return memory;
}

export function encounteredAnimalEntries(memory) {
  validateAnimalEncounterMemory(memory);
  return Object.freeze(memory.encounterOrder.map((id) => ANIMAL_CATALOG_BY_ID.get(id)));
}

export function recordAnimalEncounter(memory, animalId) {
  validateAnimalEncounterMemory(memory);
  const animalEntry = ANIMAL_CATALOG_BY_ID.get(animalId);
  if (!animalEntry) throw new Error(`Unknown encountered animal: ${animalId}`);
  if (memory.encountered[animalId]) return false;
  memory.encountered[animalId] = true;
  memory.encounterOrder.push(animalId);
  validateAnimalEncounterMemory(memory);
  return true;
}

export function eligibleAnimalEncounters(memory, habitat) {
  validateAnimalEncounterMemory(memory);
  validateHabitat(habitat);
  return ANIMAL_CATALOG.filter((entry) => !memory.encountered[entry.id] && entry.matches(habitat));
}

export function rollAnchoredAnimalEncounter(
  memory,
  habitat,
  currentMinute,
  random = Math.random,
  chanceMultiplier = 1,
  initialAnchorRoll = false
) {
  validateAnimalEncounterMemory(memory);
  validateHabitat(habitat);
  if (!Number.isFinite(currentMinute) || currentMinute < 0) {
    throw new Error(`Invalid animal encounter minute: ${currentMinute}`);
  }
  if (!Number.isFinite(chanceMultiplier) || chanceMultiplier <= 0) {
    throw new Error(`Invalid animal encounter chance multiplier: ${chanceMultiplier}`);
  }
  if (typeof initialAnchorRoll !== "boolean") {
    throw new Error("Initial animal anchor roll flag must be boolean");
  }
  if (!initialAnchorRoll && currentMinute < memory.nextRollMinute) return null;
  memory.nextRollMinute = currentMinute + ANIMAL_ENCOUNTER_ROLL_INTERVAL_MINUTES;
  const chanceRoll = checkedRandom(random, "animal encounter chance");
  const baseChance = initialAnchorRoll
    ? ANIMAL_INITIAL_ANCHOR_ENCOUNTER_CHANCE
    : ANIMAL_ENCOUNTER_CHANCE;
  const encounterChance = Math.min(0.95, baseChance * chanceMultiplier);
  if (chanceRoll >= encounterChance) return null;
  const eligible = eligibleAnimalEncounters(memory, habitat);
  if (eligible.length === 0) return null;
  const choiceRoll = checkedRandom(random, "animal encounter choice");
  const totalWeight = eligible.reduce((sum, entry) => sum + entry.encounterWeight, 0);
  let weightedChoice = choiceRoll * totalWeight;
  for (const entry of eligible) {
    weightedChoice -= entry.encounterWeight;
    if (weightedChoice < 0) return entry;
  }
  throw new Error(`Animal encounter weighting failed at choice ${choiceRoll}`);
}

export function animalDialogueCharacter(animalEntry) {
  if (!animalEntry || !ANIMAL_CATALOG_BY_ID.has(animalEntry.id)) {
    throw new Error(`Unknown animal dialogue character: ${animalEntry?.id ?? "missing"}`);
  }
  return Object.freeze({
    id: `animal:${animalEntry.id}`,
    name: animalEntry.displayName,
    sex: "unknown",
    expressions: animalEntry.expressions
  });
}

function animal(id, displayName, detail, soundKind, portraitFile, matches, commentary, callText, effect = null) {
  return animalRecord(id, displayName, detail, soundKind, matches, commentary, callText, effect, {
    neutral: portraitFile
  }, null, 1);
}

function animalWithExpressions(
  id,
  displayName,
  detail,
  soundKind,
  matches,
  commentary,
  callText,
  expressionNumbers,
  { encounterWeight = 1, effect = null, reactionExpression = null, reactionText = null } = {}
) {
  const files = Object.fromEntries(Object.entries(expressionNumbers).map(([expressionId, number]) => [
    expressionId,
    `${id}-${number}.png`
  ]));
  const reaction = reactionExpression && reactionText
    ? Object.freeze({ expressionId: reactionExpression, text: reactionText })
    : null;
  return animalRecord(
    id,
    displayName,
    detail,
    soundKind,
    matches,
    commentary,
    callText,
    effect,
    files,
    reaction,
    encounterWeight
  );
}

function animalRecord(
  id,
  displayName,
  detail,
  soundKind,
  matches,
  commentary,
  callText,
  effect,
  expressionFiles,
  reaction,
  encounterWeight
) {
  if (!Number.isFinite(encounterWeight) || encounterWeight <= 0) {
    throw new Error(`Invalid animal encounter weight for ${id}: ${encounterWeight}`);
  }
  const expressions = Object.freeze(Object.entries(expressionFiles).map(([expressionId, file]) => Object.freeze({
    id: expressionId,
    src: `${PORTRAIT_ROOT}/${file}`
  })));
  return Object.freeze({
    id,
    displayName,
    detail,
    soundKind,
    matches,
    commentary: Object.freeze(commentary),
    callText,
    effect,
    expressions,
    reaction,
    encounterWeight
  });
}

function validateHabitat(habitat) {
  if (!habitat || !Number.isFinite(habitat.latitudeDeg) || !Number.isFinite(habitat.longitudeDeg)) {
    throw new Error("Animal encounter requires a geographic habitat");
  }
  if (typeof habitat.terrain !== "string") throw new Error("Animal habitat requires terrain");
  if (typeof habitat.isSurfaceIce !== "boolean" || typeof habitat.isRiver !== "boolean" ||
      typeof habitat.isLake !== "boolean" || typeof habitat.isCoast !== "boolean") {
    throw new Error("Animal habitat requires explicit water and ice flags");
  }
}

function checkedRandom(random, label) {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error(`Invalid ${label}: ${value}`);
  return value;
}

function terrainIncludes(h, ...words) {
  return words.some((word) => h.terrain.includes(word));
}

function longitudeIn(h, west, east) {
  return h.longitudeDeg >= west && h.longitudeDeg <= east;
}

function tigerRange(h) {
  const caspian = h.latitudeDeg >= 30 && h.latitudeDeg <= 48 && longitudeIn(h, 45, 75);
  const mainland = h.latitudeDeg >= 5 && h.latitudeDeg <= 50 && longitudeIn(h, 65, 135) &&
    !tigerlessEastAsianIsland(h);
  const sumatra = h.latitudeDeg >= -6 && h.latitudeDeg <= 6 && longitudeIn(h, 95, 106);
  const javaAndBali = h.latitudeDeg >= -9 && h.latitudeDeg <= -5 && longitudeIn(h, 105, 116);
  return (caspian || mainland || sumatra || javaAndBali) &&
    terrainIncludes(h, "forest", "jungle", "grass", "wet");
}

function northernWilds(h) {
  return h.latitudeDeg >= 30 && h.latitudeDeg <= 72 &&
    terrainIncludes(h, "forest", "mountain", "rock", "tundra", "grass");
}

function elephantRange(h) {
  const africa = h.latitudeDeg >= -35 && h.latitudeDeg <= 20 && longitudeIn(h, -20, 55);
  const indianSubcontinent = h.latitudeDeg >= 5 && h.latitudeDeg <= 32 && longitudeIn(h, 65, 100);
  const southeastAsianMainland = h.latitudeDeg >= 0 && h.latitudeDeg <= 28 && longitudeIn(h, 95, 110);
  const sunda = h.latitudeDeg >= -8 && h.latitudeDeg <= 8 && longitudeIn(h, 95, 119);
  const asia = indianSubcontinent || southeastAsianMainland || sunda;
  return (africa || asia) && terrainIncludes(h, "grass", "forest", "jungle");
}

function rhinoRange(h) {
  const africa = h.latitudeDeg >= -35 && h.latitudeDeg <= 18 && longitudeIn(h, -15, 52);
  const asia = h.latitudeDeg >= -8 && h.latitudeDeg <= 32 && longitudeIn(h, 68, 110);
  return (africa || asia) && terrainIncludes(h, "grass", "forest", "jungle", "wet");
}

function wetTemperateHabitat(h) {
  return h.latitudeDeg >= -55 && h.latitudeDeg <= 70 && (h.isRiver || h.isLake || h.isCoast) && !h.isSurfaceIce;
}

function chipmunkRange(h) {
  return h.latitudeDeg >= 20 && h.latitudeDeg <= 65 && longitudeIn(h, -170, -50) &&
    terrainIncludes(h, "forest", "grass", "mountain");
}

function giraffeRange(h) {
  return h.latitudeDeg >= -35 && h.latitudeDeg <= 15 && longitudeIn(h, -20, 52) &&
    terrainIncludes(h, "grass", "savanna", "desert");
}

function temperateOpenHabitat(h) {
  return h.latitudeDeg >= -50 && h.latitudeDeg <= 68 && !h.isSurfaceIce &&
    !australasia(h) &&
    terrainIncludes(h, "forest", "grass", "tundra", "mountain", "rock");
}

function australiaRange(h) {
  return h.latitudeDeg >= -45 && h.latitudeDeg <= -10 && longitudeIn(h, 110, 155) &&
    terrainIncludes(h, "grass", "forest", "desert", "rock");
}

function tropicalForest(h) {
  return Math.abs(h.latitudeDeg) <= 28 && terrainIncludes(h, "forest", "jungle");
}

function lionRange(h) {
  const africa = h.latitudeDeg >= -35 && h.latitudeDeg <= 22 && longitudeIn(h, -20, 52);
  const southwestAsia = h.latitudeDeg >= 12 && h.latitudeDeg <= 38 && longitudeIn(h, 30, 82);
  return (africa || southwestAsia) && terrainIncludes(h, "grass", "savanna", "desert", "forest");
}

function eagleRange(h) {
  return !h.isSurfaceIce && terrainIncludes(h, "mountain", "rock", "grass", "forest", "tundra");
}

function farNorthForest(h) {
  const northAmerica = h.latitudeDeg >= 45 && h.latitudeDeg <= 72 && longitudeIn(h, -170, -50);
  const scandinavia = h.latitudeDeg >= 55 && h.latitudeDeg <= 72 && longitudeIn(h, 5, 32);
  const easternEurasia = h.latitudeDeg >= 48 && h.latitudeDeg <= 72 && longitudeIn(h, 20, 180);
  return (northAmerica || scandinavia || easternEurasia) &&
    terrainIncludes(h, "forest", "tundra", "wet", "grass");
}

function africanGrassland(h) {
  return h.latitudeDeg >= -35 && h.latitudeDeg <= 15 && longitudeIn(h, -20, 52) &&
    terrainIncludes(h, "grass", "savanna");
}

function tropicalAmericaForest(h) {
  return h.latitudeDeg >= -25 && h.latitudeDeg <= 20 && longitudeIn(h, -90, -35) &&
    terrainIncludes(h, "forest", "jungle");
}

function pandaRange(h) {
  return h.latitudeDeg >= 24 && h.latitudeDeg <= 36 && longitudeIn(h, 95, 112) &&
    terrainIncludes(h, "forest", "mountain", "grass");
}

function raccoonRange(h) {
  return h.latitudeDeg >= 7 && h.latitudeDeg <= 58 && longitudeIn(h, -130, -50) &&
    (h.isRiver || h.isLake || terrainIncludes(h, "forest", "grass", "wet", "river"));
}

function penguinRange(h) {
  if (!h.isSurfaceIce && !h.isCoast) return false;
  const antarcticAndSubantarctic = h.latitudeDeg <= -45;
  const pacificSouthAmerica = h.latitudeDeg >= -45 && h.latitudeDeg <= 2 &&
    longitudeIn(h, -92, -68);
  const atlanticSouthAmerica = h.latitudeDeg >= -56 && h.latitudeDeg <= -38 &&
    longitudeIn(h, -76, -50);
  const southernAfrica = h.latitudeDeg >= -38 && h.latitudeDeg <= -22 &&
    longitudeIn(h, 12, 34);
  return antarcticAndSubantarctic || pacificSouthAmerica || atlanticSouthAmerica ||
    southernAfrica || southernAustralasia(h);
}

function tigerlessEastAsianIsland(h) {
  const borneo = h.latitudeDeg >= -7 && h.latitudeDeg <= 8 && longitudeIn(h, 108, 120);
  const philippines = h.latitudeDeg >= 5 && h.latitudeDeg <= 21 && longitudeIn(h, 116, 127);
  const taiwan = h.latitudeDeg >= 21 && h.latitudeDeg <= 26 && longitudeIn(h, 119, 123);
  const japan = h.latitudeDeg >= 30 && h.latitudeDeg <= 46 && longitudeIn(h, 129, 146);
  return borneo || philippines || taiwan || japan;
}

function australasia(h) {
  const australia = h.latitudeDeg >= -45 && h.latitudeDeg <= -10 && longitudeIn(h, 110, 155);
  const newZealandEast = h.latitudeDeg >= -50 && h.latitudeDeg <= -30 && longitudeIn(h, 165, 180);
  const newZealandWest = h.latitudeDeg >= -50 && h.latitudeDeg <= -30 && longitudeIn(h, -180, -165);
  return australia || newZealandEast || newZealandWest;
}

function southernAustralasia(h) {
  const southernAustralia = h.latitudeDeg >= -45 && h.latitudeDeg <= -32 &&
    longitudeIn(h, 110, 155);
  const newZealandEast = h.latitudeDeg >= -50 && h.latitudeDeg <= -30 &&
    longitudeIn(h, 165, 180);
  const newZealandWest = h.latitudeDeg >= -50 && h.latitudeDeg <= -30 &&
    longitudeIn(h, -180, -165);
  return southernAustralia || newZealandEast || newZealandWest;
}
