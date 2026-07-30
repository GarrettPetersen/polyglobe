import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const steamBuildRoot = join(appRoot, "build", "steam");
const steamPipeRoot = join(appRoot, "build", "steampipe");
const scriptRoot = join(steamPipeRoot, "scripts");
const depotConfigPath = join(appRoot, "steam", "depots.json");
const selectedPlatforms = platformSelection(argumentValue("--platform") || "all");
const platformKey = selectedPlatforms.join("-");
const depotConfig = JSON.parse(await readFile(depotConfigPath, "utf8"));

const editions = Object.freeze([
  {
    id: "full",
    appId: 4516500,
    windowsDirectory: "Marque & Reprisal-win32-x64",
    macDirectory: "Marque & Reprisal-darwin-x64",
    macAppName: "Marque & Reprisal.app",
    linuxDirectory: "Marque & Reprisal-linux-x64"
  },
  {
    id: "demo",
    appId: 5029880,
    windowsDirectory: "Marque & Reprisal Demo-win32-x64",
    macDirectory: "Marque & Reprisal Demo-darwin-x64",
    macAppName: "Marque & Reprisal Demo.app",
    linuxDirectory: "Marque & Reprisal Demo-linux-x64"
  }
]);

await mkdir(scriptRoot, { recursive: true });

const summaries = [];
for (const edition of editions) {
  const contentRoot = join(steamBuildRoot, edition.id);
  const windowsRoot = join(contentRoot, "win32-x64", edition.windowsDirectory);
  const macRoot = join(contentRoot, "darwin-x64", edition.macDirectory);
  const linuxRoot = join(contentRoot, "linux-x64", edition.linuxDirectory);
  const configuredEdition = depotConfig[edition.id];
  assertEditionConfig(configuredEdition, edition);
  const platforms = {
    windows: {
      depotId: configuredEdition.depots.windows,
      contentRoot: windowsRoot,
      localPath: "*",
      depotPath: ".",
      manifestPath: join(windowsRoot, "resources", "steam-build.json")
    },
    macos: {
      depotId: configuredEdition.depots.macos,
      contentRoot: macRoot,
      localPath: `${edition.macAppName}/*`,
      depotPath: edition.macAppName,
      manifestPath: join(
        macRoot,
        edition.macAppName,
        "Contents",
        "Resources",
        "steam-build.json"
      )
    },
    linux: {
      depotId: configuredEdition.depots.linux,
      contentRoot: linuxRoot,
      localPath: "*",
      depotPath: ".",
      manifestPath: join(linuxRoot, "resources", "steam-build.json")
    }
  };
  const selectedDepots = [];
  for (const platform of selectedPlatforms) {
    const selected = platforms[platform];
    assertDepotId(selected.depotId, edition.id, platform);
    const manifest = await readSteamBuildManifest(selected.manifestPath, edition);
    const depotFileName = `depot_build_${selected.depotId}.vdf`;
    await writeFile(
      join(scriptRoot, depotFileName),
      depotBuildVdf({ ...selected }),
      "utf8"
    );
    selectedDepots.push({
      platform,
      depotId: selected.depotId,
      depotBuildScript: join(scriptRoot, depotFileName),
      depotFileName,
      contentRoot: selected.contentRoot,
      generatedAt: manifest.generatedAt
    });
  }

  const description = [
    "Marque & Reprisal",
    edition.id,
    selectedDepots[0].generatedAt.slice(0, 10),
    selectedPlatforms.join(" + ")
  ].join(" ");
  const appFileName = `app_build_${edition.appId}_${platformKey}.vdf`;
  const outputRoot = join(steamPipeRoot, "output", edition.id, platformKey);
  await mkdir(outputRoot, { recursive: true });

  await writeFile(
    join(scriptRoot, appFileName),
    appBuildVdf({
      appId: edition.appId,
      description,
      depots: selectedDepots,
      outputRoot
    }),
    "utf8"
  );
  summaries.push({
    edition: edition.id,
    appId: edition.appId,
    platforms: selectedPlatforms,
    depots: selectedDepots.map((depot) => ({
      platform: depot.platform,
      depotId: depot.depotId,
      depotBuildScript: depot.depotBuildScript,
      contentRoot: depot.contentRoot,
      generatedAt: depot.generatedAt
    })),
    appBuildScript: join(scriptRoot, appFileName),
    outputRoot
  });
}

await writeFile(
  join(steamPipeRoot, "upload-plan.json"),
  `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    platformKey,
    builds: summaries
  }, null, 2)}\n`,
  "utf8"
);

for (const summary of summaries) {
  console.log(
    `Prepared ${summary.edition} App ${summary.appId}, ` +
    `${summary.depots.map((depot) => `${depot.platform} Depot ${depot.depotId}`).join(", ")}: ` +
    summary.appBuildScript
  );
}

async function readSteamBuildManifest(path, edition) {
  let parsed;
  try {
    parsed = JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read packaged Steam manifest ${path}: ${error.message}`);
  }
  if (parsed.appId !== edition.appId || parsed.edition !== edition.id) {
    throw new Error(
      `Packaged Steam manifest mismatch at ${path}: ` +
      `expected ${edition.id}/${edition.appId}, received ${parsed.edition}/${parsed.appId}`
    );
  }
  if (typeof parsed.generatedAt !== "string" || !Number.isFinite(Date.parse(parsed.generatedAt))) {
    throw new Error(`Packaged Steam manifest has no valid generation time: ${path}`);
  }
  return parsed;
}

function assertEditionConfig(configured, edition) {
  if (!configured || configured.appId !== edition.appId || !configured.depots) {
    throw new Error(
      `Steam depot configuration mismatch for ${edition.id} in ${depotConfigPath}`
    );
  }
}

function assertDepotId(depotId, edition, platform) {
  if (!Number.isInteger(depotId) || depotId <= 0) {
    throw new Error(
      `Steam has not assigned the ${edition} ${platform} depot yet. ` +
      `Create it in Steamworks, then record its Depot ID in ${depotConfigPath}`
    );
  }
}

function depotBuildVdf({
  depotId,
  contentRoot,
  localPath,
  depotPath
}) {
  return `"DepotBuildConfig"
{
  "DepotID" "${depotId}"
  "ContentRoot" "${vdfPath(contentRoot)}"

  "FileMapping"
  {
    "LocalPath" "${vdfValue(localPath)}"
    "DepotPath" "${vdfValue(depotPath)}"
    "Recursive" "1"
  }

  "FileExclusion" ".DS_Store"
}
`;
}

function appBuildVdf({
  appId,
  depots,
  description,
  outputRoot
}) {
  return `"AppBuild"
{
  "AppID" "${appId}"
  "Desc" "${vdfValue(description)}"
  "Preview" "0"
  "SetLive" ""
  "ContentRoot" "${vdfPath(steamBuildRoot)}"
  "BuildOutput" "${vdfPath(outputRoot)}"

  "Depots"
  {
${depots.map((depot) =>
    `    "${depot.depotId}" "${vdfValue(depot.depotFileName)}"`
  ).join("\n")}
  }
}
`;
}

function vdfPath(value) {
  return vdfValue(resolve(value).replaceAll("\\", "/"));
}

function vdfValue(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll("\"", "\\\"");
}

function platformSelection(value) {
  if (value === "all") return ["windows", "macos", "linux"];
  if (value === "windows" || value === "macos" || value === "linux") return [value];
  throw new Error("Steam upload platform must be one of: all, windows, macos, linux");
}

function argumentValue(name) {
  const prefix = `${name}=`;
  const entry = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return entry?.slice(prefix.length) || null;
}
