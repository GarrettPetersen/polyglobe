import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

await import("./build.mjs");

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.join(appRoot, "dist");
const port = Number(process.env.PORT || 4177);
if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  throw new Error("Invalid PORT: " + process.env.PORT);
}

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
    let relativePath = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, "");
    if (relativePath === "" || relativePath.endsWith("/")) relativePath += "index.html";
    const targetPath = path.resolve(distRoot, relativePath);
    if (!targetPath.startsWith(distRoot + path.sep)) {
      response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Invalid path");
      return;
    }
    const servedPath = await regularFile(targetPath)
      ? targetPath
      : path.join(distRoot, "404.html");
    response.writeHead(servedPath === targetPath ? 200 : 404, {
      "Content-Type": contentType(servedPath),
      "Cache-Control": "no-store"
    });
    createReadStream(servedPath).pipe(response);
  } catch (error) {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Local server error: " + error.message);
  }
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write("Marque & Reprisal site: http://127.0.0.1:" + port + "/\n");
});

async function regularFile(filePath) {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

function contentType(filePath) {
  const types = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".mp4": "video/mp4",
    ".png": "image/png",
    ".ttf": "font/ttf",
    ".txt": "text/plain; charset=utf-8",
    ".webm": "video/webm",
    ".xml": "application/xml; charset=utf-8",
    ".zip": "application/zip"
  };
  return types[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}
