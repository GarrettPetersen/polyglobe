import { mkdir, readFile, writeFile } from "node:fs/promises";

const STATE_URL = new URL("../.wrangler/crash-report-read-at.json", import.meta.url);

export async function rememberCrashReportRead({ readAt, previousCursor }) {
  const state = {
    readAt: requiredTimestamp(readAt, "crash report read time"),
    previousCursor: previousCursor === null
      ? null
      : requiredTimestamp(previousCursor, "previous crash cursor")
  };
  await mkdir(new URL("../.wrangler/", import.meta.url), { recursive: true });
  await writeFile(STATE_URL, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  return state;
}

export async function readRememberedCrashReport() {
  let text;
  try {
    text = await readFile(STATE_URL, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error("No post-cursor crash report has been read; run crashes:new first");
    }
    throw error;
  }
  let state;
  try {
    state = JSON.parse(text);
  } catch {
    throw new Error("Remembered crash report state is invalid JSON");
  }
  return {
    readAt: requiredTimestamp(state?.readAt, "remembered crash report read time"),
    previousCursor: state?.previousCursor === null
      ? null
      : requiredTimestamp(state?.previousCursor, "remembered previous crash cursor")
  };
}

function requiredTimestamp(value, label) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new Error(`Invalid ${label}`);
  }
  return new Date(value).toISOString();
}
