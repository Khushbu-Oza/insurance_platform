import Link from "next/link";
import {
  Shield,
  DollarSign,
  FileWarning,
  Plus,
  CreditCard,
} from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";

const policyCards = [
  {
    id: "POL-0001",
    type: "Personal Auto",
    vehicle: "2021 Toyota Camry",
    premium: "$184/mo",
    status: "active",
    renewal: "Aug 15, 2025",
    color: "#1fa8c4",
    colorSoft: "rgba(31,168,196,0.1)",
  },
  {
    id: "POL-0002",
    type: "Homeowners",
    vehicle: "4820 Oak Drive, TX",
    premium: "$200/mo",
    status: "active",
    renewal: "Nov 3, 2025",
    color: "#10b981",
    colorSoft: "rgba(16,185,129,0.1)",
  },
];

const paymentTimeline = [
  { label: "Next Payment", amount: "$184.00", date: "Apr 1, 2026", status: "upcoming" },
  { label: "March 2026", amount: "$384.00", date: "Mar 1, 2026", status: "paid" },
  { label: "February 2026", amount: "$384.00", date: "Feb 1, 2026", status: "paid" },
];

export default function PolicyholderDashboardPage() {
  return (
    <main className="portal-shell">
      <div className="panel-header">
        <div>
          <h1>My Dashboard</h1>
          <p>Manage your policies, payments, and claims in one place.</p>
        </div>
        <div className="row-actions">
          <Link href="/policyholder/claims/new" className="btn btn-primary">
            + File a Claim
          </Link>
          <Link href="/policyholder/payments" className="btn btn-secondary">
            Payment History
          </Link>
        </div>
      </div>

      <section className="kpi-grid">
        <StatCard
          label="Active Policies"
          value="2"
          helper="Auto + Homeowners"
          accent="#10b981"
          accentSoft="rgba(16,185,129,0.1)"
          icon={Shield}
        />
        <StatCard
          label="Next Payment"
          value="$184"
          helper="Due in 18 days"
          accent="#1fa8c4"
          accentSoft="rgba(31,168,196,0.1)"
          icon={CreditCard}
        />
        <StatCard
          label="Open Claims"
          value="1"
          helper="Currently under review"
          accent="#f59e0b"
          accentSoft="rgba(245,158,11,0.1)"
          icon={FileWarning}
        />
        <StatCard
          label="Annual Premiums"
          value="$4,608"
          helper="Combined portfolio"
          accent="#6366f1"
          accentSoft="rgba(99,102,241,0.1)"
          icon={DollarSign}
        />
      </section>

      {/* Policy Cards */}
      <section className="section-spaced">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>My Policies</h2>
        </div>
        <div style={{ marginTop: "0.75rem", display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          {policyCards.map((policy) => (
            <article key={policy.id} className="glass-card" style={{ borderRadius: 14, padding: "1.1rem", borderLeft: `4px solid ${policy.color}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.35rem" }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, display: "grid", placeItems: "center", background: policy.colorSoft, color: policy.color }}>
                      <Shield size={13} />
                    </div>
                    <span style={{ fontSize: "0.8rem", fontWeight: 800, color: policy.color }}>{policy.type}</span>
                  </div>
                  <p style={{ fontSize: "0.95rem", fontWeight: 700 }}>{policy.vehicle}</p>
                  <p className="kpi-foot" style={{ marginTop: "0.2rem" }}>Renews {policy.renewal}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: "1rem", fontWeight: 800 }}>{policy.premium}</p>
                  <span className="status-pill status-active" style={{ marginTop: "0.3rem" }}>Active</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-grid section-spaced">
        {/* Payment Timeline */}
        <article className="detail-card glass-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2>Payment Schedule</h2>
            <Link href="/policyholder/payments" className="tbl-link" style={{ fontSize: "0.8rem" }}>View all →</Link>
          </div>
          <ul className="activity-list">
            {paymentTimeline.map((p) => (
              <li key={p.label} className="activity-item">
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <span className={`activity-dot ${p.status === "paid" ? "dot-endorsement" : "dot-review"}`} />
                  <div>
                    <p>{p.label}</p>
                    <p className="kpi-foot">{p.date}</p>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontWeight: 700, fontSize: "0.9rem" }}>{p.amount}</p>
                  <span className={`mini-chip`}>{p.status}</span>
                </div>
              </li>
            ))}
          </ul>
        </article>

        {/* Quick Actions */}
        <article className="detail-card glass-card">
          <h2>Quick Actions</h2>
          <div style={{ marginTop: "0.75rem", display: "grid", gap: "0.5rem" }}>
            {[
              { label: "File a New Claim", href: "/policyholder/claims/new", icon: Plus, color: "#f59e0b" },
              { label: "Make a Payment", href: "/policyholder/payments", icon: CreditCard, color: "#10b981" },
              { label: "View Documents", href: "#", icon: FileWarning, color: "#1fa8c4" },
            ].map(({ label, href, icon: Icon, color }) => (
              <Link key={label} href={href} className="quick-action-btn">
                <span className="quick-action-icon" style={{ background: `${color}18`, color }}>
                  <Icon size={14} />
                </span>
                {label}
              </Link>
            ))}
          </div>

          <div style={{ marginTop: "1.2rem", padding: "0.85rem", borderRadius: 12, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1e7a53" }}>✓ All policies are in good standing</p>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>No outstanding payments or issues.</p>
          </div>
        </article>
      </section>
    </main>
  );
}
