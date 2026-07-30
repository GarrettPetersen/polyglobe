import { access } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const steamPipeRoot = join(appRoot, "build", "steampipe");
const steamCmd = join(steamPipeRoot, "tools", "steamcmd", "steamcmd.sh");
const prepareScript = join(appRoot, "tools", "prepare-steampipe.mjs");
const validEditions = new Set(["all", "full", "demo"]);
const validPlatforms = new Set(["all", "windows", "macos", "linux"]);

const account = argumentValue("--account");
const edition = argumentValue("--edition") || "all";
const platform = argumentValue("--platform") || "all";
if (!account || !/^[A-Za-z0-9_]+$/.test(account)) {
  throw new Error("Steam upload requires --account=<Steam account name>");
}
if (!validEditions.has(edition)) {
  throw new Error(`Steam upload edition must be one of: ${[...validEditions].join(", ")}`);
}
if (!validPlatforms.has(platform)) {
  throw new Error(`Steam upload platform must be one of: ${[...validPlatforms].join(", ")}`);
}
if (process.argv.some((value) => value.startsWith("--password"))) {
  throw new Error("Do not pass a Steam password on the command line");
}

const prepareResult = spawnSync(
  process.execPath,
  [prepareScript, `--platform=${platform}`],
  { cwd: appRoot, stdio: "inherit" }
);
if (prepareResult.error) throw prepareResult.error;
if (prepareResult.status !== 0) {
  throw new Error(`SteamPipe preparation failed with exit code ${prepareResult.status}`);
}
await access(steamCmd);

const selectedAppIds = edition === "all"
  ? [4516500, 5029880]
  : [edition === "full" ? 4516500 : 5029880];
const platformKey = platform === "all" ? "windows-macos-linux" : platform;
const steamArguments = ["./steamcmd.sh", "+login", account];
for (const appId of selectedAppIds) {
  steamArguments.push(
    "+run_app_build",
    join(steamPipeRoot, "scripts", `app_build_${appId}_${platformKey}.vdf`)
  );
}
steamArguments.push("+quit");

console.log(
  `Uploading ${edition === "all" ? "full and demo builds" : `${edition} build`} ` +
  `for ${platform === "all" ? "Windows, macOS, and Linux" : platform} ` +
  `through SteamCMD as ${account}.`
);
console.log("SteamCMD may securely prompt for a password and Steam Guard approval.");

const result = spawnSync("bash", steamArguments, {
  cwd: dirname(steamCmd),
  stdio: "inherit"
});
if (result.error) throw result.error;
if (result.status !== 0) {
  throw new Error(`SteamCMD upload failed with exit code ${result.status}`);
}

function argumentValue(name) {
  const prefix = `${name}=`;
  const entry = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return entry?.slice(prefix.length) || null;
}
