import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  CITY_DOCKSIDE_SHADOW_MAX_ABOVE_DECK_PX,
  CITY_DOCKSIDE_SHADOW_MAX_LEFT_REACH_PX,
  cityDocksideAssetUrls,
  cityFlagAssetUrl,
  indexCitySideViewShips,
  publicCityAssetUrl,
  requireCityDocksideShip,
  requireCityFlag,
  requireCitySideViewShip,
  validateCityDocksideShipManifest,
  validateCityFlagManifest
} from "./citySceneAssetContracts.js";
import { CITY_DOCKSIDE_SHADOW_LIGHT_DIRECTION } from "../src/shipBakeLighting.js";

const flagManifest = readJson("../public/assets/factions/flags/manifest.json");
const docksideManifest = readJson("../public/assets/vehicles/unity-ships/port-assault/manifest.json");
const sideViewManifest = readJson("../public/assets/vehicles/unity-ships/side-views/manifest.json");
const visualizerSource = readFileSync(new URL("./main.js", import.meta.url), "utf8");

test("city asset manifests resolve canonical assets without substitution", () => {
  const flags = validateCityFlagManifest(flagManifest);
  const docksideShips = validateCityDocksideShipManifest(docksideManifest);
  const sideViews = indexCitySideViewShips(sideViewManifest);

  assert.equal(cityFlagAssetUrl(requireCityFlag(flags, "england")), "/assets/factions/flags/england.png");
  assert.equal(requireCityDocksideShip(docksideShips, "sampan").slug, "sampan");
  assert.equal(requireCitySideViewShip(sideViews, "sampan").slug, "sampan");
  assert.equal(cityDocksideAssetUrls(docksideShips, "sampan").length, 5);
});

test("unknown canonical IDs fail instead of selecting another city asset", () => {
  const flags = validateCityFlagManifest(flagManifest);
  const docksideShips = validateCityDocksideShipManifest(docksideManifest);
  const sideViews = indexCitySideViewShips(sideViewManifest);

  assert.throws(() => requireCityFlag(flags, "missing-faction"), /no canonical ID/);
  assert.throws(() => requireCityDocksideShip(docksideShips, "missing-ship"), /no canonical ID/);
  assert.throws(() => requireCitySideViewShip(sideViews, "missing-ship"), /no canonical ID/);
});

test("every dockside water shadow is baked close beside and to the left of its hull", () => {
  validateCityDocksideShipManifest(docksideManifest);
  assert.deepEqual(
    docksideManifest.waterShadowLightDirection,
    CITY_DOCKSIDE_SHADOW_LIGHT_DIRECTION
  );
  for (const ship of docksideManifest.ships) {
    const dockside = ship.cityDockside;
    const deckTopY = Math.min(...dockside.deckPolygon.map(({ y }) => y));
    const deckLeftX = Math.min(...dockside.deckPolygon.map(({ x }) => x));
    const deckCenterX = dockside.deckPolygon.reduce((sum, { x }) => sum + x, 0) /
      dockside.deckPolygon.length;
    for (const shadow of Object.values(dockside.waterShadows)) {
      const bounds = shadow.opaqueBounds;
      assert.ok(
        (deckTopY - bounds.minY) / dockside.nativeScale <=
          CITY_DOCKSIDE_SHADOW_MAX_ABOVE_DECK_PX,
        ship.slug
      );
      assert.ok(
        (deckLeftX - bounds.minX) / dockside.nativeScale <=
          CITY_DOCKSIDE_SHADOW_MAX_LEFT_REACH_PX,
        ship.slug
      );
      assert.ok(bounds.minX + (bounds.width - 1) / 2 < deckCenterX, ship.slug);
    }
  }
});

test("dockside manifests reject stale light direction and distant-reaching shadows", () => {
  const staleLight = structuredClone(docksideManifest);
  staleLight.waterShadowLightDirection.y = 0.8;
  assert.throws(
    () => validateCityDocksideShipManifest(staleLight),
    /wrong water-shadow light direction/
  );

  const distantShadow = structuredClone(docksideManifest);
  const dockside = distantShadow.ships[0].cityDockside;
  const deckTopY = Math.min(...dockside.deckPolygon.map(({ y }) => y));
  dockside.waterShadows.level.opaqueBounds.minY =
    deckTopY - dockside.nativeScale * (CITY_DOCKSIDE_SHADOW_MAX_ABOVE_DECK_PX + 1);
  assert.throws(
    () => validateCityDocksideShipManifest(distantShadow),
    /Distant-reaching level dockside water shadow/
  );
});

test("duplicate IDs, malformed files, and non-public paths fail at the manifest boundary", () => {
  assert.throws(() => validateCityFlagManifest({
    width: 32,
    height: 20,
    factions: [
      { id: "england", file: "england.png", width: 32, height: 20 },
      { id: "england", file: "england.png", width: 32, height: 20 }
    ]
  }), /Duplicate city faction flag canonical ID/);
  assert.throws(() => validateCityFlagManifest({
    width: 32,
    height: 20,
    factions: [{ id: "england", file: "wrong.png", width: 32, height: 20 }]
  }), /does not match its canonical ID/);
  assert.throws(() => publicCityAssetUrl("private/ship.png"), /requires a public asset path/);
  assert.throws(
    () => publicCityAssetUrl("apps/pixel-globe/public/assets/../private/ship.png"),
    /is not normalized/
  );
});

test("city selection is atomic and every shared image is prepared during runtime initialization", () => {
  const initialize = functionSource("initialize", "preloadSharedCitySceneImages");
  assert.match(initialize, /await preloadSharedCitySceneImages\(\)/);
  const selection = functionSource("selectCity", "resolveCityRecord");
  assert.match(selection, /const prepared = await preloadCitySelection[\s\S]*state\.city = city/);
  assert.doesNotMatch(selection, /state\.city = city[\s\S]*await preloadCitySelection/);
  assert.match(visualizerSource, /MAX_DOCKSIDE_SHIP_PRESENTATIONS = 4/);
  assert.match(
    visualizerSource,
    /while \(docksideShipPresentationPromiseCache\.size > MAX_DOCKSIDE_SHIP_PRESENTATIONS\)/
  );
  assert.doesNotMatch(visualizerSource, /state\.shipManifest\.ships\[0\]/);
  assert.doesNotMatch(visualizerSource, /Could not load city flag/);
});

function readJson(relativePath) {
  return JSON.parse(readFileSync(new URL(relativePath, import.meta.url), "utf8"));
}

function functionSource(name, nextName) {
  const start = visualizerSource.indexOf(`function ${name}(`);
  const end = visualizerSource.indexOf(`function ${nextName}(`, start + 1);
  assert.ok(start >= 0, `Missing function ${name}`);
  assert.ok(end > start, `Missing function boundary ${nextName}`);
  return visualizerSource.slice(start, end);
}
