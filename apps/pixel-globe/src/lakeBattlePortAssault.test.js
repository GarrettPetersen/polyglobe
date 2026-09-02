import assert from "node:assert/strict";
import test from "node:test";
import { PORT_CITY_LOCATION } from "./portCityNavigation.js";
import {
  LAKE_BATTLE_PORT_ASSAULT_CITY_DESTINATION_IDS,
  lakeBattleOffersPortAssault,
  lakeBattlePortAssaultPaletteVariant
} from "./lakeBattlePortAssault.js";

test("the assault city scene retains its required ship destination before combat starts", () => {
  assert.deepEqual(LAKE_BATTLE_PORT_ASSAULT_CITY_DESTINATION_IDS, [
    PORT_CITY_LOCATION.SHIP,
    PORT_CITY_LOCATION.SET_SAIL
  ]);
});

test("the daytime Duel assault passes the renderer's ungraded palette contract", () => {
  assert.equal(lakeBattlePortAssaultPaletteVariant(), null);
});

test("only a naval victory over a city offers the landing assault", () => {
  assert.equal(lakeBattleOffersPortAssault({ outcome: "victory", enemy: { kind: "city" } }), true);
  assert.equal(lakeBattleOffersPortAssault({ outcome: "defeat", enemy: { kind: "city" } }), false);
  assert.equal(lakeBattleOffersPortAssault({ outcome: "draw", enemy: { kind: "city" } }), false);
  assert.equal(lakeBattleOffersPortAssault({ outcome: "victory", enemy: { kind: "ship" } }), false);
});

test("port assault availability rejects malformed battle contracts", () => {
  assert.throws(() => lakeBattleOffersPortAssault(null), /requires a battle/);
  assert.throws(
    () => lakeBattleOffersPortAssault({ outcome: "victory", enemy: { kind: "fort" } }),
    /enemy combatant/
  );
  assert.throws(
    () => lakeBattleOffersPortAssault({ outcome: "won", enemy: { kind: "city" } }),
    /Unknown lake battle outcome/
  );
});
