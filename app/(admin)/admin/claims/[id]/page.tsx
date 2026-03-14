"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";

type ClaimDetail = {
  id: string;
  claim_number: string;
  status: string;
  incident_date: string;
  reported_date: string;
  loss_description: string;
  loss_location: string | null;
  severity: "low" | "medium" | "high" | "critical";
  reserve_amount: number;
  incurred_amount: number;
  paid_amount: number;
  policy_id: string;
  adjuster_user_id: string | null;
  policies?: { id: string; policy_number: string; status: string } | null;
  claim_notes?: Array<{
    id: string;
    note: string;
    visibility: "internal" | "external";
    created_at: string;
  }>;
  claim_payments?: Array<{
    id: string;
    amount: number;
    payment_date: string;
    payment_type: "indemnity" | "expense" | "medical";
    status: "pending" | "issued" | "cleared" | "void";
    payee_name: string;
    reference_no: string | null;
    created_at: string;
  }>;
  claim_documents?: Array<{
    id: string;
    file_name: string;
    file_path: string;
    mime_type: string | null;
    created_at: string;
  }>;
};

const NEXT_STATUS_MAP: Record<string, string | null> = {
  open: "investigating",
  investigating: "settled",
  settled: "closed",
  closed: null,
};

export default function ClaimDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [claim, setClaim] = useState<ClaimDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentPayee, setPaymentPayee] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [documentPath, setDocumentPath] = useState("");

  useEffect(() => {
    async function loadClaim() {
      try {
        const response = await fetch(`/api/claims/${params.id}`, { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "Failed to load claim.");
        }
        setClaim(payload.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load claim.");
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      loadClaim();
    }
  }, [params.id]);

  const timeline = useMemo(() => {
    if (!claim) return [];

    const notes =
      claim.claim_notes?.map((item) => ({
        id: item.id,
        type: "note",
        label: item.note,
        created_at: item.created_at,
      })) || [];
    const payments =
      claim.claim_payments?.map((item) => ({
        id: item.id,
        type: "payment",
        label: `${item.payee_name} - $${Number(item.amount).toFixed(2)} (${item.status})`,
        created_at: item.created_at,
      })) || [];
    const documents =
      claim.claim_documents?.map((item) => ({
        id: item.id,
        type: "document",
        label: item.file_name,
        created_at: item.created_at,
      })) || [];

    return [...notes, ...payments, ...documents].sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    );
  }, [claim]);

  async function patchClaim(payload: Record<string, unknown>) {
    if (!claim) return;

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/claims/${claim.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to update claim.");
      }
      setClaim(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update claim.");
    } finally {
      setSaving(false);
    }
  }

  async function submitNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!noteText.trim()) return;
    await patchClaim({ new_note: { note: noteText, visibility: "internal" } });
    setNoteText("");
  }

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!paymentAmount || !paymentPayee.trim()) return;
    await patchClaim({
      new_payment: {
        amount: paymentAmount,
        payee_name: paymentPayee,
        payment_type: "indemnity",
        status: "pending",
      },
      paid_amount: Number((claim?.paid_amount || 0) + paymentAmount),
    });
    setPaymentAmount(0);
    setPaymentPayee("");
  }

  async function submitDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!documentName.trim() || !documentPath.trim()) return;
    await patchClaim({
      new_document: {
        file_name: documentName,
        file_path: documentPath,
      },
    });
    setDocumentName("");
    setDocumentPath("");
  }

  if (loading) {
    return (
      <main className="portal-shell">
        <p>Loading claim...</p>
      </main>
    );
  }

  if (!claim) {
    return (
      <main className="portal-shell">
        <p className="inline-error">{error || "Claim not found."}</p>
        <Link href="/admin/claims">Back to claims</Link>
      </main>
    );
  }

  const nextStatus = NEXT_STATUS_MAP[claim.status];

  return (
    <main className="portal-shell">
      <PageHeader
        title={claim.claim_number}
        description={`Policy: ${claim.policies?.policy_number || claim.policy_id}`}
        actions={
          <>
            <Link className="btn btn-secondary" href="/admin/claims">
              Back
            </Link>
            {nextStatus ? (
              <button
                className="btn btn-primary"
                onClick={() => patchClaim({ status: nextStatus })}
                disabled={saving}
              >
                {saving ? "Updating..." : `Move to ${nextStatus}`}
              </button>
            ) : null}
            <button className="btn btn-secondary" onClick={() => router.refresh()}>
              Refresh
            </button>
          </>
        }
      />

      <section className="kpi-grid">
        <StatCard label="Status" value={claim.status} helper="Current workflow stage" />
        <StatCard
          label="Reserve"
          value={`$${Number(claim.reserve_amount || 0).toFixed(2)}`}
          helper="Current reserve amount"
        />
        <StatCard
          label="Paid"
          value={`$${Number(claim.paid_amount || 0).toFixed(2)}`}
          helper="Payments issued"
        />
        <StatCard label="Severity" value={claim.severity} helper="Loss classification" />
      </section>

      <div className="section-spaced">
        <StatusBadge status={claim.status} />
      </div>

      {error ? <p className="inline-error">{error}</p> : null}

      <section className="detail-grid section-spaced">
        <article className="detail-card glass-card">
          <h2>Incident Summary</h2>
          <p>Incident Date: {claim.incident_date}</p>
          <p>Reported Date: {claim.reported_date}</p>
          <p>Location: {claim.loss_location || "N/A"}</p>
          <p>Description: {claim.loss_description}</p>
        </article>

        <article className="detail-card glass-card">
          <h2>Timeline</h2>
          {!timeline.length ? (
            <p>No notes, payments, or documents yet.</p>
          ) : (
            <ul className="list-stack">
              {timeline.map((item) => (
                <li key={`${item.type}-${item.id}`}>
                  <strong>{item.type}</strong> - {item.label}
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className="dashboard-grid section-spaced">
        <article className="detail-card glass-card">
          <h2>Add Note</h2>
          <form className="app-form" onSubmit={submitNote}>
            <label>
              Internal Note
              <input
                value={noteText}
                onChange={(event) => setNoteText(event.target.value)}
                placeholder="Investigation update..."
                required
              />
            </label>
            <div className="row-actions">
              <button className="btn btn-primary" type="submit" disabled={saving}>
                Save Note
              </button>
            </div>
          </form>
        </article>

        <article className="detail-card glass-card">
          <h2>Add Payment</h2>
          <form className="app-form" onSubmit={submitPayment}>
            <label>
              Amount
              <input
                type="number"
                min={0}
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(Number(event.target.value))}
                required
              />
            </label>
            <label>
              Payee Name
              <input
                value={paymentPayee}
                onChange={(event) => setPaymentPayee(event.target.value)}
                required
              />
            </label>
            <div className="row-actions">
              <button className="btn btn-primary" type="submit" disabled={saving}>
                Add Payment
              </button>
            </div>
          </form>
        </article>
      </section>

      <section className="detail-card glass-card section-spaced">
        <h2>Add Document</h2>
        <form className="app-form" onSubmit={submitDocument}>
          <label>
            File Name
            <input
              value={documentName}
              onChange={(event) => setDocumentName(event.target.value)}
              placeholder="damage-photo.jpg"
              required
            />
          </label>
          <label>
            File Path
            <input
              value={documentPath}
              onChange={(event) => setDocumentPath(event.target.value)}
              placeholder="claims/2026/03/damage-photo.jpg"
              required
            />
          </label>
          <div className="row-actions">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              Add Document
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
