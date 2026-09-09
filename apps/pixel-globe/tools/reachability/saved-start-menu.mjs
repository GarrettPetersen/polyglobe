import ts from "typescript";
import assert from "node:assert/strict";

// Read-only observation is injected into the built module, leaving normal
// startup and keyboard handling intact instead of using the restore harness.
export async function exerciseSavedStartMenu(context, baseUrl) {
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  let restoreCalls = 0;
  await page.exposeFunction("recordStartupRestore", () => { restoreCalls++; });
  await page.route("**/src/bootstrap.js*", async route => {
    const response = await route.fetch();
    const source = await response.text();
    const parsed = ts.createSourceFile("bootstrap.js", source, ts.ScriptTarget.Latest, true);
    const entries = parsed.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === "restoreSavedVoyage");
    assert.equal(entries.length, 1, "instrument the actual restore entry point exactly once");
    const offset = entries[0].body.getStart(parsed) + 1;
    const instrumented = source.slice(0, offset) + "\n await window.recordStartupRestore();" + source.slice(offset);
    await route.fulfill({ response, body: instrumented + `
window.inspectSavedStartup = () => !regularGameLoopStarted ? { ready: false } : ({
  ready: regularGameLoopStarted && worldFramePresented,
  menu: Boolean(startMenu), started: hasStartedVoyage,
  prepared: Boolean(startMenu?.preparedVoyage),
  confirmation: startMenu?.newGameConfirmation?.selectedIndex ?? null,
  voyageSeed: gameState.voyageSeed,
  position: ship.position, shipType: ship.typeSlug, minute: weatherClockMinutes,
  saved: readLocalSave().save?.payload,
  serialized: gameStorage.getItem(LOCAL_SAVE_STORAGE_KEY)
});` });
  });
  try {
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.inspectSavedStartup?.().ready ||
      document.querySelector("#loading-screen")?.dataset.state === "failed", null, { timeout: 180000 });
    assert.deepEqual(errors, []);
    const before = await page.evaluate(() => window.inspectSavedStartup());
    assert.ok(before.ready && before.menu && before.prepared);
    assert.equal(before.started, false);
    assert.equal(restoreCalls, 1);
    assert.equal(before.shipType, before.saved.playerShip.typeSlug);
    for (let index = 0; index < 3; index++) {
      assert.ok(Math.abs(before.position[index] - before.saved.playerShip.position[index] / Math.hypot(...before.saved.playerShip.position)) < 1e-8, JSON.stringify({ actual: before.position, saved: before.saved.playerShip.position }));
    }
    await page.waitForTimeout(500);
    const waiting = await page.evaluate(() => window.inspectSavedStartup());
    assert.equal(waiting.minute, before.minute, "menu must keep the saved world paused");
    assert.equal(waiting.serialized, before.serialized, "preview must not overwrite the save");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => window.inspectSavedStartup().confirmation !== null);
    await page.keyboard.press("Escape");
    const cancelled = await page.evaluate(() => window.inspectSavedStartup());
    assert.equal(cancelled.confirmation, null);
    assert.equal(cancelled.serialized, before.serialized);
    assert.ok(cancelled.prepared);
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => window.inspectSavedStartup().started && !window.inspectSavedStartup().menu);
    assert.equal(restoreCalls, 1, "Continue must reuse the prepared world");
    assert.deepEqual(errors, []);
    console.log("Saved startup displayed the saved ship and location, stayed paused, and continued without restoring twice.");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.inspectSavedStartup?.().ready, null, { timeout: 180000 });
    assert.equal(restoreCalls, 2);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => window.inspectSavedStartup().confirmation !== null);
    if ((await page.evaluate(() => window.inspectSavedStartup().confirmation)) !== 0) {
      await page.keyboard.press("ArrowLeft");
    }
    await Promise.all([page.waitForEvent("load"), page.keyboard.press("Enter")]);
    await page.waitForFunction(() => window.inspectSavedStartup?.().ready, null, { timeout: 180000 });
    const fresh = await page.evaluate(() => window.inspectSavedStartup());
    assert.ok(fresh.menu && !fresh.prepared && !fresh.started);
    assert.equal(fresh.saved, undefined);
    assert.equal(restoreCalls, 2, "new-game reload must not restore the discarded voyage");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => window.inspectSavedStartup().started && Boolean(window.inspectSavedStartup().saved));
    const replacement = await page.evaluate(() => window.inspectSavedStartup());
    assert.notEqual(replacement.voyageSeed, before.voyageSeed);
    assert.equal(replacement.saved.gameState.voyageSeed, replacement.voyageSeed);
    assert.deepEqual(errors, []);
    console.log("Disposable save: New Game cancellation preserved Continue; confirmation and reload created a new voyage without reusing the old one.");
  } finally {
    await page.close();
  }
}
