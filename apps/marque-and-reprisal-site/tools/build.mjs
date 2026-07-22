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
  factSheetText,
  homePage,
  notFoundPage,
  pressPage,
  privacyPage,
  robotsText,
  sitemapXml
} from "./pages.mjs";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(appRoot, "src");
const distRoot = path.join(appRoot, "dist");

await rm(distRoot, { recursive: true, force: true });
await cp(sourceRoot, distRoot, { recursive: true });

await writePage("index.html", homePage());
await writePage("press/index.html", pressPage());
await writePage("privacy/index.html", privacyPage());
await writePage("404.html", notFoundPage());
await writePage("robots.txt", robotsText());
await writePage("sitemap.xml", sitemapXml());
await writePage("assets/press/factsheet.txt", factSheetText());
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
      ["assets/press/screenshots", "screenshots"],
      ["assets/press/logos", "logos"],
      ["assets/press/capsule-art", "capsule-art"]
    ]);
    for (const [source, target] of entries) {
      const targetPath = path.join(bundleRoot, target);
      await mkdir(path.dirname(targetPath), { recursive: true });
      await cp(path.join(distRoot, source), targetPath, { recursive: true });
    }
    await mkdir(downloadsRoot, { recursive: true });
    const archive = spawnSync("zip", ["-q", "-r", outputPath, bundleName], {
      cwd: stagingRoot,
      encoding: "utf8"
    });
    if (archive.error) throw archive.error;
    if (archive.status !== 0) {
      throw new Error("zip failed: " + (archive.stderr || archive.stdout || "unknown error"));
    }
  } finally {
    await rm(stagingRoot, { recursive: true, force: true });
  }
}

async function validateBuild() {
  const requiredPaths = [
    "index.html",
    "press/index.html",
    "privacy/index.html",
    "404.html",
    "downloads/marque-and-reprisal-press-kit.zip",
    "assets/art/social-share.png",
    "assets/press/capsule-art/capsule-source.aseprite",
    "assets/press/capsule-art/title-with-ship.png"
  ];
  for (const relativePath of requiredPaths) {
    await access(path.join(distRoot, relativePath));
  }

  const htmlPaths = (await filesBelow(distRoot)).filter((filePath) => filePath.endsWith(".html"));
  for (const htmlPath of htmlPaths) {
    const html = await readFile(htmlPath, "utf8");
    if (/TODO|PLACEHOLDER|lorem ipsum/i.test(html)) {
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
