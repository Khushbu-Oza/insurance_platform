"use client";

import { FormEvent, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";

export default function PolicyholderNewClaimPage() {
  const [policyNumber, setPolicyNumber] = useState("");
  const [incidentDate, setIncidentDate] = useState("");
  const [summary, setSummary] = useState("");
  const [message, setMessage] = useState("");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("FNOL captured successfully. Your claim has been submitted.");
  }

  return (
    <main className="portal-shell">
      <PageHeader
        title="File a Claim (FNOL)"
        description="Submit first notice of loss and incident details."
      />

      <form className="app-form glass-card section-spaced" onSubmit={onSubmit}>
        <label>
          Policy Number
          <input
            value={policyNumber}
            onChange={(event) => setPolicyNumber(event.target.value)}
            required
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
          Incident Summary
          <input value={summary} onChange={(event) => setSummary(event.target.value)} required />
        </label>

        <div className="row-actions">
          <button className="btn btn-primary" type="submit">
            Submit Claim
          </button>
        </div>

        {message ? <p className="auth-message success">{message}</p> : null}
      </form>
    </main>
  );
}
