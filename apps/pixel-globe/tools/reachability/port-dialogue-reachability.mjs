import {
  createPortDialogueSession,
  enterPortCityLocation,
  portCityNavigationView,
  portDialogueView,
  selectPortDialogueOption
} from "../../src/dialogueSystem.js";
import { createWorldEconomy } from "../../src/economy.js";
import { validateGameState } from "../../src/gameState.js";
import { portCityStaffRoleForDialogueSession } from "../../src/portCityStaff.js";
import { portInnDialogue } from "../../src/portInnDialogue.js";
import { shipStatsForSlug } from "../../src/shipStats.js";
import { shipyardAtPort } from "../../src/shipyards.js";
import { createPlayerTestGameState } from "../../src/test-fixtures/createTestGameState.js";
import { exploreReachableActionGraph } from "./action-graph.mjs";

const PLAYER_SHIP_SLUG = "brigantine";
const FAST_NAVIGATION_ACTION_TYPES = new Set([
  "close",
  "leave-market",
  "node",
  "open-crew-management",
  "open-custom-loadout",
  "shipyard-ledger-tab",
  "switch-market-mode",
  "wait-in-port"
]);
const RELEASE_NAVIGATION_ACTION_TYPES = new Set([
  ...FAST_NAVIGATION_ACTION_TYPES,
  "cancel-market-undo",
  "cancel-quest-cargo-sale",
  "cancel-ship-purchase",
  "cancel-tribute-theft",
  "decline-equipment-factor-pitch",
  "decline-marque-factor-offer",
  "decline-portuguese-cartaz-market",
  "decline-quest-cargo-tip",
  "decline-special-equipment",
  "decline-trade-embargo-purchase",
  "decline-trade-embargo-sale"
]);
const EXTERNAL_TERMINAL_ACTION_TYPES = new Set([
  "close",
  "open-crew-management",
  "wait-in-port"
]);
const QUEST_CHARACTER_NODES = new Set([
  "caribbean-ginger",
  "chef-quest",
  "colonization",
  "conquistador",
  "japanese-matchlocks",
  "viking-longship"
]);

export function auditPortDialogueReachability(catalogCities, {
  profile = "fast"
} = {}) {
  if (!Array.isArray(catalogCities) || catalogCities.length === 0) {
    throw new Error("Port dialogue reachability requires a non-empty city catalog");
  }
  if (!new Set(["fast", "release"]).has(profile)) {
    throw new Error(`Unknown port dialogue reachability profile: ${profile}`);
  }
  const cities = catalogCities.map(reachableCity);
  const cityIds = new Set();
  const reachedNodeIds = new Set();
  const reachedActionTypes = new Set();
  const reachedLocationIds = new Set();
  let stateCount = 0;
  let transitionCount = 0;

  for (const city of cities) {
    if (cityIds.has(city.cityId)) throw new Error(`Duplicate reachable port city: ${city.cityId}`);
    cityIds.add(city.cityId);
  }
  const economy = createWorldEconomy({
    ports: cities,
    shipyardPorts: cities.filter(({ services }) => services.shipyard),
    startMinute: 0,
    seedKey: "reachability:ports"
  });
  const environment = Object.freeze({ cities, economy });

  for (const city of cities) {
    const rootScenario = createScenario(city, environment);
    const rootView = renderScenario(rootScenario);
    validateDialogueView(rootView, rootScenario);
    const navigation = portCityNavigationView(
      rootScenario.session,
      cityForSession(rootScenario),
      rootScenario.gameState,
      rootScenario.economy,
      rootScenario.portCities,
      contextForScenario(rootScenario)
    );
    if (navigation.locations.length === 0) {
      throw new Error(`Reachable port has no city locations: ${city.cityId}`);
    }
    for (const location of navigation.locations) {
      reachedLocationIds.add(location.id);
      reachedNodeIds.add(auditLocationEntry(city, location.id, environment));
    }

    const graph = exploreReachableActionGraph({
      initialState: rootScenario,
      stateKey: scenarioKey,
      view: renderScenario,
      actions: dialogueActions,
      includeAction: ({ disabled, kind }) => (
        disabled !== true && navigationActionTypes(profile).has(kind)
      ),
      transition: transitionScenario,
      validateView: validateDialogueView,
      maxDepth: profile === "release" ? 8 : 1,
      maxStates: profile === "release" ? 96 : 24
    });
    stateCount += graph.stateCount;
    transitionCount += graph.transitionCount;
    for (const nodeId of graph.viewKinds) reachedNodeIds.add(nodeId);
    for (const actionType of graph.actionKinds) reachedActionTypes.add(actionType);
  }

  return Object.freeze({
    profile,
    cityCount: cityIds.size,
    stateCount,
    transitionCount,
    nodeIds: Object.freeze([...reachedNodeIds].sort()),
    actionTypes: Object.freeze([...reachedActionTypes].sort()),
    locationIds: Object.freeze([...reachedLocationIds].sort())
  });
}

function auditLocationEntry(city, locationId, environment) {
  const scenario = createScenario(city, environment);
  const context = contextForScenario(scenario);
  const entry = enterPortCityLocation(
    scenario.session,
    cityForSession(scenario),
    scenario.gameState,
    scenario.economy,
    scenario.portCities,
    locationId,
    context
  );
  if (entry.rootOptionIndex !== null) {
    selectPortDialogueOption(
      scenario.session,
      cityForSession(scenario),
      scenario.gameState,
      scenario.economy,
      scenario.portCities,
      entry.rootOptionIndex,
      context
    );
  }
  validateDialogueView(renderScenario(scenario), scenario);
  return scenario.session.nodeId;
}

function createScenario(city, environment) {
  const shipStats = shipStatsForSlug(PLAYER_SHIP_SLUG);
  const gameState = createPlayerTestGameState({
    cargoCapacity: shipStats.cargoCapacity,
    shipStats,
    voyageSeed: `reachability:${city.cityId}`
  });
  gameState.doubloons = 10_000;
  return {
    city,
    gameState,
    economy: environment.economy,
    portCities: environment.cities,
    shipStats,
    session: createPortDialogueSession(city, {
      initialNodeId: "root",
      admittedToPort: true
    })
  };
}

function renderScenario(scenario) {
  const view = portDialogueView(
    scenario.session,
    cityForSession(scenario),
    scenario.gameState,
    scenario.economy,
    scenario.portCities,
    contextForScenario(scenario)
  );
  return { ...view, kind: scenario.session.nodeId };
}

function transitionScenario(scenario, offered) {
  const next = {
    ...scenario,
    gameState: structuredClone(scenario.gameState),
    session: structuredClone(scenario.session)
  };
  const context = contextForScenario(next);
  const result = selectPortDialogueOption(
    next.session,
    cityForSession(next),
    next.gameState,
    next.economy,
    next.portCities,
    offered.index,
    context
  );
  validateGameState(next.gameState);
  if (result.closed === true || EXTERNAL_TERMINAL_ACTION_TYPES.has(offered.kind)) return null;
  return next;
}

function contextForScenario(scenario) {
  return {
    random: () => 0.75,
    missionGiftRandom: () => 0.75,
    simMinute: 0,
    dayIndex: 0,
    localHour: 12,
    arrivalGreetingPresented: true,
    playerShipSlug: scenario.shipStats.slug,
    shipPower: scenario.gameState.ship.cannons + scenario.shipStats.hitPoints,
    shipStats: scenario.shipStats,
    nearbyShips: { merchants: 0, warships: 0, pirates: 0, fishermen: 0, whalers: 0 },
    playerStanding: 0,
    shipyard: scenario.city.services.shipyard
      ? shipyardAtPort(scenario.economy.shipyards, scenario.city)
      : null,
    nearestShipyardListing: null,
    passengerOffers: [],
    portCities: scenario.portCities,
    sailingDistanceKm: () => 100,
    innDialogue: portInnDialogue({
      city: scenario.city,
      homeCity: scenario.city,
      speakerName: scenario.gameState.playerCharacter.name,
      variantSeed: 0
    }),
    prepareCrewRecruitment: () => {
      throw new Error("Reachability navigation must not fabricate a crew offer");
    }
  };
}

function cityForSession(scenario) {
  if (QUEST_CHARACTER_NODES.has(scenario.session.nodeId)) {
    return {
      ...scenario.city,
      character: {
        id: `${scenario.city.cityId}:${scenario.session.nodeId}:quest-character`,
        name: "Reachability quest character",
        role: "quest-character",
        personalityId: "vigilant"
      }
    };
  }
  const role = portCityStaffRoleForDialogueSession(scenario.session);
  return {
    ...scenario.city,
    character: {
      id: `${scenario.city.cityId}:${role}`,
      name: `Reachability ${role}`,
      role,
      personalityId: "vigilant"
    }
  };
}

function reachableCity(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new Error("Reachable city catalog entries must be objects");
  }
  if (record.id !== record.cityId || typeof record.cityId !== "string" || record.cityId === "") {
    throw new Error(`Reachable city has invalid canonical identity: ${record.id}`);
  }
  if (!record.services || typeof record.services.shipyard !== "boolean") {
    throw new Error(`Reachable city has no service contract: ${record.cityId}`);
  }
  return Object.freeze({
    ...record,
    displayCity: record.label,
    portId: record.cityId,
    character: Object.freeze({
      id: `${record.cityId}:harbour-master`,
      name: "Reachability harbour-master",
      role: "harbour-master",
      personalityId: "vigilant"
    })
  });
}

function dialogueActions(view) {
  return view.options.map((entry, index) => ({
    kind: entry.action.type,
    disabled: entry.disabled === true,
    index
  }));
}

function navigationActionTypes(profile) {
  return profile === "release" ? RELEASE_NAVIGATION_ACTION_TYPES : FAST_NAVIGATION_ACTION_TYPES;
}

function scenarioKey(scenario) {
  const session = scenario.session;
  return JSON.stringify({
    nodeId: session.nodeId,
    cityMenuLocationId: session.cityMenuLocationId,
    marketMode: session.marketMode,
    shipyardLedgerTab: session.shipyardLedgerTab,
    specialEquipmentOffer: session.specialEquipmentOffer,
    equipmentFactorPitchOutcome: session.equipmentFactorPitchOutcome,
    letterOfMarqueFactorOfferOutcome: session.letterOfMarqueFactorOfferOutcome,
    portugueseCartazMarketPending: session.portugueseCartazMarketPending,
    portugueseCartazMarketOfferDeclined: session.portugueseCartazMarketOfferDeclined,
    tradeTip: session.tradeTip,
    questCargoTip: session.questCargoTip,
    customLoadoutDraft: session.customLoadoutDraft || null
  });
}

function validateDialogueView(view, scenario) {
  const cityId = scenario.city.cityId;
  if (typeof view.speaker !== "string" || view.speaker.trim() === "") {
    throw new Error(`Reachable ${scenario.session.nodeId} view has no speaker: ${cityId}`);
  }
  if (typeof view.text !== "string" || view.text.trim() === "") {
    throw new Error(`Reachable ${scenario.session.nodeId} view has no text: ${cityId}`);
  }
  if (!Array.isArray(view.options) || view.options.length === 0) {
    throw new Error(`Reachable ${scenario.session.nodeId} view has no options: ${cityId}`);
  }
  for (const option of view.options) {
    if (typeof option.label !== "string" || option.label.trim() === "") {
      throw new Error(`Reachable ${scenario.session.nodeId} option has no label: ${cityId}`);
    }
    if (!option.action || typeof option.action.type !== "string" || option.action.type === "") {
      throw new Error(`Reachable ${scenario.session.nodeId} option has no action: ${cityId}`);
    }
  }
}
