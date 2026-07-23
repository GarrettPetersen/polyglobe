import {
  ACHIEVEMENT_IDS,
  achievementProgress
} from "./achievements.js";

export const STEAM_STAT_CATALOG = Object.freeze([
  stat("MAX_VOYAGE_DISCOVERIES", "Most discoveries in one voyage",
    ACHIEVEMENT_IDS.CHART_MAKER, 10),
  stat("MAX_VOYAGE_SPICES_SOLD", "Most distinct spices sold in one voyage",
    ACHIEVEMENT_IDS.SPICE_TRADER, 5),
  stat("MAX_VOYAGE_EARNINGS", "Most doubloons earned in one voyage",
    ACHIEVEMENT_IDS.MILLIONAIRE, 1_000_000),
  stat("MAX_VOYAGE_COLONIES_FOUNDED", "Most cities founded in one voyage",
    ACHIEVEMENT_IDS.COLONIST, 5),
  stat("LIFETIME_SHIPS_SAILED", "Distinct ship types sailed",
    ACHIEVEMENT_IDS.SHIP_COLLECTOR, 5),
  stat("MAX_VOYAGE_GOODS_SOLD", "Most distinct goods sold in one voyage",
    ACHIEVEMENT_IDS.CARGO_OF_EVERY_KIND, 15),
  stat("MAX_VOYAGE_FISH_CAUGHT", "Most fish caught in one voyage",
    ACHIEVEMENT_IDS.FISHER_KING, 100),
  stat("MAX_VOYAGE_MAP_PERCENT", "Most globe mapped in one voyage",
    ACHIEVEMENT_IDS.FEWER_DRAGONS, 70),
  stat("MAX_VOYAGE_PASSENGERS_DELIVERED", "Most passengers delivered in one voyage",
    ACHIEVEMENT_IDS.PACKET_CAPTAIN, 5),
  stat("MAX_VOYAGE_PORTS_VISITED", "Most ports visited in one voyage",
    ACHIEVEMENT_IDS.SEVEN_SEAS, 50),
  stat("MAX_VOYAGE_ENEMIES_DEFEATED", "Most enemy ships defeated in one voyage",
    ACHIEVEMENT_IDS.TERROR_OF_THE_SEAS, 10),
  stat("MAX_VOYAGE_NAMED_CREW", "Most named crewmates aboard",
    ACHIEVEMENT_IDS.A_FINE_COMPANY, 3),
  stat("MAX_VOYAGE_SPECIAL_EQUIPMENT", "Most special equipment owned",
    ACHIEVEMENT_IDS.SHIPSHAPE, 3)
]);

export const STEAM_ACHIEVEMENT_PROGRESS = Object.freeze({
  [ACHIEVEMENT_IDS.SPICE_TRADER]: progress("MAX_VOYAGE_SPICES_SOLD", 5),
  [ACHIEVEMENT_IDS.MILLIONAIRE]: progress("MAX_VOYAGE_EARNINGS", 1_000_000),
  [ACHIEVEMENT_IDS.COLONIST]: progress("MAX_VOYAGE_COLONIES_FOUNDED", 5),
  [ACHIEVEMENT_IDS.NEW_HORIZONS]: progress("MAX_VOYAGE_DISCOVERIES", 1),
  [ACHIEVEMENT_IDS.CHART_MAKER]: progress("MAX_VOYAGE_DISCOVERIES", 10),
  [ACHIEVEMENT_IDS.FAIR_EXCHANGE]: progress("MAX_VOYAGE_GOODS_SOLD", 1),
  [ACHIEVEMENT_IDS.GENERAL_MERCHANT]: progress("MAX_VOYAGE_GOODS_SOLD", 5),
  [ACHIEVEMENT_IDS.SPICE_OF_LIFE]: progress("MAX_VOYAGE_SPICES_SOLD", 1),
  [ACHIEVEMENT_IDS.MERCHANT_ADVENTURER]: progress("MAX_VOYAGE_EARNINGS", 10_000),
  [ACHIEVEMENT_IDS.MERCHANT_PRINCE]: progress("MAX_VOYAGE_EARNINGS", 100_000),
  [ACHIEVEMENT_IDS.FOUNDER]: progress("MAX_VOYAGE_COLONIES_FOUNDED", 1),
  [ACHIEVEMENT_IDS.EXPANSIONIST]: progress("MAX_VOYAGE_COLONIES_FOUNDED", 3),
  [ACHIEVEMENT_IDS.NEW_COMMAND]: progress("LIFETIME_SHIPS_SAILED", 2),
  [ACHIEVEMENT_IDS.SHIP_COLLECTOR]: progress("LIFETIME_SHIPS_SAILED", 5),
  [ACHIEVEMENT_IDS.GONE_FISHING]: progress("MAX_VOYAGE_FISH_CAUGHT", 1),
  [ACHIEVEMENT_IDS.GOOD_HAUL]: progress("MAX_VOYAGE_FISH_CAUGHT", 20),
  [ACHIEVEMENT_IDS.PASSAGE_COMPLETE]: progress("MAX_VOYAGE_PASSENGERS_DELIVERED", 1),
  [ACHIEVEMENT_IDS.COASTAL_SURVEYOR]: progress("MAX_VOYAGE_MAP_PERCENT", 30),
  [ACHIEVEMENT_IDS.HALF_THE_WORLD]: progress("MAX_VOYAGE_MAP_PERCENT", 50),
  [ACHIEVEMENT_IDS.FEWER_DRAGONS]: progress("MAX_VOYAGE_MAP_PERCENT", 70),
  [ACHIEVEMENT_IDS.PORT_OF_CALL]: progress("MAX_VOYAGE_PORTS_VISITED", 25),
  [ACHIEVEMENT_IDS.SEVEN_SEAS]: progress("MAX_VOYAGE_PORTS_VISITED", 50),
  [ACHIEVEMENT_IDS.FISHER_KING]: progress("MAX_VOYAGE_FISH_CAUGHT", 100),
  [ACHIEVEMENT_IDS.CARGO_OF_EVERY_KIND]: progress("MAX_VOYAGE_GOODS_SOLD", 15),
  [ACHIEVEMENT_IDS.PACKET_CAPTAIN]: progress("MAX_VOYAGE_PASSENGERS_DELIVERED", 5),
  [ACHIEVEMENT_IDS.FIRST_VICTORY]: progress("MAX_VOYAGE_ENEMIES_DEFEATED", 1),
  [ACHIEVEMENT_IDS.TERROR_OF_THE_SEAS]: progress("MAX_VOYAGE_ENEMIES_DEFEATED", 10),
  [ACHIEVEMENT_IDS.A_FINE_COMPANY]: progress("MAX_VOYAGE_NAMED_CREW", 3),
  [ACHIEVEMENT_IDS.SHIPSHAPE]: progress("MAX_VOYAGE_SPECIAL_EQUIPMENT", 3)
});

const STEAM_STAT_BY_API_NAME = new Map(
  STEAM_STAT_CATALOG.map((entry) => [entry.apiName, entry])
);
if (STEAM_STAT_BY_API_NAME.size !== STEAM_STAT_CATALOG.length) {
  throw new Error("Steam stat catalog contains duplicate API names");
}

for (const [achievementId, binding] of Object.entries(STEAM_ACHIEVEMENT_PROGRESS)) {
  const statEntry = STEAM_STAT_BY_API_NAME.get(binding.statApiName);
  if (!statEntry) throw new Error(`${achievementId} references missing Steam stat ${binding.statApiName}`);
  if (binding.unlockValue > statEntry.maxValue) {
    throw new Error(`${achievementId} exceeds Steam stat ${binding.statApiName}`);
  }
}

export function steamStatValues(profile, voyageProgress, snapshot) {
  const values = Object.fromEntries(STEAM_STAT_CATALOG.map((entry) => {
    const current = achievementProgress(
      profile,
      voyageProgress,
      snapshot,
      entry.sourceAchievementId
    ).value;
    const unlockedFloor = Object.entries(STEAM_ACHIEVEMENT_PROGRESS)
      .filter(([, binding]) => binding.statApiName === entry.apiName)
      .reduce((highest, [achievementId, binding]) => (
        profile.unlocked[achievementId]
          ? Math.max(highest, binding.unlockValue)
          : highest
      ), 0);
    return [entry.apiName, Math.min(entry.maxValue, Math.max(current, unlockedFloor))];
  }));
  return Object.freeze(values);
}

export function steamAchievementProgressBinding(achievementId) {
  return STEAM_ACHIEVEMENT_PROGRESS[achievementId] || null;
}

function stat(apiName, displayName, sourceAchievementId, maxValue) {
  if (!Number.isInteger(maxValue) || maxValue < 1) {
    throw new Error(`Invalid Steam stat maximum: ${apiName}=${maxValue}`);
  }
  return Object.freeze({
    apiName,
    displayName,
    type: "INT",
    setBy: "Client",
    incrementOnly: true,
    minValue: 0,
    maxValue,
    defaultValue: 0,
    aggregated: false,
    sourceAchievementId
  });
}

function progress(statApiName, unlockValue) {
  return Object.freeze({ statApiName, unlockValue });
}
