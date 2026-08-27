const activeJobs = new WeakSet();

export function beginIncrementalUniqueMapping({ source, mapItem, keyForItem }) {
  if (!Array.isArray(source) || typeof mapItem !== "function" || typeof keyForItem !== "function") {
    throw new Error("Incremental unique mapping requires a source and mapping functions");
  }
  const job = {
    source,
    mapItem,
    keyForItem,
    nextIndex: 0,
    mappedByKey: new Map()
  };
  activeJobs.add(job);
  return job;
}

export function advanceIncrementalUniqueMapping(job, maxItems) {
  if (!activeJobs.has(job)) {
    throw new Error("Incremental unique mapping job is missing or already complete");
  }
  if (!Number.isInteger(maxItems) || maxItems <= 0) {
    throw new Error(`Incremental unique mapping requires a positive item limit: ${maxItems}`);
  }
  const stopIndex = Math.min(job.source.length, job.nextIndex + maxItems);
  while (job.nextIndex < stopIndex) {
    const mapped = job.mapItem(job.source[job.nextIndex++]);
    const key = job.keyForItem(mapped);
    if (key === undefined || key === null) {
      throw new Error("Incremental unique mapping produced an item without a key");
    }
    if (!job.mappedByKey.has(key)) job.mappedByKey.set(key, mapped);
  }
  if (job.nextIndex < job.source.length) {
    return Object.freeze({ complete: false, items: null });
  }
  activeJobs.delete(job);
  return Object.freeze({
    complete: true,
    items: Object.freeze([...job.mappedByKey.values()])
  });
}
