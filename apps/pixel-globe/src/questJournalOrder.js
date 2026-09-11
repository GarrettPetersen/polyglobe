export function orderQuestJournalEntries(entries, { campaignComplete = false, sovereignWarLoanId = null } = {}) {
  if (!Array.isArray(entries)) throw new Error("Quest journal ordering requires an array");
  if (typeof campaignComplete !== "boolean") {
    throw new Error("Quest journal campaign completion must be boolean");
  }
  const campaignEntries = entries.filter((entry) => entry?.id === "campaign");
  if (campaignEntries.length > 1) throw new Error("Quest journal contains duplicate campaign entries");
  const debtEntries = entries.filter(entry => sovereignWarLoanId !== null && entry?.id === sovereignWarLoanId);
  if (debtEntries.length > 1) throw new Error("Quest journal contains duplicate sovereign debt entries");
  const otherEntries = [...entries.filter(entry => entry?.id !== "campaign" &&
    (sovereignWarLoanId === null || entry?.id !== sovereignWarLoanId)), ...debtEntries];
  if (campaignEntries.length === 0) return Object.freeze([...otherEntries]);
  return Object.freeze(campaignComplete
    ? [...otherEntries, campaignEntries[0]]
    : [campaignEntries[0], ...otherEntries]);
}
