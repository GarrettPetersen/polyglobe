import test from "node:test";
import assert from "node:assert/strict";
import {simulatePortAssaultInWorker} from "./portAssaultSimulationClient.js";
class FakeWorker {
  static latest;
  handlers = {};
  constructor() { FakeWorker.latest = this; }
  addEventListener(type, callback) { this.handlers[type] = callback; }
  postMessage(message) { this.request = message; }
  terminate() { this.terminated = true; }
}
test("recorded battle work is asynchronous, checked and released", async () => {
  const result = simulatePortAssaultInWorker({cityId:"lisbon|portugal"}, 42, {WorkerClass:FakeWorker});
  const worker = FakeWorker.latest;
  assert.equal(worker.request.kind,"battle");
  const battle = {durationMs:100,events:[]};
  worker.handlers.message({data:{cityId:"lisbon|portugal",seed:42,battle}});
  assert.equal(await result,battle);
  assert.equal(worker.terminated,true);
});
test("cancelled assaults release their worker and cannot activate stale battles", async () => {
  const controller = new AbortController();
  const result = simulatePortAssaultInWorker({cityId:"lisbon|portugal"}, 42, {WorkerClass:FakeWorker,signal:controller.signal});
  const worker = FakeWorker.latest;
  controller.abort();
  assert.equal(await result,null);
  assert.equal(worker.terminated,true);
});
test("worker failures and mismatched battles remain loud", async () => {
  for (const data of [{error:"broken scenario"},{cityId:"wrong",seed:42,battle:{durationMs:1,events:[]}}]) {
    const result = simulatePortAssaultInWorker({cityId:"lisbon|portugal"},42,{WorkerClass:FakeWorker});
    FakeWorker.latest.handlers.message({data});
    await assert.rejects(result,/Port assault simulation failed/);
    assert.equal(FakeWorker.latest.terminated,true);
  }
});
