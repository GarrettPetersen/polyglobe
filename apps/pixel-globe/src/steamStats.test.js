import assert from "node:assert/strict";
import test from "node:test";

import {
  ACHIEVEMENT_CATALOG,
  ACHIEVEMENT_IDS,
  createAchievementProfile,
  createVoyageAchievementProgress
} from "./achievements.js";
import {
  STEAM_ACHIEVEMENT_PROGRESS,
  STEAM_STAT_CATALOG,
  steamAchievementProgressBinding,
  steamStatValues
} from "./steamStats.js";

test("Steam stats are unique bounded client-side high-water integers", () => {
  assert.equal(STEAM_STAT_CATALOG.length, 13);
  assert.equal(
    new Set(STEAM_STAT_CATALOG.map((entry) => entry.apiName)).size,
    STEAM_STAT_CATALOG.length
  );
  for (const entry of STEAM_STAT_CATALOG) {
    assert.equal(entry.type, "INT");
    assert.equal(entry.setBy, "Client");
    assert.equal(entry.incrementOnly, true);
    assert.equal(entry.minValue, 0);
    assert.ok(entry.maxValue > 0);
  }
});

test("fixed multi-step achievements have valid Steam progress bindings", () => {
  const achievementIds = new Set(ACHIEVEMENT_CATALOG.map((entry) => entry.id));
  const statNames = new Set(STEAM_STAT_CATALOG.map((entry) => entry.apiName));
  for (const [achievementId, binding] of Object.entries(STEAM_ACHIEVEMENT_PROGRESS)) {
    assert.ok(achievementIds.has(achievementId), achievementId);
    assert.ok(statNames.has(binding.statApiName), binding.statApiName);
    assert.ok(binding.unlockValue > 0);
  }
  assert.deepEqual(steamAchievementProgressBinding(ACHIEVEMENT_IDS.MERCHANT_PRINCE), {
    statApiName: "MAX_VOYAGE_EARNINGS",
    unlockValue: 100_000
  });
  assert.equal(steamAchievementProgressBinding(ACHIEVEMENT_IDS.GREAT_EXPLORER), null);
  assert.equal(steamAchievementProgressBinding(ACHIEVEMENT_IDS.WELL_ROUNDED), null);
  assert.equal(steamAchievementProgressBinding(ACHIEVEMENT_IDS.GREAT_BESTIARY), null);
});

test("Steam stat values use current progress and locally unlocked achievement floors", () => {
  const profile = createAchievementProfile();
  const progress = createVoyageAchievementProgress();
  progress.grossDoubloonsEarned = 12_500;
  progress.foundedCityIds.push("one", "two");
  profile.lifetime.sailedShipSlugs.push("dhow", "caravel", "xebec");
  profile.unlocked[ACHIEVEMENT_IDS.HALF_THE_WORLD] = { unlockedAt: 100 };

  const values = steamStatValues(profile, progress, snapshot({
    discoveryIds: ["one", "two", "three"],
    soldGoodIds: ["pepper", "silk"],
    mappedPercent: 12
  }));

  assert.equal(values.MAX_VOYAGE_EARNINGS, 12_500);
  assert.equal(values.MAX_VOYAGE_COLONIES_FOUNDED, 2);
  assert.equal(values.LIFETIME_SHIPS_SAILED, 3);
  assert.equal(values.MAX_VOYAGE_DISCOVERIES, 3);
  assert.equal(values.MAX_VOYAGE_GOODS_SOLD, 2);
  assert.equal(values.MAX_VOYAGE_MAP_PERCENT, 50);
});

function snapshot(overrides = {}) {
  return {
    discoveryIds: [],
    discoveryCatalogIds: ["one", "two", "three"],
    animalIds: [],
    animalCatalogIds: ["penguin"],
    soldGoodIds: [],
    foundedCityIds: [],
    sailedShipSlugs: [],
    shipCatalogSlugs: ["dhow", "caravel", "xebec"],
    collapsedFactionIds: [],
    circumnavigationDiscoveryId: "circumnavigated-globe",
    elDoradoDiscoveryId: "legend-el-dorado",
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
