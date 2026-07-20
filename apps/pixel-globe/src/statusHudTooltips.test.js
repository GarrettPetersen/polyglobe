import assert from "node:assert/strict";
import test from "node:test";

import {
  LANGUAGE_CHINESE_SIMPLIFIED,
  LANGUAGE_ENGLISH,
  LANGUAGE_JAPANESE,
  SUPPORTED_LANGUAGES,
  translate
} from "./localization.js";
import {
  STATUS_HUD_TOOLTIP_CARGO,
  STATUS_HUD_TOOLTIP_CREW,
  STATUS_HUD_TOOLTIP_DATE,
  STATUS_HUD_TOOLTIP_FOOD,
  STATUS_HUD_TOOLTIP_WATER,
  statusHudTooltipTargetAtPoint,
  statusHudTooltipTargets,
  statusHudTooltipText
} from "./statusHudTooltips.js";

const GEOMETRY = Object.freeze({ x: 5, y: 5, width: 275, height: 58, titleSplitX: 77 });

test("status HUD targets divide the title and supply rows without overlap", () => {
  const targets = statusHudTooltipTargets(GEOMETRY);
  assert.equal(targets.length, 6);
  assert.equal(statusHudTooltipTargetAtPoint({ x: 10, y: 8 }, GEOMETRY).id, STATUS_HUD_TOOLTIP_DATE);
  assert.equal(statusHudTooltipTargetAtPoint({ x: 100, y: 8 }, GEOMETRY).id, "doubloons");
  assert.equal(statusHudTooltipTargetAtPoint({ x: 10, y: 20 }, GEOMETRY).id, STATUS_HUD_TOOLTIP_WATER);
  assert.equal(statusHudTooltipTargetAtPoint({ x: 10, y: 30 }, GEOMETRY).id, STATUS_HUD_TOOLTIP_FOOD);
  assert.equal(statusHudTooltipTargetAtPoint({ x: 10, y: 40 }, GEOMETRY).id, STATUS_HUD_TOOLTIP_CREW);
  assert.equal(statusHudTooltipTargetAtPoint({ x: 10, y: 50 }, GEOMETRY).id, STATUS_HUD_TOOLTIP_CARGO);
  assert.equal(statusHudTooltipTargetAtPoint({ x: 290, y: 8 }, GEOMETRY), null);
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
  assert.equal(
    statusHudTooltipText(LANGUAGE_ENGLISH, STATUS_HUD_TOOLTIP_CARGO, { used: 12, capacity: 115 }),
    "CARGO HOLD: 12/115"
  );
  assert.equal(
    statusHudTooltipText(LANGUAGE_CHINESE_SIMPLIFIED, STATUS_HUD_TOOLTIP_CARGO, { used: 12, capacity: 115 }),
    "货舱: 12/115"
  );
});

test("cargo hold tooltip is localized in every supported language", () => {
  for (const { id } of SUPPORTED_LANGUAGES) {
    const text = statusHudTooltipText(id, STATUS_HUD_TOOLTIP_CARGO, { used: 12, capacity: 115 });
    assert.equal(text, `${translate(id, "ship.cargoHold")}: 12/115`, id);
  }
});
