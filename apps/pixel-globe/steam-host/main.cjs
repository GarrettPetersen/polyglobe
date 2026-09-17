const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const { join } = require("node:path");
const steamworks = require("steamworks.js");

const { isDesktopQuitInput } = require("./desktopQuitShortcut.cjs");
const { createProfileStore } = require("./profileStore.cjs");
const { offerFullGameLaunch } = require("./fullGameLaunch.cjs");
const { startStaticServer } = require("./staticServer.cjs");
const { createSteamNativeApi } = require("./steamNativeApi.cjs");
const { initializeSteamInput } = require("./steamInput.cjs");
const { createSteamInputPump } = require("./steamInputPump.cjs");
const { updateHighWaterStats } = require("./steamStats.cjs");
const {
  resolveDesktopConfig,
  steamCapabilitiesForEdition
} = require("./desktopConfig.cjs");

const desktopConfig = resolveDesktopConfig({ isPackaged: app.isPackaged });
const APP_ID = desktopConfig.appId;
const GAME_ROOT = desktopConfig.gameRoot;
const INPUT_MANIFEST = desktopConfig.inputManifest;
const PRESENCE_KEYS = Object.freeze(["steam_display", "status", "place", "ship"]);
let capabilities = steamCapabilitiesForEdition(desktopConfig.edition);

steamworks.electronEnableSteamOverlay();

let client = null;
let nativeApi = null;
let steamInput = null;
let steamInputPump = null;
let staticServer = null;
let profileStore = null;

app.whenReady().then(async () => {
  if (desktopConfig.requireRelaunch && steamworks.restartAppIfNecessary(APP_ID)) {
    app.quit();
    return;
  }
  client = steamworks.init(APP_ID);
  capabilities = steamCapabilitiesForEdition(desktopConfig.edition, {
    cloudEnabled: steamCloudEnabled(client)
  });
  profileStore = createProfileStore({ root: app.getPath("userData"),
    steamId: client.localplayer.getSteamId().steamId64, cloud: client.cloud,
    cloudEnabled: capabilities.cloud });
  nativeApi = createSteamNativeApi();
  steamInput = initializeSteamInput({ input: client.input, nativeApi, manifestPath: INPUT_MANIFEST });
  installIpcHandlers();
  staticServer = await startStaticServer(GAME_ROOT);
  const window = await createGameWindow(staticServer.url);
  // On macOS an unparented pre-window dialog can leave the app invisible and
  // block launch/quit. Offer the switch as a sheet on the actual game window.
  if (await offerFullGameLaunch({ edition: desktopConfig.edition, apps: client.apps,
    language: currentGameLanguage(),
    skip: process.env.MARQUE_STEAM_SKIP_FULL_GAME_OFFER === "1",
    showMessageBox: (options) => dialog.showMessageBox(window, options),
    openExternal: (url) => shell.openExternal(url) })) app.quit();
}).catch((error) => {
  console.error("[steam] desktop host failed to start", error);
  app.exit(1);
});

app.on("window-all-closed", () => app.quit());
app.on("before-quit", () => {
  try {
    client?.input.shutdown();
  } catch (error) {
    console.error("[steam] Steam Input shutdown failed", error);
  }
  steamInputPump?.stop();
  if (staticServer) void staticServer.close().catch((error) => console.error("[steam] server shutdown failed", error));
});

async function createGameWindow(url) {
  const windowTitle = desktopConfig.productName;
  const window = new BrowserWindow({
    fullscreen: true,
    width: 1280,
    height: 720,
    minWidth: 720,
    minHeight: 405,
    backgroundColor: "#101811",
    show: false,
    title: windowTitle,
    webPreferences: {
      additionalArguments: [`--marque-steam-edition=${desktopConfig.edition}`],
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(__dirname, "preload.cjs"),
      sandbox: true
    }
  });
  window.setMenuBarVisibility(false);
  window.webContents.on("before-input-event", (event, input) => {
    if (!isDesktopQuitInput(input)) return;
    event.preventDefault();
    if (!window.isDestroyed()) window.close();
  });
  window.on("page-title-updated", (event) => {
    event.preventDefault();
    window.setTitle(windowTitle);
  });
  window.on("blur", () => sendPauseRequest(window, "focus-lost"));
  window.on("minimize", () => sendPauseRequest(window, "minimized"));
  window.once("ready-to-show", () => window.show());
  await window.loadURL(url);
  steamInputPump = createSteamInputPump({
    snapshot: () => steamInput.snapshot(),
    publish: (frame) => {
      if (!window.isDestroyed()) window.webContents.send("steam:input-frame", frame);
    }
  });
  steamInputPump.start();
  return window;
}

function installIpcHandlers() {
  ipcMain.handle("steam:get-capabilities", () => capabilities);
  ipcMain.handle("steam:get-current-game-language", () => currentGameLanguage());
  ipcMain.handle("steam:unlock-achievement", (_event, id) => unlockAchievement(id));
  ipcMain.handle("steam:update-stats", (_event, values) => updateStats(values));
  ipcMain.handle("steam:cloud-read", (_event, name) => readCloudFile(name));
  ipcMain.handle("steam:cloud-write", (_event, name, contents) => writeCloudFile(name, contents));
  ipcMain.handle("steam:set-rich-presence", (_event, presence) => setRichPresence(presence));
  ipcMain.handle("steam:set-timeline-state", (_event, state) => nativeApi.setTimelineState(state));
  ipcMain.handle("steam:add-timeline-event", (_event, event) => nativeApi.addTimelineEvent(event));
  ipcMain.handle("steam:trigger-screenshot", () => nativeApi.triggerScreenshot());
  ipcMain.handle("steam:set-input-action-set", (_event, name) => {
    const changed = steamInput.setActionSet(name);
    steamInputPump?.requestPoll();
    return changed;
  });
  ipcMain.handle("steam:toggle-fullscreen", (event) => toggleSenderFullscreen(event.sender));
  ipcMain.handle("steam:open-wishlist", () => shell.openExternal("https://store.steampowered.com/app/4516500/Marque__Reprisal/"));
  ipcMain.handle("steam:quit", () => app.quit());
}

function toggleSenderFullscreen(sender) {
  const window = BrowserWindow.fromWebContents(sender);
  if (!window || window.isDestroyed()) {
    throw new Error("Steam fullscreen request has no active game window");
  }
  const active = !window.isFullScreen();
  window.setFullScreen(active);
  return active;
}

function sendPauseRequest(window, reason) {
  if (!window.isDestroyed()) window.webContents.send("steam:pause-request", reason);
}

function currentGameLanguage() {
  return requiredString(client.apps.currentGameLanguage(), "Steam game language");
}

function unlockAchievement(id) {
  if (!capabilities.achievements) {
    throw new Error("Steam achievements are disabled in the demo");
  }
  const achievementId = requiredString(id, "achievement id");
  if (client.achievement.isActivated(achievementId)) return true;
  if (!client.achievement.activate(achievementId)) {
    throw new Error(`Steam rejected achievement ${achievementId}`);
  }
  if (!client.stats.store()) throw new Error(`Steam could not store achievement ${achievementId}`);
  return true;
}

function updateStats(values) {
  if (!capabilities.stats) throw new Error("Steam Stats are disabled in the demo");
  return updateHighWaterStats(client.stats, values);
}

function readCloudFile(name) {
  const fileName = requiredCloudFileName(name);
  return profileStore.read(fileName);
}

function writeCloudFile(name, contents) {
  const fileName = requiredCloudFileName(name);
  if (typeof contents !== "string" || contents.length === 0) {
    throw new Error(`Steam Cloud write is empty: ${fileName}`);
  }
  return profileStore.write(fileName, contents);
}

function setRichPresence(presence) {
  if (!presence || typeof presence !== "object" || Array.isArray(presence)) {
    throw new Error("Steam Rich Presence payload is invalid");
  }
  for (const key of PRESENCE_KEYS) client.localplayer.setRichPresence(key, null);
  for (const [key, value] of Object.entries(presence)) {
    if (!PRESENCE_KEYS.includes(key) || typeof value !== "string") {
      throw new Error(`Steam Rich Presence entry is invalid: ${key}`);
    }
    client.localplayer.setRichPresence(key, value);
  }
  return true;
}

function steamCloudEnabled(steamClient) {
  try {
    return steamClient.cloud.isEnabledForAccount() && steamClient.cloud.isEnabledForApp();
  } catch (error) {
    console.error("[steam] could not determine Steam Cloud availability", error);
    return false;
  }
}

function requiredCloudFileName(value) {
  const name = requiredString(value, "Steam Cloud filename");
  if (!/^[a-z0-9][a-z0-9._-]{0,127}$/i.test(name)) throw new Error(`Invalid Steam Cloud filename: ${name}`);
  return name;
}

function requiredString(value, label) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`Missing ${label}`);
  return value;
}
