"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setMessage("If this email exists, a reset link has been sent.");
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Reset Password</h1>
        <p>Enter your email address to receive a password reset link.</p>
        <form className="auth-form" onSubmit={onSubmit}>
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

          {error ? <div className="auth-message error">{error}</div> : null}
          {message ? <div className="auth-message success">{message}</div> : null}

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
        <p className="auth-footer">
          Back to <Link href="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
