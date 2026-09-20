import assert from "node:assert/strict";
import test from "node:test";

import {
  NPC_GOSSIP_REPEAT_DAYS,
  npcGossipId,
  reconcileNpcGossipMemory,
  recordNpcGossipHeard,
  unheardNpcGossip
} from "./npcGossipMemory.js";
import { WEATHER_MINUTES_PER_DAY } from "./weather.js";

const HISTORY = Object.freeze({ id: "diet-of-worms" });
const RULER_CHANGE = Object.freeze({
  factionId: "france",
  fromMinute: 720,
  displayName: "King Francis I"
});

test("recently heard NPC gossip is omitted until its voyage cooldown expires", () => {
  const decisions = {};
  recordNpcGossipHeard(decisions, HISTORY, 0);

  assert.equal(unheardNpcGossip(decisions, HISTORY, 1), null);
  assert.equal(
    unheardNpcGossip(
      decisions,
      HISTORY,
      NPC_GOSSIP_REPEAT_DAYS * WEATHER_MINUTES_PER_DAY - 1
    ),
    null
  );
  assert.equal(
    unheardNpcGossip(decisions, HISTORY, NPC_GOSSIP_REPEAT_DAYS * WEATHER_MINUTES_PER_DAY),
    HISTORY
  );
});

test("different gossip remains eligible and ruler changes have stable identities", () => {
  const decisions = {};
  recordNpcGossipHeard(decisions, HISTORY, 120);

  const other = Object.freeze({ id: "fall-of-rhodes" });
  assert.equal(unheardNpcGossip(decisions, other, 120), other);
  assert.equal(npcGossipId(RULER_CHANGE), "ruler-change:france:720:King Francis I");
});

test("different perspectives can report the same event once each", () => {
  const decisions = {};
  recordNpcGossipHeard(decisions, HISTORY, 120, "catholic");

  assert.equal(unheardNpcGossip(decisions, HISTORY, 121, "catholic"), null);
  assert.equal(unheardNpcGossip(decisions, HISTORY, 121, "protestant"), HISTORY);
});

test("gossip memory rejects duplicate recording inside the cooldown", () => {
  const decisions = {};
  recordNpcGossipHeard(decisions, HISTORY, 300);

  assert.throws(
    () => recordNpcGossipHeard(decisions, HISTORY, 301),
    /repeated before its cooldown elapsed/
  );
});

test("restored gossip timestamps ahead of the voyage clock retain a fresh cooldown", () => {
  const decisions = { unrelated: 900 };
  recordNpcGossipHeard(decisions, HISTORY, 600);

  assert.equal(reconcileNpcGossipMemory(decisions, 120), 1);
  assert.equal(decisions.unrelated, 900, "other decision clock domains are untouched");
  assert.equal(unheardNpcGossip(decisions, HISTORY, 120), null);
  assert.equal(
    unheardNpcGossip(decisions, HISTORY, 120 + NPC_GOSSIP_REPEAT_DAYS * WEATHER_MINUTES_PER_DAY),
    HISTORY
  );
  assert.equal(reconcileNpcGossipMemory(decisions, 120), 0);
});

test("restored gossip reconciliation rejects corrupt timestamps", () => {
  const decisions = {};
  recordNpcGossipHeard(decisions, HISTORY, 10);
  decisions[Object.keys(decisions)[0]] = Number.NaN;
  assert.throws(() => reconcileNpcGossipMemory(decisions, 20), /Invalid NPC gossip memory/);
});
