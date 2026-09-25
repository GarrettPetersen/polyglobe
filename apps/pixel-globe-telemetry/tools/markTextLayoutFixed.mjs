import {
  readRemoteTextLayoutCursor,
  writeRemoteTextLayoutCursor
} from "./cloudflareKv.mjs";
import { readRememberedTextLayoutReport } from "./crashReadState.mjs";

const report = await readRememberedTextLayoutReport();
const currentCursor = await readRemoteTextLayoutCursor();
if (currentCursor !== report.previousCursor) {
  throw new Error(
    "The shared text layout cursor changed after this report was read; read incidents again"
  );
}
if (currentCursor !== null && Date.parse(report.readAt) <= Date.parse(currentCursor)) {
  throw new Error("The remembered text layout report does not advance the shared cursor");
}
const cursor = await writeRemoteTextLayoutCursor(report.readAt);
process.stdout.write(`All known text overflow incidents marked fixed through ${cursor}\n`);
