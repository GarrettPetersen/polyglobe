import {
  CITY_PERSON_APPEARANCES,
  CITY_PERSON_ARCHETYPES,
  CITY_PERSON_ROLE
} from "./cityPeopleCatalog.js";

const EAST_ASIAN_COUNTRY_PROFILE = Object.freeze({
  China: "ming",
  Japan: "japanese",
  "Dem. People's Republic of Korea": "joseon",
  "Republic of Korea": "joseon"
});

export const CITY_POPULATION_PROFILES = Object.freeze([
  populationProfile("european", {
    ambient: [
      pool("villager-man-light-earth", 4),
      pool("villager-woman-light-earth", 4),
      pool("worker-light-blue", 2),
      pool("merchant-light", 2),
      pool("old-man-light", 1),
      pool("old-woman-light", 1),
      pool("blacksmith-light", 1),
      pool("hunter-light", 1),
      pool("suspicious-merchant-light", 1),
      pool("mariner-light-black-hair", 2)
    ],
    garrison: [
      pool("archer-light", 2),
      pool("cavalier-covered", 1),
      pool("crossbowman-light", 2),
      pool("halberdier-light", 2),
      pool("horseman-covered", 1),
      pool("hunter-light", 1),
      pool("shieldman-light", 2),
      pool("spearman-light", 2),
      pool("swordsman-light", 2),
      pool("gunner-light", 1)
    ]
  }),
  populationProfile("islamicate", {
    ambient: [
      pool("villager-man-light-teal", 1),
      pool("villager-man-medium-indigo", 3),
      pool("villager-woman-medium-indigo", 3),
      pool("veiled-woman-light", 1),
      pool("veiled-woman-medium", 3),
      pool("merchant-medium", 2),
      pool("worker-medium-blue", 1),
      pool("mariner-medium-black-hair", 2)
    ],
    garrison: [
      pool("islamicate-warrior-light", 1),
      pool("islamicate-warrior-medium", 4),
      pool("gunner-medium", 1)
    ]
  }),
  populationProfile("south-asian", {
    ambient: [
      pool("villager-man-medium-warm", 3),
      pool("villager-woman-medium-warm", 3),
      pool("gatherer-dark-green", 2),
      pool("veiled-woman-medium", 2),
      pool("veiled-woman-dark", 1),
      pool("merchant-dark", 2),
      pool("hunter-medium", 1),
      pool("worker-medium-blue", 1),
      pool("mariner-medium-black-hair", 1)
    ],
    garrison: [
      pool("islamicate-warrior-medium", 2),
      pool("islamicate-warrior-dark", 3),
      pool("hunter-medium", 1),
      pool("gunner-medium", 1)
    ]
  }),
  populationProfile("ming", {
    ambient: [
      pool("villager-man-light-blue", 4),
      pool("villager-woman-light-red", 4),
      pool("gatherer-light-blue", 3),
      pool("old-man-light", 1),
      pool("old-woman-light", 1),
      pool("mariner-light-black-hair", 1)
    ],
    garrison: [
      pool("ming-crossbowman", 3),
      pool("ming-swordsman", 3),
      pool("gunner-light", 1)
    ]
  }),
  populationProfile("joseon", {
    ambient: [
      pool("villager-man-light-white", 4),
      pool("villager-woman-light-white", 4),
      pool("gatherer-light-white", 3),
      pool("old-man-light", 1),
      pool("old-woman-light", 1)
    ],
    garrison: [
      pool("joseon-crossbowman", 3),
      pool("joseon-swordsman", 3),
      pool("archer-light", 1)
    ]
  }),
  populationProfile("japanese", {
    ambient: [
      pool("villager-man-light-teal", 4),
      pool("villager-woman-light-red", 4),
      pool("gatherer-light-red", 3),
      pool("old-man-light", 1),
      pool("old-woman-light", 1),
      pool("mariner-light-black-hair", 1)
    ],
    garrison: [
      pool("japanese-horse-samurai", 1),
      pool("japanese-samurai", 3),
      pool("japanese-yari-ashigaru", 3),
      pool("japanese-yumi-samurai", 2),
      pool("japanese-teppo-ashigaru", 1)
    ]
  }),
  populationProfile("southeast-asian", {
    ambient: [
      pool("villager-man-medium-green", 3),
      pool("villager-man-medium-teal", 2),
      pool("villager-woman-medium-green", 3),
      pool("gatherer-medium-teal", 3),
      pool("merchant-medium", 2),
      pool("hunter-medium", 1),
      pool("wrapped-cloth-man-medium-green", 2),
      pool("mariner-medium-black-hair", 2)
    ],
    garrison: [
      pool("wrapped-cloth-man-dark-indigo", 3),
      pool("gunner-medium", 1)
    ]
  }),
  populationProfile("african", {
    ambient: [
      pool("villager-man-dark-teal", 4),
      pool("villager-woman-dark-indigo", 4),
      pool("gatherer-dark-green", 3),
      pool("merchant-deep", 2),
      pool("old-man-deep", 1),
      pool("old-woman-dark", 1),
      pool("hunter-dark", 1),
      pool("suspicious-merchant-dark", 1),
      pool("wrapped-cloth-man-dark-indigo", 3),
      pool("wrapped-cloth-man-deep-indigo", 2),
      pool("mariner-dark-black-hair", 2)
    ],
    garrison: [
      pool("wrapped-cloth-man-deep-indigo", 3),
      pool("gunner-dark", 1)
    ]
  }),
  populationProfile("african-islamicate", {
    ambient: [
      pool("villager-man-dark-teal", 3),
      pool("villager-woman-dark-indigo", 3),
      pool("gatherer-dark-green", 2),
      pool("merchant-dark", 2),
      pool("merchant-deep", 1),
      pool("veiled-woman-dark", 3),
      pool("wrapped-cloth-man-dark-indigo", 2),
      pool("mariner-dark-black-hair", 2)
    ],
    garrison: [
      pool("islamicate-warrior-dark", 4),
      pool("gunner-dark", 1)
    ]
  }),
  populationProfile("indigenous-american", {
    ambient: [
      pool("villager-man-medium-warm", 4),
      pool("villager-woman-medium-warm", 4),
      pool("gatherer-medium-warm", 3),
      pool("old-woman-dark", 1),
      pool("hunter-medium", 1),
      pool("wrapped-cloth-man-medium-warm", 3),
      pool("wrapped-cloth-man-dark-indigo", 2)
    ],
    garrison: [
      pool("wrapped-cloth-man-dark-indigo", 6)
    ]
  }),
  populationProfile("polynesian", {
    ambient: [
      pool("villager-man-medium-green", 4),
      pool("villager-woman-medium-green", 4),
      pool("gatherer-medium-teal", 3),
      pool("old-woman-dark", 1),
      pool("hunter-medium", 1),
      pool("wrapped-cloth-man-medium-teal", 4),
      pool("wrapped-cloth-man-dark-indigo", 1)
    ],
    garrison: [
      pool("wrapped-cloth-man-dark-indigo", 6)
    ]
  }),
  populationProfile("ainu", {
    ambient: [
      pool("villager-man-medium-teal", 4),
      pool("villager-woman-medium-indigo", 4),
      pool("gatherer-medium-teal", 3),
      pool("old-man-deep", 1),
      pool("old-woman-dark", 1),
      pool("hunter-medium", 1),
      pool("wrapped-cloth-man-dark-indigo", 2)
    ],
    garrison: [
      pool("wrapped-cloth-man-dark-indigo", 6)
    ]
  })
]);

const ARCHETYPE_BY_ID = new Map(CITY_PERSON_ARCHETYPES.map((entry) => [entry.id, entry]));
const APPEARANCE_BY_ID = new Map(CITY_PERSON_APPEARANCES.map((entry) => [entry.id, entry]));
const PROFILE_BY_ID = new Map(CITY_POPULATION_PROFILES.map((entry) => [entry.id, entry]));
const RECRUITABLE_AMBIENT_ARCHETYPE_IDS = new Set(["mariner", "gunner", "hunter"]);
const NON_RECRUITABLE_GARRISON_ARCHETYPE_IDS = new Set(["cavalier", "horseman", "horse-samurai"]);
const CREW_TYPE_BY_ARCHETYPE_ID = Object.freeze({
  archer: "archer",
  crossbowman: "crossbowman",
  gunner: "gunner",
  halberdier: "halberdier",
  hunter: "hunter",
  cavalier: "swordsman",
  horseman: "swordsman",
  "horse-samurai": "ronin",
  "islamicate-warrior": "shieldman",
  mariner: "sailor",
  "ming-crossbowman": "crossbowman",
  "ming-swordsman": "swordsman",
  samurai: "ronin",
  shieldman: "shieldman",
  spearman: "spearman",
  swordsman: "swordsman",
  "teppo-ashigaru": "gunner",
  "wrapped-cloth-man": "warrior",
  "yari-ashigaru": "spearman",
  "yumi-samurai": "archer"
});

validateCatalog();

export function cityPopulationProfileId(city) {
  const cityId = requireCity(city);
  if (city.factionId === "ainu") return "ainu";
  if (city.cityType === "east-asian") {
    const profileId = EAST_ASIAN_COUNTRY_PROFILE[city.country];
    if (!profileId) throw new Error(`No East Asian population profile for ${city.country}`);
    return profileId;
  }
  if (city.cityType === "sub-saharan") {
    if (!Array.isArray(city.religiousLandmarks)) {
      // Founded-colony runtime records deliberately omit visual landmark data.
      // Their local recruitment pool remains African unless the baked scene
      // explicitly identifies an Islamicate population through its mosque.
      if (city.playerFoundedColony === true) return "african";
      throw new Error(`City population profile requires religious landmarks: ${cityId}`);
    }
    return city.religiousLandmarks.includes("mosque") ? "african-islamicate" : "african";
  }
  const profileId = {
    "northern-european": "european",
    mediterranean: "european",
    "islamic-desert": "islamicate",
    "south-asian": "south-asian",
    "southeast-asian": "southeast-asian",
    mesoamerican: "indigenous-american",
    andean: "indigenous-american",
    polynesian: "polynesian"
  }[city.cityType];
  if (!profileId) throw new Error(`No city population profile for city type: ${city.cityType}`);
  return profileId;
}

export function cityPopulationProfile(profileId) {
  const profile = PROFILE_BY_ID.get(profileId);
  if (!profile) throw new Error(`Unknown city population profile: ${profileId}`);
  return profile;
}

export function createCityPeopleAgents({ city, count, paths }) {
  const cityId = requireCity(city);
  if (!Number.isInteger(count) || count < 0) throw new Error(`Invalid city person count: ${count}`);
  if (!Array.isArray(paths) || count > paths.length) {
    throw new Error(`City people require at least ${count} walking paths`);
  }
  const derivedProfileId = cityPopulationProfileId(city);
  if (city.populationProfileId !== undefined && city.populationProfileId !== derivedProfileId) {
    throw new Error(
      `City ${cityId} population profile drift: ${city.populationProfileId} != ${derivedProfileId}`
    );
  }
  const profile = cityPopulationProfile(city.populationProfileId || derivedProfileId);
  const garrisonCount = cityGarrisonWalkerCount(city, count, profile);
  const garrisonIndexes = selectedGarrisonIndexes(cityId, count, garrisonCount);
  const usedByRole = new Map([
    [CITY_PERSON_ROLE.AMBIENT, new Set()],
    [CITY_PERSON_ROLE.GARRISON, new Set()]
  ]);
  let seed = hashString(`${cityId}|${profile.id}|people`);
  return Object.freeze(paths.slice(0, count).map(({ startX, endX, feetY, endFeetY, painterZ }, index) => {
    validatePath({ startX, endX, feetY, endFeetY, painterZ }, index);
    seed = xorshift(seed);
    const role = garrisonIndexes.has(index) ? CITY_PERSON_ROLE.GARRISON : CITY_PERSON_ROLE.AMBIENT;
    const appearanceId = weightedAppearance(profile[role], seed, usedByRole.get(role));
    usedByRole.get(role).add(appearanceId);
    return Object.freeze({
      id: `${cityId}:street-person:${index + 1}`,
      appearanceId,
      role,
      startX,
      endX,
      feetY,
      endFeetY,
      ...(painterZ === undefined ? {} : { painterZ }),
      phase: ((seed >>> 0) % 1000) / 500,
      speed: 0.00012 + ((seed >>> 12) & 255) / 1_000_000
    });
  }));
}

export function cityGarrisonAppearanceIds(city, count, seedKey = "dock-guards") {
  const cityId = requireCity(city);
  if (!Number.isInteger(count) || count < 0) {
    throw new Error(`Invalid city garrison count: ${count}`);
  }
  if (typeof seedKey !== "string" || seedKey === "") {
    throw new Error("City garrison selection requires a seed key");
  }
  const profile = cityPopulationProfile(city.populationProfileId || cityPopulationProfileId(city));
  const used = new Set();
  let seed = hashString(`${cityId}|${profile.id}|${seedKey}`);
  return Object.freeze(Array.from({ length: count }, () => {
    seed = xorshift(seed);
    const appearanceId = weightedAppearance(profile[CITY_PERSON_ROLE.GARRISON], seed, used);
    used.add(appearanceId);
    return appearanceId;
  }));
}

export function cityCrewTypeForAppearance(appearanceId) {
  const appearance = APPEARANCE_BY_ID.get(appearanceId);
  if (!appearance) throw new Error(`Unknown city person appearance: ${appearanceId}`);
  const crewTypeId = CREW_TYPE_BY_ARCHETYPE_ID[appearance.archetypeId];
  if (!crewTypeId) throw new Error(`City person is not combat capable: ${appearanceId}`);
  return crewTypeId;
}

export function cityRecruitableCrewAppearances(city) {
  const cityId = requireCity(city);
  const profile = cityPopulationProfile(city.populationProfileId || cityPopulationProfileId(city));
  const appearanceIds = new Set();
  for (const role of [CITY_PERSON_ROLE.AMBIENT, CITY_PERSON_ROLE.GARRISON]) {
    for (const { appearanceId } of profile[role]) {
      const appearance = APPEARANCE_BY_ID.get(appearanceId);
      const recruitable = role === CITY_PERSON_ROLE.GARRISON
        ? !NON_RECRUITABLE_GARRISON_ARCHETYPE_IDS.has(appearance.archetypeId)
        : RECRUITABLE_AMBIENT_ARCHETYPE_IDS.has(appearance.archetypeId);
      if (recruitable) appearanceIds.add(appearanceId);
    }
  }
  const result = [...appearanceIds].map((appearanceId) => {
    const crewTypeId = cityCrewTypeForAppearance(appearanceId);
    return Object.freeze({ appearanceId, crewTypeId });
  });
  if (result.length === 0) throw new Error(`City has no recruitable crew appearances: ${cityId}`);
  return Object.freeze(result);
}

export function citySuspiciousMerchantAppearanceId(city) {
  requireCity(city);
  const profileId = city.populationProfileId || cityPopulationProfileId(city);
  return ["european", "ming", "joseon", "japanese", "ainu"].includes(profileId)
    ? "suspicious-merchant-light"
    : "suspicious-merchant-dark";
}

export function validateCityPeopleManifest(manifest) {
  if (!manifest || manifest.format !== "marque-city-people-atlas" || manifest.version !== 3) {
    throw new Error("Unsupported city people manifest");
  }
  if (typeof manifest.sheet !== "string" || manifest.sheet === "") {
    throw new Error("City people manifest requires an atlas sheet");
  }
  if (!Array.isArray(manifest.appearances)) {
    throw new Error("City people manifest requires appearances");
  }
  const manifestById = uniqueIndex(manifest.appearances, "manifest appearance");
  if (manifestById.size !== APPEARANCE_BY_ID.size) {
    throw new Error(
      `City people manifest has ${manifestById.size} appearances; expected ${APPEARANCE_BY_ID.size}`
    );
  }
  for (const appearance of CITY_PERSON_APPEARANCES) {
    const exported = manifestById.get(appearance.id);
    if (!exported) throw new Error(`City people manifest is missing ${appearance.id}`);
    if (exported.archetypeId !== appearance.archetypeId) {
      throw new Error(`City people archetype mismatch for ${appearance.id}`);
    }
    if (!Array.isArray(exported.animations?.walk) || exported.animations.walk.length === 0) {
      throw new Error(`City people appearance has no walk animation: ${appearance.id}`);
    }
    if (!Array.isArray(exported.animations?.idle) || exported.animations.idle.length === 0) {
      throw new Error(`City people appearance has no idle animation: ${appearance.id}`);
    }
    if (!Array.isArray(exported.animations?.jump) || exported.animations.jump.length === 0) {
      throw new Error(`City people appearance has no jump animation: ${appearance.id}`);
    }
    if (appearance.archetypeId === "suspicious-merchant" &&
        (!Array.isArray(exported.animations?.idle2) || exported.animations.idle2.length === 0)) {
      throw new Error(`Suspicious merchant appearance has no idle2 animation: ${appearance.id}`);
    }
    const archetype = ARCHETYPE_BY_ID.get(appearance.archetypeId);
    if (archetype.combatAnimations) {
      for (const animationId of Object.keys(archetype.combatAnimations)) {
        if (!Array.isArray(exported.animations?.[animationId]) || exported.animations[animationId].length === 0) {
          throw new Error(`Combat appearance ${appearance.id} has no ${animationId} animation`);
        }
      }
    }
  }
  return manifest;
}

function cityGarrisonWalkerCount(city, count, profile) {
  if (count === 0 || profile.garrison.length === 0) return 0;
  if (city.settlementType === "village") return city.fortified || city.capital ? 1 : 0;
  return Math.min(count, city.fortified ? Math.max(1, Math.round(count / 3)) : 1);
}

function selectedGarrisonIndexes(cityId, count, garrisonCount) {
  const indexes = Array.from({ length: count }, (_, index) => index);
  let seed = hashString(`${cityId}|garrison-slots`);
  for (let index = indexes.length - 1; index > 0; index--) {
    seed = xorshift(seed);
    const swapIndex = (seed >>> 0) % (index + 1);
    [indexes[index], indexes[swapIndex]] = [indexes[swapIndex], indexes[index]];
  }
  return new Set(indexes.slice(0, garrisonCount));
}

function weightedAppearance(poolEntries, seed, used) {
  const unused = poolEntries.filter(({ appearanceId }) => !used.has(appearanceId));
  const candidates = unused.length > 0 ? unused : poolEntries;
  const totalWeight = candidates.reduce((sum, entry) => sum + entry.weight, 0);
  let target = (seed >>> 0) % totalWeight;
  for (const entry of candidates) {
    if (target < entry.weight) return entry.appearanceId;
    target -= entry.weight;
  }
  throw new Error("City population weighting failed to select an appearance");
}

function validateCatalog() {
  const archetypes = uniqueIndex(CITY_PERSON_ARCHETYPES, "person archetype");
  const appearances = uniqueIndex(CITY_PERSON_APPEARANCES, "person appearance");
  uniqueIndex(CITY_POPULATION_PROFILES, "population profile");
  const usedAppearances = new Set();
  for (const appearance of appearances.values()) {
    if (!archetypes.has(appearance.archetypeId)) {
      throw new Error(`Unknown person archetype for ${appearance.id}: ${appearance.archetypeId}`);
    }
  }
  for (const profile of CITY_POPULATION_PROFILES) {
    for (const role of [CITY_PERSON_ROLE.AMBIENT, CITY_PERSON_ROLE.GARRISON]) {
      if (!Array.isArray(profile[role]) || profile[role].length === 0) {
        throw new Error(`Population profile ${profile.id} requires a ${role} pool`);
      }
      for (const entry of profile[role]) {
        const appearance = appearances.get(entry.appearanceId);
        if (!appearance) throw new Error(`Unknown ${profile.id} appearance: ${entry.appearanceId}`);
        const archetype = archetypes.get(appearance.archetypeId);
        if (!archetype.roles.includes(role)) {
          throw new Error(`${entry.appearanceId} cannot serve as ${role}`);
        }
        usedAppearances.add(entry.appearanceId);
      }
    }
  }
  const unused = [...appearances.keys()].filter((appearanceId) => !usedAppearances.has(appearanceId));
  if (unused.length > 0) throw new Error(`Unused city person appearances: ${unused.join(", ")}`);
}

function populationProfile(id, { ambient, garrison }) {
  return Object.freeze({
    id,
    [CITY_PERSON_ROLE.AMBIENT]: Object.freeze(ambient),
    [CITY_PERSON_ROLE.GARRISON]: Object.freeze(garrison)
  });
}

function pool(appearanceId, weight) {
  if (!Number.isInteger(weight) || weight <= 0) throw new Error(`Invalid population weight: ${weight}`);
  return Object.freeze({ appearanceId, weight });
}

function uniqueIndex(entries, label) {
  const index = new Map();
  for (const entry of entries) {
    if (!entry || typeof entry.id !== "string" || entry.id === "") {
      throw new Error(`Invalid ${label} ID`);
    }
    if (index.has(entry.id)) throw new Error(`Duplicate ${label} ID: ${entry.id}`);
    index.set(entry.id, entry);
  }
  return index;
}

function requireCity(city) {
  if (
    !city ||
    typeof city.cityId !== "string" ||
    city.cityId === "" ||
    typeof city.cityType !== "string" ||
    city.cityType === "" ||
    typeof city.country !== "string" ||
    city.country === ""
  ) {
    throw new Error("City people require a city with canonical ID, type, and country");
  }
  if (city.id !== undefined && city.id !== city.cityId) {
    throw new Error(`City people identity mismatch: ${city.id}/${city.cityId}`);
  }
  return city.cityId;
}

function validatePath({ startX, endX, feetY, endFeetY, painterZ }, index) {
  if (![startX, endX, feetY, endFeetY].every(Number.isFinite) || startX >= endX) {
    throw new Error(`Invalid city person path ${index}`);
  }
  if (feetY !== endFeetY && painterZ === undefined) {
    throw new Error(`Sloped city person path ${index} requires explicit painter order`);
  }
  if (painterZ !== undefined && !Number.isFinite(painterZ)) {
    throw new Error(`Invalid city person painter order ${index}`);
  }
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function xorshift(value) {
  let result = value || 0x9e3779b9;
  result ^= result << 13;
  result ^= result >>> 17;
  result ^= result << 5;
  return result >>> 0;
}
