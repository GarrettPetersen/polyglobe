import { readdir } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";
import { spawn, spawnSync } from "node:child_process";

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
const TERMINATION_GRACE_MS = 2_000;
const TEST_FILE_PATTERN = /\.test\.(?:cjs|js|mjs)$/;
const SIGNAL_EXIT_CODES = Object.freeze({
  ...(process.platform === "win32" ? {} : { SIGHUP: 129, SIGQUIT: 131 }),
  SIGINT: 130,
  SIGTERM: 143
});

const { discoverDirectories, nodeTestArgs } = parseArguments(process.argv.slice(2));
const discoveredTestFiles = await discoverTestFiles(discoverDirectories);
const testFiles = [...nodeTestArgs, ...discoveredTestFiles];
const hasExplicitTestFile = nodeTestArgs.some((arg) => TEST_FILE_PATTERN.test(arg));
if (!hasExplicitTestFile && discoveredTestFiles.length === 0) {
  throw new Error("The supervised test runner requires test files or a --discover directory");
}

const timeoutMs = configuredTimeoutMs();
const exitCode = await runSupervisedTests(testFiles, timeoutMs);
process.exitCode = exitCode;

async function runSupervisedTests(args, timeoutMs) {
  // A dedicated process group lets one timeout clean up Node's per-file test workers too.
  const child = spawn(process.execPath, ["--test", "--test-force-exit", ...args], {
    cwd: process.cwd(),
    detached: process.platform !== "win32",
    stdio: "inherit"
  });

  let completed = false;
  let requestedExitCode = null;
  let forceKillTimer = null;
  const timeout = setTimeout(() => {
    requestedExitCode = 124;
    console.error(
      `\nTest process exceeded ${formatDuration(timeoutMs)}; terminating its process group.`
    );
    terminateProcessTree(child, "SIGTERM");
    forceKillTimer = setTimeout(() => {
      console.error("Test process ignored SIGTERM; forcing it to exit.");
      terminateProcessTree(child, "SIGKILL");
    }, TERMINATION_GRACE_MS);
    forceKillTimer.unref();
  }, timeoutMs);
  timeout.unref();

  const signalHandlers = new Map(
    Object.keys(SIGNAL_EXIT_CODES).map((signal) => [
      signal,
      () => {
        if (completed) return;
        requestedExitCode = SIGNAL_EXIT_CODES[signal];
        terminateProcessTree(child, signal);
      }
    ])
  );
  for (const [signal, handler] of signalHandlers) process.once(signal, handler);

  return new Promise((resolve, reject) => {
    child.once("error", (error) => {
      cleanup();
      reject(error);
    });
    child.once("exit", (code, signal) => {
      if (requestedExitCode !== null) terminateProcessTree(child, "SIGKILL");
      cleanup();
      if (requestedExitCode !== null) {
        resolve(requestedExitCode);
        return;
      }
      if (Number.isInteger(code)) {
        resolve(code);
        return;
      }
      reject(new Error(`Test process exited from unexpected signal ${signal || "unknown"}`));
    });
  });

  function cleanup() {
    completed = true;
    clearTimeout(timeout);
    if (forceKillTimer) clearTimeout(forceKillTimer);
    for (const [signal, handler] of signalHandlers) process.off(signal, handler);
  }
}

function terminateProcessTree(child, signal) {
  if (!Number.isInteger(child.pid)) return;
  if (process.platform === "win32") {
    const args = ["/pid", String(child.pid), "/t"];
    if (signal === "SIGKILL") args.push("/f");
    spawnSync("taskkill", args, { stdio: "ignore" });
    return;
  }
  try {
    process.kill(-child.pid, signal);
  } catch (error) {
    if (error?.code !== "ESRCH") throw error;
  }
}

function parseArguments(args) {
  const discoverDirectories = [];
  const nodeTestArgs = [];
  for (const arg of args) {
    if (!arg.startsWith("--discover=")) {
      nodeTestArgs.push(arg);
      continue;
    }
    const directory = arg.slice("--discover=".length);
    if (directory === "") throw new Error("--discover requires a directory");
    discoverDirectories.push(directory);
  }
  return { discoverDirectories, nodeTestArgs };
}

async function discoverTestFiles(directories) {
  const discovered = [];
  for (const directory of directories) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !TEST_FILE_PATTERN.test(entry.name)) continue;
      discovered.push(join(directory, entry.name));
    }
  }
  return discovered.sort();
}

function configuredTimeoutMs() {
  const source = process.env.PIXEL_GLOBE_TEST_TIMEOUT_MS;
  if (source === undefined || source === "") return DEFAULT_TIMEOUT_MS;
  const timeoutMs = Number(source);
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error(`PIXEL_GLOBE_TEST_TIMEOUT_MS must be a positive integer: ${source}`);
  }
  return timeoutMs;
}

function formatDuration(milliseconds) {
  if (milliseconds % 60_000 === 0) return `${milliseconds / 60_000} minutes`;
  if (milliseconds % 1_000 === 0) return `${milliseconds / 1_000} seconds`;
  return `${milliseconds} ms`;
}
