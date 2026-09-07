import { execFileSync } from "node:child_process";
import { statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("../../", import.meta.url));
const files = [
  "src/workerVoyageInterruption.test.js",
  "src/shipyardFleetHistory.test.js",
  "src/npcSeaRoutes.test.js",
  "tools/playtest/politics-contract.test.mjs"
];
// Node's test discovery can ignore nonexistent positional paths. A release
// regression must never disappear because a renamed file was not updated here.
for (const path of files) if (!statSync(resolve(root, path)).isFile()) throw new Error(`Missing telemetry regression: ${path}`);
execFileSync(process.execPath, ["--test", ...files], { cwd: root, stdio: "inherit", timeout: 9 * 60_000 });
console.log(JSON.stringify({ status: "passed", files, fingerprints: [
  "3eb6e2cc9ac271f4ee43f6b179c0c7f3a23625d46ecd2a7a5a7ae941850c4bc6",
  "11eb5134bb844394c2564c049dcd9c2402d40d45aa0ade8247ea7f83283d9436"
] }));
