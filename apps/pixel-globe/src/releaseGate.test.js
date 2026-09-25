import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const makefile = readFileSync(new URL("../../../Makefile", import.meta.url), "utf8");

test("Steam and itch release runs the production browser gate before any upload", () => {
  const start = makefile.indexOf("pixel-globe-release:");
  const end = makefile.indexOf("\npixel-globe-capture:");
  assert.ok(start >= 0 && end > start, "Missing pixel-globe-release target");
  const release = makefile.slice(start, end);
  const nodeTests = release.indexOf("npm --prefix $(PIXEL_GLOBE_DIR) test");
  const browserGate = release.indexOf("run test:reachability:fast");
  const steamPackage = release.indexOf("steam:package");
  const butler = release.indexOf("$(PIXEL_GLOBE_BUTLER) push");
  const steamUpload = release.indexOf("steam:upload");
  assert.ok(nodeTests > 0, "Release must keep the node test suite");
  assert.ok(browserGate > nodeTests, "The browser gate must follow the node suite");
  assert.ok(browserGate < steamPackage, "The browser gate must fail before packaging");
  assert.ok(browserGate < butler, "The browser gate must fail before the itch upload");
  assert.ok(browserGate < steamUpload, "The browser gate must fail before the Steam upload");
});
