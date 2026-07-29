#!/usr/bin/env node

import { execFile } from "node:child_process";
import {
  access,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const require = createRequire(import.meta.url);
const { packager: packageElectron } = require("@electron/packager");
const { DEMO_APP_ID, FULL_GAME_APP_ID } = require("./desktopConfig.cjs");
const hostRoot = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(hostRoot, "..");
const outputRoot = join(appRoot, "build/steam");
const inputRoot = join(appRoot, "steam-input");
const iconRoot = join(appRoot, "capsule_art/generated");
const args = parseArgs(process.argv.slice(2));
const editions = args.edition === "both" ? ["full", "demo"] : [args.edition];

await assertBuildInputs();
for (const edition of editions) {
  await buildStaticEdition(edition);
  await packageEdition(edition);
}

async function packageEdition(edition) {
  const isDemo = edition === "demo";
  const productName = isDemo ? "Marque & Reprisal Demo" : "Marque & Reprisal";
  const gameDirectory = isDemo ? "dist-demo" : "dist";
  const gameRoot = join(appRoot, gameDirectory);
  const appId = isDemo
    ? optionalAppId(process.env.MARQUE_STEAM_DEMO_APP_ID) || DEMO_APP_ID
    : optionalAppId(process.env.MARQUE_STEAM_APP_ID) || FULL_GAME_APP_ID;
  const temporaryRoot = await mkdtemp(join(tmpdir(), `marque-steam-${edition}-`));
  const manifestPath = join(temporaryRoot, "steam-build.json");
  const targetRoot = join(outputRoot, edition, `${args.platform}-${args.arch}`);
  const sourceRoot = await prepareHostSource(temporaryRoot);

  try {
    await writeFile(
      manifestPath,
      `${JSON.stringify({
        appId,
        edition,
        gameDirectory,
        generatedAt: new Date().toISOString()
      }, null, 2)}\n`
    );
    await rm(targetRoot, { recursive: true, force: true });
    await mkdir(targetRoot, { recursive: true });

    const packagePaths = await packageElectron({
      appBundleId: isDemo
        ? "com.garrettpetersen.marque-and-reprisal.demo"
        : "com.garrettpetersen.marque-and-reprisal",
      appCategoryType: "public.app-category.games",
      appVersion: await packageVersion(),
      arch: args.arch,
      asar: false,
      afterCopy: [
        async ({ buildPath }) => {
          const resourcesRoot = dirname(buildPath);
          await Promise.all([
            cp(gameRoot, join(resourcesRoot, gameDirectory), { recursive: true }),
            cp(inputRoot, join(resourcesRoot, "steam-input"), { recursive: true }),
            cp(manifestPath, join(resourcesRoot, "steam-build.json"))
          ]);
        }
      ],
      dir: sourceRoot,
      electronVersion: "43.2.0",
      executableName: productName,
      icon: platformIcon(args.platform),
      name: productName,
      out: targetRoot,
      overwrite: true,
      platform: args.platform,
      prune: sourceRoot === hostRoot,
      quiet: false,
      win32metadata: {
        CompanyName: "Garrett Petersen",
        FileDescription: productName,
        InternalName: productName,
        OriginalFilename: `${productName}.exe`,
        ProductName: productName
      }
    });

    if (packagePaths.length !== 1) {
      throw new Error(`Expected one packaged app, received ${packagePaths.length}`);
    }
    await verifyPackage(packagePaths[0], { appId, edition, gameDirectory, productName });
    console.log(`Packaged ${edition}: ${packagePaths[0]}`);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

async function buildStaticEdition(edition) {
  if (args.skipStaticBuild) return;
  const script = edition === "demo" ? "build:demo" : "build";
  console.log(`Building ${edition} web edition...`);
  await run("npm", ["run", script], { cwd: appRoot, maxBuffer: 32 * 1024 * 1024 });
}

async function verifyPackage(packagePath, expected) {
  const resourcesRoot = args.platform === "darwin"
    ? join(packagePath, `${expected.productName}.app/Contents/Resources`)
    : join(packagePath, "resources");
  const manifest = JSON.parse(await readFile(join(resourcesRoot, "steam-build.json"), "utf8"));
  if (
    manifest.edition !== expected.edition ||
    manifest.gameDirectory !== expected.gameDirectory ||
    manifest.appId !== expected.appId
  ) {
    throw new Error(`Packaged ${expected.edition} manifest does not match its build`);
  }
  const editionSource = await readFile(
    join(resourcesRoot, expected.gameDirectory, "src/buildEdition.js"),
    "utf8"
  );
  const expectedMarker = `BUILD_EDITION_ID = "${expected.edition}"`;
  if (!editionSource.includes(expectedMarker)) {
    throw new Error(`Packaged game is missing edition marker: ${expectedMarker}`);
  }
  await access(join(resourcesRoot, "steam-input/game_actions.vdf"));
  await access(join(resourcesRoot, "app/package.json"));
  await access(join(resourcesRoot, "app/node_modules", targetKoffiBinary()));
  await access(join(resourcesRoot, "app/node_modules/steamworks.js", targetSteamworksBinary()));
}

async function packageVersion() {
  const appPackage = JSON.parse(await readFile(join(appRoot, "package.json"), "utf8"));
  return appPackage.version || "0.1.0";
}

async function assertBuildInputs() {
  await access(join(hostRoot, "node_modules/@electron/packager"));
  await access(join(inputRoot, "game_actions.vdf"));
  await access(platformIcon(args.platform));
}

function platformIcon(platform) {
  if (platform === "darwin") return join(iconRoot, "marque-and-reprisal.icns");
  if (platform === "linux") return join(iconRoot, "app_icon_512.png");
  return join(iconRoot, "marque-and-reprisal.ico");
}

async function prepareHostSource(temporaryRoot) {
  if (args.platform === process.platform && args.arch === process.arch) return hostRoot;
  const sourceRoot = join(temporaryRoot, "steam-host");
  await cp(hostRoot, sourceRoot, {
    filter: (path) => path !== join(hostRoot, "node_modules") &&
      !path.startsWith(`${join(hostRoot, "node_modules")}/`),
    recursive: true
  });
  console.log(`Installing production dependencies for ${args.platform} ${args.arch}...`);
  await run(
    "npm",
    ["ci", "--ignore-scripts", "--omit=dev", `--os=${args.platform}`, `--cpu=${args.arch}`],
    {
      cwd: sourceRoot,
      env: {
        ...process.env,
        npm_config_arch: args.arch,
        npm_config_cpu: args.arch,
        npm_config_os: args.platform,
        npm_config_platform: args.platform
      },
      maxBuffer: 32 * 1024 * 1024
    }
  );
  return sourceRoot;
}

function targetKoffiBinary() {
  if (args.platform === "darwin") {
    return `@koromix/koffi-darwin-${args.arch}/darwin_${args.arch}/koffi.node`;
  }
  if (args.platform === "win32") {
    return `@koromix/koffi-win32-${args.arch}/win32_${args.arch}/koffi.node`;
  }
  return `@koromix/koffi-linux-${args.arch}/linux_${args.arch}/koffi.node`;
}

function targetSteamworksBinary() {
  if (args.platform === "darwin") {
    return `dist/osx/steamworksjs.darwin-${args.arch}.node`;
  }
  if (args.platform === "win32") {
    return "dist/win64/steamworksjs.win32-x64-msvc.node";
  }
  return "dist/linux64/steamworksjs.linux-x64-gnu.node";
}

function parseArgs(values) {
  const parsed = {
    arch: process.arch,
    edition: "both",
    platform: process.platform,
    skipStaticBuild: false
  };
  for (const value of values) {
    if (value === "--skip-static-build") parsed.skipStaticBuild = true;
    else if (value.startsWith("--edition=")) parsed.edition = value.slice("--edition=".length);
    else if (value.startsWith("--platform=")) parsed.platform = value.slice("--platform=".length);
    else if (value.startsWith("--arch=")) parsed.arch = value.slice("--arch=".length);
    else throw new Error(`Unknown Steam package option: ${value}`);
  }
  if (!["full", "demo", "both"].includes(parsed.edition)) {
    throw new Error(`Invalid Steam package edition: ${parsed.edition}`);
  }
  if (!["darwin", "win32", "linux"].includes(parsed.platform)) {
    throw new Error(`Invalid Electron platform: ${parsed.platform}`);
  }
  if (!["x64", "arm64"].includes(parsed.arch)) {
    throw new Error(`Invalid Electron architecture: ${parsed.arch}`);
  }
  if (parsed.platform !== "darwin" && parsed.arch !== "x64") {
    throw new Error(`Steamworks.js only ships ${parsed.platform} x64 binaries`);
  }
  return parsed;
}

function optionalAppId(value) {
  if (value == null || value === "") return null;
  const appId = Number(value);
  if (!Number.isInteger(appId) || appId <= 0) throw new Error(`Invalid Steam App ID: ${value}`);
  return appId;
}
