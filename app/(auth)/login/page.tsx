"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getDefaultRouteForRole } from "@/lib/auth/roles";

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="auth-page" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = useMemo(
    () => searchParams.get("redirectTo"),
    [searchParams],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    let role = data.user?.user_metadata?.role as string | undefined;
    const { data: roleFromDb, error: roleLookupError } = await supabase.rpc(
      "current_user_role_key",
    );
    if (!roleLookupError && typeof roleFromDb === "string" && roleFromDb) {
      role = roleFromDb;
    }
    router.replace(redirectTo || getDefaultRouteForRole(role));
    router.refresh();
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Sign in to InsureFlow</h1>
        <p>Access policy, claims, and billing operations securely.</p>

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

          <label htmlFor="password">
            Password
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error ? <div className="auth-message error">{error}</div> : null}

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="auth-footer">
          New user? <Link href="/signup">Create account</Link>
        </p>
      </section>
    </main>
  );
}
