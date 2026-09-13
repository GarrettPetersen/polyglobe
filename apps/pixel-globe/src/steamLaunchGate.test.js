import assert from "node:assert/strict";
import test from "node:test";
import { steamLaunchChecks, runSteamLaunchGate } from "../tools/steam-launch-gate.mjs";

const options = { appRoot: "/game", edition: "all", platform: "all", hostPlatform: "darwin",
  settings: { editions: {
    full: { appId: 4516500, productName: "Marque & Reprisal" },
    demo: { appId: 5029880, productName: "Marque & Reprisal Demo" }
  } } };

test("Mac upload gate launches both actual packages and requires packaged mode", () => {
  const checks = steamLaunchChecks(options);
  assert.deepEqual(checks.map(args => args[1]), ["4516500", "4516500", "4516500", "5029880", "5029880", "5029880"]);
  for (const args of checks) {
    assert.match(args[2], /darwin-universal\/.*\.app\/Contents\/MacOS\//);
    assert.equal(args[3], "--require-packaged");
  }
  assert.equal(steamLaunchChecks({ ...options, edition: "demo" }).length, 3);
  assert.deepEqual(steamLaunchChecks({ ...options, platform: "linux", hostPlatform: "linux" }), []);
  assert.throws(() => steamLaunchChecks({ ...options, hostPlatform: "linux" }), /macOS/);
  assert.throws(() => steamLaunchChecks({ ...options, platform: "unknown" }), /Invalid Steam platform/);
  assert.throws(() => steamLaunchChecks({ ...options, edition: "unknown" }), /Invalid Steam edition/);
});

test("failed or interrupted package launches block upload without continuing", () => {
  const checks = steamLaunchChecks(options);
  for (const result of [{ status: 1 }, { status: null }, { error: new Error("launch failed") }]) {
    let calls = 0;
    assert.throws(() => runSteamLaunchGate(checks, () => { calls++; return result; }));
    assert.equal(calls, 1);
  }
  let calls = 0;
  runSteamLaunchGate(checks, () => { calls++; return { status: 0 }; });
  assert.equal(calls, 6);
});

test("an intermittent failure blocks upload even after earlier successful launches", () => {
  let calls = 0;
  assert.throws(() => runSteamLaunchGate(steamLaunchChecks(options), () => {
    calls++;
    return { status: calls === 2 ? 1 : 0 };
  }), /upload blocked/);
  assert.equal(calls, 2);
});
