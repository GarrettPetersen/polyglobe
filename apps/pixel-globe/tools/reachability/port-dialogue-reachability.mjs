import {
  createPortDialogueSession,
  enterPortCityLocation,
  portCityNavigationView,
  portDialogueView,
  selectPortDialogueOption
} from "../../src/dialogueSystem.js";
import { chefQuestState, maybeSpawnChefQuest } from "../../src/chefQuest.js";
import { VIKING_LONGSHIP_FETCH_STAGES, VIKING_LONGSHIP_PRICE, VIKING_LONGSHIP_SLUG,
  maybeSpawnVikingLongshipQuest } from "../../src/vikingLongshipQuest.js";
import { CARIBBEAN_GINGER_FETCH_STAGE, maybeSpawnCaribbeanGingerQuest } from "../../src/caribbeanGingerQuest.js";
import { createWorldEconomy } from "../../src/economy.js";
import { createCrewRecruitmentOffer } from "../../src/crewMembers.js";
import { cargoUsed, hireCrewMemberAtPort, setPlayerShipStats, validateGameState } from "../../src/gameState.js";
import assert from "node:assert/strict";
import { completeChefRecruitment, completeVikingLongshipAcquisition } from "../../src/innQuestTransactions.js";
import { dialogueOptionIconId } from "../../src/gameIcons.js";
import { portCityStaffRoleForDialogueSession, portDialogueHasCaptainSpeaker } from "../../src/portCityStaff.js";
import { portInnDialogue } from "../../src/portInnDialogue.js";
import { SHIP_STATS, shipStatsForSlug } from "../../src/shipStats.js";
import { CREW_PER_HOLD_UNIT } from "../../src/shipLoadouts.js";
import { shipyardAtPort } from "../../src/shipyards.js";
import { createPlayerTestGameState } from "../../src/test-fixtures/createTestGameState.js";
import { initializeTestProvisionalShipLoadout, setTestCrewCount } from "../../src/test-fixtures/crewTestFixtures.js";
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

export function* innQuestBoundaryScenarios(catalogCities) {
  const cities = catalogCities.map(reachableCity);
  const economy = createWorldEconomy({ ports: cities, shipyardPorts: cities.filter(({ services }) => services.shipyard), startMinute: 0, seedKey: "action-boundaries" });
  freezeEconomyRecords(economy);
  for (const [cityId, nodeId] of [["hafnarfjordur|iceland", "viking-longship"], ["lisbon|portugal", "chef-quest"]]) {
    const city = cities.find((entry) => entry.cityId === cityId);
    const prepared = createScenario(city, { cities, economy });
    prepared.session.nodeId = nodeId;
    prepared.gameState.cargo = {};
    prepared.gameState.accounts.cargoCostBasis = {};
    const stages = nodeId === "viking-longship" ? VIKING_LONGSHIP_FETCH_STAGES
      : chefQuestState(prepared.gameState, city).ingredients.map(({ goodId }) => ({ goodId, quantity: 1 }));
    for (const { goodId, quantity } of stages) {
      prepared.gameState.cargo[goodId] = quantity;
      prepared.gameState.accounts.cargoCostBasis[goodId] = quantity;
      const view = renderScenario(prepared);
      const index = view.options.findIndex(({ action, disabled }) => action.type.startsWith("deliver-") && !disabled);
      assert.ok(index >= 0, `No delivery for ${nodeId}/${goodId}`);
      Object.assign(prepared, transitionScenario(prepared, { index, kind: view.options[index].action.type }));
    }
    for (const shipStats of SHIP_STATS) {
      // Captains can change ships between delivering a quest and collecting its
      // reward. Include every catalog hull, including the one-berth dhow.
      const hull = { ...prepared, gameState: structuredClone(prepared.gameState), shipStats };
      setTestCrewCount(hull.gameState, 1);
      hull.gameState.cargo = {};
      hull.gameState.accounts.cargoCostBasis = {};
      setPlayerShipStats(hull.gameState, shipStats);
      const rewardBerths = shipStatsForSlug(VIKING_LONGSHIP_SLUG).crewCapacity;
      const crewCounts = [...new Set([1, CREW_PER_HOLD_UNIT, rewardBerths - 1, rewardBerths, rewardBerths + 1, shipStats.crewCapacity]
        .filter((count) => count <= shipStats.crewCapacity))];
      for (const crewCount of crewCounts) {
        for (const doubloons of nodeId === "viking-longship" ? [0, VIKING_LONGSHIP_PRICE - 1, VIKING_LONGSHIP_PRICE] : [0]) {
          for (const hold of ["provisions", "full"]) {
            const scenario = { ...hull, gameState: structuredClone(hull.gameState), session: structuredClone(hull.session) };
            setTestCrewCount(scenario.gameState, crewCount);
            scenario.gameState.doubloons = doubloons;
            if (hold === "full") {
              const quantity = scenario.gameState.cargoCapacity - cargoUsed(scenario.gameState);
              scenario.gameState.cargo.amber = quantity;
              scenario.gameState.accounts.cargoCostBasis.amber = quantity;
            }
            scenario.auditId = `${cityId}/${nodeId}/${shipStats.slug}/crew=${crewCount}/db=${doubloons}/hold=${hold}`;
            yield scenario;
          }
        }
      }
    }
  }
}

export function* crewRecruitmentBoundaryScenarios(catalogCities) {
  const cities = catalogCities.map(reachableCity);
  const city = cities.find(({ cityId }) => cityId === "lisbon|portugal");
  const economy = createWorldEconomy({ ports: cities,
    shipyardPorts: cities.filter(({ services }) => services.shipyard), startMinute: 0, seedKey: "crew-boundaries" });
  freezeEconomyRecords(economy);
  for (const shipStats of SHIP_STATS) {
    for (const crewCount of new Set([1, CREW_PER_HOLD_UNIT, shipStats.crewCapacity - 1, shipStats.crewCapacity]
      .filter((count) => count > 0 && count <= shipStats.crewCapacity))) {
      for (const doubloons of [0, 10_000]) {
        const scenario = createScenario(city, { cities, economy });
        scenario.shipStats = shipStats;
        setTestCrewCount(scenario.gameState, 1);
        scenario.gameState.cargo = {};
        scenario.gameState.accounts.cargoCostBasis = {};
        setPlayerShipStats(scenario.gameState, shipStats);
        setTestCrewCount(scenario.gameState, crewCount);
        scenario.gameState.doubloons = doubloons;
        const quantity = scenario.gameState.cargoCapacity - cargoUsed(scenario.gameState);
        scenario.gameState.cargo.amber = quantity;
        scenario.gameState.accounts.cargoCostBasis.amber = quantity;
        scenario.session.nodeId = "inn-drink";
        const view = renderScenario(scenario);
        const index = view.options.findIndex(({ action }) => action.type === "open-crew-recruitment");
        assert.ok(index >= 0, "Inn must offer recruitment");
        const initial = transitionScenario(scenario, { kind: "open-crew-recruitment", index });
        initial.auditId = `crew-recruitment/${shipStats.slug}/crew=${crewCount}/db=${doubloons}/full-hold`;
        yield initial;
      }
    }
  }
}

export function auditDialogueChoices(scenario) {
  return exploreReachableActionGraph({
    initialState: scenario,
    scenarioId: scenario.auditId,
    stateKey: ({ session, gameState }) => JSON.stringify({ session, gameState }),
    view: renderScenario,
    actions: dialogueActions,
    includeAction: ({ disabled }) => !disabled,
    validateExcludedAction: validateDisabledAction,
    transition: (state, offered) => transitionScenario(state, offered, { executeHostEffects: true }),
    validateView: validateDialogueView,
    validateState: validateScenarioState,
    followAction: () => false,
    maxDepth: 1,
    maxStates: 1
  });
}

export function auditInnQuestScenario(scenario) {
  return exploreReachableActionGraph({
    initialState: scenario,
    scenarioId: scenario.auditId || `${scenario.city.cityId}/${scenario.session.nodeId}`,
    stateKey: ({ session, gameState }) => JSON.stringify({ session, gameState }),
    view: renderScenario,
    actions: dialogueActions,
    includeAction: ({ disabled }) => !disabled,
    validateExcludedAction: validateDisabledAction,
    transition: (state, offered) => {
      // Leaving this NPC is an explicit terminal edge; its destination is
      // rendered by transitionScenario before the quest-local graph closes.
      const next = transitionScenario(state, offered, { executeHostEffects: true });
      if (offered.kind === "node") {
        if (next) validateDialogueView(renderScenario(next), next);
        return null;
      }
      return next;
    },
    validateView: validateDialogueView,
    validateState: validateScenarioState,
    requireComplete: true,
    maxDepth: 12,
    maxStates: 64
  });
}

function validateScenarioState(scenario) {
  validateGameState(scenario.gameState);
}

function validateDisabledAction(scenario, offered) {
  const next = transitionScenario(scenario, offered);
  assert.ok(next, "Disabled choice closed its dialogue");
  assert.deepEqual(next.gameState, scenario.gameState, "Disabled choice mutated game state");
  assert.deepEqual(next.economy, scenario.economy, "Disabled choice mutated world economy");
  assert.equal(next.session.nodeId, scenario.session.nodeId, "Disabled choice advanced its dialogue");
  const action = renderScenario(scenario).options[offered.index].action;
  const state = structuredClone(scenario.gameState);
  const city = cityForSession(scenario);
  const context = contextForScenario(scenario);
  // Bypass the disabled button as a stale/non-UI caller would. The domain
  // assertion must reject the same transition before changing player state.
  if (["accept-viking-longship-reward", "purchase-viking-longship"].includes(action.type)) {
    assert.throws(() => completeVikingLongshipAcquisition(state, city, action, context));
  } else if (action.type === "recruit-chef") {
    assert.throws(() => completeChefRecruitment(state, city, city.character));
  } else if (action.type === "hire-crew-member") {
    assert.throws(() => hireCrewMemberAtPort(state, city, action.memberId, context));
  }
  assert.deepEqual(state, scenario.gameState, "Rejected domain action mutated player state");
}

export function auditInnQuestDialogueReachability(catalogCities) {
  const cities = catalogCities.map(reachableCity);
  const economy = createWorldEconomy({
    ports: cities,
    shipyardPorts: cities.filter(({ services }) => services.shipyard),
    startMinute: 0,
    seedKey: "reachability:inn-quests"
  });
  freezeEconomyRecords(economy);
  const cases = [
    { cityId: "hafnarfjordur|iceland", nodeId: "viking-longship", stages: VIKING_LONGSHIP_FETCH_STAGES },
    { cityId: "havana|cuba", nodeId: "caribbean-ginger", stages: [CARIBBEAN_GINGER_FETCH_STAGE] },
    { cityId: "lisbon|portugal", nodeId: "chef-quest" }
  ];
  return cases.flatMap((entry) => [
    { supplied: false, freeBerth: false },
    { supplied: true, freeBerth: true },
    ...(entry.nodeId === "chef-quest" ? [{ supplied: true, freeBerth: false }] : [])
  ].map(({ supplied, freeBerth }) => {
    const city = cities.find(({ cityId }) => cityId === entry.cityId);
    if (!city) throw new Error(`Inn quest reachability has no ${entry.cityId}`);
    const scenario = createScenario(city, { cities, economy });
    scenario.gameState.cargo = {};
    scenario.gameState.accounts.cargoCostBasis = {};
    if (entry.nodeId === "chef-quest" && !freeBerth) {
      setTestCrewCount(scenario.gameState, scenario.gameState.ship.crewCapacity);
    }
    if (supplied) {
      const stages = entry.stages || chefQuestState(scenario.gameState, city).ingredients
        .map(({ goodId }) => ({ goodId, quantity: 1 }));
      scenario.gameState.cargo = Object.fromEntries(stages.map(({ goodId, quantity }) => [goodId, quantity]));
      scenario.gameState.accounts.cargoCostBasis = { ...scenario.gameState.cargo };
      scenario.gameState.doubloons = 50_000;
    }
    const root = renderScenario(scenario);
    const index = root.options.findIndex(({ action }) => action.nodeId === entry.nodeId);
    if (index < 0) throw new Error(`Inn quest was not offered: ${entry.nodeId}`);
    const initialState = transitionScenario(scenario, { kind: "node", index });
    const result = auditInnQuestScenario(initialState);
    return { nodeId: entry.nodeId, supplied, freeBerth, ...result };
  }));
}

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
  freezeEconomyRecords(economy);
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
      const locationGraph = auditLocationEntry(city, location.id, environment);
      stateCount += locationGraph.stateCount;
      transitionCount += locationGraph.transitionCount;
      for (const nodeId of locationGraph.viewKinds) reachedNodeIds.add(nodeId);
      for (const actionType of locationGraph.actionKinds) reachedActionTypes.add(actionType);
    }

    const graph = exploreReachableActionGraph({
      initialState: rootScenario,
      stateKey: scenarioKey,
      view: renderScenario,
      actions: dialogueActions,
      includeAction: ({ disabled }) => disabled !== true,
      followAction: ({ kind }) => navigationActionTypes(profile).has(kind),
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
  return exploreReachableActionGraph({
    initialState: scenario,
    stateKey: scenarioKey,
    view: renderScenario,
    actions: dialogueActions,
    includeAction: ({ disabled }) => disabled !== true,
    transition: transitionScenario,
    validateView: validateDialogueView,
    maxDepth: 1,
    maxStates: 48
  });
}

function createScenario(city, environment) {
  const shipStats = shipStatsForSlug(PLAYER_SHIP_SLUG);
  const gameState = createPlayerTestGameState({
    cargoCapacity: shipStats.cargoCapacity,
    shipStats,
    voyageSeed: `reachability:${city.cityId}`
  });
  initializeTestProvisionalShipLoadout(gameState, shipStats);
  gameState.doubloons = 10_000;
  const spawnContext = { spawnChance: 1, simMinute: 0 };
  maybeSpawnChefQuest(gameState, city, spawnContext);
  maybeSpawnVikingLongshipQuest(gameState, city, spawnContext);
  maybeSpawnCaribbeanGingerQuest(gameState, city, spawnContext);
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

function transitionScenario(scenario, offered, { executeHostEffects = false } = {}) {
  const next = {
    ...scenario,
    gameState: structuredClone(scenario.gameState),
    session: structuredClone(scenario.session),
    economy: forkCityEconomy(scenario.economy, scenario.city.cityId)
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
  if (executeHostEffects && result.action) {
    const city = cityForSession(next);
    switch (result.action.type) {
      case "accept-viking-longship-reward":
      case "purchase-viking-longship":
        next.shipStats = completeVikingLongshipAcquisition(next.gameState, city, result.action, context);
        break;
      case "recruit-chef":
        completeChefRecruitment(next.gameState, city, city.character);
        break;
      default:
        throw new Error(`Action audit has no executor for host action ${result.action.type}`);
    }
  }
  if (offered.disabled) assert.ok(result.action == null, "Disabled choice requested a host effect");
  validateGameState(next.gameState);
  if (result.closed === true || EXTERNAL_TERMINAL_ACTION_TYPES.has(offered.kind)) return null;
  return next;
}

function forkCityEconomy(economy, cityId) {
  // These journeys stay in one port. Share immutable distant markets for price
  // comparisons, and give each action its own mutable local market and yard.
  // Cloning the entire world per button made this headless audit take minutes.
  const portStates = new Map(economy.portStates);
  portStates.set(cityId, structuredClone(portStates.get(cityId)));
  const yards = new Map(economy.shipyards.yards);
  if (yards.has(cityId)) yards.set(cityId, structuredClone(yards.get(cityId)));
  return {
    ...economy,
    portStates,
    shipyards: { ...economy.shipyards, yards, npcSales: structuredClone(economy.shipyards.npcSales) }
  };
}

function freezeEconomyRecords(economy) {
  const freeze = (record) => {
    if (!record || typeof record !== "object" || Object.isFrozen(record)) return;
    for (const value of Object.values(record)) freeze(value);
    Object.freeze(record);
  };
  for (const record of economy.portStates.values()) freeze(record);
  for (const record of economy.shipyards.yards.values()) freeze(record);
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
    prepareCrewRecruitment: (options) => createCrewRecruitmentOffer({
      ...options,
      memory: scenario.gameState.memory.crewRecruitment,
      state: scenario.gameState,
      city: scenario.city,
      simMinute: 0,
      targetCrew: scenario.gameState.ship.crewCapacity,
      appearances: [{ appearanceId: "mariner-light-black-hair", crewTypeId: "sailor" }],
      identityForKey: (key) => ({
        name: `Sailor ${key}`, nameCulture: "english", religionId: "roman-catholic", nationalityId: "england"
      }),
      baseHireCost: 2
    })
  };
}

function cityForSession(scenario) {
  if (portDialogueHasCaptainSpeaker(scenario.session)) {
    return { ...scenario.city, character: scenario.gameState.playerCharacter };
  }
  if (QUEST_CHARACTER_NODES.has(scenario.session.nodeId)) {
    return {
      ...scenario.city,
      character: {
        id: `${scenario.city.cityId}:${scenario.session.nodeId}:quest-character`,
        name: "Reachability quest character",
        role: "quest-character",
        personalityId: "vigilant",
        homePortCityId: scenario.city.cityId,
        expressions: ["neutral", "happy"],
        skillIds: ["able-seaman"]
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
    nodeId: entry.action.nodeId,
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
    dialogueOptionIconId(option);
    if (typeof option.label !== "string" || option.label.trim() === "") {
      throw new Error(`Reachable ${scenario.session.nodeId} option has no label: ${cityId}`);
    }
    if (!option.action || typeof option.action.type !== "string" || option.action.type === "") {
      throw new Error(`Reachable ${scenario.session.nodeId} option has no action: ${cityId}`);
    }
  }
}
