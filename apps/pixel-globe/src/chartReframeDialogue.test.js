import assert from "node:assert/strict";
import test from "node:test";

import {
  CHART_REFRAME_DIALOGUES,
  CHART_REFRAME_DIALOGUE_CATASTROPHIC_CONFIRMATION_MS,
  CHART_REFRAME_DIALOGUE_CATASTROPHIC_REPAIR_STALL_MS,
  CHART_REFRAME_DIALOGUE_CONFIRMATION_MS,
  CHART_REFRAME_DIALOGUE_REPAIR_STALL_MS,
  advanceChartReframeDialogueTrigger,
  chartDialogueRegionTags,
  chartReframeDialogueCooldownElapsed,
  chartReframeDialoguePortraitStage,
  createChartReframeDialogueMemory,
  createChartReframeDialogueTrigger,
  formatChartReframeDialogueMessage,
  recordChartReframeDialogue,
  recordChartReframePortVisit,
  selectChartReframeDialogue,
  validateChartReframeDialogueMemory
} from "./chartReframeDialogue.js";

test("a crewmate speaking during a chart reframe remains paired with the captain", () => {
  const captain = { id: "captain" };
  const crewmate = { id: "crewmate" };
  assert.deepEqual(chartReframeDialoguePortraitStage({
    captain,
    counterpart: crewmate,
    speaker: crewmate
  }), {
    leftCharacter: captain,
    rightCharacter: crewmate,
    speakerCharacter: crewmate
  });
});

test("last-resort chart dialogue has several dozen conditional situations", () => {
  assert.ok(CHART_REFRAME_DIALOGUES.length >= 40);
  assert.equal(new Set(CHART_REFRAME_DIALOGUES.map(({ id }) => id)).size, CHART_REFRAME_DIALOGUES.length);
  assert.ok(new Set(CHART_REFRAME_DIALOGUES.map(({ category }) => category)).size >= 8);
});

test("captain-only voyages never select a missing crewmate", () => {
  const selected = selectChartReframeDialogue(
    createChartReframeDialogueMemory(),
    context({ hasCrew: false, namedPeopleCount: 1 }),
    0
  );
  assert.ok(selected.steps.every(({ speaker }) => speaker === "captain" || speaker.startsWith("animal:")));
});

test("specific animals, cargo, damage, missions, ships, and items enter the candidate pool", () => {
  const cases = [
    [context({ companionIds: ["panda", "penguin"] }), "animal"],
    [context({ cargoGoodIds: ["furs"] }), "cargo"],
    [context({ damageRatio: 0.7 }), "damage"],
    [context({ campaignGoalType: "white-whale-revenge" }), "mission"],
    [context({ shipSlug: "joseon-turtle-ship" }), "ship"],
    [context({ itemIds: ["pilots-instruments"] }), "item"]
  ];
  for (const [candidateContext, expectedCategory] of cases) {
    const selected = selectChartReframeDialogue(createChartReframeDialogueMemory(), candidateContext, 0);
    assert.equal(selected.category, expectedCategory);
  }
});

test("recent dialogue ids and categories are suppressed when alternatives exist", () => {
  const memory = createChartReframeDialogueMemory();
  const candidateContext = context({
    regions: ["atlantic"],
    cargoGoodIds: ["wine", "fish"],
    recentPortNames: ["Lisbon"]
  });
  const first = selectChartReframeDialogue(memory, candidateContext, 0);
  recordChartReframeDialogue(memory, first, 50_000);
  const second = selectChartReframeDialogue(memory, candidateContext, 0);
  assert.notEqual(second.id, first.id);
  assert.notEqual(second.category, first.category);
  validateChartReframeDialogueMemory(memory);
});

test("dialogue cooldown shortens only for catastrophic faults", () => {
  const memory = createChartReframeDialogueMemory();
  const selected = selectChartReframeDialogue(memory, context(), 0);
  recordChartReframeDialogue(memory, selected, 10_000);
  assert.equal(chartReframeDialogueCooldownElapsed(memory, 15_000, "severe"), false);
  assert.equal(chartReframeDialogueCooldownElapsed(memory, 15_000, "catastrophic"), true);
});

test("severe chart faults must persist and repaired faults clear the trigger", () => {
  const severe = fault({ rotationDeg: 9 });
  const start = advanceChartReframeDialogueTrigger(createChartReframeDialogueTrigger(), {
    ...severe,
    nowMs: 1_000
  });
  assert.equal(start.ready, false);
  const ready = advanceChartReframeDialogueTrigger(start.trigger, {
    ...severe,
    nowMs: 1_000 + CHART_REFRAME_DIALOGUE_CONFIRMATION_MS
  });
  assert.equal(ready.ready, true);
  const repaired = advanceChartReframeDialogueTrigger(ready.trigger, {
    ...fault({ rotationDeg: 0.5, tearPx: 1 }),
    nowMs: 30_000
  });
  assert.equal(repaired.ready, false);
  assert.equal(repaired.trigger.sinceMs, null);
});

test("catastrophic chart faults use the shorter confirmation period", () => {
  const catastrophic = fault({ rotationDeg: 15 });
  const start = advanceChartReframeDialogueTrigger(createChartReframeDialogueTrigger(), {
    ...catastrophic,
    nowMs: 1_000
  });
  const ready = advanceChartReframeDialogueTrigger(start.trigger, {
    ...catastrophic,
    nowMs: 1_000 + CHART_REFRAME_DIALOGUE_CATASTROPHIC_CONFIRMATION_MS
  });
  assert.equal(ready.ready, true);
  assert.equal(ready.severity, "catastrophic");
});

test("an active visual repair suppresses banter while severe faults keep improving", () => {
  let result = advanceChartReframeDialogueTrigger(createChartReframeDialogueTrigger(), {
    ...fault({ rotationDeg: 16 }),
    nowMs: 1_000,
    correctiveEffectActive: true
  });
  for (const [elapsedMs, rotationDeg] of [[7_000, 15], [14_000, 14.2], [21_000, 13.4]]) {
    result = advanceChartReframeDialogueTrigger(result.trigger, {
      ...fault({ rotationDeg }),
      nowMs: 1_000 + elapsedMs,
      correctiveEffectActive: true
    });
    assert.equal(result.ready, false);
  }
});

test("banter remains a last resort when an active visual repair stalls", () => {
  const catastrophic = fault({ rotationDeg: 16 });
  const catastrophicStart = advanceChartReframeDialogueTrigger(createChartReframeDialogueTrigger(), {
    ...catastrophic,
    nowMs: 1_000,
    correctiveEffectActive: true
  });
  const catastrophicReady = advanceChartReframeDialogueTrigger(catastrophicStart.trigger, {
    ...catastrophic,
    nowMs: 1_000 + CHART_REFRAME_DIALOGUE_CATASTROPHIC_REPAIR_STALL_MS,
    correctiveEffectActive: true
  });
  assert.equal(catastrophicReady.ready, true);

  const severe = fault({ rotationDeg: 9 });
  const severeStart = advanceChartReframeDialogueTrigger(createChartReframeDialogueTrigger(), {
    ...severe,
    nowMs: 1_000,
    correctiveEffectActive: true
  });
  const severeReady = advanceChartReframeDialogueTrigger(severeStart.trigger, {
    ...severe,
    nowMs: 1_000 + CHART_REFRAME_DIALOGUE_REPAIR_STALL_MS,
    correctiveEffectActive: true
  });
  assert.equal(severeReady.ready, true);
});

test("ending a corrective effect starts a fresh unassisted confirmation window", () => {
  const catastrophic = fault({ rotationDeg: 16 });
  const repairing = advanceChartReframeDialogueTrigger(createChartReframeDialogueTrigger(), {
    ...catastrophic,
    nowMs: 1_000,
    correctiveEffectActive: true
  });
  const unassisted = advanceChartReframeDialogueTrigger(repairing.trigger, {
    ...catastrophic,
    nowMs: 10_000,
    correctiveEffectActive: false
  });
  assert.equal(unassisted.ready, false);
  const ready = advanceChartReframeDialogueTrigger(unassisted.trigger, {
    ...catastrophic,
    nowMs: 10_000 + CHART_REFRAME_DIALOGUE_CATASTROPHIC_CONFIRMATION_MS,
    correctiveEffectActive: false
  });
  assert.equal(ready.ready, true);
});

test("recent ports are unique, bounded, and available to templates", () => {
  const memory = createChartReframeDialogueMemory();
  for (const cityId of ["a", "b", "c", "d", "e", "c"]) {
    recordChartReframePortVisit(memory, cityId);
  }
  assert.deepEqual(memory.recentPortCityIds, ["c", "e", "d", "b"]);
  assert.equal(
    formatChartReframeDialogueMessage("The market at {0} is astern.", ["Lisbon"]),
    "The market at Lisbon is astern."
  );
});

test("coordinate tags distinguish polar, Mediterranean, and ocean-basin conditions", () => {
  assert.ok(chartDialogueRegionTags({ latitudeDeg: 67, longitudeDeg: 18 }).includes("polar-north"));
  assert.ok(chartDialogueRegionTags({ latitudeDeg: 38, longitudeDeg: 18 }).includes("mediterranean"));
  assert.ok(chartDialogueRegionTags({ latitudeDeg: -20, longitudeDeg: 165 }).includes("pacific"));
  assert.ok(chartDialogueRegionTags({ latitudeDeg: 12, longitudeDeg: 72, raining: true }).includes("humid"));
});

function context(overrides = {}) {
  return {
    regions: [],
    companionIds: [],
    cargoGoodIds: [],
    itemIds: [],
    recentPortNames: [],
    homePortName: "Lisbon",
    campaignGoalType: null,
    hasCrew: true,
    hasMaleCrew: true,
    namedPeopleCount: 2,
    peopleAboard: 8,
    crewCapacity: 12,
    damageRatio: 0,
    foodDays: 20,
    waterDays: 20,
    localHour: 12,
    shipSlug: "small-cog",
    isRiver: false,
    ...overrides
  };
}

function fault({ rotationDeg = 0, rmsPx = 0, maxPx = 0, tearPx = 0 } = {}) {
  return {
    drift: {
      rotationDeg,
      rmsDistortionPx: rmsPx,
      maxDistortionPx: maxPx
    },
    terrainTear: { extraPx: tearPx }
  };
}
