import assert from "node:assert/strict";
import test from "node:test";

import {
  CHART_SWELL_REPAIR_STALL_MS,
  advanceChartSwellRepairProgress
} from "./chartSwellRepairProgress.js";

test("an ineffective swell repair escalates instead of persisting indefinitely", () => {
  let result = advanceChartSwellRepairProgress(null, {
    nowMs: 1_000,
    rmsDistortionPx: 12.2
  });
  assert.equal(result.stalled, false);
  result = advanceChartSwellRepairProgress(result.progress, {
    nowMs: 1_000 + CHART_SWELL_REPAIR_STALL_MS - 1,
    rmsDistortionPx: 11.7
  });
  assert.equal(result.stalled, false);
  result = advanceChartSwellRepairProgress(result.progress, {
    nowMs: 1_000 + CHART_SWELL_REPAIR_STALL_MS,
    rmsDistortionPx: 11.7
  });
  assert.equal(result.stalled, true);
});

test("material swell progress restarts the escalation window", () => {
  let result = advanceChartSwellRepairProgress(null, {
    nowMs: 0,
    rmsDistortionPx: 12
  });
  result = advanceChartSwellRepairProgress(result.progress, {
    nowMs: CHART_SWELL_REPAIR_STALL_MS - 100,
    rmsDistortionPx: 10.9
  });
  result = advanceChartSwellRepairProgress(result.progress, {
    nowMs: CHART_SWELL_REPAIR_STALL_MS + 100,
    rmsDistortionPx: 10.8
  });
  assert.equal(result.stalled, false);
});
