"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { format, formatDistanceToNow } from "date-fns";
import { StatCard } from "@/components/ui/StatCard";
import {
  TrendingUp,
  FileWarning,
  ShieldCheck,
  DollarSign,
  ClipboardList,
  FilePlus2,
  AlertTriangle,
  ReceiptText,
  BarChart3,
  ScrollText,
  ShieldAlert,
  CircleCheckBig,
  CircleX,
  Clock3,
} from "lucide-react";

type PolicyRow = {
  id: string;
  status: string;
  product: string | null;
  written_premium: number;
  created_at: string;
};

type ClaimRow = {
  id: string;
  status: string;
  severity: "low" | "medium" | "high" | "critical";
  reserve_amount: number;
  incurred_amount: number;
  paid_amount: number;
  incident_date: string;
  created_at: string;
};

type InvoiceRow = {
  id: string;
  status: string;
  issue_date: string;
  due_date: string;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
};

type PaymentRow = {
  id: string;
  status: string;
  amount: number;
  payment_date: string;
};

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

type ComplianceRow = {
  id: string;
  is_enabled: boolean;
  severity: "low" | "medium" | "high" | "critical";
};

type ActivityItem = {
  id: string;
  label: string;
  time: string;
  type: string;
  dotClass: string;
};

type ProductMixItem = {
  product: string;
  policies: number;
  premium: number;
};

const PIE_COLORS = ["#1fa8c4", "#6366f1", "#10b981", "#f59e0b", "#e05060", "#94a3b8"];

const quickActions = [
  { label: "New Quote", href: "/admin/policies/new", icon: FilePlus2 },
  { label: "Underwriting", href: "/admin/underwriting", icon: ShieldCheck },
  { label: "Claims Queue", href: "/admin/claims", icon: FileWarning },
  { label: "Billing", href: "/admin/billing", icon: ReceiptText },
  { label: "Reports", href: "/admin/reports", icon: BarChart3 },
  { label: "Audit Log", href: "/admin/audit-log", icon: ScrollText },
  { label: "Compliance", href: "/admin/settings/compliance", icon: ShieldAlert },
];

function currency(value: number) {
  return `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function percent(value: number) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function monthKey(dateText: string) {
  return dateText.slice(0, 7);
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getActivityDot(type: string) {
  if (type === "policy") return "dot-bound";
  if (type === "claim") return "dot-quote";
  if (type === "billing") return "dot-endorsement";
  if (type === "compliance") return "dot-review";
  return "dot-default";
}

export default function AdminDashboardPage() {
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [compliance, setCompliance] = useState<ComplianceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const [
        policyRes,
        claimRes,
        invoiceRes,
        paymentRes,
        notificationRes,
        complianceRes,
      ] = await Promise.all([
        fetch("/api/policies?limit=500", { cache: "no-store" }),
        fetch("/api/claims?limit=500", { cache: "no-store" }),
        fetch("/api/billing?limit=500", { cache: "no-store" }),
        fetch("/api/payments?limit=500", { cache: "no-store" }),
        fetch("/api/notifications?limit=30", { cache: "no-store" }),
        fetch("/api/compliance-rules?limit=500", { cache: "no-store" }),
      ]);

      const [
        policyPayload,
        claimPayload,
        invoicePayload,
        paymentPayload,
        notificationPayload,
        compliancePayload,
      ] = await Promise.all([
        policyRes.json(),
        claimRes.json(),
        invoiceRes.json(),
        paymentRes.json(),
        notificationRes.json(),
        complianceRes.json(),
      ]);

      const firstError = [
        !policyRes.ok ? policyPayload.error : null,
        !claimRes.ok ? claimPayload.error : null,
        !invoiceRes.ok ? invoicePayload.error : null,
        !paymentRes.ok ? paymentPayload.error : null,
        !notificationRes.ok ? notificationPayload.error : null,
        !complianceRes.ok ? compliancePayload.error : null,
      ].find(Boolean);

      if (firstError) {
        throw new Error(String(firstError));
      }

      setPolicies(policyPayload.data || []);
      setClaims(claimPayload.data || []);
      setInvoices(invoicePayload.data || []);
      setPayments(paymentPayload.data || []);
      setNotifications(notificationPayload.data || []);
      setCompliance(compliancePayload.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const writtenPremium = useMemo(
    () => policies.reduce((sum, item) => sum + toNumber(item.written_premium), 0),
    [policies],
  );
  const pendingQuotes = useMemo(
    () => policies.filter((item) => item.status === "quote").length,
    [policies],
  );
  const policyStatusMix = useMemo(() => {
    const grouped = new Map<string, number>();
    policies.forEach((item) => {
      grouped.set(item.status, (grouped.get(item.status) || 0) + 1);
    });
    return [...grouped.entries()].map(([name, value]) => ({ name, value }));
  }, [policies]);

  const openClaims = useMemo(
    () =>
      claims.filter((item) => item.status === "open" || item.status === "investigating").length,
    [claims],
  );
  const criticalClaims = useMemo(
    () => claims.filter((item) => item.severity === "critical").length,
    [claims],
  );
  const incurredLosses = useMemo(
    () => claims.reduce((sum, item) => sum + toNumber(item.incurred_amount), 0),
    [claims],
  );

  const billedAmount = useMemo(
    () => invoices.reduce((sum, item) => sum + toNumber(item.total_amount), 0),
    [invoices],
  );
  const outstanding = useMemo(
    () => invoices.reduce((sum, item) => sum + toNumber(item.amount_due), 0),
    [invoices],
  );
  const overdueInvoices = useMemo(
    () =>
      invoices.filter(
        (item) =>
          item.due_date < today &&
          toNumber(item.amount_due) > 0 &&
          !["paid", "void"].includes(item.status),
      ).length,
    [invoices, today],
  );

  const collectedAmount = useMemo(
    () =>
      payments
        .filter((item) => item.status === "posted")
        .reduce((sum, item) => sum + toNumber(item.amount), 0),
    [payments],
  );

  const collectionRate = useMemo(
    () => (billedAmount > 0 ? (collectedAmount / billedAmount) * 100 : 0),
    [billedAmount, collectedAmount],
  );
  const lossRatio = useMemo(
    () => (billedAmount > 0 ? (incurredLosses / billedAmount) * 100 : 0),
    [billedAmount, incurredLosses],
  );
  const combinedRatio = useMemo(() => lossRatio + 28, [lossRatio]);

  const unreadNotifications = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications],
  );
  const enabledCompliance = useMemo(
    () => compliance.filter((item) => item.is_enabled).length,
    [compliance],
  );
  const disabledCompliance = useMemo(
    () => compliance.filter((item) => !item.is_enabled).length,
    [compliance],
  );
  const highRiskRules = useMemo(
    () =>
      compliance.filter(
        (item) =>
          item.is_enabled && (item.severity === "high" || item.severity === "critical"),
      ).length,
    [compliance],
  );
  const quoteCount = useMemo(
    () => policies.filter((item) => item.status === "quote").length,
    [policies],
  );
  const boundCount = useMemo(
    () => policies.filter((item) => item.status === "bound").length,
    [policies],
  );
  const declinedCount = useMemo(
    () => policies.filter((item) => item.status === "declined").length,
    [policies],
  );
  const quoteFunnelBase = useMemo(
    () => quoteCount + boundCount + declinedCount,
    [boundCount, declinedCount, quoteCount],
  );
  const quoteToBindRate = useMemo(
    () => (quoteFunnelBase > 0 ? (boundCount / quoteFunnelBase) * 100 : 0),
    [boundCount, quoteFunnelBase],
  );
  const highSeverityOpenClaims = useMemo(
    () =>
      claims.filter(
        (item) =>
          (item.status === "open" || item.status === "investigating") &&
          (item.severity === "high" || item.severity === "critical"),
      ).length,
    [claims],
  );
  const dueSoonDate = useMemo(() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 7);
    return d.toISOString().slice(0, 10);
  }, []);
  const dueThisWeekInvoices = useMemo(
    () =>
      invoices.filter(
        (item) =>
          item.due_date >= today &&
          item.due_date <= dueSoonDate &&
          toNumber(item.amount_due) > 0 &&
          !["paid", "void"].includes(item.status),
      ).length,
    [dueSoonDate, invoices, today],
  );
  const paymentExceptions = useMemo(
    () =>
      payments.filter(
        (item) => item.status !== "posted" && item.status !== "draft" && item.status !== "pending",
      ).length,
    [payments],
  );
  const topProducts = useMemo<ProductMixItem[]>(() => {
    const grouped = new Map<string, ProductMixItem>();
    policies.forEach((item) => {
      const product = item.product?.trim() || "Unspecified";
      const current = grouped.get(product) || { product, policies: 0, premium: 0 };
      current.policies += 1;
      current.premium += toNumber(item.written_premium);
      grouped.set(product, current);
    });
    return [...grouped.values()]
      .sort((a, b) => b.premium - a.premium || b.policies - a.policies)
      .slice(0, 5);
  }, [policies]);

  const monthlyFinancials = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, index) => {
      const d = new Date();
      d.setUTCDate(1);
      d.setUTCMonth(d.getUTCMonth() - (5 - index));
      return {
        key: format(d, "yyyy-MM"),
        month: format(d, "MMM"),
        billed: 0,
        collected: 0,
        written: 0,
      };
    });

    const map = new Map(months.map((item) => [item.key, item]));

    invoices.forEach((item) => {
      const key = monthKey(item.issue_date || "");
      const target = map.get(key);
      if (target) {
        target.billed += toNumber(item.total_amount);
      }
    });

    payments
      .filter((item) => item.status === "posted")
      .forEach((item) => {
        const key = monthKey(item.payment_date || "");
        const target = map.get(key);
        if (target) {
          target.collected += toNumber(item.amount);
        }
      });

    policies.forEach((item) => {
      const key = monthKey(item.created_at || "");
      const target = map.get(key);
      if (target) {
        target.written += toNumber(item.written_premium);
      }
    });

    return months;
  }, [invoices, payments, policies]);

  const activity = useMemo<ActivityItem[]>(() => {
    if (!notifications.length) {
      const fallback: ActivityItem[] = [];
      if (overdueInvoices > 0) {
        fallback.push({
          id: "fallback-overdue",
          label: `${overdueInvoices} overdue invoice(s) need follow-up`,
          time: "Current snapshot",
          type: "billing",
          dotClass: "dot-endorsement",
        });
      }
      if (criticalClaims > 0) {
        fallback.push({
          id: "fallback-critical-claims",
          label: `${criticalClaims} critical claim(s) in queue`,
          time: "Current snapshot",
          type: "claim",
          dotClass: "dot-quote",
        });
      }
      if (disabledCompliance > 0) {
        fallback.push({
          id: "fallback-compliance",
          label: `${disabledCompliance} compliance rule(s) disabled`,
          time: "Current snapshot",
          type: "compliance",
          dotClass: "dot-review",
        });
      }
      return fallback;
    }

    return notifications.slice(0, 6).map((item) => ({
      id: item.id,
      label: item.title || item.message,
      time: formatDistanceToNow(new Date(item.created_at), { addSuffix: true }),
      type: item.type || "system",
      dotClass: getActivityDot(item.type || "system"),
    }));
  }, [criticalClaims, disabledCompliance, notifications, overdueInvoices]);

  return (
    <main className="portal-shell">
      <div className="panel-header">
        <div>
          <h1>Platform Operations Dashboard</h1>
          <p>
            Unified operational view across underwriting, claims, billing, compliance, and alerts.
          </p>
        </div>
        <div className="row-actions">
          <button className="btn btn-secondary" onClick={loadDashboard} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error ? <p className="inline-error">{error}</p> : null}

      <section className="kpi-grid">
        <StatCard
          label="Written Premium"
          value={currency(writtenPremium)}
          helper="Portfolio written premium"
          accent="#1fa8c4"
          accentSoft="rgba(31,168,196,0.1)"
          icon={DollarSign}
        />
        <StatCard
          label="Pending Quotes"
          value={`${pendingQuotes}`}
          helper="Awaiting UW decision"
          accent="#6366f1"
          accentSoft="rgba(99,102,241,0.1)"
          icon={ClipboardList}
        />
        <StatCard
          label="Open Claims"
          value={`${openClaims}`}
          helper={`Critical: ${criticalClaims}`}
          accent="#e05060"
          accentSoft="rgba(224,80,96,0.1)"
          icon={FileWarning}
        />
        <StatCard
          label="Outstanding A/R"
          value={currency(outstanding)}
          helper={`Overdue invoices: ${overdueInvoices}`}
          accent="#f59e0b"
          accentSoft="rgba(245,158,11,0.1)"
          icon={AlertTriangle}
        />
        <StatCard
          label="Collection Rate"
          value={percent(collectionRate)}
          helper={`Collected ${currency(collectedAmount)}`}
          accent="#10b981"
          accentSoft="rgba(16,185,129,0.1)"
          icon={TrendingUp}
        />
        <StatCard
          label="Compliance Coverage"
          value={`${enabledCompliance}/${compliance.length || 0}`}
          helper={`Disabled rules: ${disabledCompliance} · Unread alerts: ${unreadNotifications}`}
          accent="#0ea5a4"
          accentSoft="rgba(14,165,164,0.12)"
          icon={ShieldCheck}
        />
      </section>

      <section className="dashboard-grid section-spaced">
        <article className="chart-card glass-card">
          <h2>Billed vs Collected (Last 6 Months)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyFinancials} margin={{ top: 4, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="billedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.24} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="collectedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,176,196,0.2)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5f7a8a" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: "#5f7a8a" }}
                tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(0)}k`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "rgba(248,252,255,0.95)",
                  border: "1px solid rgba(148,176,196,0.3)",
                  borderRadius: 10,
                  boxShadow: "0 8px 24px rgba(50,85,110,0.12)",
                  fontSize: 12,
                }}
                formatter={(value, key) => [
                  `$${Number(value || 0).toLocaleString()}`,
                  key === "billed"
                    ? "Billed"
                    : key === "collected"
                      ? "Collected"
                      : "Written",
                ]}
              />
              <Area type="monotone" dataKey="billed" stroke="#6366f1" strokeWidth={2.2} fill="url(#billedGrad)" />
              <Area type="monotone" dataKey="collected" stroke="#10b981" strokeWidth={2.2} fill="url(#collectedGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </article>

        <article className="chart-card glass-card">
          <h2>Policy Status Distribution</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={policyStatusMix}
                cx="50%"
                cy="46%"
                innerRadius={58}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
              >
                {policyStatusMix.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} opacity={0.9} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "rgba(248,252,255,0.95)",
                  border: "1px solid rgba(148,176,196,0.3)",
                  borderRadius: 10,
                  fontSize: 12,
                }}
                formatter={(value) => [`${value}`, "Policies"]}
              />
              <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12, color: "#5f7a8a" }} />
            </PieChart>
          </ResponsiveContainer>
        </article>
      </section>

      <section className="dashboard-grid section-spaced">
        <article className="detail-card glass-card">
          <h2>Operational Queues</h2>
          <ul className="activity-list">
            <li className="activity-item">
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span className="activity-dot dot-bound" />
                <div>
                  <p>Underwriting Queue</p>
                  <p className="kpi-foot">Open quote approvals</p>
                </div>
              </div>
              <span className="mini-chip">{pendingQuotes}</span>
            </li>
            <li className="activity-item">
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span className="activity-dot dot-quote" />
                <div>
                  <p>Claims Triage (High/Critical)</p>
                  <p className="kpi-foot">Open investigating claims</p>
                </div>
              </div>
              <span className="mini-chip">{highSeverityOpenClaims}</span>
            </li>
            <li className="activity-item">
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span className="activity-dot dot-endorsement" />
                <div>
                  <p>Billing Follow-up (7 Days)</p>
                  <p className="kpi-foot">Invoices due this week</p>
                </div>
              </div>
              <span className="mini-chip">{dueThisWeekInvoices}</span>
            </li>
            <li className="activity-item">
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span className="activity-dot dot-review" />
                <div>
                  <p>Compliance Escalations</p>
                  <p className="kpi-foot">High/critical enabled controls</p>
                </div>
              </div>
              <span className="mini-chip">{highRiskRules}</span>
            </li>
            <li className="activity-item">
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span className="activity-dot dot-default" />
                <div>
                  <p>Payment Exceptions</p>
                  <p className="kpi-foot">Failed/reversed records</p>
                </div>
              </div>
              <span className="mini-chip">{paymentExceptions}</span>
            </li>
          </ul>
        </article>

        <article className="detail-card glass-card">
          <h2>Quote Conversion Funnel</h2>
          <p className="kpi-foot">Current submission lifecycle performance.</p>
          <ul className="activity-list">
            <li className="activity-item">
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <Clock3 size={14} color="#6366f1" />
                <div>
                  <p>Quoted</p>
                  <p className="kpi-foot">Awaiting decision</p>
                </div>
              </div>
              <span className="mini-chip">{quoteCount}</span>
            </li>
            <li className="activity-item">
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <CircleCheckBig size={14} color="#10b981" />
                <div>
                  <p>Bound</p>
                  <p className="kpi-foot">Converted into active business</p>
                </div>
              </div>
              <span className="mini-chip">{boundCount}</span>
            </li>
            <li className="activity-item">
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <CircleX size={14} color="#e05060" />
                <div>
                  <p>Declined</p>
                  <p className="kpi-foot">Risk or appetite mismatch</p>
                </div>
              </div>
              <span className="mini-chip">{declinedCount}</span>
            </li>
            <li className="activity-item">
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <TrendingUp size={14} color="#1fa8c4" />
                <div>
                  <p>Quote to Bind Rate</p>
                  <p className="kpi-foot">Based on quote/bound/declined records</p>
                </div>
              </div>
              <span className="mini-chip">{percent(quoteToBindRate)}</span>
            </li>
          </ul>
        </article>
      </section>

      <section className="dashboard-grid section-spaced">
        <article className="detail-card glass-card">
          <h2>Recent Activity</h2>
          {!activity.length ? (
            <p className="kpi-foot">No recent operational events available.</p>
          ) : (
            <ul className="activity-list">
              {activity.map((item) => (
                <li key={item.id} className="activity-item">
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <span className={`activity-dot ${item.dotClass}`} />
                    <div>
                      <p>{item.label}</p>
                      <p className="kpi-foot">{item.time}</p>
                    </div>
                  </div>
                  <span className="mini-chip">{item.type}</span>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="detail-card glass-card">
          <h2>Platform Health</h2>
          <ul className="activity-list">
            <li className="activity-item">
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span className="activity-dot dot-review" />
                <div>
                  <p>Unread Notifications</p>
                  <p className="kpi-foot">Actionable alerts across modules</p>
                </div>
              </div>
              <span className="mini-chip">{unreadNotifications}</span>
            </li>
            <li className="activity-item">
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span className="activity-dot dot-endorsement" />
                <div>
                  <p>Collection Risk</p>
                  <p className="kpi-foot">Invoices currently overdue</p>
                </div>
              </div>
              <span className="mini-chip">{overdueInvoices}</span>
            </li>
            <li className="activity-item">
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span className="activity-dot dot-quote" />
                <div>
                  <p>Loss Ratio / Combined Ratio</p>
                  <p className="kpi-foot">Underwriting profitability indicators</p>
                </div>
              </div>
              <span className="mini-chip">
                {percent(lossRatio)} / {percent(combinedRatio)}
              </span>
            </li>
            <li className="activity-item">
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span className="activity-dot dot-bound" />
                <div>
                  <p>Compliance Controls</p>
                  <p className="kpi-foot">Enabled regulatory rules</p>
                </div>
              </div>
              <span className="mini-chip">
                {enabledCompliance}/{compliance.length || 0}
              </span>
            </li>
          </ul>
        </article>
      </section>

      <section className="dashboard-grid section-spaced">
        <article className="detail-card glass-card">
          <h2>Quick Actions</h2>
          <div className="quick-actions-grid">
            {quickActions.map(({ label, href, icon: Icon }) => (
              <Link key={href} href={href} className="quick-action-btn">
                <span className="quick-action-icon">
                  <Icon size={14} />
                </span>
                {label}
              </Link>
            ))}
          </div>
        </article>

        <article className="detail-card glass-card">
          <h2>Top Product Mix</h2>
          {!topProducts.length ? (
            <p className="kpi-foot">No policy product distribution available yet.</p>
          ) : (
            <ul className="activity-list">
              {topProducts.map((item) => (
                <li key={item.product} className="activity-item">
                  <div>
                    <p>{item.product}</p>
                    <p className="kpi-foot">{item.policies} policies</p>
                  </div>
                  <span className="mini-chip">{currency(item.premium)}</span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </main>
  );
}
