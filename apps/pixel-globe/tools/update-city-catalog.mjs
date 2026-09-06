import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { APP_ROOT, CATALOG_BUILD_TOOLS } from "./cityCatalogRelease.mjs";

function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: APP_ROOT, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`City catalog release stopped: node ${args.join(" ")}`);
}

export function updateCityCatalog(runChild = run) {
  // The scene catalog depends on the sailing bake. Every validation runs in a
  // child so it imports the completed generation, not the parent's cached map.
  for (const tool of CATALOG_BUILD_TOOLS) runChild([tool]);
  runChild(["--test", "src/worldMapInvariants.test.js", "src/landRoadNetwork.test.js",
    "src/portSailingDistances.test.js", "src/portCatalogMigration.test.js",
    "src/subdivisionSevenPortMigration.test.js", "src/gameStateQuest.test.js"]);
  runChild(["tools/finalize-city-catalog.mjs"]);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) updateCityCatalog();
