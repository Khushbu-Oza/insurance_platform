"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";

type InvoicePayment = {
  id: string;
  amount: number;
  payment_date: string;
  status: string;
  payment_method: string;
  payment_type: string;
  reference_no: string | null;
  created_at: string;
};

type InvoiceDetail = {
  id: string;
  organization_id: string;
  policy_id: string;
  invoice_number: string;
  status: string;
  billing_period_start: string;
  billing_period_end: string;
  issue_date: string;
  due_date: string;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  created_at: string;
  policies?: { id: string; policy_number: string; status: string } | null;
  payments?: InvoicePayment[];
};

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState("ach");
  const [referenceNo, setReferenceNo] = useState("");
  const [paymentDate, setPaymentDate] = useState("");

  async function loadInvoice() {
    if (!params.id) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/billing?invoice_id=${params.id}&limit=1`, {
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load invoice.");
      }
      const row = (payload.data || [])[0] || null;
      setInvoice(row);
      if (row && !amount) {
        setAmount(Number(row.amount_due || 0));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invoice.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const sortedPayments = useMemo(
    () =>
      [...(invoice?.payments || [])].sort((a, b) =>
        b.payment_date.localeCompare(a.payment_date),
      ),
    [invoice?.payments],
  );

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!invoice) return;

    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_id: invoice.organization_id,
          invoice_id: invoice.id,
          amount,
          payment_date: paymentDate || undefined,
          payment_method: method,
          payment_type: "premium",
          status: "posted",
          reference_no: referenceNo || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to post payment.");
      }

      setAmount(0);
      setReferenceNo("");
      await loadInvoice();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post payment.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="portal-shell">
        <p>Loading invoice...</p>
      </main>
    );
  }

  if (!invoice) {
    return (
      <main className="portal-shell">
        <p className="inline-error">{error || "Invoice not found."}</p>
        <Link className="btn btn-secondary" href="/admin/billing">
          Back to billing
        </Link>
      </main>
    );
  }

  return (
    <main className="portal-shell">
      <PageHeader
        title={invoice.invoice_number}
        description={`Policy: ${invoice.policies?.policy_number || invoice.policy_id}`}
        actions={
          <Link className="btn btn-secondary" href="/admin/billing">
            Back to Billing
          </Link>
        }
      />

      <section className="kpi-grid">
        <StatCard
          label="Invoice Status"
          value={invoice.status}
          helper={`Due ${invoice.due_date}`}
        />
        <StatCard
          label="Total Amount"
          value={`$${Number(invoice.total_amount || 0).toFixed(2)}`}
          helper="Original invoice amount"
        />
        <StatCard
          label="Amount Paid"
          value={`$${Number(invoice.amount_paid || 0).toFixed(2)}`}
          helper="Posted payments"
        />
        <StatCard
          label="Outstanding"
          value={`$${Number(invoice.amount_due || 0).toFixed(2)}`}
          helper="Balance remaining"
        />
      </section>

      <section className="section-spaced">
        <StatusBadge status={invoice.status} />
      </section>

      {error ? <p className="inline-error">{error}</p> : null}

      <section className="dashboard-grid section-spaced">
        <article className="detail-card glass-card">
          <h2>Invoice Details</h2>
          <p>Billing Period Start: {invoice.billing_period_start}</p>
          <p>Billing Period End: {invoice.billing_period_end}</p>
          <p>Issue Date: {invoice.issue_date}</p>
          <p>Due Date: {invoice.due_date}</p>
        </article>

        <article className="detail-card glass-card">
          <h2>Record Payment</h2>
          <form className="app-form" onSubmit={submitPayment}>
            <label>
              Amount
              <input
                type="number"
                min={0.01}
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(Number(event.target.value))}
                required
              />
            </label>
            <label>
              Method
              <select value={method} onChange={(event) => setMethod(event.target.value)}>
                <option value="ach">ACH</option>
                <option value="card">Card</option>
                <option value="check">Check</option>
                <option value="wire">Wire</option>
                <option value="cash">Cash</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              Payment Date (optional)
              <input
                type="date"
                value={paymentDate}
                onChange={(event) => setPaymentDate(event.target.value)}
              />
            </label>
            <label>
              Reference # (optional)
              <input
                value={referenceNo}
                onChange={(event) => setReferenceNo(event.target.value)}
                placeholder="ACH trace / check #"
              />
            </label>
            <div className="row-actions">
              <button
                className="btn btn-primary"
                type="submit"
                disabled={saving || invoice.status === "paid" || invoice.status === "void"}
              >
                {saving ? "Posting..." : "Post Payment"}
              </button>
            </div>
          </form>
        </article>
      </section>

      <section className="table-wrap glass-card section-spaced">
        <table className="data-table">
          <thead>
            <tr>
              <th>Payment Date</th>
              <th>Status</th>
              <th>Method</th>
              <th>Type</th>
              <th>Reference</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {sortedPayments.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="empty-state">No payments recorded for this invoice.</div>
                </td>
              </tr>
            ) : (
              sortedPayments.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.payment_date}</td>
                  <td>
                    <StatusBadge status={payment.status} />
                  </td>
                  <td>{payment.payment_method}</td>
                  <td>{payment.payment_type}</td>
                  <td>{payment.reference_no || "—"}</td>
                  <td style={{ fontWeight: 600 }}>${Number(payment.amount).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
