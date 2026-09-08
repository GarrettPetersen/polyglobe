import assert from "node:assert/strict";
import test from "node:test";
import { shipyardUpgradeBalance } from "../tools/shipyard-upgrade-balance.mjs";

test("upgrade prices are repaid by incremental earnings in paired five-year scenarios", () => {
  for (const upgradeId of ["storage", "shipwright", "supply-ship"]) {
    const result = shipyardUpgradeBalance(upgradeId);
    assert.ok(result.meanAdditionalDividends >= result.price * 2, JSON.stringify(result));
    if (upgradeId !== "storage") assert.ok(result.minAdditionalDividends >= result.price, JSON.stringify(result));
  }
});
