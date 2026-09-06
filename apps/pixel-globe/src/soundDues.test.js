import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createGameState, migrateGameState, validateGameState, settleSoundDues, factionSafePassageToll } from "./gameState.js";
import { shipStatsForSlug } from "./shipStats.js";
import { testCrewMigrationOptions } from "./test-fixtures/crewTestFixtures.js";
import { SOUND_DUES_COLLECTOR_CITY_ID, DANISH_STRAITS, advanceSoundDuesPassage, createSoundDuesMemory,
  resolveSoundDuesPassage, soundDuesPaymentEligibility, soundDuesEnforcementApplies, shipPassageTollDoubloons, validateSoundDuesMemory } from "./soundDues.js";
import { createSoundDuesDialogueSession, shoreBatteryDialogueView, selectShoreBatteryDialogueOption } from "./dialogueSystem.js";

const city = { cityId: SOUND_DUES_COLLECTOR_CITY_ID, city: "Copenhagen", country: "Denmark",
  factionId: "denmark-norway", character: { name: "Niels Jensen" } };
function createState(slug = "fishing-lugger") {
  const shipStats = shipStatsForSlug(slug);
  return createGameState({ cargoCapacity: shipStats.cargoCapacity, shipStats, voyageSeed: "sound-dues-tests" });
}
const inSound = { lat: 55.71, lon: 12.88 };
function enter(state, position = inSound) {
  assert.equal(advanceSoundDuesPassage(state, position), true);
  return state.memory.soundDues.active.id;
}

for (const { id, bounds: [south, north, west, east] } of DANISH_STRAITS) {
  for (const slug of ["fishing-lugger", "galleon"]) {
    test(`${id}: civilian and armed ${slug} pay the normal toll`, () => {
      const state = createState(slug);
      const passageId = enter(state, { lat: (south + north) / 2, lon: (west + east) / 2 });
      state.doubloons = 1000;
      const relations = structuredClone(state.relations);
      const expected = shipPassageTollDoubloons(state);
      const result = settleSoundDues(state, passageId, "pay", city, 120);
      assert.equal(result.tollDoubloons, expected);
      assert.equal(state.doubloons, 1000 - expected);
      assert.deepEqual(state.relations, relations, "receipt does not rewrite diplomacy, nationality, marque or month-long passage");
      assert.equal(state.accounts.ledger.at(-1).amount, -expected);
      assert.equal(state.accounts.ledger.at(-1).description, "Sound Dues");
      assert.equal(state.accounts.ledger.at(-1).simMinute, 120);
      validateGameState(state);
    });
  }
}

test("tacking, port stops, switching belts and reloads never charge a paid passage twice", () => {
  let state = createState();
  const id = enter(state);
  settleSoundDues(state, id, "pay", city, 120);
  const balance = state.doubloons;
  for (let i = 0; i < 8; i++) {
    for (const position of [inSound, {lat:56.4,lon:12.5}, {lat:55.65,lon:12.0},
      {lat:55.4,lon:11.0}, {lat:55.46,lon:9.82}, {lat:54.5,lon:11.5}]) {
      assert.equal(advanceSoundDuesPassage(state, position), false);
      state = migrateGameState(JSON.parse(JSON.stringify(state)), shipStatsForSlug(state.ship.slug));
      assert.equal(state.memory.soundDues.active.id, id);
      assert.equal(state.memory.soundDues.active.status, "paid");
      assert.equal(state.doubloons, balance);
    }
  }
  assert.throws(() => settleSoundDues(state, id, "pay", city, 150), /not awaiting payment/);
  assert.equal(state.doubloons, balance);
  assert.equal(advanceSoundDuesPassage(state, { lat: 57, lon: 11.5 }), true);
  const returning = enter(state);
  assert.notEqual(returning, id);
  assert.equal(soundDuesPaymentEligibility(state, returning).canPay, true);
});

test("a passage ends only at open-water exits, including Baltic and North Sea detours", () => {
  for (const exit of [{lat:57,lon:11}, {lat:54,lon:11}, {lat:55,lon:14}, {lat:55,lon:8}]) {
    const state = createState();
    const id = enter(state);
    resolveSoundDuesPassage(state, id, "pay");
    advanceSoundDuesPassage(state, exit);
    assert.equal(state.memory.soundDues.active, null);
    assert.notEqual(enter(state), id);
  }
  const state = createState();
  for (const position of [{lat:56.5,lon:11}, {lat:54.5,lon:11}, {lat:55.7,lon:11.9}]) {
    assert.equal(advanceSoundDuesPassage(state, position), false, "nearby sailing alone is not a toll crossing");
  }
});

for (const balance of [0, 1, 29, 30, 1000]) {
  test(`every enabled toll action can execute at balance ${balance}, with live affordability`, () => {
    for (const index of [0, 1]) {
      const state = createState();
      const id = enter(state);
      const session = createSoundDuesDialogueSession(city, state);
      state.doubloons = balance;
      const view = shoreBatteryDialogueView(session, city, state);
      const selected = selectShoreBatteryDialogueOption(session, city, index, state);
      if (view.options[index].disabled) {
        assert.equal(selected.closed, false);
        assert.equal(selected.action, null);
        assert.throws(() => settleSoundDues(state, id, "pay", city, 1), /Cannot afford/);
        assert.equal(state.doubloons, balance);
      } else {
        const decision = selected.action.type === "pay-sound-dues" ? "pay" : "refuse";
        settleSoundDues(state, id, decision, city, 1);
        assert.equal(soundDuesEnforcementApplies(state.memory.soundDues, "denmark-norway"), decision === "refuse");
        assert.equal(soundDuesEnforcementApplies(state.memory.soundDues, "england"), false);
        validateGameState(state);
      }
    }
  });
}

test("interrupted unanswered and refused demands retain their exact price and state", () => {
  for (const decision of [null, "refuse"]) {
    const state = createState();
    const id = enter(state);
    if (decision) settleSoundDues(state, id, decision, city, 120);
    const restored = migrateGameState(JSON.parse(JSON.stringify(state)), shipStatsForSlug(state.ship.slug));
    assert.deepEqual(restored.memory.soundDues, state.memory.soundDues);
    assert.equal(advanceSoundDuesPassage(restored, inSound), false);
    if (!decision) {
      const session = createSoundDuesDialogueSession(city, restored);
      settleSoundDues(restored, session.passageId, "pay", city, 121);
    } else assert.equal(soundDuesEnforcementApplies(restored.memory.soundDues, "denmark-norway"), true);
  }
});

test("frozen pre-dues saves migrate explicitly, current malformed memory fails loudly", () => {
  const fixture = JSON.parse(readFileSync(new URL("./test-fixtures/save-schemas/canonical-states-v103.json", import.meta.url)));
  const old = fixture.states[0].state;
  const migrated = migrateGameState(old, shipStatsForSlug(old.ship.slug), testCrewMigrationOptions());
  assert.deepEqual(migrated.memory.soundDues, createSoundDuesMemory());
  assert.deepEqual(migrateGameState(migrated, shipStatsForSlug(old.ship.slug)), migrated);
  delete migrated.memory.soundDues;
  assert.throws(() => migrateGameState(migrated, shipStatsForSlug(old.ship.slug)), /Sound Dues/);
  for (const invalid of [null, {}, {nextPassageNumber: 0, active:null},
    {nextPassageNumber:1,active:{id:"danish-straits:0",straitId:"unknown",status:"paid",tollDoubloons:30}}]) {
    assert.throws(() => validateSoundDuesMemory(invalid), /Sound Dues/);
  }
});

test("shared pricing preserves the existing civilian safe-passage price", () => {
  const state = createState();
  assert.equal(factionSafePassageToll(state), shipPassageTollDoubloons(state));
  assert.throws(() => advanceSoundDuesPassage(state, { lat: NaN, lon: 12 }), /Invalid/);
  const id = enter(state);
  assert.throws(() => settleSoundDues(state, id, "unknown", city, 1), /Unknown/);
  assert.throws(() => settleSoundDues(state, id, "pay", {cityId:"london|united kingdom"}, 1), /collector/);
  assert.equal(state.memory.soundDues.active.status, "awaiting-payment");
});
