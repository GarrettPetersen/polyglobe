import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readLocalSave } from "../../src/localSave.js";

export async function exercisePlayerShipyardSaveRoundTrips(page, serializedFixture, browserErrors) {
  const screenshotDirectory = mkdtempSync(join(tmpdir(), "shipyard-ui-"));
  process.stdout.write(`  Shipyard UI evidence: ${screenshotDirectory}\n`);
  const save = JSON.parse(serializedFixture);
  const books = JSON.parse(readFileSync(new URL("../../src/test-fixtures/shipyards/v10.json", import.meta.url), "utf8"));
  // Adapt only identity to the current catalog; preserve the frozen account history.
  books.version = 11;
  books.lastMinute = save.payload.worldClock.currentMinute;
  books.yards[0].portId = "lisbon|portugal";
  if (books.yards[0].listing) books.yards[0].listing.portId = "lisbon|portugal";
  save.payload.gameState.memory.shipyardInvestment = {
    version: 3, project: null, backedPortCityIds: ["lisbon|portugal"], lastCompletedMinute: 123
  };
  // First exercise an older save whose books still live inside a broken market
  // snapshot, then the compact form that deliberately omits the market cache.
  save.payload.economy = { version: 2, lastMinute: books.lastMinute,
    ports: [{ id: "missing-test-market" }], shipyards: books };
  delete save.payload.playerShipyards;
  for (const phase of ["market recovery", "compact reload"]) {
    const errorStart = browserErrors.length;
    const restored = await page.evaluate((serialized) =>
      window.__PIXEL_GLOBE_SAVE_RESTORE_SMOKE__.restoreSerialized(serialized), JSON.stringify(save));
    const expectedRecoveryErrors = browserErrors.slice(errorStart);
    assert.equal(expectedRecoveryErrors.length, phase === "market recovery" ? 1 : 0, phase);
    if (phase === "market recovery") {
      assert.match(expectedRecoveryErrors[0], /^console.error: \[pixel-globe\] world economy snapshot was incompatible; regenerated current state Error: Saved economy port is missing: missing-test-market/);
      // Consume only the exact diagnostic deliberately caused by this fixture.
      browserErrors.splice(errorStart, 1);
    }
    const persisted = readLocalSave({ storage: { getItem: () => restored.serialized } });
    assert.equal(persisted.status, "ready");
    const actual = persisted.save.payload.playerShipyards;
    assert.equal(actual.yards.length, 1, phase);
    assert.deepEqual(actual.yards[0].playerBacking, books.yards[0].playerBacking, phase);
    assert.deepEqual(actual.yards[0].playerAccounts, books.yards[0].playerAccounts, phase);
    save.payload = persisted.save.payload;
    delete save.payload.economy;
  }
  save.payload.gameState.doubloons = 200000;
  for (const id of ["storage", "shipwright"]) {
    save.payload.playerShipyards.yards[0].upgrades.opportunities[id].availableMinute = save.payload.worldClock.currentMinute;
  }
  await page.evaluate((serialized) => window.__PIXEL_GLOBE_SAVE_RESTORE_SMOKE__.restoreSerialized(serialized), JSON.stringify(save));
  const arrival = await page.evaluate(() => window.__PIXEL_GLOBE_SAVE_RESTORE_SMOKE__.inspectShipyardArrival());
  assert.match(arrival.text, /warehouse beside the yard is for sale/);
  await page.screenshot({ path: join(screenshotDirectory, "arrival.png") });
  for (const upgradeId of ["storage", "shipwright"]) {
    const inspection = await page.evaluate((id) => window.__PIXEL_GLOBE_SAVE_RESTORE_SMOKE__.inspectShipyardUpgrade(id), upgradeId);
    assert.equal(inspection.tab, "upgrades");
    assert.equal(inspection.upgrade.id, upgradeId);
    assert.deepEqual(inspection.cardIds, ["storage", "shipwright"], "unavailable supply commission is hidden");
    await page.screenshot({ path: join(screenshotDirectory, `${upgradeId}.png`) });
  }
  const purchased = await page.evaluate(() => window.__PIXEL_GLOBE_SAVE_RESTORE_SMOKE__.inspectShipyardUpgrade("storage", { purchase: true }));
  assert.equal(purchased.upgrade.disabled, true, "another expansion requires a new opportunity");
  for (const tab of ["yard", "materials", "books", "upgrades"]) {
    await page.evaluate((tab) => window.__PIXEL_GLOBE_SAVE_RESTORE_SMOKE__.inspectShipyardUpgrade("storage", { tab }), tab);
    // A custom renderer can succeed while generic navigation rejects its rows.
    // Exercise the same wheel/key path that crashed for the playtester on every tab.
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowUp");
    await page.mouse.wheel(0, 100);
    await page.waitForTimeout(100);
    assert.deepEqual(browserErrors, [], `shipyard ${tab} navigation`);
    await page.screenshot({ path: join(screenshotDirectory, `${tab}.png`) });
  }
  const reserved = await page.evaluate(() => window.__PIXEL_GLOBE_SAVE_RESTORE_SMOKE__.inspectShipyardUpgrade("supply-ship", { supplyState: "reserve" }));
  assert.equal(reserved.upgrade.disabled, false);
  assert.deepEqual(reserved.cardIds, ["storage", "shipwright", "supply-ship"]);
  assert.ok(reserved.maxScrollPx > 0, "cards scroll rather than shrink to fit");
  assert.match(reserved.upgrade.status, /reserved for us/);
  await page.screenshot({ path: join(screenshotDirectory, "supply-reserved.png") });
  for (let step = 0; step < 20; step++) await page.keyboard.press("PageUp");
  assert.equal((await page.evaluate(() => window.__PIXEL_GLOBE_SAVE_RESTORE_SMOKE__.shipyardCardViewport())).scrollOffsetPx, 0);
  await page.screenshot({ path: join(screenshotDirectory, "cards-top.png") });
  await page.mouse.wheel(0, 100);
  await page.waitForFunction(() => window.__PIXEL_GLOBE_SAVE_RESTORE_SMOKE__.shipyardCardViewport().scrollOffsetPx > 0);
  for (let step = 0; step < 20; step++) await page.keyboard.press("PageDown");
  const bottom = await page.evaluate(() => window.__PIXEL_GLOBE_SAVE_RESTORE_SMOKE__.shipyardCardViewport());
  assert.equal(bottom.scrollOffsetPx, bottom.maxScrollOffsetPx);
  await page.screenshot({ path: join(screenshotDirectory, "cards-bottom.png") });
  const hired = await page.evaluate(() => window.__PIXEL_GLOBE_SAVE_RESTORE_SMOKE__.inspectShipyardUpgrade("supply-ship", { purchase: true }));
  assert.equal(hired.upgrade.owned, true);
  writeFileSync(join(screenshotDirectory, "hired-save.json"), hired.serialized);
  await page.screenshot({ path: join(screenshotDirectory, "supply-hired.png") });
  await page.evaluate((serialized) => window.__PIXEL_GLOBE_SAVE_RESTORE_SMOKE__.restoreSerialized(serialized), hired.serialized);
  const reloaded = await page.evaluate(() => window.__PIXEL_GLOBE_SAVE_RESTORE_SMOKE__.inspectShipyardUpgrade("supply-ship"));
  assert.equal(reloaded.upgrade.status, hired.upgrade.status, "reload preserves the captain and commission task");
  const lost = await page.evaluate(() => window.__PIXEL_GLOBE_SAVE_RESTORE_SMOKE__.inspectShipyardUpgrade("supply-ship", { supplyState: "lost" }));
  assert.match(lost.upgrade.status, /Supply ship lost/);
  assert.equal(lost.upgrade.disabled, true);
  await page.screenshot({ path: join(screenshotDirectory, "supply-lost.png") });
  assert.deepEqual(browserErrors, []);
  process.stdout.write(`  Shipyard UI screenshots: ${screenshotDirectory}\n`);
  process.stdout.write("  Player shipyard books, upgrade screens and purchases survive market recovery and compact reload.\n");
}
