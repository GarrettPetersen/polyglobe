import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readLocalSave } from "../../src/localSave.js";

export async function exercisePlayerShipyardSaveRoundTrips(page, serializedFixture, browserErrors) {
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
  process.stdout.write("  Player shipyard books survive market recovery and compact reload.\n");
}
