import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="auth-page">
      <section className="auth-card glass-card">
        <h1>Unauthorized</h1>
        <p>Your account does not have permission to access this route.</p>
        <div className="row-actions section-spaced">
          <Link className="btn btn-primary" href="/login">
            Back to Sign In
          </Link>
          <Link className="btn btn-secondary" href="/">
            Go Home
          </Link>
        </div>
      </section>
    </main>
  );
}
