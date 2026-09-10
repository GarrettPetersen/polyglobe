import assert from "node:assert/strict";
import test from "node:test";
import { createGameState } from "./gameState.js";
import { pirateHavenQuestOffer, seizePirateRevengeItem, ruinPirateHaven } from "./pirateHavens.js";
import { pirateHavenCommissionView, selectPirateHavenCommission } from "./pirateHavenDialogue.js";
const haven={cityId:"pirate-haven-1",city:"Black Gull Cove",isPirateHideout:true};
const port={cityId:"lisbon|portugal",city:"Lisbon"};
const merchant={id:"merchant-12",seed:77,name:"Santa Maria",captainName:"Joao",role:"merchant",hitPoints:10,currentPort:port};
for(const city of [haven,port]) test(`every enabled pirate commission action works at ${city.city}`,()=>{
 const state=createGameState({cargoCapacity:20});
 const context={simMinute:0,pirateRevengeTargetPresent:true,get pirateHavenQuestOffer(){return pirateHavenQuestOffer(state.memory.pirateHavens,city,{
  havens:[haven],merchants:[merchant],sailingDistanceKm:()=>200,simMinute:0});}};
 const view=()=>pirateHavenCommissionView(state,city,context);
 const accept=view().options.find(o=>o.action.type==="accept-pirate-haven-quest").action;
 selectPirateHavenCommission(state,city,accept,context);
 assert.equal(selectPirateHavenCommission(state,city,accept,context).changed,false);
 assert.ok(!view().options.some(o=>o.action.type==="complete-pirate-haven-quest"));
 const saved=JSON.parse(JSON.stringify(state));
 const abandon=view().options.find(o=>o.action.type==="abandon-pirate-haven-quest").action;
 selectPirateHavenCommission(saved,city,abandon,context);
 assert.equal(saved.memory.pirateHavens[city.isPirateHideout?"revenge":"suppression"],null);
 if(city.isPirateHideout)seizePirateRevengeItem(state.memory.pirateHavens,merchant);
 else ruinPirateHaven(state.memory.pirateHavens,haven.cityId,0);
 selectPirateHavenCommission(state,city,view().options.find(o=>o.action.type==="complete-pirate-haven-quest").action,context);
});

test("a lost merchant is explained and the player can close the commission without a reward", () => {
  const state = createGameState({ cargoCapacity: 20 });
  const context = { simMinute: 0, pirateRevengeTargetPresent: false,
    pirateHavenQuestOffer: pirateHavenQuestOffer(state.memory.pirateHavens, haven, {
      havens: [haven], merchants: [merchant], sailingDistanceKm: () => 200, simMinute: 0
    }) };
  selectPirateHavenCommission(state, haven, { type: "accept-pirate-haven-quest", offer: context.pirateHavenQuestOffer }, context);
  const view = pirateHavenCommissionView(state, haven, context);
  assert.match(view.text, /gone down/);
  assert.ok(!view.options.some(option => option.action.type === "complete-pirate-haven-quest"));
  const before = state.doubloons;
  selectPirateHavenCommission(state, haven, view.options.find(option => option.action.type === "abandon-pirate-haven-quest").action, context);
  assert.equal(state.doubloons, before);
  assert.equal(state.memory.pirateHavens.revenge, null);
});


test("a merchant moving between presentation and acceptance refreshes the offer without changing the contract silently", () => {
  const state = createGameState({ cargoCapacity: 20 });
  const original = pirateHavenQuestOffer(state.memory.pirateHavens, haven, {
    havens: [haven], merchants: [merchant], sailingDistanceKm: () => 200, simMinute: 0
  });
  const latest = { ...original, targetPortName: "Seville", distanceKm: 300 };
  const result = selectPirateHavenCommission(state, haven, { type: "accept-pirate-haven-quest", offer: original }, { pirateHavenQuestOffer: latest });
  assert.equal(result.changed, false);
  assert.match(result.feedback, /latest offer/);
  assert.equal(state.memory.pirateHavens.revenge, null);
  assert.equal(selectPirateHavenCommission(state, haven, { type: "accept-pirate-haven-quest", offer: latest }, { pirateHavenQuestOffer: latest }).changed, true);
  assert.equal(state.memory.pirateHavens.revenge.targetPortName, "Seville");
});
