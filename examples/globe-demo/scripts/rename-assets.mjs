#!/usr/bin/env node
/**
 * Rename asset files to descriptive names for easier identification.
 * Tree_1=deciduous_round, Tree_2=deciduous_boxy, Tree_3=acacia, Tree_4=pine, Tree_5/Palm*=palm;
 * bare variants; bushes match tree numbers; rocks = rock_1/2/3; grass = grass_1/2; fern, fiddlehead, bamboo_stand.
 * Run from examples/globe-demo. Updates .gltf buffer/node/mesh names to match.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEMO_ROOT = path.resolve(__dirname, "..");
const ASSETS_DIR = path.join(DEMO_ROOT, "public", "assets");

// Longest prefixes first so e.g. Tree_Bare_1_ matches before Tree_1_
const PREFIX_MAP = [
  ["Tree_Bare_1_", "deciduous_round_bare_"],
  ["Tree_Bare_2_", "deciduous_boxy_bare_"],
  ["Tree_1_", "deciduous_round_"],
  ["Tree_2_", "deciduous_boxy_"],
  ["Tree_3_", "acacia_"],
  ["Tree_4_", "pine_"],
  ["Tree_5_", "palm_"],
  ["Palm_1_", "palm_"],
  ["Palm_", "palm_"],
  ["Bush_1_", "bush_deciduous_round_"],
  ["Bush_2_", "bush_deciduous_boxy_"],
  ["Bush_3_", "bush_acacia_"],
  ["Bush_4_", "bush_pine_"],
  ["Rock_1_", "rock_1_"],
  ["Rock_2_", "rock_2_"],
  ["Rock_3_", "rock_3_"],
  ["Grass_1_", "grass_1_"],
  ["Grass_2_", "grass_2_"],
  ["Grass_1", "grass_1"],
  ["Grass_2", "grass_2"],
  ["Bamboo_stand", "bamboo_stand"],
  ["fiddlehead_plant", "fiddlehead"],
  ["Fern_", "fern_"],
  ["Fern", "fern"],
];

function newBasename(oldBasename) {
  for (const [from, to] of PREFIX_MAP) {
    if (oldBasename.startsWith(from) || oldBasename === from) {
      return to + oldBasename.slice(from.length);
    }
  }
  return null;
}

function walk(dir, base = "") {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    const rel = base ? `${base}/${e.name}` : e.name;
    const full = path.join(dir, e.name);
    if (e.isDirectory() && !e.name.startsWith(".")) {
      out.push(...walk(full, rel));
    } else if (e.isFile()) {
      out.push({ rel, full, name: e.name });
    }
  }
  return out;
}

const files = walk(ASSETS_DIR);
const renames = []; // { oldFull, newFull, oldBasename, newBasename }

for (const { rel, full, name } of files) {
  const ext = path.extname(name);
  const basename = name.slice(0, -ext.length);
  const newBase = newBasename(basename);
  if (!newBase) continue;
  if (newBase === basename) continue;
  const newName = newBase + ext;
  const dir = path.dirname(full);
  const newFull = path.join(dir, newName);
  renames.push({ oldFull: full, newFull, oldBasename: basename, newBasename: newBase, ext });
}

// Two-phase rename so we never overwrite: old -> temp, then temp -> new.
const newPaths = new Set(renames.map((r) => r.newFull));
for (const r of renames) {
  if (r.oldFull === r.newFull) continue;
  if (!fs.existsSync(r.oldFull)) continue;
  const tempFull = path.join(path.dirname(r.oldFull), `__rename_${path.basename(r.oldFull)}`);
  fs.renameSync(r.oldFull, tempFull);
  r.tempFull = tempFull;
}
for (const r of renames) {
  if (!r.tempFull) continue;
  fs.renameSync(r.tempFull, r.newFull);
}

// Update .gltf content: replace old basename with new in buffer uri, node names, mesh names
for (const r of renames) {
  if (r.ext !== ".gltf") continue;
  let content = fs.readFileSync(r.newFull, "utf8");
  const prev = content;
  content = content.split(r.oldBasename).join(r.newBasename);
  if (content !== prev) {
    fs.writeFileSync(r.newFull, content, "utf8");
  }
}

console.log(`Renamed ${renames.length} asset files.`);
if (renames.length) {
  console.log("Examples:", renames.slice(0, 5).map((r) => path.basename(r.oldFull) + " → " + path.basename(r.newFull)).join(", "));
}
