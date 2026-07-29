import {
  FACTION_SAFE_PASSAGE_DAYS,
  PORT_NAVIGATION_REASON_NEW_SHIP,
  PORT_NAVIGATION_REASON_TRADE_PRICE,
  acknowledgePlayerPortCustomsNotice,
  acceptQuest,
  adjustFactionReputation,
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
  cityLabel,
  completeQuest,
  deliverQuestCargoRequirement,
  enterSpecialEquipmentStore,
  futurePermanentCrewFloor,
  grantLetterOfMarque,
  issuePersonalTradePass,
  isCaptureCapitalQuest,
  isCaptureCommissionQuest,
  isEnvoyQuest,
  letterOfMarqueStatus,
  maybeGrantMissionPerkItem,
  negotiateEnvoyQuest,
  portMemory,
  portEntryStatus,
  playerShipReplacementCargoUsed,
  playerCannonEquipment,
  playerFishingNet,
  personalTradePassStatus,
  personalTradePassStatuses,
  playerPortCustomsNotice,
  playerWhaleHarpoon,
  playerTradeAccess,
  playerTradeTerms,
  portugueseCartazStatus,
  purchasePortugueseCartaz,
  purchaseCannonEquipment,
  purchaseFishingNet,
  purchasePerkItem,
  purchaseWhaleHarpoon,
  questStateForCity,
  receiveQuestPayment,
  releaseCargoSpace,
  reserveCargoSpace,
  restockCustomShipLoadoutAtPort,
  restockShipLoadoutAtPort,
  sellGood
} from "./gameState.js";
import { captureCapitalPoliticalContext } from "./captureCommissionDialogue.js";
import {
  FRESH_WATER_GOOD_ID,
  GINGER_GOOD_ID,
  HARDTACK_GOOD_ID,
  MATCHLOCKS_GOOD_ID,
  establishPortIndustry,
  maximumPortPurchaseQuantity,
  portEconomySummary,
  portMarket,
  quotePortPurchase,
  quotePortSale,
  tradeGoodById,
  worldMarketPriceComparison
} from "./economy.js";
import {
  DIPLOMACY_ALLY,
  DIPLOMACY_FRIENDLY,
  DIPLOMACY_HOSTILE,
  DIPLOMACY_NEUTRAL,
  factionById,
  factionNounPhrase
} from "./factions.js";
import { adjustDiplomaticStance, worldDiplomacyBetween } from "./worldDiplomacy.js";
import { rulerAtMinute } from "./rulers.js";
import { portGreetingPresentationForPersonality, portPersonalityForKey } from "./portDialoguePersonality.js";
import {
  occasionalReligiousGreeting,
  protestantColonistReception
} from "./religiousDialogue.js";
import { religionById } from "./characterReligion.js";
import {
  activeForeignSettlements,
  expelledForeignSettlements
} from "./foreignSettlements.js";
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
import { shipLabelForSlug, shipStatsForSlug } from "./shipStats.js";
import { shipHandoverHistoryForSlug } from "./shipHandoverDialogue.js";
import {
  shipReplacementTermsWithoutTradeIn,
  shipyardPurchaseTerms
} from "./shipyards.js";
import { FISHING_NETS } from "./fishingNets.js";
import { CANNON_EQUIPMENT } from "./cannonEquipment.js";
import { WHALE_HARPOONS } from "./whaleHarpoons.js";
import {
  EQUIPMENT_STOCK_CANNON,
  EQUIPMENT_STOCK_FISHING_NET,
  EQUIPMENT_STOCK_WHALE_HARPOON,
  equipmentSpecialistAtPort,
  equipmentStockAtPort
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
  resolveSovereignIllicitMarketAttempt,
  sovereignTradePolicyById
} from "./sovereignTradeAccess.js";
import {
  PORTUGUESE_CARTAZ_DURATION_DAYS,
  isPortugueseEstadoPort
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

export function createPortDialogueSession(city, options = {}) {
  if (options.rumorText !== undefined && (typeof options.rumorText !== "string" || options.rumorText === "")) {
    throw new Error("Port rumor text must be a non-empty string");
  }
  if (options.drunkVariant !== undefined && (!Number.isInteger(options.drunkVariant) || options.drunkVariant < 0)) {
    throw new Error(`Invalid drunk port dialogue variant: ${options.drunkVariant}`);
  }
  return {
    kind: "port",
    cityTileId: city.tileId,
    portId: city.portId || `city-${city.tileId}`,
    nodeId: options.initialNodeId || "greeting",
    admittedToPort: options.admittedToPort === true,
    disguisedEntry: options.disguisedEntry === true,
    illicitTradeAccessPolicyId: options.illicitTradeAccessPolicyId || null,
    illicitTradeAttemptedPolicyId: options.illicitTradeAttemptedPolicyId || null,
    nextPortNodeId: options.nextPortNodeId || null,
    postDrunkNodeId: options.postDrunkNodeId || null,
    drunkVariant: options.drunkVariant || 0,
    marketPurchases: {},
    marketSales: 0,
    marketBuyGoodIds: [],
    marketSaleGoodIds: [],
    tradeTip: null,
    shipHandover: null,
    specialEquipmentOffer: null,
    rumorText: options.rumorText || null,
    colonizationArrival: options.colonizationArrival === true,
    japaneseMatchlockArrival: options.japaneseMatchlockArrival === true,
    caribbeanGingerArrival: options.caribbeanGingerArrival === true,
    chefQuestArrival: options.chefQuestArrival === true,
    vikingLongshipArrival: options.vikingLongshipArrival === true,
    colonizationApprovalStep: 0,
    marqueGrantedFactionId: null,
    tradePassPolicyId: null,
    tradePassGrantedPolicyId: null,
    customsNoticeKey: null,
    selectedIndex: 0,
    feedback: null
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
    if (options.questCharacterSession.cityTileId !== city.tileId) {
      throw new Error("Port-arrival quest character does not belong to this city");
    }
    const nextPortNodeId = needsLoadout ? "loadout" : "greeting";
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
  if (isCaptureCommissionQuest(state.quest)) {
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
    cityTileId: city.tileId,
    questId: quest.id,
    admittedToPort: options.admittedToPort === true,
    continueToPortOnClose: options.continueToPortOnClose === true,
    nextPortNodeId: options.nextPortNodeId || null,
    envoyNegotiationResult: null,
    selectedIndex: 0,
    feedback: null
  };
}

export function createShipDialogueSession(
  ship,
  {
    attackReason = null,
    rumorText = null,
    cartazInspection = null,
    listenerReligionId = null,
    pirateTreasureName = null
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
  if (listenerReligionId !== null) religionById(listenerReligionId);
  if (pirateTreasureName !== null &&
      (typeof pirateTreasureName !== "string" || pirateTreasureName.trim() === "")) {
    throw new Error("Pirate treasure dialogue requires a captain name");
  }
  return {
    kind: "ship",
    npcShipId: ship.id,
    nodeId: cartazInspection ? "cartaz-inspection" : "root",
    selectedIndex: 0,
    attackReason,
    piracyWarningAccepted: false,
    pendingPiracyAction: null,
    rumorText,
    cartazInspection,
    listenerReligionId,
    pirateTreasureName
  };
}

export function prepareSurrenderPrizeDialogue(session, ship, currentShip, loot = {}) {
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

export function createShoreBatteryDialogueSession(city, context = {}) {
  if (!city?.character) throw new Error("Shore battery hail requires a city character");
  if (context.relation !== "hostile" && context.relation !== "war") {
    throw new Error(`Shore battery hail requires hostile diplomacy: ${context.relation}`);
  }
  if (typeof context.playerWarship !== "boolean") throw new Error("Shore battery hail requires ship classification");
  if (!context.playerWarship && (!Number.isInteger(context.toll) || context.toll <= 0)) {
    throw new Error(`Invalid shore battery passage toll: ${context.toll}`);
  }
  const ruler = rulerAtMinute(city.factionId, context.simMinute ?? 0);
  if (!ruler) throw new Error(`Shore battery faction has no ruler: ${city.factionId}`);
  return {
    kind: "shore-battery",
    cityTileId: city.tileId,
    portId: city.portId || `city-${city.tileId}`,
    selectedIndex: 0,
    relation: context.relation,
    playerWarship: context.playerWarship,
    rulerName: ruler.displayName,
    toll: context.playerWarship ? null : context.toll,
    canAffordToll: context.playerWarship ? false : context.canAffordToll === true
  };
}

export function shoreBatteryDialogueView(session, city) {
  if (!session || session.kind !== "shore-battery" || session.cityTileId !== city?.tileId) {
    throw new Error("Shore battery dialogue city does not match active session");
  }
  const faction = factionById(city.factionId);
  if (session.playerWarship) {
    const atWar = session.relation === "war";
    return {
      speaker: `${characterName(city.character)}, ${city.city}`,
      expressionId: "angry",
      text: atWar
        ? `By order of ${session.rulerName}, ${faction.name} is at war with your flag. Armed vessels will be fired upon.`
        : `By order of ${session.rulerName}, ${faction.name} denies passage to your armed vessel. Turn away.`,
      feedback: null,
      options: [option(atWar ? "To arms" : "Turn away", { type: "close" })]
    };
  }
  return {
    speaker: `${characterName(city.character)}, ${city.city}`,
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

function safePassageDurationLabel() {
  return FACTION_SAFE_PASSAGE_DAYS === 30 ? "one month" : `${FACTION_SAFE_PASSAGE_DAYS} days`;
}

export function selectShoreBatteryDialogueOption(session, city, optionIndex = session.selectedIndex) {
  const view = shoreBatteryDialogueView(session, city);
  const selected = view.options[optionIndex];
  if (!selected) throw new Error(`Invalid shore battery dialogue option index: ${optionIndex}`);
  if (selected.disabled) throw new Error(selected.disabledReason || "Shore battery option is unavailable");
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
      feedback: null,
      options: [
        option("Back down", { type: "close" }),
        option(piracyProceedLabel(session.pendingPiracyAction), { type: "confirm-piracy" })
      ]
    };
  }
  if (session.nodeId === "surrender-offer") {
    return {
      speaker,
      expressionId: "afraid",
      text: "We cannot outrun or outfight you. Spare the crew, and we will surrender our cargo and coin.",
      feedback: null,
      options: [
        option("Accept surrender", { type: "surrender" }),
        option("Refuse and attack", { type: "attack" })
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
    return {
      speaker,
      expressionId: "angry",
      text: "You will have no easy prize from us. Stand off.",
      feedback: null,
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
            key: `ship:${ship.id}|${ship.character.id || ship.character.name}`
          }) || "Fair winds, captain."
        : "Fair winds, captain.";
  const expressionId = ship.stormStatus
    ? "concerned"
    : role === "Pirate"
      ? "stern"
      : role === "Warship"
        ? "attentive"
        : "neutral";
  return {
    speaker,
    expressionId,
    text: `${greeting}${storm}${voyage}${cargo}${workingGear}`,
    feedback: null,
    options: [
      ...(ship.canOfferEmergencyAid
        ? [option("Ask for provisions", { type: "receive-aid" })]
        : []),
      ...(!ship.combatGrace && !ship.inCombatWithPlayer
        ? [option("Demand surrender", { type: "threaten" })]
        : []),
      option("Leave", { type: "close" })
    ]
  };
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
    text: "Heave to for the Estado da India. Your vessel carries no valid Portuguese cartaz. " +
      "Purchase a license, settle the fine, surrender controlled spice cargo, or answer to our guns.",
    feedback: null,
    options: [
      ...(inspection.permitFee !== null
        ? [option(`Buy cartaz  ${inspection.permitFee} db`, { type: "buy-cartaz-at-sea" }, {
          disabled: !inspection.canAffordPermit,
          disabledReason: "Not enough doubloons."
        })]
        : []),
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
  if (selected.disabled) throw new Error(selected.disabledReason || "Ship dialogue option is unavailable");
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
  if (
    action.type === "buy-cartaz-at-sea" ||
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
  return isHostileShipAction(action.type) &&
    ship.playerAttackIsPiracy === true &&
    session.piracyWarningAccepted !== true;
}

function isHostileShipAction(actionType) {
  return actionType === "threaten" || actionType === "surrender" || actionType === "attack";
}

function piracyProceedLabel(actionType) {
  if (actionType === "threaten") return "Demand surrender anyway";
  if (actionType === "surrender") return "Take prize anyway";
  if (actionType === "attack") return "Attack anyway";
  return "Proceed anyway";
}

export function portDialogueView(session, city, gameState, economy, portCities, context = {}) {
  if (!session || session.kind !== "port") throw new Error("Missing port dialogue session");
  if (session.cityTileId !== city.tileId) throw new Error("Dialogue city does not match active session");

  return withPortExitFooter(portDialogueNodeView(session, city, gameState, economy, portCities, context));
}

export function beginShipHandoverDialogue(session, { shipSlug, transactionText, sellerTitle }) {
  if (!session || session.kind !== "port") throw new Error("Ship handover requires a port dialogue session");
  shipStatsForSlug(shipSlug);
  if (typeof transactionText !== "string" || transactionText.trim() === "") {
    throw new Error("Ship handover requires a transaction message");
  }
  if (typeof sellerTitle !== "string" || sellerTitle.trim() === "") {
    throw new Error("Ship handover requires a seller title");
  }
  session.shipHandover = { shipSlug, transactionText: transactionText.trim(), sellerTitle: sellerTitle.trim() };
  session.nodeId = "ship-handover";
  session.selectedIndex = 0;
  session.feedback = null;
}

function portDialogueNodeView(session, city, gameState, economy, portCities, context) {
  if (session.nodeId === "drunk-captain") return drunkCaptainArrivalView(session, gameState);
  if (session.nodeId === "drunk-factor") return drunkFactorArrivalView(session, city, gameState);
  if (session.nodeId === "greeting") return greetingView(session, city, gameState, context);
  if (session.nodeId === "recovering") return recoveringPortView(city, context);
  if (session.nodeId === "barred") return barredPortView(city, context);
  if (session.nodeId === "disguise-success") return disguiseSuccessView(session, city);
  if (session.nodeId === "disguise-failed") return disguiseFailureView(city, context);
  if (session.nodeId === "root") return rootView(session, city, gameState, economy, context);
  if (session.nodeId === "portuguese-cartaz") {
    return portugueseCartazView(session, city, gameState, context);
  }
  if (session.nodeId === "buy") return buyView(session, city, gameState, economy, context);
  if (session.nodeId === "trade-tip") return tradeTipView(session, city);
  if (session.nodeId === "equipment") return equipmentView(session, city, gameState, economy);
  if (session.nodeId === "equipment-nets") return fishingNetView(session, city, gameState, economy);
  if (session.nodeId === "equipment-cannons") return cannonEquipmentView(session, city, gameState, economy);
  if (session.nodeId === "equipment-harpoons") return whaleHarpoonView(session, city, gameState, economy);
  if (session.nodeId === "equipment-special-offer") {
    return specialEquipmentOfferView(session, city, gameState);
  }
  if (session.nodeId === "sell") return sellView(session, city, gameState, economy);
  if (session.nodeId === "cargo") return cargoView(session, city, gameState);
  if (session.nodeId === "quest") return questView(session, city, gameState, portCities);
  if (session.nodeId === "marque") return marqueView(session, city, gameState, context);
  if (session.nodeId === "trade-pass") return tradePassView(session, city, gameState, context);
  if (session.nodeId === "loadout") return loadoutView(session, city, gameState, context);
  if (session.nodeId === "custom-loadout") return customLoadoutView(session, city, gameState, context);
  if (session.nodeId === "ship-handover") return shipHandoverView(session, city);
  if (session.nodeId === "shipyard") return shipyardView(session, city, gameState, context);
  if (session.nodeId === "viking-longship") return vikingLongshipView(session, city, gameState, context);
  if (session.nodeId === "japanese-matchlocks") {
    return japaneseMatchlockView(session, city, gameState);
  }
  if (session.nodeId === "caribbean-ginger") {
    return caribbeanGingerView(session, city, gameState);
  }
  if (session.nodeId === "chef-quest") return chefQuestView(session, city, gameState);
  if (session.nodeId === "colonization") return colonizationView(session, city, gameState, context);
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
    text: `We are still recovering after ${recovery.attackerShipLabel} bombarded ${cityLabel(city)} and silenced the harbor guns. Fires are still being put out, and the quays will remain closed for ${dayLabel}. You must put back to sea.`,
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
    const isExit = entry.label === "Back" || entry.action.type === "close";
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
    const consumesRumorContinuation = session.nodeId === "greeting" &&
      session.rumorText !== null &&
      action.nodeId === (session.nextPortNodeId || "root");
    if (consumesRumorContinuation) {
      session.rumorText = null;
      session.nextPortNodeId = null;
    }
    if (action.nodeId === "buy") session.marketPurchases = {};
    if (action.nodeId === "sell") session.marketSales = 0;
    if (action.nodeId === "colonization") markColonizationOrganizerApproached(gameState);
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
    if (session.nodeId === "ship-handover") session.shipHandover = null;
    if (session.nodeId === "marque" && action.nodeId !== "marque") {
      session.marqueGrantedFactionId = null;
    }
    if (session.nodeId === "trade-pass" && action.nodeId !== "trade-pass") {
      session.tradePassPolicyId = null;
      session.tradePassGrantedPolicyId = null;
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
    session.selectedIndex = 0;
    session.feedback = null;
    return { closed: false };
  }
  if (action.type === "leave-buy") {
    const tip = bestPurchasedTradeRoute({
      purchases: session.marketPurchases,
      originCity: city,
      gameState,
      economy,
      portCities,
      simMinute: context.simMinute ?? 0,
      sailingDistanceKm: context.sailingDistanceKm
    });
    session.marketPurchases = {};
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
    if (typeof action.destinationName !== "string" || action.destinationName.trim() === "") {
      throw new Error("Port heading requires a destination name");
    }
    if (typeof action.nextNodeId !== "string" || action.nextNodeId === "") {
      throw new Error("Port heading requires a return dialogue node");
    }
    if (typeof action.reason !== "string" || action.reason.trim() === "") {
      throw new Error("Port heading requires a reason");
    }
    if (session.nodeId === "trade-tip") session.tradeTip = null;
    session.nodeId = action.nextNodeId;
    session.selectedIndex = 0;
    session.feedback = `Heading set for ${action.destinationName}.`;
    return {
      closed: false,
      action: {
        type: "set-port-heading",
        destinationTileId: action.destinationTileId,
        destinationName: action.destinationName,
        reason: action.reason
      }
    };
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
  if (action.type === "attempt-restricted-illicit-trade") {
    if (typeof context.random !== "function") {
      throw new Error("Restricted illicit market attempt requires a random source");
    }
    const policy = sovereignTradePolicyById(action.policyId);
    const currentAccess = playerPortTradeAccess(session, city, gameState, context);
    if (currentAccess.policyId !== policy.id || currentAccess.allowed) {
      throw new Error(`Illicit market action does not match the closed port policy: ${policy.id}`);
    }
    if (session.illicitTradeAttemptedPolicyId === policy.id) {
      throw new Error(`${policy.label} illicit market may only be approached once per port visit`);
    }
    session.illicitTradeAttemptedPolicyId = policy.id;
    if (resolveSovereignIllicitMarketAttempt(policy.id, context.random())) {
      session.illicitTradeAccessPolicyId = policy.id;
      session.feedback = "A discreet broker agrees to handle your cargo until you leave port.";
    } else {
      adjustFactionReputation(
        gameState,
        policy.hostFactionId,
        -policy.illicitMarketReputationPenalty
      );
      const faction = factionById(policy.hostFactionId);
      session.feedback = `The broker reports you to the harbor watch. ${faction.adjective} standing fell.`;
    }
    session.selectedIndex = 0;
    return {
      closed: false,
      illicitMarketAccessPolicyId: session.illicitTradeAccessPolicyId
    };
  }
  if (action.type === "purchase-ship") {
    return { closed: false, action };
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
      ? `Delivered the last ${result.quantity} ${result.activeStage.goodLabel.toLowerCase()}. ` +
        `${result.activeStage.goodLabel} requirement complete.`
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
    if (missionItemGift) session.feedback += ` Your host also gifts you ${missionItemGift.item.label}.`;
    session.selectedIndex = 0;
    return { closed: false, vikingLongshipDelivery: result, missionItemGift };
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
      const missing = updated.ingredients
        .filter((ingredient) => !ingredient.ready)
        .map((ingredient) => ingredient.label)
        .join(", ");
      session.feedback = `Delivered ${deliveries.map((entry) => entry.good.label).join(", ")}. ` +
        `Still need: ${missing}.`;
      session.selectedIndex = 0;
      return { closed: false, chefIngredientDeliveries: deliveries };
    }
    const result = completeChefBanquet(gameState, city, context.simMinute ?? 0);
    const payment = receiveQuestPayment(
      gameState,
      city,
      CHEF_QUEST_REWARD,
      `${result.event.eventLabel} provisions`,
      context
    );
    session.feedback = `${result.event.successText} The household paid ${payment.amount} db.`;
    session.selectedIndex = 0;
    return { closed: false, chefBanquetCompleted: result, chefIngredientDeliveries: deliveries, payment };
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
    if (missionItemGift) session.feedback += ` The gunsmith presents you with ${missionItemGift.item.label}.`;
    session.selectedIndex = 0;
    return {
      closed: false,
      japaneseMatchlockDelivery: delivery,
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
      if (missionItemGift) {
        session.feedback += ` The planter adds ${missionItemGift.item.label} to your reward.`;
      }
    } else {
      session.feedback = `Delivered ${stage.goodLabel} x${delivery.quantity}. ` +
        `${delivery.remainingQuantity} still needed.`;
    }
    session.selectedIndex = 0;
    return {
      closed: false,
      caribbeanGingerDelivery: delivery,
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
      session.feedback = `Delivered the last ${delivery.quantity} ` +
        `${stage.goodLabel.toLowerCase()}. Paid ${payment.amount} db.`;
    } else {
      session.feedback = `Delivered ${stage.goodLabel} x${delivery.quantity}. ` +
        `${delivery.remainingQuantity} still needed.`;
    }
    session.selectedIndex = 0;
    return {
      closed: false,
      colonizationChanged: true,
      colonizationDelivery: delivery,
      colonizationPayment: payment
    };
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
        colonizationDiplomacyEvents: []
      };
    }
    grantColonizationApproval(gameState.memory.colonization, { approvalCargoDelivered: true });
    const diplomacyEvents = improveColonizationSponsorRelations(
      gameState,
      quest,
      context.simMinute ?? 0
    );
    const approvalFeedback = quest.history.approval?.grantedFeedback ||
      `${quest.approval.city} has granted permission to establish ${quest.target.city}.`;
    session.feedback = diplomacyEvents.length > 0
      ? `${approvalFeedback} ${diplomacyEvents[0].headline}`
      : approvalFeedback;
    session.colonizationApprovalStep = 2;
    session.selectedIndex = 0;
    return {
      closed: false,
      colonizationChanged: true,
      colonizationApprovalGranted: true,
      colonizationApprovalDeliveries: deliveries,
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
    session.feedback = quest.approval
      ? `The colonists, emissaries, and stores are aboard. Make first for ${quest.approval.city} to secure permission, then ${quest.target.city}.`
      : `The colonists and their stores are aboard. ${quest.target.city} awaits.`;
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
    session.feedback = `${quest.target.city} expedition landed. Return within one year with ` +
      `${quest.resupply.quantity} ${quest.resupply.goodLabel.toLowerCase()}.`;
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
      session.feedback = `Delivered ${resupply.goodLabel} x${delivery.quantity}. ` +
        `${delivery.remainingQuantity} still needed; these stores buy the colony ` +
        `${extensionDays} more days.`;
      session.selectedIndex = 0;
      return {
        closed: false,
        colonizationChanged: true,
        colonyEstablished: false,
        colonizationDefenseStarted: false,
        colonizationDelivery: delivery,
        missionItemGift: null
      };
    }
    establishColony(gameState.memory.colonization, minute);
    const defenseStarted = gameState.memory.colonization.stage === COLONIZATION_STAGE_DEFEND;
    const payment = receiveQuestPayment(
      gameState,
      city,
      resupply.reward,
      `${quest.target.city} first-year resupply`,
      context
    );
    session.feedback = defenseStarted
      ? `${quest.target.city} has become a city. Resupply paid ${payment.amount} db, but the harbor is under attack.`
      : `${quest.target.city} is secure. Paid ${payment.amount} db.`;
    const missionItemGift = !defenseStarted
      ? maybeGrantMissionPerkItem(gameState, city, {
        missionId: `${colonizationLedgerKey(quest.target)}.complete`,
        distanceKm: quest.distanceKm || 8000,
        reward: resupply.reward,
        random: context.missionGiftRandom || neverGrantMissionItem,
        context
      })
      : null;
    if (missionItemGift) session.feedback += ` The colonists press ${missionItemGift.item.label} upon you.`;
    session.selectedIndex = 0;
    return {
      closed: false,
      colonizationChanged: true,
      colonyEstablished: !defenseStarted,
      colonizationDefenseStarted: defenseStarted,
      colonizationDelivery: delivery,
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
    session.feedback = `${quest.defense.report} Paid ${payment.amount} db.`;
    const missionItemGift = maybeGrantMissionPerkItem(gameState, city, {
      missionId: `${colonizationLedgerKey(quest.target)}.defense-complete`,
      distanceKm: quest.distanceKm || 9000,
      reward: quest.defense.reward,
      random: context.missionGiftRandom || neverGrantMissionItem,
      context
    });
    if (missionItemGift) session.feedback += ` The settlement gifts you ${missionItemGift.item.label}.`;
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
    session.feedback = `${result.plan.label} targets set. Crew ${gameState.ship.crew}/${result.plan.crew}, ` +
      `guns ${gameState.ship.cannons}/${result.plan.cannons}.` + loadoutRemovalSummary(result.removed) +
      (shortages > 0 ? " Some stores could not be fitted or afforded." : " Ship fully provisioned.");
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
    session.feedback = `Custom targets set. Crew ${gameState.ship.crew}/${result.plan.crew}, ` +
      `guns ${gameState.ship.cannons}/${result.plan.cannons}.` +
      loadoutRemovalSummary(result.removed) +
      (shortages > 0 ? " Some stores could not be fitted or afforded." : " Ship fully provisioned.");
    session.nodeId = "root";
    session.selectedIndex = 0;
    return { closed: false, loadoutResult: result };
  }
  if (action.type === "purchase-portuguese-cartaz") {
    const result = purchasePortugueseCartaz(gameState, city, context.simMinute ?? 0);
    session.feedback = `Cartaz issued for ${PORTUGUESE_CARTAZ_DURATION_DAYS} days.`;
    session.selectedIndex = 0;
    return { closed: false, cartazPurchase: result };
  }
  if (action.type === "buy") {
    const result = buyGood(gameState, economy, city, action.goodId, 1, tradeContext(session, context));
    recordMarketPurchase(session, result);
    session.feedback = `Bought ${result.good.label} for ${result.price} db.`;
    return { closed: false, marketPurchase: result };
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
  if (action.type === "sell") {
    const result = sellGood(gameState, economy, city, action.goodId, 1, tradeContext(session, context));
    session.marketSales += result.quantity;
    const pnl = result.pnl === null ? "--" : signedDoubloons(result.pnl);
    session.feedback = `Sold ${result.good.label} for ${result.price} db. P/L ${pnl}.`;
    return { closed: false, marketSale: result };
  }
  if (action.type === "accept-quest") {
    acceptQuest(gameState, action.quest);
    session.feedback = isCaptureCommissionQuest(action.quest)
      ? isCaptureCapitalQuest(action.quest)
        ? `Final commission accepted. Capture ${action.quest.targetName} and compel a general peace.`
        : `Commission accepted. Capture ${action.quest.targetName} for ${action.quest.originFactionName}.`
      : action.quest.kind === "passenger"
        ? `Accepted passage to ${action.quest.destinationName}.`
        : `Accepted delivery to ${action.quest.destinationName}.`;
    session.nodeId = "quest";
    session.selectedIndex = 0;
    return { closed: false };
  }
  if (action.type === "complete-quest") {
    const quest = completeQuest(gameState, city, context);
    const missionItemGift = maybeGrantMissionPerkItem(gameState, city, {
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
        : `Delivered. Earned ${quest.reward} db. Standing improved.`;
    if (missionItemGift) session.feedback += ` Gift: ${missionItemGift.item.label}.`;
    session.nodeId = session.nextPortNodeId || "root";
    session.nextPortNodeId = null;
    session.selectedIndex = 0;
    return { closed: false, missionItemGift };
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
  assertPassengerDialogueSubject(session, city, quest);
  const active = gameState?.memory?.quests?.active || null;
  const speaker = `${passengerName(quest)}, ${isEnvoyQuest(quest) ? "envoy" : "passenger"}`;
  const expressionId = questExpressionId(quest);
  if (session.envoyNegotiationResult) {
    if (!isEnvoyQuest(quest)) {
      throw new Error("Passenger dialogue stored an envoy negotiation for a non-envoy quest");
    }
    return {
      speaker: `${characterName(city.character)}, local official`,
      expressionId: quest.kind === "friendly-envoy" ? "attentive" : "stern",
      text: quest.dialogue?.negotiation ||
        "Our court has heard the envoy's terms. The formal answer may now be carried home.",
      feedback: session.feedback,
      options: [
        option("Receive the answer", { type: "finish-envoy-negotiation" })
      ]
    };
  }
  if (active?.id === quest.id && isEnvoyQuest(quest) && quest.stage === "outbound" && quest.targetTileId === city.tileId) {
    return {
      speaker,
      expressionId: quest.kind === "friendly-envoy" ? "attentive" : "stern",
      text: quest.dialogue?.negotiationOpening ||
        `I come under ${quest.originRulerName || "my ruler"}'s seal to present our terms before this court.`,
      feedback: session.feedback,
      options: [
        option("Begin negotiations", { type: "negotiate-envoy" }),
        option("Not yet", { type: "close" })
      ]
    };
  }
  if (active?.id === quest.id && quest.destinationTileId === city.tileId) {
    return {
      speaker,
      expressionId: "happy",
      text: isEnvoyQuest(quest)
        ? quest.dialogue?.homecoming || `${cityLabel(city)} at last. The treasury will settle our account.`
        : quest.dialogue?.arrival || `${cityLabel(city)} at last. Here is the fare I promised.`,
      feedback: session.feedback,
      options: [
        option(
          isEnvoyQuest(quest) ? `Report to court  ${quest.reward} db` : `Set passenger ashore  ${quest.reward} db`,
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
        : quest.dialogue?.underway || `I am bound for ${quest.destinationName}.`,
      feedback: session.feedback,
      options: [
        option("Leave", { type: "close" })
      ]
    };
  }
  if (active && active.id !== quest.id) {
    return {
      speaker,
      expressionId: "concerned",
      text: `Your ship is already pledged to ${active.destinationName}. I will wait here if you return.`,
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
      option(`${isEnvoyQuest(quest) ? "Carry envoy" : "Take passenger"} to ${quest.destinationName}  ${quest.reward} db`, { type: "accept-passenger" }, {
        detail: formatDistanceKm(quest.distanceKm)
      }),
      option("Decline", { type: "open-port" })
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
  if (action.type === "accept-passenger") {
    acceptQuest(gameState, quest);
    return { closed: true, action: null };
  }
  if (action.type === "negotiate-envoy") {
    const negotiation = negotiateEnvoyQuest(gameState, city, context);
    session.envoyNegotiationResult = negotiation;
    session.selectedIndex = 0;
    return { closed: false, action: { type: "envoy-negotiated", negotiation } };
  }
  if (action.type === "finish-envoy-negotiation") {
    if (!session.envoyNegotiationResult) {
      throw new Error("Envoy negotiation cannot finish before the local court answers");
    }
    return { closed: true, action: null };
  }
  if (action.type === "complete-passenger") {
    const completed = completeQuest(gameState, city, context);
    const missionItemGift = maybeGrantMissionPerkItem(gameState, city, {
      missionId: completed.id,
      distanceKm: completed.distanceKm || 0,
      reward: completed.reward || 0,
      random: context.missionGiftRandom || neverGrantMissionItem,
      context
    });
    return {
      closed: true,
      action: null,
      ...(missionItemGift ? { missionItemGift } : {})
    };
  }
  throw new Error(`Unknown passenger dialogue action: ${action.type}`);
}

function assertPassengerDialogueSubject(session, city, quest) {
  if (!session || session.kind !== "passenger") throw new Error("Missing passenger dialogue session");
  if (!city || session.cityTileId !== city.tileId) throw new Error("Dialogue city does not match active passenger session");
  if (!quest || (quest.kind !== "passenger" && !isEnvoyQuest(quest)) || session.questId !== quest.id) {
    throw new Error("Dialogue passenger quest does not match active session");
  }
  const negotiationTarget = session.envoyNegotiationResult && quest.targetTileId === city.tileId;
  if (quest.originTileId !== city.tileId && quest.destinationTileId !== city.tileId && !negotiationTarget) {
    throw new Error(`${cityLabel(city)} is not part of passenger quest ${quest.id}`);
  }
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
  if (city.playerFoundedColony) {
    const discountPercent = founderPurchaseDiscountPercent(city);
    return {
      speaker: `${characterName(city.character)}, governor of ${cityLabel(city)}`,
      expressionId: "happy",
      text: memory.visits > 1
        ? `Welcome home, founder. Every factor here gives you ${discountPercent}% off goods you buy.`
        : `You have returned to the city you saved. As its founder, you receive ${discountPercent}% off goods you buy in ${cityLabel(city)}.`,
      feedback: null,
      options: [option("Continue", { type: "node", nodeId: "root" })]
    };
  }
  const name = cityLabel(city);
  const personalityId = city.character?.personalityId || portPersonalityForKey(`${name}|${city.country || "port"}`);
  const greeting = portGreetingPresentationForPersonality({
    personalityId,
    cityName: name,
    returning: memory.visits > 1,
    localFlavor: portFlavor(city),
    visitCount: memory.visits,
    dayIndex: context.dayIndex || 0,
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
  const drunkMemoryRemark = rememberedDrunkFactorLine(session, memory);
  const settlementRemark = foreignSettlementFactorLine(city, gameState);
  const remarks = [drunkMemoryRemark, settlementRemark, greeting.text].filter(Boolean);
  return {
    speaker: speakerName(city),
    expressionId: greeting.expressionId,
    text: remarks.join(" "),
    feedback: null,
    options: [option("Continue", { type: "node", nodeId: "root" })]
  };
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

function barredPortView(city, context) {
  const status = context.portEntryStatus;
  const conquest = context.portConquestStatus || null;
  const batteryDisabled = context.portRecoveryStatus !== null && context.portRecoveryStatus !== undefined;
  if (!status?.hostile && !conquest?.canAttempt && !conquest?.playerAssaultActive) {
    throw new Error("Barred port dialogue requires hostility or an exposed foreign port");
  }
  const faction = factionById(status.factionId);
  const ruler = rulerAtMinute(status.factionId, context.simMinute ?? 0);
  if (!ruler) throw new Error(`Barred port faction has no ruler: ${status.factionId}`);
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
      "Land Marines",
      { type: "land-marines" },
      {
        detail: `${conquest.successPercent}% Chance of Success`
      }
    ));
  }
  if (status.hostile && !status.locked && !batteryDisabled && !conquest?.playerAssaultActive) {
    options.push(option("Try to enter in disguise", { type: "attempt-disguise" }));
  }
  options.push(option("Leave", { type: "close" }));
  return {
    speaker: `${cityLabel(city)} harbor guard`,
    expressionId: "stern",
    text: conquest?.canAttempt
      ? `The harbor guns are silent. ${cityLabel(city)} is exposed, but ${conquest.capital ? "the capital garrison" : "the garrison"} still bars the quays.`
      : batteryDisabled || conquest?.playerAssaultActive
      ? `The harbor guns are silent, but you need at least ${conquest.minimumCrew} crew aboard a large warship to land a viable assault force.`
      : `By order of ${ruler.displayName} of ${faction.name}, your ship is barred from ${cityLabel(city)}. Turn about. No supplies will be sold to you.`,
    feedback: null,
    options
  };
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

function disguiseFailureView(city, context) {
  const days = context.portEntryStatus?.lockDaysRemaining || 1;
  return {
    speaker: `${cityLabel(city)} harbor guard`,
    expressionId: "angry",
    text: `There they are! Sound the alarm! The watch recognizes your ship, and you barely escape. The port will remain alert for ${days} day${days === 1 ? "" : "s"}.`,
    feedback: null,
    options: [option("Make for open water", { type: "close" })]
  };
}

function rootView(session, city, gameState, economy, context) {
  const market = portEconomySummary(economy, city);
  const pirateHideout = city.isPirateHideout === true;
  const tradeAccess = playerPortTradeAccess(session, city, gameState, context);
  const activeQuest = gameState.memory.quests?.active || null;
  const canCompleteQuest = activeQuest?.destinationTileId === city.tileId;
  const options = [
    ...(tradeAccess.allowed
      ? [option(pirateHideout ? "Buy doubtful goods" : tradeAccess.illicit ? "Buy illicit goods" : "Buy goods", {
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
    ...(tradeAccess.allowed
      ? [option(pirateHideout ? "Fence cargo" : tradeAccess.illicit ? "Sell cargo illicitly" : "Sell cargo", {
        type: "node",
        nodeId: "sell"
      })]
      : []),
    ...(!pirateHideout && (!session.disguisedEntry || canCompleteQuest)
      ? [option(session.disguisedEntry ? "Complete current job" : "Ask about work", {
        type: "node",
        nodeId: "quest"
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
    options.splice(4, 0, option("Speak with the banquet chef", {
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
  if (context.passengerOffer && !session.disguisedEntry && !pirateHideout) {
    options.splice(2, 0, option(`Speak with ${passengerName(context.passengerOffer)}`, {
      type: "open-passenger",
      quest: context.passengerOffer
    }));
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
      : "Wartime orders close this market and its harbor services."
    : tradeAccess.illicit
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
    ? `Your Portuguese cartaz is in order for another ${remainingDays} day${remainingDays === 1 ? "" : "s"}. It protects this vessel from Estado da India inspections, but it does not waive local customs.`
    : status.fee === null
      ? "The Estado da India will not issue a cartaz while relations remain hostile. Sailing its guarded routes without one risks inspection, fines, or seizure of controlled spices."
      : `A ${status.fee} doubloon cartaz licenses this vessel for ${PORTUGUESE_CARTAZ_DURATION_DAYS} days in waters patrolled by the Estado da India. Local customs and crown spice levies still apply.`;
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
      `I am a historical enthusiast, reconstructing a seaworthy Norse longship from the old sagas. Would you be willing to help me find ${stage.quantity} ${stage.goodLabel.toLowerCase()} for ${stage.purpose}?`,
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
      text: `The longship is complete, and you supplied everything that made her possible. I will give her to you on one condition: take me aboard. I have spent long enough studying voyages from shore. Warning: accepting will replace your ${currentShipLabel}; the current vessel will be left behind.`,
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
  const speaker = `${characterName(city.character)}, chef`;
  const back = session.chefQuestArrival
    ? option("Not now", { type: "node", nodeId: session.nextPortNodeId || "greeting" })
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
      text: `${quest.event.successText} I have cooked for grand tables; now I want to see what lies beyond the harbor. Give me a berth and I will make your provisions last farther than you thought possible.`,
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
    ? option("Not now", { type: "node", nodeId: session.nextPortNodeId || "greeting" })
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
    "The Portuguese pieces brought through Nagasaki are ingenious, but an imported weapon teaches little from behind glass. Bring me two matchlocks. I will take their locks apart and learn every screw and spring.",
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
    ? option("Not now", { type: "node", nodeId: session.nextPortNodeId || "greeting" })
    : option("Back", { type: "node", nodeId: "root" });
  if (quest.completed) {
    return {
      speaker,
      expressionId: "pleased",
      text: `The ginger has taken beautifully. These islands now grow a spice that once had to cross half the world, and ${cityLabel(city)} has a new crop for every eastbound hold.`,
      feedback: session.feedback,
      options: [back]
    };
  }

  const stage = quest.fetchStage;
  return {
    speaker,
    expressionId: quest.canDeliver ? "pleased" : "attentive",
    text: "Feel this soil: warm, damp, and rich. I am certain ginger would thrive here, but " +
      "sound planting roots must come from the ports of Southeast Asia. Bring me six, and I " +
      `will pay well for the risk of carrying them across the world.${quest.delivered > 0
        ? ` You have already delivered ${quest.delivered} of ${stage.quantity}.`
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
  const organizer = characterName(city.character);
  const back = atOrigin
    ? session.colonizationArrival
      ? option("Not now", { type: "node", nodeId: session.nextPortNodeId || "greeting" })
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
    const introduction = session.colonizationArrival && quest.fetchStageIndex === 0
      ? [
          "Captain, a word before you see the factor.",
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
        option(deliveryOptionLabel(stage.goodLabel, quest.fetchDeliverable), {
          type: "deliver-colonization-material",
          stageId: stage.id
        }, {
          disabled: !quest.canDeliverFetch,
          disabledReason: `Still need ${quest.fetchRemaining} ${stage.goodLabel.toLowerCase()}; ` +
            `hold has ${quest.held}.`
        }),
        back
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
    return {
      speaker: `${organizer}, ${history.sponsorRole}`,
      expressionId: eligibility?.eligible && quest.approvalCargoReady ? "happy" : "concerned",
      text: `${history.ready} Twenty-four units of your hold will carry the people and their personal chests.${negotiationCargo} ${targetName} lies ${Math.round(quest.target.distanceKm || 0).toLocaleString("en-US")} km away.${route} I will entrust them only to a capacious, seaworthy ship.`,
      feedback: session.feedback,
      options: [
        option("Take the colonists aboard", { type: "embark-colonists" }, {
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
        text: `${targetName} cannot be founded without permission from the government in ${quest.approval.city}. We must take the emissaries there first.`,
        feedback: session.feedback,
        options: [back]
      };
    }
    return {
      speaker: `${organizer}, ${history.sponsorRole}`,
      expressionId: "happy",
      text: `${history.landing} Return within one year with ${quest.resupply.quantity} ${quest.resupply.goodLabel.toLowerCase()} for ${quest.resupply.purpose}, or the venture may still fail.`,
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
    const canDeliver = quest.leftSinceFounding &&
      quest.resupply.deliverable > 0 &&
      !quest.deadlineExpired;
    const deadlineText = quest.leftSinceFounding
      ? history.resupply.returned
      : `${history.resupply.waiting} Sail away, find ${quest.resupply.quantity} ${quest.resupply.goodLabel.toLowerCase()}, and return before one year has passed.`;
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
          disabledReason: !quest.leftSinceFounding
            ? "You must first leave the colony and return."
            : `Still need ${quest.resupply.remaining} ` +
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

function equipmentView(session, city, gameState, economy) {
  const nets = equipmentStockAtPort(economy, city, EQUIPMENT_STOCK_FISHING_NET, FISHING_NETS);
  const cannonEquipment = equipmentStockAtPort(economy, city, EQUIPMENT_STOCK_CANNON, CANNON_EQUIPMENT);
  const harpoons = equipmentStockAtPort(economy, city, EQUIPMENT_STOCK_WHALE_HARPOON, WHALE_HARPOONS);
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
        ))
      }),
      option("Whale harpoons", { type: "node", nodeId: "equipment-harpoons" }, {
        detail: equipmentStockLabel(harpoons, WHALE_HARPOONS, equipmentSpecialistAtPort(
          city,
          EQUIPMENT_STOCK_WHALE_HARPOON
        )),
        disabled: harpoons.length === 0,
        disabledReason: "This port has no whaling gear in stock."
      }),
      option("Cannon battery", { type: "node", nodeId: "equipment-cannons" }, {
        detail: equipmentStockLabel(cannonEquipment, CANNON_EQUIPMENT, equipmentSpecialistAtPort(
          city,
          EQUIPMENT_STOCK_CANNON
        )),
        disabled: !cannonArmed,
        disabledReason: "Your ship has no cannon battery to refit."
      }),
      option("Back", { type: "node", nodeId: "root" })
    ]
  };
}

function equipmentStockLabel(stock, catalog, specialist) {
  if (!Array.isArray(stock) || !Array.isArray(catalog) || catalog.length === 0) {
    throw new Error("Equipment stock label requires stock and catalog choices");
  }
  return `STOCK ${stock.length}/${catalog.length} LEVELS${specialist ? "  SPECIALIST" : ""}`;
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
      : `Captain, a rare ${item.label} came into my hands. ${item.detail} I could part with it for ${item.price} doubloons.`,
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
  const rows = stock.map((net) => {
    const fitted = net.id === current.id;
    const inferior = net.tier < current.tier;
    const cannotAfford = gameState.doubloons < net.price;
    const disabledReason = fitted
      ? "This net is already fitted."
      : inferior
        ? `Your ${current.label} is superior.`
        : cannotAfford
          ? `Need ${net.price - gameState.doubloons} more doubloons.`
          : null;
    const priceLabel = fitted ? "FITTED" : `${net.price} db`;
    return option(`${fitted ? "* " : ""}${net.label}  ${priceLabel}`, {
      type: "buy-net",
      netId: net.id
    }, {
      detail: `ODDS x${net.catchRateMultiplier.toFixed(2)}  MAX HAUL ${net.maxCatch}`,
      disabled: fitted || inferior || cannotAfford,
      disabledReason
    });
  });
  rows.push(option("Back", { type: "node", nodeId: "equipment" }));
  return {
    speaker: speakerName(city),
    expressionId: feedbackExpressionId(session.feedback),
    text: `Current gear: ${current.label}. This port stocks ${stock.length} net type${stock.length === 1 ? "" : "s"}. Purse ${gameState.doubloons} db.`,
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
  const rows = stock.map((equipment) => {
    const fitted = equipment.id === current.id;
    const inferior = equipment.tier < current.tier;
    const cannotAfford = gameState.doubloons < equipment.price;
    const disabledReason = fitted
      ? "This cannon battery is already fitted."
      : inferior
        ? `Your ${current.label} is superior.`
        : cannotAfford
          ? `Need ${equipment.price - gameState.doubloons} more doubloons.`
          : null;
    const priceLabel = fitted ? "FITTED" : `${equipment.price} db`;
    return option(`${fitted ? "* " : ""}${equipment.label}  ${priceLabel}`, {
      type: "buy-cannon-equipment",
      equipmentId: equipment.id
    }, {
      detail: `RELOAD ${equipment.reloadSeconds.toFixed(2)}S  DAMAGE x${equipment.damageMultiplier.toFixed(2)}  RANGE x${equipment.rangeMultiplier.toFixed(2)}`,
      disabled: fitted || inferior || cannotAfford,
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
  const rows = stock.map((harpoon) => {
    const fitted = harpoon.id === current?.id;
    const inferior = Boolean(current && harpoon.tier < current.tier);
    const cannotAfford = gameState.doubloons < harpoon.price;
    const disabledReason = fitted
      ? "This harpoon is already fitted."
      : inferior
        ? `Your ${current.label} is superior.`
        : cannotAfford
          ? `Need ${harpoon.price - gameState.doubloons} more doubloons.`
          : null;
    return option(`${fitted ? "* " : ""}${harpoon.label}  ${fitted ? "FITTED" : `${harpoon.price} db`}`, {
      type: "buy-whale-harpoon",
      harpoonId: harpoon.id
    }, {
      detail: `ACCURACY ${Math.round(harpoon.accuracy * 100)}%  LINE BREAK ${Math.round(harpoon.breakChance * 100)}%  RANGE ${harpoon.rangePx}`,
      disabled: fitted || inferior || cannotAfford,
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

function shipyardView(session, city, gameState, context) {
  const yard = context.shipyard || null;
  const listing = yard?.listing || null;
  if (!listing) {
    const nearestListing = context.nearestShipyardListing || null;
    if (nearestListing && !Number.isInteger(nearestListing.portId)) {
      throw new Error(`Nearest shipyard listing requires a port tile id: ${nearestListing.portId}`);
    }
    return {
      speaker: speakerName(city),
      expressionId: "neutral",
      text: nearestListing
        ? `I heard a rumour of a new ${nearestListing.shipLabel} for sale at ${nearestListing.portName}.`
        : city.isPirateHideout
          ? "The hidden slips can patch any hull, but there is no captured vessel for sale today. No shipyard currently has a vessel for sale."
          : yard?.famous
            ? "The master shipwrights have vessels on the stocks, but none ready for sale. No shipyard currently has a vessel for sale."
            : "The slipways handle repairs and local work, but there is no newly built vessel for sale today. No shipyard currently has a vessel for sale.",
      feedback: session.feedback,
      options: [
        ...(nearestListing ? [option(`Set a heading for ${nearestListing.portName}`, {
          type: "set-port-heading",
          destinationTileId: nearestListing.portId,
          destinationName: nearestListing.portName,
          reason: PORT_NAVIGATION_REASON_NEW_SHIP,
          nextNodeId: "root"
        })] : []),
        option("Back", { type: "node", nodeId: "root" })
      ]
    };
  }
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
  const currentShipLabel = shipLabelForSlug(currentShipSlug);
  const purchaseLabel = purchaseTerms.netPrice >= 0
    ? `Buy ${listing.shipLabel}  ${purchaseTerms.netPrice} db`
    : `Trade for ${listing.shipLabel}  +${-purchaseTerms.netPrice} db`;
  return {
    speaker: city.isPirateHideout ? `${cityLabel(city)} hidden yard` : `${cityLabel(city)} shipyard`,
    expressionId: "attentive",
    text: `A newly built ${listing.shipLabel} is offered for ${listing.price} doubloons. Your ${currentShipLabel} is worth ${purchaseTerms.tradeInValue} in trade.`,
    feedback: session.feedback,
    presentation: { kind: "shipyard", listing, currentShipSlug, purchaseTerms },
    options: [
      option(purchaseLabel, {
        type: "purchase-ship",
        listingId: listing.id,
        shipSlug: listing.shipSlug
      }, {
        disabled: Boolean(disabledReason),
        disabledReason
      }),
      option("Back", { type: "node", nodeId: "root" })
    ]
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
    options: [option("Continue", { type: "node", nodeId: "root" })]
  };
}

function buyView(session, city, gameState, economy, context) {
  const hold = cargoHoldStatus(gameState);
  const market = new Map(portMarket(economy, city).map((row) => [row.good.id, row]));
  const tradeRows = marketBuyGoodIds(session, market).map((goodId) => {
    const row = market.get(goodId);
    if (!row) throw new Error(`${cityLabel(city)} market has no quote for ${goodId}`);
    return row;
  });
  const rows = tradeRows
    .map((row) => {
      const totalSize = row.good.unitSize;
      const terms = playerTradeTerms(gameState, city, row.good.id);
      const displayedPrice = quotePortSale(economy, city, row.good.id, 1, terms.purchaseMultiplier);
      const comparison = worldMarketPriceComparison(economy, city, row.good.id, "buy");
      const freeSpace = cargoFreeForGood(gameState, row.good.id);
      const outOfStock = row.stock < 1;
      const cannotAfford = gameState.doubloons < displayedPrice;
      const cannotFit = freeSpace < totalSize;
      return option(`Buy ${row.good.label}  ${displayedPrice} db`, { type: "buy", goodId: row.good.id }, {
        detail: `${tradeTermsDetail(terms, "buy")}  ${worldPriceIndicator(comparison)}  SPACE ${totalSize}  STOCK ${row.stock}`,
        disabled: outOfStock || cannotAfford || cannotFit,
        disabledReason: outOfStock
          ? `No ${row.good.label.toLowerCase()} remaining.`
          : cannotAfford
            ? "Not enough doubloons."
            : cannotFit
              ? `Needs ${totalSize} cargo spaces; ${hold.freeWholeUnits} free.`
              : null
      });
    });
  if (context.shipStats) rows.push(option("Change ship loadout", { type: "leave-buy", nodeId: "loadout" }));
  rows.push(option("Back", { type: "leave-buy", nodeId: "root" }));
  return {
    speaker: speakerName(city),
    expressionId: feedbackExpressionId(session.feedback),
    text: city.isPirateHideout
      ? `No receipts, no questions. Doubloons ${gameState.doubloons}. Cargo ${hold.physicalWholeUnits}/${hold.capacity}.`
      : `${cityLabel(city)} market. Doubloons ${gameState.doubloons}. Cargo ${hold.physicalWholeUnits}/${hold.capacity}.`,
    feedback: session.feedback,
    feedbackLineReserve: 2,
    optionHeight: 30,
    options: rows
  };
}

function marketBuyGoodIds(session, market) {
  const supplyIds = new Set([FRESH_WATER_GOOD_ID, HARDTACK_GOOD_ID]);
  const availableGoodIds = [...market.values()]
    .filter((row) => row.listedForSale && row.stock > 0 && !supplyIds.has(row.good.id))
    .sort((a, b) => b.productionPerDay - a.productionPerDay || a.good.id.localeCompare(b.good.id))
    .map((row) => row.good.id);
  return stableMarketGoodIds(session, "marketBuyGoodIds", availableGoodIds, 5);
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
        destinationTileId: tip.destinationTileId,
        destinationName: tip.destinationName,
        reason: PORT_NAVIGATION_REASON_TRADE_PRICE,
        nextNodeId: tip.nextNodeId
      }),
      option("Continue", { type: "node", nodeId: tip.nextNodeId })
    ]
  };
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

  let best = null;
  for (const purchase of Object.values(purchases)) {
    if (!purchase || !Number.isInteger(purchase.quantity) || purchase.quantity <= 0) {
      throw new Error("Trade-route purchase quantity must be a positive integer");
    }
    if (!Number.isFinite(purchase.cost) || purchase.cost < 0) {
      throw new Error("Trade-route purchase cost must be non-negative");
    }
    const good = tradeGoodById(purchase.goodId);
    const candidates = [];
    for (const destination of portCities) {
      if (!includeLocalMarket && destination.tileId === originCity.tileId) continue;
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
      const pnl = revenue - purchase.cost;
      const localMarket = destination.tileId === originCity.tileId;
      const distanceKm = localMarket ? 0 : sailingDistanceKm(originCity, destination);
      if (distanceKm === null) continue;
      if (!Number.isInteger(distanceKm) || distanceKm < 0) {
        throw new Error(`Trade-route sailing distance is invalid: ${distanceKm}`);
      }
      candidates.push({
        goodId: good.id,
        goodLabel: good.label,
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
  return best?.expectedPnl > 0 ? best : null;
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
  for (const row of cargoRows(gameState)) {
    if (row.good.sellable === false) continue;
    const quantity = marketTradeLotCount(row.quantity);
    if (quantity <= 0) continue;
    const basis = cargoCostBasis(gameState, row.good.id);
    purchases[row.good.id] = {
      goodId: row.good.id,
      quantity,
      cost: basis.known
        ? basis.total * quantity / row.quantity
        : quotePortPurchase(
          economy,
          originCity,
          row.good.id,
          quantity,
          playerTradeTerms(gameState, originCity, row.good.id).saleMultiplier
        )
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
      option("Apply custom loadout", { type: "select-custom-loadout" }),
      option("Back", { type: "node", nodeId: "loadout" })
    ]
  };
}

function loadoutRemovalSummary(removed) {
  const phrases = [];
  if (removed.food > 0) phrases.push(`${formatDisplayQuantity(removed.food)} hardtack`);
  if (removed.water > 0) phrases.push(`${formatDisplayQuantity(removed.water)} water`);
  const dumped = phrases.length > 0 ? ` Dumped ${phrases.join(" and ")}.` : "";
  const reductions = [];
  if (removed.crew > 0) reductions.push(`${removed.crew} crew`);
  if (removed.cannons > 0) reductions.push(`${removed.cannons} guns`);
  return dumped + (reductions.length > 0 ? ` Removed ${reductions.join(" and ")}.` : "");
}

function sellView(session, city, gameState, economy) {
  const hold = cargoHoldStatus(gameState);
  const market = new Map(portMarket(economy, city).map((row) => [row.good.id, row]));
  const rows = marketSaleGoodIds(session, gameState).map((goodId) => {
    const good = tradeGoodById(goodId);
    const quantity = gameState.cargo[goodId] || 0;
    const heldLots = marketTradeLotCount(quantity);
    const soldOut = heldLots === 0;
    const row = market.get(goodId);
    if (!row) throw new Error(`${cityLabel(city)} market has no quote for ${goodId}`);
    const terms = playerTradeTerms(gameState, city, goodId);
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
    return option(`Sell ${good.label}  ${price} db`, {
      type: "sell",
      goodId
    }, {
      detail: `${tradeTermsDetail(terms, "sell")}  ${worldPriceIndicator(comparison)}  P/L ${pnlLabel}  HELD ${heldLots}`,
      disabled: soldOut || marketOutOfSpecie,
      disabledReason: soldOut
        ? `No ${good.label.toLowerCase()} remaining.`
        : marketOutOfSpecie
          ? "The market is out of specie."
          : null
    });
  });
  if (rows.length === 0) {
    rows.push(option("No cargo to sell", { type: "node", nodeId: "sell" }, {
      disabled: true,
      disabledReason: "The hold has no cargo buyers will take."
    }));
  }
  rows.push(option("Back", { type: "leave-sell", nodeId: "root" }));
  return {
    speaker: speakerName(city),
    expressionId: feedbackExpressionId(session.feedback),
    text: city.isPirateHideout
      ? `The fences care about value, not provenance. Cargo ${hold.physicalWholeUnits}/${hold.capacity}.`
      : `Buyers here pay port rates. Cargo ${hold.physicalWholeUnits}/${hold.capacity}.`,
    feedback: session.feedback,
    feedbackLineReserve: 2,
    optionHeight: 30,
    options: rows
  };
}

function marketSaleGoodIds(session, gameState) {
  const saleGoodIds = cargoRows(gameState)
    .filter((cargo) => cargo.good.sellable !== false && cargo.quantity >= 1)
    .map((cargo) => cargo.good.id);
  return stableMarketGoodIds(session, "marketSaleGoodIds", saleGoodIds);
}

function stableMarketGoodIds(session, rosterKey, candidateGoodIds, limit = Number.POSITIVE_INFINITY) {
  const roster = session[rosterKey];
  if (!Array.isArray(roster)) throw new Error(`Port dialogue session has no stable market roster: ${rosterKey}`);
  if (!Array.isArray(candidateGoodIds)) throw new Error(`Market roster candidates must be an array: ${rosterKey}`);
  if (limit !== Number.POSITIVE_INFINITY && (!Number.isInteger(limit) || limit <= 0)) {
    throw new Error(`Market roster limit must be a positive integer: ${limit}`);
  }
  const knownIds = new Set(roster);
  for (const goodId of candidateGoodIds) {
    if (typeof goodId !== "string" || goodId === "") throw new Error(`Invalid market roster good: ${goodId}`);
    if (knownIds.has(goodId)) continue;
    if (roster.length >= limit) break;
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
  if (questState.kind === "ready-to-complete") {
    if (questState.quest.kind === "passenger" || isEnvoyQuest(questState.quest)) {
      const envoy = isEnvoyQuest(questState.quest);
      return {
        speaker: speakerName(city),
        expressionId: "happy",
        text: envoy
          ? `${passengerName(questState.quest)} is ready for the court at ${questState.quest.destinationName}.`
          : `${passengerName(questState.quest)} has reached ${questState.quest.destinationName}. Let them go ashore and settle the fare.`,
        feedback: session.feedback,
        options: [
          option(envoy ? "Speak with envoy" : `Set passenger ashore  ${questState.quest.reward} db`, envoy
            ? { type: "open-passenger", quest: questState.quest }
            : { type: "complete-quest" }),
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

function captureCommissionQuestView(session, questState, returnNodeId) {
  return isCaptureCapitalQuest(questState.quest)
    ? captureCapitalQuestView(session, questState, returnNodeId)
    : capturePortQuestView(session, questState, returnNodeId);
}

function capturePortQuestView(session, questState, returnNodeId) {
  const quest = questState.quest;
  const back = option("Back", { type: "node", nodeId: returnNodeId });
  if (questState.kind === "available") {
    return {
      speaker: `${quest.originRulerName}'s war secretary`,
      expressionId: "stern",
      text: `By ${quest.originRulerName}'s warrant, this court entrusts you with more than prizes at sea. ` +
        `${quest.targetName}, held by ${quest.targetFactionNoun}, commands waters too near our own. ` +
        `Silence its batteries, put your company ashore, and raise ${quest.originFactionAdjective} colors ` +
        `over the harbor. The customary spoils are yours. Return here afterward, and the treasury will pay ` +
        `${quest.reward.toLocaleString("en-US")} doubloons.`,
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
    return {
      speaker: `${quest.originRulerName}'s war secretary`,
      expressionId: "pleased",
      text: `The dispatches reached us before your sails crossed the roadstead. ${quest.targetName} now ` +
        `answers to ${quest.originRulerName}. You broke its guns, carried the walls, and kept faith with ` +
        `your commission. The treasury stands ready to honor the crown's word.`,
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
      text: `The commission stands. Break the harbor batteries at ${quest.targetName}, land no fewer ` +
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
      ? `${quest.targetName} is taken. Carry the victory dispatches back to ${quest.originName}; the crown's debt must be settled there.`
      : `Your commission is to seize ${quest.targetName} from ${quest.targetFactionNoun}. Other business must wait upon that service.`,
    feedback: session.feedback,
    options: [back]
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
      text: `The war against ${quest.targetFactionNoun} is nearly won. ${politicalContext} ` +
        `Take ${quest.targetName}, compel peace on every remaining front, and accept the capital's ` +
        `concessions in ${quest.originRulerName}'s name. The customary spoils are yours; the treasury ` +
        `will add ${quest.reward.toLocaleString("en-US")} doubloons when you return.`,
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
    return {
      speaker: `${quest.originRulerName}'s war secretary`,
      expressionId: "pleased",
      text: `${quest.targetName} has fallen. Its court has accepted concessions and made peace with ` +
        `every power still fighting it. You brought the war to its end; the treasury will now honor ` +
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
        `take the enemy court. Its remaining wars can end only when the capital submits.`,
      feedback: session.feedback,
      options: [back]
    };
  }
  return {
    speaker: `${quest.originRulerName}'s war secretary`,
    expressionId: "stern",
    text: quest.stage === "return"
      ? `${quest.targetName} has submitted and peace is signed. Carry the final dispatches to ${quest.originName}.`
      : `The enemy is nearly spent. Your final commission is to take ${quest.targetName} and end the war.`,
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
    : `${ruler.displayName}'s court will issue a letter if your standing and fighting ship are sufficient. Standing ${formatSignedReputation(status.reputation)}/${formatSignedReputation(status.reputationRequired)}. Ship strength ${Math.round(status.shipPower)}/${status.shipPowerRequired}.`;
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
  return {
    label,
    action,
    detail: details.detail || null,
    disabled: !!details.disabled,
    disabledReason: details.disabledReason || null
  };
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
  if (quest?.scenarioId === "shipwrecked-sailor") return "afraid";
  if (quest?.scenarioId === "return-home" || quest?.scenarioId === "family-letter") return "sad";
  return "neutral";
}

function neverGrantMissionItem() {
  return 1 - Number.EPSILON;
}

function portFlavor(city) {
  const population = city.population || 0;
  if (population >= 150000) return "The quay is crowded enough to hide a dozen fortunes.";
  if (population >= 60000) return "There is steady trade if your hold has room.";
  return "Small harbors remember generous captains.";
}
