import {
  readRemotePerformanceCursor,
  writeRemotePerformanceCursor
} from "./cloudflareKv.mjs";
import { readRememberedPerformanceReport } from "./crashReadState.mjs";

const report = await readRememberedPerformanceReport();
const currentCursor = await readRemotePerformanceCursor();
if (currentCursor !== report.previousCursor) {
  throw new Error(
    "The shared performance cursor changed after this report was read; read post-cursor incidents again"
  );
}
if (currentCursor !== null && Date.parse(report.readAt) <= Date.parse(currentCursor)) {
  throw new Error("The remembered performance report does not advance the shared cursor");
}
const cursor = await writeRemotePerformanceCursor(report.readAt);
process.stdout.write(`All known performance incidents marked fixed through ${cursor}\n`);
