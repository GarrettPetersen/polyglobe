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
  migrateVoyageAchievementProgress,
  orderedAchievementCatalog,
  readAchievementProfile,
  recordVoyageAchievementEvent,
  syncAchievementProfileToPlatform,
  synchronizeAchievements,
  writeAchievementProfile
} from "./achievements.js";
import { gameIconIds } from "./gameIcons.js";

function snapshot(overrides = {}) {
  return {
    discoveryIds: [],
    discoveryCatalogIds: ["one", "circumnavigated-globe", "legend-el-dorado"],
    animalIds: [],
    animalCatalogIds: ["tiger", "penguin"],
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
    mappedPercent: 0,
    hawaiiVisited: false,
    pirateCaptivesBroughtHome: 0,
    castawaysBroughtHome: 0,
    visitedPortCount: 0,
    capturedPortCount: 0,
    namedCrewCount: 0,
    specialEquipmentCount: 0,
    fullCrew: false,
    campaignVictory: false,
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
    ACHIEVEMENT_IDS.GINGER_FARMER,
    ACHIEVEMENT_IDS.NO_ONE_LEFT_IN_CHAINS,
    ACHIEVEMENT_IDS.NOT_FORGOTTEN,
    ACHIEVEMENT_IDS.TWO_HEARTS_ONE_HORIZON
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

  const marriage = ACHIEVEMENT_CATALOG.find(
    (achievement) => achievement.id === ACHIEVEMENT_IDS.TWO_HEARTS_ONE_HORIZON
  );
  assert.equal(achievementPresentation(marriage, false).title, "Hidden Achievement");
  assert.equal(achievementPresentation(marriage, false).description, "Keep exploring to reveal this.");
  assert.equal(achievementPresentation(marriage, true).title, "Two Hearts, One Horizon");
});

test("exploration and settlement achievements use distinct semantic icons", () => {
  const icons = Object.fromEntries(ACHIEVEMENT_CATALOG.map((entry) => [entry.id, entry.iconId]));
  assert.equal(icons[ACHIEVEMENT_IDS.MAGELLAN], "achievement:magellan");
  assert.equal(icons[ACHIEVEMENT_IDS.FOUNDER], "achievement:founder");
  assert.equal(icons[ACHIEVEMENT_IDS.EXPANSIONIST], "achievement:expansionist");
  assert.equal(icons[ACHIEVEMENT_IDS.COLONIST], "achievement:colonist");
  assert.equal(new Set([
    icons[ACHIEVEMENT_IDS.FOUNDER],
    icons[ACHIEVEMENT_IDS.EXPANSIONIST],
    icons[ACHIEVEMENT_IDS.COLONIST]
  ]).size, 3);
});

test("every achievement has a renderable icon", () => {
  const iconIds = new Set(gameIconIds());
  for (const achievement of ACHIEVEMENT_CATALOG) {
    assert.ok(iconIds.has(achievement.iconId), `${achievement.id}: ${achievement.iconId}`);
  }
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

test("the 51-entry catalog includes approachable voyage milestones", () => {
  assert.equal(ACHIEVEMENT_CATALOG.length, 51);
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

test("the new achievements cover exploration, rescue, company, commerce, and danger", () => {
  const profile = createAchievementProfile();
  const progress = createVoyageAchievementProgress();
  recordVoyageAchievementEvent(progress, { type: "married" });
  for (let index = 0; index < 10; index += 1) {
    recordVoyageAchievementEvent(progress, { type: "enemy-ship-defeated" });
  }
  recordVoyageAchievementEvent(progress, { type: "whale-killed" });
  recordVoyageAchievementEvent(progress, { type: "survived-lightning-strike" });
  const soldGoodIds = Array.from({ length: 15 }, (_, index) => `good-${index}`);
  const result = synchronizeAchievements(profile, progress, snapshot({
    soldGoodIds,
    mappedPercent: 70,
    hawaiiVisited: true,
    pirateCaptivesBroughtHome: 1,
    castawaysBroughtHome: 1,
    visitedPortCount: 50,
    fishCaughtQuantity: 100,
    passengerDeliveries: 5,
    capturedPortCount: 1,
    namedCrewCount: 3,
    specialEquipmentCount: 3,
    fullCrew: true,
    campaignVictory: true
  }), { unlockedAt: 6500 });
  const expected = [
    ACHIEVEMENT_IDS.COASTAL_SURVEYOR,
    ACHIEVEMENT_IDS.HALF_THE_WORLD,
    ACHIEVEMENT_IDS.FEWER_DRAGONS,
    ACHIEVEMENT_IDS.ALOHA_SAILOR,
    ACHIEVEMENT_IDS.NO_ONE_LEFT_IN_CHAINS,
    ACHIEVEMENT_IDS.NOT_FORGOTTEN,
    ACHIEVEMENT_IDS.TWO_HEARTS_ONE_HORIZON,
    ACHIEVEMENT_IDS.PORT_OF_CALL,
    ACHIEVEMENT_IDS.SEVEN_SEAS,
    ACHIEVEMENT_IDS.FISHER_KING,
    ACHIEVEMENT_IDS.CARGO_OF_EVERY_KIND,
    ACHIEVEMENT_IDS.PACKET_CAPTAIN,
    ACHIEVEMENT_IDS.TERROR_OF_THE_SEAS,
    ACHIEVEMENT_IDS.THERE_SHE_BLOWS,
    ACHIEVEMENT_IDS.BOLT_FROM_THE_BLUE,
    ACHIEVEMENT_IDS.RAISE_OUR_COLORS,
    ACHIEVEMENT_IDS.A_FINE_COMPANY,
    ACHIEVEMENT_IDS.SHIPSHAPE,
    ACHIEVEMENT_IDS.ALL_HANDS,
    ACHIEVEMENT_IDS.VOYAGE_FULFILLED
  ];
  assert.deepEqual(
    result.newlyUnlocked.map((entry) => entry.id).filter((id) => expected.includes(id)),
    expected
  );
});

test("version 1 voyage progress migrates without inventing unearned achievements", () => {
  const migrated = migrateVoyageAchievementProgress({
    version: 1,
    soldSpiceGoodIds: [],
    foundedCityIds: [],
    sailedShipSlugs: [],
    grossDoubloonsEarned: 0,
    whiteWhaleKilled: false,
    arrivedInPortDrunk: false
  });
  assert.deepEqual(migrated, createVoyageAchievementProgress());
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

test("the great bestiary combines animal sightings across voyages", () => {
  const profile = createAchievementProfile();
  synchronizeAchievements(profile, createVoyageAchievementProgress(), snapshot({
    animalIds: ["tiger"]
  }), { unlockedAt: 8100 });
  assert.equal(profile.unlocked[ACHIEVEMENT_IDS.GREAT_BESTIARY], undefined);
  synchronizeAchievements(profile, createVoyageAchievementProgress(), snapshot({
    animalIds: ["penguin"]
  }), { unlockedAt: 8200 });
  assert.ok(profile.unlocked[ACHIEVEMENT_IDS.GREAT_BESTIARY]);
  assert.deepEqual(profile.lifetime.seenAnimalIds.sort(), ["penguin", "tiger"]);
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
  assert.equal(ACHIEVEMENT_CATALOG.length, 51);
  assert.equal(new Set(ACHIEVEMENT_CATALOG.map((entry) => entry.id)).size, ACHIEVEMENT_CATALOG.length);
  assert.equal(new Set(ACHIEVEMENT_CATALOG.map((entry) => entry.platformIds.steam)).size,
    ACHIEVEMENT_CATALOG.length);
});
