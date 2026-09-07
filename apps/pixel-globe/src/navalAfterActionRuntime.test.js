import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { navalAfterActionReady } from "./navalCasualtyReport.js";
const source = ts.createSourceFile("main.js", readFileSync(new URL("./main.js", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
const code = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "updateNavalAfterAction").getText(source);
test("casualty calm clock starts at engagement end and resets for player projectiles and menus", () => {
  let engaged = true;
  const context = { gameState: { memory: { navalCasualties: [{}] }, playerCharacter: {} },
    navalAfterActionQuietSinceMs: null, ship: { navalProjectiles: [] }, npcCombatProjectiles: [],
    playerHasCombatEngagement: () => engaged, PLAYER_COMBAT_ID: "player",
    startMenu: null, gameOverReason: null, dialogueState: null, captainAlertModal: null,
    portAssaultState: null, menusAreOpen: () => false, queuedCharacterAlertSteps: [], characterAlertSequenceCompletion: null,
    navalAfterActionReady, navalCasualtyReport: () => ({}),
    openCharacterAlertModal: () => { context.captainAlertModal = {}; return true; } };
  const update = runInNewContext(`${code}; updateNavalAfterAction`, context);
  assert.equal(update(10000), false);
  engaged = false;
  assert.equal(update(20000), false);
  assert.equal(update(27999), false);
  context.ship.navalProjectiles.push({});
  assert.equal(update(28000), false);
  context.ship.navalProjectiles.length = 0;
  assert.equal(update(30000), false);
  context.dialogueState = {};
  assert.equal(update(38000), false);
  context.dialogueState = null;
  assert.equal(update(40000), false);
  assert.equal(update(47999), false);
  assert.equal(update(48000), true);
});
