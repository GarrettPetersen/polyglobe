import assert from "node:assert/strict";
import test from "node:test";

import {
  CHART_REFRAME_OPAQUE_COVER_KINDS,
  chartReframeCoverIsOpaque,
  chartShouldReframeOnCoverOpen,
  coldCoveredWorldDefersFullRender,
  coveredWorldPreparationNeedsRestart,
  coveredWorldPreparationIsRequired,
  gameOverReframeCoverIsOpaque
} from "./chartReframeCover.js";

test("live sailing without dialogue does not qualify as hidden chart cover", () => {
  assert.equal(chartReframeCoverIsOpaque({}), false);
  assert.equal(chartReframeCoverIsOpaque({ fullPortDialogue: false }), false);
});

test("every declared opaque cover can hide a correction", () => {
  for (const coverKind of CHART_REFRAME_OPAQUE_COVER_KINDS) {
    assert.equal(
      chartReframeCoverIsOpaque({ [coverKind]: true }),
      true,
      `${coverKind} should be opaque`
    );
  }
});

test("unknown and malformed cover state fails instead of hiding policy drift", () => {
  assert.throws(
    () => chartReframeCoverIsOpaque({ portCitySceneReady: true }),
    /Unknown chart reframe cover kind: portCitySceneReady/
  );
  assert.throws(
    () => chartReframeCoverIsOpaque({ portCityScene: 1 }),
    /Chart reframe cover portCityScene must be boolean/
  );
});

test("opaque cover only hides a costly chart rebuild when repair is severe", () => {
  assert.equal(chartShouldReframeOnCoverOpen({
    coverIsActive: true,
    coverWasActive: false,
    repairRequired: true
  }), true);
  assert.equal(chartShouldReframeOnCoverOpen({
    coverIsActive: true,
    coverWasActive: true,
    repairRequired: true
  }), false);
  assert.equal(chartShouldReframeOnCoverOpen({
    coverIsActive: false,
    coverWasActive: false,
    repairRequired: true
  }), false);
  assert.equal(chartShouldReframeOnCoverOpen({
    coverIsActive: true,
    coverWasActive: false,
    repairRequired: false
  }), false);
});

test("a sinking voyage only becomes opaque cover after the ship animation", () => {
  assert.equal(gameOverReframeCoverIsOpaque({
    active: true,
    sinkShip: true,
    elapsedMs: 0,
    sinkDurationMs: 5200
  }), false);
  assert.equal(gameOverReframeCoverIsOpaque({
    active: true,
    sinkShip: true,
    elapsedMs: 5199,
    sinkDurationMs: 5200
  }), false);
  assert.equal(gameOverReframeCoverIsOpaque({
    active: true,
    sinkShip: true,
    elapsedMs: 5200,
    sinkDurationMs: 5200
  }), true);
  assert.equal(gameOverReframeCoverIsOpaque({
    active: true,
    sinkShip: false,
    elapsedMs: 0,
    sinkDurationMs: 0
  }), true);
});

test("a cold opaque menu defers its first full world render", () => {
  assert.equal(coldCoveredWorldDefersFullRender({
    worldFramePresented: false,
    coverIsActive: true,
    gameOver: false
  }), true);
  assert.equal(coldCoveredWorldDefersFullRender({
    worldFramePresented: false,
    coverIsActive: true,
    gameOver: true
  }), false);
  assert.equal(coldCoveredWorldDefersFullRender({
    worldFramePresented: true,
    coverIsActive: true,
    gameOver: false
  }), false);
  assert.equal(coldCoveredWorldDefersFullRender({
    worldFramePresented: false,
    coverIsActive: false,
    gameOver: false
  }), false);
});

test("covered preparation runs before or after the first world frame exists", () => {
  assert.equal(coveredWorldPreparationIsRequired({
    coverIsActive: true,
    renderPending: true,
    gameOver: false
  }), true);
  assert.equal(coveredWorldPreparationIsRequired({
    coverIsActive: true,
    renderPending: false,
    gameOver: false
  }), false);
  assert.equal(coveredWorldPreparationIsRequired({
    coverIsActive: true,
    renderPending: true,
    gameOver: true
  }), false);
});

test("covered preparation restarts after its chart is replaced", () => {
  const firstChart = {};
  const replacementChart = {};
  assert.equal(coveredWorldPreparationNeedsRestart(null, firstChart), true);
  assert.equal(coveredWorldPreparationNeedsRestart({ chart: firstChart }, firstChart), false);
  assert.equal(coveredWorldPreparationNeedsRestart({ chart: firstChart }, replacementChart), true);
});
