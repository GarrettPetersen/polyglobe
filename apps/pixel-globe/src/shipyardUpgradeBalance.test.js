import assert from "node:assert/strict";
import test from "node:test";
import { shipyardUpgradeBalance } from "../tools/shipyard-upgrade-balance.mjs";

test("upgrade prices are repaid by incremental earnings in paired five-year scenarios", () => {
  for (const upgradeId of ["shipwright", "supply-ship"]) {
    const result = shipyardUpgradeBalance(upgradeId);
    assert.ok(result.meanAdditionalDividends >= result.price * 2, JSON.stringify(result));
    const longerRun = shipyardUpgradeBalance(upgradeId, { years: 6 });
    assert.ok(longerRun.minAdditionalDividends >= longerRun.price, JSON.stringify(longerRun));
  }
});

test("storage buffers long supply interruptions, without promising extra profit under regular deliveries", () => {
  const regular = shipyardUpgradeBalance("storage");
  assert.ok(regular.meanAdditionalDividends < regular.price, "storage alone is not a production bonus");
  const interruption = shipyardUpgradeBalance("storage", { years: 8, restockEveryMonths: 48, initiallyStocked: true });
  assert.ok(interruption.meanAdditionalDividends > interruption.price * 2, JSON.stringify(interruption));
});
