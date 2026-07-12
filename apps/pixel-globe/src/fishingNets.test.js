import assert from "node:assert/strict";
import test from "node:test";

import {
  BASIC_FISHING_NET_ID,
  FISHING_NETS,
  fishingNetById,
  npcFishingNetExpectedHaul,
  npcFishingNetForSeed
} from "./fishingNets.js";

test("fishing nets form an increasingly capable and expensive equipment ramp", () => {
  assert.equal(FISHING_NETS[0].id, BASIC_FISHING_NET_ID);
  assert.equal(FISHING_NETS[0].price, 0);
  for (let index = 1; index < FISHING_NETS.length; index++) {
    assert.ok(FISHING_NETS[index].price > FISHING_NETS[index - 1].price);
    assert.ok(FISHING_NETS[index].catchRateMultiplier > FISHING_NETS[index - 1].catchRateMultiplier);
    assert.ok(FISHING_NETS[index].maxCatch > FISHING_NETS[index - 1].maxCatch);
  }
  assert.equal(fishingNetById("masterwork-seine").price, 15000);
});

test("NPC fishermen usually receive cheap nets but can carry every tier", () => {
  const counts = new Map(FISHING_NETS.map((net) => [net.id, 0]));
  for (let seed = 0; seed < 2000; seed++) {
    const net = npcFishingNetForSeed(seed, 30);
    counts.set(net.id, counts.get(net.id) + 1);
  }

  assert.ok(FISHING_NETS.every((net) => counts.get(net.id) > 0));
  assert.ok(counts.get(BASIC_FISHING_NET_ID) > counts.get("weighted-cast-net"));
  assert.ok(counts.get("weighted-cast-net") > counts.get("drift-net"));
  assert.ok(counts.get("drift-net") > counts.get("masterwork-seine"));
});

test("NPC expected hauls respect each net's maximum capacity", () => {
  assert.equal(npcFishingNetExpectedHaul(BASIC_FISHING_NET_ID), 1);
  assert.equal(npcFishingNetExpectedHaul("weighted-cast-net"), 3);
  assert.equal(npcFishingNetExpectedHaul("drift-net"), 7);
  assert.equal(npcFishingNetExpectedHaul("masterwork-seine"), 10);
});
