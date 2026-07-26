import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { MODEL_CREDITS, modelCreditMarkdownLine } from "./modelCredits.js";

const appRoot = new URL("..", import.meta.url);

test("prototype page uses the Marque & Reprisal title and social metadata", () => {
  const html = readFileSync(new URL("index.html", appRoot), "utf8");
  assert.match(html, /<title>Marque &amp; Reprisal \| Online Prototype<\/title>/);
  assert.match(html, /rel="canonical" href="https:\/\/pirates-of-the-pixel-globe\.pages\.dev\/"/);
  assert.match(html, /property="og:title" content="Marque &amp; Reprisal"/);
  assert.match(html, /property="og:url" content="https:\/\/pirates-of-the-pixel-globe\.pages\.dev\/"/);
  assert.match(
    html,
    /property="og:image" content="https:\/\/pirates-of-the-pixel-globe\.pages\.dev\/assets\/social\/marque-and-reprisal-og\.png"/
  );
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(
    html,
    /name="twitter:image" content="https:\/\/pirates-of-the-pixel-globe\.pages\.dev\/assets\/social\/marque-and-reprisal-twitter\.png"/
  );
  assert.doesNotMatch(html, /(?:src|href|content)="\/(?:assets|src)\//);
  assert.doesNotMatch(html, /Pirates of the Pixel Globe/i);
});

test("social cards have the declared dimensions", () => {
  assert.deepEqual(pngDimensions(new URL("public/assets/social/marque-and-reprisal-og.png", appRoot)), {
    width: 1200,
    height: 630
  });
  assert.deepEqual(pngDimensions(new URL("public/assets/social/marque-and-reprisal-twitter.png", appRoot)), {
    width: 1200,
    height: 675
  });
});

test("credits contain attribution text without hyperlinks", () => {
  const credits = readFileSync(new URL("public/assets/CREDITS.md", appRoot), "utf8");
  assert.match(credits, /^# Marque & Reprisal Credits/m);
  for (const credit of MODEL_CREDITS) {
    assert.ok(credits.includes(modelCreditMarkdownLine(credit)), `${credit.sourceTitle} credit`);
  }
  assert.doesNotMatch(credits, /https?:\/\//);
  assert.doesNotMatch(credits, /\[[^\]]+\]\([^)]+\)/);
});

test("credits thank the community playtesters", () => {
  const credits = readFileSync(new URL("public/assets/CREDITS.md", appRoot), "utf8");
  assert.match(credits, /^## Playtesting$/m);
  for (const handle of [
    "@MunicipleOrrery",
    "@J_K_Chesterton",
    "@StuffForSisters",
    "@dgant",
    "@ZachariahSchwab",
    "@QuantumWitness",
    "@neokodosian",
    "@riboprotein"
  ]) {
    assert.ok(credits.includes(handle), `missing playtester credit for ${handle}`);
  }
});

function pngDimensions(url) {
  const bytes = readFileSync(url);
  assert.equal(bytes.toString("ascii", 1, 4), "PNG");
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20)
  };
}
