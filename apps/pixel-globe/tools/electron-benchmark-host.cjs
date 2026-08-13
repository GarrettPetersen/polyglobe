const { app, BrowserWindow } = require("electron");

app.commandLine.appendSwitch("disable-background-timer-throttling");
app.commandLine.appendSwitch("disable-backgrounding-occluded-windows");
app.commandLine.appendSwitch("disable-renderer-backgrounding");
app.commandLine.appendSwitch("mute-audio");

let gameWindow = null;

app.whenReady().then(() => {
  gameWindow = new BrowserWindow({
    width: 480,
    height: 270,
    backgroundColor: "#101811",
    show: true,
    webPreferences: {
      backgroundThrottling: false,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  gameWindow.setMenuBarVisibility(false);
  void gameWindow.loadURL("about:blank");
});

app.on("window-all-closed", () => app.quit());
