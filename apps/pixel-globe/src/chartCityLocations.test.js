import { readFileSync } from "node:fs";
import vm from "node:vm";
import { createGameState, adjustFactionReputation, factionReputation, recordShipMercyForFaction, pirateHideoutsVisibleToPlayer } from "./gameState.js";
import assert from "node:assert/strict";
import test from "node:test";
import { buildPlayerPirateHideoutPorts } from "./piratePorts.js";
import { chartCityLocationId, indexChartCityLocations } from "./chartCityLocations.js";
import { createSpatialHash } from "./spatialHash.js";

test("revealing a pirate cove keeps both it and Valencia selectable without duplicating market identity", () => {
  const city = { cityId: "valencia|spain", portId: "valencia|spain", tileId: 42,
    city: "Valencia", country: "Spain", factionId: "spain" };
  const [hideout] = buildPlayerPirateHideoutPorts([city]);
  const voyage = createGameState({ cargoCapacity: 20 });
  adjustFactionReputation(voyage, "pirate", -26 - factionReputation(voyage, "pirate"));
  assert.equal(pirateHideoutsVisibleToPlayer(voyage),false);
  recordShipMercyForFaction(voyage, "pirate");
  assert.equal(pirateHideoutsVisibleToPlayer(voyage),true);
  const restored = JSON.parse(JSON.stringify(voyage));
  assert.equal(pirateHideoutsVisibleToPlayer(restored),true);
  assert.equal(indexChartCityLocations([city,...(pirateHideoutsVisibleToPlayer(restored)?[hideout]:[])]).size,2);
  for (const calls of [[city],[city,hideout],[hideout,city]]) {
    const index = indexChartCityLocations(calls);
    assert.equal(index.get(city.cityId),city);
    if (calls.length > 1) assert.equal(index.get(chartCityLocationId(hideout)),hideout);
  }
  const spatial = createSpatialHash({ cellSize: 32 });
  assert.doesNotThrow(()=>spatial.replaceKind("port",[city,hideout].map(call=>({
    id:chartCityLocationId(call),x:0,y:0,radius:0,value:call
  }))));
  assert.equal(hideout.cityId,city.cityId);
  assert.equal(hideout.portId,city.portId);
  assert.notEqual(chartCityLocationId(city),chartCityLocationId(hideout));
  assert.throws(()=>indexChartCityLocations([city,city]),/duplicate city location/);
  assert.throws(()=>indexChartCityLocations([hideout,hideout]),/duplicate city location/);
});

test("the active cove resolves its own dialogue and ordinary Valencia retains its staff", () => {
  const source = readFileSync(new URL("./main.js",import.meta.url),"utf8");
  const code = source.slice(source.indexOf("function currentDialogueCity()"),source.indexOf("function chartCityCallByLocationId("));
  const city = {cityId:"valencia|spain",portId:"valencia|spain",character:{name:"Harbour master"}};
  const hideout = {...city,isPirateHideout:true,character:{name:"Cove keeper"}};
  const index = indexChartCityLocations([city,hideout]);
  for (const location of [city,hideout]) {
    const runtime = {dialogueState:{kind:"port",nodeId:"market",cityId:city.cityId,portId:city.portId},
      portCityView:{cityId:city.cityId},currentPortCitySceneCity:()=>location,chartCityLocationId,
      chartCityCallByLocationId:id=>index.get(id),portDialogueHasCaptainSpeaker:()=>false,
      colonizationSiteIsRuined:()=>false,currentCityStaffCharacter:()=>city.character,characterExpression:()=>"neutral"};
    const selected = vm.runInNewContext(`${code}\ncurrentDialogueCity()`,runtime);
    assert.equal(selected.character,location.character);
    assert.equal(selected.isPirateHideout,location.isPirateHideout);
  }
});
