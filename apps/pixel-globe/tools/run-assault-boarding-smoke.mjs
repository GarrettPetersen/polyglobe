import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { launchCaptureBrowser, collectCapturePageErrors } from "./capture-browser.mjs";
import { startBenchmarkServer, waitForBenchmarkServer } from "./benchmark-server.mjs";
const appRoot = fileURLToPath(new URL("../", import.meta.url));
const server = startBenchmarkServer({appRoot,port:5197});
let browser;
try {
  await waitForBenchmarkServer({baseUrl:"http://127.0.0.1:5197",server});
  browser = await launchCaptureBrowser();
  const page = await browser.newPage({viewport:{width:960,height:640}});
  const errors=[];
  collectCapturePageErrors(page,errors);
  await page.route("**/boarding-fixture",route=>route.fulfill({contentType:"text/html",body:'<link rel="stylesheet" href="/city-visualizer/styles.css"><canvas width="480" height="320" style="width:960px;height:640px;image-rendering:pixelated"></canvas>'}));
  await page.goto("http://127.0.0.1:5197/boarding-fixture");
  await page.evaluate(async()=>{
    const {createCitySceneRuntime}=await import('/city-visualizer/main.js');
    const battle=await import('/src/portAssaultBattle.js');
    window.boardingBattleApi=battle;
    window.boardingScene=await createCitySceneRuntime({canvas:document.querySelector('canvas'),assetBaseUrl:'/city-visualizer/assets',
      initialCityId:'london|united kingdom',initialShipSlug:'galleon',externalFrameClock:true,onDestination:()=>{throw new Error('Unexpected navigation in boarding smoke');}});
    const c=(id,type,stars)=>({id,appearanceId:type+'-light',crewTypeId:type,combatProfileId:type,experienceStars:stars,auxiliary:false});
    window.boardingBattles=[8,20].map(count=>battle.simulatePortAssault(battle.createPortAssaultScenario({cityId:'london|united kingdom',
      attackers:Array.from({length:15},(_,i)=>c('a'+i,'gunner',1)),defenders:Array.from({length:count},(_,i)=>c('d'+i,'swordsman',3)),
      shipHitPoints:80,shipMaxHitPoints:100,dockKind:'wood',fortified:false}),42));
  });
  await mkdir(`${appRoot}/.playtest/boarding`,{recursive:true});
  for (const [name,battleIndex,offset] of [['deck-firing',0,-33000],['return-ashore',0,-15000],['sinking',1,2000],['afloat',1,7000]]) {
    const result=await page.evaluate(({battleIndex,offset})=>{
      const battle=window.boardingBattles[battleIndex];
      const elapsedMs=battle.durationMs+offset;
      const presentation=window.boardingBattleApi.portAssaultPresentationAt(battle,elapsedMs);
      window.boardingScene.setAssaultPresentation(presentation,{immediateCamera:true});
      window.boardingScene.render(elapsedMs);
      return {elapsedMs,deck:presentation.units.filter(u=>u.surface==='deck').length,hull:presentation.shipHitPoints};
    },{battleIndex,offset});
    await page.locator('canvas').screenshot({path:`${appRoot}/.playtest/boarding/${name}.png`});
    console.log(name,result);
  }
  if(errors.length) throw new Error(errors.join('\n'));
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
