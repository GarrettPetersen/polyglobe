import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  cancelAboardCrewDismissal,
  confirmAboardCrewDismissal,
  requestAboardCrewDismissal
} from "./aboardCrewDismissalFlow.js";

const MAIN_SOURCE = readFileSync(new URL("./main.js", import.meta.url), "utf8");

test("inn crew management opens the same aboard roster used elsewhere", () => {
  assert.match(
    MAIN_SOURCE,
    /result\.action\?\.type === "open-crew-management"[\s\S]*?openAboardMenu\(\{ source: "port-inn" \}\);/
  );
  assert.match(MAIN_SOURCE, /drawOptionsText\("BACK TO INN"/);
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
