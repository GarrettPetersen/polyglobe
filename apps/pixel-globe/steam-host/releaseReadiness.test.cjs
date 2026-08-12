const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");

const appRoot = join(__dirname, "..");

test("every advertised desktop platform has complete minimum requirements", () => {
  const requirements = JSON.parse(readFileSync(
    join(appRoot, "steam/store-page/system-requirements.json"),
    "utf8"
  ));
  assert.equal(requirements.schemaVersion, 1);
  for (const platform of ["windows", "macos", "linux"]) {
    const minimum = requirements.minimum?.[platform];
    assert.ok(minimum, `Missing ${platform} minimum requirements`);
    for (const field of ["os", "processor", "memory", "graphics", "storage", "notes"]) {
      assert.equal(typeof minimum[field], "string", `${platform}.${field} is not text`);
      assert.ok(minimum[field].trim(), `${platform}.${field} is empty`);
    }
  }
  assert.match(requirements.minimum.linux.os, /SteamOS/);
  assert.match(requirements.minimum.macos.processor, /Rosetta 2/);
});

test("Steam launch options match the packaged desktop names", () => {
  const applications = JSON.parse(readFileSync(
    join(appRoot, "steam/application-settings.json"),
    "utf8"
  ));
  assert.equal(applications.schemaVersion, 1);
  for (const [edition, expected] of Object.entries({
    full: { appId: 4516500, productName: "Marque & Reprisal" },
    demo: { appId: 5029880, productName: "Marque & Reprisal Demo" }
  })) {
    const configured = applications.editions?.[edition];
    assert.equal(configured?.appId, expected.appId);
    assert.equal(configured?.productName, expected.productName);
    assert.deepEqual(configured?.launchOptions, {
      windows: {
        executable: `${expected.productName}.exe`,
        architecture: "x64"
      },
      macos: {
        executable: `${expected.productName}.app`,
        architecture: "x64",
        requiresNotarization: true
      },
      linux: {
        executable: expected.productName,
        architecture: "x64"
      }
    });
  }
});

test("Steam renderer bridge includes controller-safe fullscreen and quit operations", () => {
  const preload = readFileSync(join(__dirname, "preload.cjs"), "utf8");
  const host = readFileSync(join(__dirname, "main.cjs"), "utf8");
  assert.match(preload, /toggleFullscreen:\s*\(\)\s*=>\s*ipcRenderer\.invoke\("steam:toggle-fullscreen"\)/);
  assert.match(preload, /quitGame:\s*\(\)\s*=>\s*ipcRenderer\.invoke\("steam:quit"\)/);
  assert.match(host, /ipcMain\.handle\("steam:toggle-fullscreen"/);
  assert.match(host, /ipcMain\.handle\("steam:quit"/);
});
