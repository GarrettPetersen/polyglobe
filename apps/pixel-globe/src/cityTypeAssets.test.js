import assert from "node:assert/strict";
import test from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import {
  CITY_IMAGE_KEYS,
  cityArtKeyForCity,
  cityIsInEurope,
  cityTypeForCity
} from "./cityCatalogData.js";
const cityArtRoot = join(dirname(fileURLToPath(import.meta.url)), "../public/assets/buildings/city-types");

test("the shared village placeholder is a nonblank transparent 36px sprite", async () => {
  await assertNonblankTransparentCitySprite("city-village.png");
});

test("substantial northern Native American settlements use their own city art", async () => {
  assert.ok(CITY_IMAGE_KEYS.includes("native-american"));
  assert.equal(cityArtKeyForCity({
    cityId: "wendat town|canada",
    city: "Wendat Town",
    country: "Canada",
    cityType: "mesoamerican",
    population: 10000,
    settlementType: "city"
  }), "native-american");
  assert.equal(cityArtKeyForCity({
    cityId: "chillicothe|united states of america",
    city: "Chillicothe",
    country: "United States of America",
    cityType: "mesoamerican",
    population: 18000,
    settlementType: "city"
  }), "native-american");
  assert.equal(cityArtKeyForCity({
    cityId: "yuquot village|nuu-chah-nulth",
    city: "Yuquot Village",
    country: "Nuu-chah-nulth",
    cityType: "mesoamerican",
    population: 1500,
    settlementType: "village"
  }), "village");
  assert.equal(cityArtKeyForCity({
    cityId: "cempoala|mexico",
    city: "Cempoala",
    country: "Mexico",
    cityType: "mesoamerican",
    population: 20000,
    settlementType: "city"
  }), "mesoamerican");
  await assertNonblankTransparentCitySprite("city-native-american.png");
});

test("historical British countries remain European without inventing the United Kingdom", () => {
  for (const country of ["England", "Scotland", "Wales"]) {
    const cityId = `test|${country.toLocaleLowerCase("en-US")}`;
    assert.equal(cityIsInEurope({ cityId, country }), true);
    assert.equal(cityTypeForCity(cityId, 52, -2), "northern-european");
  }
});

async function assertNonblankTransparentCitySprite(filename) {
  const image = await loadImage(join(cityArtRoot, filename));
  assert.equal(image.width, 36);
  assert.equal(image.height, 36);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
  let opaquePixels = 0;
  let transparentPixels = 0;
  for (let offset = 0; offset < pixels.length; offset += 4) {
    if (pixels[offset + 3] === 0) transparentPixels += 1;
    else opaquePixels += 1;
  }
  assert.ok(opaquePixels > 0);
  assert.ok(transparentPixels > 0);
}

test("abandoned and failed colonies use the authored ruins marker", async () => {
  assert.ok(CITY_IMAGE_KEYS.includes("ruins"));
  for (const history of [
    { colonizationQuestStage: "established", colonyAbandoned: true },
    { colonizationQuestStage: "failed" }
  ]) {
    assert.equal(cityArtKeyForCity({ cityId: "roanoke|united states of america",
      cityType: "northern-european", settlementType: "village", colonizationQuestSite: true,
      ...history }), "ruins");
  }
  await assertNonblankTransparentCitySprite("city-ruins.png");
});
