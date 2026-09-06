export const POLITICAL_NOTICE_LIMIT = 32;

// Event histories own the details. A long catch-up is explicitly summarized,
// rather than retaining an unbounded backlog or silently dropping dispatches.
export class PoliticalNoticeQueue {
  #pending = [];
  #overflowCount = 0;

  enqueue(notice) {
    this.#validate(notice);
    if (notice.kind === "overflow") {
      this.#overflowCount += notice.count;
      return;
    }
    if (this.#pending.length < POLITICAL_NOTICE_LIMIT && this.#overflowCount === 0) {
      this.#pending.push({ kind: "dispatch", text: notice.text, tone: notice.tone });
    } else {
      this.#overflowCount += 1;
    }
  }

  prepend(notice) {
    this.#validate(notice);
    if (notice.kind === "overflow") {
      this.#overflowCount += notice.count;
      return;
    }
    if (this.#pending.length === POLITICAL_NOTICE_LIMIT) {
      this.#pending.pop();
      this.#overflowCount += 1;
    }
    this.#pending.unshift({ kind: "dispatch", text: notice.text, tone: notice.tone });
  }

  take() {
    if (this.#pending.length) return this.#pending.shift();
    if (!this.#overflowCount) return null;
    const count = this.#overflowCount;
    this.#overflowCount = 0;
    return { kind: "overflow", count };
  }

  clear() {
    this.#pending.length = 0;
    this.#overflowCount = 0;
  }

  #validate(notice) {
    if (notice?.kind === "overflow") {
      if (!Number.isSafeInteger(notice.count) || notice.count <= 0) {
        throw new Error("Political dispatch overflow requires a positive count");
      }
      return;
    }
    if (typeof notice?.text !== "string" || !notice.text.trim() || typeof notice.tone !== "string") {
      throw new Error("Political dispatch requires text and tone");
    }
  }
}
