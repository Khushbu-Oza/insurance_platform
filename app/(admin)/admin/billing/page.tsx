"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DollarSign, Receipt, AlertTriangle, CreditCard } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";

type InvoiceRow = {
  id: string;
  organization_id: string;
  policy_id: string;
  invoice_number: string;
  status: string;
  due_date: string;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  policies?: { id: string; policy_number: string; status: string } | null;
};

type PaymentRow = {
  id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  status: string;
  payment_method: string;
  payment_type: string;
};

type PolicyOption = {
  id: string;
  organization_id: string;
  policy_number: string;
  status: string;
  written_premium: number;
  product: string | null;
};

export default function BillingDashboardPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [policies, setPolicies] = useState<PolicyOption[]>([]);

  const [status, setStatus] = useState("");
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");

  const [policyId, setPolicyId] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [totalAmount, setTotalAmount] = useState(0);
  const [frequency, setFrequency] = useState<"monthly" | "quarterly" | "annual">(
    "monthly",
  );
  const [installmentCount, setInstallmentCount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDayOffset, setDueDayOffset] = useState(0);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadBilling() {
      setLoading(true);
      setError(null);
      try {
        const invoiceParams = new URLSearchParams();
        invoiceParams.set("limit", "200");
        if (status) invoiceParams.set("status", status);
        if (dueFrom) invoiceParams.set("date_from", dueFrom);
        if (dueTo) invoiceParams.set("date_to", dueTo);

        const [invoiceRes, paymentRes] = await Promise.all([
          fetch(`/api/billing?${invoiceParams.toString()}`, { cache: "no-store" }),
          fetch("/api/payments?limit=300", { cache: "no-store" }),
        ]);

        const [invoicePayload, paymentPayload] = await Promise.all([
          invoiceRes.json(),
          paymentRes.json(),
        ]);

        if (!invoiceRes.ok) {
          throw new Error(invoicePayload.error || "Failed to load invoices.");
        }
        if (!paymentRes.ok) {
          throw new Error(paymentPayload.error || "Failed to load payments.");
        }

        setInvoices(invoicePayload.data || []);
        setPayments(paymentPayload.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load billing dashboard.");
      } finally {
        setLoading(false);
      }
    }

    loadBilling();
  }, [status, dueFrom, dueTo]);

  useEffect(() => {
    async function loadPolicies() {
      try {
        const response = await fetch("/api/policies?limit=200", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "Failed to load policies.");
        }
        setPolicies(payload.data || []);
      } catch {
        // Keep the page usable even if policy lookup fails.
      }
    }
    loadPolicies();
  }, []);

  useEffect(() => {
    if (!policyId) return;
    const selected = policies.find((item) => item.id === policyId);
    if (!selected) return;
    setOrganizationId(selected.organization_id);
    if (!totalAmount) {
      setTotalAmount(Number(selected.written_premium || 0));
    }
  }, [policyId, policies, totalAmount]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const outstandingAmount = useMemo(
    () => invoices.reduce((sum, invoice) => sum + Number(invoice.amount_due || 0), 0),
    [invoices],
  );

  const overdueCount = useMemo(
    () =>
      invoices.filter(
        (invoice) =>
          invoice.due_date < today && !["paid", "void"].includes(invoice.status),
      ).length,
    [invoices, today],
  );

  const openInvoicesCount = useMemo(
    () =>
      invoices.filter((invoice) =>
        ["draft", "issued", "partially_paid", "overdue"].includes(invoice.status),
      ).length,
    [invoices],
  );

  const collectedThisMonth = useMemo(() => {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    return payments
      .filter((payment) => payment.status === "posted")
      .filter((payment) => {
        const paymentDate = new Date(`${payment.payment_date}T00:00:00.000Z`);
        return paymentDate.getUTCFullYear() === year && paymentDate.getUTCMonth() === month;
      })
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  }, [payments]);

  const revenueSeries = useMemo(() => {
    const monthly = new Map<string, number>();

    payments
      .filter((payment) => payment.status === "posted")
      .forEach((payment) => {
        const key = payment.payment_date.slice(0, 7);
        monthly.set(key, (monthly.get(key) || 0) + Number(payment.amount || 0));
      });

    return [...monthly.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([month, amount]) => ({
        month,
        amount,
      }));
  }, [payments]);

  async function createSchedule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_id: organizationId,
          policy_id: policyId,
          total_amount: totalAmount,
          frequency,
          installment_count: installmentCount ? Number(installmentCount) : undefined,
          start_date: startDate || undefined,
          due_day_offset: dueDayOffset,
          create_commissions: true,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to create invoices.");
      }

      const createdCount = Array.isArray(payload.data) ? payload.data.length : 0;
      setSuccess(
        `Created ${createdCount} invoice(s). Commissions created: ${payload.commissions_created ?? 0}.`,
      );

      const refreshResponse = await fetch("/api/billing?limit=200", { cache: "no-store" });
      const refreshPayload = await refreshResponse.json();
      if (refreshResponse.ok) {
        setInvoices(refreshPayload.data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invoice schedule.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="portal-shell">
      <PageHeader
        title="Billing Dashboard"
        description="Overdue invoices, payment activity, and installment schedule generation."
        actions={
          <Link className="btn btn-secondary" href="/admin/billing/commissions">
            View Commissions
          </Link>
        }
      />

      <section className="kpi-grid">
        <StatCard
          label="Open Invoices"
          value={`${openInvoicesCount}`}
          helper="Draft, issued, partial, overdue"
          accent="#1fa8c4"
          accentSoft="rgba(31,168,196,0.1)"
          icon={Receipt}
        />
        <StatCard
          label="Outstanding"
          value={`$${outstandingAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          helper="Remaining receivables"
          accent="#6366f1"
          accentSoft="rgba(99,102,241,0.1)"
          icon={DollarSign}
        />
        <StatCard
          label="Overdue"
          value={`${overdueCount}`}
          helper="Past due, unpaid invoices"
          accent="#e05060"
          accentSoft="rgba(224,80,96,0.1)"
          icon={AlertTriangle}
        />
        <StatCard
          label="Collected (MTD)"
          value={`$${collectedThisMonth.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          helper="Posted premium payments"
          accent="#10b981"
          accentSoft="rgba(16,185,129,0.1)"
          icon={CreditCard}
        />
      </section>

      <section className="dashboard-grid section-spaced">
        <article className="chart-card glass-card">
          <h2>Payment Trend</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueSeries} margin={{ top: 8, right: 10, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="billingRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,176,196,0.2)" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `$${Math.round(Number(value) / 1000)}k`}
              />
              <Tooltip
                formatter={(value) => [`$${Number(value).toLocaleString()}`, "Collected"]}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#10b981"
                strokeWidth={2.4}
                fill="url(#billingRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </article>

        <article className="detail-card glass-card">
          <h2>Generate Invoice Schedule</h2>
          <form className="app-form" onSubmit={createSchedule}>
            <label>
              Policy
              <select
                value={policyId}
                onChange={(event) => setPolicyId(event.target.value)}
                required
              >
                <option value="">Select policy</option>
                {policies.map((policy) => (
                  <option key={policy.id} value={policy.id}>
                    {policy.policy_number} ({policy.status}
                    {policy.product ? ` · ${policy.product}` : ""})
                  </option>
                ))}
              </select>
            </label>

            <label>
              Organization ID
              <input
                value={organizationId}
                onChange={(event) => setOrganizationId(event.target.value)}
                required
              />
            </label>

            <label>
              Total Premium Amount
              <input
                type="number"
                min={1}
                step="0.01"
                value={totalAmount}
                onChange={(event) => setTotalAmount(Number(event.target.value))}
                required
              />
            </label>

            <label>
              Billing Frequency
              <select
                value={frequency}
                onChange={(event) =>
                  setFrequency(event.target.value as "monthly" | "quarterly" | "annual")
                }
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </label>

            <label>
              Installment Count (optional)
              <input
                type="number"
                min={1}
                value={installmentCount}
                onChange={(event) => setInstallmentCount(event.target.value)}
                placeholder="auto"
              />
            </label>

            <label>
              Start Date (optional)
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </label>

            <label>
              Due Day Offset
              <input
                type="number"
                value={dueDayOffset}
                onChange={(event) => setDueDayOffset(Number(event.target.value))}
              />
            </label>

            {error ? <p className="inline-error">{error}</p> : null}
            {success ? <p className="status-pill status-active">{success}</p> : null}

            <div className="row-actions">
              <button className="btn btn-primary" type="submit" disabled={creating}>
                {creating ? "Generating..." : "Generate Invoices"}
              </button>
            </div>
          </form>
        </article>
      </section>

      <section className="detail-card glass-card section-spaced">
        <h2>Filters</h2>
        <div className="filter-row" style={{ marginTop: "0.75rem" }}>
          <label>
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All</option>
              <option value="draft">Draft</option>
              <option value="issued">Issued</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="void">Void</option>
            </select>
          </label>

          <label>
            Due From
            <input type="date" value={dueFrom} onChange={(event) => setDueFrom(event.target.value)} />
          </label>

          <label>
            Due To
            <input type="date" value={dueTo} onChange={(event) => setDueTo(event.target.value)} />
          </label>
        </div>
      </section>

      <div className="table-wrap glass-card section-spaced">
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Policy #</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Outstanding</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="loading-row">
                <td colSpan={8} style={{ textAlign: "center", padding: "2rem" }}>
                  Loading billing data...
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="empty-state">No invoices found for current filters.</div>
                </td>
              </tr>
            ) : (
              invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td style={{ fontWeight: 600 }}>{invoice.invoice_number}</td>
                  <td>{invoice.policies?.policy_number || invoice.policy_id}</td>
                  <td>{invoice.due_date}</td>
                  <td>
                    <StatusBadge status={invoice.status} />
                  </td>
                  <td>${Number(invoice.total_amount || 0).toFixed(2)}</td>
                  <td>${Number(invoice.amount_paid || 0).toFixed(2)}</td>
                  <td>${Number(invoice.amount_due || 0).toFixed(2)}</td>
                  <td>
                    <Link href={`/admin/billing/invoices/${invoice.id}`} className="tbl-link">
                      Open →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
