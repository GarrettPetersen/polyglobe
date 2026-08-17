export function createIncrementalRowJob(rowCount, focusRow = 0) {
  if (!Number.isInteger(rowCount) || rowCount <= 0) {
    throw new Error(`Incremental row job requires a positive row count: ${rowCount}`);
  }
  if (!Number.isFinite(focusRow)) {
    throw new Error(`Incremental row job requires a finite focus row: ${focusRow}`);
  }
  const center = Math.max(0, Math.min(rowCount - 1, Math.round(focusRow)));
  const rows = [center];
  for (let distance = 1; rows.length < rowCount; distance++) {
    const above = center - distance;
    const below = center + distance;
    if (above >= 0) rows.push(above);
    if (below < rowCount) rows.push(below);
  }
  return { rows, nextIndex: 0 };
}

export function advanceIncrementalRowJob(job, {
  budgetMs,
  renderRow,
  now = () => performance.now()
}) {
  if (!job || !Array.isArray(job.rows) || !Number.isInteger(job.nextIndex)) {
    throw new Error("Incremental row work requires a valid job");
  }
  if (!Number.isFinite(budgetMs) || budgetMs <= 0) {
    throw new Error(`Incremental row work requires a positive budget: ${budgetMs}`);
  }
  if (typeof renderRow !== "function" || typeof now !== "function") {
    throw new Error("Incremental row work requires render and clock functions");
  }
  const startedAtMs = now();
  let processedRows = 0;
  while (job.nextIndex < job.rows.length) {
    renderRow(job.rows[job.nextIndex]);
    job.nextIndex++;
    processedRows++;
    if (now() - startedAtMs >= budgetMs) break;
  }
  return {
    processedRows,
    complete: job.nextIndex >= job.rows.length
  };
}
