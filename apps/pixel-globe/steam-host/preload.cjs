const { contextBridge, ipcRenderer } = require("electron");

const editionArgument = process.argv.find((value) => value.startsWith("--marque-steam-edition="));
const edition = editionArgument?.slice("--marque-steam-edition=".length);
if (edition !== "full" && edition !== "demo") {
  throw new Error(`Steam preload received invalid edition: ${edition || "missing"}`);
}

let steamInputFrame = null;
ipcRenderer.on("steam:input-frame", (_event, frame) => {
  steamInputFrame = frame;
});

contextBridge.exposeInMainWorld("marqueSteamPlatform", Object.freeze({
  platformId: "steam",
  getCapabilities: () => ipcRenderer.invoke("steam:get-capabilities"),
  getCurrentGameLanguage: () => ipcRenderer.invoke("steam:get-current-game-language"),
  readCloudFile: (name) => ipcRenderer.invoke("steam:cloud-read", name),
  writeCloudFile: (name, contents) => ipcRenderer.invoke("steam:cloud-write", name, contents),
  setRichPresence: (presence) => ipcRenderer.invoke("steam:set-rich-presence", presence),
  setTimelineState: (state) => ipcRenderer.invoke("steam:set-timeline-state", state),
  addTimelineEvent: (event) => ipcRenderer.invoke("steam:add-timeline-event", event),
  triggerScreenshot: () => ipcRenderer.invoke("steam:trigger-screenshot"),
  updateStats: (values) => ipcRenderer.invoke("steam:update-stats", values)
}));

if (edition === "full") {
  contextBridge.exposeInMainWorld("marqueAchievementPlatform", Object.freeze({
    platformId: "steam",
    unlockAchievement: (achievementId) => ipcRenderer.invoke("steam:unlock-achievement", achievementId)
  }));
}

contextBridge.exposeInMainWorld("marqueSteamInput", Object.freeze({
  getFrame: () => steamInputFrame,
  getInputType: (gamepadIndex) => gamepadIndex === 0 ? steamInputFrame?.inputType ?? null : null,
  setActionSet: (name) => ipcRenderer.invoke("steam:set-input-action-set", name)
}));
