"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Banknote, CircleDollarSign, Clock3, Users } from "lucide-react";

type CommissionRow = {
  id: string;
  agent_id: string;
  policy_id: string;
  invoice_id: string | null;
  commission_rate: number;
  written_premium: number;
  amount: number;
  status: string;
  earned_date: string;
  paid_date: string | null;
  agents?: { id: string; full_name: string } | null;
  policies?: { id: string; policy_number: string } | null;
  invoices?: { id: string; invoice_number: string; due_date: string; status: string } | null;
};

export default function BillingCommissionsPage() {
  const [rows, setRows] = useState<CommissionRow[]>([]);
  const [status, setStatus] = useState("");
  const [agentId, setAgentId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRows() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set("resource", "commissions");
        params.set("limit", "300");
        if (status) params.set("status", status);
        if (agentId) params.set("agent_id", agentId);
        if (dateFrom) params.set("date_from", dateFrom);
        if (dateTo) params.set("date_to", dateTo);

        const response = await fetch(`/api/billing?${params.toString()}`, {
          cache: "no-store",
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "Failed to load commissions.");
        }

        setRows(payload.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load commissions.");
      } finally {
        setLoading(false);
      }
    }

    loadRows();
  }, [status, agentId, dateFrom, dateTo]);

  const totalCommission = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    [rows],
  );
  const pendingCommission = useMemo(
    () =>
      rows
        .filter((row) => row.status === "pending" || row.status === "approved")
        .reduce((sum, row) => sum + Number(row.amount || 0), 0),
    [rows],
  );
  const paidCommission = useMemo(
    () =>
      rows
        .filter((row) => row.status === "paid")
        .reduce((sum, row) => sum + Number(row.amount || 0), 0),
    [rows],
  );

  const uniqueAgents = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((row) => {
      if (row.agent_id) map.set(row.agent_id, row.agents?.full_name || row.agent_id);
    });
    return [...map.entries()];
  }, [rows]);

  return (
    <main className="portal-shell">
      <PageHeader
        title="Commission Report"
        description="Earned, pending, and paid agent commissions by policy and invoice."
        actions={
          <Link className="btn btn-secondary" href="/admin/billing">
            Back to Billing
          </Link>
        }
      />

      <section className="kpi-grid">
        <StatCard
          label="Total Commission"
          value={`$${totalCommission.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          helper="All records in current view"
          accent="#1fa8c4"
          accentSoft="rgba(31,168,196,0.1)"
          icon={CircleDollarSign}
        />
        <StatCard
          label="Pending / Approved"
          value={`$${pendingCommission.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          helper="Not yet paid"
          accent="#f59e0b"
          accentSoft="rgba(245,158,11,0.1)"
          icon={Clock3}
        />
        <StatCard
          label="Paid"
          value={`$${paidCommission.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          helper="Settled commissions"
          accent="#10b981"
          accentSoft="rgba(16,185,129,0.1)"
          icon={Banknote}
        />
        <StatCard
          label="Agents"
          value={`${uniqueAgents.length}`}
          helper="Agents with commission records"
          accent="#6366f1"
          accentSoft="rgba(99,102,241,0.1)"
          icon={Users}
        />
      </section>

      <section className="detail-card glass-card section-spaced">
        <h2>Filters</h2>
        <div className="filter-row" style={{ marginTop: "0.75rem" }}>
          <label>
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="void">Void</option>
            </select>
          </label>

          <label>
            Agent
            <select value={agentId} onChange={(event) => setAgentId(event.target.value)}>
              <option value="">All agents</option>
              {uniqueAgents.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Earned From
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </label>

          <label>
            Earned To
            <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </label>
        </div>
      </section>

      {error ? <p className="inline-error">{error}</p> : null}

      <section className="table-wrap glass-card section-spaced">
        <table className="data-table">
          <thead>
            <tr>
              <th>Agent</th>
              <th>Policy</th>
              <th>Invoice</th>
              <th>Rate</th>
              <th>Written Premium</th>
              <th>Commission</th>
              <th>Status</th>
              <th>Earned Date</th>
              <th>Paid Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="loading-row">
                <td colSpan={9} style={{ textAlign: "center", padding: "2rem" }}>
                  Loading commissions...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <div className="empty-state">No commissions found.</div>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.agents?.full_name || row.agent_id}</td>
                  <td>{row.policies?.policy_number || row.policy_id}</td>
                  <td>
                    {row.invoices?.invoice_number ? (
                      <Link className="tbl-link" href={`/admin/billing/invoices/${row.invoice_id}`}>
                        {row.invoices.invoice_number}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{(Number(row.commission_rate || 0) * 100).toFixed(2)}%</td>
                  <td>${Number(row.written_premium || 0).toFixed(2)}</td>
                  <td style={{ fontWeight: 600 }}>${Number(row.amount || 0).toFixed(2)}</td>
                  <td>
                    <StatusBadge status={row.status} />
                  </td>
                  <td>{row.earned_date}</td>
                  <td>{row.paid_date || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
