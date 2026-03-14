"use client";

import { FormEvent, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";

export default function AgentNewSubmissionPage() {
  const [clientName, setClientName] = useState("");
  const [product, setProduct] = useState("personal_auto");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Submission drafted successfully and queued for underwriting review.");
  }

  return (
    <main className="portal-shell">
      <PageHeader
        title="New Submission"
        description="Capture preliminary submission details for underwriting review."
      />

      <form className="app-form glass-card section-spaced" onSubmit={onSubmit}>
        <label>
          Client Name
          <input
            value={clientName}
            onChange={(event) => setClientName(event.target.value)}
            required
          />
        </label>

        <label>
          Product
          <select value={product} onChange={(event) => setProduct(event.target.value)}>
            <option value="personal_auto">Personal Auto</option>
            <option value="homeowners">Homeowners</option>
          </select>
        </label>

        <label>
          Submission Notes
          <input value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>

        <div className="row-actions">
          <button className="btn btn-primary" type="submit">
            Save Submission
          </button>
        </div>

        {message ? <p className="auth-message success">{message}</p> : null}
      </form>
    </main>
  );
}
