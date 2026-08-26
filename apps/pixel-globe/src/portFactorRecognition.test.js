import assert from "node:assert/strict";
import test from "node:test";

import { createGameState } from "./gameState.js";
import {
  playerPirateVictoryCount,
  portFactorRecognitionForCaptain
} from "./portFactorRecognition.js";

const istanbul = Object.freeze({
  tileId: 41,
  city: "Istanbul",
  displayCity: "Istanbul",
  country: "Türkiye",
  factionId: "ottoman",
  population: 400_000
});
const rhodes = Object.freeze({
  tileId: 42,
  city: "Rhodes",
  displayCity: "Rhodes",
  country: "Greece",
  factionId: "hospitallers",
  population: 90_000
});

function recognition(state, overrides = {}) {
  return portFactorRecognitionForCaptain({
    gameState: state,
    city: istanbul,
    cities: [istanbul, rhodes],
    personalityId: "cordial",
    visitCount: 2,
    dayIndex: 900,
    simMinute: 900 * 24 * 60,
    ...overrides
  });
}

test("a factor calls the captain the hero of a major enemy port taken for the realm", () => {
  const state = createGameState({ cargoCapacity: 20 });
  state.memory.conquest.events.push({
    id: "capture-rhodes",
    portId: "rhodes|greece",
    cityTileId: rhodes.tileId,
    cityName: "Rhodes",
    previousFactionId: "hospitallers",
    newFactionId: "ottoman",
    capitalCapturedFactionId: "hospitallers",
    collapsedFactionId: null,
    peaceTreatyId: null,
    simMinute: 890 * 24 * 60,
    source: "player"
  });

  const result = recognition(state);
  assert.equal(result.kind, "hero-of-port");
  assert.match(result.text, /Hero of Rhodes/);
});

test("a wealthy captain is received as a magnate rather than an ordinary carrier", () => {
  const state = createGameState({ cargoCapacity: 20 });
  state.doubloons = 1_250_000;

  const result = recognition(state);
  assert.equal(result.kind, "magnate");
  assert.match(result.text, /credit|royal squadron/i);
});

test("pirate recognition uses tracked victories and legacy rescue history", () => {
  const state = createGameState({ cargoCapacity: 20 });
  state.memory.decisions["combat.victory.pirate"] = 7;
  state.memory.quests.pirateCaptive.completedCount = 2;
  assert.equal(playerPirateVictoryCount(state), 7);

  const result = recognition(state);
  assert.equal(result.kind, "pirate-scourge");
  assert.match(result.text, /Pirates|black flags/);
});

test("factors rotate among a captain's comparable great distinctions", () => {
  const state = createGameState({ cargoCapacity: 20 });
  state.doubloons = 1_250_000;
  state.memory.conquest.events.push({
    id: "capture-rhodes",
    portId: "rhodes|greece",
    cityTileId: rhodes.tileId,
    cityName: "Rhodes",
    previousFactionId: "hospitallers",
    newFactionId: "ottoman",
    capitalCapturedFactionId: "hospitallers",
    collapsedFactionId: null,
    peaceTreatyId: null,
    simMinute: 890 * 24 * 60,
    source: "player"
  });
  state.memory.conquest.treaties.push({
    id: "treaty-rhodes",
    capitalPortId: "rhodes|greece",
    loserFactionId: "hospitallers",
    winnerFactionId: "ottoman",
    term: "vassalage",
    annexedFactionId: null,
    concessionCityIds: [],
    concessionCityNames: [],
    concessionPortIds: [],
    papalActionTargetFactionId: null,
    simMinute: 891 * 24 * 60,
    source: "player"
  });

  const kinds = new Set(Array.from({ length: 18 }, (_value, index) => recognition(state, {
    visitCount: index + 1,
    dayIndex: 900 + index
  }).kind));
  assert.ok(kinds.size >= 2, `expected rotating distinctions, received ${[...kinds].join(", ")}`);
});
