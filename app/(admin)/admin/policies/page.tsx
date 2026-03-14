"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ClipboardList, CheckCircle2, DollarSign, Search } from "lucide-react";

type PolicyRow = {
  id: string;
  policy_number: string;
  status: string;
  product: string | null;
  written_premium: number;
  effective_date: string | null;
  expiration_date: string | null;
  agents?: { id: string; full_name: string } | null;
  policyholders?: { id: string; full_name: string } | null;
};

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState("");
  const [product, setProduct] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    async function loadPolicies() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("limit", "100");
        if (status) params.set("status", status);
        if (product) params.set("product", product);
        if (dateFrom) params.set("date_from", dateFrom);
        if (dateTo) params.set("date_to", dateTo);

        const response = await fetch(`/api/policies?${params.toString()}`, {
          cache: "no-store",
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "Failed to load policies.");
        }

        setPolicies(payload.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load policies.");
      } finally {
        setLoading(false);
      }
    }

    loadPolicies();
  }, [status, product, dateFrom, dateTo]);

  const totalPremium = useMemo(
    () => policies.reduce((sum, p) => sum + Number(p.written_premium || 0), 0),
    [policies],
  );

  const quoteCount = useMemo(
    () => policies.filter((p) => p.status === "quote").length,
    [policies],
  );

  const activeCount = useMemo(
    () => policies.filter((p) => p.status === "active").length,
    [policies],
  );

  return (
    <main className="portal-shell">
      <PageHeader
        title="Policy Administration"
        description="Manage quote-to-bind lifecycle, policy data, and portfolio activity."
        actions={
          <Link className="btn btn-primary" href="/admin/policies/new">
            + New Quote
          </Link>
        }
      />

      <section className="kpi-grid">
        <StatCard
          label="Records"
          value={`${policies.length}`}
          helper="Active filters"
          accent="#1fa8c4"
          accentSoft="rgba(31,168,196,0.1)"
          icon={Search}
        />
        <StatCard
          label="Quotes"
          value={`${quoteCount}`}
          helper="Pending bind decisions"
          accent="#f59e0b"
          accentSoft="rgba(245,158,11,0.1)"
          icon={ClipboardList}
        />
        <StatCard
          label="Active Policies"
          value={`${activeCount}`}
          helper="In-force portfolio"
          accent="#10b981"
          accentSoft="rgba(16,185,129,0.1)"
          icon={CheckCircle2}
        />
        <StatCard
          label="Total Premium"
          value={`$${totalPremium.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          helper="Written premium sum"
          accent="#6366f1"
          accentSoft="rgba(99,102,241,0.1)"
          icon={DollarSign}
        />
      </section>

      {/* Filters */}
      <section className="detail-card glass-card section-spaced">
        <h2>Filters</h2>
        <div className="filter-row" style={{ marginTop: "0.75rem" }}>
          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="quote">Quote</option>
              <option value="bound">Bound</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>

          <label>
            Product
            <input
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="personal_auto"
            />
          </label>

          <label>
            Effective From
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </label>

          <label>
            Effective To
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </label>
        </div>
      </section>

      {error ? <p className="inline-error">{error}</p> : null}

      {!error ? (
        <div className="table-wrap glass-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Policy #</th>
                <th>Status</th>
                <th>Product</th>
                <th>Policyholder</th>
                <th>Agent</th>
                <th>Premium</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="loading-row">
                  <td colSpan={7} style={{ textAlign: "center", padding: "2rem" }}>
                    Loading policies…
                  </td>
                </tr>
              ) : policies.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      No policies match the current filters.
                    </div>
                  </td>
                </tr>
              ) : (
                policies.map((policy) => (
                  <tr key={policy.id}>
                    <td style={{ fontWeight: 600 }}>{policy.policy_number}</td>
                    <td>
                      <StatusBadge status={policy.status} />
                    </td>
                    <td>{policy.product || "—"}</td>
                    <td>{policy.policyholders?.full_name || "—"}</td>
                    <td>{policy.agents?.full_name || "—"}</td>
                    <td style={{ fontWeight: 600 }}>
                      ${Number(policy.written_premium || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                    <td>
                      <Link href={`/admin/policies/${policy.id}`} className="tbl-link">
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </main>
  );
}
