import assert from "node:assert/strict";
import test from "node:test";

import {
  createControllerConnectionMonitor,
  observeControllerConnection
} from "./controllerLifecycle.js";

test("controller disconnects are debounced and reported once", () => {
  const monitor = createControllerConnectionMonitor();
  assert.equal(observeControllerConnection(monitor, { connected: false, nowMs: 0 }), null);
  assert.equal(observeControllerConnection(monitor, { connected: true, nowMs: 10 }), "connected");
  assert.equal(observeControllerConnection(monitor, { connected: false, nowMs: 20 }), null);
  assert.equal(observeControllerConnection(monitor, { connected: false, nowMs: 769 }), null);
  assert.equal(observeControllerConnection(monitor, { connected: false, nowMs: 770 }), "disconnected");
  assert.equal(observeControllerConnection(monitor, { connected: false, nowMs: 2000 }), null);
});

test("a one-frame input gap does not disconnect the controller", () => {
  const monitor = createControllerConnectionMonitor();
  observeControllerConnection(monitor, { connected: true, nowMs: 0 });
  observeControllerConnection(monitor, { connected: false, nowMs: 100 });
  assert.equal(observeControllerConnection(monitor, { connected: true, nowMs: 150 }), null);
  observeControllerConnection(monitor, { connected: false, nowMs: 200 });
  assert.equal(observeControllerConnection(monitor, { connected: false, nowMs: 951 }), "disconnected");
});
