import { reportStartupFailure } from "./startupFailure.js";

try {
  const { startPlatformGame } = await import("./platformBootstrap.js");
  await startPlatformGame();
} catch (error) {
  reportStartupFailure(error);
  // Keep the original failure observable to developer tools and launch checks.
  throw error;
}
