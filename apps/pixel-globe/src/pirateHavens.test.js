import test from "node:test";
import assert from "node:assert/strict";
import { createGameState, migrateGameState } from "./gameState.js";
import { createPirateHavenMemory, validatePirateHavenMemory, pirateHavenQuestOffer,
 acceptPirateHavenQuest, completePirateHavenQuest, seizePirateRevengeItem,
 pirateRevengeInventory, pirateHavenIsRuined, pirateHavenIsVisible, ruinPirateHaven,
 PIRATE_HAVEN_REBUILD_MINUTES } from "./pirateHavens.js";
const haven={cityId:"pirate-haven-1",city:"Black Gull Cove",isPirateHideout:true};
const port={cityId:"lisbon|portugal",city:"Lisbon"};
const merchant={id:"merchant-12",seed:77,name:"Santa Maria",captainName:"Joao",role:"merchant",hitPoints:10,currentPort:port};
const context={havens:[haven],merchants:[merchant],sailingDistanceKm:()=>200,simMinute:0};
test("a revenge commission names a real merchant and the unique item survives saves until delivered",()=>{
 const state=createGameState({cargoCapacity:20}); const memory=state.memory.pirateHavens;
 const offer=pirateHavenQuestOffer(memory,haven,context); acceptPirateHavenQuest(memory,offer);
 assert.equal(offer.targetShipId,merchant.id); assert.equal(seizePirateRevengeItem(memory,{id:"other",seed:1}),null);
 assert.deepEqual(pirateRevengeInventory(memory),[]);
 assert.throws(()=>completePirateHavenQuest(state,haven.cityId,"revenge",0),/cannot/);
 seizePirateRevengeItem(memory,merchant); assert.equal(seizePirateRevengeItem(memory,merchant),null);
 const restored=migrateGameState(JSON.parse(JSON.stringify(state)));
 assert.equal(pirateRevengeInventory(restored.memory.pirateHavens)[0].id,offer.itemId);
 const before=restored.doubloons;
 assert.throws(()=>completePirateHavenQuest(restored,port.cityId,"revenge",0),/cannot/);
 completePirateHavenQuest(restored,haven.cityId,"revenge",0);
 assert.equal(restored.doubloons,before+offer.reward); assert.deepEqual(pirateRevengeInventory(restored.memory.pirateHavens),[]);
 assert.throws(()=>completePirateHavenQuest(restored,haven.cityId,"revenge",0),/cannot/);
});
test("suppression reveals one haven, ruins persist six months, then ordinary visibility resumes",()=>{
 const state=createGameState({cargoCapacity:20});const m=state.memory.pirateHavens;
 assert.equal(pirateHavenIsVisible(m,haven.cityId,0,false),false);
 acceptPirateHavenQuest(m,pirateHavenQuestOffer(m,port,context));
 assert.equal(pirateHavenIsVisible(m,haven.cityId,0,false),true);
 assert.equal(pirateHavenIsVisible(m,"pirate-haven-2",0,false),false);
 const deadline=ruinPirateHaven(m,haven.cityId,10);
 assert.equal(deadline,10+PIRATE_HAVEN_REBUILD_MINUTES);
 completePirateHavenQuest(state,port.cityId,"suppression",10);
 const restored=migrateGameState(JSON.parse(JSON.stringify(state))).memory.pirateHavens;
 assert.equal(pirateHavenIsRuined(restored,haven.cityId,deadline-1),true);
 assert.equal(pirateHavenIsVisible(restored,haven.cityId,deadline-1,false),true);
 assert.equal(pirateHavenIsVisible(restored,haven.cityId,deadline,false),false);
 assert.equal(pirateHavenIsVisible(restored,haven.cityId,deadline,true),true);
 assert.ok(pirateHavenQuestOffer(restored,port,{...context,simMinute:deadline}));
});
test("no merchants or all havens ruined yields no offer; corrupt references and stale acceptance fail",()=>{
 const m=createPirateHavenMemory();
 assert.equal(pirateHavenQuestOffer(m,haven,{...context,merchants:[]}),null);
 const offer=pirateHavenQuestOffer(m,port,context);acceptPirateHavenQuest(m,offer);
 assert.throws(()=>acceptPirateHavenQuest(m,offer),/stale/);
 ruinPirateHaven(m,haven.cityId,0);m.suppression=null;
 assert.equal(pirateHavenQuestOffer(m,port,context),null);
 assert.equal(pirateHavenQuestOffer(m,haven,context),null);
 m.ruinedUntil.bad=200;assert.throws(()=>validatePirateHavenMemory(m),/Unknown pirate haven/);
});

test("a mixed pirate campaign preserves an undelivered heirloom through a haven's destruction and rebuilding",()=>{
 for(let seed=0;seed<12;seed++){
  let state=createGameState({cargoCapacity:20});
  const actions=[()=>acceptPirateHavenQuest(state.memory.pirateHavens,pirateHavenQuestOffer(state.memory.pirateHavens,haven,context)),
   ()=>acceptPirateHavenQuest(state.memory.pirateHavens,pirateHavenQuestOffer(state.memory.pirateHavens,port,context))];
  if(seed%2)actions.reverse();
  for(const action of actions){action();state=migrateGameState(JSON.parse(JSON.stringify(state)));}
  const conflict=[()=>seizePirateRevengeItem(state.memory.pirateHavens,merchant),()=>ruinPirateHaven(state.memory.pirateHavens,haven.cityId,1)];
  if(seed%3)conflict.reverse();
  for(const action of conflict){action();state=migrateGameState(JSON.parse(JSON.stringify(state)));}
  assert.throws(()=>completePirateHavenQuest(state,haven.cityId,"revenge",2),/cannot/);
  if(seed%2)completePirateHavenQuest(state,port.cityId,"suppression",2);
  const minute=1+PIRATE_HAVEN_REBUILD_MINUTES;
  assert.equal(pirateHavenIsVisible(state.memory.pirateHavens,haven.cityId,minute,false),false,"even an unclaimed suppression reward must not expose the rebuilt haven");
  completePirateHavenQuest(state,haven.cityId,"revenge",minute);
  if(!(seed%2))completePirateHavenQuest(state,port.cityId,"suppression",minute);
  validatePirateHavenMemory(state.memory.pirateHavens);
 }
});

test("a replacement hull cannot inherit a sunken merchant's quest item", async () => {
  const { pirateRevengeTargetPresent } = await import("./pirateHavens.js");
  const state = createGameState({ cargoCapacity: 20 });
  acceptPirateHavenQuest(state.memory.pirateHavens, pirateHavenQuestOffer(state.memory.pirateHavens, haven, context));
  const memory = migrateGameState(JSON.parse(JSON.stringify(state))).memory.pirateHavens;
  assert.equal(pirateRevengeTargetPresent(memory, new Map([[merchant.id, merchant]])), true);
  assert.equal(pirateRevengeTargetPresent(memory, new Map()), false);
  const replacement = { ...merchant, seed: merchant.seed + 1 };
  assert.equal(pirateRevengeTargetPresent(memory, new Map([[replacement.id, replacement]])), false);
  assert.equal(seizePirateRevengeItem(memory, replacement), null);
  assert.deepEqual(pirateRevengeInventory(memory), []);
  memory.revenge.targetShipSeed = null;
  assert.throws(() => validatePirateHavenMemory(memory), /hull generation/);
});
