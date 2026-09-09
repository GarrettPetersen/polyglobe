import test from "node:test";
import assert from "node:assert/strict";
import { Worker } from "node:worker_threads";
import { createPortAssaultForecastClient } from "./portAssaultForecastClient.js";
import { createPortAssaultScenario, forecastPortAssault } from "./portAssaultBattle.js";

class FakeWorker {
  static instances = [];
  handlers = {};
  constructor() { FakeWorker.instances.push(this); }
  addEventListener(type, callback) { this.handlers[type] = callback; }
  postMessage(message) { this.message = message; }
  terminate() { this.terminated = true; }
  reply(forecast) { this.handlers.message({ data: { seedKey: this.message.seedKey, forecast } }); }
}

test("forecast requests return pending immediately, cache completed results and reject stale replies", () => {
  let ready = 0;
  const client = createPortAssaultForecastClient({ WorkerClass: FakeWorker, onReady: () => ready++ });
  assert.equal(client.request({ cityId: "first" }, "first-key"), null);
  const first = FakeWorker.instances.at(-1);
  assert.equal(client.request({ cityId: "first" }, "first-key"), null);
  assert.equal(FakeWorker.instances.at(-1), first);
  assert.equal(client.request({ cityId: "second" }, "second-key"), null);
  assert.equal(first.terminated, true);
  first.reply({ sampleCount: 32, successPercent: 99 });
  assert.equal(ready, 0);
  const second = FakeWorker.instances.at(-1);
  second.reply({ sampleCount: 32, successChance: 0.5, successPercent: 50,
    expectedCasualties: 1, expectedCasualtiesRounded: 1, casualtyRangeLow: 0, casualtyRangeHigh: 2,
    expectedDeaths: 0, expectedDeathsRounded: 0, deathRangeLow: 0, deathRangeHigh: 0,
    expectedWounded: 1, expectedWoundedRounded: 1, woundedRangeLow: 0, woundedRangeHigh: 2, expectedHullDamage: 0 });
  assert.equal(ready, 1);
  assert.equal(second.terminated, true);
  assert.equal(client.request({ cityId: "second" }, "second-key").successPercent, 50);
  client.clear();
  assert.equal(client.request({ cityId: "second" }, "second-key"), null);
  client.clear();
});

test("forecast worker failures remain loud and terminate failed work", () => {
  for (const event of ["error", "messageerror", "wrong-key", "invalid", "reported-error"]) {
    const errors = [];
    const client = createPortAssaultForecastClient({ WorkerClass: FakeWorker, onReady: () => assert.fail("invalid completion"),
      onError: error => errors.push(error) });
    client.request({ cityId: "lisbon|portugal" }, "key");
    const worker = FakeWorker.instances.at(-1);
    if (event === "error") worker.handlers.error({ message: "broken" });
    else if (event === "messageerror") worker.handlers.messageerror();
    else worker.handlers.message({ data: event === "wrong-key" ? { seedKey: "wrong" }
      : event === "reported-error" ? { seedKey: "key", error: "invalid scenario" }
      : { seedKey: "key", forecast: { sampleCount: NaN } } });
    assert.equal(errors.length, 1);
    assert.match(errors[0].message, /forecast failed for lisbon\|portugal/);
    assert.equal(worker.terminated, true);
  }
});

test("the actual forecast worker preserves seeded battle odds while the caller keeps ticking", async () => {
  const combatants = (prefix, count) => Array.from({ length: count }, (_, i) => ({ id: `${prefix}-${i}`,
    appearanceId: "swordsman-appearance", crewTypeId: "swordsman", combatProfileId: "swordsman",
    experienceStars: 1, auxiliary: false }));
  const scenario = createPortAssaultScenario({ cityId: "lisbon|portugal", attackers: combatants("crew", 12),
    defenders: combatants("guard", 8), shipHitPoints: 80, shipMaxHitPoints: 100, fortified: true, dockKind: "stone" });
  const url = new URL("./portAssaultForecastWorker.js", import.meta.url).href;
  const worker = new Worker(`const { parentPort } = require("node:worker_threads");
    globalThis.self = { addEventListener: (_, callback) => parentPort.on("message", data => callback({ data })),
      postMessage: data => parentPort.postMessage(data) };
    import(${JSON.stringify(url)}).then(() => parentPort.postMessage({ ready: true }));`, { eval: true });
  let ticks = 0;
  const interval = setInterval(() => ticks++, 1);
  try {
    const result = await new Promise((resolve, reject) => {
      worker.on("error", reject);
      worker.on("message", message => {
        if (message.ready) worker.postMessage({ scenario, seedKey: "worker-equivalence" });
        else if (message.error) reject(new Error(message.error));
        else resolve(message.forecast);
      });
    });
    assert.ok(ticks > 0, "Worker calculation blocked the caller's event loop");
    assert.deepEqual(result, forecastPortAssault(scenario, { seedKey: "worker-equivalence" }));
  } finally { clearInterval(interval); await worker.terminate(); }
});
