import {
  FORAGED_FOOD_GOOD_ID,
  FRESH_WATER_GOOD_ID,
  GUNPOWDER_GOOD_ID,
  HARDTACK_GOOD_ID,
  MATCHLOCKS_GOOD_ID,
  WINE_GOOD_ID,
  WHALE_BLUBBER_GOOD_ID,
  TRADE_GOODS,
  executePortPurchase,
  executePortSale,
  maximumPortPurchaseQuantity,
  portMarket,
  quotePortPurchase,
  quotePortSale,
  tradeGoodById
} from "./economy.js";
import {
  createVoyageAchievementProgress,
  migrateVoyageAchievementProgress,
  validateVoyageAchievementProgress
} from "./achievements.js";
import {
  createAnimalEncounterMemory,
  validateAnimalEncounterMemory
} from "./animalEncounters.js";
import {
  createPandaCompanionMemory,
  migratePandaCompanionMemory,
  pandaCompanionConsumption,
  validatePandaCompanionMemory
} from "./pandaCompanion.js";
import {
  createNaturalistQuestMemory,
  validateNaturalistQuestMemory
} from "./naturalistQuest.js";
import { createBirthdayMemory, validateBirthdayMemory } from "./birthdayEvents.js";
import {
  DIPLOMACY_HOSTILE,
  DIPLOMACY_NEUTRAL,
  DIPLOMACY_WAR,
  FACTIONS,
  NEUTRAL_FACTION_ID,
  PIRATE_FACTION_ID,
  assertFactionId,
  diplomacyBetween,
  migrateFactionIdTo1522
} from "./factions.js";
import {
  CANNON_RESTOCK_COST,
  CREW_HIRE_COST,
  CUSTOM_LOADOUT_ID,
  FOOD_RATIONS_PER_HOLD_UNIT,
  WATER_PERSON_DAYS_PER_UNIT,
  WATER_RESTOCK_COST,
  balancedProvisionTargets,
  crewHoldSpace,
  fitShipCustomLoadoutPlan,
  shipCustomLoadoutPlan,
  shipLoadoutPlan
} from "./shipLoadouts.js";
import { shipLabelForSlug, shipStatsForSlug } from "./shipStats.js";
import { formatSignedReputation } from "./reputationDisplay.js";
import { greatCircleDistanceKm } from "./worldDistance.js";
import {
  BASIC_FISHING_NET_ID,
  fishingNetById
} from "./fishingNets.js";
import {
  STANDARD_CANNON_EQUIPMENT_ID,
  cannonEquipmentById
} from "./cannonEquipment.js";
import {
  EQUIPMENT_STOCK_CANNON,
  EQUIPMENT_STOCK_FISHING_NET,
  EQUIPMENT_STOCK_WHALE_HARPOON,
  equipmentAvailableAtPort
} from "./portEquipment.js";
import { BASIC_WHALE_HARPOON_ID, whaleHarpoonById } from "./whaleHarpoons.js";
import { createWhaleMemory, validateWhaleMemory } from "./whaleSystem.js";
import {
  adjustDiplomaticStance,
  advanceWorldDiplomacy,
  createWorldDiplomacy,
  recordDiplomaticPortCall,
  migrateWorldDiplomacy,
  recentDiplomacyEvents,
  validateWorldDiplomacy,
  worldDiplomacyBetween
} from "./worldDiplomacy.js";
import {
  createForeignSettlementExpulsionMemory,
  expelHostileForeignSettlements,
  migrateForeignSettlementExpulsionMemory,
  validateForeignSettlementExpulsionMemory
} from "./foreignSettlements.js";
import {
  MING_TRADE_POLICY_ID,
  createPersonalTradePassMemory,
  createSovereignTradeGrantMemory,
  grantPersonalTradePass,
  grantSovereignTradeToFaction,
  migratePersonalTradePassMemory,
  migrateSovereignTradeGrantMemory,
  personalTradePassGranted,
  sovereignTradePoliciesForHostFaction,
  sovereignTradeGrantedToFaction,
  sovereignTradePolicyById,
  validatePersonalTradePassMemory,
  validateSovereignTradeGrantMemory
} from "./sovereignTradeAccess.js";
import {
  PORTUGUESE_CARTAZ_DURATION_DAYS,
  PORTUGUESE_CARTAZ_INSPECTION_COOLDOWN_DAYS,
  PORTUGUESE_CROWN_SPICE_GOOD_IDS,
  PORTUGUESE_FACTION_ID,
  customsTerms,
  evaluateTradeAccess,
  isPortugueseEstadoPort,
  portugueseCartazFee,
  portugueseCartazFine,
  portugueseCartazRequired,
  portugueseControlledCargo,
  tradeTerms
} from "./tradePolicy.js";
import { NAVAL_WEAPON_ARROW } from "./navalWeapons.js";
import { createPortConquestMemory, validatePortConquestMemory } from "./portConquest.js";
import {
  CAMPAIGN_GOAL_EXPLORER,
  CAMPAIGN_GOAL_FAMILY_DEBT,
  CAMPAIGN_GOAL_TREASURE,
  CAMPAIGN_GOAL_WHITE_WHALE,
  campaignGoalTypeForCharacter,
  createCampaignGoal,
  settleExplorerHomecoming,
  settleFamilyDebtHomecoming,
  settleWhiteWhaleHomecoming,
  validateCampaignGoal
} from "./campaignGoals.js";
import {
  TREASURE_MAP_PIECE_COUNT,
  settleTreasureHomecoming
} from "./treasureCampaign.js";
import {
  COLONIZATION_SETTLER_COUNT,
  COLONIZATION_STAGE_OUTBOUND,
  createColonizationQuestMemory,
  validateColonizationQuestMemory
} from "./colonizationQuest.js";
import {
  CARGO_SPACE_TICKS_PER_UNIT,
  availableCargoTicks,
  cargoUnitsFromTicks,
  occupiedCargoTicks,
  wholeCargoUnitsAvailable
} from "./cargoSpace.js";
import { formatDisplayQuantity } from "./displayNumber.js";
import {
  createJapaneseMatchlockQuestMemory,
  validateJapaneseMatchlockQuestMemory
} from "./japaneseMatchlockQuest.js";
import {
  createCaribbeanGingerQuestMemory,
  validateCaribbeanGingerQuestMemory
} from "./caribbeanGingerQuest.js";
import { createChefQuestMemory, validateChefQuestMemory } from "./chefQuest.js";
import {
  characterSkillIdsForIdentity,
  validateCharacterSkillIds
} from "./characterSkills.js";
import {
  PERK_ITEMS,
  highValueMissionGiftItem,
  missionGiftItem,
  perkItemById
} from "./perkItems.js";
import {
  createPirateCaptiveQuestMemory,
  migratePirateCaptiveQuestMemory,
  validatePirateCaptiveQuestMemory
} from "./pirateCaptiveQuest.js";
import {
  createCastawayQuestMemory,
  migrateCastawayQuestMemory,
  validateCastawayQuestMemory
} from "./castawayQuest.js";
import {
  completeSpecialEquipmentOfferPurchase,
  createSpecialEquipmentOfferMemory,
  openSpecialEquipmentOffer,
  specialEquipmentOfferEntry,
  validateSpecialEquipmentOfferMemory
} from "./specialEquipmentOffers.js";
import { effectivePlayerShipStats, gameStatePerkTotals } from "./playerPerks.js";
import {
  createNamedCrewDeathNotice,
  createNamedCrewMemory,
  genericCrewCount,
  namedCrewMembers,
  permanentCrewFloor,
  removeNamedCrewMember,
  validateNamedCrew,
  validateNamedCrewDeathNotices
} from "./namedCrew.js";

export const STARTING_DOUBLOONS = 360;
export const GAME_STATE_VERSION = 44;
export const PLAYER_LEDGER_ENTRY_LIMIT = 750;
export const PORT_NAVIGATION_REASON_NEW_SHIP = "NEW SHIP FOR SALE";
export const PORT_NAVIGATION_REASON_TRADE_PRICE = "TRADE PRICE TIP";
export const REPUTATION_MIN = -100;
export const REPUTATION_MAX = 100;
export const HOME_FACTION_START_REPUTATION = 8;
export const ENEMY_FACTION_START_REPUTATION = -8;
export const PIRATE_START_REPUTATION = REPUTATION_MIN;
export const PIRATE_REPUTATION_GAIN_PER_PIRACY = 8;
export const PIRATE_HIDEOUT_REPUTATION_REQUIRED = -25;
export const TRADE_REPUTATION_GAIN = 0.2;
export const DELIVERY_REPUTATION_GAIN = 2;
export const DELIVERY_SPAWN_CHANCE = 0.32;
export const DELIVERY_ROLL_PERIOD_MINUTES = 7 * 24 * 60;
export const ONBOARDING_DELIVERY_COUNT = 4;
export const ONBOARDING_DELIVERY_SCENARIOS = Object.freeze([
  Object.freeze({
    id: "harbor-dispatch",
    cargoLabel: "harbor dispatch",
    offer: "A routine harbor dispatch needs a reliable captain.",
    completion: "The harbor seal is intact. A tidy first commission."
  }),
  Object.freeze({
    id: "pilot-soundings",
    cargoLabel: "pilot's soundings",
    offer: "Our pilots have copied their newest notes on shoals, currents, and safe approaches.",
    completion: "These soundings may save a hull before the season is out."
  }),
  Object.freeze({
    id: "market-tallies",
    cargoLabel: "market tallies",
    offer: "The neighboring factor needs our latest prices before committing another cargo.",
    completion: "Fresh prices are worth more than old promises. The factor will be pleased."
  }),
  Object.freeze({
    id: "shipyard-measurements",
    cargoLabel: "shipyard measurements",
    offer: "A shipwright is waiting on these spar and sail measurements.",
    completion: "Good. The shipwright can cut timber without guessing now."
  })
]);
export const SHIP_ATTACK_REPUTATION_PENALTY = -35;
export const PIRACY_REPUTATION_PENALTY = -3;
export const LETTER_OF_MARQUE_REPUTATION_REQUIRED = 15;
export const LETTER_OF_MARQUE_POWER_REQUIRED = 20;
export const TRADE_PASS_REPUTATION_REQUIRED = 50;
export const HOSTILE_PORT_REPUTATION_THRESHOLD = -75;
export const PORT_DISGUISE_SUCCESS_CHANCE = 0.6;
export const PORT_DISGUISE_MAX_SUCCESS_CHANCE = 0.9;
export const PORT_DISGUISE_LOCK_DAYS = 14;
export const FACTION_SAFE_PASSAGE_DAYS = 30;
export const FACTION_SAFE_PASSAGE_REFUSAL_DAYS = 2;
export const FISH_CARGO_GOOD_ID = "fish";
export const SHIP_ITEM_FISHING_NET = "fishing-net";
export const SHIP_ITEM_CANNON_EQUIPMENT = "cannon-equipment";
export const SHIP_ITEM_WHALE_HARPOON = "whale-harpoon";
export const FRESH_WATER_CAPACITY = 100;
export const FRESH_WATER_DAYS = 21;
export const FRESH_WATER_CARGO_DAYS = 1;
export const RAIN_WATER_COLLECTION_PER_CONSUMER_DAY = 0.16;
export const WINE_PERSON_DAYS_PER_UNIT = WATER_PERSON_DAYS_PER_UNIT;
export const FOOD_TARGET_DAYS = 21;
export const STARTING_HARDTACK_RATIONS = 10;
export const EMERGENCY_SHIP_AID_UNITS = 3;
export const ENVOY_SAFE_PASSAGE_DAYS = 7;
export const ENVOY_TARGET_FRIENDLY_REPUTATION = 5;
export const ENVOY_TARGET_HOSTILE_REPUTATION = -8;
export const ENVOY_HOME_REPUTATION = 8;

const MINUTES_PER_DAY = 24 * 60;
const WINE_EMERGENCY_RECOVERY_WATER_UNITS = 1;
export const SURVIVAL_DEHYDRATION_INTERVAL_MINUTES = 12 * 60;
export const SURVIVAL_STARVATION_INTERVAL_MINUTES = 5 * MINUTES_PER_DAY;
const PORT_DISGUISE_LOCK_MINUTES = PORT_DISGUISE_LOCK_DAYS * MINUTES_PER_DAY;
const FACTION_SAFE_PASSAGE_MINUTES = FACTION_SAFE_PASSAGE_DAYS * MINUTES_PER_DAY;
const FACTION_SAFE_PASSAGE_REFUSAL_MINUTES = FACTION_SAFE_PASSAGE_REFUSAL_DAYS * MINUTES_PER_DAY;
const ENVOY_SAFE_PASSAGE_MINUTES = ENVOY_SAFE_PASSAGE_DAYS * MINUTES_PER_DAY;
const ENVOY_QUEST_KINDS = new Set(["friendly-envoy", "hostile-envoy"]);
const FRESH_WATER_USE_PER_DAY = FRESH_WATER_CAPACITY / FRESH_WATER_DAYS;

export const SHIP_ITEM_CATALOG = Object.freeze([
  Object.freeze({
    id: SHIP_ITEM_FISHING_NET,
    label: "Fishing net",
    detail: "Can harvest nearby fisheries"
  }),
  Object.freeze({
    id: SHIP_ITEM_CANNON_EQUIPMENT,
    label: "Cannon battery",
    detail: "Installed naval ordnance"
  }),
  Object.freeze({
    id: SHIP_ITEM_WHALE_HARPOON,
    label: "Whale harpoon",
    detail: "Can tether a surfaced whale"
  }),
  ...PERK_ITEMS
]);

export function createGameState({
  cargoCapacity,
  startMinute = 0,
  playerCharacter = null,
  shipStats = null,
  campaignGoalType = null,
  voyageSeed = null
}) {
  assertCargoCapacity(cargoCapacity);
  assertSimulationMinute(startMinute);
  const normalizedPlayerCharacter = playerCharacter === null ? null : {
    ...playerCharacter,
    skillIds: playerCharacter.skillIds || characterSkillIdsForIdentity(
      playerCharacter.id || playerCharacter.name
    )
  };
  if (normalizedPlayerCharacter !== null) assertPlayerCharacter(normalizedPlayerCharacter);
  if (shipStats !== null && shipStats.cargoCapacity !== cargoCapacity) {
    throw new Error(`Ship cargo capacity mismatch: state=${cargoCapacity} stats=${shipStats.cargoCapacity}`);
  }
  const playerFactionId = normalizedPlayerCharacter?.nationalityId || null;
  const resolvedVoyageSeed = voyageSeed === null
    ? worldDiplomacySeedKey(normalizedPlayerCharacter, startMinute)
    : validateVoyageSeed(voyageSeed);
  const resolvedCampaignGoalType = playerCharacterSupportsCampaignGoal(normalizedPlayerCharacter)
    ? campaignGoalType || campaignGoalTypeForCharacter(normalizedPlayerCharacter)
    : null;
  const state = {
    version: GAME_STATE_VERSION,
    voyageSeed: resolvedVoyageSeed,
    activePlaySeconds: 0,
    playerCharacter: normalizedPlayerCharacter,
    doubloons: STARTING_DOUBLOONS,
    cargoCapacity,
    cargo: {},
    namedCrew: createNamedCrewMemory(),
    ship: shipStats === null ? null : createPlayerShipState(shipStats),
    survival: createSurvivalState(
      startMinute,
      shipStats === null ? FRESH_WATER_CAPACITY : 1,
      shipStats === null ? FRESH_WATER_CAPACITY : 0
    ),
    inventory: {
      items: {},
      fishingNetId: BASIC_FISHING_NET_ID,
      cannonEquipmentId: STANDARD_CANNON_EQUIPMENT_ID,
      whaleHarpoonId: resolvedCampaignGoalType === CAMPAIGN_GOAL_WHITE_WHALE
        ? BASIC_WHALE_HARPOON_ID
        : null
    },
    accounts: {
      cargoCostBasis: {},
      realizedPnl: 0,
      nextEntryId: 2,
      ledger: [{
        id: 1,
        kind: "opening",
        simMinute: startMinute,
        location: "Aboard",
        country: "",
        description: "Opening balance",
        goodId: null,
        quantity: 0,
        amount: STARTING_DOUBLOONS,
        balance: STARTING_DOUBLOONS,
        costBasis: null,
        pnl: null
      }]
    },
    relations: {
      factionReputation: initialFactionReputation(playerFactionId),
      lettersOfMarque: {},
      safePassageUntilMinute: {},
      safePassageRefusalUntilMinute: {},
      tradeAccessGrants: createSovereignTradeGrantMemory(),
      personalTradePasses: createPersonalTradePassMemory(),
      portugueseCartaz: createPortugueseCartazMemory(),
      foreignSettlementExpulsions: createForeignSettlementExpulsionMemory(),
      diplomacy: createWorldDiplomacy({
        startMinute,
        seedKey: resolvedVoyageSeed
      })
    },
    memory: {
      visitedPorts: {},
      decisions: {},
      flags: {},
      discoveries: {},
      discoveryOrder: [],
      animals: createAnimalEncounterMemory(),
      panda: createPandaCompanionMemory(),
      pendingDiscoveryPortDialogueIds: [],
      namedCrewDeathNotices: [],
      birthdays: createBirthdayMemory(),
      specialEquipmentOffers: createSpecialEquipmentOfferMemory(),
      navigation: {
        lastLongitudeDeg: null,
        cumulativeLongitudeDeg: 0,
        optionalWaypoints: []
      },
      quests: {
        active: null,
        completed: {},
        onboardingDeliveriesCompleted: 0,
        deliveryOffers: {},
        deliveryRolls: {},
        passengerOffers: {},
        passengerRolls: {},
        vikingLongshipRolls: {},
        japaneseMatchlocks: createJapaneseMatchlockQuestMemory(),
        caribbeanGinger: createCaribbeanGingerQuestMemory(),
        chef: createChefQuestMemory(),
        pirateCaptive: createPirateCaptiveQuestMemory(),
        castaway: createCastawayQuestMemory(),
        naturalist: createNaturalistQuestMemory()
      },
      cargoReservations: {},
      missionItemGifts: {},
      colonization: createColonizationQuestMemory(),
      conquest: createPortConquestMemory(),
      achievements: createVoyageAchievementProgress(),
      whales: createWhaleMemory(),
      campaignGoal: playerCharacterSupportsCampaignGoal(normalizedPlayerCharacter)
        ? createCampaignGoal({ playerCharacter: normalizedPlayerCharacter, startMinute, type: resolvedCampaignGoalType })
        : null,
      cartography: createCartographyMemory()
    }
  };
  if (shipStats !== null) {
    state.ship.baseCargoCapacity = shipStats.cargoCapacity;
    state.cargoCapacity = effectivePlayerShipStats(state, shipStats).cargoCapacity;
  }
  return state;
}

export function validateGameState(state) {
  if (state?.version !== GAME_STATE_VERSION) {
    throw new Error(`Unsupported game state version: ${state?.version ?? "missing"}`);
  }
  assertGameState(state);
  assertPlayerCargoWithinCapacity(state);
  return state;
}

export function migrateGameState(state, shipStats) {
  if (state?.version === GAME_STATE_VERSION) return restoreLoadedGameState(state, shipStats);
  if (![8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43].includes(state?.version)) {
    throw new Error(`Unsupported game state version: ${state?.version ?? "missing"}`);
  }
  if (state.ship && (!shipStats || typeof shipStats !== "object")) {
    throw new Error("Game state migration requires canonical ship stats");
  }
  const savedPerksCanBeRead = state.playerCharacter?.skillIds && state.inventory?.items;
  const migrationPerkState = state.namedCrew
    ? state
    : { ...state, namedCrew: createNamedCrewMemory() };
  const migratableCargoCapacities = state.ship
    ? new Set([
      shipStats.cargoCapacity,
      savedPerksCanBeRead
        ? effectivePlayerShipStats(migrationPerkState, shipStats).cargoCapacity
        : shipStats.cargoCapacity
    ])
    : null;
  if (state.ship && !migratableCargoCapacities.has(state.cargoCapacity)) {
    throw new Error("Saved ship capacity does not match its hull during migration");
  }
  if (!state.relations || typeof state.relations !== "object") {
    throw new Error("Game state migration requires relations");
  }

  const migrationVoyageSeed = typeof state.voyageSeed === "string" && state.voyageSeed.trim() !== ""
    ? state.voyageSeed
    : worldDiplomacySeedKey(state.playerCharacter, savedGameStartMinute(state));
  const migratedDiplomacy = state.relations.diplomacy
    ? migrateWorldDiplomacy(state.relations.diplomacy)
    : createWorldDiplomacy({
        startMinute: savedGameStartMinute(state),
        seedKey: migrationVoyageSeed
      });
  const legacyPortHeading = state.memory?.navigation?.portHeading || null;
  const { portHeading: _removedPortHeading, ...legacyNavigation } = state.memory?.navigation || {};
  const {
    mingOpenTradeFactionIds: legacyMingOpenTradeFactionIds,
    ...migratedRelationBase
  } = state.relations;
  const migratedPlayerCharacter = state.playerCharacter ? {
    ...state.playerCharacter,
    nationalityId: migrateFactionIdTo1522(state.playerCharacter.nationalityId),
    skillIds: state.playerCharacter.skillIds || characterSkillIdsForIdentity(
      state.playerCharacter.id || state.playerCharacter.name
    )
  } : state.playerCharacter;
  const migrated = {
    ...state,
    version: GAME_STATE_VERSION,
    voyageSeed: migrationVoyageSeed,
    playerCharacter: migratedPlayerCharacter,
    namedCrew: state.namedCrew || createNamedCrewMemory(),
    survival: {
      ...state.survival,
      foodRationDebt: Number.isFinite(state.survival?.foodRationDebt)
        ? state.survival.foodRationDebt
        : (state.survival?.foodDebt || 0) * FOOD_RATIONS_PER_HOLD_UNIT
    },
    ship: state.ship ? {
      ...state.ship,
      slug: shipStats.slug,
      baseCargoCapacity: shipStats.cargoCapacity,
      mass: shipStats.mass,
      navalWeaponKind: shipStats.navalWeaponKind
    } : state.ship,
    inventory: {
      ...state.inventory,
      whaleHarpoonId: state.inventory?.whaleHarpoonId ?? null
    },
    relations: {
      ...migratedRelationBase,
      factionReputation: migrateFactionReputationTable(state.relations.factionReputation),
      lettersOfMarque: removeRetiredFactionKeys(state.relations.lettersOfMarque),
      safePassageUntilMinute: state.version === 8
        ? {}
        : migrateSafePassageTable(state.relations.safePassageUntilMinute),
      safePassageRefusalUntilMinute: migrateSafePassageTable(
        state.relations.safePassageRefusalUntilMinute || {}
      ),
      tradeAccessGrants: migrateSovereignTradeGrantMemory(
        state.relations.tradeAccessGrants,
        legacyMingOpenTradeFactionIds
      ),
      personalTradePasses: migratePersonalTradePassMemory(
        state.relations.personalTradePasses
      ),
      portugueseCartaz: migratePortugueseCartazMemory(state.relations.portugueseCartaz),
      foreignSettlementExpulsions: migrateForeignSettlementExpulsionMemory(
        state.relations.foreignSettlementExpulsions
      ),
      diplomacy: migratedDiplomacy
    },
    memory: {
      ...state.memory,
      visitedPorts: migrateVisitedPortMemories(state.memory?.visitedPorts),
      namedCrewDeathNotices: state.memory?.namedCrewDeathNotices || [],
      birthdays: state.memory?.birthdays || createBirthdayMemory(),
      specialEquipmentOffers: state.memory?.specialEquipmentOffers || createSpecialEquipmentOfferMemory(),
      animals: state.memory?.animals || createAnimalEncounterMemory(),
      panda: migratePandaCompanionMemory(state.memory?.panda),
      quests: {
        ...migrateQuestCharacterSkills(migrateSovereignTradeQuestReferences(
          migrateRetiredFactionReferences(state.memory?.quests)
        )),
        japaneseMatchlocks: state.memory?.quests?.japaneseMatchlocks ||
          createJapaneseMatchlockQuestMemory(),
        caribbeanGinger: state.memory?.quests?.caribbeanGinger ||
          createCaribbeanGingerQuestMemory(),
        chef: state.memory?.quests?.chef || createChefQuestMemory(),
        pirateCaptive: migratePirateCaptiveQuestMemory(state.memory?.quests?.pirateCaptive),
        castaway: migrateCastawayQuestMemory(state.memory?.quests?.castaway),
        naturalist: state.memory?.quests?.naturalist || createNaturalistQuestMemory()
      },
      navigation: {
        ...legacyNavigation,
        optionalWaypoints: state.memory?.navigation?.optionalWaypoints || (legacyPortHeading ? [{
          id: `port:${legacyPortHeading.destinationTileId}`,
          destinationTileId: legacyPortHeading.destinationTileId,
          destinationName: legacyPortHeading.destinationName,
          reason: legacyPortHeading.reason || PORT_NAVIGATION_REASON_NEW_SHIP
        }] : [])
      },
      cargoReservations: state.memory?.cargoReservations || {},
      missionItemGifts: state.memory?.missionItemGifts || {},
      colonization: state.memory?.colonization || createColonizationQuestMemory(),
      conquest: migrateConquestFactionReferences(state.memory?.conquest || createPortConquestMemory()),
      achievements: migrateVoyageAchievementProgress(state.memory?.achievements),
      whales: state.memory?.whales?.version === 2 ? state.memory.whales : createWhaleMemory(),
      campaignGoal: state.memory?.campaignGoal || (playerCharacterSupportsCampaignGoal(migratedPlayerCharacter)
        ? createCampaignGoal({ playerCharacter: migratedPlayerCharacter, startMinute: savedGameStartMinute(state) })
        : null),
      cartography: state.memory?.cartography || createCartographyMemory()
    }
  };
  if (migrated.ship) {
    migrated.cargoCapacity = effectivePlayerShipStats(migrated, shipStats).cargoCapacity;
    migrated.ship.loadoutTargets = selectedShipLoadoutPlan(migrated, shipStats);
  }
  delete migrated.survival.foodDebt;
  return restoreLoadedGameState(migrated, shipStats);
}

function restoreLoadedGameState(state, shipStats = null) {
  if (state?.version !== GAME_STATE_VERSION) {
    throw new Error(`Unsupported game state version: ${state?.version ?? "missing"}`);
  }
  assertGameState(state);
  reconcileLoadedShipLoadout(state, shipStats);
  const repair = repairPlayerCargoOverflow(state);
  if (repair) {
    console.warn("Player cargo exceeded capacity; excess cargo was jettisoned while restoring the voyage", repair);
  }
  const ledgerCompaction = compactPlayerLedger(state);
  if (ledgerCompaction) {
    console.warn("Player ledger exceeded its retained history; older entries were summarized", ledgerCompaction);
  }
  return validateGameState(state);
}

function reconcileLoadedShipLoadout(state, shipStats) {
  if (!state.ship) return null;
  if (!shipStats || shipStats.slug !== state.ship.slug) {
    throw new Error(`Saved loadout hull does not match canonical stats: ${state.ship.slug}`);
  }
  state.ship.crewCapacity = shipStats.crewCapacity;
  state.ship.cannonCapacity = shipStats.cannons;
  state.ship.cannons = Math.min(state.ship.cannons, shipStats.cannons);
  state.ship.baseCargoCapacity = shipStats.cargoCapacity;
  state.ship.mass = shipStats.mass;
  state.ship.navalWeaponKind = shipStats.navalWeaponKind;
  state.cargoCapacity = effectivePlayerShipStats(state, shipStats).cargoCapacity;
  const plan = selectedShipLoadoutPlan(state, shipStats);
  state.ship.loadoutTargets = plan;
  return plan;
}

function migrateFactionReputationTable(reputation) {
  if (!reputation || typeof reputation !== "object" || Array.isArray(reputation)) return reputation;
  return Object.fromEntries(FACTIONS.map((faction) => [faction.id, reputation[faction.id] ?? 0]));
}

function removeRetiredFactionKeys(table) {
  if (!table || typeof table !== "object" || Array.isArray(table)) return table;
  return Object.fromEntries(Object.entries(table).filter(([factionId]) => factionId !== "aztec"));
}

function migrateSafePassageTable(table) {
  if (!table || typeof table !== "object" || Array.isArray(table)) return table;
  const migrated = removeRetiredFactionKeys(table);
  if (Number.isFinite(table.aztec)) {
    migrated.spain = Math.max(migrated.spain || 0, table.aztec);
  }
  return migrated;
}

function createPortugueseCartazMemory() {
  return {
    issuedMinute: null,
    untilMinute: 0,
    issuedAtPortId: null,
    graceUntilMinute: 0,
    inspectedShipUntilMinute: {}
  };
}

function migratePortugueseCartazMemory(memory) {
  if (!memory || typeof memory !== "object" || Array.isArray(memory)) {
    return createPortugueseCartazMemory();
  }
  return {
    issuedMinute: memory.issuedMinute ?? null,
    untilMinute: memory.untilMinute ?? 0,
    issuedAtPortId: memory.issuedAtPortId ?? null,
    graceUntilMinute: memory.graceUntilMinute ?? 0,
    inspectedShipUntilMinute: memory.inspectedShipUntilMinute || {}
  };
}

function migrateVisitedPortMemories(memories) {
  if (!memories || typeof memories !== "object" || Array.isArray(memories)) return memories;
  return Object.fromEntries(Object.entries(memories).map(([portKey, memory]) => [portKey, {
    ...memory,
    drunkArrivals: memory?.drunkArrivals ?? 0,
    lastDrunkVisit: memory?.lastDrunkVisit ?? null,
    lastDrunkArrivalMinute: memory?.lastDrunkArrivalMinute ?? null
  }]));
}

function migrateRetiredFactionReferences(value) {
  if (value === "aztec") return "spain";
  if (Array.isArray(value)) return value.map(migrateRetiredFactionReferences);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, migrateRetiredFactionReferences(entry)]));
}

function migrateSovereignTradeQuestReferences(quests) {
  if (!quests || typeof quests !== "object") return quests;
  const migrateQuest = (quest) => {
    if (!quest?.mingTradeOpeningFactionId) return quest;
    const {
      mingTradeOpeningFactionId,
      ...rest
    } = quest;
    return {
      ...rest,
      tradeAccessPolicyId: MING_TRADE_POLICY_ID,
      tradeAccessOpeningFactionId: mingTradeOpeningFactionId
    };
  };
  return {
    ...quests,
    active: migrateQuest(quests.active),
    passengerOffers: Object.fromEntries(Object.entries(quests.passengerOffers || {})
      .map(([key, quest]) => [key, migrateQuest(quest)]))
  };
}

function migrateQuestCharacterSkills(quests) {
  if (!quests || typeof quests !== "object") return quests;
  const migrateCharacter = (character, identityFallback) => character ? {
    ...character,
    skillIds: character.skillIds || characterSkillIdsForIdentity(
      character.id || character.name || identityFallback,
      { traveler: true }
    )
  } : character;
  const migrateQuest = (quest, key) => quest ? {
    ...quest,
    passenger: migrateCharacter(quest.passenger, `saved-traveler|${key}`)
  } : quest;
  return {
    ...quests,
    active: migrateQuest(quests.active, "active"),
    passengerOffers: Object.fromEntries(Object.entries(quests.passengerOffers || {})
      .map(([key, quest]) => [key, migrateQuest(quest, key)]))
  };
}

function migrateConquestFactionReferences(memory) {
  const migrated = migrateRetiredFactionReferences(memory);
  migrated.collapsedFactionIds = memory.collapsedFactionIds.filter((factionId) => factionId !== "aztec");
  migrated.events = memory.events.map((event) => ({
    ...migrateRetiredFactionReferences(event),
    collapsedFactionId: event.collapsedFactionId === "aztec" ? null : event.collapsedFactionId
  }));
  return migrated;
}

export function addPortNavigationWaypoint(state, { destinationTileId, destinationName, reason }) {
  assertGameState(state);
  const waypoint = {
    id: `port:${destinationTileId}`,
    destinationTileId,
    destinationName,
    reason
  };
  assertOptionalNavigationWaypoint(waypoint);
  const waypoints = state.memory.navigation.optionalWaypoints;
  const existingIndex = waypoints.findIndex((entry) => entry.id === waypoint.id);
  if (existingIndex >= 0) waypoints[existingIndex] = waypoint;
  else waypoints.push(waypoint);
  return waypoint;
}

export function portNavigationReasonLabel(reason) {
  if (reason === "PLAYER HEADING" || reason === "SHIPYARD RUMOUR") {
    return PORT_NAVIGATION_REASON_NEW_SHIP;
  }
  return reason;
}

export function removeOptionalNavigationWaypoint(state, waypointId) {
  assertGameState(state);
  if (typeof waypointId !== "string" || waypointId === "") {
    throw new Error("Optional navigation waypoint removal requires an id");
  }
  const waypoints = state.memory.navigation.optionalWaypoints;
  const index = waypoints.findIndex((entry) => entry.id === waypointId);
  if (index < 0) return false;
  waypoints.splice(index, 1);
  return true;
}

export function clearPortNavigationWaypointsAt(state, portTileId) {
  assertGameState(state);
  if (!Number.isInteger(portTileId)) throw new Error(`Invalid arrival port tile id: ${portTileId}`);
  const waypoints = state.memory.navigation.optionalWaypoints;
  const remaining = waypoints.filter((entry) => entry.destinationTileId !== portTileId);
  const removed = remaining.length !== waypoints.length;
  if (removed) state.memory.navigation.optionalWaypoints = remaining;
  return removed;
}

export function advanceActivePlayTime(state, elapsedSeconds) {
  assertGameState(state);
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
    throw new Error(`Invalid active play duration: ${elapsedSeconds}`);
  }
  state.activePlaySeconds += elapsedSeconds;
  return state.activePlaySeconds;
}

export function diplomacyBetweenForState(state, factionAId, factionBId) {
  if (!state?.relations?.diplomacy) throw new Error("Game state has no world diplomacy");
  return worldDiplomacyBetween(state.relations.diplomacy, factionAId, factionBId);
}

export function advanceGameDiplomacy(state, currentMinute) {
  assertGameState(state);
  assertSimulationMinute(currentMinute);
  return advanceWorldDiplomacy(state.relations.diplomacy, currentMinute, {
    homeFactionId: state.playerCharacter?.nationalityId || null,
    reputation: state.relations.factionReputation,
    decisions: state.memory.decisions
  });
}

export function recentGameDiplomacyEvents(state, limit = 3) {
  assertGameState(state);
  return recentDiplomacyEvents(state.relations.diplomacy, limit);
}

export function recordDiscovery(state, discovery) {
  assertGameState(state);
  assertDiscovery(discovery);
  if (state.memory.discoveries[discovery.id]) return false;
  const entry = {
    id: discovery.id,
    displayName: discovery.displayName,
    kind: discovery.kind,
    detail: discovery.detail || ""
  };
  if (discovery.portArrivalDialogue) {
    entry.portArrivalDialogue = discovery.portArrivalDialogue;
    entry.portArrivalExpressionId = discovery.portArrivalExpressionId || "attentive";
    state.memory.pendingDiscoveryPortDialogueIds.push(discovery.id);
  }
  state.memory.discoveries[discovery.id] = entry;
  state.memory.discoveryOrder.push(discovery.id);
  return true;
}

export function consumePendingDiscoveryPortDialogue(state) {
  assertGameState(state);
  while (state.memory.pendingDiscoveryPortDialogueIds.length > 0) {
    const discoveryId = state.memory.pendingDiscoveryPortDialogueIds.shift();
    const discovery = state.memory.discoveries[discoveryId];
    if (!discovery?.portArrivalDialogue) continue;
    return {
      discoveryId,
      message: discovery.portArrivalDialogue,
      expressionId: discovery.portArrivalExpressionId || "attentive"
    };
  }
  return null;
}

export function hasDiscovery(state, discoveryId) {
  assertGameState(state);
  return Boolean(state.memory.discoveries[discoveryId]);
}

export function settleCampaignGoalAtHome(state, city, {
  currentMinute,
  wonderCatalog = [],
  nextLeadDiscoveryId = null
} = {}) {
  assertGameState(state);
  if (!city || !Number.isInteger(city.tileId)) throw new Error("Campaign homecoming requires a port city");
  assertSimulationMinute(currentMinute);
  const goal = state.memory.campaignGoal;
  if (!goal) throw new Error("Player character has no campaign goal");
  if (city.tileId !== goal.homePortTileId) {
    throw new Error(`Campaign homecoming is not at the player's home port: ${city.tileId}`);
  }

  const outcome = goal.type === CAMPAIGN_GOAL_EXPLORER
    ? settleExplorerHomecoming(goal, {
        discoveredIds: new Set(state.memory.discoveryOrder),
        wonderCatalog,
        homePort: city,
        nextLeadDiscoveryId
      })
    : goal.type === CAMPAIGN_GOAL_FAMILY_DEBT ? settleFamilyDebtHomecoming(goal, {
        currentMinute,
        doubloons: state.doubloons
      })
      : goal.type === CAMPAIGN_GOAL_WHITE_WHALE
        ? settleWhiteWhaleHomecoming(goal)
        : settleTreasureHomecoming(goal);
  const amount = goal.type === CAMPAIGN_GOAL_EXPLORER
    ? outcome.reward
    : goal.type === CAMPAIGN_GOAL_FAMILY_DEBT ? -outcome.payment : 0;
  if (amount !== 0) {
    state.doubloons += amount;
    if (state.doubloons < 0) throw new Error("Campaign settlement overdraws the player's purse");
    recordLedgerEntry(state, city, { simMinute: currentMinute }, {
      kind: "campaign",
      description: goal.type === CAMPAIGN_GOAL_EXPLORER
        ? `Patron rewards ${outcome.newlyReportedIds.length} discoveries`
        : "Family debt payment",
      goodId: null,
      quantity: goal.type === CAMPAIGN_GOAL_EXPLORER ? outcome.newlyReportedIds.length : 0,
      amount,
      costBasis: null,
      pnl: amount > 0 ? amount : null
    });
  }
  return outcome;
}

export function updateCartographyMemory(state, seenTilesBase64, seenTileCount) {
  assertGameState(state);
  if (typeof seenTilesBase64 !== "string") throw new Error("Cartography tile mask must be a string");
  if (!Number.isInteger(seenTileCount) || seenTileCount < 0) {
    throw new Error(`Invalid mapped tile count: ${seenTileCount}`);
  }
  state.memory.cartography = { seenTilesBase64, seenTileCount };
  return state.memory.cartography;
}

export function discoveredEntries(state) {
  assertGameState(state);
  return state.memory.discoveryOrder.map((id) => {
    const discovery = state.memory.discoveries[id];
    if (!discovery) throw new Error(`Discovery order references missing discovery: ${id}`);
    return discovery;
  });
}

export function receiveDiscoveryCargo(state, discovery, goodId, context = {}) {
  assertGameState(state);
  assertDiscovery(discovery);
  if (!state.memory.discoveries[discovery.id]) {
    throw new Error(`Cannot receive cargo for undiscovered site: ${discovery.displayName}`);
  }
  return receiveTreasureCargo(state, {
    rewardId: `discovery.cargo.${discovery.id}.${goodId}`,
    sourceName: discovery.displayName,
    goodId,
    ledgerKind: "discovery",
    context
  });
}

export function receiveTreasureCargo(state, {
  rewardId,
  sourceName,
  goodId,
  ledgerKind = "campaign",
  context = {}
}) {
  assertGameState(state);
  if (typeof rewardId !== "string" || rewardId.trim() === "") {
    throw new Error("Treasure cargo requires a reward id");
  }
  if (typeof sourceName !== "string" || sourceName.trim() === "") {
    throw new Error("Treasure cargo requires a source name");
  }
  if (typeof ledgerKind !== "string" || ledgerKind.trim() === "") {
    throw new Error("Treasure cargo requires a ledger kind");
  }
  const good = goodById(goodId);
  const rewardKey = rewardId;
  if (Object.prototype.hasOwnProperty.call(state.memory.decisions, rewardKey)) {
    return { good, quantity: 0, alreadyReceived: true };
  }

  const quantity = Math.floor(Math.max(0, cargoFree(state)) / good.unitSize);
  recordDecision(state, rewardKey, quantity);
  if (quantity <= 0) return { good, quantity: 0, alreadyReceived: false };

  state.cargo[good.id] = (state.cargo[good.id] || 0) + quantity;
  state.accounts.cargoCostBasis[good.id] = state.accounts.cargoCostBasis[good.id] || 0;
  recordLedgerEntry(state, null, context, {
    kind: ledgerKind,
    description: `Treasure from ${sourceName}: ${good.label} x${quantity}`,
    goodId: good.id,
    quantity,
    amount: 0,
    costBasis: 0,
    pnl: null
  });
  return { good, quantity, alreadyReceived: false };
}

export function updateCircumnavigationProgress(state, longitudeDeg) {
  assertGameState(state);
  if (!Number.isFinite(longitudeDeg)) throw new Error(`Invalid navigation longitude: ${longitudeDeg}`);
  const navigation = state.memory.navigation;
  if (navigation.lastLongitudeDeg === null) {
    navigation.lastLongitudeDeg = longitudeDeg;
    return false;
  }

  const delta = normalizeLongitudeDelta(longitudeDeg - navigation.lastLongitudeDeg);
  navigation.lastLongitudeDeg = longitudeDeg;
  navigation.cumulativeLongitudeDeg += delta;
  return Math.abs(navigation.cumulativeLongitudeDeg) >= 360;
}

export function setCargoCapacity(state, cargoCapacity) {
  assertGameState(state);
  assertCargoCapacity(cargoCapacity);
  const usedTicks = cargoUsedTicks(state);
  if (usedTicks > cargoCapacity * CARGO_SPACE_TICKS_PER_UNIT) {
    throw new Error(
      `Cannot switch to cargo capacity ${cargoCapacity}; current cargo uses ${cargoUnitsFromTicks(usedTicks)}`
    );
  }
  state.cargoCapacity = cargoCapacity;
}

function selectedShipLoadoutPlan(state, stats) {
  const effectiveStats = effectivePlayerShipStats(state, stats);
  const loadoutId = state.ship?.loadoutId || "short-haul";
  if (loadoutId !== CUSTOM_LOADOUT_ID) {
    return shipLoadoutPlan(effectiveStats, loadoutId, { minimumCrew: permanentCrewFloor(state) });
  }
  if (!state.ship.loadoutTargets) throw new Error("Custom ship loadout has no saved targets");
  return fitShipCustomLoadoutPlan(effectiveStats, state.ship.loadoutTargets, {
    minimumCrew: permanentCrewFloor(state)
  });
}

export function setPlayerShipStats(state, stats) {
  assertGameState(state);
  if (!state.ship) throw new Error("Cannot change stats without player ship state");
  const effectiveStats = effectivePlayerShipStats(state, stats);
  const crewFloor = permanentCrewFloor(state);
  const futureCrewFloor = futurePermanentCrewFloor(state);
  if (stats.crewCapacity < futureCrewFloor) {
    throw new Error(`Cannot move ${futureCrewFloor} committed crew into a ${stats.crewCapacity}-berth ship`);
  }
  const projectedCargoUsed = playerShipReplacementCargoUsed(state, stats);
  if (projectedCargoUsed > effectiveStats.cargoCapacity) {
    throw new Error(
      `Cannot switch to cargo capacity ${effectiveStats.cargoCapacity}; current hold will not fit because ` +
      `transferred cargo uses ${projectedCargoUsed}`
    );
  }
  const previous = {
    cargoCapacity: state.cargoCapacity,
    ship: { ...state.ship },
    freshWater: state.survival.freshWater,
    freshWaterCapacity: state.survival.freshWaterCapacity,
    hardtack: state.cargo[HARDTACK_GOOD_ID] || 0,
    hardtackBasis: state.accounts.cargoCostBasis[HARDTACK_GOOD_ID]
  };
  const plan = selectedShipLoadoutPlan(state, stats);
  state.cargoCapacity = effectiveStats.cargoCapacity;
  state.ship.slug = stats.slug;
  state.ship.crewCapacity = stats.crewCapacity;
  state.ship.cannonCapacity = stats.cannons;
  state.ship.baseCargoCapacity = stats.cargoCapacity;
  state.ship.mass = stats.mass;
  state.ship.navalWeaponKind = stats.navalWeaponKind;
  state.ship.crew = Math.max(crewFloor, Math.min(state.ship.crew, plan.crew));
  state.ship.cannons = Math.min(state.ship.cannons, plan.cannons);
  state.ship.loadoutTargets = plan;
  state.survival.freshWaterCapacity = plan.waterUnits;
  state.survival.freshWater = Math.min(state.survival.freshWater, plan.waterUnits);
  trimCargoQuantity(state, HARDTACK_GOOD_ID, plan.foodUnits);
  if (cargoUsedTicks(state) > effectiveStats.cargoCapacity * CARGO_SPACE_TICKS_PER_UNIT) {
    state.cargoCapacity = previous.cargoCapacity;
    state.ship = previous.ship;
    state.survival.freshWater = previous.freshWater;
    state.survival.freshWaterCapacity = previous.freshWaterCapacity;
    if (previous.hardtack > 0) state.cargo[HARDTACK_GOOD_ID] = previous.hardtack;
    else delete state.cargo[HARDTACK_GOOD_ID];
    if (previous.hardtackBasis === undefined) delete state.accounts.cargoCostBasis[HARDTACK_GOOD_ID];
    else state.accounts.cargoCostBasis[HARDTACK_GOOD_ID] = previous.hardtackBasis;
    throw new Error(`Cannot switch to cargo capacity ${effectiveStats.cargoCapacity}; current hold will not fit`);
  }
  return plan;
}

export function playerShipReplacementCargoUsed(state, stats) {
  assertGameState(state);
  if (!state.ship) throw new Error("Cannot preview a ship change without player ship state");
  const crewFloor = permanentCrewFloor(state);
  if (stats.crewCapacity < futurePermanentCrewFloor(state)) return Infinity;
  const plan = selectedShipLoadoutPlan(state, stats);
  let usedTicks = 0;
  for (const [goodId, heldQuantity] of Object.entries(state.cargo)) {
    const good = goodById(goodId);
    const quantity = goodId === HARDTACK_GOOD_ID
      ? Math.min(heldQuantity, plan.foodUnits)
      : heldQuantity;
    usedTicks += occupiedCargoTicks(good.unitSize * quantity, `cargo.${goodId} space`);
  }
  usedTicks += crewHoldSpace(Math.max(crewFloor, Math.min(state.ship.crew, plan.crew))) * CARGO_SPACE_TICKS_PER_UNIT;
  usedTicks += Math.min(state.ship.cannons, plan.cannons) * CARGO_SPACE_TICKS_PER_UNIT;
  usedTicks += freshWaterHoldUnits(
    Math.min(state.survival.freshWater, plan.waterUnits)
  ) * CARGO_SPACE_TICKS_PER_UNIT;
  for (const units of Object.values(state.memory.cargoReservations)) {
    usedTicks += units * CARGO_SPACE_TICKS_PER_UNIT;
  }
  return cargoUnitsFromTicks(usedTicks);
}

export function futurePermanentCrewFloor(state) {
  const current = permanentCrewFloor(state);
  const futureRecruits = [
    state.memory?.quests?.pirateCaptive?.active,
    state.memory?.quests?.castaway?.active
  ].filter((traveler) => (
    traveler?.familySurvived === false &&
    (traveler.stage === "aboard" || traveler.stage === "homecoming")
  )).length;
  return current + futureRecruits;
}

export function purchasePlayerShip(state, city, stats, payment, context = {}) {
  assertGameState(state);
  if (!stats || typeof stats.slug !== "string") throw new Error("Ship purchase requires valid ship stats");
  if (!payment || typeof payment !== "object") throw new Error("Ship purchase requires payment terms");
  const { listingPrice, tradeInValue } = payment;
  if (!Number.isInteger(listingPrice) || listingPrice <= 0) {
    throw new Error(`Invalid ship purchase listing price: ${listingPrice}`);
  }
  if (!Number.isInteger(tradeInValue) || tradeInValue < 0) {
    throw new Error(`Invalid ship trade-in value: ${tradeInValue}`);
  }
  const netPrice = listingPrice - tradeInValue;
  if (state.doubloons < netPrice) throw new Error(`Not enough doubloons to buy ${shipLabelForSlug(stats.slug)}`);
  const label = shipLabelForSlug(stats.slug);
  const plan = replacePlayerShipAndRecord(state, city, stats, context, {
    description: tradeInValue > 0
      ? `Purchase ${label}; ${tradeInValue} doubloon vessel trade-in`
      : `Purchase ${label}`,
    amount: -netPrice,
    costBasis: Math.max(0, netPrice)
  }, () => {
    state.doubloons -= netPrice;
    recordDecision(state, `ship.purchase.${cityKey(city)}.${stats.slug}`, 1);
  });
  return { slug: stats.slug, label, listingPrice, tradeInValue, netPrice, plan };
}

export function awardPlayerShip(state, city, stats, description, context = {}) {
  assertGameState(state);
  if (!stats || typeof stats.slug !== "string") throw new Error("Ship award requires valid ship stats");
  if (typeof description !== "string" || description.trim() === "") {
    throw new Error("Ship award requires a ledger description");
  }
  const label = shipLabelForSlug(stats.slug);
  const plan = replacePlayerShipAndRecord(state, city, stats, context, {
    description,
    amount: 0,
    costBasis: 0
  });
  return { slug: stats.slug, label, price: 0, plan };
}

function replacePlayerShipAndRecord(state, city, stats, context, ledger, beforeLedger = null) {
  const plan = setPlayerShipStats(state, stats);
  if (beforeLedger) beforeLedger();
  recordLedgerEntry(state, city, context, {
    kind: "ship",
    description: ledger.description,
    goodId: null,
    quantity: 1,
    amount: ledger.amount,
    costBasis: ledger.costBasis,
    pnl: null
  });
  return plan;
}

export function cargoUsedTicks(state) {
  assertGameState(state);
  let usedTicks = 0;
  for (const [goodId, quantity] of Object.entries(state.cargo)) {
    const good = goodById(goodId);
    usedTicks += occupiedCargoTicks(good.unitSize * quantity, `cargo.${goodId} space`);
  }
  if (state.ship) {
    usedTicks += crewHoldSpace(state.ship.crew) * CARGO_SPACE_TICKS_PER_UNIT;
    usedTicks += state.ship.cannons * CARGO_SPACE_TICKS_PER_UNIT;
    usedTicks += freshWaterHoldUnits(state.survival.freshWater) * CARGO_SPACE_TICKS_PER_UNIT;
  }
  for (const units of Object.values(state.memory.cargoReservations)) {
    usedTicks += units * CARGO_SPACE_TICKS_PER_UNIT;
  }
  return usedTicks;
}

export function cargoUsed(state) {
  return cargoUnitsFromTicks(cargoUsedTicks(state));
}

function physicalCargoFreeTicks(state) {
  return Math.max(
    0,
    state.cargoCapacity * CARGO_SPACE_TICKS_PER_UNIT - cargoUsedTicks(state)
  );
}

export function repairPlayerCargoOverflow(state) {
  assertGameState(state);
  const capacityTicks = state.cargoCapacity * CARGO_SPACE_TICKS_PER_UNIT;
  const beforeTicks = cargoUsedTicks(state);
  let excessTicks = beforeTicks - capacityTicks;
  if (excessTicks <= 0) return null;

  const removed = {};
  for (const goodId of cargoOverflowRepairOrder(state)) {
    if (excessTicks <= 0) break;
    const good = goodById(goodId);
    const held = state.cargo[goodId] || 0;
    const heldTicks = occupiedCargoTicks(good.unitSize * held, `cargo.${goodId} space`);
    const targetTicks = Math.max(0, heldTicks - excessTicks);
    const maximumQuantity = cargoQuantityForRepairTarget(good, held, targetTicks);
    const removedQuantity = trimCargoQuantity(state, goodId, maximumQuantity);
    if (removedQuantity <= 0) continue;
    const remaining = state.cargo[goodId] || 0;
    const remainingTicks = remaining > 0
      ? occupiedCargoTicks(good.unitSize * remaining, `cargo.${goodId} repaired space`)
      : 0;
    excessTicks -= heldTicks - remainingTicks;
    removed[goodId] = removedQuantity;
  }

  const afterTicks = cargoUsedTicks(state);
  if (afterTicks > capacityTicks) {
    throw new Error(
      `Cannot repair player cargo overflow: fixed ship occupancy uses ` +
      `${cargoUnitsFromTicks(afterTicks)}/${state.cargoCapacity}`
    );
  }
  return {
    capacity: state.cargoCapacity,
    beforeUsed: cargoUnitsFromTicks(beforeTicks),
    afterUsed: cargoUnitsFromTicks(afterTicks),
    removed
  };
}

function cargoOverflowRepairOrder(state) {
  const heldGoodIds = new Set(Object.keys(state.cargo));
  const ordered = [];
  const append = (goodId) => {
    if (!heldGoodIds.has(goodId) || ordered.includes(goodId)) return;
    ordered.push(goodId);
  };
  const acquisitionKinds = new Set(["buy", "catch", "discovery", "prize", "provision"]);
  for (let index = state.accounts.ledger.length - 1; index >= 0; index -= 1) {
    const entry = state.accounts.ledger[index];
    if (acquisitionKinds.has(entry?.kind) && typeof entry.goodId === "string") append(entry.goodId);
  }
  [...heldGoodIds].reverse().forEach(append);
  return ordered;
}

function cargoQuantityForRepairTarget(good, held, targetTicks) {
  if (!Number.isInteger(targetTicks) || targetTicks < 0) {
    throw new Error(`Invalid ${good.id} cargo repair target: ${targetTicks}`);
  }
  if (good.category === "food") {
    const rationCount = Math.floor(targetTicks / good.unitSize);
    return Math.min(held, rationCount / FOOD_RATIONS_PER_HOLD_UNIT);
  }
  if (good.category === "drink") {
    return Math.min(held, targetTicks / (good.unitSize * CARGO_SPACE_TICKS_PER_UNIT));
  }
  const ticksPerUnit = good.unitSize * CARGO_SPACE_TICKS_PER_UNIT;
  return Math.min(held, Math.floor(targetTicks / ticksPerUnit));
}

function assertPlayerCargoWithinCapacity(state) {
  const usedTicks = cargoUsedTicks(state);
  const capacityTicks = state.cargoCapacity * CARGO_SPACE_TICKS_PER_UNIT;
  if (usedTicks > capacityTicks) {
    throw new Error(
      `Player cargo exceeds hold capacity: ${cargoUnitsFromTicks(usedTicks)}/${state.cargoCapacity}`
    );
  }
}

export function reserveCargoSpace(state, reservationId, units) {
  assertGameState(state);
  assertCargoReservationId(reservationId);
  if (!Number.isInteger(units) || units <= 0) {
    throw new Error(`Invalid cargo reservation size: ${units}`);
  }
  if (Object.prototype.hasOwnProperty.call(state.memory.cargoReservations, reservationId)) {
    throw new Error(`Cargo reservation already exists: ${reservationId}`);
  }
  if (cargoFreeTicks(state) < units * CARGO_SPACE_TICKS_PER_UNIT) {
    throw new Error(`Cannot reserve ${units} cargo units; only ${cargoFree(state)} remain`);
  }
  state.memory.cargoReservations[reservationId] = units;
  return units;
}

export function releaseCargoSpace(state, reservationId) {
  assertGameState(state);
  assertCargoReservationId(reservationId);
  const units = state.memory.cargoReservations[reservationId];
  if (!Number.isInteger(units) || units <= 0) {
    throw new Error(`Cargo reservation does not exist: ${reservationId}`);
  }
  delete state.memory.cargoReservations[reservationId];
  return units;
}

export function cargoReservationUnits(state, reservationId) {
  assertGameState(state);
  assertCargoReservationId(reservationId);
  return state.memory.cargoReservations[reservationId] || 0;
}

export function receiveSurrenderedLoot(state, loot, context = {}) {
  assertGameState(state);
  if (!loot || !Number.isInteger(loot.specie) || loot.specie < 0 || !loot.cargo || typeof loot.cargo !== "object") {
    throw new Error("Invalid surrendered ship loot");
  }

  state.doubloons += loot.specie;
  if (loot.specie > 0) {
    recordLedgerEntry(state, null, context, {
      kind: "prize",
      description: "Surrendered prize money",
      goodId: null,
      quantity: 0,
      amount: loot.specie,
      costBasis: 0,
      pnl: loot.specie
    });
  }

  const receivedCargo = {};
  let freeTicks = cargoFreeTicks(state);
  for (const [goodId, available] of Object.entries(loot.cargo)) {
    const good = goodById(goodId);
    assertQuantity(available, `loot.${goodId}`);
    const goodTicks = good.unitSize * CARGO_SPACE_TICKS_PER_UNIT;
    const quantity = Math.min(available, Math.floor(freeTicks / goodTicks));
    if (quantity <= 0) continue;
    state.cargo[goodId] = (state.cargo[goodId] || 0) + quantity;
    state.accounts.cargoCostBasis[goodId] = state.accounts.cargoCostBasis[goodId] || 0;
    receivedCargo[goodId] = quantity;
    freeTicks -= quantity * goodTicks;
    recordLedgerEntry(state, null, context, {
      kind: "prize",
      description: `Prize cargo ${good.label} x${quantity}`,
      goodId,
      quantity,
      amount: 0,
      costBasis: 0,
      pnl: null
    });
  }
  return { specie: loot.specie, cargo: receivedCargo };
}

export function receivePortConquestPrize(state, city, amount, context = {}) {
  assertGameState(state);
  if (!city || !Number.isInteger(city.tileId)) throw new Error("Port conquest prize requires a city");
  if (!Number.isInteger(amount) || amount <= 0) throw new Error(`Invalid port conquest prize: ${amount}`);
  state.doubloons += amount;
  recordLedgerEntry(state, city, context, {
    kind: "conquest",
    description: `${cityLabel(city)} conquest prize`,
    goodId: null,
    quantity: 0,
    amount,
    costBasis: 0,
    pnl: amount
  });
  return { amount, balance: state.doubloons };
}

export function receiveQuestPayment(state, city, amount, description, context = {}) {
  assertGameState(state);
  if (!Number.isInteger(amount) || amount <= 0) throw new Error(`Invalid quest payment: ${amount}`);
  if (typeof description !== "string" || description.trim() === "") {
    throw new Error("Quest payment requires a ledger description");
  }
  state.doubloons += amount;
  recordLedgerEntry(state, city, context, {
    kind: "quest",
    description,
    goodId: null,
    quantity: 0,
    amount,
    costBasis: 0,
    pnl: amount
  });
  return { amount, balance: state.doubloons };
}

export function cargoFreeTicks(state) {
  const reservation = loadoutProvisionReservation(state);
  const capacityTicks = state.cargoCapacity * CARGO_SPACE_TICKS_PER_UNIT;
  const reservedProvisionTicks = occupiedCargoTicks(
    reservation.missingFood + reservation.missingWater,
    "reserved provision cargo space"
  );
  return capacityTicks - cargoUsedTicks(state) - reservedProvisionTicks;
}

export function cargoFree(state) {
  return cargoUnitsFromTicks(cargoFreeTicks(state));
}

export function cargoHoldStatus(state) {
  assertGameState(state);
  const capacityTicks = state.cargoCapacity * CARGO_SPACE_TICKS_PER_UNIT;
  const physicalUsedTicks = cargoUsedTicks(state);
  const freeForTradeTicks = Math.max(0, cargoFreeTicks(state));
  const committedUsedTicks = capacityTicks - freeForTradeTicks;
  const freeWholeUnits = Math.floor(freeForTradeTicks / CARGO_SPACE_TICKS_PER_UNIT);
  const physicalWholeUnits = Math.ceil(
    Math.max(0, physicalUsedTicks - 1e-8) / CARGO_SPACE_TICKS_PER_UNIT
  );
  return Object.freeze({
    capacity: state.cargoCapacity,
    physicalUsed: cargoUnitsFromTicks(physicalUsedTicks),
    physicalWholeUnits,
    reservedForLoadout: cargoUnitsFromTicks(Math.max(0, committedUsedTicks - physicalUsedTicks)),
    committedUsed: cargoUnitsFromTicks(committedUsedTicks),
    freeForTrade: cargoUnitsFromTicks(freeForTradeTicks),
    freeWholeUnits,
    committedWholeUnits: state.cargoCapacity - freeWholeUnits
  });
}

export function cargoFreeForGood(state, goodId) {
  const good = tradeGoodById(goodId);
  return good.category === "food" ? provisionCargoFree(state, "food") : cargoFree(state);
}

export function cargoQuantityCapacityForGood(state, goodId) {
  assertGameState(state);
  const good = tradeGoodById(goodId);
  const availableSpace = cargoFreeForGood(state, goodId);
  const availableTicks = availableCargoTicks(Math.max(0, availableSpace));
  return Math.max(0, Math.floor(availableTicks / (good.unitSize * CARGO_SPACE_TICKS_PER_UNIT)));
}

export function fishCatchCargoCapacity(state) {
  assertGameState(state);
  const fish = tradeGoodById(FISH_CARGO_GOOD_ID);
  const physicalFreeTicks = physicalCargoFreeTicks(state);
  return Math.floor(physicalFreeTicks / (fish.unitSize * CARGO_SPACE_TICKS_PER_UNIT));
}

export function refillFreshWaterFromShore(state) {
  assertGameState(state);
  const missing = Math.max(0, state.survival.freshWaterCapacity - state.survival.freshWater);
  const filled = stowFreshWater(state, missing);
  if (filled <= 0) return 0;
  recordDecision(state, "scavenge.water", Math.ceil(filled));
  return filled;
}

export function stowForagedFood(state, requestedQuantity) {
  assertGameState(state);
  if (!Number.isInteger(requestedQuantity) || requestedQuantity < 0) {
    throw new Error(`Invalid foraged food quantity: ${requestedQuantity}`);
  }
  const good = tradeGoodById(FORAGED_FOOD_GOOD_ID);
  const rationCapacity = Math.floor(physicalCargoFreeTicks(state) / good.unitSize);
  const rations = Math.min(requestedQuantity, rationCapacity);
  if (rations <= 0) return 0;
  addFoodRations(state, good.id, rations, 0);
  assertPlayerCargoWithinCapacity(state);
  recordDecision(state, "scavenge.food", rations);
  return rations;
}

export function cargoRows(state) {
  assertGameState(state);
  return TRADE_GOODS
    .map((good) => ({
      good,
      quantity: state.cargo[good.id] || 0
    }))
    .filter((row) => row.quantity > 0);
}

export function cargoQuantityLabel(good, quantity) {
  if (!good || typeof good !== "object") throw new Error("Cargo quantity label requires a trade good");
  if (good.category === "food") {
    return `${foodRationsForCargoQuantity(quantity)} RATIONS`;
  }
  if (good.category === "drink") {
    return `${Math.max(1, Math.round(quantity * WINE_PERSON_DAYS_PER_UNIT))} DRINKS`;
  }
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new Error(`Invalid ${good.id || "unknown"} cargo quantity: ${quantity}`);
  }
  return `x${formatDisplayQuantity(quantity)}`;
}

export function cargoSpaceLabel(space) {
  if (!Number.isFinite(space) || space < 0) throw new Error(`Invalid cargo space: ${space}`);
  return String(Math.round(space));
}

export function survivalStatus(state) {
  assertGameState(state);
  return survivalStatusForValidatedState(state);
}

export function castawayEmergencyAidNeed(state) {
  const status = survivalStatus(state);
  const water = status.freshWaterDays <= 3;
  const food = status.foodDays <= 3;
  return water || food ? Object.freeze({ water, food }) : null;
}

export function receiveCastawayShoreAid(state, aid) {
  assertGameState(state);
  if (!aid || typeof aid !== "object" || Array.isArray(aid) ||
      typeof aid.water !== "boolean" || typeof aid.food !== "boolean" ||
      (!aid.water && !aid.food)) {
    throw new Error("Castaway shore aid requires food or water");
  }
  const before = survivalStatusForValidatedState(state);
  const water = aid.water ? refillFreshWaterFromShore(state) : 0;
  const foodRationsNeeded = aid.food
    ? Math.max(0, Math.ceil(before.consumers.foodConsumers * 3 - before.foodRations))
    : 0;
  const food = aid.food ? stowForagedFood(state, foodRationsNeeded) : 0;
  return Object.freeze({ water, food });
}

function survivalStatusForValidatedState(state) {
  let foodCargoUnits = 0;
  for (const good of TRADE_GOODS) {
    if (good.category === "food") foodCargoUnits += state.cargo[good.id] || 0;
  }
  const storedFoodRations = Math.round(foodCargoUnits * FOOD_RATIONS_PER_HOLD_UNIT);
  const foodRationDebt = foodRationDebtRemainder(state.survival.foodRationDebt);
  const foodRations = Math.max(0, storedFoodRations - foodRationDebt);
  const consumption = shipConsumptionForValidatedState(state);
  const foodDays = foodRations / consumption.foodConsumers;
  const freshWaterCaskDays = state.ship
    ? state.survival.freshWater * WATER_PERSON_DAYS_PER_UNIT / consumption.waterConsumers
    : state.survival.freshWater / FRESH_WATER_USE_PER_DAY;
  const freshWaterReserveUnits = state.ship ? 0 : state.cargo[FRESH_WATER_GOOD_ID] || 0;
  const freshWaterReserveDays = state.ship ? 0 : freshWaterReserveUnits * FRESH_WATER_CARGO_DAYS;
  const freshWaterDays = freshWaterCaskDays + freshWaterReserveDays;
  const wineUnits = state.cargo[WINE_GOOD_ID] || 0;
  const wineDays = state.ship
    ? wineUnits * WINE_PERSON_DAYS_PER_UNIT / consumption.waterConsumers
    : wineUnits * WINE_PERSON_DAYS_PER_UNIT;
  const drinkDays = freshWaterDays + wineDays;
  const targetDays = state.ship?.loadoutTargets
    ? Math.max(1, Math.min(state.ship.loadoutTargets.foodDays, state.ship.loadoutTargets.waterDays))
    : FOOD_TARGET_DAYS;
  return {
    freshWater: state.survival.freshWater,
    freshWaterCapacity: state.survival.freshWaterCapacity,
    freshWaterDays,
    freshWaterCaskDays,
    freshWaterReserveUnits,
    freshWaterReserveDays,
    freshWaterTargetDays: state.ship?.loadoutTargets?.waterDays || FRESH_WATER_DAYS,
    freshWaterFraction: clamp01(freshWaterDays / (state.ship?.loadoutTargets?.waterDays || FRESH_WATER_DAYS)),
    wineUnits,
    wineDays,
    drinkDays,
    drinkFraction: clamp01(drinkDays / (state.ship?.loadoutTargets?.waterDays || FRESH_WATER_DAYS)),
    foodRations,
    storedFoodRations,
    foodCargoUnits,
    foodDays,
    foodFraction: clamp01(foodDays / targetDays),
    foodRationDebt,
    foodTargetDays: state.ship?.loadoutTargets?.foodDays || FOOD_TARGET_DAYS,
    consumers: consumption
  };
}

export function shipEmergencyAidNeed(state, npcShipId) {
  assertGameState(state);
  assertNpcShipId(npcShipId);
  const status = survivalStatus(state);
  const needsFood = status.foodRations <= 0;
  const needsWater = status.drinkDays <= 0;
  const alreadyReceived = (state.memory.decisions[emergencyShipAidKey(npcShipId)] || 0) > 0;
  return {
    needsFood,
    needsWater,
    alreadyReceived,
    available: (needsFood || needsWater) && !alreadyReceived && (
      provisionCargoFree(state, "food") >= 1 / FOOD_RATIONS_PER_HOLD_UNIT ||
      provisionCargoFree(state, "water") >= 1
    )
  };
}

export function receiveEmergencyShipAid(state, npcShipId) {
  const need = shipEmergencyAidNeed(state, npcShipId);
  if (need.alreadyReceived) throw new Error(`Emergency aid already received from ship: ${npcShipId}`);
  if (!need.needsFood && !need.needsWater) {
    throw new Error("Emergency ship aid requires depleted food or water");
  }
  if (!need.available) throw new Error("Emergency ship aid requires free hold space");

  const desired = { food: EMERGENCY_SHIP_AID_UNITS, water: EMERGENCY_SHIP_AID_UNITS };
  const granted = { food: 0, water: 0 };
  const order = ["water", "food"];
  while (granted.food < desired.food || granted.water < desired.water) {
    let changed = false;
    for (const kind of order) {
      const requiredSpace = kind === "food" ? 1 / FOOD_RATIONS_PER_HOLD_UNIT : 1;
      if (provisionCargoFree(state, kind) + 1e-8 < requiredSpace || granted[kind] >= desired[kind]) continue;
      if (kind === "food") {
        addFoodRations(state, HARDTACK_GOOD_ID, 1, 0);
        granted.food += 1;
      } else {
        const missingWater = Math.floor(state.survival.freshWaterCapacity - state.survival.freshWater);
        if (missingWater <= 0) continue;
        const filled = stowFreshWater(state, 1);
        if (filled < 1) continue;
        granted.water += filled;
      }
      changed = true;
    }
    if (!changed) break;
  }

  if (granted.food > 0) {
    state.accounts.cargoCostBasis[HARDTACK_GOOD_ID] = state.accounts.cargoCostBasis[HARDTACK_GOOD_ID] || 0;
  }
  if (granted.food <= 0 && granted.water <= 0) throw new Error("Emergency ship aid transferred no provisions");
  recordDecision(state, emergencyShipAidKey(npcShipId), 1);
  return granted;
}

export function initializeProvisionalShipLoadout(state, stats) {
  assertGameState(state);
  const loadoutStats = requirePlayerShipState(state, stats);
  const plan = shipLoadoutPlan(loadoutStats, "short-haul");
  state.ship.loadoutId = null;
  state.ship.loadoutTargets = plan;
  state.ship.crew = plan.crew;
  state.ship.cannons = plan.cannons;
  state.survival.freshWaterCapacity = plan.waterUnits;
  state.survival.freshWater = plan.waterUnits;
  state.cargo[HARDTACK_GOOD_ID] = plan.foodUnits;
  state.accounts.cargoCostBasis[HARDTACK_GOOD_ID] = plan.foodUnits * tradeGoodById(HARDTACK_GOOD_ID).basePrice;
  recordDecision(state, "loadout.provisional.short-haul", 1);
  return plan;
}

export function restockShipLoadoutAtPort(state, city, stats, loadoutId, context = {}) {
  assertGameState(state);
  const loadoutStats = requirePlayerShipState(state, stats);
  const plan = shipLoadoutPlan(loadoutStats, loadoutId, { minimumCrew: permanentCrewFloor(state) });
  return restockShipLoadoutPlanAtPort(state, city, plan, context);
}

export function restockCustomShipLoadoutAtPort(state, city, stats, draft, context = {}) {
  assertGameState(state);
  const loadoutStats = requirePlayerShipState(state, stats);
  const plan = shipCustomLoadoutPlan(loadoutStats, draft, { minimumCrew: permanentCrewFloor(state) });
  return restockShipLoadoutPlanAtPort(state, city, plan, context);
}

function restockShipLoadoutPlanAtPort(state, city, plan, context) {
  const hardtack = tradeGoodById(HARDTACK_GOOD_ID);
  const before = shipStoresSnapshot(state);
  const crewFloor = permanentCrewFloor(state);
  if (plan.crew < crewFloor) {
    throw new Error(`Loadout crew ${plan.crew} is below permanent crew floor ${crewFloor}`);
  }

  state.ship.loadoutId = plan.id;
  state.ship.loadoutTargets = plan;
  state.ship.crew = Math.max(crewFloor, Math.min(state.ship.crew, plan.crew));
  state.ship.cannons = Math.min(state.ship.cannons, plan.cannons);
  trimCargoQuantity(state, HARDTACK_GOOD_ID, plan.foodUnits);
  state.survival.freshWaterCapacity = plan.waterUnits;
  state.survival.freshWater = Math.min(state.survival.freshWater, plan.waterUnits);

  let spent = 0;
  const additions = { crew: 0, cannons: 0, food: 0, water: 0 };
  const priorities = plan.id === "combat"
    ? ["crew", "cannons", "provisions"]
    : ["crew", "provisions", "cannons"];
  for (const kind of priorities) {
    if (kind === "provisions") {
      const result = restockBalancedProvisions(state, plan, hardtack);
      spent += result.spent;
      additions.food += result.food;
      additions.water += result.water;
    } else {
      const result = restockLoadoutKind(state, plan, kind);
      spent += result.spent;
      additions[kind] += result.quantity;
    }
  }

  if (spent > 0) {
    recordLedgerEntry(state, city, context, {
      kind: "provision",
      description: `${plan.label} loadout restock`,
      goodId: null,
      quantity: additions.crew + additions.cannons + additions.food + additions.water,
      amount: -spent,
      costBasis: null,
      pnl: null
    });
  }
  recordDecision(state, `loadout.select.${plan.id}`, 1);
  const after = shipStoresSnapshot(state);
  return {
    plan,
    spent,
    additions,
    removed: {
      crew: Math.max(0, before.crew - after.crew + additions.crew),
      cannons: Math.max(0, before.cannons - after.cannons + additions.cannons),
      food: normalizeFoodCargoQuantity(Math.max(0, before.food - after.food + additions.food)),
      water: normalizeFreshWater(Math.max(0, before.water - after.water + additions.water))
    },
    shortfalls: loadoutShortfalls(state, plan)
  };
}

export function restockSelectedShipLoadoutAtPort(state, city, context = {}) {
  assertGameState(state);
  if (!state.ship?.loadoutId) return null;
  const stats = shipStatsForSlug(state.ship.slug);
  if (state.ship.loadoutId === CUSTOM_LOADOUT_ID) {
    return restockCustomShipLoadoutAtPort(state, city, stats, state.ship.loadoutTargets, context);
  }
  return restockShipLoadoutAtPort(state, city, stats, state.ship.loadoutId, context);
}

export function loseCrew(state, requestedLoss, random = Math.random) {
  assertGameState(state);
  if (!Number.isInteger(requestedLoss) || requestedLoss < 0) {
    throw new Error(`Invalid crew loss: ${requestedLoss}`);
  }
  if (typeof random !== "function") throw new Error("Crew loss random source must be a function");
  if (!state.ship || requestedLoss === 0) return 0;
  const lost = Math.min(state.ship.crew, requestedLoss);
  let remaining = lost - Math.min(genericCrewCount(state), lost);
  while (remaining > 0 && namedCrewMembers(state).length > 0) {
    const members = namedCrewMembers(state);
    const index = Math.min(members.length - 1, Math.floor(random() * members.length));
    const dead = removeNamedCrewMember(state, members[index].id);
    state.memory.namedCrewDeathNotices.push(createNamedCrewDeathNotice(dead));
    remaining -= 1;
  }
  state.ship.crew -= lost;
  if (lost > 0) recordDecision(state, "crew.lost", lost);
  return lost;
}

export function applySurvivalDeprivation(state, { dehydration, starvation }) {
  assertGameState(state);
  assertDeprivationSeverity(dehydration, "dehydration");
  assertDeprivationSeverity(starvation, "starvation");
  const crewLost = loseCrew(state, dehydration + starvation);
  const dehydrationCrewLost = Math.min(dehydration, crewLost);
  const starvationCrewLost = crewLost - dehydrationCrewLost;
  return {
    crewLost,
    dehydrationCrewLost,
    starvationCrewLost,
    crewDepleted: crewLost > 0 && state.ship.crew <= 0
  };
}

function assertDeprivationSeverity(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Invalid ${label} severity: ${value}`);
  }
}

export function rollCrewCasualtiesForDamage(state, damage, random = Math.random) {
  assertGameState(state);
  if (!Number.isFinite(damage) || damage < 0) throw new Error(`Invalid hull damage: ${damage}`);
  if (!state.ship || state.ship.crew <= 0 || damage <= 0) return 0;
  const chance = Math.min(0.65, damage * 0.07);
  if (random() >= chance) return 0;
  const maximumLoss = Math.max(1, Math.ceil(damage / 2));
  return loseCrew(state, 1 + Math.floor(random() * maximumLoss), random);
}

export function shipConsumption(state) {
  assertGameState(state);
  return shipConsumptionForValidatedState(state);
}

function shipConsumptionForValidatedState(state) {
  if (!state.ship) {
    return { crew: 0, passengers: 0, livestock: 0, pandas: 0, foodConsumers: 1, waterConsumers: 1 };
  }
  const quest = state.memory.quests?.active || null;
  const passengers = travelerManifestCount(shipTravelerManifestForValidatedState(state));
  const livestock = Math.max(0, Number(quest?.livestockCount || quest?.livestock?.count || 0));
  const baseConsumers = state.ship.crew + passengers;
  const panda = pandaCompanionConsumption(state.memory.panda);
  const questFood = Math.max(0, Number(quest?.consumption?.food || 0));
  const questWater = Math.max(0, Number(quest?.consumption?.water || 0));
  return {
    crew: state.ship.crew,
    passengers,
    livestock,
    pandas: panda.pandas,
    foodConsumers: Math.max(1, baseConsumers + livestock * 2 + questFood + panda.foodConsumers),
    waterConsumers: Math.max(1, baseConsumers + livestock * 2 + questWater + panda.waterConsumers)
  };
}

export function shipTravelerManifest(state) {
  assertGameState(state);
  return shipTravelerManifestForValidatedState(state);
}

function shipTravelerManifestForValidatedState(state) {
  const groups = [];
  const questGroup = activeQuestTravelerGroup(state.memory.quests?.active || null);
  if (questGroup) groups.push(questGroup);
  const pirateCaptive = state.memory.quests?.pirateCaptive?.active || null;
  if (pirateCaptive && pirateCaptive.stage === "aboard") {
    groups.push(Object.freeze({ kind: "passenger", count: 1 }));
  }
  const castaway = state.memory.quests?.castaway?.active || null;
  if (castaway && castaway.stage === "aboard") {
    groups.push(Object.freeze({ kind: "passenger", count: 1 }));
  }
  if (state.memory.colonization.stage === COLONIZATION_STAGE_OUTBOUND) {
    groups.push(Object.freeze({ kind: "settler", count: COLONIZATION_SETTLER_COUNT }));
  }
  return Object.freeze(groups);
}

export function shipPeopleAboard(state) {
  assertGameState(state);
  if (!state.ship) return 0;
  return state.ship.crew + travelerManifestCount(shipTravelerManifestForValidatedState(state));
}

export function pendingNamedCrewDeathNotice(state) {
  assertGameState(state);
  return state.memory.namedCrewDeathNotices[0] || null;
}

export function consumeNamedCrewDeathNotice(state) {
  assertGameState(state);
  return state.memory.namedCrewDeathNotices.shift() || null;
}

function travelerManifestCount(groups) {
  return groups.reduce((total, group) => total + group.count, 0);
}

function activeQuestTravelerGroup(quest) {
  if (!quest) return null;
  if (quest.kind === "passenger") return Object.freeze({ kind: "passenger", count: 1 });
  if (isEnvoyQuest(quest)) return Object.freeze({ kind: "envoy", count: 1 });
  const count = quest.passengerCount ?? quest.passengers?.length ?? 0;
  if (!Number.isInteger(count) || count < 0) {
    throw new Error(`Invalid quest passenger count: ${count}`);
  }
  return count > 0 ? Object.freeze({ kind: "passenger", count }) : null;
}

export function initializeShipProvisions(state, rationCount = STARTING_HARDTACK_RATIONS) {
  assertGameState(state);
  assertProvisionQuantity(rationCount, "starting hardtack rations");
  const good = goodById(HARDTACK_GOOD_ID);
  const availableRations = Math.floor(
    (provisionCargoFree(state, "food") + 1e-8) * FOOD_RATIONS_PER_HOLD_UNIT / good.unitSize
  );
  const rations = Math.min(rationCount, availableRations);
  if (rations <= 0) return { good, quantity: 0, rations: 0 };
  const price = hardtackRationPrice(good, rations);
  addFoodRations(state, good.id, rations, price);
  recordDecision(state, `provisions.start.${good.id}`, rations);
  return { good, quantity: rations / FOOD_RATIONS_PER_HOLD_UNIT, rations };
}

export function autoProvisionHardtackAtPort(state, economy, city, context = {}) {
  assertGameState(state);
  const good = goodById(HARDTACK_GOOD_ID);
  const status = survivalStatus(state);
  const targetDays = state.ship?.loadoutTargets?.foodDays || FOOD_TARGET_DAYS;
  const targetRations = Math.ceil(targetDays * status.consumers.foodConsumers);
  const neededRations = Math.max(0, Math.ceil(targetRations - status.foodRations));
  if (neededRations <= 0) return { good, quantity: 0, rations: 0, price: 0 };
  const freeRations = Math.floor(
    (cargoFreeForGood(state, good.id) + 1e-8) * FOOD_RATIONS_PER_HOLD_UNIT / good.unitSize
  );
  if (freeRations <= 0 || state.doubloons <= 0) return { good, quantity: 0, rations: 0, price: 0 };

  marketRow(economy, city, HARDTACK_GOOD_ID);
  assertPlayerTradeAccess(state, city, context);
  const rations = affordableHardtackRations(good, Math.min(neededRations, freeRations), state.doubloons);
  if (rations <= 0) return { good, quantity: 0, rations: 0, price: 0 };
  const price = hardtackRationPrice(good, rations);
  addFoodRations(state, good.id, rations, price);
  state.doubloons -= price;
  recordDecision(state, `provisions.buy.${cityKey(city)}.${good.id}`, rations);
  recordLedgerEntry(state, city, context, {
    kind: "provision",
    description: `Take on ${good.label}: ${rations} rations`,
    goodId: good.id,
    quantity: rations,
    amount: -price,
    costBasis: price,
    pnl: null
  });
  return { good, quantity: rations / FOOD_RATIONS_PER_HOLD_UNIT, rations, price, costBasis: price };
}

export function autoProvisionFreshWaterAtPort(state, city, context = {}) {
  assertGameState(state);
  const good = goodById(FRESH_WATER_GOOD_ID);
  const missing = Math.max(0, state.survival.freshWaterCapacity - state.survival.freshWater);
  if (missing <= 0) return { good, quantity: 0, price: 0, filled: 0 };
  const neededUnits = Math.ceil(missing / FRESH_WATER_USE_PER_DAY);
  const quantity = Math.min(neededUnits, Math.floor(state.doubloons / good.basePrice));
  if (quantity <= 0) return { good, quantity: 0, price: 0, filled: 0 };
  const filled = stowFreshWater(
    state,
    Math.min(missing, quantity * FRESH_WATER_USE_PER_DAY)
  );
  if (filled <= 0) return { good, quantity: 0, price: 0, filled: 0 };
  const purchasedQuantity = Math.ceil(filled / FRESH_WATER_USE_PER_DAY);
  const price = purchasedQuantity * good.basePrice;
  state.doubloons -= price;
  recordDecision(state, `provisions.water.${good.id}`, purchasedQuantity);
  recordLedgerEntry(state, city, context, {
    kind: "provision",
    description: `Take on ${good.label} x${purchasedQuantity}`,
    goodId: good.id,
    quantity: purchasedQuantity,
    amount: -price,
    costBasis: null,
    pnl: null
  });
  return { good, quantity: purchasedQuantity, price, filled };
}

export function updateSurvival(state, previousMinute, currentMinute, options = {}) {
  assertGameState(state);
  assertSimulationMinute(previousMinute);
  assertSimulationMinute(currentMinute);
  const rainfall = options.rainfall ?? 0;
  if (!Number.isFinite(rainfall) || rainfall < 0 || rainfall > 1) {
    throw new Error(`Invalid rainfall strength: ${rainfall}`);
  }
  const foodDurationMultiplier = options.foodDurationMultiplier ?? 1;
  if (!Number.isFinite(foodDurationMultiplier) || foodDurationMultiplier <= 0) {
    throw new Error(`Invalid food duration multiplier: ${foodDurationMultiplier}`);
  }
  const result = {
    changed: false,
    freshWaterRefilled: false,
    rainWaterCollected: 0,
    waterConsumed: 0,
    waterCargoConsumed: 0,
    wineConsumed: 0,
    wineDrinkingStarted: false,
    wineOnlyMinutes: 0,
    wineOnlyDaysElapsed: 0,
    foodConsumed: [],
    dehydrated: false,
    starved: false
  };
  result.changed = clearMissedFoodRationDebt(state) || result.changed;
  if (options.safePort) {
    result.changed = resetWineOnlySurvivalState(state) || result.changed;
    state.survival.lastMinute = currentMinute;
    return result;
  }
  if (options.freshwater) {
    if (state.survival.freshWater < state.survival.freshWaterCapacity) {
      const filled = stowFreshWater(
        state,
        state.survival.freshWaterCapacity - state.survival.freshWater
      );
      if (filled > 0) {
        result.freshWaterRefilled = true;
        result.changed = true;
      }
    }
  }

  const elapsedMinutes = Math.max(0, currentMinute - previousMinute);
  if (elapsedMinutes <= 0) {
    state.survival.lastMinute = currentMinute;
    return result;
  }

  const elapsedDays = elapsedMinutes / MINUTES_PER_DAY;
  const consumption = shipConsumption(state);
  if (!options.freshwater) {
    const wineEmergencyRecovered = state.survival.freshWater >= WINE_EMERGENCY_RECOVERY_WATER_UNITS;
    const waterUse = state.ship
      ? elapsedDays * consumption.waterConsumers / WATER_PERSON_DAYS_PER_UNIT
      : elapsedDays * FRESH_WATER_USE_PER_DAY;
    const availableRainWater = elapsedDays * rainfall *
      RAIN_WATER_COLLECTION_PER_CONSUMER_DAY * consumption.waterConsumers;
    const rainWaterUsed = Math.min(waterUse, availableRainWater);
    const water = consumeDrinkSupply(state, waterUse - rainWaterUsed, {
      allowCargoReserve: !state.ship,
      allowWine: Boolean(state.ship)
    });
    const rainWaterStored = stowFreshWater(state, availableRainWater - rainWaterUsed);
    if (rainWaterStored > 0) {
      result.changed = true;
    }
    result.rainWaterCollected = rainWaterUsed + rainWaterStored;
    result.waterConsumed = water.waterConsumed;
    result.waterCargoConsumed = water.cargoConsumed;
    result.wineConsumed = water.wineConsumed;
    if (water.changed) {
      result.changed = true;
    }
    if (water.dehydrated) result.dehydrated = true;
    const wineOnlyMinutes = waterUse > 0
      ? elapsedMinutes * water.wineConsumed / waterUse
      : 0;
    const wineState = updateWineOnlySurvivalState(state, wineOnlyMinutes, wineEmergencyRecovered);
    result.wineDrinkingStarted = wineState.started;
    result.wineOnlyMinutes = wineOnlyMinutes;
    result.wineOnlyDaysElapsed = wineState.daysElapsed;
  } else {
    result.changed = resetWineOnlySurvivalState(state) || result.changed;
  }

  state.survival.foodRationDebt += elapsedDays * consumption.foodConsumers / foodDurationMultiplier;
  while (state.survival.foodRationDebt >= 1) {
    const consumed = consumeCheapestFoodRation(state);
    if (!consumed) {
      result.starved = true;
      result.changed = clearMissedFoodRationDebt(state) || result.changed;
      break;
    }
    state.survival.foodRationDebt -= 1;
    result.foodConsumed.push(consumed);
    result.changed = true;
  }
  state.survival.lastMinute = currentMinute;
  return result;
}

export function cargoCostBasis(state, goodId) {
  assertGameState(state);
  goodById(goodId);
  const quantity = state.cargo[goodId] || 0;
  const known = Object.prototype.hasOwnProperty.call(state.accounts.cargoCostBasis, goodId);
  const total = known ? state.accounts.cargoCostBasis[goodId] : 0;
  if (!Number.isFinite(total) || total < 0) throw new Error(`Invalid ${goodId} cargo cost basis: ${total}`);
  return {
    known: known && quantity > 0,
    total,
    average: quantity > 0 ? total / quantity : 0
  };
}

export function deliverQuestCargo(state, city, goodId, quantity, questId, context = {}) {
  assertGameState(state);
  const good = goodById(goodId);
  assertQuantity(quantity, "quest cargo quantity");
  if (typeof questId !== "string" || questId.trim() === "") {
    throw new Error(`Invalid cargo quest id: ${questId}`);
  }
  const held = state.cargo[good.id] || 0;
  if (held < quantity) {
    throw new Error(`Cannot deliver ${quantity} ${good.label}; hold has ${held}`);
  }
  const basis = cargoCostBasis(state, good.id);
  const deliveredCost = basis.known ? basis.total * quantity / held : 0;
  const remaining = held - quantity;
  if (remaining > 0) {
    state.cargo[good.id] = remaining;
    if (basis.known) {
      state.accounts.cargoCostBasis[good.id] = roundLedgerMoney(basis.total - deliveredCost);
    }
  } else {
    delete state.cargo[good.id];
    delete state.accounts.cargoCostBasis[good.id];
  }
  recordDecision(state, `quest.deliver.${questId}.${good.id}`, quantity);
  recordLedgerEntry(state, city, context, {
    kind: "quest",
    description: `Deliver ${good.label} x${quantity}`,
    goodId: good.id,
    quantity,
    amount: 0,
    costBasis: deliveredCost,
    pnl: null
  });
  return { good, quantity, costBasis: deliveredCost };
}

export function shipItemRows(state) {
  assertGameState(state);
  const rows = SHIP_ITEM_CATALOG
    .map((item) => {
      if (item.id === SHIP_ITEM_FISHING_NET) return fishingNetItemRow(state);
      if (item.id === SHIP_ITEM_CANNON_EQUIPMENT) return cannonEquipmentItemRow(state);
      if (item.id === SHIP_ITEM_WHALE_HARPOON) return whaleHarpoonItemRow(state);
      return { ...item, quantity: state.inventory.items[item.id] || 0 };
    })
    .filter((item) => item.quantity > 0);
  const goal = state.memory.campaignGoal;
  if (goal?.type === CAMPAIGN_GOAL_TREASURE && goal.acquiredMapPiecePirateIds.length > 0) {
    rows.push({
      id: "captains-treasure-map",
      label: `Captain ${goal.treasureCaptainName}'s map`,
      detail: `${goal.acquiredMapPiecePirateIds.length} of ${TREASURE_MAP_PIECE_COUNT} pieces recovered`,
      quantity: 1
    });
  }
  if (goal?.type === CAMPAIGN_GOAL_TREASURE && goal.treasureRecovered) {
    rows.push({
      id: "captains-treasure",
      label: `Captain ${goal.treasureCaptainName}'s treasure`,
      detail: "A notorious hoard that draws every pirate's eye",
      quantity: 1,
      questItem: true,
      discardable: false
    });
  }
  return rows;
}

export function hasShipItem(state, itemId) {
  assertGameState(state);
  if (typeof itemId !== "string" || itemId.trim() === "") throw new Error(`Invalid ship item id: ${itemId}`);
  if (itemId === SHIP_ITEM_FISHING_NET) return Boolean(state.inventory.fishingNetId);
  if (itemId === SHIP_ITEM_CANNON_EQUIPMENT) return Boolean(state.inventory.cannonEquipmentId);
  if (itemId === SHIP_ITEM_WHALE_HARPOON) return Boolean(state.inventory.whaleHarpoonId);
  return (state.inventory.items[itemId] || 0) > 0;
}

export function playerPerkItemRows(state) {
  assertGameState(state);
  return Object.freeze(PERK_ITEMS
    .filter((item) => (state.inventory.items[item.id] || 0) > 0)
    .map((item) => Object.freeze({ ...item, quantity: state.inventory.items[item.id] })));
}

export function enterSpecialEquipmentStore(state, economy, city) {
  assertGameState(state);
  return openSpecialEquipmentOffer(state.memory.specialEquipmentOffers, economy, city, {
    ownedItemIds: Object.keys(state.inventory.items).filter((id) => state.inventory.items[id] === 1),
    seedKey: state.voyageSeed
  });
}

export function purchasePerkItem(state, city, itemId, context = {}) {
  assertGameState(state);
  const item = perkItemById(itemId);
  if ((state.inventory.items[item.id] || 0) > 0) throw new Error(`${item.label} is already aboard`);
  const offer = specialEquipmentOfferEntry(state.memory.specialEquipmentOffers, city);
  if (!offer || offer.itemId !== item.id || offer.purchased || offer.timesOffered < 1) {
    throw new Error(`${item.label} is not the active special offer at ${cityLabel(city)}`);
  }
  if (state.doubloons < item.price) throw new Error(`Not enough doubloons to buy ${item.label}`);
  state.doubloons -= item.price;
  state.inventory.items[item.id] = 1;
  completeSpecialEquipmentOfferPurchase(state.memory.specialEquipmentOffers, city, item.id);
  refreshPlayerPerkCargoCapacity(state);
  recordLedgerEntry(state, city, context, {
    kind: "equipment",
    description: `Buy ${item.label}`,
    goodId: null,
    quantity: 1,
    amount: -item.price,
    costBasis: item.price,
    pnl: null
  });
  return { item, price: item.price };
}

export function maybeGrantMissionPerkItem(state, city, {
  missionId,
  distanceKm = 0,
  reward = 0,
  random = Math.random,
  context = {}
}) {
  assertGameState(state);
  if (!city || !Number.isInteger(city.tileId)) throw new Error("Mission item gift requires a port city");
  if (typeof missionId !== "string" || missionId.trim() === "") throw new Error("Mission item gift requires an id");
  if (!Number.isFinite(distanceKm) || distanceKm < 0) throw new Error(`Invalid mission gift distance: ${distanceKm}`);
  if (!Number.isFinite(reward) || reward < 0) throw new Error(`Invalid mission gift reward: ${reward}`);
  if (typeof random !== "function") throw new Error("Mission item gift requires a random source");
  const memory = state.memory.missionItemGifts;
  if (!memory || typeof memory !== "object" || Array.isArray(memory)) {
    throw new Error("Game state requires mission item gift memory");
  }
  if (Object.prototype.hasOwnProperty.call(memory, missionId)) {
    const itemId = memory[missionId];
    return itemId === null ? null : { item: perkItemById(itemId), alreadyResolved: true };
  }
  const difficulty = Math.max(distanceKm / 5000, reward / 2500);
  const chance = Math.max(0.08, Math.min(0.42, 0.08 + difficulty * 0.2));
  const roll = random();
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) throw new Error(`Invalid mission gift roll: ${roll}`);
  if (roll >= chance) {
    memory[missionId] = null;
    return null;
  }
  const item = missionGiftItem({
    city,
    identityKey: `${missionId}|${state.playerCharacter?.id || state.playerCharacter?.name || "captain"}`,
    ownedItemIds: Object.keys(state.inventory.items).filter((id) => state.inventory.items[id] > 0)
  });
  if (!item) {
    memory[missionId] = null;
    return null;
  }
  state.inventory.items[item.id] = 1;
  memory[missionId] = item.id;
  refreshPlayerPerkCargoCapacity(state);
  recordLedgerEntry(state, city, context, {
    kind: "quest",
    description: `Mission gift: ${item.label}`,
    goodId: null,
    quantity: 1,
    amount: 0,
    costBasis: 0,
    pnl: null
  });
  return { item, chance, alreadyResolved: false };
}

export function prepareHighValueMissionPerkItem(state, city, missionId) {
  assertGameState(state);
  if (!city || !Number.isInteger(city.tileId)) {
    throw new Error("High-value mission item preparation requires a port city");
  }
  if (typeof missionId !== "string" || missionId.trim() === "") {
    throw new Error("High-value mission item preparation requires a mission id");
  }
  const existingItemId = state.memory.missionItemGifts[missionId];
  if (existingItemId) return perkItemById(existingItemId);
  if (existingItemId === null) {
    throw new Error(`High-value mission item was previously exhausted: ${missionId}`);
  }
  const item = highValueMissionGiftItem({
    city,
    identityKey: `${missionId}|${state.playerCharacter?.id || state.playerCharacter?.name || "captain"}`,
    ownedItemIds: Object.keys(state.inventory.items).filter((id) => state.inventory.items[id] > 0)
  });
  if (!item) throw new Error("No unowned high-value item remains for rescued traveler reunion");
  state.memory.missionItemGifts[missionId] = item.id;
  return item;
}

export function receiveRescuedTravelerReunionReward(state, city, {
  missionId,
  rewardDoubloons,
  itemId,
  context = {}
}) {
  assertGameState(state);
  if (!city || !Number.isInteger(city.tileId)) throw new Error("Rescued traveler reward requires a port city");
  if (typeof missionId !== "string" || missionId.trim() === "") {
    throw new Error("Rescued traveler reward requires a mission id");
  }
  if (!Number.isInteger(rewardDoubloons) || rewardDoubloons <= 0) {
    throw new Error(`Invalid rescued traveler doubloon reward: ${rewardDoubloons}`);
  }
  const item = perkItemById(itemId);
  if (state.memory.missionItemGifts[missionId] !== item.id) {
    throw new Error(`Rescued traveler reward item was not prepared: ${item.id}`);
  }
  if ((state.inventory.items[item.id] || 0) > 0) {
    throw new Error(`Rescued traveler reward item is already aboard: ${item.label}`);
  }
  state.doubloons += rewardDoubloons;
  state.inventory.items[item.id] = 1;
  refreshPlayerPerkCargoCapacity(state);
  recordLedgerEntry(state, city, context, {
    kind: "quest",
    description: `Reunited rescued traveler with family in ${cityLabel(city)}`,
    goodId: null,
    quantity: 0,
    amount: rewardDoubloons,
    costBasis: null,
    pnl: null
  });
  recordLedgerEntry(state, city, context, {
    kind: "quest",
    description: `Family gift: ${item.label}`,
    goodId: null,
    quantity: 1,
    amount: 0,
    costBasis: 0,
    pnl: null
  });
  return { rewardDoubloons, item };
}

export function playerAssaultCargoBonus(state) {
  assertGameState(state);
  const matchlocks = Math.floor(state.cargo[MATCHLOCKS_GOOD_ID] || 0);
  const gunpowder = Math.floor(state.cargo[GUNPOWDER_GOOD_ID] || 0);
  const matchlockBonus = Math.min(0.08, matchlocks * 0.012);
  const powderBonus = Math.min(0.04, gunpowder * 0.006);
  const combinedArmsBonus = matchlocks > 0 && gunpowder > 0 ? 0.03 : 0;
  return Math.min(0.15, matchlockBonus + powderBonus + combinedArmsBonus);
}

export function playerPerkTotals(state) {
  assertGameState(state);
  return gameStatePerkTotals(state);
}

export function effectivePlayerCargoCapacity(state, baseCargoCapacity = state.ship?.baseCargoCapacity) {
  if (!Number.isInteger(baseCargoCapacity) || baseCargoCapacity < 0) {
    throw new Error(`Invalid base player cargo capacity: ${baseCargoCapacity}`);
  }
  const stats = effectivePlayerShipStats(state, {
    cargoCapacity: baseCargoCapacity,
    topSpeedRad: 1,
    accelerationRad: 1,
    turnRateRad: 1,
    hitPoints: 1,
    seaworthiness: 0,
    upwindStallAngleDeg: 90
  });
  return stats.cargoCapacity;
}

export function refreshPlayerPerkCargoCapacity(state) {
  if (!state?.ship) return state?.cargoCapacity;
  const capacity = effectivePlayerCargoCapacity(state, state.ship.baseCargoCapacity);
  const previousCapacity = state.cargoCapacity;
  state.cargoCapacity = capacity;
  if (cargoUsedTicks(state) > capacity * CARGO_SPACE_TICKS_PER_UNIT) {
    state.cargoCapacity = previousCapacity;
    throw new Error(`Perk capacity ${capacity} cannot hold current cargo`);
  }
  return capacity;
}

export function playerFishingNet(state) {
  assertGameState(state);
  return fishingNetById(state.inventory.fishingNetId);
}

export function purchaseFishingNet(state, economy, city, netId, context = {}) {
  assertGameState(state);
  const current = playerFishingNet(state);
  const next = fishingNetById(netId);
  if (next.tier <= current.tier) {
    throw new Error(`${next.label} is not an upgrade over ${current.label}`);
  }
  if (state.doubloons < next.price) {
    throw new Error(`Not enough doubloons to buy ${next.label}`);
  }
  if (!equipmentAvailableAtPort(economy, city, EQUIPMENT_STOCK_FISHING_NET, next)) {
    throw new Error(`${next.label} is not stocked at ${cityLabel(city)}`);
  }
  state.doubloons -= next.price;
  state.inventory.fishingNetId = next.id;
  recordLedgerEntry(state, city, context, {
    kind: "equipment",
    description: `Buy ${next.label}`,
    goodId: null,
    quantity: 1,
    amount: -next.price,
    costBasis: next.price,
    pnl: null
  });
  return { previous: current, net: next, price: next.price };
}

export function playerCannonEquipment(state) {
  assertGameState(state);
  return cannonEquipmentById(state.inventory.cannonEquipmentId);
}

export function playerWhaleHarpoon(state) {
  assertGameState(state);
  return state.inventory.whaleHarpoonId === null
    ? null
    : whaleHarpoonById(state.inventory.whaleHarpoonId);
}

export function purchaseWhaleHarpoon(state, economy, city, harpoonId, context = {}) {
  assertGameState(state);
  const current = playerWhaleHarpoon(state);
  const next = whaleHarpoonById(harpoonId);
  if (current && next.tier <= current.tier) {
    throw new Error(`${next.label} is not an upgrade over ${current.label}`);
  }
  if (state.doubloons < next.price) throw new Error(`Not enough doubloons to buy ${next.label}`);
  if (!equipmentAvailableAtPort(economy, city, EQUIPMENT_STOCK_WHALE_HARPOON, next)) {
    throw new Error(`${next.label} is not stocked at ${cityLabel(city)}`);
  }
  state.doubloons -= next.price;
  state.inventory.whaleHarpoonId = next.id;
  recordLedgerEntry(state, city, context, {
    kind: "equipment",
    description: `Buy ${next.label}`,
    goodId: null,
    quantity: 1,
    amount: -next.price,
    costBasis: next.price,
    pnl: null
  });
  return { previous: current, harpoon: next, price: next.price };
}

export function purchaseCannonEquipment(state, economy, city, equipmentId, context = {}) {
  assertGameState(state);
  if (!state.ship || state.ship.cannonCapacity <= 0) {
    throw new Error("Cannon equipment requires a cannon-armed ship");
  }
  const current = playerCannonEquipment(state);
  const next = cannonEquipmentById(equipmentId);
  if (next.tier <= current.tier) {
    throw new Error(`${next.label} is not an upgrade over ${current.label}`);
  }
  if (state.doubloons < next.price) {
    throw new Error(`Not enough doubloons to buy ${next.label}`);
  }
  if (!equipmentAvailableAtPort(economy, city, EQUIPMENT_STOCK_CANNON, next)) {
    throw new Error(`${next.label} is not stocked at ${cityLabel(city)}`);
  }
  state.doubloons -= next.price;
  state.inventory.cannonEquipmentId = next.id;
  recordLedgerEntry(state, city, context, {
    kind: "equipment",
    description: `Buy ${next.label}`,
    goodId: null,
    quantity: 1,
    amount: -next.price,
    costBasis: next.price,
    pnl: null
  });
  return { previous: current, equipment: next, price: next.price };
}

export function ledgerEntries(state) {
  assertGameState(state);
  return state.accounts.ledger.slice();
}

export function compactPlayerLedger(state, { limit = PLAYER_LEDGER_ENTRY_LIMIT } = {}) {
  if (!state?.accounts || !Array.isArray(state.accounts.ledger)) {
    throw new Error("Player ledger compaction requires account entries");
  }
  if (!Number.isInteger(limit) || limit < 4) {
    throw new Error(`Invalid player ledger retention limit: ${limit}`);
  }
  const ledger = state.accounts.ledger;
  if (ledger.length <= limit) return null;
  const openingEntries = ledger.filter((entry) => entry?.kind === "opening");
  if (openingEntries.length !== 1) {
    throw new Error(`Player ledger compaction requires one opening entry, got ${openingEntries.length}`);
  }
  const existingArchives = ledger.filter((entry) => entry?.kind === "archive");
  if (existingArchives.length > 1) {
    throw new Error(`Player ledger contains ${existingArchives.length} archive entries`);
  }
  const opening = openingEntries[0];
  const existingArchive = existingArchives[0] || null;
  const transactions = ledger.filter((entry) => entry !== opening && entry !== existingArchive);
  const retainedTransactionCount = limit - 2;
  const archiveTransactionCount = transactions.length - retainedTransactionCount;
  if (archiveTransactionCount <= 0) return null;
  const newlyArchived = transactions.slice(0, archiveTransactionCount);
  const retained = transactions.slice(archiveTransactionCount);
  const metrics = mergeLedgerMetrics(
    existingArchive ? ledgerArchiveMetrics(existingArchive) : emptyLedgerMetrics(),
    summarizeLedgerEntries(newlyArchived)
  );
  const latestArchived = newlyArchived.at(-1) || existingArchive;
  const archive = {
    id: existingArchive?.id ?? newlyArchived[0].id,
    kind: "archive",
    simMinute: latestArchived?.simMinute ?? opening.simMinute,
    location: "Aboard",
    country: "",
    description: `Earlier ledger activity (${metrics.entryCount} entries)`,
    goodId: null,
    quantity: 0,
    amount: metrics.grossDoubloonsEarned,
    balance: latestArchived?.balance ?? opening.balance,
    costBasis: null,
    pnl: null,
    archivedEntryCount: metrics.entryCount,
    archivedSoldGoodIds: [...metrics.soldGoodIds].sort(),
    archivedFishCaughtQuantity: metrics.fishCaughtQuantity,
    archivedPassengerDeliveries: metrics.passengerDeliveries,
    archivedAcquiredShips: metrics.acquiredShips
  };
  state.accounts.ledger = [opening, archive, ...retained];
  return Object.freeze({
    archivedEntryCount: metrics.entryCount,
    retainedEntryCount: state.accounts.ledger.length
  });
}

export function playerLedgerLifetimeMetrics(state) {
  if (!state?.accounts || !Array.isArray(state.accounts.ledger)) {
    throw new Error("Player ledger metrics require account entries");
  }
  return summarizeLedgerEntries(state.accounts.ledger);
}

export function playerLedgerTotalEntryCount(state) {
  const metrics = playerLedgerLifetimeMetrics(state);
  return 1 + metrics.entryCount;
}

export function realizedTradePnl(state) {
  assertGameState(state);
  return state.accounts.realizedPnl;
}

export function factionReputation(state, factionId) {
  assertGameState(state);
  const id = assertFactionId(factionId);
  return state.relations.factionReputation[id];
}

export function sovereignTradeOpenToFaction(state, policyId, factionId) {
  if (!state || typeof state !== "object") throw new Error("Missing game state");
  return sovereignTradeGrantedToFaction(state.relations?.tradeAccessGrants, policyId, factionId);
}

export function openSovereignTradeToFaction(state, policyId, factionId) {
  assertGameState(state);
  const id = assertFactionId(factionId);
  const opened = grantSovereignTradeToFaction(state.relations.tradeAccessGrants, policyId, id);
  if (opened) recordDecision(state, `diplomacy.trade-access.${policyId}.${id}`, 1);
  return opened;
}

export function hasPersonalTradePass(state, policyId) {
  assertGameState(state);
  return personalTradePassGranted(state.relations.personalTradePasses, policyId);
}

export function personalTradePassStatuses(state, city, simMinute = 0) {
  assertGameState(state);
  assertSimulationMinute(simMinute);
  const capitalFactionId = currentSovereignCapitalFactionId(city);
  if (!capitalFactionId) return [];
  const traderFactionId = state.playerCharacter?.nationalityId || NEUTRAL_FACTION_ID;
  const reputation = factionReputation(state, capitalFactionId);
  return sovereignTradePoliciesForHostFaction(capitalFactionId, simMinute)
    .map((policy) => {
      const granted = personalTradePassGranted(
        state.relations.personalTradePasses,
        policy.id
      );
      const nationalAccess = sovereignTradeGrantedToFaction(
        state.relations.tradeAccessGrants,
        policy.id,
        traderFactionId
      );
      const unnecessary = nationalAccess && !granted;
      const missing = reputation < TRADE_PASS_REPUTATION_REQUIRED
        ? [`standing ${formatSignedReputation(TRADE_PASS_REPUTATION_REQUIRED)}`]
        : [];
      return Object.freeze({
        available: !unnecessary,
        policyId: policy.id,
        policy,
        factionId: capitalFactionId,
        traderFactionId,
        granted,
        nationalAccess,
        eligible: !granted && !unnecessary && missing.length === 0,
        missing,
        reputation,
        reputationRequired: TRADE_PASS_REPUTATION_REQUIRED
      });
    })
    .filter((status) => status.available);
}

export function personalTradePassStatus(state, city, policyId, simMinute = 0) {
  const policy = sovereignTradePolicyById(policyId);
  const status = personalTradePassStatuses(state, city, simMinute)
    .find((candidate) => candidate.policyId === policy.id);
  if (status) return status;
  return {
    available: false,
    policyId: policy.id,
    policy,
    reason: `A ${policy.permitLabel} can be requested only at the sovereign capital while its restrictions remain in force.`
  };
}

export function issuePersonalTradePass(state, city, policyId, context = {}) {
  const simMinute = context.simMinute ?? 0;
  const status = personalTradePassStatus(state, city, policyId, simMinute);
  if (!status.available) throw new Error(status.reason);
  if (status.granted) return { ...status, grantedNow: false };
  if (!status.eligible) {
    throw new Error(`Trade pass requirements unmet: ${status.missing.join(", ")}`);
  }
  const grantedNow = grantPersonalTradePass(
    state.relations.personalTradePasses,
    policyId,
    simMinute
  );
  if (!grantedNow) throw new Error(`Trade pass grant was not recorded: ${policyId}`);
  recordDecision(state, `trade-pass.grant.${policyId}`, 1);
  return { ...status, granted: true, grantedNow: true };
}

export function isEnvoyQuest(quest) {
  return Boolean(quest && ENVOY_QUEST_KINDS.has(quest.kind));
}

export function negotiateEnvoyQuest(state, city, context = {}) {
  assertGameState(state);
  const quests = questMemory(state);
  const active = quests.active;
  if (!isEnvoyQuest(active)) throw new Error("No active envoy mission to negotiate");
  if (active.stage !== "outbound") throw new Error(`Envoy mission is not outbound: ${active.stage}`);
  if (active.targetTileId !== city?.tileId || active.destinationTileId !== city?.tileId) {
    throw new Error(`Envoy negotiations belong in ${active.targetName}, not ${cityLabel(city)}`);
  }
  assertSimulationMinute(context.simMinute);
  const direction = active.kind === "friendly-envoy" ? "improve" : "worsen";
  const events = adjustDiplomaticStance(
    state.relations.diplomacy,
    active.originFactionId,
    active.targetFactionId,
    direction,
    context.simMinute,
    { homeFactionId: state.playerCharacter?.nationalityId || null }
  );
  if (!Array.isArray(context.portCities)) {
    throw new Error("Envoy negotiations require the current port list");
  }
  const foreignSettlementExpulsions = expelHostileForeignSettlements({
    memory: state.relations.foreignSettlementExpulsions,
    ports: context.portCities,
    relationBetween: (factionAId, factionBId) => (
      diplomacyBetweenForState(state, factionAId, factionBId)
    ),
    simMinute: context.simMinute
  });
  const targetReputationDelta = active.kind === "friendly-envoy"
    ? ENVOY_TARGET_FRIENDLY_REPUTATION
    : ENVOY_TARGET_HOSTILE_REPUTATION;
  adjustFactionReputation(state, active.targetFactionId, targetReputationDelta);
  const tradeAccessOpenedFactionId = active.kind === "friendly-envoy"
    ? tradeAccessOpeningFactionId(state, active)
    : null;
  const tradeAccessOpened = tradeAccessOpenedFactionId
    ? openSovereignTradeToFaction(
        state,
        active.tradeAccessPolicyId,
        tradeAccessOpenedFactionId
      )
    : false;
  recordDecision(state, `quest.envoy.negotiate.${active.id}`, 1);
  active.stage = "return";
  active.negotiatedAtMinute = context.simMinute;
  active.destinationKey = active.originKey;
  active.destinationTileId = active.originTileId;
  active.destinationName = active.originName;
  active.destinationCountry = active.originCountry;
  return {
    quest: active,
    events,
    foreignSettlementExpulsions,
    targetReputationDelta,
    tradeAccessOpened,
    tradeAccessPolicyId: tradeAccessOpened ? active.tradeAccessPolicyId : null,
    tradeAccessOpenedFactionId
  };
}

function tradeAccessOpeningFactionId(state, quest) {
  if (!quest.tradeAccessPolicyId) return null;
  const playerFactionId = state.playerCharacter?.nationalityId || null;
  if (!playerFactionId ||
      sovereignTradeOpenToFaction(state, quest.tradeAccessPolicyId, playerFactionId)) {
    return null;
  }
  return quest.originFactionId === playerFactionId ? playerFactionId : null;
}

export function grantEnvoySafePassage(state, factionId, simMinute) {
  assertGameState(state);
  assertSimulationMinute(simMinute);
  const id = assertFactionId(factionId);
  const active = questMemory(state).active;
  if (!isEnvoyQuest(active)) return null;
  if (id !== active.originFactionId && id !== active.targetFactionId) return null;
  if (!active.envoySafePassageUntilMinute || typeof active.envoySafePassageUntilMinute !== "object") {
    active.envoySafePassageUntilMinute = {};
  }
  const previousUntilMinute = active.envoySafePassageUntilMinute[id] || 0;
  const untilMinute = Math.max(previousUntilMinute, simMinute + ENVOY_SAFE_PASSAGE_MINUTES);
  active.envoySafePassageUntilMinute[id] = untilMinute;
  recordDecision(state, `quest.envoy.safe-passage.${active.id}.${id}`, 1);
  return {
    quest: active,
    factionId: id,
    untilMinute,
    days: ENVOY_SAFE_PASSAGE_DAYS,
    message: active.dialogue?.intercession ||
      "Hold your fire! This vessel carries an accredited envoy on a diplomatic mission."
  };
}

export function activeEnvoySafePassageIds(state, simMinute) {
  assertGameState(state);
  assertSimulationMinute(simMinute);
  return activeEnvoySafePassageIdsUnchecked(state, simMinute);
}

function activeEnvoySafePassageIdsUnchecked(state, simMinute) {
  const active = questMemory(state).active;
  if (!isEnvoyQuest(active)) return [];
  const passage = active.envoySafePassageUntilMinute;
  if (!passage || typeof passage !== "object") return [];
  return Object.entries(passage)
    .filter(([, untilMinute]) => Number.isFinite(untilMinute) && untilMinute > simMinute)
    .map(([factionId]) => assertFactionId(factionId));
}

export function adjustFactionReputation(state, factionId, delta) {
  assertGameState(state);
  const id = assertFactionId(factionId);
  assertReputationDelta(delta);
  const current = state.relations.factionReputation[id];
  const next = roundReputation(clampReputation(current + delta));
  state.relations.factionReputation[id] = next;
  return next;
}

export function createPortEntryStatusContext(state, simMinute = 0) {
  if (!state || typeof state !== "object") throw new Error("Missing game state");
  assertSimulationMinute(simMinute);
  if (!state.relations || typeof state.relations !== "object") {
    throw new Error("Game state has no port-entry relations");
  }
  assertFactionReputationTable(state.relations.factionReputation);
  assertSafePassageTable(state.relations.safePassageUntilMinute);
  assertSafePassageRefusalTable(state.relations.safePassageRefusalUntilMinute);
  assertWorldDiplomacyState(state);
  if (!state.memory?.visitedPorts || typeof state.memory.visitedPorts !== "object") {
    throw new Error("Game state has no visited-port memory");
  }
  return Object.freeze({
    state,
    simMinute,
    playerFactionId: state.playerCharacter?.nationalityId || null,
    diplomaticPassageFactionIds: new Set(activeEnvoySafePassageIdsUnchecked(state, simMinute)),
    playerWarship: playerShipIsWarship(state)
  });
}

export function portEntryStatus(state, city, simMinute = 0, context = null) {
  if (!context) assertGameState(state);
  const evaluation = context || createPortEntryStatusContext(state, simMinute);
  if (evaluation.state !== state || evaluation.simMinute !== simMinute ||
      !(evaluation.diplomaticPassageFactionIds instanceof Set)) {
    throw new Error("Port entry status context does not match the requested state and time");
  }
  const factionId = city?.factionId || null;
  if (!factionId || factionId === NEUTRAL_FACTION_ID) {
    return {
      allowed: true,
      hostile: false,
      factionId,
      hostileByWar: false,
      hostileByStance: false,
      hostileByStanding: false,
      safePassage: false,
      passageRefusalActive: false,
      locked: false,
      lockUntilMinute: null,
      lockDaysRemaining: 0,
      canAttemptDisguise: false
    };
  }
  assertFactionId(factionId);
  const playerFactionId = evaluation.playerFactionId;
  const relation = playerFactionId && playerFactionId !== factionId
    ? worldDiplomacyBetween(state.relations.diplomacy, playerFactionId, factionId)
    : null;
  const hostileByWar = Boolean(
    factionId !== PIRATE_FACTION_ID &&
    relation === DIPLOMACY_WAR
  );
  const hostileByStance = factionId !== PIRATE_FACTION_ID && relation === DIPLOMACY_HOSTILE;
  const diplomaticPassage = evaluation.diplomaticPassageFactionIds.has(factionId);
  const safePassage = diplomaticPassage || (
    !evaluation.playerWarship && state.relations.safePassageUntilMinute[factionId] > simMinute
  );
  const passageRefusalActive = state.relations.safePassageRefusalUntilMinute[factionId] > simMinute;
  const hostileByStanding = state.relations.factionReputation[factionId] <= HOSTILE_PORT_REPUTATION_THRESHOLD;
  const hostile = ((hostileByWar || hostileByStance) && !safePassage) || hostileByStanding;
  const memory = requiredPortMemory(state, city);
  const storedLock = Number.isFinite(memory.disguiseLockUntilMinute)
    ? memory.disguiseLockUntilMinute
    : null;
  const locked = hostile && storedLock !== null && storedLock > simMinute;
  return {
    allowed: !hostile,
    hostile,
    factionId,
    hostileByWar,
    hostileByStance,
    hostileByStanding,
    safePassage,
    passageRefusalActive,
    locked,
    lockUntilMinute: locked ? storedLock : null,
    lockDaysRemaining: locked ? Math.ceil((storedLock - simMinute) / MINUTES_PER_DAY) : 0,
    canAttemptDisguise: hostile && !locked
  };
}

export function playerShipIsWarship(state) {
  if (!state?.ship) return false;
  const ship = state.ship;
  assertPlayerShipState(ship);
  return ship.cannons >= 8 ||
    (ship.cannonCapacity >= 16 && ship.cannons >= 4) ||
    (ship.navalWeaponKind === NAVAL_WEAPON_ARROW && ship.mass >= 100);
}

export function factionSafePassageToll(state) {
  assertGameState(state);
  if (playerShipIsWarship(state)) throw new Error("Warships cannot purchase civilian safe passage");
  return Math.ceil((20 + state.cargoCapacity / 4 + state.ship.cannons * 2) / 5) * 5;
}

export function factionSafePassageStatus(state, factionId, simMinute) {
  assertGameState(state);
  assertSimulationMinute(simMinute);
  const id = assertFactionId(factionId);
  const untilMinute = state.relations.safePassageUntilMinute[id] || 0;
  if (!Number.isFinite(untilMinute) || untilMinute < 0) {
    throw new Error(`Invalid safe passage expiry for ${id}: ${untilMinute}`);
  }
  const active = untilMinute > simMinute;
  return {
    factionId: id,
    active,
    untilMinute: active ? untilMinute : null,
    daysRemaining: active ? Math.ceil((untilMinute - simMinute) / MINUTES_PER_DAY) : 0
  };
}

export function factionSafePassageRefusalStatus(state, factionId, simMinute) {
  assertGameState(state);
  assertSimulationMinute(simMinute);
  const id = assertFactionId(factionId);
  const untilMinute = state.relations.safePassageRefusalUntilMinute[id] || 0;
  if (!Number.isFinite(untilMinute) || untilMinute < 0) {
    throw new Error(`Invalid safe passage refusal expiry for ${id}: ${untilMinute}`);
  }
  const active = untilMinute > simMinute;
  return {
    factionId: id,
    active,
    untilMinute: active ? untilMinute : null,
    daysRemaining: active ? Math.ceil((untilMinute - simMinute) / MINUTES_PER_DAY) : 0
  };
}

export function refuseFactionSafePassage(state, factionId, simMinute) {
  assertGameState(state);
  assertSimulationMinute(simMinute);
  const id = assertFactionId(factionId);
  if (id === NEUTRAL_FACTION_ID || id === PIRATE_FACTION_ID) {
    throw new Error(`Faction cannot demand safe passage: ${id}`);
  }
  const playerFactionId = state.playerCharacter?.nationalityId || null;
  const relation = playerFactionId ? diplomacyBetweenForState(state, playerFactionId, id) : null;
  if (relation !== DIPLOMACY_HOSTILE && relation !== DIPLOMACY_WAR) {
    throw new Error(`${id} has no reason to demand a passage toll`);
  }
  const untilMinute = simMinute + FACTION_SAFE_PASSAGE_REFUSAL_MINUTES;
  state.relations.safePassageRefusalUntilMinute[id] = untilMinute;
  return { factionId: id, untilMinute, days: FACTION_SAFE_PASSAGE_REFUSAL_DAYS };
}

export function activeFactionSafePassageIds(state, simMinute, context = null) {
  if (!context) assertGameState(state);
  const evaluation = context || createPortEntryStatusContext(state, simMinute);
  if (evaluation.state !== state || evaluation.simMinute !== simMinute ||
      !(evaluation.diplomaticPassageFactionIds instanceof Set)) {
    throw new Error("Safe-passage context does not match the requested state and time");
  }
  const ids = new Set(evaluation.diplomaticPassageFactionIds);
  if (!evaluation.playerWarship) {
    for (const [factionId, untilMinute] of Object.entries(state.relations.safePassageUntilMinute)) {
      if (untilMinute > simMinute) ids.add(assertFactionId(factionId));
    }
  }
  return [...ids];
}

export function purchaseFactionSafePassage(state, city, simMinute) {
  assertGameState(state);
  assertSimulationMinute(simMinute);
  const factionId = assertFactionId(city?.factionId);
  if (factionId === NEUTRAL_FACTION_ID || factionId === PIRATE_FACTION_ID) {
    throw new Error(`Faction does not issue safe passage: ${factionId}`);
  }
  if (playerShipIsWarship(state)) throw new Error("Warships cannot purchase civilian safe passage");
  const playerFactionId = state.playerCharacter?.nationalityId || null;
  const relation = playerFactionId ? diplomacyBetweenForState(state, playerFactionId, factionId) : null;
  if (relation !== DIPLOMACY_HOSTILE && relation !== DIPLOMACY_WAR) {
    throw new Error(`${cityLabel(city)} has no reason to demand a passage toll`);
  }
  const toll = factionSafePassageToll(state);
  if (state.doubloons < toll) throw new Error(`Not enough doubloons for ${factionId} safe passage`);
  state.doubloons -= toll;
  const untilMinute = simMinute + FACTION_SAFE_PASSAGE_MINUTES;
  state.relations.safePassageUntilMinute[factionId] = untilMinute;
  delete state.relations.safePassageRefusalUntilMinute[factionId];
  recordLedgerEntry(state, city, { simMinute }, {
    kind: "expense",
    description: `${cityLabel(city)} passage toll`,
    goodId: null,
    quantity: 1,
    amount: -toll,
    costBasis: null,
    pnl: null
  });
  return { factionId, toll, untilMinute, days: FACTION_SAFE_PASSAGE_DAYS };
}

export function attemptPortDisguise(state, city, simMinute, roll) {
  assertGameState(state);
  assertSimulationMinute(simMinute);
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) {
    throw new Error(`Invalid port disguise roll: ${roll}`);
  }
  const status = portEntryStatus(state, city, simMinute);
  const successChance = playerPortDisguiseSuccessChance(state);
  if (!status.hostile) throw new Error(`${cityLabel(city)} is not barring the player`);
  if (status.locked) {
    return { attempted: false, success: false, successChance, ...status };
  }

  const memory = portMemory(state, city);
  memory.disguiseAttempts = (memory.disguiseAttempts || 0) + 1;
  memory.lastDisguiseAttemptMinute = simMinute;
  if (roll < successChance) {
    return {
      attempted: true,
      success: true,
      successChance,
      locked: false,
      lockUntilMinute: null,
      lockDaysRemaining: 0
    };
  }

  const lockUntilMinute = simMinute + PORT_DISGUISE_LOCK_MINUTES;
  memory.disguiseLockUntilMinute = lockUntilMinute;
  return {
    attempted: true,
    success: false,
    successChance,
    locked: true,
    lockUntilMinute,
    lockDaysRemaining: PORT_DISGUISE_LOCK_DAYS
  };
}

export function playerPortDisguiseSuccessChance(state) {
  assertGameState(state);
  return Math.min(
    PORT_DISGUISE_MAX_SUCCESS_CHANCE,
    PORT_DISGUISE_SUCCESS_CHANCE + gameStatePerkTotals(state).disguiseChanceBonus
  );
}

export function recordTradeWithFaction(state, factionId) {
  assertGameState(state);
  const id = assertFactionId(factionId);
  if (id === NEUTRAL_FACTION_ID) return factionReputation(state, id);
  const before = factionReputation(state, id);
  const after = adjustFactionReputation(state, id, TRADE_REPUTATION_GAIN);
  if (after !== before) recordDecision(state, `reputation.trade.${id}`, 1);
  return after;
}

export function recordDeliveryForFaction(state, factionId) {
  assertGameState(state);
  const id = assertFactionId(factionId);
  if (id === NEUTRAL_FACTION_ID || id === PIRATE_FACTION_ID) return factionReputation(state, id);
  const before = factionReputation(state, id);
  const after = adjustFactionReputation(state, id, DELIVERY_REPUTATION_GAIN);
  if (after !== before) recordDecision(state, `reputation.delivery.${id}`, 1);
  return after;
}

export function recordAttackAgainstFaction(state, factionId) {
  assertGameState(state);
  const id = assertFactionId(factionId);
  if (id === NEUTRAL_FACTION_ID || id === PIRATE_FACTION_ID) return factionReputation(state, id);
  const before = factionReputation(state, id);
  const after = adjustFactionReputation(state, id, SHIP_ATTACK_REPUTATION_PENALTY);
  if (after !== before) recordDecision(state, `reputation.attack.${id}`, 1);
  return after;
}

export function recordPiracyAgainstFaction(state, victimFactionId, options = {}) {
  assertGameState(state);
  const victimId = assertFactionId(victimFactionId);
  const includeVictim = options.includeVictim !== false;
  if (victimId === PIRATE_FACTION_ID) return {};

  const changes = {};
  for (const faction of FACTIONS) {
    if (faction.id === PIRATE_FACTION_ID) continue;
    if (faction.id === victimId && !includeVictim) continue;
    const before = factionReputation(state, faction.id);
    const penalty = faction.id === victimId ? SHIP_ATTACK_REPUTATION_PENALTY : PIRACY_REPUTATION_PENALTY;
    const after = adjustFactionReputation(state, faction.id, penalty);
    if (after !== before) changes[faction.id] = { before, after };
  }
  const pirateBefore = factionReputation(state, PIRATE_FACTION_ID);
  const pirateAfter = adjustFactionReputation(state, PIRATE_FACTION_ID, PIRATE_REPUTATION_GAIN_PER_PIRACY);
  if (pirateAfter !== pirateBefore) {
    changes[PIRATE_FACTION_ID] = { before: pirateBefore, after: pirateAfter };
  }
  if (Object.keys(changes).length > 0) recordDecision(state, `reputation.piracy.${victimId}`, 1);
  return changes;
}

export function pirateHideoutsVisibleToPlayer(state) {
  return factionReputation(state, PIRATE_FACTION_ID) >= PIRATE_HIDEOUT_REPUTATION_REQUIRED;
}

export function hasLetterOfMarqueFrom(state, factionId) {
  assertGameState(state);
  const id = assertFactionId(factionId);
  return Boolean(state.relations.lettersOfMarque[id]);
}

export function hasPrivateeringAuthorityAgainst(state, targetFactionId) {
  assertGameState(state);
  const targetId = assertFactionId(targetFactionId);
  if (targetId === NEUTRAL_FACTION_ID || targetId === PIRATE_FACTION_ID) return false;
  for (const issuerId of Object.keys(state.relations.lettersOfMarque)) {
    assertFactionId(issuerId);
    if (worldDiplomacyBetween(state.relations.diplomacy, issuerId, targetId) === DIPLOMACY_WAR) return true;
  }
  return false;
}

export function letterOfMarqueStatus(state, city, shipPower = 0) {
  assertGameState(state);
  assertLetterOfMarqueShipPower(shipPower);
  const factionId = letterOfMarqueFactionId(city);
  if (!factionId) {
    return {
      available: false,
      reason: "Letters of marque are issued only at sovereign capitals."
    };
  }
  const reputation = factionReputation(state, factionId);
  const granted = hasLetterOfMarqueFrom(state, factionId);
  const missing = [];
  if (reputation < LETTER_OF_MARQUE_REPUTATION_REQUIRED) {
    missing.push(`standing ${formatSignedReputation(LETTER_OF_MARQUE_REPUTATION_REQUIRED)}`);
  }
  if (shipPower < LETTER_OF_MARQUE_POWER_REQUIRED) {
    missing.push(`ship strength ${LETTER_OF_MARQUE_POWER_REQUIRED}`);
  }
  return {
    available: true,
    factionId,
    granted,
    eligible: !granted && missing.length === 0,
    missing,
    reputation,
    shipPower,
    reputationRequired: LETTER_OF_MARQUE_REPUTATION_REQUIRED,
    shipPowerRequired: LETTER_OF_MARQUE_POWER_REQUIRED
  };
}

export function grantLetterOfMarque(state, city, shipPower = 0, context = {}) {
  const status = letterOfMarqueStatus(state, city, shipPower);
  if (!status.available) throw new Error(status.reason);
  if (status.granted) return { ...status, grantedNow: false };
  if (!status.eligible) {
    throw new Error(`Letter of marque requirements unmet: ${status.missing.join(", ")}`);
  }
  const simMinute = context.simMinute ?? null;
  if (simMinute !== null) assertSimulationMinute(simMinute);
  state.relations.lettersOfMarque[status.factionId] = {
    factionId: status.factionId,
    simMinute
  };
  recordDecision(state, `marque.grant.${status.factionId}`, 1);
  return { ...status, granted: true, grantedNow: true };
}

export function buyGood(state, economy, city, goodId, quantity = 1, context = {}) {
  assertGameState(state);
  assertQuantity(quantity, "buy quantity");
  assertPlayerTradeAccess(state, city, context);
  const row = marketRow(economy, city, goodId);
  const tradeFactionId = tradeReputationFactionId(city);
  if (row.stock < quantity) throw new Error(`${cityLabel(city)} has only ${row.stock} ${row.good.label}`);
  const terms = playerTradeTerms(state, city, goodId);
  const total = quotePortSale(economy, city, goodId, quantity, terms.purchaseMultiplier);
  if (state.doubloons < total) {
    throw new Error(`Not enough doubloons to buy ${quantity} ${row.good.label}`);
  }
  const availableCargo = cargoFreeForGood(state, row.good.id);
  if (availableCargo < row.good.unitSize * quantity) {
    throw new Error(`Not enough cargo space to buy ${quantity} ${row.good.label}`);
  }
  executePortSale(economy, city, goodId, quantity, terms.purchaseMultiplier);
  state.doubloons -= total;
  state.cargo[row.good.id] = (state.cargo[row.good.id] || 0) + quantity;
  state.accounts.cargoCostBasis[row.good.id] = roundLedgerMoney(
    (state.accounts.cargoCostBasis[row.good.id] || 0) + total
  );
  recordDecision(state, `trade.buy.${cityKey(city)}.${row.good.id}`, quantity);
  recordLedgerEntry(state, city, context, {
    kind: "buy",
    description: `Buy ${row.good.label} x${quantity}`,
    goodId: row.good.id,
    quantity,
    amount: -total,
    costBasis: total,
    pnl: null
  });
  if (tradeFactionId) recordTradeWithFaction(state, tradeFactionId);
  return { good: row.good, quantity, price: total, costBasis: total, tradeTerms: terms };
}

function portPurchasePriceMultiplier(city) {
  const multiplier = city?.purchaseDiscountMultiplier ?? 1;
  if (!Number.isFinite(multiplier) || multiplier <= 0 || multiplier > 1) {
    throw new Error(`Invalid purchase discount at ${cityLabel(city)}: ${multiplier}`);
  }
  return multiplier;
}

export function sellGood(state, economy, city, goodId, quantity = 1, context = {}) {
  assertGameState(state);
  assertQuantity(quantity, "sell quantity");
  assertPlayerTradeAccess(state, city, context);
  const row = marketRow(economy, city, goodId);
  const tradeFactionId = tradeReputationFactionId(city);
  const held = state.cargo[row.good.id] || 0;
  if (row.good.sellable === false) {
    throw new Error(`${row.good.label} is a ship supply and cannot be sold`);
  }
  if (held < quantity) throw new Error(`Cannot sell ${quantity} ${row.good.label}; hold has ${held}`);
  const terms = playerTradeTerms(state, city, goodId);
  const total = quotePortPurchase(economy, city, goodId, quantity, terms.saleMultiplier);
  if (maximumPortPurchaseQuantity(economy, city, goodId, quantity, terms.saleMultiplier) < quantity) {
    throw new Error(`${cityLabel(city)} market lacks specie for ${row.good.label}`);
  }
  const basis = cargoCostBasis(state, row.good.id);
  const soldCost = basis.known ? basis.total * quantity / held : 0;
  const pnl = basis.known ? total - soldCost : null;
  executePortPurchase(economy, city, goodId, quantity, terms.saleMultiplier);
  state.doubloons += total;
  const remaining = held - quantity;
  if (remaining > 0) {
    state.cargo[row.good.id] = remaining;
    if (basis.known) state.accounts.cargoCostBasis[row.good.id] = roundLedgerMoney(basis.total - soldCost);
  } else {
    delete state.cargo[row.good.id];
    delete state.accounts.cargoCostBasis[row.good.id];
  }
  if (pnl !== null) state.accounts.realizedPnl = roundLedgerMoney(state.accounts.realizedPnl + pnl);
  recordDecision(state, `trade.sell.${cityKey(city)}.${row.good.id}`, quantity);
  recordLedgerEntry(state, city, context, {
    kind: "sell",
    description: `Sell ${row.good.label} x${quantity}`,
    goodId: row.good.id,
    quantity,
    amount: total,
    costBasis: soldCost,
    pnl
  });
  if (tradeFactionId) recordTradeWithFaction(state, tradeFactionId);
  return { good: row.good, quantity, price: total, costBasis: soldCost, pnl, tradeTerms: terms };
}

export function playerTradeAccess(state, city, context = {}) {
  assertGameState(state);
  const traderFactionId = state.playerCharacter?.nationalityId || NEUTRAL_FACTION_ID;
  const portFactionId = city?.factionId || NEUTRAL_FACTION_ID;
  const access = evaluateTradeAccess({
    port: city,
    traderFactionId,
    relation: diplomacyBetweenForState(state, traderFactionId, portFactionId),
    relationToFaction: (factionId) => (
      diplomacyBetweenForState(state, traderFactionId, factionId)
    ),
    foreignSettlementExpulsions: state.relations.foreignSettlementExpulsions,
    simMinute: context.simMinute ?? 0,
    tradeAccessGranted: (policyId, factionId) => (
      sovereignTradeOpenToFaction(state, policyId, factionId) ||
      personalTradePassGranted(state.relations.personalTradePasses, policyId)
    ),
    illicitAccessPolicyId: context.illicitTradeAccessPolicyId ?? null,
    disguisedEntry: context.disguisedEntry === true
  });
  const personalTradePass = access.policyId !== null &&
    personalTradePassGranted(state.relations.personalTradePasses, access.policyId);
  return Object.freeze({
    ...access,
    personalTradePass
  });
}

function assertPlayerTradeAccess(state, city, context) {
  const access = playerTradeAccess(state, city, context);
  if (!access.allowed) {
    if (access.reason === "war") {
      throw new Error(`${cityLabel(city)} market is closed because wartime trade is blocked`);
    }
    throw new Error(`${cityLabel(city)} market is closed to foreign trade under ${access.policy.label}`);
  }
  return access;
}

export function playerTradeTerms(state, city, goodId) {
  assertGameState(state);
  tradeGoodById(goodId);
  const traderFactionId = state.playerCharacter?.nationalityId || NEUTRAL_FACTION_ID;
  const portFactionId = city?.factionId || NEUTRAL_FACTION_ID;
  const reputation = state.relations.factionReputation[portFactionId] || 0;
  const perks = gameStatePerkTotals(state);
  return tradeTerms({
    port: city,
    traderFactionId,
    relation: diplomacyBetweenForState(state, traderFactionId, portFactionId),
    relationToFaction: (factionId) => (
      diplomacyBetweenForState(state, traderFactionId, factionId)
    ),
    foreignSettlementExpulsions: state.relations.foreignSettlementExpulsions,
    goodId,
    reputation,
    reputationForFaction: (factionId) => state.relations.factionReputation[factionId] || 0,
    purchaseDiscountMultiplier: portPurchasePriceMultiplier(city),
    purchaseBargainMultiplier: perks.tradePurchaseMultiplier,
    saleBargainMultiplier: perks.tradeSaleMultiplier
  });
}

export function playerPortCustomsNotice(state, city) {
  assertGameState(state);
  const traderFactionId = state.playerCharacter?.nationalityId || NEUTRAL_FACTION_ID;
  const portFactionId = city?.factionId || NEUTRAL_FACTION_ID;
  const terms = customsTerms({
    port: city,
    traderFactionId,
    relation: diplomacyBetweenForState(state, traderFactionId, portFactionId),
    relationToFaction: (factionId) => (
      diplomacyBetweenForState(state, traderFactionId, factionId)
    ),
    foreignSettlementExpulsions: state.relations.foreignSettlementExpulsions,
    reputation: state.relations.factionReputation[portFactionId] || 0,
    reputationForFaction: (factionId) => state.relations.factionReputation[factionId] || 0
  });
  const displayedRate = Math.round(terms.customsRate * 100);
  const key = [
    "trade.customs-notice",
    cityKey(city),
    terms.jurisdictionFactionId,
    terms.domestic ? "domestic" : terms.relation,
    displayedRate
  ].join(".");
  return Object.freeze({
    ...terms,
    displayedRate,
    key,
    acknowledged: (state.memory.decisions[key] || 0) > 0
  });
}

export function acknowledgePlayerPortCustomsNotice(state, city, key) {
  assertGameState(state);
  if (typeof key !== "string" || key === "") throw new Error("Customs notice requires a key");
  const current = playerPortCustomsNotice(state, city);
  if (current.key !== key) {
    throw new Error(`Customs notice changed before acknowledgement: ${key} != ${current.key}`);
  }
  if (!current.acknowledged) recordDecision(state, key, 1);
  return playerPortCustomsNotice(state, city);
}

export function portugueseCartazStatus(state, city, simMinute, cargoCapacity = state.cargoCapacity) {
  assertGameState(state);
  assertSimulationMinute(simMinute);
  if (!isPortugueseEstadoPort(city)) {
    throw new Error(`${cityLabel(city)} is not a Portuguese Estado da India port`);
  }
  const traderFactionId = state.playerCharacter?.nationalityId || NEUTRAL_FACTION_ID;
  const relation = diplomacyBetweenForState(state, traderFactionId, PORTUGUESE_FACTION_ID);
  const fee = portugueseCartazFee({ traderFactionId, relation, cargoCapacity });
  const memory = state.relations.portugueseCartaz;
  return Object.freeze({
    exempt: traderFactionId === PORTUGUESE_FACTION_ID,
    valid: traderFactionId === PORTUGUESE_FACTION_ID || memory.untilMinute > simMinute,
    untilMinute: memory.untilMinute,
    issuedAtPortId: memory.issuedAtPortId,
    fee,
    relation,
    canPurchase: fee !== null && traderFactionId !== PORTUGUESE_FACTION_ID &&
      state.doubloons >= fee
  });
}

export function purchasePortugueseCartaz(state, city, simMinute) {
  const status = portugueseCartazStatus(state, city, simMinute);
  if (status.exempt) throw new Error("Portuguese captains do not need a cartaz");
  if (status.fee === null) throw new Error("Portuguese authorities refuse to issue this captain a cartaz");
  if (state.doubloons < status.fee) throw new Error(`Not enough doubloons for a ${status.fee} db cartaz`);
  state.doubloons -= status.fee;
  state.relations.portugueseCartaz.issuedMinute = simMinute;
  state.relations.portugueseCartaz.untilMinute = simMinute +
    PORTUGUESE_CARTAZ_DURATION_DAYS * 24 * 60;
  state.relations.portugueseCartaz.issuedAtPortId = city.portId || `city-${city.tileId}`;
  state.relations.portugueseCartaz.graceUntilMinute = 0;
  recordDecision(state, "trade.portuguese-cartaz.purchased", 1);
  recordLedgerEntry(state, city, { simMinute }, {
    kind: "permit",
    description: `Purchase ${PORTUGUESE_CARTAZ_DURATION_DAYS}-day Portuguese cartaz`,
    goodId: null,
    quantity: 1,
    amount: -status.fee,
    costBasis: status.fee,
    pnl: null
  });
  return Object.freeze({ ...status, valid: true, untilMinute: state.relations.portugueseCartaz.untilMinute });
}

export function portugueseCartazInspectionStatus(
  state,
  { npcShipId, simMinute, latitudeDeg, longitudeDeg }
) {
  assertGameState(state);
  assertSimulationMinute(simMinute);
  if (typeof npcShipId !== "string" || npcShipId === "") {
    throw new Error("Cartaz inspection requires an NPC ship id");
  }
  const traderFactionId = state.playerCharacter?.nationalityId || NEUTRAL_FACTION_ID;
  const memory = state.relations.portugueseCartaz;
  const relation = diplomacyBetweenForState(state, traderFactionId, PORTUGUESE_FACTION_ID);
  const required = portugueseCartazRequired({ traderFactionId, latitudeDeg, longitudeDeg });
  const valid = traderFactionId === PORTUGUESE_FACTION_ID || memory.untilMinute > simMinute ||
    memory.graceUntilMinute > simMinute;
  const recentlyInspected = (memory.inspectedShipUntilMinute[npcShipId] || 0) > simMinute;
  const permitFee = portugueseCartazFee({
    traderFactionId,
    relation,
    cargoCapacity: state.cargoCapacity
  });
  const neutralPermitFee = portugueseCartazFee({
    traderFactionId,
    relation: DIPLOMACY_NEUTRAL,
    cargoCapacity: state.cargoCapacity
  });
  const controlledCargo = portugueseControlledCargo(state.cargo);
  return Object.freeze({
    required,
    valid,
    recentlyInspected,
    relation,
    permitFee,
    fine: portugueseCartazFine(neutralPermitFee),
    canAffordPermit: permitFee !== null && state.doubloons >= permitFee,
    canAffordFine: state.doubloons >= portugueseCartazFine(neutralPermitFee),
    controlledCargo: Object.freeze(controlledCargo),
    controlledCargoQuantity: Object.values(controlledCargo).reduce((sum, value) => sum + value, 0)
  });
}

export function recordPortugueseCartazInspection(state, npcShipId, simMinute) {
  assertGameState(state);
  assertSimulationMinute(simMinute);
  if (typeof npcShipId !== "string" || npcShipId === "") {
    throw new Error("Cartaz inspection requires an NPC ship id");
  }
  state.relations.portugueseCartaz.inspectedShipUntilMinute[npcShipId] = simMinute +
    PORTUGUESE_CARTAZ_INSPECTION_COOLDOWN_DAYS * 24 * 60;
}

export function buyPortugueseCartazFromInspector(state, npcShipId, simMinute, fee) {
  assertGameState(state);
  assertSimulationMinute(simMinute);
  if (!Number.isInteger(fee) || fee <= 0) throw new Error(`Invalid inspector cartaz fee: ${fee}`);
  if (state.doubloons < fee) throw new Error(`Not enough doubloons for a ${fee} db cartaz`);
  state.doubloons -= fee;
  state.relations.portugueseCartaz.issuedMinute = simMinute;
  state.relations.portugueseCartaz.untilMinute = simMinute +
    PORTUGUESE_CARTAZ_DURATION_DAYS * 24 * 60;
  state.relations.portugueseCartaz.issuedAtPortId = `inspection:${npcShipId}`;
  state.relations.portugueseCartaz.graceUntilMinute = 0;
  recordDecision(state, "trade.portuguese-cartaz.inspection-purchase", 1);
  return Object.freeze({ fee, untilMinute: state.relations.portugueseCartaz.untilMinute });
}

export function payPortugueseCartazFine(state, npcShipId, simMinute, fine) {
  assertGameState(state);
  assertSimulationMinute(simMinute);
  if (!Number.isInteger(fine) || fine <= 0) throw new Error(`Invalid cartaz fine: ${fine}`);
  if (state.doubloons < fine) throw new Error(`Not enough doubloons to pay a ${fine} db fine`);
  state.doubloons -= fine;
  state.relations.portugueseCartaz.graceUntilMinute = simMinute + 7 * 24 * 60;
  recordDecision(state, "trade.portuguese-cartaz.fine", 1);
  recordPortugueseCartazInspection(state, npcShipId, simMinute);
  return Object.freeze({ fine, graceUntilMinute: state.relations.portugueseCartaz.graceUntilMinute });
}

export function surrenderPortugueseControlledCargo(state, npcShipId, simMinute) {
  assertGameState(state);
  assertSimulationMinute(simMinute);
  const cargo = portugueseControlledCargo(state.cargo);
  const removed = [];
  for (const goodId of PORTUGUESE_CROWN_SPICE_GOOD_IDS) {
    const quantity = cargo[goodId] || 0;
    if (quantity <= 0) continue;
    trimCargoQuantity(state, goodId, 0);
    removed.push(Object.freeze({ goodId, quantity }));
  }
  if (removed.length === 0) throw new Error("No controlled spice cargo to surrender");
  state.relations.portugueseCartaz.graceUntilMinute = simMinute + 7 * 24 * 60;
  recordDecision(
    state,
    "trade.portuguese-cartaz.contraband-surrendered",
    removed.reduce((sum, row) => sum + row.quantity, 0)
  );
  recordPortugueseCartazInspection(state, npcShipId, simMinute);
  return Object.freeze(removed);
}

export function receiveFishCatch(state, catchResult, context = {}) {
  assertGameState(state);
  if (!catchResult || typeof catchResult !== "object") throw new Error("Fish catch requires a catch result");
  const requestedQuantity = catchResult.quantity;
  assertQuantity(requestedQuantity, "fish catch quantity");
  const good = tradeGoodById(FISH_CARGO_GOOD_ID);
  const quantity = Math.min(requestedQuantity, fishCatchCargoCapacity(state));
  if (quantity <= 0) throw new Error(`Not enough cargo space to stow ${requestedQuantity} ${good.label}`);
  state.cargo[good.id] = (state.cargo[good.id] || 0) + quantity;
  assertPlayerCargoWithinCapacity(state);
  state.accounts.cargoCostBasis[good.id] = state.accounts.cargoCostBasis[good.id] || 0;
  const speciesLabel = typeof catchResult.speciesLabel === "string" && catchResult.speciesLabel.trim() !== ""
    ? catchResult.speciesLabel
    : good.label;
  recordDecision(state, `fish.catch.${catchResult.stockKey || "unknown"}`, quantity);
  recordLedgerEntry(state, null, context, {
    kind: "catch",
    description: `Catch ${speciesLabel} x${quantity}`,
    goodId: good.id,
    quantity,
    amount: 0,
    costBasis: 0,
    pnl: null
  });
  return { good, quantity, speciesLabel };
}

export function receiveWhaleBlubber(state, requestedQuantity, context = {}) {
  assertGameState(state);
  assertQuantity(requestedQuantity, "whale blubber yield");
  return receiveZeroCostCargo(state, WHALE_BLUBBER_GOOD_ID, requestedQuantity, context, {
    kind: "catch",
    description: (quantity) => `Process ${context.speciesLabel || "whale"} blubber x${quantity}`
  });
}

export function receiveScavengedTradeGood(state, goodId, requestedQuantity, sourceLabel, context = {}) {
  assertGameState(state);
  assertQuantity(requestedQuantity, `${goodId} scavenge yield`);
  if (typeof sourceLabel !== "string" || sourceLabel.trim() === "") {
    throw new Error("Scavenged cargo requires a source label");
  }
  return receiveZeroCostCargo(state, goodId, requestedQuantity, context, {
    kind: "catch",
    description: (quantity, good) => `Scavenge ${sourceLabel}: ${good.label} x${quantity}`,
    decisionKey: `scavenge.good.${goodId}`
  });
}

function receiveZeroCostCargo(state, goodId, requestedQuantity, context, options) {
  const good = tradeGoodById(goodId);
  if (!options || typeof options.kind !== "string" || typeof options.description !== "function") {
    throw new Error(`Zero-cost ${good.label} cargo requires ledger options`);
  }
  const quantity = Math.min(requestedQuantity, cargoQuantityCapacityForGood(state, good.id));
  if (quantity <= 0) return { good, quantity: 0 };
  state.cargo[good.id] = (state.cargo[good.id] || 0) + quantity;
  state.accounts.cargoCostBasis[good.id] = state.accounts.cargoCostBasis[good.id] || 0;
  if (options.decisionKey) recordDecision(state, options.decisionKey, quantity);
  recordLedgerEntry(state, null, context, {
    kind: options.kind,
    description: options.description(quantity, good),
    goodId: good.id,
    quantity,
    amount: 0,
    costBasis: 0,
    pnl: null
  });
  return { good, quantity };
}

export function visitPort(state, city, simMinute, { arrivedDrunk = false } = {}) {
  assertGameState(state);
  assertSimulationMinute(simMinute);
  if (typeof arrivedDrunk !== "boolean") {
    throw new Error(`Invalid drunk port arrival flag: ${arrivedDrunk}`);
  }
  const memory = portMemory(state, city);
  memory.visits += 1;
  if (arrivedDrunk) {
    memory.drunkArrivals += 1;
    memory.lastDrunkVisit = memory.visits;
    memory.lastDrunkArrivalMinute = simMinute;
  }
  const playerFactionId = state.playerCharacter?.nationalityId || NEUTRAL_FACTION_ID;
  return recordDiplomaticPortCall(
    state.relations.diplomacy,
    playerFactionId,
    city.factionId || NEUTRAL_FACTION_ID,
    simMinute
  );
}

export function portMemory(state, city) {
  assertGameState(state);
  return requiredPortMemory(state, city);
}

function requiredPortMemory(state, city) {
  const key = city.portId || cityKey(city);
  let memory = state.memory.visitedPorts[key];
  if (!memory) {
    memory = createPortVisitMemory();
    state.memory.visitedPorts[key] = memory;
  }
  return memory;
}

export function deliveryQuestForCity(city, portCities, {
  offerPeriod = 0,
  onboardingIndex = null
} = {}) {
  if (!Number.isInteger(offerPeriod) || offerPeriod < 0) {
    throw new Error(`Invalid delivery offer period: ${offerPeriod}`);
  }
  if (onboardingIndex !== null &&
      (!Number.isInteger(onboardingIndex) || onboardingIndex < 0 ||
       onboardingIndex >= ONBOARDING_DELIVERY_COUNT)) {
    throw new Error(`Invalid onboarding delivery index: ${onboardingIndex}`);
  }
  const factionId = deliveryFactionId(city);
  const regionKey = deliveryRegionKey(city);
  if (!factionId || !regionKey) return null;
  const candidates = portCities
    .filter((port) => (
      port.tileId !== city.tileId &&
      port.factionId === factionId &&
      deliveryRegionKey(port) === regionKey
    ))
    .sort((a, b) => cityKey(a).localeCompare(cityKey(b)));
  if (candidates.length === 0) return null;
  const onboarding = onboardingIndex !== null;
  const destination = onboarding
    ? [...candidates].sort((a, b) => (
        greatCircleDistanceKm(city, a) - greatCircleDistanceKm(city, b) ||
        cityKey(a).localeCompare(cityKey(b))
      ))[0]
    : candidates[hashString32(`delivery|${cityKey(city)}|${offerPeriod}`) % candidates.length];
  const scenario = onboarding ? ONBOARDING_DELIVERY_SCENARIOS[onboardingIndex] : null;
  const reward = 65 + (hashString32(
    `reward|${cityKey(city)}|${cityKey(destination)}|${offerPeriod}`
  ) % 96) + (onboarding ? 50 : 0);
  const distanceKm = Math.round(greatCircleDistanceKm(city, destination));
  return {
    id: `delivery-${city.tileId}-${destination.tileId}-${offerPeriod}`,
    kind: "delivery",
    onboarding,
    onboardingIndex,
    scenarioId: scenario?.id || "sealed-packet",
    cargoLabel: scenario?.cargoLabel || "sealed packet",
    offerText: scenario
      ? `${scenario.offer} Take the ${scenario.cargoLabel} to ${cityLabel(destination)}, ` +
        `${distanceKm.toLocaleString("en-US")} km away. Your chart will mark the way. ` +
        `Payment is ${reward} db.`
      : null,
    completionText: scenario?.completion || null,
    offerPeriod,
    originKey: cityKey(city),
    originTileId: city.tileId,
    originName: cityLabel(city),
    originCountry: city.country || "",
    factionId,
    regionKey,
    destinationKey: cityKey(destination),
    destinationTileId: destination.tileId,
    destinationName: cityLabel(destination),
    destinationCountry: destination.country || "",
    distanceKm,
    reward
  };
}

export function deliveryOfferForCity(state, city, portCities, context = {}) {
  assertGameState(state);
  const quests = questMemory(state);
  const existing = pendingDeliveryOfferForCity(state, city);
  if (existing || quests.active) return existing;

  const offerPeriod = deliveryRollPeriod(context.simMinute);
  const onboardingIndex = quests.onboardingDeliveriesCompleted < ONBOARDING_DELIVERY_COUNT
    ? quests.onboardingDeliveriesCompleted
    : null;
  const candidate = deliveryQuestForCity(city, portCities, { offerPeriod, onboardingIndex });
  if (!candidate) return null;

  const rollKey = `${candidate.originKey}|${offerPeriod}`;
  if (quests.deliveryRolls[rollKey]) return null;
  quests.deliveryRolls[rollKey] = true;
  pruneQuestRolls(quests.deliveryRolls);

  const spawnChance = context.spawnChance === undefined && candidate.onboarding
    ? 1
    : deliverySpawnChance(context.spawnChance);
  const identityKey = state.playerCharacter?.id || state.playerCharacter?.name || "captain";
  if (spawnChance < 1 && seededFraction(`${identityKey}|${rollKey}|delivery`) >= spawnChance) {
    return null;
  }
  quests.deliveryOffers[candidate.originKey] = candidate;
  return candidate;
}

export function pendingDeliveryOfferForCity(state, city) {
  if (!state || !city) return null;
  const quests = questMemory(state);
  const originKey = cityKey(city);
  const offer = quests.deliveryOffers[originKey];
  if (!offer) return null;
  if (quests.completed[offer.id]) {
    delete quests.deliveryOffers[originKey];
    return null;
  }
  return offer;
}

export function reconcileQuestPortTiles(state, portCities) {
  assertGameState(state);
  if (!Array.isArray(portCities)) throw new Error("Quest port reconciliation requires a port list");
  const quests = questMemory(state);
  let updates = 0;

  const reconcile = (quest) => {
    if (!quest || typeof quest !== "object") return;
    updates += reconcileQuestEndpoint(quest, "origin", portCities);
    updates += reconcileQuestEndpoint(quest, "destination", portCities);
    if (isEnvoyQuest(quest)) updates += reconcileQuestEndpoint(quest, "target", portCities);
  };

  reconcile(quests.active);
  const deliveryOffers = {};
  for (const [storedKey, offer] of Object.entries(quests.deliveryOffers)) {
    reconcile(offer);
    deliveryOffers[offer?.originKey || storedKey] = offer;
  }
  quests.deliveryOffers = deliveryOffers;
  const offers = {};
  for (const [storedKey, offer] of Object.entries(quests.passengerOffers)) {
    reconcile(offer);
    offers[offer?.originKey || storedKey] = offer;
  }
  quests.passengerOffers = offers;
  return updates;
}

export function questStateForCity(state, city, portCities) {
  assertGameState(state);
  const quests = questMemory(state);
  const active = quests.active;
  if (active) {
    if (active.destinationTileId === city.tileId) return { kind: "ready-to-complete", quest: active };
    if (active.originTileId === city.tileId) return { kind: "in-progress-here", quest: active };
    return { kind: "busy", quest: active };
  }
  const offer = pendingDeliveryOfferForCity(state, city);
  return offer
    ? { kind: "available", quest: offer }
    : { kind: "unavailable", quest: null };
}

export function acceptQuest(state, quest) {
  assertGameState(state);
  const quests = questMemory(state);
  if (quests.active) throw new Error("Cannot accept a quest while another quest is active");
  if (quests.completed[quest.id]) throw new Error(`Quest already completed: ${quest.id}`);
  const passenger = quest.passenger ? {
    ...quest.passenger,
    skillIds: quest.passenger.skillIds || characterSkillIdsForIdentity(
      quest.passenger.id || quest.passenger.name || `quest-passenger|${quest.id}`,
      { traveler: true }
    )
  } : quest.passenger;
  quests.active = { ...quest, passenger };
  if ((quest.kind === "passenger" || isEnvoyQuest(quest)) && quest.originKey) {
    delete quests.passengerOffers[quest.originKey];
  }
  if (quest.kind === "delivery" && quest.originKey) delete quests.deliveryOffers[quest.originKey];
  recordDecision(state, `quest.accept.${quest.id}`, 1);
}

export function completeQuest(state, city, context = {}) {
  assertGameState(state);
  const quests = questMemory(state);
  const active = quests.active;
  if (!active) throw new Error("No active quest to complete");
  if (active.destinationTileId !== city.tileId) {
    throw new Error(`Quest destination is ${active.destinationName}, not ${cityLabel(city)}`);
  }
  if (isEnvoyQuest(active) && active.stage !== "return") {
    throw new Error(`Envoy must complete negotiations before returning home: ${active.id}`);
  }
  state.doubloons += active.reward;
  quests.completed[active.id] = true;
  quests.active = null;
  if (active.kind === "delivery" && active.onboarding === true) {
    quests.onboardingDeliveriesCompleted = Math.min(
      ONBOARDING_DELIVERY_COUNT,
      quests.onboardingDeliveriesCompleted + 1
    );
  }
  recordDecision(state, `quest.complete.${active.id}`, 1);
  if (active.kind === "delivery" && active.factionId) recordDeliveryForFaction(state, active.factionId);
  if (isEnvoyQuest(active)) {
    adjustFactionReputation(state, active.originFactionId, ENVOY_HOME_REPUTATION);
    recordDecision(state, `reputation.envoy.${active.originFactionId}`, 1);
  }
  recordLedgerEntry(state, city, context, {
    kind: "income",
    description: active.kind === "passenger"
      ? "Passenger fare"
      : isEnvoyQuest(active)
        ? "Diplomatic mission"
        : "Delivery reward",
    goodId: null,
    quantity: 1,
    amount: active.reward,
    costBasis: null,
    pnl: null
  });
  return active;
}

export function cityKey(city) {
  return `${city.displayCity || city.city}|${city.country}|${city.tileId}`;
}

export function cityLabel(city) {
  return city.portAlias || city.displayCity || city.city;
}

function createPlayerShipState(stats) {
  return {
    slug: stats.slug,
    loadoutId: null,
    loadoutTargets: null,
    crew: 0,
    crewCapacity: stats.crewCapacity,
    cannons: 0,
    cannonCapacity: stats.cannons,
    baseCargoCapacity: stats.cargoCapacity,
    mass: stats.mass,
    navalWeaponKind: stats.navalWeaponKind
  };
}

function createSurvivalState(startMinute, freshWaterCapacity = FRESH_WATER_CAPACITY, freshWater = freshWaterCapacity) {
  return {
    freshWater,
    freshWaterCapacity,
    foodRationDebt: 0,
    wineOnlyMinutes: 0,
    wineEmergencyActive: false,
    lastMinute: startMinute
  };
}

function restockLoadoutKind(state, plan, kind) {
  let spent = 0;
  let quantity = 0;
  if (kind === "crew") {
    while (state.ship.crew < plan.crew) {
      const nextCrew = state.ship.crew + 1;
      const space = crewHoldSpace(nextCrew) - crewHoldSpace(state.ship.crew);
      if (state.doubloons < CREW_HIRE_COST || cargoFree(state) < space) break;
      state.ship.crew = nextCrew;
      state.doubloons -= CREW_HIRE_COST;
      spent += CREW_HIRE_COST;
      quantity += 1;
    }
  } else if (kind === "cannons") {
    while (state.ship.cannons < plan.cannons) {
      if (state.doubloons < CANNON_RESTOCK_COST || cargoFree(state) < 1) break;
      state.ship.cannons += 1;
      state.doubloons -= CANNON_RESTOCK_COST;
      spent += CANNON_RESTOCK_COST;
      quantity += 1;
    }
  } else {
    throw new Error(`Unknown loadout restock kind: ${kind}`);
  }
  return { spent, quantity };
}

function restockBalancedProvisions(state, plan, hardtack) {
  if (hardtack.unitSize !== 1) {
    throw new Error(`Ship loadouts require one-slot hardtack units, received ${hardtack.unitSize}`);
  }
  const targets = loadoutRestockProvisionTargets(state, plan);
  let spent = 0;
  const additions = { food: 0, water: 0 };
  const missingFoodRations = Math.max(0, Math.round(
    (targets.food - provisionFoodUnits(state)) * FOOD_RATIONS_PER_HOLD_UNIT / hardtack.unitSize
  ));
  const affordableRations = affordableHardtackRations(hardtack, missingFoodRations, state.doubloons);
  const freeFoodRations = Math.floor(
    (provisionCargoFree(state, "food") + 1e-8) * FOOD_RATIONS_PER_HOLD_UNIT / hardtack.unitSize
  );
  const blockedRations = Math.max(0, affordableRations - freeFoodRations);
  const excessWater = Math.max(0, freshWaterHoldUnits(state.survival.freshWater) - targets.water);
  const waterToDump = Math.min(
    excessWater,
    Math.ceil(blockedRations * hardtack.unitSize / FOOD_RATIONS_PER_HOLD_UNIT)
  );
  if (waterToDump > 0) {
    state.survival.freshWater = Math.min(
      state.survival.freshWater,
      freshWaterHoldUnits(state.survival.freshWater) - waterToDump
    );
  }

  const stowableRations = Math.floor(
    (provisionCargoFree(state, "food") + 1e-8) * FOOD_RATIONS_PER_HOLD_UNIT / hardtack.unitSize
  );
  const foodRations = Math.min(affordableRations, stowableRations);
  if (foodRations > 0) {
    const price = hardtackRationPrice(hardtack, foodRations);
    addFoodRations(state, hardtack.id, foodRations, price);
    state.doubloons -= price;
    spent += price;
    additions.food += foodRations * hardtack.unitSize / FOOD_RATIONS_PER_HOLD_UNIT;
  }

  while (state.survival.freshWater < targets.water && state.doubloons >= WATER_RESTOCK_COST) {
    const added = Math.min(1, targets.water - state.survival.freshWater);
    const filled = stowFreshWater(state, added);
    if (filled <= 0) break;
    state.doubloons -= WATER_RESTOCK_COST;
    spent += WATER_RESTOCK_COST;
    additions.water += filled;
  }
  return { spent, ...additions };
}

function trimCargoQuantity(state, goodId, maximumQuantity) {
  const held = state.cargo[goodId] || 0;
  if (held <= maximumQuantity) return 0;
  const removed = held - maximumQuantity;
  const basis = cargoCostBasis(state, goodId);
  if (maximumQuantity > 0) {
    state.cargo[goodId] = maximumQuantity;
    if (basis.known) {
      state.accounts.cargoCostBasis[goodId] = roundLedgerMoney(basis.total * maximumQuantity / held);
    }
  } else {
    delete state.cargo[goodId];
    delete state.accounts.cargoCostBasis[goodId];
  }
  return removed;
}

function shipStoresSnapshot(state) {
  return {
    crew: state.ship?.crew || 0,
    cannons: state.ship?.cannons || 0,
    food: provisionFoodUnits(state),
    water: state.survival.freshWater
  };
}

function loadoutShortfalls(state, plan) {
  const targets = loadoutRestockProvisionTargets(state, plan);
  return {
    crew: Math.max(0, plan.crew - state.ship.crew),
    cannons: Math.max(0, plan.cannons - state.ship.cannons),
    food: Math.max(0, targets.food - provisionFoodUnits(state)),
    water: Math.max(0, targets.water - state.survival.freshWater)
  };
}

function loadoutRestockProvisionTargets(state, plan) {
  const allocation = loadoutProvisionAllocation(state, plan);
  const protectedFood = Math.max(
    allocation.foodUnits,
    Math.min(provisionFoodUnits(state), allocation.availableSpace)
  );
  return {
    food: protectedFood,
    water: allocation.waterUnits
  };
}

function provisionCargoFree(state, kind) {
  if (kind !== "food" && kind !== "water") {
    throw new Error(`Unknown provision cargo kind: ${kind}`);
  }
  const reservation = loadoutProvisionReservation(state);
  const reserved = kind === "food" ? reservation.missingFood : reservation.missingWater;
  return Math.max(0, cargoFree(state) + reserved);
}

function stowFreshWater(state, requested) {
  if (!Number.isFinite(requested) || requested < 0) {
    throw new Error(`Invalid fresh water storage request: ${requested}`);
  }
  if (requested <= 0) return 0;
  const current = state.survival.freshWater;
  const missing = Math.max(0, state.survival.freshWaterCapacity - current);
  if (missing <= 0) return 0;
  const available = state.ship
    ? Math.max(
      0,
      freshWaterHoldUnits(current) - current +
        wholeCargoUnitsAvailable(provisionCargoFree(state, "water"))
    )
    : missing;
  const filled = Math.min(requested, missing, available);
  if (filled <= 0) return 0;
  state.survival.freshWater = normalizeFreshWater(current + filled);
  assertPlayerCargoWithinCapacity(state);
  return filled;
}

function freshWaterHoldUnits(quantity) {
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new Error(`Invalid fresh water hold quantity: ${quantity}`);
  }
  return Math.max(0, Math.ceil(quantity - 1e-8));
}

function normalizeFreshWater(quantity) {
  const nearest = Math.round(quantity);
  return Math.abs(quantity - nearest) <= 1e-8 ? nearest : quantity;
}

function loadoutProvisionReservation(state) {
  const plan = state.ship?.loadoutTargets;
  if (!plan) return { missingFood: 0, missingWater: 0 };
  const allocation = loadoutProvisionAllocation(state, plan);
  return {
    missingFood: Math.max(0, allocation.foodUnits - provisionFoodUnits(state)),
    missingWater: Math.max(0, allocation.waterUnits - freshWaterHoldUnits(state.survival.freshWater))
  };
}

function loadoutProvisionAllocation(state, plan) {
  for (const key of ["foodUnits", "waterUnits", "storesSpace"]) {
    if (!Number.isInteger(plan?.[key]) || plan[key] < 0) {
      throw new Error(`Invalid ship loadout provision target ${key}: ${plan?.[key]}`);
    }
  }
  if (plan.storesSpace !== plan.foodUnits + plan.waterUnits) {
    throw new Error("Ship loadout provision targets do not match their reserved store space");
  }
  const actualProvisionSpace = provisionFoodUnits(state) + freshWaterHoldUnits(state.survival.freshWater);
  const provisionSpaceAlreadyAboard = Math.min(actualProvisionSpace, plan.storesSpace);
  const nonProvisionSpace = cargoUsed(state) - provisionSpaceAlreadyAboard;
  const availableSpaceRaw = Math.max(
    0,
    Math.min(plan.storesSpace, state.cargoCapacity - nonProvisionSpace)
  );
  const availableSpace = wholeCargoUnitsAvailable(availableSpaceRaw);
  return {
    ...balancedProvisionTargets(plan.foodUnits, plan.waterUnits, availableSpace),
    availableSpace
  };
}

function provisionFoodUnits(state) {
  return edibleCargoRows(state).reduce((total, row) => total + row.good.unitSize * row.quantity, 0);
}

function addFoodRations(state, goodId, rations, costBasis) {
  const good = goodById(goodId);
  if (good.category !== "food") throw new Error(`${good.label} cannot be stowed as food rations`);
  if (!Number.isInteger(rations) || rations <= 0) throw new Error(`Invalid ${good.id} ration count: ${rations}`);
  if (!Number.isFinite(costBasis) || costBasis < 0) throw new Error(`Invalid ${good.id} ration cost: ${costBasis}`);
  const cargoQuantity = rations / FOOD_RATIONS_PER_HOLD_UNIT;
  state.cargo[good.id] = normalizeFoodCargoQuantity((state.cargo[good.id] || 0) + cargoQuantity);
  state.accounts.cargoCostBasis[good.id] = roundLedgerMoney(
    (state.accounts.cargoCostBasis[good.id] || 0) + costBasis
  );
  return cargoQuantity;
}

function hardtackRationPrice(good, rations) {
  if (good.id !== HARDTACK_GOOD_ID) throw new Error(`Cannot price ${good.id} as hardtack`);
  if (!Number.isInteger(rations) || rations <= 0) throw new Error(`Invalid hardtack ration count: ${rations}`);
  return Math.max(1, Math.round(good.basePrice * rations / FOOD_RATIONS_PER_HOLD_UNIT));
}

function affordableHardtackRations(good, requestedRations, budget) {
  if (!Number.isInteger(requestedRations) || requestedRations < 0) {
    throw new Error(`Invalid requested hardtack rations: ${requestedRations}`);
  }
  if (!Number.isInteger(budget) || budget < 0) throw new Error(`Invalid hardtack budget: ${budget}`);
  let low = 0;
  let high = requestedRations;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (hardtackRationPrice(good, middle) <= budget) low = middle;
    else high = middle - 1;
  }
  return low;
}

export function foodRationsForCargoQuantity(quantity) {
  if (!Number.isFinite(quantity) || quantity < 0) throw new Error(`Invalid food cargo quantity: ${quantity}`);
  const rations = Math.round(quantity * FOOD_RATIONS_PER_HOLD_UNIT);
  if (Math.abs(quantity - rations / FOOD_RATIONS_PER_HOLD_UNIT) > 1e-8) {
    throw new Error(`Food cargo quantity is not ration-aligned: ${quantity}`);
  }
  return rations;
}

function normalizeFoodCargoQuantity(quantity) {
  const rations = Math.max(0, Math.round(quantity * FOOD_RATIONS_PER_HOLD_UNIT));
  return rations / FOOD_RATIONS_PER_HOLD_UNIT;
}

function clearMissedFoodRationDebt(state) {
  const remainder = foodRationDebtRemainder(state.survival.foodRationDebt);
  if (remainder === state.survival.foodRationDebt) return false;
  state.survival.foodRationDebt = remainder;
  return true;
}

function foodRationDebtRemainder(debt) {
  if (!Number.isFinite(debt) || debt < 0) throw new Error(`Invalid food ration debt: ${debt}`);
  return debt - Math.floor(debt);
}

function requirePlayerShipState(state, stats) {
  if (!state.ship) throw new Error("Ship loadouts require player ship state");
  const baseStats = shipStatsForSlug(state.ship.slug);
  const effectiveStats = effectivePlayerShipStats(state, baseStats);
  const suppliedCapacityMatches =
    stats?.cargoCapacity === baseStats.cargoCapacity ||
    stats?.cargoCapacity === effectiveStats.cargoCapacity;
  if (!stats || stats.slug !== baseStats.slug || !suppliedCapacityMatches ||
      state.ship.baseCargoCapacity !== baseStats.cargoCapacity ||
      effectiveStats.cargoCapacity !== state.cargoCapacity) {
    throw new Error("Ship loadout stats do not match game state");
  }
  if (stats.crewCapacity !== baseStats.crewCapacity || stats.cannons !== baseStats.cannons ||
      state.ship.crewCapacity !== baseStats.crewCapacity || state.ship.cannonCapacity !== baseStats.cannons) {
    throw new Error("Ship loadout capacities do not match game state");
  }
  return effectiveStats;
}

function edibleCargoRows(state) {
  return TRADE_GOODS
    .filter((good) => good.category === "food")
    .map((good) => ({
      good,
      quantity: state.cargo[good.id] || 0
    }))
    .filter((row) => row.quantity > 0);
}

function openFoodRations(quantity) {
  return foodRationsForCargoQuantity(quantity) % FOOD_RATIONS_PER_HOLD_UNIT;
}

function compareFoodConsumptionCandidates(a, b) {
  const aOpenRations = openFoodRations(a.quantity);
  const bOpenRations = openFoodRations(b.quantity);
  const aIsOpen = aOpenRations > 0;
  const bIsOpen = bOpenRations > 0;
  if (aIsOpen !== bIsOpen) return aIsOpen ? -1 : 1;
  if (aIsOpen && aOpenRations !== bOpenRations) return aOpenRations - bOpenRations;
  return (
    a.good.basePrice - b.good.basePrice ||
    a.good.label.localeCompare(b.good.label)
  );
}

function consumeCheapestFoodRation(state) {
  const candidates = edibleCargoRows(state)
    .sort(compareFoodConsumptionCandidates);
  const row = candidates[0];
  if (!row) return null;

  const held = state.cargo[row.good.id] || 0;
  const basis = cargoCostBasis(state, row.good.id);
  const rationQuantity = 1 / FOOD_RATIONS_PER_HOLD_UNIT;
  const consumedCost = basis.known && held > 0 ? basis.total * rationQuantity / held : 0;
  const remaining = normalizeFoodCargoQuantity(held - rationQuantity);
  if (remaining > 0) {
    state.cargo[row.good.id] = remaining;
    if (basis.known) {
      state.accounts.cargoCostBasis[row.good.id] = roundLedgerMoney(basis.total - consumedCost);
    }
  } else {
    delete state.cargo[row.good.id];
    delete state.accounts.cargoCostBasis[row.good.id];
  }
  recordDecision(state, `provisions.consume.${row.good.id}`, 1);
  return {
    goodId: row.good.id,
    label: row.good.label,
    rations: 1,
    costBasis: consumedCost
  };
}

export function loseFoodRations(state, requestedRations) {
  assertGameState(state);
  if (!Number.isInteger(requestedRations) || requestedRations < 0) {
    throw new Error(`Invalid lost food ration count: ${requestedRations}`);
  }
  let lost = 0;
  while (lost < requestedRations && consumeCheapestFoodRation(state)) lost += 1;
  return lost;
}

function consumeDrinkSupply(state, waterUse, { allowCargoReserve = true, allowWine = false } = {}) {
  let remainingUse = Math.max(0, waterUse);
  let waterConsumed = 0;
  let cargoConsumed = 0;
  let wineConsumed = 0;
  let changed = false;

  const caskUse = Math.min(state.survival.freshWater, remainingUse);
  if (caskUse > 0) {
    state.survival.freshWater -= caskUse;
    remainingUse -= caskUse;
    waterConsumed += caskUse;
    changed = true;
  }

  while (allowCargoReserve && remainingUse > 1e-8 && (state.cargo[FRESH_WATER_GOOD_ID] || 0) > 0) {
    const unit = consumeCargoUnit(state, FRESH_WATER_GOOD_ID);
    if (!unit) break;
    cargoConsumed += 1;
    const unitWater = FRESH_WATER_USE_PER_DAY * FRESH_WATER_CARGO_DAYS;
    const unitUse = Math.min(unitWater, remainingUse);
    waterConsumed += unitUse;
    remainingUse -= unitUse;
    const leftover = unitWater - unitUse;
    if (leftover > 0) {
      state.survival.freshWater = Math.min(state.survival.freshWaterCapacity, state.survival.freshWater + leftover);
    }
    changed = true;
  }

  if (allowWine && remainingUse > 1e-8 && (state.cargo[WINE_GOOD_ID] || 0) > 0) {
    const held = state.cargo[WINE_GOOD_ID];
    const unitUse = Math.min(held, remainingUse);
    consumeDrinkQuantity(state, WINE_GOOD_ID, unitUse);
    wineConsumed += unitUse;
    remainingUse -= unitUse;
    changed = true;
  }

  return {
    changed,
    waterConsumed,
    cargoConsumed,
    wineConsumed,
    dehydrated: remainingUse > 1e-8
  };
}

function consumeDrinkQuantity(state, goodId, quantity) {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error(`Invalid drink quantity for ${goodId}: ${quantity}`);
  }
  const held = state.cargo[goodId] || 0;
  if (quantity > held + 1e-8) throw new Error(`Cannot drink ${quantity} ${goodId}; hold has ${held}`);
  const basis = cargoCostBasis(state, goodId);
  const consumedCost = basis.known ? basis.total * quantity / held : 0;
  const remaining = Math.max(0, held - quantity);
  if (remaining > 1e-8) {
    state.cargo[goodId] = remaining;
    if (basis.known) {
      state.accounts.cargoCostBasis[goodId] = roundLedgerMoney(basis.total - consumedCost);
    }
  } else {
    delete state.cargo[goodId];
    delete state.accounts.cargoCostBasis[goodId];
  }
  recordDecision(state, `provisions.consume.${goodId}`, quantity);
  return { goodId, quantity, costBasis: consumedCost };
}

function updateWineOnlySurvivalState(state, elapsedMinutes, recovered) {
  if (!Number.isFinite(elapsedMinutes) || elapsedMinutes < 0) {
    throw new Error(`Invalid wine-only survival time: ${elapsedMinutes}`);
  }
  if (typeof recovered !== "boolean") throw new Error(`Invalid wine emergency recovery state: ${recovered}`);
  if (recovered) resetWineOnlySurvivalState(state);
  if (elapsedMinutes <= 1e-8) {
    return { started: false, daysElapsed: 0 };
  }
  const previous = state.survival.wineOnlyMinutes;
  const current = previous + elapsedMinutes;
  const started = !state.survival.wineEmergencyActive;
  state.survival.wineEmergencyActive = true;
  state.survival.wineOnlyMinutes = current;
  return {
    started,
    daysElapsed: Math.floor(current / MINUTES_PER_DAY) - Math.floor(previous / MINUTES_PER_DAY)
  };
}

function resetWineOnlySurvivalState(state) {
  const changed = state.survival.wineOnlyMinutes !== 0 || state.survival.wineEmergencyActive;
  state.survival.wineOnlyMinutes = 0;
  state.survival.wineEmergencyActive = false;
  return changed;
}

function consumeCargoUnit(state, goodId) {
  const held = state.cargo[goodId] || 0;
  if (held <= 0) return null;
  const basis = cargoCostBasis(state, goodId);
  const consumedCost = basis.known ? basis.total / held : 0;
  const remaining = held - 1;
  if (remaining > 0) {
    state.cargo[goodId] = remaining;
    if (basis.known) {
      state.accounts.cargoCostBasis[goodId] = roundLedgerMoney(basis.total - consumedCost);
    }
  } else {
    delete state.cargo[goodId];
    delete state.accounts.cargoCostBasis[goodId];
  }
  recordDecision(state, `provisions.consume.${goodId}`, 1);
  return { goodId, costBasis: consumedCost };
}

function marketRow(economy, city, goodId) {
  tradeGoodById(goodId);
  const row = portMarket(economy, city).find((item) => item.good.id === goodId);
  if (!row) throw new Error(`${cityLabel(city)} does not trade ${goodId}`);
  return row;
}

function initialFactionReputation(playerFactionId) {
  const homeFactionId = playerFactionId === null ? null : assertFactionId(playerFactionId);
  return Object.fromEntries(FACTIONS.map((faction) => {
    if (faction.id === PIRATE_FACTION_ID) return [faction.id, PIRATE_START_REPUTATION];
    if (homeFactionId === null) return [faction.id, 0];
    if (faction.id === homeFactionId) return [faction.id, HOME_FACTION_START_REPUTATION];
    if (diplomacyBetween(homeFactionId, faction.id) === DIPLOMACY_WAR) {
      return [faction.id, ENEMY_FACTION_START_REPUTATION];
    }
    if (diplomacyBetween(homeFactionId, faction.id) === DIPLOMACY_HOSTILE) {
      return [faction.id, ENEMY_FACTION_START_REPUTATION / 2];
    }
    return [faction.id, 0];
  }));
}

function tradeReputationFactionId(city) {
  if (!city || !city.factionId) return null;
  const factionId = assertFactionId(city.factionId);
  if (factionId === NEUTRAL_FACTION_ID || factionId === PIRATE_FACTION_ID) return null;
  return factionId;
}

function deliveryFactionId(city) {
  if (!city || !city.factionId) return null;
  const factionId = assertFactionId(city.factionId);
  if (factionId === NEUTRAL_FACTION_ID || factionId === PIRATE_FACTION_ID) return null;
  return factionId;
}

function reconcileQuestEndpoint(quest, endpoint, portCities) {
  const tileField = `${endpoint}TileId`;
  const nameField = `${endpoint}Name`;
  const countryField = `${endpoint}Country`;
  const keyField = `${endpoint}Key`;
  const name = quest[nameField];
  if (typeof name !== "string" || name === "") return 0;

  const current = portCities.find((port) => (
    port.tileId === quest[tileField] && cityLabel(port) === name
  ));
  if (current) {
    updateQuestEndpointIdentity(quest, endpoint, current);
    return 0;
  }

  const keyCountry = quest[keyField]?.split("|")[1] || "";
  const country = quest[countryField] || keyCountry;
  let candidates = portCities.filter((port) => cityLabel(port) === name);
  if (country) candidates = candidates.filter((port) => port.country === country);
  if (quest.kind === "delivery" && quest.factionId) {
    candidates = candidates.filter((port) => port.factionId === quest.factionId);
  }
  if (quest.kind === "delivery" && quest.regionKey) {
    candidates = candidates.filter((port) => deliveryRegionKey(port) === quest.regionKey);
  }
  if (candidates.length !== 1) return 0;
  updateQuestEndpointIdentity(quest, endpoint, candidates[0]);
  return 1;
}

function updateQuestEndpointIdentity(quest, endpoint, port) {
  quest[`${endpoint}TileId`] = port.tileId;
  quest[`${endpoint}Name`] = cityLabel(port);
  quest[`${endpoint}Country`] = port.country || "";
  quest[`${endpoint}Key`] = cityKey(port);
}

function deliveryRegionKey(city) {
  return typeof city?.cityType === "string" && city.cityType.trim() !== "" ? city.cityType : null;
}

function letterOfMarqueFactionId(city) {
  if (!city || typeof city !== "object") return null;
  const factionId = city.capitalOfFactionId || (city.isFactionCapital ? city.factionId : null);
  if (!factionId) return null;
  const id = assertFactionId(factionId);
  if (id === NEUTRAL_FACTION_ID || id === PIRATE_FACTION_ID) return null;
  return id;
}

function currentSovereignCapitalFactionId(city) {
  if (!city || typeof city !== "object" || city.isFactionCapital !== true) return null;
  if (!city.capitalOfFactionId || city.capitalOfFactionId !== city.factionId) return null;
  const id = assertFactionId(city.factionId);
  if (id === NEUTRAL_FACTION_ID || id === PIRATE_FACTION_ID) return null;
  return id;
}

function goodById(goodId) {
  return tradeGoodById(goodId);
}

function recordDecision(state, key, amount) {
  state.memory.decisions[key] = (state.memory.decisions[key] || 0) + amount;
}

function emergencyShipAidKey(npcShipId) {
  return `ship.aid.${npcShipId}`;
}

function assertNpcShipId(npcShipId) {
  if (typeof npcShipId !== "string" || npcShipId.trim() === "") {
    throw new Error(`Invalid emergency-aid ship id: ${npcShipId}`);
  }
}

function recordLedgerEntry(state, city, context, entry) {
  const simMinute = context.simMinute ?? null;
  if (simMinute !== null) assertSimulationMinute(simMinute);
  state.accounts.ledger.push({
    id: state.accounts.nextEntryId++,
    kind: entry.kind,
    simMinute,
    location: city ? cityLabel(city) : "Aboard",
    country: city?.country || "",
    description: entry.description,
    goodId: entry.goodId,
    quantity: entry.quantity,
    amount: roundLedgerMoney(entry.amount),
    balance: state.doubloons,
    costBasis: entry.costBasis === null ? null : roundLedgerMoney(entry.costBasis),
    pnl: entry.pnl === null ? null : roundLedgerMoney(entry.pnl)
  });
  compactPlayerLedger(state);
}

function summarizeLedgerEntries(entries) {
  const metrics = entries.reduce((summary, entry) => {
    if (entry?.kind === "archive") return mergeLedgerMetrics(summary, ledgerArchiveMetrics(entry));
    if (!entry || entry.kind === "opening") return summary;
    summary.entryCount += 1;
    if (Number.isFinite(entry.amount) && entry.amount > 0) {
      summary.grossDoubloonsEarned += entry.amount;
    }
    if (entry.kind === "sell" && typeof entry.goodId === "string") {
      summary.soldGoodIds.add(entry.goodId);
    }
    if (entry.kind === "catch" && entry.goodId === FISH_CARGO_GOOD_ID && Number.isFinite(entry.quantity)) {
      summary.fishCaughtQuantity += entry.quantity;
    }
    if (entry.kind === "income" && entry.description === "Passenger fare") {
      summary.passengerDeliveries += 1;
    }
    if (entry.kind === "ship") summary.acquiredShips += 1;
    return summary;
  }, emptyLedgerMetrics());
  return finalizeLedgerMetrics(metrics);
}

function ledgerArchiveMetrics(entry) {
  if (!Number.isInteger(entry.archivedEntryCount) || entry.archivedEntryCount < 0) {
    throw new Error(`Invalid archived ledger entry count: ${entry.archivedEntryCount}`);
  }
  if (!Array.isArray(entry.archivedSoldGoodIds) ||
      entry.archivedSoldGoodIds.some((goodId) => typeof goodId !== "string" || goodId === "")) {
    throw new Error("Invalid archived ledger sold goods");
  }
  for (const key of [
    "archivedFishCaughtQuantity",
    "archivedPassengerDeliveries",
    "archivedAcquiredShips"
  ]) {
    if (!Number.isFinite(entry[key]) || entry[key] < 0) {
      throw new Error(`Invalid archived ledger metric ${key}: ${entry[key]}`);
    }
  }
  return {
    entryCount: entry.archivedEntryCount,
    grossDoubloonsEarned: Number.isFinite(entry.amount) && entry.amount > 0 ? entry.amount : 0,
    soldGoodIds: new Set(entry.archivedSoldGoodIds),
    fishCaughtQuantity: entry.archivedFishCaughtQuantity,
    passengerDeliveries: entry.archivedPassengerDeliveries,
    acquiredShips: entry.archivedAcquiredShips
  };
}

function emptyLedgerMetrics() {
  return {
    entryCount: 0,
    grossDoubloonsEarned: 0,
    soldGoodIds: new Set(),
    fishCaughtQuantity: 0,
    passengerDeliveries: 0,
    acquiredShips: 0
  };
}

function mergeLedgerMetrics(target, source) {
  target.entryCount += source.entryCount;
  target.grossDoubloonsEarned += source.grossDoubloonsEarned;
  for (const goodId of source.soldGoodIds) target.soldGoodIds.add(goodId);
  target.fishCaughtQuantity += source.fishCaughtQuantity;
  target.passengerDeliveries += source.passengerDeliveries;
  target.acquiredShips += source.acquiredShips;
  return target;
}

function finalizeLedgerMetrics(metrics) {
  return Object.freeze({
    ...metrics,
    soldGoodIds: Object.freeze([...metrics.soldGoodIds].sort())
  });
}

function roundLedgerMoney(value) {
  return Math.round(value * 10000) / 10000;
}

function fishingNetItemRow(state) {
  const net = fishingNetById(state.inventory.fishingNetId);
  return {
    id: SHIP_ITEM_FISHING_NET,
    label: net.label,
    detail: `Catch x${net.catchRateMultiplier.toFixed(2)}, max haul ${net.maxCatch}`,
    quantity: 1,
    netId: net.id
  };
}

function cannonEquipmentItemRow(state) {
  const equipment = cannonEquipmentById(state.inventory.cannonEquipmentId);
  return {
    id: SHIP_ITEM_CANNON_EQUIPMENT,
    label: equipment.label,
    detail: `Reload ${equipment.reloadSeconds.toFixed(2)}s, damage x${equipment.damageMultiplier.toFixed(2)}, range x${equipment.rangeMultiplier.toFixed(2)}`,
    quantity: 1,
    equipmentId: equipment.id
  };
}

function whaleHarpoonItemRow(state) {
  const harpoon = playerWhaleHarpoon(state);
  if (!harpoon) return { id: SHIP_ITEM_WHALE_HARPOON, label: "Whale harpoon", detail: "Not fitted", quantity: 0 };
  return {
    id: SHIP_ITEM_WHALE_HARPOON,
    label: harpoon.label,
    detail: `Accuracy ${Math.round(harpoon.accuracy * 100)}%, line break ${Math.round(harpoon.breakChance * 100)}%`,
    quantity: 1,
    harpoonId: harpoon.id
  };
}

function assertOptionalNavigationWaypoint(waypoint) {
  if (!waypoint || typeof waypoint !== "object" || Array.isArray(waypoint)) {
    throw new Error("Optional navigation waypoint must be an object");
  }
  if (typeof waypoint.id !== "string" || waypoint.id === "") {
    throw new Error("Optional navigation waypoint requires an id");
  }
  if (!Number.isInteger(waypoint.destinationTileId)) {
    throw new Error(`Invalid navigation waypoint tile id: ${waypoint.destinationTileId}`);
  }
  if (typeof waypoint.destinationName !== "string" || waypoint.destinationName.trim() === "") {
    throw new Error("Optional navigation waypoint requires a destination name");
  }
  if (typeof waypoint.reason !== "string" || waypoint.reason.trim() === "") {
    throw new Error("Optional navigation waypoint requires a reason");
  }
}

function assertGameState(state) {
  if (!state || typeof state !== "object") throw new Error("Missing game state");
  validateVoyageSeed(state.voyageSeed);
  if (!Number.isFinite(state.activePlaySeconds) || state.activePlaySeconds < 0) {
    throw new Error(`Invalid active play time: ${state.activePlaySeconds}`);
  }
  if (state.playerCharacter !== null) assertPlayerCharacter(state.playerCharacter);
  validateNamedCrew(state.namedCrew);
  assertCargoCapacity(state.cargoCapacity);
  if (!Number.isInteger(state.doubloons) || state.doubloons < 0) {
    throw new Error(`Invalid doubloon balance: ${state.doubloons}`);
  }
  if (!state.cargo || typeof state.cargo !== "object") throw new Error("Game state cargo must be an object");
  assertCargoState(state.cargo);
  ensureSurvivalState(state);
  if (state.ship !== null && state.ship !== undefined) {
    assertPlayerShipState(state.ship);
    if (state.ship.crew > 0 && state.ship.crew < permanentCrewFloor(state)) {
      throw new Error(`Player crew ${state.ship.crew} is below permanent crew floor ${permanentCrewFloor(state)}`);
    }
    if (state.ship.loadoutId === CUSTOM_LOADOUT_ID) {
      shipCustomLoadoutPlan({
        cargoCapacity: state.cargoCapacity,
        cannons: state.ship.cannonCapacity,
        mass: state.ship.mass,
        crewCapacity: state.ship.crewCapacity
      }, state.ship.loadoutTargets, { minimumCrew: permanentCrewFloor(state) });
    }
  }
  if (!state.inventory || typeof state.inventory !== "object") throw new Error("Game state inventory must be an object");
  if (!state.inventory.items || typeof state.inventory.items !== "object") {
    throw new Error("Game state inventory items must be an object");
  }
  for (const [itemId, quantity] of Object.entries(state.inventory.items)) {
    perkItemById(itemId);
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 1) {
      throw new Error(`Invalid perk item quantity: ${itemId}=${quantity}`);
    }
  }
  if (typeof state.inventory.fishingNetId !== "string") throw new Error("Game state requires fishing net equipment");
  fishingNetById(state.inventory.fishingNetId);
  if (typeof state.inventory.cannonEquipmentId !== "string") {
    throw new Error("Game state requires cannon equipment");
  }
  cannonEquipmentById(state.inventory.cannonEquipmentId);
  if (state.inventory.whaleHarpoonId !== null && typeof state.inventory.whaleHarpoonId !== "string") {
    throw new Error("Game state whale harpoon must be null or an equipment id");
  }
  if (state.inventory.whaleHarpoonId !== null) whaleHarpoonById(state.inventory.whaleHarpoonId);
  if (state.ship && state.cargoCapacity !== effectivePlayerCargoCapacity(state, state.ship.baseCargoCapacity)) {
    throw new Error(
      `Player cargo capacity does not include current perks: ${state.cargoCapacity}`
    );
  }
  if (!state.accounts || typeof state.accounts !== "object") throw new Error("Game state accounts must be an object");
  if (!state.accounts.cargoCostBasis || typeof state.accounts.cargoCostBasis !== "object") {
    throw new Error("Game state cargo cost basis must be an object");
  }
  assertFactionReputationTable(state.relations?.factionReputation);
  validateSovereignTradeGrantMemory(state.relations?.tradeAccessGrants);
  validatePersonalTradePassMemory(state.relations?.personalTradePasses);
  assertLettersOfMarqueTable(state.relations?.lettersOfMarque);
  assertSafePassageTable(state.relations?.safePassageUntilMinute);
  assertSafePassageRefusalTable(state.relations?.safePassageRefusalUntilMinute);
  assertPortugueseCartazMemory(state.relations?.portugueseCartaz);
  validateForeignSettlementExpulsionMemory(state.relations?.foreignSettlementExpulsions);
  assertWorldDiplomacyState(state);
  if (!Number.isFinite(state.accounts.realizedPnl)) throw new Error("Invalid realized trade P/L");
  if (!Array.isArray(state.accounts.ledger)) throw new Error("Game state ledger must be an array");
  if (!Number.isInteger(state.accounts.nextEntryId) || state.accounts.nextEntryId <= 0) {
    throw new Error(`Invalid next ledger entry id: ${state.accounts.nextEntryId}`);
  }
  if (!state.memory || typeof state.memory !== "object") throw new Error("Game state memory must be an object");
  validateVisitedPortMemories(state.memory.visitedPorts);
  validateNamedCrewDeathNotices(state.memory.namedCrewDeathNotices);
  validateBirthdayMemory(state.memory.birthdays);
  validateSpecialEquipmentOfferMemory(state.memory.specialEquipmentOffers);
  assertCargoReservations(state.memory.cargoReservations);
  assertMissionItemGifts(state.memory.missionItemGifts);
  validateJapaneseMatchlockQuestMemory(state.memory.quests?.japaneseMatchlocks);
  validateCaribbeanGingerQuestMemory(state.memory.quests?.caribbeanGinger);
  validateChefQuestMemory(state.memory.quests?.chef);
  validatePirateCaptiveQuestMemory(state.memory.quests?.pirateCaptive);
  validateCastawayQuestMemory(state.memory.quests?.castaway);
  validateNaturalistQuestMemory(state.memory.quests?.naturalist);
  validateColonizationQuestMemory(state.memory.colonization);
  validatePortConquestMemory(state.memory.conquest);
  validateVoyageAchievementProgress(state.memory.achievements);
  validateWhaleMemory(state.memory.whales);
  validateAnimalEncounterMemory(state.memory.animals);
  validatePandaCompanionMemory(state.memory.panda);
  if (state.memory.campaignGoal === null) {
    if (playerCharacterSupportsCampaignGoal(state.playerCharacter)) {
      throw new Error("Persistent player character requires a campaign goal");
    }
  } else {
    validateCampaignGoal(state.memory.campaignGoal);
    if (state.memory.campaignGoal.homePortTileId !== state.playerCharacter?.homePortTileId) {
      throw new Error("Campaign goal home port does not match the player character");
    }
  }
  validateCartographyMemory(state.memory.cartography);
  if (!state.memory.discoveries || typeof state.memory.discoveries !== "object") {
    throw new Error("Game state discoveries must be an object");
  }
  if (!Array.isArray(state.memory.discoveryOrder)) {
    throw new Error("Game state discovery order must be an array");
  }
  if (!Array.isArray(state.memory.pendingDiscoveryPortDialogueIds)) {
    state.memory.pendingDiscoveryPortDialogueIds = [];
  }
  if (state.memory.pendingDiscoveryPortDialogueIds.some((id) => typeof id !== "string" || id === "")) {
    throw new Error("Pending discovery port dialogue ids must be non-empty strings");
  }
  if (!state.memory.navigation || typeof state.memory.navigation !== "object") {
    throw new Error("Game state navigation memory must be an object");
  }
  const { lastLongitudeDeg, cumulativeLongitudeDeg, optionalWaypoints } = state.memory.navigation;
  if (lastLongitudeDeg !== null && !Number.isFinite(lastLongitudeDeg)) {
    throw new Error(`Invalid last navigation longitude: ${lastLongitudeDeg}`);
  }
  if (!Number.isFinite(cumulativeLongitudeDeg)) {
    throw new Error(`Invalid cumulative navigation longitude: ${cumulativeLongitudeDeg}`);
  }
  if (!Array.isArray(optionalWaypoints)) {
    throw new Error("Game state optional navigation waypoints must be an array");
  }
  for (const waypoint of optionalWaypoints) assertOptionalNavigationWaypoint(waypoint);
  const waypointIds = optionalWaypoints.map((waypoint) => waypoint.id);
  if (new Set(waypointIds).size !== waypointIds.length) {
    throw new Error("Game state contains duplicate optional navigation waypoint ids");
  }
}

function assertCargoState(cargo) {
  for (const [goodId, quantity] of Object.entries(cargo)) {
    assertCargoQuantity(goodById(goodId), quantity);
  }
}

function assertCargoReservations(reservations) {
  if (!reservations || typeof reservations !== "object" || Array.isArray(reservations)) {
    throw new Error("Game state cargo reservations must be an object");
  }
  for (const [reservationId, units] of Object.entries(reservations)) {
    assertCargoReservationId(reservationId);
    if (!Number.isInteger(units) || units <= 0) {
      throw new Error(`Invalid cargo reservation ${reservationId}: ${units}`);
    }
  }
}

function assertMissionItemGifts(gifts) {
  if (!gifts || typeof gifts !== "object" || Array.isArray(gifts)) {
    throw new Error("Game state mission item gifts must be an object");
  }
  for (const [missionId, itemId] of Object.entries(gifts)) {
    if (missionId.trim() === "") throw new Error("Mission item gift has an empty mission id");
    if (itemId !== null) perkItemById(itemId);
  }
}

function assertCargoReservationId(reservationId) {
  if (typeof reservationId !== "string" || reservationId.trim() === "") {
    throw new Error(`Invalid cargo reservation id: ${reservationId}`);
  }
}

function assertPlayerShipState(ship) {
  if (!ship || typeof ship !== "object") throw new Error("Invalid player ship state");
  if (typeof ship.slug !== "string" || ship.slug.trim() === "") {
    throw new Error(`Invalid player ship slug: ${ship.slug}`);
  }
  for (const key of ["crew", "crewCapacity", "cannons", "cannonCapacity"]) {
    if (!Number.isInteger(ship[key]) || ship[key] < 0) throw new Error(`Invalid ship ${key}: ${ship[key]}`);
  }
  if (ship.crew > ship.crewCapacity) throw new Error("Player crew exceeds ship capacity");
  if (ship.cannons > ship.cannonCapacity) throw new Error("Player cannons exceed ship capacity");
  if (!Number.isInteger(ship.baseCargoCapacity) || ship.baseCargoCapacity < 0) {
    throw new Error(`Invalid ship base cargo capacity: ${ship.baseCargoCapacity}`);
  }
  if (!Number.isInteger(ship.mass) || ship.mass <= 0) throw new Error(`Invalid ship mass: ${ship.mass}`);
  if (ship.navalWeaponKind !== null && typeof ship.navalWeaponKind !== "string") {
    throw new Error(`Invalid ship naval weapon kind: ${ship.navalWeaponKind}`);
  }
  if (ship.loadoutId !== null && typeof ship.loadoutId !== "string") {
    throw new Error(`Invalid ship loadout id: ${ship.loadoutId}`);
  }
}

function assertSafePassageTable(table) {
  if (!table || typeof table !== "object" || Array.isArray(table)) {
    throw new Error("Game state safe passage must be an object");
  }
  for (const [factionId, untilMinute] of Object.entries(table)) {
    assertFactionId(factionId);
    assertSimulationMinute(untilMinute);
  }
}

function assertSafePassageRefusalTable(table) {
  if (!table || typeof table !== "object" || Array.isArray(table)) {
    throw new Error("Game state safe passage refusals must be an object");
  }
  for (const [factionId, untilMinute] of Object.entries(table)) {
    assertFactionId(factionId);
    assertSimulationMinute(untilMinute);
  }
}

function assertPortugueseCartazMemory(memory) {
  if (!memory || typeof memory !== "object" || Array.isArray(memory)) {
    throw new Error("Game state Portuguese cartaz memory must be an object");
  }
  if (memory.issuedMinute !== null) assertSimulationMinute(memory.issuedMinute);
  assertSimulationMinute(memory.untilMinute);
  assertSimulationMinute(memory.graceUntilMinute);
  if (memory.issuedAtPortId !== null && (
    typeof memory.issuedAtPortId !== "string" || memory.issuedAtPortId === ""
  )) {
    throw new Error("Portuguese cartaz issuer must be null or a non-empty port id");
  }
  if (
    !memory.inspectedShipUntilMinute ||
    typeof memory.inspectedShipUntilMinute !== "object" ||
    Array.isArray(memory.inspectedShipUntilMinute)
  ) {
    throw new Error("Portuguese cartaz inspections must be an object");
  }
  for (const [npcShipId, untilMinute] of Object.entries(memory.inspectedShipUntilMinute)) {
    if (npcShipId === "") throw new Error("Portuguese cartaz inspection has an empty ship id");
    assertSimulationMinute(untilMinute);
  }
}

function questMemory(state) {
  if (!state.memory.quests || typeof state.memory.quests !== "object") {
    state.memory.quests = { active: null, completed: {} };
  }
  const quests = state.memory.quests;
  if (!quests.completed || typeof quests.completed !== "object") quests.completed = {};
  if (!Number.isInteger(quests.onboardingDeliveriesCompleted) || quests.onboardingDeliveriesCompleted < 0) {
    quests.onboardingDeliveriesCompleted = inferredOnboardingDeliveryProgress(state, quests);
  }
  quests.onboardingDeliveriesCompleted = Math.min(
    ONBOARDING_DELIVERY_COUNT,
    quests.onboardingDeliveriesCompleted
  );
  if (!quests.deliveryOffers || typeof quests.deliveryOffers !== "object") quests.deliveryOffers = {};
  if (!quests.deliveryRolls || typeof quests.deliveryRolls !== "object") quests.deliveryRolls = {};
  if (!quests.passengerOffers || typeof quests.passengerOffers !== "object") quests.passengerOffers = {};
  if (!quests.passengerRolls || typeof quests.passengerRolls !== "object") quests.passengerRolls = {};
  return quests;
}

function inferredOnboardingDeliveryProgress(state, quests) {
  const completedDeliveries = Object.keys(quests.completed || {})
    .filter((questId) => questId.startsWith("delivery-")).length;
  if (completedDeliveries > 0) return Math.min(ONBOARDING_DELIVERY_COUNT, completedDeliveries);
  const visitedPortCount = Object.values(state.memory.visitedPorts || {})
    .filter((memory) => Number.isInteger(memory?.visits) && memory.visits > 0).length;
  return state.activePlaySeconds >= 30 * 60 || visitedPortCount >= ONBOARDING_DELIVERY_COUNT
    ? ONBOARDING_DELIVERY_COUNT
    : 0;
}

function deliveryRollPeriod(simMinute) {
  if (!Number.isFinite(simMinute)) return 0;
  if (simMinute < 0) throw new Error(`Invalid delivery offer minute: ${simMinute}`);
  return Math.floor(simMinute / DELIVERY_ROLL_PERIOD_MINUTES);
}

function deliverySpawnChance(value) {
  const chance = value ?? DELIVERY_SPAWN_CHANCE;
  if (!Number.isFinite(chance) || chance < 0 || chance > 1) {
    throw new Error(`Invalid delivery spawn chance: ${chance}`);
  }
  return chance;
}

function seededFraction(value) {
  return hashString32(value) / 0x100000000;
}

function pruneQuestRolls(rolls) {
  const keys = Object.keys(rolls);
  for (const key of keys.slice(0, Math.max(0, keys.length - 256))) delete rolls[key];
}

function assertPlayerCharacter(character) {
  if (!character || typeof character !== "object") throw new Error("Invalid player character");
  if (typeof character.name !== "string" || character.name.trim() === "") {
    throw new Error("Player character requires a name");
  }
  if (!Array.isArray(character.expressions) || character.expressions.length === 0) {
    throw new Error("Player character requires an authored portrait expression");
  }
  if (character.nationalityId !== undefined) assertFactionId(character.nationalityId);
  validateCharacterSkillIds(character.skillIds);
}

function assertWorldDiplomacyState(state) {
  if (!state.relations || typeof state.relations !== "object") {
    throw new Error("Game state relations must be an object");
  }
  if (!state.relations.diplomacy) throw new Error("Game state requires world diplomacy");
  validateWorldDiplomacy(state.relations.diplomacy);
}

function savedGameStartMinute(state) {
  return Number.isFinite(state.accounts?.ledger?.[0]?.simMinute)
    ? state.accounts.ledger[0].simMinute
    : 0;
}

function createCartographyMemory() {
  return { seenTilesBase64: "", seenTileCount: 0 };
}

function createPortVisitMemory() {
  return {
    visits: 0,
    drunkArrivals: 0,
    lastDrunkVisit: null,
    lastDrunkArrivalMinute: null
  };
}

function validateVisitedPortMemories(memories) {
  if (!memories || typeof memories !== "object" || Array.isArray(memories)) {
    throw new Error("Game state visited-port memory must be an object");
  }
  for (const [portKey, memory] of Object.entries(memories)) {
    if (!memory || typeof memory !== "object" || Array.isArray(memory)) {
      throw new Error(`Invalid visited-port memory: ${portKey}`);
    }
    if (!Number.isInteger(memory.visits) || memory.visits < 0) {
      throw new Error(`Invalid port visit count: ${portKey}=${memory.visits}`);
    }
    if (!Number.isInteger(memory.drunkArrivals) ||
        memory.drunkArrivals < 0 || memory.drunkArrivals > memory.visits) {
      throw new Error(`Invalid drunk port arrival count: ${portKey}=${memory.drunkArrivals}`);
    }
    const hasDrunkArrival = memory.drunkArrivals > 0;
    if (hasDrunkArrival !== (memory.lastDrunkVisit !== null)) {
      throw new Error(`Port drunk visit marker does not match its count: ${portKey}`);
    }
    if (memory.lastDrunkVisit !== null &&
        (!Number.isInteger(memory.lastDrunkVisit) || memory.lastDrunkVisit < 1 ||
         memory.lastDrunkVisit > memory.visits)) {
      throw new Error(`Invalid latest drunk port visit: ${portKey}=${memory.lastDrunkVisit}`);
    }
    if (hasDrunkArrival !== (memory.lastDrunkArrivalMinute !== null)) {
      throw new Error(`Port drunk arrival time does not match its count: ${portKey}`);
    }
    if (memory.lastDrunkArrivalMinute !== null &&
        (!Number.isFinite(memory.lastDrunkArrivalMinute) || memory.lastDrunkArrivalMinute < 0)) {
      throw new Error(`Invalid latest drunk port arrival time: ${portKey}=${memory.lastDrunkArrivalMinute}`);
    }
  }
}

function validateCartographyMemory(cartography) {
  if (!cartography || typeof cartography !== "object") throw new Error("Game state requires cartography memory");
  if (typeof cartography.seenTilesBase64 !== "string") throw new Error("Invalid cartography tile mask");
  if (!Number.isInteger(cartography.seenTileCount) || cartography.seenTileCount < 0) {
    throw new Error(`Invalid mapped tile count: ${cartography.seenTileCount}`);
  }
}

function playerCharacterSupportsCampaignGoal(character) {
  if (!character) return false;
  return typeof character.id === "string" && character.id !== "" &&
    Number.isInteger(character.homePortTileId) && character.homePortTileId >= 0;
}

function worldDiplomacySeedKey(character, startMinute) {
  if (!character) return `anonymous|${startMinute}`;
  return [
    character.id || character.sourceId || "captain",
    character.name || "unknown",
    character.birthDateLabel || character.birthDate?.label || "unknown-birth",
    character.homePortName || "unknown-home",
    startMinute
  ].join("|");
}

function validateVoyageSeed(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Game state requires a non-empty voyage seed");
  }
  return value;
}

function assertFactionReputationTable(reputation) {
  if (!reputation || typeof reputation !== "object") {
    throw new Error("Game state faction reputation must be an object");
  }
  for (const faction of FACTIONS) {
    if (!Object.prototype.hasOwnProperty.call(reputation, faction.id)) {
      throw new Error(`Missing faction reputation: ${faction.id}`);
    }
    assertReputationValue(reputation[faction.id], `reputation.${faction.id}`);
  }
}

function assertLettersOfMarqueTable(letters) {
  if (!letters || typeof letters !== "object") {
    throw new Error("Game state letters of marque must be an object");
  }
  for (const [factionId, letter] of Object.entries(letters)) {
    assertFactionId(factionId);
    if (!letter || typeof letter !== "object") throw new Error(`Invalid letter of marque: ${factionId}`);
    if (letter.factionId !== factionId) throw new Error(`Letter of marque faction mismatch: ${factionId}`);
    if (letter.simMinute !== null && !Number.isFinite(letter.simMinute)) {
      throw new Error(`Invalid letter of marque issue minute: ${letter.simMinute}`);
    }
  }
}

function assertReputationValue(value, label) {
  if (!Number.isFinite(value) || value < REPUTATION_MIN || value > REPUTATION_MAX) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
}

function assertReputationDelta(delta) {
  if (!Number.isFinite(delta)) throw new Error(`Invalid reputation delta: ${delta}`);
}

function assertLetterOfMarqueShipPower(shipPower) {
  if (!Number.isFinite(shipPower) || shipPower < 0) throw new Error(`Invalid ship strength: ${shipPower}`);
}

function clampReputation(value) {
  return Math.min(REPUTATION_MAX, Math.max(REPUTATION_MIN, value));
}

function roundReputation(value) {
  return Math.round(value * 1000) / 1000;
}

function assertDiscovery(discovery) {
  if (!discovery || typeof discovery.id !== "string" || discovery.id === "") {
    throw new Error("Cannot record a discovery without an id");
  }
  if (typeof discovery.displayName !== "string" || discovery.displayName === "") {
    throw new Error(`Discovery ${discovery.id} has no display name`);
  }
  if (!["mountain", "landmark", "legend", "achievement"].includes(discovery.kind)) {
    throw new Error(`Discovery ${discovery.id} has invalid kind: ${discovery.kind}`);
  }
  if (discovery.portArrivalDialogue !== undefined &&
      (typeof discovery.portArrivalDialogue !== "string" || discovery.portArrivalDialogue.trim() === "")) {
    throw new Error(`Discovery ${discovery.id} has invalid port-arrival dialogue`);
  }
  if (discovery.portArrivalExpressionId !== undefined &&
      (typeof discovery.portArrivalExpressionId !== "string" || discovery.portArrivalExpressionId === "")) {
    throw new Error(`Discovery ${discovery.id} has invalid port-arrival expression`);
  }
}

function normalizeLongitudeDelta(deltaDeg) {
  return ((((deltaDeg + 180) % 360) + 360) % 360) - 180;
}

function assertCargoCapacity(cargoCapacity) {
  if (!Number.isInteger(cargoCapacity) || cargoCapacity < 0) {
    throw new Error(`Invalid cargo capacity: ${cargoCapacity}`);
  }
}

function assertSimulationMinute(simMinute) {
  if (!Number.isFinite(simMinute)) throw new Error(`Invalid simulation minute: ${simMinute}`);
}

function assertQuantity(quantity, label) {
  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error(`Invalid ${label}: ${quantity}`);
}

function assertCargoQuantity(good, quantity) {
  if (good.category === "food") {
    if (foodRationsForCargoQuantity(quantity) <= 0) {
      throw new Error(`Invalid cargo.${good.id}: ${quantity}`);
    }
    return;
  }
  if (good.category === "drink") {
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error(`Invalid cargo.${good.id}: ${quantity}`);
    }
    return;
  }
  assertQuantity(quantity, `cargo.${good.id}`);
}

function assertProvisionQuantity(quantity, label) {
  if (!Number.isInteger(quantity) || quantity < 0) throw new Error(`Invalid ${label}: ${quantity}`);
}

function ensureSurvivalState(state) {
  if (!state.survival || typeof state.survival !== "object") {
    state.survival = createSurvivalState(0);
  }
  if (!Number.isFinite(state.survival.freshWaterCapacity) || state.survival.freshWaterCapacity <= 0) {
    state.survival.freshWaterCapacity = FRESH_WATER_CAPACITY;
  }
  if (!Number.isFinite(state.survival.freshWater) || state.survival.freshWater < 0) {
    state.survival.freshWater = state.survival.freshWaterCapacity;
  }
  state.survival.freshWater = Math.min(state.survival.freshWater, state.survival.freshWaterCapacity);
  if (!Number.isFinite(state.survival.foodRationDebt) || state.survival.foodRationDebt < 0) {
    throw new Error(`Invalid food ration debt: ${state.survival.foodRationDebt}`);
  }
  if (state.survival.wineOnlyMinutes === undefined) state.survival.wineOnlyMinutes = 0;
  if (!Number.isFinite(state.survival.wineOnlyMinutes) || state.survival.wineOnlyMinutes < 0) {
    throw new Error(`Invalid wine-only survival time: ${state.survival.wineOnlyMinutes}`);
  }
  if (state.survival.wineEmergencyActive === undefined) {
    state.survival.wineEmergencyActive = state.survival.wineOnlyMinutes > 0 || Boolean(
      state.ship && state.survival.freshWater <= 1e-8 && (state.cargo?.[WINE_GOOD_ID] || 0) > 0
    );
  }
  if (typeof state.survival.wineEmergencyActive !== "boolean") {
    throw new Error(`Invalid wine emergency state: ${state.survival.wineEmergencyActive}`);
  }
  if (!Number.isFinite(state.survival.lastMinute)) {
    state.survival.lastMinute = 0;
  }
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function hashString32(value) {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
