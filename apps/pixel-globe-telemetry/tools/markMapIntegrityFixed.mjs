import {
  readRemoteMapIntegrityCursor,
  writeRemoteMapIntegrityCursor
} from "./cloudflareKv.mjs";
import { readRememberedMapIntegrityReport } from "./crashReadState.mjs";

const report = await readRememberedMapIntegrityReport();
const currentCursor = await readRemoteMapIntegrityCursor();
if (currentCursor !== report.previousCursor) {
  throw new Error(
    "The shared map integrity cursor changed after this report was read; read incidents again"
  );
}
if (currentCursor !== null && Date.parse(report.readAt) <= Date.parse(currentCursor)) {
  throw new Error("The remembered map integrity report does not advance the shared cursor");
}
const cursor = await writeRemoteMapIntegrityCursor(report.readAt);
process.stdout.write(`All known map integrity incidents marked fixed through ${cursor}\n`);
