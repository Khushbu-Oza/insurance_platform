export const POLICY_STATUSES = [
  "quote",
  "bound",
  "active",
  "expired",
  "cancelled",
] as const;

export type PolicyStatus = (typeof POLICY_STATUSES)[number];

const TRANSITIONS: Record<PolicyStatus, PolicyStatus[]> = {
  quote: ["bound", "cancelled"],
  bound: ["active", "cancelled"],
  active: ["expired", "cancelled"],
  expired: [],
  cancelled: [],
};

export function isPolicyStatus(value: string): value is PolicyStatus {
  return POLICY_STATUSES.includes(value as PolicyStatus);
}

export function canTransitionPolicyStatus(
  from: PolicyStatus,
  to: PolicyStatus,
): boolean {
  if (from === to) return true;
  return TRANSITIONS[from].includes(to);
}
