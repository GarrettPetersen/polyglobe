import { spawn } from "node:child_process";
import process from "node:process";

export function startBenchmarkServer({ appRoot, port }) {
  if (typeof appRoot !== "string" || appRoot === "") {
    throw new Error("Benchmark server requires an application root");
  }
  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new Error(`Benchmark server received invalid port: ${port}`);
  }
  return spawn(process.execPath, ["server.mjs"], {
    cwd: appRoot,
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"]
  });
}

export async function waitForBenchmarkServer({ baseUrl, server, timeoutMs = 30_000 }) {
  if (typeof baseUrl !== "string" || baseUrl === "") {
    throw new Error("Benchmark server wait requires a base URL");
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error(`Benchmark server received invalid timeout: ${timeoutMs}`);
  }
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    if (server && server.exitCode !== null) {
      throw new Error(`Benchmark server exited with code ${server.exitCode}`);
    }
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(
    `Benchmark server did not start at ${baseUrl}: ${lastError?.message || "timeout"}`
  );
}
