function validateAssetKey(key) {
  if (typeof key !== "string" || key.length === 0) {
    throw new Error(`On-demand asset key must be a non-empty string: ${key}`);
  }
  return key;
}

function wrapAssetError(label, key, error) {
  const cause = error instanceof Error ? error : new Error(String(error));
  return new Error(`Could not load ${label} "${key}": ${cause.message}`, { cause });
}

export function createOnDemandAssetStore({ label, load }) {
  if (typeof label !== "string" || label.length === 0) {
    throw new Error("On-demand asset store requires a label");
  }
  if (typeof load !== "function") {
    throw new Error(`On-demand ${label} asset store requires a loader`);
  }

  const records = new Map();

  function request(rawKey) {
    const key = validateAssetKey(rawKey);
    const existing = records.get(key);
    if (existing?.status === "ready") return Promise.resolve(existing.value);
    if (existing?.status === "loading") return existing.promise;
    if (existing?.status === "error") return Promise.reject(existing.error);

    const promise = Promise.resolve()
      .then(() => load(key))
      .then((value) => {
        if (value === null || value === undefined) {
          throw new Error(`Loader returned no ${label} asset`);
        }
        records.set(key, Object.freeze({ status: "ready", value }));
        return value;
      })
      .catch((error) => {
        const wrapped = wrapAssetError(label, key, error);
        records.set(key, Object.freeze({ status: "error", error: wrapped }));
        throw wrapped;
      });
    records.set(key, Object.freeze({ status: "loading", promise }));
    return promise;
  }

  function peek(rawKey) {
    const key = validateAssetKey(rawKey);
    const record = records.get(key);
    return record?.status === "ready" ? record.value : null;
  }

  function status(rawKey) {
    const key = validateAssetKey(rawKey);
    return records.get(key)?.status || "unloaded";
  }

  function requireAsset(rawKey) {
    const key = validateAssetKey(rawKey);
    const record = records.get(key);
    if (record?.status === "ready") return record.value;
    if (record?.status === "error") throw record.error;
    throw new Error(`${label} asset "${key}" is ${record?.status || "unloaded"}`);
  }

  async function requestAll(keys) {
    if (!Array.isArray(keys)) throw new Error(`${label} asset requestAll requires an array`);
    return Promise.all(keys.map(request));
  }

  function residentKeys() {
    return [...records.entries()]
      .filter(([, record]) => record.status === "ready")
      .map(([key]) => key);
  }

  return Object.freeze({
    request,
    requestAll,
    peek,
    require: requireAsset,
    status,
    residentKeys
  });
}
