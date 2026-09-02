import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";

import {
  GAME_STATE_VERSION,
  migrateGameState,
  validateGameState
} from "./gameState.js";
import {
  canonicalGameStateSchemaEntries,
  persistedValueSchemaEntries
} from "./gameStateSchema.js";
import { shipStatsForSlug } from "./shipStats.js";
import { testCrewMigrationOptions } from "./test-fixtures/crewTestFixtures.js";

const SNAPSHOT_DIRECTORY = new URL("./test-fixtures/save-schemas/", import.meta.url);
const SCHEMA_SNAPSHOT_URL = new URL(
  `./test-fixtures/save-schemas/game-state-v${GAME_STATE_VERSION}.json`,
  import.meta.url
);

test("persisted game-state changes require a schema version increment", () => {
  assert.equal(
    existsSync(SCHEMA_SNAPSHOT_URL),
    true,
    `Missing schema snapshot for game-state version ${GAME_STATE_VERSION}. ` +
      "Add the migration, then run npm run freeze:save-schema."
  );
  const snapshot = JSON.parse(readFileSync(SCHEMA_SNAPSHOT_URL, "utf8"));
  const entries = canonicalGameStateSchemaEntries();
  assert.equal(snapshot.gameStateVersion, GAME_STATE_VERSION);
  assert.equal(snapshot.entryCount, entries.length);
  assert.equal(
    snapshot.sha256,
    schemaDigest(entries),
    "Persisted game-state schema changed without incrementing GAME_STATE_VERSION. " +
      "Increment the version, add its migration, then run npm run freeze:save-schema."
  );
});

for (const fixtureName of readdirSync(SNAPSHOT_DIRECTORY)
  .filter((name) => /^canonical-states-v\d+\.json$/.test(name))
  .sort()) {
  test(`canonical released states remain migratable: ${fixtureName}`, () => {
    const fixture = JSON.parse(readFileSync(new URL(fixtureName, SNAPSHOT_DIRECTORY), "utf8"));
    assert.ok(Number.isInteger(fixture.gameStateVersion));
    assert.ok(Array.isArray(fixture.states) && fixture.states.length > 0);
    for (const entry of fixture.states) {
      const saved = structuredClone(entry.state);
      assert.equal(saved.version, fixture.gameStateVersion);
      const expected = compatibilityFacts(saved);
      const migrated = migrateGameState(saved, shipStatsForSlug(saved.ship.slug), {
        ...testCrewMigrationOptions(),
        legacyCityIdForPortReference: ({ tileId }) => {
          assert.equal(tileId, 1);
          return "london|united kingdom";
        }
      });
      validateGameState(migrated);
      assert.deepEqual(compatibilityFacts(migrated), expected);
    }
  });
}

test("legacy migration rebuilds stale derived cargo capacity while current saves remain strict", () => {
  const fixture = JSON.parse(readFileSync(
    new URL("canonical-states-v93.json", SNAPSHOT_DIRECTORY),
    "utf8"
  ));
  const legacy = structuredClone(fixture.states[0].state);
  const shipStats = shipStatsForSlug(legacy.ship.slug);
  legacy.cargoCapacity += 4;

  const migrated = migrateGameState(legacy, shipStats, {
    ...testCrewMigrationOptions(),
    legacyCityIdForPortReference: () => "london|united kingdom"
  });
  assert.equal(migrated.cargoCapacity, shipStats.cargoCapacity);
  validateGameState(migrated);

  const corruptCurrentSave = structuredClone(migrated);
  corruptCurrentSave.cargoCapacity += 4;
  assert.throws(
    () => migrateGameState(corruptCurrentSave, shipStats),
    /Player cargo capacity does not include current perks/
  );
});

test("schema fingerprints include nested catalog keys and array element fields", () => {
  const entries = persistedValueSchemaEntries({
    catalog: { england: 1, hospitallers: 0 },
    ledger: [{ amount: 10, kind: "opening" }]
  });
  assert.ok(entries.includes("/catalog/hospitallers|number"));
  assert.ok(entries.includes("/ledger/*/amount|number"));
  assert.ok(entries.includes("/ledger/*/kind|string"));
});

function schemaDigest(entries) {
  return createHash("sha256").update(entries.join("\n")).digest("hex");
}

function compatibilityFacts(state) {
  return {
    playerId: state.playerCharacter.id,
    playerName: state.playerCharacter.name,
    nationalityId: state.playerCharacter.nationalityId,
    homePortTileId: state.playerCharacter.homePortTileId,
    doubloons: state.doubloons,
    cargoCapacity: state.cargoCapacity,
    shipSlug: state.ship.slug,
    campaignGoalType: state.memory.campaignGoal.type,
    voyageSeed: state.voyageSeed
  };
}
