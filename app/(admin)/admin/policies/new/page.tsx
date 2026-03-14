"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { calculatePremium, RatingRule } from "@/lib/rating/engine";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";

const demoRules: RatingRule[] = [
  {
    id: "rule-young-driver",
    key: "driver_age",
    operator: "lt",
    value: 25,
    adjustmentType: "multiplier",
    adjustmentValue: 1.2,
    priority: 10,
  },
  {
    id: "rule-high-deductible-discount",
    key: "deductible",
    operator: "gte",
    value: 1000,
    adjustmentType: "flat",
    adjustmentValue: -75,
    priority: 20,
  },
];

type Step = 1 | 2 | 3 | 4;

type OrganizationOption = {
  id: string;
  name: string;
  slug: string;
};

type AgentOption = {
  id: string;
  organization_id: string;
  full_name: string;
  is_active: boolean;
};

type PolicyholderOption = {
  id: string;
  organization_id: string;
  full_name: string;
  line_of_business: string | null;
};

function createPolicyNumber() {
  const stamp = new Date().toISOString().replaceAll("-", "").replaceAll(":", "").slice(2, 14);
  const rand = Math.floor(100 + Math.random() * 900);
  return `IF-${stamp}-${rand}`;
}

function plusOneYearIso(from: string) {
  if (!from) return "";
  const d = new Date(`${from}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return "";
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

const STEP_LABELS: Record<Step, string> = {
  1: "Quote Setup",
  2: "Insured & Coverage",
  3: "Rating Inputs",
  4: "Review & Submit",
};

export default function NewPolicyPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [organizationId, setOrganizationId] = useState("");
  const [policyNumber, setPolicyNumber] = useState(createPolicyNumber());
  const [policyholderId, setPolicyholderId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [product, setProduct] = useState("personal_auto");
  const [basePremium, setBasePremium] = useState(650);
  const [driverAge, setDriverAge] = useState(30);
  const [deductible, setDeductible] = useState(500);
  const [effectiveDate, setEffectiveDate] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [bindImmediately, setBindImmediately] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [policyholders, setPolicyholders] = useState<PolicyholderOption[]>([]);

  useEffect(() => {
    async function loadOptions() {
      setLoadingOptions(true);
      setError(null);
      try {
        const response = await fetch("/api/lookups/quote-options", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "Failed to load quote options.");
        }
        setOrganizations(payload.data?.organizations || []);
        setAgents(payload.data?.agents || []);
        setPolicyholders(payload.data?.policyholders || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load quote options.");
      } finally {
        setLoadingOptions(false);
      }
    }

    loadOptions();
  }, []);

  useEffect(() => {
    if (!organizationId && organizations.length > 0) {
      setOrganizationId(organizations[0].id);
    }
  }, [organizationId, organizations]);

  useEffect(() => {
    if (!effectiveDate) return;
    if (!expirationDate) {
      setExpirationDate(plusOneYearIso(effectiveDate));
    }
  }, [effectiveDate, expirationDate]);

  const scopedAgents = useMemo(
    () => agents.filter((item) => item.organization_id === organizationId),
    [agents, organizationId],
  );
  const scopedPolicyholders = useMemo(
    () =>
      policyholders.filter((item) => item.organization_id === organizationId),
    [policyholders, organizationId],
  );

  useEffect(() => {
    if (agentId && !scopedAgents.some((item) => item.id === agentId)) {
      setAgentId("");
    }
    if (
      policyholderId &&
      !scopedPolicyholders.some((item) => item.id === policyholderId)
    ) {
      setPolicyholderId("");
    }
  }, [agentId, policyholderId, scopedAgents, scopedPolicyholders]);

  const selectedOrganization = useMemo(
    () => organizations.find((item) => item.id === organizationId) || null,
    [organizationId, organizations],
  );
  const selectedAgent = useMemo(
    () => scopedAgents.find((item) => item.id === agentId) || null,
    [agentId, scopedAgents],
  );
  const selectedPolicyholder = useMemo(
    () =>
      scopedPolicyholders.find((item) => item.id === policyholderId) || null,
    [policyholderId, scopedPolicyholders],
  );

  const ratingResult = useMemo(
    () =>
      calculatePremium(
        {
          basePremium,
          factors: {
            driver_age: driverAge,
            deductible,
          },
        },
        demoRules,
      ),
    [basePremium, deductible, driverAge],
  );

  const stepValidation = useMemo(() => {
    const step1Valid = !!organizationId && !!policyNumber.trim();
    const step2Valid =
      !!policyholderId &&
      !!agentId &&
      !!product &&
      !!effectiveDate &&
      !!expirationDate &&
      expirationDate >= effectiveDate;
    const step3Valid = basePremium > 0 && driverAge >= 16 && deductible >= 0;
    const step4Valid = step1Valid && step2Valid && step3Valid;
    return { step1Valid, step2Valid, step3Valid, step4Valid };
  }, [
    agentId,
    basePremium,
    deductible,
    driverAge,
    effectiveDate,
    expirationDate,
    organizationId,
    policyNumber,
    policyholderId,
    product,
  ]);

  function goNext() {
    setError(null);
    if (step === 1 && !stepValidation.step1Valid) {
      setError("Complete organization and policy number before moving forward.");
      return;
    }
    if (step === 2 && !stepValidation.step2Valid) {
      setError(
        "Complete insured, agent, product, and valid effective/expiration dates.",
      );
      return;
    }
    if (step === 3 && !stepValidation.step3Valid) {
      setError("Provide valid rating inputs (premium, age, deductible).");
      return;
    }
    setStep((prev) => (prev < 4 ? ((prev + 1) as Step) : prev));
  }

  function goPrev() {
    setError(null);
    setStep((prev) => (prev > 1 ? ((prev - 1) as Step) : prev));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!stepValidation.step4Valid) {
      setError("Complete all required steps before submitting.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_id: organizationId,
          policy_number: policyNumber.trim(),
          status: bindImmediately ? "bound" : "quote",
          product,
          policyholder_id: policyholderId,
          agent_id: agentId,
          written_premium: ratingResult.finalPremium,
          effective_date: effectiveDate || null,
          expiration_date: expirationDate || null,
          rating_snapshot: ratingResult,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to create quote.");
      }
      router.push(`/admin/policies/${payload.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create quote.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="portal-shell">
      <PageHeader
        title="New Quote Wizard"
        description="Follow the steps: setup, insured/coverage, rating, and final review."
        actions={
          <Link className="btn btn-secondary" href="/admin/policies">
            Back to policies
          </Link>
        }
      />

      <section className="kpi-grid">
        {[1, 2, 3, 4].map((n) => {
          const current = n as Step;
          const isActive = step === current;
          const isDone = step > current;
          return (
            <StatCard
              key={current}
              label={`Step ${current}`}
              value={isActive ? "Active" : isDone ? "Done" : "Pending"}
              helper={STEP_LABELS[current]}
              accent={isActive ? "#1fa8c4" : isDone ? "#10b981" : "#94a3b8"}
              accentSoft={
                isActive
                  ? "rgba(31,168,196,0.1)"
                  : isDone
                    ? "rgba(16,185,129,0.1)"
                    : "rgba(148,163,184,0.08)"
              }
            />
          );
        })}
      </section>

      <form className="app-form glass-card section-spaced quote-wizard-form" onSubmit={onSubmit}>
        <div className="quote-step-head">
          <h2>{STEP_LABELS[step]}</h2>
          {loadingOptions ? <p className="kpi-foot">Loading lookup options...</p> : null}
        </div>

        {step === 1 ? (
          <div className="quote-setup-grid">
            <div className="quote-setup-panel">
              <label>
                Organization
                <select
                  value={organizationId}
                  onChange={(event) => setOrganizationId(event.target.value)}
                  required
                >
                  <option value="">Select organization</option>
                  {organizations.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.slug})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Policy Number
                <input
                  value={policyNumber}
                  onChange={(event) => setPolicyNumber(event.target.value)}
                  placeholder="IF-YYYYMMDD-XXX"
                  required
                />
              </label>

              <div className="row-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setPolicyNumber(createPolicyNumber())}
                >
                  Regenerate Policy Number
                </button>
              </div>
            </div>

            <aside className="quote-setup-summary">
              <h3>Setup Summary</h3>
              <p>
                <strong>Organization:</strong> {selectedOrganization?.name || "Not selected"}
              </p>
              <p>
                <strong>Org Slug:</strong> {selectedOrganization?.slug || "N/A"}
              </p>
              <p>
                <strong>Policy Number:</strong> {policyNumber || "Not generated"}
              </p>
              <p className="kpi-foot">
                Continue to next steps to attach policyholder, agent, product, and rating inputs.
              </p>
            </aside>
          </div>
        ) : null}

        {step === 2 ? (
          <>
            <label>
              Policyholder
              <select
                value={policyholderId}
                onChange={(event) => setPolicyholderId(event.target.value)}
                required
              >
                <option value="">Select policyholder</option>
                {scopedPolicyholders.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.full_name}
                    {item.line_of_business ? ` (${item.line_of_business})` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Assigned Agent
              <select
                value={agentId}
                onChange={(event) => setAgentId(event.target.value)}
                required
              >
                <option value="">Select agent</option>
                {scopedAgents.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.full_name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Product
              <select value={product} onChange={(event) => setProduct(event.target.value)}>
                <option value="personal_auto">Personal Auto</option>
                <option value="homeowners">Homeowners</option>
              </select>
            </label>

            <label>
              Effective Date
              <input
                type="date"
                value={effectiveDate}
                onChange={(event) => setEffectiveDate(event.target.value)}
                required
              />
            </label>

            <label>
              Expiration Date
              <input
                type="date"
                value={expirationDate}
                min={effectiveDate || undefined}
                onChange={(event) => setExpirationDate(event.target.value)}
                required
              />
            </label>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <label>
              Base Premium
              <input
                type="number"
                min={1}
                step="0.01"
                value={basePremium}
                onChange={(event) => setBasePremium(Number(event.target.value))}
                required
              />
            </label>

            <label>
              Driver Age
              <input
                type="number"
                min={16}
                value={driverAge}
                onChange={(event) => setDriverAge(Number(event.target.value))}
                required
              />
            </label>

            <label>
              Deductible
              <input
                type="number"
                min={0}
                value={deductible}
                onChange={(event) => setDeductible(Number(event.target.value))}
                required
              />
            </label>

            <div className="rating-box">
              <strong>Calculated Premium: ${ratingResult.finalPremium.toFixed(2)}</strong>
              <p>Base Premium: ${ratingResult.basePremium.toFixed(2)}</p>
              <p>Applied Rules: {ratingResult.appliedRules.length}</p>
            </div>
          </>
        ) : null}

        {step === 4 ? (
          <>
            <div className="detail-card glass-card">
              <h2>Quote Review</h2>
              <p>Organization: {selectedOrganization?.name || "N/A"}</p>
              <p>Policy Number: {policyNumber || "N/A"}</p>
              <p>Policyholder: {selectedPolicyholder?.full_name || "N/A"}</p>
              <p>Agent: {selectedAgent?.full_name || "N/A"}</p>
              <p>Product: {product}</p>
              <p>Effective Date: {effectiveDate || "N/A"}</p>
              <p>Expiration Date: {expirationDate || "N/A"}</p>
              <p>Final Premium: ${ratingResult.finalPremium.toFixed(2)}</p>
            </div>

            <label>
              <input
                type="checkbox"
                checked={bindImmediately}
                onChange={(event) => setBindImmediately(event.target.checked)}
              />{" "}
              Bind immediately (otherwise create as quote)
            </label>
          </>
        ) : null}

        {error ? <p className="inline-error">{error}</p> : null}

        <div className="row-actions">
          <button
            className="btn btn-secondary"
            type="button"
            onClick={goPrev}
            disabled={step === 1 || saving}
          >
            Previous
          </button>

          {step < 4 ? (
            <button
              className="btn btn-primary"
              type="button"
              onClick={goNext}
              disabled={saving || loadingOptions}
            >
              Next
            </button>
          ) : (
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Creating..." : bindImmediately ? "Create and Bind" : "Create Quote"}
            </button>
          )}
        </div>
      </form>
    </main>
  );
}
