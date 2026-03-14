"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { FileWarning, FolderCheck, DollarSign, AlertTriangle } from "lucide-react";

type ClaimRow = {
  id: string;
  claim_number: string;
  status: string;
  incident_date: string;
  reported_date: string;
  severity: "low" | "medium" | "high" | "critical";
  reserve_amount: number;
  incurred_amount: number;
  paid_amount: number;
  policy_id: string;
  adjuster_user_id: string | null;
  policies?: { policy_number: string } | null;
};

export default function ClaimsPage() {
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState("");
  const [policyId, setPolicyId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    async function loadClaims() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("limit", "100");
        if (status) params.set("status", status);
        if (policyId) params.set("policy_id", policyId);
        if (dateFrom) params.set("date_from", dateFrom);
        if (dateTo) params.set("date_to", dateTo);

        const response = await fetch(`/api/claims?${params.toString()}`, {
          cache: "no-store",
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "Failed to load claims.");
        }

        setClaims(payload.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load claims.");
      } finally {
        setLoading(false);
      }
    }

    loadClaims();
  }, [status, policyId, dateFrom, dateTo]);

  const openCount = useMemo(
    () =>
      claims.filter((c) => c.status === "open" || c.status === "investigating").length,
    [claims],
  );

  const settledCount = useMemo(
    () => claims.filter((c) => c.status === "settled" || c.status === "closed").length,
    [claims],
  );

  const totalReserve = useMemo(
    () => claims.reduce((sum, c) => sum + Number(c.reserve_amount || 0), 0),
    [claims],
  );

  return (
    <main className="portal-shell">
      <PageHeader
        title="Claims Management"
        description="Manage claims from FNOL intake through investigation and settlement."
        actions={
          <Link className="btn btn-primary" href="/admin/claims/new">
            + File New Claim
          </Link>
        }
      />

      <section className="kpi-grid">
        <StatCard
          label="Total Claims"
          value={`${claims.length}`}
          helper="Current filtered claims"
          accent="#f59e0b"
          accentSoft="rgba(245,158,11,0.1)"
          icon={FileWarning}
        />
        <StatCard
          label="Open / Investigating"
          value={`${openCount}`}
          helper="Active handling queue"
          accent="#e05060"
          accentSoft="rgba(224,80,96,0.1)"
          icon={AlertTriangle}
        />
        <StatCard
          label="Settled / Closed"
          value={`${settledCount}`}
          helper="Resolved claims"
          accent="#10b981"
          accentSoft="rgba(16,185,129,0.1)"
          icon={FolderCheck}
        />
        <StatCard
          label="Total Reserve"
          value={`$${totalReserve.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          helper="Reserved exposure"
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
              <option value="open">Open</option>
              <option value="investigating">Investigating</option>
              <option value="settled">Settled</option>
              <option value="closed">Closed</option>
            </select>
          </label>

          <label>
            Policy ID
            <input
              value={policyId}
              onChange={(e) => setPolicyId(e.target.value)}
              placeholder="policy uuid"
            />
          </label>

          <label>
            Incident From
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </label>

          <label>
            Incident To
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
                <th>Claim #</th>
                <th>Status</th>
                <th>Policy #</th>
                <th>Incident Date</th>
                <th>Severity</th>
                <th>Reserve</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="loading-row">
                  <td colSpan={7} style={{ textAlign: "center", padding: "2rem" }}>
                    Loading claims…
                  </td>
                </tr>
              ) : claims.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">No claims match the current filters.</div>
                  </td>
                </tr>
              ) : (
                claims.map((claim) => (
                  <tr key={claim.id}>
                    <td style={{ fontWeight: 600 }}>{claim.claim_number}</td>
                    <td>
                      <StatusBadge status={claim.status} />
                    </td>
                    <td>{claim.policies?.policy_number || claim.policy_id}</td>
                    <td>{claim.incident_date}</td>
                    <td>
                      <span className={`severity-dot severity-${claim.severity}`}>
                        {claim.severity}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      ${Number(claim.reserve_amount || 0).toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td>
                      <Link href={`/admin/claims/${claim.id}`} className="tbl-link">
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
