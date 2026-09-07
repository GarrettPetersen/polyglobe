import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { runWorkerCampaign } from "./world-worker.mjs";
const args = new Map(process.argv.slice(2).map(arg => {
  const match = /^--(output|months)=(.+)$/.exec(arg);
  if (!match) throw new Error(`Unknown campaign argument: ${arg}`);
  return match.slice(1);
}));
const output = resolve(args.get("output") || ".playtest/worker-campaign");
mkdirSync(output, { recursive: true });
const path = resolve(output, "checkpoint.json");
const checkpoint = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null;
try {
  const result = await runWorkerCampaign({ months: Number(args.get("months") || 1), checkpoint,
    onCheckpoint: value => writeFileSync(path, JSON.stringify(value)) });
  writeFileSync(resolve(output, "report.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} catch (error) {
  // Last successful checkpoint plus the next monthly advance reproduces failures.
  writeFileSync(resolve(output, "failure.json"), JSON.stringify({ message: error.message, stack: error.stack,
    nextMonth: (existsSync(path) ? JSON.parse(readFileSync(path)).month : 0) + 1 }, null, 2));
  throw error;
}
