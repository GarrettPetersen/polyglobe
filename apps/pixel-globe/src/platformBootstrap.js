import { prepareDesktopVoyageStorage, DEMO_VOYAGE_STORAGE_KEY } from "./desktopVoyageStorage.js";
import { BUILD_EDITION_ID } from "./buildEdition.js";
import { buildDocumentTitle } from "./buildTitle.js";
import { profileStorage, setVoyageStorageKey, setGameStorageMutationHandler } from "./gameStorage.js";
import {
  createPlatformCloudSync,
  setPlatformCloudSync,
  currentPlatformGameLanguage,
  hydratePlatformCloudStorage,
  platformServicesAdapter,
  validatePlatformCapabilities
} from "./platformServices.js";
import { setSteamInterfaceLanguage } from "./loadingScreenLocale.js";

export async function startPlatformGame() {
  const bridge = platformServicesAdapter(window);
  document.title = buildDocumentTitle({
    edition: BUILD_EDITION_ID,
    platformId: bridge?.platformId || "browser"
  });
  if (bridge) {
    await validatePlatformCapabilities(bridge);
    setSteamInterfaceLanguage(await currentPlatformGameLanguage(bridge));
    // The host always commits a durable local profile and additionally syncs
    // it to Steam when Cloud is enabled. Its loopback origin is not persistent.
    const hydration = await hydratePlatformCloudStorage(profileStorage, bridge);
    const cloudSync = createPlatformCloudSync(profileStorage, bridge);
    setPlatformCloudSync(cloudSync);
    const requestCloudSync = (key) => {
      void cloudSync.request(key).catch((error) => console.error("[steam] cloud sync failed", error));
    };
    setGameStorageMutationHandler(requestCloudSync);
    if (!hydration.loaded) requestCloudSync("marque-and-reprisal.save");
    window.addEventListener("pagehide", () => {
      void cloudSync.flush().catch((error) => console.error("[steam] final cloud sync failed", error));
    });
    const initializedVoyageSlot = prepareDesktopVoyageStorage(profileStorage, BUILD_EDITION_ID);
    if (BUILD_EDITION_ID === "demo") setVoyageStorageKey(DEMO_VOYAGE_STORAGE_KEY);
    if (initializedVoyageSlot) await cloudSync.request("marque-and-reprisal.demo-save");
  }

  await import("./main.js");
}
