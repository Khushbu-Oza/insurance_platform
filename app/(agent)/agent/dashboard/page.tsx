import Link from "next/link";
import {
  BarChart2,
  Briefcase,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  FilePlus2,
  TrendingUp,
} from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";

const quickActions = [
  { label: "New Submission", href: "/agent/new-submission", icon: FilePlus2 },
  { label: "Client List", href: "/agent/clients", icon: ClipboardList },
  { label: "Admin Workspace", href: "/admin/dashboard", icon: BarChart2 },
];

const recentActivity = [
  { label: "Quote submitted for J. Martinez", time: "12 mins ago", type: "quote" },
  { label: "Policy IF-000091 renewed", time: "1 hr ago", type: "renewal" },
  { label: "Commission paid — Feb cycle", time: "2 hrs ago", type: "commission" },
  { label: "Client R. Patel updated", time: "Yesterday", type: "update" },
];

export default function AgentDashboardPage() {
  return (
    <main className="portal-shell">
      <div className="panel-header">
        <div>
          <h1>Agent Dashboard</h1>
          <p>Manage your book of business, submissions, and commissions.</p>
        </div>
        <div className="row-actions">
          <Link href="/agent/new-submission" className="btn btn-primary">
            + New Submission
          </Link>
        </div>
      </div>

      <section className="kpi-grid">
        <StatCard
          label="Active Policies"
          value="128"
          helper="Assigned to your agency"
          accent="#6366f1"
          accentSoft="rgba(99,102,241,0.1)"
          trend="+4"
          trendUp={true}
          icon={Briefcase}
        />
        <StatCard
          label="Pending Tasks"
          value="14"
          helper="Follow-ups & renewals"
          accent="#f59e0b"
          accentSoft="rgba(245,158,11,0.1)"
          trend="-2"
          trendUp={true}
          icon={CheckCircle2}
        />
        <StatCard
          label="Monthly Commission"
          value="$8,420"
          helper="Projected this cycle"
          accent="#10b981"
          accentSoft="rgba(16,185,129,0.1)"
          trend="+12%"
          trendUp={true}
          icon={DollarSign}
        />
        <StatCard
          label="YTD Production"
          value="$94,200"
          helper="Written premium YTD"
          accent="#1fa8c4"
          accentSoft="rgba(31,168,196,0.1)"
          trend="+8%"
          trendUp={true}
          icon={TrendingUp}
        />
      </section>

      <section className="dashboard-grid section-spaced">
        <article className="detail-card glass-card">
          <h2>Recent Activity</h2>
          <ul className="activity-list">
            {recentActivity.map((item) => (
              <li key={item.label} className="activity-item">
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <span className="activity-dot dot-bound" />
                  <div>
                    <p>{item.label}</p>
                    <p className="kpi-foot">{item.time}</p>
                  </div>
                </div>
                <span className="mini-chip">{item.type}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="detail-card glass-card">
          <h2>Quick Actions</h2>
          <div style={{ marginTop: "0.75rem", display: "grid", gap: "0.5rem" }}>
            {quickActions.map(({ label, href, icon: Icon }) => (
              <Link key={href} href={href} className="quick-action-btn">
                <span className="quick-action-icon" style={{
                  background: "rgba(99,102,241,0.1)",
                  color: "#6366f1"
                }}>
                  <Icon size={14} />
                </span>
                {label}
              </Link>
            ))}
          </div>

          <div style={{ marginTop: "1.2rem" }}>
            <h2>Goal Progress</h2>
            <div style={{ marginTop: "0.6rem", display: "grid", gap: "0.5rem" }}>
              {[
                { label: "Monthly Target", pct: 84, color: "#6366f1" },
                { label: "Client Retention", pct: 92, color: "#10b981" },
                { label: "Renewal Rate", pct: 78, color: "#1fa8c4" },
              ].map((g) => (
                <div key={g.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)" }}>{g.label}</span>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700 }}>{g.pct}%</span>
                  </div>
                  <div style={{ height: "6px", background: "rgba(180,200,218,0.3)", borderRadius: 99, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${g.pct}%`,
                        background: g.color,
                        borderRadius: 99,
                        opacity: 0.85,
                        transition: "width 0.5s ease"
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
