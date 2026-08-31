import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { indexEntitiesById, requireEntityById } from "./entityIds.js";
import { RULER_TIMELINES, gameMinuteForDate, rulerAtMinute } from "./rulers.js";

const sourceDirectory = path.dirname(fileURLToPath(import.meta.url));
const PRESENTATION_FIELD = "(?:displayName|portName|rulerName|city|country|name)";
const PRESENTATION_EQUALITY = new RegExp(
  `(?:\\.${PRESENTATION_FIELD}\\s*(?:===|!==)|(?:===|!==)\\s*[\\w?.[\\]\"']+\\.${PRESENTATION_FIELD}\\b)`
);
const DURABLE_TILE_EQUALITY = /(?:\.tileId\s*===\s*[^;]*(?:quest|memory|matter|contract|context)\b|(?:quest|memory|matter|contract|context)[^;]*\.tileId\s*===)/i;
const DURABLE_TILE_LOOKUP = /ByTileId\.get\([^)]*(?:quest|offer|memory|matter|contract)/i;
const TILE_DERIVED_ENTITY_ID = /(?:`(?:city|port|shore-battery|pirate-hideout)[-:]\$\{[^}]*tileId|\b(?:portId|cityId|originId|destinationId|targetId|homePortId|subjectId|missionId|identityKey|rollKey|cityIdentity)\b\s*(?::|=(?!=))\s*[^,;]*\btileId\b|\bid\s*:\s*`[^`]*\$\{[^}]*tileId)/i;
const PRESENTATION_DERIVED_IDENTITY = /\b(?:identityKey|rollKey|cityIdentity|subjectId|missionId)\b\s*[:=][^;]*(?:\.name\b|\.city\b|\.country\b|displayName\b|displayCity\b)/;
const PRESENTATION_PASSED_TO_IDENTITY_SELECTOR = /\b[A-Za-z_$][\w$]*(?:ForKey|ById)\([^\n)]*(?:\.name\b|\.city\b|\.country\b|displayName\b|displayCity\b)/;
const TILE_COMPARED_TO_CANONICAL_ID = /(?:\.tileId\s*(?:===|!==)\s*[\w$?.[\]]+\.(?:cityId|portId)|\.(?:cityId|portId)\s*(?:===|!==)\s*[\w$?.[\]]+\.tileId)/;

test("production entity logic never uses presentation text as identity", async () => {
  const violations = [];
  for (const file of await productionSourceFiles()) {
    const lines = (await readFile(file, "utf8")).split("\n");
    lines.forEach((line, index) => {
      const context = lines.slice(Math.max(0, index - 3), index + 1);
      if (!PRESENTATION_EQUALITY.test(line) || presentationValidationOrErrorKind(line, context)) return;
      violations.push(`${path.basename(file)}:${index + 1}: ${line.trim()}`);
    });
  }
  assert.deepEqual(violations, [], `Presentation-text identity comparisons:\n${violations.join("\n")}`);
});

test("durable entity logic cannot identify a catalog entity by tile", async () => {
  const violations = [];
  for (const file of await productionSourceFiles()) {
    if (["npcSeaRoutes.js", "landTradeSystem.js"].includes(path.basename(file))) continue;
    const lines = (await readFile(file, "utf8")).split("\n");
    lines.forEach((line, index) => {
      if (!DURABLE_TILE_EQUALITY.test(line) && !DURABLE_TILE_LOOKUP.test(line)) return;
      const previous = lines[index - 1] || "";
      if (line.includes("IDENTITY_SPATIAL_EXCEPTION") || previous.includes("IDENTITY_SPATIAL_EXCEPTION")) return;
      violations.push(`${path.basename(file)}:${index + 1}: ${line.trim()}`);
    });
  }
  assert.deepEqual(violations, [], `Durable tile identities require an explicit spatial exception:\n${violations.join("\n")}`);
});

test("production code never manufactures an entity id from a map tile", async () => {
  const violations = [];
  for (const file of await productionSourceFiles()) {
    const lines = (await readFile(file, "utf8")).split("\n");
    lines.forEach((line, index) => {
      if (!TILE_DERIVED_ENTITY_ID.test(line)) return;
      const previous = lines[index - 1] || "";
      if (line.includes("IDENTITY_SPATIAL_EXCEPTION") || previous.includes("IDENTITY_SPATIAL_EXCEPTION")) return;
      violations.push(`${path.basename(file)}:${index + 1}: ${line.trim()}`);
    });
  }
  assert.deepEqual(violations, [], `Tile-derived entity ids:\n${violations.join("\n")}`);
});

test("production identity keys never depend on presentation text", async () => {
  const violations = [];
  for (const file of await productionSourceFiles()) {
    const lines = (await readFile(file, "utf8")).split("\n");
    lines.forEach((line, index) => {
      if (!PRESENTATION_DERIVED_IDENTITY.test(line)) return;
      const previous = lines[index - 1] || "";
      if (line.includes("IDENTITY_MIGRATION_EXCEPTION") ||
          previous.includes("IDENTITY_MIGRATION_EXCEPTION")) return;
      violations.push(`${path.basename(file)}:${index + 1}: ${line.trim()}`);
    });
  }
  assert.deepEqual(violations, [], `Presentation-derived identity keys:\n${violations.join("\n")}`);
});

test("identity selectors never receive presentation text", async () => {
  const violations = [];
  for (const file of await productionSourceFiles()) {
    const lines = (await readFile(file, "utf8")).split("\n");
    lines.forEach((line, index) => {
      if (!PRESENTATION_PASSED_TO_IDENTITY_SELECTOR.test(line)) return;
      violations.push(`${path.basename(file)}:${index + 1}: ${line.trim()}`);
    });
  }
  assert.deepEqual(violations, [], `Presentation text passed to identity selectors:\n${violations.join("\n")}`);
});

test("tile coordinates are never compared with canonical city or port ids", async () => {
  const violations = [];
  for (const file of await productionSourceFiles()) {
    const lines = (await readFile(file, "utf8")).split("\n");
    lines.forEach((line, index) => {
      if (!TILE_COMPARED_TO_CANONICAL_ID.test(line)) return;
      const context = lines.slice(Math.max(0, index - 2), index + 1);
      if (context.some((entry) => entry.includes("IDENTITY_MIGRATION_EXCEPTION"))) return;
      violations.push(`${path.basename(file)}:${index + 1}: ${line.trim()}`);
    });
  }
  assert.deepEqual(violations, [], `Tile/canonical-id type mismatches:\n${violations.join("\n")}`);
});

test("canonical indexes reject collisions and remain independent of labels and coordinates", () => {
  const original = { id: "city:rome", name: "Rome", tileId: 10 };
  const index = indexEntitiesById([original], { label: "Test city" });
  original.name = "Roma";
  original.tileId = 999;
  assert.equal(requireEntityById(index, "city:rome", "Test city"), original);
  assert.throws(
    () => indexEntitiesById([original, { id: original.id }], { label: "Test city" }),
    /duplicate id/
  );
});

test("ruler identity survives presentation and confessional record changes", () => {
  const beforeReformation = rulerAtMinute("england", gameMinuteForDate(1534, 11, 2));
  const afterReformation = rulerAtMinute("england", gameMinuteForDate(1534, 11, 3));
  assert.equal(beforeReformation.id, "henry-viii");
  assert.equal(afterReformation.id, beforeReformation.id);
  assert.notEqual(afterReformation.recordId, beforeReformation.recordId);
  assert.equal(
    rulerAtMinute("spain", 0).id,
    rulerAtMinute("burgundian-netherlands", 0).id,
    "Charles's separate crowns must point to the same person"
  );
  const recordIds = Object.values(RULER_TIMELINES).flatMap((timeline) => (
    timeline.map((ruler) => ruler.recordId)
  ));
  assert.equal(new Set(recordIds).size, recordIds.length, "Ruler record ids must be globally unique");
});

async function productionSourceFiles() {
  return (await readdir(sourceDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".js") &&
      !entry.name.endsWith(".test.js") && entry.name !== "bootstrap.js")
    .map((entry) => path.join(sourceDirectory, entry.name));
}

function presentationValidationOrErrorKind(line, context) {
  if (context.some((entry) => entry.includes("IDENTITY_PRESENTATION_SYNC"))) return true;
  if (line.includes("typeof ") || /\.(?:displayName|portName|rulerName|city|country|name)\s*(?:===|!==)\s*""/.test(line)) {
    return true;
  }
  return /(?:error|normalized)\?*\.name\s*(?:===|!==)/.test(line);
}
