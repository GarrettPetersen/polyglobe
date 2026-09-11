import assert from "node:assert/strict";
import test from "node:test";
import { createOnDemandAssetStore } from "./onDemandAssetStore.js";

test("concurrent asset requests share one loader and retain the result", async () => {
  let calls = 0;
  let resolveLoad;
  const store = createOnDemandAssetStore({
    label: "ship",
    load: (key) => {
      calls++;
      return new Promise((resolve) => {
        resolveLoad = () => resolve({ key });
      });
    }
  });

  const first = store.request("caravel");
  const second = store.request("caravel");
  assert.equal(first, second);
  assert.equal(store.status("caravel"), "loading");
  assert.equal(store.peek("caravel"), null);
  await Promise.resolve();
  resolveLoad();

  const asset = await first;
  assert.equal(calls, 1);
  assert.deepEqual(asset, { key: "caravel" });
  assert.equal(store.peek("caravel"), asset);
  assert.equal(store.require("caravel"), asset);
  assert.deepEqual(store.residentKeys(), ["caravel"]);
  assert.equal(await store.request("caravel"), asset);
  assert.equal(calls, 1);
});

test("asset failures stay visible and are not silently retried", async () => {
  let calls = 0;
  const store = createOnDemandAssetStore({
    label: "whale",
    load: async () => {
      calls++;
      throw new Error("missing raster");
    }
  });

  await assert.rejects(store.request("blue-whale"), /Could not load whale "blue-whale": missing raster/);
  assert.equal(store.status("blue-whale"), "error");
  assert.throws(() => store.require("blue-whale"), /missing raster/);
  await assert.rejects(store.request("blue-whale"), /missing raster/);
  assert.equal(calls, 1);
});

test("failed assets retry only after an explicit error reset", async () => {
  let calls = 0;
  const store = createOnDemandAssetStore({
    label: "ship",
    load: async () => {
      calls++;
      if (calls === 1) throw new Error("offline");
      return { ready: true };
    }
  });
  await assert.rejects(store.request("galleon"), /offline/);
  assert.equal(store.clearErrors(), 1);
  assert.deepEqual(await store.request("galleon"), { ready: true });
  assert.equal(calls, 2);
});

test("requestAll preserves requested order while deduplicating keys", async () => {
  const calls = [];
  const store = createOnDemandAssetStore({
    label: "animation",
    load: async (key) => {
      calls.push(key);
      return key.toUpperCase();
    }
  });

  assert.deepEqual(
    await store.requestAll(["oars", "cart", "oars"]),
    ["OARS", "CART", "OARS"]
  );
  assert.deepEqual(calls, ["oars", "cart"]);
});

test("stores reject malformed keys and empty loader results", async () => {
  const store = createOnDemandAssetStore({
    label: "sprite",
    load: async () => null
  });
  assert.throws(() => store.request(""), /non-empty string/);
  await assert.rejects(store.request("empty"), /Loader returned no sprite asset/);
});

test("failed entries support explicit retry without discarding resident assets", async () => {
  let offline = true;
  const store = createOnDemandAssetStore({label: "ship", load: async key => {
    if (offline && key === "caravel") throw new Error("offline");
    return {key};
  }});
  const resident = await store.request("galleon");
  await assert.rejects(store.request("caravel"));
  assert.deepEqual(store.failedEntries().map(entry => entry.key), ["caravel"]);
  offline = false;
  const failed = store.failedEntries();
  store.clearErrors();
  await Promise.all(failed.map(({key}) => store.request(key)));
  assert.equal(store.peek("galleon"), resident);
  assert.equal(store.peek("caravel").key, "caravel");
  assert.deepEqual(store.failedEntries(), []);
});
