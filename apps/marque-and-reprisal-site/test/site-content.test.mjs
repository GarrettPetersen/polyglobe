import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  features,
  languages,
  localizedCapsules,
  LOCALIZED_CAPSULE_ASSET_NAMES,
  pressCapsuleArt,
  qAndA,
  screenshotLocales,
  screenshots,
  site,
  WORLD_MAP_CELL_COUNT
} from "../content/site-content.mjs";
import {
  localizedPagePath,
  websiteLocale,
  websiteLocales
} from "../content/site-locales.mjs";
import { homePage, pressPage, qAndAPage, qAndAText } from "../tools/pages.mjs";

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
    assert.ok(
      screenshots.some((shot) => shot.files.english === path.basename(feature.poster)),
      `Feature ${feature.id} has an unknown screenshot poster`
    );
  }
  assert.equal(screenshots.length, 9);
  assert.equal(screenshotLocales.length, 11);
  const screenshotRoot = path.resolve(
    appRoot,
    "../pixel-globe/promotional-materials/steam-screenshots"
  );
  for (const screenshot of screenshots) {
    for (const locale of screenshotLocales) {
      const image = await readFile(path.join(
        screenshotRoot,
        screenshot.files[locale.steamCode]
      ));
      assert.deepEqual(
        [...image.subarray(0, 8)],
        [137, 80, 78, 71, 13, 10, 26, 10]
      );
      assert.equal(image.readUInt32BE(16), 1920);
      assert.equal(image.readUInt32BE(20), 1080);
    }
  }
});

test("published links and localization claims are explicit", () => {
  assert.match(site.domain, /^https:\/\//);
  assert.equal(site.steamUrl, "https://store.steampowered.com/app/4516500/Marque__Reprisal");
  assert.equal(site.itchUrl, "https://garrettpetersen.itch.io/marque-and-reprisal");
  assert.equal(site.xUrl, "https://x.com/garrettpetersen");
  assert.equal(site.xHandle, "@garrettpetersen");
  assert.equal(site.developer, "Iron Pagoda");
  assert.equal(site.publisher, "Iron Pagoda");
  assert.equal(site.creator, "Garrett Petersen");
  assert.equal(site.copyrightHolder, "Garrett Petersen");
  assert.equal(site.platforms, "Windows, macOS, and Linux");
  assert.match(pressPage(), /<dt>Developer<\/dt><dd>Iron Pagoda<\/dd>/);
  assert.match(pressPage(), /<dt>Publisher<\/dt><dd>Iron Pagoda<\/dd>/);
  assert.match(pressPage(), /<dt>Creator<\/dt><dd><a[^>]+>Garrett Petersen<\/a><\/dd>/);
  assert.match(homePage(), /Developed &amp; published by Iron Pagoda\./);
  assert.match(homePage(), /© <span data-current-year>2026<\/span> Garrett Petersen\./);
  assert.match(
    homePage(),
    /class='button button-primary' href='https:\/\/store\.steampowered\.com\/app\/4516500\/Marque__Reprisal'[^>]*>Wishlist on Steam/
  );
  assert.match(homePage(), /class='button button-ghost' href='https:\/\/garrettpetersen\.itch\.io\/marque-and-reprisal'[^>]*>Play browser demo/);
  assert.match(pressPage(), /<dt>Steam<\/dt><dd><a href='https:\/\/store\.steampowered\.com\/app\/4516500\/Marque__Reprisal'/);
  assert.doesNotMatch(homePage() + pressPage(), /Steam page coming soon|Page coming soon/);
  assert.equal(languages.length, 11);
  assert.equal(new Set(languages).size, languages.length);
});

test("website locales publish complete language routes and matching press downloads", async () => {
  assert.equal(websiteLocales.length, 11);
  assert.equal(new Set(websiteLocales.map(({ slug }) => slug)).size, websiteLocales.length);
  const japanese = websiteLocale("Japanese");
  assert.equal(localizedPagePath(japanese, "home"), "/ja/");
  assert.equal(localizedPagePath(japanese, "press"), "/ja/press/");
  assert.equal(websiteLocale("日本語"), japanese);
  assert.equal(websiteLocale("japanese"), japanese);

  const home = homePage("ja");
  const press = pressPage("ja");
  assert.match(home, /<html lang='ja'>/);
  assert.match(home, /Windows・macOS・Linux版をSteamで同時発売予定/);
  assert.match(home, /capsule_title_japanese\.png/);
  assert.match(home, /01_explore-pyramids_japanese\.png/);
  assert.match(press, /marque-and-reprisal-press-kit-japanese\.zip/);
  assert.match(press, /marque-and-reprisal-screenshots-japanese\.zip/);
  assert.match(press, /marque-and-reprisal-capsules-japanese\.zip/);
  assert.doesNotMatch(home + press, /Windows first|macOS and Linux planned/);

  for (const locale of websiteLocales) {
    assert.match(homePage(locale.appLocale), new RegExp(`<html lang='${locale.appLocale}'>`));
    if (locale.appLocale !== "en") {
      assert.match(pressPage(locale.appLocale), new RegExp(locale.pressKitArchive.replaceAll(".", "\\.")));
    }
  }

  const client = await readFile(path.join(appRoot, "src/assets/scripts/site.js"), "utf8");
  assert.match(client, /URLSearchParams\(window\.location\.search\)\.get\("l"\)/);
  assert.match(homePage(), /data-language-aliases='[^']*Japanese[^']*'/);
});

test("developer Q&A publishes the approved interview with factual wording fixes", () => {
  assert.equal(qAndA.length, 10);
  const copy = qAndA.flatMap((entry) => [entry.question, ...entry.answer]).join("\n");
  const page = qAndAPage();

  assert.match(copy, /Vasco da Gama/);
  assert.match(copy, /Hernán Cortés/);
  assert.match(copy, /Ming dynasty's maritime trade restrictions/);
  assert.match(copy, /mostly hexagonal tiling/);
  assert.match(copy, /you can try to sail the other way/);
  assert.match(copy, /nobody has ever written a story about revenge against a white whale before/);
  assert.doesNotMatch(copy, /Vasco de Gama|away form|a-historical|30\+ powers|export controls/);
  assert.equal((page.match(/class='qa-entry'/g) || []).length, qAndA.length);
  assert.match(homePage(), /href='\/qa\/'>Q&amp;A<\/a>/);
  assert.match(pressPage(), /href='\/assets\/press\/developer-qa\.txt' download/);
  assert.match(qAndAText(), /MARQUE & REPRISAL DEVELOPER Q&A/);
  assert.match(qAndAText(), /Q: What kind of game is Marque & Reprisal\?/);
});

test("press kit publishes every localized capsule set and download", async () => {
  assert.deepEqual(
    localizedCapsules.map(({ steamCode }) => steamCode),
    [
      "english",
      "schinese",
      "russian",
      "spanish",
      "brazilian",
      "japanese",
      "german",
      "french",
      "polish",
      "tchinese",
      "koreana"
    ]
  );
  assert.deepEqual(
    localizedCapsules.map(({ label }) => label),
    languages
  );
  assert.equal(
    new Set(localizedCapsules.map(({ archiveFile }) => archiveFile)).size,
    localizedCapsules.length
  );
  assert.equal(LOCALIZED_CAPSULE_ASSET_NAMES.length, 13);

  const generatedRoot = path.resolve(
    appRoot,
    "../pixel-globe/capsule_art/generated"
  );
  const page = pressPage();
  assert.match(
    page,
    /marque-and-reprisal-capsules-all-languages\.zip/
  );
  for (const locale of localizedCapsules) {
    assert.match(page, new RegExp(locale.archiveFile.replaceAll(".", "\\.")));
    for (const baseName of LOCALIZED_CAPSULE_ASSET_NAMES) {
      await access(path.join(
        generatedRoot,
        `${baseName}_${locale.steamCode}.png`
      ));
    }
  }
});

test("press kit publishes every localized screenshot set and download", async () => {
  assert.deepEqual(
    screenshotLocales.map(({ steamCode }) => steamCode),
    [
      "english",
      "schinese",
      "russian",
      "spanish",
      "brazilian",
      "japanese",
      "german",
      "french",
      "polish",
      "tchinese",
      "koreana"
    ]
  );
  assert.deepEqual(
    screenshotLocales.map(({ label }) => label),
    languages
  );
  assert.equal(screenshots.length * screenshotLocales.length, 99);
  const page = pressPage();
  assert.match(page, /Screenshots in\s+11\s+languages/);
  assert.match(page, /marque-and-reprisal-screenshots-all-languages\.zip/);
  assert.equal((page.match(/data-screenshot-language(?:\s|>)/g) || []).length, 11);
  assert.equal((page.match(/data-screenshot-card(?:\s|>)/g) || []).length, 9);
  for (const locale of screenshotLocales) {
    assert.match(page, new RegExp(locale.archiveFile.replaceAll(".", "\\.")));
  }

  const pressReadme = await readFile(
    path.join(appRoot, "src/assets/press/README.txt"),
    "utf8"
  );
  assert.match(pressReadme, /11 languages \(99 PNG files total\)/);
  for (const language of languages) assert.match(pressReadme, new RegExp(language.replace(/[()]/g, "\\$&")));
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

test("gameplay screenshots retain their full landscape frame", async () => {
  const css = await readFile(
    path.join(appRoot, "src/assets/styles/site.css"),
    "utf8"
  );
  for (const selector of ["voyage-frame", "asset-preview"]) {
    const block = css.match(new RegExp(`\\.${selector} img\\s*\\{([^}]*)\\}`));
    assert.ok(block, `Missing ${selector} screenshot rule`);
    assert.match(block[1], /width:\s*100%/);
    assert.match(block[1], /height:\s*auto/);
    assert.match(block[1], /aspect-ratio:\s*16\s*\/\s*9/);
  }
});

test("display typography matches the capsule without redistributing Party LET", async () => {
  const css = await readFile(
    path.join(appRoot, "src/assets/styles/site.css"),
    "utf8"
  );
  const page = pressPage() + qAndAPage();

  assert.match(css, /font-family:\s*"Pirata One"/);
  assert.match(css, /--display:\s*"Pirata One"/);
  assert.match(css, /party-let-ampersand\.png/);
  assert.doesNotMatch(css, /Pixel Pirate|pixel-pirate\.ttf/);
  assert.ok((page.match(/class='display-amp'/g) || []).length >= 4);
  await access(path.join(appRoot, "src/assets/fonts/pirata-one.ttf"));
  await access(path.join(appRoot, "src/assets/fonts/pirata-one-OFL.txt"));
  await access(path.join(appRoot, "src/assets/art/party-let-ampersand.png"));
  await assert.rejects(access(path.join(appRoot, "src/assets/fonts/pixel-pirate.ttf")));
});

test("capsule artwork is always rendered at its native aspect ratio", async () => {
  const css = await readFile(
    path.join(appRoot, "src/assets/styles/site.css"),
    "utf8"
  );
  const hero = css.match(/\.press-hero > img\s*\{([^}]*)\}/);
  const localized = css.match(/\.localized-capsule-preview img\s*\{([^}]*)\}/);
  const layers = css.match(/\.logo-preview img\s*\{([^}]*)\}/);

  assert.ok(hero);
  assert.match(hero[1], /width:\s*100%/);
  assert.match(hero[1], /height:\s*auto/);
  assert.match(hero[1], /aspect-ratio:\s*920\s*\/\s*430/);
  assert.match(hero[1], /object-fit:\s*contain/);
  assert.ok(localized);
  assert.match(localized[1], /aspect-ratio:\s*1232\s*\/\s*706/);
  assert.match(localized[1], /object-fit:\s*contain/);
  assert.ok(layers);
  assert.match(layers[1], /width:\s*auto/);
  assert.match(layers[1], /height:\s*auto/);
  assert.match(layers[1], /object-fit:\s*contain/);
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

test("the exclusive trailer is not published by the site or press kit", async () => {
  const buildSource = await readFile(path.join(appRoot, "tools/build.mjs"), "utf8");
  const pressReadme = await readFile(
    path.join(appRoot, "src/assets/press/README.txt"),
    "utf8"
  );

  assert.doesNotMatch(homePage() + pressPage() + buildSource + pressReadme, /trailer/i);
  await assert.rejects(
    access(path.join(appRoot, "src/assets/video/gameplay-trailer.mp4"))
  );
});
