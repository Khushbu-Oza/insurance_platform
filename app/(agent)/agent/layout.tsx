import { WorkspaceShell } from "@/components/layout/WorkspaceShell";
import type { WorkspaceNavItem } from "@/components/layout/WorkspaceNav";

export const dynamic = "force-dynamic";

const navItems: WorkspaceNavItem[] = [
  { href: "/agent/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/agent/clients", label: "Clients", icon: "clients" },
  { href: "/agent/new-submission", label: "New Submission", icon: "new_submission" },
];

export default function AgentLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <WorkspaceShell
      brand="InsureFlow"
      subtitle="Agent Portal — Producer Workspace"
      navItems={navItems}
      actions={[{ href: "/admin/dashboard", label: "Admin View" }]}
      userInitials="JA"
      userName="James Archer"
      userRole="Licensed Agent"
      notifCount={2}
    >
      {children}
    </WorkspaceShell>
  );
}
