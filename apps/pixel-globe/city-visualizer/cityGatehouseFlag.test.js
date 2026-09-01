import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { cityRegionalBuildingFrame } from "./cityRegionalBuildings.js";
import {
  CITY_GATEHOUSE_FLAG_HEIGHT,
  CITY_GATEHOUSE_FLAG_SCALE,
  CITY_GATEHOUSE_FLAG_WIDTH,
  cityGatehouseFlagGeometry,
  cityGatehouseFlagPhase,
  cityGatehouseFlagVisible
} from "./cityGatehouseFlag.js";
import {
  flagFabricColumnLayout,
  flagWindPose
} from "../src/flagAnimation.js";

const FRAMES = JSON.parse(readFileSync(
  new URL("./assets/port-parallax/manifest.json", import.meta.url),
  "utf8"
)).staticFrames;

test("only fortified cities with a national flag fly a gatehouse flag", () => {
  assert.equal(cityGatehouseFlagVisible({ fortified: true, factionId: "ottoman" }), true);
  assert.equal(cityGatehouseFlagVisible({ fortified: false, factionId: "ottoman" }), false);
  assert.equal(cityGatehouseFlagVisible({ fortified: true, factionId: "neutral" }), false);
});

test("the national flag stays attached to the far tower across regional variants", () => {
  const northern = FRAMES.find(({ layer }) => layer === "Far Castle");
  const middleEastern = cityRegionalBuildingFrame(FRAMES, "islamic-desert", "Far Castle");
  const chinese = cityRegionalBuildingFrame(FRAMES, "east-asian", "Far Castle");
  const northernGeometry = cityGatehouseFlagGeometry(northern);

  assert.equal(middleEastern.layer, "Middle East Far Wall");
  assert.equal(chinese.layer, "China Gate Far");
  for (const regional of [middleEastern, chinese]) {
    const regionalGeometry = cityGatehouseFlagGeometry(regional);
    assert.equal(regionalGeometry.poleX, northernGeometry.poleX);
    assert.equal(
      regionalGeometry.poleBottomY - regional.spriteSourceSize.y,
      northernGeometry.poleBottomY - northern.spriteSourceSize.y
    );
    assert.equal(regionalGeometry.flagWidth, CITY_GATEHOUSE_FLAG_WIDTH);
    assert.equal(regionalGeometry.flagHeight, CITY_GATEHOUSE_FLAG_HEIGHT);
    assert.equal(regionalGeometry.waveAmplitudeScale, CITY_GATEHOUSE_FLAG_SCALE);
    assert.ok(regionalGeometry.flagY < regional.spriteSourceSize.y);
    assert.ok(regionalGeometry.poleBottomY > regional.spriteSourceSize.y);
  }
  assert.ok(CITY_GATEHOUSE_FLAG_WIDTH >= 14 * 2 && CITY_GATEHOUSE_FLAG_WIDTH <= 14 * 3);
  assert.ok(CITY_GATEHOUSE_FLAG_HEIGHT >= 9 * 2 && CITY_GATEHOUSE_FLAG_HEIGHT <= 9 * 3);
});

test("the enlarged gatehouse flag keeps the shared wind flip and fabric deformation", () => {
  const eastward = flagWindPose(0, 1);
  const westward = flagWindPose(Math.PI, 1);
  assert.equal(eastward.flyDirection, 1);
  assert.equal(westward.flyDirection, -1);
  const layout = flagFabricColumnLayout(
    CITY_GATEHOUSE_FLAG_WIDTH,
    CITY_GATEHOUSE_FLAG_HEIGHT,
    eastward
  );
  assert.equal(layout.fabricWidth, CITY_GATEHOUSE_FLAG_WIDTH);
  assert.equal(layout.columns[0].height, CITY_GATEHOUSE_FLAG_HEIGHT);
});

test("gatehouse flag motion is deterministic and validates time", () => {
  assert.equal(cityGatehouseFlagPhase(0), 0);
  assert.ok(cityGatehouseFlagPhase(1000) > cityGatehouseFlagPhase(500));
  assert.throws(() => cityGatehouseFlagPhase(-1), /Invalid gatehouse flag time/);
});
