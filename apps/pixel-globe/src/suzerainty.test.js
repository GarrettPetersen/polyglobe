import assert from "node:assert/strict";
import test from "node:test";

import {
  SUZERAINTY_KIND_PERSONAL_UNION,
  SUZERAINTY_KIND_TRIBUTARY,
  createSuzeraintyMemory,
  directSuzeraintyBetween,
  establishSuzerainty,
  foreignPolicyPrincipal,
  releaseFactionSuzerainties,
  releaseFactionPersonalUnions,
  releaseVassal,
  suzerainForFaction,
  suzeraintyTradePrivilege,
  validateSuzeraintyMemory,
  vassalsOf
} from "./suzerainty.js";

test("the 1522 world begins with historically grounded suzerainties", () => {
  const memory = createSuzeraintyMemory(0);
  assert.equal(suzerainForFaction(memory, "hormuz"), "portugal");
  assert.equal(suzerainForFaction(memory, "crimea"), "ottoman");
  assert.equal(suzerainForFaction(memory, "joseon"), "ming");
  assert.equal(suzerainForFaction(memory, "spain"), "habsburg");
  assert.equal(directSuzeraintyBetween(memory, "ming", "joseon").kind, SUZERAINTY_KIND_TRIBUTARY);
  assert.equal(
    directSuzeraintyBetween(memory, "spain", "habsburg").kind,
    SUZERAINTY_KIND_PERSONAL_UNION
  );
  assert.equal(foreignPolicyPrincipal(memory, "crimea"), "ottoman");
  assert.equal(foreignPolicyPrincipal(memory, "spain"), "habsburg");
  assert.deepEqual(vassalsOf(memory, "portugal"), ["hormuz"]);
  assert.equal(vassalsOf(memory, "habsburg").includes("spain"), false);
  validateSuzeraintyMemory(JSON.parse(JSON.stringify(memory)));
});

test("vassal customs favor the suzerain while tribute trade is reciprocal", () => {
  const memory = createSuzeraintyMemory(0);
  assert.equal(suzeraintyTradePrivilege(memory, "portugal", "hormuz").customsRate, 0.02);
  assert.equal(suzeraintyTradePrivilege(memory, "hormuz", "portugal").customsRate, 0.05);
  assert.equal(suzeraintyTradePrivilege(memory, "ming", "joseon").customsRate, 0.02);
  assert.equal(suzeraintyTradePrivilege(memory, "joseon", "ming").customsRate, 0.02);
  assert.equal(suzeraintyTradePrivilege(memory, "spain", "habsburg").customsRate, 0.02);
  assert.equal(suzeraintyTradePrivilege(memory, "habsburg", "spain").customsRate, 0.02);
  assert.equal(suzeraintyTradePrivilege(memory, "england", "hormuz"), null);
});

test("only an ordinary suzerain inherits access to a vassal's protected market", () => {
  const memory = createSuzeraintyMemory(0);
  assert.equal(
    suzeraintyTradePrivilege(memory, "portugal", "hormuz").sovereignMarketAccess,
    true
  );
  assert.equal(
    suzeraintyTradePrivilege(memory, "hormuz", "portugal").sovereignMarketAccess,
    false
  );
  assert.equal(
    suzeraintyTradePrivilege(memory, "ming", "joseon").sovereignMarketAccess,
    false
  );
  assert.equal(
    suzeraintyTradePrivilege(memory, "habsburg", "spain").sovereignMarketAccess,
    false
  );
});

test("new vassals can rebel and annexed suzerains release their dependents", () => {
  const memory = createSuzeraintyMemory(0);
  establishSuzerainty(memory, {
    vassalFactionId: "france",
    suzerainFactionId: "england",
    simMinute: 100
  });
  assert.equal(foreignPolicyPrincipal(memory, "france"), "england");
  const rebellion = releaseVassal(memory, {
    vassalFactionId: "france",
    simMinute: 200,
    source: "rebellion"
  });
  assert.equal(rebellion.source, "rebellion");
  assert.equal(foreignPolicyPrincipal(memory, "france"), "france");

  const releases = releaseFactionSuzerainties(memory, "portugal", 300);
  assert.equal(releases.some((event) => event.vassalFactionId === "hormuz"), true);
  assert.equal(suzerainForFaction(memory, "hormuz"), null);
});

test("a forced treaty dissolves a personal union without releasing ordinary vassals", () => {
  const memory = createSuzeraintyMemory(0);
  const releases = releaseFactionPersonalUnions(memory, "habsburg", 300);
  assert.deepEqual(releases.map((event) => event.vassalFactionId), ["spain"]);
  assert.equal(suzerainForFaction(memory, "spain"), null);
  assert.equal(suzerainForFaction(memory, "hormuz"), "portugal");
});

test("suzerainty cycles fail loudly", () => {
  const memory = createSuzeraintyMemory(0);
  establishSuzerainty(memory, {
    vassalFactionId: "france",
    suzerainFactionId: "england",
    simMinute: 100
  });
  assert.throws(() => establishSuzerainty(memory, {
    vassalFactionId: "england",
    suzerainFactionId: "france",
    simMinute: 200
  }), /cycle/);
});
