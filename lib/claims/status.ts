export const CLAIM_STATUSES = [
  "open",
  "investigating",
  "settled",
  "closed",
] as const;

export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

const TRANSITIONS: Record<ClaimStatus, ClaimStatus[]> = {
  open: ["investigating"],
  investigating: ["settled", "closed"],
  settled: ["closed"],
  closed: [],
};

export function isClaimStatus(value: string): value is ClaimStatus {
  return CLAIM_STATUSES.includes(value as ClaimStatus);
}

export function canTransitionClaimStatus(
  from: ClaimStatus,
  to: ClaimStatus,
): boolean {
  if (from === to) return true;
  return TRANSITIONS[from].includes(to);
}
