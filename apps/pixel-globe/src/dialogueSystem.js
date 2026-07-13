import {
  acceptQuest,
  buyGood,
  cargoCostBasis,
  cargoFree,
  cargoRows,
  cargoUsed,
  cityLabel,
  completeQuest,
  grantLetterOfMarque,
  letterOfMarqueStatus,
  portMemory,
  playerFishingNet,
  purchaseFishingNet,
  questStateForCity,
  restockShipLoadoutAtPort,
  sellGood
} from "./gameState.js";
import {
  FRESH_WATER_GOOD_ID,
  HARDTACK_GOOD_ID,
  portEconomySummary,
  portMarket,
  tradeGoodById,
  worldMarketPriceComparison
} from "./economy.js";
import { factionById } from "./factions.js";
import { portGreetingPresentationForPersonality, portPersonalityForKey } from "./portDialoguePersonality.js";
import { SHIP_LOADOUT_PRESETS, shipLoadoutPlan } from "./shipLoadouts.js";
import { shipStatsForSlug } from "./shipStats.js";
import { FISHING_NETS } from "./fishingNets.js";

export function createPortDialogueSession(city, options = {}) {
  return {
    kind: "port",
    cityTileId: city.tileId,
    portId: city.portId || `city-${city.tileId}`,
    nodeId: options.initialNodeId || "greeting",
    disguisedEntry: options.disguisedEntry === true,
    nextPortNodeId: options.nextPortNodeId || null,
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
      continueToPortOnClose: true,
      nextPortNodeId: needsLoadout ? "loadout" : "greeting"
    };
  }
  return createPortDialogueSession(city, {
    initialNodeId: needsLoadout ? "loadout" : "greeting"
  });
}

export function createPassengerDialogueSession(city, quest, options = {}) {
  if (!quest || quest.kind !== "passenger") throw new Error("Passenger dialogue requires a passenger quest");
  return {
    kind: "passenger",
    cityTileId: city.tileId,
    questId: quest.id,
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
  if (session.nodeId === "nets") return fishingNetView(session, city, gameState);
  if (session.nodeId === "sell") return sellView(session, city, gameState, economy);
  if (session.nodeId === "cargo") return cargoView(session, city, gameState);
  if (session.nodeId === "quest") return questView(session, city, gameState, portCities);
  if (session.nodeId === "marque") return marqueView(session, city, gameState, context);
  if (session.nodeId === "loadout") return loadoutView(session, city, gameState, context);
  if (session.nodeId === "shipyard") return shipyardView(session, city, gameState, context);
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
    session.nodeId = action.nodeId;
    session.selectedIndex = 0;
    session.feedback = null;
    return { closed: false };
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
  if (action.type === "purchase-ship") {
    return { closed: false, action };
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
    const result = buyGood(gameState, economy, city, action.goodId, 1, context);
    session.feedback = `Bought ${result.good.label} for ${result.price} db.`;
    return { closed: false };
  }
  if (action.type === "buy-net") {
    const result = purchaseFishingNet(gameState, city, action.netId, context);
    session.feedback = `${result.net.label} fitted for ${result.price} db.`;
    session.nodeId = "nets";
    session.selectedIndex = 0;
    return { closed: false, fishingNetPurchase: result };
  }
  if (action.type === "sell") {
    const result = sellGood(gameState, economy, city, action.goodId, 1, context);
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
  const speaker = `${passengerName(quest)}, passenger`;
  const expressionId = questExpressionId(quest);
  if (active?.id === quest.id && quest.destinationTileId === city.tileId) {
    return {
      speaker,
      expressionId: "happy",
      text: quest.dialogue?.arrival || `${cityLabel(city)} at last. Here is the fare I promised.`,
      feedback: session.feedback,
      options: [
        option(`Set passenger ashore  ${quest.reward} db`, { type: "complete-passenger" }),
        option("Not yet", { type: "close" })
      ]
    };
  }
  if (active?.id === quest.id) {
    return {
      speaker,
      expressionId: "attentive",
      text: quest.dialogue?.underway || `I am bound for ${quest.destinationName}.`,
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
      option(`Take passenger to ${quest.destinationName}  ${quest.reward} db`, { type: "accept-passenger" }, {
        detail: `${formatDistanceKm(quest.distanceKm)} GREAT-CIRCLE`
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
  if (action.type === "complete-passenger") {
    completeQuest(gameState, city, context);
    return { closed: true, action: null };
  }
  throw new Error(`Unknown passenger dialogue action: ${action.type}`);
}

function assertPassengerDialogueSubject(session, city, quest) {
  if (!session || session.kind !== "passenger") throw new Error("Missing passenger dialogue session");
  if (!city || session.cityTileId !== city.tileId) throw new Error("Dialogue city does not match active passenger session");
  if (!quest || quest.kind !== "passenger" || session.questId !== quest.id) {
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
    shipyardRumor: context.shipyardRumor || null
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
  if (!status?.hostile) throw new Error("Barred port dialogue requires a hostile port status");
  const faction = factionById(status.factionId);
  if (status.locked) {
    return {
      speaker: `${cityLabel(city)} harbor guard`,
      expressionId: "angry",
      text: `We know this vessel. The harbor watch is waiting for you. This port remains closed for ${status.lockDaysRemaining} more day${status.lockDaysRemaining === 1 ? "" : "s"}.`,
      feedback: null,
      options: [option("Leave", { type: "close" })]
    };
  }
  return {
    speaker: `${cityLabel(city)} harbor guard`,
    expressionId: "stern",
    text: `By order of the ${faction.name}, your ship is barred from ${cityLabel(city)}. Turn about. No supplies will be sold to you.`,
    feedback: null,
    options: [
      option("Try to enter in disguise", { type: "attempt-disguise" }),
      option("Leave", { type: "close" })
    ]
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
  const activeQuest = gameState.memory.quests?.active || null;
  const canCompleteQuest = activeQuest?.destinationTileId === city.tileId;
  const options = [
    option(pirateHideout ? "Buy doubtful goods" : "Buy goods", { type: "node", nodeId: "buy" }),
    option("Fishing gear", { type: "node", nodeId: "nets" }),
    ...(context.shipStats ? [option(pirateHideout ? "Refit and provision" : "Ship loadout", {
      type: "node",
      nodeId: "loadout"
    })] : []),
    option(pirateHideout ? "Visit the hidden yard" : "Visit shipyard", { type: "node", nodeId: "shipyard" }),
    option(pirateHideout ? "Fence cargo" : "Sell cargo", { type: "node", nodeId: "sell" }),
    ...(!pirateHideout && (!session.disguisedEntry || canCompleteQuest)
      ? [option(session.disguisedEntry ? "Complete current job" : "Ask about work", {
        type: "node",
        nodeId: "quest"
      })]
      : [])
  ];
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
      : `What business brings you to port? Market specie: ${market.specie} db.`,
    feedback: session.feedback,
    options
  };
}

function fishingNetView(session, city, gameState) {
  const current = playerFishingNet(gameState);
  const rows = FISHING_NETS.map((net) => {
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
  rows.push(option("Back", { type: "node", nodeId: "root" }));
  return {
    speaker: speakerName(city),
    expressionId: feedbackExpressionId(session.feedback),
    text: `Current gear: ${current.label}. Better nets improve catch odds and maximum haul. Purse ${gameState.doubloons} db.`,
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
  if (context.shipStats) rows.unshift(option("Change ship loadout", { type: "node", nodeId: "loadout" }));
  rows.push(option("Back", { type: "node", nodeId: "root" }));
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
    if (questState.quest.kind === "passenger") {
      return {
        speaker: speakerName(city),
        expressionId: "happy",
        text: `${passengerName(questState.quest)} has reached ${questState.quest.destinationName}. Let them go ashore and settle the fare.`,
        feedback: session.feedback,
        options: [
          option(`Set passenger ashore  ${questState.quest.reward} db`, { type: "complete-quest" }),
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
          detail: `${formatDistanceKm(questState.quest.distanceKm)} GREAT-CIRCLE`
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
  if (quest.kind === "passenger") {
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
  const text = status.granted
    ? `You already carry ${faction.adjective} authority to prize enemy shipping.`
    : `The ${faction.adjective} court will issue a letter if your standing and fighting ship are sufficient. Standing ${signedReputation(status.reputation)}/${signedReputation(status.reputationRequired)}. Ship strength ${Math.round(status.shipPower)}/${status.shipPowerRequired}.`;
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

function worldPriceIndicator(comparison) {
  if (comparison.direction === "high") return `↗ ${Math.abs(comparison.percent)}% VS WORLD`;
  if (comparison.direction === "low") return `↘ ${Math.abs(comparison.percent)}% VS WORLD`;
  return "= WORLD PRICE";
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
