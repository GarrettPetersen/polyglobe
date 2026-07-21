import assert from "node:assert/strict";
import test from "node:test";

import {
  ACHIEVEMENT_CATALOG,
  ACHIEVEMENT_IDS,
  ACHIEVEMENT_PROFILE_STORAGE_KEY,
  achievementPlatformAdapter,
  achievementPresentation,
  achievementProgress,
  createAchievementProfile,
  createVoyageAchievementProgress,
  orderedAchievementCatalog,
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
    fishCaughtQuantity: 0,
    passengerDeliveries: 0,
    acquiredShips: 0,
    shoreScavengeCompleted: false,
    defeatedShip: false,
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

test("completed achievements appear first while preserving catalog order", () => {
  const profile = createAchievementProfile();
  profile.unlocked[ACHIEVEMENT_IDS.SPICE_TRADER] = { unlockedAt: 3000 };
  profile.unlocked[ACHIEVEMENT_IDS.MAGELLAN] = { unlockedAt: 4000 };

  const orderedIds = orderedAchievementCatalog(profile).map((entry) => entry.id);
  assert.deepEqual(orderedIds.slice(0, 2), [
    ACHIEVEMENT_IDS.MAGELLAN,
    ACHIEVEMENT_IDS.SPICE_TRADER
  ]);
  assert.deepEqual(
    orderedIds.slice(2),
    ACHIEVEMENT_CATALOG
      .filter((entry) => !profile.unlocked[entry.id])
      .map((entry) => entry.id)
  );
});

test("quest and discovery spoilers remain hidden until they unlock", () => {
  const hiddenIds = ACHIEVEMENT_CATALOG
    .filter((achievement) => achievement.hidden)
    .map((achievement) => achievement.id);

  assert.deepEqual(hiddenIds, [
    ACHIEVEMENT_IDS.HISTORY_ENTHUSIAST,
    ACHIEVEMENT_IDS.CAPTAIN_AHAB,
    ACHIEVEMENT_IDS.GOLDEN,
    ACHIEVEMENT_IDS.TEPPO,
    ACHIEVEMENT_IDS.GINGER_FARMER
  ]);

  const teppo = ACHIEVEMENT_CATALOG.find((achievement) => achievement.id === ACHIEVEMENT_IDS.TEPPO);
  assert.deepEqual(achievementPresentation(teppo, false), {
    concealed: true,
    title: "Hidden Achievement",
    description: "Keep exploring to reveal this.",
    iconId: "action:quest"
  });
  assert.equal(achievementPresentation(teppo, true).title, "Teppo");
  assert.equal(achievementPresentation(teppo, true).iconId, "good:matchlocks");
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
  assert.equal(result.newlyUnlocked.length, 18);
});

test("the 30-entry catalog includes approachable voyage milestones", () => {
  assert.equal(ACHIEVEMENT_CATALOG.length, 30);
  const profile = createAchievementProfile();
  const progress = createVoyageAchievementProgress();
  const discoveryIds = Array.from({ length: 10 }, (_, index) => `discovery-${index}`);
  const result = synchronizeAchievements(profile, progress, snapshot({
    discoveryIds,
    discoveryCatalogIds: [...discoveryIds, "circumnavigated-globe", "legend-el-dorado"],
    soldGoodIds: ["grain", "fish", "timber", "wool", "pepper"],
    foundedCityIds: ["a", "b", "c"],
    sailedShipSlugs: ["caravel", "junk", "carrack", "xebec", "brigantine"],
    shipCatalogSlugs: ["caravel", "junk", "carrack", "xebec", "brigantine", "galleon"],
    grossDoubloonsEarned: 100_000,
    fishCaughtQuantity: 20,
    passengerDeliveries: 1,
    acquiredShips: 1,
    shoreScavengeCompleted: true,
    defeatedShip: true
  }), { unlockedAt: 5500 });

  const expected = [
    ACHIEVEMENT_IDS.NEW_HORIZONS,
    ACHIEVEMENT_IDS.CHART_MAKER,
    ACHIEVEMENT_IDS.FAIR_EXCHANGE,
    ACHIEVEMENT_IDS.GENERAL_MERCHANT,
    ACHIEVEMENT_IDS.SPICE_OF_LIFE,
    ACHIEVEMENT_IDS.MERCHANT_ADVENTURER,
    ACHIEVEMENT_IDS.MERCHANT_PRINCE,
    ACHIEVEMENT_IDS.FOUNDER,
    ACHIEVEMENT_IDS.EXPANSIONIST,
    ACHIEVEMENT_IDS.NEW_COMMAND,
    ACHIEVEMENT_IDS.SHIP_COLLECTOR,
    ACHIEVEMENT_IDS.GONE_FISHING,
    ACHIEVEMENT_IDS.GOOD_HAUL,
    ACHIEVEMENT_IDS.PASSAGE_COMPLETE,
    ACHIEVEMENT_IDS.SHORE_LEAVE,
    ACHIEVEMENT_IDS.PRIZE_TAKEN,
    ACHIEVEMENT_IDS.FIRST_VICTORY
  ];
  assert.deepEqual(
    result.newlyUnlocked.map((entry) => entry.id).filter((id) => expected.includes(id)),
    expected
  );
  for (const id of expected) assert.ok(profile.unlocked[id], id);
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
  assert.equal(ACHIEVEMENT_CATALOG.length, 30);
  assert.equal(new Set(ACHIEVEMENT_CATALOG.map((entry) => entry.id)).size, ACHIEVEMENT_CATALOG.length);
  assert.equal(new Set(ACHIEVEMENT_CATALOG.map((entry) => entry.platformIds.steam)).size,
    ACHIEVEMENT_CATALOG.length);
});
