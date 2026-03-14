"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ROLE_OPTIONS } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<(typeof ROLE_OPTIONS)[number]["value"]>(
    "agent",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          organization_name: organizationName || null,
          role,
        },
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    setSuccess(
      "Account created. Check your email for a confirmation link, then sign in.",
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Create your InsureFlow account</h1>
        <p>Start with a role and we will route your portal automatically.</p>

        <form className="auth-form" onSubmit={onSubmit}>
          <label htmlFor="fullName">
            Full name
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
            />
          </label>

          <label htmlFor="organizationName">
            Organization name
            <input
              id="organizationName"
              type="text"
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
              placeholder="Example: Atlas Mutual"
            />
          </label>

          <label htmlFor="role">
            Role
            <select
              id="role"
              value={role}
              onChange={(event) =>
                setRole(event.target.value as (typeof ROLE_OPTIONS)[number]["value"])
              }
            >
              {ROLE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="email">
            Email
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label htmlFor="password">
            Password
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error ? <div className="auth-message error">{error}</div> : null}
          {success ? <div className="auth-message success">{success}</div> : null}

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
