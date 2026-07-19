import assert from "node:assert/strict";
import test from "node:test";

import {
  LANGUAGE_CHINESE_SIMPLIFIED,
  LANGUAGE_ENGLISH,
  LANGUAGE_JAPANESE
} from "./localization.js";
import {
  STATUS_HUD_TOOLTIP_CREW,
  STATUS_HUD_TOOLTIP_DATE,
  STATUS_HUD_TOOLTIP_FOOD,
  STATUS_HUD_TOOLTIP_WATER,
  statusHudTooltipTargetAtPoint,
  statusHudTooltipTargets,
  statusHudTooltipText
} from "./statusHudTooltips.js";

const GEOMETRY = Object.freeze({ x: 5, y: 5, width: 120, height: 58, titleSplitX: 77 });

test("status HUD targets divide the title and supply rows without overlap", () => {
  const targets = statusHudTooltipTargets(GEOMETRY);
  assert.equal(targets.length, 6);
  assert.equal(statusHudTooltipTargetAtPoint({ x: 10, y: 8 }, GEOMETRY).id, STATUS_HUD_TOOLTIP_DATE);
  assert.equal(statusHudTooltipTargetAtPoint({ x: 100, y: 8 }, GEOMETRY).id, "doubloons");
  assert.equal(statusHudTooltipTargetAtPoint({ x: 10, y: 29 }, GEOMETRY).id, STATUS_HUD_TOOLTIP_WATER);
  assert.equal(statusHudTooltipTargetAtPoint({ x: 10, y: 39 }, GEOMETRY).id, STATUS_HUD_TOOLTIP_FOOD);
  assert.equal(statusHudTooltipTargetAtPoint({ x: 10, y: 57 }, GEOMETRY).id, STATUS_HUD_TOOLTIP_CREW);
  assert.equal(statusHudTooltipTargetAtPoint({ x: 130, y: 8 }, GEOMETRY), null);
});

test("status HUD tooltip copy is fully localized", () => {
  assert.equal(
    statusHudTooltipText(LANGUAGE_ENGLISH, STATUS_HUD_TOOLTIP_FOOD, { days: 9 }),
    "9 days of food remain"
  );
  assert.equal(
    statusHudTooltipText(LANGUAGE_ENGLISH, STATUS_HUD_TOOLTIP_WATER, { days: 1 }),
    "1 day of drinkable water remains"
  );
  assert.equal(
    statusHudTooltipText(LANGUAGE_ENGLISH, STATUS_HUD_TOOLTIP_CREW, { crew: 6, passengers: 1 }),
    "6 crew + 1 passenger aboard"
  );
  assert.equal(
    statusHudTooltipText(LANGUAGE_CHINESE_SIMPLIFIED, STATUS_HUD_TOOLTIP_CREW, { crew: 6, passengers: 1 }),
    "船上有6名船员＋1名乘客"
  );
  assert.equal(
    statusHudTooltipText(LANGUAGE_JAPANESE, STATUS_HUD_TOOLTIP_WATER, { days: 9 }),
    "飲料水はあと9日分"
  );
});
