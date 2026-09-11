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
    const c=(id,type,stars)=>({id,appearanceId:type==='cavalier'?'cavalier-covered':type+'-light',crewTypeId:type,combatProfileId:type,experienceStars:stars,auxiliary:false});
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
  // Exercise actual charge tracks through the city renderer, including airborne
  // height, landing, recovery and subsequent ship transfers.
  const chargeFrames = await page.evaluate(() => {
    const api=window.boardingBattleApi;
    const c=(id,type)=>({id,appearanceId:type==='cavalier'?'cavalier-covered':type+'-light',crewTypeId:type,combatProfileId:type,experienceStars:1,auxiliary:false});
    const battle=api.simulatePortAssault(api.createPortAssaultScenario({cityId:'london|united kingdom',
      attackers:Array.from({length:15},(_,i)=>c('a'+i,'gunner')),
      defenders:Array.from({length:5},(_,i)=>c('d'+i,'cavalier')),
      shipHitPoints:100,shipMaxHitPoints:100,dockKind:'wood',fortified:false}),1);
    window.chargeBattle=battle;
    let frames=0;
    for (let elapsedMs=0;elapsedMs<=battle.durationMs+8000;elapsedMs+=200) {
      window.boardingScene.setAssaultPresentation(api.portAssaultPresentationAt(battle,elapsedMs),{immediateCamera:true});
      window.boardingScene.render(elapsedMs);
      frames++;
    }
    return {frames,launches:battle.events.filter(e=>e.chargeLaunch).length};
  });
  if (chargeFrames.launches === 0) throw new Error('Charge rendering fixture emitted no charges');
  for (const [name,offset] of [['charge-apex',300],['charge-landing',600],['charge-recovery',1000]]) {
    await page.evaluate(offset=>{
      const battle=window.chargeBattle;
      const elapsedMs=battle.events.find(e=>e.chargeLaunch).timeMs+offset;
      window.boardingScene.setAssaultPresentation(window.boardingBattleApi.portAssaultPresentationAt(battle,elapsedMs),{immediateCamera:true});
      window.boardingScene.render(elapsedMs);
    },offset);
    await page.locator('canvas').screenshot({path:`${appRoot}/.playtest/boarding/${name}.png`});
  }
  console.log('charge rendering',chargeFrames);
  if(errors.length) throw new Error(errors.join('\n'));
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
