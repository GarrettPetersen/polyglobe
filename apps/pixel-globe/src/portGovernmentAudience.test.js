import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { portGovernmentAudienceAvailable } from "./portGovernmentAudience.js";

const city = { cityId: "lisbon|portugal" };
const session = { kind: "port", cityId: city.cityId, admittedToPort: true, disguisedEntry: false };
const entry = { allowed: true, hostile: false };
test("public government audiences exclude covert, barred, outlaw and enemy captains", () => {
  assert.equal(portGovernmentAudienceAvailable(session, city, entry), true);
  for (const change of [{ disguisedEntry: true }, { admittedToPort: false }, { cityId: "porto|portugal" }]) {
    assert.equal(portGovernmentAudienceAvailable({ ...session, ...change }, city, entry), false);
  }
  for (const change of [{ allowed: false }, { hostile: true }, { hostileByWar: true },
    { hostileLocalStanding: true }, { hostileByStanding: true }]) {
    assert.equal(portGovernmentAudienceAvailable(session, city, { ...entry, ...change }), false);
  }
  assert.throws(() => portGovernmentAudienceAvailable(session, city, null), /port-entry status/);
});

test("the live loan approach cannot create, present or settle an offer during covert entry", () => {
  const source = ts.createSourceFile("main.js", readFileSync(new URL("./main.js", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const names = ["maybeOpenSovereignWarLoanDialogue", "currentPortGovernmentAudienceAvailable", "acceptSovereignWarLoan"];
  const code = names.map((name) => source.statements.find((node) => ts.isFunctionDeclaration(node) && node.name.text === name).getText(source)).join("\n");
  // No quest/economy mocks: touching either would prove the gate ran too late.
  const context = { portGovernmentAudienceAvailable, dialogueState: { ...session, disguisedEntry: true },
    gameState: {}, weatherClockMinutes: 10, portEntryStatus: () => entry };
  const runtime = runInNewContext(`${code}\n({ maybeOpenSovereignWarLoanDialogue, acceptSovereignWarLoan })`, context);
  assert.equal(runtime.maybeOpenSovereignWarLoanDialogue(city), false);
  assert.throws(() => runtime.acceptSovereignWarLoan(city), /audience is unavailable/);
});
