import { shipStatsForSlug } from "./shipStats.js";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createGameState, migrateGameState, shipItemRows } from "./gameState.js";
import { pirateHavenQuestOffer, acceptPirateHavenQuest, collectPirateGoods, pirateGoodsPickupStatus,
  completePirateHavenQuest, PIRATE_COMMISSION_MAX_DISTANCE_KM } from "./pirateHavens.js";
import { pirateGoodsPickupView, pirateHavenCommissionView } from "./pirateHavenDialogue.js";
import { portCityLocationForRootAction, PORT_CITY_LOCATION } from "./portCityNavigation.js";
const haven = { cityId: "pirate-haven-1", city: "Black Gull Cove", isPirateHideout: true };
const port = { cityId: "lisbon|portugal", city: "Lisbon" };
const context = { simMinute: 0, offerRoll: 0, contractKind: "smuggling", havens: [haven], merchants: [], ports: [port],
  sailingDistanceKm: () => 200, contactForPort: () => ({ id: "port-staff:lisbon:merchant", name: "Joao Pereira" }) };
function campaign() {
  const state = createGameState({ cargoCapacity: 20 });
  const offer = pirateHavenQuestOffer(state.memory.pirateHavens, haven, context);
  acceptPirateHavenQuest(state.memory.pirateHavens, offer);
  return state;
}
test("the offer names the real pickup contact and the nighttime rendezvous", () => {
  const state = createGameState({ cargoCapacity: 20 });
  const offer = pirateHavenQuestOffer(state.memory.pirateHavens, haven, context);
  const view = pirateHavenCommissionView(state, haven, { pirateHavenQuestOffer: offer });
  assert.match(view.text, /Joao Pereira.*Lisbon/);
  assert.match(view.text, /eight in the evening until five in the morning/);
  assert.equal(offer.pickupContactId, "port-staff:lisbon:merchant");
});
test("pickup availability and mutation agree at every day/night boundary and city", () => {
  for (const hour of [0, 4.999, 5, 12, 19.999, 20, 23.999]) {
    const state = campaign();
    const eligible = hour >= 20 || hour < 5;
    const view = pirateGoodsPickupView(state, port, { localHour: hour });
    assert.equal(view.options.some(option => option.action.type === "collect-pirate-goods"), eligible);
    assert.equal(pirateGoodsPickupStatus(state.memory.pirateHavens, port.cityId, hour).eligible, eligible);
    assert.throws(() => collectPirateGoods(state.memory.pirateHavens, "other-port", hour), /nighttime meeting/);
    if (eligible) {
      assert.equal(view.speaker, "Joao Pereira");
      collectPirateGoods(state.memory.pirateHavens, port.cityId, hour);
      assert.throws(() => collectPirateGoods(state.memory.pirateHavens, port.cityId, hour), /nighttime meeting/);
    } else {
      assert.equal(view.speaker, "Captain");
      assert.match(view.text, /nothing here until nightfall/);
      assert.throws(() => collectPirateGoods(state.memory.pirateHavens, port.cityId, hour), /nighttime meeting/);
    }
  }
  for (const nodeId of ["pirate-goods", "pirate-goods-day"]) assert.equal(portCityLocationForRootAction({ type: "node", nodeId }), PORT_CITY_LOCATION.ILLICIT_MERCHANT);
});
test("the stolen chest is one unsellable inventory item through reload and delivery", () => {
  let state = campaign();
  const cargo = structuredClone(state.cargo);
  assert.ok(!shipItemRows(state).some(row => row.iconId === "item:stolen-chest"));
  state = migrateGameState(JSON.parse(JSON.stringify(state)));
  collectPirateGoods(state.memory.pirateHavens, port.cityId, 22);
  state = migrateGameState(JSON.parse(JSON.stringify(state)));
  const row = shipItemRows(state).find(row => row.iconId === "item:stolen-chest");
  assert.equal(row.label, "Chest of stolen goods"); assert.equal(row.quantity, 1);
  assert.equal(row.questItem, true); assert.equal(row.discardable, false);
  assert.deepEqual(state.cargo, cargo);
  assert.throws(() => completePirateHavenQuest(state, port.cityId, "smuggling", 1440), /cannot be delivered/);
  const before = state.doubloons;
  completePirateHavenQuest(state, haven.cityId, "smuggling", 1440);
  assert.equal(state.doubloons, before + 1800);
  assert.ok(!shipItemRows(state).some(item => item.id === row.id));
  assert.throws(() => completePirateHavenQuest(state, haven.cityId, "smuggling", 1440), /cannot be delivered/);
  assert.equal(pirateHavenQuestOffer(state.memory.pirateHavens, haven, { ...context, simMinute: 1440 }), null);
});
test("suppression never picks a distant or disconnected haven and follows sailing distance", () => {
  const state = createGameState({ cargoCapacity: 20 });
  const nearby = { ...haven, cityId: "pirate-haven-2" };
  const distances = new Map([[haven.cityId, 12000], [nearby.cityId, 500]]);
  const options = { ...context, havens: [haven, nearby], sailingDistanceKm: (_, target) => distances.get(target.cityId) };
  assert.equal(pirateHavenQuestOffer(state.memory.pirateHavens, port, options).havenCityId, nearby.cityId);
  distances.set(nearby.cityId, PIRATE_COMMISSION_MAX_DISTANCE_KM + 1);
  assert.equal(pirateHavenQuestOffer(state.memory.pirateHavens, port, options), null);
  distances.set(nearby.cityId, Infinity);
  assert.equal(pirateHavenQuestOffer(state.memory.pirateHavens, port, options), null);
});
test("released pirate contracts migrate without losing an active heirloom or suppression reward", () => {
  const fixtures = JSON.parse(readFileSync(new URL("./test-fixtures/save-schemas/canonical-states-v110.json", import.meta.url)));
  const previous = fixtures.states.find(entry => entry.campaignGoalType === "pirate-haven-campaign").state;
  const restored = migrateGameState(previous, shipStatsForSlug("brigantine"));
  assert.equal(restored.memory.pirateHavens.revenge.id, previous.memory.pirateHavens.revenge.id);
  assert.equal(restored.memory.pirateHavens.revenge.ready, true);
  assert.equal(restored.memory.pirateHavens.smuggling, null);
  assert.deepEqual(migrateGameState(JSON.parse(JSON.stringify(restored)), shipStatsForSlug("brigantine")), restored);
});
