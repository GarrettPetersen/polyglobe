import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadPlaywright, browserExecutablePath, startStaticServer } from "../reachability/browser-runtime.mjs";
import { monitorBrowserFailures } from "../reachability/browser-failures.mjs";
import { nextSeededRandom } from "../../src/seededRandom.js";
import { assertBrowserJourneyTransition } from "./browser-oracles.mjs";
import { randomForSeed } from "./journey.mjs";

for (const argument of process.argv.slice(2)) {
  if (!/^--(?:seed|output|replay)=.+/.test(argument)) throw new Error(`Unknown browser journey option: ${argument}`);
}
const root = fileURLToPath(new URL("../../", import.meta.url));
const revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const dirty = execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }).trim() !== "";
const replayPath = process.argv.find((value) => value.startsWith("--replay="))?.slice(9);
const replay = replayPath ? JSON.parse(readFileSync(replayPath, "utf8")) : null;
const seed = replay?.seed ?? Number(process.argv.find((value) => value.startsWith("--seed="))?.slice(7) ?? 1);
const output = resolve(process.argv.find((value) => value.startsWith("--output="))?.slice(9) ?? resolve(root, ".playtest/browser"));
if (!Number.isSafeInteger(seed) || seed < 1) throw new Error("Invalid browser journey seed");
if (replay && replay.version !== 1) throw new Error("Unsupported browser journey replay");
const random = randomForSeed(seed);
mkdirSync(output, { recursive: true });
const playwright = loadPlaywright();
const server = await startStaticServer();
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const browser = await playwright.chromium.launch({ headless: true, executablePath: browserExecutablePath(playwright),
  args: ["--mute-audio", "--disable-background-timer-throttling"] });
const trace = [];
let initial;
let lastState;
const report = { version: 1, revision, dirty, seed, actions: 0, phases: [] };
try {
  const context = await browser.newContext({ viewport: { width: 455, height: 256 } });
  await context.addInitScript({ content: `(() => {
    localStorage.setItem("marque-and-reprisal.telemetry-consent", "denied");
    const stream = { value: ${seed >>> 0} };
    const next = ${nextSeededRandom.toString()};
    Math.random = () => next(stream);
  })();` });
  const page = await context.newPage();
  const failures = monitorBrowserFailures(page);
  if (!replay) {
    await page.goto(`${baseUrl}/?capture=reachability-fight-lisbon-journey&captureFormat=steam&autocapture=frames&browserJourney=1`);
    await page.waitForFunction(() => window.__PIXEL_GLOBE_CAPTURE_READY__ || window.__PIXEL_GLOBE_CAPTURE_ERROR__, null, { timeout: 600_000 });
    assert.equal(await page.evaluate(() => window.__PIXEL_GLOBE_CAPTURE_ERROR__), undefined);
    const beforeCombat = JSON.parse(await page.evaluate(() => window.__PIXEL_GLOBE_CAPTURE_VOYAGE__())).payload;
    const frames = await page.evaluate(() => window.__PIXEL_GLOBE_CAPTURE_TOTAL_FRAMES__);
    for (let i = 0; i < frames; i++) await page.evaluate((frame) => window.__PIXEL_GLOBE_CAPTURE_STEP__(frame), i);
    initial = await page.evaluate(() => window.__PIXEL_GLOBE_CAPTURE_VOYAGE__());
    const afterCombat = JSON.parse(initial).payload;
    assert.ok(afterCombat.playerShip.cannonSequence > beforeCombat.playerShip.cannonSequence, "Combat never fired cannons");
    assert.ok(afterCombat.playerShip.hitPoints < beforeCombat.playerShip.hitPoints, "Combat never damaged the player hull");
    report.phases.push("naval-combat");
    writeFileSync(resolve(output, "post-combat.json"), initial);
  } else initial = replay.initial;
  const afterCombat = JSON.parse(initial).payload;
  await page.goto(`${baseUrl}/?saveRestoreSmoke=1&browserJourney=1`);
  await page.waitForFunction(() => window.__PIXEL_GLOBE_SAVE_RESTORE_SMOKE__, null, { timeout: 600_000 });
  await page.evaluate((serialized) => window.__PIXEL_GLOBE_SAVE_RESTORE_SMOKE__.restoreSerialized(serialized), initial);
  async function command(value) {
    trace.push(value);
    const recordedCommand = value;
    const before = lastState;
    if (value.type === "reload") {
      assert.ok(lastState?.serialized, "Reload must follow a save");
      const serialized = lastState.serialized;
      await page.reload();
      await page.waitForFunction(() => window.__PIXEL_GLOBE_SAVE_RESTORE_SMOKE__, null, { timeout: 600_000 });
      await page.evaluate((saved) => window.__PIXEL_GLOBE_SAVE_RESTORE_SMOKE__.restoreSerialized(saved), serialized);
      value = { type: "observe" };
    }
    let result;
    if (value.type === "sail") {
      // Replay the player's destination intent, not worker-timing-dependent
      // frame counts. Interruptions still require their recorded real choices.
      for (let batch = 0; batch < 400; batch++) {
        result = await page.evaluate((cityId) => window.__PIXEL_GLOBE_SAVE_RESTORE_SMOKE__.journey({
          type: "step", frames: 120, cityId
        }), value.cityId);
        lastState = result;
        assert.deepEqual(failures, [], "Browser emitted a runtime error while sailing");
        if (result.modal || result.menu || result.nodeId || result.options.length ||
            result.ports.some((port) => port.cityId === value.cityId && port.inRange)) break;
        if (batch % 16 === 0) console.log(`Sailing toward ${value.cityId}: ${batch + 1} frame batches`);
      }
      assert.ok(result.modal || result.menu || result.nodeId || result.options.length ||
        result.ports.some((port) => port.cityId === value.cityId && port.inRange),
        `Pilot did not reach ${value.cityId} within 48000 frames`);
    } else {
      result = await page.evaluate((input) => window.__PIXEL_GLOBE_SAVE_RESTORE_SMOKE__.journey(input), value);
    }
    assert.deepEqual(failures, [], "Browser emitted a runtime error");
    assertBrowserJourneyTransition(before, result, recordedCommand);
    lastState = result;
    report.actions++;
    return result;
  }
  if (replay) {
    for (const value of replay.trace) await command(value);
    console.log("Browser replay completed without the recorded failure.");
  } else {
    let state = await command({ type: "observe" });
    assert.deepEqual(state.gameState.cargo, afterCombat.gameState.cargo, "Combat cargo lost at restore");
    assert.deepEqual(state.gameState.crewRoster, afterCombat.gameState.crewRoster, "Combat crew lost at restore");
    assert.equal(state.gameState.doubloons, afterCombat.gameState.doubloons);
    assert.equal(state.playerShip.hitPoints, afterCombat.playerShip.hitPoints, "Combat hull damage lost at restore");
    report.phases.push("combat-save-restored");
    const coverage = new Map();
    for (let step = 0; step < 400; step++) {
      console.log(`Browser journey ${step}: ${state.nodeId ?? "sailing"} ${state.cityId ?? ""} port=${state.ports.find(p=>p.cityId==="lisbon|portugal")?.distancePx.toFixed(1)} minute=${state.minute.toFixed(1)}`);
      if (state.menu) { state = await command({ type: "close-menu" }); continue; }
      if (state.modal) { state = await command({ type: "continue" }); continue; }
      if (!state.nodeId && state.options.length === 0) {
        const destinationId = state.gameState.memory.quests.active?.destinationCityId ?? "lisbon|portugal";
        const port = state.ports.find((entry) => entry.cityId === destinationId);
        if (port?.inRange) state = await command({ type: "dock", cityId: port.cityId });
        else state = await command({ type: "sail", cityId: destinationId });
        continue;
      }
      const enabled = state.options.filter((option) => !option.disabled);
      let choice;
      if (!report.phases.includes("trade")) {
        choice = enabled.find(({ action }) => ["buy", "sell"].includes(action.type));
        if (!choice && state.locations.includes("market")) {
          state = await command({ type: "location", id: "market" }); continue;
        }
        choice ??= enabled.find(({ action }) => action.nodeId === "market");
      }
      if (report.phases.includes("trade") && !report.phases.includes("mission-completed")) {
        const quest = state.gameState.memory.quests.active;
        choice = enabled.find(({ action }) => action.type === "complete-quest" || action.type === "accept-quest");
        if (!choice && quest && quest.destinationCityId !== state.cityId) {
          if (state.locations.includes("set-sail")) { state = await command({ type: "location", id: "set-sail" }); continue; }
          choice = enabled.find(({ action }) => action.type === "close" || action.nodeId === "root" || action.type === "leave-market");
        }
        if (!choice) choice = enabled.find(({ action }) => action.nodeId === "quest");
        if (!choice && state.locations.includes("inn")) { state = await command({ type: "location", id: "inn" }); continue; }
        if (!choice) choice = enabled.find(({ action }) => action.nodeId === "root" || action.type === "leave-market");
      }
      if (!choice) {
        const scores = enabled.map((entry) => 1 / (1 + (coverage.get(entry.action.type) ?? 0)));
        let draw = random() * scores.reduce((a, b) => a + b, 0);
        choice = enabled.find((entry, index) => (draw -= scores[index]) <= 0);
      }
      assert.ok(choice, "Browser journey has no enabled choice");
      coverage.set(choice.action.type, (coverage.get(choice.action.type) ?? 0) + 1);
      state = await command({ type: "choose", id: choice.id });
      if (["buy", "sell"].includes(choice.action.type)) {
        report.phases.push("trade");
      }
      if (choice.action.type === "accept-quest") report.phases.push("mission-accepted");
      if (choice.action.type === "complete-quest") {
          report.phases.push("mission-completed");
      }
      if (report.phases.includes("mission-completed") && report.phases.includes("interrupted-and-restored")) break;
      if (step % 12 === 0) {
        await command({ type: "save" });
        state = await command({ type: "reload" });
        report.phases.push("interrupted-and-restored");
      }
    }
    assert.ok(report.phases.includes("trade"), "Post-combat voyage never reached a real trade");
    assert.ok(report.phases.includes("mission-completed"), "Post-combat voyage never completed its mission");
    await command({ type: "inspect-crew" });
    await command({ type: "politics" });
    await command({ type: "close-menu" });
    await command({ type: "save" });
    state = await command({ type: "reload" });
    report.phases.push("crew-details", "politics", "completed-mission-restored");
    report.coverage = Object.fromEntries(coverage);
    writeFileSync(resolve(output, "replay.json"), JSON.stringify({ version: 1, revision, dirty, seed, initial, trace }));
  }
  writeFileSync(resolve(output, "report.json"), JSON.stringify(report, null, 2));
} catch (error) {
  writeFileSync(resolve(output, "failure.json"), JSON.stringify({ version: 1, revision, dirty, seed, initial, trace, lastState, failure: error.stack }, null, 2));
  throw error;
} finally {
  await browser.close();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
