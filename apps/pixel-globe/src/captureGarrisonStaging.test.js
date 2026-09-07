import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source=ts.createSourceFile("main.js",readFileSync(new URL("./main.js",import.meta.url),"utf8"),ts.ScriptTarget.Latest,true);
const declaration=source.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==="stageCaptureGarrisonOfficer");
assert.ok(declaration);
test("capture garrison portraits are optional; an unspecified portrait preserves the generated officer",()=>{
  const stage=runInNewContext(declaration.getText(source)+";stageCaptureGarrisonOfficer");
  assert.doesNotThrow(()=>stage({variant:"assault"},{cityId:"rhodes|greece"}));
});
test("an explicit capture portrait replaces the officer and refreshes the chart",()=>{
  const city={cityId:"rhodes|greece"};
  const previous={name:"Previous officer"};
  const officer={name:"Capture officer"};
  const names=new Set([previous.name]);
  const staff=new Map([[city.cityId,{garrison:previous}]]);
  const context={portCityStaffByCityId:staff,usedCharacterNames:names,
    PORT_CITY_STAFF_ROLE:{GARRISON_COMMANDER:"garrison"},characterPortraitManifest:{},
    gameState:{playerCharacter:{}},playerPortraitSourceExclusions:()=>new Set(),
    requirePortCityStaffMember:()=>previous,
    assignPortCityStaffMemberFromSource:(_city,_role,sourceId)=>{
      assert.equal(sourceId,"portrait-a");return officer;
    },camera:{},buildChart:()=>({refreshed:true}),chart:null};
  const stage=runInNewContext(declaration.getText(source)+";stageCaptureGarrisonOfficer",context);
  stage({garrisonPortraitSourceId:"portrait-a"},city);
  assert.equal(staff.get(city.cityId).garrison,officer);
  assert.deepEqual([...names],[officer.name]);
  assert.equal(context.chart.refreshed,true);
});
