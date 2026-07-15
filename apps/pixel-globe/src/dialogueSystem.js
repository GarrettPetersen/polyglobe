import {
  acceptQuest,
  adjustFactionReputation,
  buyGood,
  cargoCostBasis,
  cargoFree,
  cargoRows,
  cargoUsed,
  cityLabel,
  completeQuest,
  grantLetterOfMarque,
  isEnvoyQuest,
  letterOfMarqueStatus,
  mingTradeOpenToFaction,
  negotiateEnvoyQuest,
  portMemory,
  portEntryStatus,
  playerCannonEquipment,
  playerFishingNet,
  purchaseCannonEquipment,
  purchaseFishingNet,
  questStateForCity,
  restockShipLoadoutAtPort,
  sellGood
} from "./gameState.js";
import {
  FRESH_WATER_GOOD_ID,
  HARDTACK_GOOD_ID,
  maximumPortPurchaseQuantity,
  portEconomySummary,
  portMarket,
  quotePortPurchase,
  tradeGoodById,
  worldMarketPriceComparison
} from "./economy.js";
import { factionById } from "./factions.js";
import { rulerAtMinute } from "./rulers.js";
import { portGreetingPresentationForPersonality, portPersonalityForKey } from "./portDialoguePersonality.js";
import { SHIP_LOADOUT_PRESETS, shipLoadoutPlan } from "./shipLoadouts.js";
import { shipLabelForSlug, shipStatsForSlug } from "./shipStats.js";
import { FISHING_NETS } from "./fishingNets.js";
import { CANNON_EQUIPMENT } from "./cannonEquipment.js";
import {
  EQUIPMENT_STOCK_CANNON,
  EQUIPMENT_STOCK_FISHING_NET,
  equipmentStockAtPort
} from "./portEquipment.js";
import {
  VIKING_LONGSHIP_PRICE,
  VIKING_LONGSHIP_SLUG,
  deliverVikingLongshipQuestCargo,
  isVikingLongshipQuestPort,
  vikingLongshipQuestState
} from "./vikingLongshipQuest.js";
import {
  MING_FACTION_ID,
  MING_ILLICIT_MARKET_REPUTATION_PENALTY,
  mingTradeAccess,
  resolveMingIllicitMarketAttempt
} from "./mingTradeRestrictions.js";

export function createPortDialogueSession(city, options = {}) {
  return {
    kind: "port",
    cityTileId: city.tileId,
    portId: city.portId || `city-${city.tileId}`,
    nodeId: options.initialNodeId || "greeting",
    admittedToPort: options.admittedToPort === true,
    disguisedEntry: options.disguisedEntry === true,
    mingIllicitTradeAccess: options.mingIllicitTradeAccess === true,
    mingIllicitTradeAttempted: options.mingIllicitTradeAttempted === true,
    nextPortNodeId: options.nextPortNodeId || null,
    marketPurchases: {},
    tradeTip: null,
    selectedIndex: 0,
    feedback: null
  };
}

export function createPortArrivalDialogueSession(city, options = {}) {
  const needsLoadout = options.needsLoadout === true;
  if (options.questCharacterSession) {
    if (options.questCharacterSession.cityTileId !== city.tileId) {
      throw new Error("Port-arrival quest character does not belong to this city");
    }
    return {
      ...options.questCharacterSession,
      admittedToPort: true,
      continueToPortOnClose: true,
      nextPortNodeId: needsLoadout ? "loadout" : "greeting"
    };
  }
  return createPortDialogueSession(city, {
    initialNodeId: needsLoadout ? "loadout" : "greeting",
    admittedToPort: true
  });
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
    selectedIndex: 0,
    feedback: null
  };
}

export function createShipDialogueSession(ship, { attackReason = null } = {}) {
  if (attackReason !== null && (typeof attackReason !== "string" || attackReason.trim() === "")) {
    throw new Error("Ship combat hail requires a reason");
  }
  return {
    kind: "ship",
    npcShipId: ship.id,
    nodeId: "root",
    selectedIndex: 0,
    attackReason,
    piracyWarningAccepted: false,
    pendingPiracyAction: null
  };
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
    text: `${session.rulerName} demands ${session.toll} doubloons for seven days of safe passage throughout ${faction.name}.`,
    feedback: null,
    options: [
      option(`Pay ${session.toll} db`, { type: "purchase-safe-passage" }, {
        disabled: !session.canAffordToll,
        disabledReason: "Not enough doubloons."
      }),
      option(session.relation === "war" ? "Refuse" : "Turn away", { type: "close" })
    ]
  };
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
  throw new Error(`Unknown shore battery dialogue action: ${selected.action.type}`);
}

export function shipDialogueView(session, ship) {
  assertShipDialogueSubject(session, ship);
  const manifest = shipCargoManifest(ship.cargo);
  const storm = ship.stormStatus ? ` ${ship.stormStatus}` : "";
  const voyage = ship.destinationName ? ` Bound for ${ship.destinationName}.` : "";
  const cargo = manifest ? ` We carry ${manifest}.` : " Running in ballast.";
  const role = ship.roleLabel || "Merchant";
  const fishingGear = role === "Fisherman" && ship.fishingNetLabel
    ? ` We work a ${ship.fishingNetLabel.toLowerCase()}.`
    : "";
  const faction = role !== "Pirate" && ship.faction?.adjective ? `${ship.faction.adjective} ` : "";
  const speaker = `${characterName(ship.character)}, ${faction}${role.toLowerCase()} captain`;
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
  const greeting = role === "Pirate"
    ? "Heave to and keep your hands where I can see them."
    : role === "Warship"
      ? "Keep clear. We are on patrol."
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
    text: `${greeting}${storm}${voyage}${cargo}${fishingGear}`,
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

export function selectShipDialogueOption(session, ship, optionIndex = session.selectedIndex) {
  const view = shipDialogueView(session, ship);
  const selected = view.options[optionIndex];
  if (!selected) throw new Error(`Invalid ship dialogue option index: ${optionIndex}`);
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
  if (action.type === "surrender" || action.type === "attack") {
    return { closed: true, action: { type: action.type } };
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

  if (session.nodeId === "greeting") return greetingView(session, city, gameState, context);
  if (session.nodeId === "barred") return barredPortView(city, context);
  if (session.nodeId === "disguise-success") return disguiseSuccessView(session, city);
  if (session.nodeId === "disguise-failed") return disguiseFailureView(city, context);
  if (session.nodeId === "root") return rootView(session, city, gameState, economy, context);
  if (session.nodeId === "buy") return buyView(session, city, gameState, economy, context);
  if (session.nodeId === "trade-tip") return tradeTipView(session, city);
  if (session.nodeId === "equipment") return equipmentView(session, city, gameState, economy);
  if (session.nodeId === "equipment-nets") return fishingNetView(session, city, gameState, economy);
  if (session.nodeId === "equipment-cannons") return cannonEquipmentView(session, city, gameState, economy);
  if (session.nodeId === "sell") return sellView(session, city, gameState, economy);
  if (session.nodeId === "cargo") return cargoView(session, city, gameState);
  if (session.nodeId === "quest") return questView(session, city, gameState, portCities);
  if (session.nodeId === "marque") return marqueView(session, city, gameState, context);
  if (session.nodeId === "loadout") return loadoutView(session, city, gameState, context);
  if (session.nodeId === "shipyard") return shipyardView(session, city, gameState, context);
  if (session.nodeId === "viking-longship") return vikingLongshipView(session, city, gameState, context);
  throw new Error(`Unknown dialogue node: ${session.nodeId}`);
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
  if (action.type === "close") return { closed: true };
  if (action.type === "node") {
    if (action.nodeId === "buy") session.marketPurchases = {};
    if (session.nodeId === "trade-tip") session.tradeTip = null;
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
      simMinute: context.simMinute ?? 0
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
  if (action.type === "attempt-ming-illicit-trade") {
    if (typeof context.random !== "function") {
      throw new Error("Ming illicit market attempt requires a random source");
    }
    if (session.mingIllicitTradeAttempted) {
      throw new Error("Ming illicit market may only be approached once per port visit");
    }
    session.mingIllicitTradeAttempted = true;
    if (resolveMingIllicitMarketAttempt(context.random())) {
      session.mingIllicitTradeAccess = true;
      session.feedback = "A discreet broker agrees to handle your cargo until you leave port.";
    } else {
      adjustFactionReputation(gameState, MING_FACTION_ID, -MING_ILLICIT_MARKET_REPUTATION_PENALTY);
      session.feedback = "The broker reports you to the harbor watch. Ming standing fell.";
    }
    session.selectedIndex = 0;
    return { closed: false, mingIllicitMarketAccess: session.mingIllicitTradeAccess };
  }
  if (action.type === "purchase-ship") {
    return { closed: false, action };
  }
  if (action.type === "purchase-viking-longship") {
    return { closed: false, action };
  }
  if (action.type === "deliver-viking-material") {
    const result = deliverVikingLongshipQuestCargo(gameState, city, action.stageId, context);
    session.feedback = `Delivered ${result.completedStage.goodLabel} x${result.completedStage.quantity}.`;
    session.selectedIndex = 0;
    return { closed: false, vikingLongshipDelivery: result };
  }
  if (action.type === "select-loadout") {
    if (!context.shipStats) throw new Error("Selecting a loadout requires player ship stats");
    const result = restockShipLoadoutAtPort(gameState, city, context.shipStats, action.loadoutId, context);
    const shortages = Object.values(result.shortfalls).reduce((sum, value) => sum + value, 0);
    session.feedback = `${result.plan.label} targets set. Crew ${gameState.ship.crew}/${result.plan.crew}, ` +
      `guns ${gameState.ship.cannons}/${result.plan.cannons}.` +
      (shortages > 0 ? " Some stores could not be fitted or afforded." : " Ship fully provisioned.");
    session.nodeId = "root";
    session.selectedIndex = 0;
    return { closed: false, loadoutResult: result };
  }
  if (action.type === "buy") {
    const result = buyGood(gameState, economy, city, action.goodId, 1, tradeContext(session, context));
    recordMarketPurchase(session, result);
    session.feedback = `Bought ${result.good.label} for ${result.price} db.`;
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
  if (action.type === "sell") {
    const result = sellGood(gameState, economy, city, action.goodId, 1, tradeContext(session, context));
    const pnl = result.pnl === null ? "--" : signedDoubloons(result.pnl);
    session.feedback = `Sold ${result.good.label} for ${result.price} db. P/L ${pnl}.`;
    return { closed: false };
  }
  if (action.type === "accept-quest") {
    acceptQuest(gameState, action.quest);
    session.feedback = action.quest.kind === "passenger"
      ? `Accepted passage to ${action.quest.destinationName}.`
      : `Accepted delivery to ${action.quest.destinationName}.`;
    session.nodeId = "quest";
    session.selectedIndex = 0;
    return { closed: false };
  }
  if (action.type === "complete-quest") {
    const quest = completeQuest(gameState, city, context);
    session.feedback = quest.kind === "passenger"
      ? `${passengerName(quest)} went ashore. Earned ${quest.reward} db.`
      : `Delivered. Earned ${quest.reward} db. Standing improved.`;
    session.nodeId = "root";
    session.selectedIndex = 0;
    return { closed: false };
  }
  if (action.type === "request-marque") {
    const result = grantLetterOfMarque(gameState, city, context.shipPower || 0, context);
    const faction = factionById(result.factionId);
    session.feedback = result.grantedNow
      ? `${faction.adjective} letter of marque granted.`
      : `${faction.adjective} letter of marque already held.`;
    session.nodeId = "marque";
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
  if (active?.id === quest.id && isEnvoyQuest(quest) && quest.stage === "outbound" && quest.targetTileId === city.tileId) {
    return {
      speaker,
      expressionId: quest.kind === "friendly-envoy" ? "attentive" : "stern",
      text: quest.dialogue?.negotiation || `The court of ${quest.targetName} is ready to receive me.`,
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
    return { closed: true, action: { type: "envoy-negotiated", negotiation } };
  }
  if (action.type === "complete-passenger") {
    completeQuest(gameState, city, context);
    return { closed: true, action: null };
  }
  throw new Error(`Unknown passenger dialogue action: ${action.type}`);
}

function assertPassengerDialogueSubject(session, city, quest) {
  if (!session || session.kind !== "passenger") throw new Error("Missing passenger dialogue session");
  if (!city || session.cityTileId !== city.tileId) throw new Error("Dialogue city does not match active passenger session");
  if (!quest || (quest.kind !== "passenger" && !isEnvoyQuest(quest)) || session.questId !== quest.id) {
    throw new Error("Dialogue passenger quest does not match active session");
  }
  if (quest.originTileId !== city.tileId && quest.destinationTileId !== city.tileId) {
    throw new Error(`${cityLabel(city)} is not part of passenger quest ${quest.id}`);
  }
}

function greetingView(session, city, gameState, context) {
  const memory = portMemory(gameState, city);
  if (city.isPirateHideout) return pirateHideoutGreetingView(city, memory, context);
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
    rivalLabel: context.rivalLabel || null,
    shipyardRumor: context.shipyardRumor || null,
    rulerRumor: context.rulerRumor || null,
    historicalGossip: context.historicalGossip || null
  });
  return {
    speaker: speakerName(city),
    expressionId: greeting.expressionId,
    text: greeting.text,
    feedback: null,
    options: [option("Continue", { type: "node", nodeId: "root" })]
  };
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
      `Land marines  ${conquest.successPercent}%`,
      { type: "land-marines" },
      {
        detail: `Defeat risks ${conquest.failureCrewLossMin}-${conquest.failureCrewLossMax} crew`
      }
    ));
  }
  if (status.hostile && !status.locked && !conquest?.playerAssaultActive) {
    options.push(option("Try to enter in disguise", { type: "attempt-disguise" }));
  }
  options.push(option("Leave", { type: "close" }));
  return {
    speaker: `${cityLabel(city)} harbor guard`,
    expressionId: "stern",
    text: conquest?.canAttempt
      ? `The harbor guns are silent. ${cityLabel(city)} is exposed, but ${conquest.capital ? "the capital garrison" : "the garrison"} still bars the quays.`
      : conquest?.playerAssaultActive
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
  const tradeAccess = playerMingTradeAccess(session, city, gameState, context);
  const activeQuest = gameState.memory.quests?.active || null;
  const canCompleteQuest = activeQuest?.destinationTileId === city.tileId;
  const options = [
    ...(tradeAccess.allowed
      ? [option(pirateHideout ? "Buy doubtful goods" : tradeAccess.illicit ? "Buy illicit goods" : "Buy goods", {
        type: "node",
        nodeId: "buy"
      })]
      : !session.mingIllicitTradeAttempted
        ? [option("Seek illicit market", { type: "attempt-ming-illicit-trade" })]
        : []),
    option("Equipment", { type: "node", nodeId: "equipment" }),
    ...(context.shipStats ? [option(pirateHideout ? "Refit and provision" : "Ship loadout", {
      type: "node",
      nodeId: "loadout"
    })] : []),
    option(pirateHideout ? "Visit the hidden yard" : "Visit shipyard", { type: "node", nodeId: "shipyard" }),
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
  if (isVikingLongshipQuestPort(city) && !session.disguisedEntry) {
    options.splice(4, 0, option("Speak with the historical enthusiast", {
      type: "node",
      nodeId: "viking-longship"
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
  options.push(
    option("Cargo ledger", { type: "node", nodeId: "cargo" }),
    option(pirateHideout ? "Lie low in the cove" : "Wait safely in port", { type: "wait-in-port" }),
    option(pirateHideout ? "Put to sea" : "Leave port", { type: "close" })
  );
  return {
    speaker: speakerName(city),
    expressionId: feedbackExpressionId(session.feedback),
    text: pirateHideout
      ? `Powder, provisions, and silence are all for sale. Cove specie: ${market.specie} db.`
      : session.disguisedEntry
      ? `Keep your disguise intact. Market specie: ${market.specie} db.`
      : tradeAccess.restricted && !tradeAccess.allowed
      ? "The maritime prohibition closes this market to foreign trade. Harbor services remain available."
      : tradeAccess.illicit
      ? `Keep your market business discreet. Market specie: ${market.specie} db.`
      : `What business brings you to port? Market specie: ${market.specie} db.`,
    feedback: session.feedback,
    options
  };
}

function playerMingTradeAccess(session, city, gameState, context) {
  return mingTradeAccess({
    portFactionId: city.factionId || "neutral",
    traderFactionId: gameState.playerCharacter?.nationalityId || "neutral",
    simMinute: context.simMinute ?? 0,
    openTrade: mingTradeOpenToFaction(
      gameState,
      gameState.playerCharacter?.nationalityId || "neutral"
    ),
    illicitAccess: session.mingIllicitTradeAccess === true,
    disguisedEntry: session.disguisedEntry === true
  });
}

function tradeContext(session, context) {
  return {
    ...context,
    mingIllicitTradeAccess: session.mingIllicitTradeAccess === true,
    disguisedEntry: session.disguisedEntry === true
  };
}

function vikingLongshipView(session, city, gameState, context) {
  const quest = vikingLongshipQuestState(gameState, city);
  if (!quest) throw new Error("Viking longship dialogue opened outside Hafnarfjordur");
  const speaker = `${characterName(city.character)}, historical enthusiast`;
  if (!quest.unlocked) {
    const stage = quest.stage;
    const introductions = [
      "I am a historical enthusiast, reconstructing a seaworthy Norse longship from the old sagas. First I need enough wool for",
      "The striped sail is ready. Next I need straight, seasoned timber for",
      "The oar bank is fitted. One last material remains: iron for"
    ];
    return {
      speaker,
      expressionId: quest.canDeliver ? "pleased" : "attentive",
      text: `${introductions[quest.stageIndex]} ${stage.purpose}. Bring me ${stage.quantity} ${stage.goodLabel.toLowerCase()}.`,
      feedback: session.feedback,
      options: [
        option(`Deliver ${stage.goodLabel} x${stage.quantity}`, {
          type: "deliver-viking-material",
          stageId: stage.id
        }, {
          disabled: !quest.canDeliver,
          disabledReason: `Need ${stage.quantity} ${stage.goodLabel.toLowerCase()}; hold has ${quest.held}.`
        }),
        option("Back", { type: "node", nodeId: "root" })
      ]
    };
  }

  const stats = shipStatsForSlug(VIKING_LONGSHIP_SLUG);
  const alreadyOwned = context.shipStats?.slug === VIKING_LONGSHIP_SLUG;
  const cargoDoesNotFit = cargoUsed(gameState) > stats.cargoCapacity;
  const cannotAfford = gameState.doubloons < VIKING_LONGSHIP_PRICE;
  const disabledReason = alreadyOwned
    ? "You already command the reconstructed longship."
    : cargoDoesNotFit
      ? `Your current cargo will not fit its ${stats.cargoCapacity}-unit hold.`
      : cannotAfford
        ? `You need ${VIKING_LONGSHIP_PRICE - gameState.doubloons} more doubloons.`
        : null;
  const shipLabel = shipLabelForSlug(VIKING_LONGSHIP_SLUG);
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
      }
    },
    options: [
      option(`Buy ${shipLabel}  ${VIKING_LONGSHIP_PRICE} db`, {
        type: "purchase-viking-longship",
        shipSlug: VIKING_LONGSHIP_SLUG
      }, {
        disabled: Boolean(disabledReason),
        disabledReason
      }),
      option("Back", { type: "node", nodeId: "root" })
    ]
  };
}

function equipmentView(session, city, gameState, economy) {
  const nets = equipmentStockAtPort(economy, city, EQUIPMENT_STOCK_FISHING_NET, FISHING_NETS);
  const cannonEquipment = equipmentStockAtPort(economy, city, EQUIPMENT_STOCK_CANNON, CANNON_EQUIPMENT);
  const cannonArmed = Boolean(gameState.ship && gameState.ship.cannonCapacity > 0);
  return {
    speaker: speakerName(city),
    expressionId: feedbackExpressionId(session.feedback),
    text: `Local outfitters carry ${nets.length} net type${nets.length === 1 ? "" : "s"} and ${cannonEquipment.length} cannon fitting${cannonEquipment.length === 1 ? "" : "s"}. Prosperous ports attract rarer equipment.`,
    feedback: session.feedback,
    options: [
      option("Fishing nets", { type: "node", nodeId: "equipment-nets" }),
      option("Cannon battery", { type: "node", nodeId: "equipment-cannons" }, {
        disabled: !cannonArmed,
        disabledReason: "Your ship has no cannon battery to refit."
      }),
      option("Back", { type: "node", nodeId: "root" })
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

function shipyardView(session, city, gameState, context) {
  const yard = context.shipyard || null;
  const listing = yard?.listing || null;
  if (!listing) {
    return {
      speaker: speakerName(city),
      expressionId: "neutral",
      text: city.isPirateHideout
        ? "The hidden slips can patch any hull, but there is no captured vessel for sale today."
        : yard?.famous
        ? "The master shipwrights have vessels on the stocks, but none ready for sale. New launches are uncommon and word travels quickly."
        : "The slipways handle repairs and local work, but there is no newly built vessel for sale today.",
      feedback: session.feedback,
      options: [option("Back", { type: "node", nodeId: "root" })]
    };
  }
  const stats = shipStatsForSlug(listing.shipSlug);
  const cargoDoesNotFit = cargoUsed(gameState) > stats.cargoCapacity;
  const alreadyOwned = context.shipStats?.slug === listing.shipSlug;
  const cannotAfford = gameState.doubloons < listing.price;
  const disabledReason = alreadyOwned
    ? "You already command this type of vessel."
    : cargoDoesNotFit
      ? `Your current cargo will not fit its ${stats.cargoCapacity}-unit hold.`
      : cannotAfford
        ? `You need ${listing.price - gameState.doubloons} more doubloons.`
        : null;
  return {
    speaker: city.isPirateHideout ? `${cityLabel(city)} hidden yard` : `${cityLabel(city)} shipyard`,
    expressionId: "attentive",
    text: `A newly built ${listing.shipLabel} is offered for ${listing.price} doubloons. Your purse holds ${gameState.doubloons}.`,
    feedback: session.feedback,
    presentation: { kind: "shipyard", listing },
    options: [
      option(`Buy ${listing.shipLabel}  ${listing.price} db`, {
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

function buyView(session, city, gameState, economy, context) {
  const marketRows = portMarket(economy, city).filter((row) => row.listedForSale && row.stock > 0);
  const supplyIds = new Set([FRESH_WATER_GOOD_ID, HARDTACK_GOOD_ID]);
  const tradeRows = marketRows
    .filter((row) => !supplyIds.has(row.good.id))
    .sort((a, b) => b.productionPerDay - a.productionPerDay || a.buyPrice - b.buyPrice)
    .slice(0, 5);
  const rows = tradeRows
    .map((row) => {
      const totalSize = row.good.unitSize;
      const comparison = worldMarketPriceComparison(economy, city, row.good.id, "buy");
      return option(`Buy ${row.good.label}  ${row.buyPrice} db`, { type: "buy", goodId: row.good.id }, {
        detail: `${worldPriceIndicator(comparison)}  STOCK ${row.stock}`,
        disabled: gameState.doubloons < row.buyPrice || cargoFree(gameState) < totalSize,
        disabledReason: gameState.doubloons < row.buyPrice ? "Not enough doubloons." : "Cargo hold is full."
      });
    });
  if (context.shipStats) rows.unshift(option("Change ship loadout", { type: "leave-buy", nodeId: "loadout" }));
  rows.push(option("Back", { type: "leave-buy", nodeId: "root" }));
  return {
    speaker: speakerName(city),
    expressionId: feedbackExpressionId(session.feedback),
    text: city.isPirateHideout
      ? `No receipts, no questions. Doubloons ${gameState.doubloons}. Cargo ${cargoUsed(gameState)}/${gameState.cargoCapacity}.`
      : `${cityLabel(city)} market. Doubloons ${gameState.doubloons}. Cargo ${cargoUsed(gameState)}/${gameState.cargoCapacity}.`,
    feedback: session.feedback,
    optionHeight: 30,
    options: rows
  };
}

function tradeTipView(session, city) {
  const tip = session.tradeTip;
  if (!tip) throw new Error("Trade-tip dialogue requires a computed route");
  return {
    speaker: speakerName(city),
    expressionId: "attentive",
    text: `I hear ${tip.destinationName} buys ${tip.goodLabel} for the best price.`,
    feedback: null,
    options: [option("Continue", { type: "node", nodeId: tip.nextNodeId })]
  };
}

export function bestPurchasedTradeRoute({
  purchases,
  originCity,
  gameState,
  economy,
  portCities,
  simMinute = 0
}) {
  if (!purchases || typeof purchases !== "object" || Array.isArray(purchases)) {
    throw new Error("Trade-route advice requires a purchase record");
  }
  if (!originCity || !Number.isInteger(originCity.tileId)) {
    throw new Error("Trade-route advice requires an origin port");
  }
  if (!Array.isArray(portCities)) throw new Error("Trade-route advice requires candidate ports");

  let best = null;
  for (const purchase of Object.values(purchases)) {
    if (!purchase || !Number.isInteger(purchase.quantity) || purchase.quantity <= 0) {
      throw new Error("Trade-route purchase quantity must be a positive integer");
    }
    if (!Number.isFinite(purchase.cost) || purchase.cost <= 0) {
      throw new Error("Trade-route purchase cost must be positive");
    }
    const good = tradeGoodById(purchase.goodId);
    for (const destination of portCities) {
      if (destination.tileId === originCity.tileId) continue;
      if (!destinationAcceptsPlayerTrade(destination, gameState, simMinute)) continue;
      if (maximumPortPurchaseQuantity(
        economy,
        destination,
        good.id,
        purchase.quantity
      ) < purchase.quantity) continue;
      const revenue = quotePortPurchase(economy, destination, good.id, purchase.quantity);
      const pnl = revenue - purchase.cost;
      const candidate = {
        goodId: good.id,
        goodLabel: good.label,
        destinationTileId: destination.tileId,
        destinationName: cityLabel(destination),
        quantity: purchase.quantity,
        expectedPnl: pnl
      };
      if (betterTradeTip(candidate, best)) best = candidate;
    }
  }
  return best?.expectedPnl > 0 ? best : null;
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
  return mingTradeAccess({
    portFactionId: city.factionId || "neutral",
    traderFactionId: gameState.playerCharacter?.nationalityId || "neutral",
    simMinute,
    openTrade: mingTradeOpenToFaction(
      gameState,
      gameState.playerCharacter?.nationalityId || "neutral"
    ),
    illicitAccess: false,
    disguisedEntry: false
  }).allowed;
}

function betterTradeTip(candidate, current) {
  if (!current || candidate.expectedPnl !== current.expectedPnl) {
    return !current || candidate.expectedPnl > current.expectedPnl;
  }
  if (candidate.destinationName !== current.destinationName) {
    return candidate.destinationName.localeCompare(current.destinationName) < 0;
  }
  return candidate.goodLabel.localeCompare(current.goodLabel) < 0;
}

function loadoutView(session, city, gameState, context) {
  if (!context.shipStats) throw new Error("Loadout view requires player ship stats");
  const currentId = gameState.ship?.loadoutId || null;
  const rows = SHIP_LOADOUT_PRESETS.map((preset) => {
    const plan = shipLoadoutPlan(context.shipStats, preset.id);
    const selected = currentId === preset.id;
    return option(`${selected ? "* " : ""}${preset.label.toUpperCase()}`, {
      type: "select-loadout",
      loadoutId: preset.id
    }, {
      detail: `CREW ${plan.crew}  GUNS ${plan.cannons}  FOOD ${Math.floor(plan.foodDays)}D  WATER ${Math.floor(plan.waterDays)}D`
    });
  });
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

function sellView(session, city, gameState, economy) {
  const market = new Map(portMarket(economy, city).map((row) => [row.good.id, row]));
  const rows = cargoRows(gameState).filter((cargo) => cargo.good.sellable !== false).map((cargo) => {
    const row = market.get(cargo.good.id);
    if (!row) throw new Error(`${cityLabel(city)} market has no quote for ${cargo.good.id}`);
    const price = row.sellPrice;
    const basis = cargoCostBasis(gameState, cargo.good.id);
    const pnlLabel = basis.known ? signedDoubloons(price - basis.average) : "--";
    const comparison = worldMarketPriceComparison(economy, city, cargo.good.id, "sell");
    return option(`Sell ${cargo.good.label}  ${price} db`, {
      type: "sell",
      goodId: cargo.good.id
    }, {
      detail: `${worldPriceIndicator(comparison)}  P/L ${pnlLabel}  HELD ${cargo.quantity}`,
      disabled: row.portSpecie < price,
      disabledReason: "The market is out of specie."
    });
  });
  if (rows.length === 0) {
    rows.push(option("No cargo to sell", { type: "node", nodeId: "sell" }, {
      disabled: true,
      disabledReason: "The hold has no cargo buyers will take."
    }));
  }
  rows.push(option("Back", { type: "node", nodeId: "root" }));
  return {
    speaker: speakerName(city),
    expressionId: feedbackExpressionId(session.feedback),
    text: city.isPirateHideout
      ? `The fences care about value, not provenance. Cargo ${cargoUsed(gameState)}/${gameState.cargoCapacity}.`
      : `Buyers here pay port rates. Cargo ${cargoUsed(gameState)}/${gameState.cargoCapacity}.`,
    feedback: session.feedback,
    optionHeight: 30,
    options: rows
  };
}

function cargoView(session, city, gameState) {
  const rows = cargoRows(gameState);
  const cargoText = rows.length > 0
    ? rows.map((row) => `${row.good.label} x${row.quantity}`).join(", ")
    : "The hold is empty.";
  return {
    speaker: speakerName(city),
    expressionId: "neutral",
    text: `${cargoText} Doubloons ${gameState.doubloons}. Space ${cargoUsed(gameState)}/${gameState.cargoCapacity}.`,
    feedback: session.feedback,
    options: [
      option("Back", { type: "node", nodeId: "root" }),
      option("Leave port", { type: "close" })
    ]
  };
}

function questView(session, city, gameState, portCities) {
  const questState = questStateForCity(gameState, city, portCities);
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
          option("Back", { type: "node", nodeId: "root" })
        ]
      };
    }
    return {
      speaker: speakerName(city),
      expressionId: "pleased",
      text: `That packet bears our seal. Hand it over and I will pay ${questState.quest.reward} db.`,
      feedback: session.feedback,
      options: [
        option(`Complete delivery  ${questState.quest.reward} db`, { type: "complete-quest" }),
        option("Back", { type: "node", nodeId: "root" })
      ]
    };
  }
  if (questState.kind === "available") {
    return {
      speaker: speakerName(city),
      expressionId: "attentive",
      text: `A sealed packet needs passage to ${questState.quest.destinationName}, ${formatDistanceKm(questState.quest.distanceKm)} away. Payment is ${questState.quest.reward} db on delivery.`,
      feedback: session.feedback,
      options: [
        option(`Accept delivery to ${questState.quest.destinationName}`, {
          type: "accept-quest",
          quest: questState.quest
        }, {
          detail: formatDistanceKm(questState.quest.distanceKm)
        }),
        option("Back", { type: "node", nodeId: "root" })
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
        option("Back", { type: "node", nodeId: "root" })
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
        option("Back", { type: "node", nodeId: "root" })
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
        : `You are carrying ${passengerName(quest)} from ${quest.originName} to ${quest.destinationName}; finish that passage first.`,
      feedback: session.feedback,
      options: [
        option("Back", { type: "node", nodeId: "root" })
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
      option("Back", { type: "node", nodeId: "root" })
    ]
  };
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
  const faction = factionById(status.factionId);
  const ruler = rulerAtMinute(status.factionId, context.simMinute ?? 0);
  if (!ruler) throw new Error(`Letter of marque faction has no ruler: ${status.factionId}`);
  const text = status.granted
    ? `You already carry ${ruler.displayName}'s authority to prize enemies of ${faction.name}.`
    : `${ruler.displayName}'s court will issue a letter if your standing and fighting ship are sufficient. Standing ${signedReputation(status.reputation)}/${signedReputation(status.reputationRequired)}. Ship strength ${Math.round(status.shipPower)}/${status.shipPowerRequired}.`;
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

function option(label, action, details = {}) {
  return {
    label,
    action,
    detail: details.detail || null,
    disabled: !!details.disabled,
    disabledReason: details.disabledReason || null
  };
}

function signedDoubloons(value) {
  const rounded = Math.round(value);
  return `${rounded >= 0 ? "+" : ""}${rounded} db`;
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

function signedReputation(value) {
  const rounded = Math.round(value);
  return `${rounded >= 0 ? "+" : ""}${rounded}`;
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
    .map(([goodId, quantity]) => `${tradeGoodById(goodId).label} x${quantity}`);
  if (rows.length === 0) return "";
  if (rows.length <= 2) return rows.join(" and ");
  return `${rows.slice(0, 2).join(", ")}, and other goods`;
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

function portFlavor(city) {
  const population = city.population || 0;
  if (population >= 150000) return "The quay is crowded enough to hide a dozen fortunes.";
  if (population >= 60000) return "There is steady trade if your hold has room.";
  return "Small harbors remember generous captains.";
}
