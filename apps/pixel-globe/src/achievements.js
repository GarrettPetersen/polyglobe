import { gameStorage } from "./gameStorage.js";

export const ACHIEVEMENT_PROFILE_STORAGE_KEY = "marque-and-reprisal.achievements";
export const ACHIEVEMENT_PROFILE_VERSION = 2;
export const VOYAGE_ACHIEVEMENT_PROGRESS_VERSION = 2;

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
  GINGER_FARMER: "ginger-farmer",
  NEW_HORIZONS: "new-horizons",
  CHART_MAKER: "chart-maker",
  FAIR_EXCHANGE: "fair-exchange",
  GENERAL_MERCHANT: "general-merchant",
  SPICE_OF_LIFE: "spice-of-life",
  MERCHANT_ADVENTURER: "merchant-adventurer",
  MERCHANT_PRINCE: "merchant-prince",
  FOUNDER: "founder",
  EXPANSIONIST: "expansionist",
  NEW_COMMAND: "new-command",
  SHIP_COLLECTOR: "ship-collector",
  GONE_FISHING: "gone-fishing",
  GOOD_HAUL: "good-haul",
  PASSAGE_COMPLETE: "passage-complete",
  SHORE_LEAVE: "shore-leave",
  PRIZE_TAKEN: "prize-taken",
  FIRST_VICTORY: "first-victory",
  COASTAL_SURVEYOR: "coastal-surveyor",
  HALF_THE_WORLD: "half-the-world",
  FEWER_DRAGONS: "fewer-dragons",
  ALOHA_SAILOR: "aloha-sailor",
  NO_ONE_LEFT_IN_CHAINS: "no-one-left-in-chains",
  NOT_FORGOTTEN: "not-forgotten",
  TWO_HEARTS_ONE_HORIZON: "two-hearts-one-horizon",
  PORT_OF_CALL: "port-of-call",
  SEVEN_SEAS: "seven-seas",
  FISHER_KING: "fisher-king",
  CARGO_OF_EVERY_KIND: "cargo-of-every-kind",
  PACKET_CAPTAIN: "packet-captain",
  TERROR_OF_THE_SEAS: "terror-of-the-seas",
  THERE_SHE_BLOWS: "there-she-blows",
  BOLT_FROM_THE_BLUE: "bolt-from-the-blue",
  RAISE_OUR_COLORS: "raise-our-colors",
  A_FINE_COMPANY: "a-fine-company",
  SHIPSHAPE: "shipshape",
  ALL_HANDS: "all-hands",
  VOYAGE_FULFILLED: "voyage-fulfilled",
  GREAT_BESTIARY: "great-bestiary"
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
    "Circumnavigate the globe.", "voyage", "achievement:magellan", "MAGELLAN"),
  achievement(ACHIEVEMENT_IDS.SPICE_TRADER, "Spice Trader",
    "Sell cinnamon, nutmeg, pepper, cloves, and ginger in one voyage.", "voyage", "good:cloves", "SPICE_TRADER"),
  achievement(ACHIEVEMENT_IDS.MILLIONAIRE, "Millionaire",
    "Earn 1,000,000 doubloons in a single voyage.", "voyage", "good:silver", "MILLIONAIRE"),
  achievement(ACHIEVEMENT_IDS.COLONIST, "Colonist",
    "Found five new cities in a single voyage.", "voyage", "achievement:colonist", "COLONIST"),
  achievement(ACHIEVEMENT_IDS.CONQUEROR, "Conqueror",
    "Destroy an empire by taking its capital.", "voyage", "item:longsword", "CONQUEROR"),
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
    "Transplant Old World ginger into the New World.", "voyage", "good:ginger", "GINGER_FARMER", { hidden: true }),
  achievement(ACHIEVEMENT_IDS.NEW_HORIZONS, "New Horizons",
    "Make your first discovery.", "voyage", "action:quest", "NEW_HORIZONS"),
  achievement(ACHIEVEMENT_IDS.CHART_MAKER, "Chart Maker",
    "Make 10 discoveries in one voyage.", "voyage", "item:pilots-instruments", "CHART_MAKER"),
  achievement(ACHIEVEMENT_IDS.FAIR_EXCHANGE, "A Fair Exchange",
    "Sell your first cargo.", "voyage", "action:sell", "FAIR_EXCHANGE"),
  achievement(ACHIEVEMENT_IDS.GENERAL_MERCHANT, "General Merchant",
    "Sell five different kinds of goods in one voyage.", "voyage", "action:inventory", "GENERAL_MERCHANT"),
  achievement(ACHIEVEMENT_IDS.SPICE_OF_LIFE, "Spice of Life",
    "Sell any spice.", "voyage", "good:cinnamon", "SPICE_OF_LIFE"),
  achievement(ACHIEVEMENT_IDS.MERCHANT_ADVENTURER, "Merchant Adventurer",
    "Earn 10,000 doubloons in one voyage.", "voyage", "good:silk", "MERCHANT_ADVENTURER"),
  achievement(ACHIEVEMENT_IDS.MERCHANT_PRINCE, "Merchant Prince",
    "Earn 100,000 doubloons in one voyage.", "voyage", "good:artwork", "MERCHANT_PRINCE"),
  achievement(ACHIEVEMENT_IDS.FOUNDER, "Founder",
    "Found your first new city.", "voyage", "achievement:founder", "FOUNDER"),
  achievement(ACHIEVEMENT_IDS.EXPANSIONIST, "Expansionist",
    "Found three new cities in one voyage.", "voyage", "achievement:expansionist", "EXPANSIONIST"),
  achievement(ACHIEVEMENT_IDS.NEW_COMMAND, "New Command",
    "Sail two different ship types across any number of voyages.", "lifetime", "ship:brigantine", "NEW_COMMAND"),
  achievement(ACHIEVEMENT_IDS.SHIP_COLLECTOR, "Ship Collector",
    "Sail five different ship types across any number of voyages.", "lifetime", "ship:fluyt", "SHIP_COLLECTOR"),
  achievement(ACHIEVEMENT_IDS.GONE_FISHING, "Gone Fishing",
    "Catch your first fish.", "voyage", "action:fish", "GONE_FISHING"),
  achievement(ACHIEVEMENT_IDS.GOOD_HAUL, "A Good Haul",
    "Catch 20 fish in one voyage.", "voyage", "good:fish", "GOOD_HAUL"),
  achievement(ACHIEVEMENT_IDS.PASSAGE_COMPLETE, "Passage Complete",
    "Deliver a passenger safely to their destination.", "voyage", "action:passenger", "PASSAGE_COMPLETE"),
  achievement(ACHIEVEMENT_IDS.SHORE_LEAVE, "Shore Leave",
    "Complete a shore scavenging expedition.", "voyage", "action:scavenge", "SHORE_LEAVE"),
  achievement(ACHIEVEMENT_IDS.PRIZE_TAKEN, "Prize Taken",
    "Acquire a new ship.", "voyage", "ship:galleon", "PRIZE_TAKEN"),
  achievement(ACHIEVEMENT_IDS.FIRST_VICTORY, "First Victory",
    "Sink or force the surrender of an enemy ship.", "voyage", "action:attack", "FIRST_VICTORY"),
  achievement(ACHIEVEMENT_IDS.COASTAL_SURVEYOR, "Coastal Surveyor",
    "Map 30% of the globe in one voyage.", "voyage", "action:navigation", "COASTAL_SURVEYOR"),
  achievement(ACHIEVEMENT_IDS.HALF_THE_WORLD, "Half the World",
    "Map 50% of the globe in one voyage.", "voyage", "ship:polynesian-voyaging-canoe", "HALF_THE_WORLD"),
  achievement(ACHIEVEMENT_IDS.FEWER_DRAGONS, "Here Be Fewer Dragons",
    "Map 70% of the globe in one voyage.", "voyage", "ship:carrack", "FEWER_DRAGONS"),
  achievement(ACHIEVEMENT_IDS.ALOHA_SAILOR, "Aloha, Sailor",
    "Dock at the remote village of Hawaii.", "voyage", "achievement:hawaii", "ALOHA_SAILOR"),
  achievement(ACHIEVEMENT_IDS.NO_ONE_LEFT_IN_CHAINS, "No One Left in Chains",
    "Bring a rescued pirate captive back to their home port.", "voyage", "status:achievement-unlocked",
    "NO_ONE_LEFT_IN_CHAINS", { hidden: true }),
  achievement(ACHIEVEMENT_IDS.NOT_FORGOTTEN, "Not Forgotten",
    "Bring a rescued castaway back to their home port.", "voyage", "action:anchor", "NOT_FORGOTTEN",
    { hidden: true }),
  achievement(ACHIEVEMENT_IDS.TWO_HEARTS_ONE_HORIZON, "Two Hearts, One Horizon",
    "Marry a named crewmate after a victorious voyage.", "voyage", "achievement:married",
    "TWO_HEARTS_ONE_HORIZON", { hidden: true }),
  achievement(ACHIEVEMENT_IDS.PORT_OF_CALL, "Port of Call",
    "Visit 25 different ports in one voyage.", "voyage", "action:dock", "PORT_OF_CALL"),
  achievement(ACHIEVEMENT_IDS.SEVEN_SEAS, "Seven Seas",
    "Visit 50 different ports in one voyage.", "voyage", "ship:spanish-nao", "SEVEN_SEAS"),
  achievement(ACHIEVEMENT_IDS.FISHER_KING, "Fisher King",
    "Catch 100 fish in one voyage.", "voyage", "item:bronze-fish-hooks", "FISHER_KING"),
  achievement(ACHIEVEMENT_IDS.CARGO_OF_EVERY_KIND, "Cargo of Every Kind",
    "Sell 15 different kinds of goods in one voyage.", "voyage", "good:porcelain",
    "CARGO_OF_EVERY_KIND"),
  achievement(ACHIEVEMENT_IDS.PACKET_CAPTAIN, "Packet Captain",
    "Deliver five passengers safely in one voyage.", "voyage", "ship:small-cog", "PACKET_CAPTAIN"),
  achievement(ACHIEVEMENT_IDS.TERROR_OF_THE_SEAS, "Terror of the Seas",
    "Defeat 10 enemy ships in one voyage.", "voyage", "good:gunpowder", "TERROR_OF_THE_SEAS"),
  achievement(ACHIEVEMENT_IDS.THERE_SHE_BLOWS, "There She Blows",
    "Successfully hunt a whale.", "voyage", "good:whale-blubber", "THERE_SHE_BLOWS"),
  achievement(ACHIEVEMENT_IDS.BOLT_FROM_THE_BLUE, "Bolt from the Blue",
    "Survive a lightning strike at sea.", "voyage", "achievement:lightning", "BOLT_FROM_THE_BLUE"),
  achievement(ACHIEVEMENT_IDS.RAISE_OUR_COLORS, "Raise Our Colors",
    "Conquer a port for your nation.", "voyage", "action:surrender", "RAISE_OUR_COLORS"),
  achievement(ACHIEVEMENT_IDS.A_FINE_COMPANY, "A Fine Company",
    "Have three named crewmates aboard at once.", "voyage", "menu:captain", "A_FINE_COMPANY"),
  achievement(ACHIEVEMENT_IDS.SHIPSHAPE, "Shipshape",
    "Own three pieces of special equipment at once.", "voyage", "item:sturdy-barrels", "SHIPSHAPE"),
  achievement(ACHIEVEMENT_IDS.ALL_HANDS, "All Hands",
    "Fill every crew berth on a ship that holds at least 10 sailors.", "voyage", "ship:mediterranean-galley", "ALL_HANDS"),
  achievement(ACHIEVEMENT_IDS.VOYAGE_FULFILLED, "Voyage Fulfilled",
    "Complete a captain's main goal and return home.", "voyage", "menu:achievements", "VOYAGE_FULFILLED"),
  achievement(ACHIEVEMENT_IDS.GREAT_BESTIARY, "The Great Bestiary",
    "Encounter every documented animal across any number of voyages.", "lifetime", "good:beaver-pelts", "GREAT_BESTIARY")
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
    lifetime: { sailedShipSlugs: [], seenAnimalIds: [] },
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
    arrivedInPortDrunk: false,
    married: false,
    defeatedShipCount: 0,
    whalesKilled: 0,
    survivedLightningStrike: false
  };
}

export function migrateVoyageAchievementProgress(progress) {
  if (progress === undefined || progress === null) return createVoyageAchievementProgress();
  if (progress.version === 1) {
    return validateVoyageAchievementProgress({
      ...progress,
      version: VOYAGE_ACHIEVEMENT_PROGRESS_VERSION,
      married: false,
      defeatedShipCount: 0,
      whalesKilled: progress.whiteWhaleKilled ? 1 : 0,
      survivedLightningStrike: false
    });
  }
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
  for (const key of ["whiteWhaleKilled", "arrivedInPortDrunk", "married", "survivedLightningStrike"]) {
    if (typeof progress[key] !== "boolean") throw new Error(`Invalid voyage achievement flag: ${key}`);
  }
  for (const key of ["defeatedShipCount", "whalesKilled"]) {
    if (!Number.isInteger(progress[key]) || progress[key] < 0) {
      throw new Error(`Invalid voyage achievement count ${key}: ${progress[key]}`);
    }
  }
  return progress;
}

export function readAchievementProfile({ storage = defaultStorage() } = {}) {
  try {
    const serialized = storage.getItem(ACHIEVEMENT_PROFILE_STORAGE_KEY);
    if (serialized === null) {
      return { status: "ready", profile: createAchievementProfile(), error: null };
    }
    const profile = migrateAchievementProfile(JSON.parse(serialized));
    validateAchievementProfile(profile);
    return { status: "ready", profile, error: null };
  } catch (error) {
    return { status: "invalid", profile: null, error: asError(error) };
  }
}

export function migrateAchievementProfile(profile) {
  if (profile?.version === ACHIEVEMENT_PROFILE_VERSION) return profile;
  if (profile?.version !== 1) {
    throw new Error(`Unsupported achievement profile: ${profile?.version ?? "missing"}`);
  }
  return {
    ...profile,
    version: ACHIEVEMENT_PROFILE_VERSION,
    lifetime: {
      ...profile.lifetime,
      seenAnimalIds: []
    }
  };
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
  validateUniqueStringList(profile.lifetime.seenAnimalIds, "lifetime animal sightings");
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

export function orderedAchievementCatalog(profile) {
  validateAchievementProfile(profile);
  const completed = [];
  const incomplete = [];
  for (const achievement of ACHIEVEMENT_CATALOG) {
    (profile.unlocked[achievement.id] ? completed : incomplete).push(achievement);
  }
  return Object.freeze([...completed, ...incomplete]);
}

export function achievementCatalogPageForId(profile, achievementId, pageSize) {
  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    throw new Error(`Invalid achievement page size: ${pageSize}`);
  }
  assertAchievementId(achievementId);
  const index = orderedAchievementCatalog(profile).findIndex(
    (achievement) => achievement.id === achievementId
  );
  if (index < 0) throw new Error(`Achievement is absent from the catalog: ${achievementId}`);
  return Math.floor(index / pageSize);
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
  } else if (event.type === "married") {
    changed = setFlag(progress, "married");
  } else if (event.type === "enemy-ship-defeated") {
    changed = increment(progress, "defeatedShipCount");
  } else if (event.type === "whale-killed") {
    changed = increment(progress, "whalesKilled");
  } else if (event.type === "survived-lightning-strike") {
    changed = setFlag(progress, "survivedLightningStrike");
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
  changed = addAll(profile.lifetime.seenAnimalIds, snapshot.animalIds) || changed;
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
  unlockWhen(ACHIEVEMENT_IDS.NEW_HORIZONS, snapshot.discoveryIds.length >= 1);
  unlockWhen(ACHIEVEMENT_IDS.CHART_MAKER, snapshot.discoveryIds.length >= 10);
  unlockWhen(ACHIEVEMENT_IDS.FAIR_EXCHANGE, snapshot.soldGoodIds.length >= 1);
  unlockWhen(ACHIEVEMENT_IDS.GENERAL_MERCHANT, snapshot.soldGoodIds.length >= 5);
  unlockWhen(ACHIEVEMENT_IDS.SPICE_OF_LIFE,
    snapshot.soldGoodIds.some((id) => SPICE_TRADER_GOOD_IDS.includes(id)));
  unlockWhen(ACHIEVEMENT_IDS.MERCHANT_ADVENTURER, progress.grossDoubloonsEarned >= 10_000);
  unlockWhen(ACHIEVEMENT_IDS.MERCHANT_PRINCE, progress.grossDoubloonsEarned >= 100_000);
  unlockWhen(ACHIEVEMENT_IDS.FOUNDER, progress.foundedCityIds.length >= 1);
  unlockWhen(ACHIEVEMENT_IDS.EXPANSIONIST, progress.foundedCityIds.length >= 3);
  unlockWhen(ACHIEVEMENT_IDS.NEW_COMMAND, profile.lifetime.sailedShipSlugs.length >= 2);
  unlockWhen(ACHIEVEMENT_IDS.SHIP_COLLECTOR, profile.lifetime.sailedShipSlugs.length >= 5);
  unlockWhen(ACHIEVEMENT_IDS.GONE_FISHING, snapshot.fishCaughtQuantity >= 1);
  unlockWhen(ACHIEVEMENT_IDS.GOOD_HAUL, snapshot.fishCaughtQuantity >= 20);
  unlockWhen(ACHIEVEMENT_IDS.PASSAGE_COMPLETE, snapshot.passengerDeliveries >= 1);
  unlockWhen(ACHIEVEMENT_IDS.SHORE_LEAVE, snapshot.shoreScavengeCompleted);
  unlockWhen(ACHIEVEMENT_IDS.PRIZE_TAKEN, snapshot.acquiredShips >= 1);
  unlockWhen(ACHIEVEMENT_IDS.FIRST_VICTORY, snapshot.defeatedShip);
  unlockWhen(ACHIEVEMENT_IDS.COASTAL_SURVEYOR, snapshot.mappedPercent >= 30);
  unlockWhen(ACHIEVEMENT_IDS.HALF_THE_WORLD, snapshot.mappedPercent >= 50);
  unlockWhen(ACHIEVEMENT_IDS.FEWER_DRAGONS, snapshot.mappedPercent >= 70);
  unlockWhen(ACHIEVEMENT_IDS.ALOHA_SAILOR, snapshot.hawaiiVisited);
  unlockWhen(ACHIEVEMENT_IDS.NO_ONE_LEFT_IN_CHAINS, snapshot.pirateCaptivesBroughtHome >= 1);
  unlockWhen(ACHIEVEMENT_IDS.NOT_FORGOTTEN, snapshot.castawaysBroughtHome >= 1);
  unlockWhen(ACHIEVEMENT_IDS.TWO_HEARTS_ONE_HORIZON, progress.married);
  unlockWhen(ACHIEVEMENT_IDS.PORT_OF_CALL, snapshot.visitedPortCount >= 25);
  unlockWhen(ACHIEVEMENT_IDS.SEVEN_SEAS, snapshot.visitedPortCount >= 50);
  unlockWhen(ACHIEVEMENT_IDS.FISHER_KING, snapshot.fishCaughtQuantity >= 100);
  unlockWhen(ACHIEVEMENT_IDS.CARGO_OF_EVERY_KIND, snapshot.soldGoodIds.length >= 15);
  unlockWhen(ACHIEVEMENT_IDS.PACKET_CAPTAIN, snapshot.passengerDeliveries >= 5);
  unlockWhen(ACHIEVEMENT_IDS.TERROR_OF_THE_SEAS, progress.defeatedShipCount >= 10);
  unlockWhen(ACHIEVEMENT_IDS.THERE_SHE_BLOWS, progress.whalesKilled >= 1);
  unlockWhen(ACHIEVEMENT_IDS.BOLT_FROM_THE_BLUE, progress.survivedLightningStrike);
  unlockWhen(ACHIEVEMENT_IDS.RAISE_OUR_COLORS, snapshot.capturedPortCount >= 1);
  unlockWhen(ACHIEVEMENT_IDS.A_FINE_COMPANY, snapshot.namedCrewCount >= 3);
  unlockWhen(ACHIEVEMENT_IDS.SHIPSHAPE, snapshot.specialEquipmentCount >= 3);
  unlockWhen(ACHIEVEMENT_IDS.ALL_HANDS, snapshot.fullCrew);
  unlockWhen(ACHIEVEMENT_IDS.VOYAGE_FULFILLED, snapshot.campaignVictory);
  unlockWhen(ACHIEVEMENT_IDS.GREAT_BESTIARY,
    snapshot.animalCatalogIds.length > 0 &&
    snapshot.animalCatalogIds.every((id) => profile.lifetime.seenAnimalIds.includes(id)));

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
  } else if (achievementId === ACHIEVEMENT_IDS.NEW_HORIZONS) {
    value = snapshot.discoveryIds.length;
  } else if (achievementId === ACHIEVEMENT_IDS.CHART_MAKER) {
    value = snapshot.discoveryIds.length;
    target = 10;
  } else if (achievementId === ACHIEVEMENT_IDS.FAIR_EXCHANGE) {
    value = snapshot.soldGoodIds.length;
  } else if (achievementId === ACHIEVEMENT_IDS.GENERAL_MERCHANT) {
    value = snapshot.soldGoodIds.length;
    target = 5;
  } else if (achievementId === ACHIEVEMENT_IDS.SPICE_OF_LIFE) {
    value = snapshot.soldGoodIds.some((id) => SPICE_TRADER_GOOD_IDS.includes(id)) ? 1 : 0;
  } else if (achievementId === ACHIEVEMENT_IDS.MERCHANT_ADVENTURER) {
    value = progress.grossDoubloonsEarned;
    target = 10_000;
  } else if (achievementId === ACHIEVEMENT_IDS.MERCHANT_PRINCE) {
    value = progress.grossDoubloonsEarned;
    target = 100_000;
  } else if (achievementId === ACHIEVEMENT_IDS.FOUNDER) {
    value = progress.foundedCityIds.length;
  } else if (achievementId === ACHIEVEMENT_IDS.EXPANSIONIST) {
    value = progress.foundedCityIds.length;
    target = 3;
  } else if (achievementId === ACHIEVEMENT_IDS.NEW_COMMAND) {
    value = profile.lifetime.sailedShipSlugs.length;
    target = 2;
  } else if (achievementId === ACHIEVEMENT_IDS.SHIP_COLLECTOR) {
    value = profile.lifetime.sailedShipSlugs.length;
    target = 5;
  } else if (achievementId === ACHIEVEMENT_IDS.GONE_FISHING) {
    value = snapshot.fishCaughtQuantity;
  } else if (achievementId === ACHIEVEMENT_IDS.GOOD_HAUL) {
    value = snapshot.fishCaughtQuantity;
    target = 20;
  } else if (achievementId === ACHIEVEMENT_IDS.PASSAGE_COMPLETE) {
    value = snapshot.passengerDeliveries;
  } else if (achievementId === ACHIEVEMENT_IDS.SHORE_LEAVE) {
    value = snapshot.shoreScavengeCompleted ? 1 : 0;
  } else if (achievementId === ACHIEVEMENT_IDS.PRIZE_TAKEN) {
    value = snapshot.acquiredShips;
  } else if (achievementId === ACHIEVEMENT_IDS.FIRST_VICTORY) {
    value = snapshot.defeatedShip ? 1 : 0;
  } else if (achievementId === ACHIEVEMENT_IDS.COASTAL_SURVEYOR) {
    value = snapshot.mappedPercent;
    target = 30;
  } else if (achievementId === ACHIEVEMENT_IDS.HALF_THE_WORLD) {
    value = snapshot.mappedPercent;
    target = 50;
  } else if (achievementId === ACHIEVEMENT_IDS.FEWER_DRAGONS) {
    value = snapshot.mappedPercent;
    target = 70;
  } else if (achievementId === ACHIEVEMENT_IDS.ALOHA_SAILOR) {
    value = snapshot.hawaiiVisited ? 1 : 0;
  } else if (achievementId === ACHIEVEMENT_IDS.NO_ONE_LEFT_IN_CHAINS) {
    value = snapshot.pirateCaptivesBroughtHome;
  } else if (achievementId === ACHIEVEMENT_IDS.NOT_FORGOTTEN) {
    value = snapshot.castawaysBroughtHome;
  } else if (achievementId === ACHIEVEMENT_IDS.TWO_HEARTS_ONE_HORIZON) {
    value = progress.married ? 1 : 0;
  } else if (achievementId === ACHIEVEMENT_IDS.PORT_OF_CALL) {
    value = snapshot.visitedPortCount;
    target = 25;
  } else if (achievementId === ACHIEVEMENT_IDS.SEVEN_SEAS) {
    value = snapshot.visitedPortCount;
    target = 50;
  } else if (achievementId === ACHIEVEMENT_IDS.FISHER_KING) {
    value = snapshot.fishCaughtQuantity;
    target = 100;
  } else if (achievementId === ACHIEVEMENT_IDS.CARGO_OF_EVERY_KIND) {
    value = snapshot.soldGoodIds.length;
    target = 15;
  } else if (achievementId === ACHIEVEMENT_IDS.PACKET_CAPTAIN) {
    value = snapshot.passengerDeliveries;
    target = 5;
  } else if (achievementId === ACHIEVEMENT_IDS.TERROR_OF_THE_SEAS) {
    value = progress.defeatedShipCount;
    target = 10;
  } else if (achievementId === ACHIEVEMENT_IDS.THERE_SHE_BLOWS) {
    value = progress.whalesKilled;
  } else if (achievementId === ACHIEVEMENT_IDS.BOLT_FROM_THE_BLUE) {
    value = progress.survivedLightningStrike ? 1 : 0;
  } else if (achievementId === ACHIEVEMENT_IDS.RAISE_OUR_COLORS) {
    value = snapshot.capturedPortCount;
  } else if (achievementId === ACHIEVEMENT_IDS.A_FINE_COMPANY) {
    value = snapshot.namedCrewCount;
    target = 3;
  } else if (achievementId === ACHIEVEMENT_IDS.SHIPSHAPE) {
    value = snapshot.specialEquipmentCount;
    target = 3;
  } else if (achievementId === ACHIEVEMENT_IDS.ALL_HANDS) {
    value = snapshot.fullCrew ? 1 : 0;
  } else if (achievementId === ACHIEVEMENT_IDS.VOYAGE_FULFILLED) {
    value = snapshot.campaignVictory ? 1 : 0;
  } else if (achievementId === ACHIEVEMENT_IDS.GREAT_BESTIARY) {
    value = snapshot.animalCatalogIds.filter((id) => profile.lifetime.seenAnimalIds.includes(id)).length;
    target = snapshot.animalCatalogIds.length;
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
    "animalIds",
    "animalCatalogIds",
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
    "fishCaughtQuantity",
    "passengerDeliveries",
    "acquiredShips",
    "pirateCaptivesBroughtHome",
    "castawaysBroughtHome",
    "visitedPortCount",
    "capturedPortCount",
    "namedCrewCount",
    "specialEquipmentCount"
  ]) {
    if (!Number.isInteger(snapshot[key]) || snapshot[key] < 0) {
      throw new Error(`Invalid achievement snapshot count ${key}: ${snapshot[key]}`);
    }
  }
  if (!Number.isInteger(snapshot.mappedPercent) || snapshot.mappedPercent < 0 || snapshot.mappedPercent > 100) {
    throw new Error(`Invalid achievement snapshot mapped percent: ${snapshot.mappedPercent}`);
  }
  for (const key of [
    "vikingLongshipUnlocked",
    "whiteWhaleKilled",
    "arrivedInPortDrunk",
    "japaneseMatchlockIndustryCreated",
    "caribbeanGingerIndustryCreated",
    "shoreScavengeCompleted",
    "defeatedShip",
    "hawaiiVisited",
    "fullCrew",
    "campaignVictory"
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

function increment(target, key) {
  target[key] += 1;
  return true;
}

function requiredString(value, label) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`Invalid ${label}`);
  return value;
}

function defaultStorage() {
  return gameStorage;
}

function asError(value) {
  return value instanceof Error ? value : new Error(String(value));
}
