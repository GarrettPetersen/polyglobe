import assert from "node:assert/strict";
import test from "node:test";

import {
  DEPARTURE_CONTROL_FEEDBACK_DURATION_MS,
  DEPARTURE_CONTROL_FEEDBACK_KINDS,
  departureControlFeedbackAttention,
  departureControlFeedbackIsActive,
  signalDepartureControlFeedback
} from "./departureControlFeedback.js";

test("held departure input extends one pulse without restarting it", () => {
  const first = signalDepartureControlFeedback(null, DEPARTURE_CONTROL_FEEDBACK_KINDS.ANCHOR, 100);
  const extended = signalDepartureControlFeedback(first, DEPARTURE_CONTROL_FEEDBACK_KINDS.ANCHOR, 300);

  assert.equal(extended.startedAtMs, 100);
  assert.equal(extended.expiresAtMs, 300 + DEPARTURE_CONTROL_FEEDBACK_DURATION_MS);
  assert.equal(departureControlFeedbackIsActive(extended, 300), true);
});

test("departure feedback only colors its matching button and fades away", () => {
  const feedback = signalDepartureControlFeedback(null, DEPARTURE_CONTROL_FEEDBACK_KINDS.PORT, 100);

  assert.ok(departureControlFeedbackAttention(feedback, DEPARTURE_CONTROL_FEEDBACK_KINDS.PORT, 260) > 0);
  assert.equal(departureControlFeedbackAttention(feedback, DEPARTURE_CONTROL_FEEDBACK_KINDS.ANCHOR, 260), 0);
  assert.equal(departureControlFeedbackAttention(feedback, DEPARTURE_CONTROL_FEEDBACK_KINDS.PORT, 950), 0);
  assert.equal(departureControlFeedbackIsActive(feedback, 950), false);
});
