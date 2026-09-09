import test from "node:test";
import assert from "node:assert/strict";
import { createPortAssaultScenario, simulatePortAssault, portAssaultPresentationAt } from "./portAssaultBattle.js";
import { portAssaultAttackTiming, portAssaultProjectileFlightMs } from "./portAssaultAttackTiming.js";
import { PORT_ASSAULT_LANE_SPACING } from "./portAssaultFormation.js";

const types = ["swordsman", "gunner", "archer", "spearman", "teppo-ashigaru"];
const combatant = (id, index) => ({ id, appearanceId: `${types[index % types.length]}-light`, crewTypeId: types[index % types.length], combatProfileId: types[index % types.length], experienceStars: 1, auxiliary: false });
const scenario = createPortAssaultScenario({cityId: "tunis|tunisia", attackers: Array.from({length:12},(_,i)=>combatant(`a${i}`,i)), defenders: Array.from({length:12},(_,i)=>combatant(`d${i}`,i)), dockKind:"wood", fortified:false, shipHitPoints:100, shipMaxHitPoints:100});
const battle = simulatePortAssault(scenario, 19);
const profiles = new Map([...scenario.attackers,...scenario.defenders].map(u=>[u.id,u.combatProfileId]));

test("attacks release on authored contact frames, damage follows contact or projectile flight", () => {
  const attacks = battle.events.filter(e=>e.type === "attack");
  assert.ok(attacks.length > 20);
  for (const event of attacks) {
    const timing = portAssaultAttackTiming(profiles.get(event.unitId),event.attackType);
    assert.equal(event.timeMs - event.animationStartedAtMs,timing.contactMs);
    const windup = portAssaultPresentationAt(battle,event.animationStartedAtMs).units.find(u=>u.id===event.unitId);
    assert.equal(windup.animationId,"attack");
    assert.equal(windup.animationDurationMs,timing.durationMs);
  }
  const seen = new Set();
  for (const event of battle.events.filter(e=>["hit","death"].includes(e.type))) {
    const launch = attacks.find(a=>a.unitId===event.attackerId && a.targetId===event.unitId && a.timeMs + portAssaultProjectileFlightMs(a.attackType)===event.timeMs);
    assert.ok(launch, `damage must belong to a released attack: ${JSON.stringify(event)}`);
    seen.add(event.attackType);
  }
  assert.deepEqual([...seen].sort(),["arrow","firearm","melee"]);
});

test("melee lunges retain collision-limited displacement toward the target in both dimensions", () => {
  const lunges = battle.events.filter(e=>e.type==="attack" && e.attackType==="melee");
  assert.ok(lunges.some(e=>Math.abs(e.lungePositionDelta)>0.005));
  assert.ok(lunges.some(e=>Math.abs(e.lungeLaneDelta)>0.01));
  for (const event of lunges) {
    assert.ok(Math.hypot(event.lungePositionDelta,event.lungeLaneDelta*PORT_ASSAULT_LANE_SPACING)<=0.016001);
    const dot = event.lungePositionDelta*(event.targetPosition-event.position) + event.lungeLaneDelta*(event.targetLane-event.lane)*PORT_ASSAULT_LANE_SPACING**2;
    assert.ok(dot>=-1e-9, "lunge must face its target");
  }
});

test("hits do not interrupt windups or impose the old 360ms decision lock", () => {
  let uninterrupted = 0;
  let promptActions = 0;
  for (const hit of battle.events.filter(e=>e.type==="hit")) {
    const before = portAssaultPresentationAt(battle,hit.timeMs-1).units.find(u=>u.id===hit.unitId);
    const after = portAssaultPresentationAt(battle,hit.timeMs).units.find(u=>u.id===hit.unitId);
    const released = battle.events.some(e=>e.type==="attack" && e.unitId===hit.unitId && e.animationStartedAtMs===before.animationStartedAtMs);
    if (released && before.animationId==="attack" && before.animationStartedAtMs+before.animationDurationMs>hit.timeMs) {
      assert.equal(after.animationId,"attack");
      assert.equal(after.animationStartedAtMs,before.animationStartedAtMs);
      uninterrupted++;
    }
    const later = portAssaultPresentationAt(battle,hit.timeMs+200).units.find(u=>u.id===hit.unitId);
    if (later?.alive && ["walk","attack","reload"].includes(later.animationId)) promptActions++;
  }
  assert.ok(uninterrupted>0,"exercise a hit during another soldier's attack");
  assert.ok(promptActions>0,"soldiers resume decisions before the former hitstun expires");
});

test("defenders damage the ship on contact, and dead soldiers cannot finish windups", () => {
  const naval = simulatePortAssault(createPortAssaultScenario({...scenario,
    attackers:[combatant("lone-attacker",0)],
    defenders:Array.from({length:8},(_,i)=>combatant(`guard${i}`,i)),
    shipHitPoints:20, shipMaxHitPoints:20}), 11);
  const hits = naval.events.filter(e=>e.type==="ship-hit");
  assert.ok(hits.length>0);
  for (const hit of hits) {
    const unit = naval.combatants.find(u=>u.id===hit.unitId);
    assert.equal(hit.timeMs-hit.animationStartedAtMs,portAssaultAttackTiming(unit.combatProfileId,hit.attackType).contactMs);
    assert.equal(portAssaultPresentationAt(naval,hit.animationStartedAtMs).units.find(u=>u.id===hit.unitId).animationId,"attack");
  }
  for (const simulation of [battle,naval]) {
    const dead = new Set();
    for (const event of simulation.events) {
      if (event.type==="death") dead.add(event.unitId);
      if (["attack","ship-hit"].includes(event.type)) assert.ok(!dead.has(event.unitId),"a dead soldier cannot release a new attack");
    }
  }
});

test("arrow events remain renderable until their projectiles arrive", () => {
  const shot = battle.events.find(e=>e.type==="attack" && e.attackType==="arrow");
  assert.ok(shot);
  assert.ok(portAssaultPresentationAt(battle,shot.timeMs+399).events.includes(shot));
});
