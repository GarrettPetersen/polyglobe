import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = ts.createSourceFile(
  "main.js",
  readFileSync(new URL("./main.js", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest,
  true
);

function runtime(names, context) {
  const code = names.map(name => source.statements.find(node => (
    ts.isFunctionDeclaration(node) && node.name?.text === name
  )).getText(source)).join("\n");
  runInNewContext(code, context);
  return context;
}

function choices() {
  return [
    { identityKey: "first", profile: { character: { id: "captain-a", name: "A" }, homePort: { tileId: 1, lat: 1, lon: 2 } } },
    { identityKey: "second", profile: { character: { id: "captain-b", name: "B" }, homePort: { tileId: 2, lat: 3, lon: 4 } } }
  ];
}

test("captain selection previews either home without mutating the prepared voyage", () => {
  const preparedPlayer = { id: "captain-a" };
  const selection = { selectedIndex: 0, error: "" };
  const context = runtime(["previewCaptainSelection"], {
    startMenu: { captainSelection: selection },
    newVoyageCaptainChoices: choices(),
    gameState: { playerCharacter: preparedPlayer },
    latLonToDirection: (lat, lon) => [lat, lon, 1],
    northUpCamera: position => ({ position }),
    createNorthUpLocalLayout: (tileId, camera) => ({ tileId, camera }),
    buildChart: camera => ({ camera }),
    loadInitialNearbyWorldAssets: () => Promise.resolve(),
    pendingWorldAssetError: null,
    dirty: false,
    Error
  });

  context.previewCaptainSelection(1);

  assert.equal(selection.selectedIndex, 1);
  assert.deepEqual(context.camera.position, [3, 4, 1]);
  assert.equal(context.centerTileId, 2);
  assert.equal(context.gameState.playerCharacter, preparedPlayer);
});

test("only confirming a captain starts or reloads a voyage", () => {
  let starts = 0;
  let replacement = null;
  const context = runtime(["confirmCaptainSelection"], {
    startMenu: { captainSelection: { selectedIndex: 0 } },
    newVoyageCaptainChoices: choices(),
    gameState: { playerCharacter: { id: "captain-a" } },
    clearCaptainSelectionQueryParameters() {},
    startNewVoyage: () => { starts += 1; },
    window: {
      location: {
        href: "https://example.test/game?chooseCaptain=1",
        replace: value => { replacement = String(value); }
      }
    },
    URL
  });

  context.confirmCaptainSelection();
  assert.equal(starts, 1);
  assert.equal(replacement, null);

  context.startMenu.captainSelection.selectedIndex = 1;
  context.confirmCaptainSelection();
  assert.equal(starts, 1);
  const url = new URL(replacement);
  assert.equal(url.searchParams.get("captainSeed"), "second");
  assert.equal(url.searchParams.get("selectedCaptain"), "1");
  assert.equal(url.searchParams.has("chooseCaptain"), false);
});

test("alternate captains use another geographic start area when one is available", () => {
  const generated = [
    { character: { id: "same-area", name: "Same", sourceId: "portrait-b" }, homePort: { cityId: "b" }, startArea: "europe" },
    { character: { id: "other-area", name: "Other", sourceId: "portrait-c" }, homePort: { cityId: "c" }, startArea: "india" }
  ];
  let calls = 0;
  const context = runtime(["generateAlternatePlayerStartingProfile"], {
    randomPlayerCharacterIdentitySeed: () => `seed-${calls}`,
    generatePlayerStartingProfile: () => generated[calls++],
    playerStartAreaForPort: port => port.area,
    Object,
    Set,
    Error
  });
  const result = context.generateAlternatePlayerStartingProfile({
    primaryIdentityKey: "primary-seed",
    primaryProfile: {
      character: { id: "primary", name: "Primary", sourceId: "portrait-a" },
      homePort: { cityId: "a" },
      startArea: "europe"
    },
    ports: [{ area: "europe" }, { area: "india" }],
    portWeights: new Map(),
    manifest: {}
  });
  assert.equal(calls, 2);
  assert.equal(result.profile.startArea, "india");
});

test("captain choice previews the same campaign-specific starter used by the voyage", () => {
  const calls = [];
  const context = runtime(["startingShipSlugForCaptainChoice"], {
    START_SHIP_SLUG_OVERRIDE: "",
    CAMPAIGN_GOAL_WHITE_WHALE: "white-whale",
    CAMPAIGN_GOAL_TREASURE: "treasure",
    playerStarterShipForFaction: (factionId, options) => {
      calls.push({ factionId, options });
      return "preview-ship";
    },
    Error
  });
  const choice = {
    identityKey: "captain-seed",
    profile: {
      startArea: "mediterranean",
      character: { nationalityId: "venice" }
    }
  };

  assert.equal(context.startingShipSlugForCaptainChoice(choice, "treasure"), "preview-ship");
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{
    factionId: "venice",
    options: {
      whaling: false,
      armed: true,
      identityKey: "captain-seed",
      startArea: "mediterranean"
    }
  }]);
  assert.throws(
    () => context.startingShipSlugForCaptainChoice({ identityKey: "broken" }, "treasure"),
    /complete captain choice/
  );
});

test("captain choice ship art is cropped and drawn at native pixel dimensions", () => {
  const draws = [];
  const image = { id: "side-view" };
  const outline = { id: "outline" };
  const context = runtime(["drawNativeCaptainChoiceShip"], {
    shipInfoOpaqueBounds: value => {
      assert.equal(value, image);
      return { x: 65, y: 26, w: 64, h: 58 };
    },
    selectableSpriteOutlineCanvas: (...args) => {
      assert.deepEqual(args.slice(0, 7), [image, 65, 26, 64, 58, false, "#8f563b"]);
      return outline;
    },
    ctx: {
      imageSmoothingEnabled: true,
      drawImage: (...args) => draws.push(args)
    },
    Math,
    Error
  });

  context.drawNativeCaptainChoiceShip(image, { x: 100, y: 40, w: 90, h: 70 });
  assert.deepEqual(draws[0], [outline, 112, 45]);
  assert.deepEqual(draws[1], [image, 65, 26, 64, 58, 113, 46, 64, 58]);
  assert.equal(context.ctx.imageSmoothingEnabled, false);
  assert.throws(
    () => context.drawNativeCaptainChoiceShip(image, { x: 0, y: 0, w: 65, h: 59 }),
    /cannot fit.*without scaling/
  );
});
