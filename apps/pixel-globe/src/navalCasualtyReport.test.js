import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createCrewMember } from "./crewMembers.js";
import { createGameState, loseCrew, migrateGameState, validateGameState } from "./gameState.js";
import { shipStatsForSlug } from "./shipStats.js";
import { testCrewMigrationOptions } from "./test-fixtures/crewTestFixtures.js";
import { addNamedCrewMember, NAMED_CREW_ROLE_HISTORIAN } from "./namedCrew.js";
import { recordNavalCasualties, navalCasualtyReport, validateNavalCasualties,
  navalAfterActionReady } from "./navalCasualtyReport.js";

function sailor(id) {
  return createCrewMember({ id, name: `Sailor ${id}`, nameCulture: "portuguese",
    religionId: "roman-catholic", nationalityId: "portugal",
    homePort: { cityId: "lisbon|portugal", tileId: 42, city: "Lisbon" },
    appearanceId: "swordsman-light", crewTypeId: "swordsman",
    recruitedAtMinute: 0, sailingMinutes: 0 });
}

test("the casualty roll merges wounds followed by death and includes named companions once", () => {
  const entries = [];
  const hurt = sailor("hurt");
  hurt.wound = { cause: "naval-small-arms", recoveryMinutesRemaining: 1440 };
  recordNavalCasualties(entries, { deaths: [], wounded: [{ member: hurt, recoveryMinutes: 1440 }] });
  recordNavalCasualties(entries, { deaths: [{ kind: "crew", member: hurt },
    { kind: "named", member: { id: "chef", name: "The Chef", role: "chef" } }], wounded: [] });
  const report = navalCasualtyReport(entries);
  assert.equal(report.deaths, 2);
  assert.equal(report.wounded, 0);
  assert.deepEqual(report.entries.map(({ memberId }) => memberId), ["hurt", "chef"]);
  assert.throws(() => validateNavalCasualties([...entries, entries[0]]), /Invalid naval casualty entry/);
  assert.throws(() => validateNavalCasualties([{ ...entries[0], fate: "missing" }]), /Invalid naval casualty entry/);
  assert.throws(() => validateNavalCasualties(undefined), /Invalid pending naval casualty roll/);
});

test("naval deaths survive save/load while ordinary hazards keep their own reporting", () => {
  const stats = shipStatsForSlug("brigantine");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  state.crewRoster = [sailor("a"), sailor("b"), sailor("c")];
  state.ship.crew = 4;
  loseCrew(state, 1, () => 0, { navalCombat: true });
  assert.equal(state.memory.navalCasualties[0].memberId, "a");
  loseCrew(state, 1, () => 0);
  assert.equal(state.memory.navalCasualties.length, 1);
  const restored = migrateGameState(JSON.parse(JSON.stringify(state)), stats);
  validateGameState(restored);
  assert.deepEqual(restored.memory.navalCasualties, state.memory.navalCasualties);
  assert.deepEqual(migrateGameState(structuredClone(restored), stats), restored);
  addNamedCrewMember(restored, { id: "historian", name: "Astrid", skillIds: ["able-seaman"],
    expressions: [{ id: "neutral", src: "test.png", width: 64, height: 64 }] }, NAMED_CREW_ROLE_HISTORIAN);
  loseCrew(restored, 2, () => 0, { navalCombat: true });
  assert.equal(restored.memory.navalCasualties.at(-1).memberId, "historian");
  assert.deepEqual(restored.memory.namedCrewDeathNotices, [], "combat never queues an interrupting last-words modal");
});

test("version 102 voyages acquire an empty report without losing existing history", () => {
  const fixture = JSON.parse(readFileSync(new URL("./test-fixtures/save-schemas/canonical-states-v102.json", import.meta.url)));
  for (const { state } of fixture.states) {
    const migrated = migrateGameState(structuredClone(state), shipStatsForSlug(state.ship.slug), testCrewMigrationOptions());
    assert.deepEqual(migrated.memory.navalCasualties, []);
    assert.deepEqual(migrated.memory.namedCrewDeathNotices, state.memory.namedCrewDeathNotices);
  }
});

test("after-action reports wait for sustained quiet, all opponents, projectiles and overlays", () => {
  const base = { quietSinceMs: 100, nowMs: 5100, engaged: false, projectilesActive: false, blocked: false };
  assert.equal(navalAfterActionReady(base), true);
  for (const change of [{ quietSinceMs: null }, { nowMs: 5099 }, { engaged: true },
    { projectilesActive: true }, { blocked: true }, { quietSinceMs: 4000 }]) {
    assert.equal(navalAfterActionReady({ ...base, ...change }), false);
  }
});
