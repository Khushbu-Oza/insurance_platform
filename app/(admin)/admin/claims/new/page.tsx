"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";

type PolicyOption = {
  id: string;
  organization_id: string;
  policy_number: string;
  product: string | null;
};

const COVERAGE_OPTIONS = [
  "collision",
  "comprehensive",
  "liability",
  "property_damage",
  "medical",
];

export default function NewClaimPage() {
  const router = useRouter();
  const [policies, setPolicies] = useState<PolicyOption[]>([]);
  const [loadingPolicies, setLoadingPolicies] = useState(true);
  const [organizationId, setOrganizationId] = useState("");
  const [policyId, setPolicyId] = useState("");
  const [claimNumber, setClaimNumber] = useState("");
  const [incidentDate, setIncidentDate] = useState("");
  const [lossDescription, setLossDescription] = useState("");
  const [lossLocation, setLossLocation] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [coverageSelection, setCoverageSelection] = useState<string[]>([]);
  const [reserveAmount, setReserveAmount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPolicies() {
      try {
        const response = await fetch("/api/policies?limit=100", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "Failed to load policies.");
        }
        setPolicies(payload.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load policies.");
      } finally {
        setLoadingPolicies(false);
      }
    }

    loadPolicies();
  }, []);

  useEffect(() => {
    if (!policyId) return;
    const selected = policies.find((item) => item.id === policyId);
    if (selected) {
      setOrganizationId(selected.organization_id);
    }
  }, [policyId, policies]);

  const selectedPolicy = useMemo(
    () => policies.find((item) => item.id === policyId),
    [policies, policyId],
  );

  function toggleCoverage(coverage: string) {
    setCoverageSelection((prev) =>
      prev.includes(coverage) ? prev.filter((item) => item !== coverage) : [...prev, coverage],
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_id: organizationId,
          policy_id: policyId,
          claim_number: claimNumber || undefined,
          incident_date: incidentDate,
          loss_description: lossDescription,
          loss_location: lossLocation || null,
          severity,
          reserve_amount: reserveAmount,
          coverage_selection: coverageSelection,
          metadata: { source: "fnol_admin_form" },
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to create claim.");
      }

      router.push(`/admin/claims/${payload.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create claim.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="portal-shell">
      <PageHeader
        title="FNOL Intake"
        description="Capture incident details and create a new claim from policy lookup."
        actions={
          <Link className="btn btn-secondary" href="/admin/claims">
            Back to claims
          </Link>
        }
      />

      {loadingPolicies ? <p>Loading policies for lookup...</p> : null}

      <form className="app-form glass-card section-spaced" onSubmit={onSubmit}>
        <label>
          Policy Lookup
          <select
            value={policyId}
            onChange={(event) => setPolicyId(event.target.value)}
            required
          >
            <option value="">Select policy</option>
            {policies.map((policy) => (
              <option key={policy.id} value={policy.id}>
                {policy.policy_number} {policy.product ? `(${policy.product})` : ""}
              </option>
            ))}
          </select>
        </label>

        <label>
          Organization ID
          <input value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} required />
        </label>

        <label>
          Claim Number (optional)
          <input
            value={claimNumber}
            onChange={(event) => setClaimNumber(event.target.value)}
            placeholder="Auto-generated if blank"
          />
        </label>

        <label>
          Incident Date
          <input
            type="date"
            value={incidentDate}
            onChange={(event) => setIncidentDate(event.target.value)}
            required
          />
        </label>

        <label>
          Severity
          <select value={severity} onChange={(event) => setSeverity(event.target.value)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </label>

        <label>
          Initial Reserve Amount
          <input
            type="number"
            min={0}
            value={reserveAmount}
            onChange={(event) => setReserveAmount(Number(event.target.value))}
          />
        </label>

        <label>
          Loss Location
          <input
            value={lossLocation}
            onChange={(event) => setLossLocation(event.target.value)}
            placeholder="City, State"
          />
        </label>

        <label>
          Incident Description
          <input
            value={lossDescription}
            onChange={(event) => setLossDescription(event.target.value)}
            required
          />
        </label>

        <div className="detail-card glass-card">
          <h2>Coverage Selection</h2>
          <div className="row-actions section-spaced">
            {COVERAGE_OPTIONS.map((coverage) => (
              <button
                key={coverage}
                type="button"
                className={`btn ${coverageSelection.includes(coverage) ? "btn-primary" : "btn-secondary"}`}
                onClick={() => toggleCoverage(coverage)}
              >
                {coverage}
              </button>
            ))}
          </div>
        </div>

        {selectedPolicy ? (
          <div className="rating-box">
            <strong>Selected Policy:</strong> {selectedPolicy.policy_number}
          </div>
        ) : null}

        {error ? <p className="inline-error">{error}</p> : null}

        <div className="row-actions">
          <button className="btn btn-primary" type="submit" disabled={saving || loadingPolicies}>
            {saving ? "Creating..." : "Create Claim"}
          </button>
        </div>
      </form>
    </main>
  );
}
