export function createExactByteMaskCache({ maximumEntries = 128 } = {}) {
  if (!Number.isInteger(maximumEntries) || maximumEntries <= 0) {
    throw new Error(`Exact byte-mask cache requires a positive entry limit: ${maximumEntries}`);
  }
  const buckets = new Map();
  const insertionOrder = [];
  let size = 0;

  return Object.freeze({
    get(prefix, mask) {
      const normalizedPrefix = requiredPrefix(prefix);
      const bytes = requiredMask(mask);
      const bucket = buckets.get(bucketKey(normalizedPrefix, bytes));
      if (!bucket) return undefined;
      return bucket.find((entry) => byteMasksEqual(entry.mask, bytes))?.value;
    },
    set(prefix, mask, value) {
      const normalizedPrefix = requiredPrefix(prefix);
      const bytes = requiredMask(mask);
      if (value === undefined) throw new Error("Exact byte-mask cache cannot store undefined");
      const key = bucketKey(normalizedPrefix, bytes);
      const bucket = buckets.get(key) || [];
      const existing = bucket.find((entry) => byteMasksEqual(entry.mask, bytes));
      if (existing) {
        existing.value = value;
        return value;
      }
      const entry = { key, mask: bytes.slice(), value };
      bucket.push(entry);
      buckets.set(key, bucket);
      insertionOrder.push(entry);
      size += 1;
      while (size > maximumEntries) evictOldestEntry(buckets, insertionOrder.shift());
      return value;
    },
    get size() {
      return size;
    }
  });

  function evictOldestEntry(cacheBuckets, entry) {
    if (!entry) throw new Error("Exact byte-mask cache lost its oldest entry");
    const bucket = cacheBuckets.get(entry.key);
    if (!bucket) throw new Error("Exact byte-mask cache lost an eviction bucket");
    const index = bucket.indexOf(entry);
    if (index < 0) throw new Error("Exact byte-mask cache lost an eviction entry");
    bucket.splice(index, 1);
    if (bucket.length === 0) cacheBuckets.delete(entry.key);
    size -= 1;
  }
}

function bucketKey(prefix, mask) {
  let first = 2166136261;
  let second = 0x9e3779b9;
  for (let index = 0; index < mask.length; index++) {
    const byte = mask[index];
    first = Math.imul(first ^ byte, 16777619);
    second = Math.imul(second ^ (byte + index), 2246822519);
  }
  return `${prefix}:${mask.length}:${first >>> 0}:${second >>> 0}`;
}

function byteMasksEqual(left, right) {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index++) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

function requiredPrefix(value) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("Exact byte-mask cache requires a non-empty prefix");
  }
  return value;
}

function requiredMask(value) {
  if (!(value instanceof Uint8Array) || value.length === 0) {
    throw new Error("Exact byte-mask cache requires a non-empty Uint8Array");
  }
  return value;
}
