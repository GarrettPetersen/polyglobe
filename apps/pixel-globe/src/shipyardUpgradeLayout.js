// The card list owns pixel scrolling; card IDs remain the upgrade identities.
export function shipyardUpgradeCardLayout(cards, viewportHeightPx, scrollOffsetPx, revealId = null) {
  if (!Array.isArray(cards) || !Number.isFinite(viewportHeightPx) || viewportHeightPx <= 0 ||
      !Number.isFinite(scrollOffsetPx)) throw new Error("Invalid shipyard card viewport");
  const ids = new Set();
  let contentHeightPx = 0;
  const rows = cards.map(({ id, heightPx }) => {
    if (typeof id !== "string" || !id || ids.has(id) || !Number.isFinite(heightPx) || heightPx <= 0) {
      throw new Error(`Invalid shipyard upgrade card: ${id}`);
    }
    ids.add(id);
    const row = { id, topPx: contentHeightPx, heightPx };
    contentHeightPx += heightPx + 6;
    return row;
  });
  contentHeightPx = Math.max(0, contentHeightPx - 6);
  const maxScrollOffsetPx = Math.max(0, contentHeightPx - viewportHeightPx);
  let offset = Math.min(maxScrollOffsetPx, Math.max(0, scrollOffsetPx));
  if (revealId !== null) {
    const row = rows.find((entry) => entry.id === revealId);
    if (!row) throw new Error(`Unknown shipyard card to reveal: ${revealId}`);
    if (row.topPx < offset || row.heightPx >= viewportHeightPx) offset = row.topPx;
    else if (row.topPx + row.heightPx > offset + viewportHeightPx) offset = row.topPx + row.heightPx - viewportHeightPx;
    offset = Math.min(maxScrollOffsetPx, Math.max(0, offset));
  }
  return { contentHeightPx, maxScrollOffsetPx, scrollOffsetPx: offset,
    rows: rows.map((row) => ({ ...row, yPx: row.topPx - offset,
      visible: row.topPx + row.heightPx > offset && row.topPx < offset + viewportHeightPx })) };
}
