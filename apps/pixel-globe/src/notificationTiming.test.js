import assert from "node:assert/strict";
import test from "node:test";

import { NOTICE_DURATION_MS } from "./notificationTiming.js";

test("lightweight notices linger long enough to be read", () => {
  assert.deepEqual(Object.keys(NOTICE_DURATION_MS).sort(), [
    "achievement",
    "combat",
    "discovery",
    "fishing",
    "stormDamage",
    "survival"
  ]);
  for (const duration of Object.values(NOTICE_DURATION_MS)) {
    assert.ok(duration >= 3400);
    assert.ok(duration <= 6000);
  }
  assert.equal(NOTICE_DURATION_MS.achievement, 6000);
});
