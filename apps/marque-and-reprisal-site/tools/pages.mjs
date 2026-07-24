import {
  features,
  languages,
  localizedCapsules,
  LOCALIZED_CAPSULE_ASSET_NAMES,
  pressCapsuleArt,
  pressLogos,
  qAndA,
  screenshots,
  site,
  WORLD_MAP_CELL_COUNT
} from "../content/site-content.mjs";

const description = site.shortDescription;
const socialImage = site.domain + "/assets/art/social-share.png";
const socialImageAlt = "Marque & Reprisal title and sailing ship against a pixel-art sunset over the sea.";
const codeAssetVersion = "2026-07-24";

export function homePage() {
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
    "<img src='/assets/press/screenshots/", shot.file, "' alt='", escapeHtml(shot.alt), "' loading='lazy' width='1920' height='1080'>",
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
    externalButton(site.itchUrl, "Play browser demo", "button button-primary"),
    externalButton(site.xUrl, "Follow " + site.xHandle, "button button-ghost"),
    "</div>",
    "<p class='platform-note'>Steam page coming soon. Windows first; macOS and Linux planned.</p>",
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
    externalButton(site.itchUrl, "Play the browser demo", "button button-primary"),
    "</div>",
    "</section>",
    "</main>"
  ].join("\n");

  return layout({
    title: site.title + " — a globe-spanning sailing roguelike",
    description,
    canonicalPath: "/",
    bodyClass: "home",
    main
  });
}

export function pressPage() {
  const featureList = features.map((feature) => [
    "<li><strong>", escapeHtml(feature.title), ".</strong> ",
    escapeHtml(feature.copy), "</li>"
  ].join("")).join("\n");

  const languageList = languages.map((language) => "<li>" + escapeHtml(language) + "</li>").join("");

  const screenshotCards = screenshots.map((shot) => [
    "<article class='press-asset-card'>",
    "<button class='asset-preview' type='button' data-lightbox-src='/assets/press/screenshots/", shot.file, "' data-lightbox-alt='", escapeHtml(shot.alt), "'>",
    "<img src='/assets/press/screenshots/", shot.file, "' alt='", escapeHtml(shot.alt), "' loading='lazy' width='1920' height='1080'>",
    "</button>",
    "<div><h3>", escapeHtml(shot.title), "</h3><p>1920 × 1080 PNG</p>",
    "<a href='/assets/press/screenshots/", shot.file, "' download>Download PNG</a></div>",
    "</article>"
  ].join("")).join("\n");

  const logoCards = pressLogos.map((asset) => graphicAssetCard(asset, "logos")).join("\n");
  const localizedCapsuleCards = localizedCapsules.map(localizedCapsuleCard).join("\n");
  const capsuleCards = pressCapsuleArt.map((asset) => graphicAssetCard(
    asset,
    "capsule-art",
    asset.transparent ? " transparent-preview" : ""
  )).join("\n");

  const main = [
    "<main class='press-main'>",
    "<header class='press-hero'>",
    "<img src='/assets/art/capsule-header.png' alt='Marque &amp; Reprisal sunset capsule art' width='920' height='430'>",
    "<div><p class='eyebrow'>Press kit</p><h1>Marque &amp; Reprisal</h1>",
    "<p>", escapeHtml(site.shortDescription), "</p>",
    "<a class='button button-primary' href='/downloads/marque-and-reprisal-press-kit.zip' download>Download complete press kit</a>",
    "</div>",
    "</header>",
    "<div class='press-layout'>",
    "<aside class='fact-sheet' aria-labelledby='facts-title'>",
    "<p class='eyebrow'>At a glance</p><h2 id='facts-title'>Fact sheet</h2>",
    fact("Developer", externalTextLink(site.developerUrl, site.developer)),
    fact("Publisher", escapeHtml(site.publisher)),
    fact("Release", escapeHtml(site.release)),
    fact("Platforms", escapeHtml(site.platforms)),
    fact("Genre", escapeHtml(site.genre)),
    fact("Website", externalTextLink(site.domain, "marque-and-reprisal.com")),
    fact("Steam", escapeHtml(site.steamStatus)),
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
    "</article>",
    "</div>",
    "<section class='press-assets' id='screenshots' aria-labelledby='screenshots-title'>",
    "<div class='asset-heading'><div><p class='eyebrow'>Full resolution</p><h2 id='screenshots-title'>Screenshots</h2></div>",
    "<a href='/downloads/marque-and-reprisal-press-kit.zip' download>Download all assets</a></div>",
    "<div class='press-asset-grid'>", screenshotCards, "</div>",
    "</section>",
    "<section class='press-assets' aria-labelledby='logos-title'>",
    "<div class='asset-heading'><div><p class='eyebrow'>Identity</p><h2 id='logos-title'>Logos &amp; artwork</h2></div></div>",
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
    main
  });
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
    "<h1>Questions &amp; answers</h1>",
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

function localizedCapsuleCard(locale) {
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
    "<p>", String(LOCALIZED_CAPSULE_ASSET_NAMES.length), " full-resolution PNG assets</p>",
    "</div><a href='/downloads/", escapeHtml(locale.archiveFile), "' download>Download ZIP</a></div>",
    "</article>"
  ].join("");
}

export function privacyPage() {
  const main = [
    "<main class='legal-main'>",
    "<article>",
    "<p class='eyebrow'>Plain sailing</p>",
    "<h1>Privacy</h1>",
    "<p class='legal-lead'>This website does not use analytics, advertising trackers, accounts, forms, or cookies.</p>",
    "<h2>Server logs</h2>",
    "<p>The site is delivered by Cloudflare, which may process basic network and security information as part of operating its service. This site does not add its own visitor tracking or retain a separate visitor database.</p>",
    "<h2>External links</h2>",
    "<p>Links to itch.io and X take you to those services, where their own privacy policies apply.</p>",
    "<h2>Changes</h2>",
    "<p>If the site later adds analytics, a mailing list, or another service that collects information, this page will be updated before that service is enabled.</p>",
    "<p class='legal-updated'>Last updated: July 21, 2026</p>",
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
    "Release: " + site.release,
    "Platforms: " + site.platforms,
    "Genre: " + site.genre,
    "Website: " + site.domain,
    "Steam: " + site.steamStatus,
    "Browser demo: " + site.itchUrl,
    "X: " + site.xHandle + " (" + site.xUrl + ")",
    "",
    "SHORT DESCRIPTION",
    site.shortDescription,
    "",
    "FEATURES",
    ...features.map((feature) => feature.title.toUpperCase() + "\n" + feature.copy),
    "",
    "DEVELOPER Q&A",
    ...qAndA.flatMap((entry) => [
      "Q: " + entry.question,
      ...entry.answer.map((paragraph) => "A: " + paragraph),
      ""
    ]),
    "TEXT LANGUAGES",
    languages.join(", "),
    "",
    "ASSET USE",
    "The included assets may be used for editorial coverage, reviews, videos, streams, and event listings concerning Marque & Reprisal.",
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
  return [
    "<?xml version='1.0' encoding='UTF-8'?>",
    "<urlset xmlns='http://www.sitemaps.org/schemas/sitemap/0.9'>",
    "<url><loc>" + site.domain + "/</loc><priority>1.0</priority></url>",
    "<url><loc>" + site.domain + "/qa/</loc><priority>0.8</priority></url>",
    "<url><loc>" + site.domain + "/press/</loc><priority>0.8</priority></url>",
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
  noIndex = false
}) {
  const canonical = site.domain + canonicalPath;
  return [
    "<!doctype html>",
    "<html lang='en'>",
    "<head>",
    "<meta charset='utf-8'>",
    "<meta name='viewport' content='width=device-width, initial-scale=1'>",
    "<title>", escapeHtml(title), "</title>",
    "<meta name='description' content='", escapeHtml(pageDescription), "'>",
    noIndex ? "<meta name='robots' content='noindex'>" : "",
    "<link rel='canonical' href='", canonical, "'>",
    "<link rel='icon' href='/assets/art/icon-256.png' sizes='256x256' type='image/png'>",
    "<meta name='theme-color' content='#24243b'>",
    "<meta property='og:type' content='website'>",
    "<meta property='og:site_name' content='Marque &amp; Reprisal'>",
    "<meta property='og:title' content='", escapeHtml(title), "'>",
    "<meta property='og:description' content='", escapeHtml(pageDescription), "'>",
    "<meta property='og:url' content='", canonical, "'>",
    "<meta property='og:image' content='", socialImage, "'>",
    "<meta property='og:image:type' content='image/png'>",
    "<meta property='og:image:width' content='1200'>",
    "<meta property='og:image:height' content='630'>",
    "<meta property='og:image:alt' content='", escapeHtml(socialImageAlt), "'>",
    "<meta name='twitter:card' content='summary_large_image'>",
    "<meta name='twitter:title' content='", escapeHtml(title), "'>",
    "<meta name='twitter:description' content='", escapeHtml(pageDescription), "'>",
    "<meta name='twitter:image' content='", socialImage, "'>",
    "<meta name='twitter:image:alt' content='", escapeHtml(socialImageAlt), "'>",
    "<link rel='stylesheet' href='/assets/styles/site.css?v=", codeAssetVersion, "'>",
    "</head>",
    "<body class='", bodyClass, "'>",
    "<a class='skip-link' href='#main-content'>Skip to content</a>",
    navigation(),
    "<div id='main-content'>", main, "</div>",
    footer(),
    "<script src='/assets/scripts/site.js?v=", codeAssetVersion, "' defer></script>",
    "</body>",
    "</html>",
    ""
  ].join("");
}

function navigation() {
  return [
    "<nav class='site-nav' aria-label='Primary navigation'>",
    "<a class='wordmark' href='/' aria-label='Marque and Reprisal home'><span>M</span><i>&amp;</i><span>R</span></a>",
    "<div class='nav-links'>",
    "<a href='/#voyage'>About</a>",
    "<a href='/qa/'>Q&amp;A</a>",
    "<a href='/press/'>Press kit</a>",
    externalTextLink(site.itchUrl, "Demo"),
    externalTextLink(site.xUrl, "X"),
    "</div>",
    "</nav>"
  ].join("");
}

function footer() {
  return [
    "<footer class='site-footer'>",
    "<div><strong>Marque &amp; Reprisal</strong><span>Explore. Trade. Fish. Pillage.</span></div>",
    "<div class='footer-links'><a href='/press/'>Press kit</a><a href='/privacy/'>Privacy</a>",
    externalTextLink(site.itchUrl, "Demo on itch.io"),
    externalTextLink(site.xUrl, site.xHandle),
    "</div>",
    "<p>© <span data-current-year>2026</span> ", escapeHtml(site.developer), ".</p>",
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
