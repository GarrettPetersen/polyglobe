import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../dashboard/dashboard.css", import.meta.url), "utf8");
const html = await readFile(new URL("../dashboard/index.html", import.meta.url), "utf8");

test("voyage starts occupy a full dashboard row", () => {
  assert.match(css, /\.starts-panel,\s*\.channels-panel,\s*\.crashes-panel\s*{\s*grid-column:\s*1\s*\/\s*-1;/);
  assert.match(html, /<article class="panel starts-panel">/);
});

test("empty dashboard tables retain readable vertical space", () => {
  assert.match(css, /\.empty-table-cell\s*{[^}]*height:\s*112px;/s);
});

test("pre-cursor crash reports live in a collapsed disclosure", () => {
  assert.match(html, /<details id="fixed-crashes"[^>]*hidden>/);
  assert.match(html, /id="fixed-crash-list"/);
  assert.match(css, /\.fixed-crashes/);
});
