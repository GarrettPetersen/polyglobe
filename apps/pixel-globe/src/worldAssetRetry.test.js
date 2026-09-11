import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import {createOnDemandAssetStore} from "./onDemandAssetStore.js";

const main = readFileSync(new URL("./main.js", import.meta.url), "utf8");
const retrySource = main.slice(main.indexOf("function showWorldAssetRetry()"), main.indexOf("function clearFailedWorldAssetRequests()"));

test("network recovery retries the failed artwork, pauses combat time and resumes only on success", async () => {
  let online = false, now = 100, frames = 0;
  const networkError = new Error("offline");
  const store = createOnDemandAssetStore({label:"ships",load: async () => {if (!online) throw networkError; return {ready:true};}});
  await assert.rejects(store.request("caravel"), /offline/);
  const elements = [];
  const assault = {pausedAtMs:null,pausedDurationMs:0};
  const context = vm.createContext({
    document: {createElement: () => {const element = {style:{}, handlers:{}, append(){}, addEventListener(type,fn){this.handlers[type]=fn;}, showModal(){}, focus(){}, close(){}, remove(){this.removed=true;}};elements.push(element);return element;},body:{append(){}}},
    uiText:key=>key, performance:{now:()=>now}, clearSessionHeldControls(){}, suspendMainThreadFreezeMonitor(){}, mainThreadFreezeMonitor:{},
    failedWorldAssetRequests:()=>store.failedEntries().map(entry=>({store,...entry})),
    isTransientStaticAssetError:error=>error===networkError || error?.cause===networkError,
    clearFailedWorldAssetRequests:()=>store.clearErrors(),
    pendingWorldAssetError: networkError, portAssaultState: assault, lakeBattleMode:null,
    frameClockSynchronizationPending:false, dirty:false, requestAnimationFrame:()=>frames++, loop(){},
    gameTelemetry:{captureCrash:assert.fail},telemetryCrashContext:()=>({}),drawFatalError:assert.fail
  });
  vm.runInContext(retrySource+"\nshowWorldAssetRetry();",context);
  const button = elements[2];
  await button.handlers.click();
  assert.equal(frames,0);
  assert.equal(button.disabled,false);
  online=true; now=3100;
  await button.handlers.click();
  assert.equal(frames,1);
  assert.equal(assault.pausedDurationMs,3000);
  assert.equal(context.pendingWorldAssetError,null);
  assert.equal(elements[0].removed,true);
});
