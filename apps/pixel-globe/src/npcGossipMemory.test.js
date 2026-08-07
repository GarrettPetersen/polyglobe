import assert from "node:assert/strict";
import test from "node:test";

import {
  NPC_GOSSIP_REPEAT_DAYS,
  npcGossipId,
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
