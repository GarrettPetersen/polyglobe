const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const test = require("node:test");
const VDF = require("vdf-parser");

const manifestPath = resolve(__dirname, "../steam-input/game_actions.vdf");
const mappingPath = resolve(__dirname, "../steam-input/standard_gamepad.vdf");

function parseVdf(path) {
  return VDF.parse(readFileSync(path, "utf8"), { arrayify: true, types: false });
}

test("bundled Steam Input actions use Valve's required digital-action format", () => {
  const manifest = parseVdf(manifestPath)["Action Manifest"];
  assert.equal(manifest.major_revision, "1");
  assert.equal(manifest.major_revision_affects_xinput, "1");
  for (const controllerType of [
    "controller_xbox360",
    "controller_xboxone",
    "controller_xboxelite",
    "controller_ps4",
    "controller_ps5",
    "controller_switch_pro",
    "controller_neptune",
    "controller_generic"
  ]) {
    assert.equal(manifest.configurations[controllerType]["0"].path, "standard_gamepad.vdf");
  }

  const localization = manifest.localization.english;
  for (const [setName, actionSet] of Object.entries(manifest.actions)) {
    assert.equal(typeof actionSet.title, "string", `${setName} has no title token`);
    assert.ok(localization[actionSet.title], `${setName} title is not localized`);
    for (const [actionName, token] of Object.entries(actionSet.Button)) {
      assert.equal(
        typeof token,
        "string",
        `${setName}.${actionName} must be a direct action-to-localization string`
      );
      assert.ok(localization[token], `${setName}.${actionName} is not localized`);
    }
  }
});

test("official controller mapping matches every manifest action", () => {
  const manifest = parseVdf(manifestPath)["Action Manifest"];
  const mapping = parseVdf(mappingPath).controller_mappings;
  assert.equal(mapping.major_revision, manifest.major_revision);
  assert.equal(mapping.minor_revision, manifest.minor_revision);
  for (const [setName, actionSet] of Object.entries(manifest.actions)) {
    assert.deepEqual(
      Object.keys(mapping.actions[setName].Button).sort(),
      Object.keys(actionSet.Button).sort(),
      `${setName} digital actions differ between manifest and official mapping`
    );
    assert.deepEqual(
      Object.keys(mapping.actions[setName].StickPadGyro).sort(),
      Object.keys(actionSet.StickPadGyro).sort(),
      `${setName} analog actions differ between manifest and official mapping`
    );
  }
});
