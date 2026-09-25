import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./report.mjs", import.meta.url), "utf8");

test("the telemetry report leads with failed web deploys", () => {
  const deploy = source.indexOf('["WEB DEPLOY"');
  const activity = source.indexOf('["ACTIVITY"');
  assert.ok(deploy >= 0 && deploy < activity, "Web deploy failures must be the first report section");
  assert.match(source, /blob1 = 'diagnostic'/);
  assert.match(source, /blob14 = 'WebDeployFailed'/);
});
