"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart2,
  ClipboardList,
  CreditCard,
  FilePlus2,
  FileWarning,
  LayoutDashboard,
  ReceiptText,
  ShieldCheck,
  Users2,
} from "lucide-react";

export type WorkspaceIconName =
  | "dashboard"
  | "policies"
  | "claims"
  | "underwriting"
  | "new_quote"
  | "billing"
  | "reports"
  | "clients"
  | "new_submission"
  | "file_claim"
  | "payments";

export type WorkspaceNavItem = {
  href: string;
  label: string;
  icon: WorkspaceIconName;
};

type WorkspaceNavProps = {
  items: WorkspaceNavItem[];
};

export function WorkspaceNav({ items }: WorkspaceNavProps) {
  const pathname = usePathname();

  return (
    <nav className="workspace-nav">
      {items.map(({ href, label, icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + "/");
        const Icon = getIcon(icon);
        return (
          <Link
            href={href}
            key={href}
            className={`workspace-nav-link${isActive ? " active" : ""}`}
          >
            <Icon size={16} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function getIcon(name: WorkspaceIconName) {
  const map = {
    dashboard: LayoutDashboard,
    policies: ClipboardList,
    claims: FileWarning,
    underwriting: ShieldCheck,
    new_quote: FilePlus2,
    billing: ReceiptText,
    reports: BarChart2,
    clients: Users2,
    new_submission: FilePlus2,
    file_claim: ShieldCheck,
    payments: CreditCard,
  };

  return map[name];
}
