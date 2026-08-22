import assert from "node:assert/strict";
import test from "node:test";

import { FACTIONS } from "./factions.js";
import {
  BOHEMIAN_SUCCESSION_MINUTE,
  BOHEMIAN_SUCCESSION_FLAG,
  FIRST_BATTLE_OF_PANIPAT_MINUTE,
  MUGHAL_SUCCESSION_FLAG,
  advanceHistoricalSovereignty,
  nextHistoricalSovereigntyMinute
} from "./historicalSovereignty.js";
import {
  applyPortConquestOwnership,
  createPortConquestMemory
} from "./portConquest.js";
import {
  createSovereignAuthority,
  sovereignAuthorityScore
} from "./sovereignAuthority.js";
import {
  createWorldDiplomacy,
  diplomaticContactBetween,
  rawWorldDiplomacyBetween
} from "./worldDiplomacy.js";
import {
  SUZERAINTY_KIND_PERSONAL_UNION,
  establishSuzerainty,
  releaseVassal,
  suzeraintyForVassal
} from "./suzerainty.js";

test("Panipat replaces the surviving Lodi state with the Mughal Empire", () => {
  const state = historicalState("delhi");
  const ports = historicalPorts();
  state.memory.conquest.portFactionOverrides.lahore = "portugal";
  state.relations.diplomacy.overrides["bengal|delhi"] = "friendly";
  state.relations.factionReputation.delhi = 27;
  state.relations.lettersOfMarque.delhi = { factionId: "delhi", simMinute: 10 };
  state.relations.safePassageUntilMinute.delhi = 500;

  assert.equal(nextHistoricalSovereigntyMinute(state), FIRST_BATTLE_OF_PANIPAT_MINUTE);
  assert.deepEqual(advanceHistoricalSovereignty(
    state,
    FIRST_BATTLE_OF_PANIPAT_MINUTE - 1,
    { portCities: ports }
  ), []);
  const [transition] = advanceHistoricalSovereignty(
    state,
    FIRST_BATTLE_OF_PANIPAT_MINUTE,
    { portCities: ports }
  );

  assert.equal(transition.playerFactionChanged, true);
  assert.equal(state.playerCharacter.nationalityId, "mughal");
  assert.equal(state.memory.flags[MUGHAL_SUCCESSION_FLAG], "completed");
  assert.equal(nextHistoricalSovereigntyMinute(state), BOHEMIAN_SUCCESSION_MINUTE);
  assert.ok(state.memory.conquest.collapsedFactionIds.includes("delhi"));
  assert.ok(!state.memory.conquest.collapsedFactionIds.includes("mughal"));
  assert.equal(state.memory.conquest.factionSuccessors.delhi, "mughal");
  applyPortConquestOwnership(state.memory.conquest, ports);
  assert.equal(ports[0].factionId, "mughal");
  assert.equal(ports[0].capitalOfFactionId, "mughal");
  assert.equal(ports[1].factionId, "mughal");
  assert.equal(ports[3].factionId, "portugal", "third-party conquest must survive Panipat");
  assert.equal(rawWorldDiplomacyBetween(state.relations.diplomacy, "mughal", "bengal"), "friendly");
  assert.equal(diplomaticContactBetween(state.relations.diplomacy, "mughal", "bengal").portCalls, 1);
  assert.equal(state.relations.factionReputation.mughal, 27);
  assert.equal(state.relations.lettersOfMarque.mughal.factionId, "mughal");
  assert.equal(state.relations.lettersOfMarque.delhi, undefined);
  assert.equal(state.relations.safePassageUntilMinute.mughal, 500);
  assert.equal(sovereignAuthorityScore(state.relations.authority, "mughal"), 80);
  assert.equal(state.relations.diplomacy.history[0].kind, "succession");
});

test("Panipat does not overwrite a divergent campaign where Agra already fell", () => {
  const state = historicalState("portugal");
  const ports = historicalPorts();
  state.memory.conquest.portFactionOverrides.agra = "portugal";

  assert.deepEqual(advanceHistoricalSovereignty(
    state,
    FIRST_BATTLE_OF_PANIPAT_MINUTE + 100,
    { portCities: ports }
  ), []);
  assert.equal(state.memory.flags[MUGHAL_SUCCESSION_FLAG], "averted");
  assert.ok(state.memory.conquest.collapsedFactionIds.includes("mughal"));
  assert.ok(!state.memory.conquest.collapsedFactionIds.includes("delhi"));
});

test("Louis II's death transfers Bohemia's dynastic union without annexing its sovereignty", () => {
  const state = historicalState("bohemia");
  state.memory.flags[MUGHAL_SUCCESSION_FLAG] = "averted";
  const ports = historicalPorts();
  const [transition] = advanceHistoricalSovereignty(
    state,
    BOHEMIAN_SUCCESSION_MINUTE,
    { portCities: ports }
  );
  assert.equal(transition.id, "bohemian-succession");
  assert.equal(state.memory.flags[BOHEMIAN_SUCCESSION_FLAG], "completed");
  const union = suzeraintyForVassal(state.relations.diplomacy.suzerainties, "bohemia");
  assert.equal(union.suzerainFactionId, "habsburg");
  assert.equal(union.kind, SUZERAINTY_KIND_PERSONAL_UNION);
  assert.equal(state.playerCharacter.nationalityId, "bohemia");
  assert.ok(!state.memory.conquest.collapsedFactionIds.includes("bohemia"));
});

test("the 1526 succession preserves a player-created divergent Bohemian union", () => {
  const state = historicalState("bohemia");
  state.memory.flags[MUGHAL_SUCCESSION_FLAG] = "averted";
  const suzerainties = state.relations.diplomacy.suzerainties;
  releaseVassal(suzerainties, { vassalFactionId: "bohemia", simMinute: 10, source: "player" });
  establishSuzerainty(suzerainties, {
    vassalFactionId: "bohemia",
    suzerainFactionId: "france",
    kind: SUZERAINTY_KIND_PERSONAL_UNION,
    simMinute: 11,
    source: "player"
  });
  assert.deepEqual(advanceHistoricalSovereignty(
    state,
    BOHEMIAN_SUCCESSION_MINUTE,
    { portCities: historicalPorts() }
  ), []);
  assert.equal(state.memory.flags[BOHEMIAN_SUCCESSION_FLAG], "averted");
  assert.equal(suzeraintyForVassal(suzerainties, "bohemia").suzerainFactionId, "france");
});

function historicalState(playerFactionId) {
  return {
    playerCharacter: Object.freeze({ nationalityId: playerFactionId }),
    memory: {
      flags: {},
      conquest: createPortConquestMemory()
    },
    relations: {
      diplomacy: createWorldDiplomacy({ seedKey: "panipat" }),
      authority: createSovereignAuthority({ seedKey: "panipat" }),
      factionReputation: Object.fromEntries(FACTIONS.map(({ id }) => [id, 0])),
      lettersOfMarque: {},
      safePassageUntilMinute: {},
      safePassageRefusalUntilMinute: {}
    }
  };
}

function historicalPorts() {
  return [
    city(1, "agra", "Agra", "India", { capitalOfFactionId: "delhi" }),
    city(2, "delhi", "Delhi", "India"),
    city(3, "jaunpur", "Jaunpur", "India"),
    city(4, "lahore", "Lahore", "Pakistan")
  ];
}

function city(tileId, portId, cityName, country, details = {}) {
  return {
    tileId,
    portId,
    city: cityName,
    displayCity: cityName,
    country,
    factionId: "delhi",
    isFactionCapital: details.capitalOfFactionId === "delhi",
    capitalOfFactionId: details.capitalOfFactionId || null
  };
}
