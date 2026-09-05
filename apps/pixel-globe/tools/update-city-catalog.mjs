import { spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { APP_ROOT, CATALOG_BUILD_TOOLS, CATALOG_MANIFEST_PATH, CATALOG_HISTORY_PATH,
  catalogReleaseHashes, currentCatalogSnapshot, validateCatalogHistory, verifyCityCatalogRelease } from "./cityCatalogRelease.mjs";

function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: APP_ROOT, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`City catalog release stopped: node ${args.join(" ")}`);
}

// The scene catalog depends on the sailing bake. The manifest is written only
// after every producer and regression check succeeds; a partial run stays stale.
for (const tool of CATALOG_BUILD_TOOLS) run([tool]);
const snapshot = await currentCatalogSnapshot();
const alreadyFrozen = await validateCatalogHistory(snapshot);
run(["--test", "src/worldMapInvariants.test.js", "src/landRoadNetwork.test.js",
  "src/portSailingDistances.test.js", "src/portCatalogMigration.test.js",
  "src/subdivisionSevenPortMigration.test.js", "src/gameStateQuest.test.js"]);
if (!alreadyFrozen) {
  await writeFile(resolve(APP_ROOT, CATALOG_HISTORY_PATH, `${snapshot.version}.json`), `${JSON.stringify(snapshot, null, 2)}\n`, { flag: "wx" });
}
const manifest = { format: "pixel-globe-city-catalog-release", version: 1, ...await catalogReleaseHashes() };
await writeFile(resolve(APP_ROOT, CATALOG_MANIFEST_PATH), `${JSON.stringify(manifest, null, 2)}\n`);
await verifyCityCatalogRelease();
console.log("City catalog release regenerated, tested and verified. Commit the complete diff.");
