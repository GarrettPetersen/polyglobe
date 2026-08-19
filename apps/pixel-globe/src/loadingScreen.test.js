import assert from "node:assert/strict";
import test from "node:test";

import { startCapsuleLoadingScreen } from "./loadingScreen.js";

test("capsule loading recovers from one worker crash using a fresh canvas", async (t) => {
  const originals = captureGlobals([
    "document", "window", "localStorage", "performance", "HTMLElement",
    "HTMLCanvasElement", "ResizeObserver", "Worker"
  ]);
  const originalWarn = console.warn;
  const warnings = [];
  console.warn = (...args) => warnings.push(args);
  t.after(() => {
    console.warn = originalWarn;
    restoreGlobals(originals);
  });

  class FakeElement {
    constructor(id = "") {
      this.id = id;
      this.hidden = false;
      this.dataset = {};
      this.style = {};
      this.attributes = new Map();
      this.clientWidth = 455;
      this.clientHeight = 256;
      this.textContent = "";
    }

    setAttribute(name, value) { this.attributes.set(name, value); }
    removeAttribute(name) { this.attributes.delete(name); }
  }

  const elements = new Map();
  class FakeCanvas extends FakeElement {
    transferControlToOffscreen() { return { owner: this }; }
    cloneNode() { return new FakeCanvas(this.id); }
    replaceWith(replacement) { elements.set(this.id, replacement); }
  }

  class FakeWorker extends EventTarget {
    static instances = [];

    constructor() {
      super();
      this.terminated = false;
      FakeWorker.instances.push(this);
    }

    postMessage(message) { this.lastMessage = message; }
    terminate() { this.terminated = true; }
    crash() {
      const event = new Event("error", { cancelable: true });
      Object.defineProperty(event, "message", { value: "worker script fetch failed" });
      this.dispatchEvent(event);
    }
    ready() {
      this.dispatchEvent(new MessageEvent("message", { data: { type: "ready" } }));
    }
  }

  const shell = new FakeElement("shell");
  const root = new FakeElement("loading-screen");
  const status = new FakeElement("loading-status-text");
  const statusLabel = new FakeElement();
  statusLabel.textContent = "CHARTING THE WORLD";
  const canvas = new FakeCanvas("loading-art");
  root.closest = () => shell;
  status.querySelector = () => statusLabel;
  elements.set(root.id, root);
  elements.set(status.id, status);
  elements.set(canvas.id, canvas);

  Object.assign(globalThis, {
    HTMLElement: FakeElement,
    HTMLCanvasElement: FakeCanvas,
    Worker: FakeWorker,
    ResizeObserver: class { observe() {} disconnect() {} },
    document: {
      documentElement: { lang: "" },
      getElementById: (id) => elements.get(id) || null
    },
    localStorage: { getItem: () => null },
    performance: { now: () => 100 },
    window: {
      innerWidth: 455,
      innerHeight: 256,
      location: { search: "" },
      matchMedia: () => ({ matches: false }),
      visualViewport: null,
      setTimeout,
      clearTimeout
    }
  });

  const loading = startCapsuleLoadingScreen();
  assert.equal(FakeWorker.instances.length, 1);
  FakeWorker.instances[0].crash();
  assert.equal(FakeWorker.instances[0].terminated, true);
  assert.equal(FakeWorker.instances.length, 2);
  assert.notEqual(elements.get("loading-art"), canvas);
  assert.equal(warnings.length, 1);

  FakeWorker.instances[1].ready();
  await loading.ready;
  FakeWorker.instances[1].crash();
  assert.equal(FakeWorker.instances.length, 2);
  assert.equal(FakeWorker.instances[1].terminated, true);
  assert.equal(warnings.length, 2);
  loading.fail(new Error("test cleanup"));
});

function captureGlobals(names) {
  return new Map(names.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
}

function restoreGlobals(originals) {
  for (const [name, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete globalThis[name];
  }
}
