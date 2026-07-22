import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  features,
  languages,
  pressCapsuleArt,
  screenshots,
  site,
  WORLD_MAP_CELL_COUNT
} from "../content/site-content.mjs";
import { homePage } from "../tools/pages.mjs";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("Steam description has the complete eight-part voyage sequence", () => {
  assert.deepEqual(
    features.map((feature) => feature.id),
    ["explore", "trade", "fish", "whale", "colonize", "fight", "pillage", "survive"]
  );
  assert.equal(new Set(features.map((feature) => feature.id)).size, features.length);
});

test("every feature points at tracked video and screenshot assets", async () => {
  for (const feature of features) {
    await access(path.join(appRoot, "src", feature.video));
    await access(path.join(appRoot, "src", feature.poster));
  }
  assert.equal(screenshots.length, features.length);
});

test("published links and localization claims are explicit", () => {
  assert.match(site.domain, /^https:\/\//);
  assert.equal(site.itchUrl, "https://garrettpetersen.itch.io/marque-and-reprisal");
  assert.equal(site.xUrl, "https://x.com/garrettpetersen");
  assert.equal(site.xHandle, "@garrettpetersen");
  assert.equal(site.steamStatus, "Page coming soon");
  assert.equal(languages.length, 11);
  assert.equal(new Set(languages).size, languages.length);
});

test("world copy uses the exact subdivision-7 map-cell count", async () => {
  assert.equal(WORLD_MAP_CELL_COUNT, 163_842);
  assert.match(features[0].copy, /163,842-cell map/);

  const pagesSource = await readFile(
    path.join(appRoot, "tools/pages.mjs"),
    "utf8"
  );
  assert.match(pagesSource, /WORLD_MAP_CELL_COUNT\.toLocaleString\("en-US"\)/);
  assert.doesNotMatch(features[0].copy + pagesSource, /164k|164,000/);
});

test("social sharing uses the 1200 × 630 capsule card", async () => {
  const card = await readFile(path.join(appRoot, "src/assets/art/social-share.png"));
  assert.deepEqual(
    [...card.subarray(0, 8)],
    [137, 80, 78, 71, 13, 10, 26, 10]
  );
  assert.equal(card.readUInt32BE(16), 1200);
  assert.equal(card.readUInt32BE(20), 630);

  const page = homePage();
  assert.match(page, /<meta property='og:image' content='https:\/\/marque-and-reprisal\.com\/assets\/art\/social-share\.png'>/);
  assert.match(page, /<meta property='og:image:type' content='image\/png'>/);
  assert.match(page, /<meta property='og:image:width' content='1200'>/);
  assert.match(page, /<meta property='og:image:height' content='630'>/);
  assert.match(page, /<meta property='og:image:alt' content='[^']+'>/);
  assert.match(page, /<meta name='twitter:card' content='summary_large_image'>/);
  assert.match(page, /<meta name='twitter:image' content='https:\/\/marque-and-reprisal\.com\/assets\/art\/social-share\.png'>/);
  assert.match(page, /<meta name='twitter:image:alt' content='[^']+'>/);
});

test("press kit exposes the aligned capsule components and authored lockup", async () => {
  assert.deepEqual(
    pressCapsuleArt.map((asset) => asset.file),
    [
      "complete-capsule.png",
      "title-with-ship.png",
      "title.png",
      "background.png",
      "ship.png",
      "reflection.png",
      "title-upper.png",
      "title-lower.png"
    ]
  );
  for (const asset of pressCapsuleArt) {
    await access(path.join(appRoot, "src/assets/press/capsule-art", asset.file));
  }
  await access(path.join(
    appRoot,
    "src/assets/press/capsule-art/capsule-source.aseprite"
  ));
});

test("Steam inline videos retain their full banner aspect ratio on every viewport", async () => {
  const css = await readFile(
    path.join(appRoot, "src/assets/styles/site.css"),
    "utf8"
  );
  const featureVideoBlocks = [...css.matchAll(/\.feature-window video\s*\{([^}]*)\}/g)];
  assert.equal(featureVideoBlocks.length, 1);
  assert.match(featureVideoBlocks[0][1], /aspect-ratio:\s*1170\s*\/\s*270/);
});

test("feature videos serve as the visible section headings", () => {
  const page = homePage();

  for (const feature of features) {
    const start = page.indexOf(
      `<section class='feature-row reveal' id='${feature.id}' aria-label='${feature.title}'>`
    );
    const end = page.indexOf("</section>", start);
    const section = page.slice(start, end);

    assert.notEqual(start, -1);
    assert.doesNotMatch(section, /<h2/);
    assert.ok(section.indexOf("class='feature-window'") < section.indexOf("class='feature-copy'"));
  }
});

test("code assets bypass stale browser caches", async () => {
  const page = homePage();
  const headers = await readFile(path.join(appRoot, "src/_headers"), "utf8");

  assert.match(page, /href='\/assets\/styles\/site\.css\?v=[^']+'/);
  assert.match(page, /src='\/assets\/scripts\/site\.js\?v=[^']+'/);
  assert.match(
    headers,
    /\/assets\/styles\/\*[\s\S]*?Cache-Control: public, max-age=0, must-revalidate/
  );
  assert.match(
    headers,
    /\/assets\/scripts\/\*[\s\S]*?Cache-Control: public, max-age=0, must-revalidate/
  );
});

test("the gameplay trailer bypasses stale browser caches", () => {
  const page = homePage();
  assert.match(page, /src='\/assets\/video\/gameplay-trailer\.mp4\?v=[0-9a-f]{12}'/);
});
