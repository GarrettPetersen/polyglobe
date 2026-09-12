import { workshopSupplyFetchObjectives } from "./workshopSupplyQuest.js";
import { fetchQuestRequirements, advanceFetchQuestReadiness, readyFetchQuestDestinations } from "./fetchQuestObjectives.js";
import test from "node:test";
import assert from "node:assert/strict";
import {createWorldEconomy, portIndustrialInputNeeds, tradeGoodById} from "./economy.js";
import {createWorkshopSupplyOffer} from "./workshopSupplyQuest.js";
import {createGameState, deliveryOfferForCity, acceptQuest, completeQuest, questStateForCity, migrateGameState} from "./gameState.js";
import {createPortDialogueSession, portDialogueView} from "./dialogueSystem.js";

const ports = [
  {cityId:"lisbon|portugal", city:"Lisbon", country:"Portugal", cityType:"mediterranean", character:{name:"Joao", role:"harbour-master"}, factionId:"portugal", tileId:1, population:70000, lat:38.72, lon:-9.14},
  {cityId:"stockholm|sweden", city:"Stockholm", country:"Sweden", cityType:"northern-european", character:{name:"Joao", role:"harbour-master"}, factionId:"sweden", tileId:2, population:20000, lat:59.3, lon:18.1}
];
function fixture() {
  const economy = createWorldEconomy({ports, startMinute:0});
  economy.portStates.get(ports[0].cityId).goods.get("iron").stock = 0;
  const offer = createWorkshopSupplyOffer(economy, ports[0], ports, {offerPeriod:0, sailingDistanceKm:()=>700});
  assert.ok(offer);
  const state = createGameState({cargoCapacity:50});
  return {economy, offer, state};
}

test("workshop orders explain the production chain, pay a premium and accept cargo from anywhere", () => {
  const {economy, offer, state} = fixture();
  assert.ok(offer.offerText.includes(tradeGoodById(offer.procurement.outputGoodId).label.toLowerCase()));
  assert.match(offer.offerText, /Buy elsewhere/);
  acceptQuest(state, offer);
  assert.equal(questStateForCity(state, ports[0], ports).kind, "in-progress-here");
  assert.throws(()=>completeQuest(state,ports[0],{economy}), /cargo is incomplete/);
  const restored = migrateGameState(structuredClone(state));
  const {goodId, quantity} = offer.procurement;
  restored.cargo[goodId] = quantity;
  // No visit to the suggested port, and no cargo-origin requirement.
  assert.equal(questStateForCity(restored, ports[0], ports).kind, "ready-to-complete");
  const port = economy.portStates.get(ports[0].cityId);
  const before = port.goods.get(goodId).stock;
  const money = port.specie;
  completeQuest(restored,ports[0],{economy});
  assert.equal(port.goods.get(goodId).stock, before + quantity);
  assert.equal(port.specie, money - offer.reward);
  assert.equal(restored.cargo[goodId], undefined);
  assert.throws(()=>completeQuest(restored,ports[0],{economy}), /No active quest/);
});

test("accepted supply orders expose an optional source heading, not an enforced destination", () => {
  const {economy, offer, state} = fixture();
  acceptQuest(state, offer);
  const session = createPortDialogueSession(ports[0]);
  session.nodeId = "quest";
  const view = portDialogueView(session, ports[0], state, economy, ports, {sailingDistanceKm:()=>700});
  assert.ok(view.options.some(option => option.action.type === "set-port-heading"));
  assert.ok(!view.options.some(option => option.action.type === "complete-quest" && !option.disabled));
});

test("stocked workshops do not request inputs, and order quantities fit a small hold", () => {
  const {economy, offer} = fixture();
  assert.ok(offer.procurement.quantity * tradeGoodById(offer.procurement.goodId).unitSize <= 12);
  for (const state of economy.portStates.get(ports[0].cityId).goods.values()) state.stock = state.targetStock * 100;
  assert.deepEqual(portIndustrialInputNeeds(economy, ports[0]), []);
  assert.equal(createWorkshopSupplyOffer(economy,ports[0],ports,{offerPeriod:0,sailingDistanceKm:()=>700}),null);
});

test("a workshop short of payment keeps the cargo aboard and explains the delay", () => {
  const {economy, offer, state} = fixture();
  acceptQuest(state, offer);
  state.cargo[offer.procurement.goodId] = offer.procurement.quantity;
  const port = economy.portStates.get(ports[0].cityId);
  port.specie = 0;
  const session = createPortDialogueSession(ports[0]);
  session.nodeId = "quest";
  const view = portDialogueView(session, ports[0], state, economy, ports, {sailingDistanceKm:()=>700});
  assert.match(view.text, /purse is short/);
  assert.equal(view.options.find(option => option.action.type === "complete-quest").disabled, true);
  assert.throws(() => completeQuest(state,ports[0],{economy}));
  assert.equal(state.cargo[offer.procurement.goodId], offer.procurement.quantity);
  port.specie = offer.reward;
  completeQuest(state,ports[0],{economy});
});


test("ordinary port work rolls can surface workshop orders and record their global cooldown", () => {
  const {economy} = fixture();
  let offered = false;
  for (let week = 0; week < 60; week++) {
    const state = createGameState({cargoCapacity:50,playerCharacter:{
      id:"player:supply-test",name:"Joan Alden",nationalityId:"england",expressions:["neutral","happy"],
      homePortCityId:ports[0].cityId,homePortTileId:1,homePortName:"Lisbon",homePortCountry:"Portugal",religionId:"roman-catholic"
    }});
    state.memory.quests.onboardingDeliveriesCompleted = 4;
    const simMinute = week * 7 * 1440;
    const offer = deliveryOfferForCity(state,ports[0],ports,{economy,simMinute,sailingDistanceKm:()=>700});
    if (!offer?.procurement) continue;
    assert.equal(state.memory.decisions["quest-offer.workshop-supply.last-minute"],simMinute);
    assert.equal(deliveryOfferForCity(state,ports[0],ports,{economy,simMinute,sailingDistanceKm:()=>700}).id,offer.id);
    const session = createPortDialogueSession(ports[0]);
    session.nodeId = "quest";
    const view = portDialogueView(session, ports[0], state, economy, ports, {simMinute, sailingDistanceKm:()=>700});
    assert.ok(view.options.some(option => option.label === `Bring ${offer.cargoLabel} here, to ${offer.destinationName}`));
    offered = true;
    break;
  }
  assert.equal(offered,true);
});


test("supply cargo triggers the shared ready alert once without duplicating its mission waypoint, including after restore", () => {
  const { economy, offer, state } = fixture();
  const cityById = new Map(ports.map(port => [port.cityId, port]));
  acceptQuest(state, offer);
  const requirements = current => fetchQuestRequirements({ workshopSupplies: workshopSupplyFetchObjectives(current, cityById) });
  let transition = advanceFetchQuestReadiness(new Map(), requirements(state));
  assert.equal(transition.newlyReady.length, 0);
  state.cargo[offer.procurement.goodId] = offer.procurement.quantity - 1;
  transition = advanceFetchQuestReadiness(transition.next, requirements(state));
  assert.equal(transition.newlyReady.length, 0);
  state.cargo[offer.procurement.goodId]++;
  const restored = migrateGameState(structuredClone(state));
  transition = advanceFetchQuestReadiness(transition.next, requirements(restored));
  assert.equal(transition.newlyReady.length, 1);
  assert.equal(transition.newlyReady[0].questId, offer.id);
  assert.equal(transition.newlyReady[0].destination.cityId, ports[0].cityId);
  assert.equal(readyFetchQuestDestinations(requirements(restored)).length, 0);
  transition = advanceFetchQuestReadiness(transition.next, requirements(restored));
  assert.equal(transition.newlyReady.length, 0);
  restored.cargo[offer.procurement.goodId]--;
  transition = advanceFetchQuestReadiness(transition.next, requirements(restored));
  assert.equal(readyFetchQuestDestinations(requirements(restored)).length, 0);
  restored.cargo[offer.procurement.goodId]++;
  assert.equal(advanceFetchQuestReadiness(transition.next, requirements(restored)).newlyReady.length, 1);
  completeQuest(restored, ports[0], {economy});
  assert.deepEqual(requirements(restored), []);
  assert.throws(() => workshopSupplyFetchObjectives(state, new Map()), /destination is missing/);
});

test("the live purchase alert pipeline includes workshop orders and persists its acknowledgement", async () => {
  const { readFileSync } = await import("node:fs");
  const { default: vm } = await import("node:vm");
  const { default: ts } = await import("typescript");
  const source = readFileSync(new URL("./main.js", import.meta.url), "utf8");
  const ast = ts.createSourceFile("main.js", source, ts.ScriptTarget.Latest, true);
  const names = new Set(["currentFetchQuestRequirements", "initializeFetchQuestReadiness",
    "updateFetchQuestReadinessAlerts", "presentPendingFetchQuestCaptainDialogue", "fetchQuestReadyFlag"]);
  const code = ast.statements.filter(node => ts.isFunctionDeclaration(node) && names.has(node.name.text))
    .map(node => node.getText(ast)).join("\n");
  const { state, offer } = fixture();
  acceptQuest(state, offer);
  const notices = [];
  const context = vm.createContext({ gameState: state, gameOverReason: null, weatherClockMinutes: 0,
    cityById: new Map(ports.map(port => [port.cityId, port])), portCities: ports,
    CONQUISTADOR_STAGE_FETCH: "fetch", TOPSHAM_CITY_ID: "topsham|united kingdom",
    vikingLongshipQuestPort: () => null, japaneseMatchlockWorkshopPort: () => null,
    currentCaribbeanGingerPort: () => null, chefQuestJournalPort: () => null,
    exeterCanalQuestView: () => null, colonizationQuestView: () => null,
    workshopSupplyFetchObjectives, fetchQuestRequirements, advanceFetchQuestReadiness,
    readyFetchQuestDestinations, tradeGoodById, Map,
    pendingFetchQuestCaptainDialogues: [], fetchQuestReadiness: new Map(), readyFetchQuestNavigation: [],
    FETCH_QUEST_READY_FLAG_PREFIX: "fetch-ready:", uiText: (_key, {good, city}) => `${good} ready for ${city}`,
    renderedUiText: value => value, startMenu: false, menusAreOpen: () => false,
    playerIntroModal: null, captainAlertModal: null, portWaitState: null,
    dialogueState: {kind:"port", nodeId:"market", marketMode:"buy"},
    openCrewAlertModal: message => { notices.push(message); return true; }, saveVoyageNow() {}
  });
  // Use the same paused market state in which a player buys the final measure.
  state.playerCharacter ||= { id:"captain:fetch-test" };
  vm.runInContext(code, context);
  context.initializeFetchQuestReadiness();
  state.cargo[offer.procurement.goodId] = offer.procurement.quantity;
  assert.equal(context.updateFetchQuestReadinessAlerts(), true);
  assert.equal(context.presentPendingFetchQuestCaptainDialogue({allowPortMarket:true}), true);
  assert.equal(notices.length, 1);
  assert.match(notices[0], /ready for Lisbon/);
  context.initializeFetchQuestReadiness();
  assert.equal(context.updateFetchQuestReadinessAlerts(), false);
  assert.equal(context.pendingFetchQuestCaptainDialogues.length, 0);
});
