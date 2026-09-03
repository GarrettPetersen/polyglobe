import assert from "node:assert/strict";
import test from "node:test";

import { saveRestoreSmokeEnabled } from "./saveRestoreSmoke.js";

test("save-restore smoke mode is explicit and restricted to local test hosts", () => {
  assert.equal(saveRestoreSmokeEnabled({ search: "", hostname: "pirates.example" }), false);
  assert.equal(saveRestoreSmokeEnabled({ search: "?saveRestoreSmoke=1", hostname: "localhost" }), true);
  assert.equal(saveRestoreSmokeEnabled({ search: "?saveRestoreSmoke=1", hostname: "127.0.0.1" }), true);
  assert.throws(
    () => saveRestoreSmokeEnabled({ search: "?saveRestoreSmoke=true", hostname: "localhost" }),
    /Invalid save-restore smoke mode/
  );
  assert.throws(
    () => saveRestoreSmokeEnabled({ search: "?saveRestoreSmoke=1", hostname: "pirates.example" }),
    /restricted to the local test host/
  );
});
