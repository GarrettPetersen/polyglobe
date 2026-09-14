const assert = require("node:assert/strict");
const test = require("node:test");
const { readFileSync } = require("node:fs");
const { runInNewContext } = require("node:vm");
const { offerFullGameLaunch } = require("./fullGameLaunch.cjs");

for (const edition of ["demo", "full"]) for (const owns of [true, false]) for (const installed of [true, false]) for (const response of [0, 1]) {
  test(`full-game launch: ${edition}, owns=${owns}, installed=${installed}, choice=${response}`, async () => {
    const prompts = [], launches = [];
    const result = await offerFullGameLaunch({ edition,
      apps: { isSubscribedApp: id => { assert.equal(id,4516500); return owns; }, isAppInstalled: () => installed },
      showMessageBox: async options => { prompts.push(options); return { response }; },
      openExternal: async url => launches.push(url)
    });
    const offered = edition === "demo" && owns;
    assert.equal(prompts.length, Number(offered));
    assert.deepEqual(launches, offered && response === 0 ? [`steam://${installed ? "run" : "install"}/4516500`] : []);
    assert.equal(result, offered && installed && response === 0);
    if (offered) assert.equal(prompts[0].cancelId, 1);
  });
}

test("Steam launch failure leaves the demo available and explains the failure", async () => {
  const prompts = [];
  const result = await offerFullGameLaunch({ edition: "demo",
    apps: { isSubscribedApp: () => true, isAppInstalled: () => true },
    showMessageBox: async options => { prompts.push(options); return { response: 0 }; },
    openExternal: async () => { throw new Error("Steam launch failed"); }
  });
  assert.equal(result, false);
  assert.equal(prompts[1].type, "error");
  assert.match(prompts[1].detail, /Steam launch failed/);
});

test("the production window starts fullscreen in either edition", async () => {
  const source = readFileSync(require.resolve("./main.cjs"), "utf8");
  const fn = source.slice(source.indexOf("async function createGameWindow("), source.indexOf("function installIpcHandlers("));
  for (const edition of ["demo", "full"]) {
    let options;
    await runInNewContext(`${fn}; createGameWindow("http://localhost/");`, {
      desktopConfig: { edition, productName: "Marque & Reprisal" },
      BrowserWindow: class { constructor(value) { options = value; } setMenuBarVisibility() {} on() {} once() {} async loadURL() {} },
      join: (...parts) => parts.join("/"), __dirname: "/host", createSteamInputPump: () => ({ start() {} }), steamInputPump: null
    });
    assert.equal(options.fullscreen, true);
    assert.equal(options.webPreferences.contextIsolation, true);
  }
});
