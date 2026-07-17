import { mkdir, readdir, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const toolsRoot = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(toolsRoot, "..");
const sourceRoot = join(appRoot, "assets-source/sfx");
const outputRoot = join(appRoot, "public/assets/sfx");
const inputExtensions = new Set([".aac", ".flac", ".m4a", ".mp3", ".ogg", ".wav"]);
const loudnessTarget = -18;
const loudnessRangeTarget = 11;
const truePeakTarget = -1.5;
const force = process.argv.includes("--force");

function runFfmpeg(args) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", rejectPromise);
    child.on("close", (code) => {
      if (code === 0) resolvePromise(stderr);
      else rejectPromise(new Error(`ffmpeg exited with code ${code}:\n${stderr}`));
    });
  });
}

function outputBaseName(filename) {
  return basename(filename, extname(filename))
    .replace(/\s+\(\d+\)$/u, "")
    .replace(/\s+/gu, "-");
}

function parseLoudnormMeasurement(stderr, filename) {
  const start = stderr.lastIndexOf("{");
  const end = stderr.indexOf("}", start);
  if (start < 0 || end < 0) throw new Error(`No loudnorm measurement produced for ${filename}`);
  const measured = JSON.parse(stderr.slice(start, end + 1));
  for (const key of ["input_i", "input_tp", "input_lra", "input_thresh", "target_offset"]) {
    if (!Number.isFinite(Number(measured[key]))) {
      throw new Error(`Invalid loudnorm ${key} for ${filename}: ${measured[key]}`);
    }
  }
  return measured;
}

async function measure(inputPath, filename) {
  const stderr = await runFfmpeg([
    "-hide_banner", "-nostats", "-i", inputPath,
    "-af", `loudnorm=I=${loudnessTarget}:LRA=${loudnessRangeTarget}:TP=${truePeakTarget}:print_format=json`,
    "-f", "null", "-"
  ]);
  return parseLoudnormMeasurement(stderr, filename);
}

async function normalize(inputPath, outputPath, measured) {
  const filter = [
    `loudnorm=I=${loudnessTarget}`,
    `LRA=${loudnessRangeTarget}`,
    `TP=${truePeakTarget}`,
    `measured_I=${measured.input_i}`,
    `measured_LRA=${measured.input_lra}`,
    `measured_TP=${measured.input_tp}`,
    `measured_thresh=${measured.input_thresh}`,
    `offset=${measured.target_offset}`,
    "linear=true",
    "print_format=summary"
  ].join(":");
  await runFfmpeg([
    "-hide_banner", "-nostats", "-y", "-i", inputPath,
    "-af", filter,
    "-ar", "48000", "-ac", "2", "-c:a", "vorbis", "-strict", "experimental", "-q:a", "5",
    outputPath
  ]);
}

await mkdir(outputRoot, { recursive: true });
const sourceFiles = (await readdir(sourceRoot, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && inputExtensions.has(extname(entry.name).toLowerCase()))
  .map((entry) => entry.name)
  .sort();
if (sourceFiles.length === 0) throw new Error(`No source SFX found in ${sourceRoot}`);

const outputNames = new Set();
let normalizedCount = 0;
let skippedCount = 0;
for (const filename of sourceFiles) {
  const outputName = `${outputBaseName(filename)}.ogg`;
  if (outputNames.has(outputName)) throw new Error(`Duplicate normalized SFX filename: ${outputName}`);
  outputNames.add(outputName);

  const inputPath = join(sourceRoot, filename);
  const outputPath = join(outputRoot, outputName);
  if (!force && await outputIsCurrent(inputPath, outputPath)) {
    skippedCount += 1;
    console.log(`${filename} -> ${outputName} (current)`);
    continue;
  }
  const measured = await measure(inputPath, filename);
  await normalize(inputPath, outputPath, measured);
  normalizedCount += 1;
  console.log(`${filename} -> ${outputName} (${measured.input_i} LUFS input)`);
}

console.log(
  `Normalized ${normalizedCount} SFX files to ${loudnessTarget} LUFS, ${truePeakTarget} dBTP at 48 kHz; ` +
  `${skippedCount} already current.`
);

async function outputIsCurrent(inputPath, outputPath) {
  try {
    const [inputStat, outputStat] = await Promise.all([stat(inputPath), stat(outputPath)]);
    return outputStat.isFile() && outputStat.size > 0 && outputStat.mtimeMs >= inputStat.mtimeMs;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}
