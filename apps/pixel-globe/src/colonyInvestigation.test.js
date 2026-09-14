import { shipStatsForSlug } from "./shipStats.js";
import { createGameState } from "./gameState.js";
import { questSiteArrivalCandidate } from "./questSiteArrival.js";
import assert from "node:assert/strict";
import test from "node:test";
import { colonizationTargetForCity } from "./colonialCities.js";
import { colonizationHistoryForTarget } from "./colonizationHistory.js";
import {
  createColonizationQuestMemory, assignColonizationQuest, completeColonizationFetchStage,
  beginColonizationExpedition, landColonists, establishColony, advanceColonizationAftermaths,
  discoverColonizationAftermath, colonizationWorldRecord, completeColonizationAftermath,
  prepareNextColonizationExpedition, roanokeCluesAboard, colonizationObjectives, colonizationNavigationObjectives
} from "./colonizationQuest.js";
import { createPortDialogueSession, portDialogueView, portCityNavigationView,
  enterPortCityLocation, selectPortDialogueAction, selectPortDialogueOption } from "./dialogueSystem.js";
import { PORT_CITY_LOCATION } from "./portCityNavigation.js";
import { dialogueOptionIconId } from "./gameIcons.js";

const LONDON = { cityId: "london|united kingdom", city: "London", country: "United Kingdom",
  factionId: "england", tileId: 10, lat: 51.5, lon: -0.1 };

function investigation() {
  const memory = createColonizationQuestMemory();
  const target = { ...colonizationTargetForCity({ cityId: "roanoke|united states of america" }), tileId: 20 };
  assignColonizationQuest(memory, { target, origin: LONDON });
  for (const fetch of colonizationHistoryForTarget(target).fetchStages) completeColonizationFetchStage(memory, fetch.id);
  beginColonizationExpedition(memory);
  landColonists(memory, 100);
  establishColony(memory, 200);
  const minute = memory.aftermath.dueMinute + 1;
  advanceColonizationAftermaths(memory, minute, { isTileVisible: () => false });
  discoverColonizationAftermath(memory, target, LONDON, minute);
  return { memory, minute };
}

function visit(memory) {
  const city = colonizationWorldRecord(memory);
  const state = { playerCharacter: { name: "Jane Smith" }, memory: { colonization: memory } };
  const session = createPortDialogueSession(city, { initialNodeId: "root", admittedToPort: false });
  return { city, state, session };
}

test("arriving at Roanoke never acquires its clue; every enabled ruin destination works without port services", () => {
  const { memory, minute } = investigation();
  assert.equal(memory.aftermath.reportCityId, LONDON.cityId);
  const original = structuredClone(memory);
  const { city, state, session } = visit(memory);
  const root = portDialogueView(session, city, state, null, [], { simMinute: minute });
  assert.deepEqual(memory, original);
  assert.equal(roanokeCluesAboard(memory), false);
  const navigation = portCityNavigationView(session, city, state, null, []);
  assert.deepEqual(new Set(navigation.locations.map(({ id }) => id)), new Set([
    PORT_CITY_LOCATION.COLONY_CLUE, PORT_CITY_LOCATION.SHIP, PORT_CITY_LOCATION.SET_SAIL
  ]));
  for (const location of navigation.locations) {
    const independent = visit(structuredClone(original));
    const entry = enterPortCityLocation(independent.session, independent.city, independent.state, null, [], location.id);
    const option = root.options[entry.rootOptionIndex];
    assert.equal(typeof dialogueOptionIconId(option), "string");
    const result = selectPortDialogueOption(independent.session, independent.city, independent.state, null, [],
      entry.rootOptionIndex, { simMinute: minute });
    if (location.id === PORT_CITY_LOCATION.COLONY_CLUE) {
      assert.equal(result.colonyClueInspected, true);
      const clue = portDialogueView(independent.session, independent.city, independent.state, null, []);
      assert.equal(clue.speaker, "Jane Smith");
      assert.match(clue.text, /CROATOAN/);
      assert.equal(roanokeCluesAboard(independent.state.memory.colonization), true);
    } else {
      assert.equal(result.closed, true);
      assert.deepEqual(independent.state.memory.colonization, original);
    }
  }
});

test("CROATOAN survives restore, is acquired once, and reporting remains the next quest step", () => {
  const { memory, minute } = investigation();
  const { city, state, session } = visit(JSON.parse(JSON.stringify(memory)));
  const option = portDialogueView(session, city, state, null, []).options.find(({ action }) => action.type === "inspect-colony-clue");
  selectPortDialogueAction(session, city, state, null, [], option, { simMinute: minute });
  assert.throws(() => selectPortDialogueAction(session, city, state, null, [], option, { simMinute: minute }), /No colony investigation/);
  const restored = visit(JSON.parse(JSON.stringify(state.memory.colonization)));
  assert.equal(portDialogueView(restored.session, restored.city, restored.state, null, []).options
    .some(({ action }) => action.type === "inspect-colony-clue"), false);
  assert.deepEqual(colonizationObjectives(restored.state.memory.colonization), [{ tileId: LONDON.tileId, kind: "report-lost-colony" }]);
  completeColonizationAftermath(restored.state.memory.colonization, LONDON, minute + 1);
  assert.deepEqual(colonizationObjectives(restored.state.memory.colonization), []);
  assert.equal(roanokeCluesAboard(restored.state.memory.colonization), false);
});

for (const investigateFirst of [false, true]) {
  test(`Roanoke and Salvador proceed independently, investigation first: ${investigateFirst}`, () => {
    const { memory, minute } = investigation();
    const ruins = colonizationWorldRecord(memory);
    const salvador = { ...colonizationTargetForCity({ cityId: "salvador|brazil" }), tileId: 30 };
    const lisbon = { ...LONDON, cityId: "lisbon|portugal", city: "Lisbon", country: "Portugal", factionId: "portugal", tileId: 11 };
    assert.equal(prepareNextColonizationExpedition(null, memory), true);
    assignColonizationQuest(memory, { target: salvador, origin: lisbon });
    for (const fetch of colonizationHistoryForTarget(salvador).fetchStages) completeColonizationFetchStage(memory, fetch.id);
    const state = createGameState({ cargoCapacity: 100, playerCharacter: {
      id: "player-jane", name: "Jane Smith", nationalityId: "england", expressions: ["neutral"],
      homePortCityId: LONDON.cityId, homePortTileId: LONDON.tileId,
      homePortName: LONDON.city, homePortCountry: LONDON.country
    } });
    state.memory.colonization = JSON.parse(JSON.stringify(memory));
    const current = state.memory.colonization;
    const embarkSession = createPortDialogueSession(lisbon, { initialNodeId: "root", admittedToPort: true });
    selectPortDialogueAction(embarkSession, lisbon, state, null, [],
      { action: { type: "embark-colonists" } }, { simMinute: minute, shipStats: shipStatsForSlug("galleon") });
    const inspect = () => {
      const session = createPortDialogueSession(ruins, { initialNodeId: "root", admittedToPort: false });
      const option = portDialogueView(session, ruins, state, null, [], { simMinute: minute }).options
        .find(({ action }) => action.type === "inspect-colony-clue");
      assert.ok(option);
      selectPortDialogueAction(session, ruins, state, null, [], option, { simMinute: minute });
    };
    if (investigateFirst) inspect();
    const objectives = colonizationNavigationObjectives(state, { currentMinute: minute });
    assert.deepEqual(new Set(objectives.map(({ kind }) => kind)), new Set([
      investigateFirst ? "report-lost-colony" : "investigate-lost-colony", "found-colony"
    ]));
    const call = { ...salvador, interactionX: 0, interactionY: 0, requiredTradePort: false };
    const arrival = questSiteArrivalCandidate({ colonizationObjectives: objectives,
      cityCalls: [call], playerInteractionPoint: { x: 0, y: 0 } });
    assert.equal(arrival.actionType, "land-colonists");
    const colonySession = createPortDialogueSession(call, { initialNodeId: "root", admittedToPort: false });
    selectPortDialogueAction(colonySession, call, state, null, [],
      { action: { type: arrival.actionType } }, { simMinute: minute });
    assert.equal(current.stage, "awaiting-resupply");
    if (!investigateFirst) inspect();
    completeColonizationAftermath(current, LONDON, minute + 1);
    assert.deepEqual(colonizationObjectives(current), [{ tileId: salvador.tileId, kind: "resupply-colony" }]);
  });
}
