import { readRemoteCrashCursor, writeRemoteCrashCursor } from "./cloudflareKv.mjs";
import { readRememberedCrashReport } from "./crashReadState.mjs";

const report = await readRememberedCrashReport();
const currentCursor = await readRemoteCrashCursor();
if (currentCursor !== report.previousCursor) {
  throw new Error(
    "The shared crash cursor changed after this report was read; read post-cursor crashes again"
  );
}
if (currentCursor !== null && Date.parse(report.readAt) <= Date.parse(currentCursor)) {
  throw new Error("The remembered crash report does not advance the shared cursor");
}
const cursor = await writeRemoteCrashCursor(report.readAt);
process.stdout.write(`All known crashes marked fixed through ${cursor}\n`);
