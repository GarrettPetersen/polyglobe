export const CITY_PERSON_ROLE = Object.freeze({
  AMBIENT: "ambient",
  GARRISON: "garrison"
});

export const CITY_PERSON_SKIN_RAMP = Object.freeze({
  covered: Object.freeze([]),
  pale: Object.freeze(["e6904e", "fdcbb0"]),
  light: Object.freeze(["e6904e", "fca790"]),
  medium: Object.freeze(["cd683d", "e6904e"]),
  dark: Object.freeze(["9e4539", "cd683d"]),
  deep: Object.freeze(["6e2727", "9e4539"])
});

const PRIVATE_SOURCE = "polyglobe-ship-source-assets";
const GAME_SOURCE = "polyglobe";
const LYA_SKIN = Object.freeze(["e6904e", "fca790"]);
const PALE_SKIN = Object.freeze(["e6904e", "fdcbb0"]);
const COMBAT_TAGS_BY_ARCHETYPE_ID = Object.freeze({
  hunter: combatTags("damage"),
  mariner: combatTags("hit"),
  gunner: combatTags("hit"),
  archer: combatTags("damage"),
  cavalier: combatTags("damage"),
  crossbowman: combatTags("damage"),
  halberdier: combatTags("damage"),
  horseman: combatTags("damage"),
  shieldman: combatTags("hit", true),
  spearman: combatTags("hit"),
  swordsman: combatTags("hit"),
  "islamicate-warrior": combatTags("hit", true),
  "ming-crossbowman": combatTags("damage"),
  "ming-swordsman": combatTags("hit"),
  "horse-samurai": combatTags("damage"),
  samurai: combatTags("hit"),
  "teppo-ashigaru": combatTags("hit"),
  "yari-ashigaru": combatTags("hit"),
  "yumi-samurai": combatTags("hit"),
  "wrapped-cloth-man": combatTags("hit")
});

export const CITY_PERSON_ARCHETYPES = Object.freeze([
  privateArchetype("villager-man", "resurrect-64/villagers/aseprite/MiniVillagerMan.aseprite", [CITY_PERSON_ROLE.AMBIENT], LYA_SKIN),
  privateArchetype("villager-woman", "resurrect-64/villagers/aseprite/MiniVillagerWoman.aseprite", [CITY_PERSON_ROLE.AMBIENT], LYA_SKIN),
  privateArchetype("worker", "resurrect-64/villagers/aseprite/MiniWorker.aseprite", [CITY_PERSON_ROLE.AMBIENT], LYA_SKIN),
  privateArchetype("old-man", "resurrect-64/villagers/aseprite/MiniOldMan.aseprite", [CITY_PERSON_ROLE.AMBIENT], LYA_SKIN),
  privateArchetype("old-woman", "resurrect-64/villagers/aseprite/MiniOldWoman.aseprite", [CITY_PERSON_ROLE.AMBIENT], LYA_SKIN),
  privateArchetype("blacksmith", "resurrect-64/villagers-2/aseprite/MiniBlacksmith.aseprite", [CITY_PERSON_ROLE.AMBIENT], LYA_SKIN),
  privateArchetype("gatherer", "resurrect-64/villagers-2/aseprite/MiniGatherer.aseprite", [CITY_PERSON_ROLE.AMBIENT], LYA_SKIN),
  privateArchetype("hunter", "resurrect-64/villagers-2/aseprite/MiniHunter.aseprite", [CITY_PERSON_ROLE.AMBIENT, CITY_PERSON_ROLE.GARRISON], LYA_SKIN),
  privateArchetype("merchant", "resurrect-64/villagers-2/aseprite/MiniMerchant.aseprite", [CITY_PERSON_ROLE.AMBIENT], LYA_SKIN),
  privateArchetype("suspicious-merchant", "resurrect-64/villagers-2/aseprite/MiniSuspiciousMerchant.aseprite", [CITY_PERSON_ROLE.AMBIENT], LYA_SKIN),
  privateArchetype("mariner", "resurrect-64/pirates/aseprite/MiniPirateCrew.aseprite", [CITY_PERSON_ROLE.AMBIENT], LYA_SKIN),
  privateArchetype("gunner", "resurrect-64/pirates/aseprite/MiniPirateGunner.aseprite", [CITY_PERSON_ROLE.AMBIENT, CITY_PERSON_ROLE.GARRISON], LYA_SKIN),
  privateArchetype("archer", "resurrect-64/humans/aseprite/MiniArcher.aseprite", [CITY_PERSON_ROLE.GARRISON], LYA_SKIN),
  privateArchetype("cavalier", "resurrect-64/humans/aseprite/MiniCavalierMan.aseprite", [CITY_PERSON_ROLE.GARRISON], []),
  privateArchetype("crossbowman", "resurrect-64/humans/aseprite/MiniCrossBowMan.aseprite", [CITY_PERSON_ROLE.GARRISON], LYA_SKIN),
  privateArchetype("halberdier", "resurrect-64/humans/aseprite/MiniHalberdMan.aseprite", [CITY_PERSON_ROLE.GARRISON], ["fca790"]),
  privateArchetype("horseman", "resurrect-64/humans/aseprite/MiniHorseMan.aseprite", [CITY_PERSON_ROLE.GARRISON], []),
  privateArchetype("shieldman", "resurrect-64/humans/aseprite/MiniShieldMan.aseprite", [CITY_PERSON_ROLE.GARRISON], LYA_SKIN),
  privateArchetype("spearman", "resurrect-64/humans/aseprite/MiniSpearMan.aseprite", [CITY_PERSON_ROLE.GARRISON], LYA_SKIN),
  privateArchetype("swordsman", "resurrect-64/humans/aseprite/MiniSwordMan.aseprite", [CITY_PERSON_ROLE.GARRISON], LYA_SKIN),
  gameArchetype("islamicate-warrior", "public/assets/minifolks/MiddleEastWarrior.aseprite", [CITY_PERSON_ROLE.GARRISON], PALE_SKIN),
  gameArchetype("ming-crossbowman", "public/assets/minifolks/MingCrossBowMan.aseprite", [CITY_PERSON_ROLE.GARRISON], PALE_SKIN),
  gameArchetype("ming-swordsman", "public/assets/minifolks/MingSwordMan.aseprite", [CITY_PERSON_ROLE.GARRISON], PALE_SKIN),
  gameArchetype("horse-samurai", "public/assets/minifolks/MiniHorseSamurai.aseprite", [CITY_PERSON_ROLE.GARRISON], PALE_SKIN),
  gameArchetype("samurai", "public/assets/minifolks/MiniSamurai.aseprite", [CITY_PERSON_ROLE.GARRISON], LYA_SKIN),
  gameArchetype("teppo-ashigaru", "public/assets/minifolks/MiniTeppoAshigaru.aseprite", [CITY_PERSON_ROLE.GARRISON], PALE_SKIN),
  gameArchetype("yari-ashigaru", "public/assets/minifolks/MiniYariAshigaru.aseprite", [CITY_PERSON_ROLE.GARRISON], PALE_SKIN),
  gameArchetype("yumi-samurai", "public/assets/minifolks/MiniYumiSamurai.aseprite", [CITY_PERSON_ROLE.GARRISON], LYA_SKIN),
  gameArchetype("wrapped-cloth-man", "public/assets/minifolks/MiniTribalMan.aseprite", [CITY_PERSON_ROLE.AMBIENT, CITY_PERSON_ROLE.GARRISON], PALE_SKIN),
  gameArchetype("veiled-woman", "public/assets/minifolks/MiniVeiledWoman.aseprite", [CITY_PERSON_ROLE.AMBIENT], LYA_SKIN)
]);

const HAIR_BROWN_TO_BLACK = palette({ "676633": "2e222f", "cd683d": "3e3546" });
const HAIR_BLOND_TO_BLACK = palette({ "a2a947": "2e222f", "d5e04b": "3e3546" });
const HAIR_RED_TO_BLACK = palette({ "6e2727": "2e222f", "9e4539": "3e3546" });

const MAN_BLUE = palette({ "676633": "4d65b4", "cd683d": "4d9be6", "c7dcd0": "f9c22b" });
const MAN_WHITE = palette({ "676633": "9babb2", "cd683d": "c7dcd0", "c7dcd0": "ffffff" });
const MAN_TEAL = palette({ "676633": "0b5e65", "cd683d": "0eaf9b", "c7dcd0": "f9c22b" });
const MAN_INDIGO = palette({ "676633": "6b3e75", "cd683d": "905ea9", "c7dcd0": "f9c22b" });
const MAN_WARM = palette({ "676633": "9e4539", "cd683d": "f57d4a", "c7dcd0": "f9c22b" });
const MAN_GREEN = palette({ "676633": "239063", "cd683d": "91db69", "c7dcd0": "f9c22b" });

const WOMAN_RED = mergePalettes(HAIR_BROWN_TO_BLACK, palette({ "b2ba90": "831c5d", "c7dcd0": "c32454" }));
const WOMAN_WHITE = mergePalettes(HAIR_BROWN_TO_BLACK, palette({ "b2ba90": "9babb2", "c7dcd0": "ffffff" }));
const WOMAN_INDIGO = mergePalettes(HAIR_BROWN_TO_BLACK, palette({ "b2ba90": "4d65b4", "c7dcd0": "4d9be6" }));
const WOMAN_WARM = mergePalettes(HAIR_BROWN_TO_BLACK, palette({ "b2ba90": "ae2334", "c7dcd0": "f57d4a" }));
const WOMAN_GREEN = mergePalettes(HAIR_BROWN_TO_BLACK, palette({ "b2ba90": "239063", "c7dcd0": "91db69" }));

const GATHERER_BLUE = mergePalettes(HAIR_BLOND_TO_BLACK, palette({ "165a4c": "4d65b4", "239063": "4d9be6" }));
const GATHERER_WHITE = mergePalettes(HAIR_BLOND_TO_BLACK, palette({ "165a4c": "8fd3ff", "239063": "c7dcd0" }));
const GATHERER_RED = mergePalettes(HAIR_BLOND_TO_BLACK, palette({ "165a4c": "831c5d", "239063": "c32454" }));
const GATHERER_TEAL = mergePalettes(HAIR_BLOND_TO_BLACK, palette({ "165a4c": "0b5e65", "239063": "0eaf9b" }));
const GATHERER_WARM = mergePalettes(HAIR_BLOND_TO_BLACK, palette({ "165a4c": "9e4539", "239063": "f57d4a" }));
const GATHERER_GREEN = HAIR_BLOND_TO_BLACK;

const WRAP_GREEN = palette({ "966c6c": "239063", "b2ba90": "91db69" });
const WRAP_INDIGO = palette({ "966c6c": "4d65b4", "b2ba90": "4d9be6" });
const WRAP_WARM = palette({ "966c6c": "ae2334", "b2ba90": "f57d4a" });
const WRAP_TEAL = palette({ "966c6c": "0b8a8f", "b2ba90": "30e1b9" });
const JOSEON_UNIFORM = palette({ "4d65b4": "8fd3ff", "4d9be6": "c7dcd0" });

export const CITY_PERSON_APPEARANCES = Object.freeze([
  appearance("villager-man-light-earth", "villager-man", "light"),
  appearance("villager-man-light-blue", "villager-man", "light", MAN_BLUE),
  appearance("villager-man-light-white", "villager-man", "light", MAN_WHITE),
  appearance("villager-man-light-teal", "villager-man", "light", MAN_TEAL),
  appearance("villager-man-medium-indigo", "villager-man", "medium", MAN_INDIGO),
  appearance("villager-man-medium-warm", "villager-man", "medium", MAN_WARM),
  appearance("villager-man-medium-teal", "villager-man", "medium", MAN_TEAL),
  appearance("villager-man-medium-green", "villager-man", "medium", MAN_GREEN),
  appearance("villager-man-dark-teal", "villager-man", "dark", MAN_TEAL),

  appearance("villager-woman-light-earth", "villager-woman", "light"),
  appearance("villager-woman-light-red", "villager-woman", "light", WOMAN_RED),
  appearance("villager-woman-light-white", "villager-woman", "light", WOMAN_WHITE),
  appearance("villager-woman-medium-indigo", "villager-woman", "medium", WOMAN_INDIGO),
  appearance("villager-woman-medium-warm", "villager-woman", "medium", WOMAN_WARM),
  appearance("villager-woman-medium-green", "villager-woman", "medium", WOMAN_GREEN),
  appearance("villager-woman-dark-indigo", "villager-woman", "dark", WOMAN_INDIGO),

  appearance("gatherer-light-blue", "gatherer", "light", GATHERER_BLUE),
  appearance("gatherer-light-white", "gatherer", "light", GATHERER_WHITE),
  appearance("gatherer-light-red", "gatherer", "light", GATHERER_RED),
  appearance("gatherer-medium-teal", "gatherer", "medium", GATHERER_TEAL),
  appearance("gatherer-medium-warm", "gatherer", "medium", GATHERER_WARM),
  appearance("gatherer-dark-green", "gatherer", "dark", GATHERER_GREEN),

  appearance("hunter-light", "hunter", "light"),
  appearance("hunter-medium", "hunter", "medium"),
  appearance("hunter-dark", "hunter", "dark"),

  appearance("worker-light-blue", "worker", "light"),
  appearance("worker-medium-blue", "worker", "medium"),
  appearance("merchant-light", "merchant", "light"),
  appearance("merchant-medium", "merchant", "medium"),
  appearance("merchant-dark", "merchant", "dark"),
  appearance("merchant-deep", "merchant", "deep"),
  appearance("old-man-light", "old-man", "light"),
  appearance("old-man-deep", "old-man", "deep"),
  appearance("old-woman-light", "old-woman", "light"),
  appearance("old-woman-dark", "old-woman", "dark"),
  appearance("blacksmith-light", "blacksmith", "light"),
  appearance("suspicious-merchant-light", "suspicious-merchant", "light"),
  appearance("suspicious-merchant-dark", "suspicious-merchant", "dark"),

  appearance("mariner-light-black-hair", "mariner", "light", HAIR_RED_TO_BLACK),
  appearance("mariner-medium-black-hair", "mariner", "medium", HAIR_RED_TO_BLACK),
  appearance("mariner-dark-black-hair", "mariner", "dark", HAIR_RED_TO_BLACK),
  appearance("gunner-light", "gunner", "light"),
  appearance("gunner-medium", "gunner", "medium"),
  appearance("gunner-dark", "gunner", "dark"),

  appearance("veiled-woman-light", "veiled-woman", "light"),
  appearance("veiled-woman-medium", "veiled-woman", "medium"),
  appearance("veiled-woman-dark", "veiled-woman", "dark"),
  appearance("wrapped-cloth-man-medium-green", "wrapped-cloth-man", "medium", WRAP_GREEN),
  appearance("wrapped-cloth-man-medium-warm", "wrapped-cloth-man", "medium", WRAP_WARM),
  appearance("wrapped-cloth-man-medium-teal", "wrapped-cloth-man", "medium", WRAP_TEAL),
  appearance("wrapped-cloth-man-dark-indigo", "wrapped-cloth-man", "dark", WRAP_INDIGO),
  appearance("wrapped-cloth-man-deep-indigo", "wrapped-cloth-man", "deep", WRAP_INDIGO),

  appearance("archer-light", "archer", "light"),
  appearance("cavalier-covered", "cavalier", "covered"),
  appearance("crossbowman-light", "crossbowman", "light"),
  appearance("halberdier-light", "halberdier", "light"),
  appearance("horseman-covered", "horseman", "covered"),
  appearance("shieldman-light", "shieldman", "light"),
  appearance("spearman-light", "spearman", "light"),
  appearance("swordsman-light", "swordsman", "light"),
  appearance("islamicate-warrior-light", "islamicate-warrior", "light"),
  appearance("islamicate-warrior-medium", "islamicate-warrior", "medium"),
  appearance("islamicate-warrior-dark", "islamicate-warrior", "dark"),
  appearance("ming-crossbowman", "ming-crossbowman", "pale"),
  appearance("ming-swordsman", "ming-swordsman", "pale"),
  appearance("joseon-crossbowman", "ming-crossbowman", "light", JOSEON_UNIFORM),
  appearance("joseon-swordsman", "ming-swordsman", "light", JOSEON_UNIFORM),
  appearance("japanese-horse-samurai", "horse-samurai", "pale"),
  appearance("japanese-samurai", "samurai", "light"),
  appearance("japanese-teppo-ashigaru", "teppo-ashigaru", "pale"),
  appearance("japanese-yari-ashigaru", "yari-ashigaru", "pale"),
  appearance("japanese-yumi-samurai", "yumi-samurai", "light")
]);

function privateArchetype(id, path, roles, skinRamp) {
  return archetype(id, PRIVATE_SOURCE, path, "LYASeeK", roles, skinRamp);
}

function gameArchetype(id, path, roles, skinRamp) {
  return archetype(id, GAME_SOURCE, path, "Garrett Petersen", roles, skinRamp);
}

function archetype(id, sourceRepository, sourcePath, creator, roles, skinRamp) {
  return Object.freeze({
    id,
    sourceRepository,
    sourcePath,
    creator,
    roles: Object.freeze([...roles]),
    skinRamp: Object.freeze([...skinRamp]),
    combatAnimations: COMBAT_TAGS_BY_ARCHETYPE_ID[id] || null
  });
}

function combatTags(hitSourceTag, block = false) {
  return Object.freeze({
    attack: "attack",
    hit: hitSourceTag,
    death: "death",
    ...(block ? { block: "block" } : {})
  });
}

function appearance(id, archetypeId, skinTone, directPalette = Object.freeze({})) {
  return Object.freeze({ id, archetypeId, skinTone, palette: directPalette });
}

function palette(entries) {
  return Object.freeze({ ...entries });
}

function mergePalettes(...palettes) {
  const result = {};
  for (const entries of palettes) {
    for (const [source, target] of Object.entries(entries)) {
      if (Object.hasOwn(result, source) && result[source] !== target) {
        throw new Error(`Conflicting city person palette target for #${source}`);
      }
      result[source] = target;
    }
  }
  return palette(result);
}
