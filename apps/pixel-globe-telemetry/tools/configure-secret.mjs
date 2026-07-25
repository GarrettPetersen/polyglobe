import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";

import { cloudflareEnvironment, workerBinary } from "./cloudflareEnvironment.mjs";

const environment = await cloudflareEnvironment();
const pepper = randomBytes(32).toString("hex");
await putSecret(workerBinary("wrangler"), environment, pepper);

function putSecret(command, env, value) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, ["secret", "put", "INSTALL_HASH_PEPPER"], {
      env,
      stdio: ["pipe", "inherit", "inherit"]
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`Wrangler secret configuration failed (${signal || code})`));
    });
    child.stdin.end(`${value}\n`);
  });
}
