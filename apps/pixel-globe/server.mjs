import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(appRoot, "../..");
const publicRoot = join(appRoot, "public");
const sharedDataRoot = join(repoRoot, "examples/globe-demo/public");
const port = Number.parseInt(process.env.PORT || "5177", 10);

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".bin", "application/octet-stream"],
  [".png", "image/png"],
  [".ico", "image/x-icon"]
]);

function resolveStaticPath(urlPath) {
  if (urlPath === "/") return join(appRoot, "index.html");
  if (urlPath.startsWith("/src/")) return join(appRoot, urlPath.slice(1));
  if (urlPath.startsWith("/assets/")) return join(publicRoot, urlPath.slice(1));
  if (urlPath === "/earth-globe-cache-7.json" || urlPath === "/shared/earth-globe-cache-7.json") {
    return join(sharedDataRoot, "earth-globe-cache-7.json");
  }
  if (urlPath === "/shared/discrete-weather-bake-7.bin") {
    return join(sharedDataRoot, "discrete-weather-bake-7.bin");
  }
  if (urlPath === "/shared/globe-runtime-bake-7.bin") {
    return join(sharedDataRoot, "globe-runtime-bake-7.bin");
  }
  return null;
}

function isInside(path, root) {
  const rel = normalize(path).slice(normalize(root).length);
  return rel === "" || (!rel.startsWith("..") && !rel.startsWith("/"));
}

const server = createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const filePath = resolveStaticPath(decodeURIComponent(url.pathname));
  if (!filePath) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const allowed =
    isInside(filePath, appRoot) ||
    isInside(filePath, publicRoot) ||
    isInside(filePath, sharedDataRoot);
  if (!allowed) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const st = statSync(filePath);
    if (!st.isFile()) throw new Error("not a file");
    const type = contentTypes.get(extname(filePath)) || "application/octet-stream";
    res.writeHead(200, {
      "content-type": type,
      "content-length": st.size,
      "cache-control": "no-cache"
    });
    createReadStream(filePath).pipe(res);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Pixel Globe prototype: http://127.0.0.1:${port}/`);
});
