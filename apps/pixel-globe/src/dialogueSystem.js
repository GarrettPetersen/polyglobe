import { requireCityId, requireEntityId } from "./entityIds.js";
import {
  FACTION_SAFE_PASSAGE_DAYS,
  PORT_NAVIGATION_REASON_NEW_SHIP,
  PORT_NAVIGATION_REASON_QUEST_CARGO,
  PORT_NAVIGATION_REASON_SHIPYARD_SUPPLY,
  PORT_NAVIGATION_REASON_TRADE_PRICE,
  acknowledgePlayerPortCustomsNotice,
  acceptQuest,
  adjustFactionReputation,
  answerNingboMissionBribe,
  buyGood,
  cargoCostBasis,
  cargoFree,
  cargoFreeForGood,
  cargoHoldStatus,
  cargoQuantityLabel,
  cargoReservationUnits,
  cargoRows,
  cargoSpaceLabel,
  cargoUsed,
  captureCommissionPetitionOptionsForCity,
  capturePortMissionEligibility,
  changePlayerReligion,
  cityLabel,
  completeQuest,
  createMarketUndoSnapshot,
  declineEquipmentFactorPitch,
  deliveryOfferForCity,
  deliverEastAsianMissionLeg,
  deliverReligiousMissionLeg,
  deliverQuestCargoRequirement,
  enterSpecialEquipmentStore,
  factionReputation,
  futurePermanentCrewFloor,
  grantGuaranteedMissionPerkItem,
  grantLetterOfMarque,
  issuePersonalTradePass,
  isCaptureCapitalQuest,
  isCaptureCommissionQuest,
  isEnvoyQuest,
  isWokouHuntQuest,
  letterOfMarqueStatus,
  maybeGrantMissionPerkItem,
  negotiateEnvoyQuest,
  ningboMissionBribeDecision,
  portMemory,
  portEntryStatus,
  playerShipReplacementCargoUsed,
  deliverPlayerShipyardMaterials,
  finishPlayerShipyardInvestment,
  playerCannonEquipment,
  playerFishingNet,
  personalTradePassStatus,
  personalTradePassStatuses,
  playerPortCustomsNotice,
  playerPortAttackStatus,
  privateeringAuthorityIssuerIdsAgainst,
  playerPortugueseCrownSpiceAccess,
  playerWhaleHarpoon,
  playerTradeAccess,
  playerTradeEmbargoPurchaseWarnings,
  playerTradeEmbargoSaleWarnings,
  playerTradeTerms,
  portugueseCartazStatus,
  purchasePortugueseCartaz,
  purchaseCannonEquipment,
  purchaseFishingNet,
  purchasePerkItem,
  purchaseWhaleHarpoon,
  questStateForCity,
  receiveQuestPayment,
  recordNingboMissionArrival,
  recordColonyAuthorityForState,
  recordQuestCargoTheft,
  selectEastAsianMissionOutcome,
  releaseCargoSpace,
  reserveCargoSpace,
  restoreMarketUndoSnapshot,
  restockCustomShipLoadoutAtPort,
  restockShipLoadoutAtPort,
  sellAllGood,
  sellGood,
  questCargoSaleTheftStatus,
  payPlayerShipyardInvestment,
  petitionCaptureCommission,
  startPlayerShipyardInvestment
} from "./gameState.js";
import {
  TRADE_EMBARGO_AUTHORITY_PAPAL,
  tradeEmbargoRegimeLabel,
  tradeEmbargoScopeLabel
} from "./tradeEmbargoes.js";
import { isTeaRaceQuest } from "./teaRaceQuest.js";
import { captureCapitalPoliticalContext } from "./captureCommissionDialogue.js";
import {
  FRESH_WATER_GOOD_ID,
  GINGER_GOOD_ID,
  HARDTACK_GOOD_ID,
  MATCHLOCKS_GOOD_ID,
  establishPortIndustry,
  maximumRepeatedPortPurchaseQuantity,
  maximumPortSaleQuantity,
  maximumPortPurchaseQuantity,
  portEconomySummary,
  portGoodSupply,
  portMarket,
  procureWorldEconomyShipyardMaterials,
  quotePortPurchase,
  quoteRepeatedPortPurchase,
  quotePortSale,
  tradeGoodById,
  worldMarketPriceComparison
} from "./economy.js";
import {
  DIPLOMACY_ALLY,
  DIPLOMACY_FRIENDLY,
  DIPLOMACY_HOSTILE,
  DIPLOMACY_NEUTRAL,
  NEUTRAL_FACTION_ID,
  factionById,
  factionNounPhrase
} from "./factions.js";
import {
  adjustDiplomaticStance,
  declareDiplomaticWar,
  worldDiplomacyBetween
} from "./worldDiplomacy.js";
import { rulerAtMinute } from "./rulers.js";
import { portGreetingPresentationForPersonality, portPersonalityForKey } from "./portDialoguePersonality.js";
import { portFactorRecognitionForCaptain } from "./portFactorRecognition.js";
import {
  occasionalReligiousGreeting,
  protestantColonistReception
} from "./religiousDialogue.js";
import { isIslamicReligion, religionById } from "./characterReligion.js";
import {
  HAJJ_PASSENGER_SCENARIO_ID,
  declinePassengerOffer,
  isHajjPassengerQuest,
  passengerRoleLabel
} from "./passengerMissions.js";
import {
  captainCanParticipateInReligiousMission,
  isReligiousPassengerQuest,
  religiousMissionIconId,
  religiousMissionOffersLutheranConversion,
  religiousMissionParticipation
} from "./religiousMissions.js";
import {
  EAST_ASIAN_MISSION_NINGBO,
  EAST_ASIAN_MISSION_PORTUGUESE_GUNS,
  EAST_ASIAN_MISSION_TSUSHIMA,
  NINGBO_BRIBE_JOURNEY_EVENT_ID,
  NINGBO_DEFECTION_BRIBE,
  PORTUGUESE_GUNS_STOP_COUNT,
  eastAsianMissionHasOutcomes,
  eastAsianMissionOutcomeOptions,
  eastAsianMissionOutcomeResultText,
  isEastAsianMissionQuest
} from "./eastAsianQuestlines.js";
import { markQuestJourneyDialogueSeen } from "./questJourneyDialogue.js";
import { questDestinationStops, questHasDestination } from "./questItinerary.js";
import { HAJJ_PILGRIMAGE_PERK_ITEM_ID } from "./perkItems.js";
import {
  activeForeignSettlements,
  expelledForeignSettlements
} from "./foreignSettlements.js";
import {
  EQUIPMENT_FACTOR_KIND_CANNON,
  EQUIPMENT_FACTOR_KIND_FISHING_NET,
  EQUIPMENT_FACTOR_KIND_PERK_ITEM,
  EQUIPMENT_FACTOR_KIND_WHALE_HARPOON,
  equipmentFactorPitchItem,
  validateEquipmentFactorPitch
} from "./equipmentFactorOffers.js";
import {
  activeQuestCargoReservedQuantities,
  activeQuestCargoSaleStatus
} from "./activeQuestCargo.js";
import { usesPluralAgreement } from "./grammaticalNumber.js";
import {
  CUSTOM_LOADOUT_FIELDS,
  CUSTOM_LOADOUT_ID,
  SHIP_LOADOUT_PRESETS,
  setShipCustomLoadoutValue,
  shipCustomLoadoutBounds,
  shipCustomLoadoutDraft,
  shipCustomLoadoutPlan,
  shipLoadoutPlan
} from "./shipLoadouts.js";
import { cannonReloadWorkRate } from "./navalWeapons.js";
import { crewWorkMultiplier } from "./crewEffectiveness.js";
import { formatDisplayQuantity } from "./displayNumber.js";
import { formatSignedReputation } from "./reputationDisplay.js";
import { validateDialogueDecision } from "./dialogueDecisionValidation.js";
import { shipLabelForSlug, shipStatsForSlug } from "./shipStats.js";
import { shipHandoverHistoryForSlug } from "./shipHandoverDialogue.js";
import { portArrivalPresentation } from "./portArrivalFlavor.js";
import {
  playerShipyardLedger,
  shipReplacementTermsWithoutTradeIn,
  shipyardListingById,
  shipyardListings,
  shipyardPurchaseTerms
} from "./shipyards.js";
import {
  SHIPYARD_INVESTMENT_CAPITAL,
  playerBackedShipyardAtPort,
  shipyardInvestmentAtPort,
  shipyardInvestmentComplete,
  shipyardInvestmentMaterialProgress,
  shipyardInvestmentOfferAvailable
} from "./shipyardInvestment.js";
import { FISHING_NETS } from "./fishingNets.js";
import { CANNON_EQUIPMENT } from "./cannonEquipment.js";
import { WHALE_HARPOONS } from "./whaleHarpoons.js";
import {
  EQUIPMENT_STOCK_CANNON,
  EQUIPMENT_STOCK_FISHING_NET,
  EQUIPMENT_STOCK_WHALE_HARPOON,
  equipmentSpecialistAtPort,
  equipmentStockAtPort,
  saleableEquipmentCatalog
} from "./portEquipment.js";
import { perkItemSummary } from "./perkItems.js";
import { canAddNamedCrewMember, permanentCrewFloor } from "./namedCrew.js";
import {
  CHEF_QUEST_REWARD,
  CHEF_QUEST_STAGE_GATHERING,
  CHEF_QUEST_STAGE_RECRUITED,
  CHEF_QUEST_STAGE_RECRUITMENT,
  chefQuestState,
  completeChefBanquet,
  markChefQuestOfferSeen
} from "./chefQuest.js";
import {
  VIKING_LONGSHIP_PRICE,
  VIKING_LONGSHIP_REWARD_ACCEPTED,
  VIKING_LONGSHIP_REWARD_DECLINED,
  VIKING_LONGSHIP_REWARD_PENDING,
  VIKING_LONGSHIP_REWARD_PURCHASED,
  VIKING_LONGSHIP_SLUG,
  declineVikingLongshipReward,
  deliverVikingLongshipQuestCargo,
  markVikingLongshipOfferSeen,
  vikingLongshipEnthusiastAtPort,
  vikingLongshipQuestState,
  vikingLongshipTradeInPlan
} from "./vikingLongshipQuest.js";
import {
  COLONIZATION_CARGO_RESERVATION_ID,
  COLONIZATION_EXPEDITION_CARGO_UNITS,
  COLONIZATION_FOUNDER_DISCOUNT_MULTIPLIER,
  COLONIZATION_STAGE_AWAITING_RESUPPLY,
  COLONIZATION_STAGE_DEFEND,
  COLONIZATION_STAGE_ESTABLISHED,
  COLONIZATION_STAGE_FAILED,
  COLONIZATION_STAGE_FETCH,
  COLONIZATION_STAGE_OUTBOUND,
  COLONIZATION_STAGE_REPORT_DEFENSE,
  COLONIZATION_STAGE_READY,
  assertColonizationFetchDelivery,
  assertColonizationResupplyDelivery,
  beginColonizationExpedition,
  colonizationQuestView,
  colonizationFetchRequirementId,
  colonizationOriginCanHostExiledSponsor,
  completeColonizationDefense,
  completeColonizationFetchStage,
  establishColony,
  extendColonizationResupplyDeadline,
  grantColonizationApproval,
  isColonizationQuestApproval,
  isColonizationQuestOrigin,
  isColonizationQuestTarget,
  landColonists,
  markColonizationOrganizerApproached
} from "./colonizationQuest.js";
import {
  CONQUISTADOR_ORIGIN_FACTION_ID,
  CONQUISTADOR_STAGE_CAMPAIGN,
  CONQUISTADOR_STAGE_CAPTURE,
  CONQUISTADOR_STAGE_COMPLETE,
  CONQUISTADOR_STAGE_DORMANT,
  CONQUISTADOR_STAGE_FETCH,
  CONQUISTADOR_STAGE_READY,
  CONQUISTADOR_STAGE_REWARD_READY,
  acceptConquistadorQuest,
  beginConquistadorExpedition,
  completeConquistadorFetchStage,
  completeConquistadorQuest,
  conquistadorFetchRequirementId,
  conquistadorCompanyReplenishmentPolicy,
  isConquistadorCompanyReplenishmentPort,
  conquistadorQuestShouldAppearAtCity,
  conquistadorQuestView,
  isConquistadorQuestOrigin,
  isConquistadorQuestTarget,
  markConquistadorOfferSeen,
  replenishConquistadorCompany
} from "./conquistadorQuest.js";
import {
  questCargoDeliverableQuantity,
  questCargoDeliveryProgress,
  questCargoTransfer,
  questCargoTransferFromDelivery,
  questCargoTransfersFromDeliveries
} from "./questCargoDeliveries.js";
import {
  JAPANESE_MATCHLOCK_COMPLETION_REWARD,
  JAPANESE_MATCHLOCK_INITIAL_STOCK,
  JAPANESE_MATCHLOCK_PRODUCTION_PER_DAY,
  assertJapaneseMatchlockDelivery,
  completeJapaneseMatchlockFetchStage,
  japaneseMatchlockQuestState,
  japaneseMatchlockRequirementId,
  markJapaneseMatchlockOfferSeen
} from "./japaneseMatchlockQuest.js";
import {
  CARIBBEAN_GINGER_COMPLETION_REWARD,
  CARIBBEAN_GINGER_INITIAL_STOCK,
  CARIBBEAN_GINGER_PRODUCTION_PER_DAY,
  assertCaribbeanGingerDelivery,
  caribbeanGingerRequirementId,
  caribbeanGingerQuestState,
  completeCaribbeanGingerQuest,
  markCaribbeanGingerOfferSeen
} from "./caribbeanGingerQuest.js";
import {
  PORTUGUESE_CARTAZ_DURATION_DAYS,
  PORTUGUESE_CROWN_SPICE_GOOD_IDS,
  PORTUGUESE_CROWN_SPICE_POLICY_ID,
  isPortugueseEstadoPort,
  resolveRestrictedIllicitMarketAttempt
} from "./tradePolicy.js";
const TRADE_TIP_DISTANCE_SCALE_KM = 1500;

const DRUNK_PORT_EXCHANGES = Object.freeze([
  Object.freeze({
    captain: "Good factor! Your harbor has two quays today, and I have docked at both of them.",
    factor: "You have docked at one quay, captain, and apologized to a bollard. Let us discuss business slowly."
  }),
  Object.freeze({
    captain: "Put every barrel on my account. Except the wine. I believe the wine has already put me on its account.",
    factor: "I see. I shall keep the ledger upright while you attempt the same."
  }),
  Object.freeze({
    captain: "A splendid port! It barely moves at all.",
    factor: "The port is stationary, captain. Please stop correcting its course."
  }),
  Object.freeze({
    captain: "I bring cargo, coin, and an entirely reliable sense of direction.",
    factor: "You entered my office through the sailcloth store. We shall rely on the cargo and coin."
  })
]);

const REPEAT_DRUNK_FACTOR_LINES = Object.freeze([
  (count) => `Again, captain? This makes ${count} arrivals under wine. The quaymaster has begun keeping score.`,
  () => "I remember your last entrance, captain. The same bollard does too.",
  () => "We kept the harbor still for you, just as before. Kindly return the favor.",
  (count) => `The watch has now seen you arrive in this condition ${count} times. At least you are consistent.`
]);

const REMEMBERED_DRUNK_FACTOR_LINES = Object.freeze([
  () => "You have found the correct door today, captain. That is already an improvement on your memorable arrival.",
  () => "A steadier step this time. The quaymaster and his bollards will be relieved.",
  () => "I see the horizon has stopped moving for you. Good. Perhaps the ledger will do the same.",
  () => "No need to steer my office today, captain. We kept it where you left it."
]);

const REMEMBERED_REPEAT_DRUNK_FACTOR_LINES = Object.freeze([
  (count) => `Sober today, captain? After ${count} memorable arrivals, the harbor watch will be relieved.`,
  (count) => `A steady entrance at last. Your other ${count} arrivals are still discussed along the quay.`,
  () => "You recognized both the harbor and my office today. I shall record the improvement.",
  () => "The bollards are safe, the ledger is upright, and so are you. A promising beginning."
]);

export const QUEST_CARGO_HINT_DECLINE_COOLDOWN_MINUTES = 60 * 24 * 60;
const QUEST_CARGO_HINT_DECLINE_DECISION_PREFIX = "quest-cargo.market-hint-declined";

export function createPortDialogueSession(city, options = {}) {
  const cityId = requireCityId(city, "Port dialogue city");
  if (options.rumorText !== undefined && (typeof options.rumorText !== "string" || options.rumorText === "")) {
    throw new Error("Port rumor text must be a non-empty string");
  }
  if (options.drunkVariant !== undefined && (!Number.isInteger(options.drunkVariant) || options.drunkVariant < 0)) {
    throw new Error(`Invalid drunk port dialogue variant: ${options.drunkVariant}`);
  }
  if (options.equipmentFactorPitch !== undefined && options.equipmentFactorPitch !== null) {
    validateEquipmentFactorPitch(options.equipmentFactorPitch);
  }
  if (options.letterOfMarqueFactorOffer !== undefined && options.letterOfMarqueFactorOffer !== null) {
    validateLetterOfMarqueFactorOffer(options.letterOfMarqueFactorOffer);
  }
  if (options.questCargoDeliveryPromptIds !== undefined &&
      (!Array.isArray(options.questCargoDeliveryPromptIds) ||
       options.questCargoDeliveryPromptIds.some((id) => typeof id !== "string" || id === ""))) {
    throw new Error("Port quest cargo delivery prompts must be string ids");
  }
  if (options.shipyardLedgerTab !== undefined &&
      !["yard", "materials", "books"].includes(options.shipyardLedgerTab)) {
    throw new Error(`Unknown shipyard ledger tab: ${options.shipyardLedgerTab}`);
  }
  return {
    kind: "port",
    cityId,
    portId: cityId,
    nodeId: options.initialNodeId || "greeting",
    admittedToPort: options.admittedToPort === true,
    disguisedEntry: options.disguisedEntry === true,
    illicitTradeAccessPolicyId: options.illicitTradeAccessPolicyId || null,
    illicitTradeAttemptedPolicyId: options.illicitTradeAttemptedPolicyId || null,
    illicitTradeVisit: copyIllicitTradeVisit(options.illicitTradeVisit || null),
    portugueseCartazMarketNodeId: null,
    portugueseCartazMarketOfferDeclined: false,
    nextPortNodeId: options.nextPortNodeId || null,
    postDrunkNodeId: options.postDrunkNodeId || null,
    drunkVariant: options.drunkVariant || 0,
    marketPurchases: {},
    marketSales: 0,
    marketBuyGoodIds: [],
    marketSaleGoodIds: [],
    marketUndoNodeId: null,
    marketUndoSnapshot: null,
    marketUndoIllicitTradeVisit: null,
    pendingMarketUndoNodeId: null,
    acknowledgedTradeEmbargoOrderIds: [],
    pendingTradeEmbargoPurchase: null,
    pendingTradeEmbargoSale: null,
    pendingTributeTheft: null,
    pendingQuestCargoSale: null,
    questCargoSaleWarningShown: false,
    tradeTip: null,
    questCargoTip: null,
    shipHandover: null,
    shipyardDividendArrival: null,
    shipyardMaterialArrival: false,
    shipyardArrivalChecked: false,
    shipyardLedgerTab: options.shipyardLedgerTab || "yard",
    shipyardLedgerScrollOffset: 0,
    shipyardLedgerReturnNodeId: null,
    shipyardMaterialSourceHints: null,
    shipyardPurchaseListingId: null,
    shipyardPurchaseReturnNodeId: null,
    shipyardInvestmentArrival: options.shipyardInvestmentArrival === true,
    shipyardInvestmentOfferApproached: false,
    specialEquipmentOffer: null,
    equipmentFactorPitch: options.equipmentFactorPitch || null,
    equipmentFactorPitchOutcome: null,
    letterOfMarqueFactorOffer: options.letterOfMarqueFactorOffer || null,
    letterOfMarqueFactorOfferOutcome: null,
    rulerRumor: options.rulerRumor || null,
    historicalGossip: options.historicalGossip || null,
    rumorText: options.rumorText || null,
    colonizationArrival: options.colonizationArrival === true,
    conquistadorArrival: options.conquistadorArrival === true,
    conquistadorOfferApproached: false,
    conquistadorReplenishmentApproached: false,
    conquistadorRewardApproached: false,
    japaneseMatchlockArrival: options.japaneseMatchlockArrival === true,
    caribbeanGingerArrival: options.caribbeanGingerArrival === true,
    chefQuestArrival: options.chefQuestArrival === true,
    vikingLongshipArrival: options.vikingLongshipArrival === true,
    questCargoDeliveryPromptIds: [...(options.questCargoDeliveryPromptIds || [])],
    colonizationApprovalStep: 0,
    marqueGrantedFactionId: null,
    tradePassPolicyId: null,
    tradePassGrantedPolicyId: null,
    captureCommissionPetitionResult: null,
    customsNoticeKey: null,
    selectedIndex: 0,
    feedback: null
  };
}

export function restorePortDialogueCityIdentity(session, city) {
  if (session?.kind !== "port") throw new Error("Port city identity requires a port dialogue session");
  const cityId = requireCityId(city, "Port dialogue city");
  if (cityId !== session.cityId) {
    throw new Error(`Port dialogue city changed from ${session.cityId} to ${cityId}`);
  }
  if (typeof session.portId !== "string" || session.portId === "") {
    throw new Error("Port dialogue session has no stable port id");
  }
  if (session.portId !== cityId) {
    throw new Error(`Port dialogue city ${cityId} changed canonical identity from ${session.portId}`);
  }
  return {
    ...city,
    portId: session.portId
  };
}

export function createPortArrivalDialogueSession(city, options = {}) {
  const needsLoadout = options.needsLoadout === true;
  const arrivedDrunk = options.arrivedDrunk === true;
  const drunkVariant = options.drunkVariant || 0;
  if (!Number.isInteger(drunkVariant) || drunkVariant < 0) {
    throw new Error(`Invalid drunk port dialogue variant: ${drunkVariant}`);
  }
  if (options.questCharacterSession) {
    if (options.questCharacterSession.cityId !== city.cityId) {
      throw new Error("Port-arrival quest character does not belong to this city");
    }
    const nextPortNodeId = options.openDeliveryMission === true
      ? "quest"
      : needsLoadout
        ? "loadout"
        : "greeting";
    return {
      ...options.questCharacterSession,
      admittedToPort: true,
      continueToPortOnClose: true,
      nextPortNodeId: arrivedDrunk ? "drunk-captain" : nextPortNodeId,
      postDrunkNodeId: arrivedDrunk ? nextPortNodeId : null,
      drunkVariant
    };
  }
  if (options.openDeliveryMission === true) {
    return createPortDialogueSession(city, {
      initialNodeId: arrivedDrunk ? "drunk-captain" : "quest",
      nextPortNodeId: needsLoadout ? "loadout" : "root",
      postDrunkNodeId: arrivedDrunk ? "quest" : null,
      drunkVariant,
      admittedToPort: true
    });
  }
  if (options.vikingLongshipApproach === true) {
    const nextPortNodeId = needsLoadout ? "loadout" : "greeting";
    return createPortDialogueSession(city, {
      initialNodeId: arrivedDrunk ? "drunk-captain" : "viking-longship",
      nextPortNodeId,
      postDrunkNodeId: arrivedDrunk ? "viking-longship" : null,
      drunkVariant,
      vikingLongshipArrival: true,
      admittedToPort: true
    });
  }
  if (options.japaneseMatchlockApproach === true) {
    const nextPortNodeId = needsLoadout ? "loadout" : "greeting";
    return createPortDialogueSession(city, {
      initialNodeId: arrivedDrunk ? "drunk-captain" : "japanese-matchlocks",
      nextPortNodeId,
      postDrunkNodeId: arrivedDrunk ? "japanese-matchlocks" : null,
      drunkVariant,
      japaneseMatchlockArrival: true,
      admittedToPort: true
    });
  }
  if (options.caribbeanGingerApproach === true) {
    const nextPortNodeId = needsLoadout ? "loadout" : "greeting";
    return createPortDialogueSession(city, {
      initialNodeId: arrivedDrunk ? "drunk-captain" : "caribbean-ginger",
      nextPortNodeId,
      postDrunkNodeId: arrivedDrunk ? "caribbean-ginger" : null,
      drunkVariant,
      caribbeanGingerArrival: true,
      admittedToPort: true
    });
  }
  if (options.chefQuestApproach === true) {
    const nextPortNodeId = needsLoadout ? "loadout" : "greeting";
    return createPortDialogueSession(city, {
      initialNodeId: arrivedDrunk ? "drunk-captain" : "chef-quest",
      nextPortNodeId,
      postDrunkNodeId: arrivedDrunk ? "chef-quest" : null,
      drunkVariant,
      chefQuestArrival: true,
      admittedToPort: true
    });
  }
  if (options.colonizationApproach === true) {
    const nextPortNodeId = needsLoadout ? "loadout" : "greeting";
    return createPortDialogueSession(city, {
      initialNodeId: arrivedDrunk ? "drunk-captain" : "colonization",
      nextPortNodeId,
      postDrunkNodeId: arrivedDrunk ? "colonization" : null,
      drunkVariant,
      colonizationArrival: true,
      admittedToPort: true
    });
  }
  if (options.conquistadorApproach === true) {
    const nextPortNodeId = needsLoadout ? "loadout" : "greeting";
    return createPortDialogueSession(city, {
      initialNodeId: arrivedDrunk ? "drunk-captain" : "conquistador",
      nextPortNodeId,
      postDrunkNodeId: arrivedDrunk ? "conquistador" : null,
      drunkVariant,
      conquistadorArrival: true,
      admittedToPort: true
    });
  }
  if (options.equipmentFactorPitch) {
    const nextPortNodeId = needsLoadout ? "loadout" : "greeting";
    return createPortDialogueSession(city, {
      initialNodeId: arrivedDrunk ? "drunk-captain" : "equipment-factor-offer",
      nextPortNodeId,
      postDrunkNodeId: arrivedDrunk ? "equipment-factor-offer" : null,
      drunkVariant,
      equipmentFactorPitch: options.equipmentFactorPitch,
      admittedToPort: true
    });
  }
  if (options.letterOfMarqueFactorOffer) {
    const nextPortNodeId = needsLoadout ? "loadout" : "greeting";
    return createPortDialogueSession(city, {
      initialNodeId: arrivedDrunk ? "drunk-captain" : "marque-factor-offer",
      nextPortNodeId,
      postDrunkNodeId: arrivedDrunk ? "marque-factor-offer" : null,
      drunkVariant,
      letterOfMarqueFactorOffer: options.letterOfMarqueFactorOffer,
      admittedToPort: true
    });
  }
  const initialNodeId = options.rumorText ? "greeting" : needsLoadout ? "loadout" : "greeting";
  return createPortDialogueSession(city, {
    initialNodeId: arrivedDrunk ? "drunk-captain" : initialNodeId,
    admittedToPort: true,
    rumorText: options.rumorText,
    nextPortNodeId: options.nextPortNodeId,
    postDrunkNodeId: arrivedDrunk ? initialNodeId : null,
    drunkVariant
  });
}

export function deliveryMissionShouldOpenOnArrival(gameState, city, portCities) {
  const state = questStateForCity(gameState, city, portCities);
  if (isCaptureCommissionQuest(state.quest) || isWokouHuntQuest(state.quest)) {
    return state.kind === "available" || state.kind === "ready-to-complete";
  }
  if (isTeaRaceQuest(state.quest)) {
    return state.kind === "available" || state.kind === "ready-to-complete";
  }
  return state.quest?.kind === "delivery" &&
    (state.kind === "ready-to-complete" || state.kind === "in-progress-here" ||
      (state.kind === "available" && state.quest.onboarding === true));
}

export function createPassengerDialogueSession(city, quest, options = {}) {
  if (!quest || (quest.kind !== "passenger" && !isEnvoyQuest(quest))) {
    throw new Error("Passenger dialogue requires a passenger or envoy quest");
  }
  return {
    kind: "passenger",
    cityId: requireCityId(city, "Passenger dialogue city"),
    questId: quest.id,
    admittedToPort: options.admittedToPort === true,
    continueToPortOnClose: options.continueToPortOnClose === true,
    nextPortNodeId: options.nextPortNodeId || null,
    envoyNegotiationResult: null,
    hajjUnderway: false,
    religiousParticipationUnderway: false,
    religiousLegDelivery: null,
    lutheranConversionPending: false,
    ningboRivalCharacter: options.ningboRivalCharacter || null,
    journeyEvent: options.journeyEvent || null,
    eastAsianHearingStage: null,
    selectedIndex: 0,
    feedback: null
  };
}

export function preparePassengerDialogueArrival(gameState, city, quest, context = {}) {
  if (!gameState?.memory?.quests) throw new Error("Passenger arrival requires quest memory");
  if (!city || !Number.isInteger(city.tileId)) throw new Error("Passenger arrival requires a placed port");
  if (!quest?.id) throw new Error("Passenger arrival requires a quest");
  if (
    quest.eastAsianMissionId === EAST_ASIAN_MISSION_NINGBO &&
    gameState.memory.quests.passengerActive?.id === quest.id &&
    city.cityId === quest.destinationCityId
  ) {
    recordNingboMissionArrival(gameState, quest.id, context);
  }
  return quest;
}

export function createShipDialogueSession(
  ship,
  {
    attackReason = null,
    rumorText = null,
    cartazInspection = null,
    illicitTradeInspection = null,
    tradeEmbargoInspection = null,
    bibleInspection = null,
    listenerReligionId = null,
    pirateTreasureName = null,
    hostileHail = false,
    scriptedHail = null
  } = {}
) {
  if (attackReason !== null && (typeof attackReason !== "string" || attackReason.trim() === "")) {
    throw new Error("Ship combat hail requires a reason");
  }
  if (rumorText !== null && (typeof rumorText !== "string" || rumorText.trim() === "")) {
    throw new Error("Ship rumor text must be null or a non-empty string");
  }
  if (cartazInspection !== null && (
    typeof cartazInspection !== "object" ||
    !Number.isInteger(cartazInspection.fine) ||
    cartazInspection.fine <= 0
  )) {
    throw new Error("Ship cartaz inspection requires valid enforcement terms");
  }
  if (illicitTradeInspection !== null && (
    typeof illicitTradeInspection !== "object" ||
    typeof illicitTradeInspection.incidentId !== "string" ||
    illicitTradeInspection.incidentId === "" ||
    typeof illicitTradeInspection.originName !== "string" ||
    illicitTradeInspection.originName === "" ||
    !Number.isInteger(illicitTradeInspection.fine) ||
    illicitTradeInspection.fine <= 0 ||
    !Number.isFinite(illicitTradeInspection.cargoQuantity) ||
    illicitTradeInspection.cargoQuantity < 0 ||
    typeof illicitTradeInspection.canAffordFine !== "boolean"
  )) {
    throw new Error("Ship illicit trade inspection requires valid enforcement terms");
  }
  if (tradeEmbargoInspection !== null && (
    typeof tradeEmbargoInspection !== "object" ||
    typeof tradeEmbargoInspection.incidentId !== "string" ||
    tradeEmbargoInspection.incidentId === "" ||
    typeof tradeEmbargoInspection.issuerName !== "string" ||
    tradeEmbargoInspection.issuerName === "" ||
    typeof tradeEmbargoInspection.targetName !== "string" ||
    tradeEmbargoInspection.targetName === "" ||
    typeof tradeEmbargoInspection.scopeLabel !== "string" ||
    tradeEmbargoInspection.scopeLabel === "" ||
    !Number.isInteger(tradeEmbargoInspection.fine) ||
    tradeEmbargoInspection.fine <= 0 ||
    !Number.isFinite(tradeEmbargoInspection.cargoQuantity) ||
    tradeEmbargoInspection.cargoQuantity < 0 ||
    typeof tradeEmbargoInspection.canAffordFine !== "boolean"
  )) {
    throw new Error("Ship trade embargo inspection requires valid enforcement terms");
  }
  if ([cartazInspection, illicitTradeInspection, tradeEmbargoInspection].filter(Boolean).length > 1) {
    throw new Error("A ship cannot conduct two trade inspections at once");
  }
  if (bibleInspection !== null && (
    typeof bibleInspection !== "object" ||
    typeof bibleInspection.questId !== "string" || bibleInspection.questId === "" ||
    !["sympathetic", "caught"].includes(bibleInspection.outcome)
  )) {
    throw new Error("Ship Bible inspection requires a valid outcome");
  }
  if (bibleInspection && (cartazInspection || illicitTradeInspection || tradeEmbargoInspection)) {
    throw new Error("A ship cannot conduct two trade inspections at once");
  }
  if (listenerReligionId !== null) religionById(listenerReligionId);
  if (pirateTreasureName !== null &&
      (typeof pirateTreasureName !== "string" || pirateTreasureName.trim() === "")) {
    throw new Error("Pirate treasure dialogue requires a captain name");
  }
  if (typeof hostileHail !== "boolean") {
    throw new Error(`Ship hostile hail state must be boolean: ${hostileHail}`);
  }
  if (scriptedHail !== null && (
    typeof scriptedHail !== "object" ||
    typeof scriptedHail.text !== "string" || scriptedHail.text.trim() === ""
  )) {
    throw new Error("Scripted ship hail requires text");
  }
  return {
    kind: "ship",
    npcShipId: ship.id,
    nodeId: cartazInspection
      ? "cartaz-inspection"
      : illicitTradeInspection
        ? "illicit-trade-inspection"
        : tradeEmbargoInspection
          ? "trade-embargo-inspection"
        : bibleInspection
          ? "bible-inspection"
        : scriptedHail
          ? "scripted-hail"
          : "root",
    selectedIndex: 0,
    attackReason,
    piracyWarningAccepted: false,
    pendingPiracyAction: null,
    tradeRestrictionEnforcementActive: false,
    tradeRestrictionViolation: null,
    rumorText,
    cartazInspection,
    illicitTradeInspection,
    tradeEmbargoInspection,
    bibleInspection,
    listenerReligionId,
    pirateTreasureName,
    hostileHail,
    scriptedHail
  };
}

export function prepareSurrenderPrizeDialogue(session, ship, currentShip, loot = {}, context = {}) {
  const target = session || createShipDialogueSession(ship);
  assertShipDialogueSubject(target, ship);
  if (session && target.nodeId !== "surrender-resolving") {
    throw new Error(`Cannot prepare surrender prize from dialogue node: ${target.nodeId}`);
  }
  if (ship.combatGrace !== true) throw new Error("Surrender prize requires a protected defeated ship");
  const candidateStats = shipStatsForSlug(ship.slug);
  const currentStats = shipStatsForSlug(currentShip?.slug);
  if (!Number.isFinite(ship.hitPoints) || !Number.isFinite(ship.maxHitPoints)) {
    throw new Error(`Surrendered ship ${ship.id} requires finite hull points`);
  }
  if (!Number.isFinite(currentShip?.hitPoints) || !Number.isFinite(currentShip?.maxHitPoints)) {
    throw new Error("Surrender prize requires the current player hull condition");
  }
  if (ship.maxHitPoints !== candidateStats.hitPoints) {
    throw new Error(
      `Surrendered ${candidateStats.slug} hull mismatch: ${ship.maxHitPoints}/${candidateStats.hitPoints}`
    );
  }
  if (currentShip.maxHitPoints !== currentStats.hitPoints) {
    throw new Error(
      `Current ${currentStats.slug} hull mismatch: ${currentShip.maxHitPoints}/${currentStats.hitPoints}`
    );
  }
  if (!Number.isFinite(currentShip?.cargoUsed) || currentShip.cargoUsed < 0) {
    throw new Error(`Surrender prize requires current cargo use: ${currentShip?.cargoUsed}`);
  }
  const specie = loot.specie ?? 0;
  if (!Number.isInteger(specie) || specie < 0) {
    throw new Error("Surrender prize requires a valid loot summary");
  }
  const cargo = surrenderPrizeCargo(loot.cargo ?? {}, "secured");
  const remainingCargo = surrenderPrizeCargo(loot.remainingCargo ?? {}, "remaining");
  target.nodeId = "surrendered";
  target.selectedIndex = 0;
  target.feedback = null;
  target.prize = Object.freeze({
    candidateShipSlug: candidateStats.slug,
    candidateHitPoints: candidateStats.hitPoints,
    candidateMaxHitPoints: ship.maxHitPoints,
    currentShipSlug: currentStats.slug,
    currentHitPoints: Math.max(0, Math.min(currentStats.hitPoints, currentShip.hitPoints)),
    currentMaxHitPoints: currentShip.maxHitPoints,
    cargoUsed: currentShip.cargoUsed,
    specie,
    cargo,
    remainingCargo
  });
  return target;
}

export function prepareDamageSurrenderDialogue(session, ship, { cause } = {}) {
  const target = session || createShipDialogueSession(ship);
  assertShipDialogueSubject(target, ship);
  if (!ship.combatGrace) throw new Error("Damage surrender requires a protected defeated ship");
  if (!["accidental", "self-defense", "deliberate"].includes(cause)) {
    throw new Error(`Invalid damage surrender cause: ${cause}`);
  }
  target.nodeId = "damage-surrender-choice";
  target.selectedIndex = 0;
  target.feedback = null;
  target.surrenderCause = cause;
  return target;
}

export function createShoreBatteryDialogueSession(city, context = {}) {
  if (!city?.character) throw new Error("Shore battery hail requires a city character");
  if (context.relation !== "hostile" && context.relation !== "war") {
    throw new Error(`Shore battery hail requires hostile diplomacy: ${context.relation}`);
  }
  if (typeof context.playerWarship !== "boolean") throw new Error("Shore battery hail requires ship classification");
  if (typeof context.passageOffered !== "boolean") {
    throw new Error("Shore battery hail requires safe-passage eligibility");
  }
  if (context.playerWarship && context.passageOffered) {
    throw new Error("Shore battery cannot offer civilian passage to a warship");
  }
  if (context.passageOffered && (!Number.isInteger(context.toll) || context.toll <= 0)) {
    throw new Error(`Invalid shore battery passage toll: ${context.toll}`);
  }
  const ruler = rulerAtMinute(city.factionId, context.simMinute ?? 0);
  if (!ruler) throw new Error(`Shore battery faction has no ruler: ${city.factionId}`);
  return {
    kind: "shore-battery",
    cityId: requireCityId(city, "Shore battery city"),
    portId: requireCityId(city, "Shore battery city"),
    selectedIndex: 0,
    relation: context.relation,
    playerWarship: context.playerWarship,
    passageOffered: context.passageOffered,
    rulerName: ruler.displayName,
    toll: context.passageOffered ? context.toll : null,
    canAffordToll: context.passageOffered && context.canAffordToll === true
  };
}

export function shoreBatteryDialogueView(session, city) {
  if (!session || session.kind !== "shore-battery" || session.cityId !== city?.cityId) {
    throw new Error("Shore battery dialogue city does not match active session");
  }
  const faction = factionById(city.factionId);
  const cityName = city.portAlias || city.displayCity || city.city;
  if (!session.passageOffered) {
    const atWar = session.relation === "war";
    return {
      speaker: `${characterName(city.character)}, ${cityName}`,
      expressionId: "angry",
      text: atWar
        ? `By order of ${session.rulerName}, ${faction.name} is at war with your flag. Armed vessels will be fired upon.`
        : `By order of ${session.rulerName}, ${faction.name} denies passage to your armed vessel. Turn away.`,
      feedback: null,
      options: [option(atWar ? "To arms" : "Turn away", { type: "close" })]
    };
  }
  return {
    speaker: `${characterName(city.character)}, ${cityName}`,
    expressionId: "stern",
    text: `${session.rulerName} demands ${session.toll} doubloons for ${safePassageDurationLabel()} of safe passage throughout ${faction.name}.`,
    feedback: null,
    options: [
      option(`Pay ${session.toll} db`, { type: "purchase-safe-passage" }, {
        disabled: !session.canAffordToll,
        disabledReason: "Not enough doubloons."
      }),
      option(session.relation === "war" ? "Refuse" : "Turn away", { type: "refuse-safe-passage" })
    ]
  };
}

export function personalHostilityDialogue(factionName, { defensive = false } = {}) {
  if (typeof factionName !== "string" || factionName.trim() === "" || typeof defensive !== "boolean") {
    throw new Error("Personal hostility challenge requires a faction name and defensive flag");
  }
  return defensive
    ? `Peace may hold between our flags, but your name is cursed in ${factionName}. Keep away, or we will defend ourselves!`
    : `Your flag is not our quarrel, captain. You are. ${factionName} has declared you an outlaw. Heave to!`;
}

function safePassageDurationLabel() {
  return FACTION_SAFE_PASSAGE_DAYS === 30 ? "one month" : `${FACTION_SAFE_PASSAGE_DAYS} days`;
}

export function selectShoreBatteryDialogueOption(session, city, optionIndex = session.selectedIndex) {
  const view = shoreBatteryDialogueView(session, city);
  const selected = view.options[optionIndex];
  if (!selected) throw new Error(`Invalid shore battery dialogue option index: ${optionIndex}`);
  if (selected.disabled) {
    return {
      closed: false,
      action: null,
      feedback: selected.disabledReason || "Shore battery option is unavailable"
    };
  }
  if (selected.action.type === "close") return { closed: true, action: null };
  if (selected.action.type === "purchase-safe-passage") {
    return { closed: true, action: selected.action };
  }
  if (selected.action.type === "refuse-safe-passage") {
    return { closed: true, action: selected.action };
  }
  throw new Error(`Unknown shore battery dialogue action: ${selected.action.type}`);
}

export function shipDialogueView(session, ship) {
  assertShipDialogueSubject(session, ship);
  const view = shipDialogueContentView(session, ship);
  if (view.topic !== undefined) {
    throw new Error(`Ship dialogue already defines a topic: ${ship.id}`);
  }
  return {
    ...view,
    topic: `VESSEL: ${shipDialogueVesselLabel(ship).toUpperCase()}`
  };
}

function shipDialogueContentView(session, ship) {
  const manifest = shipCargoManifest(ship.cargo);
  const storm = ship.stormStatus ? ` ${ship.stormStatus}` : "";
  const voyage = ship.destinationName ? ` Bound for ${ship.destinationName}.` : "";
  const cargo = manifest ? ` We carry ${manifest}.` : " Running in ballast.";
  const role = ship.roleLabel || "Merchant";
  const workingGear = role === "Fisherman" && ship.fishingNetLabel
    ? ` We work a ${ship.fishingNetLabel.toLowerCase()}.`
    : role === "Whaler"
      ? " We hunt whales with hand harpoons."
      : "";
  const faction = role !== "Pirate" && ship.faction?.adjective ? `${ship.faction.adjective} ` : "";
  const speaker = `${characterName(ship.character)}, ${faction}${role.toLowerCase()} captain`;
  if (session.nodeId === "cartaz-inspection") {
    return portugueseCartazInspectionView(session, speaker);
  }
  if (session.nodeId === "illicit-trade-inspection") {
    return illicitTradeInspectionView(session, speaker);
  }
  if (session.nodeId === "trade-embargo-inspection") {
    return tradeEmbargoInspectionView(session, speaker);
  }
  if (session.nodeId === "bible-inspection") {
    return bibleInspectionView(session, speaker);
  }
  if (session.nodeId === "scripted-hail") {
    return {
      speaker,
      expressionId: "angry",
      text: session.scriptedHail.text,
      feedback: null,
      options: [option("Hold your course", { type: "close" })]
    };
  }
  if (session.attackReason && ship.combatGrace) {
    return {
      speaker,
      expressionId: "afraid",
      text: "Hold! Our colors are struck. We have surrendered and are making for a safe port. This fight is over.",
      feedback: null,
      options: [option("Leave", { type: "close" })]
    };
  }
  if (session.attackReason && ship.inCombatWithPlayer === false) {
    return {
      speaker,
      expressionId: "concerned",
      text: "Stand down. The challenge has ended, and we are breaking off.",
      feedback: null,
      options: [option("Leave", { type: "close" })]
    };
  }
  if (session.attackReason) {
    return {
      speaker,
      expressionId: "angry",
      text: session.attackReason,
      feedback: null,
      options: [option("To arms", { type: "close" })]
    };
  }
  if (session.nodeId === "piracy-warning") {
    return {
      speaker,
      expressionId: "angry",
      text: "Without a letter of marque, this is an act of piracy.",
      bodyTone: "danger",
      feedback: null,
      options: [
        option("Back down", { type: "close" }),
        option(piracyProceedLabel(session.pendingPiracyAction), { type: "confirm-piracy" })
      ]
    };
  }
  if (session.nodeId === "surrender-offer") {
    const prizeLegality = shipPrizeLegalityNotice(session, ship);
    return {
      speaker,
      expressionId: "afraid",
      text: "We cannot outrun or outfight you. Spare the crew, and we will surrender our cargo and coin.",
      feedback: prizeLegality?.text || null,
      feedbackTone: prizeLegality?.tone,
      options: [
        option("Accept surrender", { type: "surrender" }),
        option("Refuse and attack", { type: "attack" })
      ]
    };
  }
  if (session.nodeId === "surrender-resolving") {
    return {
      speaker,
      expressionId: "afraid",
      text: "Enough. Our colors are struck. Spare my crew, and your people may take the cargo and inspect the ship.",
      feedback: null,
      options: [
        option("Review the prize", { type: "review-surrendered-prize" }, {
          disabled: true,
          disabledReason: "The prize crew are still at work."
        })
      ]
    };
  }
  if (session.nodeId === "surrendered") {
    return {
      speaker,
      expressionId: "afraid",
      text: "Enough. Our colors are struck. Spare my crew, and your people may take the cargo and inspect the ship.",
      feedback: null,
      options: [option("Review the prize", { type: "review-surrendered-prize" })]
    };
  }
  if (session.nodeId === "damage-surrender-choice") {
    const accidental = session.surrenderCause === "accidental";
    const prizeLegality = shipPrizeLegalityNotice(session, ship);
    return {
      speaker,
      expressionId: "afraid",
      text: accidental
        ? "Our colors are struck. If that blow was unintended, say so and let us make for port."
        : "Enough. Our colors are struck. Will you take us as a prize, or let us go?",
      feedback: prizeLegality?.text || null,
      feedbackTone: prizeLegality?.tone,
      options: [
        option("Accept surrender", { type: "accept-damage-surrender" }),
        option(accidental ? "Apologize and release" : "Show mercy and release", {
          type: "release-damage-surrender"
        })
      ]
    };
  }
  if (session.nodeId === "prize-choice" || session.nodeId === "capture-confirm") {
    return surrenderPrizeView(session, ship);
  }
  if (session.nodeId === "capture-loading") {
    return {
      speaker,
      expressionId: "afraid",
      text: "Your crew are transferring command of the captured vessel.",
      feedback: session.feedback,
      presentation: surrenderPrizePresentation(session, ship),
      options: [
        option("Transferring command", { type: "close" }, {
          disabled: true,
          disabledReason: "The prize crew are still at work."
        })
      ]
    };
  }
  if (session.nodeId === "defiance") {
    const attackLegality = shipAttackLegalityNotice(ship);
    return {
      speaker,
      expressionId: "angry",
      text: "You will have no easy prize from us. Stand off.",
      feedback: attackLegality?.text || null,
      feedbackTone: attackLegality?.tone,
      options: [
        option("Attack", { type: "attack" }),
        option("Back down", { type: "close" })
      ]
    };
  }
  if (session.nodeId === "aid-given") {
    if (typeof session.aidMessage !== "string" || session.aidMessage === "") {
      throw new Error("Ship aid dialogue requires a transfer message");
    }
    return {
      speaker,
      expressionId: "happy",
      text: session.aidMessage,
      feedback: null,
      options: [option("Thank the captain", { type: "close" })]
    };
  }
  if (session.nodeId !== "root") throw new Error(`Unknown ship dialogue node: ${session.nodeId}`);
  if (session.hostileHail) {
    const attackLegality = shipAttackLegalityNotice(ship);
    return {
      speaker,
      expressionId: "angry",
      text: role === "Pirate"
        ? session.pirateTreasureName
          ? `Captain ${session.pirateTreasureName}'s treasure is aboard. Heave to, or we will take it by force.`
          : "Heave to. Your cargo or your life."
        : "Stand off. Our guns are trained on you.",
      feedback: attackLegality?.text || null,
      feedbackTone: attackLegality?.tone,
      options: [
        option("Attack", { type: "attack" }),
        option("Leave", { type: "close" })
      ]
    };
  }
  if (session.rumorText !== null) {
    return {
      speaker,
      expressionId: "attentive",
      text: session.rumorText,
      feedback: null,
      options: [option("Thank the captain", { type: "close" })]
    };
  }
  const greeting = role === "Pirate"
    ? session.pirateTreasureName
      ? `So the tales are true: Captain ${session.pirateTreasureName}'s treasure is aboard. ` +
        "Heave to. We will take the hoard and leave your crew their lives."
      : "Heave to and keep your hands where I can see them."
    : role === "Warship"
      ? "Keep clear. We are on patrol."
      : ship.character?.religionId && session.listenerReligionId
        ? occasionalReligiousGreeting({
            speakerReligionId: ship.character.religionId,
            listenerReligionId: session.listenerReligionId,
            key: `ship:${ship.id}|${requireEntityId(ship.character.id, "NPC ship captain")}`
          }) || "Fair winds, captain."
        : "Fair winds, captain.";
  const expressionId = ship.stormStatus
    ? "concerned"
    : role === "Pirate"
      ? "stern"
      : role === "Warship"
        ? "attentive"
        : "neutral";
  const attackLegality = !ship.combatGrace && !ship.inCombatWithPlayer
    ? shipAttackLegalityNotice(ship)
    : null;
  return {
    speaker,
    expressionId,
    text: `${greeting}${storm}${voyage}${cargo}${workingGear}`,
    feedback: attackLegality?.text || null,
    feedbackTone: attackLegality?.tone,
    options: [
      ...(ship.canOfferEmergencyAid
        ? [option("Ask for provisions", { type: "receive-aid" })]
        : []),
      ...(ship.tradeRestrictionViolation && !ship.combatGrace && !ship.inCombatWithPlayer
        ? [option(`You are in violation of ${ship.tradeRestrictionViolation.regimeLabel}`, {
          type: "enforce-trade-restriction"
        }, {
          detail: "Legal surrender demand",
          detailTone: "success"
        })]
        : []),
      ...(!ship.tradeRestrictionViolation && !ship.combatGrace && !ship.inCombatWithPlayer
        ? [option("Demand surrender", { type: "threaten" })]
        : []),
      option("Leave", { type: "close" })
    ]
  };
}

function shipAttackLegalityNotice(ship) {
  return attackLegalityNotice({
    piracy: ship.playerAttackIsPiracy === true,
    issuerAdjective: shipPrivateeringIssuer(ship),
    subjectId: ship.id
  });
}

function attackLegalityNotice({ piracy, issuerAdjective, subjectId }) {
  if (piracy && issuerAdjective) {
    throw new Error(`Attack cannot be piracy and authorized by ${issuerAdjective}: ${subjectId}`);
  }
  if (issuerAdjective) {
    return {
      text: `Your ${issuerAdjective} letter of marque makes this attack legal.`,
      detail: `Legal - ${issuerAdjective} letter of marque`,
      tone: "success"
    };
  }
  if (piracy) {
    return {
      text: "Without a letter of marque, this attack would be illegal piracy.",
      detail: "Piracy",
      tone: "danger"
    };
  }
  return {
    text: null,
    detail: "Legal attack",
    tone: "success"
  };
}

function shipPrizeLegalityNotice(session, ship) {
  if (session.tradeRestrictionEnforcementActive) {
    const violation = session.tradeRestrictionViolation;
    if (!violation) throw new Error("Trade enforcement prize has no cited violation");
    return {
      text: `Your ${violation.issuerAdjective} commission makes this a lawful embargo prize.`,
      tone: "success"
    };
  }
  if (session.surrenderCause === "self-defense") {
    return {
      text: "This vessel attacked you. Taking it as a prize is lawful.",
      tone: "success"
    };
  }
  const issuer = shipPrivateeringIssuer(ship);
  if (ship.playerAttackIsPiracy === true && issuer) {
    throw new Error(`Ship prize cannot be piracy and authorized by ${issuer}: ${ship.id}`);
  }
  if (issuer) {
    return {
      text: `Your ${issuer} letter of marque makes this a lawful prize.`,
      tone: "success"
    };
  }
  if (ship.playerAttackIsPiracy === true) {
    return {
      text: "Taking this vessel as a prize would be piracy.",
      tone: "danger"
    };
  }
  if (ship.playerAttackIsPiracy === false) {
    return {
      text: "Taking this vessel as a prize is lawful.",
      tone: "success"
    };
  }
  return null;
}

function shipPrivateeringIssuer(ship) {
  const issuer = ship.privateeringIssuerAdjective;
  if (issuer !== null && issuer !== undefined && (typeof issuer !== "string" || issuer.trim() === "")) {
    throw new Error(`Invalid privateering authority issuer for ship: ${ship.id}`);
  }
  return issuer || null;
}

function shipDialogueVesselLabel(ship) {
  if (typeof ship.label === "string" && ship.label.trim() !== "") return ship.label.trim();
  if (typeof ship.slug === "string" && ship.slug.trim() !== "") {
    return shipLabelForSlug(ship.slug);
  }
  throw new Error(`Ship dialogue requires a vessel type: ${ship.id}`);
}

function portugueseCartazInspectionView(session, speaker) {
  const inspection = session.cartazInspection;
  if (!inspection) throw new Error("Cartaz inspection dialogue has no enforcement terms");
  const controlled = Object.entries(inspection.controlledCargo)
    .map(([goodId, quantity]) => `${tradeGoodById(goodId).label} x${quantity}`)
    .join(", ");
  return {
    speaker,
    expressionId: "stern",
    text: "By order of the Estado da India, heave to. Your vessel carries no valid Portuguese cartaz. " +
      "At sea, it is too late to buy a license. Pay the Crown's fine, surrender controlled spice cargo, or fight.",
    feedback: null,
    options: [
      option(`Pay fine  ${inspection.fine} db`, { type: "pay-cartaz-fine" }, {
        disabled: !inspection.canAffordFine,
        disabledReason: "Not enough doubloons."
      }),
      ...(inspection.controlledCargoQuantity > 0
        ? [option("Surrender controlled cargo", { type: "surrender-cartaz-cargo" }, {
          detail: controlled.toUpperCase()
        })]
        : []),
      option("Run for it", { type: "evade-cartaz-inspection" })
    ]
  };
}

function illicitTradeInspectionView(session, speaker) {
  const inspection = session.illicitTradeInspection;
  if (!inspection) throw new Error("Illicit trade inspection dialogue has no enforcement terms");
  return {
    speaker,
    expressionId: "stern",
    text: `Heave to. Customs officers at ${inspection.originName} traced illicit trade to this vessel. Pay the fine, surrender the unlicensed cargo, or answer to our guns.`,
    feedback: null,
    options: [
      option(`Pay fine  ${inspection.fine} db`, { type: "pay-illicit-trade-fine" }, {
        disabled: !inspection.canAffordFine,
        disabledReason: "Not enough doubloons."
      }),
      ...(inspection.cargoQuantity > 0
        ? [option("Surrender illicit cargo", { type: "surrender-illicit-trade-cargo" })]
        : []),
      option("Run for it", { type: "evade-illicit-trade-inspection" })
    ]
  };
}

function tradeEmbargoInspectionView(session, speaker) {
  const inspection = session.tradeEmbargoInspection;
  if (!inspection) throw new Error("Trade embargo inspection dialogue has no enforcement terms");
  return {
    speaker,
    expressionId: "stern",
    text: `By order of ${inspection.issuerName}, heave to. You carry ${inspection.scopeLabel} from ${inspection.targetName}, contrary to the prohibition. Pay the fine, surrender the cargo, or answer to our guns.`,
    feedback: null,
    options: [
      option(`Pay fine  ${inspection.fine} db`, { type: "pay-trade-embargo-fine" }, {
        disabled: !inspection.canAffordFine,
        disabledReason: "Not enough doubloons."
      }),
      ...(inspection.cargoQuantity > 0
        ? [option("Surrender embargoed cargo", { type: "surrender-trade-embargo-cargo" })]
        : []),
      option("Run for it", { type: "evade-trade-embargo-inspection" })
    ]
  };
}

function bibleInspectionView(session, speaker) {
  const inspection = session.bibleInspection;
  if (!inspection) throw new Error("Bible inspection dialogue has no enforcement terms");
  if (inspection.outcome === "sympathetic") {
    return {
      speaker,
      expressionId: "amused",
      text: "Luther's Testaments are forbidden. Fortunately, I have read them. Close the chest, captain; my eyesight has failed.",
      feedback: null,
      options: [option("Thank the captain", { type: "close" })]
    };
  }
  return {
    speaker,
    expressionId: "stern",
    text: "Heave to. We found Luther's forbidden Testaments. Surrender the books, or answer to our guns.",
    feedback: null,
    options: [
      option("Surrender the Bibles", { type: "surrender-bible-contraband" }),
      option("Run for it", { type: "evade-bible-inspection" })
    ]
  };
}

function surrenderPrizeView(session, ship) {
  const presentation = surrenderPrizePresentation(session, ship);
  const candidate = shipLabelForSlug(presentation.candidateShipSlug);
  const current = shipLabelForSlug(presentation.currentShipSlug);
  const cargoDoesNotFit = presentation.cargoUsed > shipStatsForSlug(presentation.candidateShipSlug).cargoCapacity;
  const disabledReason = cargoDoesNotFit
    ? `Your ${cargoSpaceLabel(presentation.cargoUsed)} units of cargo will not fit its ` +
      `${shipStatsForSlug(presentation.candidateShipSlug).cargoCapacity}-unit hold.`
    : null;
  if (session.nodeId === "capture-confirm") {
    const remainingCargo = shipCargoManifest(presentation.remainingCargo);
    return {
      speaker: `${candidate}, surrendered prize`,
      expressionId: "afraid",
      text: `The prize will be repaired to full hull strength before transfer. ` +
        `Taking it will permanently replace your current ${current}.` +
        (remainingCargo
          ? ` The ${remainingCargo} still aboard will be stowed after your current hold is transferred, space permitting.`
          : ""),
      feedback: session.feedback,
      presentation,
      options: [
        option(`Confirm ${candidate}`, { type: "capture-surrendered-ship" }, {
          detail: "CURRENT SHIP WILL BE REPLACED",
          disabled: Boolean(disabledReason),
          disabledReason
        }),
        option(`Keep ${current}`, { type: "close" })
      ]
    };
  }
  const lootParts = [];
  const securedCargo = shipCargoManifest(presentation.cargo);
  const remainingCargo = shipCargoManifest(presentation.remainingCargo);
  if (presentation.specie > 0) lootParts.push(`${presentation.specie} doubloons`);
  if (securedCargo) lootParts.push(securedCargo);
  const lootSummary = lootParts.length > 0 ? ` You have already secured ${lootParts.join(" and ")}.` : "";
  const remainingSummary = remainingCargo
    ? ` ${remainingCargo} remains aboard and can transfer with the prize if its hold has room.`
    : "";
  return {
    speaker: `${candidate}, surrendered prize`,
    expressionId: "afraid",
    text: `The surrendered vessel is ready for inspection.${lootSummary}${remainingSummary}`,
    feedback: session.feedback,
    presentation,
    options: [
      option(`Take ${candidate}`, { type: "inspect-surrendered-ship" }, {
        detail: `COMPARE WITH ${current.toUpperCase()}`,
        disabled: Boolean(disabledReason),
        disabledReason
      }),
      option(`Keep ${current}`, { type: "close" }, {
        detail: remainingCargo ? "LEAVE PRIZE AND REMAINING CARGO" : null
      })
    ]
  };
}

function surrenderPrizePresentation(session, ship) {
  const prize = session.prize;
  if (!prize || prize.candidateShipSlug !== ship.slug) {
    throw new Error(`Ship surrender prize does not match active ship: ${ship.id}`);
  }
  return Object.freeze({ kind: "ship-capture", ...prize });
}

export function selectShipDialogueOption(session, ship, optionIndex = session.selectedIndex) {
  const view = shipDialogueView(session, ship);
  const selected = view.options[optionIndex];
  if (!selected) throw new Error(`Invalid ship dialogue option index: ${optionIndex}`);
  if (selected.disabled) {
    session.feedback = selected.disabledReason || "That is not available.";
    return { closed: false, action: null };
  }
  const action = selected.action;
  if (action.type === "close") return { closed: true, action: null };
  if (action.type === "confirm-piracy") {
    const pendingAction = session.pendingPiracyAction;
    if (!isHostileShipAction(pendingAction)) throw new Error(`Invalid piracy warning action: ${pendingAction}`);
    session.pendingPiracyAction = null;
    session.piracyWarningAccepted = true;
    return applyShipDialogueAction(session, ship, { type: pendingAction });
  }
  if (shipHostileActionNeedsPiracyWarning(session, ship, action)) {
    session.nodeId = "piracy-warning";
    session.pendingPiracyAction = action.type;
    session.selectedIndex = 0;
    return { closed: false, action: null };
  }
  return applyShipDialogueAction(session, ship, action);
}

function assertShipDialogueSubject(session, ship) {
  if (!session || session.kind !== "ship") throw new Error("Missing ship dialogue session");
  if (!ship || session.npcShipId !== ship.id) throw new Error("Dialogue ship does not match active session");
}

function applyShipDialogueAction(session, ship, action) {
  if (["surrender-bible-contraband", "evade-bible-inspection"].includes(action.type)) {
    if (session.nodeId !== "bible-inspection" || session.bibleInspection?.outcome !== "caught") {
      throw new Error(`Bible enforcement action outside a caught inspection: ${action.type}`);
    }
    return { closed: true, action };
  }
  if (
    action.type === "pay-illicit-trade-fine" ||
    action.type === "surrender-illicit-trade-cargo"
  ) {
    if (session.nodeId !== "illicit-trade-inspection") {
      throw new Error(`Illicit trade enforcement action outside inspection: ${action.type}`);
    }
    return { closed: true, action };
  }
  if (action.type === "evade-illicit-trade-inspection") {
    if (session.nodeId !== "illicit-trade-inspection") {
      throw new Error("Illicit trade evasion outside inspection");
    }
    return { closed: true, action };
  }
  if (
    action.type === "pay-trade-embargo-fine" ||
    action.type === "surrender-trade-embargo-cargo"
  ) {
    if (session.nodeId !== "trade-embargo-inspection") {
      throw new Error(`Trade embargo enforcement action outside inspection: ${action.type}`);
    }
    return { closed: true, action };
  }
  if (action.type === "evade-trade-embargo-inspection") {
    if (session.nodeId !== "trade-embargo-inspection") {
      throw new Error("Trade embargo evasion outside inspection");
    }
    return { closed: true, action };
  }
  if (
    action.type === "pay-cartaz-fine" ||
    action.type === "surrender-cartaz-cargo"
  ) {
    if (session.nodeId !== "cartaz-inspection") {
      throw new Error(`Cartaz enforcement action outside inspection: ${action.type}`);
    }
    return { closed: true, action };
  }
  if (action.type === "evade-cartaz-inspection") {
    if (session.nodeId !== "cartaz-inspection") {
      throw new Error("Cartaz evasion outside inspection");
    }
    return { closed: true, action: { type: "attack", cartazEvasion: true } };
  }
  if (action.type === "enforce-trade-restriction") {
    const violation = ship.tradeRestrictionViolation;
    if (!violation || typeof violation.id !== "string" || violation.id === "") {
      throw new Error(`Ship has no enforceable trade restriction: ${ship.id}`);
    }
    session.tradeRestrictionEnforcementActive = true;
    session.tradeRestrictionViolation = { ...violation };
    session.nodeId = ship.willOfferSurrender ? "surrender-offer" : "defiance";
    session.selectedIndex = 0;
    return {
      closed: false,
      action: { type: "begin-player-trade-enforcement", violation: { ...violation } }
    };
  }
  if (action.type === "receive-aid") {
    if (!ship.canOfferEmergencyAid) throw new Error(`Ship cannot offer emergency aid: ${ship.id}`);
    session.nodeId = "aid-given";
    session.selectedIndex = 0;
    return { closed: false, action: { type: "receive-aid" } };
  }
  if (action.type === "threaten") {
    session.nodeId = ship.willOfferSurrender ? "surrender-offer" : "defiance";
    session.selectedIndex = 0;
    return { closed: false, action: null };
  }
  if (action.type === "surrender") {
    session.nodeId = "surrender-resolving";
    session.selectedIndex = 0;
    return { closed: false, action: { type: "surrender" } };
  }
  if (action.type === "accept-damage-surrender") {
    const confirmedPiracy = session.nodeId === "piracy-warning" && session.piracyWarningAccepted === true;
    if (session.nodeId !== "damage-surrender-choice" && !confirmedPiracy) {
      throw new Error("Damage surrender accepted outside its choice");
    }
    session.nodeId = "surrender-resolving";
    session.selectedIndex = 0;
    return { closed: false, action: { type: "accept-damage-surrender" } };
  }
  if (action.type === "release-damage-surrender") {
    if (session.nodeId !== "damage-surrender-choice") {
      throw new Error("Damage surrender released outside its choice");
    }
    return { closed: true, action: { type: "release-damage-surrender" } };
  }
  if (action.type === "review-surrendered-prize") {
    session.nodeId = "prize-choice";
    session.selectedIndex = 0;
    return { closed: false, action: null };
  }
  if (action.type === "inspect-surrendered-ship") {
    session.nodeId = "capture-confirm";
    session.selectedIndex = 0;
    return { closed: false, action: null };
  }
  if (action.type === "capture-surrendered-ship") {
    session.nodeId = "capture-loading";
    session.selectedIndex = 0;
    return { closed: false, action: { type: "capture-surrendered-ship" } };
  }
  if (action.type === "attack") {
    return { closed: true, action: { type: "attack" } };
  }
  throw new Error(`Unknown ship dialogue action: ${action.type}`);
}

function shipHostileActionNeedsPiracyWarning(session, ship, action) {
  if (session.tradeRestrictionEnforcementActive) return false;
  if (action.type === "accept-damage-surrender" && session.surrenderCause !== "accidental") return false;
  return isHostileShipAction(action.type) &&
    ship.playerAttackIsPiracy === true &&
    session.piracyWarningAccepted !== true;
}

function isHostileShipAction(actionType) {
  return actionType === "threaten" || actionType === "surrender" || actionType === "attack" ||
    actionType === "accept-damage-surrender";
}

function piracyProceedLabel(actionType) {
  if (actionType === "threaten") return "Demand surrender anyway";
  if (actionType === "surrender") return "Take prize anyway";
  if (actionType === "accept-damage-surrender") return "Take prize anyway";
  if (actionType === "attack") return "Attack anyway";
  return "Proceed anyway";
}

export function portDialogueView(session, city, gameState, economy, portCities, context = {}) {
  if (!session || session.kind !== "port") throw new Error("Missing port dialogue session");
  if (session.cityId !== city.cityId) throw new Error("Dialogue city does not match active session");

  const view = portDialogueNodeView(session, city, gameState, economy, portCities, context);
  validateDialogueDecision(view, session.nodeId);
  return withPortExitFooter(view);
}

export function dialogueBackOptionIndex(view) {
  if (!view || !Array.isArray(view.options)) throw new Error("Dialogue back navigation requires options");
  const explicitBackIndex = view.options.findIndex((entry) => entry?.label === "Back");
  if (explicitBackIndex >= 0) return explicitBackIndex;
  return view.options.findIndex((entry) => entry?.placement === "port-exit");
}

export function beginShipHandoverDialogue(session, {
  shipSlug,
  transactionText,
  sellerTitle,
  returnNodeId = "root"
}) {
  if (!session || session.kind !== "port") throw new Error("Ship handover requires a port dialogue session");
  shipStatsForSlug(shipSlug);
  if (typeof transactionText !== "string" || transactionText.trim() === "") {
    throw new Error("Ship handover requires a transaction message");
  }
  if (typeof sellerTitle !== "string" || sellerTitle.trim() === "") {
    throw new Error("Ship handover requires a seller title");
  }
  if (typeof returnNodeId !== "string" || returnNodeId === "") {
    throw new Error("Ship handover requires a return dialogue node");
  }
  session.shipHandover = {
    shipSlug,
    transactionText: transactionText.trim(),
    sellerTitle: sellerTitle.trim(),
    returnNodeId
  };
  session.nodeId = "ship-handover";
  session.selectedIndex = 0;
  session.feedback = null;
}

function portDialogueNodeView(session, city, gameState, economy, portCities, context) {
  if (session.nodeId === "drunk-captain") return drunkCaptainArrivalView(session, gameState);
  if (session.nodeId === "drunk-factor") return drunkFactorArrivalView(session, city, gameState);
  if (session.nodeId === "greeting") return greetingView(session, city, gameState, context);
  if (session.nodeId === "recovering") return recoveringPortView(city, context);
  if (session.nodeId === "barred") return barredPortView(city, gameState, context);
  if (session.nodeId === "disguise-success") return disguiseSuccessView(session, city);
  if (session.nodeId === "disguise-failed") return disguiseFailureView(city, gameState, context);
  if (session.nodeId === "root") {
    return rootView(session, city, gameState, economy, portCities, context);
  }
  if (session.nodeId === "city-attack") return cityAttackView(session, city, gameState, context);
  if (session.nodeId === "portuguese-cartaz") {
    return portugueseCartazView(session, city, gameState, context);
  }
  if (session.nodeId === "portuguese-cartaz-market-offer") {
    return portugueseCartazMarketOfferView(session, city, gameState, economy, context);
  }
  if (session.nodeId === "portuguese-cartaz-market-declined") {
    return portugueseCartazMarketDeclinedView(session, city, gameState, economy);
  }
  if (session.nodeId === "buy") return buyView(session, city, gameState, economy, context);
  if (session.nodeId === "trade-embargo-warning") {
    return tradeEmbargoWarningView(session);
  }
  if (session.nodeId === "trade-embargo-sale-warning") {
    return tradeEmbargoSaleWarningView(session);
  }
  if (session.nodeId === "trade-tip") return tradeTipView(session, city);
  if (session.nodeId === "quest-cargo-tip") return questCargoTipView(session, city);
  if (session.nodeId === "equipment") return equipmentView(session, city, gameState, economy);
  if (session.nodeId === "equipment-nets") return fishingNetView(session, city, gameState, economy);
  if (session.nodeId === "equipment-cannons") return cannonEquipmentView(session, city, gameState, economy);
  if (session.nodeId === "equipment-harpoons") return whaleHarpoonView(session, city, gameState, economy);
  if (session.nodeId === "equipment-special-offer") {
    return specialEquipmentOfferView(session, city, gameState);
  }
  if (session.nodeId === "equipment-factor-offer") {
    return equipmentFactorOfferView(session, city, gameState);
  }
  if (session.nodeId === "equipment-factor-followup") {
    return equipmentFactorFollowupView(session, city);
  }
  if (session.nodeId === "marque-factor-offer") {
    return letterOfMarqueFactorOfferView(session, city, gameState, context);
  }
  if (session.nodeId === "marque-factor-followup") {
    return letterOfMarqueFactorFollowupView(session, city, gameState, context);
  }
  if (session.nodeId === "sell") return sellView(session, city, gameState, economy, context);
  if (session.nodeId === "market-undo-confirm") {
    return marketUndoConfirmationView(session, city);
  }
  if (session.nodeId === "tribute-theft-warning") {
    return tributeTheftWarningView(session, city, gameState);
  }
  if (session.nodeId === "quest-cargo-sale-warning") {
    return questCargoSaleWarningView(session, gameState);
  }
  if (session.nodeId === "cargo") return cargoView(session, city, gameState);
  if (session.nodeId === "quest") return questView(session, city, gameState, portCities);
  if (session.nodeId === "capture-petition") {
    return captureCommissionPetitionView(session, city, gameState, portCities, context);
  }
  if (session.nodeId === "capture-petition-result") {
    return captureCommissionPetitionResultView(session, city, gameState);
  }
  if (session.nodeId === "marque") return marqueView(session, city, gameState, context);
  if (session.nodeId === "trade-pass") return tradePassView(session, city, gameState, context);
  if (session.nodeId === "loadout") return loadoutView(session, city, gameState, context);
  if (session.nodeId === "custom-loadout") return customLoadoutView(session, city, gameState, context);
  if (session.nodeId === "ship-handover") return shipHandoverView(session, city);
  if (session.nodeId === "shipyard-arrival") {
    return playerShipyardArrivalView(session, city, gameState, economy, context);
  }
  if (session.nodeId === "shipyard-arrival-review") {
    return playerShipyardArrivalReviewView(city, gameState, context);
  }
  if (session.nodeId === "shipyard") return shipyardView(session, city, gameState, economy, context);
  if (session.nodeId === "shipyard-purchase") {
    return shipyardPurchaseView(session, city, gameState, context);
  }
  if (session.nodeId === "shipyard-purchase-confirm") {
    return shipyardPurchaseConfirmationView(session, city, gameState, context);
  }
  if (session.nodeId === "shipyard-investment-offer") {
    return shipyardInvestmentOfferView(session, city, gameState, context);
  }
  if (session.nodeId === "shipyard-investment") {
    return shipyardInvestmentView(session, city, gameState, context);
  }
  if (session.nodeId === "viking-longship") return vikingLongshipView(session, city, gameState, context);
  if (session.nodeId === "japanese-matchlocks") {
    return japaneseMatchlockView(session, city, gameState);
  }
  if (session.nodeId === "caribbean-ginger") {
    return caribbeanGingerView(session, city, gameState);
  }
  if (session.nodeId === "chef-quest") return chefQuestView(session, city, gameState);
  if (session.nodeId === "colonization") return colonizationView(session, city, gameState, context);
  if (session.nodeId === "conquistador") {
    return conquistadorView(session, city, gameState, portCities, context);
  }
  throw new Error(`Unknown dialogue node: ${session.nodeId}`);
}

function recoveringPortView(city, context) {
  const recovery = context.portRecoveryStatus;
  if (!recovery || typeof recovery.attackerShipLabel !== "string" || !recovery.attackerShipLabel.trim()) {
    throw new Error("Recovering port dialogue requires the attacking ship");
  }
  if (!Number.isInteger(recovery.daysRemaining) || recovery.daysRemaining < 1) {
    throw new Error(`Recovering port dialogue requires remaining recovery days: ${recovery.daysRemaining}`);
  }
  const dayLabel = `${recovery.daysRemaining} more day${recovery.daysRemaining === 1 ? "" : "s"}`;
  return {
    speaker: speakerName(city),
    expressionId: "sad",
    text: `${recovery.attackerShipLabel} bombarded ${cityLabel(city)} and silenced its guns. The quays remain closed for ${dayLabel}; you must put back to sea.`,
    feedback: null,
    options: [option("Leave", { type: "close" })]
  };
}

function drunkCaptainArrivalView(session, gameState) {
  const captain = gameState.playerCharacter;
  if (!captain?.name) throw new Error("Drunk port arrival requires the player captain");
  return {
    speaker: `${captain.name}, captain`,
    expressionId: "happy",
    text: drunkPortExchange(session).captain,
    feedback: null,
    options: [option("Continue", { type: "node", nodeId: "drunk-factor" })]
  };
}

function drunkFactorArrivalView(session, city, gameState) {
  if (!session.postDrunkNodeId) throw new Error("Drunk port arrival has no following dialogue node");
  const memory = portMemory(gameState, city);
  return {
    speaker: speakerName(city),
    expressionId: "annoyed",
    text: memory.drunkArrivals > 1
      ? repeatDrunkFactorLine(session, memory.drunkArrivals)
      : drunkPortExchange(session).factor,
    feedback: null,
    options: [option("Continue", { type: "node", nodeId: session.postDrunkNodeId })]
  };
}

function drunkPortExchange(session) {
  return DRUNK_PORT_EXCHANGES[session.drunkVariant % DRUNK_PORT_EXCHANGES.length];
}

function repeatDrunkFactorLine(session, drunkArrivals) {
  const line = REPEAT_DRUNK_FACTOR_LINES[
    (session.drunkVariant + drunkArrivals) % REPEAT_DRUNK_FACTOR_LINES.length
  ];
  return line(drunkArrivals);
}

function withPortExitFooter(view) {
  const regularOptions = [];
  const exitOptions = [];
  for (const entry of view.options) {
    const isExit = entry.placement === "port-exit" || entry.label === "Back" || entry.action.type === "close";
    (isExit ? exitOptions : regularOptions).push(isExit
      ? { ...entry, placement: "port-exit" }
      : entry);
  }
  if (exitOptions.length > 2) {
    throw new Error(`Port dialogue footer supports at most two exit actions, received ${exitOptions.length}`);
  }
  return exitOptions.length === 0
    ? view
    : { ...view, options: [...regularOptions, ...exitOptions] };
}

export function selectPortDialogueOption(
  session,
  city,
  gameState,
  economy,
  portCities,
  optionIndex = session.selectedIndex,
  context = {}
) {
  const view = portDialogueView(session, city, gameState, economy, portCities, context);
  const option = view.options[optionIndex];
  if (!option) throw new Error(`Invalid dialogue option index: ${optionIndex}`);
  if (option.disabled) {
    session.feedback = option.disabledReason || "That is not available.";
    return { closed: false };
  }

  const action = option.action;
  if (session.nodeId === "root" && session.customsNoticeKey !== null) {
    acknowledgePlayerPortCustomsNotice(gameState, city, session.customsNoticeKey);
    session.customsNoticeKey = null;
  }
  if (action.type === "close") return { closed: true };
  if (action.type === "node") {
    if (session.nodeId === "greeting") {
      session.rumorText = null;
      session.rulerRumor = null;
      session.historicalGossip = null;
      session.nextPortNodeId = null;
    }
    if (action.nodeId === "buy") {
      if (shouldOfferPortugueseCartazForMarket(session, city, gameState, economy, "buy", context)) {
        session.portugueseCartazMarketNodeId = "buy";
        session.nodeId = "portuguese-cartaz-market-offer";
        session.selectedIndex = 0;
        session.feedback = null;
        return { closed: false };
      }
      session.marketPurchases = {};
      beginMarketUndoSession(session, "buy", gameState, economy, city);
    }
    if (action.nodeId === "sell") {
      if (shouldOfferPortugueseCartazForMarket(session, city, gameState, economy, "sell", context)) {
        session.portugueseCartazMarketNodeId = "sell";
        session.nodeId = "portuguese-cartaz-market-offer";
        session.selectedIndex = 0;
        session.feedback = null;
        return { closed: false };
      }
      session.marketSales = 0;
      beginMarketUndoSession(session, "sell", gameState, economy, city);
    }
    if (action.nodeId === "colonization") markColonizationOrganizerApproached(gameState);
    if (action.nodeId === "conquistador") markConquistadorOfferSeen(gameState.memory.quests.conquistador);
    if (action.nodeId === "city-attack") {
      session.cityAttackReturnNodeId = action.returnNodeId || "root";
    }
    if (action.nodeId === "viking-longship") markVikingLongshipOfferSeen(gameState);
    if (action.nodeId === "japanese-matchlocks") markJapaneseMatchlockOfferSeen(gameState);
    if (action.nodeId === "caribbean-ginger") markCaribbeanGingerOfferSeen(gameState);
    if (action.nodeId === "chef-quest") markChefQuestOfferSeen(gameState);
    if (session.nodeId === "colonization" && action.nodeId !== "colonization") {
      session.colonizationArrival = false;
    }
    if (session.nodeId === "viking-longship" && action.nodeId !== "viking-longship") {
      session.vikingLongshipArrival = false;
    }
    if (session.nodeId === "japanese-matchlocks" && action.nodeId !== "japanese-matchlocks") {
      session.japaneseMatchlockArrival = false;
    }
    if (session.nodeId === "caribbean-ginger" && action.nodeId !== "caribbean-ginger") {
      session.caribbeanGingerArrival = false;
    }
    if (session.nodeId === "chef-quest" && action.nodeId !== "chef-quest") {
      session.chefQuestArrival = false;
    }
    if (session.nodeId === "trade-tip") session.tradeTip = null;
    if (session.nodeId === "quest-cargo-tip") session.questCargoTip = null;
    if (session.nodeId === "ship-handover") session.shipHandover = null;
    if (["shipyard", "shipyard-arrival"].includes(session.nodeId) &&
        !["shipyard", "shipyard-arrival"].includes(action.nodeId)) {
      session.shipyardDividendArrival = null;
      session.shipyardMaterialArrival = false;
      session.shipyardLedgerReturnNodeId = null;
      session.shipyardMaterialSourceHints = null;
    }
    if (session.nodeId === "shipyard-purchase") {
      session.shipyardPurchaseListingId = null;
      session.shipyardPurchaseReturnNodeId = null;
    }
    if (session.nodeId === "marque" && action.nodeId !== "marque") {
      session.marqueGrantedFactionId = null;
    }
    if (session.nodeId === "trade-pass" && action.nodeId !== "trade-pass") {
      session.tradePassPolicyId = null;
      session.tradePassGrantedPolicyId = null;
    }
    if (["capture-petition", "capture-petition-result"].includes(session.nodeId) &&
        !["capture-petition", "capture-petition-result"].includes(action.nodeId)) {
      session.captureCommissionPetitionResult = null;
    }
    if (action.nodeId === "equipment" && session.nodeId === "root") {
      const offer = enterSpecialEquipmentStore(gameState, economy, city);
      if (offer) {
        session.specialEquipmentOffer = {
          itemId: offer.item.id,
          reconsidered: offer.reconsidered
        };
        session.nodeId = "equipment-special-offer";
        session.selectedIndex = 0;
        session.feedback = null;
        return { closed: false, specialEquipmentOffer: offer };
      }
    }
    session.nodeId = action.nodeId;
    session.selectedIndex = action.nodeId === "shipyard"
      ? session.shipyardLedgerTab === "yard"
        ? 0
        : session.shipyardLedgerTab === "materials"
          ? 1
          : 2
      : 0;
    session.feedback = null;
    return { closed: false };
  }
  if (action.type === "shipyard-ledger-tab") {
    if (session.nodeId !== "shipyard" || !["yard", "materials", "books"].includes(action.tab)) {
      throw new Error(`Invalid shipyard ledger tab action: ${action.tab}`);
    }
    session.shipyardLedgerTab = action.tab;
    session.shipyardLedgerScrollOffset = 0;
    session.selectedIndex = action.tab === "yard" ? 0 : action.tab === "materials" ? 1 : 2;
    session.feedback = null;
    return { closed: false };
  }
  if (action.type === "sell-shipyard-material") {
    const fromArrival = session.nodeId === "shipyard-arrival";
    if ((!fromArrival && session.nodeId !== "shipyard") ||
        (!fromArrival && session.shipyardLedgerTab !== "materials")) {
      throw new Error(`Shipyard material sale requires the stores tab: ${session.nodeId}`);
    }
    const ledger = playerShipyardLedger(context.shipyard, context.simMinute ?? 0);
    const material = ledger.currentBuild.materials.find((entry) => entry.goodId === action.goodId);
    const sale = shipyardMaterialSaleOffer(
      city,
      gameState,
      economy,
      context,
      material,
      activeQuestCargoReservedQuantities(gameState, {
        currentMinute: context.simMinute ?? 0
      })
    );
    if (!sale || sale.quantity !== action.quantity) {
      throw new Error(`Shipyard material sale is no longer available: ${action.goodId}`);
    }
    const marketSale = sellAllGood(
      gameState,
      economy,
      city,
      action.goodId,
      action.quantity,
      tradeContext(session, context)
    );
    procureWorldEconomyShipyardMaterials(economy, city);
    session.feedback = `${marketSale.good.label} x${marketSale.quantity} moved straight to the yard stores.`;
    session.selectedIndex = 0;
    return { closed: false, marketSale, shipyardMaterialSale: marketSale };
  }
  if (action.type === "inspect-shipyard-listing") {
    if (session.nodeId !== "shipyard") {
      throw new Error(`Shipyard listing inspection requires the shipyard ledger: ${session.nodeId}`);
    }
    requireShipyardListingAction(action, context);
    session.shipyardPurchaseListingId = action.listingId;
    session.shipyardPurchaseReturnNodeId = null;
    session.nodeId = "shipyard-purchase";
    session.selectedIndex = 0;
    session.feedback = null;
    return { closed: false };
  }
  if (action.type === "confirm-ship-purchase") {
    if (!["shipyard", "shipyard-purchase"].includes(session.nodeId)) {
      throw new Error(`Ship purchase confirmation requires a vessel comparison: ${session.nodeId}`);
    }
    requireShipyardListingAction(action, context);
    session.shipyardPurchaseListingId = action.listingId;
    session.shipyardPurchaseReturnNodeId = session.nodeId;
    session.nodeId = "shipyard-purchase-confirm";
    session.selectedIndex = 1;
    session.feedback = null;
    return { closed: false };
  }
  if (action.type === "cancel-ship-purchase") {
    if (session.nodeId !== "shipyard-purchase-confirm") {
      throw new Error(`Ship purchase cancellation requires confirmation: ${session.nodeId}`);
    }
    const returnNodeId = session.shipyardPurchaseReturnNodeId;
    if (!["shipyard", "shipyard-purchase"].includes(returnNodeId)) {
      throw new Error(`Ship purchase confirmation has invalid return node: ${returnNodeId}`);
    }
    session.nodeId = returnNodeId;
    session.shipyardPurchaseReturnNodeId = null;
    if (returnNodeId === "shipyard") session.shipyardPurchaseListingId = null;
    session.selectedIndex = 0;
    session.feedback = null;
    return { closed: false };
  }
  if (action.type === "leave-buy") {
    const madePurchase = Object.keys(session.marketPurchases).length > 0;
    const tip = bestPurchasedTradeRoute({
      purchases: session.marketPurchases,
      originCity: city,
      gameState,
      economy,
      portCities,
      simMinute: context.simMinute ?? 0,
      sailingDistanceKm: context.sailingDistanceKm
    });
    const questCargoTip = madePurchase ? null : bestQuestCargoSource({
      originCity: city,
      gameState,
      economy,
      portCities,
      simMinute: context.simMinute ?? 0,
      sailingDistanceKm: context.sailingDistanceKm,
      random: context.random || Math.random
    });
    session.marketPurchases = {};
    clearMarketUndoSession(session);
    session.selectedIndex = 0;
    session.feedback = null;
    if (!tip && !questCargoTip) {
      session.nodeId = action.nodeId;
      return { closed: false };
    }
    if (questCargoTip) {
      session.questCargoTip = { ...questCargoTip, nextNodeId: action.nodeId };
      session.nodeId = "quest-cargo-tip";
      return { closed: false, questCargoTip };
    }
    session.tradeTip = { ...tip, nextNodeId: action.nodeId };
    session.nodeId = "trade-tip";
    return { closed: false, tradeTip: tip };
  }
  if (action.type === "leave-sell") {
    const tip = session.marketSales === 0
      ? bestHeldCargoTradeRoute({
          originCity: city,
          gameState,
          economy,
          portCities,
          simMinute: context.simMinute ?? 0,
          sailingDistanceKm: context.sailingDistanceKm
        })
      : null;
    session.marketSales = 0;
    clearMarketUndoSession(session);
    session.selectedIndex = 0;
    session.feedback = null;
    if (!tip) {
      session.nodeId = action.nodeId;
      return { closed: false };
    }
    session.tradeTip = { ...tip, nextNodeId: action.nodeId };
    session.nodeId = "trade-tip";
    return { closed: false, tradeTip: tip };
  }
  if (action.type === "set-port-heading") {
    if (!Number.isInteger(action.destinationTileId)) {
      throw new Error(`Port heading requires a destination tile id: ${action.destinationTileId}`);
    }
    if (typeof action.destinationCityId !== "string" || action.destinationCityId === "") {
      throw new Error("Port heading requires a canonical destination city id");
    }
    if (typeof action.destinationName !== "string" || action.destinationName.trim() === "") {
      throw new Error("Port heading requires a destination name");
    }
    if (typeof action.nextNodeId !== "string" || action.nextNodeId === "") {
      throw new Error("Port heading requires a return dialogue node");
    }
    if (typeof action.reason !== "string" || action.reason.trim() === "") {
      throw new Error("Port heading requires a reason");
    }
    if (action.reason === PORT_NAVIGATION_REASON_QUEST_CARGO && (
      typeof action.questCargoGoodId !== "string" || action.questCargoGoodId === ""
    )) {
      throw new Error("Quest cargo heading requires a trade good id");
    }
    if (action.reason === PORT_NAVIGATION_REASON_TRADE_PRICE && (
      typeof action.tradeGoodId !== "string" || action.tradeGoodId === ""
    )) {
      throw new Error("Trade-price heading requires a trade good id");
    }
    if (action.reason === PORT_NAVIGATION_REASON_SHIPYARD_SUPPLY && (
      typeof action.shipyardMaterialGoodId !== "string" || action.shipyardMaterialGoodId === ""
    )) {
      throw new Error("Shipyard-supply heading requires a trade good id");
    }
    if (session.nodeId === "trade-tip") session.tradeTip = null;
    if (session.nodeId === "quest-cargo-tip") session.questCargoTip = null;
    session.nodeId = action.nextNodeId;
    session.selectedIndex = 0;
    session.feedback = `Heading set for ${action.destinationName}.`;
    return {
      closed: false,
      action: {
        type: "set-port-heading",
        destinationCityId: action.destinationCityId,
        destinationTileId: action.destinationTileId,
        destinationName: action.destinationName,
        reason: action.reason,
        ...(action.questCargoGoodId
          ? { questCargoGoodId: action.questCargoGoodId }
          : {}),
        ...(action.tradeGoodId ? { tradeGoodId: action.tradeGoodId } : {}),
        ...(action.shipyardMaterialGoodId
          ? { shipyardMaterialGoodId: action.shipyardMaterialGoodId }
          : {})
      }
    };
  }
  if (action.type === "decline-quest-cargo-tip") {
    if (session.nodeId !== "quest-cargo-tip" || !session.questCargoTip) {
      throw new Error("Quest cargo hint decline requires an active hint");
    }
    recordQuestCargoHintDecline(
      gameState,
      context.simMinute ?? 0,
      session.questCargoTip.goodId
    );
    session.questCargoTip = null;
    session.nodeId = action.nextNodeId;
    session.selectedIndex = 0;
    session.feedback = null;
    return { closed: false, questCargoHintDeclined: true };
  }
  if (action.type === "open-passenger") {
    return { closed: false, action: { type: "open-passenger", quest: action.quest } };
  }
  if (action.type === "wait-in-port") {
    return { closed: true, action: { type: "wait-in-port" } };
  }
  if (action.type === "attempt-disguise") {
    return { closed: false, action: { type: "attempt-disguise" } };
  }
  if (action.type === "land-marines") {
    return { closed: false, action: { type: "land-marines" } };
  }
  if (action.type === "attack-city") {
    return { closed: false, action: { type: "attack-city" } };
  }
  if (action.type === "attempt-restricted-illicit-trade") {
    if (typeof context.random !== "function") {
      throw new Error("Restricted illicit market attempt requires a random source");
    }
    const currentAccess = playerPortTradeAccess(session, city, gameState, context);
    const policy = currentAccess.policy;
    if (!policy || currentAccess.policyId !== action.policyId || currentAccess.allowed) {
      throw new Error(`Illicit market action does not match the closed port policy: ${action.policyId}`);
    }
    if (session.illicitTradeAttemptedPolicyId === policy.id) {
      throw new Error(`${policy.label} illicit market may only be approached once per port visit`);
    }
    applyIllicitMarketAttempt(session, gameState, currentAccess, context.random());
    session.selectedIndex = 0;
    return {
      closed: false,
      illicitMarketAccessPolicyId: session.illicitTradeAccessPolicyId
    };
  }
  if (action.type === "decline-portuguese-cartaz-market") {
    requirePortugueseCartazMarketNode(session);
    session.portugueseCartazMarketOfferDeclined = true;
    session.nodeId = "portuguese-cartaz-market-declined";
    session.selectedIndex = 0;
    session.feedback = null;
    return { closed: false };
  }
  if (action.type === "continue-portuguese-cartaz-market") {
    const marketNodeId = requirePortugueseCartazMarketNode(session);
    enterPortMarketNode(session, marketNodeId, gameState, economy, city);
    return { closed: false };
  }
  if (action.type === "attempt-portuguese-cartaz-illicit-market") {
    if (typeof context.random !== "function") {
      throw new Error("Portuguese illicit spice market attempt requires a random source");
    }
    const marketNodeId = requirePortugueseCartazMarketNode(session);
    const goodId = portugueseCartazMarketGoodIds(city, gameState, economy, marketNodeId)[0];
    if (!goodId) throw new Error("Portuguese illicit spice market has no controlled cargo");
    const access = playerPortugueseCrownSpiceAccess(
      gameState,
      city,
      goodId,
      tradeContext(session, context)
    );
    if (access.policyId !== PORTUGUESE_CROWN_SPICE_POLICY_ID || access.allowed) {
      throw new Error("Portuguese illicit spice market no longer requires a cartaz");
    }
    applyIllicitMarketAttempt(session, gameState, access, context.random());
    if (session.illicitTradeAccessPolicyId === PORTUGUESE_CROWN_SPICE_POLICY_ID) {
      enterPortMarketNode(session, marketNodeId, gameState, economy, city, { preserveFeedback: true });
    } else {
      session.nodeId = "portuguese-cartaz-market-declined";
      session.selectedIndex = 0;
    }
    return {
      closed: false,
      illicitMarketAccessPolicyId: session.illicitTradeAccessPolicyId
    };
  }
  if (action.type === "purchase-ship") {
    if (session.nodeId !== "shipyard-purchase-confirm" ||
        session.shipyardPurchaseListingId !== action.listingId) {
      throw new Error("Ship purchase requires explicit confirmation");
    }
    requireShipyardListingAction(action, context);
    return { closed: false, action };
  }
  if (action.type === "begin-shipyard-investment") {
    startPlayerShipyardInvestment(gameState, city, context.shipyard, { simMinute: context.simMinute ?? 0 });
    session.nodeId = "shipyard-investment";
    session.selectedIndex = 0;
    session.feedback = null;
    return { closed: false };
  }
  if (action.type === "pay-shipyard-investment") {
    payPlayerShipyardInvestment(gameState, city, { simMinute: context.simMinute ?? 0 });
    session.selectedIndex = 0;
    session.feedback = "The syndicate has its seed capital.";
    return { closed: false };
  }
  if (action.type === "deliver-shipyard-material") {
    const delivery = deliverPlayerShipyardMaterials(gameState, city, action.goodId);
    session.selectedIndex = 0;
    session.feedback = delivery.remaining > 0
      ? `Delivered ${delivery.delivered}; ${delivery.remaining} still needed.`
      : `${tradeGoodById(action.goodId).label} complete.`;
    return {
      closed: false,
      questCargoTransfers: [questCargoTransfer(delivery.goodId, delivery.delivered)]
    };
  }
  if (action.type === "open-player-shipyard") {
    const investment = finishPlayerShipyardInvestment(gameState, economy, city, {
      simMinute: context.simMinute ?? 0
    });
    session.selectedIndex = 0;
    session.feedback = "The new yard is open, and your share is entered in the books.";
    session.nodeId = "shipyard";
    session.shipyardLedgerTab = "yard";
    session.shipyardLedgerReturnNodeId = "root";
    return { closed: false, playerShipyardFunded: investment };
  }
  if (action.type === "purchase-viking-longship") {
    return { closed: false, action };
  }
  if (action.type === "accept-viking-longship-reward") {
    return { closed: false, action };
  }
  if (action.type === "decline-viking-longship-reward") {
    declineVikingLongshipReward(gameState);
    session.feedback = "The completed longship will remain here for purchase if you change your mind.";
    session.selectedIndex = 0;
    return { closed: false, vikingLongshipRewardDeclined: true };
  }
  if (action.type === "deliver-viking-material") {
    const result = deliverVikingLongshipQuestCargo(gameState, city, action.stageId, context);
    session.feedback = result.complete
      ? `${result.activeStage.goodLabel} complete.`
      : `Delivered ${result.activeStage.goodLabel} x${result.quantity}. ` +
        `${result.remainingQuantity} still needed.`;
    const missionItemGift = result.quest.unlocked
      ? maybeGrantMissionPerkItem(gameState, city, {
        missionId: "viking-longship-complete",
        distanceKm: 3500,
        reward: VIKING_LONGSHIP_PRICE,
        random: context.missionGiftRandom || neverGrantMissionItem,
        context
      })
      : null;
    session.selectedIndex = 0;
    return {
      closed: false,
      vikingLongshipDelivery: result,
      questCargoTransfers: [questCargoTransferFromDelivery(result)],
      missionItemGift
    };
  }
  if (action.type === "deliver-chef-ingredients") {
    const quest = chefQuestState(gameState, city);
    if (!quest || quest.stage !== CHEF_QUEST_STAGE_GATHERING) {
      throw new Error("Chef banquet has no active ingredient request");
    }
    const deliveries = quest.ingredients
      .filter((ingredient) => ingredient.deliverable > 0)
      .map((ingredient) => deliverQuestCargoRequirement(
        gameState,
        city,
        ingredient.goodId,
        1,
        ingredient.requirementId,
        context
      ));
    if (deliveries.length === 0) throw new Error("No requested chef ingredients are aboard");
    const updated = chefQuestState(gameState, city);
    if (!updated.complete) {
      session.feedback = `Ingredients delivered: ${deliveries.length}.`;
      session.selectedIndex = 0;
      return {
        closed: false,
        chefIngredientDeliveries: deliveries,
        questCargoTransfers: questCargoTransfersFromDeliveries(deliveries)
      };
    }
    const result = completeChefBanquet(gameState, city, context.simMinute ?? 0);
    const payment = receiveQuestPayment(
      gameState,
      city,
      CHEF_QUEST_REWARD,
      `${result.event.eventLabel} provisions`,
      context
    );
    const missionItemGift = maybeGrantMissionPerkItem(gameState, city, {
      missionId: `chef-banquet-${requireCityId(city, "Chef banquet city")}`,
      distanceKm: 3000,
      reward: CHEF_QUEST_REWARD,
      random: context.missionGiftRandom || neverGrantMissionItem,
      context
    });
    session.feedback = `The hosts paid ${payment.amount} db.`;
    session.selectedIndex = 0;
    return {
      closed: false,
      chefBanquetCompleted: result,
      chefIngredientDeliveries: deliveries,
      questCargoTransfers: questCargoTransfersFromDeliveries(deliveries),
      payment,
      missionItemGift
    };
  }
  if (action.type === "recruit-chef") {
    return { closed: false, action, chefRecruitmentRequested: true };
  }
  if (action.type === "deliver-japanese-matchlock-material") {
    const stage = assertJapaneseMatchlockDelivery(gameState, city, action.stageId);
    const delivery = deliverQuestCargoRequirement(
      gameState,
      city,
      stage.goodId,
      stage.quantity,
      japaneseMatchlockRequirementId(stage),
      context
    );
    const result = delivery.complete
      ? completeJapaneseMatchlockFetchStage(
          gameState,
          city,
          action.stageId,
          context.simMinute ?? 0
        )
      : { completedStage: null, quest: japaneseMatchlockQuestState(gameState, city) };
    let industry = null;
    let payment = null;
    if (result.quest.completed) {
      industry = establishPortIndustry(
        economy,
        city,
        MATCHLOCKS_GOOD_ID,
        JAPANESE_MATCHLOCK_PRODUCTION_PER_DAY,
        { initialStock: JAPANESE_MATCHLOCK_INITIAL_STOCK }
      );
      payment = receiveQuestPayment(
        gameState,
        city,
        JAPANESE_MATCHLOCK_COMPLETION_REWARD,
        "Japanese matchlock workshop",
        context
      );
      session.feedback = `The Kyoto workshop is producing matchlocks. Paid ${payment.amount} db.`;
    } else {
      session.feedback = delivery.complete
        ? `Delivered the last ${delivery.quantity} ${stage.goodLabel.toLowerCase()}.`
        : `Delivered ${stage.goodLabel} x${delivery.quantity}. ` +
          `${delivery.remainingQuantity} still needed.`;
    }
    const missionItemGift = result.quest.completed
      ? maybeGrantMissionPerkItem(gameState, city, {
        missionId: "japanese-matchlock-industry-complete",
        distanceKm: 4500,
        reward: JAPANESE_MATCHLOCK_COMPLETION_REWARD,
        random: context.missionGiftRandom || neverGrantMissionItem,
        context
      })
      : null;
    session.selectedIndex = 0;
    return {
      closed: false,
      japaneseMatchlockDelivery: delivery,
      questCargoTransfers: [questCargoTransferFromDelivery(delivery)],
      japaneseMatchlockIndustry: industry,
      japaneseMatchlockPayment: payment,
      missionItemGift
    };
  }
  if (action.type === "deliver-caribbean-ginger") {
    const stage = assertCaribbeanGingerDelivery(gameState, city);
    const delivery = deliverQuestCargoRequirement(
      gameState,
      city,
      stage.goodId,
      stage.quantity,
      caribbeanGingerRequirementId(),
      context
    );
    let quest = caribbeanGingerQuestState(gameState, city);
    let industry = null;
    let payment = null;
    let missionItemGift = null;
    if (delivery.complete) {
      quest = completeCaribbeanGingerQuest(gameState, city, context.simMinute ?? 0);
      industry = establishPortIndustry(
        economy,
        city,
        GINGER_GOOD_ID,
        CARIBBEAN_GINGER_PRODUCTION_PER_DAY,
        { initialStock: CARIBBEAN_GINGER_INITIAL_STOCK }
      );
      payment = receiveQuestPayment(
        gameState,
        city,
        CARIBBEAN_GINGER_COMPLETION_REWARD,
        "Caribbean ginger cultivation",
        context
      );
      session.feedback = `The first ginger beds have taken. Paid ${payment.amount} db.`;
      missionItemGift = maybeGrantMissionPerkItem(gameState, city, {
        missionId: "caribbean-ginger-industry-complete",
        distanceKm: 7000,
        reward: CARIBBEAN_GINGER_COMPLETION_REWARD,
        random: context.missionGiftRandom || neverGrantMissionItem,
        context
      });
    } else {
      session.feedback = `Delivered ${stage.goodLabel} x${delivery.quantity}. ` +
        `${delivery.remainingQuantity} still needed.`;
    }
    session.selectedIndex = 0;
    return {
      closed: false,
      caribbeanGingerDelivery: delivery,
      questCargoTransfers: [questCargoTransferFromDelivery(delivery)],
      caribbeanGingerQuest: quest,
      caribbeanGingerIndustry: industry,
      caribbeanGingerPayment: payment,
      missionItemGift
    };
  }
  if (action.type === "deliver-colonization-material") {
    const quest = colonizationQuestView(gameState, { currentMinute: context.simMinute ?? 0 });
    const targetName = quest.target.city;
    const stage = assertColonizationFetchDelivery(gameState.memory.colonization, action.stageId);
    if (!quest.canDeliverFetch) throw new Error(`No ${stage.goodLabel} is aboard for the colony expedition`);
    const delivery = deliverQuestCargoRequirement(
      gameState,
      city,
      stage.goodId,
      stage.quantity,
      colonizationFetchRequirementId(quest.target, stage),
      context
    );
    let payment = null;
    if (delivery.complete) {
      completeColonizationFetchStage(gameState.memory.colonization, stage.id);
      payment = receiveQuestPayment(
        gameState,
        city,
        stage.reward,
        `${targetName} expedition: ${stage.goodLabel}`,
        context
      );
      session.feedback = `${stage.goodLabel} complete. Paid ${payment.amount} db.`;
    } else {
      session.feedback = `Delivered ${stage.goodLabel} x${delivery.quantity}. ` +
        `${delivery.remainingQuantity} still needed.`;
    }
    session.selectedIndex = 0;
    return {
      closed: false,
      colonizationChanged: true,
      colonizationDelivery: delivery,
      questCargoTransfers: [questCargoTransferFromDelivery(delivery)],
      colonizationPayment: payment
    };
  }
  if (action.type === "accept-conquistador-expedition") {
    acceptConquistadorQuest(gameState.memory.quests.conquistador, portCities);
    session.feedback = "The expedition is commissioned. The supply lists are open.";
    session.selectedIndex = 0;
    return { closed: false, conquistadorChanged: true };
  }
  if (action.type === "deliver-conquistador-material") {
    const view = conquistadorQuestView(
      gameState.memory.quests.conquistador,
      portCities,
      context.simMinute ?? 0,
      { cargo: gameState.cargo }
    );
    const stage = view.fetchStage;
    if (!stage || stage.id !== action.stageId) {
      throw new Error(`Conquistador supply stage mismatch: ${action.stageId}`);
    }
    const delivery = deliverQuestCargoRequirement(
      gameState,
      city,
      stage.goodId,
      stage.quantity,
      conquistadorFetchRequirementId(stage),
      context
    );
    let payment = null;
    if (delivery.complete) {
      completeConquistadorFetchStage(gameState.memory.quests.conquistador, stage.id);
      payment = receiveQuestPayment(
        gameState,
        city,
        stage.reward,
        `Inca expedition: ${stage.goodLabel}`,
        context
      );
      session.feedback = `${stage.goodLabel} complete. Paid ${payment.amount} db.`;
    } else {
      session.feedback = `Delivered ${stage.goodLabel} x${delivery.quantity}. ` +
        `${delivery.remainingQuantity} still needed.`;
    }
    session.selectedIndex = 0;
    return {
      closed: false,
      conquistadorChanged: true,
      conquistadorDelivery: delivery,
      questCargoTransfers: [questCargoTransferFromDelivery(delivery)],
      conquistadorPayment: payment
    };
  }
  if (action.type === "begin-conquistador-expedition") {
    const eligibility = capturePortMissionEligibility(gameState);
    beginConquistadorExpedition(gameState.memory.quests.conquistador, eligibility);
    const events = declareDiplomaticWar(
      gameState.relations.diplomacy,
      CONQUISTADOR_ORIGIN_FACTION_ID,
      "inca",
      context.simMinute ?? 0,
      { eventReason: "conquistador-expedition" }
    );
    session.feedback = "The company is aboard. Chan Chan is marked on the chart.";
    session.selectedIndex = 0;
    return { closed: false, conquistadorChanged: true, conquistadorDiplomacyEvents: events };
  }
  if (action.type === "replenish-conquistador-company") {
    const replenishment = replenishConquistadorCompany(
      gameState.memory.quests.conquistador,
      city,
      portCities
    );
    session.conquistadorCompanyReplenished = true;
    session.feedback = `${replenishment.added} replacements have joined the expedition.`;
    session.selectedIndex = 0;
    return {
      closed: false,
      conquistadorChanged: true,
      conquistadorReplenishment: replenishment
    };
  }
  if (action.type === "claim-conquistador-reward") {
    const memory = gameState.memory.quests.conquistador;
    completeConquistadorQuest(memory, context.simMinute ?? 0);
    const payment = receiveQuestPayment(
      gameState,
      city,
      action.reward,
      "Share of the conquest of Tawantinsuyu",
      context
    );
    session.feedback = `The Crown's chest pays ${payment.amount.toLocaleString("en-US")} db.`;
    session.selectedIndex = 0;
    return { closed: false, conquistadorChanged: true, conquistadorPayment: payment };
  }
  if (action.type === "advance-colony-negotiation") {
    if (session.colonizationApprovalStep !== 0) {
      throw new Error(`Colonization negotiation cannot advance from step ${session.colonizationApprovalStep}`);
    }
    session.colonizationApprovalStep = 1;
    session.selectedIndex = 0;
    session.feedback = null;
    return { closed: false };
  }
  if (action.type === "grant-colony-permission") {
    if (session.colonizationApprovalStep !== 1) {
      throw new Error(`Colonization permission cannot be granted from step ${session.colonizationApprovalStep}`);
    }
    const quest = colonizationQuestView(gameState, { currentMinute: context.simMinute ?? 0 });
    const deliveries = quest.approvalCargo
      .filter((requirement) => requirement.deliverable > 0)
      .map((requirement) => deliverQuestCargoRequirement(
        gameState,
        city,
        requirement.goodId,
        requirement.quantity,
        requirement.requirementId,
        context
      ));
    if (deliveries.length === 0) {
      throw new Error(`No ${quest.approval.city} demonstration cargo is aboard`);
    }
    const updatedQuest = colonizationQuestView(gameState, {
      currentMinute: context.simMinute ?? 0
    });
    if (!updatedQuest.approvalCargoDelivered) {
      session.feedback = `Cargo received. Still need ` +
        `${colonizationMissingApprovalCargo(updatedQuest.approvalCargo)}.`;
      session.selectedIndex = 0;
      return {
        closed: false,
        colonizationChanged: true,
        colonizationApprovalGranted: false,
        colonizationApprovalDeliveries: deliveries,
        questCargoTransfers: questCargoTransfersFromDeliveries(deliveries),
        colonizationDiplomacyEvents: []
      };
    }
    grantColonizationApproval(gameState.memory.colonization, { approvalCargoDelivered: true });
    const diplomacyEvents = improveColonizationSponsorRelations(
      gameState,
      quest,
      context.simMinute ?? 0
    );
    session.feedback = diplomacyEvents.length > 0
      ? "Permission granted. Relations improved."
      : "Permission granted.";
    session.colonizationApprovalStep = 2;
    session.selectedIndex = 0;
    return {
      closed: false,
      colonizationChanged: true,
      colonizationApprovalGranted: true,
      colonizationApprovalDeliveries: deliveries,
      questCargoTransfers: questCargoTransfersFromDeliveries(deliveries),
      colonizationDiplomacyEvents: diplomacyEvents
    };
  }
  if (action.type === "finish-colony-negotiation") {
    if (session.colonizationApprovalStep !== 2) {
      throw new Error(`Colonization negotiation cannot finish from step ${session.colonizationApprovalStep}`);
    }
    session.nodeId = session.nextPortNodeId || "greeting";
    session.nextPortNodeId = null;
    session.colonizationApprovalStep = 0;
    session.selectedIndex = 0;
    session.feedback = null;
    return { closed: false };
  }
  if (action.type === "embark-colonists") {
    const quest = colonizationQuestView(gameState, {
      currentMinute: context.simMinute ?? 0,
      shipStats: context.shipStats,
      freeCargoUnits: cargoFree(gameState)
    });
    if (!quest.shipEligibility?.eligible) {
      throw new Error(`Ship cannot carry the colonists: ${quest.shipEligibility?.missing.join(", ")}`);
    }
    if (!quest.approvalCargoReady) {
      throw new Error(`Missing colonial negotiation cargo: ${colonizationMissingApprovalCargo(quest.approvalCargo)}`);
    }
    reserveCargoSpace(gameState, COLONIZATION_CARGO_RESERVATION_ID, COLONIZATION_EXPEDITION_CARGO_UNITS);
    beginColonizationExpedition(gameState.memory.colonization);
    session.feedback = "Expedition aboard.";
    session.selectedIndex = 0;
    return { closed: false, colonizationChanged: true };
  }
  if (action.type === "land-colonists") {
    const quest = colonizationQuestView(gameState, { currentMinute: context.simMinute ?? 0 });
    if (cargoReservationUnits(gameState, COLONIZATION_CARGO_RESERVATION_ID) !==
        COLONIZATION_EXPEDITION_CARGO_UNITS) {
      throw new Error(`The ${quest.target.city} expedition has no colonist cargo reservation`);
    }
    releaseCargoSpace(gameState, COLONIZATION_CARGO_RESERVATION_ID);
    landColonists(gameState.memory.colonization, context.simMinute ?? 0);
    session.feedback = "Settlement founded.";
    session.selectedIndex = 0;
    return { closed: false, colonizationChanged: true };
  }
  if (action.type === "deliver-colony-resupply") {
    const minute = context.simMinute ?? 0;
    const quest = colonizationQuestView(gameState, { currentMinute: minute });
    const resupply = assertColonizationResupplyDelivery(gameState.memory.colonization, minute);
    const held = gameState.cargo?.[resupply.goodId] || 0;
    if (quest.resupply.deliverable <= 0) {
      throw new Error(`No ${resupply.goodLabel} is aboard for ${quest.target.city}: ${held}`);
    }
    const delivery = deliverQuestCargoRequirement(
      gameState,
      city,
      resupply.goodId,
      resupply.quantity,
      quest.resupply.requirementId,
      context
    );
    if (!delivery.complete) {
      const extensionMinutes = extendColonizationResupplyDeadline(
        gameState.memory.colonization,
        delivery.quantity
      );
      const extensionDays = Math.round(extensionMinutes / (24 * 60));
      session.feedback = `${resupply.goodLabel} x${delivery.quantity} delivered. ` +
        `${delivery.remainingQuantity} remain. Deadline +${extensionDays} days.`;
      session.selectedIndex = 0;
      return {
        closed: false,
        colonizationChanged: true,
        colonyEstablished: false,
        colonizationDefenseStarted: false,
        colonizationDelivery: delivery,
        questCargoTransfers: [questCargoTransferFromDelivery(delivery)],
        missionItemGift: null
      };
    }
    establishColony(gameState.memory.colonization, minute);
    recordColonyAuthorityForState(
      gameState,
      quest.target.factionId,
      quest.target.cityId,
      quest.target.city,
      minute,
      { challengesPapalAuthority: quest.history?.organizerReligionId === "reformed-protestant" }
    );
    const defenseStarted = gameState.memory.colonization.stage === COLONIZATION_STAGE_DEFEND;
    const payment = receiveQuestPayment(
      gameState,
      city,
      resupply.reward,
      `${quest.target.city} first-year resupply`,
      context
    );
    session.feedback = defenseStarted
      ? `Resupply +${payment.amount} db. Harbor under attack.`
      : `Colony secure. +${payment.amount} db.`;
    const missionItemGift = !defenseStarted
      ? maybeGrantMissionPerkItem(gameState, city, {
        missionId: `${colonizationLedgerKey(quest.target)}.complete`,
        distanceKm: quest.distanceKm || 8000,
        reward: resupply.reward,
        random: context.missionGiftRandom || neverGrantMissionItem,
        context
      })
      : null;
    session.selectedIndex = 0;
    return {
      closed: false,
      colonizationChanged: true,
      colonyEstablished: !defenseStarted,
      colonizationDefenseStarted: defenseStarted,
      colonizationDelivery: delivery,
      questCargoTransfers: [questCargoTransferFromDelivery(delivery)],
      missionItemGift
    };
  }
  if (action.type === "report-colony-defense") {
    const minute = context.simMinute ?? 0;
    const quest = colonizationQuestView(gameState, { currentMinute: minute });
    if (!isColonizationQuestTarget(gameState.memory.colonization, city)) {
      throw new Error(`The defense of ${quest.target.city} must be reported at the colony`);
    }
    if (!quest.defense) throw new Error(`${quest.target.city} has no colony-defense reward`);
    completeColonizationDefense(gameState.memory.colonization, minute);
    const payment = receiveQuestPayment(
      gameState,
      city,
      quest.defense.reward,
      `${quest.target.city} defense reward`,
      context
    );
    session.feedback = `Defense complete. +${payment.amount} db.`;
    const missionItemGift = maybeGrantMissionPerkItem(gameState, city, {
      missionId: `${colonizationLedgerKey(quest.target)}.defense-complete`,
      distanceKm: quest.distanceKm || 9000,
      reward: quest.defense.reward,
      random: context.missionGiftRandom || neverGrantMissionItem,
      context
    });
    session.selectedIndex = 0;
    return {
      closed: false,
      colonizationChanged: true,
      colonyEstablished: true,
      colonizationDefenseReward: payment,
      missionItemGift
    };
  }
  if (action.type === "select-loadout") {
    if (!context.shipStats) throw new Error("Selecting a loadout requires player ship stats");
    const result = restockShipLoadoutAtPort(gameState, city, context.shipStats, action.loadoutId, context);
    const shortages = Object.values(result.shortfalls).reduce((sum, value) => sum + value, 0);
    session.feedback = `${result.plan.label}: ${gameState.ship.crew} crew / ` +
      `${gameState.ship.cannons} guns.` + loadoutRemovalSummary(result.removed) +
      (shortages > 0 ? " Stores short." : "");
    session.nodeId = "root";
    session.selectedIndex = 0;
    return { closed: false, loadoutResult: result };
  }
  if (action.type === "open-custom-loadout") {
    if (!context.shipStats) throw new Error("Custom loadout editor requires player ship stats");
    session.customLoadoutDraft = shipCustomLoadoutDraft(
      context.shipStats,
      gameState.ship?.loadoutTargets || null,
      { minimumCrew: permanentCrewFloor(gameState) }
    );
    session.customLoadoutFieldIndex = 0;
    session.nodeId = "custom-loadout";
    session.selectedIndex = 0;
    session.feedback = null;
    return { closed: false };
  }
  if (action.type === "select-custom-loadout") {
    if (!context.shipStats) throw new Error("Selecting a custom loadout requires player ship stats");
    if (!session.customLoadoutDraft) throw new Error("Custom loadout editor has no draft");
    const result = restockCustomShipLoadoutAtPort(
      gameState,
      city,
      context.shipStats,
      session.customLoadoutDraft,
      context
    );
    const shortages = Object.values(result.shortfalls).reduce((sum, value) => sum + value, 0);
    session.feedback = `Custom: ${gameState.ship.crew} crew / ${gameState.ship.cannons} guns.` +
      loadoutRemovalSummary(result.removed) + (shortages > 0 ? " Stores short." : "");
    session.nodeId = "root";
    session.selectedIndex = 0;
    return { closed: false, loadoutResult: result };
  }
  if (action.type === "purchase-portuguese-cartaz") {
    const result = purchasePortugueseCartaz(gameState, city, context.simMinute ?? 0);
    session.feedback = `Cartaz issued for ${PORTUGUESE_CARTAZ_DURATION_DAYS} days.`;
    if (session.portugueseCartazMarketNodeId) {
      const marketNodeId = requirePortugueseCartazMarketNode(session);
      enterPortMarketNode(session, marketNodeId, gameState, economy, city, { preserveFeedback: true });
    }
    session.selectedIndex = 0;
    return { closed: false, cartazPurchase: result };
  }
  if (action.type === "buy-equipment-factor-pitch") {
    const pitch = validateEquipmentFactorPitch(session.equipmentFactorPitch);
    if (action.kind !== pitch.kind || action.itemId !== pitch.itemId) {
      throw new Error(`Equipment factor purchase does not match the offered item: ${action.itemId}`);
    }
    let result;
    let resultKey;
    if (pitch.kind === EQUIPMENT_FACTOR_KIND_FISHING_NET) {
      result = purchaseFishingNet(gameState, economy, city, pitch.itemId, context);
      resultKey = "fishingNetPurchase";
    } else if (pitch.kind === EQUIPMENT_FACTOR_KIND_CANNON) {
      result = purchaseCannonEquipment(gameState, economy, city, pitch.itemId, context);
      resultKey = "cannonEquipmentPurchase";
    } else if (pitch.kind === EQUIPMENT_FACTOR_KIND_WHALE_HARPOON) {
      result = purchaseWhaleHarpoon(gameState, economy, city, pitch.itemId, context);
      resultKey = "whaleHarpoonPurchase";
    } else if (pitch.kind === EQUIPMENT_FACTOR_KIND_PERK_ITEM) {
      result = purchasePerkItem(gameState, city, pitch.itemId, context);
      resultKey = "perkItemPurchase";
    } else {
      throw new Error(`Unknown equipment factor purchase kind: ${pitch.kind}`);
    }
    session.equipmentFactorPitchOutcome = "purchased";
    session.nodeId = "equipment-factor-followup";
    session.selectedIndex = 0;
    session.feedback = null;
    return { closed: false, [resultKey]: result };
  }
  if (action.type === "decline-equipment-factor-pitch") {
    const pitch = validateEquipmentFactorPitch(session.equipmentFactorPitch);
    declineEquipmentFactorPitch(gameState, pitch, context.simMinute);
    session.equipmentFactorPitchOutcome = "declined";
    session.nodeId = "equipment-factor-followup";
    session.selectedIndex = 0;
    session.feedback = null;
    return { closed: false };
  }
  if (action.type === "accept-marque-factor-offer") {
    const offer = validateLetterOfMarqueFactorOffer(session.letterOfMarqueFactorOffer);
    const result = grantLetterOfMarque(gameState, city, context.shipPower || 0, context);
    if (!result.grantedNow || result.factionId !== offer.factionId) {
      throw new Error(`Proactive letter of marque was not granted by ${offer.factionId}`);
    }
    session.marqueGrantedFactionId = result.factionId;
    session.letterOfMarqueFactorOfferOutcome = "accepted";
    session.nodeId = "marque-factor-followup";
    session.selectedIndex = 0;
    session.feedback = null;
    return { closed: false, letterOfMarque: result };
  }
  if (action.type === "decline-marque-factor-offer") {
    validateLetterOfMarqueFactorOffer(session.letterOfMarqueFactorOffer);
    session.letterOfMarqueFactorOfferOutcome = "declined";
    session.nodeId = "marque-factor-followup";
    session.selectedIndex = 0;
    session.feedback = null;
    return { closed: false };
  }
  if (action.type === "buy" || action.type === "buy-max") {
    const quantity = action.type === "buy-max" ? action.quantity : 1;
    const warnings = playerTradeEmbargoPurchaseWarnings(gameState, city, action.goodId)
      .filter((order) => !session.acknowledgedTradeEmbargoOrderIds.includes(order.id));
    if (warnings.length > 0) {
      session.pendingTradeEmbargoPurchase = {
        purchase: { goodId: action.goodId, quantity },
        returnNodeId: session.nodeId,
        orders: warnings.map((order) => ({ ...order }))
      };
      session.nodeId = "trade-embargo-warning";
      session.selectedIndex = 0;
      session.feedback = null;
      return { closed: false };
    }
    return executePortMarketPurchase(session, gameState, economy, city, {
      goodId: action.goodId,
      quantity
    }, context);
  }
  if (action.type === "confirm-trade-embargo-purchase") {
    const pending = requiredTradeEmbargoPurchase(session);
    session.acknowledgedTradeEmbargoOrderIds = [...new Set([
      ...session.acknowledgedTradeEmbargoOrderIds,
      ...pending.orders.map((order) => order.id)
    ])];
    session.pendingTradeEmbargoPurchase = null;
    session.nodeId = pending.returnNodeId;
    return executePortMarketPurchase(
      session,
      gameState,
      economy,
      city,
      pending.purchase,
      context
    );
  }
  if (action.type === "decline-trade-embargo-purchase") {
    const pending = requiredTradeEmbargoPurchase(session);
    session.pendingTradeEmbargoPurchase = null;
    session.nodeId = pending.returnNodeId;
    session.selectedIndex = 0;
    session.feedback = "The cargo remains ashore.";
    return { closed: false };
  }
  if (action.type === "buy-net") {
    const result = purchaseFishingNet(gameState, economy, city, action.netId, context);
    session.feedback = `${result.net.label} fitted for ${result.price} db.`;
    session.nodeId = "equipment-nets";
    session.selectedIndex = 0;
    return { closed: false, fishingNetPurchase: result };
  }
  if (action.type === "buy-cannon-equipment") {
    const result = purchaseCannonEquipment(gameState, economy, city, action.equipmentId, context);
    session.feedback = `${result.equipment.label} fitted for ${result.price} db.`;
    session.nodeId = "equipment-cannons";
    session.selectedIndex = 0;
    return { closed: false, cannonEquipmentPurchase: result };
  }
  if (action.type === "buy-whale-harpoon") {
    const result = purchaseWhaleHarpoon(gameState, economy, city, action.harpoonId, context);
    session.feedback = `${result.harpoon.label} fitted for ${result.price} db.`;
    session.nodeId = "equipment-harpoons";
    session.selectedIndex = 0;
    return { closed: false, whaleHarpoonPurchase: result };
  }
  if (action.type === "buy-perk-item") {
    const result = purchasePerkItem(gameState, city, action.itemId, context);
    session.feedback = `${result.item.label} brought aboard for ${result.price} db.`;
    session.specialEquipmentOffer = null;
    session.nodeId = "equipment";
    session.selectedIndex = 0;
    return { closed: false, perkItemPurchase: result };
  }
  if (action.type === "decline-special-equipment") {
    session.specialEquipmentOffer = null;
    session.nodeId = "equipment";
    session.selectedIndex = 0;
    session.feedback = null;
    return { closed: false };
  }
  if (action.type === "sell" || action.type === "sell-all") {
    return continueMarketSale(session, city, gameState, economy, action, context);
  }
  if (action.type === "confirm-trade-embargo-sale") {
    const pending = requiredTradeEmbargoSale(session);
    session.acknowledgedTradeEmbargoOrderIds = [...new Set([
      ...session.acknowledgedTradeEmbargoOrderIds,
      ...pending.orders.map((order) => order.id)
    ])];
    session.pendingTradeEmbargoSale = null;
    session.nodeId = "sell";
    return continueMarketSale(session, city, gameState, economy, pending.action, context);
  }
  if (action.type === "decline-trade-embargo-sale") {
    requiredTradeEmbargoSale(session);
    session.pendingTradeEmbargoSale = null;
    session.nodeId = "sell";
    session.selectedIndex = 0;
    session.feedback = "The forbidden cargo remains aboard.";
    return { closed: false };
  }
  if (action.type === "confirm-tribute-theft") {
    const pending = session.pendingTributeTheft;
    if (!pending) throw new Error("No sealed tribute sale is awaiting confirmation");
    const result = executeMarketSale(
      session,
      city,
      gameState,
      economy,
      pending.action.goodId,
      pending.action.quantity,
      context,
      pending.action.type === "sell-all"
    );
    const theftResult = recordQuestCargoTheft(gameState, pending.theft, context);
    clearMarketUndoSession(session);
    session.pendingTributeTheft = null;
    session.nodeId = "sell";
    session.feedback = pending.theft.kind === "tea-race"
      ? "The entrusted tea was sold. The new-crop race has failed."
      : "The sealed tribute was sold. Your diplomatic mission has failed.";
    return {
      ...result,
      questCargoTheft: theftResult,
      ...(pending.theft.kind === "tea-race" ? {} : { tributeTheft: theftResult })
    };
  }
  if (action.type === "cancel-tribute-theft") {
    const pending = session.pendingTributeTheft;
    if (!pending) throw new Error("No entrusted cargo sale is awaiting cancellation");
    session.pendingTributeTheft = null;
    session.nodeId = "sell";
    session.selectedIndex = 0;
    session.feedback = pending.theft.kind === "tea-race"
      ? "The new tea remains sealed for London."
      : "The sealed tribute remains aboard.";
    return { closed: false };
  }
  if (action.type === "confirm-quest-cargo-sale") {
    const pending = session.pendingQuestCargoSale;
    if (!pending) throw new Error("No quest cargo sale is awaiting confirmation");
    const result = executeMarketSale(
      session,
      city,
      gameState,
      economy,
      pending.action.goodId,
      pending.action.quantity,
      context,
      pending.action.type === "sell-all"
    );
    session.pendingQuestCargoSale = null;
    session.nodeId = "sell";
    return result;
  }
  if (action.type === "cancel-quest-cargo-sale") {
    if (!session.pendingQuestCargoSale) {
      throw new Error("No quest cargo sale is awaiting cancellation");
    }
    session.pendingQuestCargoSale = null;
    session.nodeId = "sell";
    session.selectedIndex = 0;
    session.feedback = "The quest cargo remains aboard.";
    return { closed: false };
  }
  if (action.type === "undo-market") {
    if (session.marketUndoNodeId !== session.nodeId || !session.marketUndoSnapshot) {
      throw new Error(`No ${session.nodeId} market actions are available to undo`);
    }
    session.pendingMarketUndoNodeId = session.nodeId;
    session.nodeId = "market-undo-confirm";
    session.selectedIndex = 1;
    session.feedback = null;
    return { closed: false };
  }
  if (action.type === "confirm-market-undo") {
    const marketNodeId = requiredPendingMarketUndoNodeId(session);
    const restored = restoreMarketUndoSnapshot(
      gameState,
      economy,
      city,
      session.marketUndoSnapshot
    );
    session.marketPurchases = {};
    session.marketSales = 0;
    session.illicitTradeVisit = copyIllicitTradeVisit(session.marketUndoIllicitTradeVisit);
    session.pendingMarketUndoNodeId = null;
    session.nodeId = marketNodeId;
    session.selectedIndex = 0;
    session.feedback = marketNodeId === "buy"
      ? "All purchases on this page were undone."
      : "All sales on this page were undone.";
    return { closed: false, marketUndo: restored };
  }
  if (action.type === "cancel-market-undo") {
    const marketNodeId = requiredPendingMarketUndoNodeId(session);
    session.pendingMarketUndoNodeId = null;
    session.nodeId = marketNodeId;
    session.selectedIndex = 0;
    session.feedback = marketNodeId === "buy"
      ? "The purchases remain entered in the ledger."
      : "The sales remain entered in the ledger.";
    return { closed: false };
  }
  if (action.type === "accept-quest") {
    const acceptedQuest = acceptQuest(gameState, action.quest, context);
    session.feedback = isCaptureCommissionQuest(action.quest)
      ? action.quest.independentTarget
        ? `Warrant accepted. Capture the independent harbor of ${action.quest.targetName} for ${action.quest.originFactionName}.`
        : isCaptureCapitalQuest(action.quest)
          ? `Final commission accepted. Capture ${action.quest.targetName} and compel a general peace.`
          : `Commission accepted. Capture ${action.quest.targetName} for ${action.quest.originFactionName}.`
      : isWokouHuntQuest(action.quest)
        ? `Commission accepted. Hunt the wokou near ${action.quest.patrolName}.`
      : isTeaRaceQuest(action.quest)
        ? "The race is on. Ten tea chests are aboard; beat five rival ships to London."
      : action.quest.kind === "passenger"
        ? `Accepted passage to ${action.quest.destinationName}.`
        : `Accepted delivery to ${action.quest.destinationName}.`;
    session.nodeId = "quest";
    session.selectedIndex = 0;
    return { closed: false, acceptedQuest };
  }
  if (action.type === "petition-capture-commission") {
    if (session.nodeId !== "capture-petition") {
      throw new Error(`Capture-commission petition requires the war secretary: ${session.nodeId}`);
    }
    const result = petitionCaptureCommission(
      gameState,
      city,
      portCities,
      action.petitionTargetId,
      context
    );
    session.captureCommissionPetitionResult = result;
    session.nodeId = "capture-petition-result";
    session.selectedIndex = 0;
    session.feedback = null;
    return { closed: false, captureCommissionPetition: result };
  }
  if (action.type === "complete-quest") {
    const quest = completeQuest(gameState, city, context);
    const nextDeliveryOffer = quest.kind === "delivery"
      ? deliveryOfferForCity(gameState, city, portCities, {
          simMinute: context.simMinute ?? 0
        })
      : null;
    const missionItemGift = quest.kind === "delivery" || isTeaRaceQuest(quest)
      ? null
      : maybeGrantMissionPerkItem(gameState, city, {
          missionId: quest.id,
          distanceKm: quest.distanceKm || 0,
          reward: quest.reward || 0,
          random: context.missionGiftRandom || neverGrantMissionItem,
          context
        });
    session.feedback = isCaptureCommissionQuest(quest)
      ? isCaptureCapitalQuest(quest)
        ? `War-ending commission fulfilled. Earned ${quest.reward} db. Standing transformed.`
        : `Commission fulfilled. Earned ${quest.reward} db. Standing greatly improved.`
      : quest.kind === "passenger"
        ? `${passengerName(quest)} went ashore. Earned ${quest.reward} db. Standing improved.`
      : isTeaRaceQuest(quest)
        ? quest.teaRaceWon
          ? `First tea ashore. Won the race and earned ${quest.reward} db.`
          : `Tea delivered. Earned the ${quest.reward} db finishing premium.`
        : `Delivered. Earned ${quest.reward} db. Standing improved.`;
    session.nodeId = session.nextPortNodeId || "root";
    session.nextPortNodeId = null;
    session.selectedIndex = 0;
    const questCargoTransfers = isTeaRaceQuest(quest)
      ? quest.teaRaceCargoRequirements.map(({ goodId, quantity }) => (
          questCargoTransfer(goodId, quantity)
        ))
      : [];
    return {
      closed: false,
      completedQuest: quest,
      questCargoTransfers,
      missionItemGift,
      nextDeliveryOffer
    };
  }
  if (action.type === "request-marque") {
    const result = grantLetterOfMarque(gameState, city, context.shipPower || 0, context);
    session.marqueGrantedFactionId = result.grantedNow ? result.factionId : null;
    session.feedback = null;
    session.nodeId = "marque";
    session.selectedIndex = 0;
    return { closed: false };
  }
  if (action.type === "open-trade-pass") {
    personalTradePassStatus(
      gameState,
      city,
      action.policyId,
      context.simMinute ?? 0
    );
    session.tradePassPolicyId = action.policyId;
    session.tradePassGrantedPolicyId = null;
    session.feedback = null;
    session.nodeId = "trade-pass";
    session.selectedIndex = 0;
    return { closed: false };
  }
  if (action.type === "request-trade-pass") {
    const result = issuePersonalTradePass(
      gameState,
      city,
      action.policyId,
      context
    );
    session.tradePassPolicyId = result.policyId;
    session.tradePassGrantedPolicyId = result.grantedNow ? result.policyId : null;
    session.feedback = null;
    session.nodeId = "trade-pass";
    session.selectedIndex = 0;
    return { closed: false };
  }
  throw new Error(`Unknown dialogue action: ${action.type}`);
}

export function passengerDialogueView(session, city, quest, gameState) {
  const view = passengerDialogueContentView(session, city, quest, gameState);
  return validateDialogueDecision(view, quest?.id || session.questId);
}

function passengerDialogueContentView(session, city, quest, gameState) {
  assertPassengerDialogueSubject(session, city, quest);
  const questMemory = gameState?.memory?.quests || {};
  const active = isEnvoyQuest(quest)
    ? questMemory.active || null
    : questMemory.passengerActive || null;
  const blockingQuest = isEnvoyQuest(quest)
    ? questMemory.active || questMemory.passengerActive || null
    : questMemory.passengerActive ||
      (questMemory.active?.kind === "delivery" ? null : questMemory.active) ||
      null;
  const roleLabel = passengerRoleLabel(quest);
  const speaker = `${passengerName(quest)}, ${roleLabel}`;
  const expressionId = questExpressionId(quest);
  if (session.journeyEvent) {
    return {
      speaker,
      expressionId: session.journeyEvent.expressionId,
      text: session.journeyEvent.text,
      feedback: session.feedback,
      options: [option("Continue", {
        type: "acknowledge-quest-journey-dialogue",
        eventId: session.journeyEvent.id
      })]
    };
  }
  if (session.lutheranConversionPending) {
    if (!captainNeedsBibleFaithDecision(gameState, quest)) {
      throw new Error("September Testament faith decision is no longer valid");
    }
    const currentReligionId = gameState.playerCharacter.religionId;
    return {
      speaker,
      expressionId: "amused",
      text: "Captain, you read the Bibles all the way here. Did they change your faith, or only ruin your sleep?",
      feedback: session.feedback,
      options: [
        option(currentReligionId === "roman-catholic"
          ? "Remain Roman Catholic"
          : "Keep my present faith", {
          type: "resolve-bible-faith",
          religionId: currentReligionId
        }),
        option("Become Lutheran", {
          type: "resolve-bible-faith",
          religionId: "lutheran"
        })
      ]
    };
  }
  if (session.religiousLegDelivery && !session.religiousLegDelivery.final) {
    return {
      speaker,
      expressionId: "amused",
      text: `One city supplied. ${session.religiousLegDelivery.nextDestinationName} is next. ` +
        "The bishops have excellent roads; unfortunately for them, so do we.",
      feedback: session.feedback,
      options: [option("Continue the circuit", { type: "close" })]
    };
  }
  if (session.eastAsianLegDelivery && !session.eastAsianLegDelivery.final) {
    const remaining = joinedNames(session.eastAsianLegDelivery.remainingDestinationNames);
    return {
      speaker,
      expressionId: "pleased",
      text: session.eastAsianLegDelivery.batteryUpgrade
        ? `${session.eastAsianLegDelivery.destinationName}'s battery has its new guns. ` +
          `The remaining plans may go to ${remaining} in any order.`
        : `Nanjing has copied the Portuguese patterns. ` +
          `We may now refit ${remaining} in any order.`,
      feedback: session.feedback,
      options: [option("Continue the artillery circuit", { type: "close" })]
    };
  }
  if (session.envoyNegotiationResult) {
    if (!isEnvoyQuest(quest)) {
      throw new Error("Passenger dialogue stored an envoy negotiation for a non-envoy quest");
    }
    return {
      speaker: `${characterName(city.character)}, local official`,
      expressionId: quest.kind === "hostile-envoy" ? "stern" : "attentive",
      text: quest.dialogue?.negotiation ||
        "Our court has heard the envoy's terms. The formal answer may now be carried home.",
      feedback: session.feedback,
      options: [
        option("Receive the answer", { type: "finish-envoy-negotiation" })
      ]
    };
  }
  if (active?.id === quest.id && isEnvoyQuest(quest) && quest.stage === "outbound" && quest.targetCityId === city.cityId) {
    return {
      speaker,
      expressionId: quest.kind === "hostile-envoy" ? "stern" : "attentive",
      text: quest.dialogue?.negotiationOpening ||
        `I come under ${quest.originRulerName || "my ruler"}'s seal to present our terms before this court.`,
      feedback: session.feedback,
      options: [
        option("Present the envoy to court", { type: "negotiate-envoy" }),
        option("Not yet", { type: "close" })
      ]
    };
  }
  if (active?.id === quest.id && quest.destinationCityId === city.cityId &&
      eastAsianMissionHasOutcomes(quest)) {
    if (
      quest.eastAsianMissionId === EAST_ASIAN_MISSION_NINGBO &&
      !quest.eastAsianOutcomeId &&
      ningboMissionBribeDecision(quest) === null
    ) {
      const rivalCharacter = session.ningboRivalCharacter;
      if (!rivalCharacter?.id || !rivalCharacter.name) {
        throw new Error("Ningbo bribe dialogue requires the rival captain");
      }
      const origin = quest.eastAsianStartingFactionId === "hosokawa" ? "Hosokawa" : "Ouchi";
      const rival = quest.eastAsianStartingFactionId === "hosokawa" ? "Ouchi" : "Hosokawa";
      const rivalOutcome = eastAsianMissionOutcomeOptions(quest).find(({ id }) => id === "support-rival");
      if (!rivalOutcome) throw new Error("Ningbo mission has no defection outcome");
      return {
        speaker: `${rivalCharacter.name}, ${rival} captain`,
        expressionId: "attentive",
        text: quest.eastAsianWonRace
          ? `You beat our courier to the shipping office. ${origin} hired you, but ${rival} can pay better. Take ${NINGBO_DEFECTION_BRIBE} db, stand with us, and help drive their ships from Ningbo.`
          : `Our courier reached the shipping office first. ${origin} hired you, but ${rival} can pay better. Take ${NINGBO_DEFECTION_BRIBE} db, stand with us, and help drive their ships from Ningbo.`,
        feedback: session.feedback,
        options: [
          option(`Promise to defect for ${NINGBO_DEFECTION_BRIBE} db`, {
            type: "answer-ningbo-bribe",
            accepted: true
          }, {
            detail: `Promise to fight ${origin} for ${rival}`
          }),
          option("Refuse and remain loyal", {
            type: "answer-ningbo-bribe",
            accepted: false
          }, {
            detail: "Then choose mediation or battle"
          })
        ]
      };
    }
    if (quest.eastAsianOutcomeId) {
      if (quest.eastAsianMissionId === EAST_ASIAN_MISSION_NINGBO && quest.eastAsianStage === "battle") {
        const enemy = quest.eastAsianBattleFactionId === "hosokawa" ? "Hosokawa" : "Ouchi";
        return {
          speaker: `${characterName(city.character)}, local official`,
          expressionId: "stern",
          text: `The hearing has broken down. The ${enemy} delegation is putting to sea under arms. ` +
            "Defeat both of its ships before your own delegation is driven off.",
          feedback: session.feedback,
          options: [
            option("Put to sea and fight", { type: "begin-ningbo-battle" }),
            option("Not yet", { type: "close" })
          ]
        };
      }
      return {
        speaker: `${characterName(city.character)}, local official`,
        expressionId: "attentive",
        text: eastAsianMissionOutcomeResultText(quest, quest.eastAsianOutcomeId),
        feedback: session.feedback,
        options: [
          option(`Conclude the mission  ${quest.reward} db`, { type: "complete-passenger" }),
          option("Not yet", { type: "close" })
        ]
      };
    }
    if (quest.eastAsianMissionId === EAST_ASIAN_MISSION_TSUSHIMA) {
      if (session.eastAsianHearingStage === null) {
        return {
          speaker,
          expressionId: "concerned",
          text: "Captain, Joseon's councillors will believe the person who carried these papers. Tell them the Sō register is sound, and Tsushima keeps its trade.",
          feedback: session.feedback,
          options: [
            option("Vouch for the Sō envoy", {
              type: "choose-east-asian-outcome",
              outcomeId: "renew-privileges"
            }, {
              detail: "Hide the forgeries; favor Tsushima"
            }),
            option("Refuse to vouch", { type: "refuse-tsushima-vouch" }, {
              detail: "Then decide what evidence to give Joseon"
            })
          ]
        };
      }
      if (session.eastAsianHearingStage !== "evidence") {
        throw new Error(`Invalid Tsushima hearing stage: ${session.eastAsianHearingStage}`);
      }
      return {
        speaker: `${characterName(city.character)}, local official`,
        expressionId: "stern",
        text: "Then speak as witness, captain. Will you submit the forged papers, or withhold them and recommend a stricter register without accusing this envoy?",
        feedback: session.feedback,
        options: [
          option("Submit the forged papers", {
            type: "choose-east-asian-outcome",
            outcomeId: "expose-false-envoys"
          }, {
            detail: "Expose the envoy; favor Joseon"
          }),
          option("Recommend a stricter register", {
            type: "choose-east-asian-outcome",
            outcomeId: "reform-register"
          }, {
            detail: "Avoid an accusation; favor both sides"
          })
        ]
      };
    }
    if (quest.eastAsianMissionId !== EAST_ASIAN_MISSION_NINGBO) {
      throw new Error(`Unstaged East Asian political choice: ${quest.eastAsianMissionId}`);
    }
    const bribeDecision = ningboMissionBribeDecision(quest);
    if (bribeDecision === null) throw new Error("Ningbo hearing opened before the bribe was answered");
    const origin = quest.eastAsianStartingFactionId === "hosokawa" ? "Hosokawa" : "Ouchi";
    const rival = quest.eastAsianStartingFactionId === "hosokawa" ? "Ouchi" : "Hosokawa";
    const fightFor = bribeDecision === "accepted" ? rival : origin;
    const fightAgainst = bribeDecision === "accepted" ? origin : rival;
    return {
      speaker: `${characterName(city.character)}, local official`,
      expressionId: "stern",
      text: `${quest.eastAsianWonRace
          ? `Captain, your courier reached my office first; the ${quest.eastAsianRaceBonus} db purse is yours. `
          : "Captain, the rival courier reached my office first. "}${quest.dialogue?.arrival || "I require your answer."} ` +
        (bribeDecision === "accepted"
          ? `You promised to stand with ${rival} if fighting begins.`
          : `You refused ${rival}'s purse and remain pledged to ${origin}.`),
      feedback: session.feedback,
      options: [
        option("Mediate a joint tally", {
            type: "choose-east-asian-outcome",
            outcomeId: "mediate"
          }, {
            detail: bribeDecision === "accepted"
              ? "Break the bargain; avoid battle; favor Ming"
              : "Avoid battle; favor Ming"
          }),
        option(`Fight for ${fightFor}`, {
            type: "choose-east-asian-outcome",
            outcomeId: bribeDecision === "accepted" ? "support-rival" : "support-origin"
          }, {
            detail: bribeDecision === "accepted"
              ? `Collect ${NINGBO_DEFECTION_BRIBE} db; attack ${fightAgainst}`
              : `Attack ${fightAgainst}`
          })
      ]
    };
  }
  if (active?.id === quest.id && questHasDestination(quest, city) &&
      quest.eastAsianMissionId === EAST_ASIAN_MISSION_PORTUGUESE_GUNS) {
    const completedStops = quest.itinerary?.completedCityIds?.length || 0;
    const legNumber = completedStops + 1;
    const arsenalStop = completedStops === 0;
    return {
      speaker,
      expressionId: "attentive",
      text: arsenalStop
        ? "Nanjing's founders are ready to measure the captured guns. Once the patterns are copied, we must carry them to the batteries at Ningbo, Fuzhou, and Guangzhou."
        : `${cityLabel(city)} has a battery crew waiting for the Portuguese patterns and proof pieces. ` +
          `${PORTUGUESE_GUNS_STOP_COUNT - legNumber} refits will remain after this one.`,
      feedback: session.feedback,
      options: [
        option(
          arsenalStop
            ? `Unload captured guns  ${legNumber}/${PORTUGUESE_GUNS_STOP_COUNT}`
            : `Refit ${cityLabel(city)} battery  ${legNumber}/${PORTUGUESE_GUNS_STOP_COUNT}`,
          { type: "deliver-east-asian-itinerary-leg" }
        ),
        option("Not yet", { type: "close" })
      ]
    };
  }
  if (active?.id === quest.id && questHasDestination(quest, city)) {
    if (isMultiPortReligiousMission(quest) && !session.religiousParticipationUnderway) {
      const legNumber = quest.itinerary.completedCityIds.length + 1;
      const legCount = quest.itinerary.stops.length;
      return {
        speaker,
        expressionId: "attentive",
        text: `${cityLabel(city)} has trusted readers waiting behind drawn shutters. ` +
          `This is delivery ${legNumber} of ${legCount}.`,
        feedback: session.feedback,
        options: [
          option(`Deliver Testaments  ${legNumber}/${legCount}`, {
            type: "deliver-religious-itinerary-leg"
          }),
          option("Not yet", { type: "close" })
        ]
      };
    }
    if (isHajjPassengerQuest(quest) && session.hajjUnderway) {
      return {
        speaker,
        expressionId: "happy",
        text: "We stood together at Arafat and completed the Hajj. May God accept your pilgrimage. Take this Zamzam flask; its cup will help husband every cask.",
        feedback: session.feedback,
        options: [
          option(`Return to Jeddah  ${quest.reward} db`, { type: "complete-hajj" })
        ]
      };
    }
    if (isReligiousPassengerQuest(quest) && session.religiousParticipationUnderway) {
      const participation = religiousMissionParticipation(quest);
      return {
        speaker,
        expressionId: "happy",
        text: participation.text,
        feedback: session.feedback,
        options: [
          option(
            `Complete the mission  ${quest.reward + participation.bonusDoubloons} db`,
            { type: "complete-religious-mission" },
            { iconId: religiousMissionIconId(quest) }
          )
        ]
      };
    }
    const hajjQuest = isHajjPassengerQuest(quest);
    const captainCanJoinHajj = hajjQuest && muslimCaptainCanUndertakeHajj(gameState);
    const religiousQuest = isReligiousPassengerQuest(quest);
    const captainCanParticipate = religiousQuest &&
      captainCanParticipateInReligiousMission(gameState, quest);
    const participation = captainCanParticipate
      ? religiousMissionParticipation(quest)
      : null;
    return {
      speaker,
      expressionId: "happy",
      text: hajjQuest
        ? hajjArrivalDialogueText(quest, gameState)
        : isEnvoyQuest(quest)
          ? quest.dialogue?.homecoming || `${cityLabel(city)} at last. The treasury will settle our account.`
          : quest.dialogue?.arrival || `${cityLabel(city)} at last. Here is the fare I promised.`,
      feedback: session.feedback,
      options: [
        ...(captainCanJoinHajj
          ? [option("Undertake the Hajj together", { type: "begin-hajj" })]
          : []),
        ...(participation
          ? [option(
              participation.label,
              { type: "participate-religious-mission" },
              { iconId: religiousMissionIconId(quest) }
            )]
          : []),
        option(
          isEnvoyQuest(quest)
            ? `Report to court  ${quest.reward} db`
            : hajjQuest
              ? `See pilgrim to the Mecca road  ${quest.reward} db`
              : `Set ${roleLabel} ashore  ${quest.reward} db`,
          { type: "complete-passenger" }
        ),
        option("Not yet", { type: "close" })
      ]
    };
  }
  if (active?.id === quest.id) {
    return {
      speaker,
      expressionId: "attentive",
      text: isEnvoyQuest(quest) && quest.stage === "return"
        ? quest.dialogue?.returnUnderway || `I carry the answer home to ${quest.originName}.`
        : quest.eastAsianMissionId === EAST_ASIAN_MISSION_PORTUGUESE_GUNS && quest.itinerary
          ? `The artillery plans are bound for ${joinedNames(
            questDestinationStops(quest)
              .map((stop) => stop.name)
          )}. We may visit the remaining ports in any order.`
        : isMultiPortReligiousMission(quest)
          ? `The next bundles are bound for ${quest.destinationName}. ` +
            `${quest.itinerary.stops.length - quest.itinerary.completedTileIds.length} deliveries remain.`
          : quest.dialogue?.underway || `I am bound for ${quest.destinationName}.`,
      feedback: session.feedback,
      options: [
        option("Leave", { type: "close" })
      ]
    };
  }
  if (blockingQuest && blockingQuest.id !== quest.id) {
    return {
      speaker,
      expressionId: "concerned",
      text: `Your ship is already pledged to ${blockingQuest.destinationName}. I will wait here if you return.`,
      feedback: session.feedback,
      options: [
        option("Leave", { type: "close" })
      ]
    };
  }
  return {
    speaker,
    expressionId,
    text: `${quest.dialogue?.offer || `I need passage to ${quest.destinationName}. I can pay ${quest.reward} db on arrival.`} Distance ${formatDistanceKm(quest.distanceKm)}.`,
    feedback: session.feedback,
    options: [
      option(`${isEnvoyQuest(quest)
        ? quest.envoyCount > 1 ? "Carry delegation" : "Carry envoy"
        : `Take ${roleLabel}`} to ${quest.destinationName}  ${quest.reward} db`, { type: "accept-passenger" }, {
        detail: formatDistanceKm(quest.distanceKm)
      }),
      option("Decline", { type: "decline-passenger" })
    ]
  };
}

export function selectPassengerDialogueOption(
  session,
  city,
  quest,
  gameState,
  optionIndex = session.selectedIndex,
  context = {}
) {
  const view = passengerDialogueView(session, city, quest, gameState);
  const selected = view.options[optionIndex];
  if (!selected) throw new Error(`Invalid passenger dialogue option index: ${optionIndex}`);
  const action = selected.action;
  if (action.type === "close") return { closed: true, action: null };
  if (action.type === "open-port") return { closed: false, action: { type: "open-port" } };
  if (action.type === "decline-passenger") {
    declinePassengerOffer(gameState, quest, context);
    return { closed: false, action: { type: "open-port" } };
  }
  if (action.type === "acknowledge-quest-journey-dialogue") {
    if (session.journeyEvent?.id !== action.eventId) {
      throw new Error(`Passenger dialogue lost journey event: ${action.eventId}`);
    }
    markQuestJourneyDialogueSeen(quest, action.eventId);
    session.journeyEvent = null;
    session.selectedIndex = 0;
    return { closed: false, action: null };
  }
  if (action.type === "accept-passenger") {
    acceptQuest(gameState, quest, context);
    return quest.eastAsianMissionId === EAST_ASIAN_MISSION_NINGBO
      ? { closed: true, action: null, acceptedQuest: quest }
      : { closed: true, action: null };
  }
  if (action.type === "negotiate-envoy") {
    const negotiation = negotiateEnvoyQuest(gameState, city, context);
    session.envoyNegotiationResult = negotiation;
    session.selectedIndex = 0;
    return {
      closed: false,
      action: { type: "envoy-negotiated", negotiation },
      questCargoTransfers: (negotiation.tributeCargo || []).map(({ goodId, quantity }) => (
        questCargoTransfer(goodId, quantity)
      ))
    };
  }
  if (action.type === "finish-envoy-negotiation") {
    if (!session.envoyNegotiationResult) {
      throw new Error("Envoy negotiation cannot finish before the local court answers");
    }
    return { closed: true, action: null };
  }
  if (action.type === "choose-east-asian-outcome") {
    if (!isEastAsianMissionQuest(quest) || quest.destinationCityId !== city.cityId) {
      throw new Error("East Asian mission outcome is not available here");
    }
    selectEastAsianMissionOutcome(gameState, quest.id, action.outcomeId, { ...context, city });
    session.selectedIndex = 0;
    return { closed: false, action: null };
  }
  if (action.type === "answer-ningbo-bribe") {
    if (
      quest.eastAsianMissionId !== EAST_ASIAN_MISSION_NINGBO ||
      quest.destinationCityId !== city.cityId
    ) {
      throw new Error("Ningbo bribe is not available here");
    }
    answerNingboMissionBribe(gameState, quest.id, action.accepted);
    const hasBribeJourneyEvent = quest.dialogue?.journeyEvents?.some(
      (event) => event.id === NINGBO_BRIBE_JOURNEY_EVENT_ID
    );
    if (hasBribeJourneyEvent && !(quest.journeyDialogueSeenIds || []).includes(NINGBO_BRIBE_JOURNEY_EVENT_ID)) {
      markQuestJourneyDialogueSeen(quest, NINGBO_BRIBE_JOURNEY_EVENT_ID);
    }
    session.selectedIndex = 0;
    return { closed: false, action: null };
  }
  if (action.type === "refuse-tsushima-vouch") {
    if (
      quest.eastAsianMissionId !== EAST_ASIAN_MISSION_TSUSHIMA ||
      quest.destinationCityId !== city.cityId ||
      session.eastAsianHearingStage !== null
    ) {
      throw new Error("Tsushima testimony cannot advance from this dialogue");
    }
    session.eastAsianHearingStage = "evidence";
    session.selectedIndex = 0;
    return { closed: false, action: null };
  }
  if (action.type === "begin-ningbo-battle") {
    if (
      quest.eastAsianMissionId !== EAST_ASIAN_MISSION_NINGBO ||
      quest.eastAsianStage !== "battle" ||
      quest.destinationCityId !== city.cityId
    ) {
      throw new Error("Ningbo battle is not ready");
    }
    return { closed: true, action: { type: "begin-ningbo-battle", questId: quest.id } };
  }
  if (action.type === "begin-hajj") {
    if (!isHajjPassengerQuest(quest) || !muslimCaptainCanUndertakeHajj(gameState)) {
      throw new Error("Captain is not eligible to undertake the Hajj");
    }
    session.hajjUnderway = true;
    session.selectedIndex = 0;
    return { closed: false, action: null };
  }
  if (action.type === "participate-religious-mission") {
    if (
      !isReligiousPassengerQuest(quest) ||
      !captainCanParticipateInReligiousMission(gameState, quest) ||
      quest.destinationCityId !== city.cityId ||
      activeTravelPassengerQuest(gameState)?.id !== quest.id
    ) {
      throw new Error("Captain is not eligible to participate in this religious mission");
    }
    session.religiousParticipationUnderway = true;
    session.selectedIndex = 0;
    return { closed: false, action: null };
  }
  let religiousLegDelivery = null;
  let eastAsianLegDelivery = null;
  if (action.type === "deliver-east-asian-itinerary-leg") {
    eastAsianLegDelivery = deliverEastAsianMissionLeg(gameState, city, context);
    session.eastAsianLegDelivery = eastAsianLegDelivery;
    session.selectedIndex = 0;
    if (!eastAsianLegDelivery.final) {
      return { closed: false, action: null, eastAsianLegDelivery };
    }
  }
  if (action.type === "deliver-religious-itinerary-leg") {
    religiousLegDelivery = deliverReligiousMissionLeg(gameState, city, context);
    session.religiousLegDelivery = religiousLegDelivery;
    session.selectedIndex = 0;
    if (!religiousLegDelivery.final) return { closed: false, action: null, religiousLegDelivery };
    if (captainNeedsBibleFaithDecision(gameState, quest)) {
      session.lutheranConversionPending = true;
      return { closed: false, action: null, religiousLegDelivery };
    }
    if (captainCanParticipateInReligiousMission(gameState, quest)) {
      session.religiousParticipationUnderway = true;
      return { closed: false, action: null, religiousLegDelivery };
    }
  }
  if (action.type === "complete-passenger" && captainNeedsBibleFaithDecision(gameState, quest)) {
    session.lutheranConversionPending = true;
    session.selectedIndex = 0;
    return { closed: false, action: null };
  }
  const resolvingBibleFaith = action.type === "resolve-bible-faith";
  if (resolvingBibleFaith && (
    !session.lutheranConversionPending ||
    !captainNeedsBibleFaithDecision(gameState, quest) ||
    ![gameState.playerCharacter.religionId, "lutheran"].includes(action.religionId)
  )) {
    throw new Error("Bible faith decision cannot be resolved from this passenger dialogue");
  }
  if (
    action.type === "complete-passenger" ||
    action.type === "complete-hajj" ||
    action.type === "complete-religious-mission" ||
    resolvingBibleFaith ||
    eastAsianLegDelivery?.final === true ||
    religiousLegDelivery?.final === true
  ) {
    const completingHajj = action.type === "complete-hajj";
    const completingReligiousParticipation = action.type === "complete-religious-mission";
    if (completingHajj && (
      !session.hajjUnderway ||
      !isHajjPassengerQuest(quest) ||
      !muslimCaptainCanUndertakeHajj(gameState)
    )) {
      throw new Error("Hajj cannot be completed from this passenger dialogue");
    }
    if (completingReligiousParticipation && (
      !session.religiousParticipationUnderway ||
      !isReligiousPassengerQuest(quest) ||
      !captainCanParticipateInReligiousMission(gameState, quest)
    )) {
      throw new Error("Religious mission participation cannot be completed from this dialogue");
    }
    const completed = completeQuest(gameState, city, {
      ...context,
      questId: quest.id
    });
    const religiousConversion = resolvingBibleFaith
      ? changePlayerReligion(gameState, action.religionId, context.simMinute ?? 0)
      : null;
    if (resolvingBibleFaith) {
      gameState.memory.flags.septemberTestamentFaithDecisionMade = true;
      session.lutheranConversionPending = false;
    }
    const religiousMissionParticipationResult = completingReligiousParticipation
      ? religiousMissionParticipation(completed)
      : null;
    if (religiousMissionParticipationResult) {
      receiveQuestPayment(
        gameState,
        city,
        religiousMissionParticipationResult.bonusDoubloons,
        `${religiousMissionParticipationResult.bonusLabel}: ${religiousMissionParticipationResult.title}`,
        context
      );
      adjustFactionReputation(
        gameState,
        city.factionId,
        religiousMissionParticipationResult.reputationBonus
      );
    }
    const missionItemGift = completingHajj
      ? grantGuaranteedMissionPerkItem(gameState, city, {
        missionId: completed.id,
        itemId: HAJJ_PILGRIMAGE_PERK_ITEM_ID,
        description: "Hajj keepsake: Zamzam Flask",
        context
      })
      : maybeGrantMissionPerkItem(gameState, city, {
        missionId: completed.id,
        distanceKm: completed.distanceKm || 0,
        reward: completed.reward || 0,
        random: context.missionGiftRandom || neverGrantMissionItem,
        context
      });
    if (completingHajj) gameState.memory.flags.hajjCompleted = true;
    return {
      closed: true,
      action: null,
      ...(religiousMissionParticipationResult
        ? { religiousMissionParticipation: religiousMissionParticipationResult }
        : {}),
      ...(religiousConversion ? { religiousConversion } : {}),
      ...(religiousLegDelivery ? { religiousLegDelivery } : {}),
      ...(eastAsianLegDelivery ? { eastAsianLegDelivery } : {}),
      ...(missionItemGift ? { missionItemGift } : {})
    };
  }
  throw new Error(`Unknown passenger dialogue action: ${action.type}`);
}

function captainNeedsBibleFaithDecision(gameState, quest) {
  return religiousMissionOffersLutheranConversion(quest) &&
    typeof gameState?.playerCharacter?.religionId === "string" &&
    gameState.playerCharacter.religionId !== "lutheran" &&
    gameState?.memory?.flags?.septemberTestamentFaithDecisionMade !== true;
}

function isMultiPortReligiousMission(quest) {
  return isReligiousPassengerQuest(quest) &&
    Array.isArray(quest.itinerary?.stops) && quest.itinerary.stops.length > 1;
}

function activeTravelPassengerQuest(gameState) {
  const quests = gameState?.memory?.quests || {};
  return quests.passengerActive || (isEnvoyQuest(quests.active) ? quests.active : null);
}

function muslimCaptainCanUndertakeHajj(gameState) {
  const religionId = gameState?.playerCharacter?.religionId || null;
  return Boolean(
    religionId &&
    isIslamicReligion(religionId) &&
    gameState?.memory?.flags?.hajjCompleted !== true
  );
}

function hajjArrivalDialogueText(quest, gameState) {
  const opening = quest.dialogue?.arrival ||
    "Jeddah at last—the sea gate to Mecca. From here the pilgrims take the road inland.";
  const religionId = gameState?.playerCharacter?.religionId || null;
  if (!religionId || !isIslamicReligion(religionId)) return opening;
  if (gameState?.memory?.flags?.hajjCompleted === true) {
    return `${opening} You have made the Hajj before, captain; pray that mine is accepted.`;
  }
  return `${opening} You are a fellow Muslim. If you are ready, come with me as a pilgrim.`;
}

function assertPassengerDialogueSubject(session, city, quest) {
  if (!session || session.kind !== "passenger") throw new Error("Missing passenger dialogue session");
  if (!city || session.cityId !== city.cityId) throw new Error("Dialogue city does not match active passenger session");
  if (!quest || (quest.kind !== "passenger" && !isEnvoyQuest(quest)) || session.questId !== quest.id) {
    throw new Error("Dialogue passenger quest does not match active session");
  }
  const negotiationTarget = session.envoyNegotiationResult && quest.targetCityId === city.cityId;
  const stagedItineraryResult = Boolean(
    session.religiousLegDelivery || session.eastAsianLegDelivery
  );
  if (quest.originCityId !== city.cityId && !questHasDestination(quest, city) &&
      !negotiationTarget && !stagedItineraryResult) {
    throw new Error(`${cityLabel(city)} is not part of passenger quest ${quest.id}`);
  }
}

function joinedNames(names) {
  if (!Array.isArray(names) || names.length === 0) throw new Error("Destination list is empty");
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function greetingView(session, city, gameState, context) {
  const memory = portMemory(gameState, city);
  if (session.rumorText !== null) {
    return {
      speaker: speakerName(city),
      expressionId: "attentive",
      text: session.rumorText,
      feedback: null,
      options: [option("Mark the bearing", {
        type: "node",
        nodeId: session.nextPortNodeId || "root"
      })]
    };
  }
  if (city.isPirateHideout) return pirateHideoutGreetingView(city, memory, context);
  if (city.playerFoundedColony || city.playerDevelopedPort) {
    const discountPercent = founderPurchaseDiscountPercent();
    const developedPortText = memory.visits > 1
      ? `Welcome back, captain. Nagasaki's factors still honor your ${discountPercent}% trading discount.`
      : `The China ship has made Nagasaki a city. For opening its harbor, you receive ${discountPercent}% off goods you buy here.`;
    return {
      speaker: `${characterName(city.character)}, ${city.playerDevelopedPort ? "port steward" : "governor"} of ${cityLabel(city)}`,
      expressionId: "happy",
      text: city.playerDevelopedPort
        ? developedPortText
        : memory.visits > 1
          ? `Welcome home, founder. Every factor here gives you ${discountPercent}% off goods you buy.`
          : `You have returned to the city you saved. As its founder, you receive ${discountPercent}% off goods you buy in ${cityLabel(city)}.`,
      feedback: null,
      options: [option("Continue", { type: "node", nodeId: "root" })]
    };
  }
  const name = cityLabel(city);
  const personalityId = city.character?.personalityId || portPersonalityForKey(`${name}|${city.country || "port"}`);
  const arrival = portFlavor(city, gameState, context, memory.visits);
  const greeting = portGreetingPresentationForPersonality({
    personalityId,
    cityName: name,
    localFlavor: arrival.text,
    prioritizeLocalFlavor: arrival.notable,
    visitCount: memory.visits,
    dayIndex: context.dayIndex || 0,
    localHour: context.localHour ?? 12,
    nearbyShips: context.nearbyShips,
    stormy: context.stormy === true,
    playerStanding: context.playerStanding || 0,
    rivalTerms: context.rivalTerms || null,
    shipyardRumor: context.shipyardRumor || null,
    rulerRumor: context.rulerRumor || null,
    historicalGossip: context.historicalGossip || null,
    speakerReligionId: city.character?.religionId || null,
    listenerReligionId: gameState.playerCharacter?.religionId || null
  });
  const recognitionRemark = typeof city.factionId === "string"
    ? portFactorRecognitionForCaptain({
        gameState,
        city,
        cities: context.cities || [city],
        personalityId,
        visitCount: memory.visits,
        dayIndex: context.dayIndex || 0,
        simMinute: context.simMinute ?? 0
      })
    : null;
  const drunkMemoryRemark = recognitionRemark ? null : rememberedDrunkFactorLine(session, memory);
  const settlementRemark = foreignSettlementFactorLine(city, gameState);
  const suzerainRemark = vassalPortEntryLine(context.portEntryStatus);
  const sovereigntyRemark = changedPortSovereigntyLine(city);
  const remarks = [
    recognitionRemark?.text,
    drunkMemoryRemark,
    settlementRemark,
    suzerainRemark,
    sovereigntyRemark,
    greeting.text
  ].filter(Boolean);
  return {
    speaker: speakerName(city),
    expressionId: recognitionRemark?.expressionId || greeting.expressionId,
    text: remarks.join("  "),
    feedback: null,
    options: [option("Continue", { type: "node", nodeId: "root" })]
  };
}

function changedPortSovereigntyLine(city) {
  if (!city.foundingFactionId || !city.factionId || city.foundingFactionId === city.factionId) return null;
  if (city.factionId === NEUTRAL_FACTION_ID) return null;
  return `${factionNounPhrase(city.factionId, { sentenceStart: true })} now rules ${cityLabel(city)}. A new ruler always means new contracts.`;
}

function vassalPortEntryLine(status) {
  if (!status?.suzerainProtectsEntry || !status.hostileLocalStanding || !status.suzerainFactionId) {
    return null;
  }
  const suzerain = factionById(status.suzerainFactionId);
  return `Your standing here remains poor, captain, but ${suzerain.name}'s protection opens the quay to you. Mind your conduct.`;
}

function foreignSettlementFactorLine(city, gameState) {
  const memory = gameState.relations.foreignSettlementExpulsions;
  const active = activeForeignSettlements(city, memory).map((entry) => entry.factorText);
  const expelled = expelledForeignSettlements(city, memory).map((entry) => {
    const resident = factionById(entry.factionId);
    return `The ${entry.label.toLowerCase()} has been closed and its ${resident.adjective} residents expelled after relations turned hostile.`;
  });
  const remarks = [...active, ...expelled];
  return remarks.length > 0 ? remarks.join(" ") : null;
}

function rememberedDrunkFactorLine(session, memory) {
  if (memory.drunkArrivals <= 0 || memory.lastDrunkVisit === memory.visits) return null;
  if ((session.drunkVariant + memory.visits + memory.drunkArrivals) % 4 !== 0) return null;
  const lines = memory.drunkArrivals > 1
    ? REMEMBERED_REPEAT_DRUNK_FACTOR_LINES
    : REMEMBERED_DRUNK_FACTOR_LINES;
  const line = lines[
    (session.drunkVariant + memory.visits + memory.drunkArrivals) % lines.length
  ];
  return line(memory.drunkArrivals);
}

function pirateHideoutGreetingView(city, memory, context) {
  const firstVisitLines = [
    "You found the cove. Either someone trusts you, or someone talks too much. Coin spends clean here. Names do not.",
    "Furl your colors beyond the headland. Inside this cove, no captain asks where a cargo came from.",
    "The carpenter patches shot holes, the victualler takes coin, and the priest asks no questions. Welcome ashore."
  ];
  const returningLines = [
    "Back from another honest voyage, are you? Tie up before the patrol rounds the cape.",
    "Your berth is still yours. Keep the guns quiet and the purse open.",
    "Word of your work reached us before you did. Come in before the tide turns."
  ];
  const lines = memory.visits > 1 ? returningLines : firstVisitLines;
  const line = lines[(city.tileId + (context.dayIndex || 0) + memory.visits) % lines.length];
  return {
    speaker: speakerName(city),
    expressionId: memory.visits > 1 ? "pleased" : "attentive",
    text: line,
    feedback: null,
    options: [option("Step into the cove", { type: "node", nodeId: "root" })]
  };
}

function barredPortView(city, gameState, context) {
  const status = context.portEntryStatus;
  const conquest = context.portConquestStatus || null;
  const attack = context.portAttackStatus || null;
  const batteryDisabled = context.portRecoveryStatus !== null && context.portRecoveryStatus !== undefined;
  if (!status?.hostile && !conquest?.canAttempt && !conquest?.playerAssaultActive && !attack?.commissioned) {
    throw new Error("Barred port dialogue requires hostility or an exposed foreign port");
  }
  const independentTarget = status.factionId === NEUTRAL_FACTION_ID &&
    attack?.independentTarget === true;
  const faction = independentTarget ? null : factionById(status.factionId);
  const ruler = independentTarget ? null : rulerAtMinute(status.factionId, context.simMinute ?? 0);
  if (!independentTarget && !ruler) {
    throw new Error(`Barred port faction has no ruler: ${status.factionId}`);
  }
  if (status.locked && !conquest?.canAttempt) {
    return {
      speaker: `${cityLabel(city)} harbor guard`,
      expressionId: "angry",
      text: `We know this vessel. The harbor watch is waiting for you. This port remains closed for ${status.lockDaysRemaining} more day${status.lockDaysRemaining === 1 ? "" : "s"}.`,
      feedback: null,
      options: [option("Leave", { type: "close" })]
    };
  }
  const options = [];
  if (conquest?.canAttempt) {
    options.push(option(
      attack?.mode === "raid" ? "Pillage city" : "Land Marines",
      { type: "land-marines" },
      {
        detail: `${conquest.successPercent}% Chance of Success`
      }
    ));
  }
  if (attack?.available && !batteryDisabled && !conquest?.playerAssaultActive) {
    options.push(portAttackOption(city, gameState, attack, {
      type: "node",
      nodeId: "city-attack",
      returnNodeId: "barred"
    }));
  }
  if (!attack?.commissioned && status.hostile && !status.locked && !batteryDisabled &&
      !conquest?.playerAssaultActive) {
    options.push(option("Try to enter in disguise", { type: "attempt-disguise" }));
  }
  options.push(option("Leave", { type: "close" }));
  return {
    speaker: `${cityLabel(city)} harbor guard`,
    expressionId: "stern",
    text: conquest?.canAttempt
      ? attack?.mode === "raid"
        ? `The harbor guns are silent. ${cityLabel(city)} is exposed to plunder, though no sovereign will recognize its annexation.`
        : `The harbor guns are silent. ${cityLabel(city)} is exposed, but ${conquest.capital ? "the capital garrison" : "the garrison"} still bars the quays.`
      : conquest?.playerRaidActive
      ? `${cityLabel(city)} has already been stripped of portable wealth. The battered harbor remains under arms until its defenses recover.`
      : attack?.commissioned && !batteryDisabled
      ? `Your commission is known. ${cityLabel(city)} has closed its gates and trained its harbor batteries on your ship.`
      : status.catholicContraband
      ? `The Edict of Worms forbids Luther's books and vernacular Scripture. Turn away from ${cityLabel(city)}, or the books will be seized.`
      : conquest?.conquistadorCompany?.needsReplenishment
      ? "Your adelantado's soldiers are spent. Find replacements under the Spanish flag before you waste the survivors against our walls."
      : batteryDisabled || conquest?.playerAssaultActive
      ? `You think to take ${cityLabel(city)} with that handful? Bring fewer than ${conquest.minimumCrew} fighting hands ashore, and we will drive every one of you into the sea.`
      : independentTarget
        ? `${cityLabel(city)} answers to its own rulers. Turn about. No supplies will be sold to you.`
        : `By order of ${ruler.displayName} of ${faction.name}, your ship is barred from ${cityLabel(city)}. Turn about. No supplies will be sold to you.`,
    feedback: null,
    options
  };
}

function cityAttackView(session, city, gameState, context) {
  const attack = context.portAttackStatus || playerPortAttackStatus(gameState, city);
  if (!attack.available) throw new Error(attack.reason || `Cannot attack ${cityLabel(city)}`);
  const target = attack.independentTarget ? null : factionById(attack.targetFactionId);
  const text = attack.piracy
    ? `Without wartime authority, attacking ${cityLabel(city)} is piracy. The harbor batteries will open fire. If you prevail, you may plunder the city, but no crown will recognize a conquest.`
    : attack.commissioned && attack.independentTarget
    ? `The sealed warrant names ${cityLabel(city)}. It authorizes this conquest for ${factionById(attack.captureFactionId).name}, but declares no war against a foreign sovereign. Attack the batteries, land your marines, and raise the colors named in the warrant.`
    : attack.commissioned
    ? `Your commission authorizes war against ${target.name}. Attack the harbor batteries, land your marines, and take ${cityLabel(city)} for ${factionById(attack.captureFactionId).name}.`
    : attack.ownNationAtWar
    ? `The flag you serve is at war with ${target.name}. You may batter the harbor and carry off lawful spoil, but only a ruler's express commission can bring ${cityLabel(city)} under another obedience.`
    : attack.privateeringAuthority
    ? `Your letter of marque permits an attack on ${target.name}, but it is not a conquest commission. You may plunder ${cityLabel(city)}, not annex it.`
    : `No sovereign will object to an attack on this pirate harbor. You may plunder it, but not annex it.`;
  return {
    speaker: gameState.playerCharacter.name,
    expressionId: "stern",
    text,
    bodyTone: attack.piracy ? "danger" : undefined,
    feedback: null,
    options: [
      option(attack.piracy ? "Attack city anyway" : "Attack city", { type: "attack-city" }),
      option("Back", { type: "node", nodeId: session.cityAttackReturnNodeId || "root" })
    ]
  };
}

function portAttackOption(city, gameState, attack, action) {
  const issuerIds = privateeringAuthorityIssuerIdsAgainst(gameState, attack.targetFactionId);
  if (attack.privateeringAuthority !== (issuerIds.length > 0)) {
    throw new Error(`Port attack authority is inconsistent for ${cityLabel(city)}`);
  }
  const notice = attackLegalityNotice({
    piracy: attack.piracy,
    issuerAdjective: issuerIds.length > 0 ? factionById(issuerIds[0]).adjective : null,
    subjectId: requireCityId(city, "Port attack notice")
  });
  return option("Attack city", action, {
    detail: notice.detail,
    detailTone: notice.tone
  });
}

function disguiseSuccessView(session, city) {
  return {
    speaker: `${cityLabel(city)} harbor official`,
    expressionId: "neutral",
    text: "Your papers appear to be in order. Keep your business quiet and cause no trouble.",
    feedback: null,
    options: [option("Enter quietly", {
      type: "node",
      nodeId: session.nextPortNodeId || "root"
    })]
  };
}

function disguiseFailureView(city, gameState, context) {
  const days = context.portEntryStatus?.lockDaysRemaining || 1;
  const attack = context.portAttackStatus || playerPortAttackStatus(gameState, city);
  const options = [];
  if (attack.available) {
    options.push(portAttackOption(city, gameState, attack, {
      type: "node",
      nodeId: "city-attack",
      returnNodeId: "disguise-failed"
    }));
  }
  options.push(option("Make for open water", { type: "close" }));
  return {
    speaker: `${cityLabel(city)} harbor guard`,
    expressionId: "angry",
    text: `There they are! Sound the alarm! The watch recognizes your ship, and you barely escape. The port will remain alert for ${days} day${days === 1 ? "" : "s"}.`,
    feedback: null,
    options
  };
}

function rootView(session, city, gameState, economy, portCities, context) {
  const market = portEconomySummary(economy, city);
  const pirateHideout = city.isPirateHideout === true;
  const tradeAccess = playerPortTradeAccess(session, city, gameState, context);
  const cartazIllicitMarket = session.illicitTradeAccessPolicyId ===
    PORTUGUESE_CROWN_SPICE_POLICY_ID;
  const illicitMarket = tradeAccess.illicit || cartazIllicitMarket;
  const activeQuest = gameState.memory.quests?.active || null;
  const canCompleteQuest = activeQuest?.destinationCityId === city.cityId;
  const shipyardProject = shipyardInvestmentAtPort(gameState, city);
  const shipyardProjectOffer = shipyardInvestmentOfferAvailable(
    gameState,
    city,
    context.shipyard,
    context.simMinute ?? 0
  );
  const capturePetitions = captureCommissionPetitionOptionsForCity(
    gameState,
    city,
    portCities,
    context
  );
  const options = [
    ...(tradeAccess.allowed
      ? [option(pirateHideout ? "Buy doubtful goods" : illicitMarket ? "Buy illicit goods" : "Buy goods", {
        type: "node",
        nodeId: "buy"
      })]
      : tradeAccess.policy && session.illicitTradeAttemptedPolicyId !== tradeAccess.policyId
        ? [option("Seek illicit market", {
          type: "attempt-restricted-illicit-trade",
          policyId: tradeAccess.policyId
        })]
        : []),
    ...(tradeAccess.allowed
      ? [option("Equipment", { type: "node", nodeId: "equipment" })]
      : []),
    ...(context.shipStats ? [option(pirateHideout ? "Refit and provision" : "Ship loadout", {
      type: "node",
      nodeId: "loadout"
    })] : []),
    ...(tradeAccess.allowed
      ? [option(pirateHideout ? "Visit the hidden yard" : "Visit shipyard", {
        type: "node",
        nodeId: "shipyard"
      })]
      : []),
    ...(tradeAccess.allowed && (shipyardProject || shipyardProjectOffer)
      ? [option(
        "Meet the shipyard syndicate",
        shipyardProject
          ? { type: "node", nodeId: "shipyard-investment" }
          : { type: "node", nodeId: "shipyard-investment-offer" }
      )]
      : []),
    ...(tradeAccess.allowed
      ? [option(pirateHideout ? "Fence cargo" : illicitMarket ? "Sell cargo illicitly" : "Sell cargo", {
        type: "node",
        nodeId: "sell"
      })]
      : []),
    ...(!pirateHideout && (!session.disguisedEntry || canCompleteQuest)
      ? [option(session.disguisedEntry ? "Complete current job" : "Ask about work", {
        type: "node",
        nodeId: "quest"
      })]
      : []),
    ...(capturePetitions.length > 0 && !session.disguisedEntry
      ? [option("Petition for a capture warrant", {
          type: "node",
          nodeId: "capture-petition"
        })]
      : [])
  ];
  if (vikingLongshipEnthusiastAtPort(gameState, city) && !session.disguisedEntry) {
    options.splice(4, 0, option("Speak with the historical enthusiast", {
      type: "node",
      nodeId: "viking-longship"
    }));
  }
  if (japaneseMatchlockQuestState(gameState, city) && !session.disguisedEntry) {
    options.splice(4, 0, option("Speak with the gunsmith", {
      type: "node",
      nodeId: "japanese-matchlocks"
    }));
  }
  if (caribbeanGingerQuestState(gameState, city) && !session.disguisedEntry) {
    options.splice(4, 0, option("Speak with the planter", {
      type: "node",
      nodeId: "caribbean-ginger"
    }));
  }
  const chefQuest = chefQuestState(gameState, city);
  if (chefQuest && chefQuest.stage !== CHEF_QUEST_STAGE_RECRUITED && !session.disguisedEntry) {
    options.splice(4, 0, option("Speak with the cook", {
      type: "node",
      nodeId: "chef-quest"
    }));
  }
  if (isColonizationQuestOrigin(gameState.memory.colonization, city) && !session.disguisedEntry) {
    const sponsorRole = colonizationQuestView(gameState).history?.sponsorRole || "expedition sponsor";
    options.splice(4, 0, option(`Speak with the ${sponsorRole}`, {
      type: "node",
      nodeId: "colonization"
    }));
  }
  if (!session.disguisedEntry && conquistadorQuestShouldAppearAtCity(
    gameState.memory.quests.conquistador,
    city,
    context.portCities
  )) {
    options.splice(4, 0, option("Speak with the adelantado", {
      type: "node",
      nodeId: "conquistador"
    }));
  }
  const passengerOffers = Array.isArray(context.passengerOffers)
    ? context.passengerOffers
    : context.passengerOffer ? [context.passengerOffer] : [];
  if (passengerOffers.length > 0 && !session.disguisedEntry && !pirateHideout) {
    options.splice(2, 0, ...passengerOffers.map((quest) => option(
      `Speak with ${passengerName(quest)}`,
      { type: "open-passenger", quest }
    )));
  }
  if (!session.disguisedEntry && letterOfMarqueStatus(gameState, city, context.shipPower || 0).available) {
    options.push(option("Letter of marque", { type: "node", nodeId: "marque" }));
  }
  if (!session.disguisedEntry) {
    const tradePasses = personalTradePassStatuses(
      gameState,
      city,
      context.simMinute ?? 0
    );
    for (const status of tradePasses) {
      options.push(option(
        tradePasses.length === 1 ? "Trade pass" : `Trade pass: ${status.policy.permitLabel}`,
        {
          type: "open-trade-pass",
          policyId: status.policyId
        }
      ));
    }
  }
  if (
    !session.disguisedEntry &&
    isPortugueseEstadoPort(city, gameState.relations.foreignSettlementExpulsions)
  ) {
    const cartaz = portugueseCartazStatus(
      gameState,
      city,
      context.simMinute ?? 0,
      context.shipStats?.cargoCapacity ?? gameState.cargoCapacity
    );
    if (!cartaz.exempt) {
      options.push(option(cartaz.valid ? "Portuguese cartaz: valid" : "Portuguese cartaz", {
        type: "node",
        nodeId: "portuguese-cartaz"
      }));
    }
  }
  const attack = context.portAttackStatus || null;
  if (attack?.available) {
    options.push(portAttackOption(
      city,
      gameState,
      attack,
      { type: "node", nodeId: "city-attack" }
    ));
  }
  options.push(
    option("Cargo ledger", { type: "node", nodeId: "cargo" }),
    option(pirateHideout ? "Lie low in the cove" : "Wait safely in port", { type: "wait-in-port" }),
    option(pirateHideout ? "Put to sea" : "Leave port", { type: "close" })
  );
  const customsNotice = pendingCustomsNotice(session, city, gameState, tradeAccess);
  const statusText = pirateHideout
    ? `Powder, provisions, and silence are all for sale. Cove specie: ${market.specie} db.`
    : session.disguisedEntry
    ? `Keep your disguise intact. Market specie: ${market.specie} db.`
    : tradeAccess.restricted && !tradeAccess.allowed
    ? tradeAccess.policy
      ? `${tradeAccess.policy.closedMarketText} Water, provisions, and ordinary harbor services remain available.`
      : "Wartime orders close this market to enemy cargo."
    : illicitMarket
    ? `Keep your market business discreet. Market specie: ${market.specie} db.`
    : tradeAccess.personalTradePass
    ? `Your ${tradeAccess.policy.permitLabel} is in order. The customs officers admit your cargo. Market specie: ${market.specie} db.`
    : `What business brings you to port? Market specie: ${market.specie} db.`;
  return {
    speaker: speakerName(city),
    expressionId: feedbackExpressionId(session.feedback),
    text: customsNotice ? `${customsNotice} ${statusText}` : statusText,
    feedback: session.feedback,
    options
  };
}

function pendingCustomsNotice(session, city, gameState, tradeAccess) {
  if (
    city.isPirateHideout ||
    session.disguisedEntry ||
    tradeAccess.illicit ||
    !tradeAccess.allowed
  ) {
    session.customsNoticeKey = null;
    return null;
  }
  const notice = playerPortCustomsNotice(gameState, city);
  if (notice.acknowledged) {
    session.customsNoticeKey = null;
    return null;
  }
  session.customsNoticeKey = notice.key;
  const crownLevy = isPortugueseEstadoPort(
    city,
    gameState.relations.foreignSettlementExpulsions
  )
    ? " Pepper, cinnamon, cloves, and nutmeg remain subject to the Crown levy."
    : "";
  if (notice.foreignSettlementPrivilege) {
    const resident = factionById(notice.jurisdictionFactionId);
    const settlement = notice.foreignSettlement;
    if (notice.domestic) {
      return `The ${settlement.label.toLowerCase()} enters ${resident.adjective} cargo under its own privileges, without foreign customs.${crownLevy}`;
    }
    return `Through the ${settlement.label.toLowerCase()}, cargo under your flag receives the more favorable ${notice.displayedRate}% customs rate.${crownLevy}`;
  }
  if (notice.domestic) {
    return `Your own flag is entered here without foreign customs.${crownLevy}`;
  }
  if (notice.displayedRate === 0) {
    return `By special privilege, cargo under your flag is exempt from customs here.${crownLevy}`;
  }
  if (notice.relation === DIPLOMACY_ALLY) {
    return `By treaty privilege, cargo under your flag pays only ${notice.displayedRate}% customs here.${crownLevy}`;
  }
  if (notice.relation === DIPLOMACY_FRIENDLY) {
    return `Your nation's good standing earns a favored ${notice.displayedRate}% customs rate.${crownLevy}`;
  }
  if (notice.relation === DIPLOMACY_NEUTRAL) {
    return `Foreign cargo pays the customary ${notice.displayedRate}% duty at this quay.${crownLevy}`;
  }
  if (notice.relation === DIPLOMACY_HOSTILE) {
    return `Relations are sour. The customs house will take ${notice.displayedRate}% from your trade.${crownLevy}`;
  }
  throw new Error(`Customs notice cannot describe relation: ${notice.relation}`);
}

function playerPortTradeAccess(session, city, gameState, context) {
  return playerTradeAccess(gameState, city, {
    simMinute: context.simMinute ?? 0,
    illicitTradeAccessPolicyId: session.illicitTradeAccessPolicyId,
    disguisedEntry: session.disguisedEntry === true
  });
}

function tradeContext(session, context) {
  return {
    ...context,
    illicitTradeAccessPolicyId: session.illicitTradeAccessPolicyId,
    disguisedEntry: session.disguisedEntry === true
  };
}

function shouldOfferPortugueseCartazForMarket(
  session,
  city,
  gameState,
  economy,
  marketNodeId,
  context
) {
  if (session.disguisedEntry || session.portugueseCartazMarketOfferDeclined) return false;
  if (session.illicitTradeAccessPolicyId === PORTUGUESE_CROWN_SPICE_POLICY_ID) return false;
  if (!isPortugueseEstadoPort(city, gameState.relations.foreignSettlementExpulsions)) return false;
  const status = portugueseCartazStatus(
    gameState,
    city,
    context.simMinute ?? 0,
    context.shipStats?.cargoCapacity ?? gameState.cargoCapacity
  );
  return !status.exempt && !status.valid &&
    portugueseCartazMarketGoodIds(city, gameState, economy, marketNodeId).length > 0;
}

function portugueseCartazMarketGoodIds(city, gameState, economy, marketNodeId) {
  if (marketNodeId === "buy") {
    const market = new Map(portMarket(economy, city).map((row) => [row.good.id, row]));
    return PORTUGUESE_CROWN_SPICE_GOOD_IDS.filter((goodId) => (market.get(goodId)?.stock || 0) >= 1);
  }
  if (marketNodeId === "sell") {
    return PORTUGUESE_CROWN_SPICE_GOOD_IDS.filter((goodId) => (gameState.cargo[goodId] || 0) >= 1);
  }
  throw new Error(`Portuguese cartaz market requires buy or sell, received ${marketNodeId}`);
}

function requirePortugueseCartazMarketNode(session) {
  if (session.portugueseCartazMarketNodeId !== "buy" &&
      session.portugueseCartazMarketNodeId !== "sell") {
    throw new Error("Portuguese cartaz market offer has no market destination");
  }
  return session.portugueseCartazMarketNodeId;
}

function enterPortMarketNode(session, marketNodeId, gameState, economy, city, options = {}) {
  if (marketNodeId === "buy") {
    session.marketPurchases = {};
  } else if (marketNodeId === "sell") {
    session.marketSales = 0;
  } else {
    throw new Error(`Cannot enter unknown port market node: ${marketNodeId}`);
  }
  beginMarketUndoSession(session, marketNodeId, gameState, economy, city);
  session.nodeId = marketNodeId;
  session.selectedIndex = 0;
  if (options.preserveFeedback !== true) session.feedback = null;
}

function applyIllicitMarketAttempt(session, gameState, access, roll) {
  const policy = access?.policy;
  if (!policy || access.policyId !== policy.id || access.allowed) {
    throw new Error("Illicit market attempt requires a current closed-market policy");
  }
  if (session.illicitTradeAttemptedPolicyId === policy.id) {
    throw new Error(`${policy.label} illicit market may only be approached once per port visit`);
  }
  session.illicitTradeAttemptedPolicyId = policy.id;
  if (resolveRestrictedIllicitMarketAttempt(access, roll)) {
    session.illicitTradeAccessPolicyId = policy.id;
    session.feedback = "A discreet broker agrees to handle your cargo until you leave port.";
    return true;
  }
  adjustFactionReputation(
    gameState,
    policy.hostFactionId,
    -policy.illicitMarketReputationPenalty
  );
  const faction = factionById(policy.hostFactionId);
  session.feedback = `The broker reports you to the harbor watch. ${faction.adjective} standing fell.`;
  return false;
}

function portugueseCartazView(session, city, gameState, context) {
  const simMinute = context.simMinute ?? 0;
  const status = portugueseCartazStatus(
    gameState,
    city,
    simMinute,
    context.shipStats?.cargoCapacity ?? gameState.cargoCapacity
  );
  const remainingDays = status.valid
    ? Math.max(1, Math.ceil((status.untilMinute - simMinute) / 1440))
    : 0;
  const text = status.valid
    ? `Your Portuguese cartaz is valid for ${remainingDays} more day${remainingDays === 1 ? "" : "s"}. It prevents Estado da India inspections, but local customs still apply.`
    : status.fee === null
      ? portugueseCartazRefusalText()
      : `A ${status.fee} doubloon cartaz licenses this vessel for ${PORTUGUESE_CARTAZ_DURATION_DAYS} days under Estado da India patrols. Customs and spice levies still apply.`;
  return {
    speaker: speakerName(city),
    expressionId: status.valid ? "pleased" : "attentive",
    text,
    feedback: session.feedback,
    options: [
      ...(!status.valid && status.fee !== null
        ? [option(`Buy cartaz  ${status.fee} db`, { type: "purchase-portuguese-cartaz" }, {
          disabled: !status.canPurchase,
          disabledReason: "Not enough doubloons."
        })]
        : []),
      option("Back", { type: "node", nodeId: "root" })
    ]
  };
}

function portugueseCartazMarketOfferView(session, city, gameState, economy, context) {
  const marketNodeId = requirePortugueseCartazMarketNode(session);
  const goodIds = portugueseCartazMarketGoodIds(city, gameState, economy, marketNodeId);
  if (goodIds.length === 0) throw new Error("Portuguese cartaz offer has no controlled spices");
  const spiceLabels = goodIds.map((goodId) => tradeGoodById(goodId).label.toLowerCase()).join(", ");
  const status = portugueseCartazStatus(
    gameState,
    city,
    context.simMinute ?? 0,
    context.shipStats?.cargoCapacity ?? gameState.cargoCapacity
  );
  if (status.fee === null) {
    return {
      ...portugueseCartazMarketDeclinedView(session, city, gameState, economy),
      expressionId: "stern",
      text: portugueseCartazRefusalText()
    };
  }
  return {
    speaker: speakerName(city),
    expressionId: "attentive",
    text: `The Portuguese factor will not deal in Crown spices without a valid cartaz. That includes ${spiceLabels} here. I can issue your vessel papers for ${PORTUGUESE_CARTAZ_DURATION_DAYS} days.`,
    feedback: session.feedback,
    options: [
      ...(status.fee !== null
        ? [option(`Buy cartaz  ${status.fee} db`, { type: "purchase-portuguese-cartaz" }, {
          disabled: !status.canPurchase,
          disabledReason: "Not enough doubloons."
        })]
        : []),
      option("Not now", { type: "decline-portuguese-cartaz-market" })
    ]
  };
}

function portugueseCartazRefusalText() {
  return "The Estado da India will not issue a cartaz while relations remain hostile. Sailing its guarded routes without one risks inspection, fines, or seizure of controlled spices.";
}

function portugueseCartazMarketDeclinedView(session, city, gameState, economy) {
  const marketNodeId = requirePortugueseCartazMarketNode(session);
  const goodIds = portugueseCartazMarketGoodIds(city, gameState, economy, marketNodeId);
  if (goodIds.length === 0) throw new Error("Portuguese cartaz refusal has no controlled spices");
  return {
    speaker: speakerName(city),
    expressionId: feedbackExpressionId(session.feedback),
    text: "Then the Crown warehouse remains closed. You may trade ordinary goods openly, or seek a smuggler beyond the customs quay.",
    feedback: session.feedback,
    options: [
      ...(session.illicitTradeAttemptedPolicyId !== PORTUGUESE_CROWN_SPICE_POLICY_ID
        ? [option("Seek illicit market", { type: "attempt-portuguese-cartaz-illicit-market" })]
        : []),
      option("Browse ordinary goods", { type: "continue-portuguese-cartaz-market" }, {
        iconId: marketNodeId === "buy" ? "action:buy" : "action:sell"
      }),
      option("Back", { type: "node", nodeId: "root" })
    ]
  };
}

function vikingLongshipView(session, city, gameState, context) {
  const quest = vikingLongshipQuestState(gameState, city);
  if (!quest) throw new Error("Viking longship dialogue opened before its offer spawned");
  const speaker = `${characterName(city.character)}, historical enthusiast`;
  const back = session.vikingLongshipArrival
    ? option("Not now", { type: "node", nodeId: session.nextPortNodeId || "greeting" })
    : option("Back", { type: "node", nodeId: "root" });
  if (!quest.unlocked) {
    const stage = quest.stage;
    const requests = [
      `I am a historical enthusiast rebuilding a Norse longship from the sagas. Could you find ${stage.quantity} ${stage.goodLabel.toLowerCase()} for ${stage.purpose}?`,
      `The striped sail is ready, and I am grateful for your help. If your voyages allow, could you bring me ${stage.quantity} ${stage.goodLabel.toLowerCase()} for ${stage.purpose}?`,
      `The oar bank is fitted, thanks to you. May I ask one last favor? I still need ${stage.quantity} ${stage.goodLabel.toLowerCase()} for ${stage.purpose}.`
    ];
    return {
      speaker,
      expressionId: quest.canDeliver ? "pleased" : "attentive",
      text: `${requests[quest.stageIndex]}${quest.delivered > 0
        ? ` You have already delivered ${quest.delivered} of ${stage.quantity}.`
        : ""}`,
      feedback: session.feedback,
      options: [
        option(deliveryOptionLabel(stage.goodLabel, quest.deliverable), {
          type: "deliver-viking-material",
          stageId: stage.id
        }, {
          disabled: !quest.canDeliver,
          disabledReason: `Still need ${quest.remaining} ${stage.goodLabel.toLowerCase()}; ` +
            `hold has ${quest.held}.`
        }),
        back
      ]
    };
  }

  const stats = shipStatsForSlug(VIKING_LONGSHIP_SLUG);
  const currentShipSlug = context.shipStats?.slug;
  if (!currentShipSlug) {
    throw new Error("Viking longship reward requires the current ship type");
  }
  const alreadyOwned = currentShipSlug === VIKING_LONGSHIP_SLUG;
  const cargoDoesNotFit = cargoUsed(gameState) > stats.cargoCapacity;
  const shipLabel = shipLabelForSlug(VIKING_LONGSHIP_SLUG);
  if (quest.rewardDisposition === VIKING_LONGSHIP_REWARD_PENDING) {
    const currentShipLabel = shipLabelForSlug(currentShipSlug);
    const disabledReason = alreadyOwned
      ? "You already command a Viking Longship."
      : cargoDoesNotFit
        ? `Your current cargo will not fit its ${stats.cargoCapacity}-unit hold.`
        : null;
    return {
      speaker,
      expressionId: "happy",
      text: `The longship is yours if you take me aboard; I am done studying voyages from shore. Accepting replaces your ${currentShipLabel}, which will remain here.`,
      feedback: session.feedback,
      presentation: {
        kind: "shipyard",
        listing: {
          id: "quest-viking-longship-reward",
          shipSlug: VIKING_LONGSHIP_SLUG,
          shipLabel,
          price: 0
        },
        currentShipSlug,
        purchaseTerms: shipReplacementTermsWithoutTradeIn(0)
      },
      options: [
        option(`Accept ${shipLabel}`, {
          type: "accept-viking-longship-reward",
          shipSlug: VIKING_LONGSHIP_SLUG
        }, {
          disabled: Boolean(disabledReason),
          disabledReason
        }),
        option("Keep current ship", { type: "decline-viking-longship-reward" })
      ]
    };
  }
  if ([VIKING_LONGSHIP_REWARD_ACCEPTED, VIKING_LONGSHIP_REWARD_PURCHASED]
    .includes(quest.rewardDisposition)) {
    return {
      speaker,
      expressionId: "pleased",
      text: quest.rewardDisposition === VIKING_LONGSHIP_REWARD_ACCEPTED
        ? "Our reconstructed longship is ready. I have stowed my sea chest and joined your crew; let us see whether the old craft still knows the ocean."
        : "The reconstructed longship has already left this yard in your service. There will never be another quite like her.",
      feedback: session.feedback,
      options: [back]
    };
  }
  if (quest.rewardDisposition !== VIKING_LONGSHIP_REWARD_DECLINED) {
    throw new Error(`Unknown Viking longship reward disposition: ${quest.rewardDisposition}`);
  }
  const cannotAfford = gameState.doubloons < VIKING_LONGSHIP_PRICE;
  const disabledReason = alreadyOwned
    ? "You already command the reconstructed longship."
    : cargoDoesNotFit
      ? `Your current cargo will not fit its ${stats.cargoCapacity}-unit hold.`
      : cannotAfford
        ? `You need ${VIKING_LONGSHIP_PRICE - gameState.doubloons} more doubloons.`
        : null;
  return {
    speaker,
    expressionId: alreadyOwned ? "pleased" : "happy",
    text: `The reconstruction is complete: bright sail, working oars, shield rail, and a bow crew in place of cannon. I can part with her for ${VIKING_LONGSHIP_PRICE} doubloons.`,
    feedback: session.feedback,
    presentation: {
      kind: "shipyard",
      listing: {
        id: "quest-viking-longship",
        shipSlug: VIKING_LONGSHIP_SLUG,
        shipLabel,
        price: VIKING_LONGSHIP_PRICE
      },
      currentShipSlug,
      purchaseTerms: shipReplacementTermsWithoutTradeIn(VIKING_LONGSHIP_PRICE)
    },
    options: [
      option(`Buy ${shipLabel}  ${VIKING_LONGSHIP_PRICE} db`, {
        type: "purchase-viking-longship",
        shipSlug: VIKING_LONGSHIP_SLUG
      }, {
        disabled: Boolean(disabledReason),
        disabledReason
      }),
      back
    ]
  };
}

function chefQuestView(session, city, gameState) {
  const quest = chefQuestState(gameState, city);
  if (!quest) throw new Error("Chef dialogue opened outside its origin port");
  const speaker = `${characterName(city.character)}, cook`;
  const back = session.chefQuestArrival
    ? option(
        quest.stage === CHEF_QUEST_STAGE_RECRUITED ? "Continue" : "Not now",
        { type: "node", nodeId: session.nextPortNodeId || "greeting" }
      )
    : option("Back", { type: "node", nodeId: "root" });
  if (quest.stage === CHEF_QUEST_STAGE_GATHERING) {
    const list = quest.ingredients.map((ingredient) => ingredient.label).join(", ");
    const missing = quest.ingredients
      .filter((ingredient) => !ingredient.ready)
      .map((ingredient) => ingredient.label)
      .join(", ");
    return {
      speaker,
      expressionId: quest.canDeliver ? "pleased" : "attentive",
      text: `I have been entrusted with ${quest.event.eventLabel}, and ordinary fare will not do. ` +
        `I need one each of ${list}. Bring them as you find them and I can make a table worthy ` +
        `of the occasion.${quest.ingredients.some((ingredient) => ingredient.ready)
          ? ` Already delivered: ${quest.ingredients
              .filter((ingredient) => ingredient.ready)
              .map((ingredient) => ingredient.label)
              .join(", ")}.`
          : ""}`,
      feedback: session.feedback,
      options: [
        option("Deliver available ingredients", { type: "deliver-chef-ingredients" }, {
          disabled: !quest.canDeliver,
          disabledReason: missing ? `Still need: ${missing}.` : "The ingredients are not ready."
        }),
        back
      ]
    };
  }
  if (quest.stage === CHEF_QUEST_STAGE_RECRUITMENT) {
    const hasBerth = canAddNamedCrewMember(gameState);
    return {
      speaker,
      expressionId: "happy",
      text: `${quest.event.successText} Now I want to see beyond this shore. Give me a berth, and I will make your provisions last.`,
      feedback: session.feedback,
      options: [
        option("Welcome aboard", { type: "recruit-chef" }, {
          disabled: !hasBerth,
          disabledReason: "This ship has no berth for another permanent crewmate."
        }),
        back
      ]
    };
  }
  if (quest.stage !== CHEF_QUEST_STAGE_RECRUITED) {
    throw new Error(`Unknown chef quest stage: ${quest.stage}`);
  }
  return {
    speaker,
    expressionId: "pleased",
    text: "The galley is provisioned, the knives are sharp, and I am ready to sail whenever you are.",
    feedback: session.feedback,
    options: [back]
  };
}

function japaneseMatchlockView(session, city, gameState) {
  const quest = japaneseMatchlockQuestState(gameState, city);
  if (!quest) throw new Error("Japanese matchlock dialogue opened before its offer spawned");
  const speaker = `${characterName(city.character)}, gunsmith`;
  const back = session.japaneseMatchlockArrival
    ? option(quest.completed ? "Continue" : "Not now", {
        type: "node",
        nodeId: session.nextPortNodeId || "greeting"
      })
    : option("Back", { type: "node", nodeId: "root" });
  if (quest.completed) {
    return {
      speaker,
      expressionId: "pleased",
      text: "The proof barrels held. We no longer depend on every gun crossing the sea through Nagasaki; Kyoto's smiths can make matchlocks of our own now.",
      feedback: session.feedback,
      options: [back]
    };
  }

  const stage = quest.fetchStage;
  const requests = [
    "Imported matchlocks brought through Nagasaki teach little behind glass. Bring me two; I will study every lock, screw, and spring.",
    "The lock is simpler than its makers pretend. The barrel is the true test. Bring me good iron, and our forges will answer it.",
    "The first barrels have survived proof. Now we need seasoned timber for stocks and straight ramrods before a soldier can shoulder them.",
    "The first workshop batch is ready for proof. Bring gunpowder, and we shall learn whether Kyoto can make a matchlock worthy of battle."
  ];
  return {
    speaker,
    expressionId: quest.canDeliver ? "pleased" : "attentive",
    text: `${requests[quest.fetchStageIndex]}${quest.delivered > 0
      ? ` You have already delivered ${quest.delivered} of ${stage.quantity}.`
      : ""}`,
    feedback: session.feedback,
    options: [
      option(deliveryOptionLabel(stage.goodLabel, quest.deliverable), {
        type: "deliver-japanese-matchlock-material",
        stageId: stage.id,
        goodId: stage.goodId
      }, {
        disabled: !quest.canDeliver,
        disabledReason: `Still need ${quest.remaining} ${stage.goodLabel.toLowerCase()}; ` +
          `hold has ${quest.held}.`
      }),
      back
    ]
  };
}

function caribbeanGingerView(session, city, gameState) {
  const quest = caribbeanGingerQuestState(gameState, city);
  if (!quest) throw new Error("Caribbean ginger dialogue opened before its offer spawned");
  const speaker = `${characterName(city.character)}, planter`;
  const back = session.caribbeanGingerArrival
    ? option(quest.completed ? "Continue" : "Not now", {
        type: "node",
        nodeId: session.nextPortNodeId || "greeting"
      })
    : option("Back", { type: "node", nodeId: "root" });
  if (quest.completed) {
    return {
      speaker,
      expressionId: "pleased",
      text: `The ginger has taken beautifully. ${cityLabel(city)} now grows a valuable spice once carried halfway around the world.`,
      feedback: session.feedback,
      options: [back]
    };
  }

  const stage = quest.fetchStage;
  return {
    speaker,
    expressionId: quest.canDeliver ? "pleased" : "attentive",
    text: "This soil is warm, damp, and rich: perfect for ginger. Bring me six sound roots " +
      `from Southeast Asia, and I will pay well for the voyage.${quest.delivered > 0
        ? ` Delivered: ${quest.delivered}/${stage.quantity}.`
        : ""}`,
    feedback: session.feedback,
    options: [
      option(deliveryOptionLabel(stage.goodLabel, quest.deliverable), {
        type: "deliver-caribbean-ginger",
        stageId: stage.id,
        goodId: stage.goodId
      }, {
        disabled: !quest.canDeliver,
        disabledReason: `Still need ${quest.remaining} ${stage.goodLabel.toLowerCase()}; ` +
          `hold has ${quest.held}.`
      }),
      back
    ]
  };
}

function colonizationView(session, city, gameState, context) {
  const quest = colonizationQuestView(gameState, {
    currentMinute: context.simMinute ?? 0,
    shipStats: context.shipStats,
    freeCargoUnits: context.shipStats ? cargoFree(gameState) : null
  });
  const atOrigin = isColonizationQuestOrigin(gameState.memory.colonization, city);
  const atTarget = isColonizationQuestTarget(gameState.memory.colonization, city);
  const atApproval = isColonizationQuestApproval(gameState.memory.colonization, city);
  if (!atOrigin && !atTarget && !atApproval) {
    throw new Error(`Colonization dialogue opened outside ${quest.origin.city} or ${quest.target.city}`);
  }
  const history = quest.history;
  if (!history) throw new Error(`Colonization dialogue has no history for ${quest.target.city}`);
  const targetName = quest.target.city;
  const developsExistingPort = quest.target.preexistingSettlement === true;
  const organizer = characterName(city.character);
  const back = atOrigin
    ? session.colonizationArrival
      ? option(
          quest.stage === COLONIZATION_STAGE_OUTBOUND ? "Continue" : "Not now",
          { type: "node", nodeId: session.nextPortNodeId || "greeting" }
        )
      : option("Back", { type: "node", nodeId: "root" })
    : atApproval
      ? option("Continue", { type: "node", nodeId: session.nextPortNodeId || "greeting" })
      : option("Put to sea", { type: "close" });

  if (atApproval && quest.stage === COLONIZATION_STAGE_OUTBOUND && !quest.approvalGranted) {
    if (!history.approval) throw new Error(`${targetName} has no approval dialogue`);
    const cargoSummary = colonizationApprovalCargoSummary(quest.approvalCargo);
    const missingCargo = colonizationMissingApprovalCargo(quest.approvalCargo);
    if (session.colonizationApprovalStep === 0) {
      return {
        speaker: `${organizer}, ${history.sponsorRole}`,
        expressionId: quest.approvalCargoReady ? "attentive" : "concerned",
        text: `${history.approval.openingText} We have brought ${cargoSummary} for inspection alongside the proposed harbor rules, taxes, and protections for local authority.`,
        feedback: session.feedback,
        options: [
          option("Address the Japanese envoys", { type: "advance-colony-negotiation" }),
          back
        ]
      };
    }
    if (session.colonizationApprovalStep !== 1) {
      throw new Error(`Invalid pending colonization approval step: ${session.colonizationApprovalStep}`);
    }
    return {
      speaker: `${organizer}, ${history.approval.speakerRole}`,
      expressionId: quest.approvalCargoReady ? "attentive" : "concerned",
      text: history.approval.responseText,
      feedback: session.feedback,
      options: [
        option(history.approval.actionLabel, { type: "grant-colony-permission" }, {
          disabled: !quest.approvalCargoDeliverable,
          disabledReason: missingCargo ? `Still need ${missingCargo}.` : null
        }),
        back
      ]
    };
  }
  if (atApproval && quest.approvalGranted && session.colonizationApprovalStep === 2) {
    if (!history.approval) throw new Error(`${targetName} has no approval dialogue`);
    return {
      speaker: `${organizer}, ${history.sponsorRole}`,
      expressionId: "happy",
      text: history.approval.closingText,
      feedback: session.feedback,
      options: [
        option("Continue", { type: "finish-colony-negotiation" })
      ]
    };
  }

  if (quest.stage === COLONIZATION_STAGE_FETCH) {
    if (!atOrigin) throw new Error(`${targetName} site exists before its expedition departed`);
    const stage = quest.fetchStage;
    const exileIntroduction = colonizationOriginCanHostExiledSponsor(city, quest.target)
      ? `${factionNounPhrase(quest.target.originFactionId, { sentenceStart: true })} has lost its last port, but loyal servants have not abandoned the flag. This expedition can keep our cause alive overseas until fortune turns.`
      : null;
    const introduction = session.colonizationArrival && quest.fetchStageIndex === 0
      ? [
          "Captain, a word before you see the factor.",
          exileIntroduction,
          history.pitch,
          history.organizerReligionId && gameState.playerCharacter?.religionId
            ? protestantColonistReception({
                organizerReligionId: history.organizerReligionId,
                captainReligionId: gameState.playerCharacter.religionId
              })
            : null,
          stage.lead
        ].filter(Boolean).join(" ")
      : stage.lead;
    return {
      speaker: `${organizer}, ${history.sponsorRole}`,
      expressionId: quest.canDeliverFetch ? "pleased" : "attentive",
      text: `${introduction} ${stage.quantity} ${stage.goodLabel.toLowerCase()} for ` +
        `${stage.purpose}. I will pay ${stage.reward} doubloons when the order is complete.` +
        `${quest.fetchDelivered > 0
          ? ` You have already delivered ${quest.fetchDelivered} of ${stage.quantity}.`
          : ""}`,
      feedback: session.feedback,
      options: [
        ...(session.colonizationArrival ? [back] : []),
        option(deliveryOptionLabel(stage.goodLabel, quest.fetchDeliverable), {
          type: "deliver-colonization-material",
          stageId: stage.id
        }, {
          disabled: !quest.canDeliverFetch,
          disabledReason: `Still need ${quest.fetchRemaining} ${stage.goodLabel.toLowerCase()}; ` +
            `hold has ${quest.held}.`
        }),
        ...(!session.colonizationArrival ? [back] : [])
      ]
    };
  }

  if (quest.stage === COLONIZATION_STAGE_READY) {
    if (!atOrigin) throw new Error(`The prepared colonists are not in ${quest.origin.city}`);
    const eligibility = quest.shipEligibility;
    const missingApprovalCargo = colonizationMissingApprovalCargo(quest.approvalCargo);
    const disabledReason = missingApprovalCargo
      ? `Need ${missingApprovalCargo} for the negotiations.`
      : eligibility?.eligible
        ? null
        : `Need ${eligibility?.missing.join(", ") || "a suitable ocean-going ship"}.`;
    const route = quest.approval
      ? ` Our route first calls at ${quest.approval.city} for government permission, then continues to ${targetName}.`
      : "";
    const negotiationCargo = quest.approvalCargo.length > 0
      ? ` The emissaries must also carry ${colonizationApprovalCargoSummary(quest.approvalCargo)} from ${quest.origin.country} as a trade demonstration.`
      : "";
    const travelers = developsExistingPort ? "The delegation" : "The settlers";
    return {
      speaker: `${organizer}, ${history.sponsorRole}`,
      expressionId: eligibility?.eligible && quest.approvalCargoReady ? "happy" : "concerned",
      text: `${history.ready} ${travelers} need 24 hold spaces.${negotiationCargo} ${targetName} lies ${Math.round(quest.target.distanceKm || 0).toLocaleString("en-US")} km away.${route} They need a capacious, seaworthy ship.`,
      feedback: session.feedback,
      options: [
        option(developsExistingPort ? "Take the delegation aboard" : "Take the colonists aboard", {
          type: "embark-colonists"
        }, {
          disabled: Boolean(disabledReason),
          disabledReason
        }),
        back
      ]
    };
  }

  if (quest.stage === COLONIZATION_STAGE_OUTBOUND) {
    if (atOrigin) {
      const route = quest.approval && !quest.approvalGranted
        ? `${quest.approval.city} first for permission, then ${targetName}`
        : targetName;
      return {
        speaker: `${organizer}, ${history.sponsorRole}`,
        expressionId: "attentive",
        text: `${history.departed} Let us make for ${route}.`,
        feedback: session.feedback,
        options: [back]
      };
    }
    if (quest.approval && !quest.approvalGranted) {
      return {
        speaker: `${organizer}, ${history.sponsorRole}`,
        expressionId: "concerned",
        text: `${targetName} cannot be ${developsExistingPort ? "opened to trade" : "founded"} without permission from the government in ${quest.approval.city}. We must take the emissaries there first.`,
        feedback: session.feedback,
        options: [back]
      };
    }
    return {
      speaker: `${organizer}, ${history.sponsorRole}`,
      expressionId: "happy",
      text: history.landing,
      feedback: session.feedback,
      options: [
        option(history.landingAction, { type: "land-colonists" }),
        back
      ]
    };
  }

  if (quest.stage === COLONIZATION_STAGE_AWAITING_RESUPPLY) {
    if (atOrigin) {
      return {
        speaker: `${organizer}, ${history.sponsorRole}`,
        expressionId: "attentive",
        text: history.resupply.originReminder,
        feedback: session.feedback,
        options: [back]
      };
    }
    const canDeliver = quest.resupply.deliverable > 0 &&
      !quest.deadlineExpired;
    const deadlineText = quest.leftSinceFounding
      ? history.resupply.returned
      : `${history.resupply.waiting} The colony needs ${quest.resupply.quantity} ${quest.resupply.goodLabel.toLowerCase()} before one year has passed.`;
    return {
      speaker: `${organizer}, ${history.settlementLeaderRole}`,
      expressionId: canDeliver ? "happy" : "concerned",
      text: `${deadlineText} A timely resupply earns ${quest.resupply.reward} doubloons and ` +
        `gives ${targetName} the stores it needs to become a permanent city.` +
        `${quest.resupply.delivered > 0
          ? ` You have already delivered ${quest.resupply.delivered} of ` +
            `${quest.resupply.quantity}.`
          : ""}`,
      feedback: session.feedback,
      options: [
        option(deliveryOptionLabel(quest.resupply.goodLabel, quest.resupply.deliverable), {
          type: "deliver-colony-resupply"
        }, {
          disabled: !canDeliver,
          disabledReason: `Still need ${quest.resupply.remaining} ` +
            `${quest.resupply.goodLabel.toLowerCase()}; hold has ${quest.resupplyHeld}.`
        }),
        back
      ]
    };
  }

  if (quest.stage === COLONIZATION_STAGE_FAILED) {
    return {
      speaker: gameState.playerCharacter?.name || "Captain",
      expressionId: "sad",
      text: `The palisade is broken and every roof is burning. We call until our voices fail, but nothing answers. Nothing alive remains in ${targetName}.`,
      feedback: session.feedback,
      options: [back]
    };
  }

  if (quest.stage === COLONIZATION_STAGE_DEFEND) {
    const remaining = quest.defenseRemaining;
    const remainingText = `${remaining} attacking canoe${remaining === 1 ? " remains" : "s remain"}.`;
    return {
      speaker: `${organizer}, ${atTarget ? history.settlementLeaderRole : history.sponsorRole}`,
      expressionId: "concerned",
      text: atTarget
        ? `${quest.defense.alert} ${remainingText}`
        : `${targetName} is under attack by the ${quest.defense.attackerName}. ${remainingText}`,
      feedback: session.feedback,
      options: [back]
    };
  }

  if (quest.stage === COLONIZATION_STAGE_REPORT_DEFENSE) {
    return {
      speaker: `${organizer}, ${atTarget ? history.settlementLeaderRole : history.sponsorRole}`,
      expressionId: atTarget ? "happy" : "attentive",
      text: atTarget
        ? quest.defense.report
        : `The attacking ${quest.defense.objectiveName} canoes have been defeated. Return to ${targetName} to report the victory and collect the defense reward.`,
      feedback: session.feedback,
      options: atTarget
        ? [option(`Claim defense reward - ${quest.defense.reward} db`, { type: "report-colony-defense" }), back]
        : [back]
    };
  }

  if (quest.stage === COLONIZATION_STAGE_ESTABLISHED) {
    const discountPercent = founderPurchaseDiscountPercent();
    return {
      speaker: `${organizer}, ${history.settlementLeaderRole}`,
      expressionId: "happy",
      text: `${history.established} Your name is known in every warehouse here, and our factors will always give you ${discountPercent}% off goods you buy.`,
      feedback: session.feedback,
      options: [back]
    };
  }

  throw new Error(`Unknown colonization quest stage: ${quest.stage}`);
}

function conquistadorView(session, city, gameState, portCities, context) {
  const memory = gameState.memory.quests.conquistador;
  const currentMinute = context.simMinute ?? 0;
  const eligibility = capturePortMissionEligibility(gameState);
  const quest = conquistadorQuestView(memory, portCities, currentMinute, {
    cargo: gameState.cargo,
    eligibility
  });
  const atOrigin = isConquistadorQuestOrigin(memory, city);
  const atTarget = isConquistadorQuestTarget(memory, city);
  const atReplenishmentPort = isConquistadorCompanyReplenishmentPort(memory, city, portCities);
  const replenishmentPolicy = conquistadorCompanyReplenishmentPolicy(memory, portCities);
  if (!atOrigin && !atTarget && !atReplenishmentPort && !session.conquistadorCompanyReplenished) {
    throw new Error("Conquistador dialogue opened outside an expedition port");
  }
  const speaker = `${characterName(city.character)}, adelantado`;
  const back = session.conquistadorArrival
    ? option("Continue", { type: "node", nodeId: session.nextPortNodeId || "greeting" })
    : option("Back", { type: "node", nodeId: "root" });

  if (session.conquistadorCompanyReplenished) {
    return {
      speaker,
      expressionId: "determined",
      text: "The ranks are full again. The men know where Chan Chan is strong now, which is worth more than another dozen boasts. Take us south.",
      feedback: session.feedback,
      options: [back]
    };
  }

  if (atReplenishmentPort) {
    return {
      speaker,
      expressionId: "stern",
      text: replenishmentPolicy.spanishPortsRemain
        ? "The walls bloodied us, but the royal commission still carries weight. Give me this harbor until dawn. I will replace the fallen, and the next assault will begin with what the first one taught us."
        : "Spain has lost her ports, not every Spaniard his appetite for Peru. Panama remembers our compact. Give me until dawn to replace the fallen; we will carry the Crown in our own chests.",
      feedback: session.feedback,
      options: [
        option("Re-form the expedition", { type: "replenish-conquistador-company" }),
        back
      ]
    };
  }

  if (quest.stage === CONQUISTADOR_STAGE_DORMANT) {
    if (!atOrigin || !quest.available) throw new Error("Unavailable conquistador offer was opened");
    return {
      speaker,
      expressionId: "attentive",
      text: "Gold has come north from Peru. I mean to follow it south. The Crown licenses me to conquer at my own cost. Provision my company and break Chan Chan's batteries. God and His Majesty may judge the rest.",
      feedback: session.feedback,
      options: [
        option("Accept the commission", { type: "accept-conquistador-expedition" }),
        back
      ]
    };
  }

  if (quest.stage === CONQUISTADOR_STAGE_FETCH) {
    if (!atOrigin) throw new Error("Conquistador supplies are not being gathered in Panama City");
    const stage = quest.fetchStage;
    const requirementId = conquistadorFetchRequirementId(stage);
    const progress = questCargoDeliveryProgress(gameState, requirementId, stage.quantity);
    const deliverable = questCargoDeliverableQuantity(
      gameState,
      requirementId,
      stage.quantity,
      quest.held
    );
    return {
      speaker,
      expressionId: deliverable > 0 ? "pleased" : "attentive",
      text: `God and the King may bless an expedition, Captain, but neither fills its holds. Bring ${stage.quantity} ${stage.goodLabel.toLowerCase()} for ${stage.purpose}. I will pay ${stage.reward} doubloons when the order is complete, weighed before my notary.` +
        (progress.deliveredQuantity > 0
          ? ` You have delivered ${progress.deliveredQuantity} of ${stage.quantity}.`
          : ""),
      feedback: session.feedback,
      options: [
        option(deliveryOptionLabel(stage.goodLabel, deliverable), {
          type: "deliver-conquistador-material",
          stageId: stage.id,
          goodId: stage.goodId
        }, {
          disabled: deliverable <= 0,
          disabledReason: `Still need ${progress.remainingQuantity} ${stage.goodLabel.toLowerCase()}; ` +
            `hold has ${quest.held}.`
        }),
        back
      ]
    };
  }

  if (quest.stage === CONQUISTADOR_STAGE_READY) {
    if (!atOrigin) throw new Error("Prepared conquistador company is not in Panama City");
    const missing = [
      !eligibility.cannonArmed ? `${eligibility.minimumCannons} cannons` : null,
      !eligibility.largeWarship ? `room for ${eligibility.minimumCrew} crew` : null,
      !eligibility.enoughCrew ? `${eligibility.minimumCrew} crew aboard` : null
    ].filter(Boolean);
    return {
      speaker,
      expressionId: eligibility.eligible ? "happy" : "concerned",
      text: "The notary copied our commission, the chaplain blessed the standard, and every man counted his share twice. Chan Chan is the door. Silence its batteries, land my company, and raise Spain's flag." +
        (missing.length > 0 ? ` Your ship still needs ${missing.join(", ")}.` : " We can sail on your word."),
      feedback: session.feedback,
      options: [
        option("Embark the conquistadors", { type: "begin-conquistador-expedition" }, {
          disabled: !eligibility.eligible,
          disabledReason: missing.length > 0 ? `Need ${missing.join(", ")}.` : null
        }),
        back
      ]
    };
  }

  if (quest.stage === CONQUISTADOR_STAGE_CAPTURE) {
    if (!atOrigin) throw new Error("Conquistador capture briefing opened outside Panama City");
    return {
      speaker,
      expressionId: "determined",
      text: "The royal seal is in my chest, the cross at our head, and the company aboard. Take me to Chan Chan. Offer them Spain's peace once; if they refuse it, let the guns speak next.",
      feedback: session.feedback,
      options: [back]
    };
  }

  if (quest.stage === CONQUISTADOR_STAGE_CAMPAIGN) {
    if (!atTarget) throw new Error("Conquistador campaign report opened outside Trujillo");
    return {
      speaker,
      expressionId: "determined",
      text: `Trujillo holds, and a conquered coast is worth ten promises made in Panama. I march for Cuzco at dawn. Return in ${quest.daysUntilReward} day${quest.daysUntilReward === 1 ? "" : "s"}; God willing, your share will be weighed here.`,
      feedback: session.feedback,
      options: [back]
    };
  }

  if (quest.stage === CONQUISTADOR_STAGE_REWARD_READY) {
    if (!atTarget) throw new Error("Conquistador reward opened outside Trujillo");
    return {
      speaker,
      expressionId: "happy",
      text: "A year ago they called this empire untouchable. Now Cuzco answers to the Crown, and even the royal accountants have surrendered. You kept faith with me, Captain. Here is the share I promised.",
      feedback: session.feedback,
      options: [
        option(`Claim ${quest.reward.toLocaleString("en-US")} db`, {
          type: "claim-conquistador-reward",
          reward: quest.reward
        }),
        back
      ]
    };
  }

  if (quest.stage === CONQUISTADOR_STAGE_COMPLETE) {
    return {
      speaker,
      expressionId: "happy",
      text: "Your gold is weighed and witnessed, Captain. Spend it loudly enough that Panama remembers who opened Peru.",
      feedback: session.feedback,
      options: [back]
    };
  }

  throw new Error(`Unknown conquistador quest stage: ${quest.stage}`);
}

function equipmentView(session, city, gameState, economy) {
  const nets = equipmentStockAtPort(economy, city, EQUIPMENT_STOCK_FISHING_NET, FISHING_NETS);
  const cannonEquipment = equipmentStockAtPort(economy, city, EQUIPMENT_STOCK_CANNON, CANNON_EQUIPMENT);
  const harpoons = equipmentStockAtPort(economy, city, EQUIPMENT_STOCK_WHALE_HARPOON, WHALE_HARPOONS);
  const currentNet = playerFishingNet(gameState);
  const currentCannonEquipment = playerCannonEquipment(gameState);
  const currentHarpoon = playerWhaleHarpoon(gameState);
  const netUpgradeAvailable = nets.some((net) => net.tier > currentNet.tier);
  const cannonUpgradeAvailable = cannonEquipment.some((equipment) => (
    equipment.tier > currentCannonEquipment.tier
  ));
  const harpoonUpgradeAvailable = harpoons.some((harpoon) => (
    harpoon.tier > (currentHarpoon?.tier || 0)
  ));
  const cannonArmed = Boolean(gameState.ship && gameState.ship.cannonCapacity > 0);
  return {
    speaker: speakerName(city),
    expressionId: feedbackExpressionId(session.feedback),
    text: `Local outfitters carry ship gear, weapons, and working equipment. Stock changes with a port's fortunes, while specialist workshops keep every grade on hand.`,
    feedback: session.feedback,
    options: [
      option("Fishing nets", { type: "node", nodeId: "equipment-nets" }, {
        detail: equipmentStockLabel(nets, FISHING_NETS, equipmentSpecialistAtPort(
          city,
          EQUIPMENT_STOCK_FISHING_NET
        )),
        disabled: !netUpgradeAvailable,
        disabledReason: netUpgradeAvailable
          ? null
          : nets.length === 0
            ? "This port has no fishing nets in stock."
            : `Your ${currentNet.label} is superior.`
      }),
      option("Whale harpoons", { type: "node", nodeId: "equipment-harpoons" }, {
        detail: equipmentStockLabel(harpoons, WHALE_HARPOONS, equipmentSpecialistAtPort(
          city,
          EQUIPMENT_STOCK_WHALE_HARPOON
        )),
        disabled: !harpoonUpgradeAvailable,
        disabledReason: harpoonUpgradeAvailable
          ? null
          : harpoons.length === 0
            ? "This port has no whaling gear in stock."
            : `Your ${currentHarpoon.label} is superior.`
      }),
      option("Cannon battery", { type: "node", nodeId: "equipment-cannons" }, {
        detail: equipmentStockLabel(cannonEquipment, CANNON_EQUIPMENT, equipmentSpecialistAtPort(
          city,
          EQUIPMENT_STOCK_CANNON
        )),
        disabled: !cannonArmed || !cannonUpgradeAvailable,
        disabledReason: !cannonArmed
          ? "Your ship has no cannon battery to refit."
          : cannonUpgradeAvailable
            ? null
            : cannonEquipment.length === 0
              ? "This port has no cannon equipment in stock."
              : `Your ${currentCannonEquipment.label} is superior.`
      }),
      option("Back", { type: "node", nodeId: "root" })
    ]
  };
}

function equipmentFactorOfferView(session, city, gameState) {
  const pitch = validateEquipmentFactorPitch(session.equipmentFactorPitch);
  const cannotAfford = gameState.doubloons < pitch.price;
  return {
    speaker: speakerName(city),
    expressionId: "happy",
    text: pitch.reconsidered
      ? `Captain, before you go: have you reconsidered the ${pitch.label}? ` +
        `${pitch.salesPitch} My price remains ${pitch.price} doubloons.`
      : `Captain, before you go: the outfitters have ${pitch.label} ready. ` +
        `${pitch.salesPitch} I can have it fitted now for ${pitch.price} doubloons.`,
    feedback: null,
    options: [
      option(`Buy ${pitch.label}  ${pitch.price} db`, {
        type: "buy-equipment-factor-pitch",
        kind: pitch.kind,
        itemId: pitch.itemId
      }, {
        detail: pitch.effectDetail,
        disabled: cannotAfford,
        disabledReason: `Need ${pitch.price - gameState.doubloons} more doubloons.`
      }),
      option("No, thank you", { type: "decline-equipment-factor-pitch" })
    ]
  };
}

function equipmentFactorFollowupView(session, city) {
  const pitch = validateEquipmentFactorPitch(session.equipmentFactorPitch);
  if (!["purchased", "declined"].includes(session.equipmentFactorPitchOutcome)) {
    throw new Error("Equipment factor follow-up requires a purchase decision");
  }
  const pluralItem = usesPluralAgreement(
    equipmentFactorPitchItem(pitch).grammaticalNumber,
    `equipment factor item ${pitch.itemId}`
  );
  return {
    speaker: speakerName(city),
    expressionId: session.equipmentFactorPitchOutcome === "purchased" ? "pleased" : "neutral",
    text: session.equipmentFactorPitchOutcome === "purchased"
      ? pluralItem
        ? `A sound choice. The ${pitch.label} are aboard and ready for work.`
        : `A sound choice. The ${pitch.label} is aboard and ready for work.`
      : `Very well. The ${pitch.label} will remain available in the equipment store if you change your mind.`,
    feedback: null,
    options: [
      option("Continue", { type: "node", nodeId: session.nextPortNodeId || "greeting" })
    ]
  };
}

function letterOfMarqueFactorOfferView(session, city, gameState, context) {
  const offer = validateLetterOfMarqueFactorOffer(session.letterOfMarqueFactorOffer);
  const status = letterOfMarqueStatus(gameState, city, context.shipPower || 0);
  if (!status.available || !status.eligible || status.factionId !== offer.factionId) {
    throw new Error(`Proactive letter of marque is no longer available from ${offer.factionId}`);
  }
  const ruler = rulerAtMinute(offer.factionId, context.simMinute ?? 0);
  if (!ruler) throw new Error(`Letter of marque faction has no ruler: ${offer.factionId}`);
  return {
    speaker: speakerName(city),
    expressionId: "attentive",
    text: `${ruler.displayName}'s court is raising privateers for the war against ${factionNounPhrase(offer.primaryEnemyFactionId)}. Accept this letter of marque, and you may lawfully prize the ships and cargo of every power at war with ${factionNounPhrase(offer.factionId)}: ${letterOfMarqueEnemyList(offer)}.`,
    feedback: null,
    options: [
      option("Accept the letter of marque", { type: "accept-marque-factor-offer" }),
      option("Not now", { type: "decline-marque-factor-offer" })
    ]
  };
}

function letterOfMarqueFactorFollowupView(session, city, gameState, context) {
  const offer = validateLetterOfMarqueFactorOffer(session.letterOfMarqueFactorOffer);
  if (!["accepted", "declined"].includes(session.letterOfMarqueFactorOfferOutcome)) {
    throw new Error("Letter of marque factor follow-up requires a decision");
  }
  const ruler = rulerAtMinute(offer.factionId, context.simMinute ?? 0);
  if (!ruler) throw new Error(`Letter of marque faction has no ruler: ${offer.factionId}`);
  return {
    speaker: speakerName(city),
    expressionId: session.letterOfMarqueFactorOfferOutcome === "accepted" ? "pleased" : "neutral",
    text: session.letterOfMarqueFactorOfferOutcome === "accepted"
      ? `By ${ruler.displayName}'s authority, your commission now covers every enemy of ${factionNounPhrase(offer.factionId)}: ${letterOfMarqueEnemyList(offer)}. Keep it with your papers.`
      : `Very well. The commission remains available while ${factionNounPhrase(offer.factionId)} is at war. Ask me if you reconsider.`,
    feedback: null,
    options: [
      option("Continue", { type: "node", nodeId: session.nextPortNodeId || "greeting" })
    ]
  };
}

function validateLetterOfMarqueFactorOffer(offer) {
  if (!offer || typeof offer !== "object" || Array.isArray(offer)) {
    throw new Error("Letter of marque factor offer must be an object");
  }
  factionById(offer.factionId);
  factionById(offer.primaryEnemyFactionId);
  if (!Array.isArray(offer.enemyFactionIds) || offer.enemyFactionIds.length === 0) {
    throw new Error("Letter of marque factor offer requires war enemies");
  }
  const enemyFactionIds = new Set();
  for (const factionId of offer.enemyFactionIds) {
    factionById(factionId);
    if (factionId === offer.factionId || enemyFactionIds.has(factionId)) {
      throw new Error(`Invalid letter of marque enemy: ${factionId}`);
    }
    enemyFactionIds.add(factionId);
  }
  if (!enemyFactionIds.has(offer.primaryEnemyFactionId)) {
    throw new Error("Letter of marque principal conflict is not an active war");
  }
  return offer;
}

function letterOfMarqueEnemyList(offer) {
  const labels = validateLetterOfMarqueFactorOffer(offer).enemyFactionIds
    .map((factionId) => factionNounPhrase(factionId));
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
}

function equipmentStockLabel(stock, catalog, specialist) {
  if (!Array.isArray(stock) || !Array.isArray(catalog) || catalog.length === 0) {
    throw new Error("Equipment stock label requires stock and catalog choices");
  }
  const saleableLevels = saleableEquipmentCatalog(catalog).length;
  return `STOCK ${stock.length}/${saleableLevels} LEVELS${specialist ? "  SPECIALIST" : ""}`;
}

function specialEquipmentOfferView(session, city, gameState) {
  const activeOffer = session.specialEquipmentOffer;
  if (!activeOffer) throw new Error("Special equipment dialogue has no active offer");
  const item = perkItemSummary(activeOffer.itemId);
  const cannotAfford = gameState.doubloons < item.price;
  return {
    speaker: speakerName(city),
    expressionId: "happy",
    text: activeOffer.reconsidered
      ? `Have you reconsidered buying the ${item.label}? ${item.detail} My price remains ${item.price} doubloons.`
      : `Captain, I came into possession of ${item.label}. ${item.detail} I could part with it for ${item.price} doubloons.`,
    feedback: null,
    options: [
      option(`Buy it - ${item.price} db`, {
        type: "buy-perk-item",
        itemId: item.id
      }, {
        detail: item.effectLabels.join(" / "),
        disabled: cannotAfford,
        disabledReason: `Need ${item.price - gameState.doubloons} more doubloons.`
      }),
      option("No, thank you", { type: "decline-special-equipment" })
    ]
  };
}

function fishingNetView(session, city, gameState, economy) {
  const current = playerFishingNet(gameState);
  const stock = equipmentStockAtPort(economy, city, EQUIPMENT_STOCK_FISHING_NET, FISHING_NETS);
  const offered = stock.filter((net) => net.tier > current.tier);
  const rows = offered.map((net) => {
    const cannotAfford = gameState.doubloons < net.price;
    const disabledReason = cannotAfford
      ? `Need ${net.price - gameState.doubloons} more doubloons.`
      : null;
    return option(`${net.label}  ${net.price} db`, {
      type: "buy-net",
      netId: net.id
    }, {
      detail: `ODDS x${net.catchRateMultiplier.toFixed(2)}  MAX HAUL ${net.maxCatch}`,
      disabled: cannotAfford,
      disabledReason
    });
  });
  rows.push(option("Back", { type: "node", nodeId: "equipment" }));
  return {
    speaker: speakerName(city),
    expressionId: feedbackExpressionId(session.feedback),
    text: `Current gear: ${current.label}. Other nets offered: ${offered.length}. Purse ${gameState.doubloons} db.`,
    feedback: session.feedback,
    optionHeight: 34,
    options: rows
  };
}

function cannonEquipmentView(session, city, gameState, economy) {
  if (!gameState.ship || gameState.ship.cannonCapacity <= 0) {
    throw new Error("Cannon equipment opened for a ship without cannon capacity");
  }
  const current = playerCannonEquipment(gameState);
  const stock = equipmentStockAtPort(economy, city, EQUIPMENT_STOCK_CANNON, CANNON_EQUIPMENT);
  const rows = stock.filter((equipment) => equipment.tier > current.tier).map((equipment) => {
    const cannotAfford = gameState.doubloons < equipment.price;
    const disabledReason = cannotAfford
      ? `Need ${equipment.price - gameState.doubloons} more doubloons.`
      : null;
    return option(`${equipment.label}  ${equipment.price} db`, {
      type: "buy-cannon-equipment",
      equipmentId: equipment.id
    }, {
      detail: `RELOAD ${equipment.reloadSeconds.toFixed(2)}S  DAMAGE x${equipment.damageMultiplier.toFixed(2)}  RANGE x${equipment.rangeMultiplier.toFixed(2)}`,
      disabled: cannotAfford,
      disabledReason
    });
  });
  rows.push(option("Back", { type: "node", nodeId: "equipment" }));
  return {
    speaker: speakerName(city),
    expressionId: feedbackExpressionId(session.feedback),
    text: `Current battery: ${current.label}. Faster locks and longer culverins improve reload, damage, and range. Purse ${gameState.doubloons} db.`,
    feedback: session.feedback,
    optionHeight: 34,
    options: rows
  };
}

function whaleHarpoonView(session, city, gameState, economy) {
  const current = playerWhaleHarpoon(gameState);
  const stock = equipmentStockAtPort(economy, city, EQUIPMENT_STOCK_WHALE_HARPOON, WHALE_HARPOONS);
  const rows = stock.filter((harpoon) => harpoon.tier > (current?.tier || 0)).map((harpoon) => {
    const cannotAfford = gameState.doubloons < harpoon.price;
    const disabledReason = cannotAfford
      ? `Need ${harpoon.price - gameState.doubloons} more doubloons.`
      : null;
    return option(`${harpoon.label}  ${harpoon.price} db`, {
      type: "buy-whale-harpoon",
      harpoonId: harpoon.id
    }, {
      detail: `ACCURACY ${Math.round(harpoon.accuracy * 100)}%  LINE BREAK ${Math.round(harpoon.breakChance * 100)}%  RANGE ${harpoon.rangePx}`,
      disabled: cannotAfford,
      disabledReason
    });
  });
  rows.push(option("Back", { type: "node", nodeId: "equipment" }));
  return {
    speaker: speakerName(city),
    expressionId: feedbackExpressionId(session.feedback),
    text: `Current harpoon: ${current?.label || "none"}. A stronger line and truer shaft improve the odds of holding a surfaced whale. Purse ${gameState.doubloons} db.`,
    feedback: session.feedback,
    optionHeight: 34,
    options: rows
  };
}

function shipyardView(session, city, gameState, economy, context) {
  const yard = context.shipyard || null;
  if (yard && playerBackedShipyardAtPort(gameState, city)) {
    return playerShipyardLedgerView(session, city, gameState, economy, context, yard);
  }
  const listings = yard ? shipyardListings(yard) : [];
  const investmentOptions = shipyardInvestmentOptions(city, gameState, yard, context.simMinute ?? 0);
  if (listings.length === 0) {
    const nearestListing = context.nearestShipyardListing || null;
    if (nearestListing && (typeof nearestListing.portId !== "string" || nearestListing.portId === "")) {
      throw new Error(`Nearest shipyard listing requires a canonical city id: ${nearestListing.portId}`);
    }
    if (nearestListing && !Number.isInteger(nearestListing.tileId)) {
      throw new Error(`Nearest shipyard listing requires a port tile id: ${nearestListing.tileId}`);
    }
    if (nearestListing && (typeof nearestListing.shipProseLabel !== "string" ||
        nearestListing.shipProseLabel === "")) {
      throw new Error("Nearest shipyard listing requires a prose-form ship label");
    }
    return {
      speaker: speakerName(city),
      expressionId: "neutral",
      text: nearestListing
        ? `I heard a rumour of a new ${nearestListing.shipProseLabel} for sale at ${nearestListing.portName}.`
        : city.isPirateHideout
          ? "The hidden slips can patch any hull, but there is no captured vessel for sale today. No shipyard currently has a vessel for sale."
          : yard?.famous
            ? "The master shipwrights have vessels on the stocks, but none ready for sale. No shipyard currently has a vessel for sale."
            : "The slipways handle repairs and local work, but there is no newly built vessel for sale today. No shipyard currently has a vessel for sale.",
      feedback: session.feedback,
      options: [
        ...(nearestListing ? [option(`Set a heading for ${nearestListing.portName}`, {
          type: "set-port-heading",
          destinationCityId: nearestListing.portId,
          destinationTileId: nearestListing.tileId,
          destinationName: nearestListing.portName,
          reason: PORT_NAVIGATION_REASON_NEW_SHIP,
          nextNodeId: "root"
        })] : []),
        ...investmentOptions,
        option("Back", { type: "node", nodeId: "root" })
      ]
    };
  }
  if (listings.length === 1) {
    return shipyardListingView(session, city, gameState, context, listings[0], "root");
  }
  return {
    speaker: city.isPirateHideout ? `${cityLabel(city)} hidden yard` : `${cityLabel(city)} shipyard`,
    expressionId: "attentive",
    text: `${listings.length} vessels are ready for inspection.`,
    feedback: session.feedback,
    options: [
      ...listings.map((listing) => option(
        `${listing.source === "trade-in" ? "Pre-owned" : "New"} ${listing.shipLabel}  ${listing.price} db`,
        {
          type: "inspect-shipyard-listing",
          listingId: listing.id,
          shipSlug: listing.shipSlug
        }
      )),
      ...investmentOptions,
      option("Back", { type: "node", nodeId: "root" })
    ]
  };
}

function shipyardPurchaseView(session, city, gameState, context) {
  const listing = requireShipyardPurchaseListing(session, context);
  if (!playerBackedShipyardAtPort(gameState, city)) {
    throw new Error("Owned shipyard vessel inspection requires a player-backed yard");
  }
  return shipyardListingView(session, city, gameState, context, listing, "shipyard");
}

function shipyardListingView(session, city, gameState, context, listing, backNodeId) {
  const purchase = shipyardPurchaseOffer(listing, gameState, context);
  const condition = listing.source === "trade-in" ? "A pre-owned" : "A newly built";
  return {
    speaker: city.isPirateHideout ? `${cityLabel(city)} hidden yard` : `${cityLabel(city)} shipyard`,
    expressionId: "attentive",
    text: `${condition} ${listing.shipLabel} is offered for ${listing.price} doubloons. Your ${purchase.currentShipLabel} is worth ${purchase.purchaseTerms.tradeInValue} in trade.`,
    feedback: session.feedback,
    presentation: {
      kind: "shipyard",
      listing,
      currentShipSlug: purchase.currentShipSlug,
      purchaseTerms: purchase.purchaseTerms
    },
    options: [
      option(purchase.purchaseLabel, {
        type: "confirm-ship-purchase",
        listingId: listing.id,
        shipSlug: listing.shipSlug
      }, {
        disabled: Boolean(purchase.disabledReason),
        disabledReason: purchase.disabledReason
      }),
      ...(backNodeId === "root"
        ? shipyardInvestmentOptions(city, gameState, context.shipyard, context.simMinute ?? 0)
        : []),
      option("Back", { type: "node", nodeId: backNodeId })
    ]
  };
}

function shipyardPurchaseConfirmationView(session, city, gameState, context) {
  const listing = requireShipyardPurchaseListing(session, context);
  const purchase = shipyardPurchaseOffer(listing, gameState, context);
  if (purchase.disabledReason) {
    throw new Error(`Unavailable ship reached purchase confirmation: ${purchase.disabledReason}`);
  }
  const tradeQuestion = purchase.purchaseTerms.netPrice >= 0
    ? `Trade your ${purchase.currentShipLabel} and pay ${purchase.purchaseTerms.netPrice} doubloons for the ${listing.shipLabel}`
    : `Trade your ${purchase.currentShipLabel} for the ${listing.shipLabel} and receive ${-purchase.purchaseTerms.netPrice} doubloons`;
  return {
    speaker: city.isPirateHideout ? `${cityLabel(city)} hidden yard` : `${cityLabel(city)} shipyard`,
    expressionId: "attentive",
    text: `${tradeQuestion}? This cannot be undone.`,
    feedback: session.feedback,
    feedbackTone: "danger",
    options: [
      option("Confirm exchange", {
        type: "purchase-ship",
        listingId: listing.id,
        shipSlug: listing.shipSlug
      }),
      option(`Keep ${purchase.currentShipLabel}`, { type: "cancel-ship-purchase" })
    ]
  };
}

function requireShipyardPurchaseListing(session, context) {
  const listing = context.shipyard
    ? shipyardListingById(context.shipyard, session.shipyardPurchaseListingId)
    : null;
  if (!listing || listing.id !== session.shipyardPurchaseListingId) {
    throw new Error(`Shipyard purchase listing is no longer available: ${session.shipyardPurchaseListingId}`);
  }
  return listing;
}

function requireShipyardListingAction(action, context) {
  const listing = context.shipyard
    ? shipyardListingById(context.shipyard, action.listingId)
    : null;
  if (!listing || listing.id !== action.listingId || listing.shipSlug !== action.shipSlug) {
    throw new Error(`Shipyard action does not match the current listing: ${action.listingId}`);
  }
  return listing;
}

function playerShipyardArrivalView(session, city, gameState, economy, context) {
  const yard = context.shipyard;
  if (!yard || !playerBackedShipyardAtPort(gameState, city)) {
    throw new Error(`Shipyard arrival dialogue requires the player's yard at ${cityLabel(city)}`);
  }
  const ledger = playerShipyardLedger(yard, context.simMinute ?? 0);
  const reservedQuantities = activeQuestCargoReservedQuantities(gameState, {
    currentMinute: context.simMinute ?? 0
  });
  const materialSales = session.shipyardMaterialArrival
    ? ledger.currentBuild.materials
      .map((material) => shipyardMaterialSaleOffer(
        city,
        gameState,
        economy,
        context,
        material,
        reservedQuantities
      ))
      .filter(Boolean)
    : [];
  const payout = session.shipyardDividendArrival;
  if (!payout && !session.shipyardMaterialArrival) {
    throw new Error(`Shipyard arrival dialogue at ${cityLabel(city)} has no business for the captain`);
  }
  const payoutText = payout
    ? `${payout.salesSummary} Your share of ${payout.amount} doubloons is already in your purse.`
    : null;
  const materialLabels = materialSales.map((sale) => sale.goodLabel.toLowerCase());
  const materialList = materialLabels.length === 1
    ? materialLabels[0]
    : materialLabels.length > 1
      ? `${materialLabels.slice(0, -1).join(", ")} and ${materialLabels.at(-1)}`
      : null;
  const materialText = materialList
    ? `The yard is short of ${materialList}. I can buy the unpledged cargo in your hold at the port price.`
    : session.shipyardMaterialArrival
      ? "That cargo has gone straight into the yard stores."
      : null;
  return {
    speaker: `${cityLabel(city)} master shipwright`,
    expressionId: payout ? "pleased" : "attentive",
    text: [payoutText, materialText].filter(Boolean).join(" "),
    feedback: session.feedback,
    options: [
      ...(materialSales.length > 0
        ? [option("Keep the cargo aboard", {
            type: "node",
            nodeId: "shipyard-arrival-review"
          })]
        : []),
      ...materialSales.map((sale) => option(
        `Sell ${sale.goodLabel} x${sale.quantity}  ${sale.price} db`,
        {
          type: "sell-shipyard-material",
          goodId: sale.goodId,
          quantity: sale.quantity
        }
      )),
      ...(materialSales.length === 0
        ? [option("Continue", { type: "node", nodeId: "shipyard-arrival-review" })]
        : [])
    ]
  };
}

function playerShipyardArrivalReviewView(city, gameState, context) {
  if (!context.shipyard || !playerBackedShipyardAtPort(gameState, city)) {
    throw new Error(`Shipyard review offer requires the player's yard at ${cityLabel(city)}`);
  }
  return {
    speaker: `${cityLabel(city)} master shipwright`,
    expressionId: "attentive",
    text: "The building slips, stores and books are ready if you wish to inspect the yard.",
    feedback: null,
    options: [
      option("Inspect the shipyard", { type: "node", nodeId: "shipyard" }),
      option("Not now", { type: "node", nodeId: "root" }, { placement: "port-exit" })
    ]
  };
}

function playerShipyardLedgerView(session, city, gameState, economy, context, yard) {
  const tab = session.shipyardLedgerTab;
  if (!["yard", "materials", "books"].includes(tab)) {
    throw new Error(`Unknown shipyard ledger tab: ${tab}`);
  }
  const ledger = playerShipyardLedger(yard, context.simMinute ?? 0);
  const newestEntries = [...ledger.accounts.entries].reverse();
  const ledgerJournal = Object.freeze({
    scrollOffset: Math.min(
      session.shipyardLedgerScrollOffset,
      Math.max(0, newestEntries.length - 1)
    ),
    total: newestEntries.length,
    entries: Object.freeze(newestEntries)
  });
  const listings = shipyardListings(yard);
  const listing = listings[0] || null;
  const purchase = listing ? shipyardPurchaseOffer(listing, gameState, context) : null;
  const materialSources = tab === "materials"
    ? session.shipyardMaterialSourceHints || (session.shipyardMaterialSourceHints =
        shipyardMaterialSourceHints({
          originCity: city,
          gameState,
          economy,
          portCities: context.portCities,
          simMinute: context.simMinute ?? 0,
          sailingDistanceKm: context.sailingDistanceKm,
          materials: ledger.currentBuild.materials
        }))
    : Object.freeze([]);
  const payout = session.shipyardDividendArrival;
  const payoutText = payout
    ? `${payout.salesSummary} Your share of ${payout.amount} doubloons has been paid into your purse.`
    : shipyardLedgerText(session, ledger, materialSources);
  const reservedQuantities = tab === "materials"
    ? activeQuestCargoReservedQuantities(gameState, {
        currentMinute: context.simMinute ?? 0
      })
    : Object.freeze({});
  const materialSales = tab === "materials"
    ? ledger.currentBuild.materials
      .map((material) => shipyardMaterialSaleOffer(
        city,
        gameState,
        economy,
        context,
        material,
        reservedQuantities
      ))
      .filter(Boolean)
    : [];
  const returnNodeId = session.shipyardLedgerReturnNodeId === "greeting"
    ? "root"
    : session.shipyardLedgerReturnNodeId || "root";
  const materialByGoodId = new Map(
    ledger.currentBuild.materials.map((material) => [material.goodId, material])
  );
  const materialSaleByGoodId = new Map(materialSales.map((sale) => [sale.goodId, sale]));
  const materialSourceByGoodId = new Map(materialSources
    .filter((source) => (materialByGoodId.get(source.goodId)?.stockpileMissing || 0) > 0)
    .map((source) => [source.goodId, source]));
  const materialActionOptions = tab === "materials"
    ? ledger.currentBuild.materials.flatMap((material) => {
        const rowId = shipyardMaterialRowId(material.goodId);
        const sale = materialSaleByGoodId.get(material.goodId);
        const source = materialSourceByGoodId.get(material.goodId);
        const waypointSet = source && gameState.memory.navigation.optionalWaypoints.some((waypoint) => (
          waypoint.reason === PORT_NAVIGATION_REASON_SHIPYARD_SUPPLY &&
          waypoint.shipyardMaterialGoodId === source.goodId &&
          waypoint.destinationCityId === source.destinationCityId
        ));
        return [
          ...(sale ? [option(
            `Sell ${sale.goodLabel} x${sale.quantity}  ${sale.price} db`,
            {
              type: "sell-shipyard-material",
              goodId: sale.goodId,
              quantity: sale.quantity
            },
            { rowId }
          )] : []),
          ...(source ? [option(
            waypointSet
              ? source.destinationName
              : source.accessible
                ? `Set heading: ${source.destinationName} (${source.goodLabel})`
                : `Set heading: ${source.destinationName} (${source.goodLabel}; harbor barred)`,
            {
              type: "set-port-heading",
              destinationCityId: source.destinationCityId,
              destinationTileId: source.destinationTileId,
              destinationName: source.destinationName,
              reason: PORT_NAVIGATION_REASON_SHIPYARD_SUPPLY,
              shipyardMaterialGoodId: source.goodId,
              nextNodeId: "shipyard"
            },
            {
              rowId,
              disabled: waypointSet,
              iconId: waypointSet ? "action:loadout" : undefined
            }
          )] : [])
        ];
      })
    : [];
  return {
    speaker: `${cityLabel(city)} master shipwright`,
    expressionId: payout ? "pleased" : "attentive",
    text: payoutText,
    feedback: session.feedback,
    optionColumns: 3,
    presentation: {
      kind: "player-shipyard-ledger",
      tab,
      ledger,
      ledgerJournal,
      listing,
      currentShipSlug: purchase?.currentShipSlug || context.shipStats?.slug || null,
      purchaseTerms: purchase?.purchaseTerms || null,
      payout: payout ? { ...payout } : null,
      materialSources
    },
    options: [
      option("Ships", { type: "shipyard-ledger-tab", tab: "yard" }, {
        rowId: "shipyard-ledger-tabs",
        iconId: "action:shipyard"
      }),
      option("Stores", { type: "shipyard-ledger-tab", tab: "materials" }, {
        rowId: "shipyard-ledger-tabs",
        iconId: "good:timber"
      }),
      option("Accounts", { type: "shipyard-ledger-tab", tab: "books" }, {
        rowId: "shipyard-ledger-tabs",
        iconId: "action:letter"
      }),
      ...materialActionOptions,
      ...(tab === "yard" ? listings.map((readyListing) => option(
        `Inspect ${readyListing.source === "trade-in" ? "pre-owned " : ""}${readyListing.shipLabel}`,
        {
          type: "inspect-shipyard-listing",
          listingId: readyListing.id,
          shipSlug: readyListing.shipSlug
        }
      )) : []),
      option(payout ? "Continue" : "Back", { type: "node", nodeId: returnNodeId }, {
        placement: "port-exit"
      })
    ]
  };
}

function shipyardMaterialRowId(goodId) {
  return "shipyard-material-" + goodId;
}

function shipyardLedgerText(session, ledger, materialSources) {
  const missing = ledger.currentBuild.materials.filter((material) => material.missing > 0);
  const reserveShortages = ledger.currentBuild.materials.filter(
    (material) => material.stockpileMissing > 0
  );
  if (reserveShortages.length === 0) {
    return "The shipyard's accounts, building schedule, and stores are open for your inspection.";
  }
  const namedShortages = missing.length > 0 ? missing : reserveShortages;
  const labels = namedShortages.map(({ goodId }) => tradeGoodById(goodId).label.toLowerCase());
  const shortage = labels.length === 1
    ? labels[0]
    : `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;
  const prefix = session.shipyardMaterialArrival
    ? "I am glad you came. "
    : "";
  const nearest = materialSources[0];
  const hint = nearest
    ? nearest.accessible
      ? ` The nearest known ${nearest.goodLabel.toLowerCase()} supply is at ${nearest.destinationName}.`
      : ` The nearest known ${nearest.goodLabel.toLowerCase()} supply is at ${nearest.destinationName}, though its harbor is barred to us.`
    : "";
  const status = missing.length > 0
    ? `The yard is short of ${shortage}.`
    : `The current hull is supplied, but our long-range stores are low on ${shortage}.`;
  return `${prefix}${status} Our buyers work through the port market, and I will buy any cargo not pledged elsewhere at the same price.${hint}`;
}

function shipyardMaterialSaleOffer(
  city,
  gameState,
  economy,
  context,
  material,
  reservedQuantities
) {
  const yard = context.shipyard;
  if (!yard?.playerBacking) return null;
  if (!material || material.stockpileMissing <= 0) return null;
  const goodId = material.goodId;
  const held = Math.floor(gameState.cargo[goodId] || 0);
  const reserved = reservedQuantities[goodId] || 0;
  const uncommitted = Math.max(0, held - reserved);
  if (uncommitted <= 0) return null;
  const requested = Math.min(uncommitted, Math.ceil(material.stockpileMissing));
  const quantity = maximumRepeatedPortPurchaseQuantity(
    economy,
    city,
    goodId,
    requested
  );
  if (quantity <= 0) return null;
  return Object.freeze({
    goodId,
    goodLabel: tradeGoodById(goodId).label,
    quantity,
    price: quoteRepeatedPortPurchase(economy, city, goodId, quantity)
  });
}

function shipyardMaterialSourceHints({
  originCity,
  gameState,
  economy,
  portCities,
  simMinute,
  sailingDistanceKm,
  materials
}) {
  if (!Array.isArray(portCities) || typeof sailingDistanceKm !== "function") return Object.freeze([]);
  const needed = materials.filter((material) => material.stockpileMissing > 0);
  const bestByGoodId = new Map();
  for (const destination of portCities) {
    if (destination.cityId === originCity.cityId) continue;
    const accessible = destinationAcceptsPlayerTrade(destination, gameState, simMinute);
    const available = needed
      .map((material) => ({
        material,
        supply: portGoodSupply(economy, destination, material.goodId)
      }))
      .filter(({ supply }) => supply.listedForSale && supply.stock >= 1);
    if (available.length === 0) continue;
    const distanceKm = sailingDistanceKm(originCity, destination);
    if (distanceKm === null) continue;
    if (!Number.isInteger(distanceKm) || distanceKm < 0) {
      throw new Error(`Shipyard supply sailing distance is invalid: ${distanceKm}`);
    }
    for (const { material, supply } of available) {
      const candidate = { destination, distanceKm, accessible, ...supply };
      const current = bestByGoodId.get(material.goodId);
      if (!current || shipyardSupplySourceComesFirst(candidate, current)) {
        bestByGoodId.set(material.goodId, candidate);
      }
    }
  }
  return Object.freeze(needed.flatMap((material) => {
    const source = bestByGoodId.get(material.goodId);
    return source ? [Object.freeze({
      goodId: material.goodId,
      goodLabel: tradeGoodById(material.goodId).label,
      destinationCityId: source.destination.cityId,
      destinationTileId: source.destination.tileId,
      destinationName: cityLabel(source.destination),
      distanceKm: source.distanceKm,
      accessible: source.accessible
    })] : [];
  }));
}

function shipyardSupplySourceComesFirst(candidate, current) {
  return Number(candidate.accessible) > Number(current.accessible) ||
    (candidate.accessible === current.accessible && (
      candidate.distanceKm < current.distanceKm ||
      (candidate.distanceKm === current.distanceKm && (
      Number(candidate.productionPerDay > 0) > Number(current.productionPerDay > 0) ||
      (Number(candidate.productionPerDay > 0) === Number(current.productionPerDay > 0) && (
        candidate.stock > current.stock ||
        (candidate.stock === current.stock && candidate.destination.tileId < current.destination.tileId)
      ))
    ))));
}

function shipyardPurchaseOffer(listing, gameState, context) {
  const stats = shipStatsForSlug(listing.shipSlug);
  const currentShipSlug = context.shipStats?.slug;
  if (!currentShipSlug) throw new Error("Shipyard purchase requires the current ship type");
  const purchaseTerms = shipyardPurchaseTerms(listing.price, currentShipSlug);
  const vikingTradeIn = vikingLongshipTradeInPlan(gameState);
  const replacementContext = {
    departingNamedCrewIds: vikingTradeIn?.departingNamedCrewIds || []
  };
  const committedCrew = futurePermanentCrewFloor(gameState, replacementContext);
  const permanentCrewDoesNotFit = committedCrew > stats.crewCapacity;
  const transferredCargoUsed = permanentCrewDoesNotFit
    ? null
    : playerShipReplacementCargoUsed(gameState, stats, replacementContext);
  const cargoDoesNotFit = transferredCargoUsed !== null && transferredCargoUsed > stats.cargoCapacity;
  const alreadyOwned = currentShipSlug === listing.shipSlug;
  const cannotAfford = gameState.doubloons < purchaseTerms.netPrice;
  const disabledReason = alreadyOwned
    ? "You already command this type of vessel."
    : permanentCrewDoesNotFit
      ? `Your permanent crew require ${committedCrew} berths; this vessel has only ${stats.crewCapacity}.`
    : cargoDoesNotFit
      ? `Your transferred cargo uses ${cargoSpaceLabel(transferredCargoUsed)} units and will not fit its ` +
        `${stats.cargoCapacity}-unit hold.`
      : cannotAfford
        ? `You need ${purchaseTerms.netPrice - gameState.doubloons} more doubloons.`
        : null;
  return Object.freeze({
    currentShipSlug,
    currentShipLabel: shipLabelForSlug(currentShipSlug),
    purchaseTerms,
    purchaseLabel: purchaseTerms.netPrice >= 0
      ? `Buy ${listing.shipLabel}  ${purchaseTerms.netPrice} db`
      : `Trade for ${listing.shipLabel}  +${-purchaseTerms.netPrice} db`,
    disabledReason
  });
}

function shipyardInvestmentOptions(city, gameState, yard, simMinute) {
  if (!yard) return [];
  const project = shipyardInvestmentAtPort(gameState, city);
  if (project) {
    return [option("Fund the new shipyard", { type: "node", nodeId: "shipyard-investment" })];
  }
  return shipyardInvestmentOfferAvailable(gameState, city, yard, simMinute)
    ? [option("Back a great shipyard", { type: "node", nodeId: "shipyard-investment-offer" })]
    : [];
}

function shipyardInvestmentOfferView(session, city, gameState, context) {
  const yard = context.shipyard;
  if (!shipyardInvestmentOfferAvailable(gameState, city, yard, context.simMinute ?? 0)) {
    throw new Error(`Shipyard investment offer is unavailable at ${cityLabel(city)}`);
  }
  return {
    speaker: `${cityLabel(city)} master shipwright`,
    expressionId: "pleased",
    text: `A deepwater yard needs ${SHIPYARD_INVESTMENT_CAPITAL} doubloons, timber, iron, and naval stores. Back it, and your share of every vessel sold will be entered in the yard's books.`,
    feedback: null,
    options: [
      option("Meet the shipyard syndicate", { type: "begin-shipyard-investment" }),
      option("Not now", {
        type: "node",
        nodeId: session.shipyardInvestmentArrival ? session.nextPortNodeId || "greeting" : "root"
      })
    ]
  };
}

function shipyardInvestmentView(session, city, gameState, context) {
  const yard = context.shipyard;
  const project = shipyardInvestmentAtPort(gameState, city);
  if (!yard) throw new Error("Shipyard investment dialogue requires the local yard");
  if (!project) throw new Error("Shipyard investment dialogue requires the local project");

  const back = option(session.shipyardInvestmentArrival ? "Keep the cargo aboard" : "Back", {
    type: "node",
    nodeId: session.shipyardInvestmentArrival ? session.nextPortNodeId || "greeting" : "shipyard"
  });
  const rows = session.shipyardInvestmentArrival ? [back] : [];
  if (!project.capitalPaid) {
    rows.push(option(`Invest ${SHIPYARD_INVESTMENT_CAPITAL} doubloons`, {
      type: "pay-shipyard-investment"
    }, {
      disabled: gameState.doubloons < SHIPYARD_INVESTMENT_CAPITAL,
      disabledReason: gameState.doubloons < SHIPYARD_INVESTMENT_CAPITAL
        ? `Need ${SHIPYARD_INVESTMENT_CAPITAL - gameState.doubloons} more doubloons.`
        : null
    }));
  }
  for (const { goodId, required, delivered, remaining } of shipyardInvestmentMaterialProgress(project)) {
    if (remaining <= 0) continue;
    const held = Math.floor(gameState.cargo[goodId] || 0);
    const label = tradeGoodById(goodId).label;
    rows.push(option(`Deliver ${label}  ${delivered}/${required}`, {
      type: "deliver-shipyard-material",
      goodId
    }, {
      disabled: held <= 0,
      disabledReason: held <= 0 ? `No ${label} aboard.` : null,
      detail: held > 0 ? `${Math.min(held, remaining)} can be delivered now` : null
    }));
  }
  if (shipyardInvestmentComplete(project)) {
    rows.push(option("Open the shipyard", { type: "open-player-shipyard" }));
  }
  if (!session.shipyardInvestmentArrival) rows.push(back);
  return {
    speaker: `${cityLabel(city)} master shipwright`,
    expressionId: "attentive",
    text: `A deepwater yard needs ${SHIPYARD_INVESTMENT_CAPITAL} doubloons, timber, iron, and naval stores. Back it, and your share of every vessel sold will be entered in the yard's books.`,
    feedback: session.feedback,
    options: rows
  };
}

function shipHandoverView(session, city) {
  const handover = session.shipHandover;
  if (!handover) throw new Error("Ship handover dialogue has no vessel");
  return {
    speaker: `${characterName(city.character)}, ${handover.sellerTitle}`,
    expressionId: "pleased",
    text: `${handover.transactionText} ${shipHandoverHistoryForSlug(handover.shipSlug)}`,
    feedback: null,
    options: [option("Continue", { type: "node", nodeId: handover.returnNodeId })]
  };
}

function buyView(session, city, gameState, economy, context) {
  const hold = cargoHoldStatus(gameState);
  const requiredQuestCargo = activeQuestCargoReservedQuantities(gameState, {
    currentMinute: context.simMinute ?? 0
  });
  const market = new Map(portMarket(economy, city).map((row) => [row.good.id, row]));
  const tradeRows = marketBuyGoodIds(session, market).map((goodId) => {
    const row = market.get(goodId);
    if (!row) throw new Error(`${cityLabel(city)} market has no quote for ${goodId}`);
    return row;
  });
  const rows = tradeRows
    .flatMap((row) => {
      const totalSize = row.good.unitSize;
      const terms = playerTradeTerms(gameState, city, row.good.id, tradeContext(session, context));
      const displayedPrice = quotePortSale(economy, city, row.good.id, 1, terms.purchaseMultiplier);
      const comparison = worldMarketPriceComparison(economy, city, row.good.id, "buy");
      const freeSpace = cargoFreeForGood(gameState, row.good.id);
      const cartazBlocked = !terms.allowed &&
        terms.crownSpiceAccess?.reason === "portuguese-crown-spice-monopoly";
      const outOfStock = row.stock < 1;
      const cannotAfford = gameState.doubloons < displayedPrice;
      const cannotFit = freeSpace < totalSize;
      const requestedQuantity = Math.max(1, Math.min(
        Math.floor(row.stock),
        Math.floor(freeSpace / totalSize)
      ));
      const maximumQuantity = outOfStock || cannotFit
        ? 0
        : maximumPortSaleQuantity(
            economy,
            city,
            row.good.id,
            requestedQuantity,
            gameState.doubloons,
            terms.purchaseMultiplier
          );
      const maximumPrice = maximumQuantity > 0
        ? quotePortSale(economy, city, row.good.id, maximumQuantity, terms.purchaseMultiplier)
        : 0;
      const disabledReason = cartazBlocked
        ? "A valid Portuguese cartaz is required for Crown spices."
        : outOfStock
        ? `No ${row.good.label.toLowerCase()} remaining.`
        : cannotAfford
          ? "Not enough doubloons."
          : cannotFit
            ? hold.reservedForLoadout > 0
              ? `Needs ${totalSize} cargo spaces; ${hold.freeWholeUnits} free after loadout.`
              : `Needs ${totalSize} cargo spaces; ${hold.freeWholeUnits} free.`
            : null;
      const rowId = `market-${row.good.id}`;
      const questCargoNeeded = (gameState.cargo[row.good.id] || 0) <
        (requiredQuestCargo[row.good.id] || 0);
      return [
        option(`Buy 1 ${row.good.label}  ${displayedPrice} db`, { type: "buy", goodId: row.good.id }, {
          detail: `${tradeTermsDetail(terms, "buy")}  ${worldPriceIndicator(comparison)}  ${marketStockIndicator(row.stock)}`,
          rowId,
          disabled: cartazBlocked || outOfStock || cannotAfford || cannotFit,
          disabledReason,
          emphasis: questCargoNeeded ? "quest-cargo" : null
        }),
        option(`Buy max x${maximumQuantity}  ${maximumPrice} db`, {
          type: "buy-max",
          goodId: row.good.id,
          quantity: maximumQuantity
        }, {
          detail: `${marketCargoSpaceIndicator(totalSize)}  ${marketStockIndicator(row.stock)}`,
          rowId,
          disabled: cartazBlocked || maximumQuantity <= 0,
          disabledReason,
          emphasis: questCargoNeeded ? "quest-cargo" : null
        })
      ];
    });
  if (context.shipStats) rows.push(option("Change ship loadout", { type: "leave-buy", nodeId: "loadout" }));
  rows.push(option("Back", { type: "leave-buy", nodeId: "root" }));
  rows.push(option("Undo all purchases", { type: "undo-market" }, {
    disabled: !marketUndoAvailable(session, "buy")
  }));
  return {
    speaker: speakerName(city),
    expressionId: feedbackExpressionId(session.feedback),
    text: city.isPirateHideout
      ? `No receipts, no questions. Doubloons ${gameState.doubloons}. Cargo ${hold.physicalWholeUnits}/${hold.capacity}.`
      : `${cityLabel(city)} market. Doubloons ${gameState.doubloons}. Cargo ${hold.physicalWholeUnits}/${hold.capacity}.`,
    feedback: session.feedback,
    feedbackLineReserve: 2,
    optionHeight: 30,
    optionColumns: 2,
    options: rows
  };
}

function tradeEmbargoWarningView(session) {
  const pending = requiredTradeEmbargoPurchase(session);
  const orders = pending.orders;
  const good = tradeGoodById(pending.purchase.goodId);
  const targetNames = [...new Set(orders.map((order) => factionById(order.targetFactionId).shortName))];
  const authorityNames = [...new Set(orders.map((order) => (
    order.authorityKind === TRADE_EMBARGO_AUTHORITY_PAPAL
      ? "the Holy See"
      : factionById(order.issuerFactionId).shortName
  )))];
  const prohibition = orders.length === 1
    ? `${authorityNames[0]} has forbidden ${tradeEmbargoScopeLabel(orders[0].scope)} from ${targetNames[0]}`
    : `${authorityNames.join(" and ")} have laid prohibitions upon merchandise from ${targetNames.join(" and ")}`;
  const detail = orders.map((order) => (
    `${order.authorityKind === TRADE_EMBARGO_AUTHORITY_PAPAL
      ? "HOLY SEE"
      : factionById(order.issuerFactionId).shortName.toUpperCase()} · ${tradeEmbargoScopeLabel(order.scope).toUpperCase()}`
  )).join("  ");
  return {
    speaker: "Port factor",
    expressionId: "concerned",
    text: `I will sell you the ${good.label.toLowerCase()}, captain, but ${prohibition}. Their patrols may search your hold, seize the cargo, and levy a fine. Shall I have it loaded?`,
    feedback: session.feedback,
    options: [
      option("Load it", { type: "confirm-trade-embargo-purchase" }, { detail }),
      option("Leave it ashore", { type: "decline-trade-embargo-purchase" })
    ]
  };
}

function requiredTradeEmbargoPurchase(session) {
  const pending = session.pendingTradeEmbargoPurchase;
  if (!pending || typeof pending !== "object" ||
      !pending.purchase || typeof pending.purchase.goodId !== "string" ||
      pending.purchase.goodId === "" ||
      !Number.isFinite(pending.purchase.quantity) || pending.purchase.quantity <= 0 ||
      typeof pending.returnNodeId !== "string" || pending.returnNodeId === "" ||
      !Array.isArray(pending.orders) || pending.orders.length === 0) {
    throw new Error("Trade embargo warning has no pending purchase");
  }
  return pending;
}

function tradeEmbargoSaleWarningView(session) {
  const pending = requiredTradeEmbargoSale(session);
  const good = tradeGoodById(pending.action.goodId);
  const regimes = pending.orders.map(tradeEmbargoRegimeLabel);
  const authorityNames = [...new Set(pending.orders.map((order) => (
    order.authorityKind === TRADE_EMBARGO_AUTHORITY_PAPAL
      ? "the Holy See"
      : factionById(order.issuerFactionId).shortName
  )))];
  return {
    speaker: "Port factor",
    expressionId: "concerned",
    text: `${authorityNames.join(" and ")} forbid this cargo to the buyers here, captain. ` +
      `The customs books will bear your name, and their agents will learn of the bargain. ` +
      `Will you still sell the ${good.label.toLowerCase()}?`,
    bodyTone: "danger",
    feedback: session.feedback,
    options: [
      option("Make the forbidden sale", { type: "confirm-trade-embargo-sale" }, {
        detail: regimes.map((regime) => regime.toUpperCase()).join("  ")
      }),
      option("Keep it aboard", { type: "decline-trade-embargo-sale" })
    ]
  };
}

function requiredTradeEmbargoSale(session) {
  const pending = session.pendingTradeEmbargoSale;
  if (!pending || typeof pending !== "object" ||
      !pending.action || !["sell", "sell-all"].includes(pending.action.type) ||
      typeof pending.action.goodId !== "string" || pending.action.goodId === "" ||
      !Number.isFinite(pending.action.quantity) || pending.action.quantity <= 0 ||
      !Array.isArray(pending.orders) || pending.orders.length === 0) {
    throw new Error("Trade embargo warning has no pending sale");
  }
  return pending;
}

function executePortMarketPurchase(session, gameState, economy, city, action, context) {
  ensureMarketUndoSession(session, "buy", gameState, economy, city);
  const result = buyGood(
    gameState,
    economy,
    city,
    action.goodId,
    action.quantity,
    tradeContext(session, context)
  );
  recordMarketPurchase(session, result);
  recordIllicitMarketTransaction(session, result, "buy");
  session.feedback = result.quantity === 1
    ? `Bought ${result.good.label} for ${result.price} db.`
    : `Bought ${result.good.label} x${result.quantity} for ${result.price} db.`;
  return { closed: false, marketPurchase: result };
}

function marketBuyGoodIds(session, market) {
  const supplyIds = new Set([FRESH_WATER_GOOD_ID, HARDTACK_GOOD_ID]);
  const availableGoodIds = [...market.values()]
    .filter((row) => row.listedForSale && row.stock > 0 && !supplyIds.has(row.good.id))
    .sort((a, b) => b.productionPerDay - a.productionPerDay || a.good.id.localeCompare(b.good.id))
    .map((row) => row.good.id);
  return stableMarketGoodIds(session, "marketBuyGoodIds", availableGoodIds);
}

function tradeTipView(session, city) {
  const tip = session.tradeTip;
  if (!tip) throw new Error("Trade-tip dialogue requires a computed route");
  if (tip.localMarket) {
    return {
      speaker: speakerName(city),
      expressionId: "attentive",
      text: `You won't find a better price for ${tip.goodLabel} around this area.`,
      feedback: null,
      options: [option("Continue", { type: "node", nodeId: tip.nextNodeId })]
    };
  }
  return {
    speaker: speakerName(city),
    expressionId: "attentive",
    text: `I heard ${tip.destinationName} pays a good price for ${tip.goodLabel}.`,
    feedback: null,
    options: [
      option(`Set a heading for ${tip.destinationName}`, {
        type: "set-port-heading",
        destinationCityId: tip.destinationCityId,
        destinationTileId: tip.destinationTileId,
        destinationName: tip.destinationName,
        reason: PORT_NAVIGATION_REASON_TRADE_PRICE,
        tradeGoodId: tip.goodId,
        nextNodeId: tip.nextNodeId
      }),
      option("Continue", { type: "node", nodeId: tip.nextNodeId })
    ]
  };
}

function questCargoTipView(session, city) {
  const tip = session.questCargoTip;
  if (!tip) throw new Error("Quest-cargo-tip dialogue requires a computed source");
  return {
    speaker: speakerName(city),
    expressionId: "attentive",
    text: `If it's ${tip.goodLabel} you're looking for, I hear they have some at ${tip.destinationName}.`,
    feedback: null,
    options: [
      option(`Set a heading for ${tip.destinationName}`, {
        type: "set-port-heading",
        destinationCityId: tip.destinationCityId,
        destinationTileId: tip.destinationTileId,
        destinationName: tip.destinationName,
        reason: PORT_NAVIGATION_REASON_QUEST_CARGO,
        questCargoGoodId: tip.goodId,
        nextNodeId: tip.nextNodeId
      }),
      option("No, thank you", {
        type: "decline-quest-cargo-tip",
        nextNodeId: tip.nextNodeId
      })
    ]
  };
}

export function bestQuestCargoSource({
  originCity,
  gameState,
  economy,
  portCities,
  simMinute = 0,
  sailingDistanceKm,
  random = Math.random
}) {
  if (!originCity || !Number.isInteger(originCity.tileId)) {
    throw new Error("Quest cargo advice requires an origin port");
  }
  if (!Array.isArray(portCities)) throw new Error("Quest cargo advice requires candidate ports");
  if (!Number.isFinite(simMinute) || simMinute < 0) {
    throw new Error(`Invalid quest cargo advice minute: ${simMinute}`);
  }
  const requiredQuantities = activeQuestCargoReservedQuantities(gameState, {
    currentMinute: simMinute
  });
  const neededGoodIds = Object.entries(requiredQuantities)
    .filter(([goodId, required]) => (gameState.cargo[goodId] || 0) < required)
    .map(([goodId]) => goodId)
    .sort();
  if (neededGoodIds.length === 0) return null;
  if (typeof sailingDistanceKm !== "function") {
    throw new Error("Quest cargo advice requires the precomputed sailing-distance resolver");
  }
  if (typeof random !== "function") throw new Error("Quest cargo advice requires a random source");

  const portByCityId = new Map(portCities.map((port) => [port.cityId, port]));
  const waypointGoodIds = new Set();
  for (const waypoint of gameState.memory.navigation.optionalWaypoints) {
    if (waypoint.reason !== PORT_NAVIGATION_REASON_QUEST_CARGO || !waypoint.questCargoGoodId) {
      continue;
    }
    const destination = portByCityId.get(waypoint.destinationCityId);
    if (!destination || !destinationAcceptsPlayerTrade(destination, gameState, simMinute)) continue;
    const row = portMarket(economy, destination)
      .find((entry) => entry.good.id === waypoint.questCargoGoodId);
    if (row?.listedForSale && row.stock >= 1) waypointGoodIds.add(waypoint.questCargoGoodId);
  }
  const currentMarket = portMarket(economy, originCity);
  const hints = [];
  for (const goodId of neededGoodIds) {
    if (waypointGoodIds.has(goodId) || questCargoHintOnCooldown(gameState, simMinute, goodId)) {
      continue;
    }
    const currentRow = currentMarket.find((row) => row.good.id === goodId);
    if (!currentRow) throw new Error(`Quest cargo good is absent from the market: ${goodId}`);
    if (currentRow.listedForSale && currentRow.stock >= 1) continue;

    const sources = [];
    for (const destination of portCities) {
      if (destination.cityId === originCity.cityId ||
          !destinationAcceptsPlayerTrade(destination, gameState, simMinute)) {
        continue;
      }
      const row = portMarket(economy, destination).find((entry) => entry.good.id === goodId);
      if (!row) throw new Error(`Quest cargo good is absent from the market: ${goodId}`);
      if (!row.listedForSale || row.stock < 1) continue;
      const distanceKm = sailingDistanceKm(originCity, destination);
      if (distanceKm === null) continue;
      if (!Number.isInteger(distanceKm) || distanceKm < 0) {
        throw new Error(`Quest cargo sailing distance is invalid: ${distanceKm}`);
      }
      sources.push({
        destination,
        distanceKm,
        productionPerDay: row.productionPerDay,
        stock: row.stock
      });
    }
    sources.sort((left, right) => (
      left.distanceKm - right.distanceKm ||
      Number(right.productionPerDay > 0) - Number(left.productionPerDay > 0) ||
      right.stock - left.stock ||
      left.destination.tileId - right.destination.tileId
    ));
    const source = sources[0];
    if (!source) continue;
    const good = tradeGoodById(goodId);
    hints.push(Object.freeze({
      goodId,
      goodLabel: good.label,
      destinationCityId: source.destination.cityId,
      destinationTileId: source.destination.tileId,
      destinationName: cityLabel(source.destination),
      distanceKm: source.distanceKm
    }));
  }
  if (hints.length === 0) return null;
  const roll = random();
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) {
    throw new Error(`Invalid quest cargo advice roll: ${roll}`);
  }
  return hints[Math.floor(roll * hints.length)];
}

function recordQuestCargoHintDecline(gameState, simMinute, goodId) {
  if (!Number.isFinite(simMinute) || simMinute < 0) {
    throw new Error(`Invalid quest cargo hint decline minute: ${simMinute}`);
  }
  if (typeof goodId !== "string" || goodId === "") {
    throw new Error("Quest cargo hint decline requires a trade good id");
  }
  gameState.memory.decisions[questCargoHintDeclineDecision(goodId)] = simMinute + 1;
}

function questCargoHintOnCooldown(gameState, simMinute, goodId) {
  const value = gameState?.memory?.decisions?.[questCargoHintDeclineDecision(goodId)];
  if (value === undefined) return false;
  if (!Number.isFinite(value) || value < 1) {
    throw new Error(`Invalid quest cargo hint decline record: ${value}`);
  }
  return simMinute - (value - 1) < QUEST_CARGO_HINT_DECLINE_COOLDOWN_MINUTES;
}

function questCargoHintDeclineDecision(goodId) {
  if (typeof goodId !== "string" || goodId === "") {
    throw new Error("Quest cargo hint cooldown requires a trade good id");
  }
  return `${QUEST_CARGO_HINT_DECLINE_DECISION_PREFIX}:${goodId}`;
}

export function bestPurchasedTradeRoute({
  purchases,
  originCity,
  gameState,
  economy,
  portCities,
  simMinute = 0,
  sailingDistanceKm,
  includeLocalMarket = false
}) {
  if (!purchases || typeof purchases !== "object" || Array.isArray(purchases)) {
    throw new Error("Trade-route advice requires a purchase record");
  }
  if (!originCity || !Number.isInteger(originCity.tileId)) {
    throw new Error("Trade-route advice requires an origin port");
  }
  if (!Array.isArray(portCities)) throw new Error("Trade-route advice requires candidate ports");
  if (typeof sailingDistanceKm !== "function") {
    throw new Error("Trade-route advice requires the precomputed sailing-distance resolver");
  }
  if (typeof includeLocalMarket !== "boolean") {
    throw new Error(`Trade-route local-market flag must be boolean: ${includeLocalMarket}`);
  }

  const requiredQuestCargo = activeQuestCargoReservedQuantities(gameState, {
    currentMinute: simMinute
  });
  let best = null;
  for (const purchase of Object.values(purchases)) {
    if (!purchase || !Number.isInteger(purchase.quantity) || purchase.quantity <= 0) {
      throw new Error("Trade-route purchase quantity must be a positive integer");
    }
    if (!Number.isFinite(purchase.cost) || purchase.cost < 0) {
      throw new Error("Trade-route purchase cost must be non-negative");
    }
    const good = tradeGoodById(purchase.goodId);
    if ((requiredQuestCargo[good.id] || 0) > 0) continue;
    const heldBasis = cargoCostBasis(gameState, good.id);
    const heldQuantity = gameState.cargo[good.id] || 0;
    const expectedCost = heldBasis.known && heldQuantity >= purchase.quantity
      ? heldBasis.average * purchase.quantity
      : purchase.cost;
    const candidates = [];
    for (const destination of portCities) {
      if (!includeLocalMarket && destination.cityId === originCity.cityId) continue;
      if (!destinationAcceptsPlayerTrade(destination, gameState, simMinute)) continue;
      const terms = playerTradeTerms(gameState, destination, good.id);
      if (maximumPortPurchaseQuantity(
        economy,
        destination,
        good.id,
        purchase.quantity,
        terms.saleMultiplier
      ) < purchase.quantity) continue;
      const revenue = quotePortPurchase(
        economy,
        destination,
        good.id,
        purchase.quantity,
        terms.saleMultiplier
      );
      const pnl = revenue - expectedCost;
      if (pnl <= 0) continue;
      const localMarket = destination.cityId === originCity.cityId;
      const distanceKm = localMarket ? 0 : sailingDistanceKm(originCity, destination);
      if (distanceKm === null) continue;
      if (!Number.isInteger(distanceKm) || distanceKm < 0) {
        throw new Error(`Trade-route sailing distance is invalid: ${distanceKm}`);
      }
      candidates.push({
        goodId: good.id,
        goodLabel: good.label,
        destinationCityId: destination.cityId,
        destinationTileId: destination.tileId,
        destinationName: cityLabel(destination),
        quantity: purchase.quantity,
        expectedPnl: pnl,
        distanceKm,
        recommendationScore: distanceAdjustedTradeProfit(pnl, distanceKm),
        localMarket
      });
    }
    const localCandidate = candidates.find((candidate) => candidate.localMarket) || null;
    const localIsBestInArea = localCandidate !== null && candidates.every((candidate) => (
      candidate.localMarket ||
      candidate.distanceKm > TRADE_TIP_DISTANCE_SCALE_KM ||
      candidate.expectedPnl <= localCandidate.expectedPnl
    ));
    for (const candidate of candidates) {
      if (candidate.localMarket && !localIsBestInArea) continue;
      if (betterTradeTip(candidate, best)) best = candidate;
    }
  }
  return best;
}

function bestHeldCargoTradeRoute({
  originCity,
  gameState,
  economy,
  portCities,
  simMinute,
  sailingDistanceKm
}) {
  const purchases = {};
  const requiredQuestCargo = activeQuestCargoReservedQuantities(gameState, {
    currentMinute: simMinute
  });
  for (const row of cargoRows(gameState)) {
    if (row.good.sellable === false) continue;
    if ((requiredQuestCargo[row.good.id] || 0) > 0) continue;
    const quantity = marketTradeLotCount(row.quantity);
    if (quantity <= 0) continue;
    const basis = cargoCostBasis(gameState, row.good.id);
    purchases[row.good.id] = {
      goodId: row.good.id,
      // Advice after declining a sale compares one trade lot so a port need
      // not afford the whole hold, but it must still respect known P/L.
      quantity: 1,
      cost: basis.known ? basis.average : 0
    };
  }
  if (Object.keys(purchases).length === 0) return null;
  return bestPurchasedTradeRoute({
    purchases,
    originCity,
    gameState,
    economy,
    portCities,
    simMinute,
    sailingDistanceKm,
    includeLocalMarket: true
  });
}

function recordMarketPurchase(session, result) {
  if (!session.marketPurchases || typeof session.marketPurchases !== "object") {
    throw new Error("Port dialogue session has no market purchase record");
  }
  const current = session.marketPurchases[result.good.id] || {
    goodId: result.good.id,
    quantity: 0,
    cost: 0
  };
  current.quantity += result.quantity;
  current.cost += result.price;
  session.marketPurchases[result.good.id] = current;
}

function recordIllicitMarketTransaction(session, result, side) {
  if (result.tradeTerms?.illicit !== true) return;
  if (side !== "buy" && side !== "sell") {
    throw new Error(`Invalid illicit market transaction side: ${side}`);
  }
  const terms = result.tradeTerms;
  if (typeof terms.accessPolicyId !== "string" || terms.accessPolicyId === "" ||
      typeof terms.enforcementFactionId !== "string" || terms.enforcementFactionId === "" ||
      !Number.isInteger(terms.illicitMarketReputationPenalty) ||
      terms.illicitMarketReputationPenalty <= 0) {
    throw new Error("Illicit market transaction has no enforceable trade policy");
  }
  const visit = session.illicitTradeVisit || {
    policyId: terms.accessPolicyId,
    enforcementFactionId: terms.enforcementFactionId,
    reputationPenalty: terms.illicitMarketReputationPenalty,
    transactionCount: 0,
    transactionValue: 0,
    purchasedCargo: {}
  };
  if (visit.policyId !== terms.accessPolicyId ||
      visit.enforcementFactionId !== terms.enforcementFactionId) {
    throw new Error("A port visit cannot mix illicit trade enforcement policies");
  }
  visit.transactionCount += 1;
  visit.transactionValue += result.price;
  if (side === "buy") {
    visit.purchasedCargo[result.good.id] =
      (visit.purchasedCargo[result.good.id] || 0) + result.quantity;
  }
  session.illicitTradeVisit = visit;
}

function copyIllicitTradeVisit(visit) {
  if (visit === null) return null;
  if (!visit || typeof visit !== "object" || Array.isArray(visit) ||
      typeof visit.policyId !== "string" || visit.policyId === "" ||
      typeof visit.enforcementFactionId !== "string" || visit.enforcementFactionId === "" ||
      !Number.isInteger(visit.reputationPenalty) || visit.reputationPenalty <= 0 ||
      !Number.isInteger(visit.transactionCount) || visit.transactionCount < 0 ||
      !Number.isFinite(visit.transactionValue) || visit.transactionValue < 0 ||
      !visit.purchasedCargo || typeof visit.purchasedCargo !== "object" ||
      Array.isArray(visit.purchasedCargo)) {
    throw new Error("Invalid illicit trade port-visit record");
  }
  return {
    ...visit,
    purchasedCargo: { ...visit.purchasedCargo }
  };
}

function beginMarketUndoSession(session, nodeId, gameState, economy, city) {
  if (nodeId !== "buy" && nodeId !== "sell") {
    throw new Error(`Unknown market undo node: ${nodeId}`);
  }
  session.marketUndoNodeId = nodeId;
  session.marketUndoSnapshot = createMarketUndoSnapshot(gameState, economy, city);
  session.marketUndoIllicitTradeVisit = copyIllicitTradeVisit(session.illicitTradeVisit);
}

function ensureMarketUndoSession(session, nodeId, gameState, economy, city) {
  if (session.marketUndoNodeId === nodeId && session.marketUndoSnapshot) return;
  beginMarketUndoSession(session, nodeId, gameState, economy, city);
}

function continueMarketSale(session, city, gameState, economy, action, context) {
  const quantity = action.type === "sell-all" ? action.quantity : 1;
  const normalizedAction = { ...action, quantity };
  const embargoOrders = playerTradeEmbargoSaleWarnings(gameState, city, action.goodId)
    .filter((order) => !session.acknowledgedTradeEmbargoOrderIds.includes(order.id));
  if (embargoOrders.length > 0) {
    session.pendingTradeEmbargoSale = {
      action: normalizedAction,
      orders: embargoOrders.map((order) => ({ ...order }))
    };
    session.nodeId = "trade-embargo-sale-warning";
    session.selectedIndex = 0;
    session.feedback = null;
    return { closed: false };
  }
  const theft = questCargoSaleTheftStatus(gameState, action.goodId, quantity);
  if (theft) {
    session.pendingTributeTheft = { action: normalizedAction, theft };
    session.nodeId = "tribute-theft-warning";
    session.selectedIndex = 0;
    session.feedback = null;
    return { closed: false };
  }
  const questCargoSale = activeQuestCargoSaleStatus(gameState, action.goodId, quantity, {
    currentMinute: context.simMinute ?? 0
  });
  if (questCargoSale && !session.questCargoSaleWarningShown) {
    session.questCargoSaleWarningShown = true;
    session.pendingQuestCargoSale = { action: normalizedAction, questCargoSale };
    session.nodeId = "quest-cargo-sale-warning";
    session.selectedIndex = 0;
    session.feedback = null;
    return { closed: false };
  }
  return executeMarketSale(
    session,
    city,
    gameState,
    economy,
    action.goodId,
    quantity,
    context,
    action.type === "sell-all"
  );
}

function executeMarketSale(
  session,
  city,
  gameState,
  economy,
  goodId,
  quantity,
  context,
  sellAll = false
) {
  ensureMarketUndoSession(session, "sell", gameState, economy, city);
  const sale = sellAll ? sellAllGood : sellGood;
  const result = sale(gameState, economy, city, goodId, quantity, tradeContext(session, context));
  session.marketSales += result.quantity;
  recordIllicitMarketTransaction(session, result, "sell");
  const pnl = result.pnl === null ? "--" : signedDoubloons(result.pnl);
  session.feedback = result.quantity === 1
    ? `Sold ${result.good.label} for ${result.price} db. P/L ${pnl}.`
    : `Sold ${result.good.label} x${result.quantity} for ${result.price} db. P/L ${pnl}.`;
  return { closed: false, marketSale: result };
}

function clearMarketUndoSession(session) {
  session.marketUndoNodeId = null;
  session.marketUndoSnapshot = null;
  session.marketUndoIllicitTradeVisit = null;
  session.pendingMarketUndoNodeId = null;
}

function requiredPendingMarketUndoNodeId(session) {
  const nodeId = session.pendingMarketUndoNodeId;
  if (!["buy", "sell"].includes(nodeId) || session.nodeId !== "market-undo-confirm" ||
      session.marketUndoNodeId !== nodeId || !session.marketUndoSnapshot) {
    throw new Error("Market undo confirmation has no matching ledger snapshot");
  }
  return nodeId;
}

function marketUndoAvailable(session, nodeId) {
  if (session.marketUndoNodeId !== nodeId || !session.marketUndoSnapshot) return false;
  return nodeId === "buy"
    ? Object.keys(session.marketPurchases || {}).length > 0
    : session.marketSales > 0;
}

function destinationAcceptsPlayerTrade(city, gameState, simMinute) {
  if (!portEntryStatus(gameState, city, simMinute).allowed) return false;
  return playerTradeAccess(gameState, city, { simMinute }).allowed;
}

function tradeTermsDetail(terms, side) {
  const parts = [];
  if (side === "buy" && terms.purchaseDiscountMultiplier !== 1) {
    const change = Math.round((1 - terms.purchaseDiscountMultiplier) * 100);
    parts.push(`FOUNDER -${change}%`);
  }
  if (terms.illicit) parts.push("ILLICIT");
  parts.push(`DUTY ${Math.round(terms.customsRate * 100)}%`);
  if (terms.crownMonopoly) {
    const rate = side === "buy" ? terms.monopolyPurchaseRate : terms.monopolySaleRate;
    parts.push(`CROWN ${side === "buy" ? "+" : "-"}${Math.round(rate * 100)}%`);
  }
  const bargainMultiplier = side === "buy"
    ? terms.purchaseBargainMultiplier
    : terms.saleBargainMultiplier;
  if (bargainMultiplier !== 1) {
    const change = Math.round(Math.abs(bargainMultiplier - 1) * 100);
    parts.push(`BARGAIN ${side === "buy" ? "-" : "+"}${change}%`);
  }
  return parts.join("  ");
}

function founderPurchaseDiscountPercent() {
  const multiplier = COLONIZATION_FOUNDER_DISCOUNT_MULTIPLIER;
  if (!Number.isFinite(multiplier) || multiplier <= 0 || multiplier >= 1) {
    throw new Error(`Colonization founder purchase discount is invalid: ${multiplier}`);
  }
  return Math.round((1 - multiplier) * 100);
}

function betterTradeTip(candidate, current) {
  if (!current || candidate.recommendationScore !== current.recommendationScore) {
    return !current || candidate.recommendationScore > current.recommendationScore;
  }
  if (candidate.expectedPnl !== current.expectedPnl) {
    return candidate.expectedPnl > current.expectedPnl;
  }
  if (candidate.distanceKm !== current.distanceKm) {
    return candidate.distanceKm < current.distanceKm;
  }
  if (candidate.destinationName !== current.destinationName) {
    return candidate.destinationName.localeCompare(current.destinationName) < 0;
  }
  return candidate.goodLabel.localeCompare(current.goodLabel) < 0;
}

function distanceAdjustedTradeProfit(expectedPnl, distanceKm) {
  if (!Number.isFinite(expectedPnl)) {
    throw new Error(`Trade-route advice requires finite expected profit: ${expectedPnl}`);
  }
  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    throw new Error(`Trade-route advice requires a non-negative distance: ${distanceKm}`);
  }
  return expectedPnl / (1 + distanceKm / TRADE_TIP_DISTANCE_SCALE_KM);
}

function loadoutView(session, city, gameState, context) {
  if (!context.shipStats) throw new Error("Loadout view requires player ship stats");
  const currentId = gameState.ship?.loadoutId || null;
  const rows = SHIP_LOADOUT_PRESETS.map((preset) => {
    const plan = shipLoadoutPlan(context.shipStats, preset.id, {
      minimumCrew: permanentCrewFloor(gameState)
    });
    const selected = currentId === preset.id;
    return option(`${selected ? "* " : ""}${preset.label.toUpperCase()}`, {
      type: "select-loadout",
      loadoutId: preset.id
    }, {
      detail: `CREW ${plan.crew}  GUNS ${plan.cannons}  FOOD ${Math.floor(plan.foodDays)}D  WATER ${Math.floor(plan.waterDays)}D`
    });
  });
  const customSelected = currentId === CUSTOM_LOADOUT_ID;
  const customPlan = customSelected
    ? shipCustomLoadoutPlan(context.shipStats, gameState.ship.loadoutTargets, {
      minimumCrew: permanentCrewFloor(gameState)
    })
    : null;
  rows.push(option(`${customSelected ? "* " : ""}CUSTOM`, { type: "open-custom-loadout" }, {
    detail: customPlan
      ? `CREW ${customPlan.crew}  GUNS ${customPlan.cannons}  FOOD ${Math.floor(customPlan.foodDays)}D  WATER ${Math.floor(customPlan.waterDays)}D`
      : "SET CREW, GUNS, FOOD, AND WATER"
  }));
  if (currentId) rows.push(option("Back", { type: "node", nodeId: "root" }));
  return {
    speaker: speakerName(city),
    expressionId: "attentive",
    text: currentId
      ? "Choose the targets we should automatically restore whenever you dock."
      : "Before I provision your ship, choose how you intend to use her.",
    feedback: session.feedback,
    optionHeight: 34,
    options: rows
  };
}

export function setPortCustomLoadoutValue(session, stats, key, value, minimumCrew = 1) {
  if (!session || session.kind !== "port" || session.nodeId !== "custom-loadout") {
    throw new Error("Custom loadout controls require the custom loadout screen");
  }
  if (!session.customLoadoutDraft) throw new Error("Custom loadout editor has no draft");
  session.customLoadoutDraft = setShipCustomLoadoutValue(
    stats,
    session.customLoadoutDraft,
    key,
    value,
    { minimumCrew }
  );
  return shipCustomLoadoutPlan(stats, session.customLoadoutDraft, { minimumCrew });
}

function customLoadoutView(session, city, gameState, context) {
  if (!context.shipStats) throw new Error("Custom loadout view requires player ship stats");
  if (!session.customLoadoutDraft) {
    session.customLoadoutDraft = shipCustomLoadoutDraft(
      context.shipStats,
      gameState.ship?.loadoutTargets || null,
      { minimumCrew: permanentCrewFloor(gameState) }
    );
  }
  const minimumCrew = permanentCrewFloor(gameState);
  const plan = shipCustomLoadoutPlan(context.shipStats, session.customLoadoutDraft, { minimumCrew });
  const labels = { crew: "Crew", cannons: "Guns", foodUnits: "Food", waterUnits: "Water" };
  return {
    speaker: speakerName(city),
    expressionId: "attentive",
    text: "Set crew, guns, and stores. Extra hands improve field work and gun loading. Smaller stores dump excess provisions without refund.",
    feedback: session.feedback,
    presentation: {
      kind: "custom-loadout",
      shipLabel: shipLabelForSlug(context.shipStats.slug),
      plan,
      crewWorkMultiplier: crewWorkMultiplier(plan.crew),
      cannonReloadPercent: plan.cannons > 0
        ? Math.round(cannonReloadWorkRate(plan.crew, plan.cannons) * 100)
        : null,
      fields: CUSTOM_LOADOUT_FIELDS.map((key) => ({
        key,
        label: labels[key],
        value: session.customLoadoutDraft[key],
        bounds: shipCustomLoadoutBounds(context.shipStats, session.customLoadoutDraft, key, { minimumCrew })
      }))
    },
    options: [
      option("Apply custom loadout", { type: "select-custom-loadout" }, { placement: "port-exit" }),
      option("Back", { type: "node", nodeId: "loadout" }, { placement: "port-exit" })
    ]
  };
}

function loadoutRemovalSummary(removed) {
  const phrases = [];
  if (removed.food > 0) phrases.push(`${formatDisplayQuantity(removed.food)} food`);
  if (removed.water > 0) phrases.push(`${formatDisplayQuantity(removed.water)} water`);
  return phrases.length > 0 ? ` Offloaded ${phrases.join(" / ")}.` : "";
}

function sellView(session, city, gameState, economy, context) {
  const hold = cargoHoldStatus(gameState);
  const market = new Map(portMarket(economy, city).map((row) => [row.good.id, row]));
  const requiredQuestCargo = activeQuestCargoReservedQuantities(gameState, {
    currentMinute: context.simMinute ?? 0
  });
  const rows = marketSaleGoodIds(session, gameState).flatMap((goodId) => {
    const good = tradeGoodById(goodId);
    const quantity = gameState.cargo[goodId] || 0;
    const heldLots = marketTradeLotCount(quantity);
    const soldOut = heldLots === 0;
    const row = market.get(goodId);
    if (!row) throw new Error(`${cityLabel(city)} market has no quote for ${goodId}`);
    const terms = playerTradeTerms(gameState, city, goodId, tradeContext(session, context));
    const cartazBlocked = !terms.allowed &&
      terms.crownSpiceAccess?.reason === "portuguese-crown-spice-monopoly";
    const price = quotePortPurchase(economy, city, goodId, 1, terms.saleMultiplier);
    const basis = cargoCostBasis(gameState, goodId);
    const pnlLabel = basis.known ? signedDoubloons(price - basis.average) : "--";
    const comparison = worldMarketPriceComparison(economy, city, goodId, "sell");
    const marketOutOfSpecie = maximumPortPurchaseQuantity(
      economy,
      city,
      goodId,
      1,
      terms.saleMultiplier
    ) < 1;
    const fullSalePrice = heldLots > 0
      ? quoteRepeatedPortPurchase(economy, city, goodId, heldLots, terms.saleMultiplier)
      : 0;
    const marketCanBuyAll = heldLots > 0 && maximumRepeatedPortPurchaseQuantity(
      economy,
      city,
      goodId,
      heldLots,
      terms.saleMultiplier
    ) === heldLots;
    const fullPnl = basis.known && heldLots > 0
      ? signedDoubloons(fullSalePrice - basis.total * heldLots / quantity)
      : "--";
    const disabledReason = cartazBlocked
        ? "A valid Portuguese cartaz is required for Crown spices."
        : soldOut
        ? `No ${good.label.toLowerCase()} remaining.`
        : marketOutOfSpecie
          ? "The market is out of specie."
          : null;
    const rowId = `market-${goodId}`;
    const questCargoNeeded = (requiredQuestCargo[goodId] || 0) > 0;
    return [
      option(`Sell 1 ${good.label}  ${price} db`, {
        type: "sell",
        goodId
      }, {
        detail: `${tradeTermsDetail(terms, "sell")}  ${worldPriceIndicator(comparison)}  ${marketProfitIndicator(pnlLabel)}  ${marketHeldIndicator(heldLots)}`,
        rowId,
        disabled: cartazBlocked || soldOut || marketOutOfSpecie,
        disabledReason,
        emphasis: questCargoNeeded ? "quest-cargo-danger" : null
      }),
      option(`Sell all x${heldLots}  ${fullSalePrice} db`, {
        type: "sell-all",
        goodId,
        quantity: heldLots
      }, {
        detail: `TOTAL P/L ${fullPnl}  HELD ${heldLots}`,
        rowId,
        disabled: cartazBlocked || !marketCanBuyAll,
        disabledReason: disabledReason || "The market cannot afford the whole lot.",
        emphasis: questCargoNeeded ? "quest-cargo-danger" : null
      })
    ];
  });
  if (rows.length === 0) {
    rows.push(option("No cargo to sell", { type: "node", nodeId: "sell" }, {
      disabled: true,
      disabledReason: "The hold has no cargo buyers will take."
    }));
  }
  rows.push(option("Back", { type: "leave-sell", nodeId: "root" }));
  rows.push(option("Undo all sales", { type: "undo-market" }, {
    disabled: !marketUndoAvailable(session, "sell")
  }));
  return {
    speaker: speakerName(city),
    expressionId: feedbackExpressionId(session.feedback),
    text: city.isPirateHideout
      ? `The fences care about value, not provenance. Cargo ${hold.physicalWholeUnits}/${hold.capacity}.`
      : `Buyers here pay port rates. Cargo ${hold.physicalWholeUnits}/${hold.capacity}.`,
    feedback: session.feedback,
    feedbackLineReserve: 2,
    optionHeight: 30,
    optionColumns: 2,
    options: rows
  };
}

function marketUndoConfirmationView(session, city) {
  const nodeId = requiredPendingMarketUndoNodeId(session);
  const purchases = nodeId === "buy";
  return {
    speaker: speakerName(city),
    expressionId: "attentive",
    text: purchases
      ? "Shall I strike every purchase made during this visit from the ledger, return the coin, and send the goods ashore?"
      : "Shall I strike every sale made during this visit from the ledger, return the goods to your hold, and reclaim the coin?",
    bodyTone: "danger",
    feedback: null,
    options: [
      option(purchases ? "Undo the purchases" : "Undo the sales", {
        type: "confirm-market-undo"
      }),
      option("Let the bargains stand", { type: "cancel-market-undo" }, {
        placement: "port-exit"
      })
    ]
  };
}

function tributeTheftWarningView(session, city, gameState) {
  const pending = session.pendingTributeTheft;
  if (!pending) throw new Error("Tribute theft warning has no pending sale");
  const quest = gameState.memory?.quests?.active;
  if (!quest || quest.id !== pending.theft.questId) {
    throw new Error("Tribute theft warning no longer matches the active mission");
  }
  const good = tradeGoodById(pending.theft.goodId);
  if (pending.theft.kind === "tea-race") {
    const origin = factionById(pending.theft.originFactionId).name;
    return {
      speaker: speakerName(city),
      expressionId: "stern",
      text: `Those ${good.label.toLowerCase()} chests were entrusted for the new-crop race, not given ` +
        `to you. Selling ${pending.theft.stolenQuantity} is theft. The race will fail and your standing ` +
        `will fall ${formatSignedReputation(pending.theft.originPenalty)} with ${origin}.`,
      bodyTone: "danger",
      feedback: session.feedback,
      options: [
        option("Sell the entrusted tea", { type: "confirm-tribute-theft" }),
        option("Keep the tea sealed", { type: "cancel-tribute-theft" })
      ]
    };
  }
  const origin = factionById(pending.theft.originFactionId).name;
  const suzerain = factionById(pending.theft.suzerainFactionId).name;
  const secondPenalty = pending.theft.originFactionId === pending.theft.suzerainFactionId
    ? ""
    : ` and ${formatSignedReputation(pending.theft.suzerainPenalty)} with ${suzerain}`;
  return {
    speaker: speakerName(city),
    expressionId: "stern",
    text: `Those ${good.label.toLowerCase()} are sealed tribute, not your cargo. Selling ` +
      `${pending.theft.stolenQuantity} is theft from the court. Your mission will fail and your standing ` +
      `will fall ${formatSignedReputation(pending.theft.originPenalty)} with ${origin}${secondPenalty}.`,
    bodyTone: "danger",
    feedback: session.feedback,
    options: [
      option(`Sell the sealed ${good.label.toLowerCase()}`, { type: "confirm-tribute-theft" }),
      option("Keep the tribute aboard", { type: "cancel-tribute-theft" })
    ]
  };
}

function questCargoSaleWarningView(session, gameState) {
  const pending = session.pendingQuestCargoSale;
  if (!pending) throw new Error("Quest cargo sale warning has no pending sale");
  const good = tradeGoodById(pending.questCargoSale.goodId);
  return {
    speaker: characterName(gameState.playerCharacter),
    expressionId: "concerned",
    text: `We need our ${good.label.toLowerCase()} for a commission. Sell it anyway?`,
    bodyTone: "danger",
    feedback: session.feedback,
    options: [
      option("Sell it anyway", { type: "confirm-quest-cargo-sale" }),
      option("Keep it aboard", { type: "cancel-quest-cargo-sale" })
    ]
  };
}

function marketSaleGoodIds(session, gameState) {
  const saleGoodIds = cargoRows(gameState)
    .filter((cargo) => cargo.good.sellable !== false && cargo.quantity >= 1)
    .map((cargo) => cargo.good.id);
  return stableMarketGoodIds(session, "marketSaleGoodIds", saleGoodIds);
}

function stableMarketGoodIds(session, rosterKey, candidateGoodIds) {
  const roster = session[rosterKey];
  if (!Array.isArray(roster)) throw new Error(`Port dialogue session has no stable market roster: ${rosterKey}`);
  if (!Array.isArray(candidateGoodIds)) throw new Error(`Market roster candidates must be an array: ${rosterKey}`);
  const knownIds = new Set(roster);
  for (const goodId of candidateGoodIds) {
    if (typeof goodId !== "string" || goodId === "") throw new Error(`Invalid market roster good: ${goodId}`);
    if (knownIds.has(goodId)) continue;
    roster.push(goodId);
    knownIds.add(goodId);
  }
  return roster;
}

function marketTradeLotCount(quantity) {
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new Error(`Invalid market cargo quantity: ${quantity}`);
  }
  return Math.floor(quantity + 1e-8);
}

function cargoView(session, city, gameState) {
  const hold = cargoHoldStatus(gameState);
  const rows = cargoRows(gameState);
  const cargoText = rows.length > 0
    ? rows.map((row) => `${row.good.label} ${cargoQuantityLabel(row.good, row.quantity)}`).join(", ")
    : "The hold is empty.";
  return {
    speaker: speakerName(city),
    expressionId: "neutral",
    text: `${cargoText} Doubloons ${gameState.doubloons}. Space ${hold.physicalWholeUnits}/${hold.capacity}.`,
    feedback: session.feedback,
    options: [
      option("Back", { type: "node", nodeId: "root" }),
      option("Leave port", { type: "close" })
    ]
  };
}

function questView(session, city, gameState, portCities) {
  const returnNodeId = session.nextPortNodeId || "root";
  const questState = questStateForCity(gameState, city, portCities);
  if (isCaptureCommissionQuest(questState.quest)) {
    return captureCommissionQuestView(session, questState, returnNodeId);
  }
  if (isWokouHuntQuest(questState.quest)) {
    return wokouHuntQuestView(session, questState, returnNodeId);
  }
  if (questState.kind === "ready-to-complete") {
    if (questState.quest.kind === "passenger" || isEnvoyQuest(questState.quest)) {
      const envoy = isEnvoyQuest(questState.quest);
      const scriptedPassenger = envoy ||
        isHajjPassengerQuest(questState.quest) ||
        isReligiousPassengerQuest(questState.quest) ||
        isEastAsianMissionQuest(questState.quest);
      const roleLabel = envoy ? "envoy" : passengerRoleLabel(questState.quest);
      return {
        speaker: speakerName(city),
        expressionId: "happy",
        text: envoy
          ? `${passengerName(questState.quest)} is ready for the court at ${questState.quest.destinationName}.`
          : `${passengerName(questState.quest)} has reached ${questState.quest.destinationName}. ` +
            `Speak with the ${roleLabel} before they go ashore.`,
        feedback: session.feedback,
        options: [
          option(
            scriptedPassenger
              ? `Speak with ${roleLabel}`
              : `Set passenger ashore  ${questState.quest.reward} db`,
            scriptedPassenger
              ? { type: "open-passenger", quest: questState.quest }
              : { type: "complete-quest" }
          ),
          option("Back", { type: "node", nodeId: returnNodeId })
        ]
      };
    }
    return {
      speaker: speakerName(city),
      expressionId: "pleased",
      text: questState.quest.completionText
        ? `${questState.quest.completionText} Hand over the ${questState.quest.cargoLabel}, ` +
          `and I will pay ${questState.quest.reward} db.`
        : `That packet bears our seal. Hand it over and I will pay ${questState.quest.reward} db.`,
      feedback: session.feedback,
      options: [
        option(`Deliver ${questState.quest.cargoLabel || "packet"}  ${questState.quest.reward} db`, {
          type: "complete-quest"
        }),
        option("Back", { type: "node", nodeId: returnNodeId })
      ]
    };
  }
  if (questState.kind === "available") {
    return {
      speaker: speakerName(city),
      expressionId: "attentive",
      text: questState.quest.offerText ||
        `A sealed packet needs passage to ${questState.quest.destinationName}, ` +
        `${formatDistanceKm(questState.quest.distanceKm)} away. ` +
        `Payment is ${questState.quest.reward} db on delivery.`,
      feedback: session.feedback,
      options: [
        option(`Take ${questState.quest.cargoLabel || "packet"} to ${questState.quest.destinationName}`, {
          type: "accept-quest",
          quest: questState.quest
        }, {
          detail: formatDistanceKm(questState.quest.distanceKm)
        }),
        option("Back", { type: "node", nodeId: returnNodeId })
      ]
    };
  }
  if (questState.kind === "completed") {
    return {
      speaker: speakerName(city),
      expressionId: "pleased",
      text: "You already handled my packet. A clean account is rare enough that I remember it.",
      feedback: session.feedback,
      options: [
        option("Back", { type: "node", nodeId: returnNodeId })
      ]
    };
  }
  if (questState.kind === "unavailable") {
    return {
      speaker: speakerName(city),
      expressionId: "thoughtful",
      text: "No sealed packets are bound for our nearby ports right now.",
      feedback: session.feedback,
      options: [
        option("Back", { type: "node", nodeId: returnNodeId })
      ]
    };
  }
  const quest = questState.quest;
  if (isTeaRaceQuest(quest)) {
    const rivalText = quest.teaRaceFirstRivalArrivalMinute === undefined
      ? "Five rival captains are still racing west."
      : "A rival has already reached London, but the finishing premium remains.";
    return {
      speaker: speakerName(city),
      expressionId: questState.kind === "in-progress-here" ? "attentive" : "concerned",
      text: `The ten sealed tea chests are bound for London. ${rivalText}`,
      feedback: session.feedback,
      options: [option("Back", { type: "node", nodeId: returnNodeId })]
    };
  }
  if (quest.kind === "passenger" || isEnvoyQuest(quest)) {
    return {
      speaker: speakerName(city),
      expressionId: questState.kind === "in-progress-here" ? "attentive" : "concerned",
      text: questState.kind === "in-progress-here"
        ? `${passengerName(quest)} is waiting aboard for passage to ${quest.destinationName}.`
        : activeTravelMissionBusyText(quest),
      feedback: session.feedback,
      options: [
        option("Back", { type: "node", nodeId: returnNodeId })
      ]
    };
  }
  return {
    speaker: speakerName(city),
    expressionId: questState.kind === "in-progress-here" ? "stern" : "concerned",
    text: questState.kind === "in-progress-here"
      ? `The packet is bound for ${quest.destinationName}. Do not let it vanish into another captain's hold.`
      : `Finish your delivery from ${quest.originName} to ${quest.destinationName}; then I can talk work.`,
    feedback: session.feedback,
    options: [
      option("Back", { type: "node", nodeId: returnNodeId })
    ]
  };
}

function wokouHuntQuestView(session, questState, returnNodeId) {
  const quest = questState.quest;
  const back = option("Back", { type: "node", nodeId: returnNodeId });
  if (questState.kind === "available") {
    return {
      speaker: `${quest.originRulerName}'s coastal commissioner`,
      expressionId: "stern",
      text: quest.offerText,
      feedback: session.feedback,
      options: [
        option(`Accept: hunt wokou near ${quest.patrolName}`, {
          type: "accept-quest",
          quest
        }, { detail: `${quest.reward} db` }),
        back
      ]
    };
  }
  if (questState.kind === "ready-to-complete") {
    if (quest.captureCommissionResolution) {
      return recalledCaptureCommissionView(session, quest, back);
    }
    return {
      speaker: `${quest.originRulerName}'s coastal commissioner`,
      expressionId: "pleased",
      text: `The wokou vessel is broken and lawful shipping has one danger fewer. The court will honor its promise.`,
      feedback: session.feedback,
      options: [
        option(`Report the victory  ${quest.reward} db`, { type: "complete-quest" }),
        back
      ]
    };
  }
  return {
    speaker: `${quest.originRulerName}'s coastal commissioner`,
    expressionId: "stern",
    text: quest.stage === "return"
      ? `The wokou are defeated. Return to ${quest.originName} for the court's reward.`
      : `Patrol the waters near ${quest.patrolName}. Sink the marked wokou vessel or force its surrender. Pirates require no letter of marque.`,
    feedback: session.feedback,
    options: [back]
  };
}

function captureCommissionQuestView(session, questState, returnNodeId) {
  return isCaptureCapitalQuest(questState.quest)
    ? captureCapitalQuestView(session, questState, returnNodeId)
    : capturePortQuestView(session, questState, returnNodeId);
}

function captureCommissionPetitionView(session, city, gameState, portCities, context) {
  const simMinute = context.simMinute ?? 0;
  const ruler = rulerAtMinute(city.factionId, simMinute);
  if (!ruler) throw new Error(`Capture-commission petition has no ruler for ${city.factionId}`);
  const petitions = captureCommissionPetitionOptionsForCity(
    gameState,
    city,
    portCities,
    context
  );
  return {
    speaker: `${ruler.displayName}'s war secretary`,
    expressionId: "stern",
    text: "A letter of marque licenses prizes at sea; it does not grant the choice of a harbor. Name an enemy, or ask after an independent port. The council will judge the realm's need and name any target.",
    feedback: session.feedback,
    options: [
      ...petitions.map((petition) => option(
        petition.independentTarget
          ? "Ask after an independent harbor"
          : `Petition against ${petition.targetFactionNoun}`,
        {
          type: "petition-capture-commission",
          petitionTargetId: petition.petitionTargetId,
          targetFactionId: petition.targetFactionId
        },
        petition.available
          ? { detail: "The court will weigh your service, its claims, and the realm's need." }
          : {
              disabled: true,
              disabledReason: `The council has answered this petition. Return in ${Math.ceil(petition.cooldownRemainingMinutes / (24 * 60))} days.`
            }
      )),
      option("Back", { type: "node", nodeId: "root" })
    ]
  };
}

function captureCommissionPetitionResultView(session, city, gameState) {
  const result = session.captureCommissionPetitionResult;
  if (!result) throw new Error("Capture-commission petition result is missing");
  const ruler = rulerAtMinute(result.issuerFactionId, result.simMinute);
  if (!ruler) {
    throw new Error(`Capture-commission petition has no ruler for ${result.issuerFactionId}`);
  }
  const enemy = result.independentTarget ? null : factionById(result.targetFactionId);
  if (result.granted) {
    const quest = result.offer;
    return {
      speaker: `${ruler.displayName}'s war secretary`,
      expressionId: "stern",
      text: result.independentTarget
        ? `The council—not your company—has chosen ${quest.targetName}. No foreign sovereign is named and no war is proclaimed. ${ruler.displayName} grants a sealed warrant: take ${quest.targetName}, raise ${quest.originFactionAdjective} colors, and return for ${quest.reward.toLocaleString("en-US")} doubloons.`
        : `The council has heard your petition against ${factionNounPhrase(enemy.id)}. ${ruler.displayName} grants a warrant, but its object is fixed under seal: take ${quest.targetName}, raise ${quest.originFactionAdjective} colors, and return for ${quest.reward.toLocaleString("en-US")} doubloons.`,
      feedback: session.feedback,
      options: [
        option(`Accept the warrant: capture ${quest.targetName}`, {
          type: "accept-quest",
          quest
        }, {
          detail: `${formatDistanceKm(quest.distanceKm)}  ${quest.reward.toLocaleString("en-US")} db`
        }),
        option("Back", { type: "node", nodeId: "root" })
      ]
    };
  }
  const reputation = factionReputation(gameState, result.issuerFactionId);
  const proposedTarget = result.independentTarget
    ? "any independent harbor"
    : factionNounPhrase(enemy.id);
  return {
    speaker: `${ruler.displayName}'s war secretary`,
    expressionId: reputation >= 50 ? "attentive" : "stern",
    text: reputation >= 50
      ? `Your service is well spoken of, but the council will issue no warrant concerning ${proposedTarget} at present. Return when the campaign has altered.`
      : `No warrant shall issue concerning ${proposedTarget}. A captain may offer service, but the court chooses its objects. Return when your credit or the campaign has altered.`,
    feedback: session.feedback,
    options: [option("Return to the quay", { type: "node", nodeId: "root" })]
  };
}

function capturePortQuestView(session, questState, returnNodeId) {
  const quest = questState.quest;
  const back = option("Back", { type: "node", nodeId: returnNodeId });
  if (questState.kind === "available") {
    return {
      speaker: `${quest.originRulerName}'s war secretary`,
      expressionId: "stern",
      text: quest.independentTarget
        ? `The council has chosen the independent harbor of ${quest.targetName}; no foreign sovereign is named. By ${quest.originRulerName}'s sealed warrant, silence its batteries, take ${quest.targetName}, raise ${quest.originFactionAdjective} colors, and return for ${quest.reward.toLocaleString("en-US")} doubloons.`
        : `By ${quest.originRulerName}'s warrant: capture ${quest.targetName} from ${quest.targetFactionNoun}. Silence its batteries, land your company, and raise ${quest.originFactionAdjective} colors. Keep the spoils; return for ${quest.reward.toLocaleString("en-US")} doubloons.`,
      feedback: session.feedback,
      options: [
        option(`Accept commission: capture ${quest.targetName}`, {
          type: "accept-quest",
          quest
        }, {
          detail: `${formatDistanceKm(quest.distanceKm)}  ${quest.reward.toLocaleString("en-US")} db`
        }),
        back
      ]
    };
  }
  if (questState.kind === "ready-to-complete") {
    if (quest.captureCommissionResolution) {
      return recalledCaptureCommissionView(session, quest, back);
    }
    return {
      speaker: `${quest.originRulerName}'s war secretary`,
      expressionId: "pleased",
      text: `${quest.targetName} now answers to ${quest.originRulerName}. You silenced its guns and kept ` +
        `faith with your commission. The treasury will honor the crown's word.`,
      feedback: session.feedback,
      options: [
        option(`Report victory  ${quest.reward.toLocaleString("en-US")} db`, {
          type: "complete-quest"
        }),
        back
      ]
    };
  }
  if (questState.kind === "in-progress-here") {
    return {
      speaker: `${quest.originRulerName}'s war secretary`,
      expressionId: "stern",
      text: quest.independentTarget
        ? `The sealed warrant names ${quest.targetName}. The council chose the harbor; your charge is to break its batteries and take it, not to alter the terms.`
        : `The commission stands. Break the harbor batteries at ${quest.targetName}, land no fewer ` +
          `than a full company of marines, and leave the ${quest.originFactionAdjective} colors above the quay. ` +
          `Return only when the port is secured.`,
      feedback: session.feedback,
      options: [back]
    };
  }
  return {
    speaker: `${quest.originRulerName}'s war secretary`,
    expressionId: "stern",
    text: quest.stage === "return"
      ? quest.captureCommissionResolution
        ? `The commission for ${quest.targetName} has been recalled. Return to ${quest.originName} to close the account.`
        : `${quest.targetName} is taken. Carry the victory dispatches back to ${quest.originName}; the crown's debt must be settled there.`
      : quest.independentTarget
        ? `The sealed warrant names ${quest.targetName}. The council chose the harbor; your charge is to take it, not to alter the terms.`
        : `Your commission is to seize ${quest.targetName} from ${quest.targetFactionNoun}. Other business must wait upon that service.`,
    feedback: session.feedback,
    options: [back]
  };
}

function recalledCaptureCommissionView(session, quest, back) {
  const text = quest.captureCommissionResolution === "secured-by-allies"
    ? `${quest.targetName} was secured by allied forces. The commission is recalled, but the treasury will pay ${quest.reward.toLocaleString("en-US")} doubloons for your preparations.`
    : quest.captureCommissionResolution === "peace-signed"
      ? `Peace was signed before you could take ${quest.targetName}. The commission is recalled, but the treasury will pay ${quest.reward.toLocaleString("en-US")} doubloons for your preparations.`
      : quest.captureCommissionResolution === "issuer-fallen"
        ? `The court that issued the commission has fallen. Its remaining officers will honor ${quest.reward.toLocaleString("en-US")} doubloons of your retainer and close the account.`
        : `${quest.targetName} changed hands, leaving no lawful target. The treasury will pay ${quest.reward.toLocaleString("en-US")} doubloons for your preparations.`;
  return {
    speaker: `${quest.originRulerName}'s war secretary`,
    expressionId: "attentive",
    text,
    feedback: session.feedback,
    options: [
      option(`Close recalled commission  ${quest.reward.toLocaleString("en-US")} db`, {
        type: "complete-quest"
      }),
      back
    ]
  };
}

function captureCapitalQuestView(session, questState, returnNodeId) {
  const quest = questState.quest;
  const back = option("Back", { type: "node", nodeId: returnNodeId });
  const politicalContext = captureCapitalPoliticalContext(
    quest.originFactionId,
    quest.targetFactionId
  );
  if (questState.kind === "available") {
    return {
      speaker: `${quest.originRulerName}'s war secretary`,
      expressionId: "stern",
      text: `The war against ${quest.targetFactionNoun} is nearly won. ${politicalContext} Take ` +
        `${quest.targetName} in ${quest.originRulerName}'s name and hold its court for the commissioners ` +
        `who will press the terms. Keep the spoils; ` +
        `return for ${quest.reward.toLocaleString("en-US")} doubloons.`,
      feedback: session.feedback,
      options: [
        option(`Accept final commission: capture ${quest.targetName}`, {
          type: "accept-quest",
          quest
        }, {
          detail: `${formatDistanceKm(quest.distanceKm)}  ${quest.reward.toLocaleString("en-US")} db`
        }),
        back
      ]
    };
  }
  if (questState.kind === "ready-to-complete") {
    if (quest.captureCommissionResolution) {
      return recalledCaptureCommissionView(session, quest, back);
    }
    return {
      speaker: `${quest.originRulerName}'s war secretary`,
      expressionId: "pleased",
      text: `${quest.targetName} has fallen. The commissioners brought its court to terms, and the ` +
        `princes and envoys sealed peace. The treasury will honor ` +
        `${quest.originRulerName}'s extraordinary commission.`,
      feedback: session.feedback,
      options: [
        option(`Report final victory  ${quest.reward.toLocaleString("en-US")} db`, {
          type: "complete-quest"
        }),
        back
      ]
    };
  }
  if (questState.kind === "in-progress-here") {
    return {
      speaker: `${quest.originRulerName}'s war secretary`,
      expressionId: "stern",
      text: `This is the final stroke. Break ${quest.targetName}'s batteries, land your marines, and ` +
        `hold the enemy court for our commissioners. They—not your company—will present the terms.`,
      feedback: session.feedback,
      options: [back]
    };
  }
  return {
    speaker: `${quest.originRulerName}'s war secretary`,
    expressionId: "stern",
    text: quest.stage === "return"
      ? quest.captureCommissionResolution
        ? `The final commission for ${quest.targetName} has been recalled. Return to ${quest.originName} to close the account.`
        : `${quest.targetName} has submitted to the commissioners and the rulers have sealed peace. Carry the final dispatches to ${quest.originName}.`
      : `The enemy is nearly spent. Your final commission is to take ${quest.targetName} and hold its court until the commissioners arrive.`,
    feedback: session.feedback,
    options: [back]
  };
}

function activeTravelMissionBusyText(quest) {
  const traveler = passengerName(quest);
  if (!isEnvoyQuest(quest)) {
    return `You are carrying ${traveler} from ${quest.originName} to ${quest.destinationName}; finish that passage first.`;
  }
  if (quest.stage === "outbound") {
    return `${traveler} is aboard on an embassy from ${quest.originName} to ${quest.targetName}; finish that mission first.`;
  }
  if (quest.stage === "return") {
    return `${traveler} is aboard, returning from ${quest.targetName} to ${quest.originName}; finish that embassy first.`;
  }
  throw new Error(`Unknown envoy mission stage: ${quest.stage ?? "missing"}`);
}

function marqueView(session, city, gameState, context) {
  const status = letterOfMarqueStatus(gameState, city, context.shipPower || 0);
  if (!status.available) {
    return {
      speaker: speakerName(city),
      expressionId: "stern",
      text: status.reason,
      feedback: session.feedback,
      options: [
        option("Back", { type: "node", nodeId: "root" })
      ]
    };
  }
  const ruler = rulerAtMinute(status.factionId, context.simMinute ?? 0);
  if (!ruler) throw new Error(`Letter of marque faction has no ruler: ${status.factionId}`);
  const newlyGranted = session.marqueGrantedFactionId === status.factionId;
  const text = newlyGranted
    ? `${ruler.displayName} grants you authority to prize enemies of ${factionNounPhrase(status.factionId)}.`
    : status.granted
    ? `You already carry ${ruler.displayName}'s authority to prize enemies of ${factionNounPhrase(status.factionId)}.`
    : `${ruler.displayName}'s court requires sufficient standing and ship strength. Standing ${formatSignedReputation(status.reputation)}/${formatSignedReputation(status.reputationRequired)}. Strength ${Math.round(status.shipPower)}/${status.shipPowerRequired}.`;
  const disabledReason = status.missing.length > 0
    ? `Need ${status.missing.join(" and ")}.`
    : null;
  return {
    speaker: speakerName(city),
    expressionId: status.granted ? "pleased" : status.eligible ? "attentive" : "stern",
    text,
    feedback: session.feedback,
    options: [
      option("Request letter of marque", { type: "request-marque" }, {
        disabled: status.granted || !status.eligible,
        disabledReason: status.granted ? "Already granted." : disabledReason
      }),
      option("Back", { type: "node", nodeId: "root" })
    ]
  };
}

function tradePassView(session, city, gameState, context) {
  if (typeof session.tradePassPolicyId !== "string" || session.tradePassPolicyId === "") {
    throw new Error("Trade pass dialogue requires a sovereign trade policy");
  }
  const status = personalTradePassStatus(
    gameState,
    city,
    session.tradePassPolicyId,
    context.simMinute ?? 0
  );
  if (!status.available) {
    return {
      speaker: speakerName(city),
      expressionId: "stern",
      text: status.reason,
      feedback: null,
      options: [option("Back", { type: "node", nodeId: "root" })]
    };
  }
  const newlyGranted = session.tradePassGrantedPolicyId === status.policyId;
  const text = newlyGranted
    ? status.policy.permitGrant
    : status.granted
    ? `You already carry a ${status.policy.permitLabel} issued in your name by ${status.policy.permitAuthority}.`
    : `${status.policy.permitPetition} Standing ${formatSignedReputation(status.reputation)}/${formatSignedReputation(status.reputationRequired)}.`;
  const disabledReason = status.missing.length > 0
    ? `Need ${status.missing.join(" and ")}.`
    : null;
  return {
    speaker: speakerName(city),
    expressionId: status.granted ? "pleased" : status.eligible ? "attentive" : "stern",
    text,
    feedback: null,
    options: [
      option(`Request ${status.policy.permitLabel}`, {
        type: "request-trade-pass",
        policyId: status.policyId
      }, {
        disabled: status.granted || !status.eligible,
        disabledReason: status.granted ? "Already issued." : disabledReason
      }),
      option("Back", { type: "node", nodeId: "root" })
    ]
  };
}

function option(label, action, details = {}) {
  const entry = {
    label,
    action,
    detail: details.detail || null,
    disabled: !!details.disabled,
    disabledReason: details.disabledReason || null,
    iconId: details.iconId || null,
    rowId: details.rowId || null
  };
  if (details.detailTone !== undefined) entry.detailTone = details.detailTone;
  if (details.emphasis !== undefined && details.emphasis !== null) {
    if (!["quest-cargo", "quest-cargo-danger"].includes(details.emphasis)) {
      throw new Error(`Unknown dialogue option emphasis: ${details.emphasis}`);
    }
    entry.emphasis = details.emphasis;
  }
  if (details.placement !== undefined) entry.placement = details.placement;
  return entry;
}

function deliveryOptionLabel(goodLabel, deliverableQuantity) {
  if (typeof goodLabel !== "string" || goodLabel.trim() === "") {
    throw new Error("Quest delivery option requires a good label");
  }
  if (!Number.isInteger(deliverableQuantity) || deliverableQuantity < 0) {
    throw new Error(`Invalid quest delivery option quantity: ${deliverableQuantity}`);
  }
  return deliverableQuantity > 0
    ? `Deliver ${goodLabel} x${deliverableQuantity}`
    : `Deliver ${goodLabel}`;
}

function signedDoubloons(value) {
  const rounded = Math.round(value);
  return `${rounded >= 0 ? "+" : ""}${rounded} db`;
}

function colonizationLedgerKey(target) {
  return `colony-${target.city}-${target.country}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function improveColonizationSponsorRelations(gameState, quest, simMinute) {
  const sponsorFactionId = quest.target.originFactionId;
  const approvingFactionId = quest.target.approvalFactionId;
  if (!sponsorFactionId || !approvingFactionId || sponsorFactionId === approvingFactionId) return [];

  const diplomacy = gameState.relations.diplomacy;
  const relation = worldDiplomacyBetween(diplomacy, sponsorFactionId, approvingFactionId);
  if (relation === DIPLOMACY_FRIENDLY || relation === DIPLOMACY_ALLY) return [];

  return adjustDiplomaticStance(
    diplomacy,
    sponsorFactionId,
    approvingFactionId,
    "improve",
    simMinute,
    { eventReason: `${colonizationLedgerKey(quest.target)}-agreement` }
  );
}

function colonizationApprovalCargoSummary(requirements) {
  if (!Array.isArray(requirements) || requirements.length === 0) return "the promised trade samples";
  return joinWithAnd(requirements.map((requirement) => (
    `${requirement.quantity} ${requirement.goodLabel.toLowerCase()}`
  )));
}

function colonizationMissingApprovalCargo(requirements) {
  if (!Array.isArray(requirements)) throw new Error("Colonization approval cargo must be an array");
  return joinWithAnd(requirements
    .filter((requirement) => requirement.missing > 0)
    .map((requirement) => `${requirement.missing} ${requirement.goodLabel.toLowerCase()}`));
}

function joinWithAnd(parts) {
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts.at(-1)}`;
}

export function worldPriceIndicator(comparison) {
  if (comparison.direction === "high") return `${Math.abs(comparison.percent)}% ABOVE WORLD`;
  if (comparison.direction === "low") return `${Math.abs(comparison.percent)}% BELOW WORLD`;
  if (comparison.direction === "fair") return "= WORLD PRICE";
  throw new Error(`Unknown world price direction: ${comparison.direction}`);
}

function marketStockIndicator(stock) {
  return `STOCK ${Math.floor(stock)}`;
}

function marketCargoSpaceIndicator(totalSize) {
  return `SPACE ${totalSize} EACH`;
}

function marketProfitIndicator(pnlLabel) {
  return `P/L ${pnlLabel}`;
}

function marketHeldIndicator(heldLots) {
  return `HELD ${heldLots}`;
}

function formatDistanceKm(distanceKm) {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return "unknown distance";
  return `${Math.round(distanceKm).toLocaleString("en-US")} km`;
}

function feedbackExpressionId(feedback) {
  if (!feedback) return "neutral";
  if (/bought|sold|earned|accepted|granted|delivered/i.test(feedback)) return "pleased";
  if (/not available|not enough|out of|full|need /i.test(feedback)) return "concerned";
  return "neutral";
}

function shipCargoManifest(cargo) {
  const rows = Object.entries(cargo || {})
    .filter(([, quantity]) => quantity > 0)
    .map(([goodId, quantity]) => {
      const good = tradeGoodById(goodId);
      if (!Number.isInteger(quantity)) {
        throw new Error(`NPC ship cargo must use whole trade lots: ${good.id} ${quantity}`);
      }
      return `${good.label} x${quantity}`;
    });
  if (rows.length === 0) return "";
  if (rows.length <= 2) return rows.join(" and ");
  return `${rows.slice(0, 2).join(", ")}, and other goods`;
}

function surrenderPrizeCargo(cargo, label) {
  if (!cargo || typeof cargo !== "object" || Array.isArray(cargo)) {
    throw new Error(`Surrender prize requires a valid ${label} cargo manifest`);
  }
  const manifest = {};
  for (const [goodId, quantity] of Object.entries(cargo)) {
    tradeGoodById(goodId);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error(`Surrender prize has invalid ${label} cargo: ${goodId} ${quantity}`);
    }
    manifest[goodId] = quantity;
  }
  return Object.freeze(manifest);
}

function speakerName(city) {
  return city.isPirateHideout
    ? `${characterName(city.character)}, keeper of ${cityLabel(city)}`
    : city.settlementType === "village"
      ? `${characterName(city.character)}, trader of ${cityLabel(city)}`
    : `${characterName(city.character)}, ${cityLabel(city)} factor`;
}

function passengerName(quest) {
  return quest?.passenger?.name || quest?.passengerName || "Passenger";
}

function characterName(character) {
  if (!character || typeof character.name !== "string" || character.name.trim() === "") {
    throw new Error("Dialogue character has no generated name");
  }
  return character.name;
}

function questExpressionId(quest) {
  if (quest?.kind === "friendly-envoy") return "attentive";
  if (quest?.kind === "hostile-envoy") return "stern";
  if (isEnvoyQuest(quest)) return "attentive";
  if (quest?.scenarioId === "shipwrecked-sailor") return "afraid";
  if (quest?.scenarioId === "return-home" || quest?.scenarioId === "family-letter") return "sad";
  if (quest?.scenarioId === HAJJ_PASSENGER_SCENARIO_ID) return "attentive";
  if (isReligiousPassengerQuest(quest)) return "attentive";
  return "neutral";
}

function neverGrantMissionItem() {
  return 1 - Number.EPSILON;
}

function portFlavor(city, gameState, context, visitCount) {
  if (!Number.isInteger(visitCount) || visitCount < 0) {
    throw new Error(`Port flavor requires a non-negative visit count: ${visitCount}`);
  }
  const effectiveVisitCount = Math.max(1, visitCount);
  const playerShipSlug = context.playerShipSlug || gameState.ship?.slug || null;
  return portArrivalPresentation({
    city,
    playerShipSlug,
    playerShipLabel: playerShipSlug ? shipLabelForSlug(playerShipSlug) : "vessel",
    returning: effectiveVisitCount > 1,
    navigation: context.arrivalNavigation || null,
    variationKey: `${effectiveVisitCount}|${context.dayIndex ?? 0}`
  });
}
