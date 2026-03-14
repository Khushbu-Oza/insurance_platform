import Link from "next/link";
import {
  Cloud,
  FileWarning,
  Grid3X3,
  Monitor,
  PieChart,
  ReceiptText,
  ShieldCheck,
  TrendingUp,
  UserRound,
} from "lucide-react";

const topNav = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Policy", href: "/admin/policies" },
  { label: "Claims", href: "/admin/claims" },
  { label: "Billing", href: "/admin/billing" },
  { label: "Reports", href: "/admin/reports" },
  { label: "Portals", href: "/agent/dashboard" },
];

const quickRail = [
  { label: "Command Center", icon: Grid3X3, href: "/admin/dashboard" },
  { label: "Policy Core", icon: ShieldCheck, href: "/admin/policies" },
  { label: "Claims", icon: FileWarning, href: "/admin/claims" },
  { label: "Underwriting", icon: PieChart, href: "/admin/underwriting" },
  { label: "Agent Portal", icon: Monitor, href: "/agent/dashboard" },
  { label: "Customer Portal", icon: Cloud, href: "/policyholder/dashboard" },
];

const modules = [
  {
    title: "Policy Administration",
    description:
      "Quote to bind lifecycle with risk checkpoints, policy versions, and endorsements.",
    tag: "Core Policy",
    icon: ShieldCheck,
    href: "/admin/policies",
    color: "#1fa8c4",
    colorSoft: "rgba(31,168,196,0.12)",
  },
  {
    title: "Claims Operations",
    description:
      "FNOL intake, adjuster workflow, claim notes, payments, and document tracking.",
    tag: "Claims Core",
    icon: FileWarning,
    href: "/admin/claims",
    color: "#f59e0b",
    colorSoft: "rgba(245,158,11,0.12)",
  },
  {
    title: "Underwriting Workbench",
    description:
      "Prioritized review queue for pending quotes with one-click approval actions.",
    tag: "Risk Decisioning",
    icon: PieChart,
    href: "/admin/underwriting",
    color: "#6366f1",
    colorSoft: "rgba(99,102,241,0.12)",
  },
  {
    title: "Billing & Collections",
    description:
      "Invoice schedules, payment posting, and commission visibility in one workflow.",
    tag: "Finance Ops",
    icon: ReceiptText,
    href: "/admin/billing",
    color: "#10b981",
    colorSoft: "rgba(16,185,129,0.12)",
  },
  {
    title: "Agent Workspace",
    description: "Submission-ready flow for agents to manage clients and policy intake.",
    tag: "Distribution",
    icon: Monitor,
    href: "/agent/dashboard",
    color: "#8b5cf6",
    colorSoft: "rgba(139,92,246,0.12)",
  },
  {
    title: "Policyholder Self-Service",
    description: "Customer-first access for claims FNOL, payments, and policy visibility.",
    tag: "Customer Experience",
    icon: UserRound,
    href: "/policyholder/dashboard",
    color: "#06b6d4",
    colorSoft: "rgba(6,182,212,0.12)",
  },
  {
    title: "Analytics & Controls",
    description:
      "Operational reporting, compliance controls, and audit visibility for leadership.",
    tag: "Executive Visibility",
    icon: TrendingUp,
    href: "/admin/reports",
    color: "#14b8a6",
    colorSoft: "rgba(20,184,166,0.12)",
  },
];

const heroStats = [
  { value: "< 3 min", label: "Quote Intake Time" },
  { value: "24x7", label: "Portal Availability" },
  { value: "1", label: "Unified Data Layer" },
  { value: "Role-Based", label: "Access & Controls" },
];

const trustHighlights = [
  {
    title: "Carrier-grade controls",
    description: "Role-based access, audit trails, and compliance workflows are built in.",
    icon: ShieldCheck,
  },
  {
    title: "End-to-end operations",
    description: "Policy, claims, billing, and reporting run on a single operating platform.",
    icon: Grid3X3,
  },
  {
    title: "Ready for growth",
    description: "Designed for regional carriers and MGAs scaling multi-team operations.",
    icon: TrendingUp,
  },
];

export default function HomePage() {
  return (
    <main className="site-shell">
      <div className="ambient-orb ambient-orb-a" />
      <div className="ambient-orb ambient-orb-b" />
      <div className="ambient-orb ambient-orb-c" />
      <div className="ambient-orb ambient-orb-d" />

      {/* Topnav */}
      <header className="top-nav glass-panel">
        <div className="top-nav-inner">
          <Link href="/" className="brand">
            <span className="brand-mark" />
            <span>InsureFlow</span>
          </Link>
          <nav className="top-links">
            {topNav.map((item) => (
              <Link href={item.href} key={item.label}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="top-actions">
            <Link href="/login" className="btn btn-secondary btn-sm">
              Sign In
            </Link>
            <Link href="/signup" className="btn btn-primary btn-sm">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero-panel glass-panel">
          <p className="eyebrow-soft">Cloud-native P&C platform</p>
          <h1>
            One platform for policy, underwriting, claims, billing, and customer portals.
          </h1>
          <p>
            InsureFlow gives carrier and MGA teams a single operating layer for end-to-end
            insurance workflows. Launch faster, keep data consistent, and run operations with
            clear controls across every role.
          </p>

          <div className="hero-stats-strip">
            {heroStats.map((s) => (
              <div key={s.label} className="hero-stat">
                <span className="hero-stat-value">{s.value}</span>
                <span className="hero-stat-label">{s.label}</span>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Quick nav rail */}
      <section className="secondary-nav glass-panel">
        <div className="secondary-nav-inner">
          {quickRail.map(({ label, icon: Icon, href }) => (
            <Link key={label} href={href} className="sub-item">
              <Icon size={17} />
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Module cards */}
      <section className="content-wrap">
        <div className="card-grid">
          {modules.map(({ title, description, tag, icon: Icon, href, color, colorSoft }) => (
            <Link key={title} href={href} className="portal-card-link">
              <article className="portal-card glass-card">
                <div
                  className="portal-icon"
                  style={
                    {
                      "--portal-icon-color": color,
                      "--portal-icon-bg": colorSoft,
                      color,
                      background: colorSoft,
                    } as React.CSSProperties
                  }
                >
                  <Icon size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <h2>{title}</h2>
                  <p>{description}</p>
                  <span className="tag-chip">{tag}</span>
                </div>
              </article>
            </Link>
          ))}
        </div>

        <div className="card-grid section-spaced">
          {trustHighlights.map(({ title, description, icon: Icon }) => (
            <article key={title} className="portal-card glass-card">
              <div
                className="portal-icon"
                style={
                  {
                    color: "#0f766e",
                    background: "rgba(20,184,166,0.12)",
                  } as React.CSSProperties
                }
              >
                <Icon size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <h2>{title}</h2>
                <p>{description}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="card-grid section-spaced" style={{ marginBottom: "1rem" }}>
          <Link href="/admin/dashboard" className="portal-card-link">
            <article className="portal-card glass-card">
              <div
                className="portal-icon"
                style={
                  {
                    color: "#1fa8c4",
                    background: "rgba(31,168,196,0.12)",
                  } as React.CSSProperties
                }
              >
                <Grid3X3 size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <h2>Explore Admin Workspace</h2>
                <p>Open operations command center for policy, claims, billing, and reporting.</p>
              </div>
            </article>
          </Link>

          <Link href="/agent/dashboard" className="portal-card-link">
            <article className="portal-card glass-card">
              <div
                className="portal-icon"
                style={
                  {
                    color: "#6366f1",
                    background: "rgba(99,102,241,0.12)",
                  } as React.CSSProperties
                }
              >
                <Monitor size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <h2>Explore Agent Workspace</h2>
                <p>Access producer tools for submissions, client visibility, and servicing.</p>
              </div>
            </article>
          </Link>

          <Link href="/policyholder/dashboard" className="portal-card-link">
            <article className="portal-card glass-card">
              <div
                className="portal-icon"
                style={
                  {
                    color: "#10b981",
                    background: "rgba(16,185,129,0.12)",
                  } as React.CSSProperties
                }
              >
                <UserRound size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <h2>Explore Customer Workspace</h2>
                <p>Review policy context, file claims, and monitor payment activity in one view.</p>
              </div>
            </article>
          </Link>
        </div>
      </section>
    </main>
  );
}
