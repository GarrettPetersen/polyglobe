import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

import {
  cancelAboardCrewDismissal,
  confirmAboardCrewDismissal,
  requestAboardCrewDismissal
} from "./aboardCrewDismissalFlow.js";

const MAIN_SOURCE = readFileSync(new URL("./main.js", import.meta.url), "utf8");

test("inn and recruitment management retain their source dialogue", () => {
  const start = MAIN_SOURCE.indexOf("function openAboardMenu(");
  const end = MAIN_SOURCE.indexOf("function closeAboardMenu(", start);
  for (const source of ["port-inn", "port-recruitment"]) {
    const dialogue = { nodeId: source === "port-inn" ? "inn-drink" : "crew-recruitment" };
    const runtime = { gameState: {ship:{},playerCharacter:{}}, dialogueState:dialogue,
      aboardMenu:{}, switchNotebookPage:()=>{}, capturePausedView:()=>({named:[{id:'captain',character:{}}]}),
      currentAboardRoster:()=>{}, dialoguePortraitImage:()=>{}, characterExpression:()=>"neutral" };
    vm.runInNewContext(`${MAIN_SOURCE.slice(start,end)}\nopenAboardMenu({source:"${source}"})`,runtime);
    assert.equal(runtime.aboardMenu.source,source);
    assert.equal(runtime.dialogueState,dialogue);
  }
});

test("crew dismissal requires a separate request and confirmation", () => {
  const pendingMemberId = requestAboardCrewDismissal("crew:a", null);
  assert.equal(pendingMemberId, "crew:a");
  assert.equal(confirmAboardCrewDismissal("crew:a", pendingMemberId), "crew:a");
});

test("crew dismissal cannot silently switch to another person", () => {
  const pendingMemberId = requestAboardCrewDismissal("crew:a", null);
  assert.throws(
    () => confirmAboardCrewDismissal("crew:b", pendingMemberId),
    /changed members/
  );
});

test("crew dismissal confirmation can be cancelled", () => {
  assert.equal(cancelAboardCrewDismissal("crew:a"), null);
  assert.throws(() => cancelAboardCrewDismissal(null), /requires a member ID/);
});

test("dismissing or restoring crew invalidates the underlying hiring view before returning", () => {
  const start = MAIN_SOURCE.indexOf("function refreshAboardRosterAfterCrewChange(");
  const end = MAIN_SOURCE.indexOf("\nfunction ", start + 1);
  let crew = 10;
  let cachedHire = { disabled: true };
  const runtime = { aboardMenu: { viewCache: {}, focusedEntryId: "captain" }, gameState: {},
    invalidateDialogueView: () => { cachedHire = null; }, clearPausedView() {},
    capturePausedView: () => ({ named: [{ id: "captain" }] }), currentAboardRoster() {},
    aboardRosterLayout: () => [], aboardMenuBodyWidth: () => 100,
    aboardFocusableLayoutEntries: () => [{ id: "captain" }], syncShipCargoFromGameState() {} };
  vm.runInNewContext(MAIN_SOURCE.slice(start, end), runtime);
  const hireView = () => cachedHire ||= { disabled: crew >= 10 };
  assert.equal(hireView().disabled, true);
  crew--;
  runtime.refreshAboardRosterAfterCrewChange();
  assert.equal(hireView().disabled, false, "the first returning frame must offer the free berth without a click");
  crew++;
  runtime.refreshAboardRosterAfterCrewChange();
  assert.equal(hireView().disabled, true, "undoing dismissal must disable hiring again");
});
