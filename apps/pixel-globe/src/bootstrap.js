import { gameStorage, setGameStorageMutationHandler } from "./gameStorage.js";
import {
  createPlatformCloudSync,
  currentPlatformGameLanguage,
  hydratePlatformCloudStorage,
  platformServicesAdapter,
  validatePlatformCapabilities
} from "./platformServices.js";
import { setSteamInterfaceLanguage } from "./loadingScreenLocale.js";

const bridge = platformServicesAdapter(window);
if (bridge) {
  const capabilities = await validatePlatformCapabilities(bridge);
  setSteamInterfaceLanguage(await currentPlatformGameLanguage(bridge));
  if (capabilities.cloud) {
    const hydration = await hydratePlatformCloudStorage(gameStorage, bridge);
    const cloudSync = createPlatformCloudSync(gameStorage, bridge);
    const requestCloudSync = (key) => {
      void cloudSync.request(key).catch((error) => console.error("[steam] cloud sync failed", error));
    };
    setGameStorageMutationHandler(requestCloudSync);
    if (!hydration.loaded) requestCloudSync("marque-and-reprisal.save");
    window.addEventListener("pagehide", () => {
      void cloudSync.flush().catch((error) => console.error("[steam] final cloud sync failed", error));
    });
  }
}

await import("./main.js");
