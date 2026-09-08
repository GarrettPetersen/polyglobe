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

test("storage pays for itself with infrequent deliveries, without a production bonus under monthly deliveries", () => {
  const regular = shipyardUpgradeBalance("storage", { restockEveryMonths: 1 });
  assert.ok(regular.meanAdditionalDividends < regular.price, "storage alone is not a production bonus");
  const interruption = shipyardUpgradeBalance("storage", { restockEveryMonths: 6 });
  assert.ok(interruption.meanAdditionalDividends > interruption.price * 2, JSON.stringify(interruption));
});


test("every storage level and production upgrade has a practical average payback", () => {
  for (let storageLevel = 0; storageLevel < 5; storageLevel++) {
    const result = shipyardUpgradeBalance("storage", { years: 3, storageLevel });
    assert.ok(result.meanAdditionalDividends >= result.price, JSON.stringify(result));
  }
  for (const [upgradeId, years] of [["shipwright", 3], ["supply-ship", 2]]) {
    const result = shipyardUpgradeBalance(upgradeId, { years });
    assert.ok(result.meanAdditionalDividends >= result.price, JSON.stringify(result));
  }
});
