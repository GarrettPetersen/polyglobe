import assert from "node:assert/strict";
import test from "node:test";

import {
  ACHIEVEMENT_CATALOG,
  ACHIEVEMENT_IDS,
  ACHIEVEMENT_PROFILE_STORAGE_KEY,
  achievementPlatformAdapter,
  achievementProgress,
  createAchievementProfile,
  createVoyageAchievementProgress,
  readAchievementProfile,
  recordVoyageAchievementEvent,
  syncAchievementProfileToPlatform,
  synchronizeAchievements,
  writeAchievementProfile
} from "./achievements.js";

function snapshot(overrides = {}) {
  return {
    discoveryIds: [],
    discoveryCatalogIds: ["one", "circumnavigated-globe", "legend-el-dorado"],
    circumnavigationDiscoveryId: "circumnavigated-globe",
    elDoradoDiscoveryId: "legend-el-dorado",
    soldGoodIds: [],
    foundedCityIds: [],
    sailedShipSlugs: ["caravel"],
    shipCatalogSlugs: ["caravel", "junk"],
    collapsedFactionIds: [],
    grossDoubloonsEarned: 0,
    vikingLongshipUnlocked: false,
    whiteWhaleKilled: false,
    arrivedInPortDrunk: false,
    japaneseMatchlockIndustryCreated: false,
    caribbeanGingerIndustryCreated: false,
    ...overrides
  };
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, value)
  };
}

test("achievement profile persists independently from a voyage save", () => {
  const storage = memoryStorage();
  const profile = createAchievementProfile();
  profile.unlocked[ACHIEVEMENT_IDS.MAGELLAN] = { unlockedAt: 1234 };
  writeAchievementProfile(profile, { storage });
  assert.ok(storage.getItem(ACHIEVEMENT_PROFILE_STORAGE_KEY));
  assert.deepEqual(readAchievementProfile({ storage }).profile, profile);
});

test("same-voyage achievements unlock from accumulated progress", () => {
  const profile = createAchievementProfile();
  const progress = createVoyageAchievementProgress();
  const result = synchronizeAchievements(profile, progress, snapshot({
    discoveryIds: ["one", "circumnavigated-globe", "legend-el-dorado"],
    soldGoodIds: ["cinnamon", "nutmeg", "pepper", "cloves", "ginger"],
    foundedCityIds: ["a", "b", "c", "d", "e"],
    collapsedFactionIds: ["portugal"],
    grossDoubloonsEarned: 1_000_000,
    vikingLongshipUnlocked: true,
    japaneseMatchlockIndustryCreated: true,
    caribbeanGingerIndustryCreated: true
  }), { unlockedAt: 5000 });

  for (const id of [
    ACHIEVEMENT_IDS.GREAT_EXPLORER,
    ACHIEVEMENT_IDS.MAGELLAN,
    ACHIEVEMENT_IDS.SPICE_TRADER,
    ACHIEVEMENT_IDS.MILLIONAIRE,
    ACHIEVEMENT_IDS.COLONIST,
    ACHIEVEMENT_IDS.CONQUEROR,
    ACHIEVEMENT_IDS.HISTORY_ENTHUSIAST,
    ACHIEVEMENT_IDS.GOLDEN,
    ACHIEVEMENT_IDS.TEPPO,
    ACHIEVEMENT_IDS.GINGER_FARMER
  ]) assert.ok(profile.unlocked[id], id);
  assert.equal(result.newlyUnlocked.length, 10);
});

test("event-only achievements survive later synchronization", () => {
  const profile = createAchievementProfile();
  const progress = createVoyageAchievementProgress();
  recordVoyageAchievementEvent(progress, { type: "arrived-in-port-drunk" });
  recordVoyageAchievementEvent(progress, { type: "white-whale-killed" });
  synchronizeAchievements(profile, progress, snapshot(), { unlockedAt: 6000 });
  assert.ok(profile.unlocked[ACHIEVEMENT_IDS.DRUNKEN_SAILOR]);
  assert.ok(profile.unlocked[ACHIEVEMENT_IDS.CAPTAIN_AHAB]);
});

test("well rounded combines ships sailed across voyages", () => {
  const profile = createAchievementProfile();
  synchronizeAchievements(profile, createVoyageAchievementProgress(), snapshot({
    sailedShipSlugs: ["caravel"]
  }), { unlockedAt: 7000 });
  assert.equal(profile.unlocked[ACHIEVEMENT_IDS.WELL_ROUNDED], undefined);
  const secondVoyage = createVoyageAchievementProgress();
  synchronizeAchievements(profile, secondVoyage, snapshot({
    sailedShipSlugs: ["junk"]
  }), { unlockedAt: 8000 });
  assert.ok(profile.unlocked[ACHIEVEMENT_IDS.WELL_ROUNDED]);
  assert.deepEqual(profile.lifetime.sailedShipSlugs.sort(), ["caravel", "junk"]);
});

test("achievement progress reports partial requirements", () => {
  const profile = createAchievementProfile();
  const progress = createVoyageAchievementProgress();
  synchronizeAchievements(profile, progress, snapshot({ soldGoodIds: ["pepper", "ginger"] }));
  assert.deepEqual(
    achievementProgress(profile, progress, snapshot(), ACHIEVEMENT_IDS.SPICE_TRADER),
    { unlocked: false, value: 2, target: 5 }
  );
});

test("platform adapter sync uses stable Steam ids once", async () => {
  const calls = [];
  const profile = createAchievementProfile();
  profile.unlocked[ACHIEVEMENT_IDS.MAGELLAN] = { unlockedAt: 9000 };
  const adapter = achievementPlatformAdapter({
    marqueAchievementPlatform: {
      platformId: "steam",
      unlockAchievement: async (id) => calls.push(id)
    }
  });
  const first = await syncAchievementProfileToPlatform(profile, adapter);
  const second = await syncAchievementProfileToPlatform(profile, adapter);
  assert.deepEqual(calls, ["MAGELLAN"]);
  assert.deepEqual(first.syncedIds, [ACHIEVEMENT_IDS.MAGELLAN]);
  assert.deepEqual(second.syncedIds, []);
});

test("catalog has stable unique platform ids", () => {
  assert.equal(new Set(ACHIEVEMENT_CATALOG.map((entry) => entry.id)).size, ACHIEVEMENT_CATALOG.length);
  assert.equal(new Set(ACHIEVEMENT_CATALOG.map((entry) => entry.platformIds.steam)).size,
    ACHIEVEMENT_CATALOG.length);
});
