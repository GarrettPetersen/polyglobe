import assert from "node:assert/strict";
import test from "node:test";

import {
  cancelAboardCrewDismissal,
  confirmAboardCrewDismissal,
  requestAboardCrewDismissal
} from "./aboardCrewDismissalFlow.js";

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
