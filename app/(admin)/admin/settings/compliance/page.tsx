"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ShieldCheck, ShieldAlert, ToggleLeft, ToggleRight } from "lucide-react";

type ComplianceRule = {
  id: string;
  organization_id: string;
  rule_code: string;
  rule_name: string;
  category: string;
  jurisdiction: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string | null;
  is_enabled: boolean;
  effective_date: string;
};

export default function ComplianceSettingsPage() {
  const [rows, setRows] = useState<ComplianceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState("");
  const [enabledFilter, setEnabledFilter] = useState("");
  const [jurisdictionFilter, setJurisdictionFilter] = useState("");

  const [newRule, setNewRule] = useState({
    organization_id: "",
    rule_code: "",
    rule_name: "",
    category: "",
    jurisdiction: "US",
    severity: "medium",
    description: "",
  });

  async function loadRules() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", "300");
      if (categoryFilter) params.set("category", categoryFilter);
      if (enabledFilter) params.set("enabled", enabledFilter);
      if (jurisdictionFilter) params.set("jurisdiction", jurisdictionFilter);

      const response = await fetch(`/api/compliance-rules?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load compliance rules.");
      }
      setRows(payload.data || []);
      if (!newRule.organization_id && payload.data?.[0]?.organization_id) {
        setNewRule((prev) => ({
          ...prev,
          organization_id: payload.data[0].organization_id,
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load compliance rules.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter, enabledFilter, jurisdictionFilter]);

  const enabledCount = useMemo(
    () => rows.filter((row) => row.is_enabled).length,
    [rows],
  );
  const disabledCount = useMemo(
    () => rows.filter((row) => !row.is_enabled).length,
    [rows],
  );
  const criticalCount = useMemo(
    () => rows.filter((row) => row.severity === "critical").length,
    [rows],
  );

  async function toggleRule(row: ComplianceRule) {
    setSavingId(row.id);
    setError(null);
    try {
      const response = await fetch("/api/compliance-rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          is_enabled: !row.is_enabled,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to update rule.");
      }
      setRows((prev) =>
        prev.map((item) =>
          item.id === row.id ? { ...item, is_enabled: payload.data.is_enabled } : item,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update rule.");
    } finally {
      setSavingId(null);
    }
  }

  async function createRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      const response = await fetch("/api/compliance-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newRule,
          description: newRule.description || null,
          is_enabled: true,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to create rule.");
      }
      setNewRule((prev) => ({
        ...prev,
        rule_code: "",
        rule_name: "",
        category: "",
        description: "",
      }));
      await loadRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create rule.");
    }
  }

  return (
    <main className="portal-shell">
      <PageHeader
        title="Compliance Rules"
        description="Manage regulatory controls with quick enable/disable toggles and severity markers."
      />

      <section className="kpi-grid">
        <StatCard
          label="Total Rules"
          value={`${rows.length}`}
          helper="Current filtered rules"
          accent="#1fa8c4"
          accentSoft="rgba(31,168,196,0.1)"
          icon={ShieldCheck}
        />
        <StatCard
          label="Enabled"
          value={`${enabledCount}`}
          helper="Actively enforced"
          accent="#10b981"
          accentSoft="rgba(16,185,129,0.1)"
          icon={ToggleRight}
        />
        <StatCard
          label="Disabled"
          value={`${disabledCount}`}
          helper="Temporarily bypassed"
          accent="#6366f1"
          accentSoft="rgba(99,102,241,0.1)"
          icon={ToggleLeft}
        />
        <StatCard
          label="Critical"
          value={`${criticalCount}`}
          helper="Highest impact rules"
          accent="#e05060"
          accentSoft="rgba(224,80,96,0.1)"
          icon={ShieldAlert}
        />
      </section>

      <section className="detail-card glass-card section-spaced">
        <h2>Filters</h2>
        <div className="filter-row" style={{ marginTop: "0.75rem" }}>
          <label>
            Category
            <input
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              placeholder="privacy, licensing, underwriting..."
            />
          </label>
          <label>
            Enabled
            <select
              value={enabledFilter}
              onChange={(event) => setEnabledFilter(event.target.value)}
            >
              <option value="">All</option>
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </label>
          <label>
            Jurisdiction
            <input
              value={jurisdictionFilter}
              onChange={(event) => setJurisdictionFilter(event.target.value)}
              placeholder="US / CA / TX ..."
            />
          </label>
        </div>
      </section>

      <section className="dashboard-grid section-spaced">
        <article className="detail-card glass-card">
          <h2>Create Rule</h2>
          <form className="app-form" onSubmit={createRule}>
            <label>
              Organization ID
              <input
                value={newRule.organization_id}
                onChange={(event) =>
                  setNewRule((prev) => ({ ...prev, organization_id: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Rule Code
              <input
                value={newRule.rule_code}
                onChange={(event) =>
                  setNewRule((prev) => ({ ...prev, rule_code: event.target.value }))
                }
                placeholder="UW-CA-001"
                required
              />
            </label>
            <label>
              Rule Name
              <input
                value={newRule.rule_name}
                onChange={(event) =>
                  setNewRule((prev) => ({ ...prev, rule_name: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Category
              <input
                value={newRule.category}
                onChange={(event) =>
                  setNewRule((prev) => ({ ...prev, category: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Jurisdiction
              <input
                value={newRule.jurisdiction}
                onChange={(event) =>
                  setNewRule((prev) => ({ ...prev, jurisdiction: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Severity
              <select
                value={newRule.severity}
                onChange={(event) =>
                  setNewRule((prev) => ({
                    ...prev,
                    severity: event.target.value as "low" | "medium" | "high" | "critical",
                  }))
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </label>
            <label>
              Description
              <input
                value={newRule.description}
                onChange={(event) =>
                  setNewRule((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </label>
            <div className="row-actions">
              <button className="btn btn-primary" type="submit">
                Add Rule
              </button>
            </div>
          </form>
        </article>
      </section>

      {error ? <p className="inline-error">{error}</p> : null}

      <section className="table-wrap glass-card section-spaced">
        <table className="data-table">
          <thead>
            <tr>
              <th>Rule Code</th>
              <th>Rule Name</th>
              <th>Category</th>
              <th>Jurisdiction</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Effective Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="loading-row">
                <td colSpan={8} style={{ textAlign: "center", padding: "2rem" }}>
                  Loading compliance rules...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="empty-state">No rules found.</div>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td style={{ fontWeight: 600 }}>{row.rule_code}</td>
                  <td>{row.rule_name}</td>
                  <td>{row.category}</td>
                  <td>{row.jurisdiction}</td>
                  <td>
                    <StatusBadge status={row.severity} />
                  </td>
                  <td>
                    <StatusBadge status={row.is_enabled ? "active" : "cancelled"} />
                  </td>
                  <td>{row.effective_date}</td>
                  <td>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => toggleRule(row)}
                      disabled={savingId === row.id}
                    >
                      {savingId === row.id
                        ? "Saving..."
                        : row.is_enabled
                          ? "Disable"
                          : "Enable"}
                    </button>
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
