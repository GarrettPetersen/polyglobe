import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { sampledCityTerrain } from "./cityTerrainSampling.js";

const weights = (values = {}) => ({ grass: 0, forest: 0, desert: 0, rocky: 0, ...values });
const samples = () => ({
  left: weights({ forest: 18 }), right: weights(),
  leftDistant: weights({ forest: 13 }), rightDistant: weights()
});

test("the generated London scene has sampled land and tree cover on both Thames banks", () => {
  const catalog = JSON.parse(readFileSync(new URL("./data/cities.json", import.meta.url), "utf8"));
  const london = catalog.cities.find(city => city.cityId === "london|united kingdom");
  assert.ok(london);
  assert.equal(london.approach, "river");
  assert.equal(london.terrain.left, "forest");
  assert.equal(london.terrain.right, "forest");
  assert.equal(london.terrain.leftTreeCover, true);
  assert.equal(london.terrain.rightTreeCover, true);
});

test("London's unsampled bank inherits observed woodland instead of becoming a desert", () => {
  assert.deepEqual(sampledCityTerrain(samples()), {
    left: "forest", right: "forest", leftDistant: "forest", rightDistant: "forest"
  });
});

test("observed bank and distant terrain remain independent", () => {
  const scores = samples();
  scores.right = weights({ grass: 2 });
  scores.rightDistant = weights({ desert: 1 });
  assert.deepEqual(sampledCityTerrain(scores), {
    left: "forest", right: "grass", leftDistant: "forest", rightDistant: "desert"
  });
});

test("missing or invalid observations cannot silently invent terrain", () => {
  const empty = Object.fromEntries(Object.keys(samples()).map(region => [region, weights()]));
  assert.throws(() => sampledCityTerrain(empty), /no land samples/);
  const invalid = samples();
  invalid.left.grass = NaN;
  assert.throws(() => sampledCityTerrain(invalid), /Invalid city terrain/);
  assert.throws(() => sampledCityTerrain({}), /Invalid city terrain/);
});
