import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { openNextPortArrivalFollowup } from "./portArrivalQueue.js";

test("port arrival follow-ups drain in priority order across successive dialogues", () => {
  const pending = new Set(["envoy", "naturalist", "discovery"]);
  const opened = [];
  const openers = ["envoy", "naturalist", "discovery"].map((id) => () => {
    if (!pending.has(id)) return false;
    pending.delete(id);
    opened.push(id);
    return true;
  });

  assert.equal(openNextPortArrivalFollowup(openers), true);
  assert.deepEqual(opened, ["envoy"]);
  assert.equal(openNextPortArrivalFollowup(openers), true);
  assert.deepEqual(opened, ["envoy", "naturalist"]);
  assert.equal(openNextPortArrivalFollowup(openers), true);
  assert.deepEqual(opened, ["envoy", "naturalist", "discovery"]);
  assert.equal(openNextPortArrivalFollowup(openers), false);
});

test("port arrival follow-up queues reject invalid openers and return values", () => {
  assert.throws(
    () => openNextPortArrivalFollowup([]),
    /requires at least one opener/
  );
  assert.throws(
    () => openNextPortArrivalFollowup([null]),
    /opener 0 is not a function/
  );
  assert.throws(
    () => openNextPortArrivalFollowup([() => "yes"]),
    /opener 0 did not return a boolean/
  );
});

test("war-loan audiences interrupt arrival before ordinary port follow-ups", async () => {
  const mainSource = await readFile(new URL("./main.js", import.meta.url), "utf8");
  const arrivalQueue = mainSource.match(
    /function continuePortArrivalDialogues\(\) \{[\s\S]*?\n\}/
  )?.[0];
  assert.ok(arrivalQueue, "Could not inspect the port-arrival follow-up queue");
  assert.match(
    arrivalQueue,
    /openNextPortArrivalFollowup\(\[\s*\(\) => maybeOpenSovereignWarLoanDialogue\(cityCall\),/
  );

  const warLoanOpener = mainSource.match(
    /function maybeOpenSovereignWarLoanDialogue\(cityCall\) \{[\s\S]*?\n\}/
  )?.[0];
  assert.ok(warLoanOpener, "Could not inspect the war-loan arrival opener");
  for (const status of [
    "SOVEREIGN_WAR_LOAN_RENEGOTIATION_READY",
    "SOVEREIGN_WAR_LOAN_REPAYMENT_READY",
    "SOVEREIGN_WAR_LOAN_DEFAULT_READY"
  ]) {
    assert.match(warLoanOpener, new RegExp(`\\b${status}\\b`));
  }
  assert.match(warLoanOpener, /openSovereignWarLoanSettlementDialogue\(cityCall, contract\)/);
});
