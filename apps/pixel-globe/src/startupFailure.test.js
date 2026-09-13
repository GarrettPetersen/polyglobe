import assert from "node:assert/strict";
import test from "node:test";
import { reportStartupFailure, startupDiagnostic, STARTUP_DIAGNOSTIC_KEY } from "./startupFailure.js";
import { PLATFORM_CLOUD_STORAGE_KEYS } from "./platformServices.js";
import { SUPPORTED_LANGUAGES, translate } from "./localization.js";

function fixture({ storageFails = false } = {}) {
  const nodes = Object.fromEntries(["loading-screen", "loading-status-text", "crash-copy-button", ".shell"].map(id => [id, {
    hidden: true, dataset: {}, attributes: {},
    setAttribute(key, value) { this.attributes[key] = value; },
    focus() { this.focused = true; }
  }]));
  const values = new Map([["marque-and-reprisal.save", "preserved"]]);
  const root = {
    document: { title: "Marque & Reprisal", location: { pathname: "/" },
      getElementById: id => nodes[id], querySelector: selector => nodes[selector] },
    localStorage: {
      getItem: key => { if (storageFails) throw new Error("storage denied"); return values.get(key); },
      setItem: (key, value) => values.set(key, value)
    },
    console: { error() {}, warn() {} }
  };
  return { root, nodes, values };
}

test("early failures show an accessible localized screen and copyable local diagnostic", async () => {
  const { root, nodes, values } = fixture();
  values.set("pixel_globe_language", "fr");
  let copied;
  const report = reportStartupFailure(new Error("Cloud migration failed"), {
    root, copy: async text => { copied = text; }, now: () => "2026-09-13T00:00:00Z"
  });
  assert.equal(nodes["loading-screen"].dataset.state, "failed");
  assert.equal(nodes["loading-screen"].attributes.role, "alert");
  assert.equal(nodes[".shell"].attributes["aria-busy"], "false");
  assert.equal(nodes["loading-status-text"].textContent, translate("fr", "crash.startupFailed"));
  assert.equal(nodes["crash-copy-button"].hidden, false);
  await nodes["crash-copy-button"].onclick();
  assert.equal(copied, report);
  assert.equal(values.get(STARTUP_DIAGNOSTIC_KEY), report);
  assert.equal(values.get("marque-and-reprisal.save"), "preserved");
  assert.equal(PLATFORM_CLOUD_STORAGE_KEYS.includes(STARTUP_DIAGNOSTIC_KEY), false);
});

test("storage and clipboard failures do not conceal the original startup failure", async () => {
  const { root, nodes } = fixture({ storageFails: true });
  const report = reportStartupFailure(new Error("original failure"), {
    root, copy: async () => { throw new Error("clipboard denied"); }
  });
  assert.match(report, /original failure/);
  assert.equal(nodes["loading-screen"].hidden, false);
  await nodes["crash-copy-button"].onclick();
  assert.equal(nodes["crash-copy-button"].textContent, translate("en", "crash.copyFailed"));
});

test("startup reports are bounded and every supported language has the failure message", () => {
  assert.equal(startupDiagnostic("x".repeat(20000), {
    occurredAt: "now", edition: "demo", url: "/"
  }).length, 8192);
  for (const language of SUPPORTED_LANGUAGES) {
    assert.notEqual(translate(language.id, "crash.startupFailed"), "crash.startupFailed");
  }
});
