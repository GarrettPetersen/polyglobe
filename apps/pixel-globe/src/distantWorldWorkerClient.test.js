import assert from "node:assert/strict";
import test from "node:test";
import { createDistantWorldWorkerClient } from "./distantWorldWorkerClient.js";

class FakeWorker {
  constructor(url, options) {
    this.url = url;
    this.options = options;
    this.listeners = new Map();
    this.messages = [];
    this.terminated = false;
    instances.push(this);
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  postMessage(message) {
    this.messages.push(message);
  }

  emit(type, data) {
    this.listeners.get(type)?.({ data });
  }

  terminate() {
    this.terminated = true;
  }
}

test("worker client advances only when the next strategic event is due", () => {
  const due = [];
  const errors = [];
  const client = createDistantWorldWorkerClient({
    workerUrl: new URL("https://example.test/distant-world.js"),
    onDue: (result) => due.push(result),
    onError: (error) => errors.push(error),
    WorkerClass: FakeWorker
  });
  client.reset(
    { economyMinute: 360, maintenanceMinute: 30, ships: [], carts: [] },
    0,
    portableSimulation
  );
  const instance = workerInstance(client);
  assert.equal(instance.messages.length, 1);
  const generation = instance.messages[0].generation;
  instance.emit("message", { type: "ready", generation, nextMinute: 30 });
  assert.equal(client.requestAdvance(29, runtimeFactory), false);
  assert.equal(instance.messages.length, 1);
  assert.equal(client.requestAdvance(30, runtimeFactory), true);
  assert.equal(instance.messages.at(-1).type, "advance");
  assert.equal(instance.messages.at(-1).runtime, runtimeState);
  instance.emit("message", {
    type: "due",
    generation,
    result: {
      due: true,
      economy: false,
      maintenance: true,
      shipIds: [],
      cartIds: [],
      nextMinute: 60,
      simulation: { before: {}, after: {} }
    }
  });
  assert.equal(due.length, 1);
  assert.equal(errors.length, 0);
});

test("worker client ignores stale generations and reports worker failures", () => {
  const due = [];
  const errors = [];
  const client = createDistantWorldWorkerClient({
    workerUrl: new URL("https://example.test/distant-world.js"),
    onDue: (result) => due.push(result),
    onError: (error) => errors.push(error),
    WorkerClass: FakeWorker
  });
  const instance = workerInstance(client);
  client.reset(
    { economyMinute: 10, maintenanceMinute: 20, ships: [], carts: [] },
    0,
    portableSimulation
  );
  const firstGeneration = instance.messages.at(-1).generation;
  client.reset(
    { economyMinute: 30, maintenanceMinute: 40, ships: [], carts: [] },
    0,
    portableSimulation
  );
  instance.emit("message", {
    type: "due",
    generation: firstGeneration,
    result: {
      due: true,
      economy: true,
      maintenance: false,
      shipIds: [],
      cartIds: [],
      nextMinute: 60,
      simulation: { before: {}, after: {} }
    }
  });
  assert.equal(due.length, 0);
  instance.listeners.get("error")({ message: "worker exploded" });
  assert.match(errors[0].message, /worker exploded/);
  client.dispose();
  assert.equal(instance.terminated, true);
});

const instances = [];
const portableSimulation = Object.freeze({ systems: {}, maintenanceIntervalMinutes: 180 });
const runtimeState = Object.freeze({ relations: [] });
const runtimeFactory = () => runtimeState;

function workerInstance(client) {
  void client;
  const instance = instances.at(-1);
  if (!instance) throw new Error("Fake worker was not constructed");
  return instance;
}
