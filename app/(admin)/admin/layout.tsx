import { WorkspaceShell } from "@/components/layout/WorkspaceShell";
import type { WorkspaceNavItem } from "@/components/layout/WorkspaceNav";

export const dynamic = "force-dynamic";

const navItems: WorkspaceNavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/policies", label: "Policies", icon: "policies" },
  { href: "/admin/claims", label: "Claims", icon: "claims" },
  { href: "/admin/underwriting", label: "Underwriting", icon: "underwriting" },
  { href: "/admin/billing", label: "Billing", icon: "billing" },
  { href: "/admin/reports", label: "Reports", icon: "reports" },
  { href: "/admin/audit-log", label: "Audit Log", icon: "reports" },
  {
    href: "/admin/settings/compliance",
    label: "Compliance",
    icon: "reports",
  },
];

const actions = [
  { href: "/agent/dashboard", label: "Agent View" },
  { href: "/policyholder/dashboard", label: "Policyholder View" },
];

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <WorkspaceShell
      brand="InsureFlow"
      subtitle="Carrier Operations — Admin Workspace"
      navItems={navItems}
      actions={actions}
      userInitials="CA"
      userName="Carrier Admin"
      userRole="Super Admin"
      notifCount={3}
    >
      {children}
    </WorkspaceShell>
  );
}
