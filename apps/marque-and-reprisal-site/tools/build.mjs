import { spawnSync } from "node:child_process";
import {
  access,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  LOCALIZED_CAPSULE_ASSET_NAMES,
  pressMedia,
  SHIP_ROSTER_ASSET_VERSION,
  localizedCapsules,
  screenshotLocales,
  screenshots,
  shipRoster
} from "../content/site-content.mjs";
import {
  defaultWebsiteLocale,
  localizedPagePath,
  websiteLocales
} from "../content/site-locales.mjs";
import {
  factSheetText,
  homePage,
  notFoundPage,
  pressPage,
  privacyPage,
  qAndAPage,
  qAndAText,
  robotsText,
  shipsPage,
  sitemapXml
} from "./pages.mjs";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(appRoot, "src");
const distRoot = path.join(appRoot, "dist");
const capsuleOutputRoot = path.resolve(
  appRoot,
  "../pixel-globe/capsule_art/generated"
);
const screenshotSourceRoot = path.resolve(
  appRoot,
  "../pixel-globe/promotional-materials/steam-screenshots"
);
const shipSpriteSourceRoot = path.resolve(
  appRoot,
  "../pixel-globe/public/assets/vehicles/unity-ships"
);

await rm(distRoot, { recursive: true, force: true });
await cp(sourceRoot, distRoot, { recursive: true });
await publishLocalizedScreenshots();
await publishShipSprites();

await writePage("index.html", homePage());
await writePage("qa/index.html", qAndAPage());
await writePage("ships/index.html", shipsPage());
await writePage("press/index.html", pressPage());
for (const locale of websiteLocales.filter((candidate) => candidate !== defaultWebsiteLocale)) {
  await writePage(pathForPage(localizedPagePath(locale, "home")), homePage(locale.appLocale));
  await writePage(pathForPage(localizedPagePath(locale, "press")), pressPage(locale.appLocale));
}
await writePage("privacy/index.html", privacyPage());
await writePage("404.html", notFoundPage());
await writePage("robots.txt", robotsText());
await writePage("sitemap.xml", sitemapXml());
await writePage("assets/press/factsheet.txt", factSheetText());
await writePage("assets/press/developer-qa.txt", qAndAText());
await buildLocalizedCapsuleDownloads();
await buildLocalizedScreenshotDownloads();
await buildLocalizedPressKitDownloads();
await buildPressKitArchive();
await validateBuild();

const buildBytes = await directorySize(distRoot);
process.stdout.write(
  "Built Marque & Reprisal website at " + distRoot +
  " (" + (buildBytes / 1024 / 1024).toFixed(1) + " MB)\n"
);

async function writePage(relativePath, contents) {
  const outputPath = path.join(distRoot, relativePath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, contents);
}

async function publishLocalizedScreenshots() {
  const outputRoot = path.join(distRoot, "assets/press/screenshots");
  await access(path.join(screenshotSourceRoot, "manifest.json"));
  await rm(outputRoot, { recursive: true, force: true });
  await cp(screenshotSourceRoot, outputRoot, { recursive: true });
}

async function publishShipSprites() {
  const outputRoot = path.join(
    distRoot,
    "assets/ships",
    SHIP_ROSTER_ASSET_VERSION
  );
  await mkdir(outputRoot, { recursive: true });
  for (const ship of shipRoster) {
    for (const suffix of ["", "-light", "-shade", "-shadow"]) {
      const fileName = `${ship.slug}-32-headings${suffix}.png`;
      await cp(
        path.join(shipSpriteSourceRoot, fileName),
        path.join(outputRoot, fileName)
      );
    }
  }
}

async function buildLocalizedCapsuleDownloads() {
  const stagingRoot = await mkdtemp(path.join(tmpdir(), "marque-localized-capsules-"));
  const publishedRoot = path.join(
    distRoot,
    "assets/press/localized-capsules"
  );
  const downloadsRoot = path.join(distRoot, "downloads");
  const bundleNames = [];
  try {
    await mkdir(publishedRoot, { recursive: true });
    await mkdir(downloadsRoot, { recursive: true });
    for (const locale of localizedCapsules) {
      const bundleName = locale.archiveFile.replace(/\.zip$/, "");
      const bundleRoot = path.join(stagingRoot, bundleName);
      const publishedLocaleRoot = path.join(publishedRoot, locale.steamCode);
      const readme = localizedCapsuleReadme(locale);
      bundleNames.push(bundleName);
      await mkdir(bundleRoot, { recursive: true });
      await mkdir(publishedLocaleRoot, { recursive: true });

      for (const baseName of LOCALIZED_CAPSULE_ASSET_NAMES) {
        const filename = `${baseName}_${locale.steamCode}.png`;
        const sourcePath = path.join(capsuleOutputRoot, filename);
        await access(sourcePath);
        await Promise.all([
          cp(sourcePath, path.join(bundleRoot, filename)),
          cp(sourcePath, path.join(publishedLocaleRoot, filename))
        ]);
      }

      await Promise.all([
        writeFile(path.join(bundleRoot, "README.txt"), readme),
        writeFile(path.join(publishedLocaleRoot, "README.txt"), readme)
      ]);
      createZip(
        path.join(downloadsRoot, locale.archiveFile),
        stagingRoot,
        [bundleName]
      );
    }

    createZip(
      path.join(
        downloadsRoot,
        "marque-and-reprisal-capsules-all-languages.zip"
      ),
      stagingRoot,
      bundleNames
    );
  } finally {
    await rm(stagingRoot, { recursive: true, force: true });
  }
}

function localizedCapsuleReadme(locale) {
  return [
    "MARQUE & REPRISAL LOCALIZED CAPSULE ART",
    "=======================================",
    "",
    `Language: ${locale.label}`,
    `Localized title: ${locale.title}`,
    `Steam language suffix: ${locale.steamCode}`,
    "",
    "CONTENTS",
    "",
    ...LOCALIZED_CAPSULE_ASSET_NAMES.map(
      (baseName) => `- ${baseName}_${locale.steamCode}.png`
    ),
    "",
    "These are full-resolution storefront, library, event, social, and",
    "press-ready PNG exports. Preserve their aspect ratios and use",
    "nearest-neighbour scaling to retain crisp pixel edges.",
    ""
  ].join("\n");
}

async function buildLocalizedScreenshotDownloads() {
  const stagingRoot = await mkdtemp(path.join(tmpdir(), "marque-localized-screenshots-"));
  const downloadsRoot = path.join(distRoot, "downloads");
  const bundleNames = [];
  try {
    await mkdir(downloadsRoot, { recursive: true });
    for (const locale of screenshotLocales) {
      const bundleName = locale.archiveFile.replace(/\.zip$/, "");
      const bundleRoot = path.join(stagingRoot, bundleName);
      bundleNames.push(bundleName);
      await mkdir(bundleRoot, { recursive: true });
      for (const shot of screenshots) {
        const filename = shot.files[locale.steamCode];
        await cp(
          path.join(screenshotSourceRoot, filename),
          path.join(bundleRoot, filename)
        );
      }
      await writeFile(
        path.join(bundleRoot, "README.txt"),
        localizedScreenshotReadme(locale)
      );
      createZip(
        path.join(downloadsRoot, locale.archiveFile),
        stagingRoot,
        [bundleName]
      );
    }
    createZip(
      path.join(downloadsRoot, "marque-and-reprisal-screenshots-all-languages.zip"),
      stagingRoot,
      bundleNames
    );
  } finally {
    await rm(stagingRoot, { recursive: true, force: true });
  }
}

function localizedScreenshotReadme(locale) {
  return [
    "MARQUE & REPRISAL LOCALIZED SCREENSHOTS",
    "=======================================",
    "",
    `Language: ${locale.label}`,
    `Steam language suffix: ${locale.steamCode}`,
    "",
    "CONTENTS",
    "",
    ...screenshots.map((shot) => `- ${shot.files[locale.steamCode]}`),
    "",
    `${screenshots.length} full-resolution 1920x1080 gameplay screenshots for press and`,
    "storefront use. Preserve their aspect ratio and crisp pixel edges.",
    ""
  ].join("\n");
}

async function buildPressKitArchive() {
  const stagingRoot = await mkdtemp(path.join(tmpdir(), "marque-press-kit-"));
  const bundleName = "marque-and-reprisal-press-kit";
  const bundleRoot = path.join(stagingRoot, bundleName);
  const downloadsRoot = path.join(distRoot, "downloads");
  const outputPath = path.join(downloadsRoot, bundleName + ".zip");
  try {
    await mkdir(bundleRoot, { recursive: true });
    const entries = Object.freeze([
      ["assets/press/README.txt", "README.txt"],
      ["assets/press/factsheet.txt", "factsheet.txt"],
      ["assets/press/developer-qa.txt", "developer-qa.txt"],
      ["assets/press/screenshots", "screenshots"],
      ["assets/press/logos", "logos"],
      ["assets/press/capsule-art", "capsule-art"],
      ["assets/press/localized-capsules", "localized-capsules"]
    ]);
    for (const [source, target] of entries) {
      const targetPath = path.join(bundleRoot, target);
      await mkdir(path.dirname(targetPath), { recursive: true });
      await cp(path.join(distRoot, source), targetPath, { recursive: true });
    }
    await mkdir(downloadsRoot, { recursive: true });
    createZip(outputPath, stagingRoot, [bundleName]);
  } finally {
    await rm(stagingRoot, { recursive: true, force: true });
  }
}

async function buildLocalizedPressKitDownloads() {
  const stagingRoot = await mkdtemp(path.join(tmpdir(), "marque-localized-press-kits-"));
  const downloadsRoot = path.join(distRoot, "downloads");
  try {
    await mkdir(downloadsRoot, { recursive: true });
    for (const locale of websiteLocales) {
      const bundleName = locale.pressKitArchive.replace(/\.zip$/, "");
      const bundleRoot = path.join(stagingRoot, bundleName);
      await mkdir(path.join(bundleRoot, "screenshots"), { recursive: true });
      await cp(path.join(distRoot, "assets/press/logos"), path.join(bundleRoot, "logos"), { recursive: true });
      await cp(
        path.join(distRoot, "assets/press/localized-capsules", locale.steamCode),
        path.join(bundleRoot, "capsule-art"),
        { recursive: true }
      );
      for (const shot of screenshots) {
        const filename = shot.files[locale.steamCode];
        await cp(
          path.join(distRoot, "assets/press/screenshots", filename),
          path.join(bundleRoot, "screenshots", filename)
        );
      }
      await Promise.all([
        cp(path.join(distRoot, "assets/press/factsheet.txt"), path.join(bundleRoot, "factsheet.txt")),
        writeFile(path.join(bundleRoot, "description.txt"), localizedDescriptionText(locale)),
        writeFile(path.join(bundleRoot, "README.txt"), localizedPressKitReadme(locale))
      ]);
      createZip(path.join(downloadsRoot, locale.pressKitArchive), stagingRoot, [bundleName]);
      await rm(bundleRoot, { recursive: true, force: true });
    }
  } finally {
    await rm(stagingRoot, { recursive: true, force: true });
  }
}

function localizedPressKitReadme(locale) {
  return [
    "MARQUE & REPRISAL LOCALIZED PRESS KIT",
    "======================================",
    "",
    `Language: ${locale.label} / ${locale.nativeLabel}`,
    `Website: ${siteUrl(localizedPagePath(locale, "press"))}`,
    "",
    "CONTENTS",
    `- ${screenshots.length} localized 1920x1080 gameplay screenshots`,
    `- ${LOCALIZED_CAPSULE_ASSET_NAMES.length} localized capsule and storefront images`,
    "- Shared game logos",
    `- ${locale.nativeLabel} game description`,
    "- English plain-text fact sheet",
    "- Permanent download links for the gameplay trailer and trailer thumbnail",
    "",
    "PRESS MEDIA",
    `- Gameplay trailer: ${pressMedia.trailerUrl}`,
    `- Trailer thumbnail (JPG): ${pressMedia.thumbnailJpgUrl}`,
    `- Trailer thumbnail (PNG): ${pressMedia.thumbnailPngUrl}`,
    "",
    "The localized website contains the approved translated game description.",
    ""
  ].join("\n");
}

function localizedDescriptionText(locale) {
  const featureIds = Object.keys(locale.featureCopy);
  if (featureIds.length !== locale.actions.length) {
    throw new Error(`Localized press description is incomplete: ${locale.appLocale}`);
  }
  return [
    locale.title,
    "=".repeat(Math.max(12, [...locale.title].length)),
    "",
    locale.intro,
    "",
    ...locale.actions.flatMap((action, index) => [
      action.toLocaleUpperCase(locale.appLocale),
      locale.featureCopy[featureIds[index]],
      ""
    ]),
    `Website: ${siteUrl(localizedPagePath(locale, "home"))}`,
    `Press kit: ${siteUrl(localizedPagePath(locale, "press"))}`,
    ""
  ].join("\n");
}

function pathForPage(urlPath) {
  if (!urlPath.startsWith("/") || !urlPath.endsWith("/")) {
    throw new Error(`Localized page path is not a directory URL: ${urlPath}`);
  }
  return `${urlPath.slice(1)}index.html`;
}

function siteUrl(urlPath) {
  return `https://marque-and-reprisal.com${urlPath}`;
}

function createZip(outputPath, cwd, entries) {
  const archive = spawnSync("zip", ["-q", "-r", outputPath, ...entries], {
    cwd,
    encoding: "utf8"
  });
  if (archive.error) throw archive.error;
  if (archive.status !== 0) {
    throw new Error(
      "zip failed: " + (archive.stderr || archive.stdout || "unknown error")
    );
  }
}

async function validateBuild() {
  const requiredPaths = [
    "index.html",
    "qa/index.html",
    "ships/index.html",
    "press/index.html",
    "privacy/index.html",
    "404.html",
    "downloads/marque-and-reprisal-press-kit.zip",
    "downloads/marque-and-reprisal-capsules-all-languages.zip",
    "downloads/marque-and-reprisal-screenshots-all-languages.zip",
    "assets/art/social-share.png",
    "assets/art/party-let-ampersand.png",
    "assets/fonts/pirata-one.ttf",
    "assets/fonts/pirata-one-OFL.txt",
    "assets/press/developer-qa.txt",
    "assets/press/README.txt",
    "assets/press/capsule-art/capsule-source.aseprite",
    "assets/press/capsule-art/title-with-ship.png",
    ...shipRoster.flatMap((ship) => ["", "-light", "-shade", "-shadow"].map(
      (suffix) =>
        `assets/ships/${SHIP_ROSTER_ASSET_VERSION}/${ship.slug}-32-headings${suffix}.png`
    )),
    ...localizedCapsules.flatMap((locale) => [
      `downloads/${locale.archiveFile}`,
      `assets/press/localized-capsules/${locale.steamCode}/${locale.previewFile}`
    ]),
    ...websiteLocales.flatMap((locale) => [
      pathForPage(localizedPagePath(locale, "home")),
      pathForPage(localizedPagePath(locale, "press")),
      `downloads/${locale.pressKitArchive}`
    ]),
    ...screenshotLocales.map((locale) => `downloads/${locale.archiveFile}`),
    ...screenshots.flatMap((shot) => screenshotLocales.map(
      (locale) => `assets/press/screenshots/${shot.files[locale.steamCode]}`
    ))
  ];
  for (const relativePath of requiredPaths) {
    await access(path.join(distRoot, relativePath));
  }

  const htmlPaths = (await filesBelow(distRoot)).filter((filePath) => filePath.endsWith(".html"));
  for (const htmlPath of htmlPaths) {
    const html = await readFile(htmlPath, "utf8");
    if (html.includes("TODO") || /PLACEHOLDER|lorem ipsum/i.test(html)) {
      throw new Error("Unfinished copy in " + path.relative(distRoot, htmlPath));
    }
    if (!html.includes("<meta name='description'")) {
      throw new Error("Missing meta description in " + path.relative(distRoot, htmlPath));
    }
    const referencePattern = /(?:href|src|poster)='([^']+)'/g;
    for (const match of html.matchAll(referencePattern)) {
      await validateReference(match[1], htmlPath);
    }
  }

  const cssPath = path.join(distRoot, "assets/styles/site.css");
  const css = await readFile(cssPath, "utf8");
  for (const match of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
    await validateReference(match[1], cssPath);
  }
}

async function validateReference(reference, ownerPath) {
  if (
    reference === "" ||
    reference.startsWith("#") ||
    reference.startsWith("data:") ||
    reference.startsWith("https://") ||
    reference.startsWith("mailto:") ||
    reference.startsWith("tel:")
  ) {
    return;
  }
  const cleanReference = decodeURIComponent(reference.split(/[?#]/, 1)[0]);
  let targetPath = cleanReference.startsWith("/")
    ? path.join(distRoot, cleanReference)
    : path.resolve(path.dirname(ownerPath), cleanReference);
  if (cleanReference.endsWith("/")) targetPath = path.join(targetPath, "index.html");
  if (!targetPath.startsWith(distRoot + path.sep) && targetPath !== distRoot) {
    throw new Error("Reference escapes build root: " + reference);
  }
  try {
    await access(targetPath);
  } catch {
    throw new Error(
      "Missing local reference " + reference + " from " + path.relative(distRoot, ownerPath)
    );
  }
}

async function filesBelow(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...await filesBelow(entryPath));
    else if (entry.isFile()) files.push(entryPath);
  }
  return files;
}

async function directorySize(root) {
  const files = await filesBelow(root);
  let bytes = 0;
  for (const filePath of files) bytes += (await stat(filePath)).size;
  return bytes;
}
