import test from "node:test";
import assert from "node:assert/strict";
import { createGameState, migrateGameState, receiveQuestPayment } from "./gameState.js";
import { createPirateHavenMemory, validatePirateHavenMemory, pirateHavenQuestOffer,
 acceptPirateHavenQuest, completePirateHavenQuest, seizePirateRevengeItem,
 pirateQuestInventory, pirateHavenIsRuined, pirateHavenIsVisible, ruinPirateHaven,
 pirateHavenSuppressionReward, portTradeInformationPorts, settlePirateHavenSuppressionBounty,
 PIRATE_HAVEN_REBUILD_MINUTES } from "./pirateHavens.js";
const haven={cityId:"pirate-haven-1",city:"Black Gull Cove",isPirateHideout:true};
const port={cityId:"lisbon|portugal",city:"Lisbon"};
const merchant={id:"merchant-12",seed:77,name:"Santa Maria",captainName:"Joao",role:"merchant",hitPoints:10,currentPort:port};
const context={offerRoll: 0, contractKind: "revenge", havens:[haven],merchants:[merchant],sailingDistanceKm:()=>200,simMinute:0};
test("pirate commissions appear only at their canonical issuer without allowing duplicate contracts", async () => {
  const { pirateQuestAtIssuer } = await import("./pirateHavens.js");
  const { pirateHavenCommissionView, selectPirateHavenCommission } = await import("./pirateHavenDialogue.js");
  for (const issuer of [haven, port]) {
    const state = createGameState({ cargoCapacity: 20 });
    const memory = state.memory.pirateHavens;
    const offer = pirateHavenQuestOffer(memory, issuer, context);
    acceptPirateHavenQuest(memory, offer);
    const elsewhere = { ...issuer, cityId: "other-port", city: "Another port" };
    assert.equal(pirateQuestAtIssuer(memory, issuer).id, offer.id);
    assert.equal(pirateQuestAtIssuer(memory, elsewhere), null);
    assert.equal(pirateHavenQuestOffer(memory, elsewhere, context), null);
    const view = pirateHavenCommissionView(state, elsewhere, { pirateHavenQuestOffer: null });
    assert.equal(view.text, "I have no business for you today.");
    assert.ok(view.options.every(option => !["complete-pirate-haven-quest", "abandon-pirate-haven-quest"].includes(option.action.type)));
    assert.equal(memory[offer.kind].id, offer.id);
    assert.throws(() => selectPirateHavenCommission(state, elsewhere,
      { type: "abandon-pirate-haven-quest", kind: offer.kind }, context), /with its issuer/);
    selectPirateHavenCommission(state, issuer,
      { type: "abandon-pirate-haven-quest", kind: offer.kind }, context);
    assert.equal(memory[offer.kind], null);
  }
});

test("a revenge commission names a real merchant and the unique item survives saves until delivered",()=>{
 const state=createGameState({cargoCapacity:20}); const memory=state.memory.pirateHavens;
 const offer=pirateHavenQuestOffer(memory,haven,context); acceptPirateHavenQuest(memory,offer);
 assert.equal(offer.targetShipId,merchant.id); assert.equal(seizePirateRevengeItem(memory,{id:"other",seed:1}),null);
 assert.deepEqual(pirateQuestInventory(memory),[]);
 assert.throws(()=>completePirateHavenQuest(state,haven.cityId,"revenge",0),/cannot/);
 seizePirateRevengeItem(memory,merchant); assert.equal(seizePirateRevengeItem(memory,merchant),null);
 const restored=migrateGameState(JSON.parse(JSON.stringify(state)));
 assert.equal(pirateQuestInventory(restored.memory.pirateHavens)[0].id,offer.itemId);
 const before=restored.doubloons;
 assert.throws(()=>completePirateHavenQuest(restored,port.cityId,"revenge",0),/cannot/);
 completePirateHavenQuest(restored,haven.cityId,"revenge",0);
 assert.equal(restored.doubloons,before+offer.reward); assert.deepEqual(pirateQuestInventory(restored.memory.pirateHavens),[]);
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
test("legitimate ports know no pirate commerce while active havens know both kinds of port", () => {
 const state=createGameState({cargoCapacity:20});
 const secondHaven={cityId:"pirate-haven-2",city:"Lanternless Quay",isPirateHideout:true};
 const legitimatePorts=[port,{cityId:"porto|portugal",city:"Porto"}];
 const havens=[haven,secondHaven];
 acceptPirateHavenQuest(state.memory.pirateHavens,pirateHavenQuestOffer(state.memory.pirateHavens,port,context));
 assert.equal(pirateHavenIsVisible(state.memory.pirateHavens,haven.cityId,0,false),true,
   "a suppression contract reveals its target to the player");
 assert.deepEqual(
   portTradeInformationPorts(state.memory.pirateHavens,port,legitimatePorts,havens,0)
     .map(({cityId})=>cityId),
   legitimatePorts.map(({cityId})=>cityId),
   "legitimate NPCs still do not gain commercial knowledge of the revealed haven"
 );
 assert.deepEqual(
   portTradeInformationPorts(state.memory.pirateHavens,haven,legitimatePorts,havens,0)
     .map(({cityId})=>cityId),
   [...legitimatePorts,...havens].map(({cityId})=>cityId),
   "pirate NPCs know active legitimate ports and havens whether or not the player discovered them"
 );
 ruinPirateHaven(state.memory.pirateHavens,secondHaven.cityId,1);
 assert.deepEqual(
   portTradeInformationPorts(state.memory.pirateHavens,haven,legitimatePorts,havens,1)
     .map(({cityId})=>cityId),
   [...legitimatePorts,haven].map(({cityId})=>cityId),
   "ruined havens never remain a source of trade intelligence"
 );
 assert.throws(
   ()=>portTradeInformationPorts(state.memory.pirateHavens,port,[haven],havens,1),
   /misclassifies pirate-haven-1/
 );
});
test("suppression rewards fit issuer capacity and settle once into the ledger at destruction", () => {
 const village={...port,population:1200};
 const capital={...port,population:200000};
 assert.ok(pirateHavenSuppressionReward(village,{targetSpecie:800}) < 5000);
 assert.ok(pirateHavenSuppressionReward(capital,{targetSpecie:50000}) >
   pirateHavenSuppressionReward(village,{targetSpecie:800}));
 const state=createGameState({cargoCapacity:20});
 const offer=pirateHavenQuestOffer(state.memory.pirateHavens,village,{...context,
   issuerEconomy:{targetSpecie:800}});
 acceptPirateHavenQuest(state.memory.pirateHavens,offer);
 ruinPirateHaven(state.memory.pirateHavens,haven.cityId,5);
 const bounty=settlePirateHavenSuppressionBounty(state.memory.pirateHavens,haven.cityId);
 receiveQuestPayment(state,village,bounty.reward,`Destroyed ${bounty.havenName} pirate haven`,{simMinute:5});
 assert.equal(state.memory.pirateHavens.suppression,null);
 assert.equal(settlePirateHavenSuppressionBounty(state.memory.pirateHavens,haven.cityId),null);
 assert.equal(state.accounts.ledger.at(-1).amount,bounty.reward);
 assert.match(state.accounts.ledger.at(-1).description,/Destroyed Black Gull Cove/);
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
  assert.deepEqual(pirateQuestInventory(memory), []);
  memory.revenge.targetShipSeed = null;
  assert.throws(() => validatePirateHavenMemory(memory), /hull generation/);
});
