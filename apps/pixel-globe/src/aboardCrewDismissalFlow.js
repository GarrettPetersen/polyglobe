export function requestAboardCrewDismissal(memberId, pendingMemberId) {
  requireMemberId(memberId);
  if (pendingMemberId !== null) {
    throw new Error(`Aboard crew dismissal is already pending: ${pendingMemberId}`);
  }
  return memberId;
}

export function cancelAboardCrewDismissal(pendingMemberId) {
  requireMemberId(pendingMemberId);
  return null;
}

export function confirmAboardCrewDismissal(memberId, pendingMemberId) {
  requireMemberId(memberId);
  requireMemberId(pendingMemberId);
  if (pendingMemberId !== memberId) {
    throw new Error(`Crew dismissal confirmation changed members: ${pendingMemberId}/${memberId}`);
  }
  return memberId;
}

function requireMemberId(memberId) {
  if (typeof memberId !== "string" || memberId.trim() === "") {
    throw new Error(`Aboard crew dismissal requires a member ID: ${memberId}`);
  }
}
