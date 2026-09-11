import test from "node:test";
import assert from "node:assert/strict";
import { createPortAssaultScenario, simulatePortAssault, portAssaultPresentationAt } from "./portAssaultBattle.js";
import { CITY_ASSAULT_FLOATING_WATER_DEPTH_PX, cityAssaultDeckStation, cityAssaultDeckPersonFrame, createCityAssaultShipEffects } from "../city-visualizer/cityAssaultShipEffects.js";
import { shipSinkSubmersionTimeMs, SHIP_SINK_EFFECT_DURATION_MS } from "./shipSinking.js";

const soldier = (id, type, experienceStars) => ({ id, appearanceId: type, crewTypeId: type,
  combatProfileId: type, experienceStars, auxiliary: false });
const scenario = (count, dockKind) => createPortAssaultScenario({ cityId: "tunis|tunisia",
  attackers: Array.from({length:15}, (_,i) => soldier(`a${i}`, "gunner", 1)),
  defenders: Array.from({length:count}, (_,i) => soldier(`d${i}`, "swordsman", 3)),
  shipHitPoints:80, shipMaxHitPoints:100, dockKind, fortified:false });

test("pressed gunners board, reload standing, fire from the deck and return ashore", () => {
  const input = scenario(8, "wood");
  const battle = simulatePortAssault(input, 42);
  const boarded = battle.combatants.filter(unit => battle.tracks[unit.id].some(f => f.surface === "deck"));
  assert.ok(boarded.length > 5);
  assert.ok(battle.events.some(e => e.type === "ship-hit"), "defenders attack the hull beneath the gunners");
  assert.ok(battle.events.some(e => e.type === "attack" && e.surface === "deck"));
  for (const unit of boarded) {
    assert.equal(unit.side, "attacker");
    const track = battle.tracks[unit.id];
    assert.ok(track.some(f => f.surface === "deck" && f.animationId === "reload"));
    assert.ok(track.some((f,i) => i && track[i-1].surface === "deck" && f.transferFrom === "deck" && f.surface === "shore"));
    assert.ok(track.filter(f => f.surface === "deck").every(f => !f.retreating));
    for (let i=1;i<track.length;i++) {
      if (track[i].surface === "deck" && track[i].animationId === "reload" && track[i-1].surface === "deck") {
        assert.equal(track[i].position, track[i-1].position);
        assert.equal(track[i].lane, track[i-1].lane);
      }
    }
  }
  const forecast = simulatePortAssault(input,42,{collectPresentation:false});
  for (const key of ["outcome","durationMs","finalShipHitPoints","attackerDeathIds","attackerWounds"]) assert.deepEqual(forecast[key],battle[key]);
});

test("shore defenders never board and can sink a ship with live gunners aboard", () => {
  for (const dockKind of ["wood", "stone", "none"]) {
    const battle = simulatePortAssault(scenario(20,dockKind),42);
    assert.equal(battle.finalShipHitPoints,0,dockKind);
    const final = portAssaultPresentationAt(battle,battle.durationMs+1000);
    assert.ok(final.units.some(u => u.alive && u.surface === "deck"),dockKind);
    for (const defender of battle.combatants.filter(u => u.side === "defender")) {
      assert.ok(battle.tracks[defender.id].every(f => f.surface === "shore" && f.position >= 0));
    }
    for (const event of battle.events.filter(e => e.type === "hit" || e.type === "death")) {
      const unit = portAssaultPresentationAt(battle,event.timeMs).units.find(u => u.id === event.unitId);
      assert.notEqual(unit.surface,"deck","shore melee cannot reach deck occupants");
    }
  }
});

test("deck occupants scurry then float at their own height, without following the sinking hull", () => {
  const polygon = [{x:2,y:2},{x:25,y:2},{x:25,y:25},{x:2,y:25}];
  const pixels = Array.from({length:32*32}, (_,i)=>({x:i%32,y:Math.floor(i/32),
    sinkHeight:.55+(i%32)/100,alpha:1,color:"#976d53"}));
  const model = createCityAssaultShipEffects(pixels,32,32);
  const p = {elapsedMs:1000,shipSunkAtMs:1000,shipHitPoints:0,shipMaxHitPoints:100,events:[]};
  const times = new Set();
  for(let slot=0;slot<15;slot++) {
    const station = cityAssaultDeckStation(polygon,slot);
    assert.ok(station.x>2 && station.x<25 && station.y>2 && station.y<25);
    const first=cityAssaultDeckPersonFrame(model,polygon,slot,p);
    assert.equal(first.scurrying,true);
    assert.equal(first.floating,false);
    const time=shipSinkSubmersionTimeMs(model.sink,model.deckStations.get(slot).sinkHeight);
    times.add(time);
    assert.equal(cityAssaultDeckPersonFrame(model,polygon,slot,{...p,elapsedMs:time-1}).floating,false);
    const submerged=cityAssaultDeckPersonFrame(model,polygon,slot,{...p,elapsedMs:time+1});
    assert.equal(submerged.floating,true);
    assert.equal(submerged.animationId,"hit","loop the damage animation as panic while afloat");
    const last=cityAssaultDeckPersonFrame(model,polygon,slot,{...p,elapsedMs:1000+SHIP_SINK_EFFECT_DURATION_MS});
    assert.equal(last.scurrying,false);
    assert.ok(Math.abs(last.y-submerged.y)<=2,"floating at the surface, not sinking with the ship");
  }
  assert.ok(times.size>1,"different deck heights enter the water at different times");
});


test("floating damage animations retain recognizable upper bodies for every combat sprite", async () => {
  const { readFile } = await import("node:fs/promises");
  const manifest = JSON.parse(await readFile(new URL("../city-visualizer/assets/minifolks/manifest.json", import.meta.url), "utf8"));
  for (const appearance of manifest.appearances.filter(a => a.animations.attack)) {
    assert.ok(appearance.animations.hit?.length, `${appearance.id}: missing panic animation`);
    for (const frame of appearance.animations.hit) {
      const visibleRows = frame.sourceSize.h - frame.spriteSourceSize.y - CITY_ASSAULT_FLOATING_WATER_DEPTH_PX - 1;
      assert.ok(visibleRows >= 8, `${appearance.id}: swimmer clipped to ${visibleRows} rows`);
    }
  }
});
