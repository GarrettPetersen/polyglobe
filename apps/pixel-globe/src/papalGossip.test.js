import assert from "node:assert/strict";
import test from "node:test";

import { createWorldDiplomacy } from "./worldDiplomacy.js";
import {
  PAPAL_ACTION_CRUSADE,
  PAPAL_ACTION_EXCOMMUNICATION,
  createPapalPolitics,
  imposePapalAction
} from "./papalPolitics.js";
import {
  PAPAL_GOSSIP_DAYS,
  papalGossipDialogueLine,
  recentPapalGossipForCharacter,
  recentPapalGossipForPort
} from "./papalGossip.js";
import { WEATHER_MINUTES_PER_DAY } from "./weather.js";

test("European port factors gossip about recent papal actions", () => {
  const { papacy } = papalAction(PAPAL_ACTION_EXCOMMUNICATION, "france", 100);
  const gossip = recentPapalGossipForPort(papacy, {
    city: "Lisbon",
    cityType: "northern-european"
  }, 101);

  assert.match(gossip.report, /excommunicated King Francis I/);
  assert.equal(gossip.place, "Rome");
});

test("papal news reaches some European captains but not non-European speakers", () => {
  const { papacy } = papalAction(PAPAL_ACTION_CRUSADE, "ottoman", 200);
  const european = recentPapalGossipForCharacter(
    papacy,
    { name: "Anne", region: "northern-europe" },
    201,
    { interactionKey: "ship:test", chanceDenominator: 1 }
  );
  const asian = recentPapalGossipForCharacter(
    papacy,
    { name: "Li", region: "east-asia" },
    201,
    { interactionKey: "ship:test", chanceDenominator: 1 }
  );

  assert.match(papalGossipDialogueLine(european), /News from Rome.*crusade.*Ottoman/i);
  assert.equal(asian, null);
});

test("papal gossip expires after six months", () => {
  const simMinute = 300;
  const { papacy } = papalAction(PAPAL_ACTION_CRUSADE, "ottoman", simMinute);
  const port = { city: "Venice", cityType: "mediterranean" };

  assert.ok(recentPapalGossipForPort(
    papacy,
    port,
    simMinute + PAPAL_GOSSIP_DAYS * WEATHER_MINUTES_PER_DAY
  ));
  assert.equal(recentPapalGossipForPort(
    papacy,
    port,
    simMinute + PAPAL_GOSSIP_DAYS * WEATHER_MINUTES_PER_DAY + 1
  ), null);
});

function papalAction(kind, targetFactionId, simMinute) {
  const papacy = createPapalPolitics({ seedKey: `${kind}|${targetFactionId}` });
  const diplomacy = createWorldDiplomacy({ seedKey: `${kind}|${targetFactionId}` });
  imposePapalAction(papacy, diplomacy, {
    kind,
    targetFactionId,
    simMinute,
    source: "test"
  });
  return { papacy, diplomacy };
}
