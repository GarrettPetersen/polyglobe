import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

import { GAME_STATE_VERSION } from "../src/gameState.js";
import {
  canonicalGameStateFixtures,
  canonicalGameStateSchemaEntries
} from "../src/gameStateSchema.js";

const directory = new URL("../src/test-fixtures/save-schemas/", import.meta.url);
const schemaOutput = new URL(`game-state-v${GAME_STATE_VERSION}.json`, directory);
const statesOutput = new URL(`canonical-states-v${GAME_STATE_VERSION}.json`, directory);
if (existsSync(schemaOutput) || existsSync(statesOutput)) {
  throw new Error(
    `Schema snapshot already exists for game-state version ${GAME_STATE_VERSION}. ` +
      "Increment GAME_STATE_VERSION before freezing a changed persisted schema."
  );
}

const entries = canonicalGameStateSchemaEntries();
const snapshot = {
  gameStateVersion: GAME_STATE_VERSION,
  entryCount: entries.length,
  sha256: createHash("sha256").update(entries.join("\n")).digest("hex")
};
mkdirSync(directory, { recursive: true });
writeFileSync(schemaOutput, `${JSON.stringify(snapshot, null, 2)}\n`, { flag: "wx" });
writeFileSync(statesOutput, `${JSON.stringify({
  gameStateVersion: GAME_STATE_VERSION,
  states: canonicalGameStateFixtures()
}, null, 2)}\n`, { flag: "wx" });
console.log(
  `Frozen game-state schema v${GAME_STATE_VERSION}: ${entries.length} entries and ` +
    `${canonicalGameStateFixtures().length} migration fixtures`
);
