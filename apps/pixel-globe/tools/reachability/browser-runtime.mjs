import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const DIST_ROOT = fileURLToPath(new URL("../../dist", import.meta.url));
const CONTENT_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".bin", "application/octet-stream"],
  [".mp3", "audio/mpeg"],
  [".ogg", "audio/ogg"],
  [".png", "image/png"],
  [".ttf", "font/ttf"],
  [".woff2", "font/woff2"]
]);
export function loadPlaywright() {
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
  throw new Error("Playwright is unavailable for the save-restore deployment smoke test");
}

export function browserExecutablePath(playwrightModule) {
  const candidates = [
    process.env.PIXEL_GLOBE_CAPTURE_BROWSER,
    playwrightModule.chromium.executablePath(),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  ].filter(Boolean);
  const executable = candidates.find(existsSync);
  if (!executable) throw new Error("No Chromium browser is available for save-restore testing");
  return executable;
}

export async function startStaticServer() {
  if (!existsSync(path.join(DIST_ROOT, "index.html"))) {
    throw new Error("Save-restore smoke requires a completed production build");
  }
  const server = createServer((request, response) => {
    try {
      const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
      const pathname = decodeURIComponent(requestUrl.pathname);
      const relativePath = pathname.endsWith("/")
        ? `${pathname.replace(/^\/+/, "")}index.html`
        : pathname.replace(/^\/+/, "");
      const filePath = path.resolve(DIST_ROOT, relativePath);
      const relation = path.relative(DIST_ROOT, filePath);
      if (relation.startsWith("..") || path.isAbsolute(relation)) {
        response.writeHead(403).end("Forbidden");
        return;
      }
      const file = statSync(filePath);
      if (!file.isFile()) throw new Error("not a file");
      response.writeHead(200, {
        "content-type": CONTENT_TYPES.get(path.extname(filePath)) || "application/octet-stream",
        "content-length": file.size,
        "cache-control": "no-cache"
      });
      createReadStream(filePath).pipe(response);
    } catch {
      response.writeHead(404).end("Not found");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return server;
}
