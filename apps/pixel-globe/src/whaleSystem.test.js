import assert from "node:assert/strict";
import test from "node:test";

import {
  WHALE_PHASE_DEAD,
  WHALE_PHASE_EXHAUSTED,
  WHALE_PHASE_RISING,
  WHALE_PHASE_SUBMERGED,
  WHALE_PHASE_SURFACED,
  WHALE_PHASE_TETHERED,
  advanceWhaleMemory,
  constrainWhaleTether,
  createWhaleMemory,
  cutWhaleLoose,
  exhaustTetheredWhale,
  harvestWhaleForNpc,
  killExhaustedWhale,
  seedWhalePopulation,
  tetherWhale,
  underwaterWhaleSongPresence,
  validateWhaleMemory,
  whaleCanBeHarpooned,
  whaleBlubberYield,
  whaleHarpoonBreakMultiplier,
  whaleSurfaceExposure,
  whaleTetherLengthScale,
  whaleTowingSpeed
} from "./whaleSystem.js";
import { WHALE_HARPOONS } from "./whaleHarpoons.js";
import { shipStatsForSlug } from "./shipStats.js";
import {
  WHITE_WHALE_ID,
  WHALE_CRUISE_SPEED_SCALE,
  WHALE_LIFE_STAGE_ADOLESCENT,
  WHALE_LIFE_STAGE_ADULT,
  WHALE_LIFE_STAGE_CALF,
  WHALE_SPECIES,
  WHALE_SPECIES_BLUE,
  WHALE_SPECIES_MINKE,
  vectorLatLon,
  whaleDisplayLabel,
  whaleSpeciesById
} from "./whaleSpecies.js";

function candidates(count = 20) {
  return Array.from({ length: count }, (_, index) => {
    const angle = index / count * Math.PI * 2;
    const latitude = index % 2 === 0 ? 42 : -44;
    const lat = latitude * Math.PI / 180;
    const longitude = angle * 180 / Math.PI - 180;
    const lon = longitude * Math.PI / 180;
    return {
      tileId: index,
      latitudeDeg: latitude,
      longitudeDeg: longitude,
      position: [Math.cos(lat) * Math.cos(lon), Math.sin(lat), -Math.cos(lat) * Math.sin(lon)]
    };
  });
}

function whaleNavigation(tileId, canSurface = true) {
  return { ok: true, canSurface, tileId };
}

test("voyage seeds vary whale populations while remaining deterministic", () => {
  const first = createWhaleMemory();
  const repeated = createWhaleMemory();
  const second = createWhaleMemory();

  seedWhalePopulation(first, candidates(100), 20, { seedKey: "voyage-one" });
  seedWhalePopulation(repeated, candidates(100), 20, { seedKey: "voyage-one" });
  seedWhalePopulation(second, candidates(100), 20, { seedKey: "voyage-two" });

  assert.deepEqual(first, repeated);
  assert.notDeepEqual(first.individuals, second.individuals);
});

test("whales seed as stable individual entities and surface cyclically", () => {
  const memory = createWhaleMemory();
  seedWhalePopulation(memory, candidates(), 6);
  assert.equal(memory.individuals.length, 6);
  assert.equal(new Set(memory.individuals.map((whale) => whale.id)).size, 6);

  const whale = memory.individuals[0];
  whale.phaseElapsedSeconds = whale.phaseDurationSeconds - 0.1;
  const events = advanceWhaleMemory(memory, 0.2, () => whaleNavigation(1), 1);
  assert.equal(whale.phase, WHALE_PHASE_RISING);
  assert.equal(events.length, 0);
  assert.equal(whaleCanBeHarpooned(whale), true);
  assert.ok(whaleSurfaceExposure(whale) > 0);
  validateWhaleMemory(memory);
});

test("submerged whales swim beneath ice and wait for open water before rising", () => {
  const memory = createWhaleMemory();
  seedWhalePopulation(memory, candidates(), 6);
  const whale = memory.individuals[0];
  const originalPosition = whale.position.slice();
  whale.phaseElapsedSeconds = whale.phaseDurationSeconds - 0.1;

  const underIceEvents = advanceWhaleMemory(memory, 0.2, () => whaleNavigation(91, false), 1);
  assert.equal(whale.phase, WHALE_PHASE_SUBMERGED);
  assert.equal(whale.tileId, 91);
  assert.notDeepEqual(whale.position, originalPosition);
  assert.deepEqual(underIceEvents, []);

  advanceWhaleMemory(memory, 0.01, () => whaleNavigation(92, true), 1);
  assert.equal(whale.phase, WHALE_PHASE_RISING);
  assert.equal(whale.tileId, 92);
});

test("whales cruise deliberately while a tethered whale can still make a fast run", () => {
  const slowestPlayerBoatSpeed = shipStatsForSlug("mesoamerican-dugout-canoe").topSpeedRad;
  assert.equal(WHALE_CRUISE_SPEED_SCALE, 0.45);
  for (const species of WHALE_SPECIES) {
    assert.ok(species.cruiseSpeedRad < slowestPlayerBoatSpeed, species.label);
    assert.ok(species.towingSpeedRad > species.cruiseSpeedRad, species.label);
  }
});

test("the white whale follows a persistent ocean-scale migration instead of circling its sighting", () => {
  const memory = createWhaleMemory();
  seedWhalePopulation(memory, candidates(), 6);
  const quarry = memory.individuals.find((whale) => whale.id === WHITE_WHALE_ID);
  quarry.position = [1, 0, 0];
  quarry.heading = [0, 0, 1];
  quarry.tileId = 50;
  const start = quarry.position.slice();

  for (let second = 1; second <= 90; second++) {
    advanceWhaleMemory(memory, 1, () => whaleNavigation(50), second);
  }

  const distance = Math.acos(Math.max(-1, Math.min(1,
    start[0] * quarry.position[0] + start[1] * quarry.position[1] + start[2] * quarry.position[2]
  )));
  assert.ok(distance > 0.15, `white whale migrated only ${distance} radians`);
  assert.ok(vectorLatLon(quarry.position).longitudeDeg > 5);
});

test("a secured whale tows until exhausted, then can be killed or released", () => {
  const memory = createWhaleMemory();
  seedWhalePopulation(memory, candidates(), 6);
  const whale = memory.individuals.find((candidate) => candidate.id !== WHITE_WHALE_ID);
  whale.phase = WHALE_PHASE_RISING;
  whale.phaseElapsedSeconds = 1;
  whale.phaseDurationSeconds = 2;
  const harpoon = WHALE_HARPOONS.at(-1);

  tetherWhale(memory, whale.id, harpoon);
  assert.equal(whale.phase, WHALE_PHASE_TETHERED);
  const towSeconds = memory.activeHunt.remainingSeconds;
  const events = advanceWhaleMemory(memory, towSeconds, () => whaleNavigation(2), 1);
  assert.equal(whale.phase, WHALE_PHASE_EXHAUSTED);
  assert.ok(events.some((event) => event.type === "exhausted" && event.whaleId === whale.id));
  killExhaustedWhale(memory);
  assert.equal(whale.phase, WHALE_PHASE_DEAD);
  assert.equal(memory.activeHunt, null);

  const releasedMemory = createWhaleMemory();
  seedWhalePopulation(releasedMemory, candidates(), 6);
  const released = releasedMemory.individuals.find((candidate) => candidate.id !== WHITE_WHALE_ID);
  released.phase = WHALE_PHASE_RISING;
  released.phaseElapsedSeconds = 1;
  released.phaseDurationSeconds = 2;
  tetherWhale(releasedMemory, released.id, harpoon);
  cutWhaleLoose(releasedMemory);
  assert.equal(releasedMemory.activeHunt, null);
  assert.equal(released.phase, "diving");
});

test("an authored hunt can use the same exhausted state transition as a completed tow", () => {
  const memory = createWhaleMemory();
  seedWhalePopulation(memory, candidates(), 6);
  const whale = memory.individuals.find((candidate) => candidate.id !== WHITE_WHALE_ID);
  whale.phase = WHALE_PHASE_RISING;
  whale.phaseElapsedSeconds = 1;
  whale.phaseDurationSeconds = 2;
  tetherWhale(memory, whale.id, WHALE_HARPOONS[0]);

  assert.equal(exhaustTetheredWhale(memory), whale);
  assert.equal(whale.phase, WHALE_PHASE_EXHAUSTED);
  assert.equal(memory.activeHunt.remainingSeconds, 0);
});

test("the tow line eases shorter near the end of a whale chase", () => {
  const memory = createWhaleMemory();
  seedWhalePopulation(memory, candidates(), 6);
  const whale = memory.individuals.find((candidate) => candidate.id !== WHITE_WHALE_ID);
  whale.phase = WHALE_PHASE_RISING;
  whale.phaseElapsedSeconds = 1;
  whale.phaseDurationSeconds = 2;
  tetherWhale(memory, whale.id, WHALE_HARPOONS[0]);

  const towSeconds = memory.activeHunt.remainingSeconds;
  assert.equal(whaleTetherLengthScale(whale, memory.activeHunt), 1);

  advanceWhaleMemory(memory, towSeconds * 0.6, () => whaleNavigation(2), 1);
  assert.equal(whaleTetherLengthScale(whale, memory.activeHunt), 1);

  advanceWhaleMemory(memory, towSeconds * 0.2, () => whaleNavigation(2), 1);
  const finalStretchScale = whaleTetherLengthScale(whale, memory.activeHunt);
  assert.ok(finalStretchScale < 1 && finalStretchScale > 0.36);

  advanceWhaleMemory(memory, towSeconds * 0.2, () => whaleNavigation(2), 1);
  assert.equal(whale.phase, WHALE_PHASE_EXHAUSTED);
  assert.equal(whaleTetherLengthScale(whale, memory.activeHunt), 0.36);
});

test("sea ice parts an active harpoon line and lets the whale dive beneath it", () => {
  const memory = createWhaleMemory();
  seedWhalePopulation(memory, candidates(), 6);
  const whale = memory.individuals.find((candidate) => candidate.id !== WHITE_WHALE_ID);
  whale.phase = WHALE_PHASE_RISING;
  whale.phaseElapsedSeconds = 1;
  whale.phaseDurationSeconds = 2;
  tetherWhale(memory, whale.id, WHALE_HARPOONS[0]);

  const events = advanceWhaleMemory(memory, 0.2, () => whaleNavigation(93, false), 1);

  assert.equal(memory.activeHunt, null);
  assert.equal(whale.phase, WHALE_PHASE_SUBMERGED);
  assert.equal(whale.tileId, 93);
  assert.equal(whaleCanBeHarpooned(whale), false);
  assert.ok(events.some((event) => event.type === "ice-line-break" && event.whaleId === whale.id));
});

test("a tow line keeps the tethered whale within its visible maximum length", () => {
  const memory = createWhaleMemory();
  seedWhalePopulation(memory, candidates(), 6);
  const whale = memory.individuals.find((candidate) => candidate.id !== WHITE_WHALE_ID);
  whale.phase = WHALE_PHASE_RISING;
  whale.phaseElapsedSeconds = 1;
  whale.phaseDurationSeconds = 2;
  tetherWhale(memory, whale.id, WHALE_HARPOONS[0]);

  const anchor = [1, 0, 0];
  const separation = 0.1;
  whale.position = [Math.cos(separation), 0, Math.sin(separation)];
  whale.heading = [-Math.sin(separation), 0, Math.cos(separation)];
  const maximumDistance = 0.03;
  const changed = constrainWhaleTether(
    whale,
    anchor,
    maximumDistance,
    () => whaleNavigation(77)
  );

  const actualDistance = Math.acos(Math.max(-1, Math.min(1,
    anchor[0] * whale.position[0] + anchor[1] * whale.position[1] + anchor[2] * whale.position[2]
  )));
  assert.equal(changed, true);
  assert.ok(Math.abs(actualDistance - maximumDistance) < 1e-9);
  assert.equal(whale.tileId, 77);
});

test("whale song is a quiet proximity cue only while the whale is underwater", () => {
  const memory = createWhaleMemory();
  seedWhalePopulation(memory, candidates(), 6);
  const whale = memory.individuals.find((candidate) => candidate.id !== WHITE_WHALE_ID);

  assert.equal(underwaterWhaleSongPresence(whale, 10, 20, 100), 1);
  assert.equal(underwaterWhaleSongPresence(whale, 100, 20, 100), 0);
  whale.phase = WHALE_PHASE_SURFACED;
  whale.phaseElapsedSeconds = 0;
  whale.phaseDurationSeconds = 4;
  assert.equal(underwaterWhaleSongPresence(whale, 10, 20, 100), 0);
  whale.phase = WHALE_PHASE_TETHERED;
  whale.phaseDurationSeconds = 0;
  assert.equal(underwaterWhaleSongPresence(whale, 10, 20, 100), 0);
});

test("NPC whaling protects an active hunt and stops at its population floor", () => {
  const memory = createWhaleMemory();
  seedWhalePopulation(memory, candidates(), 4);
  const playerWhale = memory.individuals[0];
  playerWhale.phase = WHALE_PHASE_RISING;
  playerWhale.phaseElapsedSeconds = 1;
  playerWhale.phaseDurationSeconds = 2;
  tetherWhale(memory, playerWhale.id, WHALE_HARPOONS[0]);

  const caught = harvestWhaleForNpc(memory, playerWhale.position, {
    maxDistanceRad: Math.PI,
    minimumLivingPopulation: 3
  });
  assert.equal(caught.outcome, "caught");
  assert.notEqual(caught.whale.id, playerWhale.id);
  assert.equal(playerWhale.phase, WHALE_PHASE_TETHERED);
  assert.equal(memory.activeHunt.whaleId, playerWhale.id);

  const protectedResult = harvestWhaleForNpc(memory, caught.whale.position, {
    maxDistanceRad: Math.PI,
    minimumLivingPopulation: 3
  });
  assert.equal(protectedResult.outcome, "protected-population");
  assert.equal(protectedResult.livingPopulation, 3);
});

test("the production population includes every species, young families, and one distant white whale", () => {
  const memory = createWhaleMemory();
  const waters = candidates(1200);
  const playerPosition = waters[0].position;
  seedWhalePopulation(memory, waters, 320, { avoidPosition: playerPosition });

  assert.deepEqual(
    new Set(memory.individuals.map((whale) => whale.speciesId)),
    new Set(WHALE_SPECIES.map((species) => species.id))
  );
  assert.equal(memory.individuals.filter((whale) => whale.id === WHITE_WHALE_ID).length, 1);
  assert.ok(memory.individuals.some((whale) => whale.lifeStage === WHALE_LIFE_STAGE_CALF));
  assert.ok(memory.individuals.some((whale) => whale.pregnancyDueMinute !== null));
  assert.ok(memory.individuals
    .filter((whale) => whale.motherId !== null)
    .every((whale) => memory.individuals.some((mother) => mother.id === whale.motherId)));
  const whiteDistance = angularDistance(playerPosition, memory.individuals.find((whale) => whale.id === WHITE_WHALE_ID).position);
  const spermDistances = memory.individuals
    .filter((whale) => whale.speciesId === "sperm-whale" && whale.id !== WHITE_WHALE_ID)
    .map((whale) => angularDistance(playerPosition, whale.position));
  assert.ok(whiteDistance >= Math.max(...spermDistances));
});

test("adult whales mate and produce a persisted calf that remains with its mother", () => {
  const memory = createWhaleMemory();
  seedWhalePopulation(memory, candidates(100), 20);
  const female = memory.individuals.find((whale) => whale.sex === "female" && whale.lifeStage === "adult");
  const male = memory.individuals.find((whale) => (
    whale.sex === "male" && whale.lifeStage === "adult" && whale.speciesId === female.speciesId
  ));
  male.position = female.position.slice();
  male.tileId = female.tileId;
  female.nextMatingMinute = 0;
  advanceWhaleMemory(memory, 0, () => whaleNavigation(female.tileId), 1);
  assert.equal(female.mateId, male.id);
  assert.ok(female.pregnancyDueMinute > 1);

  const dueMinute = female.pregnancyDueMinute;
  const events = advanceWhaleMemory(memory, 0, () => whaleNavigation(female.tileId), dueMinute);
  const birth = events.find((event) => event.type === "birth" && event.motherId === female.id);
  assert.ok(birth);
  const calf = memory.individuals.find((whale) => whale.id === birth.whaleId);
  assert.equal(calf.lifeStage, WHALE_LIFE_STAGE_CALF);
  assert.equal(calf.motherId, female.id);
  validateWhaleMemory(memory);
});

test("species change hunting difficulty and yield while NPCs can never kill the white whale", () => {
  const memory = createWhaleMemory();
  seedWhalePopulation(memory, candidates(200), 40);
  const blue = memory.individuals.find((whale) => whale.speciesId === WHALE_SPECIES_BLUE);
  const minke = memory.individuals.find((whale) => whale.speciesId === WHALE_SPECIES_MINKE);
  const white = memory.individuals.find((whale) => whale.id === WHITE_WHALE_ID);
  assert.ok(whaleHarpoonBreakMultiplier(blue) > whaleHarpoonBreakMultiplier(minke));
  assert.ok(whaleBlubberYield(blue) > whaleBlubberYield(minke));

  for (const whale of memory.individuals) {
    if (whale.id !== WHITE_WHALE_ID) whale.phase = WHALE_PHASE_DEAD;
  }
  const result = harvestWhaleForNpc(memory, white.position, {
    maxDistanceRad: Math.PI,
    minimumLivingPopulation: 0
  });
  assert.equal(result.outcome, "no-whale-in-range");
  assert.notEqual(white.phase, WHALE_PHASE_DEAD);
});

test("young whales are easier player catches with proportionally smaller yields", () => {
  const memory = createWhaleMemory();
  seedWhalePopulation(memory, candidates(200), 40);
  const whale = memory.individuals.find((candidate) => (
    candidate.id !== WHITE_WHALE_ID && candidate.lifeStage === WHALE_LIFE_STAGE_ADULT
  ));
  const harpoon = WHALE_HARPOONS[0];
  const stages = [WHALE_LIFE_STAGE_CALF, WHALE_LIFE_STAGE_ADOLESCENT, WHALE_LIFE_STAGE_ADULT];
  const results = stages.map((lifeStage) => {
    whale.lifeStage = lifeStage;
    whale.phase = WHALE_PHASE_RISING;
    whale.phaseElapsedSeconds = 1;
    whale.phaseDurationSeconds = 2;
    assert.equal(whaleCanBeHarpooned(whale), true);
    const breakMultiplier = whaleHarpoonBreakMultiplier(whale);
    const towingSpeed = whaleTowingSpeed(whale);
    const yieldAmount = whaleBlubberYield(whale);
    const label = whaleDisplayLabel(whale);
    tetherWhale(memory, whale.id, harpoon);
    const exhaustionSeconds = memory.activeHunt.remainingSeconds;
    cutWhaleLoose(memory);
    return { breakMultiplier, exhaustionSeconds, label, towingSpeed, yieldAmount };
  });

  assert.ok(results[0].breakMultiplier < results[1].breakMultiplier);
  assert.ok(results[1].breakMultiplier < results[2].breakMultiplier);
  assert.ok(results[0].exhaustionSeconds < results[1].exhaustionSeconds);
  assert.ok(results[1].exhaustionSeconds < results[2].exhaustionSeconds);
  assert.ok(results[0].towingSpeed < results[1].towingSpeed);
  assert.ok(results[1].towingSpeed < results[2].towingSpeed);
  assert.ok(results[0].yieldAmount < results[1].yieldAmount);
  assert.ok(results[1].yieldAmount < results[2].yieldAmount);
  assert.match(results[0].label, /calf$/);
  assert.match(results[1].label, /\(adolescent\)$/);
});

function angularDistance(a, b) {
  return Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));
}
