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
      BrowserWindow: class {
        constructor(value) {
          options = value;
          this.webContents = { on() {} };
        }
        setMenuBarVisibility() {}
        on() {}
        once() {}
        async loadURL() {}
      },
      join: (...parts) => parts.join("/"),
      __dirname: "/host",
      createSteamInputPump: () => ({ start() {} }),
      steamInputPump: null,
      isDesktopQuitInput: () => false
    });
    assert.equal(options.fullscreen, true);
    assert.equal(options.webPreferences.contextIsolation, true);
  }
});

test("Alt+F4 closes the fullscreen Steam window before the renderer can swallow it", async () => {
  const source = readFileSync(require.resolve("./main.cjs"), "utf8");
  const fn = source.slice(source.indexOf("async function createGameWindow("), source.indexOf("function installIpcHandlers("));
  const { isDesktopQuitInput } = require("./desktopQuitShortcut.cjs");
  const closes = [];
  const prevented = [];
  let beforeInput;
  const window = {
    setMenuBarVisibility() {},
    on() {},
    once() {},
    async loadURL() {},
    isDestroyed: () => false,
    close() { closes.push("close"); },
    webContents: {
      on(name, handler) {
        if (name === "before-input-event") beforeInput = handler;
      }
    }
  };
  await runInNewContext(`${fn}; createGameWindow("http://localhost/");`, {
    desktopConfig: { edition: "demo", productName: "Marque & Reprisal Demo" },
    BrowserWindow: class { constructor() { return window; } },
    join: (...parts) => parts.join("/"),
    __dirname: "/host",
    createSteamInputPump: () => ({ start() {} }),
    steamInputPump: null,
    isDesktopQuitInput
  });
  assert.equal(typeof beforeInput, "function");
  beforeInput({ preventDefault() { prevented.push("prevent"); } }, {
    type: "keyDown",
    code: "F4",
    alt: true,
    control: false,
    meta: false
  });
  beforeInput({ preventDefault() { prevented.push("ignored"); } }, {
    type: "keyDown",
    code: "Escape"
  });
  assert.deepEqual(prevented, ["prevent"]);
  assert.deepEqual(closes, ["close"]);
});

test("the owner switch is parented to an existing game window rather than blocking window creation", async () => {
  const source = readFileSync(require.resolve("./main.cjs"), "utf8");
  const startup = source.slice(source.indexOf("app.whenReady().then("), source.indexOf('app.on("window-all-closed"'));
  const events = [];
  const window = {};
  const client = { apps: {}, localplayer: { getSteamId: () => ({ steamId64: "test-account" }) }, cloud: {}, input: {} };
  await runInNewContext(startup, {
    app: { whenReady: async () => {}, getPath: () => "/test-profile", quit: () => events.push("quit"), exit: () => assert.fail("startup failed") },
    desktopConfig: { edition: "demo", requireRelaunch: false }, APP_ID: 5029880,
    steamworks: { init: () => client }, client: null, capabilities: null,
    steamCloudEnabled: () => false, steamCapabilitiesForEdition: () => ({}),
    profileStore: null, createProfileStore: () => ({}),
    nativeApi: null, createSteamNativeApi: () => ({}),
    steamInput: null, initializeSteamInput: () => ({}), INPUT_MANIFEST: "/manifest",
    installIpcHandlers() {}, staticServer: null, GAME_ROOT: "/demo",
    startStaticServer: async () => ({ url: "http://localhost/" }),
    createGameWindow: async () => { events.push("window"); return window; },
    currentGameLanguage: () => "english",
    offerFullGameLaunch: async ({ showMessageBox }) => { await showMessageBox({ type: "question" }); return false; },
    dialog: { showMessageBox: async parent => { assert.equal(parent, window); events.push("prompt"); return { response: 1 }; } },
    shell: {}, console
  });
  assert.deepEqual(events, ["window", "prompt"]);
});
