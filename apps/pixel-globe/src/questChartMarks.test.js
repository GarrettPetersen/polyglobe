import assert from "node:assert/strict";
import test from "node:test";

import {
  QUEST_CHART_MARK_SIZE,
  QUEST_CHART_SHAPES,
  normalizeQuestChartId,
  questChartHoverKey,
  questChartIdsAssociate,
  questChartLinkSegments,
  questChartMarkPixels,
  questChartSelectableKeys,
  questChartShapeForRole,
  questChartTextRect,
  stepQuestChartSelection
} from "./questChartMarks.js";

test("quest chart roles use five distinct marks at the same pixel scale", () => {
  const shapes = ["quest", "campaign", "colonization", "optional", "naturalist"]
    .map(questChartShapeForRole);
  assert.deepEqual(shapes, ["diamond", "square", "plus", "circle", "cross"]);
  assert.deepEqual(new Set(shapes).size, QUEST_CHART_SHAPES.length);
  for (const shape of shapes) {
    const pixels = questChartMarkPixels(shape);
    assert.ok(pixels.length >= 9 && pixels.length <= 16, `${shape} should stay small`);
    for (const pixel of pixels) {
      assert.ok(pixel.x >= 0 && pixel.x < QUEST_CHART_MARK_SIZE);
      assert.ok(pixel.y >= 0 && pixel.y < QUEST_CHART_MARK_SIZE);
    }
  }
  const signatures = shapes.map((shape) => (
    questChartMarkPixels(shape).map((pixel) => `${pixel.x},${pixel.y}`).join(" ")
  ));
  assert.equal(new Set(signatures).size, shapes.length);
});

test("journal entries associate with their map waypoints without merging unrelated quests", () => {
  assert.equal(normalizeQuestChartId("travel:tea:london"), "quest:tea:london");
  assert.equal(questChartIdsAssociate("travel:tea:london", "quest:tea:london"), true);
  assert.equal(questChartIdsAssociate("quest:tea:london", "quest:tea:lisbon"), false);
  assert.equal(questChartIdsAssociate("campaign", "campaign:home:london"), true);
  assert.equal(questChartIdsAssociate("hospitaller-malta", "hospitaller-malta:petition"), true);
  assert.equal(questChartIdsAssociate("papal:matter", "papal:matter:return"), true);
  assert.equal(questChartIdsAssociate("naturalist", "naturalist:lisbon"), true);
  assert.equal(questChartIdsAssociate("colonization", "colonization:target:12"), true);
  assert.equal(
    questChartIdsAssociate("colonization:target:12", "colonization:target:40"),
    false
  );
  assert.equal(questChartIdsAssociate("fishing-trade-tutorial", "fishing-trade-tutorial:fishery"), true);
  assert.equal(questChartIdsAssociate("viking-longship", "fetch:viking-longship:oak"), true);
  assert.equal(questChartIdsAssociate("exeter-canal", "fetch:exeter-canal.timber"), true);
  assert.equal(questChartIdsAssociate("exeter-canal", "exeter-canal-extension"), false);
  assert.equal(questChartIdsAssociate("shipyard-investment", "shipyard-investment"), true);
  assert.throws(() => normalizeQuestChartId(""), /non-empty string/);
});

test("only journal entries with a waypoint can be selected, and selection wraps", () => {
  const keys = questChartSelectableKeys(
    ["exeter-canal", "campaign", "notes", "travel:tea:london"],
    ["fetch:exeter-canal.timber", "campaign:home:london", "quest:other:lisbon"]
  );
  assert.deepEqual(keys, ["exeter-canal", "campaign"]);
  assert.equal(stepQuestChartSelection(keys, null, 1), "exeter-canal");
  assert.equal(stepQuestChartSelection(keys, null, -1), "campaign");
  assert.equal(stepQuestChartSelection(keys, "campaign", 1), "exeter-canal");
  assert.equal(stepQuestChartSelection([], "campaign", 1), null);
});

test("hovering either a journal row or its waypoint selects the shared quest", () => {
  const rows = [
    { key: "campaign", x: 10, y: 80, w: 100, h: 10 },
    { key: "campaign", x: 10, y: 90, w: 100, h: 10 },
    { key: "notes", x: 10, y: 100, w: 100, h: 10 }
  ];
  const marks = [
    { key: "campaign:home:london", x: 40, y: 30 },
    { key: "quest:tea:london", x: 70, y: 36 }
  ];
  assert.equal(questChartHoverKey({ x: 20, y: 92 }, rows, marks), "campaign");
  assert.equal(questChartHoverKey({ x: 20, y: 104 }, rows, marks), null);
  assert.equal(questChartHoverKey({ x: 41, y: 31 }, rows, marks), "campaign:home:london");
  assert.equal(questChartHoverKey({ x: 0, y: 0 }, rows, marks), null);

  const fromJournal = questChartTextRect(rows, "campaign");
  assert.deepEqual(fromJournal, { x: 10, y: 80, w: 100, h: 20 });
  assert.equal(questChartLinkSegments(fromJournal, marks, "campaign").length, 1);
  assert.equal(questChartLinkSegments(fromJournal, marks, "notes").length, 0);

  const fromMark = questChartTextRect(rows, "campaign:home:london");
  assert.equal(fromMark.h, 20);
  const markLinks = questChartLinkSegments(fromMark, marks, "campaign:home:london");
  assert.equal(markLinks.length, 1);
  assert.equal(markLinks[0].x1, 40);
});
