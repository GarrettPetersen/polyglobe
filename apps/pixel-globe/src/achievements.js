export const ACHIEVEMENT_PROFILE_STORAGE_KEY = "marque-and-reprisal.achievements";
export const ACHIEVEMENT_PROFILE_VERSION = 1;
export const VOYAGE_ACHIEVEMENT_PROGRESS_VERSION = 1;

export const ACHIEVEMENT_IDS = Object.freeze({
  GREAT_EXPLORER: "great-explorer",
  MAGELLAN: "magellan",
  SPICE_TRADER: "spice-trader",
  MILLIONAIRE: "millionaire",
  COLONIST: "colonist",
  CONQUEROR: "conqueror",
  WELL_ROUNDED: "well-rounded",
  HISTORY_ENTHUSIAST: "history-enthusiast",
  CAPTAIN_AHAB: "captain-ahab",
  GOLDEN: "golden",
  DRUNKEN_SAILOR: "drunken-sailor",
  TEPPO: "teppo",
  GINGER_FARMER: "ginger-farmer"
});

export const SPICE_TRADER_GOOD_IDS = Object.freeze([
  "cinnamon",
  "nutmeg",
  "pepper",
  "cloves",
  "ginger"
]);

export const ACHIEVEMENT_CATALOG = Object.freeze([
  achievement(ACHIEVEMENT_IDS.GREAT_EXPLORER, "Great Explorer",
    "Make every discovery in a single voyage.", "voyage", "menu:discoveries", "GREAT_EXPLORER"),
  achievement(ACHIEVEMENT_IDS.MAGELLAN, "Magellan",
    "Circumnavigate the globe.", "voyage", "action:navigation", "MAGELLAN"),
  achievement(ACHIEVEMENT_IDS.SPICE_TRADER, "Spice Trader",
    "Sell cinnamon, nutmeg, pepper, cloves, and ginger in one voyage.", "voyage", "good:cloves", "SPICE_TRADER"),
  achievement(ACHIEVEMENT_IDS.MILLIONAIRE, "Millionaire",
    "Earn 1,000,000 doubloons in a single voyage.", "voyage", "good:gold", "MILLIONAIRE"),
  achievement(ACHIEVEMENT_IDS.COLONIST, "Colonist",
    "Found five new cities in a single voyage.", "voyage", "action:dock", "COLONIST"),
  achievement(ACHIEVEMENT_IDS.CONQUEROR, "Conqueror",
    "Destroy an empire by taking its capital.", "voyage", "action:attack", "CONQUEROR"),
  achievement(ACHIEVEMENT_IDS.WELL_ROUNDED, "Well Rounded",
    "Sail every ship type across any number of voyages.", "lifetime", "ship:caravel", "WELL_ROUNDED"),
  achievement(ACHIEVEMENT_IDS.HISTORY_ENTHUSIAST, "History Enthusiast",
    "Unlock the Viking longship.", "voyage", "action:viking", "HISTORY_ENTHUSIAST", { hidden: true }),
  achievement(ACHIEVEMENT_IDS.CAPTAIN_AHAB, "Captain Ahab",
    "Kill the white whale.", "voyage", "action:harpoon", "CAPTAIN_AHAB", { hidden: true }),
  achievement(ACHIEVEMENT_IDS.GOLDEN, "Golden",
    "Discover El Dorado.", "voyage", "good:gold", "GOLDEN", { hidden: true }),
  achievement(ACHIEVEMENT_IDS.DRUNKEN_SAILOR, "Drunken Sailor",
    "Arrive in port drunk.", "voyage", "good:wine", "DRUNKEN_SAILOR"),
  achievement(ACHIEVEMENT_IDS.TEPPO, "Teppo",
    "Create a domestic matchlock industry in Japan.", "voyage", "good:matchlocks", "TEPPO", { hidden: true }),
  achievement(ACHIEVEMENT_IDS.GINGER_FARMER, "Ginger Farmer",
    "Transplant Old World ginger into the New World.", "voyage", "good:ginger", "GINGER_FARMER", { hidden: true })
]);

export const ACHIEVEMENT_CATALOG_BY_ID = new Map(
  ACHIEVEMENT_CATALOG.map((entry) => [entry.id, entry])
);
if (ACHIEVEMENT_CATALOG_BY_ID.size !== ACHIEVEMENT_CATALOG.length) {
  throw new Error("Achievement catalog contains duplicate ids");
}

export function createAchievementProfile() {
  return {
    version: ACHIEVEMENT_PROFILE_VERSION,
    unlocked: {},
    lifetime: { sailedShipSlugs: [] },
    platformUnlocks: {}
  };
}

export function createVoyageAchievementProgress() {
  return {
    version: VOYAGE_ACHIEVEMENT_PROGRESS_VERSION,
    soldSpiceGoodIds: [],
    foundedCityIds: [],
    sailedShipSlugs: [],
    grossDoubloonsEarned: 0,
    whiteWhaleKilled: false,
    arrivedInPortDrunk: false
  };
}

export function migrateVoyageAchievementProgress(progress) {
  if (progress === undefined || progress === null) return createVoyageAchievementProgress();
  return validateVoyageAchievementProgress(progress);
}

export function validateVoyageAchievementProgress(progress) {
  if (!progress || typeof progress !== "object" ||
      progress.version !== VOYAGE_ACHIEVEMENT_PROGRESS_VERSION) {
    throw new Error(`Unsupported voyage achievement progress: ${progress?.version ?? "missing"}`);
  }
  validateUniqueStringList(progress.soldSpiceGoodIds, "sold spices");
  validateUniqueStringList(progress.foundedCityIds, "founded cities");
  validateUniqueStringList(progress.sailedShipSlugs, "sailed ships");
  if (!Number.isFinite(progress.grossDoubloonsEarned) || progress.grossDoubloonsEarned < 0) {
    throw new Error(`Invalid voyage achievement earnings: ${progress.grossDoubloonsEarned}`);
  }
  for (const key of ["whiteWhaleKilled", "arrivedInPortDrunk"]) {
    if (typeof progress[key] !== "boolean") throw new Error(`Invalid voyage achievement flag: ${key}`);
  }
  return progress;
}

export function readAchievementProfile({ storage = defaultStorage() } = {}) {
  try {
    const serialized = storage.getItem(ACHIEVEMENT_PROFILE_STORAGE_KEY);
    if (serialized === null) {
      return { status: "ready", profile: createAchievementProfile(), error: null };
    }
    const profile = JSON.parse(serialized);
    validateAchievementProfile(profile);
    return { status: "ready", profile, error: null };
  } catch (error) {
    return { status: "invalid", profile: null, error: asError(error) };
  }
}

export function writeAchievementProfile(profile, { storage = defaultStorage() } = {}) {
  validateAchievementProfile(profile);
  storage.setItem(ACHIEVEMENT_PROFILE_STORAGE_KEY, JSON.stringify(profile));
  return profile;
}

export function validateAchievementProfile(profile) {
  if (!profile || typeof profile !== "object" || profile.version !== ACHIEVEMENT_PROFILE_VERSION) {
    throw new Error(`Unsupported achievement profile: ${profile?.version ?? "missing"}`);
  }
  if (!profile.unlocked || typeof profile.unlocked !== "object" || Array.isArray(profile.unlocked)) {
    throw new Error("Achievement profile unlocks must be an object");
  }
  for (const [id, unlock] of Object.entries(profile.unlocked)) {
    assertAchievementId(id);
    if (!unlock || !Number.isFinite(unlock.unlockedAt) || unlock.unlockedAt <= 0) {
      throw new Error(`Achievement ${id} has an invalid unlock timestamp`);
    }
  }
  if (!profile.lifetime || typeof profile.lifetime !== "object") {
    throw new Error("Achievement profile lifetime progress is missing");
  }
  validateUniqueStringList(profile.lifetime.sailedShipSlugs, "lifetime sailed ships");
  if (!profile.platformUnlocks || typeof profile.platformUnlocks !== "object" ||
      Array.isArray(profile.platformUnlocks)) {
    throw new Error("Achievement platform unlocks must be an object");
  }
  for (const [platformId, ids] of Object.entries(profile.platformUnlocks)) {
    if (platformId.trim() === "") throw new Error("Achievement platform id cannot be empty");
    validateUniqueStringList(ids, `${platformId} unlocks`);
    for (const id of ids) {
      assertAchievementId(id);
      if (!profile.unlocked[id]) throw new Error(`${platformId} synced locked achievement ${id}`);
    }
  }
  return profile;
}

export function recordVoyageAchievementEvent(progress, event) {
  validateVoyageAchievementProgress(progress);
  if (!event || typeof event !== "object" || typeof event.type !== "string") {
    throw new Error("Achievement event requires a type");
  }
  let changed = false;
  if (event.type === "arrived-in-port-drunk") {
    changed = setFlag(progress, "arrivedInPortDrunk");
  } else if (event.type === "white-whale-killed") {
    changed = setFlag(progress, "whiteWhaleKilled");
  } else if (event.type === "colony-founded") {
    changed = addUnique(progress.foundedCityIds, requiredString(event.cityId, "colony city id"));
  } else {
    throw new Error(`Unknown achievement event: ${event.type}`);
  }
  validateVoyageAchievementProgress(progress);
  return changed;
}

export function synchronizeAchievements(profile, progress, snapshot, { unlockedAt = Date.now() } = {}) {
  validateAchievementProfile(profile);
  validateVoyageAchievementProgress(progress);
  validateAchievementSnapshot(snapshot);
  if (!Number.isFinite(unlockedAt) || unlockedAt <= 0) {
    throw new Error(`Invalid achievement unlock timestamp: ${unlockedAt}`);
  }

  let changed = false;
  changed = addAll(progress.soldSpiceGoodIds,
    snapshot.soldGoodIds.filter((id) => SPICE_TRADER_GOOD_IDS.includes(id))) || changed;
  changed = addAll(progress.foundedCityIds, snapshot.foundedCityIds) || changed;
  changed = addAll(progress.sailedShipSlugs, snapshot.sailedShipSlugs) || changed;
  changed = addAll(profile.lifetime.sailedShipSlugs, snapshot.sailedShipSlugs) || changed;
  if (snapshot.grossDoubloonsEarned > progress.grossDoubloonsEarned) {
    progress.grossDoubloonsEarned = snapshot.grossDoubloonsEarned;
    changed = true;
  }
  if (snapshot.whiteWhaleKilled) changed = setFlag(progress, "whiteWhaleKilled") || changed;
  if (snapshot.arrivedInPortDrunk) changed = setFlag(progress, "arrivedInPortDrunk") || changed;

  const discoveryIds = new Set(snapshot.discoveryIds);
  const newlyUnlocked = [];
  const unlockWhen = (id, condition) => {
    if (!condition || profile.unlocked[id]) return;
    profile.unlocked[id] = { unlockedAt: Math.floor(unlockedAt) };
    newlyUnlocked.push(ACHIEVEMENT_CATALOG_BY_ID.get(id));
    changed = true;
  };
  unlockWhen(ACHIEVEMENT_IDS.GREAT_EXPLORER,
    snapshot.discoveryCatalogIds.length > 0 &&
    snapshot.discoveryCatalogIds.every((id) => discoveryIds.has(id)));
  unlockWhen(ACHIEVEMENT_IDS.MAGELLAN, discoveryIds.has(snapshot.circumnavigationDiscoveryId));
  unlockWhen(ACHIEVEMENT_IDS.SPICE_TRADER,
    SPICE_TRADER_GOOD_IDS.every((id) => progress.soldSpiceGoodIds.includes(id)));
  unlockWhen(ACHIEVEMENT_IDS.MILLIONAIRE, progress.grossDoubloonsEarned >= 1_000_000);
  unlockWhen(ACHIEVEMENT_IDS.COLONIST, progress.foundedCityIds.length >= 5);
  unlockWhen(ACHIEVEMENT_IDS.CONQUEROR, snapshot.collapsedFactionIds.length > 0);
  unlockWhen(ACHIEVEMENT_IDS.WELL_ROUNDED,
    snapshot.shipCatalogSlugs.length > 0 &&
    snapshot.shipCatalogSlugs.every((slug) => profile.lifetime.sailedShipSlugs.includes(slug)));
  unlockWhen(ACHIEVEMENT_IDS.HISTORY_ENTHUSIAST, snapshot.vikingLongshipUnlocked);
  unlockWhen(ACHIEVEMENT_IDS.CAPTAIN_AHAB, progress.whiteWhaleKilled);
  unlockWhen(ACHIEVEMENT_IDS.GOLDEN, discoveryIds.has(snapshot.elDoradoDiscoveryId));
  unlockWhen(ACHIEVEMENT_IDS.DRUNKEN_SAILOR, progress.arrivedInPortDrunk);
  unlockWhen(ACHIEVEMENT_IDS.TEPPO, snapshot.japaneseMatchlockIndustryCreated);
  unlockWhen(ACHIEVEMENT_IDS.GINGER_FARMER, snapshot.caribbeanGingerIndustryCreated);

  validateAchievementProfile(profile);
  validateVoyageAchievementProgress(progress);
  return { changed, newlyUnlocked };
}

export function achievementProgress(profile, progress, snapshot, achievementId) {
  validateAchievementProfile(profile);
  validateVoyageAchievementProgress(progress);
  validateAchievementSnapshot(snapshot);
  assertAchievementId(achievementId);
  const unlocked = Boolean(profile.unlocked[achievementId]);
  let value = unlocked ? 1 : 0;
  let target = 1;
  if (achievementId === ACHIEVEMENT_IDS.GREAT_EXPLORER) {
    const found = new Set(snapshot.discoveryIds);
    value = snapshot.discoveryCatalogIds.filter((id) => found.has(id)).length;
    target = snapshot.discoveryCatalogIds.length;
  } else if (achievementId === ACHIEVEMENT_IDS.SPICE_TRADER) {
    value = progress.soldSpiceGoodIds.length;
    target = SPICE_TRADER_GOOD_IDS.length;
  } else if (achievementId === ACHIEVEMENT_IDS.MILLIONAIRE) {
    value = progress.grossDoubloonsEarned;
    target = 1_000_000;
  } else if (achievementId === ACHIEVEMENT_IDS.COLONIST) {
    value = progress.foundedCityIds.length;
    target = 5;
  } else if (achievementId === ACHIEVEMENT_IDS.WELL_ROUNDED) {
    value = snapshot.shipCatalogSlugs.filter((slug) => profile.lifetime.sailedShipSlugs.includes(slug)).length;
    target = snapshot.shipCatalogSlugs.length;
  }
  return Object.freeze({ unlocked, value: Math.min(value, target), target });
}

export function achievementPresentation(entry, unlocked) {
  if (!entry || !ACHIEVEMENT_CATALOG_BY_ID.has(entry.id)) {
    throw new Error(`Unknown achievement presentation: ${entry?.id ?? "missing"}`);
  }
  if (typeof unlocked !== "boolean") throw new Error("Achievement presentation requires unlock state");
  const concealed = entry.hidden && !unlocked;
  return Object.freeze({
    concealed,
    title: concealed ? "Hidden Achievement" : entry.title,
    description: concealed ? "Keep exploring to reveal this." : entry.description,
    iconId: concealed ? "action:quest" : entry.iconId
  });
}

export function achievementPlatformAdapter(root = globalThis) {
  const adapter = root?.marqueAchievementPlatform;
  if (adapter === undefined || adapter === null) return null;
  if (typeof adapter !== "object" || typeof adapter.platformId !== "string" ||
      adapter.platformId.trim() === "" || typeof adapter.unlockAchievement !== "function") {
    throw new Error("Installed achievement platform adapter is invalid");
  }
  return adapter;
}

export async function syncAchievementProfileToPlatform(profile, adapter) {
  validateAchievementProfile(profile);
  if (!adapter) return { changed: false, syncedIds: [] };
  const platformId = requiredString(adapter.platformId, "achievement platform id");
  if (typeof adapter.unlockAchievement !== "function") {
    throw new Error(`${platformId} achievement adapter has no unlockAchievement function`);
  }
  const synced = profile.platformUnlocks[platformId] || [];
  const syncedSet = new Set(synced);
  const syncedIds = [];
  for (const achievement of ACHIEVEMENT_CATALOG) {
    if (!profile.unlocked[achievement.id] || syncedSet.has(achievement.id)) continue;
    const externalId = achievement.platformIds[platformId];
    if (!externalId) throw new Error(`Achievement ${achievement.id} has no ${platformId} id`);
    await adapter.unlockAchievement(externalId);
    synced.push(achievement.id);
    syncedSet.add(achievement.id);
    syncedIds.push(achievement.id);
  }
  if (syncedIds.length > 0) profile.platformUnlocks[platformId] = synced;
  validateAchievementProfile(profile);
  return { changed: syncedIds.length > 0, syncedIds };
}

function achievement(id, title, description, scope, iconId, steamId, { hidden = false } = {}) {
  return Object.freeze({
    id,
    title,
    description,
    scope,
    iconId,
    hidden,
    platformIds: Object.freeze({ steam: steamId })
  });
}

function validateAchievementSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") throw new Error("Achievement snapshot is required");
  for (const key of [
    "discoveryIds",
    "discoveryCatalogIds",
    "soldGoodIds",
    "foundedCityIds",
    "sailedShipSlugs",
    "shipCatalogSlugs",
    "collapsedFactionIds"
  ]) validateUniqueStringList(snapshot[key], `achievement snapshot ${key}`);
  for (const key of ["circumnavigationDiscoveryId", "elDoradoDiscoveryId"]) {
    requiredString(snapshot[key], key);
  }
  if (!Number.isFinite(snapshot.grossDoubloonsEarned) || snapshot.grossDoubloonsEarned < 0) {
    throw new Error(`Invalid achievement snapshot earnings: ${snapshot.grossDoubloonsEarned}`);
  }
  for (const key of [
    "vikingLongshipUnlocked",
    "whiteWhaleKilled",
    "arrivedInPortDrunk",
    "japaneseMatchlockIndustryCreated",
    "caribbeanGingerIndustryCreated"
  ]) {
    if (typeof snapshot[key] !== "boolean") throw new Error(`Invalid achievement snapshot flag: ${key}`);
  }
  return snapshot;
}

function assertAchievementId(id) {
  if (!ACHIEVEMENT_CATALOG_BY_ID.has(id)) throw new Error(`Unknown achievement id: ${id}`);
}

function validateUniqueStringList(values, label) {
  if (!Array.isArray(values) || values.some((value) => typeof value !== "string" || value.trim() === "")) {
    throw new Error(`Invalid ${label} list`);
  }
  if (new Set(values).size !== values.length) throw new Error(`Duplicate values in ${label} list`);
}

function addAll(target, values) {
  let changed = false;
  for (const value of values) changed = addUnique(target, value) || changed;
  return changed;
}

function addUnique(target, value) {
  if (target.includes(value)) return false;
  target.push(value);
  return true;
}

function setFlag(target, key) {
  if (target[key]) return false;
  target[key] = true;
  return true;
}

function requiredString(value, label) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`Invalid ${label}`);
  return value;
}

function defaultStorage() {
  if (typeof localStorage === "undefined") throw new Error("Local storage is unavailable");
  return localStorage;
}

function asError(value) {
  return value instanceof Error ? value : new Error(String(value));
}
