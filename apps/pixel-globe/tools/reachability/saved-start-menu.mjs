import ts from "typescript";
import assert from "node:assert/strict";

// Instrument the built module while retaining production startup and handlers.
// The duel fixture accelerates only victory; navigation and restoration are real.
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
});
window.exerciseCityDuelReturn = async () => {
  const call = chart.cityCalls.find(entry => entry.character);
  if (!call) throw new Error("Duel return fixture requires a nearby port");
  openPortDialogue(call);
  if (!portCityView) throw new Error("Duel return fixture did not enter the city");
  await synchronizePortCityScene();
  openOptionsMenu();
  if (!returnToStartMenuFromOptions()) throw new Error("Could not save voyage before duel");
  await waitForSaveRestoreSmokePersistence();
  const saved = structuredClone(localSaveResult.save.payload);
  const serialized = gameStorage.getItem(LOCAL_SAVE_STORAGE_KEY);
  openLakeBattleMode();
  lakeBattleMode.enemyIndex = LAKE_BATTLE_ENEMY_SLUGS.findIndex(lakeBattleCombatantIsCity);
  await beginLakeBattle();
  lakeBattleMode.battle.enemy.hitPoints = 0;
  lakeBattleMode.battle.outcome = "victory";
  await beginLakeBattlePortAssault(() => .37);
  if (!lakeBattleMode.portAssault) throw new Error("Duel fixture failed to start its city assault");
  closeLakeBattleModeToStartMenu();
  if (gameStorage.getItem(LOCAL_SAVE_STORAGE_KEY) !== serialized) throw new Error("Duel overwrote voyage save");
  await continueSavedVoyage();
  return { started: hasStartedVoyage, menu: Boolean(startMenu), city: portCityView,
    transition: portCityTransition, dialogue: dialogueState, duel: lakeBattleMode,
    seed: gameState.voyageSeed, savedSeed: saved.gameState.voyageSeed,
    shipType: ship.typeSlug, savedShipType: saved.playerShip.typeSlug,
    position: ship.position, savedPosition: saved.playerShip.position };
};` });
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
    const resumed = await page.evaluate(() => window.exerciseCityDuelReturn());
    assert.ok(resumed.started && !resumed.menu);
    for (const key of ["city", "transition", "dialogue", "duel"]) assert.equal(resumed[key], null, key);
    assert.equal(resumed.seed, resumed.savedSeed);
    assert.equal(resumed.shipType, resumed.savedShipType);
    for (let index = 0; index < 3; index++) {
      assert.ok(Math.abs(resumed.position[index] - resumed.savedPosition[index] / Math.hypot(...resumed.savedPosition)) < 1e-8);
    }
    assert.deepEqual(errors, []);
    console.log("Voyage → options → city duel → Continue restores the voyage without the duel scene or save contamination.");
    console.log("Disposable save: New Game cancellation preserved Continue; confirmation and reload created a new voyage without reusing the old one.");
  } finally {
    await page.close();
  }
}
