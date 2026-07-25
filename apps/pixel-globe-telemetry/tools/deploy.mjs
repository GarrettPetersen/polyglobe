import { spawn } from "node:child_process";

import { cloudflareEnvironment, workerBinary } from "./cloudflareEnvironment.mjs";

const environment = await cloudflareEnvironment();
await run(workerBinary("wrangler"), ["deploy"], environment);

function run(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`Wrangler deploy failed (${signal || code})`));
    });
  });
}
