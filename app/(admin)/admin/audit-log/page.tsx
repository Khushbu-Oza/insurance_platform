"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { FileText, ShieldAlert, UserCheck, Activity } from "lucide-react";

type AuditRow = {
  id: string;
  actor_user_id: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export default function AuditLogPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [actorUserId, setActorUserId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    async function loadLogs() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set("limit", "300");
        if (entityType) params.set("entity_type", entityType);
        if (action) params.set("action", action);
        if (actorUserId) params.set("actor_user_id", actorUserId);
        if (dateFrom) params.set("date_from", dateFrom);
        if (dateTo) params.set("date_to", dateTo);

        const response = await fetch(`/api/audit-logs?${params.toString()}`, {
          cache: "no-store",
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "Failed to load audit logs.");
        }
        setRows(payload.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load audit logs.");
      } finally {
        setLoading(false);
      }
    }

    loadLogs();
  }, [entityType, action, actorUserId, dateFrom, dateTo]);

  const uniqueActors = useMemo(
    () => new Set(rows.map((row) => row.actor_user_id).filter(Boolean)).size,
    [rows],
  );
  const uniqueEntities = useMemo(
    () => new Set(rows.map((row) => row.entity_type)).size,
    [rows],
  );
  const uniqueActions = useMemo(
    () => new Set(rows.map((row) => row.action)).size,
    [rows],
  );

  return (
    <main className="portal-shell">
      <PageHeader
        title="Audit Log"
        description="Immutable activity timeline across policy, claims, billing, and admin actions."
      />

      <section className="kpi-grid">
        <StatCard
          label="Events"
          value={`${rows.length}`}
          helper="Current filtered records"
          accent="#1fa8c4"
          accentSoft="rgba(31,168,196,0.1)"
          icon={FileText}
        />
        <StatCard
          label="Actors"
          value={`${uniqueActors}`}
          helper="Unique user IDs"
          accent="#6366f1"
          accentSoft="rgba(99,102,241,0.1)"
          icon={UserCheck}
        />
        <StatCard
          label="Entity Types"
          value={`${uniqueEntities}`}
          helper="Touched domain objects"
          accent="#f59e0b"
          accentSoft="rgba(245,158,11,0.1)"
          icon={ShieldAlert}
        />
        <StatCard
          label="Action Types"
          value={`${uniqueActions}`}
          helper="Create/update/delete variants"
          accent="#10b981"
          accentSoft="rgba(16,185,129,0.1)"
          icon={Activity}
        />
      </section>

      <section className="detail-card glass-card section-spaced">
        <h2>Filters</h2>
        <div className="filter-row" style={{ marginTop: "0.75rem" }}>
          <label>
            Entity Type
            <input
              value={entityType}
              onChange={(event) => setEntityType(event.target.value)}
              placeholder="policies / claims / invoices"
            />
          </label>
          <label>
            Action
            <input
              value={action}
              onChange={(event) => setAction(event.target.value)}
              placeholder="insert / update / delete"
            />
          </label>
          <label>
            Actor User ID
            <input
              value={actorUserId}
              onChange={(event) => setActorUserId(event.target.value)}
              placeholder="auth user uuid"
            />
          </label>
          <label>
            Date From
            <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </label>
          <label>
            Date To
            <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </label>
        </div>
      </section>

      {error ? <p className="inline-error">{error}</p> : null}

      <section className="table-wrap glass-card section-spaced">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Actor User</th>
              <th>Entity Type</th>
              <th>Entity ID</th>
              <th>Action</th>
              <th>Metadata</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="loading-row">
                <td colSpan={6} style={{ textAlign: "center", padding: "2rem" }}>
                  Loading audit events...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="empty-state">No audit events found.</div>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.created_at}</td>
                  <td>{row.actor_user_id || "system"}</td>
                  <td>{row.entity_type}</td>
                  <td>{row.entity_id}</td>
                  <td>{row.action}</td>
                  <td>
                    <code style={{ fontSize: "0.7rem" }}>
                      {JSON.stringify(row.metadata || {})}
                    </code>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
