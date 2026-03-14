"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";

type PolicyDetail = {
  id: string;
  policy_number: string;
  status: string;
  product: string | null;
  written_premium: number;
  effective_date: string | null;
  expiration_date: string | null;
  policyholders?: { full_name: string; email: string | null } | null;
  agents?: { full_name: string; email: string | null } | null;
  coverages?: Array<{
    id: string;
    coverage_name: string;
    limit_amount: number;
    deductible_amount: number;
    premium_amount: number;
  }>;
  endorsements?: Array<{
    id: string;
    endorsement_number: string;
    description: string;
    status: string;
    premium_change: number;
  }>;
};

const NEXT_STATUS_MAP: Record<string, string | null> = {
  quote: "bound",
  bound: "active",
  active: "expired",
  expired: null,
  cancelled: null,
};

type TabKey = "overview" | "coverage" | "endorsements";

export default function PolicyDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [policy, setPolicy] = useState<PolicyDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<TabKey>("overview");

  useEffect(() => {
    async function loadPolicy() {
      try {
        const response = await fetch(`/api/policies/${params.id}`, { cache: "no-store" });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "Failed to load policy.");
        }

        setPolicy(payload.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load policy.");
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      loadPolicy();
    }
  }, [params.id]);

  async function updateStatus(status: string) {
    if (!policy) return;

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/policies/${policy.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to update status.");
      }
      setPolicy(payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="portal-shell">
        <p>Loading policy...</p>
      </main>
    );
  }

  if (!policy) {
    return (
      <main className="portal-shell">
        <p className="inline-error">{error || "Policy not found."}</p>
        <Link href="/admin/policies">Back to policies</Link>
      </main>
    );
  }

  const nextStatus = NEXT_STATUS_MAP[policy.status];

  return (
    <main className="portal-shell">
      <PageHeader
        title={policy.policy_number}
        description={`Product: ${policy.product || "N/A"}`}
        actions={
          <>
            <Link className="btn btn-secondary" href="/admin/policies">
              Back
            </Link>
            {nextStatus ? (
              <button
                className="btn btn-primary"
                onClick={() => updateStatus(nextStatus)}
                disabled={saving}
              >
                {saving ? "Updating..." : `Move to ${nextStatus}`}
              </button>
            ) : null}
            {policy.status !== "cancelled" ? (
              <button
                className="btn btn-secondary"
                onClick={() => updateStatus("cancelled")}
                disabled={saving}
              >
                Cancel Policy
              </button>
            ) : null}
            <button className="btn btn-secondary" onClick={() => router.refresh()}>
              Refresh
            </button>
          </>
        }
      />

      <div className="section-spaced">
        <StatusBadge status={policy.status} />
      </div>

      {error ? <p className="inline-error">{error}</p> : null}

      <section className="detail-card glass-card section-spaced">
        <div className="row-actions">
          <button className="btn btn-secondary" onClick={() => setTab("overview")}>
            Overview
          </button>
          <button className="btn btn-secondary" onClick={() => setTab("coverage")}>
            Coverage
          </button>
          <button className="btn btn-secondary" onClick={() => setTab("endorsements")}>
            Endorsements
          </button>
        </div>

        {tab === "overview" ? (
          <section className="detail-grid section-spaced">
            <article className="detail-card glass-card">
              <h2>Policy Info</h2>
              <p>Premium: ${Number(policy.written_premium || 0).toFixed(2)}</p>
              <p>Effective: {policy.effective_date || "N/A"}</p>
              <p>Expiration: {policy.expiration_date || "N/A"}</p>
            </article>

            <article className="detail-card glass-card">
              <h2>Parties</h2>
              <p>Policyholder: {policy.policyholders?.full_name || "N/A"}</p>
              <p>Policyholder Email: {policy.policyholders?.email || "N/A"}</p>
              <p>Agent: {policy.agents?.full_name || "N/A"}</p>
              <p>Agent Email: {policy.agents?.email || "N/A"}</p>
            </article>
          </section>
        ) : null}

        {tab === "coverage" ? (
          <section className="detail-card glass-card section-spaced">
            <h2>Coverage Lines</h2>
            {!policy.coverages?.length ? (
              <p>No coverages added.</p>
            ) : (
              <ul className="list-stack">
                {policy.coverages.map((coverage) => (
                  <li key={coverage.id}>
                    {coverage.coverage_name} | Limit ${coverage.limit_amount} | Deductible $
                    {coverage.deductible_amount} | Premium ${coverage.premium_amount}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {tab === "endorsements" ? (
          <section className="detail-card glass-card section-spaced">
            <h2>Endorsements</h2>
            {!policy.endorsements?.length ? (
              <p>No endorsements available.</p>
            ) : (
              <ul className="list-stack">
                {policy.endorsements.map((endorsement) => (
                  <li key={endorsement.id}>
                    {endorsement.endorsement_number} | {endorsement.status} | $
                    {endorsement.premium_change} | {endorsement.description}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </section>
    </main>
  );
}
