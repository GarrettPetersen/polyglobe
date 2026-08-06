import assert from "node:assert/strict";
import test from "node:test";

import {
  readRemoteCrashCursor,
  TELEMETRY_STATE_NAMESPACE_TITLE,
  writeRemoteCrashCursor
} from "./cloudflareKv.mjs";

const environment = Object.freeze({
  CLOUDFLARE_ACCOUNT_ID: "account-id",
  CLOUDFLARE_API_TOKEN: "api-token"
});

test("the operator tools read and write the shared crash cursor", async () => {
  const requests = [];
  const fetchImpl = async (url, options = {}) => {
    requests.push({ url, options });
    if (url.includes("?per_page=100")) {
      return Response.json({
        success: true,
        result: [{ id: "namespace-id", title: TELEMETRY_STATE_NAMESPACE_TITLE }]
      });
    }
    if (options.method === "PUT") return Response.json({ success: true });
    return new Response("2026-08-05T12:34:56.000Z");
  };
  assert.equal(
    await readRemoteCrashCursor({ environment, fetchImpl }),
    "2026-08-05T12:34:56.000Z"
  );
  assert.equal(
    await writeRemoteCrashCursor("2026-08-05T13:00:00Z", { environment, fetchImpl }),
    "2026-08-05T13:00:00.000Z"
  );
  assert.equal(requests.filter((request) => request.url.includes("/values/")).length, 2);
  assert.equal(requests.at(-1).options.body, "2026-08-05T13:00:00.000Z");
});

test("the operator tools fail loudly when cursor storage is absent", async () => {
  const fetchImpl = async () => Response.json({ success: true, result: [] });
  await assert.rejects(
    () => readRemoteCrashCursor({ environment, fetchImpl }),
    /Missing Cloudflare KV namespace/
  );
});
