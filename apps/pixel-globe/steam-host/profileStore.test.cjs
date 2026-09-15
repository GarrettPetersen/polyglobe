const assert = require("node:assert/strict");
const test = require("node:test");
const { mkdtempSync, rmSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");
const { createProfileStore } = require("./profileStore.cjs");
const file = "marque-profile-v1.json";
const profile = (savedAt, save) => JSON.stringify({ version: 3, savedAt, values: { "marque-and-reprisal.save": save } });
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "marque-profile-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}
test("desktop saves survive process relaunch with Cloud disabled and remain account scoped", t => {
  const root = fixture(t);
  const options = { root, steamId: 123n, cloudEnabled: false };
  const store = createProfileStore(options);
  assert.equal(store.read(file), null);
  store.write(file, profile(100, "Istanbul"));
  assert.equal(createProfileStore(options).read(file), profile(100, "Istanbul"));
  assert.equal(createProfileStore({ ...options, steamId: 456n }).read(file), null);
  assert.throws(() => store.write("../escape", profile(100, "bad")), /filename/);
});
test("failed cloud uploads preserve the local voyage; loading chooses the newest profile", t => {
  const root = fixture(t);
  let remote = profile(100, "Istanbul");
  const cloud = { fileExists: () => true, readFile: () => remote, writeFile: () => false };
  const options = { root, steamId: 123n, cloudEnabled: true, cloud };
  const store = createProfileStore(options);
  assert.equal(store.read(file), remote);
  assert.throws(() => store.write(file, profile(200, "Japan")), /local profile preserved/);
  assert.equal(createProfileStore(options).read(file), profile(200, "Japan"));
  remote = profile(300, "London");
  assert.equal(store.read(file), remote);
});
test("invalid Cloud JSON cannot block a valid local profile", t => {
  const root = fixture(t);
  const local = profile(200, "Istanbul");
  const cloud = { fileExists: () => true, readFile: () => "truncated", writeFile: () => true };
  const options = { root, steamId: 123n, cloudEnabled: true, cloud };
  createProfileStore({ ...options, cloudEnabled: false }).write(file, local);
  assert.equal(createProfileStore(options).read(file), local);
});
test("invalid Cloud JSON with no valid local profile initializes fresh", t => {
  const root = fixture(t);
  const cloud = { fileExists: () => true, readFile: () => "truncated", writeFile: () => true };
  const store = createProfileStore({ root, steamId: 123n, cloudEnabled: true, cloud });
  assert.equal(store.read(file), null);
});
