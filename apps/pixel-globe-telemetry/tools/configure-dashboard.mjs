import { spawn } from "node:child_process";

import { cloudflareEnvironment, workerBinary } from "./cloudflareEnvironment.mjs";

const environment = await cloudflareEnvironment();
const secrets = [
  ["ANALYTICS_ACCOUNT_ID", environment.CLOUDFLARE_ACCOUNT_ID],
  ["ANALYTICS_API_TOKEN", environment.CLOUDFLARE_API_TOKEN]
];

for (const [name, value] of secrets) {
  await putSecret(workerBinary("wrangler"), environment, name, value);
}
console.log(
  "Dashboard Analytics Engine credentials configured as encrypted Worker secrets."
);

function putSecret(command, env, name, value) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, ["secret", "put", name], {
      env,
      stdio: ["pipe", "inherit", "inherit"]
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`Dashboard secret ${name} failed (${signal || code})`));
    });
    child.stdin.end(`${value}\n`);
  });
}
