import { gameStorage, setGameStorageMutationHandler } from "./gameStorage.js";
import {
  createPlatformCloudSync,
  hydratePlatformCloudStorage,
  platformServicesAdapter,
  validatePlatformCapabilities
} from "./platformServices.js";

const bridge = platformServicesAdapter(window);
if (bridge) {
  await validatePlatformCapabilities(bridge);
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

await import("./main.js");
