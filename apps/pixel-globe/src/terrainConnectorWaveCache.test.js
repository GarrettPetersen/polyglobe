import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("./main.js", import.meta.url), "utf8");

function functionSource(name, nextName) {
  const start = source.indexOf(`function ${name}(`);
  const end = source.indexOf(`function ${nextName}(`, start + 1);
  assert.ok(start >= 0, `${name} is missing`);
  assert.ok(end > start, `${name} has no ${nextName} boundary`);
  return source.slice(start, end);
}

test("terrain connector animation shares immutable atlas geometry across every frame", () => {
  const layer = functionSource(
    "terrainConnectorDynamicLayer",
    "emptyTerrainConnectorDynamicLayer"
  );
  const frameBuild = functionSource(
    "createTerrainConnectorDynamicFrameBuild",
    "advanceTerrainConnectorDynamicFrameBuild"
  );
  const frameComplete = functionSource(
    "completeTerrainConnectorDynamicFrameBuild",
    "terrainConnectorDynamicAtlasLayout"
  );

  assert.equal(layer.match(/terrainConnectorDynamicAtlasLayout\(/g)?.length, 1);
  assert.match(layer, /cached\?\.baseLayer !== baseLayer/);
  assert.match(layer, /cached\.visibleFaceCalls !== visibleFaceCalls/);
  assert.doesNotMatch(frameBuild, /terrainConnectorDynamicAtlasLayout\(/);
  assert.match(frameBuild, /cached\.atlas\.(?:width|height)/);
  assert.match(frameComplete, /build\.cached\.atlas\.drawSprites/);
});

test("connector waves remain scoped to the visible render window", () => {
  assert.match(
    source,
    /terrainConnectorDynamicLayer\(connectors, chart, renderWindow\.faceCalls\)/
  );
});
