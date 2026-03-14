"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ShieldCheck, DollarSign, BarChart2 } from "lucide-react";

type QueuePolicy = {
  id: string;
  policy_number: string;
  status: string;
  product: string | null;
  written_premium: number;
  created_at: string;
};

export default function UnderwritingQueuePage() {
  const [items, setItems] = useState<QueuePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadQueue() {
      try {
        const response = await fetch("/api/policies?status=quote&limit=100", {
          cache: "no-store",
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "Failed to load underwriting queue.");
        }
        setItems(payload.data || []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load underwriting queue.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadQueue();
  }, []);

  const totalPremiumInQueue = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.written_premium || 0), 0),
    [items],
  );

  const avgPremiumInQueue = useMemo(() => {
    if (!items.length) return 0;
    return totalPremiumInQueue / items.length;
  }, [items, totalPremiumInQueue]);

  // Sort: highest premium first (priority)
  const sortedItems = useMemo(
    () => [...items].sort((a, b) => Number(b.written_premium) - Number(a.written_premium)),
    [items],
  );

  async function approveQuote(id: string) {
    setSavingId(id);
    setError(null);
    try {
      const response = await fetch(`/api/policies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "bound" }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to approve quote.");
      }
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve quote.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <main className="portal-shell">
      <PageHeader
        title="Underwriting Queue"
        description="Review pending quotes, prioritize risk, and approve bind decisions."
        actions={
          <Link href="/admin/policies" className="btn btn-secondary">
            All Policies
          </Link>
        }
      />

      <section className="kpi-grid">
        <StatCard
          label="Pending Quotes"
          value={`${items.length}`}
          helper="Awaiting approval"
          accent="#f59e0b"
          accentSoft="rgba(245,158,11,0.1)"
          icon={ShieldCheck}
        />
        <StatCard
          label="Total Premium"
          value={`$${totalPremiumInQueue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          helper="Quote pipeline value"
          accent="#1fa8c4"
          accentSoft="rgba(31,168,196,0.1)"
          icon={DollarSign}
        />
        <StatCard
          label="Average Premium"
          value={`$${avgPremiumInQueue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          helper="Per quote in queue"
          accent="#6366f1"
          accentSoft="rgba(99,102,241,0.1)"
          icon={BarChart2}
        />
      </section>

      {error ? <p className="inline-error">{error}</p> : null}

      {!error ? (
        <div className="table-wrap glass-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Policy #</th>
                <th>Product</th>
                <th>Status</th>
                <th>Premium</th>
                <th>Priority</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="loading-row">
                  <td colSpan={6} style={{ textAlign: "center", padding: "2rem" }}>
                    Loading queue…
                  </td>
                </tr>
              ) : sortedItems.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">No quotes pending underwriting. 🎉</div>
                  </td>
                </tr>
              ) : (
                sortedItems.map((item, idx) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.policy_number}</td>
                    <td>{item.product || "—"}</td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      ${Number(item.written_premium || 0).toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td>
                      {idx === 0 ? (
                        <span className="status-pill status-open">
                          Highest
                        </span>
                      ) : idx < 3 ? (
                        <span className="status-pill status-investigating">
                          High
                        </span>
                      ) : (
                        <span className="status-pill status-settled">
                          Normal
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => approveQuote(item.id)}
                          disabled={savingId === item.id}
                        >
                          {savingId === item.id ? "Binding…" : "Approve"}
                        </button>
                        <Link
                          href={`/admin/policies/${item.id}`}
                          className="btn btn-secondary btn-sm"
                        >
                          Review
                        </Link>
                      </div>
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
