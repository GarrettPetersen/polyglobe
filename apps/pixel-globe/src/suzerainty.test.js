import assert from "node:assert/strict";
import test from "node:test";

import {
  SUZERAINTY_KIND_AUTONOMOUS_VASSAL,
  SUZERAINTY_KIND_PERSONAL_UNION,
  SUZERAINTY_KIND_TRIBUTARY,
  createSuzeraintyMemory,
  directSuzeraintyBetween,
  defensivePartnersOf,
  establishSuzerainty,
  foreignPolicyPrincipal,
  migrateSuzeraintyMemory,
  offensivePartnersOf,
  releaseFactionSuzerainties,
  releaseFactionPersonalUnions,
  releaseVassal,
  suzerainForFaction,
  suzeraintyTermsForRelationship,
  suzeraintyTradePrivilege,
  validateSuzeraintyMemory,
  vassalsOf
} from "./suzerainty.js";

test("the 1522 world begins with historically grounded suzerainties", () => {
  const memory = createSuzeraintyMemory(0);
  assert.equal(suzerainForFaction(memory, "hormuz"), "portugal");
  assert.equal(suzerainForFaction(memory, "crimea"), "ottoman");
  assert.equal(suzerainForFaction(memory, "joseon"), "ming");
  assert.equal(suzerainForFaction(memory, "burgundian-netherlands"), "spain");
  assert.equal(directSuzeraintyBetween(memory, "ming", "joseon").kind, SUZERAINTY_KIND_TRIBUTARY);
  assert.equal(
    directSuzeraintyBetween(memory, "ottoman", "wallachia").kind,
    SUZERAINTY_KIND_AUTONOMOUS_VASSAL
  );
  assert.equal(
    directSuzeraintyBetween(memory, "spain", "burgundian-netherlands").kind,
    SUZERAINTY_KIND_PERSONAL_UNION
  );
  assert.equal(foreignPolicyPrincipal(memory, "crimea"), "crimea");
  assert.equal(foreignPolicyPrincipal(memory, "burgundian-netherlands"), "spain");
  assert.deepEqual(vassalsOf(memory, "portugal"), ["hormuz"]);
  assert.equal(vassalsOf(memory, "spain").includes("burgundian-netherlands"), false);
  assert.equal(vassalsOf(memory, "ming").includes("joseon"), false);
  assert.deepEqual(defensivePartnersOf(memory, "wallachia"), ["ottoman"]);
  assert.equal(defensivePartnersOf(memory, "ryukyu").includes("ming"), false);
  assert.equal(suzeraintyTermsForRelationship(memory.byVassalId.wallachia).tribute, true);
  assert.equal(suzeraintyTermsForRelationship(memory.byVassalId.crimea).tribute, false);
  assert.equal(suzeraintyTermsForRelationship(memory.byVassalId.hejaz).tribute, false);
  assert.deepEqual(offensivePartnersOf(memory, "ottoman"), ["crimea"]);
  assert.deepEqual(offensivePartnersOf(memory, "portugal"), ["hormuz"]);
  validateSuzeraintyMemory(JSON.parse(JSON.stringify(memory)));
});

test("legacy suzerainties do not revive collapsed powers or their dependencies", () => {
  const saved = createSuzeraintyMemory(0);
  const migrated = migrateSuzeraintyMemory(saved, 0, {
    inactiveFactionIds: ["ottoman"]
  });

  assert.equal(migrated.byVassalId.crimea, undefined);
  assert.equal(migrated.byVassalId.wallachia, undefined);
  assert.equal(migrated.byVassalId.moldavia, undefined);
  assert.equal(migrated.byVassalId.hejaz, undefined);
  assert.equal(migrated.byVassalId.ragusa, undefined);
  assert.equal(suzerainForFaction(migrated, "joseon"), "ming");
  assert.equal(suzerainForFaction(migrated, "burgundian-netherlands"), "spain");
});

test("the former combined Habsburg union migrates without undoing a divergent dynastic settlement", () => {
  const historical = createSuzeraintyMemory(0);
  const burgundianUnion = historical.byVassalId["burgundian-netherlands"];
  delete historical.byVassalId["burgundian-netherlands"];
  historical.byVassalId.spain = {
    ...burgundianUnion,
    vassalFactionId: "spain",
    suzerainFactionId: "habsburg"
  };
  const migratedHistorical = migrateSuzeraintyMemory(historical, 0);
  assert.equal(migratedHistorical.byVassalId.spain, undefined);
  assert.equal(
    migratedHistorical.byVassalId["burgundian-netherlands"].suzerainFactionId,
    "spain"
  );

  const divergent = createSuzeraintyMemory(0);
  delete divergent.byVassalId["burgundian-netherlands"];
  divergent.byVassalId.spain = {
    ...burgundianUnion,
    vassalFactionId: "spain",
    suzerainFactionId: "france",
    source: "peace-treaty"
  };
  const migratedDivergent = migrateSuzeraintyMemory(divergent, 0);
  assert.equal(migratedDivergent.byVassalId.spain.suzerainFactionId, "france");
  assert.equal(migratedDivergent.byVassalId["burgundian-netherlands"], undefined);
});

test("vassal customs favor the suzerain while tribute trade is reciprocal", () => {
  const memory = createSuzeraintyMemory(0);
  assert.equal(suzeraintyTradePrivilege(memory, "portugal", "hormuz").customsRate, 0.02);
  assert.equal(suzeraintyTradePrivilege(memory, "hormuz", "portugal").customsRate, 0.05);
  assert.equal(suzeraintyTradePrivilege(memory, "ming", "joseon").customsRate, 0.02);
  assert.equal(suzeraintyTradePrivilege(memory, "joseon", "ming").customsRate, 0.02);
  assert.equal(suzeraintyTradePrivilege(memory, "spain", "burgundian-netherlands").customsRate, 0.02);
  assert.equal(suzeraintyTradePrivilege(memory, "burgundian-netherlands", "spain").customsRate, 0.02);
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
    suzeraintyTradePrivilege(memory, "spain", "burgundian-netherlands").sovereignMarketAccess,
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
  const releases = releaseFactionPersonalUnions(memory, "spain", 300);
  assert.deepEqual(releases.map((event) => event.vassalFactionId), ["burgundian-netherlands"]);
  assert.equal(suzerainForFaction(memory, "burgundian-netherlands"), null);
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
