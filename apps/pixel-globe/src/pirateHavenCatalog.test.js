import { createShoreBatteryState } from "./shoreBatteries.js";
import { portAssaultGarrisonCount } from "./portAssaultBattle.js";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCityCatalogFromCsv } from "./cityCatalogData.js";
import { PIRATE_HAVEN_SPECS, PIRATE_HAVEN_MIN_SEPARATION_KM } from "./pirateHavenCatalog.js";
import { greatCircleDistanceKm } from "./worldDistance.js";
import { assignPortCityStaff } from "./characterPortraits.js";
import { deriveCityArchitectureProfile } from "../city-visualizer/cityArchitecture.js";
const cities=loadCityCatalogFromCsv(readFileSync(new URL("../../../examples/globe-demo/public/datasets/urbanization-dominance-pruned/urbanization-dominance-pruned.csv",import.meta.url),"utf8"));
const scenes=JSON.parse(readFileSync(new URL("../city-visualizer/data/cities.json",import.meta.url))).cities;
const havens=cities.filter(city=>city.isPirateHideout);
const manifest=JSON.parse(readFileSync(new URL("../public/assets/characters/generated/character-portraits.json",import.meta.url)));
test("all authored havens have independent baked scenes, regional architecture and secluded coordinates",()=>{
 assert.equal(havens.length,PIRATE_HAVEN_SPECS.length);
 for (const haven of havens) {
  const scene=scenes.find(c=>c.cityId===haven.cityId);assert.ok(scene,haven.cityId);
  assert.equal(scene.settlementType,"village");assert.equal(scene.fortified,true);
  const battery = createShoreBatteryState({ ...haven, tileId: scene.tileId }, {}, 0);
  assert.ok(battery.gunCount > 0 && battery.maxHitPoints > 0);
  assert.ok(portAssaultGarrisonCount(haven) > 0);
  assert.deepEqual(scene.architecture,deriveCityArchitectureProfile(haven));
  for (const other of scenes) {
   if(other.cityId===haven.cityId)continue;
   assert.notEqual(scene.tileId,other.tileId);
   assert.ok(greatCircleDistanceKm(haven,other)>=PIRATE_HAVEN_MIN_SEPARATION_KM,`${haven.cityId} too close to ${other.cityId}`);
  }
 }
 const wokou=havens.find(c=>c.pirateCulture==="wokou");assert.equal(wokou.country,"Philippines");
 assert.equal(deriveCityArchitectureProfile(wokou).housingStyle,"japanese");
});
test("every haven staff role uses pirates; Wokou staff use samurai portraits and Japanese names",()=>{
 const staff=assignPortCityStaff(havens.map((c,i)=>({...c,tileId:i})),manifest,new Set());
 for(const city of havens)for(const character of Object.values(staff.get(city.cityId))){
  const source=manifest.sourceCharacters.find(s=>s.id===character.sourceId);
  if(city.pirateCulture==="wokou"){
   assert.equal(source.sourceDirectory,"Sengoku Samurai Portrait Pack by Retro Diffusion");
   assert.equal(character.nameCulture,"japanese");
  }else assert.ok(source.roles.includes("pirate"),`${city.cityId}: ${character.role}`);
 }
});
