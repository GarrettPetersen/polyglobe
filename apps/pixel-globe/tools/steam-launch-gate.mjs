import { join } from "node:path";

export function steamLaunchChecks({ appRoot, edition, platform, hostPlatform, settings }) {
  if (!["all", "full", "demo"].includes(edition)) throw new Error(`Invalid Steam edition: ${edition}`);
  if (!["all", "macos", "windows", "linux"].includes(platform)) throw new Error(`Invalid Steam platform: ${platform}`);
  if (!["all", "macos"].includes(platform)) return [];
  if (hostPlatform !== "darwin") {
    throw new Error("Mac Steam uploads require a real packaged launch on macOS with Steam signed in");
  }
  const editions = edition === "all" ? ["full", "demo"] : [edition];
  return editions.map(id => {
    const config = settings.editions[id];
    if (!config || !Number.isInteger(config.appId) || !config.productName) {
      throw new Error(`Missing Steam launch configuration for ${id}`);
    }
    return [join(appRoot, "tools/check-steam-launch.mjs"), String(config.appId),
      join(appRoot, "build/steam", id, "darwin-universal",
        `${config.productName}-darwin-universal`, `${config.productName}.app`,
        "Contents/MacOS", config.productName), "--require-packaged"];
  });
}

export function runSteamLaunchGate(checks, run) {
  for (const args of checks) {
    const result = run(args);
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Packaged Steam launch failed for app ${args[1]}; upload blocked`);
  }
}
