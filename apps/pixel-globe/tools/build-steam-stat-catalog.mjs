import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ACHIEVEMENT_CATALOG } from "../src/achievements.js";
import {
  STEAM_ACHIEVEMENT_PROGRESS,
  STEAM_STAT_CATALOG
} from "../src/steamStats.js";

const appRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const outputRoot = join(appRoot, "steam/stats");
const catalogPath = join(outputRoot, "catalog.json");
const achievementById = new Map(ACHIEVEMENT_CATALOG.map((entry) => [entry.id, entry]));

const achievementProgress = ACHIEVEMENT_CATALOG.flatMap((achievement) => {
  const binding = STEAM_ACHIEVEMENT_PROGRESS[achievement.id];
  if (!binding) return [];
  return [{
    gameId: achievement.id,
    achievementApiName: achievement.platformIds.steam,
    progressStat: binding.statApiName,
    progressUnlockValue: binding.unlockValue
  }];
});

for (const entry of achievementProgress) {
  if (!achievementById.has(entry.gameId)) {
    throw new Error(`Steam stat binding references missing achievement: ${entry.gameId}`);
  }
}

mkdirSync(outputRoot, { recursive: true });
writeFileSync(catalogPath, `${JSON.stringify({
  appId: 4516500,
  generatedFrom: [
    "src/steamStats.js",
    "src/achievements.js"
  ],
  statCount: STEAM_STAT_CATALOG.length,
  achievementProgressCount: achievementProgress.length,
  stats: STEAM_STAT_CATALOG,
  achievementProgress
}, null, 2)}\n`);

console.log(
  `Built ${STEAM_STAT_CATALOG.length} Steam stats and ` +
  `${achievementProgress.length} achievement progress bindings at ${catalogPath}`
);
