import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);

export async function assertCaptureServerReady(baseUrl) {
  let response;
  try {
    response = await fetch(baseUrl);
  } catch (error) {
    throw new Error(`Pixel globe server is not reachable at ${baseUrl}: ${error.message}`);
  }
  if (!response.ok) {
    throw new Error(`Pixel globe server returned HTTP ${response.status} at ${baseUrl}`);
  }
}

export async function launchCaptureBrowser({ headless = true } = {}) {
  const playwright = loadPlaywright();
  return playwright.chromium.launch({
    headless,
    executablePath: browserExecutablePath(playwright),
    args: ["--autoplay-policy=no-user-gesture-required"]
  });
}

export function collectCapturePageErrors(page, errors) {
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().startsWith("Failed to load resource:")) {
      errors.push(message.text());
    }
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    const responsePath = new URL(response.url()).pathname;
    if (response.status() >= 400 && !responsePath.endsWith(".chunks.json")) {
      errors.push(`HTTP ${response.status()} ${response.url()}`);
    }
  });
}

function loadPlaywright() {
  const candidates = [
    "playwright",
    process.env.PLAYWRIGHT_MODULE_PATH,
    path.join(
      homedir(),
      ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"
    )
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch (error) {
      if (error?.code !== "MODULE_NOT_FOUND") throw error;
    }
  }
  throw new Error(
    "Playwright is unavailable. Install it locally or set PLAYWRIGHT_MODULE_PATH to its package directory."
  );
}

function browserExecutablePath(playwright) {
  const candidates = [
    process.env.PIXEL_GLOBE_CAPTURE_BROWSER,
    playwright.chromium.executablePath(),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  ].filter(Boolean);
  const executable = candidates.find(existsSync);
  if (!executable) throw new Error("No Chromium browser is available for capture");
  return executable;
}
