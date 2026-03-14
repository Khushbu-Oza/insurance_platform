export const ROLE_OPTIONS = [
  { value: "super_admin", label: "Super Admin" },
  { value: "carrier_admin", label: "Carrier Admin" },
  { value: "underwriter", label: "Underwriter" },
  { value: "claims_adjuster", label: "Claims Adjuster" },
  { value: "agent", label: "Agent" },
  { value: "policyholder", label: "Policyholder" },
] as const;

export type UserRole = (typeof ROLE_OPTIONS)[number]["value"];

export const ADMIN_ROLES: UserRole[] = [
  "super_admin",
  "carrier_admin",
  "underwriter",
  "claims_adjuster",
];

export function isAdminRole(role: string | undefined | null): role is UserRole {
  return !!role && ADMIN_ROLES.includes(role as UserRole);
}

export function getDefaultRouteForRole(role: string | undefined | null): string {
  if (!role) return "/login";
  if (isAdminRole(role)) return "/admin/dashboard";
  if (role === "agent") return "/agent/dashboard";
  if (role === "policyholder") return "/policyholder/dashboard";
  return "/login";
}
