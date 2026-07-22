const { createServer } = require("node:http");
const { readFile, stat } = require("node:fs/promises");
const { extname, resolve, sep } = require("node:path");

const CONTENT_TYPES = Object.freeze({
  ".bin": "application/octet-stream",
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ogg": "audio/ogg",
  ".png": "image/png",
  ".woff2": "font/woff2"
});

async function startStaticServer(root) {
  const absoluteRoot = resolve(root);
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://127.0.0.1");
      const relativePath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
      const filePath = resolve(absoluteRoot, `.${relativePath}`);
      if (filePath !== absoluteRoot && !filePath.startsWith(`${absoluteRoot}${sep}`)) {
        throw new Error(`Static request escaped the game root: ${relativePath}`);
      }
      const fileStat = await stat(filePath);
      if (!fileStat.isFile()) throw new Error(`Static request is not a file: ${relativePath}`);
      const bytes = await readFile(filePath);
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Length": bytes.byteLength,
        "Content-Type": CONTENT_TYPES[extname(filePath).toLowerCase()] || "application/octet-stream"
      });
      response.end(bytes);
    } catch (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(error instanceof Error ? error.message : String(error));
    }
  });
  await new Promise((resolveReady, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveReady);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Steam static server has no TCP address");
  return Object.freeze({
    url: `http://127.0.0.1:${address.port}/`,
    close: () => new Promise((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()))
  });
}

module.exports = { startStaticServer };
