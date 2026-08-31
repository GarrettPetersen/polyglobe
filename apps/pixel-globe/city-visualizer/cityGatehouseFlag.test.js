import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { cityRegionalBuildingFrame } from "./cityRegionalBuildings.js";
import {
  CITY_GATEHOUSE_FLAG_HEIGHT,
  CITY_GATEHOUSE_FLAG_WIDTH,
  cityGatehouseFlagGeometry,
  cityGatehouseFlagPhase,
  cityGatehouseFlagVisible
} from "./cityGatehouseFlag.js";

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
  const northernGeometry = cityGatehouseFlagGeometry(northern);
  const middleEasternGeometry = cityGatehouseFlagGeometry(middleEastern);

  assert.equal(middleEastern.layer, "Middle East Far Wall");
  assert.equal(middleEasternGeometry.poleX, northernGeometry.poleX);
  assert.equal(
    middleEasternGeometry.poleBottomY - middleEastern.spriteSourceSize.y,
    northernGeometry.poleBottomY - northern.spriteSourceSize.y
  );
  assert.equal(middleEasternGeometry.flagWidth, CITY_GATEHOUSE_FLAG_WIDTH);
  assert.equal(middleEasternGeometry.flagHeight, CITY_GATEHOUSE_FLAG_HEIGHT);
  assert.ok(middleEasternGeometry.flagY < middleEastern.spriteSourceSize.y);
  assert.ok(middleEasternGeometry.poleBottomY > middleEastern.spriteSourceSize.y);
});

test("gatehouse flag motion is deterministic and validates time", () => {
  assert.equal(cityGatehouseFlagPhase(0), 0);
  assert.ok(cityGatehouseFlagPhase(1000) > cityGatehouseFlagPhase(500));
  assert.throws(() => cityGatehouseFlagPhase(-1), /Invalid gatehouse flag time/);
});
