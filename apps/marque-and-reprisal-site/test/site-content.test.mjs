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
  site
} from "../content/site-content.mjs";

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
