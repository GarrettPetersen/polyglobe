import assert from "node:assert/strict";
import test from "node:test";
import { createPortAssaultScenario, simulatePortAssault, portAssaultUnitStats } from "./portAssaultBattle.js";
import { portAssaultChargeLanding, portAssaultChargeMomentumAfterImpact, PORT_ASSAULT_CHARGE_STAGGER_MS } from "./portAssaultCharge.js";
import { portAssaultBodyRadius, portAssaultPositionIsFree } from "./portAssaultFormation.js";
import { portAssaultGroundLaneBounds } from "./portAssaultGround.js";
import { cityAssaultChargeOffset } from "../city-visualizer/cityAssaultMotion.js";
const soldier=(id,type,experienceStars=1)=>({id,appearanceId:type,crewTypeId:type,combatProfileId:type,experienceStars,auxiliary:false});

test("unobstructed cavalry close into an impact instead of stopping beside weapon reach", () => {
  for (const type of ["cavalier", "horseman", "horse-samurai"]) {
    for (const side of ["attacker", "defender"]) for (const dockKind of ["stone", "wood", "none"]) {
      for (const seed of [1, 3, 7, 9, 11]) {
        const battle = simulatePortAssault(createPortAssaultScenario({
          cityId: "tunis|tunisia", dockKind, fortified: false,
          attackers: [soldier("a", side === "attacker" ? type : "swordsman")],
          defenders: [soldier("d", side === "defender" ? type : "swordsman")],
          shipHitPoints: 100, shipMaxHitPoints: 100
        }), seed);
        const horseId = side === "attacker" ? "a" : "d";
        const firstAttack = battle.events.find(event => event.type === "attack" && event.unitId === horseId);
        const context = `${type}/${side}/${dockKind}/seed ${seed}`;
        assert.equal(firstAttack?.chargeContact, true, `${context}: an open run-up must end in a charge`);
        assert.ok(battle.events.some(event => event.attackerId === horseId && event.chargeLaunch),
          `${context}: the impact must launch its victim`);
      }
    }
  }
});

test("defending knights retain their charge when approaching a spread infantry squad", () => {
  for (let seed = 1; seed <= 12; seed++) {
    const battle = simulatePortAssault(createPortAssaultScenario({
      cityId: "tunis|tunisia", dockKind: "stone", fortified: false,
      attackers: Array.from({ length: 5 }, (_, index) => soldier(`a${index}`, "swordsman")),
      defenders: [soldier("knight", "cavalier")], shipHitPoints: 100, shipMaxHitPoints: 100
    }), seed);
    assert.ok(battle.events.some(event => event.attackerId === "knight" && event.chargeLaunch),
      `seed ${seed}: approaching an offset infantry target must not cancel the charge`);
  }
});

test("a full-speed launch clears five body widths and intervening ranks, with a safe landing",()=>{
  const target={id:"target",position:.5,lane:1,dockKind:"stone",stats:{mounted:false}};
  const width=portAssaultBodyRadius(target)*2;
  const rank={...target,id:"rank",position:.5+width*2};
  const landing=portAssaultChargeLanding(target,{position:1,lane:0},[rank]);
  assert.ok(Math.abs(landing.position-target.position-width*5)<1e-9);
  assert.ok(portAssaultPositionIsFree({...target,...landing},[rank]));
  const occupied={...target,...landing,id:"occupied"};
  assert.ok(portAssaultPositionIsFree({...target,...portAssaultChargeLanding(target,{position:1,lane:0},[rank,occupied])},[rank,occupied]));
  const edge={...target,position:.03,lane:1.9};
  const result=portAssaultChargeLanding(edge,{position:-1,lane:-10},[]);
  const bounds=portAssaultGroundLaneBounds(result.position,"stone");
  assert.ok(result.position>=0 && result.lane>=bounds.minimum && result.lane<=bounds.maximum);
});

test("charge motion has a high parabola, smaller bounce, and separate ground depth",()=>{
  const args={deltaX:60,deltaY:10};
  assert.deepEqual(cityAssaultChargeOffset({...args,elapsedMs:0}),{x:-60,y:-10,groundY:-10});
  const apex=cityAssaultChargeOffset({...args,elapsedMs:300});
  assert.equal(apex.x,-30); assert.equal(apex.groundY,-5); assert.equal(apex.y,-33);
  assert.equal(cityAssaultChargeOffset({...args,elapsedMs:600}).y,0);
  assert.equal(cityAssaultChargeOffset({...args,elapsedMs:700}).y,-6);
  assert.deepEqual(cityAssaultChargeOffset({...args,elapsedMs:800}),{x:0,y:0,groundY:0});
});

test("each body spends momentum until ordinary melee is necessary",()=>{
  let momentum=1;
  for(const expected of [.76,.52,.28]) {
    momentum=portAssaultChargeMomentumAfterImpact(momentum,false);
    assert.ok(Math.abs(momentum-expected)<1e-9);
  }
  assert.ok(portAssaultChargeMomentumAfterImpact(1,true)<portAssaultChargeMomentumAfterImpact(1,false));
});

for (const type of ["cavalier","horseman","horse-samurai"]) test(`${type} bowls through several victims, damages them, and enforces airborne recovery`,()=>{
  const scenario=createPortAssaultScenario({cityId:"tunis|tunisia",dockKind:"stone",fortified:false,
    attackers:[soldier("horse",type,3)],defenders:Array.from({length:8},(_,i)=>soldier(`d${i}`,"swordsman")),shipHitPoints:100,shipMaxHitPoints:100});
  // This formation places several victims in the direct charge path.
  const battle=simulatePortAssault(scenario,1);
  const launches=battle.events.filter(e=>e.chargeLaunch);
  assert.ok(launches.length>=3);
  assert.ok(new Set(launches.map(e=>e.unitId)).size>=3);
  assert.ok(launches.some((e,i)=>i>0 && e.timeMs-launches[i-1].timeMs<=600 && e.chargeMomentum<launches[i-1].chargeMomentum));
  assert.ok(portAssaultUnitStats(soldier("stats",type)).movementPerSecond>.09);
  for(const launch of launches) {
    assert.ok(launch.damage>0);
    const frames=battle.tracks[launch.unitId].filter(f=>f.timeMs>=launch.timeMs && f.timeMs<launch.timeMs+PORT_ASSAULT_CHARGE_STAGGER_MS && f.alive);
    assert.ok(frames.every(f=>f.animationId==="hit"));
    assert.ok(frames.every(f=>f.position===frames[0].position && f.lane===frames[0].lane));
    assert.ok(!battle.events.some(e=>e.type==="attack" && e.unitId===launch.unitId && e.timeMs>launch.timeMs && e.timeMs<launch.timeMs+PORT_ASSAULT_CHARGE_STAGGER_MS));
  }
  const forecast=simulatePortAssault(scenario,1,{collectPresentation:false});
  for(const key of ["durationMs","outcome","finalShipHitPoints","attackerDeathIds","defenderCasualtyIds"]) assert.deepEqual(forecast[key],battle[key]);
});


test("packed landings search past the crowd, and only attackers can be thrown onto their ship",()=>{
  const target={id:"target",side:"attacker",position:.5,lane:1,dockKind:"stone",stats:{mounted:false}};
  const crowd=Array.from({length:4},(_,row)=>Array.from({length:10},(_,column)=>({...target,id:`${row}-${column}`,position:.575+row*.018,lane:column/3}))).flat();
  const landing=portAssaultChargeLanding(target,{position:1,lane:0},crowd);
  assert.ok(landing.position>.61);
  assert.ok(portAssaultPositionIsFree({...target,...landing},crowd));
  const nearShip={...target,position:.03,lane:1.8};
  assert.equal(portAssaultChargeLanding(nearShip,{position:-1,lane:0},[]).surface,"deck");
  assert.notEqual(portAssaultChargeLanding({...nearShip,side:"defender"},{position:-1,lane:0},[]).surface,"deck");
});

test("crowded charges remain valid across troop mixes, shores and seeds, including throws aboard",()=>{
  let throwsAboard=0;
  for (const dockKind of ["wood","stone","none"]) for (const seed of [1,7,19,37,71]) {
    const scenario=createPortAssaultScenario({cityId:"tunis|tunisia",dockKind,fortified:false,
      attackers:Array.from({length:15},(_,i)=>soldier(`a${i}`,"gunner")),
      defenders:Array.from({length:5},(_,i)=>soldier(`d${i}`,seed===1 ? "cavalier" : ["cavalier","horseman","horse-samurai"][i%3])),
      shipHitPoints:100,shipMaxHitPoints:100});
    const battle=simulatePortAssault(scenario,seed);
    for (const [id,track] of Object.entries(battle.tracks)) for (const frame of track) {
      assert.ok(Number.isFinite(frame.position) && Number.isFinite(frame.lane));
      assert.ok(frame.position>=0 && frame.position<=1);
      if (id.startsWith("d")) assert.notEqual(frame.surface,"deck");
    }
    for(const hit of battle.events.filter(e=>e.chargeLaunch && e.unitId.startsWith("a"))) {
      const track=battle.tracks[hit.unitId];
      const landing=track.find(f=>f.timeMs>=hit.timeMs);
      if(landing.surface!=="deck") continue;
      throwsAboard++;
      if (!landing.alive) continue;
      assert.ok(track.some(f=>f.timeMs>=hit.timeMs+PORT_ASSAULT_CHARGE_STAGGER_MS &&
        (f.animationId!=="hit" || !f.alive)) || battle.durationMs<hit.timeMs+PORT_ASSAULT_CHARGE_STAGGER_MS,
      "a living thrown unit must recover or the battle must end");
    }
  }
  assert.ok(throwsAboard>0,"must exercise a real charge throwing attackers back aboard");
});
