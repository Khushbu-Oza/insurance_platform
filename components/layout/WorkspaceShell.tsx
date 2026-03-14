import Link from "next/link";
import { Building2 } from "lucide-react";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { NotificationBell } from "@/components/NotificationBell";
import { WorkspaceNav, type WorkspaceNavItem } from "@/components/layout/WorkspaceNav";

type WorkspaceAction = {
  href: string;
  label: string;
};

type WorkspaceShellProps = {
  brand: string;
  subtitle: string;
  navItems: WorkspaceNavItem[];
  actions?: WorkspaceAction[];
  userInitials?: string;
  userName?: string;
  userRole?: string;
  notifCount?: number;
  children: React.ReactNode;
};

export function WorkspaceShell({
  brand,
  subtitle,
  navItems,
  actions = [],
  userInitials = "AU",
  userName = "Admin User",
  userRole = "Carrier Admin",
  notifCount = 3,
  children,
}: WorkspaceShellProps) {
  return (
    <div className="workspace-shell">
      <aside className="workspace-sidebar">
        <Link href="/" className="workspace-brand">
          <span className="workspace-brand-mark">
            <Building2 size={13} />
          </span>
          <span>{brand}</span>
        </Link>

        <WorkspaceNav items={navItems} />

        <div className="workspace-sidebar-footer">
          <div className="workspace-user-area">
            <div className="workspace-avatar">{userInitials}</div>
            <div>
              <p className="workspace-user-name">{userName}</p>
              <p className="workspace-user-role">{userRole}</p>
            </div>
          </div>
        </div>
      </aside>

      <section className="workspace-content">
        <header className="workspace-topbar">
          <p className="workspace-topbar-title">{subtitle}</p>
          <div className="workspace-topbar-actions">
            {actions.map((action) => (
              <Link key={action.href} href={action.href} className="btn btn-secondary btn-sm">
                {action.label}
              </Link>
            ))}
            <LogoutButton />
            <NotificationBell fallbackCount={notifCount} />
          </div>
        </header>
        {children}
      </section>
    </div>
  );
}
