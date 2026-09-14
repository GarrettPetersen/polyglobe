const { fullGameLaunchText } = require("./fullGameLaunchText.cjs");
const { FULL_GAME_APP_ID } = require("./desktopConfig.cjs");

async function offerFullGameLaunch({ edition, apps, showMessageBox, openExternal, language = "english" }) {
  if (edition !== "full" && edition !== "demo") throw new Error(`Invalid launch edition: ${edition}`);
  if (edition === "full" || !apps.isSubscribedApp(FULL_GAME_APP_ID)) return false;
  const text = fullGameLaunchText(language);
  const installed = apps.isAppInstalled(FULL_GAME_APP_ID);
  const { response } = await showMessageBox({
    type: "question",
    title: "Marque & Reprisal",
    message: text.message,
    detail: text.detail,
    buttons: [installed ? text.play : text.install, text.demo],
    defaultId: 0,
    cancelId: 1,
    noLink: true
  });
  if (response !== 0) return false;
  try {
    await openExternal(`steam://${installed ? "run" : "install"}/${FULL_GAME_APP_ID}`);
  } catch (error) {
    await showMessageBox({ type: "error", title: "Marque & Reprisal",
      message: text.error, detail: String(error) });
    return false;
  }
  return installed;
}

module.exports = { offerFullGameLaunch };
