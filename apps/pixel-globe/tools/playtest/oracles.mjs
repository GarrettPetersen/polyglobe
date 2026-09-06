import assert from "node:assert/strict";

/** Check observable accounting independently of the transition implementation. */
export function assertTradeConservation(before, after, result) {
  for (const [field, direction] of [["marketPurchase", 1], ["marketSale", -1]]) {
    const trade = result[field];
    if (!trade) continue;
    assert.ok(Number.isFinite(trade.price) && trade.price >= 0, "Trade price must be finite and nonnegative");
    assert.ok(Number.isSafeInteger(trade.quantity) && trade.quantity > 0, "Trade quantity must be positive");
    assert.equal(after.doubloons, before.doubloons - direction * trade.price, "Trade money was not conserved");
    assert.equal(after.cargo[trade.good.id] ?? 0,
      (before.cargo[trade.good.id] ?? 0) + direction * trade.quantity, "Trade cargo was not conserved");
    const otherGoods = new Set([...Object.keys(before.cargo), ...Object.keys(after.cargo)]);
    otherGoods.delete(trade.good.id);
    for (const id of otherGoods) assert.equal(after.cargo[id] ?? 0, before.cargo[id] ?? 0,
      `Trade changed unrelated cargo: ${id}`);
  }
}
