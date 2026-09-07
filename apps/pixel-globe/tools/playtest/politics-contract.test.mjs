import assert from "node:assert/strict";
import test from "node:test";
import { createWorkerVoyage, workerRuntime, snapshotWorkerVoyage, restoreWorkerVoyage } from "./world-worker.mjs";
import { declareDiplomaticWar } from "../../src/worldDiplomacy.js";
import { relationKey } from "../../src/distantWorldSimulation.js";
import { openSovereignTradeToFaction } from "../../src/gameState.js";

test("soak diplomacy and access follow real war and grant transitions through reload", () => {
  const voyage = createWorkerVoyage("soak-politics-contract");
  const policy = "ming-maritime-prohibition";
  const accessKey = `${policy}|portugal`;
  const pair = relationKey("portugal", "tidore");
  assert.equal(new Map(workerRuntime(voyage).sovereignAccess).get(accessKey), false);
  assert.equal(voyage.npcSeaRoutes.sovereignTradeOpenToFaction(policy, "portugal"), false);
  declareDiplomaticWar(voyage.gameState.relations.diplomacy, "portugal", "tidore", 0);
  openSovereignTradeToFaction(voyage.gameState, policy, "portugal");
  const verify = () => {
    const runtime = workerRuntime(voyage);
    assert.equal(new Map(runtime.relations).get(pair), "war");
    assert.equal(voyage.npcSeaRoutes.relationBetween("portugal", "tidore"), "war");
    assert.equal(new Map(runtime.sovereignAccess).get(accessKey), true);
    assert.equal(voyage.npcSeaRoutes.sovereignTradeOpenToFaction(policy, "portugal"), true);
  };
  verify();
  restoreWorkerVoyage(voyage, JSON.parse(JSON.stringify(snapshotWorkerVoyage(voyage))));
  verify();
});
