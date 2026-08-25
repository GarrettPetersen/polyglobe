import {
  FORAGED_FOOD_GOOD_ID,
  FRESH_WATER_GOOD_ID,
  GUNPOWDER_GOOD_ID,
  HARDTACK_GOOD_ID,
  MATCHLOCKS_GOOD_ID,
  WINE_GOOD_ID,
  WHALE_BLUBBER_GOOD_ID,
  TEA_GOOD_ID,
  TRADE_GOODS,
  executePortPurchase,
  executeRepeatedPortPurchase,
  executePortSale,
  maximumPortPurchaseQuantity,
  maximumRepeatedPortPurchaseQuantity,
  portMarket,
  quotePortPurchase,
  quoteRepeatedPortPurchase,
  quotePortSale,
  restorePortTradeState,
  snapshotPortTradeState,
  tradeGoodById
} from "./economy.js";
import {
  CANONICAL_PORTS,
  portMatchesCanonicalReference,
  requireCanonicalPort
} from "./canonicalPorts.js";
import {
  TEA_RACE_CARGO_QUANTITY,
  TEA_RACE_THEFT_REPUTATION,
  createTeaRaceQuest,
  isTeaRaceQuest,
  isTeaRaceSourcePort,
  teaRaceCargoHeld,
  teaRaceEntrustedCargo,
  teaRaceSaleTheftStatus as calculateTeaRaceSaleTheftStatus,
  teaRaceSeasonAtMinute,
  validateTeaRaceQuest
} from "./teaRaceQuest.js";
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
  animalCompanionConsumption,
  animalCompanionState,
  createAnimalCompanionMemory,
  migrateAnimalCompanionMemory,
  validateAnimalCompanionMemory
} from "./animalCompanions.js";
import {
  createNaturalistQuestMemory,
  migrateNaturalistQuestMemory,
  setNaturalistQuestCharacter,
  validateNaturalistQuestMemory
} from "./naturalistQuest.js";
import { createBirthdayMemory, validateBirthdayMemory } from "./birthdayEvents.js";
import {
  DIPLOMACY_ALLY,
  DIPLOMACY_FRIENDLY,
  DIPLOMACY_HOSTILE,
  DIPLOMACY_NEUTRAL,
  DIPLOMACY_WAR,
  FACTIONS,
  NEUTRAL_FACTION_ID,
  PIRATE_FACTION_ID,
  assertFactionId,
  diplomacyBetween,
  factionById,
  factionNounPhrase,
  migrateFactionIdTo1522
} from "./factions.js";
import {
  factionConquestCommissionChance
} from "./factionExpansion.js";
import {
  CAPTURE_COMMISSION_PRIORITY_HISTORICAL_ATTEMPT,
  CAPTURE_COMMISSION_PRIORITY_HISTORICAL_CONQUEST,
  CAPTURE_COMMISSION_PRIORITY_RETAKE,
  CAPTURE_COMMISSION_PRIORITY_STRATEGIC,
  captureCommissionPriorityForPort
} from "./captureCommissionPriorities.js";
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
import { claimPlayerShipyardPayout, shipyardAtPort } from "./shipyards.js";
import {
  TRAVELER_KIND_CAPTIVE,
  TRAVELER_KIND_ENVOY,
  TRAVELER_KIND_PASSENGER,
  TRAVELER_KIND_SOLDIER,
  TRAVELER_KIND_SETTLER,
  createTravelerGroup
} from "./travelerKinds.js";
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
import { createWhaleMemory, migrateWhaleMemory, validateWhaleMemory } from "./whaleSystem.js";
import { createIcebergMemory, validateIcebergMemory } from "./icebergSystem.js";
import {
  adjustDiplomaticStance,
  advanceWorldDiplomacy,
  createWorldDiplomacy,
  diplomacyPairKey,
  establishDiplomaticSuzerainty,
  rawWorldDiplomacyBetween,
  recordDiplomaticPortCall,
  releaseDiplomaticVassal,
  migrateWorldDiplomacy,
  recentDiplomacyEvents,
  validateWorldDiplomacy,
  worldDiplomacyBetween
} from "./worldDiplomacy.js";
import {
  advanceImperialConstitution,
  createImperialConstitution,
  imperialTargetIsAuthorized,
  migrateImperialConstitution,
  nextImperialPoliticsMinute,
  recordImperialReligiousCirculation,
  validateImperialConstitution
} from "./imperialConstitution.js";
import { imperialEstateForCityId, imperialEstateForFaction } from "./imperialEstates.js";
import {
  advanceHistoricalSovereignty,
  nextHistoricalSovereigntyMinute
} from "./historicalSovereignty.js";
import {
  initialReligiousFactionReputation,
  isRomanCatholicReligion,
  religiousAttitude
} from "./religiousAttitudes.js";
import {
  isReligiousPassengerQuest,
  religiousMissionChallengesPapalAuthority,
  religiousMissionIsCatholicContraband,
  religiousMissionOffersLutheranConversion,
  religiousMissionTitle,
  SEPTEMBER_TESTAMENT_MISSION_ID
} from "./religiousMissions.js";
import {
  PAPAL_MATTER_COMMISSIONED,
  advancePapalPolitics,
  convertEnglishCatholicCharacter,
  createPapalPolitics,
  migratePapalPolitics,
  nextPapalPoliticsMinute,
  revokeActivePapalCommission,
  validatePapalPolitics
} from "./papalPolitics.js";
import {
  advanceCourtPolitics,
  commissionCourtMatter,
  completeCourtCommission,
  createCourtPolitics,
  deliverCourtCommission,
  migrateCourtPolitics,
  nextCourtPoliticsMinute,
  recentCourtActions,
  validateCourtPolitics
} from "./courtPolitics.js";
import {
  foreignPolicyPrincipal,
  SUZERAINTY_KIND_TRIBUTARY,
  suzerainForFaction,
  suzeraintyTradePrivilege
} from "./suzerainty.js";
import {
  COURT_ENVOY_QUEST_KIND,
  STATUS_ENVOY_QUEST_KIND,
  TRIBUTE_ENVOY_QUEST_KIND,
  WOKOU_HUNT_QUEST_KIND,
  isCourtEnvoyQuest,
  isStatusEnvoyQuest,
  isTributeEnvoyQuest,
  resolveDiplomaticStatusProposal,
  statusProposalText,
  tributeCargoHeld,
  tributeCargoSpace,
  tributeSaleTheftStatus as calculateTributeSaleTheftStatus
} from "./diplomaticMissions.js";
import {
  createForeignSettlementExpulsionMemory,
  expelHostileForeignSettlements,
  migrateForeignSettlementExpulsionMemory,
  validateForeignSettlementExpulsionMemory
} from "./foreignSettlements.js";
import {
  JOSEON_TRADE_POLICY_ID,
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
  EAST_ASIAN_MISSION_GREAT_RITES,
  EAST_ASIAN_MISSION_NINGBO,
  EAST_ASIAN_MISSION_PORTUGUESE_GUNS,
  EAST_ASIAN_MISSION_RYUKYU,
  EAST_ASIAN_MISSION_TSUSHIMA,
  EAST_ASIAN_MISSION_YOSHIHARU,
  NINGBO_DEFECTION_BRIBE,
  NINGBO_RACE_BONUS,
  PORTUGUESE_GUNS_ITINERARY_REFS,
  eastAsianMissionDialogue,
  isEastAsianMissionQuest,
  removeSiblingEastAsianOffers,
  validateMissionOutcome
} from "./eastAsianQuestlines.js";
import {
  completeTreatyOfMadridMission,
  isTreatyOfMadridQuest,
  removeSiblingTreatyOfMadridOffers,
  treatyOfMadridOfferStillValid
} from "./treatyOfMadridMission.js";
import {
  IMPERIAL_ELECTION_ENVOY_QUEST_KIND,
  isImperialElectionEnvoyQuest
} from "./imperialElectionMissions.js";
import { upgradeShoreBattery } from "./shoreBatteries.js";
import {
  QUEST_ITINERARY_OPEN,
  completeQuestItineraryStop,
  createQuestItinerary,
  migrateQuestItinerary,
  questDestinationStops,
  questHasDestination,
  validateQuestItinerary
} from "./questItinerary.js";
import {
  PORTUGUESE_CARTAZ_DURATION_DAYS,
  PORTUGUESE_CARTAZ_INSPECTION_COOLDOWN_DAYS,
  PORTUGUESE_CROWN_SPICE_GOOD_IDS,
  PORTUGUESE_CROWN_SPICE_POLICY,
  PORTUGUESE_FACTION_ID,
  customsTerms,
  evaluateTradeAccess,
  evaluatePortugueseCrownSpiceAccess,
  isPortugueseEstadoPort,
  portugueseCartazFee,
  portugueseCartazFine,
  portugueseCartazRequired,
  portugueseControlledCargo,
  tradeTerms
} from "./tradePolicy.js";
import {
  beginIllicitTradeEnforcementCombat as markIllicitTradeEnforcementCombat,
  createIllicitTradeEnforcementMemory,
  illicitCargoAvailable,
  illicitTradeFine,
  illicitTradeIncidentById,
  migrateIllicitTradeEnforcementMemory,
  resolveIllicitTradeIncident,
  validateIllicitTradeEnforcementMemory
} from "./illicitTradeEnforcement.js";
import {
  VIKING_BOWS_ITEM_ID,
  isPortableWeaponItemId,
  ownedPortableWeaponItemIds,
  portableWeaponCombatRating,
  regionalStarterPortableWeaponItemIds
} from "./portableWeapons.js";
import {
  PORT_CONQUEST_MIN_CREW,
  createPortConquestMemory,
  validatePortConquestMemory
} from "./portConquest.js";
import {
  HOSPITALLER_MALTA_STAGE_PETITION,
  HOSPITALLER_MALTA_STAGE_RETURN_TO_ROME,
  createHospitallerMaltaQuestMemory,
  migrateHospitallerMaltaQuestMemory,
  validateHospitallerMaltaQuestMemory
} from "./hospitallerMaltaQuest.js";
import {
  advanceConquistadorCampaign,
  CONQUISTADOR_STAGE_CAPTURE,
  conquistadorCommissionedCaptureFactionId,
  createConquistadorQuestMemory,
  migrateConquistadorQuestMemory,
  nextConquistadorQuestMinute,
  validateConquistadorQuestMemory
} from "./conquistadorQuest.js";
import { rulerAtMinute } from "./rulers.js";
import {
  advanceSovereignAuthority,
  convertCatholicFactorForPapalAuthority,
  createSovereignAuthority,
  migrateSovereignAuthority,
  nextSovereignAuthorityMinute,
  papalAuthorityResponseMultiplier,
  papalAuthorityScore,
  adjustSovereignAuthority,
  recordColonyAuthority,
  recordCourtMissionAuthority,
  recordEnglishReformationAuthority,
  recordNavalAuthorityOutcome,
  recordPapalMissionAuthority,
  recordPeaceTreatyAuthority,
  recordPortCaptureAuthority,
  recordProtestantMissionAuthority,
  recentSovereignAuthorityHeadlines,
  sovereignAuthorityScore,
  validateSovereignAuthority
} from "./sovereignAuthority.js";
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
  COLONIZATION_STAGE_ESTABLISHED,
  COLONIZATION_STAGE_OUTBOUND,
  ROANOKE_CLUES_ITEM_ID,
  createColonizationQuestMemory,
  migrateColonizationQuestMemory,
  roanokeCluesAboard,
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
  perkItemById,
  perkItemSummary
} from "./perkItems.js";
import {
  createPirateCaptiveQuestMemory,
  migratePirateCaptiveQuestMemory,
  pirateCaptiveIsAboard,
  pirateCaptiveIsDetained,
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
import {
  prepareEquipmentFactorPitch as prepareEquipmentFactorPitchOffer,
  recordEquipmentFactorPitchDecline as recordEquipmentFactorPitchDeclineOffer
} from "./equipmentFactorOffers.js";
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
import {
  createQuestCargoDeliveryMemory,
  questCargoDeliverableQuantity,
  recordQuestCargoDelivery,
  validateQuestCargoDeliveryMemory
} from "./questCargoDeliveries.js";
import { validateVoyageStartProfile } from "./voyageStartProfile.js";
import {
  createChartReframeDialogueMemory,
  migrateChartReframeDialogueMemory,
  validateChartReframeDialogueMemory
} from "./chartReframeDialogue.js";
import {
  SHIPYARD_INVESTMENT_CAPITAL,
  SHIPYARD_INVESTMENT_MATERIALS,
  beginShipyardInvestment,
  completeShipyardInvestment,
  createShipyardInvestmentMemory,
  migrateShipyardInvestmentMemory,
  playerBackedShipyardAtPort,
  shipyardInvestmentAtPort,
  validateShipyardInvestmentMemory
} from "./shipyardInvestment.js";
import {
  SOVEREIGN_WAR_LOAN_ACTIVE,
  SOVEREIGN_WAR_LOAN_ARREARS,
  SOVEREIGN_WAR_LOAN_CONTRACT_ITEM_ID,
  SOVEREIGN_WAR_LOAN_DEFAULT_READY,
  SOVEREIGN_WAR_LOAN_PRINCIPAL,
  SOVEREIGN_WAR_LOAN_RENEGOTIATION_READY,
  SOVEREIGN_WAR_LOAN_REPAYMENT,
  SOVEREIGN_WAR_LOAN_REPAYMENT_READY,
  SOVEREIGN_WAR_LOAN_SECURED,
  acceptSovereignWarLoanRenegotiation,
  advanceSovereignWarLoanAfterPeace,
  completeSovereignWarLoanAudience,
  createSovereignWarLoanMemory,
  fundSovereignWarLoan,
  holdSovereignWarLoanBond,
  migrateSovereignWarLoanMemory,
  resolveSovereignWarLoan,
  sovereignWarLoanContractIsCarried,
  validateSovereignWarLoanMemory
} from "./sovereignWarLoan.js";

export const STARTING_DOUBLOONS = 360;
export const GAME_STATE_VERSION = 88;
const CIRCUMNAVIGATION_COMPLETION_TOLERANCE_DEG = 1e-6;
export const PLAYER_LEDGER_ENTRY_LIMIT = 750;
export const PORT_NAVIGATION_REASON_NEW_SHIP = "NEW SHIP FOR SALE";
export const PORT_NAVIGATION_REASON_QUEST_CARGO = "QUEST CARGO SOURCE";
export const PORT_NAVIGATION_REASON_SHIPYARD_SUPPLY = "SHIPYARD SUPPLY";
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
export const CAPTURE_PORT_MISSION_KIND = "capture-port";
export const CAPTURE_CAPITAL_MISSION_KIND = "capture-capital";
export const CAPTURE_COMMISSION_INDEPENDENT_PETITION_ID = "independent-harbors";
export const CAPTURE_PORT_MISSION_MIN_CANNONS = 8;
export const CAPTURE_PORT_MISSION_REPUTATION_GAIN = 10;
export const CAPTURE_CAPITAL_MISSION_REPUTATION_GAIN = 30;
export const CAPTURE_PORT_MISSION_SPAWN_CHANCE = 0.35;
export const CAPTURE_PORT_MISSION_ROLL_PERIOD_MINUTES = 30 * 24 * 60;
export const CAPTURE_COMMISSION_PETITION_COOLDOWN_MINUTES = 30 * 24 * 60;
export const WOKOU_HUNT_MISSION_SPAWN_CHANCE = 0.28;
export const WOKOU_HUNT_MISSION_ROLL_PERIOD_MINUTES = 30 * 24 * 60;
export const WOKOU_HUNT_REPUTATION_REQUIRED = 10;
export const WOKOU_HUNT_REPUTATION_GAIN = 8;
export const CAPTURE_PORT_MISSION_MAX_DISTANCE_KM = 20000;
export const CAPTURE_CAPITAL_MISSION_MAX_DISTANCE_KM = 20000;
export const CAPTURE_CAPITAL_MISSION_MAX_REMAINING_PORTS = 2;
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
export const FRIENDLY_FIRE_REPUTATION_PENALTY = -3;
export const SELF_DEFENSE_REPUTATION_PENALTY = -1;
export const SHIP_MERCY_REPUTATION_GAIN = 3;
export const PIRACY_ALLY_REPUTATION_PENALTY = -10;
export const PIRACY_FRIENDLY_REPUTATION_PENALTY = -5;
export const PIRACY_HOME_REPUTATION_PENALTY = -18;
export const PIRACY_HOME_ENEMY_REPUTATION_PENALTY = -12;
export const LETTER_OF_MARQUE_REPUTATION_REQUIRED = 15;
export const LETTER_OF_MARQUE_POWER_REQUIRED = 18;
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
export const RAIN_WATER_COLLECTION_PER_CONSUMER_DAY = 0.2;
export const WINE_PERSON_DAYS_PER_UNIT = WATER_PERSON_DAYS_PER_UNIT;
export const FOOD_TARGET_DAYS = 21;
export const STARTING_HARDTACK_RATIONS = 10;
export const EMERGENCY_SHIP_AID_UNITS = 3;
export const ALLIED_SHIP_AID_THRESHOLD_DAYS = 2;
export const ENVOY_SAFE_PASSAGE_DAYS = 7;
export const ENVOY_TARGET_FRIENDLY_REPUTATION = 5;
export const ENVOY_TARGET_HOSTILE_REPUTATION = -8;
export const ENVOY_HOME_REPUTATION = 8;
export const IMPERIAL_PUBLIC_PEACE_REPUTATION_PENALTY = -6;

const MINUTES_PER_DAY = 24 * 60;
const WINE_EMERGENCY_RECOVERY_WATER_UNITS = 1;
export const SURVIVAL_DEHYDRATION_INTERVAL_MINUTES = 12 * 60;
export const SURVIVAL_STARVATION_INTERVAL_MINUTES = 5 * MINUTES_PER_DAY;
const PORT_DISGUISE_LOCK_MINUTES = PORT_DISGUISE_LOCK_DAYS * MINUTES_PER_DAY;
const FACTION_SAFE_PASSAGE_MINUTES = FACTION_SAFE_PASSAGE_DAYS * MINUTES_PER_DAY;
const FACTION_SAFE_PASSAGE_REFUSAL_MINUTES = FACTION_SAFE_PASSAGE_REFUSAL_DAYS * MINUTES_PER_DAY;
const ENVOY_SAFE_PASSAGE_MINUTES = ENVOY_SAFE_PASSAGE_DAYS * MINUTES_PER_DAY;
const ENVOY_QUEST_KINDS = new Set([
  "friendly-envoy",
  "hostile-envoy",
  TRIBUTE_ENVOY_QUEST_KIND,
  COURT_ENVOY_QUEST_KIND,
  STATUS_ENVOY_QUEST_KIND,
  IMPERIAL_ELECTION_ENVOY_QUEST_KIND
]);
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
    voyageStartProfile: null,
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
      items: normalizedPlayerCharacter && shipStats
        ? Object.fromEntries(regionalStarterPortableWeaponItemIds({
            factionId: normalizedPlayerCharacter.nationalityId || NEUTRAL_FACTION_ID,
            shipSlug: shipStats.slug
          }).map((itemId) => [itemId, 1]))
        : {},
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
      factionReputation: initialFactionReputation(
        playerFactionId,
        normalizedPlayerCharacter?.religionId || null,
        startMinute,
        resolvedVoyageSeed
      ),
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
      }),
      imperial: createImperialConstitution({ startMinute }),
      papacy: createPapalPolitics({
        startMinute,
        seedKey: resolvedVoyageSeed
      }),
      courts: createCourtPolitics({
        startMinute,
        seedKey: resolvedVoyageSeed
      }),
      authority: createSovereignAuthority({
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
      animalCompanions: createAnimalCompanionMemory(),
      pendingDiscoveryPortDialogueIds: [],
      namedCrewDeathNotices: [],
      birthdays: createBirthdayMemory(),
      specialEquipmentOffers: createSpecialEquipmentOfferMemory(),
      illicitTradeEnforcement: createIllicitTradeEnforcementMemory(),
      chartReframeDialogue: createChartReframeDialogueMemory(),
      shipyardInvestment: createShipyardInvestmentMemory(),
      navigation: {
        lastLongitudeDeg: null,
        cumulativeLongitudeDeg: 0,
        minimumCumulativeLongitudeDeg: 0,
        maximumCumulativeLongitudeDeg: 0,
        optionalWaypoints: []
      },
      quests: {
        active: null,
        passengerActive: null,
        completed: {},
        failed: {},
        onboardingDeliveriesCompleted: 0,
        deliveryOffers: {},
        deliveryRolls: {},
        capturePortOffers: {},
        capturePortRolls: {},
        courtMissionOffers: {},
        courtMissionRolls: {},
        passengerOffers: {},
        passengerRolls: {},
        vikingLongshipRolls: {},
        cargoDeliveries: createQuestCargoDeliveryMemory(),
        japaneseMatchlocks: createJapaneseMatchlockQuestMemory(),
        caribbeanGinger: createCaribbeanGingerQuestMemory(),
        chef: createChefQuestMemory(),
        pirateCaptive: createPirateCaptiveQuestMemory(),
        castaway: createCastawayQuestMemory(),
        naturalist: createNaturalistQuestMemory(),
        hospitallerMalta: createHospitallerMaltaQuestMemory(),
        conquistador: createConquistadorQuestMemory(),
        sovereignWarLoan: createSovereignWarLoanMemory()
      },
      cargoReservations: {},
      missionItemGifts: {},
      colonization: createColonizationQuestMemory(),
      conquest: createPortConquestMemory(),
      achievements: createVoyageAchievementProgress(),
      whales: createWhaleMemory(),
      icebergs: createIcebergMemory(),
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
  if (![8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87].includes(state?.version)) {
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
  const migratedConquest = migrateConquestFactionReferences(
    state.memory?.conquest || createPortConquestMemory(),
    { splitCombinedHabsburg: state.version <= 83 }
  );
  const diplomacyMigrationContext = {
    inactiveFactionIds: migratedConquest.collapsedFactionIds,
    neutralizeIntroducedFactions: true
  };
  const migratedDiplomacy = state.relations.diplomacy
    ? migrateWorldDiplomacy(state.relations.diplomacy, diplomacyMigrationContext)
    : migrateWorldDiplomacy(createWorldDiplomacy({
        startMinute: savedGameStartMinute(state),
        seedKey: migrationVoyageSeed
      }), diplomacyMigrationContext);
  const migratedPapacy = migratePapalPolitics(state.relations.papacy, {
    startMinute: savedGameStartMinute(state),
    seedKey: migrationVoyageSeed
  });
  const migratedCourts = migrateCourtPolitics(state.relations.courts, {
    startMinute: savedGameStartMinute(state),
    seedKey: migrationVoyageSeed
  });
  const migratedAuthority = migrateSovereignAuthority(state.relations.authority, {
    startMinute: savedGameStartMinute(state),
    seedKey: migrationVoyageSeed,
    splitCombinedHabsburg: state.version <= 83
  });
  const migratedImperial = migrateImperialConstitution(state.relations.imperial, {
    startMinute: savedGameStartMinute(state)
  });
  const legacyPortHeading = state.memory?.navigation?.portHeading || null;
  const { portHeading: _removedPortHeading, ...legacyNavigation } = state.memory?.navigation || {};
  const {
    panda: legacyPandaCompanion,
    animalCompanions: savedAnimalCompanions,
    ...migratedMemoryBase
  } = state.memory || {};
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
    voyageStartProfile: state.voyageStartProfile || null,
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
      mass: shipStats.mass
    } : state.ship,
    inventory: {
      ...state.inventory,
      items: migratePortableWeaponItems(
        state.inventory?.items,
        shipStats?.slug,
        migratedPlayerCharacter?.nationalityId || NEUTRAL_FACTION_ID
      ),
      whaleHarpoonId: state.inventory?.whaleHarpoonId ?? null
    },
    relations: {
      ...migratedRelationBase,
      factionReputation: migrateLawfulWartimeAttackReputation(
        state,
        migrateFactionReputationTable(state.relations.factionReputation, {
          splitCombinedHabsburg: state.version <= 83
        })
      ),
      lettersOfMarque: migrateCombinedHabsburgFactionTable(state.relations.lettersOfMarque, {
        splitCombinedHabsburg: state.version <= 83
      }),
      safePassageUntilMinute: state.version === 8
        ? {}
        : migrateSafePassageTable(state.relations.safePassageUntilMinute, {
            splitCombinedHabsburg: state.version <= 83
          }),
      safePassageRefusalUntilMinute: migrateSafePassageTable(
        state.relations.safePassageRefusalUntilMinute || {},
        { splitCombinedHabsburg: state.version <= 83 }
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
      diplomacy: migratedDiplomacy,
      imperial: migratedImperial,
      papacy: migratedPapacy,
      courts: migratedCourts,
      authority: migratedAuthority
    },
    memory: {
      ...migratedMemoryBase,
      visitedPorts: migrateVisitedPortMemories(state.memory?.visitedPorts),
      namedCrewDeathNotices: state.memory?.namedCrewDeathNotices || [],
      birthdays: state.memory?.birthdays || createBirthdayMemory(),
      specialEquipmentOffers: state.memory?.specialEquipmentOffers || createSpecialEquipmentOfferMemory(),
      illicitTradeEnforcement: migrateIllicitTradeEnforcementMemory(
        state.memory?.illicitTradeEnforcement
      ),
      chartReframeDialogue: migrateChartReframeDialogueMemory(
        state.memory?.chartReframeDialogue
      ),
      shipyardInvestment: migrateShipyardInvestmentMemory(state.memory?.shipyardInvestment),
      animals: state.memory?.animals || createAnimalEncounterMemory(),
      animalCompanions: migrateAnimalCompanionMemory(savedAnimalCompanions, {
        legacyPanda: legacyPandaCompanion
      }),
      quests: {
        ...migrateQuestItineraries(migrateEastAsianMissionDialogue(migrateQuestCharacterSkills(
          migrateSovereignTradeQuestReferences(
            migrateConcurrentQuestMemory(migrateRetiredFactionReferences(state.memory?.quests))
          )
        ))),
        failed: state.memory?.quests?.failed || {},
        cargoDeliveries: state.memory?.quests?.cargoDeliveries ||
          createQuestCargoDeliveryMemory(),
        capturePortOffers: state.memory?.quests?.capturePortOffers || {},
        capturePortRolls: state.memory?.quests?.capturePortRolls || {},
        courtMissionOffers: state.memory?.quests?.courtMissionOffers || {},
        courtMissionRolls: state.memory?.quests?.courtMissionRolls || {},
        japaneseMatchlocks: state.memory?.quests?.japaneseMatchlocks ||
          createJapaneseMatchlockQuestMemory(),
        caribbeanGinger: state.memory?.quests?.caribbeanGinger ||
          createCaribbeanGingerQuestMemory(),
        chef: state.memory?.quests?.chef || createChefQuestMemory(),
        pirateCaptive: migratePirateCaptiveQuestMemory(state.memory?.quests?.pirateCaptive),
        castaway: migrateCastawayQuestMemory(state.memory?.quests?.castaway),
        naturalist: migrateNaturalistQuestMemory(state.memory?.quests?.naturalist),
        hospitallerMalta: migrateHospitallerMaltaQuestMemory(
          state.memory?.quests?.hospitallerMalta
        ),
        conquistador: migrateConquistadorQuestMemory(state.memory?.quests?.conquistador),
        sovereignWarLoan: migrateSovereignWarLoanMemory(
          state.memory?.quests?.sovereignWarLoan
        )
      },
      navigation: {
        ...legacyNavigation,
        minimumCumulativeLongitudeDeg: Math.min(0, legacyNavigation.cumulativeLongitudeDeg),
        maximumCumulativeLongitudeDeg: Math.max(0, legacyNavigation.cumulativeLongitudeDeg),
        optionalWaypoints: state.memory?.navigation?.optionalWaypoints || (legacyPortHeading ? [{
          id: `port:${legacyPortHeading.destinationTileId}`,
          destinationTileId: legacyPortHeading.destinationTileId,
          destinationName: legacyPortHeading.destinationName,
          reason: legacyPortHeading.reason || PORT_NAVIGATION_REASON_NEW_SHIP
        }] : [])
      },
      cargoReservations: state.memory?.cargoReservations || {},
      missionItemGifts: state.memory?.missionItemGifts || {},
      colonization: migrateColonizationQuestMemory(state.memory?.colonization),
      conquest: migratedConquest,
      achievements: migrateVoyageAchievementProgress(state.memory?.achievements),
      whales: migrateWhaleMemory(state.memory?.whales),
      icebergs: state.memory?.icebergs?.version === 1 ? state.memory.icebergs : createIcebergMemory(),
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
  if (!state.memory || typeof state.memory !== "object") {
    throw new Error("Loaded game state requires memory");
  }
  state.memory.whales = migrateWhaleMemory(state.memory.whales);
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
  state.cargoCapacity = effectivePlayerShipStats(state, shipStats).cargoCapacity;
  const plan = selectedShipLoadoutPlan(state, shipStats);
  state.ship.loadoutTargets = plan;
  return plan;
}

function migrateFactionReputationTable(reputation, { splitCombinedHabsburg = false } = {}) {
  if (!reputation || typeof reputation !== "object" || Array.isArray(reputation)) return reputation;
  return Object.fromEntries(FACTIONS.map((faction) => [
    faction.id,
    faction.id === "burgundian-netherlands" && splitCombinedHabsburg
      ? reputation[faction.id] ?? reputation.habsburg ?? 0
      : reputation[faction.id] ?? 0
  ]));
}

function removeRetiredFactionKeys(table) {
  if (!table || typeof table !== "object" || Array.isArray(table)) return table;
  return Object.fromEntries(Object.entries(table).filter(([factionId]) => factionId !== "aztec"));
}

function migrateCombinedHabsburgFactionTable(table, { splitCombinedHabsburg = false } = {}) {
  const migrated = removeRetiredFactionKeys(table);
  if (splitCombinedHabsburg && migrated && migrated["burgundian-netherlands"] === undefined &&
      migrated.habsburg !== undefined) {
    migrated["burgundian-netherlands"] = migrated.habsburg?.factionId === "habsburg"
      ? { ...migrated.habsburg, factionId: "burgundian-netherlands" }
      : migrated.habsburg;
  }
  return migrated;
}

function migrateSafePassageTable(table, options = {}) {
  if (!table || typeof table !== "object" || Array.isArray(table)) return table;
  const migrated = migrateCombinedHabsburgFactionTable(table, options);
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
    passengerActive: migrateQuest(quests.passengerActive),
    passengerOffers: Object.fromEntries(Object.entries(quests.passengerOffers || {})
      .map(([key, quest]) => [key, migrateQuest(quest)]))
  };
}

function migrateConcurrentQuestMemory(quests) {
  if (!quests || typeof quests !== "object") return quests;
  const legacyPassenger = quests.active?.kind === "passenger" ? quests.active : null;
  if (legacyPassenger && quests.passengerActive) {
    throw new Error("Saved voyage has both legacy and concurrent passenger missions");
  }
  return {
    ...quests,
    active: legacyPassenger ? null : (quests.active || null),
    passengerActive: quests.passengerActive || legacyPassenger
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
    passengerActive: migrateQuest(quests.passengerActive, "passenger-active"),
    passengerOffers: Object.fromEntries(Object.entries(quests.passengerOffers || {})
      .map(([key, quest]) => [key, migrateQuest(quest, key)]))
  };
}

function migrateEastAsianMissionDialogue(quests) {
  if (!quests || typeof quests !== "object") return quests;
  const migrateQuest = (quest) => isEastAsianMissionQuest(quest) ? {
    ...quest,
    dialogue: eastAsianMissionDialogue({
      id: quest.eastAsianMissionId,
      startingFactionId: quest.eastAsianStartingFactionId
    })
  } : quest;
  return {
    ...quests,
    active: migrateQuest(quests.active),
    passengerActive: migrateQuest(quests.passengerActive),
    passengerOffers: Object.fromEntries(Object.entries(quests.passengerOffers || {})
      .map(([key, quest]) => [key, migrateQuest(quest)]))
  };
}

function migrateQuestItineraries(quests) {
  if (!quests || typeof quests !== "object") return quests;
  const migrateOffers = (offers) => Object.fromEntries(Object.entries(offers || {})
    .map(([key, quest]) => [key, migrateQuestItinerary(quest)]));
  return {
    ...quests,
    active: migrateQuestItinerary(quests.active),
    passengerActive: migrateQuestItinerary(quests.passengerActive),
    deliveryOffers: migrateOffers(quests.deliveryOffers),
    passengerOffers: migrateOffers(quests.passengerOffers),
    capturePortOffers: migrateOffers(quests.capturePortOffers),
    courtMissionOffers: migrateOffers(quests.courtMissionOffers)
  };
}

function migrateConquestFactionReferences(memory, { splitCombinedHabsburg = false } = {}) {
  const source = {
    ...createPortConquestMemory(),
    ...memory
  };
  const migrated = migrateRetiredFactionReferences(source);
  migrated.factionSuccessors = migrateRetiredFactionReferences(source.factionSuccessors || {});
  migrated.collapsedFactionIds = source.collapsedFactionIds.filter((factionId) => factionId !== "aztec");
  if (splitCombinedHabsburg && migrated.collapsedFactionIds.includes("habsburg") &&
      !migrated.collapsedFactionIds.includes("burgundian-netherlands")) {
    migrated.collapsedFactionIds.push("burgundian-netherlands");
  }
  if (splitCombinedHabsburg && migrated.factionSuccessors.habsburg &&
      !migrated.factionSuccessors["burgundian-netherlands"]) {
    migrated.factionSuccessors["burgundian-netherlands"] = migrated.factionSuccessors.habsburg;
  }
  if (!migrated.factionSuccessors.delhi && !migrated.collapsedFactionIds.includes("mughal")) {
    migrated.collapsedFactionIds.push("mughal");
  }
  migrated.treaties = (source.treaties || []).map(migrateRetiredFactionReferences);
  migrated.events = source.events.map((event, index) => ({
    ...migrateRetiredFactionReferences(event),
    id: event.id || `legacy-capture-${event.simMinute}-${event.portId || index}`,
    capitalCapturedFactionId: event.capitalCapturedFactionId ||
      event.collapsedFactionId ||
      null,
    peaceTreatyId: event.peaceTreatyId || null,
    collapsedFactionId: event.collapsedFactionId === "aztec" ? null : event.collapsedFactionId
  }));
  migrateAddedAgraOwnership(migrated);
  return migrated;
}

function migrateAddedAgraOwnership(conquest) {
  const firstSuccessor = conquest.factionSuccessors.delhi;
  if (!firstSuccessor) return conquest;

  let currentFactionId = firstSuccessor;
  const visited = new Set(["delhi"]);
  while (conquest.factionSuccessors[currentFactionId]) {
    if (visited.has(currentFactionId)) {
      throw new Error(`Faction succession cycle while adding Agra: ${currentFactionId}`);
    }
    visited.add(currentFactionId);
    currentFactionId = conquest.factionSuccessors[currentFactionId];
  }
  conquest.portFactionOverrides[CANONICAL_PORTS.AGRA.id] = currentFactionId;

  const legacyDelhiCapitalPortId = "city-24278";
  if (currentFactionId === "mughal" &&
      conquest.factionCapitalOverrides.mughal === legacyDelhiCapitalPortId) {
    conquest.factionCapitalOverrides.mughal = CANONICAL_PORTS.AGRA.id;
  }
  return conquest;
}

export function addPortNavigationWaypoint(state, {
  destinationTileId,
  destinationName,
  reason,
  questCargoGoodId = null,
  shipyardMaterialGoodId = null,
  tradeGoodId = null
}) {
  assertGameState(state);
  if (questCargoGoodId !== null && (
    reason !== PORT_NAVIGATION_REASON_QUEST_CARGO ||
    typeof questCargoGoodId !== "string" ||
    questCargoGoodId === ""
  )) {
    throw new Error("Quest cargo waypoint goods require a quest cargo navigation reason");
  }
  if (reason === PORT_NAVIGATION_REASON_QUEST_CARGO && questCargoGoodId === null) {
    throw new Error("Quest cargo waypoints require a trade good id");
  }
  if (tradeGoodId !== null && (
    reason !== PORT_NAVIGATION_REASON_TRADE_PRICE ||
    typeof tradeGoodId !== "string" ||
    tradeGoodId === ""
  )) {
    throw new Error("Trade-price waypoint goods require a trade-price navigation reason");
  }
  if (reason === PORT_NAVIGATION_REASON_TRADE_PRICE && tradeGoodId === null) {
    throw new Error("Trade-price waypoints require a trade good id");
  }
  if (shipyardMaterialGoodId !== null && (
    reason !== PORT_NAVIGATION_REASON_SHIPYARD_SUPPLY ||
    typeof shipyardMaterialGoodId !== "string" ||
    shipyardMaterialGoodId === ""
  )) {
    throw new Error("Shipyard material waypoint goods require a shipyard-supply navigation reason");
  }
  if (reason === PORT_NAVIGATION_REASON_SHIPYARD_SUPPLY && shipyardMaterialGoodId === null) {
    throw new Error("Shipyard-supply waypoints require a trade good id");
  }
  if (questCargoGoodId !== null) tradeGoodById(questCargoGoodId);
  if (shipyardMaterialGoodId !== null) tradeGoodById(shipyardMaterialGoodId);
  if (tradeGoodId !== null) tradeGoodById(tradeGoodId);
  const waypoint = {
    id: portNavigationWaypointId({
      destinationTileId,
      reason,
      questCargoGoodId,
      shipyardMaterialGoodId,
      tradeGoodId
    }),
    destinationTileId,
    destinationName,
    reason
  };
  if (questCargoGoodId !== null) waypoint.questCargoGoodId = questCargoGoodId;
  if (shipyardMaterialGoodId !== null) waypoint.shipyardMaterialGoodId = shipyardMaterialGoodId;
  if (tradeGoodId !== null) waypoint.tradeGoodId = tradeGoodId;
  assertOptionalNavigationWaypoint(waypoint);
  const waypoints = state.memory.navigation.optionalWaypoints;
  if (reason === PORT_NAVIGATION_REASON_QUEST_CARGO) {
    state.memory.navigation.optionalWaypoints = waypoints.filter((entry) => !(
      entry.reason === PORT_NAVIGATION_REASON_QUEST_CARGO &&
      entry.questCargoGoodId === questCargoGoodId
    ));
  }
  const currentWaypoints = state.memory.navigation.optionalWaypoints;
  const existingIndex = currentWaypoints.findIndex((entry) => entry.id === waypoint.id);
  if (existingIndex >= 0) currentWaypoints[existingIndex] = waypoint;
  else currentWaypoints.push(waypoint);
  return waypoint;
}

function portNavigationWaypointId({
  destinationTileId,
  reason,
  questCargoGoodId = null,
  shipyardMaterialGoodId = null,
  tradeGoodId = null
}) {
  if (reason === PORT_NAVIGATION_REASON_QUEST_CARGO && questCargoGoodId) {
    return `port:${destinationTileId}:quest-cargo:${questCargoGoodId}`;
  }
  if (reason === PORT_NAVIGATION_REASON_TRADE_PRICE && tradeGoodId) {
    return `port:${destinationTileId}:trade-price:${tradeGoodId}`;
  }
  if (reason === PORT_NAVIGATION_REASON_SHIPYARD_SUPPLY && shipyardMaterialGoodId) {
    return `port:${destinationTileId}:shipyard-supply:${shipyardMaterialGoodId}`;
  }
  return `port:${destinationTileId}`;
}

export function portNavigationReasonLabel(reason, goodId = null) {
  if (reason === "PLAYER HEADING" || reason === "SHIPYARD RUMOUR") {
    return PORT_NAVIGATION_REASON_NEW_SHIP;
  }
  if (reason === PORT_NAVIGATION_REASON_QUEST_CARGO) {
    return goodId ? `Quest cargo: ${tradeGoodById(goodId).label}` : "Quest cargo source";
  }
  if (reason === PORT_NAVIGATION_REASON_TRADE_PRICE && goodId) {
    return `Price tip: ${tradeGoodById(goodId).label}`;
  }
  if (reason === PORT_NAVIGATION_REASON_SHIPYARD_SUPPLY) {
    return goodId ? `Shipyard supply: ${tradeGoodById(goodId).label}` : "Shipyard supply";
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
  if (!state || typeof state !== "object" ||
      !Number.isFinite(state.activePlaySeconds) || state.activePlaySeconds < 0) {
    throw new Error(`Invalid active play time: ${state?.activePlaySeconds}`);
  }
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
  return advanceWorldDiplomacy(
    state.relations.diplomacy,
    currentMinute,
    playerWorldDiplomacyInfluence(state)
  );
}

export function nextGamePoliticsMinute(state) {
  if (!state?.relations?.diplomacy || !state?.relations?.papacy ||
      !state?.relations?.courts || !state?.relations?.authority || !state?.relations?.imperial) {
    throw new Error("Game state has no scheduled politics");
  }
  return Math.min(
    state.relations.diplomacy.nextEventMinute,
    nextPapalPoliticsMinute(state.relations.papacy),
    nextCourtPoliticsMinute(state.relations.courts),
    nextImperialPoliticsMinute(state.relations.imperial),
    nextSovereignAuthorityMinute(state.relations.authority),
    nextHistoricalSovereigntyMinute(state),
    nextConquistadorQuestMinute(state.memory.quests.conquistador)
  );
}

export function advanceGamePolitics(state, currentMinute, { portCities = [], cities = portCities } = {}) {
  assertGameState(state);
  assertSimulationMinute(currentMinute);
  const historicalTransitions = advanceHistoricalSovereignty(state, currentMinute, { portCities });
  const authority = advanceSovereignAuthority(
    state.relations.authority,
    state.relations.diplomacy,
    currentMinute
  );
  const papal = advancePapalPolitics(state.relations.papacy, state.relations.diplomacy, currentMinute, {
    papalAuthorityMultiplier: papalAuthorityResponseMultiplier(state.relations.authority),
    papalStatesActive: !state.memory.conquest.collapsedFactionIds.includes("papal-states"),
    playerCommissionContext: state.playerCharacter ? {
      playerFactionId: state.playerCharacter.nationalityId,
      playerReligionId: state.playerCharacter.religionId,
      papalReputation: factionReputation(state, "papal-states")
    } : null
  });
  const courts = advanceCourtPolitics(
    state.relations.courts,
    state.relations.diplomacy,
    currentMinute,
    { portCities }
  );
  const diplomacyEvents = advanceWorldDiplomacy(
    state.relations.diplomacy,
    currentMinute,
    playerWorldDiplomacyInfluence(state)
  );
  const imperialEvents = advanceImperialConstitution(
    state.relations.imperial,
    currentMinute,
    {
      authorityForCandidate: (factionId) => sovereignAuthorityScore(
        state.relations.authority,
        factionId
      ),
      relationBetween: (electorFactionId, candidateFactionId) => rawWorldDiplomacyBetween(
        state.relations.diplomacy,
        electorFactionId,
        candidateFactionId
      )
    }
  );
  const conquistador = advanceConquistadorCampaign(
    state.memory.quests.conquistador,
    state.memory.conquest,
    cities,
    currentMinute
  );
  let englishReformationConversions = 0;
  let englishReformationAuthorityEvents = Object.freeze([]);
  if (papal.englishReformation) {
    englishReformationAuthorityEvents = recordEnglishReformationAuthority(
      state.relations.authority,
      currentMinute
    );
    const convertedPlayer = convertEnglishCatholicCharacter(state.playerCharacter);
    if (convertedPlayer !== state.playerCharacter) {
      state.playerCharacter = convertedPlayer;
      englishReformationConversions += 1;
    }
    state.namedCrew = state.namedCrew.map((member) => {
      const converted = convertEnglishCatholicCharacter(member);
      if (converted !== member) englishReformationConversions += 1;
      return converted;
    });
    const questConversion = convertEnglishCatholicsInTree(state.memory.quests);
    if (questConversion.changed) {
      state.memory.quests = questConversion.value;
      englishReformationConversions += questConversion.count;
    }
  }
  return Object.freeze({
    diplomacyEvents: Object.freeze([
      ...historicalTransitions.map((transition) => transition.diplomacyEvent),
      ...authority.diplomacyEvents,
      ...diplomacyEvents,
      ...papal.diplomacyEvents,
      ...courts.diplomacyEvents
    ]),
    papalActions: papal.actions,
    papalMattersOpened: papal.mattersOpened,
    papalCommissionRevoked: papal.commissionRevoked,
    courtActions: courts.actions,
    courtMattersOpened: courts.mattersOpened,
    imperialEvents,
    authorityEvents: Object.freeze([
      ...authority.authorityEvents,
      ...englishReformationAuthorityEvents
    ]),
    conquistadorTransfers: conquistador.transfers,
    conquistadorRewardReady: conquistador.rewardReady,
    historicalTransitions,
    englishReformation: papal.englishReformation,
    englishReformationConversions
  });
}

export function recentGameDiplomacyEvents(state, limit = 3) {
  assertGameState(state);
  return recentDiplomacyEvents(state.relations.diplomacy, limit);
}

export function recentGamePapalActions(state, limit = 3) {
  assertGameState(state);
  if (!Number.isInteger(limit) || limit < 0) {
    throw new Error(`Invalid papal action history limit: ${limit}`);
  }
  return Object.freeze(state.relations.papacy.history.slice(0, limit));
}

export function recentGameCourtActions(state, limit = 3) {
  assertGameState(state);
  return recentCourtActions(state.relations.courts, limit);
}

export function recentGameAuthorityHeadlines(state, limit = 3) {
  assertGameState(state);
  return recentSovereignAuthorityHeadlines(state.relations.authority, limit);
}

export function sovereignAuthorityForState(state, factionId) {
  assertGameState(state);
  return sovereignAuthorityScore(state.relations.authority, factionId);
}

export function papalAuthorityForState(state) {
  assertGameState(state);
  return papalAuthorityScore(state.relations.authority);
}

export function papalAuthorityMultiplierForState(state) {
  assertGameState(state);
  return papalAuthorityResponseMultiplier(state.relations.authority);
}

export function reconcileCharacterForPapalAuthority(state, character, { portTileId = null } = {}) {
  assertGameState(state);
  const forcedConversions = state.memory.flags?.lutheranFactorPortTileIds;
  if (Number.isInteger(portTileId) && Array.isArray(forcedConversions) &&
      forcedConversions.includes(portTileId) && character?.religionId === "roman-catholic") {
    return Object.freeze({ ...character, religionId: "lutheran" });
  }
  return convertCatholicFactorForPapalAuthority(character, state.relations.authority);
}

export function deliverReligiousMissionLeg(state, city, context = {}) {
  assertGameState(state);
  const quest = questMemory(state).passengerActive;
  if (!quest || !isReligiousPassengerQuest(quest) ||
      !quest.itinerary || quest.itinerary.stops.length < 2) {
    throw new Error("Religious itinerary delivery requires an active multi-port mission");
  }
  if (!religiousMissionOffersLutheranConversion(quest)) {
    throw new Error("Religious itinerary delivery requires a Testament circulation mission");
  }
  const simMinute = context.simMinute ?? state.survival.lastMinute;
  assertSimulationMinute(simMinute);
  if (!questHasDestination(quest, city)) {
    const due = questDestinationStops(quest)[0];
    throw new Error(`Religious delivery is due at ${due?.name}, not ${cityLabel(city)}`);
  }
  const delivery = completeQuestItineraryStop(quest, city);
  const stop = delivery.stop;
  const authorityEvents = recordProtestantMissionAuthority(
    state.relations.authority,
    quest.originFactionId,
    simMinute,
    `${religiousMissionTitle(quest)}: ${stop.name}`
  );
  const imperialReligiousCirculation = typeof city.cityId === "string" &&
      imperialEstateForCityId(city.cityId)
    ? recordImperialReligiousCirculation(state.relations.imperial, {
        cityId: city.cityId,
        simMinute,
        source: quest.id
      })
    : null;
  const convertedFactors = Array.isArray(state.memory.flags.lutheranFactorPortTileIds)
    ? state.memory.flags.lutheranFactorPortTileIds
    : [];
  if (!convertedFactors.includes(city.tileId)) convertedFactors.push(city.tileId);
  state.memory.flags.lutheranFactorPortTileIds = convertedFactors;
  recordDecision(state, `quest.religious-delivery.${quest.id}.${delivery.stepNumber}`, 1);
  return Object.freeze({
    questId: quest.id,
    legNumber: delivery.stepNumber,
    legCount: delivery.stepCount,
    destinationName: stop.name,
    convertedFactorTileId: city.tileId,
    authorityEvents,
    imperialReligiousCirculation,
    final: delivery.final,
    nextDestinationName: delivery.remainingStops[0]?.name || null
  });
}

export function deliverEastAsianMissionLeg(state, city, context = {}) {
  assertGameState(state);
  const quest = questMemory(state).passengerActive;
  if (!quest || quest.eastAsianMissionId !== EAST_ASIAN_MISSION_PORTUGUESE_GUNS) {
    throw new Error("East Asian itinerary delivery requires the Portuguese guns mission");
  }
  const itinerary = ensurePortugueseGunsItinerary(quest, context.portCities);
  const simMinute = context.simMinute ?? state.survival.lastMinute;
  assertSimulationMinute(simMinute);
  if (!questHasDestination(quest, city)) {
    const available = questDestinationStops(quest).map((stop) => stop.name).join(", ");
    throw new Error(`Portuguese artillery delivery is due at ${available}, not ${cityLabel(city)}`);
  }
  const delivery = completeQuestItineraryStop(quest, city);
  const stop = delivery.stop;
  let batteryUpgrade = null;
  if (stop.upgradesBattery) {
    batteryUpgrade = upgradeShoreBattery(city, state.memory.flags);
    quest.eastAsianBatteryUpgrades.push(batteryUpgrade);
  }
  recordDecision(state, `quest.east-asian-delivery.${quest.id}.${stop.tileId}`, 1);
  return Object.freeze({
    questId: quest.id,
    legNumber: delivery.stepNumber,
    legCount: itinerary.length,
    destinationName: stop.name,
    batteryUpgrade,
    final: delivery.final,
    nextDestinationName: delivery.remainingStops[0]?.name || null,
    remainingDestinationNames: Object.freeze(delivery.remainingStops.map((entry) => entry.name))
  });
}

function ensurePortugueseGunsItinerary(quest, portCities) {
  if (quest.itinerary) {
    if (quest.itinerary.stops.length !== PORTUGUESE_GUNS_ITINERARY_REFS.length) {
      throw new Error(`Portuguese guns itinerary has ${quest.itinerary.stops.length} stops`);
    }
    if (!Array.isArray(quest.eastAsianBatteryUpgrades)) quest.eastAsianBatteryUpgrades = [];
    return quest.itinerary.stops;
  }
  if (!Array.isArray(portCities)) {
    throw new Error("Portuguese guns itinerary requires the current port list");
  }
  const stops = PORTUGUESE_GUNS_ITINERARY_REFS.map((reference, index) => {
    const port = requireCanonicalPort(portCities, reference, "Portuguese guns itinerary");
    return {
      key: cityKey(port),
      tileId: port.tileId,
      name: cityLabel(port),
      country: port.country || "",
      upgradesBattery: index > 0
    };
  });
  quest.itinerary = createQuestItinerary(stops, {
    mode: QUEST_ITINERARY_OPEN,
    openingStopTileId: stops[0].tileId
  });
  quest.eastAsianBatteryUpgrades = [];
  return stops;
}

export function resolveCatholicBibleInspection(state, {
  npcShipId,
  detectionRoll,
  sympathyRoll
}) {
  assertGameState(state);
  if (typeof npcShipId !== "string" || npcShipId === "") {
    throw new Error("Bible inspection requires an NPC ship id");
  }
  assertUnitRoll(detectionRoll, "Bible inspection detection");
  assertUnitRoll(sympathyRoll, "Bible inspection sympathy");
  const quest = questMemory(state).passengerActive;
  if (!quest || !religiousMissionIsCatholicContraband(quest)) return null;
  const inspected = Array.isArray(quest.catholicContrabandInspectedShipIds)
    ? quest.catholicContrabandInspectedShipIds
    : [];
  if (inspected.includes(npcShipId)) return null;
  inspected.push(npcShipId);
  quest.catholicContrabandInspectedShipIds = inspected;
  const outcome = detectionRoll >= 0.35
    ? "clean"
    : sympathyRoll < 0.3
      ? "sympathetic"
      : "caught";
  recordDecision(state, `quest.bible-inspection.${quest.id}.${outcome}`, 1);
  return Object.freeze({ questId: quest.id, npcShipId, outcome });
}

export function surrenderCatholicBibleContraband(state, questId, simMinute) {
  assertGameState(state);
  assertSimulationMinute(simMinute);
  const quests = questMemory(state);
  const quest = quests.passengerActive;
  if (!quest || quest.id !== questId || !religiousMissionIsCatholicContraband(quest)) {
    throw new Error("Surrendered Bibles do not match the active contraband mission");
  }
  quests.failed[quest.id] = { reason: "bibles-seized", simMinute };
  quests.passengerActive = null;
  recordDecision(state, `quest.fail.bibles-seized.${quest.id}`, 1);
  return quest;
}

export function recordNavalAuthorityForState(state, outcome) {
  assertGameState(state);
  return recordNavalAuthorityOutcome(state.relations.authority, outcome);
}

export function recordPortCaptureAuthorityForState(state, outcome) {
  assertGameState(state);
  return recordPortCaptureAuthority(state.relations.authority, outcome);
}

export function recordPeaceTreatyAuthorityForState(state, outcome) {
  assertGameState(state);
  return recordPeaceTreatyAuthority(state.relations.authority, outcome);
}

export function recordColonyAuthorityForState(state, factionId, cityName, simMinute, {
  challengesPapalAuthority = false
} = {}) {
  assertGameState(state);
  const events = [];
  const event = recordColonyAuthority(state.relations.authority, factionId, cityName, simMinute);
  if (event) events.push(event);
  if (challengesPapalAuthority) {
    events.push(...recordProtestantMissionAuthority(
      state.relations.authority,
      factionId,
      simMinute,
      `Founded ${cityName}`
    ));
  }
  return Object.freeze(events);
}

export function recordPapalMissionAuthorityForState(state, simMinute, detail) {
  assertGameState(state);
  return recordPapalMissionAuthority(state.relations.authority, simMinute, detail);
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

export function pendingDiscoveryPortDialogue(state) {
  assertGameState(state);
  for (const discoveryId of state.memory.pendingDiscoveryPortDialogueIds) {
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

  const quantity = physicalCargoQuantityCapacityForGood(state, good.id);
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
  const navigation = state?.memory?.navigation;
  assertCircumnavigationNavigation(navigation);
  if (!Number.isFinite(longitudeDeg)) throw new Error(`Invalid navigation longitude: ${longitudeDeg}`);
  if (navigation.lastLongitudeDeg === null) {
    navigation.lastLongitudeDeg = longitudeDeg;
    return false;
  }

  const delta = normalizeLongitudeDelta(longitudeDeg - navigation.lastLongitudeDeg);
  navigation.lastLongitudeDeg = longitudeDeg;
  navigation.cumulativeLongitudeDeg += delta;
  navigation.minimumCumulativeLongitudeDeg = Math.min(
    navigation.minimumCumulativeLongitudeDeg,
    navigation.cumulativeLongitudeDeg
  );
  navigation.maximumCumulativeLongitudeDeg = Math.max(
    navigation.maximumCumulativeLongitudeDeg,
    navigation.cumulativeLongitudeDeg
  );
  return navigation.maximumCumulativeLongitudeDeg - navigation.minimumCumulativeLongitudeDeg >=
    360 - CIRCUMNAVIGATION_COMPLETION_TOLERANCE_DEG;
}

function assertCircumnavigationNavigation(navigation) {
  if (!navigation || typeof navigation !== "object") {
    throw new Error("Circumnavigation progress requires navigation memory");
  }
  const values = [
    navigation.cumulativeLongitudeDeg,
    navigation.minimumCumulativeLongitudeDeg,
    navigation.maximumCumulativeLongitudeDeg
  ];
  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error("Circumnavigation progress requires finite cumulative longitudes");
  }
  if (navigation.lastLongitudeDeg !== null && !Number.isFinite(navigation.lastLongitudeDeg)) {
    throw new Error(`Invalid last navigation longitude: ${navigation.lastLongitudeDeg}`);
  }
  if (navigation.minimumCumulativeLongitudeDeg > navigation.cumulativeLongitudeDeg ||
      navigation.maximumCumulativeLongitudeDeg < navigation.cumulativeLongitudeDeg) {
    throw new Error("Circumnavigation progress has inconsistent longitude bounds");
  }
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

function selectedShipLoadoutPlan(state, stats, { minimumCrew = permanentCrewFloor(state) } = {}) {
  const effectiveStats = effectivePlayerShipStats(state, stats);
  const loadoutId = state.ship?.loadoutId || "short-haul";
  if (loadoutId !== CUSTOM_LOADOUT_ID) {
    return shipLoadoutPlan(effectiveStats, loadoutId, { minimumCrew });
  }
  if (!state.ship.loadoutTargets) throw new Error("Custom ship loadout has no saved targets");
  return fitShipCustomLoadoutPlan(effectiveStats, state.ship.loadoutTargets, {
    minimumCrew
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

export function playerShipReplacementCargoUsed(state, stats, context = {}) {
  assertGameState(state);
  if (!state.ship) throw new Error("Cannot preview a ship change without player ship state");
  const departures = namedCrewDepartures(state, context.departingNamedCrewIds);
  const crewFloor = permanentCrewFloor(state) - departures.length;
  const committedCrew = futurePermanentCrewFloor(state, {
    departingNamedCrewIds: departures.map((entry) => entry.member.id)
  });
  if (stats.crewCapacity < committedCrew) {
    throw new Error(
      `Cannot preview a ${stats.crewCapacity}-berth ship with ${committedCrew} permanent crew commitments`
    );
  }
  const plan = selectedShipLoadoutPlan(state, stats, { minimumCrew: crewFloor });
  const crewAfterDepartures = state.ship.crew - departures.length;
  let usedTicks = 0;
  for (const [goodId, heldQuantity] of Object.entries(state.cargo)) {
    const good = goodById(goodId);
    const quantity = goodId === HARDTACK_GOOD_ID
      ? Math.min(heldQuantity, plan.foodUnits)
      : heldQuantity;
    usedTicks += occupiedCargoTicks(good.unitSize * quantity, `cargo.${goodId} space`);
  }
  usedTicks += crewHoldSpace(
    Math.max(crewFloor, Math.min(crewAfterDepartures, plan.crew))
  ) * CARGO_SPACE_TICKS_PER_UNIT;
  usedTicks += Math.min(state.ship.cannons, plan.cannons) * CARGO_SPACE_TICKS_PER_UNIT;
  usedTicks += freshWaterHoldUnits(
    Math.min(state.survival.freshWater, plan.waterUnits)
  ) * CARGO_SPACE_TICKS_PER_UNIT;
  for (const units of Object.values(state.memory.cargoReservations)) {
    usedTicks += units * CARGO_SPACE_TICKS_PER_UNIT;
  }
  return cargoUnitsFromTicks(usedTicks);
}

export function futurePermanentCrewFloor(state, context = {}) {
  const departures = namedCrewDepartures(state, context.departingNamedCrewIds);
  const current = permanentCrewFloor(state) - departures.length;
  const futureRecruits = [
    state.memory?.quests?.pirateCaptive?.active,
    state.memory?.quests?.castaway?.active
  ].filter((traveler) => (
    traveler?.familySurvived === false &&
    (traveler.rescueType !== "pirate-captive" || traveler.stage === "homecoming" ||
      pirateCaptiveIsAboard(traveler)) &&
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
  const replacement = replacePlayerShipWithNamedCrewDepartures(state, stats, context, () => (
    replacePlayerShipAndRecord(state, city, stats, context, {
      description: tradeInValue > 0
        ? `Purchase ${label}; ${tradeInValue} doubloon vessel trade-in`
        : `Purchase ${label}`,
      amount: -netPrice,
      costBasis: Math.max(0, netPrice)
    }, () => {
      state.doubloons -= netPrice;
      recordDecision(state, `ship.purchase.${cityKey(city)}.${stats.slug}`, 1);
    })
  ));
  return {
    slug: stats.slug,
    label,
    listingPrice,
    tradeInValue,
    netPrice,
    plan: replacement.value,
    departedNamedCrew: replacement.departedNamedCrew
  };
}

function playerWorldDiplomacyInfluence(state) {
  const homeFactionId = state.playerCharacter?.nationalityId || null;
  const homeFactionInGoodStanding = Boolean(
    homeFactionId &&
    homeFactionId !== NEUTRAL_FACTION_ID &&
    homeFactionId !== PIRATE_FACTION_ID &&
    factionReputation(state, homeFactionId) > HOSTILE_PORT_REPUTATION_THRESHOLD
  );
  const activeDiplomaticQuest = state.memory.quests?.active || null;
  const lockedPairKeys = [];
  if (isStatusEnvoyQuest(activeDiplomaticQuest)) {
    lockedPairKeys.push(diplomacyPairKey(
      activeDiplomaticQuest.statusProposal.vassalFactionId,
      activeDiplomaticQuest.statusProposal.suzerainFactionId
    ));
  } else if (isTributeEnvoyQuest(activeDiplomaticQuest)) {
    lockedPairKeys.push(diplomacyPairKey(
      activeDiplomaticQuest.originFactionId,
      activeDiplomaticQuest.targetFactionId
    ));
  }
  return {
    homeFactionId,
    homeFactionInGoodStanding,
    reputation: state.relations.factionReputation,
    decisions: state.memory.decisions,
    lockedPairKeys,
    imperialConstitution: state.relations.imperial
  };
}

export function awardPlayerShip(state, city, stats, description, context = {}) {
  assertGameState(state);
  if (!stats || typeof stats.slug !== "string") throw new Error("Ship award requires valid ship stats");
  if (typeof description !== "string" || description.trim() === "") {
    throw new Error("Ship award requires a ledger description");
  }
  const label = shipLabelForSlug(stats.slug);
  const replacement = replacePlayerShipWithNamedCrewDepartures(state, stats, context, () => (
    replacePlayerShipAndRecord(state, city, stats, context, {
      description,
      amount: 0,
      costBasis: 0
    })
  ));
  return {
    slug: stats.slug,
    label,
    price: 0,
    plan: replacement.value,
    departedNamedCrew: replacement.departedNamedCrew
  };
}

function replacePlayerShipWithNamedCrewDepartures(state, stats, context, replace) {
  if (typeof replace !== "function") throw new Error("Ship replacement requires an operation");
  const departures = namedCrewDepartures(state, context.departingNamedCrewIds);
  playerShipReplacementCargoUsed(state, stats, {
    departingNamedCrewIds: departures.map((entry) => entry.member.id)
  });
  const namedCrewBefore = state.namedCrew;
  const crewBefore = state.ship.crew;
  if (departures.length > 0) {
    const departingIds = new Set(departures.map((entry) => entry.member.id));
    state.namedCrew = namedCrewBefore.filter((member) => !departingIds.has(member.id));
    state.ship.crew -= departures.length;
    validateNamedCrew(state.namedCrew);
  }
  try {
    return {
      value: replace(),
      departedNamedCrew: departures.map((entry) => entry.member)
    };
  } catch (error) {
    state.namedCrew = namedCrewBefore;
    state.ship.crew = crewBefore;
    throw error;
  }
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

function namedCrewDepartures(state, memberIds = []) {
  if (memberIds === undefined) return [];
  if (!Array.isArray(memberIds)) throw new Error("Ship replacement crew departures must be an array");
  const uniqueIds = new Set(memberIds);
  if (uniqueIds.size !== memberIds.length) {
    throw new Error("Ship replacement crew departures contain duplicate crewmates");
  }
  const members = namedCrewMembers(state);
  return memberIds.map((memberId) => {
    if (typeof memberId !== "string" || memberId.trim() === "") {
      throw new Error("Ship replacement crew departure requires a crewmate id");
    }
    const index = members.findIndex((member) => member.id === memberId);
    if (index < 0) throw new Error(`Ship replacement cannot disembark unknown crewmate: ${memberId}`);
    return { index, member: members[index] };
  });
}

export function cargoUsedTicks(state) {
  assertShipResourceState(state);
  return cargoUsedTicksForValidatedState(state);
}

function cargoUsedTicksForValidatedState(state) {
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
    state.cargoCapacity * CARGO_SPACE_TICKS_PER_UNIT - cargoUsedTicksForValidatedState(state)
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
  const remainingCargo = {};
  let freeTicks = physicalCargoFreeTicks(state);
  for (const [goodId, available] of Object.entries(loot.cargo)) {
    const good = goodById(goodId);
    assertQuantity(available, `loot.${goodId}`);
    const goodTicks = good.unitSize * CARGO_SPACE_TICKS_PER_UNIT;
    const quantity = Math.min(available, Math.floor(freeTicks / goodTicks));
    if (quantity > 0) {
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
    const remaining = available - quantity;
    if (remaining > 0) remainingCargo[goodId] = remaining;
  }
  return { specie: loot.specie, cargo: receivedCargo, remainingCargo };
}

export function receivePortConquestPrize(state, city, amount, context = {}) {
  return receivePortAssaultPrize(state, city, amount, "conquest", context);
}

export function receivePortRaidPrize(state, city, amount, context = {}) {
  return receivePortAssaultPrize(state, city, amount, "raid", context);
}

function receivePortAssaultPrize(state, city, amount, kind, context) {
  assertGameState(state);
  if (kind !== "conquest" && kind !== "raid") throw new Error(`Invalid port assault kind: ${kind}`);
  if (!city || !Number.isInteger(city.tileId)) throw new Error(`Port ${kind} prize requires a city`);
  if (!Number.isInteger(amount) || amount < 0) throw new Error(`Invalid port ${kind} prize: ${amount}`);
  state.doubloons += amount;
  recordLedgerEntry(state, city, context, {
    kind,
    description: kind === "conquest"
      ? `${cityLabel(city)} conquest prize`
      : `${cityLabel(city)} plunder`,
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

export function issueSovereignWarLoanForState(state, city, ports, context = {}) {
  assertGameState(state);
  const simMinute = context.simMinute ?? null;
  assertSimulationMinute(simMinute);
  const offer = state.memory.quests.sovereignWarLoan.offer;
  if (!offer || city?.portId !== offer.capitalPortId || city?.tileId !== offer.capitalTileId) {
    throw new Error("A sovereign war loan must be issued at the offering capital");
  }
  const ruler = rulerAtMinute(offer.borrowerFactionId, simMinute);
  if (!ruler) throw new Error(`War-loan borrower has no ruler: ${offer.borrowerFactionId}`);
  const contract = fundSovereignWarLoan(state.memory.quests.sovereignWarLoan, {
    ports,
    borrowerRulerName: ruler.displayName,
    simMinute,
    doubloons: state.doubloons,
    relationBetween: (factionAId, factionBId) => worldDiplomacyBetween(
      state.relations.diplomacy,
      factionAId,
      factionBId
    )
  });
  state.doubloons -= SOVEREIGN_WAR_LOAN_PRINCIPAL;
  recordLedgerEntry(state, city, context, {
    kind: "quest",
    description: `${factionById(contract.borrowerFactionId).name} war-loan advance`,
    goodId: null,
    quantity: 0,
    amount: -SOVEREIGN_WAR_LOAN_PRINCIPAL,
    costBasis: SOVEREIGN_WAR_LOAN_PRINCIPAL,
    pnl: null
  });
  return Object.freeze({ contract, balance: state.doubloons });
}

export function resolveSovereignWarLoanForState(
  state,
  ports,
  simMinute,
  { borrowerSolvencyRatio = null, renegotiationSecurity = null } = {}
) {
  assertGameState(state);
  assertSimulationMinute(simMinute);
  return resolveSovereignWarLoan(state.memory.quests.sovereignWarLoan, {
    relationBetween: (factionAId, factionBId) => worldDiplomacyBetween(
      state.relations.diplomacy,
      factionAId,
      factionBId
    ),
    ports,
    treaties: state.memory.conquest.treaties,
    collapsedFactionIds: state.memory.conquest.collapsedFactionIds,
    borrowerSolvencyRatio,
    renegotiationSecurity,
    simMinute
  });
}

export function acceptSovereignWarLoanSecurityForState(state, city, simMinute) {
  assertGameState(state);
  assertSimulationMinute(simMinute);
  requiredWarLoanAudienceAtCapital(state, city, SOVEREIGN_WAR_LOAN_RENEGOTIATION_READY);
  return acceptSovereignWarLoanRenegotiation(
    state.memory.quests.sovereignWarLoan,
    simMinute
  );
}

export function holdSovereignWarLoanBondForState(state, city, simMinute) {
  assertGameState(state);
  assertSimulationMinute(simMinute);
  requiredWarLoanAudienceAtCapital(state, city, SOVEREIGN_WAR_LOAN_RENEGOTIATION_READY);
  return holdSovereignWarLoanBond(
    state.memory.quests.sovereignWarLoan,
    simMinute
  );
}

export function advanceSovereignWarLoanCreditForState(
  state,
  ports,
  simMinute,
  { borrowerSolvencyRatio = null, securityPortLiquidityRatio = null } = {}
) {
  assertGameState(state);
  assertSimulationMinute(simMinute);
  return advanceSovereignWarLoanAfterPeace(state.memory.quests.sovereignWarLoan, {
    ports,
    collapsedFactionIds: state.memory.conquest.collapsedFactionIds,
    borrowerSolvencyRatio,
    securityPortLiquidityRatio,
    simMinute
  });
}

export function receiveSovereignWarLoanRepayment(state, city, context = {}) {
  assertGameState(state);
  const simMinute = context.simMinute ?? null;
  assertSimulationMinute(simMinute);
  const contract = requiredWarLoanAudienceAtCapital(state, city, SOVEREIGN_WAR_LOAN_REPAYMENT_READY);
  state.doubloons += SOVEREIGN_WAR_LOAN_REPAYMENT;
  recordLedgerEntry(state, city, context, {
    kind: "quest",
    description: `${factionById(contract.borrowerFactionId).name} war-loan repayment`,
    goodId: null,
    quantity: 0,
    amount: SOVEREIGN_WAR_LOAN_REPAYMENT,
    costBasis: 0,
    pnl: SOVEREIGN_WAR_LOAN_REPAYMENT - SOVEREIGN_WAR_LOAN_PRINCIPAL
  });
  const history = completeSovereignWarLoanAudience(
    state.memory.quests.sovereignWarLoan,
    SOVEREIGN_WAR_LOAN_REPAYMENT_READY,
    simMinute
  );
  return Object.freeze({ contract, history, amount: SOVEREIGN_WAR_LOAN_REPAYMENT, balance: state.doubloons });
}

export function acknowledgeSovereignWarLoanDefault(state, city, context = {}) {
  assertGameState(state);
  const simMinute = context.simMinute ?? null;
  assertSimulationMinute(simMinute);
  const contract = requiredWarLoanAudienceAtCapital(state, city, SOVEREIGN_WAR_LOAN_DEFAULT_READY);
  const history = completeSovereignWarLoanAudience(
    state.memory.quests.sovereignWarLoan,
    SOVEREIGN_WAR_LOAN_DEFAULT_READY,
    simMinute
  );
  return Object.freeze({ contract, history, amount: 0, balance: state.doubloons });
}

function requiredWarLoanAudienceAtCapital(state, city, status) {
  const contract = state.memory.quests.sovereignWarLoan.contract;
  if (!contract || contract.status !== status) throw new Error(`No ${status} war-loan audience is ready`);
  const currentBorrowerCapital = city?.factionId === contract.borrowerFactionId &&
    city?.isFactionCapital === true && city?.capitalOfFactionId === contract.borrowerFactionId;
  const fallenIssueCapital = status === SOVEREIGN_WAR_LOAN_DEFAULT_READY &&
    city?.portId === contract.capitalPortId && city?.tileId === contract.capitalTileId;
  if (!currentBorrowerCapital && !fallenIssueCapital) {
    throw new Error(`War-loan audience requires the ${contract.borrowerFactionId} capital`);
  }
  return contract;
}

export function cargoFreeTicks(state) {
  assertShipResourceState(state);
  return cargoFreeTicksForValidatedState(state);
}

function cargoFreeTicksForValidatedState(state) {
  const reservation = loadoutProvisionReservation(state);
  const capacityTicks = state.cargoCapacity * CARGO_SPACE_TICKS_PER_UNIT;
  const reservedProvisionTicks = occupiedCargoTicks(
    reservation.missingFood + reservation.missingWater,
    "reserved provision cargo space"
  );
  return capacityTicks - cargoUsedTicksForValidatedState(state) - reservedProvisionTicks;
}

export function cargoFree(state) {
  return cargoUnitsFromTicks(cargoFreeTicks(state));
}

export function cargoHoldStatus(state) {
  assertShipResourceState(state);
  return cargoHoldStatusForValidatedState(state);
}

function cargoHoldStatusForValidatedState(state) {
  const capacityTicks = state.cargoCapacity * CARGO_SPACE_TICKS_PER_UNIT;
  const physicalUsedTicks = cargoUsedTicksForValidatedState(state);
  const freeForTradeTicks = Math.max(0, cargoFreeTicksForValidatedState(state));
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
  return good.id === HARDTACK_GOOD_ID ? provisionCargoFree(state, "food") : cargoFree(state);
}

export function cargoQuantityCapacityForGood(state, goodId) {
  assertShipResourceState(state);
  const good = tradeGoodById(goodId);
  const availableSpace = cargoFreeForGood(state, goodId);
  const availableTicks = availableCargoTicks(Math.max(0, availableSpace));
  return Math.max(0, Math.floor(availableTicks / (good.unitSize * CARGO_SPACE_TICKS_PER_UNIT)));
}

function physicalCargoQuantityCapacityForGood(state, goodId) {
  assertShipResourceState(state);
  const good = tradeGoodById(goodId);
  return Math.floor(physicalCargoFreeTicks(state) / (good.unitSize * CARGO_SPACE_TICKS_PER_UNIT));
}

export function fishCatchCargoCapacity(state) {
  return physicalCargoQuantityCapacityForGood(state, FISH_CARGO_GOOD_ID);
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
    return `x${formatDisplayQuantity(quantity)} / ${foodRationsForCargoQuantity(quantity)} RATIONS`;
  }
  if (good.category === "drink") {
    return `x${formatDisplayQuantity(quantity)} / ${Math.max(1, Math.round(
      quantity * WINE_PERSON_DAYS_PER_UNIT
    ))} DRINKS`;
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
  assertShipResourceState(state);
  return survivalStatusForValidatedState(state);
}

export function shipHudStatus(state) {
  assertShipResourceState(state);
  return Object.freeze({
    survival: survivalStatusForValidatedState(state),
    cargo: cargoHoldStatusForValidatedState(state),
    travelerManifest: shipTravelerManifestForValidatedState(state)
  });
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

export function shipEmergencyAidNeed(state, npcShipId, { allied = false } = {}) {
  assertGameState(state);
  assertNpcShipId(npcShipId);
  if (typeof allied !== "boolean") {
    throw new Error(`Invalid allied ship aid status: ${allied}`);
  }
  const status = survivalStatus(state);
  const needsFood = allied
    ? status.foodDays <= ALLIED_SHIP_AID_THRESHOLD_DAYS
    : status.foodRations <= 0;
  const needsWater = status.drinkDays <= (allied ? ALLIED_SHIP_AID_THRESHOLD_DAYS : 0);
  const alreadyReceived = (state.memory.decisions[emergencyShipAidKey(npcShipId)] || 0) > 0;
  return {
    needsFood,
    needsWater,
    alreadyReceived,
    available: !alreadyReceived && (
      (needsFood && provisionCargoFree(state, "food") >= 1 / FOOD_RATIONS_PER_HOLD_UNIT) ||
      (needsWater && provisionCargoFree(state, "water") >= 1)
    )
  };
}

export function receiveEmergencyShipAid(state, npcShipId, options = {}) {
  const need = shipEmergencyAidNeed(state, npcShipId, options);
  if (need.alreadyReceived) throw new Error(`Emergency aid already received from ship: ${npcShipId}`);
  if (!need.needsFood && !need.needsWater) {
    throw new Error("Emergency ship aid requires critically low food or water");
  }
  if (!need.available) throw new Error("Emergency ship aid requires free hold space");

  const desired = {
    food: need.needsFood ? EMERGENCY_SHIP_AID_UNITS : 0,
    water: need.needsWater ? EMERGENCY_SHIP_AID_UNITS : 0
  };
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

export function playerVesselLossOutcome({ crew, hitPoints }) {
  if (!Number.isInteger(crew) || crew < 0) throw new Error(`Invalid player crew: ${crew}`);
  if (!Number.isFinite(hitPoints) || hitPoints < 0) {
    throw new Error(`Invalid player hull points: ${hitPoints}`);
  }
  if (hitPoints <= 0) return "sunk";
  if (crew <= 0) return "crew-depleted";
  return null;
}

export function shipConsumption(state) {
  assertShipResourceState(state);
  return shipConsumptionForValidatedState(state);
}

function shipConsumptionForValidatedState(state) {
  if (!state.ship) {
    return {
      crew: 0,
      passengers: 0,
      livestock: 0,
      animalCompanionIds: [],
      restrictedAnimalFood: [],
      foodConsumers: 1,
      waterConsumers: 1
    };
  }
  const activeQuests = [
    state.memory.quests?.active || null,
    state.memory.quests?.passengerActive || null
  ].filter(Boolean);
  const passengers = travelerManifestCount(shipTravelerManifestForValidatedState(state));
  const livestock = activeQuests.reduce((total, quest) => (
    total + Math.max(0, Number(quest.livestockCount || quest.livestock?.count || 0))
  ), 0);
  const baseConsumers = state.ship.crew + passengers;
  const animalCompanions = animalCompanionConsumption(state.memory.animalCompanions);
  const questFood = activeQuests.reduce((total, quest) => (
    total + Math.max(0, Number(quest.consumption?.food || 0))
  ), 0);
  const questWater = activeQuests.reduce((total, quest) => (
    total + Math.max(0, Number(quest.consumption?.water || 0))
  ), 0);
  return {
    crew: state.ship.crew,
    passengers,
    livestock,
    animalCompanionIds: animalCompanions.companionIds,
    restrictedAnimalFood: animalCompanions.restrictedFood,
    foodConsumers: Math.max(
      1,
      baseConsumers + livestock * 2 + questFood + animalCompanions.foodConsumers
    ),
    waterConsumers: Math.max(
      1,
      baseConsumers + livestock * 2 + questWater + animalCompanions.waterConsumers
    )
  };
}

export function shipTravelerManifest(state) {
  assertShipResourceState(state);
  return shipTravelerManifestForValidatedState(state);
}

function shipTravelerManifestForValidatedState(state) {
  const groups = [];
  const questGroup = activeQuestTravelerGroup(state.memory.quests?.active || null);
  if (questGroup) groups.push(questGroup);
  const passengerGroup = activeQuestTravelerGroup(state.memory.quests?.passengerActive || null);
  if (passengerGroup) groups.push(passengerGroup);
  if (state.relations.papacy.pendingMatter?.status === PAPAL_MATTER_COMMISSIONED) {
    groups.push(createTravelerGroup(TRAVELER_KIND_ENVOY, 1));
  }
  const maltaQuest = state.memory.quests?.hospitallerMalta;
  if (maltaQuest?.stage === HOSPITALLER_MALTA_STAGE_PETITION ||
      maltaQuest?.stage === HOSPITALLER_MALTA_STAGE_RETURN_TO_ROME) {
    groups.push(createTravelerGroup(TRAVELER_KIND_ENVOY, 1));
  }
  const pirateCaptive = state.memory.quests?.pirateCaptive?.active || null;
  if (pirateCaptive && pirateCaptiveIsAboard(pirateCaptive)) {
    groups.push(createTravelerGroup(
      pirateCaptiveIsDetained(pirateCaptive) ? TRAVELER_KIND_CAPTIVE : TRAVELER_KIND_PASSENGER,
      1
    ));
  }
  const castaway = state.memory.quests?.castaway?.active || null;
  if (castaway && castaway.stage === "aboard") {
    groups.push(createTravelerGroup(TRAVELER_KIND_PASSENGER, 1));
  }
  if (state.memory.colonization.stage === COLONIZATION_STAGE_OUTBOUND) {
    groups.push(createTravelerGroup(TRAVELER_KIND_SETTLER, COLONIZATION_SETTLER_COUNT));
  }
  const conquistador = state.memory.quests?.conquistador;
  if (conquistador?.stage === CONQUISTADOR_STAGE_CAPTURE && conquistador.companyStrength > 0) {
    groups.push(createTravelerGroup(TRAVELER_KIND_SOLDIER, conquistador.companyStrength));
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
  if (quest.kind === "passenger") return createTravelerGroup(TRAVELER_KIND_PASSENGER, 1);
  if (isEnvoyQuest(quest)) {
    const count = quest.envoyCount ?? 1;
    if (!Number.isInteger(count) || count <= 0) {
      throw new Error(`Invalid envoy count: ${count}`);
    }
    return createTravelerGroup(TRAVELER_KIND_ENVOY, count);
  }
  const count = quest.passengerCount ?? quest.passengers?.length ?? 0;
  if (!Number.isInteger(count) || count < 0) {
    throw new Error(`Invalid quest passenger count: ${count}`);
  }
  return count > 0 ? createTravelerGroup(TRAVELER_KIND_PASSENGER, count) : null;
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
  const hardtackRations = foodRationsForCargoQuantity(state.cargo[HARDTACK_GOOD_ID] || 0);
  const neededRations = Math.max(0, targetRations - hardtackRations);
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
  assertSurvivalUpdateState(state);
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
  const waterDurationMultiplier = options.waterDurationMultiplier ?? 1;
  if (!Number.isFinite(waterDurationMultiplier) || waterDurationMultiplier <= 0) {
    throw new Error(`Invalid water duration multiplier: ${waterDurationMultiplier}`);
  }
  const foodActivityMultiplier = options.foodActivityMultiplier ?? 1;
  if (!Number.isFinite(foodActivityMultiplier) || foodActivityMultiplier < 1) {
    throw new Error(`Invalid food activity multiplier: ${foodActivityMultiplier}`);
  }
  const protectedCargoQuantities = validateProtectedCargoQuantities(
    options.protectedCargoQuantities
  );
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
  const consumption = shipConsumptionForValidatedState(state);
  if (!options.freshwater) {
    const wineEmergencyRecovered = state.survival.freshWater >= WINE_EMERGENCY_RECOVERY_WATER_UNITS;
    const waterUse = state.ship
      ? elapsedDays * consumption.waterConsumers / WATER_PERSON_DAYS_PER_UNIT / waterDurationMultiplier
      : elapsedDays * FRESH_WATER_USE_PER_DAY / waterDurationMultiplier;
    const availableRainWater = elapsedDays * rainfall *
      RAIN_WATER_COLLECTION_PER_CONSUMER_DAY * consumption.waterConsumers;
    const rainWaterUsed = Math.min(waterUse, availableRainWater);
    const water = consumeDrinkSupply(state, waterUse - rainWaterUsed, {
      allowCargoReserve: !state.ship,
      allowWine: Boolean(state.ship),
      protectedCargoQuantities
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

  result.changed = consumeRestrictedAnimalFood(
    state,
    consumption.restrictedAnimalFood,
    elapsedDays,
    result.foodConsumed,
    protectedCargoQuantities
  ) || result.changed;
  state.survival.foodRationDebt += elapsedDays * consumption.foodConsumers *
    foodActivityMultiplier / foodDurationMultiplier;
  while (state.survival.foodRationDebt >= 1) {
    const consumed = consumeCheapestFoodRation(state, protectedCargoQuantities);
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
  return cargoCostBasisForValidatedState(state, goodId);
}

function cargoCostBasisForValidatedState(state, goodId) {
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

export function stealNonQuestShipPossession(state, {
  protectedCargoQuantities = {},
  protectedItemIds = [],
  selectionRoll
} = {}) {
  assertGameState(state);
  if (!protectedCargoQuantities || typeof protectedCargoQuantities !== "object" ||
      Array.isArray(protectedCargoQuantities)) {
    throw new Error("Ship theft requires protected cargo quantities");
  }
  if (!Array.isArray(protectedItemIds) || protectedItemIds.some((id) => typeof id !== "string")) {
    throw new Error("Ship theft requires protected item ids");
  }
  if (!Number.isFinite(selectionRoll) || selectionRoll < 0 || selectionRoll >= 1) {
    throw new Error(`Invalid ship theft selection roll: ${selectionRoll}`);
  }
  const protectedItems = new Set(protectedItemIds);
  const candidates = [];
  for (const [goodId, held] of Object.entries(state.cargo).sort(([a], [b]) => a.localeCompare(b))) {
    const protectedQuantity = protectedCargoQuantities[goodId] || 0;
    const available = Math.max(0, held - protectedQuantity);
    if (available <= 1e-6) continue;
    const good = goodById(goodId);
    candidates.push(Object.freeze({
      kind: "cargo",
      id: good.id,
      label: good.label,
      quantity: Math.min(1, available)
    }));
  }
  for (const [itemId, count] of Object.entries(state.inventory.items).sort(([a], [b]) => a.localeCompare(b))) {
    if (count <= 0 || protectedItems.has(itemId)) continue;
    const item = perkItemById(itemId);
    if (item.rewardOnly || item.perks.cargoCapacityFlat) continue;
    candidates.push(Object.freeze({ kind: "item", id: item.id, label: item.label, quantity: 1 }));
  }
  if (candidates.length === 0) return null;
  const stolen = candidates[Math.min(candidates.length - 1, Math.floor(selectionRoll * candidates.length))];
  if (stolen.kind === "cargo") {
    const held = state.cargo[stolen.id];
    const basis = cargoCostBasis(state, stolen.id);
    const remaining = held - stolen.quantity;
    if (remaining > 1e-6) {
      state.cargo[stolen.id] = remaining;
      if (basis.known) state.accounts.cargoCostBasis[stolen.id] = basis.total * remaining / held;
    } else {
      delete state.cargo[stolen.id];
      delete state.accounts.cargoCostBasis[stolen.id];
    }
  } else {
    delete state.inventory.items[stolen.id];
    refreshPlayerPerkCargoCapacity(state);
  }
  recordDecision(state, `ship-theft.${stolen.kind}.${stolen.id}`, 1);
  return stolen;
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

export function deliverQuestCargoRequirement(
  state,
  city,
  goodId,
  requiredQuantity,
  requirementId,
  context = {}
) {
  assertGameState(state);
  const deliverableQuantity = questCargoDeliverableQuantity(
    state,
    requirementId,
    requiredQuantity,
    state.cargo[goodId] || 0
  );
  if (deliverableQuantity <= 0) {
    throw new Error(`No ${goodById(goodId).label} is available for ${requirementId}`);
  }
  const delivery = deliverQuestCargo(
    state,
    city,
    goodId,
    deliverableQuantity,
    requirementId,
    context
  );
  const progress = recordQuestCargoDelivery(
    state,
    requirementId,
    deliverableQuantity,
    requiredQuantity
  );
  return Object.freeze({ ...delivery, ...progress });
}

export function shipItemRows(state) {
  assertGameState(state);
  const rows = SHIP_ITEM_CATALOG
    .map((item) => {
      if (item.id === SHIP_ITEM_FISHING_NET) return fishingNetItemRow(state);
      if (item.id === SHIP_ITEM_CANNON_EQUIPMENT) return cannonEquipmentItemRow(state);
      if (item.id === SHIP_ITEM_WHALE_HARPOON) return whaleHarpoonItemRow(state);
      const summary = perkItemSummary(item.id);
      return {
        ...item,
        effect: summary.effectLabels.join(" / "),
        quantity: state.inventory.items[item.id] || 0
      };
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
  if (roanokeCluesAboard(state.memory.colonization)) {
    rows.push({
      id: ROANOKE_CLUES_ITEM_ID,
      label: "Roanoke Clues",
      detail: "A rubbing of the word CROATOAN and notes on the dismantled houses, opened chests, and missing colonists.",
      quantity: 1,
      questItem: true,
      discardable: false
    });
  }
  const warLoan = state.memory.quests.sovereignWarLoan.contract;
  if (warLoan) {
    const borrower = factionById(warLoan.borrowerFactionId);
    const enemy = factionById(warLoan.enemyFactionId);
    const security = warLoan.security;
    const carriesAcceptedCustomsAssignment = security?.acceptedMinute !== null &&
      security?.acceptedMinute !== undefined;
    const resultDetail = warLoan.status === SOVEREIGN_WAR_LOAN_REPAYMENT_READY
      ? `The treasury owes ${SOVEREIGN_WAR_LOAN_REPAYMENT.toLocaleString("en-US")} doubloons.`
      : warLoan.status === SOVEREIGN_WAR_LOAN_DEFAULT_READY
        ? "The named war ended with the sovereign's treasury unable to answer the bond."
        : warLoan.status === SOVEREIGN_WAR_LOAN_RENEGOTIATION_READY
          ? `The court offers the customs of ${security.portName} in security for the debt.`
          : warLoan.status === SOVEREIGN_WAR_LOAN_SECURED
            ? `${security.portName} customs have gathered ${security.accruedAmount.toLocaleString("en-US")} of ${SOVEREIGN_WAR_LOAN_REPAYMENT.toLocaleString("en-US")} doubloons.`
            : warLoan.status === SOVEREIGN_WAR_LOAN_ARREARS
              ? "The original bond stands in arrears until the treasury recovers."
        : `Payable at ${SOVEREIGN_WAR_LOAN_REPAYMENT.toLocaleString("en-US")} doubloons upon victory, or upon an even peace if the sovereign's treasury remains answerable.`;
    rows.push({
      id: SOVEREIGN_WAR_LOAN_CONTRACT_ITEM_ID,
      label: carriesAcceptedCustomsAssignment
        ? `${borrower.adjective} Customs Assignment`
        : `${borrower.adjective} War-loan Indenture`,
      detail: `A sealed advance of ${SOVEREIGN_WAR_LOAN_PRINCIPAL.toLocaleString("en-US")} doubloons for the war with ${enemy.name}. ${resultDetail}`,
      quantity: 1,
      questItem: true,
      discardable: false,
      issuer: warLoan.borrowerRulerName,
      route: carriesAcceptedCustomsAssignment
        ? `Customs of ${security.portName}`
        : `War with ${enemy.name}`,
      simMinute: warLoan.issuedMinute
    });
  }
  return rows;
}

export function hasShipItem(state, itemId) {
  if (typeof itemId !== "string" || itemId.trim() === "") throw new Error(`Invalid ship item id: ${itemId}`);
  if (itemId === SOVEREIGN_WAR_LOAN_CONTRACT_ITEM_ID) {
    return sovereignWarLoanContractIsCarried(state.memory.quests.sovereignWarLoan);
  }
  const inventory = shipEquipmentInventory(state);
  if (itemId === SHIP_ITEM_FISHING_NET) {
    fishingNetById(inventory.fishingNetId);
    return true;
  }
  if (itemId === SHIP_ITEM_CANNON_EQUIPMENT) {
    cannonEquipmentById(inventory.cannonEquipmentId);
    return true;
  }
  if (itemId === SHIP_ITEM_WHALE_HARPOON) {
    if (inventory.whaleHarpoonId === null) return false;
    whaleHarpoonById(inventory.whaleHarpoonId);
    return true;
  }
  if (!inventory.items || typeof inventory.items !== "object" || Array.isArray(inventory.items)) {
    throw new Error("Ship item lookup requires a valid perk item inventory");
  }
  perkItemById(itemId);
  const quantity = inventory.items[itemId] ?? 0;
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 1) {
    throw new Error(`Invalid ship item quantity for ${itemId}: ${quantity}`);
  }
  return quantity > 0;
}

function shipEquipmentInventory(state) {
  if (!state || typeof state !== "object" || !state.inventory || typeof state.inventory !== "object") {
    throw new Error("Ship equipment query requires a valid inventory");
  }
  return state.inventory;
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

export function prepareEquipmentFactorPitch(state, economy, city, simMinute) {
  assertGameState(state);
  assertSimulationMinute(simMinute);
  if (!playerTradeAccess(state, city, { simMinute }).allowed) return null;
  return prepareEquipmentFactorPitchOffer({
    memory: state.memory,
    economy,
    city,
    simMinute,
    doubloons: state.doubloons,
    voyageSeed: state.voyageSeed,
    ship: state.ship,
    inventory: state.inventory
  });
}

export function declineEquipmentFactorPitch(state, pitch, simMinute) {
  assertGameState(state);
  assertSimulationMinute(simMinute);
  recordEquipmentFactorPitchDeclineOffer({
    memory: state.memory,
    pitch,
    simMinute
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
  memory[missionId] = item.id;
  return {
    ...grantPerkItemReward(state, item, city, context, {
      kind: "quest",
      description: `Mission gift: ${item.label}`
    }),
    chance,
    alreadyResolved: false
  };
}

export function grantGuaranteedMissionPerkItem(state, city, {
  missionId,
  itemId,
  description = null,
  context = {}
}) {
  assertGameState(state);
  if (!city || !Number.isInteger(city.tileId)) throw new Error("Guaranteed mission item requires a port city");
  if (typeof missionId !== "string" || missionId.trim() === "") {
    throw new Error("Guaranteed mission item requires a mission id");
  }
  const requestedItem = perkItemById(itemId);
  const memory = state.memory.missionItemGifts;
  if (!memory || typeof memory !== "object" || Array.isArray(memory)) {
    throw new Error("Game state requires mission item gift memory");
  }
  const existingItemId = memory[missionId];
  const item = existingItemId ? perkItemById(existingItemId) : requestedItem;
  memory[missionId] = item.id;
  if ((state.inventory.items[item.id] || 0) > 0) {
    return { item, guaranteed: true, alreadyResolved: true };
  }
  return {
    ...grantPerkItemReward(state, item, city, context, {
      kind: "quest",
      description: description || `Mission gift: ${item.label}`
    }),
    guaranteed: true,
    alreadyResolved: false
  };
}

export function maybeGrantDefeatedShipPerkItem(state, defeatedShip, {
  sunk = false,
  random = Math.random,
  context = {}
} = {}) {
  assertGameState(state);
  if (!defeatedShip || typeof defeatedShip !== "object" || Array.isArray(defeatedShip)) {
    throw new Error("Defeated-ship item reward requires a ship");
  }
  if (typeof defeatedShip.id !== "string" || defeatedShip.id.trim() === "") {
    throw new Error("Defeated-ship item reward requires a ship id");
  }
  if (!defeatedShip.currentPort || typeof defeatedShip.currentPort !== "object") {
    throw new Error(`Defeated ship has no equipment provenance: ${defeatedShip.id}`);
  }
  if (typeof sunk !== "boolean") throw new Error(`Invalid defeated-ship sunk flag: ${sunk}`);
  if (typeof random !== "function") throw new Error("Defeated-ship item reward requires a random source");
  const chance = sunk ? 0.035 : 0.08;
  const roll = random();
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) {
    throw new Error(`Invalid defeated-ship item roll: ${roll}`);
  }
  if (roll >= chance) return null;
  const item = missionGiftItem({
    city: defeatedShip.currentPort,
    identityKey: `defeated-ship|${defeatedShip.id}|${defeatedShip.slug || "unknown"}`,
    ownedItemIds: Object.keys(state.inventory.items).filter((id) => state.inventory.items[id] > 0)
  });
  if (!item) return null;
  return {
    ...grantPerkItemReward(state, item, null, context, {
      kind: "prize",
      description: `${sunk ? "Salvaged" : "Seized"} ${item.label} from ${defeatedShip.id}`
    }),
    chance
  };
}

function grantPerkItemReward(state, item, city, context, { kind, description }) {
  if ((state.inventory.items[item.id] || 0) > 0) {
    throw new Error(`Perk item reward is already aboard: ${item.label}`);
  }
  if (typeof kind !== "string" || kind.trim() === "" ||
      typeof description !== "string" || description.trim() === "") {
    throw new Error(`Invalid perk item reward ledger entry: ${item.id}`);
  }
  state.inventory.items[item.id] = 1;
  refreshPlayerPerkCargoCapacity(state);
  recordLedgerEntry(state, city, context, {
    kind,
    description,
    goodId: null,
    quantity: 1,
    amount: 0,
    costBasis: 0,
    pnl: null
  });
  return { item };
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
  if (existingItemId) {
    const existingItem = perkItemById(existingItemId);
    if ((state.inventory.items[existingItem.id] || 0) === 0) return existingItem;
    state.memory.missionItemGifts[missionId] = null;
    return null;
  }
  if (existingItemId === null) return null;
  const item = highValueMissionGiftItem({
    city,
    identityKey: `${missionId}|${state.playerCharacter?.id || state.playerCharacter?.name || "captain"}`,
    ownedItemIds: Object.keys(state.inventory.items).filter((id) => state.inventory.items[id] > 0)
  });
  state.memory.missionItemGifts[missionId] = item?.id || null;
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
  if (itemId !== null && typeof itemId !== "string") {
    throw new Error(`Invalid rescued traveler reward item: ${itemId}`);
  }
  const promisedItem = itemId === null ? null : perkItemById(itemId);
  if (!Object.prototype.hasOwnProperty.call(state.memory.missionItemGifts, missionId) ||
      state.memory.missionItemGifts[missionId] !== itemId) {
    throw new Error(`Rescued traveler reward item was not prepared: ${itemId || "cash-only"}`);
  }
  const itemAlreadyOwned = Boolean(promisedItem && (state.inventory.items[promisedItem.id] || 0) > 0);
  const item = itemAlreadyOwned ? null : promisedItem;
  state.doubloons += rewardDoubloons;
  if (item) {
    state.inventory.items[item.id] = 1;
    refreshPlayerPerkCargoCapacity(state);
  }
  recordLedgerEntry(state, city, context, {
    kind: "quest",
    description: `Reunited rescued traveler with family in ${cityLabel(city)}`,
    goodId: null,
    quantity: 0,
    amount: rewardDoubloons,
    costBasis: null,
    pnl: null
  });
  if (item) {
    recordLedgerEntry(state, city, context, {
      kind: "quest",
      description: `Family gift: ${item.label}`,
      goodId: null,
      quantity: 1,
      amount: 0,
      costBasis: 0,
      pnl: null
    });
  }
  return { rewardDoubloons, item, itemAlreadyOwned };
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
  return fishingNetById(shipEquipmentInventory(state).fishingNetId);
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
  return cannonEquipmentById(shipEquipmentInventory(state).cannonEquipmentId);
}

export function playerWhaleHarpoon(state) {
  const inventory = shipEquipmentInventory(state);
  return inventory.whaleHarpoonId === null
    ? null
    : whaleHarpoonById(inventory.whaleHarpoonId);
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
  const id = assertFactionId(factionId);
  const reputation = state?.relations?.factionReputation;
  if (!reputation || typeof reputation !== "object" ||
      !Object.prototype.hasOwnProperty.call(reputation, id)) {
    throw new Error(`Missing faction reputation: ${id}`);
  }
  const value = reputation[id];
  assertReputationValue(value, `reputation.${id}`);
  return value;
}

export function sovereignTradeOpenToFaction(state, policyId, factionId) {
  if (!state || typeof state !== "object") throw new Error("Missing game state");
  const id = assertFactionId(factionId);
  const policy = sovereignTradePolicyById(policyId);
  const privilege = suzeraintyTradePrivilege(
    state.relations?.diplomacy?.suzerainties,
    id,
    policy.hostFactionId
  );
  return sovereignTradeGrantedToFaction(state.relations?.tradeAccessGrants, policyId, id) ||
    privilege?.sovereignMarketAccess === true;
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
  if (!Array.isArray(context.portCities)) {
    throw new Error("Envoy negotiations require the current port list");
  }
  let events = [];
  let statusResolution = null;
  let tributeCargo = null;
  if (isTreatyOfMadridQuest(active)) {
    events = [];
  } else if (isImperialElectionEnvoyQuest(active)) {
    events = [];
  } else if (isTributeEnvoyQuest(active)) {
    if (!tributeCargoHeld(state, active)) {
      throw new Error(`Sealed tribute cargo is missing for ${active.id}`);
    }
    tributeCargo = active.tributeCargoRequirements.map((requirement) => {
      state.cargo[requirement.goodId] -= requirement.quantity;
      if (state.cargo[requirement.goodId] <= 0) {
        delete state.cargo[requirement.goodId];
        delete state.accounts.cargoCostBasis[requirement.goodId];
      }
      return { ...requirement };
    });
    active.tributeDelivered = true;
    active.dialogue.negotiation =
      `${active.targetRulerName}'s officers accept the sealed tribute and enter it in the court register. ` +
      `The formal receipt may now be carried home.`;
  } else if (isStatusEnvoyQuest(active)) {
    statusResolution = resolveDiplomaticStatusProposal(
      state,
      active,
      context.portCities,
      (factionAId, factionBId) => diplomacyBetweenForState(state, factionAId, factionBId)
    );
    if (statusResolution.accepted) {
      const event = statusResolution.type === "seek-independence"
        ? releaseDiplomaticVassal(state.relations.diplomacy, {
            vassalFactionId: statusResolution.vassalFactionId,
            simMinute: context.simMinute,
            source: "envoy-treaty",
            relation: statusResolution.type === "offer-protection" ||
              statusResolution.type === "offer-submission"
              ? DIPLOMACY_FRIENDLY
              : DIPLOMACY_NEUTRAL
          })
        : establishDiplomaticSuzerainty(state.relations.diplomacy, {
            vassalFactionId: statusResolution.vassalFactionId,
            suzerainFactionId: statusResolution.suzerainFactionId,
            kind: statusResolution.desiredKind || SUZERAINTY_KIND_TRIBUTARY,
            simMinute: context.simMinute,
            source: "envoy-treaty",
            relation: DIPLOMACY_NEUTRAL
          });
      if (event) events.push(event);
      active.dialogue.negotiation = `${statusProposalText(statusResolution)} The court accepts the articles.`;
    } else {
      active.dialogue.negotiation = `${statusProposalText(statusResolution)} The court refuses the articles.`;
    }
  } else if (isCourtEnvoyQuest(active)) {
    deliverCourtCommission(state.relations.courts, {
      matterId: active.courtMatterId,
      questId: active.id,
      simMinute: context.simMinute
    });
  } else {
    const direction = active.kind === "friendly-envoy" ? "improve" : "worsen";
    events = adjustDiplomaticStance(
      state.relations.diplomacy,
      active.originFactionId,
      active.targetFactionId,
      direction,
      context.simMinute,
      { homeFactionId: state.playerCharacter?.nationalityId || null }
    );
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
    : active.kind === "hostile-envoy"
      ? ENVOY_TARGET_HOSTILE_REPUTATION
      : isImperialElectionEnvoyQuest(active)
        ? 2
      : isStatusEnvoyQuest(active)
        ? statusResolution.accepted ? 5 : -2
        : 4;
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
    statusResolution,
    tributeCargo,
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
  const faction = factionById(id);
  return {
    quest: active,
    factionId: id,
    untilMinute,
    days: ENVOY_SAFE_PASSAGE_DAYS,
    message: active.dialogue?.intercession ||
      "Hold your fire! This vessel carries an accredited envoy on a diplomatic mission.",
    warning: `Captain, do not attack ${faction.adjective} ships or ports while we travel under ` +
      "this protection. Our safe passage would be forfeit."
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

export function changePlayerReligion(state, religionId, simMinute) {
  assertGameState(state);
  assertSimulationMinute(simMinute);
  const character = state.playerCharacter;
  if (!character?.religionId) throw new Error("Player religion change requires a captain faith");
  const previousReligionId = character.religionId;
  religiousAttitude(previousReligionId, religionId);
  if (previousReligionId === religionId) {
    return Object.freeze({
      previousReligionId,
      religionId,
      reputationChanges: Object.freeze([])
    });
  }

  state.playerCharacter = { ...character, religionId };
  const reputationChanges = [];
  for (const faction of FACTIONS) {
    if (faction.id === NEUTRAL_FACTION_ID || faction.id === PIRATE_FACTION_ID) continue;
    const ruler = rulerAtMinute(faction.id, simMinute);
    if (!ruler) continue;
    const oldAttitude = religiousAttitude(ruler.religionId, previousReligionId);
    const newAttitude = religiousAttitude(ruler.religionId, religionId);
    const intendedDelta = Math.round((newAttitude - oldAttitude) * ruler.piety);
    if (intendedDelta === 0) continue;
    const before = factionReputation(state, faction.id);
    const after = adjustFactionReputation(state, faction.id, intendedDelta);
    if (after === before) continue;
    reputationChanges.push(Object.freeze({
      factionId: faction.id,
      delta: after - before,
      before,
      after
    }));
  }
  recordDecision(state, `religion.change.${previousReligionId}.${religionId}`, 1);
  return Object.freeze({
    previousReligionId,
    religionId,
    reputationChanges: Object.freeze(reputationChanges)
  });
}

export function reconcileFactionReputationAfterPlayerVassalage(state, factionId) {
  const current = factionReputation(state, factionId);
  if (current >= 0) return current;
  return adjustFactionReputation(state, factionId, -current);
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

function assertPortEntryStatusContext(state, simMinute, context) {
  if (context?.state !== state || context.simMinute !== simMinute ||
      !(context.diplomaticPassageFactionIds instanceof Set)) {
    throw new Error("Port-entry context does not match the requested state and time");
  }
  return context;
}

export function portEntryStatus(state, city, simMinute = 0, context = null) {
  if (!context) assertGameState(state);
  const evaluation = assertPortEntryStatusContext(
    state,
    simMinute,
    context || createPortEntryStatusContext(state, simMinute)
  );
  const factionId = city?.factionId || null;
  if (!factionId || factionId === NEUTRAL_FACTION_ID) {
    return {
      allowed: true,
      hostile: false,
      factionId,
      hostileByWar: false,
      hostileByStance: false,
      hostileStanceWaivedByStanding: false,
      hostileByStanding: false,
      catholicContraband: false,
      safePassage: false,
      canPurchaseSafePassage: false,
      passageRefusalActive: false,
      locked: false,
      lockUntilMinute: null,
      lockDaysRemaining: 0,
      canAttemptDisguise: false
    };
  }
  assertFactionId(factionId);
  const playerFactionId = evaluation.playerFactionId;
  const passengerQuest = state.memory?.quests?.passengerActive || null;
  const hostRuler = rulerAtMinute(factionId, simMinute);
  const catholicContraband = Boolean(
    passengerQuest &&
    passengerQuest.originTileId !== city.tileId &&
    religiousMissionIsCatholicContraband(passengerQuest) &&
    hostRuler &&
    isRomanCatholicReligion(hostRuler.religionId)
  );
  const relation = playerFactionId && playerFactionId !== factionId
    ? worldDiplomacyBetween(state.relations.diplomacy, playerFactionId, factionId)
    : null;
  const suzerainFactionId = suzerainForFaction(
    state.relations.diplomacy.suzerainties,
    factionId
  );
  const suzerainRelation = playerFactionId && suzerainFactionId
    ? worldDiplomacyBetween(state.relations.diplomacy, playerFactionId, suzerainFactionId)
    : null;
  const suzerainStanding = suzerainFactionId
    ? state.relations.factionReputation[suzerainFactionId]
    : null;
  const playerIsSuzerain = playerFactionId === suzerainFactionId;
  const suzerainProtectsEntry = Boolean(suzerainFactionId && playerFactionId && (
    playerIsSuzerain || (
      suzerainRelation !== DIPLOMACY_HOSTILE && suzerainRelation !== DIPLOMACY_WAR &&
      (suzerainStanding >= 0 || suzerainRelation === DIPLOMACY_FRIENDLY ||
        suzerainRelation === DIPLOMACY_ALLY)
    )
  ));
  const hostileByWar = Boolean(
    factionId !== PIRATE_FACTION_ID &&
    relation === DIPLOMACY_WAR &&
    !suzerainProtectsEntry
  );
  const hostileByStance = factionId !== PIRATE_FACTION_ID &&
    relation === DIPLOMACY_HOSTILE &&
    !suzerainProtectsEntry;
  const trustedPersonalStanding = state.relations.factionReputation[factionId] >=
    TRADE_PASS_REPUTATION_REQUIRED;
  const hostileStanceWaivedByStanding = hostileByStance && trustedPersonalStanding;
  const diplomaticPassage = evaluation.diplomaticPassageFactionIds.has(factionId);
  const safePassage = !catholicContraband && (diplomaticPassage || (
    !evaluation.playerWarship && state.relations.safePassageUntilMinute[factionId] > simMinute
  ));
  const passageRefusalActive = state.relations.safePassageRefusalUntilMinute[factionId] > simMinute;
  const hostileLocalStanding = state.relations.factionReputation[factionId] <=
    HOSTILE_PORT_REPUTATION_THRESHOLD;
  const hostileByStanding = hostileLocalStanding && !suzerainProtectsEntry;
  const canPurchaseSafePassage = !catholicContraband && !evaluation.playerWarship &&
    !safePassage &&
    !hostileByStanding &&
    (hostileByWar || (hostileByStance && !hostileStanceWaivedByStanding));
  const hostile = catholicContraband ||
    ((hostileByWar || (hostileByStance && !hostileStanceWaivedByStanding) || hostileByStanding) &&
      !safePassage);
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
    hostileStanceWaivedByStanding,
    hostileByStanding,
    catholicContraband,
    hostileLocalStanding,
    suzerainFactionId,
    suzerainProtectsEntry,
    safePassage,
    canPurchaseSafePassage,
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
  const portableItemIds = ownedPortableWeaponItemIds(state.inventory?.items || {});
  return ship.cannons >= 8 ||
    (ship.cannonCapacity >= 16 && ship.cannons >= 4) ||
    (ship.mass >= 100 && portableWeaponCombatRating(portableItemIds) >= 0.35);
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
  const evaluation = assertPortEntryStatusContext(
    state,
    simMinute,
    context || createPortEntryStatusContext(state, simMinute)
  );
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
  const entryStatus = portEntryStatus(state, city, simMinute);
  if (entryStatus.hostileByStanding) {
    throw new Error(`${cityLabel(city)} refuses to sell safe passage to a hated captain`);
  }
  if (!entryStatus.hostileByWar && !entryStatus.hostileByStance) {
    throw new Error(`${cityLabel(city)} has no reason to demand a passage toll`);
  }
  if (!entryStatus.canPurchaseSafePassage) {
    throw new Error(`${cityLabel(city)} cannot sell safe passage`);
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

export function recordAttackAgainstFaction(state, factionId, options = {}) {
  assertGameState(state);
  const id = assertFactionId(factionId);
  if (!options || typeof options !== "object" || Array.isArray(options) ||
      Object.keys(options).some((key) => key !== "lawfulWartimeAction") ||
      (options.lawfulWartimeAction !== undefined && typeof options.lawfulWartimeAction !== "boolean")) {
    throw new Error("Attack consequences require an optional lawful-wartime-action flag");
  }
  const lawfulWartimeAction = options.lawfulWartimeAction === true;
  if (id === NEUTRAL_FACTION_ID || id === PIRATE_FACTION_ID) return factionReputation(state, id);
  if (id === "papal-states") {
    const revoked = revokeActivePapalCommission(
      state.relations.papacy,
      Math.max(0, state.survival.lastMinute),
      "attacked-papacy"
    );
    if (revoked) {
      for (const protectedFactionId of revoked.safePassageFactionIds) {
        if (state.relations.safePassageUntilMinute[protectedFactionId] === revoked.safePassageUntilMinute) {
          delete state.relations.safePassageUntilMinute[protectedFactionId];
        }
      }
      recordDecision(state, `papal-commission.revoked.attack.${revoked.matterId}`, 1);
    }
  }
  revokeSafePassageAfterAttack(state, id);
  if (state.relations.lettersOfMarque[id]) {
    delete state.relations.lettersOfMarque[id];
    recordDecision(state, `letter-of-marque.revoked.${id}`, 1);
  }
  if (lawfulWartimeAction) {
    recordDecision(state, `privateering.attack.${id}`, 1);
    return factionReputation(state, id);
  }
  const before = factionReputation(state, id);
  const after = applyAttackReputationPenalty(state, id);
  if (after !== before) recordDecision(state, `reputation.attack.${id}`, 1);
  const emperorFactionId = state.relations.imperial.emperorFactionId;
  if (imperialEstateForFaction(id) &&
      state.relations.imperial.emperorOfficeVacant !== true &&
      emperorFactionId !== id) {
    const emperorBefore = factionReputation(state, emperorFactionId);
    const emperorAfter = adjustFactionReputation(
      state,
      emperorFactionId,
      IMPERIAL_PUBLIC_PEACE_REPUTATION_PENALTY
    );
    if (emperorAfter !== emperorBefore) {
      recordDecision(state, `reputation.imperial-public-peace.${emperorFactionId}`, 1);
    }
  }
  return after;
}

function migrateLawfulWartimeAttackReputation(state, reputation) {
  if (state.version >= 79) return reputation;
  const decisions = state.memory?.decisions || {};
  const migrated = { ...reputation };
  for (const faction of FACTIONS) {
    const attackCount = Number(decisions[`reputation.attack.${faction.id}`] || 0);
    const piracyCount = Number(decisions[`reputation.piracy.${faction.id}`] || 0);
    if (!Number.isFinite(attackCount) || attackCount <= 0 || piracyCount !== 0 ||
        migrated[faction.id] > HOSTILE_PORT_REPUTATION_THRESHOLD) {
      continue;
    }
    migrated[faction.id] = roundReputation(Math.max(
      migrated[faction.id] - SHIP_ATTACK_REPUTATION_PENALTY,
      HOSTILE_PORT_REPUTATION_THRESHOLD + 1
    ));
  }
  return migrated;
}

export function recordFriendlyFireAgainstFaction(state, factionId) {
  assertGameState(state);
  const id = assertFactionId(factionId);
  const before = factionReputation(state, id);
  if (id === NEUTRAL_FACTION_ID || id === PIRATE_FACTION_ID) {
    return { factionId: id, before, after: before, delta: 0 };
  }
  const after = adjustFactionReputation(state, id, FRIENDLY_FIRE_REPUTATION_PENALTY);
  const delta = roundReputation(after - before);
  if (delta !== 0) recordDecision(state, `reputation.friendly-fire.${id}`, 1);
  return { factionId: id, before, after, delta };
}

export function recordSelfDefenseAgainstFaction(state, factionId) {
  assertGameState(state);
  const id = assertFactionId(factionId);
  const before = factionReputation(state, id);
  if (id === NEUTRAL_FACTION_ID || id === PIRATE_FACTION_ID) {
    return { factionId: id, before, after: before, delta: 0 };
  }
  const after = adjustFactionReputation(state, id, SELF_DEFENSE_REPUTATION_PENALTY);
  const delta = roundReputation(after - before);
  if (delta !== 0) recordDecision(state, `reputation.self-defense.${id}`, 1);
  return { factionId: id, before, after, delta };
}

export function recordShipMercyForFaction(state, factionId) {
  assertGameState(state);
  const id = assertFactionId(factionId);
  const before = factionReputation(state, id);
  const after = adjustFactionReputation(state, id, SHIP_MERCY_REPUTATION_GAIN);
  const delta = roundReputation(after - before);
  if (delta !== 0) recordDecision(state, `reputation.ship-mercy.${id}`, 1);
  return { factionId: id, before, after, delta };
}

function revokeSafePassageAfterAttack(state, factionId) {
  let revoked = false;
  if (Object.hasOwn(state.relations.safePassageUntilMinute, factionId)) {
    delete state.relations.safePassageUntilMinute[factionId];
    revoked = true;
  }
  const activeQuest = questMemory(state).active;
  const envoyPassage = isEnvoyQuest(activeQuest)
    ? activeQuest.envoySafePassageUntilMinute
    : null;
  if (envoyPassage && Object.hasOwn(envoyPassage, factionId)) {
    delete envoyPassage[factionId];
    revoked = true;
  }
  if (revoked) recordDecision(state, `safe-passage.revoked.attack.${factionId}`, 1);
}

export function recordPiracyAgainstFaction(state, victimFactionId, options = {}) {
  assertGameState(state);
  const victimId = assertFactionId(victimFactionId);
  const includeVictim = options.includeVictim !== false;
  if (victimId === PIRATE_FACTION_ID) return {};

  const changes = {};
  for (const faction of FACTIONS) {
    if (faction.id === NEUTRAL_FACTION_ID || faction.id === PIRATE_FACTION_ID) continue;
    if (faction.id === victimId && !includeVictim) continue;
    const penalty = piracyReputationPenalty(state, faction.id, victimId);
    if (penalty === 0) continue;
    const before = factionReputation(state, faction.id);
    const after = faction.id === victimId
      ? applyAttackReputationPenalty(state, faction.id)
      : adjustFactionReputation(state, faction.id, penalty);
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

function piracyReputationPenalty(state, observerFactionId, victimFactionId) {
  if (observerFactionId === victimFactionId) return SHIP_ATTACK_REPUTATION_PENALTY;

  const diplomacy = state.relations.diplomacy;
  const observerPrincipalId = foreignPolicyPrincipal(diplomacy.suzerainties, observerFactionId);
  const victimPrincipalId = foreignPolicyPrincipal(diplomacy.suzerainties, victimFactionId);
  if (observerPrincipalId === victimPrincipalId) return PIRACY_ALLY_REPUTATION_PENALTY;

  const relation = worldDiplomacyBetween(diplomacy, observerFactionId, victimFactionId);
  let penalty = relation === DIPLOMACY_ALLY
    ? PIRACY_ALLY_REPUTATION_PENALTY
    : relation === DIPLOMACY_FRIENDLY
      ? PIRACY_FRIENDLY_REPUTATION_PENALTY
      : 0;

  if (observerFactionId === state.playerCharacter?.nationalityId) {
    const homePenalty = relation === DIPLOMACY_HOSTILE || relation === DIPLOMACY_WAR
      ? PIRACY_HOME_ENEMY_REPUTATION_PENALTY
      : PIRACY_HOME_REPUTATION_PENALTY;
    penalty = Math.min(penalty, homePenalty);
  }
  return penalty;
}

function applyAttackReputationPenalty(state, factionId) {
  const penalized = adjustFactionReputation(state, factionId, SHIP_ATTACK_REPUTATION_PENALTY);
  const hostile = Math.min(penalized, HOSTILE_PORT_REPUTATION_THRESHOLD);
  state.relations.factionReputation[factionId] = hostile;
  return hostile;
}

export function pirateHideoutsVisibleToPlayer(state) {
  return factionReputation(state, PIRATE_FACTION_ID) >= PIRATE_HIDEOUT_REPUTATION_REQUIRED;
}

export function hasLetterOfMarqueFrom(state, factionId) {
  assertGameState(state);
  const id = assertFactionId(factionId);
  return Boolean(state.relations.lettersOfMarque[id]);
}

export function privateeringAuthorityIssuerIdsAgainst(state, targetFactionId) {
  assertGameState(state);
  const targetId = assertFactionId(targetFactionId);
  return privateeringAuthorityIssuerIdsAgainstValidState(state, targetId);
}

function privateeringAuthorityIssuerIdsAgainstValidState(state, targetId) {
  if (targetId === NEUTRAL_FACTION_ID || targetId === PIRATE_FACTION_ID) return [];
  const issuerIds = [];
  for (const issuerId of Object.keys(state.relations.lettersOfMarque)) {
    assertFactionId(issuerId);
    if (worldDiplomacyBetween(state.relations.diplomacy, issuerId, targetId) === DIPLOMACY_WAR || (
      state.relations.imperial.emperorOfficeVacant !== true &&
      issuerId === state.relations.imperial.emperorFactionId &&
      imperialTargetIsAuthorized(state.relations.imperial, targetId, state.survival.lastMinute)
    )) {
      issuerIds.push(issuerId);
    }
  }
  return issuerIds;
}

export function hasPrivateeringAuthorityAgainst(state, targetFactionId) {
  return privateeringAuthorityIssuerIdsAgainst(state, targetFactionId).length > 0;
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

export function prepareProactiveLetterOfMarque(state, city, shipPower = 0) {
  const status = letterOfMarqueStatus(state, city, shipPower);
  if (!status.available || !status.eligible) return null;
  const enemyFactionIds = FACTIONS
    .map((faction) => faction.id)
    .filter((factionId) => (
      factionId !== status.factionId &&
      factionId !== NEUTRAL_FACTION_ID &&
      factionId !== PIRATE_FACTION_ID &&
      worldDiplomacyBetween(
        state.relations.diplomacy,
        status.factionId,
        factionId
      ) === DIPLOMACY_WAR
    ));
  if (enemyFactionIds.length === 0) return null;
  const decisionKey = `marque.factor-offer.${status.factionId}`;
  if ((state.memory.decisions[decisionKey] || 0) > 0) return null;
  recordDecision(state, decisionKey, 1);
  return Object.freeze({
    factionId: status.factionId,
    primaryEnemyFactionId: motivatingMarqueEnemyFactionId(
      state.relations.diplomacy,
      status.factionId,
      enemyFactionIds
    ),
    enemyFactionIds: Object.freeze(enemyFactionIds)
  });
}

function motivatingMarqueEnemyFactionId(diplomacy, factionId, enemyFactionIds) {
  const activeEnemies = new Set(enemyFactionIds);
  for (let index = diplomacy.history.length - 1; index >= 0; index -= 1) {
    const event = diplomacy.history[index];
    if (event.kind !== "war" && event.kind !== "alliance-war") continue;
    if (event.factionAId === factionId && activeEnemies.has(event.factionBId)) {
      return event.factionBId;
    }
    if (event.factionBId === factionId && activeEnemies.has(event.factionAId)) {
      return event.factionAId;
    }
  }
  return enemyFactionIds[0];
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
  const terms = playerTradeTerms(state, city, goodId, context);
  if (!terms.allowed) {
    throw new Error(`${cityLabel(city)} official market requires a valid Portuguese cartaz for ${row.good.label}`);
  }
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

const BULK_PORT_PURCHASE = Object.freeze({
  execute: executePortPurchase,
  maximum: maximumPortPurchaseQuantity,
  quote: quotePortPurchase
});
const REPEATED_PORT_PURCHASE = Object.freeze({
  execute: executeRepeatedPortPurchase,
  maximum: maximumRepeatedPortPurchaseQuantity,
  quote: quoteRepeatedPortPurchase
});

export function sellGood(state, economy, city, goodId, quantity = 1, context = {}) {
  return sellGoodWithPricing(
    state,
    economy,
    city,
    goodId,
    quantity,
    context,
    BULK_PORT_PURCHASE
  );
}

export function sellAllGood(state, economy, city, goodId, quantity, context = {}) {
  return sellGoodWithPricing(
    state,
    economy,
    city,
    goodId,
    quantity,
    context,
    REPEATED_PORT_PURCHASE
  );
}

function sellGoodWithPricing(state, economy, city, goodId, quantity, context, pricing) {
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
  const terms = playerTradeTerms(state, city, goodId, context);
  if (!terms.allowed) {
    throw new Error(`${cityLabel(city)} official market requires a valid Portuguese cartaz for ${row.good.label}`);
  }
  const total = pricing.quote(economy, city, goodId, quantity, terms.saleMultiplier);
  if (pricing.maximum(economy, city, goodId, quantity, terms.saleMultiplier) < quantity) {
    throw new Error(`${cityLabel(city)} market lacks specie for ${row.good.label}`);
  }
  const basis = cargoCostBasisForValidatedState(state, row.good.id);
  const soldCost = basis.known ? basis.total * quantity / held : 0;
  const pnl = basis.known ? total - soldCost : null;
  pricing.execute(economy, city, goodId, quantity, terms.saleMultiplier);
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

export function startPlayerShipyardInvestment(state, city, yard, context = {}) {
  assertGameState(state);
  return beginShipyardInvestment(state, city, yard, context.simMinute ?? 0);
}

export function payPlayerShipyardInvestment(state, city, context = {}) {
  assertGameState(state);
  const project = requiredFundingShipyardProject(state, city);
  if (project.capitalPaid) throw new Error("Shipyard seed capital is already paid");
  if (state.doubloons < SHIPYARD_INVESTMENT_CAPITAL) {
    throw new Error(`Need ${SHIPYARD_INVESTMENT_CAPITAL - state.doubloons} more doubloons`);
  }
  state.doubloons -= SHIPYARD_INVESTMENT_CAPITAL;
  project.capitalPaid = true;
  recordLedgerEntry(state, city, context, {
    kind: "shipyard",
    description: `Invest in ${project.portName} shipyard`,
    goodId: null,
    quantity: 0,
    amount: -SHIPYARD_INVESTMENT_CAPITAL,
    costBasis: SHIPYARD_INVESTMENT_CAPITAL,
    pnl: null
  });
  return project;
}

export function deliverPlayerShipyardMaterials(state, city, goodId) {
  assertGameState(state);
  const project = requiredFundingShipyardProject(state, city);
  const required = SHIPYARD_INVESTMENT_MATERIALS[goodId];
  if (!required) throw new Error(`Unknown shipyard investment material: ${goodId}`);
  const remaining = required - project.materialsDelivered[goodId];
  if (remaining <= 0) throw new Error(`${tradeGoodById(goodId).label} is already complete`);
  const delivered = Math.min(remaining, Math.floor(state.cargo[goodId] || 0));
  if (delivered <= 0) throw new Error(`No ${tradeGoodById(goodId).label} aboard`);
  trimCargoQuantity(state, goodId, (state.cargo[goodId] || 0) - delivered);
  project.materialsDelivered[goodId] += delivered;
  return { project, goodId, delivered, remaining: remaining - delivered };
}

export function finishPlayerShipyardInvestment(state, city, context = {}) {
  assertGameState(state);
  const project = requiredFundingShipyardProject(state, city);
  return completeShipyardInvestment(
    state.memory.shipyardInvestment,
    project,
    context.simMinute ?? 0
  );
}

export function receivePlayerShipyardDividends(state, city, amount, context = {}) {
  assertGameState(state);
  if (!playerBackedShipyardAtPort(state, city)) {
    throw new Error("No player-backed shipyard here");
  }
  if (!Number.isInteger(amount) || amount <= 0) throw new Error(`Invalid shipyard dividend: ${amount}`);
  state.doubloons += amount;
  recordLedgerEntry(state, city, context, {
    kind: "shipyard",
    description: `${cityLabel(city)} shipyard dividends`,
    goodId: null,
    quantity: 0,
    amount,
    costBasis: null,
    pnl: amount
  });
  return amount;
}

export function collectPlayerShipyardDividends(state, shipyardSystem, city, context = {}) {
  assertGameState(state);
  const yard = shipyardAtPort(shipyardSystem, city);
  if (!yard.playerBacking || yard.playerDividendBalance === 0) return null;
  if (!playerBackedShipyardAtPort(state, city)) {
    throw new Error("World shipyard backing is missing from the player's investment ledger");
  }
  const lifetimeTotal = yard.lifetimePlayerDividends;
  const payout = claimPlayerShipyardPayout(shipyardSystem, city);
  if (payout.amount <= 0) throw new Error("Player-backed shipyard payout is empty");
  receivePlayerShipyardDividends(state, city, payout.amount, context);
  return Object.freeze({ ...payout, lifetimeTotal });
}

function requiredFundingShipyardProject(state, city) {
  const project = shipyardInvestmentAtPort(state, city);
  if (!project || project.stage !== "funding") {
    throw new Error(`No shipyard project is being funded at ${cityLabel(city)}`);
  }
  return project;
}

export function createMarketUndoSnapshot(state, economy, city) {
  assertGameState(state);
  return Object.freeze({
    doubloons: state.doubloons,
    cargo: Object.freeze({ ...state.cargo }),
    cargoCostBasis: Object.freeze({ ...state.accounts.cargoCostBasis }),
    realizedPnl: state.accounts.realizedPnl,
    nextEntryId: state.accounts.nextEntryId,
    ledger: Object.freeze(state.accounts.ledger.map(copyLedgerEntry)),
    decisions: Object.freeze({ ...state.memory.decisions }),
    factionReputation: Object.freeze({ ...state.relations.factionReputation }),
    port: snapshotPortTradeState(economy, city)
  });
}

export function restoreMarketUndoSnapshot(state, economy, city, snapshot) {
  if (!snapshot || !Number.isFinite(snapshot.doubloons) || snapshot.doubloons < 0 ||
      !snapshot.cargo || !snapshot.cargoCostBasis || !Array.isArray(snapshot.ledger) ||
      !snapshot.decisions || !snapshot.factionReputation) {
    throw new Error("Invalid market undo snapshot");
  }
  state.doubloons = snapshot.doubloons;
  state.cargo = { ...snapshot.cargo };
  state.accounts.cargoCostBasis = { ...snapshot.cargoCostBasis };
  state.accounts.realizedPnl = snapshot.realizedPnl;
  state.accounts.nextEntryId = snapshot.nextEntryId;
  state.accounts.ledger = snapshot.ledger.map(copyLedgerEntry);
  state.memory.decisions = { ...snapshot.decisions };
  state.relations.factionReputation = { ...snapshot.factionReputation };
  restorePortTradeState(economy, city, snapshot.port);
  assertGameState(state);
  return {
    doubloons: state.doubloons,
    cargo: { ...state.cargo }
  };
}

function copyLedgerEntry(entry) {
  return Object.fromEntries(Object.entries(entry).map(([key, value]) => [
    key,
    Array.isArray(value) ? [...value] : value
  ]));
}

export function playerTradeAccess(state, city, context = {}) {
  assertGameState(state);
  const traderFactionId = state.playerCharacter?.nationalityId || NEUTRAL_FACTION_ID;
  const portFactionId = city?.factionId || NEUTRAL_FACTION_ID;
  const suzeraintyPrivilege = suzeraintyTradePrivilege(
    state.relations.diplomacy.suzerainties,
    traderFactionId,
    portFactionId
  );
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
    suzeraintyPrivilege,
    illicitAccessPolicyId: context.illicitTradeAccessPolicyId ?? null,
    disguisedEntry: context.disguisedEntry === true
  });
  const personalTradePass = access.policy?.kind === "access" &&
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

export function playerTradeTerms(state, city, goodId, context = {}) {
  assertGameState(state);
  tradeGoodById(goodId);
  const traderFactionId = state.playerCharacter?.nationalityId || NEUTRAL_FACTION_ID;
  const portFactionId = city?.factionId || NEUTRAL_FACTION_ID;
  const reputation = state.relations.factionReputation[portFactionId] || 0;
  const perks = gameStatePerkTotals(state);
  const access = playerTradeAccess(state, city, context);
  const crownSpiceAccess = playerPortugueseCrownSpiceAccess(
    state,
    city,
    goodId,
    context,
    access
  );
  const illicit = access.illicit || crownSpiceAccess.illicit;
  const terms = tradeTerms({
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
    suzeraintyPrivilege: suzeraintyTradePrivilege(
      state.relations.diplomacy.suzerainties,
      traderFactionId,
      portFactionId
    ),
    illicit,
    purchaseDiscountMultiplier: portPurchasePriceMultiplier(city),
    purchaseBargainMultiplier: perks.tradePurchaseMultiplier,
    saleBargainMultiplier: perks.tradeSaleMultiplier
  });
  return Object.freeze({
    ...terms,
    allowed: access.allowed && crownSpiceAccess.allowed,
    accessPolicyId: crownSpiceAccess.illicit
      ? crownSpiceAccess.policyId
      : access.policyId,
    enforcementFactionId: crownSpiceAccess.illicit
      ? PORTUGUESE_CROWN_SPICE_POLICY.hostFactionId
      : access.policy?.hostFactionId || access.portFactionId,
    illicitMarketReputationPenalty: crownSpiceAccess.illicit
      ? PORTUGUESE_CROWN_SPICE_POLICY.illicitMarketReputationPenalty
      : access.policy?.illicitMarketReputationPenalty || 0,
    crownSpiceAccess
  });
}

export function playerPortugueseCrownSpiceAccess(
  state,
  city,
  goodId,
  context = {},
  resolvedPortAccess = null
) {
  assertGameState(state);
  tradeGoodById(goodId);
  const traderFactionId = state.playerCharacter?.nationalityId || NEUTRAL_FACTION_ID;
  const portAccess = resolvedPortAccess || playerTradeAccess(state, city, context);
  const estadoPort = isPortugueseEstadoPort(city, state.relations.foreignSettlementExpulsions);
  const cartazValid = !estadoPort || traderFactionId === PORTUGUESE_FACTION_ID ||
    state.relations.portugueseCartaz.untilMinute > (context.simMinute ?? 0);
  return evaluatePortugueseCrownSpiceAccess({
    port: city,
    traderFactionId,
    foreignSettlementExpulsions: state.relations.foreignSettlementExpulsions,
    goodId,
    cartazValid,
    illicitAccessPolicyId: context.illicitTradeAccessPolicyId ?? null,
    otherIllicitAccess: portAccess.illicit,
    disguisedEntry: context.disguisedEntry === true
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
    reputationForFaction: (factionId) => state.relations.factionReputation[factionId] || 0,
    suzeraintyPrivilege: suzeraintyTradePrivilege(
      state.relations.diplomacy.suzerainties,
      traderFactionId,
      portFactionId
    )
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
  if (!isPortugueseEstadoPort(city, state.relations.foreignSettlementExpulsions)) {
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
  const fine = portugueseCartazEnforcementFine(state);
  const controlledCargo = portugueseControlledCargo(state.cargo);
  return Object.freeze({
    required,
    valid,
    recentlyInspected,
    relation,
    fine,
    canAffordFine: state.doubloons >= fine,
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

export function payPortugueseCartazFine(state, npcShipId, simMinute) {
  assertGameState(state);
  assertSimulationMinute(simMinute);
  const fine = portugueseCartazEnforcementFine(state);
  if (state.doubloons < fine) throw new Error(`Not enough doubloons to pay a ${fine} db fine`);
  state.doubloons -= fine;
  state.relations.portugueseCartaz.graceUntilMinute = simMinute + 7 * 24 * 60;
  recordDecision(state, "trade.portuguese-cartaz.fine", 1);
  recordPortugueseCartazInspection(state, npcShipId, simMinute);
  return Object.freeze({ fine, graceUntilMinute: state.relations.portugueseCartaz.graceUntilMinute });
}

function portugueseCartazEnforcementFine(state) {
  const neutralPermitFee = portugueseCartazFee({
    traderFactionId: NEUTRAL_FACTION_ID,
    relation: DIPLOMACY_NEUTRAL,
    cargoCapacity: state.cargoCapacity
  });
  if (!Number.isInteger(neutralPermitFee) || neutralPermitFee <= 0) {
    throw new Error(`Cartaz enforcement requires a foreign vessel permit fee: ${neutralPermitFee}`);
  }
  return portugueseCartazFine(neutralPermitFee);
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

export function payIllicitTradeFine(state, incidentId) {
  assertGameState(state);
  const incident = illicitTradeIncidentById(state.memory.illicitTradeEnforcement, incidentId);
  const fine = illicitTradeFine(incident);
  if (state.doubloons < fine) throw new Error(`Not enough doubloons to pay a ${fine} db customs fine`);
  state.doubloons -= fine;
  resolveIllicitTradeIncident(state.memory.illicitTradeEnforcement, incidentId);
  recordDecision(state, `trade.illicit.fine.${incident.policyId}`, 1);
  return Object.freeze({ fine, incident });
}

export function surrenderIllicitTradeCargo(state, incidentId) {
  assertGameState(state);
  const incident = illicitTradeIncidentById(state.memory.illicitTradeEnforcement, incidentId);
  const available = illicitCargoAvailable(incident, state.cargo);
  const removed = [];
  for (const [goodId, quantity] of Object.entries(available)) {
    trimCargoQuantity(state, goodId, Math.max(0, (state.cargo[goodId] || 0) - quantity));
    removed.push(Object.freeze({ goodId, quantity }));
  }
  if (removed.length === 0) throw new Error("No illicitly purchased cargo remains to surrender");
  resolveIllicitTradeIncident(state.memory.illicitTradeEnforcement, incidentId);
  recordDecision(
    state,
    `trade.illicit.cargo-surrendered.${incident.policyId}`,
    removed.reduce((sum, row) => sum + row.quantity, 0)
  );
  return Object.freeze(removed);
}

export function beginIllicitTradeEnforcementCombat(state, incidentId) {
  assertGameState(state);
  const incident = markIllicitTradeEnforcementCombat(state.memory.illicitTradeEnforcement, incidentId);
  recordDecision(state, `trade.illicit.enforcement-fought.${incident.policyId}`, 1);
  return incident;
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
  const availableQuantity = physicalCargoQuantityCapacityForGood(state, good.id);
  const quantity = Math.min(requestedQuantity, availableQuantity);
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

export function isCapturePortQuest(quest) {
  return quest?.kind === CAPTURE_PORT_MISSION_KIND;
}

export function isCaptureCapitalQuest(quest) {
  return quest?.kind === CAPTURE_CAPITAL_MISSION_KIND;
}

export function isCaptureCommissionQuest(quest) {
  return isCapturePortQuest(quest) || isCaptureCapitalQuest(quest);
}

export function capturePortMissionEligibility(state) {
  assertGameState(state);
  const ship = state.ship;
  const cannonArmed = (ship?.cannons || 0) >= CAPTURE_PORT_MISSION_MIN_CANNONS;
  const largeWarship = (ship?.crewCapacity || 0) >= PORT_CONQUEST_MIN_CREW;
  const enoughCrew = (ship?.crew || 0) >= PORT_CONQUEST_MIN_CREW;
  return {
    eligible: Boolean(ship && cannonArmed && largeWarship && enoughCrew),
    cannonArmed,
    largeWarship,
    enoughCrew,
    minimumCannons: CAPTURE_PORT_MISSION_MIN_CANNONS,
    minimumCrew: PORT_CONQUEST_MIN_CREW
  };
}

export function capturePortMissionOfferForCity(state, city, portCities, context = {}) {
  assertGameState(state);
  if (!Array.isArray(portCities)) throw new Error("Capture-port missions require a port list");
  const quests = questMemory(state);
  const existing = pendingCapturePortMissionOfferForCity(state, city);
  if (existing || quests.active || quests.passengerActive) return existing;

  const issuerFactionId = currentSovereignCapitalFactionId(city);
  if (!issuerFactionId || !hasLetterOfMarqueFrom(state, issuerFactionId)) return null;
  if (typeof context.sailingDistanceKm !== "function") {
    throw new Error("Capture-port missions require sailing distances");
  }
  const simMinute = context.simMinute ?? 0;
  assertSimulationMinute(simMinute);
  const offerPeriod = Math.floor(simMinute / CAPTURE_PORT_MISSION_ROLL_PERIOD_MINUTES);
  const rollKey = `${cityKey(city)}|${issuerFactionId}|${offerPeriod}`;
  if (quests.capturePortRolls[rollKey]) return null;
  const candidate = capturePortMissionTarget(
    state,
    city,
    portCities,
    context.sailingDistanceKm,
    issuerFactionId,
    simMinute,
    captureCommissionSelectionSeed(state, city, issuerFactionId, offerPeriod, "unsolicited")
  );
  if (!candidate) return null;

  quests.capturePortRolls[rollKey] = true;
  pruneQuestRolls(quests.capturePortRolls);
  const spawnChance = capturePortMissionSpawnChance(
    context.spawnChance,
    issuerFactionId,
    candidate
  );
  const identityKey = state.playerCharacter?.id || state.playerCharacter?.name || "captain";
  if (spawnChance < 1 &&
      seededFraction(`${state.voyageSeed}|${identityKey}|${rollKey}|capture-commission`) >= spawnChance) {
    return null;
  }
  return createCapturePortMissionOffer(
    state,
    city,
    issuerFactionId,
    candidate,
    simMinute,
    offerPeriod,
    { petitioned: false }
  );
}

export function captureCommissionPetitionOptionsForCity(
  state,
  city,
  portCities,
  context = {}
) {
  assertGameState(state);
  if (!Array.isArray(portCities)) {
    throw new Error("Capture-commission petitions require a port list");
  }
  const simMinute = context.simMinute ?? 0;
  assertSimulationMinute(simMinute);
  const issuerFactionId = currentSovereignCapitalFactionId(city);
  const quests = questMemory(state);
  if (!issuerFactionId || !hasLetterOfMarqueFrom(state, issuerFactionId) ||
      quests.active || quests.passengerActive || pendingCapturePortMissionOfferForCity(state, city)) {
    return [];
  }
  const enemyFactionIds = [...new Set(portCities
    .filter((port) => (
      captureCommissionTargetOwnershipEligible(state, city, issuerFactionId, port) &&
      port.factionId !== NEUTRAL_FACTION_ID
    ))
    .map((port) => port.factionId))]
    .sort((a, b) => factionById(a).name.localeCompare(factionById(b).name));
  if (!portCities.some((port) => (
    captureCommissionTargetOwnershipEligible(state, city, issuerFactionId, port)
  ))) return [];
  if (typeof context.sailingDistanceKm !== "function") {
    throw new Error("Capture-commission petitions require sailing distances");
  }
  const offerPeriod = Math.floor(simMinute / CAPTURE_PORT_MISSION_ROLL_PERIOD_MINUTES);
  const factionOptions = enemyFactionIds.map((targetFactionId) => {
    const candidate = capturePortMissionTarget(
      state,
      city,
      portCities,
      context.sailingDistanceKm,
      issuerFactionId,
      simMinute,
      captureCommissionSelectionSeed(
        state,
        city,
        issuerFactionId,
        offerPeriod,
        `petition-${targetFactionId}`
      ),
      targetFactionId
    );
    if (!candidate) return null;
    const refusedAtMinute = captureCommissionPetitionRefusedAtMinute(
      state,
      issuerFactionId,
      targetFactionId
    );
    const cooldownRemainingMinutes = refusedAtMinute === null
      ? 0
      : Math.max(
          0,
          CAPTURE_COMMISSION_PETITION_COOLDOWN_MINUTES - (simMinute - refusedAtMinute)
        );
    const faction = factionById(targetFactionId);
    return Object.freeze({
      petitionTargetId: targetFactionId,
      independentTarget: false,
      targetFactionId,
      targetFactionName: faction.name,
      targetFactionNoun: factionNounPhrase(targetFactionId),
      targetName: cityLabel(candidate.port),
      priorityKind: candidate.priorityKind,
      chance: captureCommissionPetitionChance(state, issuerFactionId, candidate),
      available: cooldownRemainingMinutes === 0,
      cooldownRemainingMinutes
    });
  }).filter(Boolean);
  const independentCandidate = capturePortMissionTarget(
    state,
    city,
    portCities,
    context.sailingDistanceKm,
    issuerFactionId,
    simMinute,
    captureCommissionSelectionSeed(
      state,
      city,
      issuerFactionId,
      offerPeriod,
      `petition-${CAPTURE_COMMISSION_INDEPENDENT_PETITION_ID}`
    ),
    NEUTRAL_FACTION_ID
  );
  if (!independentCandidate) return factionOptions;
  const independentRefusedAtMinute = captureCommissionPetitionRefusedAtMinute(
    state,
    issuerFactionId,
    CAPTURE_COMMISSION_INDEPENDENT_PETITION_ID
  );
  const independentCooldownRemainingMinutes = independentRefusedAtMinute === null
    ? 0
    : Math.max(
        0,
        CAPTURE_COMMISSION_PETITION_COOLDOWN_MINUTES -
          (simMinute - independentRefusedAtMinute)
      );
  return [...factionOptions, Object.freeze({
    petitionTargetId: CAPTURE_COMMISSION_INDEPENDENT_PETITION_ID,
    independentTarget: true,
    targetFactionId: null,
    targetFactionName: null,
    targetFactionNoun: null,
    targetName: cityLabel(independentCandidate.port),
    priorityKind: independentCandidate.priorityKind,
    chance: captureCommissionPetitionChance(state, issuerFactionId, independentCandidate),
    available: independentCooldownRemainingMinutes === 0,
    cooldownRemainingMinutes: independentCooldownRemainingMinutes
  })];
}

export function petitionCaptureCommission(
  state,
  city,
  portCities,
  petitionTargetId,
  context = {}
) {
  const independentTarget = petitionTargetId === CAPTURE_COMMISSION_INDEPENDENT_PETITION_ID;
  const enemyId = independentTarget ? null : assertFactionId(petitionTargetId);
  if (typeof context.random !== "function") {
    throw new Error("Capture-commission petitions require a random source");
  }
  const simMinute = context.simMinute ?? 0;
  assertSimulationMinute(simMinute);
  const issuerFactionId = currentSovereignCapitalFactionId(city);
  if (!issuerFactionId) {
    throw new Error("Capture-commission petitions may be heard only at a sovereign capital");
  }
  const petition = captureCommissionPetitionOptionsForCity(state, city, portCities, context)
    .find((option) => option.petitionTargetId === petitionTargetId);
  if (!petition) {
    throw new Error(`${petitionTargetId} is not a valid capture-commission petition`);
  }
  if (!petition.available) {
    throw new Error(`The court has already refused a recent petition concerning ${petitionTargetId}`);
  }
  const roll = context.random();
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) {
    throw new Error(`Invalid capture-commission petition roll: ${roll}`);
  }
  if (roll >= petition.chance) {
    state.memory.decisions[captureCommissionPetitionDecisionKey(issuerFactionId, petitionTargetId)] =
      simMinute + 1;
    return Object.freeze({
      granted: false,
      issuerFactionId,
      targetFactionId: enemyId,
      petitionTargetId,
      independentTarget,
      simMinute,
      chance: petition.chance,
      roll,
      offer: null
    });
  }

  const offerPeriod = Math.floor(simMinute / CAPTURE_PORT_MISSION_ROLL_PERIOD_MINUTES);
  const candidate = capturePortMissionTarget(
    state,
    city,
    portCities,
    context.sailingDistanceKm,
    issuerFactionId,
    simMinute,
    captureCommissionSelectionSeed(
      state,
      city,
      issuerFactionId,
      offerPeriod,
      `petition-${petitionTargetId}`
    ),
    independentTarget ? NEUTRAL_FACTION_ID : enemyId
  );
  if (!candidate) {
    throw new Error(`The court has no lawful capture target for ${petitionTargetId}`);
  }
  const offer = createCapturePortMissionOffer(
    state,
    city,
    issuerFactionId,
    candidate,
    simMinute,
    offerPeriod,
    { petitioned: true }
  );
  return Object.freeze({
    granted: true,
    issuerFactionId,
    targetFactionId: enemyId,
    petitionTargetId,
    independentTarget,
    simMinute,
    chance: petition.chance,
    roll,
    offer
  });
}

function createCapturePortMissionOffer(
  state,
  city,
  issuerFactionId,
  candidate,
  simMinute,
  offerPeriod,
  { petitioned }
) {
  const quests = questMemory(state);

  const issuer = factionById(issuerFactionId);
  const independentTarget = candidate.port.factionId === NEUTRAL_FACTION_ID;
  const enemy = independentTarget ? null : factionById(candidate.port.factionId);
  const ruler = rulerAtMinute(issuerFactionId, simMinute);
  if (!ruler) throw new Error(`Capture-port commission has no ruler for ${issuerFactionId}`);
  const reward = capturePortMissionReward(candidate.port, candidate.distanceKm, candidate.kind);
  const offer = {
    id: `${candidate.kind}-${issuerFactionId}-${city.tileId}-${candidate.port.tileId}-${offerPeriod}-` +
      `${captureCommissionSequence(quests)}`,
    kind: candidate.kind,
    stage: "capture",
    originKey: cityKey(city),
    originTileId: city.tileId,
    originName: cityLabel(city),
    originCountry: city.country || "",
    originFactionId: issuerFactionId,
    originFactionName: issuer.name,
    originFactionAdjective: issuer.adjective,
    originRulerName: ruler.displayName,
    targetKey: cityKey(candidate.port),
    targetTileId: candidate.port.tileId,
    targetName: cityLabel(candidate.port),
    targetCountry: candidate.port.country || "",
    targetFactionId: candidate.port.factionId,
    targetSovereignFactionId: enemy?.id || null,
    targetFactionName: enemy?.name || null,
    targetFactionAdjective: enemy?.adjective || null,
    targetFactionNoun: enemy ? factionNounPhrase(enemy.id) : null,
    independentTarget,
    destinationKey: cityKey(candidate.port),
    destinationTileId: candidate.port.tileId,
    destinationName: cityLabel(candidate.port),
    destinationCountry: candidate.port.country || "",
    distanceKm: Math.round(candidate.distanceKm),
    originalEnemyPortCount: candidate.originalPortCount,
    remainingEnemyPortCount: candidate.remainingPortCount,
    enemyPortsLost: candidate.lostOriginalPortCount,
    priorityKind: candidate.priorityKind,
    petitioned,
    reward,
    offerPeriod
  };
  quests.capturePortOffers[offer.originKey] = offer;
  return offer;
}

export function pendingCapturePortMissionOfferForCity(state, city) {
  if (!state || !city) return null;
  const quests = questMemory(state);
  const originKey = cityKey(city);
  const offer = quests.capturePortOffers[originKey];
  if (!offer) return null;
  if (quests.completed[offer.id]) {
    delete quests.capturePortOffers[originKey];
    return null;
  }
  return offer;
}

export function commissionedPortCaptureFactionId(state, city) {
  assertGameState(state);
  if (!city || !Number.isInteger(city.tileId)) {
    throw new Error("Commissioned port capture requires a target city");
  }
  return commissionedPortCaptureFactionIdForValidState(state, city);
}

function commissionedPortCaptureFactionIdForValidState(state, city) {
  const conquistadorFactionId = conquistadorCommissionedCaptureFactionId(
    questMemory(state).conquistador,
    city
  );
  if (conquistadorFactionId) return conquistadorFactionId;
  const quest = questMemory(state).active;
  if (!isCaptureCommissionQuest(quest) || quest.stage !== "capture" ||
      quest.targetTileId !== city.tileId) return null;
  return assertFactionId(quest.originFactionId);
}

export function playerPortAttackStatus(state, city, context = null) {
  if (context) {
    assertPortEntryStatusContext(state, context.simMinute, context);
  } else {
    assertGameState(state);
  }
  if (!city || !Number.isInteger(city.tileId) || !city.factionId) {
    throw new Error("Port attack status requires a faction city");
  }
  const targetFactionId = assertFactionId(city.factionId);
  const playerFactionId = assertFactionId(
    state.playerCharacter?.nationalityId || NEUTRAL_FACTION_ID
  );
  const commissionedIssuerId = commissionedPortCaptureFactionIdForValidState(state, city);
  if (targetFactionId === NEUTRAL_FACTION_ID) {
    if (commissionedIssuerId) {
      return Object.freeze({
        available: true,
        reason: null,
        playerFactionId,
        targetFactionId,
        ownPort: false,
        commissioned: true,
        commissionedFactionId: commissionedIssuerId,
        ownNationAtWar: false,
        privateeringAuthority: false,
        targetIsPirate: false,
        piracy: false,
        mode: "conquest",
        captureFactionId: commissionedIssuerId,
        assaultFactionId: commissionedIssuerId,
        independentTarget: true
      });
    }
    return Object.freeze({
      available: false,
      reason: "This independent settlement is not a lawful conquest target without a sovereign warrant.",
      playerFactionId,
      targetFactionId,
      commissioned: false,
      ownNationAtWar: false,
      privateeringAuthority: false,
      piracy: false,
      mode: null,
      captureFactionId: null,
      assaultFactionId: playerFactionId
    });
  }

  const ownPort = targetFactionId === playerFactionId;
  const commissionedFactionId = ownPort || commissionedIssuerId === targetFactionId
    ? null
    : commissionedIssuerId;
  const ownNationAtWar = !ownPort && playerFactionId !== NEUTRAL_FACTION_ID &&
    playerFactionId !== PIRATE_FACTION_ID &&
    diplomacyBetweenForState(state, playerFactionId, targetFactionId) === DIPLOMACY_WAR;
  const privateeringAuthority = privateeringAuthorityIssuerIdsAgainstValidState(
    state,
    targetFactionId
  ).length > 0;
  const targetIsPirate = targetFactionId === PIRATE_FACTION_ID;
  // War licenses battle and prize-taking; it does not empower a sea captain to
  // transfer sovereignty. Annexation requires a ruler's express commission.
  const captureFactionId = commissionedFactionId;
  const piracy = ownPort || (
    !commissionedFactionId && !ownNationAtWar && !privateeringAuthority && !targetIsPirate
  );
  const assaultFactionId = captureFactionId || (ownPort ? NEUTRAL_FACTION_ID : playerFactionId);
  return Object.freeze({
    available: true,
    reason: null,
    playerFactionId,
    targetFactionId,
    ownPort,
    commissioned: commissionedFactionId !== null,
    commissionedFactionId,
    ownNationAtWar,
    privateeringAuthority,
    targetIsPirate,
    piracy,
    mode: captureFactionId ? "conquest" : "raid",
    captureFactionId,
    assaultFactionId
  });
}

export function advanceCapturePortMissionAfterConquest(state, city, event, simMinute) {
  assertGameState(state);
  assertSimulationMinute(simMinute);
  const quest = questMemory(state).active;
  if (!isCaptureCommissionQuest(quest)) return null;
  if (quest.stage !== "capture" || quest.targetTileId !== city?.tileId) {
    throw new Error(`Capture-port commission does not target ${cityLabel(city)}`);
  }
  if (!event || event.cityTileId !== city.tileId) {
    throw new Error("Capture-port commission received the wrong conquest event");
  }
  if (event.newFactionId !== quest.originFactionId || event.source !== "player") {
    throw new Error(`Capture-port commission was not won for ${quest.originFactionId}`);
  }
  quest.stage = "return";
  quest.capturedAtMinute = simMinute;
  quest.destinationKey = quest.originKey;
  quest.destinationTileId = quest.originTileId;
  quest.destinationName = quest.originName;
  quest.destinationCountry = quest.originCountry;
  recordDecision(state, `quest.${quest.kind}.captured.${quest.id}`, 1);
  return quest;
}

export function capturePortMissionMatchesConquest(state, city, event) {
  assertGameState(state);
  if (!city || !Number.isInteger(city.tileId)) {
    throw new Error("Capture-port mission matching requires a city");
  }
  if (!event || !Number.isInteger(event.cityTileId) || !event.newFactionId) {
    throw new Error("Capture-port mission matching requires a conquest event");
  }
  const quest = questMemory(state).active;
  return Boolean(
    isCaptureCommissionQuest(quest) &&
    quest.stage === "capture" &&
    quest.targetTileId === city.tileId &&
    event.cityTileId === city.tileId &&
    event.newFactionId === quest.originFactionId &&
    event.source === "player"
  );
}

function capturePortMissionTarget(
  state,
  origin,
  portCities,
  sailingDistanceKm,
  issuerFactionId,
  simMinute,
  selectionSeed,
  requestedTargetFactionId = null
) {
  if (typeof selectionSeed !== "string" || selectionSeed === "") {
    throw new Error("Capture-port target selection requires a seed");
  }
  if (requestedTargetFactionId !== null) assertFactionId(requestedTargetFactionId);
  const eligiblePorts = portCities
    .filter((port) => captureCommissionTargetOwnershipEligible(
      state,
      origin,
      issuerFactionId,
      port,
      requestedTargetFactionId
    ))
    .map((port) => {
      const distanceKm = sailingDistanceKm(origin, port);
      if (!Number.isFinite(distanceKm) || distanceKm <= 0) return null;
      const currentEnemyCapital = port.isFactionCapital === true &&
        port.capitalOfFactionId === port.factionId;
      const kind = currentEnemyCapital
        ? CAPTURE_CAPITAL_MISSION_KIND
        : CAPTURE_PORT_MISSION_KIND;
      const maxDistanceKm = currentEnemyCapital
        ? CAPTURE_CAPITAL_MISSION_MAX_DISTANCE_KM
        : CAPTURE_PORT_MISSION_MAX_DISTANCE_KM;
      if (distanceKm > maxDistanceKm) return null;
      const defeat = currentEnemyCapital
        ? captureCapitalDefeatStatus(portCities, port.factionId)
        : {
            originalPortCount: null,
            remainingPortCount: null,
            lostOriginalPortCount: null,
            mostlyDefeated: true
          };
      if (!defeat.mostlyDefeated) return null;
      const priority = captureCommissionPriorityForPort(issuerFactionId, port, simMinute);
      return {
        port,
        distanceKm,
        kind,
        priorityKind: priority.kind,
        priorityTier: priority.tier,
        priorityWeight: priority.weight,
        originalPortCount: defeat.originalPortCount,
        remainingPortCount: defeat.remainingPortCount,
        lostOriginalPortCount: defeat.lostOriginalPortCount
      };
    })
    .filter(Boolean);
  if (eligiblePorts.length === 0) return null;
  const bestTier = Math.min(...eligiblePorts.map((candidate) => candidate.priorityTier));
  return eligiblePorts
    .filter((candidate) => candidate.priorityTier === bestTier)
    .map((candidate) => ({
      ...candidate,
      selectionScore: captureCommissionTargetScore(candidate, selectionSeed)
    }))
    .sort((a, b) => (
      b.selectionScore - a.selectionScore ||
      a.distanceKm - b.distanceKm ||
      cityKey(a.port).localeCompare(cityKey(b.port))
    ))[0] || null;
}

function captureCommissionTargetOwnershipEligible(
  state,
  origin,
  issuerFactionId,
  port,
  requestedTargetFactionId = null
) {
  return port.tileId !== origin.tileId &&
    captureCommissionSettlementEligible(port) &&
    port.factionId !== PIRATE_FACTION_ID &&
    port.factionId !== issuerFactionId &&
    (requestedTargetFactionId === null || port.factionId === requestedTargetFactionId) &&
    (port.factionId === NEUTRAL_FACTION_ID ||
      diplomacyBetweenForState(state, issuerFactionId, port.factionId) === DIPLOMACY_WAR);
}

function captureCapitalDefeatStatus(portCities, factionId) {
  const originalPorts = portCities.filter((port) => (
    (port.foundingFactionId || port.factionId) === factionId &&
    captureCommissionSettlementEligible(port)
  ));
  const currentPorts = portCities.filter((port) => (
    port.factionId === factionId &&
    captureCommissionSettlementEligible(port)
  ));
  const lostOriginalPortCount = originalPorts.filter((port) => port.factionId !== factionId).length;
  return {
    originalPortCount: originalPorts.length,
    remainingPortCount: currentPorts.length,
    lostOriginalPortCount,
    mostlyDefeated: originalPorts.length > 0 &&
      currentPorts.length <= CAPTURE_CAPITAL_MISSION_MAX_REMAINING_PORTS &&
      (lostOriginalPortCount > 0 || originalPorts.length === 1)
  };
}

function captureCommissionSettlementEligible(port) {
  if (!port || typeof port !== "object" || port.isPirateHideout === true) return false;
  if (port.colonizationQuestSite !== true) return true;
  return port.colonizationQuestStage === COLONIZATION_STAGE_ESTABLISHED &&
    port.hiddenSettlement !== true &&
    port.colonyAbandoned !== true;
}

function captureCommissionTargetScore(candidate, selectionSeed) {
  const population = Math.max(1, Number(candidate.port.population || 1));
  if (!Number.isFinite(population)) {
    throw new Error(`Invalid capture target population: ${candidate.port.population}`);
  }
  const populationValue = 1 + Math.log10(1 + population / 2500);
  const colonialValue = candidate.port.playerFoundedColony === true
    ? 1.55
    : candidate.port.colonialFoundingType
      ? 1.25
      : 1;
  const capitalValue = candidate.kind === CAPTURE_CAPITAL_MISSION_KIND ? 1.35 : 1;
  const distanceWeight = 1 / (1 + candidate.distanceKm / 2200);
  const randomWeight = 0.82 + seededFraction(
    `${selectionSeed}|${cityKey(candidate.port)}|${candidate.port.factionId}`
  ) * 0.36;
  return candidate.priorityWeight * populationValue * colonialValue * capitalValue *
    distanceWeight * randomWeight;
}

function capturePortMissionReward(target, distanceKm, kind) {
  const population = Math.max(1000, Number(target.population || 1000));
  if (!Number.isFinite(population)) {
    throw new Error(`Invalid capture-port target population: ${target.population}`);
  }
  if (kind === CAPTURE_CAPITAL_MISSION_KIND) {
    const distanceReward = Math.min(8000, distanceKm * 1.2);
    const capitalReward = Math.min(4000, population / 50);
    return Math.round((12000 + distanceReward + capitalReward) / 500) * 500;
  }
  if (kind !== CAPTURE_PORT_MISSION_KIND) {
    throw new Error(`Invalid capture commission kind: ${kind}`);
  }
  const distanceReward = Math.min(4000, distanceKm * 0.8);
  const garrisonReward = Math.min(1500, population / 100);
  return Math.round((2500 + distanceReward + garrisonReward) / 250) * 250;
}

function capturePortMissionSpawnChance(value, issuerFactionId, candidate) {
  const chance = value ?? captureCommissionAutomaticOfferChance(
    issuerFactionId,
    candidate.priorityKind,
    candidate.kind
  );
  if (!Number.isFinite(chance) || chance < 0 || chance > 1) {
    throw new Error(`Invalid capture-port mission spawn chance: ${chance}`);
  }
  return chance;
}

export function captureCommissionAutomaticOfferChance(issuerFactionId, priorityKind, kind) {
  if (![
    CAPTURE_COMMISSION_PRIORITY_RETAKE,
    CAPTURE_COMMISSION_PRIORITY_HISTORICAL_CONQUEST,
    CAPTURE_COMMISSION_PRIORITY_HISTORICAL_ATTEMPT,
    CAPTURE_COMMISSION_PRIORITY_STRATEGIC
  ].includes(priorityKind)) {
    throw new Error(`Invalid capture-commission priority: ${priorityKind}`);
  }
  const baseChance = factionConquestCommissionChance(
    assertFactionId(issuerFactionId),
    CAPTURE_PORT_MISSION_SPAWN_CHANCE
  );
  const politicalBonus = priorityKind === CAPTURE_COMMISSION_PRIORITY_RETAKE
    ? 0.45
    : priorityKind === CAPTURE_COMMISSION_PRIORITY_HISTORICAL_CONQUEST
      ? 0.2
      : priorityKind === CAPTURE_COMMISSION_PRIORITY_HISTORICAL_ATTEMPT
        ? 0.1
        : 0;
  if (![CAPTURE_PORT_MISSION_KIND, CAPTURE_CAPITAL_MISSION_KIND].includes(kind)) {
    throw new Error(`Invalid capture commission kind: ${kind}`);
  }
  const capitalBonus = kind === CAPTURE_CAPITAL_MISSION_KIND ? 0.08 : 0;
  return Math.min(0.92, baseChance + politicalBonus + capitalBonus);
}

function captureCommissionPetitionChance(state, issuerFactionId, candidate) {
  const reputation = factionReputation(state, issuerFactionId);
  const reputationBonus = clamp01(
    (reputation - LETTER_OF_MARQUE_REPUTATION_REQUIRED) /
    (REPUTATION_MAX - LETTER_OF_MARQUE_REPUTATION_REQUIRED)
  ) * 0.35;
  const politicalBonus = candidate.priorityKind === CAPTURE_COMMISSION_PRIORITY_RETAKE
    ? 0.35
    : candidate.priorityKind === CAPTURE_COMMISSION_PRIORITY_HISTORICAL_CONQUEST
      ? 0.18
      : candidate.priorityKind === CAPTURE_COMMISSION_PRIORITY_HISTORICAL_ATTEMPT
        ? 0.08
        : 0;
  const capitalPenalty = candidate.kind === CAPTURE_CAPITAL_MISSION_KIND ? 0.08 : 0;
  return Math.max(0.15, Math.min(0.95, 0.38 + reputationBonus + politicalBonus - capitalPenalty));
}

function captureCommissionSelectionSeed(state, city, issuerFactionId, offerPeriod, purpose) {
  const identityKey = state.playerCharacter?.id || state.playerCharacter?.name || "captain";
  return `${state.voyageSeed}|${identityKey}|${cityKey(city)}|${issuerFactionId}|` +
    `${offerPeriod}|${captureCommissionSequence(questMemory(state))}|${purpose}`;
}

function captureCommissionSequence(quests) {
  return [...Object.keys(quests.completed), ...Object.keys(quests.failed)]
    .filter((id) => id.startsWith(`${CAPTURE_PORT_MISSION_KIND}-`) ||
      id.startsWith(`${CAPTURE_CAPITAL_MISSION_KIND}-`))
    .length;
}

function captureCommissionPetitionRefusedAtMinute(state, issuerFactionId, targetFactionId) {
  const stored = state.memory.decisions[
    captureCommissionPetitionDecisionKey(issuerFactionId, targetFactionId)
  ];
  if (stored === undefined) return null;
  if (!Number.isFinite(stored) || stored < 1) {
    throw new Error(`Invalid capture-commission petition refusal record: ${stored}`);
  }
  return stored - 1;
}

function captureCommissionPetitionDecisionKey(issuerFactionId, targetFactionId) {
  return `capture-commission.petition-refused.${issuerFactionId}.${targetFactionId}`;
}

export function isWokouHuntQuest(quest) {
  return quest?.kind === WOKOU_HUNT_QUEST_KIND;
}

export function wokouHuntMissionOfferForCity(state, city, portCities, context = {}) {
  assertGameState(state);
  if (!Array.isArray(portCities)) throw new Error("Wokou commissions require a port list");
  const quests = questMemory(state);
  const existing = pendingWokouHuntMissionOfferForCity(state, city);
  if (existing || quests.active || quests.passengerActive) return existing;
  const factionId = currentSovereignCapitalFactionId(city);
  if (!["ming", "japan"].includes(factionId)) return null;
  if (factionReputation(state, factionId) < WOKOU_HUNT_REPUTATION_REQUIRED) return null;
  const patrolPorts = factionId === "ming"
    ? [CANONICAL_PORTS.NINGBO, CANONICAL_PORTS.FUZHOU, CANONICAL_PORTS.GUANGZHOU]
    : [CANONICAL_PORTS.NAGASAKI, CANONICAL_PORTS.YAMAGUCHI, CANONICAL_PORTS.KAGOSHIMA];
  const candidates = portCities.filter((port) => (
    patrolPorts.some((reference) => portMatchesCanonicalReference(port, reference)) &&
    Number.isInteger(port.tileId)
  ));
  if (candidates.length === 0) return null;
  const simMinute = context.simMinute ?? 0;
  assertSimulationMinute(simMinute);
  const period = Math.floor(simMinute / WOKOU_HUNT_MISSION_ROLL_PERIOD_MINUTES);
  const rollKey = `${cityKey(city)}|${period}|wokou`;
  if (quests.courtMissionRolls[rollKey]) return null;
  quests.courtMissionRolls[rollKey] = true;
  pruneQuestRolls(quests.courtMissionRolls);
  const chance = context.spawnChance ?? WOKOU_HUNT_MISSION_SPAWN_CHANCE;
  if (!Number.isFinite(chance) || chance < 0 || chance > 1) {
    throw new Error(`Invalid wokou commission spawn chance: ${chance}`);
  }
  if (chance < 1 && seededFraction(`${state.voyageSeed}|${rollKey}|spawn`) >= chance) return null;
  const patrolPort = candidates[hashString32(`${state.voyageSeed}|${rollKey}|patrol`) % candidates.length];
  const ruler = rulerAtMinute(factionId, simMinute);
  if (!ruler) throw new Error(`Wokou commission has no ruler for ${factionId}`);
  const reward = 700 + hashString32(`${rollKey}|reward`) % 401;
  const offer = {
    id: `wokou-hunt-${factionId}-${city.tileId}-${patrolPort.tileId}-${period}`,
    kind: WOKOU_HUNT_QUEST_KIND,
    stage: "hunt",
    originKey: cityKey(city),
    originTileId: city.tileId,
    originName: cityLabel(city),
    originCountry: city.country || "",
    originFactionId: factionId,
    originRulerName: ruler.displayName,
    patrolKey: cityKey(patrolPort),
    patrolTileId: patrolPort.tileId,
    patrolName: cityLabel(patrolPort),
    destinationKey: cityKey(patrolPort),
    destinationTileId: patrolPort.tileId,
    destinationName: cityLabel(patrolPort),
    destinationCountry: patrolPort.country || "",
    targetShipId: `wokou-commission-${factionId}-${period}`,
    targetShipSlug: factionId === "japan" ? "japanese-kobaya" : "small-junk",
    reward,
    offerPeriod: period,
    offerText: factionId === "ming"
      ? `${ruler.displayName}'s coastal officers seek a captain to hunt the wokou reported near ${cityLabel(patrolPort)}. Sink or force their surrender, then return for ${reward} db. Pirates require no marque.`
      : `${ruler.displayName}'s council seeks a captain to hunt the wokou raiding near ${cityLabel(patrolPort)}. Sink or force their surrender, then return for ${reward} db. Pirates require no marque.`
  };
  quests.courtMissionOffers[offer.originKey] = offer;
  return offer;
}

export function pendingWokouHuntMissionOfferForCity(state, city) {
  if (!state || !city) return null;
  const quests = questMemory(state);
  const offer = quests.courtMissionOffers[cityKey(city)] || null;
  if (!offer || quests.completed[offer.id] || quests.failed[offer.id]) return null;
  return offer;
}

export function recordWokouHuntVictory(state, shipId, context = {}) {
  assertGameState(state);
  const active = questMemory(state).active;
  if (!isWokouHuntQuest(active) || active.stage !== "hunt" || active.targetShipId !== shipId) {
    return null;
  }
  active.stage = "return";
  active.defeatedAtMinute = context.simMinute ?? 0;
  active.destinationKey = active.originKey;
  active.destinationTileId = active.originTileId;
  active.destinationName = active.originName;
  active.destinationCountry = active.originCountry;
  recordDecision(state, `quest.wokou.defeated.${active.id}`, 1);
  return active;
}

export function deliveryOfferForCity(state, city, portCities, context = {}) {
  assertGameState(state);
  const quests = questMemory(state);
  const existing = pendingDeliveryOfferForCity(state, city);
  if (quests.active) return existing;
  if (pendingCapturePortMissionOfferForCity(state, city)) return null;

  const teaRace = teaRaceOfferForCity(state, city, portCities, context);
  if (teaRace) return teaRace;
  if (existing) return existing;

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
  if (quests.completed[offer.id] || quests.failed[offer.id]) {
    delete quests.deliveryOffers[originKey];
    return null;
  }
  return offer;
}

export function teaRaceOfferForCity(state, city, portCities, context = {}) {
  assertGameState(state);
  if (!Array.isArray(portCities)) throw new Error("Tea race offer requires the current port list");
  if (!isTeaRaceSourcePort(city)) return null;
  const simMinute = context.simMinute ?? 0;
  if (!Number.isFinite(simMinute) || simMinute < 0) {
    throw new Error(`Invalid tea race offer minute: ${simMinute}`);
  }
  const season = teaRaceSeasonAtMinute(simMinute, city.lon || 0);
  if (!season.open) return null;
  const playerFactionId = state.playerCharacter?.nationalityId;
  if (!playerFactionId || playerFactionId === "ming" ||
      !sovereignTradeOpenToFaction(state, MING_TRADE_POLICY_ID, playerFactionId)) {
    return null;
  }
  const destination = requireCanonicalPort(portCities, CANONICAL_PORTS.LONDON, "Tea race");
  const id = `tea-race-${season.year}`;
  const quests = questMemory(state);
  if (quests.completed[id] || quests.failed[id] || quests.active?.id === id ||
      Object.values(quests.deliveryOffers).some((offer) => offer?.id === id)) {
    return null;
  }
  if (cargoFree(state) < TEA_RACE_CARGO_QUANTITY) return null;
  const offer = createTeaRaceQuest({
    origin: city,
    destination,
    originKey: cityKey(city),
    destinationKey: cityKey(destination),
    simMinute
  });
  quests.deliveryOffers[offer.originKey] = offer;
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
    updates += reconcileQuestItinerary(quest, portCities);
    if (isEnvoyQuest(quest)) updates += reconcileQuestEndpoint(quest, "target", portCities);
    if (isCaptureCommissionQuest(quest)) updates += reconcileQuestEndpoint(quest, "target", portCities);
    if (isWokouHuntQuest(quest)) updates += reconcileQuestEndpoint(quest, "patrol", portCities);
  };

  reconcile(quests.active);
  reconcile(quests.passengerActive);
  const deliveryOffers = {};
  for (const [storedKey, offer] of Object.entries(quests.deliveryOffers)) {
    reconcile(offer);
    deliveryOffers[offer?.originKey || storedKey] = offer;
  }
  quests.deliveryOffers = deliveryOffers;
  const offers = {};
  for (const [storedKey, offer] of Object.entries(quests.passengerOffers)) {
    reconcile(offer);
    const originKey = offer?.originKey || storedKey;
    const storageKey = offer?.religiousMissionId === SEPTEMBER_TESTAMENT_MISSION_ID
      ? `${originKey}|scripted-religious|${offer.religiousMissionId}`
      : originKey;
    offers[storageKey] = offer;
  }
  quests.passengerOffers = offers;
  const courtOffers = {};
  for (const [storedKey, offer] of Object.entries(quests.courtMissionOffers)) {
    reconcile(offer);
    courtOffers[offer?.originKey || storedKey] = offer;
  }
  quests.courtMissionOffers = courtOffers;
  const captureOffers = {};
  for (const [storedKey, offer] of Object.entries(quests.capturePortOffers)) {
    reconcile(offer);
    captureOffers[offer?.originKey || storedKey] = offer;
  }
  quests.capturePortOffers = captureOffers;

  const reconciledWaypoints = [];
  for (const waypoint of state.memory.navigation.optionalWaypoints) {
    const destination = reconciledPortReference(portCities, {
      tileId: waypoint.destinationTileId,
      name: waypoint.destinationName
    });
    if (destination && (
      destination.tileId !== waypoint.destinationTileId ||
      cityLabel(destination) !== waypoint.destinationName
    )) {
      waypoint.destinationTileId = destination.tileId;
      waypoint.destinationName = cityLabel(destination);
      waypoint.id = portNavigationWaypointId({
        destinationTileId: destination.tileId,
        reason: waypoint.reason,
        questCargoGoodId: waypoint.questCargoGoodId || null,
        tradeGoodId: waypoint.tradeGoodId || null
      });
      updates += 1;
    }
    const existingIndex = reconciledWaypoints.findIndex((entry) => entry.id === waypoint.id);
    if (existingIndex >= 0) reconciledWaypoints[existingIndex] = waypoint;
    else reconciledWaypoints.push(waypoint);
  }
  state.memory.navigation.optionalWaypoints = reconciledWaypoints;

  const playerHome = reconciledPortReference(portCities, {
    tileId: state.playerCharacter?.homePortTileId,
    name: state.playerCharacter?.homePortName,
    country: state.playerCharacter?.homePortCountry
  });
  if (playerHome && (
    playerHome.tileId !== state.playerCharacter.homePortTileId ||
    cityLabel(playerHome) !== state.playerCharacter.homePortName ||
    (playerHome.country || "") !== state.playerCharacter.homePortCountry
  )) {
    state.playerCharacter.homePortTileId = playerHome.tileId;
    state.playerCharacter.homePortName = cityLabel(playerHome);
    state.playerCharacter.homePortCountry = playerHome.country || "";
    if (state.memory.campaignGoal) state.memory.campaignGoal.homePortTileId = playerHome.tileId;
    updates += 1;
  }

  for (const memoryKey of ["pirateCaptive", "castaway"]) {
    const traveler = quests[memoryKey]?.active;
    const home = reconciledPortReference(portCities, {
      tileId: traveler?.homePortTileId,
      name: traveler?.homePortName,
      country: traveler?.homePortCountry
    });
    if (home && (
      home.tileId !== traveler.homePortTileId ||
      cityLabel(home) !== traveler.homePortName ||
      (home.country || "") !== traveler.homePortCountry
    )) {
      traveler.homePortTileId = home.tileId;
      traveler.homePortName = cityLabel(home);
      traveler.homePortCountry = home.country || "";
      updates += 1;
    }
  }

  const chef = quests.chef;
  const chefPort = reconciledPortReference(portCities, {
    tileId: chef?.portTileId,
    name: chef?.portCity,
    country: chef?.portCountry
  });
  if (chefPort && (
    chefPort.tileId !== chef.portTileId ||
    cityLabel(chefPort) !== chef.portCity ||
    (chefPort.country || "") !== chef.portCountry
  )) {
    chef.portTileId = chefPort.tileId;
    chef.portCity = cityLabel(chefPort);
    chef.portCountry = chefPort.country || "";
    updates += 1;
  }

  const colonization = state.memory.colonization;
  for (const endpoint of ["origin", "approval"]) {
    const port = reconciledPortReference(portCities, {
      tileId: colonization?.[`${endpoint}TileId`],
      name: colonization?.[`${endpoint}City`],
      country: colonization?.[`${endpoint}Country`]
    });
    if (port && (
      port.tileId !== colonization[`${endpoint}TileId`] ||
      cityLabel(port) !== colonization[`${endpoint}City`] ||
      (port.country || "") !== colonization[`${endpoint}Country`]
    )) {
      colonization[`${endpoint}TileId`] = port.tileId;
      colonization[`${endpoint}City`] = cityLabel(port);
      colonization[`${endpoint}Country`] = port.country || "";
      updates += 1;
    }
  }

  const ginger = quests.caribbeanGinger;
  const gingerPort = reconciledPortReference(portCities, {
    tileId: ginger?.cultivationTileId,
    name: ginger?.cultivationCity,
    country: ginger?.cultivationCountry
  });
  if (gingerPort && (
    gingerPort.tileId !== ginger.cultivationTileId ||
    cityLabel(gingerPort) !== ginger.cultivationCity ||
    (gingerPort.country || "") !== ginger.cultivationCountry
  )) {
    ginger.cultivationTileId = gingerPort.tileId;
    ginger.cultivationCity = cityLabel(gingerPort);
    ginger.cultivationCountry = gingerPort.country || "";
    updates += 1;
  }

  const naturalist = quests.naturalist;
  if (Number.isInteger(naturalist?.portTileId) &&
      !portCities.some((port) => port.tileId === naturalist.portTileId)) {
    naturalist.portTileId = null;
    setNaturalistQuestCharacter(naturalist, null);
    updates += 1;
  }

  assertGameState(state);
  return updates;
}

export function reconcileQuestWorldAssumptions(state, portCities) {
  assertGameState(state);
  if (!Array.isArray(portCities)) throw new Error("Quest world reconciliation requires a port list");
  const endpointUpdates = reconcileQuestPortTiles(state, portCities);
  const quests = questMemory(state);
  const events = [];

  removeInvalidatedQuestOffers(state, portCities, events);
  const active = quests.active;
  if (isCaptureCommissionQuest(active)) {
    reconcileActiveCaptureCommission(state, active, portCities, events);
  } else if (isEnvoyQuest(active)) {
    reconcileActiveEnvoyMission(active, portCities, events);
  } else if (isWokouHuntQuest(active) && active.stage === "return") {
    relocateReturningCommission(active, portCities, events);
  }

  return Object.freeze({ endpointUpdates, events: Object.freeze(events) });
}

export function questStateForCity(state, city, portCities) {
  assertGameState(state);
  const quests = questMemory(state);
  const active = quests.active;
  if (active) {
    if (isTeaRaceQuest(active)) {
      if (active.destinationTileId === city.tileId && active.stage === "arrived") {
        return { kind: "ready-to-complete", quest: active };
      }
      if (active.originTileId === city.tileId || active.destinationTileId === city.tileId) {
        return { kind: "in-progress-here", quest: active };
      }
      return { kind: "busy", quest: active };
    }
    if (isWokouHuntQuest(active)) {
      if (active.stage === "return" && active.originTileId === city.tileId) {
        return { kind: "ready-to-complete", quest: active };
      }
      if (active.originTileId === city.tileId || active.patrolTileId === city.tileId) {
        return { kind: "in-progress-here", quest: active };
      }
      return { kind: "busy", quest: active };
    }
    if (isCaptureCommissionQuest(active)) {
      if (active.stage === "return" && active.originTileId === city.tileId) {
        return { kind: "ready-to-complete", quest: active };
      }
      if (active.originTileId === city.tileId || active.targetTileId === city.tileId) {
        return { kind: "in-progress-here", quest: active };
      }
      return { kind: "busy", quest: active };
    }
    if (active.destinationTileId === city.tileId) return { kind: "ready-to-complete", quest: active };
    if (active.originTileId === city.tileId) return { kind: "in-progress-here", quest: active };
    return { kind: "busy", quest: active };
  }
  const offer = pendingCapturePortMissionOfferForCity(state, city) ||
    pendingWokouHuntMissionOfferForCity(state, city) ||
    pendingDeliveryOfferForCity(state, city);
  return offer
    ? { kind: "available", quest: offer }
    : { kind: "unavailable", quest: null };
}

export function acceptQuest(state, quest, context = {}) {
  assertGameState(state);
  const quests = questMemory(state);
  if (quests.completed[quest.id]) throw new Error(`Quest already completed: ${quest.id}`);
  const passengerSlot = quest.kind === "passenger";
  if (passengerSlot) {
    if (quests.passengerActive) {
      throw new Error("Cannot accept a passenger while another passenger is aboard");
    }
    if (quests.active && quests.active.kind !== "delivery" && !isTeaRaceQuest(quests.active)) {
      throw new Error(`Cannot accept a passenger during ${quests.active.kind}`);
    }
  } else {
    if (quests.active) throw new Error("Cannot accept a quest while another quest is active");
    if (quests.passengerActive && quest.kind !== "delivery" && !isTeaRaceQuest(quest)) {
      throw new Error(`Cannot accept ${quest.kind} while a passenger is aboard`);
    }
  }
  const passenger = quest.passenger ? {
    ...quest.passenger,
    skillIds: quest.passenger.skillIds || characterSkillIdsForIdentity(
      quest.passenger.id || quest.passenger.name || `quest-passenger|${quest.id}`,
      { traveler: true }
    )
  } : quest.passenger;
  const entrustedCargo = isTributeEnvoyQuest(quest)
    ? quest.tributeCargoRequirements
    : teaRaceEntrustedCargo(quest);
  if (entrustedCargo.length > 0) {
    const requiredSpace = tributeCargoSpace(entrustedCargo);
    if (cargoFree(state) < requiredSpace) {
      throw new Error(`${isTeaRaceQuest(quest) ? "Tea race" : "Tribute mission"} requires ` +
        `${requiredSpace} free cargo space`);
    }
    for (const requirement of entrustedCargo) {
      tradeGoodById(requirement.goodId);
      state.cargo[requirement.goodId] = (state.cargo[requirement.goodId] || 0) + requirement.quantity;
      state.accounts.cargoCostBasis[requirement.goodId] =
        state.accounts.cargoCostBasis[requirement.goodId] || 0;
    }
  }
  if (isCourtEnvoyQuest(quest) && quest.courtMatterId) {
    assertSimulationMinute(context.simMinute);
    commissionCourtMatter(state.relations.courts, {
      matterId: quest.courtMatterId,
      questId: quest.id,
      acceptedMinute: context.simMinute
    });
  }
  if (isEastAsianMissionQuest(quest)) removeSiblingEastAsianOffers(quests, quest);
  if (isTreatyOfMadridQuest(quest)) removeSiblingTreatyOfMadridOffers(quests, quest);
  quests[passengerSlot ? "passengerActive" : "active"] = {
    ...quest,
    passenger,
    ...(isTeaRaceQuest(quest)
      ? {
          teaRaceCompetitors: quest.teaRaceCompetitors.map((entry) => ({ ...entry })),
          teaRaceCargoRequirements: quest.teaRaceCargoRequirements.map((entry) => ({ ...entry })),
          teaRaceRetiredShipIds: [...(quest.teaRaceRetiredShipIds || [])]
        }
      : {})
  };
  if ((quest.kind === "passenger" || isEnvoyQuest(quest)) && quest.originKey) {
    for (const [storageKey, offer] of Object.entries(quests.passengerOffers)) {
      if (offer?.id === quest.id) delete quests.passengerOffers[storageKey];
    }
  }
  if ((quest.kind === "delivery" || isTeaRaceQuest(quest)) && quest.originKey) {
    delete quests.deliveryOffers[quest.originKey];
  }
  if (isTeaRaceQuest(quest)) {
    for (const [originKey, offer] of Object.entries(quests.deliveryOffers)) {
      if (offer?.id === quest.id) delete quests.deliveryOffers[originKey];
    }
  }
  if (isCaptureCommissionQuest(quest) && quest.originKey) delete quests.capturePortOffers[quest.originKey];
  if (isWokouHuntQuest(quest) && quest.originKey) delete quests.courtMissionOffers[quest.originKey];
  recordDecision(state, `quest.accept.${quest.id}`, 1);
  return quests[passengerSlot ? "passengerActive" : "active"];
}

export function tributeSaleTheftStatus(state, goodId, quantity) {
  assertGameState(state);
  tradeGoodById(goodId);
  return calculateTributeSaleTheftStatus(state, goodId, quantity);
}

export function questCargoSaleTheftStatus(state, goodId, quantity) {
  const tribute = tributeSaleTheftStatus(state, goodId, quantity);
  return tribute || calculateTeaRaceSaleTheftStatus(state, goodId, quantity);
}

export function recordTributeTheft(state, theft, context = {}) {
  assertGameState(state);
  const quests = questMemory(state);
  const active = quests.active;
  if (!theft || !isTributeEnvoyQuest(active) || active.id !== theft.questId) {
    throw new Error("Tribute theft does not match the active diplomatic mission");
  }
  const requirement = active.tributeCargoRequirements.find((entry) => entry.goodId === theft.goodId);
  if (!requirement || !Number.isInteger(theft.stolenQuantity) || theft.stolenQuantity <= 0 ||
      theft.stolenQuantity > requirement.quantity) {
    throw new Error("Invalid sealed tribute quantity in theft record");
  }
  const originStanding = adjustFactionReputation(state, active.originFactionId, theft.originPenalty);
  const suzerainStanding = active.targetFactionId === active.originFactionId
    ? originStanding
    : adjustFactionReputation(state, active.targetFactionId, theft.suzerainPenalty);
  active.tributeStolen = true;
  quests.failed[active.id] = {
    reason: "tribute-theft",
    simMinute: context.simMinute ?? 0,
    goodId: theft.goodId,
    quantity: theft.stolenQuantity
  };
  quests.active = null;
  recordDecision(state, `quest.fail.tribute-theft.${active.id}`, 1);
  return {
    quest: active,
    originStanding,
    suzerainStanding,
    originPenalty: theft.originPenalty,
    suzerainPenalty: theft.suzerainPenalty
  };
}

export function recordQuestCargoTheft(state, theft, context = {}) {
  if (theft?.kind === "tea-race") return recordTeaRaceTheft(state, theft, context);
  return recordTributeTheft(state, theft, context);
}

export function recordTeaRaceTheft(state, theft, context = {}) {
  assertGameState(state);
  const quests = questMemory(state);
  const active = quests.active;
  if (!theft || !isTeaRaceQuest(active) || active.id !== theft.questId) {
    throw new Error("Tea theft does not match the active new-crop race");
  }
  if (theft.goodId !== TEA_GOOD_ID || !Number.isInteger(theft.stolenQuantity) ||
      theft.stolenQuantity <= 0 || theft.stolenQuantity > TEA_RACE_CARGO_QUANTITY) {
    throw new Error("Invalid entrusted tea quantity in theft record");
  }
  const standing = adjustFactionReputation(state, active.originFactionId, TEA_RACE_THEFT_REPUTATION);
  active.teaRaceCargoStolen = true;
  quests.failed[active.id] = {
    reason: "tea-race-theft",
    simMinute: context.simMinute ?? 0,
    goodId: theft.goodId,
    quantity: theft.stolenQuantity
  };
  quests.active = null;
  recordDecision(state, `quest.fail.tea-race-theft.${active.id}`, 1);
  return { quest: active, standing, penalty: TEA_RACE_THEFT_REPUTATION };
}

export function recordTeaRaceRivalArrival(state, questId, shipId, arrivalMinute) {
  assertGameState(state);
  assertSimulationMinute(arrivalMinute);
  const quest = questMemory(state).active;
  if (!isTeaRaceQuest(quest) || quest.id !== questId || quest.stage !== "race") return null;
  if (!quest.teaRaceCompetitors.some((entry) => entry.id === shipId) ||
      quest.teaRaceRetiredShipIds.includes(shipId)) {
    return null;
  }
  if (quest.teaRaceFirstRivalArrivalMinute === undefined ||
      arrivalMinute < quest.teaRaceFirstRivalArrivalMinute) {
    quest.teaRaceFirstRivalArrivalMinute = arrivalMinute;
    quest.teaRaceFirstRivalShipId = shipId;
    recordDecision(state, `quest.tea-race.rival-arrived.${quest.id}`, 1);
  }
  return quest;
}

export function recordTeaRacePlayerArrival(state, questId, context = {}) {
  assertGameState(state);
  assertSimulationMinute(context.simMinute);
  const quest = questMemory(state).active;
  if (!isTeaRaceQuest(quest) || quest.id !== questId) {
    throw new Error(`Tea race is not active: ${questId}`);
  }
  if (quest.stage === "arrived") return quest;
  const rivalArrivalMinute = context.rivalArrivalMinute ?? quest.teaRaceFirstRivalArrivalMinute ?? null;
  if (rivalArrivalMinute !== null) assertSimulationMinute(rivalArrivalMinute);
  quest.teaRacePlayerArrivalMinute = context.simMinute;
  quest.teaRaceFirstRivalArrivalMinute = rivalArrivalMinute ?? undefined;
  quest.teaRaceFirstRivalShipId = context.rivalShipId ?? quest.teaRaceFirstRivalShipId;
  quest.teaRaceWon = rivalArrivalMinute === null || context.simMinute < rivalArrivalMinute;
  quest.reward = quest.teaRaceWon ? quest.firstPrize : quest.finisherPrize;
  quest.stage = "arrived";
  quest.completionText = quest.teaRaceWon
    ? "No rival pennant has reached the Thames. Your chests hold London's first new tea of the year."
    : "Another racing ship has unloaded, but the first-crop buyers still offer a finishing premium.";
  recordDecision(state, `quest.tea-race.${quest.teaRaceWon ? "won" : "finished"}.${quest.id}`, 1);
  return quest;
}

export function recordTeaRaceCompetitorRemoved(state, shipId) {
  assertGameState(state);
  const quest = questMemory(state).active;
  if (!isTeaRaceQuest(quest) || !quest.teaRaceCompetitors.some((entry) => entry.id === shipId)) {
    return null;
  }
  if (!quest.teaRaceRetiredShipIds.includes(shipId)) {
    quest.teaRaceRetiredShipIds = [...quest.teaRaceRetiredShipIds, shipId];
    recordDecision(state, `quest.tea-race.competitor-removed.${quest.id}.${shipId}`, 1);
  }
  return quest;
}

export function recordNingboMissionArrival(state, questId, context = {}) {
  assertGameState(state);
  const quest = questMemory(state).passengerActive;
  if (!quest || quest.id !== questId || quest.eastAsianMissionId !== EAST_ASIAN_MISSION_NINGBO) {
    throw new Error(`Ningbo mission is not active: ${questId}`);
  }
  if (quest.eastAsianPlayerArrivalMinute !== undefined) return quest;
  assertSimulationMinute(context.simMinute);
  const rivalArrivalMinute = context.rivalArrivalMinute ?? null;
  if (rivalArrivalMinute !== null) assertSimulationMinute(rivalArrivalMinute);
  quest.eastAsianPlayerArrivalMinute = context.simMinute;
  quest.eastAsianRivalArrivalMinute = rivalArrivalMinute;
  quest.eastAsianWonRace = rivalArrivalMinute === null || context.simMinute < rivalArrivalMinute;
  quest.eastAsianBaseReward = quest.reward;
  quest.eastAsianRaceBonus = quest.eastAsianWonRace ? NINGBO_RACE_BONUS : 0;
  quest.reward += quest.eastAsianRaceBonus;
  recordDecision(state, `quest.east-asian.${EAST_ASIAN_MISSION_NINGBO}.race-${quest.eastAsianWonRace ? "won" : "lost"}`, 1);
  return quest;
}

export function refuseNingboMissionBribe(state, questId) {
  return answerNingboMissionBribe(state, questId, false);
}

export function answerNingboMissionBribe(state, questId, accepted) {
  assertGameState(state);
  const quest = questMemory(state).passengerActive;
  if (!quest || quest.id !== questId || quest.eastAsianMissionId !== EAST_ASIAN_MISSION_NINGBO) {
    throw new Error(`Ningbo mission is not active: ${questId}`);
  }
  if (typeof accepted !== "boolean") throw new Error("Ningbo bribe answer must be accepted or refused");
  if (quest.eastAsianOutcomeId) {
    throw new Error(`Ningbo mission outcome is already fixed: ${quest.eastAsianOutcomeId}`);
  }
  const previous = ningboMissionBribeDecision(quest);
  const decision = accepted ? "accepted" : "refused";
  if (previous !== null && previous !== decision) {
    throw new Error(`Ningbo bribe was already ${previous}`);
  }
  if (previous === null) {
    quest.eastAsianBribeAccepted = accepted;
    quest.eastAsianBribeRefused = !accepted;
    recordDecision(state, `quest.east-asian.${EAST_ASIAN_MISSION_NINGBO}.bribe-${decision}`, 1);
  }
  return quest;
}

export function ningboMissionBribeDecision(quest) {
  if (!quest || quest.eastAsianMissionId !== EAST_ASIAN_MISSION_NINGBO) return null;
  const accepted = quest.eastAsianBribeAccepted === true;
  const refused = quest.eastAsianBribeRefused === true;
  if (accepted && refused) throw new Error("Ningbo bribe cannot be both accepted and refused");
  return accepted ? "accepted" : refused ? "refused" : null;
}

export function selectEastAsianMissionOutcome(state, questId, outcomeId, context = {}) {
  assertGameState(state);
  const quest = questMemory(state).passengerActive;
  if (!quest || quest.id !== questId || !isEastAsianMissionQuest(quest)) {
    throw new Error(`East Asian mission is not active: ${questId}`);
  }
  if (!quest.eastAsianRequiresOutcome) {
    throw new Error(`East Asian mission does not accept an outcome choice: ${quest.eastAsianMissionId}`);
  }
  validateMissionOutcome(quest, outcomeId);
  if (quest.eastAsianOutcomeId && quest.eastAsianOutcomeId !== outcomeId) {
    throw new Error(`East Asian mission outcome is already fixed: ${quest.eastAsianOutcomeId}`);
  }
  if (quest.eastAsianMissionId === EAST_ASIAN_MISSION_NINGBO) {
    if (quest.eastAsianPlayerArrivalMinute === undefined) {
      throw new Error("Ningbo outcome cannot be chosen before reaching Ningbo");
    }
    const bribeDecision = ningboMissionBribeDecision(quest);
    if (bribeDecision === null) {
      throw new Error("The rival delegation's bribe must be answered before the Ningbo hearing");
    }
    if (outcomeId === "support-rival" && bribeDecision !== "accepted") {
      throw new Error("The rival delegation's bribe was refused");
    }
    if (outcomeId === "support-origin" && bribeDecision !== "refused") {
      throw new Error("The captain promised to support the rival delegation");
    }
    if (outcomeId === "mediate") {
      quest.eastAsianStage = "resolved";
    } else {
      const origin = quest.eastAsianStartingFactionId;
      const rival = origin === "hosokawa" ? "ouchi" : "hosokawa";
      const enemyFactionId = outcomeId === "support-origin" ? rival : origin;
      const ships = Array.isArray(quest.eastAsianDelegationShips)
        ? quest.eastAsianDelegationShips
        : [];
      quest.eastAsianBattleFactionId = enemyFactionId;
      const alliedFactionId = enemyFactionId === origin ? rival : origin;
      quest.eastAsianBattleShipIds = ships
        .filter((ship) => ship.factionId === enemyFactionId)
        .map((ship) => ship.id);
      quest.eastAsianAlliedShipIds = ships
        .filter((ship) => ship.factionId === alliedFactionId)
        .map((ship) => ship.id);
      if (quest.eastAsianBattleShipIds.length === 0) {
        throw new Error(`Ningbo mission has no ${enemyFactionId} delegation ships`);
      }
      if (quest.eastAsianAlliedShipIds.length === 0) {
        throw new Error(`Ningbo mission has no ${alliedFactionId} allied delegation ships`);
      }
      quest.eastAsianDefeatedShipIds = [];
      quest.eastAsianLostShipIds = [];
      quest.eastAsianStage = "battle";
      if (outcomeId === "support-rival") {
        if (!context.city) throw new Error("Ningbo defection payment requires the current port");
        receiveQuestPayment(
          state,
          context.city,
          NINGBO_DEFECTION_BRIBE,
          "Rival delegation's purse",
          context
        );
        quest.eastAsianDefectionBribePaid = NINGBO_DEFECTION_BRIBE;
      }
    }
  }
  quest.eastAsianOutcomeId = outcomeId;
  recordDecision(state, `quest.east-asian.${quest.eastAsianMissionId}.${outcomeId}`, 1);
  return quest;
}

export function recordNingboMissionShipDefeated(state, shipId) {
  assertGameState(state);
  const quest = questMemory(state).passengerActive;
  if (!quest || quest.eastAsianMissionId !== EAST_ASIAN_MISSION_NINGBO || quest.eastAsianStage !== "battle") {
    return null;
  }
  if (quest.eastAsianBattleShipIds.includes(shipId)) {
    if (!quest.eastAsianDefeatedShipIds.includes(shipId)) quest.eastAsianDefeatedShipIds.push(shipId);
    const remaining = quest.eastAsianBattleShipIds.filter((id) => !quest.eastAsianDefeatedShipIds.includes(id));
    if (remaining.length === 0) quest.eastAsianStage = "resolved";
    return Object.freeze({
      quest,
      status: remaining.length === 0 ? "victory" : "progress",
      remaining: Object.freeze(remaining)
    });
  }
  if (quest.eastAsianAlliedShipIds.includes(shipId)) {
    if (!quest.eastAsianLostShipIds.includes(shipId)) quest.eastAsianLostShipIds.push(shipId);
    const remaining = quest.eastAsianAlliedShipIds.filter((id) => !quest.eastAsianLostShipIds.includes(id));
    if (remaining.length > 0) {
      return Object.freeze({ quest, status: "progress", remaining: Object.freeze(remaining) });
    }
    quest.eastAsianStage = "failed";
    const quests = questMemory(state);
    quests.failed[quest.id] = {
      reason: "ningbo-delegation-defeated",
      simMinute: state.survival.lastMinute
    };
    quests.passengerActive = null;
    recordDecision(state, `quest.fail.${quest.id}.delegation-defeated`, 1);
    return Object.freeze({ quest, status: "defeat", remaining: Object.freeze([]) });
  }
  return null;
}

export function completeQuest(state, city, context = {}) {
  assertGameState(state);
  const quests = questMemory(state);
  const requestedQuestId = context.questId ?? null;
  const passengerMatches = quests.passengerActive &&
    (!requestedQuestId || quests.passengerActive.id === requestedQuestId);
  const primaryMatches = quests.active &&
    (!requestedQuestId || quests.active.id === requestedQuestId);
  const activeSlot = primaryMatches
    ? "active"
    : passengerMatches
      ? "passengerActive"
      : null;
  const active = activeSlot ? quests[activeSlot] : null;
  if (!active) throw new Error("No active quest to complete");
  if (active.destinationTileId !== city.tileId) {
    throw new Error(`Quest destination is ${active.destinationName}, not ${cityLabel(city)}`);
  }
  if (isEnvoyQuest(active) && active.stage !== "return") {
    throw new Error(`Envoy must complete negotiations before returning home: ${active.id}`);
  }
  if (isCaptureCommissionQuest(active) && active.stage !== "return") {
    throw new Error(`Capture-port commission must be won before reporting home: ${active.id}`);
  }
  if (isWokouHuntQuest(active) && active.stage !== "return") {
    throw new Error(`Wokou commission must be won before reporting home: ${active.id}`);
  }
  if (isTeaRaceQuest(active)) {
    if (active.stage !== "arrived") throw new Error(`Tea race has not reached London: ${active.id}`);
    if (!teaRaceCargoHeld(state, active)) throw new Error(`Tea race cargo is incomplete: ${active.id}`);
    for (const requirement of active.teaRaceCargoRequirements) {
      deliverQuestCargo(state, city, requirement.goodId, requirement.quantity, active.id, context);
    }
  }
  if (isCourtEnvoyQuest(active) && active.courtMatterId) {
    assertSimulationMinute(context.simMinute);
    if (!Array.isArray(context.portCities)) {
      throw new Error("Court commission completion requires the current port list");
    }
    active.courtResolution = completeCourtCommission(
      state.relations.courts,
      state.relations.diplomacy,
      {
        matterId: active.courtMatterId,
        questId: active.id,
        simMinute: context.simMinute,
        portCities: context.portCities
      }
    );
    recordCourtMissionAuthority(
      state.relations.authority,
      active.courtAuthorityFactionId,
      context.simMinute,
      active.courtResolution.action?.notice || active.id
    );
  }
  if (isReligiousPassengerQuest(active) && active.itinerary &&
      questDestinationStops(active).length !== 0) {
    throw new Error(`Religious itinerary is incomplete: ${active.id}`);
  }
  if (isEastAsianMissionQuest(active)) {
    if (active.eastAsianMissionId === EAST_ASIAN_MISSION_NINGBO && active.eastAsianStage !== "resolved") {
      throw new Error(`Ningbo mission battle is unresolved: ${active.eastAsianStage}`);
    }
    if (active.eastAsianMissionId === EAST_ASIAN_MISSION_PORTUGUESE_GUNS && (
      !active.itinerary ||
      questDestinationStops(active).length !== 0
    )) {
      throw new Error(`Portuguese artillery itinerary is incomplete: ${active.id}`);
    }
    active.eastAsianResolution = applyEastAsianMissionConsequences(state, active, context);
  }
  if (isTreatyOfMadridQuest(active) && !active.envoyWorldResolution) {
    active.treatyOfMadridResolution = completeTreatyOfMadridMission(
      state,
      active,
      context.simMinute ?? state.survival.lastMinute
    );
  }
  if (religiousMissionChallengesPapalAuthority(active)) {
    if (!active.itinerary) {
      recordProtestantMissionAuthority(
        state.relations.authority,
        active.originFactionId,
        context.simMinute ?? state.survival.lastMinute,
        religiousMissionTitle(active)
      );
    }
  }
  if (active.envoyWorldResolution && isTributeEnvoyQuest(active) && !active.tributeDelivered) {
    returnRecalledTributeCargo(state, active);
  }
  state.doubloons += active.reward;
  quests.completed[active.id] = true;
  quests[activeSlot] = null;
  if (active.kind === "delivery" && active.onboarding === true) {
    quests.onboardingDeliveriesCompleted = Math.min(
      ONBOARDING_DELIVERY_COUNT,
      quests.onboardingDeliveriesCompleted + 1
    );
  }
  recordDecision(state, `quest.complete.${active.id}`, 1);
  const missionFactionId = active.originFactionId || active.factionId || city.factionId || null;
  if (!isEnvoyQuest(active) && missionFactionId &&
      missionFactionId !== NEUTRAL_FACTION_ID && missionFactionId !== PIRATE_FACTION_ID) {
    recordDecision(state, `reputation.mission.${assertFactionId(missionFactionId)}`, 1);
  }
  if (active.kind === "delivery" && active.factionId) recordDeliveryForFaction(state, active.factionId);
  if (isTeaRaceQuest(active)) recordDeliveryForFaction(state, active.originFactionId);
  if (active.kind === "passenger" && active.originFactionId) {
    recordDeliveryForFaction(state, active.originFactionId);
  }
  if (isEnvoyQuest(active)) {
    adjustFactionReputation(state, active.originFactionId, ENVOY_HOME_REPUTATION);
    recordDecision(state, `reputation.envoy.${active.originFactionId}`, 1);
    if (isImperialElectionEnvoyQuest(active) &&
        state.relations.imperial.emperorOfficeVacant !== true) {
      const emperorFactionId = state.relations.imperial.emperorFactionId;
      if (emperorFactionId !== active.originFactionId) {
        adjustFactionReputation(state, emperorFactionId, 5);
        recordDecision(state, `reputation.imperial-service.${emperorFactionId}`, 1);
      }
    }
  }
  if (isCaptureCommissionQuest(active)) {
    if (!active.captureCommissionResolution) {
      const reputationGain = isCaptureCapitalQuest(active)
        ? CAPTURE_CAPITAL_MISSION_REPUTATION_GAIN
        : CAPTURE_PORT_MISSION_REPUTATION_GAIN;
      adjustFactionReputation(state, active.originFactionId, reputationGain);
      recordDecision(state, `reputation.${active.kind}.${active.originFactionId}`, 1);
    }
  }
  if (isWokouHuntQuest(active)) {
    adjustFactionReputation(state, active.originFactionId, WOKOU_HUNT_REPUTATION_GAIN);
    recordDecision(state, `reputation.wokou-hunt.${active.originFactionId}`, 1);
    adjustSovereignAuthority(state.relations.authority, active.originFactionId, 0.8, {
      simMinute: context.simMinute ?? state.survival.lastMinute,
      source: "wokou-suppression-completed",
      detail: active.targetName || active.id
    });
  }
  recordLedgerEntry(state, city, context, {
    kind: "income",
    description: isTeaRaceQuest(active)
      ? "New tea race prize"
      : active.kind === "passenger"
      ? "Passenger fare"
      : isEnvoyQuest(active)
        ? isTreatyOfMadridQuest(active)
          ? "Treaty of Madrid mission"
          : "Diplomatic mission"
        : isCaptureCommissionQuest(active)
          ? active.captureCommissionResolution
            ? `Recalled crown commission: ${active.targetName}`
            : `Crown commission: captured ${active.targetName}`
          : isWokouHuntQuest(active)
            ? "Wokou suppression commission"
            : "Delivery reward",
    goodId: null,
    quantity: 1,
    amount: active.reward,
    costBasis: null,
    pnl: null
  });
  return active;
}

function applyEastAsianMissionConsequences(state, quest, context) {
  if (quest.eastAsianConsequencesApplied === true) return quest.eastAsianResolution;
  if (quest.eastAsianRequiresOutcome && !quest.eastAsianOutcomeId) {
    throw new Error(`East Asian mission requires an outcome: ${quest.eastAsianMissionId}`);
  }
  const simMinute = context.simMinute ?? state.survival.lastMinute;
  assertSimulationMinute(simMinute);
  const authorityEvents = [];
  const diplomacyEvents = [];
  const reputationChanges = [];
  const tradeAccessGrants = [];
  const batteryUpgrades = [];
  const reputation = (factionId, amount) => {
    adjustFactionReputation(state, factionId, amount);
    reputationChanges.push(Object.freeze({ factionId, amount }));
  };
  const authority = (factionId, amount, source) => {
    const event = adjustSovereignAuthority(state.relations.authority, factionId, amount, {
      simMinute,
      source,
      detail: quest.eastAsianMissionId
    });
    if (event) authorityEvents.push(event);
  };
  const diplomacy = (factionAId, factionBId, direction) => {
    diplomacyEvents.push(...adjustDiplomaticStance(
      state.relations.diplomacy,
      factionAId,
      factionBId,
      direction,
      simMinute,
      { homeFactionId: state.playerCharacter?.nationalityId || null }
    ));
  };
  const grantTrade = (policyId, factionId) => {
    if (openSovereignTradeToFaction(state, policyId, factionId)) {
      tradeAccessGrants.push(Object.freeze({ policyId, factionId }));
    }
  };

  if (quest.eastAsianMissionId === EAST_ASIAN_MISSION_NINGBO) {
    const origin = quest.eastAsianStartingFactionId;
    const rival = origin === "hosokawa" ? "ouchi" : "hosokawa";
    if (!NINGBO_MISSION_FACTIONS.has(origin)) {
      throw new Error(`Ningbo mission has invalid starting faction: ${origin}`);
    }
    if (quest.eastAsianOutcomeId === "support-origin") {
      reputation(origin, 10);
      reputation(rival, -8);
      reputation("ming", -5);
      diplomacy("ming", origin, "improve");
      authority(origin, 0.8, "ningbo-tally-recognized");
      authority(rival, -0.5, "ningbo-tally-rejected");
      grantTrade(MING_TRADE_POLICY_ID, origin);
    } else if (quest.eastAsianOutcomeId === "mediate") {
      reputation(origin, 5);
      reputation(rival, 5);
      reputation("ming", 3);
      diplomacy("hosokawa", "ouchi", "improve");
      authority("japan", 0.8, "ningbo-delegations-reconciled");
      grantTrade(MING_TRADE_POLICY_ID, "hosokawa");
      grantTrade(MING_TRADE_POLICY_ID, "ouchi");
    } else if (quest.eastAsianOutcomeId === "support-rival") {
      reputation(origin, -12);
      reputation(rival, 10);
      reputation("ming", -5);
      diplomacy("ming", rival, "improve");
      authority(origin, -0.8, "ningbo-mission-defected");
      authority(rival, 0.8, "ningbo-tally-recognized");
      grantTrade(MING_TRADE_POLICY_ID, rival);
    } else {
      throw new Error(`Unhandled Ningbo mission outcome: ${quest.eastAsianOutcomeId}`);
    }
  } else if (quest.eastAsianMissionId === EAST_ASIAN_MISSION_TSUSHIMA) {
    if (quest.eastAsianOutcomeId === "renew-privileges") {
      reputation("so", 8);
      reputation("joseon", 3);
      diplomacy("so", "joseon", "improve");
      authority("so", 0.8, "tsushima-privileges-renewed");
      grantTrade(JOSEON_TRADE_POLICY_ID, "so");
    } else if (quest.eastAsianOutcomeId === "reform-register") {
      reputation("so", 6);
      reputation("joseon", 6);
      diplomacy("so", "joseon", "improve");
      authority("so", 0.5, "tsushima-register-reformed");
      authority("joseon", 0.5, "japanese-envoys-registered");
      grantTrade(JOSEON_TRADE_POLICY_ID, "so");
    } else if (quest.eastAsianOutcomeId === "expose-false-envoys") {
      reputation("so", -10);
      reputation("joseon", 9);
      diplomacy("so", "joseon", "worsen");
      authority("so", -1, "false-envoys-exposed");
      authority("joseon", 0.4, "false-envoys-exposed");
    } else {
      throw new Error(`Unhandled Tsushima mission outcome: ${quest.eastAsianOutcomeId}`);
    }
  } else if (quest.eastAsianMissionId === EAST_ASIAN_MISSION_PORTUGUESE_GUNS) {
    if (!Array.isArray(quest.eastAsianBatteryUpgrades) || quest.eastAsianBatteryUpgrades.length !== 3) {
      throw new Error(`Portuguese guns mission requires three completed battery refits: ${quest.id}`);
    }
    batteryUpgrades.push(...quest.eastAsianBatteryUpgrades);
    reputation("ming", 8);
    authority("ming", 1.2, "portuguese-artillery-adopted");
  } else if (quest.eastAsianMissionId === EAST_ASIAN_MISSION_RYUKYU) {
    reputation("ming", 5);
    reputation("ryukyu", 7);
    diplomacy("ming", "ryukyu", "improve");
    authority("ming", 0.4, "ryukyu-investiture");
    authority("ryukyu", 0.7, "royal-investiture");
  } else if (quest.eastAsianMissionId === EAST_ASIAN_MISSION_GREAT_RITES) {
    reputation("ming", 7);
    authority("ming", 0.7, "great-rites-memorial-received");
  } else if (quest.eastAsianMissionId === EAST_ASIAN_MISSION_YOSHIHARU) {
    reputation("japan", 7);
    reputation("ouchi", 4);
    diplomacy("japan", "ouchi", "improve");
    authority("japan", 0.9, "yoshiharu-order-obeyed");
  } else {
    throw new Error(`Unknown East Asian mission completion: ${quest.eastAsianMissionId}`);
  }

  const resolution = Object.freeze({
    missionId: quest.eastAsianMissionId,
    outcomeId: quest.eastAsianOutcomeId || null,
    reputationChanges: Object.freeze(reputationChanges),
    diplomacyEvents: Object.freeze(diplomacyEvents),
    authorityEvents: Object.freeze(authorityEvents),
    tradeAccessGrants: Object.freeze(tradeAccessGrants),
    batteryUpgrades: Object.freeze(batteryUpgrades)
  });
  quest.eastAsianResolution = resolution;
  quest.eastAsianConsequencesApplied = true;
  return resolution;
}

const NINGBO_MISSION_FACTIONS = new Set(["hosokawa", "ouchi"]);

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
    mass: stats.mass
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
    (targets.food - loadoutHardtackUnits(state)) * FOOD_RATIONS_PER_HOLD_UNIT / hardtack.unitSize
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
  const basis = cargoCostBasisForValidatedState(state, goodId);
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
    food: loadoutHardtackUnits(state),
    water: state.survival.freshWater
  };
}

function loadoutShortfalls(state, plan) {
  const targets = loadoutRestockProvisionTargets(state, plan);
  return {
    crew: Math.max(0, plan.crew - state.ship.crew),
    cannons: Math.max(0, plan.cannons - state.ship.cannons),
    food: Math.max(0, targets.food - loadoutHardtackUnits(state)),
    water: Math.max(0, targets.water - state.survival.freshWater)
  };
}

function loadoutRestockProvisionTargets(state, plan) {
  const allocation = loadoutProvisionAllocation(state, plan);
  const protectedFood = Math.max(
    allocation.foodUnits,
    Math.min(loadoutHardtackUnits(state), allocation.availableSpace)
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
    missingFood: Math.max(0, allocation.foodUnits - loadoutHardtackUnits(state)),
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
  const actualProvisionSpace = loadoutHardtackUnits(state) +
    freshWaterHoldUnits(state.survival.freshWater);
  const provisionSpaceAlreadyAboard = Math.min(actualProvisionSpace, plan.storesSpace);
  const nonProvisionSpace = cargoUnitsFromTicks(
    cargoUsedTicksForValidatedState(state)
  ) - provisionSpaceAlreadyAboard;
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

function loadoutHardtackUnits(state) {
  const hardtack = tradeGoodById(HARDTACK_GOOD_ID);
  return hardtack.unitSize * (state.cargo[HARDTACK_GOOD_ID] || 0);
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

function unprotectedFoodRations(row, protectedCargoQuantities) {
  const heldRations = foodRationsForCargoQuantity(row.quantity);
  const protectedQuantity = protectedCargoQuantities[row.good.id] || 0;
  const protectedRations = Math.round(protectedQuantity * FOOD_RATIONS_PER_HOLD_UNIT);
  return Math.max(0, heldRations - protectedRations);
}

function unprotectedCargoQuantity(heldQuantity, protectedQuantity = 0) {
  return Math.max(0, heldQuantity - protectedQuantity);
}

function validateProtectedCargoQuantities(quantities) {
  if (quantities === undefined) return {};
  if (!quantities || typeof quantities !== "object" || Array.isArray(quantities)) {
    throw new Error("Protected quest cargo quantities must be an object");
  }
  for (const [goodId, quantity] of Object.entries(quantities)) {
    goodById(goodId);
    if (!Number.isFinite(quantity) || quantity < 0) {
      throw new Error(`Invalid protected quest cargo quantity: ${goodId}=${quantity}`);
    }
  }
  return quantities;
}

function compareFoodConsumptionCandidates(a, b) {
  if (a.unprotectedRations !== b.unprotectedRations) {
    if (a.unprotectedRations === 0) return 1;
    if (b.unprotectedRations === 0) return -1;
  }
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

function consumeCheapestFoodRation(state, protectedCargoQuantities = {}) {
  const candidates = edibleCargoRows(state)
    .map((row) => ({
      ...row,
      unprotectedRations: unprotectedFoodRations(row, protectedCargoQuantities)
    }))
    .sort(compareFoodConsumptionCandidates);
  const row = candidates[0];
  if (!row) return null;
  return consumeFoodRationFromRow(state, row);
}

function consumeFoodRationByGoodId(
  state,
  goodId,
  { protectedCargoQuantities = {}, allowProtected = true } = {}
) {
  const good = tradeGoodById(goodId);
  if (good.category !== "food") throw new Error(`${good.label} is not edible companion food`);
  const quantity = state.cargo[goodId] || 0;
  if (quantity <= 0) return null;
  const row = { good, quantity };
  if (!allowProtected && unprotectedFoodRations(row, protectedCargoQuantities) <= 0) return null;
  return consumeFoodRationFromRow(state, row);
}

function consumeFoodRationFromRow(state, row) {
  const held = state.cargo[row.good.id] || 0;
  const basis = cargoCostBasisForValidatedState(state, row.good.id);
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

function consumeRestrictedAnimalFood(
  state,
  requirements,
  elapsedDays,
  consumedEntries,
  protectedCargoQuantities
) {
  if (!Array.isArray(requirements) || !Array.isArray(consumedEntries)) {
    throw new Error("Restricted animal feeding requires arrays");
  }
  let changed = false;
  for (const requirement of requirements) {
    const companion = animalCompanionState(
      state.memory.animalCompanions,
      requirement.companionId
    );
    companion.restrictedFoodRationDebt += elapsedDays * requirement.rationsPerDay;
    const rationCount = Math.floor(companion.restrictedFoodRationDebt);
    companion.restrictedFoodRationDebt = foodRationDebtRemainder(
      companion.restrictedFoodRationDebt - rationCount
    );
    if (elapsedDays > 0) changed = true;
    for (let ration = 0; ration < rationCount; ration += 1) {
      const consumed = consumeFoodRationByGoodId(state, requirement.goodId, {
        protectedCargoQuantities,
        allowProtected: false
      });
      if (consumed) consumedEntries.push(consumed);
      // A companion without its preferred cargo catches its own food offscreen.
    }
  }
  return changed;
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

function consumeDrinkSupply(state, waterUse, {
  allowCargoReserve = true,
  allowWine = false,
  protectedCargoQuantities = {}
} = {}) {
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

  const consumeCargoWater = (allowProtected) => {
    while (allowCargoReserve && remainingUse > 1e-8) {
      const held = state.cargo[FRESH_WATER_GOOD_ID] || 0;
      const available = allowProtected
        ? held
        : unprotectedCargoQuantity(held, protectedCargoQuantities[FRESH_WATER_GOOD_ID]);
      if (available < 1 - 1e-8) break;
      const unit = consumeCargoUnit(state, FRESH_WATER_GOOD_ID);
      if (!unit) break;
      cargoConsumed += 1;
      const unitWater = FRESH_WATER_USE_PER_DAY * FRESH_WATER_CARGO_DAYS;
      const unitUse = Math.min(unitWater, remainingUse);
      waterConsumed += unitUse;
      remainingUse -= unitUse;
      const leftover = unitWater - unitUse;
      if (leftover > 0) {
        state.survival.freshWater = Math.min(
          state.survival.freshWaterCapacity,
          state.survival.freshWater + leftover
        );
      }
      changed = true;
    }
  };
  const consumeWine = (allowProtected) => {
    if (!allowWine || remainingUse <= 1e-8) return;
    const held = state.cargo[WINE_GOOD_ID] || 0;
    const available = allowProtected
      ? held
      : unprotectedCargoQuantity(held, protectedCargoQuantities[WINE_GOOD_ID]);
    const unitUse = Math.min(available, remainingUse);
    if (unitUse <= 1e-8) return;
    consumeDrinkQuantity(state, WINE_GOOD_ID, unitUse);
    wineConsumed += unitUse;
    remainingUse -= unitUse;
    changed = true;
  };

  consumeCargoWater(false);
  consumeWine(false);
  consumeCargoWater(true);
  consumeWine(true);

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
  const basis = cargoCostBasisForValidatedState(state, goodId);
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
  const basis = cargoCostBasisForValidatedState(state, goodId);
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

function initialFactionReputation(playerFactionId, playerReligionId, startMinute, voyageSeed) {
  const homeFactionId = playerFactionId === null ? null : assertFactionId(playerFactionId);
  return Object.fromEntries(FACTIONS.map((faction) => {
    if (faction.id === PIRATE_FACTION_ID) return [faction.id, PIRATE_START_REPUTATION];
    if (homeFactionId === null) return [faction.id, 0];
    if (faction.id === NEUTRAL_FACTION_ID) return [faction.id, 0];
    if (playerReligionId) {
      return [faction.id, initialReligiousFactionReputation({
        playerFactionId: homeFactionId,
        playerReligionId,
        targetFactionId: faction.id,
        simMinute: startMinute,
        seedKey: voyageSeed
      })];
    }
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

function convertEnglishCatholicsInTree(value, seen = new WeakMap()) {
  if (value === null || typeof value !== "object") {
    return { value, changed: false, count: 0 };
  }
  if (seen.has(value)) return seen.get(value);
  const convertedCharacter = convertEnglishCatholicCharacter(value);
  if (convertedCharacter !== value) {
    return { value: convertedCharacter, changed: true, count: 1 };
  }
  const output = Array.isArray(value) ? [...value] : { ...value };
  const result = { value, changed: false, count: 0 };
  seen.set(value, result);
  for (const [key, child] of Object.entries(value)) {
    const converted = convertEnglishCatholicsInTree(child, seen);
    if (!converted.changed) continue;
    output[key] = converted.value;
    result.changed = true;
    result.count += converted.count;
  }
  if (result.changed) result.value = output;
  return result;
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

  const current = portCities.find((port) => port.tileId === quest[tileField]);
  if (current) {
    const changed = quest[nameField] !== cityLabel(current) ||
      quest[countryField] !== (current.country || "") ||
      quest[keyField] !== cityKey(current);
    updateQuestEndpointIdentity(quest, endpoint, current);
    return Number(changed);
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

function reconcileQuestItinerary(quest, portCities) {
  if (!quest.itinerary) return 0;
  let updates = 0;
  const movedTileIds = new Map();
  for (const stop of quest.itinerary.stops) {
    const previousTileId = stop.tileId;
    const port = reconciledPortReference(portCities, {
      tileId: stop?.tileId,
      name: stop?.name,
      country: stop?.country
    });
    if (!port) continue;
    const changed = port.tileId !== stop.tileId || stop.name !== cityLabel(port) ||
      stop.country !== (port.country || "") || stop.factionId !== (port.factionId || null) ||
      stop.key !== cityKey(port);
    if (!changed) continue;
    stop.tileId = port.tileId;
    stop.name = cityLabel(port);
    stop.country = port.country || "";
    stop.factionId = port.factionId || null;
    stop.key = cityKey(port);
    if (previousTileId !== port.tileId) movedTileIds.set(previousTileId, port.tileId);
    updates += 1;
  }
  quest.itinerary.completedTileIds = quest.itinerary.completedTileIds
    .map((tileId) => movedTileIds.get(tileId) ?? tileId);
  validateQuestItinerary(quest.itinerary);
  const next = questDestinationStops(quest)[0];
  if (next) {
    const destination = portCities.find((port) => port.tileId === next.tileId);
    if (destination) updateQuestEndpointIdentity(quest, "destination", destination);
  }
  return updates;
}

function reconciledPortReference(portCities, { tileId, name, country = "" }) {
  if (typeof name !== "string" || name.trim() === "") return null;
  const current = portCities.find((port) => port.tileId === tileId);
  if (current) return current;
  let candidates = portCities.filter((port) => cityLabel(port) === name);
  if (country) candidates = candidates.filter((port) => port.country === country);
  return candidates.length === 1 ? candidates[0] : null;
}

function updateQuestEndpointIdentity(quest, endpoint, port) {
  quest[`${endpoint}TileId`] = port.tileId;
  quest[`${endpoint}Name`] = cityLabel(port);
  quest[`${endpoint}Country`] = port.country || "";
  quest[`${endpoint}Key`] = cityKey(port);
  if (endpoint === "origin" && quest.kind === "passenger" && !quest.originFactionId) {
    quest.originFactionId = port.factionId;
  }
}

function removeInvalidatedQuestOffers(state, portCities, events) {
  const quests = questMemory(state);
  const portsByTileId = new Map(portCities.map((port) => [port.tileId, port]));
  pruneOfferMap(quests.capturePortOffers, (offer) => {
    const origin = portsByTileId.get(offer?.originTileId);
    const target = portsByTileId.get(offer?.targetTileId);
    return isCaptureCommissionQuest(offer) && origin?.factionId === offer.originFactionId &&
      target?.factionId === offer.targetFactionId &&
      (offer.independentTarget === true
        ? offer.targetFactionId === NEUTRAL_FACTION_ID
        : diplomacyBetweenForState(
            state,
            offer.originFactionId,
            offer.targetFactionId
          ) === DIPLOMACY_WAR);
  }, "capture-offer-invalidated", events);
  pruneOfferMap(quests.courtMissionOffers, (offer) => {
    const origin = portsByTileId.get(offer?.originTileId);
    return !isWokouHuntQuest(offer) || origin?.factionId === offer.originFactionId;
  }, "court-offer-invalidated", events);
  pruneOfferMap(quests.passengerOffers, (offer) => {
    if (!isEnvoyQuest(offer)) return true;
    const origin = portsByTileId.get(offer.originTileId);
    const target = portsByTileId.get(offer.targetTileId);
    return origin?.factionId === offer.originFactionId && target?.factionId === offer.targetFactionId &&
      treatyOfMadridOfferStillValid(state, offer);
  }, "envoy-offer-invalidated", events);
  pruneOfferMap(quests.deliveryOffers, (offer) => {
    if (isTeaRaceQuest(offer)) {
      const origin = portsByTileId.get(offer.originTileId);
      const destination = portsByTileId.get(offer.destinationTileId);
      return origin?.factionId === "ming" && Boolean(destination);
    }
    if (offer?.kind !== "delivery") return true;
    const origin = portsByTileId.get(offer.originTileId);
    const destination = portsByTileId.get(offer.destinationTileId);
    if (!origin || !destination || origin.factionId !== destination.factionId) return false;
    offer.factionId = origin.factionId;
    return true;
  }, "delivery-offer-invalidated", events);
}

function pruneOfferMap(offers, valid, type, events) {
  for (const [key, offer] of Object.entries(offers)) {
    if (valid(offer)) continue;
    delete offers[key];
    events.push(Object.freeze({ type, questId: offer?.id || null }));
  }
}

function reconcileActiveCaptureCommission(state, quest, portCities, events) {
  if (quest.stage === "return") {
    relocateReturningCommission(quest, portCities, events);
    return;
  }
  if (quest.stage !== "capture") return;
  const target = portCities.find((port) => port.tileId === quest.targetTileId) || null;
  const issuingCourtSurvives = portCities.some((port) => port.factionId === quest.originFactionId);
  const targetStillEnemy = target?.factionId === quest.targetFactionId;
  const authorityContinues = targetStillEnemy && (
    quest.independentTarget === true ||
    diplomacyBetweenForState(state, quest.originFactionId, quest.targetFactionId) === DIPLOMACY_WAR
  );
  if (authorityContinues && issuingCourtSurvives) return;

  const originalReward = quest.originalReward ?? quest.reward;
  quest.originalReward = originalReward;
  quest.reward = Math.max(250, Math.round(originalReward * 0.2 / 50) * 50);
  quest.captureCommissionResolution = !issuingCourtSurvives
    ? "issuer-fallen"
    : target?.factionId === quest.originFactionId
      ? "secured-by-allies"
      : targetStillEnemy && quest.independentTarget !== true
        ? "peace-signed"
        : "target-changed-hands";
  quest.stage = "return";
  quest.destinationKey = quest.originKey;
  quest.destinationTileId = quest.originTileId;
  quest.destinationName = quest.originName;
  quest.destinationCountry = quest.originCountry;
  relocateReturningCommission(quest, portCities, events);
  events.push(Object.freeze({
    type: "capture-commission-recalled",
    questId: quest.id,
    reason: quest.captureCommissionResolution
  }));
}

function reconcileActiveEnvoyMission(quest, portCities, events) {
  if (quest.stage === "return") {
    relocateReturningCommission(quest, portCities, events);
    return;
  }
  if (quest.stage !== "outbound") return;
  const target = portCities.find((port) => port.tileId === quest.targetTileId) || null;
  if (target?.factionId === quest.targetFactionId) return;
  const replacement = preferredFactionPort(portCities, quest.targetFactionId);
  if (replacement) {
    updateQuestEndpointIdentity(quest, "target", replacement);
    updateQuestEndpointIdentity(quest, "destination", replacement);
    events.push(Object.freeze({
      type: "envoy-court-relocated",
      questId: quest.id,
      destinationTileId: replacement.tileId
    }));
    return;
  }

  quest.envoyWorldResolution = "target-court-fallen";
  quest.originalReward = quest.originalReward ?? quest.reward;
  quest.reward = Math.max(100, Math.round(quest.originalReward * 0.5 / 25) * 25);
  quest.stage = "return";
  quest.destinationKey = quest.originKey;
  quest.destinationTileId = quest.originTileId;
  quest.destinationName = quest.originName;
  quest.destinationCountry = quest.originCountry;
  if (quest.dialogue) {
    quest.dialogue.returnUnderway = "The court we were sent to has fallen. We must return the sealed papers and entrusted cargo.";
    quest.dialogue.homecoming = "The embassy could not be heard, but you brought the envoy and seals home safely. The treasury will pay the voyage's retainer.";
  }
  relocateReturningCommission(quest, portCities, events);
  events.push(Object.freeze({ type: "envoy-recalled", questId: quest.id }));
}

function relocateReturningCommission(quest, portCities, events) {
  const current = portCities.find((port) => port.tileId === quest.originTileId) || null;
  if (current?.factionId === quest.originFactionId) {
    updateQuestEndpointIdentity(quest, "destination", current);
    return;
  }
  const replacement = preferredFactionPort(portCities, quest.originFactionId);
  if (!replacement) return;
  updateQuestEndpointIdentity(quest, "origin", replacement);
  updateQuestEndpointIdentity(quest, "destination", replacement);
  events.push(Object.freeze({
    type: "commission-office-relocated",
    questId: quest.id,
    destinationTileId: replacement.tileId
  }));
}

function preferredFactionPort(portCities, factionId) {
  return portCities
    .filter((port) => port.factionId === factionId)
    .sort((left, right) => (
      Number(right.capitalOfFactionId === factionId) - Number(left.capitalOfFactionId === factionId) ||
      Number(right.population || 0) - Number(left.population || 0) ||
      cityKey(left).localeCompare(cityKey(right))
    ))[0] || null;
}

function returnRecalledTributeCargo(state, quest) {
  const missing = [];
  for (const requirement of quest.tributeCargoRequirements) {
    const held = state.cargo[requirement.goodId] || 0;
    const returned = Math.min(held, requirement.quantity);
    if (returned < requirement.quantity) {
      missing.push(Object.freeze({
        goodId: requirement.goodId,
        quantity: requirement.quantity - returned
      }));
    }
    if (returned <= 0) continue;
    state.cargo[requirement.goodId] = held - returned;
    if (state.cargo[requirement.goodId] <= 0) {
      delete state.cargo[requirement.goodId];
      delete state.accounts.cargoCostBasis[requirement.goodId];
    }
  }
  quest.tributeReturned = missing.length === 0;
  quest.recalledTributeMissing = missing;
  if (missing.length > 0) quest.reward = 0;
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
  if (waypoint.questCargoGoodId !== undefined && (
    waypoint.reason !== PORT_NAVIGATION_REASON_QUEST_CARGO ||
    typeof waypoint.questCargoGoodId !== "string" ||
    waypoint.questCargoGoodId === ""
  )) {
    throw new Error("Optional quest cargo waypoint requires a trade good id");
  }
  if (waypoint.tradeGoodId !== undefined && (
    waypoint.reason !== PORT_NAVIGATION_REASON_TRADE_PRICE ||
    typeof waypoint.tradeGoodId !== "string" ||
    waypoint.tradeGoodId === ""
  )) {
    throw new Error("Optional trade-price waypoint requires a trade good id");
  }
  if (waypoint.shipyardMaterialGoodId !== undefined && (
    waypoint.reason !== PORT_NAVIGATION_REASON_SHIPYARD_SUPPLY ||
    typeof waypoint.shipyardMaterialGoodId !== "string" ||
    waypoint.shipyardMaterialGoodId === ""
  )) {
    throw new Error("Optional shipyard-supply waypoint requires a trade good id");
  }
  if (waypoint.reason === PORT_NAVIGATION_REASON_SHIPYARD_SUPPLY &&
      waypoint.shipyardMaterialGoodId === undefined) {
    throw new Error("Optional shipyard-supply waypoint is missing its trade good id");
  }
  if (waypoint.questCargoGoodId !== undefined) tradeGoodById(waypoint.questCargoGoodId);
  if (waypoint.shipyardMaterialGoodId !== undefined) {
    tradeGoodById(waypoint.shipyardMaterialGoodId);
  }
  if (waypoint.tradeGoodId !== undefined) tradeGoodById(waypoint.tradeGoodId);
}

function assertShipResourceState(state) {
  if (!state || typeof state !== "object") throw new Error("Missing game state");
  assertCargoCapacity(state.cargoCapacity);
  if (!state.cargo || typeof state.cargo !== "object" || Array.isArray(state.cargo)) {
    throw new Error("Game state cargo must be an object");
  }
  assertCargoState(state.cargo);
  ensureSurvivalState(state);
  if (state.ship !== null && state.ship !== undefined) assertPlayerShipState(state.ship);
  if (!state.memory || typeof state.memory !== "object") {
    throw new Error("Game state memory must be an object");
  }
  assertCargoReservations(state.memory.cargoReservations);
  if (!state.memory.quests || typeof state.memory.quests !== "object") {
    throw new Error("Game state ship resources require quest memory");
  }
  if (!state.memory.colonization || typeof state.memory.colonization !== "object") {
    throw new Error("Game state ship resources require colonization memory");
  }
  if (!state.memory.animalCompanions || typeof state.memory.animalCompanions !== "object") {
    throw new Error("Game state ship resources require animal companion memory");
  }
  if (!state.relations?.papacy || typeof state.relations.papacy !== "object") {
    throw new Error("Game state ship resources require Papal relations");
  }
}

function assertSurvivalUpdateState(state) {
  assertShipResourceState(state);
  if (!state.accounts || typeof state.accounts !== "object" ||
      !state.accounts.cargoCostBasis ||
      typeof state.accounts.cargoCostBasis !== "object" ||
      Array.isArray(state.accounts.cargoCostBasis)) {
    throw new Error("Game state survival requires cargo cost-basis accounts");
  }
  if (!state.memory.decisions || typeof state.memory.decisions !== "object" ||
      Array.isArray(state.memory.decisions)) {
    throw new Error("Game state survival requires decision memory");
  }
}

function assertGameState(state) {
  if (!state || typeof state !== "object") throw new Error("Missing game state");
  validateVoyageSeed(state.voyageSeed);
  validateVoyageStartProfile(state.voyageStartProfile);
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
  validateIllicitTradeEnforcementMemory(state.memory.illicitTradeEnforcement);
  validateChartReframeDialogueMemory(state.memory.chartReframeDialogue);
  validateShipyardInvestmentMemory(state.memory.shipyardInvestment);
  assertCargoReservations(state.memory.cargoReservations);
  assertMissionItemGifts(state.memory.missionItemGifts);
  assertDiplomaticQuestMemory(state.memory.quests);
  validateQuestCargoDeliveryMemory(state.memory.quests?.cargoDeliveries);
  validateJapaneseMatchlockQuestMemory(state.memory.quests?.japaneseMatchlocks);
  validateCaribbeanGingerQuestMemory(state.memory.quests?.caribbeanGinger);
  validateChefQuestMemory(state.memory.quests?.chef);
  validatePirateCaptiveQuestMemory(state.memory.quests?.pirateCaptive);
  validateCastawayQuestMemory(state.memory.quests?.castaway);
  validateNaturalistQuestMemory(state.memory.quests?.naturalist);
  validateHospitallerMaltaQuestMemory(state.memory.quests?.hospitallerMalta);
  validateConquistadorQuestMemory(state.memory.quests?.conquistador);
  validateSovereignWarLoanMemory(state.memory.quests?.sovereignWarLoan);
  validateColonizationQuestMemory(state.memory.colonization);
  validatePortConquestMemory(state.memory.conquest);
  validateVoyageAchievementProgress(state.memory.achievements);
  validateWhaleMemory(state.memory.whales);
  validateIcebergMemory(state.memory.icebergs);
  validateAnimalEncounterMemory(state.memory.animals);
  validateAnimalCompanionMemory(state.memory.animalCompanions);
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
  const {
    lastLongitudeDeg,
    cumulativeLongitudeDeg,
    minimumCumulativeLongitudeDeg,
    maximumCumulativeLongitudeDeg,
    optionalWaypoints
  } = state.memory.navigation;
  if (lastLongitudeDeg !== null && !Number.isFinite(lastLongitudeDeg)) {
    throw new Error(`Invalid last navigation longitude: ${lastLongitudeDeg}`);
  }
  if (!Number.isFinite(cumulativeLongitudeDeg)) {
    throw new Error(`Invalid cumulative navigation longitude: ${cumulativeLongitudeDeg}`);
  }
  if (!Number.isFinite(minimumCumulativeLongitudeDeg) ||
      minimumCumulativeLongitudeDeg > cumulativeLongitudeDeg) {
    throw new Error(`Invalid minimum cumulative navigation longitude: ${minimumCumulativeLongitudeDeg}`);
  }
  if (!Number.isFinite(maximumCumulativeLongitudeDeg) ||
      maximumCumulativeLongitudeDeg < cumulativeLongitudeDeg) {
    throw new Error(`Invalid maximum cumulative navigation longitude: ${maximumCumulativeLongitudeDeg}`);
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
  if (ship.loadoutId !== null && typeof ship.loadoutId !== "string") {
    throw new Error(`Invalid ship loadout id: ${ship.loadoutId}`);
  }
}

function migratePortableWeaponItems(savedItems, shipSlug, factionId) {
  const items = savedItems && typeof savedItems === "object" && !Array.isArray(savedItems)
    ? { ...savedItems }
    : {};
  if (!shipSlug || !factionId || Object.entries(items).some(([itemId, count]) => (
    count > 0 && isPortableWeaponItemId(itemId)
  ))) return items;
  const itemId = shipSlug === "viking-longship"
    ? VIKING_BOWS_ITEM_ID
    : regionalStarterPortableWeaponItemIds({ factionId, shipSlug })[0];
  if (!itemId) throw new Error(`No migrated portable weapon for ${factionId}/${shipSlug}`);
  items[itemId] = 1;
  return items;
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
    state.memory.quests = { active: null, passengerActive: null, completed: {} };
  }
  const quests = state.memory.quests;
  if (quests.passengerActive === undefined) quests.passengerActive = null;
  if (!quests.completed || typeof quests.completed !== "object") quests.completed = {};
  if (!quests.failed || typeof quests.failed !== "object") quests.failed = {};
  if (!Number.isInteger(quests.onboardingDeliveriesCompleted) || quests.onboardingDeliveriesCompleted < 0) {
    quests.onboardingDeliveriesCompleted = inferredOnboardingDeliveryProgress(state, quests);
  }
  quests.onboardingDeliveriesCompleted = Math.min(
    ONBOARDING_DELIVERY_COUNT,
    quests.onboardingDeliveriesCompleted
  );
  if (!quests.deliveryOffers || typeof quests.deliveryOffers !== "object") quests.deliveryOffers = {};
  if (!quests.deliveryRolls || typeof quests.deliveryRolls !== "object") quests.deliveryRolls = {};
  if (!quests.capturePortOffers || typeof quests.capturePortOffers !== "object") {
    quests.capturePortOffers = {};
  }
  if (!quests.capturePortRolls || typeof quests.capturePortRolls !== "object") {
    quests.capturePortRolls = {};
  }
  if (!quests.courtMissionOffers || typeof quests.courtMissionOffers !== "object") {
    quests.courtMissionOffers = {};
  }
  if (!quests.courtMissionRolls || typeof quests.courtMissionRolls !== "object") {
    quests.courtMissionRolls = {};
  }
  if (!quests.passengerOffers || typeof quests.passengerOffers !== "object") quests.passengerOffers = {};
  if (!quests.passengerRolls || typeof quests.passengerRolls !== "object") quests.passengerRolls = {};
  return quests;
}

function assertDiplomaticQuestMemory(quests) {
  if (!quests || typeof quests !== "object" || Array.isArray(quests)) {
    throw new Error("Game state quest memory must be an object");
  }
  for (const field of ["completed", "failed", "courtMissionOffers", "courtMissionRolls"]) {
    if (!quests[field] || typeof quests[field] !== "object" || Array.isArray(quests[field])) {
      throw new Error(`Game state quest ${field} must be an object`);
    }
  }
  const diplomaticQuests = [
    quests.active,
    ...Object.values(quests.passengerOffers || {}),
    ...Object.values(quests.courtMissionOffers)
  ].filter((quest) => (
    isTributeEnvoyQuest(quest)
    || isCourtEnvoyQuest(quest)
    || isStatusEnvoyQuest(quest)
    || isImperialElectionEnvoyQuest(quest)
    || isWokouHuntQuest(quest)
  ));
  for (const quest of diplomaticQuests) {
    if (typeof quest.id !== "string" || quest.id === "") {
      throw new Error("Diplomatic quest requires an id");
    }
    if (isTributeEnvoyQuest(quest)) {
      if (!Array.isArray(quest.tributeCargoRequirements) || quest.tributeCargoRequirements.length === 0) {
        throw new Error(`Tribute quest requires sealed cargo: ${quest.id}`);
      }
      for (const requirement of quest.tributeCargoRequirements) {
        tradeGoodById(requirement.goodId);
        if (!Number.isInteger(requirement.quantity) || requirement.quantity <= 0) {
          throw new Error(`Invalid tribute cargo quantity: ${quest.id}/${requirement.goodId}`);
        }
      }
    }
    if (isStatusEnvoyQuest(quest) && !quest.statusProposal) {
      throw new Error(`Status envoy requires proposed terms: ${quest.id}`);
    }
    if (isCourtEnvoyQuest(quest) && (
      (quest.courtMatterId === undefined) !== (quest.courtAuthorityFactionId === undefined) ||
      (quest.courtMatterId !== undefined && (
        typeof quest.courtMatterId !== "string" || quest.courtMatterId === "" ||
        typeof quest.courtAuthorityFactionId !== "string" || quest.courtAuthorityFactionId === ""
      ))
    )) {
      throw new Error(`Court envoy has an incomplete scheduled matter: ${quest.id}`);
    }
    if (isImperialElectionEnvoyQuest(quest) && (
      typeof quest.imperialElectionId !== "string" ||
      !Number.isFinite(quest.imperialElectionMinute) ||
      quest.imperialElectorFactionId !== quest.originFactionId
    )) {
      throw new Error(`Imperial election envoy has incomplete instructions: ${quest.id}`);
    }
    if (isWokouHuntQuest(quest) && (
      typeof quest.targetShipId !== "string" || !Number.isInteger(quest.patrolTileId)
    )) {
      throw new Error(`Wokou quest requires a target ship and patrol port: ${quest.id}`);
    }
  }
  for (const quest of [quests.active, ...Object.values(quests.deliveryOffers || {})]) {
    if (isTeaRaceQuest(quest)) validateTeaRaceQuest(quest);
  }
  for (const quest of [
    quests.active,
    quests.passengerActive,
    ...Object.values(quests.passengerOffers || {})
  ].filter(Boolean)) {
    if (quest.itinerary) validateQuestItinerary(quest.itinerary);
  }
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
  if (!state.relations.imperial) throw new Error("Game state requires Imperial constitutional politics");
  validateImperialConstitution(state.relations.imperial);
  if (!state.relations.papacy) throw new Error("Game state requires papal politics");
  validatePapalPolitics(state.relations.papacy);
  if (!state.relations.courts) throw new Error("Game state requires court politics");
  validateCourtPolitics(state.relations.courts);
  if (!state.relations.authority) throw new Error("Game state requires sovereign authority");
  validateSovereignAuthority(state.relations.authority);
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

function assertUnitRoll(roll, label) {
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) {
    throw new Error(`Invalid ${label} roll: ${roll}`);
  }
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
