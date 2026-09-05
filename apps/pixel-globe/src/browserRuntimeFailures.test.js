import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { monitorBrowserFailures } from "../tools/reachability/browser-failures.mjs";

test("browser audit fails on caught-and-logged errors as well as uncaught failures", () => {
  const page = new EventEmitter();
  const failures = monitorBrowserFailures(page);
  page.emit("console", { type: () => "error", text: () => "Failed to purchase ship",
    location: () => ({ url: "https://game.test/main.js", lineNumber: 42 }) });
  page.emit("pageerror", new Error("Invalid NPC presentation"));
  page.emit("crash");
  assert.equal(failures.length, 3);
  assert.match(failures[0], /Failed to purchase ship/);
  assert.match(failures[1], /Invalid NPC presentation/);
  assert.match(failures[2], /page crashed/);
});

test("normal browser diagnostics do not become gameplay failures", () => {
  const page = new EventEmitter();
  const failures = monitorBrowserFailures(page);
  for (const type of ["log", "info", "warning"]) {
    page.emit("console", { type: () => type, text: () => "diagnostic" });
  }
  assert.deepEqual(failures, []);
});
