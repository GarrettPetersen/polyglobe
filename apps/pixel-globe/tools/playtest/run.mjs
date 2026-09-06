import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createPortJourneyAdapter, portJourneyStarts } from "./ports.mjs";
import { runJourney, minimizeFailure } from "./journey.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const args = new Map(process.argv.slice(2).map((arg) => {
  if (!arg.startsWith("--") || !arg.includes("=")) throw new Error(`Expected --name=value: ${arg}`);
  return arg.slice(2).split(/=(.*)/s).slice(0, 2);
}));
for (const key of args.keys()) if (!["seed", "steps", "hours", "output", "replay", "browser"].includes(key)) throw new Error(`Unknown option: ${key}`);
function integer(name, fallback) {
  const value = Number(args.get(name) ?? fallback);
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`Invalid ${name}: ${value}`);
  return value;
}
const steps = integer("steps", 100);
if (steps > 100_000) throw new Error("A journey is limited to 100000 steps; use hours for longer soaks");
let seed = integer("seed", 1);
const hours = Number(args.get("hours") ?? 0);
if (!Number.isFinite(hours) || hours < 0 || hours > 24) throw new Error("Hours must be between 0 and 24");
if (args.has("browser") && !["true", "false"].includes(args.get("browser"))) throw new Error("Browser must be true or false");
const output = resolve(args.get("output") ?? resolve(root, ".playtest"));
mkdirSync(output, { recursive: true });
const revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const dirty = execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }).trim() !== "";
const started = Date.now();
const report = { version: 1, revision, dirty, started: new Date(started).toISOString(), journeys: [],
  browser: "not run", scope: "Persistent port-domain journeys; travel is a scenario seam. Browser suite covers fixed gameplay scenarios separately." };
const checkpoints = new Map();
let cycle = 0;
const saveReport = () => writeFileSync(resolve(output, "report.json"), JSON.stringify(report, null, 2));
function execute(adapter, options, startCityId) {
  try { return runJourney(adapter, options); }
  catch (error) {
    if (error.artifact) {
      const artifact = { ...error.artifact, revision, dirty, startCityId };
      writeFileSync(resolve(output, "failure.json"), JSON.stringify(artifact, null, 2));
      const minimized = minimizeFailure(adapter, artifact, 24);
      writeFileSync(resolve(output, "failure-minimized.json"), JSON.stringify(minimized, null, 2));
    }
    report.failure = error.message;
    saveReport();
    throw error;
  }
}
function main() {
  if (args.has("replay")) {
    const artifact = JSON.parse(readFileSync(args.get("replay"), "utf8"));
    if (artifact.version !== 1) throw new Error("Unsupported playtest artifact version");
    if (artifact.revision !== revision) console.warn(`Replaying across revisions: ${artifact.revision} -> ${revision}`);
    execute(createPortJourneyAdapter({ startCityId: artifact.startCityId }), { ...artifact, steps: 1 }, artifact.startCityId);
    console.log("Replay completed without the recorded failure.");
  } else {
    do {
      for (const startCityId of portJourneyStarts) {
        console.log(`Journey seed=${seed} start=${startCityId} steps=${steps}`);
        const initial = cycle % 2 === 1 ? checkpoints.get(startCityId) : undefined;
        const result = execute(createPortJourneyAdapter({ startCityId }), { seed, steps, initial }, startCityId);
        checkpoints.set(startCityId, result.final);
        report.journeys.push({ seed, startCityId, continued: initial !== undefined, steps: result.steps, states: result.states,
          coverage: result.coverage, visited: result.final.visited, boundaries: result.boundaries });
        // Keep one checkpoint per starting scenario; long soaks have bounded disk usage.
        writeFileSync(resolve(output, `checkpoint-${portJourneyStarts.indexOf(startCityId)}.json`),
          JSON.stringify({ version: 1, revision, dirty, seed, startCityId, initial: result.final, trace: [] }));
        seed++;
        saveReport();
      }
      if (args.get("browser") === "true") {
        console.log("Running real-browser gameplay and save/restore scenarios");
        try {
          const log = execFileSync(process.execPath, ["tools/run-save-restore-smoke.mjs", "--release-reachability"],
            { cwd: root, timeout: 30 * 60_000, maxBuffer: 16 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
          writeFileSync(resolve(output, "browser.log"), log);
          report.browser = "passed";
        } catch (error) {
          writeFileSync(resolve(output, "browser-failure.log"), `${error.stdout ?? ""}\n${error.stderr ?? ""}`);
          report.browser = "failed";
          saveReport();
          throw error;
        }
      }
      cycle++;
    } while (hours > 0 && Date.now() - started < hours * 3_600_000);
    report.elapsedSeconds = (Date.now() - started) / 1000;
    saveReport();
    console.log(`Playtest passed: ${report.journeys.length} journeys; report ${resolve(output, "report.json")}`);
  }
}

try {
  main();
} catch (error) {
  // Artifacts can contain a whole world save. Print the diagnostic, not the save.
  console.error(error.stack);
  process.exitCode = 1;
}
