import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { SHIP_STATS, shipStatsForSlug } from "./shipStats.js";
import { SHIP_SPRITE_HEADINGS } from "./shipSpriteLayout.js";
import { effectiveShipStats, emptyPerkTotals } from "./perkSystem.js";
import { sailingEfficiencyForAlignment, shipHasWindDeadZone } from "./shipPropulsion.js";
import { sailingStallWarningStrength } from "./sailingAudio.js";
import { windVFlowDirectionForScreenVector } from "./windIndicator.js";

const source = ts.createSourceFile("main.js", readFileSync(new URL("./main.js", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
const names = ["windIndicatorTarget", "updateWindIndicator", "shortestAngleDelta", "drawBattleWindIndicator"];
const code = names.map(name => source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name).getText(source)).join("\n");
const dot3 = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
function runtime() {
  const wind = { directionRad: 0, strength: 0.7 };
  const context = {
    ship: { heading: [1, 0, 0], stats: shipStatsForSlug("galleon") }, graph: {},
    camera: { right: [1, 0, 0], up: [0, 1, 0] },
    windIndicatorState: null, reducedMotionPreferred: false,
    windForShip: () => wind,
    windFlowVectorAtShip: () => context.camera.right.map((value, index) =>
      value * Math.cos(wind.directionRad + Math.PI) + context.camera.up[index] * Math.sin(wind.directionRad + Math.PI)),
    currentPlayerEffectiveShipStats: () => context.stats,
    sailingStallWarningStrength, shipHasWindDeadZone, windVFlowDirectionForScreenVector,
    dot3, clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    drawShipWindV: view => { context.battleView = view; }
  };
  context.stats = context.ship.stats;
  runInNewContext(code, context);
  return { context, wind };
}

test("wind display and warning agree with propulsion across every hull, tack, heading and windward bonus", () => {
  const { context, wind } = runtime();
  for (const base of SHIP_STATS) for (const bonus of [0, 4, 15]) {
    context.ship.stats = base;
    context.stats = effectiveShipStats(base, { ...emptyPerkTotals(), windwardAngleReductionDeg: bonus });
    const stall = context.stats.upwindStallAngleRad;
    for (let direction = 0; direction < SHIP_SPRITE_HEADINGS; direction++) {
      const headingRad = direction * 2 * Math.PI / SHIP_SPRITE_HEADINGS;
      context.ship.heading = [Math.cos(headingRad), Math.sin(headingRad), 0];
      for (const tack of [-1, 1]) for (const offset of [-0.01, 0.01, 0.15, 0.4]) {
        wind.directionRad = headingRad + tack * (stall + offset);
        const target = context.windIndicatorTarget();
        const flow = context.windFlowVectorAtShip();
        const alignment = Math.max(-1, Math.min(1, dot3(context.ship.heading, flow)));
        const stalled = shipHasWindDeadZone(context.stats) && sailingEfficiencyForAlignment(context.stats, alignment) === 0;
        assert.equal(target.stallWarning > 0, stalled, `${base.slug}, bonus=${bonus}, heading=${direction}, tack=${tack}, offset=${offset}`);
        assert.ok(Math.abs(Math.sin(target.flowDirectionRad - (wind.directionRad + Math.PI))) < 1e-10);
        assert.ok(Math.cos(target.flowDirectionRad - (wind.directionRad + Math.PI)) > 0);
      }
    }
  }
});

test("the arrow preserves all 32 headings and intermediate wind angles in any camera orientation", () => {
  const { context, wind } = runtime();
  assert.equal(SHIP_SPRITE_HEADINGS, 32);
  for (const rotation of [0, 0.7, 2.4]) {
    context.camera = { right: [Math.cos(rotation), Math.sin(rotation), 0], up: [-Math.sin(rotation), Math.cos(rotation), 0] };
    for (let index = 0; index < SHIP_SPRITE_HEADINGS; index++) for (const fraction of [0, 0.37]) {
      wind.directionRad = (index + fraction) * 2 * Math.PI / SHIP_SPRITE_HEADINGS;
      context.updateWindIndicator();
      assert.ok(Math.cos(context.windIndicatorState.flowDirectionRad - wind.directionRad - Math.PI) > 1 - 1e-12);
    }
  }
});

test("a tack or newly acquired windward bonus clears the flash immediately, including reduced motion", () => {
  for (const reducedMotion of [false, true]) for (const escape of ["tack", "bonus"]) {
    const { context, wind } = runtime();
    context.reducedMotionPreferred = reducedMotion;
    wind.directionRad = context.stats.upwindStallAngleRad - 0.01;
    context.updateWindIndicator();
    assert.equal(context.windIndicatorState.stallWarning, 1);
    if (escape === "tack") context.ship.heading = [-1, 0, 0];
    else context.stats = effectiveShipStats(context.ship.stats, { ...emptyPerkTotals(), windwardAngleReductionDeg: 4 });
    assert.equal(context.updateWindIndicator(), true);
    assert.equal(context.windIndicatorState.stallWarning, 0);
    assert.equal(context.updateWindIndicator(), false, "an unchanged clear course needs no pulse redraw");
  }
});

test("lake and historical battle indicators also stop flashing outside their ship's no-go angle", () => {
  const { context } = runtime();
  for (const offset of [-0.01, 0.01, 0.15]) {
    const angle = context.stats.upwindStallAngleRad + offset;
    context.drawBattleWindIndicator({ centerX: 100, centerY: 100, flow: { x: -1, y: 0 },
      heading: { x: Math.cos(angle), y: Math.sin(angle) }, stats: context.stats, strength: 0.7, nowMs: 0 });
    assert.equal(context.battleView.warning, offset < 0 ? 1 : 0);
  }
});
