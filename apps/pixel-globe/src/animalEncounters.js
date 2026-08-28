import { TERRAIN_TRAIT, terrainHasAnyTrait } from "./terrainMetadata.js";

export const ANIMAL_ENCOUNTER_MEMORY_VERSION = 1;
export const ANIMAL_ENCOUNTER_ROLL_INTERVAL_MINUTES = 6 * 60;
export const ANIMAL_ENCOUNTER_CHANCE = 0.035;
export const ANIMAL_INITIAL_ANCHOR_ENCOUNTER_CHANCE = 0.12;
export const ANIMAL_COMPANION_ENCOUNTER_WEIGHT = 3;
export const ANIMAL_CONTINENTAL_LANDMASS_MIN_WORLD_FRACTION = 0.01;

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
    ["The whole pack moves like a practiced gun crew, only considerably faster."], "Yap-yap-yap!", {
      encounterChoice: animalEncounterChoice(
        "It is a wild hunter, but it is also a dog. Shall I pet it?",
        [
          animalEncounterChoiceOption("pet", "PET IT", [
            animalEncounterChoiceStep("animal", "Yap-yap-yap!", "neutral"),
            animalEncounterChoiceStep(
              "captain",
              "Success. I have petted the dog and retained all ten fingers.",
              "amused"
            )
          ]),
          animalEncounterChoiceOption("leave", "DON'T PET IT", [
            animalEncounterChoiceStep(
              "captain",
              "Prudence wins. We shall admire the dog from here.",
              "neutral"
            )
          ])
        ]
      )
    }),
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

export function buildAnimalLandmassWorldFractions(earthRows) {
  if (!Array.isArray(earthRows) || earthRows.length === 0) {
    throw new Error("Animal landmass fractions require complete Earth terrain rows");
  }
  const tileCountsByLandmassId = new Map();
  for (const row of earthRows) {
    if (!Number.isInteger(row?.m)) continue;
    if (row.m < 0) throw new Error(`Animal landmass id cannot be negative: ${row.m}`);
    tileCountsByLandmassId.set(row.m, (tileCountsByLandmassId.get(row.m) || 0) + 1);
  }
  if (tileCountsByLandmassId.size === 0) {
    throw new Error("Animal habitat map contains no landmass ids");
  }
  return new Map([...tileCountsByLandmassId].map(([landmassId, tileCount]) => [
    landmassId,
    tileCount / earthRows.length
  ]));
}

export function animalLandmassWorldFraction(row, landmassWorldFractions) {
  if (row?.t === "ice" || row?.t === "ice_cap") return 0;
  if (!Number.isInteger(row?.m)) {
    throw new Error(`Animal habitat terrain has no landmass id: ${row?.m ?? "missing"}`);
  }
  if (!(landmassWorldFractions instanceof Map)) {
    throw new Error("Animal habitat requires a landmass fraction map");
  }
  const fraction = landmassWorldFractions.get(row.m);
  if (!Number.isFinite(fraction) || fraction <= 0 || fraction > 1) {
    throw new Error(`Animal habitat has no valid fraction for landmass ${row.m}: ${fraction}`);
  }
  return fraction;
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

function animal(
  id,
  displayName,
  detail,
  soundKind,
  portraitFile,
  matches,
  commentary,
  callText,
  { effect = null, encounterChoice = null } = {}
) {
  return animalRecord(id, displayName, detail, soundKind, matches, commentary, callText, effect, {
    neutral: portraitFile
  }, null, 1, encounterChoice);
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
    encounterWeight,
    null
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
  encounterWeight,
  encounterChoice
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
    encounterWeight,
    encounterChoice
  });
}

function animalEncounterChoice(prompt, options) {
  if (typeof prompt !== "string" || prompt.trim() === "") {
    throw new Error("Animal encounter choice requires a prompt");
  }
  if (!Array.isArray(options) || options.length < 2 || options.length > 3) {
    throw new Error("Animal encounter choice requires two or three options");
  }
  if (new Set(options.map((option) => option.id)).size !== options.length) {
    throw new Error("Animal encounter choice option ids must be unique");
  }
  return Object.freeze({ prompt, options: Object.freeze(options) });
}

function animalEncounterChoiceOption(id, label, steps) {
  if (typeof id !== "string" || id.trim() === "" ||
      typeof label !== "string" || label.trim() === "") {
    throw new Error("Animal encounter choice option requires an id and label");
  }
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new Error(`Animal encounter choice ${id} requires result steps`);
  }
  return Object.freeze({ id, label, steps: Object.freeze(steps) });
}

function animalEncounterChoiceStep(speaker, message, expressionId) {
  if (!["animal", "captain"].includes(speaker) ||
      typeof message !== "string" || message.trim() === "" ||
      typeof expressionId !== "string" || expressionId.trim() === "") {
    throw new Error("Animal encounter choice step is malformed");
  }
  return Object.freeze({ speaker, message, expressionId });
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
  if (!Number.isFinite(habitat.landmassWorldFraction) ||
      habitat.landmassWorldFraction < 0 || habitat.landmassWorldFraction > 1) {
    throw new Error(`Animal habitat requires a valid landmass fraction: ${habitat.landmassWorldFraction}`);
  }
}

function checkedRandom(random, label) {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error(`Invalid ${label}: ${value}`);
  return value;
}

function terrainIncludes(h, ...traits) {
  return terrainHasAnyTrait(h.terrain, traits);
}

function longitudeIn(h, west, east) {
  return h.longitudeDeg >= west && h.longitudeDeg <= east;
}

function latitudeIn(h, south, north) {
  return h.latitudeDeg >= south && h.latitudeDeg <= north;
}

function inRegion(h, south, north, west, east) {
  return latitudeIn(h, south, north) && longitudeIn(h, west, east);
}

function onContinentalLandmass(h) {
  return h.landmassWorldFraction >= ANIMAL_CONTINENTAL_LANDMASS_MIN_WORLD_FRACTION;
}

function tigerRange(h) {
  const caspian = onContinentalLandmass(h) && inRegion(h, 30, 48, 45, 75);
  const mainland = onContinentalLandmass(h) && inRegion(h, 5, 50, 65, 135);
  const sumatra = sumatraIsland(h);
  const javaAndBali = javaAndBaliIslands(h);
  return (caspian || mainland || sumatra || javaAndBali) &&
    terrainIncludes(h, TERRAIN_TRAIT.FOREST, TERRAIN_TRAIT.JUNGLE, TERRAIN_TRAIT.GRASS, TERRAIN_TRAIT.WET);
}

function northernWilds(h) {
  const continental = onContinentalLandmass(h);
  const holarctic = (continental || nativeBrownBearIsland(h)) && latitudeIn(h, 35, 72);
  const southwestAsia = continental && inRegion(h, 30, 35, 25, 80);
  const atlasMountains = continental && inRegion(h, 28, 37, -13, 12) &&
    terrainIncludes(h, TERRAIN_TRAIT.FOREST, TERRAIN_TRAIT.MOUNTAIN);
  return (holarctic || southwestAsia || atlasMountains) &&
    terrainIncludes(h, TERRAIN_TRAIT.FOREST, TERRAIN_TRAIT.MOUNTAIN, TERRAIN_TRAIT.ROCK, TERRAIN_TRAIT.TUNDRA, TERRAIN_TRAIT.GRASS);
}

function elephantRange(h) {
  const africa = onContinentalLandmass(h) && inRegion(h, -35, 20, -20, 55);
  const indianSubcontinent = onContinentalLandmass(h) && inRegion(h, 5, 32, 65, 100);
  const southeastAsianMainland = onContinentalLandmass(h) && inRegion(h, 0, 28, 95, 110);
  const asia = indianSubcontinent || southeastAsianMainland || nativeElephantIsland(h);
  return (africa || asia) && terrainIncludes(h, TERRAIN_TRAIT.GRASS, TERRAIN_TRAIT.FOREST, TERRAIN_TRAIT.JUNGLE);
}

function rhinoRange(h) {
  const africa = onContinentalLandmass(h) && inRegion(h, -35, 18, -15, 52);
  const asia = (onContinentalLandmass(h) && inRegion(h, 5, 32, 68, 110)) ||
    nativeRhinoIsland(h);
  return (africa || asia) && terrainIncludes(h, TERRAIN_TRAIT.GRASS, TERRAIN_TRAIT.FOREST, TERRAIN_TRAIT.JUNGLE, TERRAIN_TRAIT.WET);
}

function wetTemperateHabitat(h) {
  const nativeLandmass = onContinentalLandmass(h) || nativeOtterIsland(h);
  const americas = nativeLandmass && inRegion(h, -55, 70, -170, -35);
  const afroEurasia = nativeLandmass && inRegion(h, -35, 70, -20, 150) &&
    !madagascarIsland(h) && !australasia(h);
  return (americas || afroEurasia) && (h.isRiver || h.isLake || h.isCoast) && !h.isSurfaceIce;
}

function chipmunkRange(h) {
  return onContinentalLandmass(h) && inRegion(h, 20, 65, -170, -50) &&
    terrainIncludes(h, TERRAIN_TRAIT.FOREST, TERRAIN_TRAIT.GRASS, TERRAIN_TRAIT.MOUNTAIN);
}

function giraffeRange(h) {
  return onContinentalLandmass(h) && inRegion(h, -35, 15, -20, 52) &&
    terrainIncludes(h, TERRAIN_TRAIT.GRASS, TERRAIN_TRAIT.SAVANNA, TERRAIN_TRAIT.DESERT);
}

function temperateOpenHabitat(h) {
  const nativeLandmass = onContinentalLandmass(h) || nativeFoxIsland(h);
  return latitudeIn(h, -50, 68) && !h.isSurfaceIce && nativeLandmass && !australasia(h) &&
    terrainIncludes(h, TERRAIN_TRAIT.FOREST, TERRAIN_TRAIT.GRASS, TERRAIN_TRAIT.TUNDRA, TERRAIN_TRAIT.MOUNTAIN, TERRAIN_TRAIT.ROCK);
}

function australiaRange(h) {
  return inRegion(h, -45, -10, 110, 155) &&
    (onContinentalLandmass(h) || tasmaniaIsland(h)) &&
    terrainIncludes(h, TERRAIN_TRAIT.GRASS, TERRAIN_TRAIT.FOREST, TERRAIN_TRAIT.DESERT, TERRAIN_TRAIT.ROCK);
}

function tropicalForest(h) {
  const tropicalAmericas = longitudeIn(h, -120, -30);
  const tropicalAfrica = longitudeIn(h, -20, 60);
  const tropicalIndoPacific = longitudeIn(h, 65, 180);
  return Math.abs(h.latitudeDeg) <= 28 &&
    (tropicalAmericas || tropicalAfrica || tropicalIndoPacific) &&
    terrainIncludes(h, TERRAIN_TRAIT.FOREST, TERRAIN_TRAIT.JUNGLE);
}

function lionRange(h) {
  const africa = onContinentalLandmass(h) && inRegion(h, -35, 22, -20, 52);
  const southwestAsia = onContinentalLandmass(h) && inRegion(h, 12, 38, 30, 82);
  return (africa || southwestAsia) && terrainIncludes(h, TERRAIN_TRAIT.GRASS, TERRAIN_TRAIT.SAVANNA, TERRAIN_TRAIT.DESERT, TERRAIN_TRAIT.FOREST);
}

function eagleRange(h) {
  return !h.isSurfaceIce && (onContinentalLandmass(h) || nativeEagleIsland(h)) &&
    terrainIncludes(h, TERRAIN_TRAIT.MOUNTAIN, TERRAIN_TRAIT.ROCK, TERRAIN_TRAIT.GRASS, TERRAIN_TRAIT.FOREST, TERRAIN_TRAIT.TUNDRA);
}

function farNorthForest(h) {
  const northAmerica = onContinentalLandmass(h) && inRegion(h, 45, 72, -170, -50);
  const scandinavia = onContinentalLandmass(h) && inRegion(h, 55, 72, 5, 32);
  const easternEurasia = onContinentalLandmass(h) && inRegion(h, 48, 72, 20, 180);
  return (northAmerica || scandinavia || easternEurasia) &&
    terrainIncludes(h, TERRAIN_TRAIT.FOREST, TERRAIN_TRAIT.TUNDRA, TERRAIN_TRAIT.WET, TERRAIN_TRAIT.GRASS);
}

function africanGrassland(h) {
  return onContinentalLandmass(h) && inRegion(h, -35, 15, -20, 52) &&
    terrainIncludes(h, TERRAIN_TRAIT.GRASS, TERRAIN_TRAIT.SAVANNA);
}

function tropicalAmericaForest(h) {
  return onContinentalLandmass(h) && inRegion(h, -25, 20, -90, -35) &&
    terrainIncludes(h, TERRAIN_TRAIT.FOREST, TERRAIN_TRAIT.JUNGLE);
}

function pandaRange(h) {
  return onContinentalLandmass(h) && inRegion(h, 24, 36, 95, 112) &&
    terrainIncludes(h, TERRAIN_TRAIT.FOREST, TERRAIN_TRAIT.MOUNTAIN, TERRAIN_TRAIT.GRASS);
}

function raccoonRange(h) {
  return onContinentalLandmass(h) && inRegion(h, 7, 58, -130, -50) &&
    (h.isRiver || h.isLake || terrainIncludes(h, TERRAIN_TRAIT.FOREST, TERRAIN_TRAIT.GRASS, TERRAIN_TRAIT.WET));
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

function sumatraIsland(h) {
  return inRegion(h, -6.5, 6.5, 95, 106.5) && !onContinentalLandmass(h);
}

function javaAndBaliIslands(h) {
  return inRegion(h, -9.5, -5, 105, 116.5) && !onContinentalLandmass(h);
}

function borneoIsland(h) {
  return inRegion(h, -7, 8, 108, 120) && !onContinentalLandmass(h);
}

function sriLankaIsland(h) {
  return inRegion(h, 5, 10.5, 79, 82.5) && !onContinentalLandmass(h);
}

function madagascarIsland(h) {
  return inRegion(h, -26.5, -11, 43, 51.5) && !onContinentalLandmass(h);
}

function tasmaniaIsland(h) {
  return inRegion(h, -44.5, -39, 143, 149.5) && !onContinentalLandmass(h);
}

function japanIslands(h) {
  return inRegion(h, 30, 46, 129, 146.5) && !onContinentalLandmass(h);
}

function hokkaidoIsland(h) {
  return inRegion(h, 41, 46, 139, 146.5) && !onContinentalLandmass(h);
}

function britishAndIrishIslands(h) {
  return inRegion(h, 49, 61, -11, 3) && !onContinentalLandmass(h);
}

function northPacificAmericanIslands(h) {
  return inRegion(h, 50, 61, -180, -125) && !onContinentalLandmass(h);
}

function greenlandIsland(h) {
  return inRegion(h, 59, 84, -74, -10) && !onContinentalLandmass(h);
}

function papuaIsland(h) {
  return inRegion(h, -11, 1, 130, 151) && !onContinentalLandmass(h);
}

function nativeElephantIsland(h) {
  return sriLankaIsland(h) || sumatraIsland(h) || borneoIsland(h) || javaAndBaliIslands(h);
}

function nativeRhinoIsland(h) {
  return sumatraIsland(h) || borneoIsland(h) || javaAndBaliIslands(h);
}

function nativeBrownBearIsland(h) {
  return hokkaidoIsland(h) || northPacificAmericanIslands(h);
}

function nativeOtterIsland(h) {
  return britishAndIrishIslands(h) || japanIslands(h) || northPacificAmericanIslands(h) ||
    sumatraIsland(h) || javaAndBaliIslands(h) || borneoIsland(h) || sriLankaIsland(h);
}

function nativeFoxIsland(h) {
  return britishAndIrishIslands(h) || japanIslands(h) || greenlandIsland(h) ||
    northPacificAmericanIslands(h) || inRegion(h, 35, 44, 7, 16);
}

function nativeEagleIsland(h) {
  return britishAndIrishIslands(h) || japanIslands(h) || greenlandIsland(h) ||
    northPacificAmericanIslands(h) || sumatraIsland(h) || javaAndBaliIslands(h) ||
    borneoIsland(h) || sriLankaIsland(h) || madagascarIsland(h) || papuaIsland(h);
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
