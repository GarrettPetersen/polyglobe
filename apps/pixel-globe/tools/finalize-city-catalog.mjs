import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { APP_ROOT, CATALOG_MANIFEST_PATH, CATALOG_HISTORY_PATH,
  catalogReleaseHashes, currentCatalogSnapshot, validateCatalogHistory, verifyCityCatalogRelease } from "./cityCatalogRelease.mjs";

// Import the newly generated map in a fresh process. The producer orchestrator
// may already have cached the previous generation through its dependency graph.
const snapshot = await currentCatalogSnapshot();
const alreadyFrozen = await validateCatalogHistory(snapshot);
if (!alreadyFrozen) {
  await writeFile(resolve(APP_ROOT, CATALOG_HISTORY_PATH, `${snapshot.version}.json`), `${JSON.stringify(snapshot, null, 2)}\n`, { flag: "wx" });
}
const manifest = { format: "pixel-globe-city-catalog-release", version: 1, ...await catalogReleaseHashes() };
await writeFile(resolve(APP_ROOT, CATALOG_MANIFEST_PATH), `${JSON.stringify(manifest, null, 2)}\n`);
await verifyCityCatalogRelease();
console.log("City catalog release regenerated, tested and verified. Commit the complete diff.");
