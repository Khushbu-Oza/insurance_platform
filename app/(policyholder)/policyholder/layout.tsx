import { WorkspaceShell } from "@/components/layout/WorkspaceShell";
import type { WorkspaceNavItem } from "@/components/layout/WorkspaceNav";

export const dynamic = "force-dynamic";

const navItems: WorkspaceNavItem[] = [
  { href: "/policyholder/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/policyholder/claims/new", label: "File Claim", icon: "file_claim" },
  { href: "/policyholder/payments", label: "Payments", icon: "payments" },
];

export default function PolicyholderLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <WorkspaceShell
      brand="InsureFlow"
      subtitle="Customer Self-Service Portal"
      navItems={navItems}
      actions={[]}
      userInitials="RP"
      userName="R. Patel"
      userRole="Policyholder"
      notifCount={1}
    >
      {children}
    </WorkspaceShell>
  );
}
