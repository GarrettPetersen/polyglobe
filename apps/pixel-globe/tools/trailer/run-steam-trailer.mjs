import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const builder = path.join(toolDir, "build-steam-trailer.py");
const bundledPython = path.join(
  homedir(),
  ".cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3.12"
);
const candidates = [
  process.env.PIXEL_GLOBE_PYTHON ? [process.env.PIXEL_GLOBE_PYTHON] : null,
  existsSync(bundledPython) ? [bundledPython] : null,
  process.platform === "darwin" ? ["arch", "-arm64", "python3"] : null,
  ["python3"]
].filter(Boolean);

const python = candidates.find((command) => {
  const probe = spawnSync(command[0], [...command.slice(1), "-c", "from PIL import Image"], {
    stdio: "ignore"
  });
  return probe.status === 0;
});

if (!python) {
  throw new Error(
    "Steam trailer build requires Python 3 with Pillow. " +
    "Install Pillow or set PIXEL_GLOBE_PYTHON to a compatible interpreter."
  );
}

const result = spawnSync(python[0], [...python.slice(1), builder], { stdio: "inherit" });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
