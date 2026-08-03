import {
  features,
  languages,
  localizedCapsules,
  LOCALIZED_CAPSULE_ASSET_NAMES,
  pressCapsuleArt,
  pressLogos,
  qAndA,
  screenshotLocales,
  screenshots,
  shipRoster,
  site,
  mysteryShip,
  WORLD_MAP_CELL_COUNT
} from "../content/site-content.mjs";
import {
  defaultWebsiteLocale,
  localizedPagePath,
  websiteLocale,
  websiteLocales
} from "../content/site-locales.mjs";

const description = site.shortDescription;
const socialImage = site.domain + "/assets/art/social-share.png";
const codeAssetVersion = "2026-08-02-ship-turntables";
const displayAmpersand = "<span class='display-amp' role='img' aria-label='and'></span>";

export function homePage(localeValue = "en") {
  const locale = websiteLocale(localeValue);
  if (locale !== defaultWebsiteLocale) return localizedHomePage(locale);
  const featureRows = features.map((feature) => [
    "<section class='feature-row reveal' id='", feature.id, "' aria-label='", escapeHtml(feature.title), "'>",
    "<div class='feature-window'>",
    "<video class='feature-video' muted loop playsinline preload='none' poster='", feature.poster, "' aria-label='", escapeHtml(feature.title), " gameplay'>",
    "<source data-src='", feature.video, "' type='video/webm'>",
    "</video>",
    "</div>",
    "<div class='feature-copy'>",
    "<p class='eyebrow'>", escapeHtml(feature.eyebrow), "</p>",
    "<p>", escapeHtml(feature.copy), "</p>",
    "</div>",
    "</section>"
  ].join("")).join("\n");

  const gallery = screenshots.slice(0, 4).map((shot) => [
    "<a class='voyage-frame' href='/press/#screenshots'>",
    "<img src='/assets/press/screenshots/", shot.files.english, "' alt='", escapeHtml(shot.alt), "' loading='lazy' width='1920' height='1080'>",
    "<span>", escapeHtml(shot.title), "</span>",
    "</a>"
  ].join("")).join("\n");

  const main = [
    "<main>",
    "<section class='hero' aria-labelledby='hero-title'>",
    "<div class='hero-art' aria-hidden='true'></div>",
    "<div class='hero-shade' aria-hidden='true'></div>",
    "<div class='hero-copy'>",
    "<p class='hero-kicker'>A globe-spanning sailing roguelike · 1522</p>",
    "<h1 id='hero-title'><img src='/assets/art/title-logo.png' alt='Marque &amp; Reprisal' width='1280' height='720'></h1>",
    "<p class='hero-actions-line'>", escapeHtml(site.tagline), "</p>",
    "<p class='hero-deck'>", escapeHtml(site.aboutLead), "</p>",
    "<div class='button-row'>",
    externalButton(site.steamUrl, "Wishlist on Steam", "button button-primary"),
    externalButton(site.itchUrl, "Play browser demo", "button button-ghost"),
    "</div>",
    "<p class='platform-note'>Coming soon on Steam for Windows, macOS, and Linux.</p>",
    "</div>",
    "<a class='soundings-link' href='#voyage'><span>Take soundings</span><i aria-hidden='true'></i></a>",
    "</section>",
    "<section class='manifest' id='voyage' aria-labelledby='manifest-title'>",
    "<div class='section-heading reveal'>",
    "<p class='eyebrow'>Your commission</p>",
    "<h2 id='manifest-title'><span>The whole world is open.</span><span>The wind is not.</span></h2>",
    "<p>Read the weather, ration food and water, work each market, and decide what kind of captain this voyage will make you. Complete your captain's special objective to win the run—or lose everything at sea.</p>",
    "</div>",
    "<div class='manifest-ledger reveal' aria-label='Core voyage systems'>",
    "<div><span>World</span><strong>", WORLD_MAP_CELL_COUNT.toLocaleString("en-US"), " map cells</strong></div>",
    "<div><span>Conditions</span><strong>Wind, weather, hunger, thirst</strong></div>",
    "<div><span>Economy</span><strong>Reactive ports and NPC trade</strong></div>",
    "<div><span>Stakes</span><strong>One captain. One life.</strong></div>",
    "</div>",
    "</section>",
    "<section class='feature-course' aria-label='Ways to play'>",
    featureRows,
    "</section>",
    "<section class='gallery-tease' aria-labelledby='gallery-title'>",
    "<div class='section-heading compact reveal'>",
    "<p class='eyebrow'>From the captain's log</p>",
    "<h2 id='gallery-title'>A voyage never repeats</h2>",
    "</div>",
    "<div class='voyage-grid reveal'>", gallery, "</div>",
    "<div class='centered-action reveal'><a class='button button-ghost' href='/press/'>Open the press kit</a></div>",
    "</section>",
    "<section class='final-call' aria-labelledby='final-title'>",
    "<div class='final-call-art' aria-hidden='true'></div>",
    "<div class='final-call-copy reveal'>",
    "<p class='eyebrow'>No safe passage</p>",
    "<h2 id='final-title'>Catch a good wind.</h2>",
    "<p>Make your fortune before the sea takes it back.</p>",
    externalButton(site.steamUrl, "Wishlist on Steam", "button button-primary"),
    "</div>",
    "</section>",
    "</main>"
  ].join("\n");

  return layout({
    title: site.title + " — a globe-spanning sailing roguelike",
    description,
    canonicalPath: "/",
    bodyClass: "home",
    main,
    locale,
    pageKind: "home"
  });
}

export function pressPage(localeValue = "en") {
  const locale = websiteLocale(localeValue);
  if (locale !== defaultWebsiteLocale) return localizedPressPage(locale);
  const featureList = features.map((feature) => [
    "<li><strong>", escapeHtml(feature.title), ".</strong> ",
    escapeHtml(feature.copy), "</li>"
  ].join("")).join("\n");

  const languageList = languages.map((language) => "<li>" + escapeHtml(language) + "</li>").join("");

  const defaultScreenshotLocale = screenshotLocales[0];
  if (defaultScreenshotLocale?.steamCode !== "english") {
    throw new Error("English must remain the default press screenshot locale");
  }
  const screenshotLanguageButtons = screenshotLocales.map((locale, index) => [
    "<button class='screenshot-language-tab' type='button' data-screenshot-language data-locale-code='",
    escapeHtml(locale.steamCode), "' data-locale-label='", escapeHtml(locale.label),
    "' data-locale-app='", escapeHtml(locale.appLocale), "' data-locale-archive='",
    escapeHtml(locale.archiveFile), "' aria-pressed='", index === 0 ? "true" : "false", "'>",
    "<span lang='", escapeHtml(locale.appLocale), "'>", escapeHtml(locale.nativeLabel), "</span>",
    locale.nativeLabel === locale.label ? "" : "<small>" + escapeHtml(locale.label) + "</small>",
    "</button>"
  ].join("")).join("\n");
  const screenshotCards = screenshots.map((shot) => {
    const file = shot.files[defaultScreenshotLocale.steamCode];
    const source = `/assets/press/screenshots/${file}`;
    return [
    "<article class='press-asset-card' data-screenshot-card data-screenshot-prefix='", escapeHtml(shot.prefix),
    "' data-screenshot-alt='", escapeHtml(shot.alt), "'>",
    "<button class='asset-preview' type='button' data-lightbox-src='", source,
    "' data-lightbox-alt='", escapeHtml(`${shot.alt} Interface language: ${defaultScreenshotLocale.label}.`), "'>",
    "<img src='", source, "' alt='",
    escapeHtml(`${shot.alt} Interface language: ${defaultScreenshotLocale.label}.`),
    "' loading='lazy' width='1920' height='1080' data-screenshot-image>",
    "</button>",
    "<div><h3>", escapeHtml(shot.title), "</h3><p>1920 × 1080 PNG</p>",
    "<a href='", source, "' download data-screenshot-download>Download PNG</a></div>",
    "</article>"
    ].join("");
  }).join("\n");
  const screenshotLanguageDownload = [
    "<div class='screenshot-language-download'><span>Showing <strong data-current-screenshot-language>",
    escapeHtml(defaultScreenshotLocale.label), "</strong></span>",
    "<a href='/downloads/", escapeHtml(defaultScreenshotLocale.archiveFile),
    "' download data-screenshot-language-download>Download all ", String(screenshots.length),
    " in ", escapeHtml(defaultScreenshotLocale.label), "</a></div>"
  ].join("");

  const logoCards = pressLogos.map((asset) => graphicAssetCard(asset, "logos")).join("\n");
  const localizedCapsuleCards = localizedCapsules.map(
    (capsuleLocale) => localizedCapsuleCard(capsuleLocale, "Download ZIP")
  ).join("\n");
  const capsuleCards = pressCapsuleArt.map((asset) => graphicAssetCard(
    asset,
    "capsule-art",
    asset.transparent ? " transparent-preview" : ""
  )).join("\n");

  const main = [
    "<main class='press-main'>",
    "<header class='press-hero'>",
    "<img src='/assets/art/capsule-header.png' alt='Marque &amp; Reprisal sunset capsule art' width='920' height='430'>",
    "<div><p class='eyebrow'>Press kit</p><h1>Marque ", displayAmpersand, " Reprisal</h1>",
    "<p>", escapeHtml(site.shortDescription), "</p>",
    "<a class='button button-primary' href='/downloads/marque-and-reprisal-press-kit.zip' download>Download complete press kit</a>",
    "</div>",
    "</header>",
    "<div class='press-layout'>",
    "<aside class='fact-sheet' aria-labelledby='facts-title'>",
    "<p class='eyebrow'>At a glance</p><h2 id='facts-title'>Fact sheet</h2>",
    fact("Developer", escapeHtml(site.developer)),
    fact("Publisher", escapeHtml(site.publisher)),
    fact("Creator", externalTextLink(site.creatorUrl, site.creator)),
    fact("Release", escapeHtml(site.release)),
    fact("Platforms", escapeHtml(site.platforms)),
    fact("Genre", escapeHtml(site.genre)),
    fact("Website", externalTextLink(site.domain, "marque-and-reprisal.com")),
    fact("Steam", externalTextLink(site.steamUrl, "View on Steam")),
    fact("Demo", externalTextLink(site.itchUrl, "Play on itch.io")),
    fact("X", externalTextLink(site.xUrl, site.xHandle)),
    "<div class='fact-block'><dt>Text languages</dt><dd><ul class='language-list'>", languageList, "</ul></dd></div>",
    "</aside>",
    "<article class='press-copy'>",
    "<section><p class='eyebrow'>About the game</p><h2>A whole Earth. One life.</h2>",
    "<p class='press-lead'>", escapeHtml(site.tagline), " ", escapeHtml(site.aboutLead), "</p>",
    "<ul class='press-features'>", featureList, "</ul>",
    "</section>",
    "<section><p class='eyebrow'>For publication</p><h2>Short description</h2>",
    "<p>", escapeHtml(site.shortDescription), "</p>",
    "<button class='copy-button' type='button' data-copy-text='", escapeHtml(site.shortDescription), "'>Copy description</button>",
    "</section>",
    "<section><p class='eyebrow'>Background material</p><h2>Developer Q", displayAmpersand, "A</h2>",
    "<p>Ten questions about the game, its history, the world simulation, sailing, survival, and what changes from one run to the next.</p>",
    "<div class='press-copy-actions'><a href='/qa/'>Read the Q&amp;A</a>",
    "<a href='/assets/press/developer-qa.txt' download>Download as text</a></div>",
    "</section>",
    "</article>",
    "</div>",
    "<section class='press-assets' id='screenshots' aria-labelledby='screenshots-title'>",
    "<div class='asset-heading'><div><p class='eyebrow'>Full resolution · localized</p><h2 id='screenshots-title'>Screenshots in ", String(screenshotLocales.length), " languages</h2></div>",
    "<a href='/downloads/marque-and-reprisal-screenshots-all-languages.zip' download>Download all ", String(screenshots.length * screenshotLocales.length), " PNGs</a></div>",
    "<p class='asset-intro'>Nine press-ready gameplay scenes are available in every supported interface language. Choose a language to preview and download its exact Steam-suffixed files.</p>",
    "<div class='screenshot-language-picker' data-screenshot-gallery>",
    "<div class='screenshot-language-tabs' role='group' aria-label='Screenshot language'>", screenshotLanguageButtons, "</div>",
    screenshotLanguageDownload,
    "</div>",
    "<div class='press-asset-grid'>", screenshotCards, "</div>",
    "</section>",
    "<section class='press-assets' aria-labelledby='logos-title'>",
    "<div class='asset-heading'><div><p class='eyebrow'>Identity</p><h2 id='logos-title'>Logos ", displayAmpersand, " artwork</h2></div></div>",
    "<div class='logo-grid'>", logoCards, "</div>",
    "</section>",
    "<section class='press-assets localized-capsule-assets' id='localized-capsules' aria-labelledby='localized-capsules-title'>",
    "<div class='asset-heading'><div><p class='eyebrow'>Localized storefront art</p><h2 id='localized-capsules-title'>Capsules in ", String(localizedCapsules.length), " languages</h2></div>",
    "<a href='/downloads/marque-and-reprisal-capsules-all-languages.zip' download>Download all languages</a></div>",
    "<p class='asset-intro'>Each language ZIP contains ", String(LOCALIZED_CAPSULE_ASSET_NAMES.length), " full-resolution PNG exports for Steam capsules, library art, events, social sharing, itch.io, and press use.</p>",
    "<div class='localized-capsule-grid'>", localizedCapsuleCards, "</div>",
    "</section>",
    "<section class='press-assets capsule-assets' id='capsule-art' aria-labelledby='capsule-art-title'>",
    "<div class='asset-heading'><div><p class='eyebrow'>Build your own layout</p><h2 id='capsule-art-title'>Capsule art layers</h2></div>",
    "<div class='asset-heading-links'><a href='/assets/press/capsule-art/capsule-source.aseprite' download>Layered Aseprite source</a>",
    "<a href='/assets/press/capsule-art/README.txt' download>Composition guide</a></div></div>",
    "<p class='asset-intro'>Every PNG uses the same aligned 1232 × 706 canvas. Stack the background, reflection, upper title, ship, and lower title in that order—or use the ready-made transparent lockup.</p>",
    "<div class='logo-grid capsule-grid'>", capsuleCards, "</div>",
    "</section>",
    "<section class='usage-note'><h2>Asset use</h2><p>These assets may be used for editorial coverage, reviews, videos, streams, and event listings concerning Marque &amp; Reprisal. Please preserve the artwork's aspect ratio and nearest-neighbour pixel edges.</p></section>",
    "<dialog class='lightbox' aria-label='Screenshot preview'><button type='button' data-lightbox-close aria-label='Close preview'>×</button><img alt=''></dialog>",
    "</main>"
  ].join("\n");

  return layout({
    title: "Press kit — " + site.title,
    description: "Official Marque & Reprisal fact sheet, screenshots, logos, artwork, and press downloads.",
    canonicalPath: "/press/",
    bodyClass: "press",
    main,
    locale,
    pageKind: "press"
  });
}

function localizedHomePage(locale) {
  const featureRows = features.map((feature, index) => {
    const shot = screenshotForFeature(feature.id);
    return [
      "<section class='feature-row reveal' id='", feature.id, "' aria-label='", escapeHtml(locale.actions[index]), "'>",
      "<div class='feature-window'>",
      "<video class='feature-video' muted loop playsinline preload='none' poster='/assets/press/screenshots/",
      escapeHtml(shot.files[locale.steamCode]), "' aria-label='", escapeHtml(locale.actions[index]), "'>",
      "<source data-src='", feature.video, "' type='video/webm'>",
      "</video></div>",
      "<div class='feature-copy'><p class='eyebrow'>", escapeHtml(locale.actions[index]), "</p>",
      "<p>", escapeHtml(locale.featureCopy[feature.id]), "</p></div>",
      "</section>"
    ].join("");
  }).join("\n");

  const gallery = screenshots.slice(0, 4).map((shot, index) => [
    "<a class='voyage-frame' href='", localizedPagePath(locale, "press"), "#screenshots'>",
    "<img src='/assets/press/screenshots/", shot.files[locale.steamCode], "' alt='",
    escapeHtml(locale.actions[index]), "' loading='lazy' width='1920' height='1080'>",
    "<span>", escapeHtml(locale.actions[index]), "</span></a>"
  ].join("")).join("\n");

  const titleAsset = localizedCapsuleAsset(locale, `capsule_title_${locale.steamCode}.png`);
  const main = [
    "<main>",
    "<section class='hero' aria-labelledby='hero-title'>",
    "<div class='hero-art' aria-hidden='true'></div><div class='hero-shade' aria-hidden='true'></div>",
    "<div class='hero-copy'>",
    "<p class='hero-kicker'>", escapeHtml(locale.ui.heroKicker), "</p>",
    "<h1 id='hero-title'><img src='", titleAsset, "' alt='", escapeHtml(locale.title), "' width='1232' height='706'></h1>",
    "<p class='hero-actions-line'>", escapeHtml(locale.actions.join(" · ")), "</p>",
    "<p class='hero-deck'>", escapeHtml(locale.intro), "</p>",
    "<div class='button-row'>",
    externalButton(site.steamUrl, locale.ui.wishlist, "button button-primary"),
    externalButton(site.itchUrl, locale.ui.playDemo, "button button-ghost"),
    "</div><p class='platform-note'>", escapeHtml(locale.ui.platform), "</p></div>",
    "<a class='soundings-link' href='#voyage'><span>", escapeHtml(locale.ui.navAbout), "</span><i aria-hidden='true'></i></a>",
    "</section>",
    "<section class='manifest' id='voyage' aria-labelledby='manifest-title'>",
    "<div class='section-heading reveal'><p class='eyebrow'>", escapeHtml(locale.ui.heroKicker), "</p>",
    "<h2 id='manifest-title'>", escapeHtml(locale.title), "</h2><p>", escapeHtml(locale.demoCopy), "</p></div>",
    "</section>",
    "<section class='feature-course' aria-label='", escapeHtml(locale.ui.aboutGame), "'>", featureRows, "</section>",
    "<section class='gallery-tease' aria-labelledby='gallery-title'>",
    "<div class='section-heading compact reveal'><p class='eyebrow'>", escapeHtml(locale.ui.galleryHeading), "</p>",
    "<h2 id='gallery-title'>", escapeHtml(locale.ui.aboutGame), "</h2></div>",
    "<div class='voyage-grid reveal'>", gallery, "</div>",
    "<div class='centered-action reveal'><a class='button button-ghost' href='", localizedPagePath(locale, "press"), "'>",
    escapeHtml(locale.ui.openPressKit), "</a></div></section>",
    "<section class='final-call' aria-labelledby='final-title'><div class='final-call-art' aria-hidden='true'></div>",
    "<div class='final-call-copy reveal'><h2 id='final-title'>", escapeHtml(locale.ui.finalTitle), "</h2>",
    "<p>", escapeHtml(locale.ui.finalBody), "</p>",
    externalButton(site.steamUrl, locale.ui.wishlist, "button button-primary"),
    "</div></section></main>"
  ].join("");

  return layout({
    title: `${locale.title} — ${locale.ui.heroKicker}`,
    description: locale.intro,
    canonicalPath: localizedPagePath(locale, "home"),
    bodyClass: "home",
    main,
    locale,
    pageKind: "home"
  });
}

function localizedPressPage(locale) {
  const screenshotCards = screenshots.map((shot) => {
    const source = `/assets/press/screenshots/${shot.files[locale.steamCode]}`;
    const featureIndex = features.findIndex(({ id }) => shot.id.startsWith(`${id}-`));
    const title = featureIndex >= 0 ? locale.actions[featureIndex] : locale.ui.pandaShot;
    return [
      "<article class='press-asset-card'>",
      "<button class='asset-preview' type='button' data-lightbox-src='", source,
      "' data-lightbox-alt='", escapeHtml(title), "'><img src='", source, "' alt='",
      escapeHtml(title), "' loading='lazy' width='1920' height='1080'></button>",
      "<div><h3>", escapeHtml(title), "</h3><p>1920 × 1080 PNG</p>",
      "<a href='", source, "' download>", escapeHtml(locale.ui.downloadPng), "</a></div></article>"
    ].join("");
  }).join("\n");
  const featureList = features.map((feature, index) => [
    "<li><strong>", escapeHtml(locale.actions[index]), ".</strong> ",
    escapeHtml(locale.featureCopy[feature.id]), "</li>"
  ].join("")).join("\n");
  const capsulePreview = localizedCapsuleAsset(locale, `capsule_header_${locale.steamCode}.png`);
  const main = [
    "<main class='press-main localized-press'>",
    "<header class='press-hero'><img src='", capsulePreview, "' alt='", escapeHtml(locale.title), "' width='920' height='430'>",
    "<div><p class='eyebrow'>", escapeHtml(locale.ui.navPress), "</p><h1>", escapeHtml(locale.title), "</h1>",
    "<p>", escapeHtml(locale.intro), "</p>",
    "<a class='button button-primary' href='/downloads/", escapeHtml(locale.pressKitArchive), "' download>",
    escapeHtml(locale.ui.downloadPressKit), "</a></div></header>",
    "<div class='press-layout'><aside class='fact-sheet'><h2>", escapeHtml(locale.ui.factSheet), "</h2>",
    fact(locale.ui.release, escapeHtml(locale.ui.platform)),
    fact(locale.ui.platforms, "Windows · macOS · Linux"),
    fact(locale.ui.genre, escapeHtml(locale.ui.heroKicker)),
    fact(locale.ui.textLanguages, websiteLocales.map(({ nativeLabel }) => escapeHtml(nativeLabel)).join(" · ")),
    "</aside><article class='press-copy'><section><p class='eyebrow'>", escapeHtml(locale.ui.aboutGame), "</p>",
    "<h2>", escapeHtml(locale.title), "</h2><p class='press-lead'>", escapeHtml(locale.intro), "</p>",
    "<ul class='press-features'>", featureList, "</ul></section></article></div>",
    "<section class='press-assets' id='screenshots'><div class='asset-heading'><div><h2>",
    escapeHtml(locale.ui.screenshotsHeading), "</h2></div><a href='/downloads/",
    escapeHtml(`marque-and-reprisal-screenshots-${locale.steamCode}.zip`), "' download>",
    escapeHtml(locale.ui.downloadScreenshots), "</a></div><p class='asset-intro'>",
    escapeHtml(locale.ui.screenshotsBody), "</p><div class='press-asset-grid'>", screenshotCards, "</div></section>",
    "<section class='press-assets localized-capsule-assets'><div class='asset-heading'><div><h2>",
    escapeHtml(locale.ui.capsulesHeading), "</h2></div><a href='/downloads/",
    escapeHtml(`marque-and-reprisal-capsules-${locale.steamCode}.zip`), "' download>",
    escapeHtml(locale.ui.downloadCapsules), "</a></div><p class='asset-intro'>",
    escapeHtml(locale.ui.capsulesBody), "</p><div class='localized-capsule-grid'>",
    localizedCapsuleCard(locale, locale.ui.downloadZip), "</div></section>",
    "<section class='press-assets'><div class='asset-heading'><div><p class='eyebrow'>",
    escapeHtml(locale.ui.englishResources), "</p><h2>", escapeHtml(locale.ui.qaEnglish), "</h2></div></div>",
    "<div class='press-copy-actions'><a href='/qa/'>", escapeHtml(locale.ui.readQaEnglish), "</a>",
    "<a href='/downloads/marque-and-reprisal-press-kit.zip' download>", escapeHtml(locale.ui.completeEnglishPressKit), "</a></div></section>",
    "<section class='usage-note'><h2>", escapeHtml(locale.ui.assetUse), "</h2><p>",
    escapeHtml(locale.ui.assetUseBody), "</p></section>",
    "<dialog class='lightbox' aria-label='", escapeHtml(locale.ui.screenshotsHeading), "'><button type='button' data-lightbox-close aria-label='Close'>×</button><img alt=''></dialog>",
    "</main>"
  ].join("");

  return layout({
    title: `${locale.ui.navPress} — ${locale.title}`,
    description: locale.intro,
    canonicalPath: localizedPagePath(locale, "press"),
    bodyClass: "press",
    main,
    locale,
    pageKind: "press"
  });
}

function screenshotForFeature(featureId) {
  const shot = screenshots.find(({ id }) => id.startsWith(`${featureId}-`));
  if (!shot) throw new Error(`Feature has no localized screenshot: ${featureId}`);
  return shot;
}

function localizedCapsuleAsset(locale, file) {
  return `/assets/press/localized-capsules/${locale.steamCode}/${file}`;
}

export function qAndAPage() {
  const entries = qAndA.map((entry, index) => [
    "<article class='qa-entry'>",
    "<p class='qa-number' aria-hidden='true'>", String(index + 1).padStart(2, "0"), "</p>",
    "<div class='qa-entry-copy'>",
    "<h2>", escapeHtml(entry.question), "</h2>",
    "<div class='qa-answer'>",
    entry.answer.map((paragraph) => "<p>" + escapeHtml(paragraph) + "</p>").join(""),
    "</div>",
    "</div>",
    "</article>"
  ].join("")).join("\n");

  const main = [
    "<main class='qa-main'>",
    "<header class='qa-hero'>",
    "<p class='eyebrow'>Developer Q&amp;A</p>",
    "<h1>Questions ", displayAmpersand, " answers</h1>",
    "<p>Garrett Petersen talks about the game, its history, and what happens when a voyage goes wrong.</p>",
    "</header>",
    "<section class='qa-list' aria-label='Questions and answers about Marque and Reprisal'>",
    entries,
    "</section>",
    "</main>"
  ].join("\n");

  return layout({
    title: "Q&A — " + site.title,
    description: "Developer Garrett Petersen answers questions about Marque & Reprisal, its world, sailing, history, survival, and roguelike structure.",
    canonicalPath: "/qa/",
    bodyClass: "qa",
    main
  });
}

export function shipsPage() {
  const entries = shipRoster.map((ship, index) => [
    "<article class='ship-entry' id='ship-", escapeHtml(ship.slug), "'>",
    "<figure class='ship-turntable'>",
    "<canvas class='ship-turntable-canvas' data-ship-turntable data-sprite-sheet='",
    escapeHtml(ship.spriteSheet), "' data-light-sheet='", escapeHtml(ship.lightSheet),
    "' data-shade-sheet='", escapeHtml(ship.shadeSheet), "' data-shadow-sheet='",
    escapeHtml(ship.shadowSheet), "' data-frame-size='", String(ship.frameSize),
    "' data-shadow-frame-size='", String(ship.shadowFrameSize), "' data-headings='",
    String(ship.headings), "' data-sheet-cols='", String(ship.sheetCols),
    "' data-light-azimuth='", String(ship.lightAzimuth), "' data-light-elevation='",
    String(ship.lightElevation), "' width='", String(ship.shadowFrameSize), "' height='",
    String(ship.shadowFrameSize),
    "' role='img' aria-label='Game sprite of the ", escapeHtml(ship.label),
    " slowly rotating through 32 headings'>", escapeHtml(ship.label), " game sprite</canvas>",
    "</figure>",
    "<div class='ship-entry-copy'>",
    "<p class='ship-register-number'>Vessel ", String(index + 1).padStart(2, "0"), "</p>",
    "<h2>", escapeHtml(ship.label), "</h2>",
    "<p class='ship-history'>", escapeHtml(ship.description), "</p>",
    "<dl class='ship-specs'>",
    shipSpec("Hold", ship.cargoCapacity),
    shipSpec("Crew", ship.crewCapacity),
    shipSpec("Cannons", ship.cannons),
    shipSpec("Drive", propulsionLabel(ship.propulsion)),
    "</dl>",
    "</div>",
    "</article>"
  ].join("")).join("\n");

  const mysteryEntry = [
    "<article class='ship-entry ship-entry-mystery' id='mystery-ship'>",
    "<figure class='ship-turntable ship-mystery-view' aria-label='Unknown ship'>",
    "<span aria-hidden='true'>", escapeHtml(mysteryShip.mark), "</span>",
    "</figure>",
    "<div class='ship-entry-copy'>",
    "<p class='ship-register-number'>Uncharted</p>",
    "<h2>", escapeHtml(mysteryShip.label), "</h2>",
    "<p class='ship-history'>", escapeHtml(mysteryShip.description), "</p>",
    "</div>",
    "</article>"
  ].join("");

  const main = [
    "<main class='ships-main'>",
    "<header class='ships-hero'>",
    "<div>",
    "<p class='eyebrow'>The ships of 1522</p>",
    "<h1>Ship roster</h1>",
    "<p>From shallow-water canoes to towering ocean carracks, every hull has its own history, carrying capacity, crew, armament, and way of working the wind.</p>",
    "</div>",
    "<dl class='roster-tally'>",
    shipSpec("Known vessels", shipRoster.length),
    shipSpec("Mystery vessels", 1),
    "</dl>",
    "</header>",
    "<section class='ship-roster-list' aria-label='Ships in Marque and Reprisal'>",
    entries,
    mysteryEntry,
    "</section>",
    "</main>"
  ].join("\n");

  return layout({
    title: "Ship roster — " + site.title,
    description: "Explore the ships of Marque & Reprisal, from working canoes and coastal traders to ocean-going carracks and warships.",
    canonicalPath: "/ships/",
    bodyClass: "ships",
    main
  });
}

function shipSpec(label, value) {
  return "<div><dt>" + escapeHtml(label) + "</dt><dd>" + escapeHtml(value) + "</dd></div>";
}

function propulsionLabel(propulsion) {
  if (propulsion === "sail") return "Sail";
  if (propulsion === "oar") return "Oars";
  if (propulsion === "oar-sail") return "Oars + sail";
  throw new Error(`Unknown ship propulsion: ${propulsion}`);
}

function graphicAssetCard(asset, folder, previewClass = "") {
  return [
    "<article class='logo-card'>",
    "<div class='logo-preview", previewClass, "'><img src='/assets/press/", folder, "/", asset.file, "' alt='", escapeHtml(asset.alt ?? asset.title), "' loading='lazy'></div>",
    "<h3>", escapeHtml(asset.title), "</h3>",
    "<p>", escapeHtml(asset.detail), "</p>",
    "<a href='/assets/press/", folder, "/", asset.file, "' download>Download PNG</a>",
    "</article>"
  ].join("");
}

function localizedCapsuleCard(locale, downloadLabel) {
  if (!downloadLabel) throw new Error(`Localized capsule download label is missing: ${locale.steamCode}`);
  const previewPath = [
    "/assets/press/localized-capsules/",
    locale.steamCode,
    "/",
    locale.previewFile
  ].join("");
  return [
    "<article class='localized-capsule-card'>",
    "<div class='localized-capsule-preview'><img src='", previewPath, "' alt='",
    escapeHtml(`${locale.label} main capsule art titled ${locale.title}.`),
    "' loading='lazy' width='1232' height='706'></div>",
    "<div class='localized-capsule-copy'><div>",
    "<p class='localized-capsule-language'>", escapeHtml(locale.label), "</p>",
    "<h3 lang='", escapeHtml(locale.appLocale), "'>", escapeHtml(locale.title), "</h3>",
    "<p>", String(LOCALIZED_CAPSULE_ASSET_NAMES.length), " PNG</p>",
    "</div><a href='/downloads/", escapeHtml(locale.archiveFile), "' download>",
    escapeHtml(downloadLabel), "</a></div>",
    "</article>"
  ].join("");
}

export function privacyPage() {
  const main = [
    "<main class='legal-main'>",
    "<article>",
    "<p class='eyebrow'>Plain sailing</p>",
    "<h1>Privacy</h1>",
    "<p class='legal-lead'>The website uses no analytics, advertising trackers, accounts, forms, or cookies. The game offers separate, optional play telemetry.</p>",
    "<h2>Who is responsible</h2>",
    "<p>Marque &amp; Reprisal is developed by Iron Pagoda / Garrett Petersen. Privacy questions can be sent through the official support link on the store where you obtained the game.</p>",
    "<h2>Optional game analytics</h2>",
    "<p>The game asks before sending analytics. Sharing is off until you choose to share data, and declining does not change the game. You can withdraw at any time in Options. Consent is the legal basis for this processing.</p>",
    "<p>When enabled, the game sends a random, pseudonymous installation identifier, build and platform details, language, session playtime, broad feature use, completed-voyage summaries, and crash diagnostics. Routine play statistics use a stable 1% sample of consenting installations. Crash reports are sent for all consenting installations.</p>",
    "<p>The game does not store names, email addresses, store account IDs, IP addresses, save files, voice or chat, advertising IDs, or precise hardware fingerprints in telemetry. Data is not sold or used for advertising.</p>",
    "<h2>Storage and retention</h2>",
    "<p>Reports are processed by Cloudflare Workers Analytics Engine and expire after three months. Cloudflare necessarily processes network information to deliver requests, but the game does not copy IP addresses into analytics records.</p>",
    "<p>The game stores the consent choice, a random installation identifier, and a small retry queue in local game storage. Turning analytics off removes the identifier and retry queue from that installation. Offline play remains fully functional.</p>",
    "<p>Cloudflare may process requests in countries where it operates, subject to its contractual and legal safeguards. See <a href='https://www.cloudflare.com/privacypolicy/'>Cloudflare's privacy policy</a>.</p>",
    "<h2>Your choices</h2>",
    "<p>You may decline or withdraw without penalty. Depending on where you live, you may also have rights to access, correct, erase, restrict, or object to processing, and to complain to your local data protection authority. Withdrawal does not affect processing that was lawful before withdrawal. Privacy requests can be sent through the official support link on the store where you obtained the game.</p>",
    "<h2>Server logs</h2>",
    "<p>The site is delivered by Cloudflare, which may process basic network and security information as part of operating its service. This site does not add its own visitor tracking or retain a separate visitor database.</p>",
    "<h2>External links</h2>",
    "<p>Links to Steam, itch.io, and X take you to those services, where their own privacy policies apply.</p>",
    "<h2>Platform services</h2>",
    "<p>Steam achievements, Steam stats, Steam Cloud, itch.io, and other store services are governed separately by those platforms and are not replaced by the optional game telemetry.</p>",
    "<p class='legal-updated'>Last updated: July 25, 2026</p>",
    "</article>",
    "</main>"
  ].join("\n");

  return layout({
    title: "Privacy — " + site.title,
    description: "Privacy information for the official Marque & Reprisal website.",
    canonicalPath: "/privacy/",
    bodyClass: "legal",
    main,
    noIndex: false
  });
}

export function notFoundPage() {
  const main = [
    "<main class='lost-at-sea'>",
    "<div><p class='eyebrow'>Chart error · 404</p><h1>Here be nothing.</h1>",
    "<p>This course has carried you beyond the known site.</p>",
    "<a class='button button-primary' href='/'>Return to safe water</a></div>",
    "</main>"
  ].join("\n");

  return layout({
    title: "Lost at sea — " + site.title,
    description: "The requested page could not be found.",
    canonicalPath: "/404.html",
    bodyClass: "not-found",
    main,
    noIndex: true
  });
}

export function factSheetText() {
  return [
    site.title,
    "=".repeat(site.title.length),
    "",
    "Developer: " + site.developer,
    "Publisher: " + site.publisher,
    "Creator: " + site.creator,
    "Release: " + site.release,
    "Platforms: " + site.platforms,
    "Genre: " + site.genre,
    "Website: " + site.domain,
    "Steam: " + site.steamUrl,
    "Browser demo: " + site.itchUrl,
    "X: " + site.xHandle + " (" + site.xUrl + ")",
    "",
    "SHORT DESCRIPTION",
    site.shortDescription,
    "",
    "FEATURES",
    ...features.map((feature) => feature.title.toUpperCase() + "\n" + feature.copy),
    "",
    "TEXT LANGUAGES",
    languages.join(", "),
    "",
    "ASSET USE",
    "The included assets may be used for editorial coverage, reviews, videos, streams, and event listings concerning Marque & Reprisal.",
    ""
  ].join("\n");
}

export function qAndAText() {
  return [
    "MARQUE & REPRISAL DEVELOPER Q&A",
    "================================",
    "",
    "Garrett Petersen talks about the game, its history, and what happens when a voyage goes wrong.",
    "",
    ...qAndA.flatMap((entry) => [
      "Q: " + entry.question,
      ...entry.answer.map((paragraph) => "A: " + paragraph),
      ""
    ]),
    "Website: " + site.domain + "/qa/",
    ""
  ].join("\n");
}

export function robotsText() {
  return [
    "User-agent: *",
    "Allow: /",
    "",
    "Sitemap: " + site.domain + "/sitemap.xml",
    ""
  ].join("\n");
}

export function sitemapXml() {
  const localizedUrls = websiteLocales.flatMap((locale) => [
    `<url><loc>${site.domain}${localizedPagePath(locale, "home")}</loc><priority>${locale === defaultWebsiteLocale ? "1.0" : "0.9"}</priority></url>`,
    `<url><loc>${site.domain}${localizedPagePath(locale, "press")}</loc><priority>0.8</priority></url>`
  ]);
  return [
    "<?xml version='1.0' encoding='UTF-8'?>",
    "<urlset xmlns='http://www.sitemaps.org/schemas/sitemap/0.9'>",
    ...localizedUrls,
    "<url><loc>" + site.domain + "/qa/</loc><priority>0.8</priority></url>",
    "<url><loc>" + site.domain + "/ships/</loc><priority>0.8</priority></url>",
    "<url><loc>" + site.domain + "/privacy/</loc><priority>0.3</priority></url>",
    "</urlset>",
    ""
  ].join("\n");
}

function layout({
  title,
  description: pageDescription,
  canonicalPath,
  bodyClass,
  main,
  noIndex = false,
  locale = defaultWebsiteLocale,
  pageKind = null
}) {
  const canonical = site.domain + canonicalPath;
  const pageSocialImage = locale === defaultWebsiteLocale
    ? socialImage
    : site.domain + localizedCapsuleAsset(locale, `social_share_${locale.steamCode}.png`);
  const alternates = pageKind ? websiteLocales.map((alternate) => [
    "<link rel='alternate' hreflang='", escapeHtml(alternate.appLocale), "' href='",
    site.domain, localizedPagePath(alternate, pageKind), "'>"
  ].join("")).join("") + [
    "<link rel='alternate' hreflang='x-default' href='", site.domain,
    localizedPagePath(defaultWebsiteLocale, pageKind), "'>"
  ].join("") : "";
  return [
    "<!doctype html>",
    "<html lang='", escapeHtml(locale.appLocale), "'>",
    "<head>",
    "<meta charset='utf-8'>",
    "<meta name='viewport' content='width=device-width, initial-scale=1'>",
    "<title>", escapeHtml(title), "</title>",
    "<meta name='description' content='", escapeHtml(pageDescription), "'>",
    noIndex ? "<meta name='robots' content='noindex'>" : "",
    "<link rel='canonical' href='", canonical, "'>",
    alternates,
    "<link rel='icon' href='/assets/art/icon-256.png' sizes='256x256' type='image/png'>",
    "<meta name='theme-color' content='#24243b'>",
    "<meta property='og:type' content='website'>",
    "<meta property='og:site_name' content='Marque &amp; Reprisal'>",
    "<meta property='og:title' content='", escapeHtml(title), "'>",
    "<meta property='og:description' content='", escapeHtml(pageDescription), "'>",
    "<meta property='og:url' content='", canonical, "'>",
    "<meta property='og:image' content='", pageSocialImage, "'>",
    "<meta property='og:image:type' content='image/png'>",
    "<meta property='og:image:width' content='1200'>",
    "<meta property='og:image:height' content='630'>",
    "<meta property='og:image:alt' content='", escapeHtml(locale.title), "'>",
    "<meta name='twitter:card' content='summary_large_image'>",
    "<meta name='twitter:title' content='", escapeHtml(title), "'>",
    "<meta name='twitter:description' content='", escapeHtml(pageDescription), "'>",
    "<meta name='twitter:image' content='", pageSocialImage, "'>",
    "<meta name='twitter:image:alt' content='", escapeHtml(locale.title), "'>",
    "<link rel='stylesheet' href='/assets/styles/site.css?v=", codeAssetVersion, "'>",
    "</head>",
    "<body class='", bodyClass, "'>",
    "<a class='skip-link' href='#main-content'>", escapeHtml(locale.ui.navAbout), "</a>",
    navigation(locale, pageKind ?? "home"),
    "<div id='main-content'>", main, "</div>",
    footer(locale),
    "<script src='/assets/scripts/site.js?v=", codeAssetVersion, "' defer></script>",
    "</body>",
    "</html>",
    ""
  ].join("");
}

function navigation(locale, pageKind) {
  const homePath = localizedPagePath(locale, "home");
  const pressPath = localizedPagePath(locale, "press");
  return [
    "<nav class='site-nav' aria-label='Primary navigation'>",
    "<a class='wordmark' href='", homePath, "' aria-label='", escapeHtml(locale.title), "'><span>M</span><i class='display-amp' aria-hidden='true'></i><span>R</span></a>",
    "<div class='nav-links'>",
    "<a href='", homePath, "#voyage'>", escapeHtml(locale.ui.navAbout), "</a>",
    "<a href='/ships/'>", escapeHtml(locale.ui.navShips), "</a>",
    "<a href='/qa/'>", escapeHtml(locale.ui.navQaEnglish), "</a>",
    "<a href='", pressPath, "'>", escapeHtml(locale.ui.navPress), "</a>",
    externalTextLink(site.steamUrl, "Steam"),
    externalTextLink(site.itchUrl, locale.ui.navDemo),
    externalTextLink(site.xUrl, "X"),
    "</div>",
    languagePicker(locale, pageKind),
    "</nav>"
  ].join("");
}

function languagePicker(locale, pageKind) {
  const options = websiteLocales.map((candidate) => {
    const aliases = [candidate.appLocale, candidate.steamCode, candidate.label, candidate.nativeLabel, candidate.slug || "english"];
    return [
      "<option value='", localizedPagePath(candidate, pageKind), "' data-language-aliases='",
      escapeHtml(aliases.join("|")), "'", candidate === locale ? " selected" : "", ">",
      escapeHtml(candidate.nativeLabel), "</option>"
    ].join("");
  }).join("");
  return [
    "<label class='site-language-picker'><span>", escapeHtml(locale.ui.language), "</span>",
    "<select data-website-language aria-label='", escapeHtml(locale.ui.language), "'>", options, "</select></label>"
  ].join("");
}

function footer(locale) {
  return [
    "<footer class='site-footer'>",
    "<div><strong>", escapeHtml(locale.title), "</strong><span>", escapeHtml(locale.ui.developedPublished), "</span></div>",
    "<div class='footer-links'><a href='", localizedPagePath(locale, "press"), "'>", escapeHtml(locale.ui.navPress), "</a><a href='/privacy/'>", escapeHtml(locale.ui.privacy), "</a>",
    externalTextLink(site.steamUrl, locale.ui.wishlist),
    externalTextLink(site.itchUrl, locale.ui.navDemo),
    externalTextLink(site.xUrl, site.xHandle),
    "</div>",
    "<p>© <span data-current-year>2026</span> ", escapeHtml(site.copyrightHolder), ".</p>",
    "</footer>"
  ].join("");
}

function fact(label, value) {
  return "<div class='fact-block'><dt>" + escapeHtml(label) + "</dt><dd>" + value + "</dd></div>";
}

function externalButton(url, label, className) {
  return "<a class='" + className + "' href='" + url + "' target='_blank' rel='noopener'>" + escapeHtml(label) + "<span aria-hidden='true'>↗</span></a>";
}

function externalTextLink(url, label) {
  return "<a href='" + url + "' target='_blank' rel='noopener'>" + escapeHtml(label) + "</a>";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}
