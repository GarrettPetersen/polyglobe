#!/usr/bin/env node
/**
 * Scan public/assets (plants, environment, textures) and write assets-manifest.json
 * so the asset viewer can list and load assets. Run from examples/globe-demo.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEMO_ROOT = path.resolve(__dirname, "..");
const ASSETS_DIR = path.join(DEMO_ROOT, "public", "assets");
const OUT_PATH = path.join(DEMO_ROOT, "public", "assets-manifest.json");

const VIEWABLE_EXT = new Set([".gltf", ".glb", ".png", ".jpg", ".jpeg", ".webp"]);

function walk(dir, base = "") {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    const rel = base ? `${base}/${e.name}` : e.name;
    const full = path.join(dir, e.name);
    if (e.isDirectory() && !e.name.startsWith(".")) {
      out.push(...walk(full, rel));
    } else if (e.isFile()) {
      const ext = path.extname(e.name).toLowerCase();
      if (VIEWABLE_EXT.has(ext)) out.push({ path: `assets/${rel}`, name: e.name, folder: base || path.dirname(rel) });
    }
  }
  return out;
}

const list = walk(ASSETS_DIR);
list.sort((a, b) => a.path.localeCompare(b.path));
fs.writeFileSync(OUT_PATH, JSON.stringify(list, null, 2), "utf8");
console.log(`Wrote ${list.length} assets to ${OUT_PATH}`);
