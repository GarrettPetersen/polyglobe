import assert from "node:assert/strict";
import test from "node:test";

import { createGameState } from "./gameState.js";
import {
  playerPirateVictoryCount,
  portFactorRecognitionForCaptain
} from "./portFactorRecognition.js";

const istanbul = Object.freeze({
  tileId: 41,
  cityId: "istanbul|türkiye",
  city: "Istanbul",
  displayCity: "Istanbul",
  country: "Türkiye",
  factionId: "ottoman",
  cityType: "islamic-desert",
  character: Object.freeze({ nameCulture: "ottoman" }),
  population: 400_000
});
const rhodes = Object.freeze({
  tileId: 42,
  cityId: "rhodes|greece",
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
    cityId: rhodes.cityId,
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
  assert.match(result.text, /wealth|fit out a fleet/i);
});

test("shared recognition uses the port's regional political voice", () => {
  const magnate = createGameState({ cargoCapacity: 20 });
  magnate.doubloons = 1_250_000;
  const pirateHunter = createGameState({ cargoCapacity: 20 });
  pirateHunter.memory.decisions["combat.victory.pirate"] = 7;

  const islamicLines = Array.from({ length: 24 }, (_value, index) => recognition(pirateHunter, {
    visitCount: index,
    dayIndex: 900
  }).text);
  assert.match(islamicLines.join(" "), /Harbour navigators/);
  assert.doesNotMatch(islamicLines.join(" "), /\bking|\broyal|\bcrown|Augsburg/i);

  const chinesePort = Object.freeze({
    tileId: 51,
    cityId: "nanjing|china",
    city: "Nanjing",
    country: "China",
    factionId: "ming",
    cityType: "east-asian",
    character: Object.freeze({ nameCulture: "chinese" }),
    population: 250_000
  });
  const chineseLines = Array.from({ length: 24 }, (_value, index) => recognition(pirateHunter, {
    city: chinesePort,
    cities: [chinesePort],
    visitCount: index,
    dayIndex: 900
  }).text);
  assert.match(chineseLines.join(" "), /sea bandits|coastal patrols/i);
  assert.doesNotMatch(chineseLines.join(" "), /\bking|\broyal|\bcrown/i);

  const englishPort = Object.freeze({
    tileId: 52,
    cityId: "london|united kingdom",
    city: "London",
    country: "United Kingdom",
    factionId: "england",
    cityType: "northern-european",
    character: Object.freeze({ nameCulture: "english" }),
    population: 60_000
  });
  const englishLines = Array.from({ length: 24 }, (_value, index) => recognition(pirateHunter, {
    city: englishPort,
    cities: [englishPort],
    visitCount: index,
    dayIndex: 900
  }).text);
  assert.match(englishLines.join(" "), /king's colors/i);

  const venetianPort = Object.freeze({
    tileId: 53,
    cityId: "venice|italy",
    city: "Venice",
    country: "Italy",
    factionId: "venice",
    cityType: "mediterranean",
    character: Object.freeze({ nameCulture: "italian" }),
    population: 100_000
  });
  const venetianLines = Array.from({ length: 24 }, (_value, index) => recognition(pirateHunter, {
    city: venetianPort,
    cities: [venetianPort],
    visitCount: index,
    dayIndex: 900
  }).text);
  assert.match(venetianLines.join(" "), /our war galleys/i);
  assert.doesNotMatch(venetianLines.join(" "), /king's colors/i);

  const magnateLines = Array.from({ length: 24 }, (_value, index) => recognition(magnate, {
    visitCount: index,
    dayIndex: 900 + index
  }).text);
  assert.doesNotMatch(magnateLines.join(" "), /\bking|\broyal|\bcrown|Augsburg/i);
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
