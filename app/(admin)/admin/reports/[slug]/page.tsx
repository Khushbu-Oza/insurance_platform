"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";

type ReportColumn = {
  key: string;
  label: string;
};

type ReportKpi = {
  label: string;
  value: string;
  helper?: string;
};

type ReportPayload = {
  slug: string;
  title: string;
  date_from: string;
  date_to: string;
  columns: ReportColumn[];
  rows: Array<Record<string, unknown>>;
  kpis: ReportKpi[];
};

const VALID_SLUGS = new Set(["underwriting", "claims", "billing", "agents"]);

function isoDaysAgo(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export default function ReportDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [dateFrom, setDateFrom] = useState(isoDaysAgo(90));
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<ReportPayload | null>(null);

  const exportHref = useMemo(() => {
    const search = new URLSearchParams({
      slug,
      date_from: dateFrom,
      date_to: dateTo,
      format: "csv",
    });
    return `/api/reports?${search.toString()}`;
  }, [dateFrom, dateTo, slug]);

  useEffect(() => {
    async function loadReport() {
      if (!slug || !VALID_SLUGS.has(slug)) {
        setError("Invalid report slug.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          slug,
          date_from: dateFrom,
          date_to: dateTo,
        });
        const response = await fetch(`/api/reports?${params.toString()}`, {
          cache: "no-store",
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Failed to load report.");
        }
        setPayload(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load report.");
      } finally {
        setLoading(false);
      }
    }
    loadReport();
  }, [dateFrom, dateTo, slug]);

  if (!slug || !VALID_SLUGS.has(slug)) {
    return (
      <main className="portal-shell">
        <p className="inline-error">Unknown report type.</p>
        <Link href="/admin/reports" className="btn btn-secondary">
          Back to reports
        </Link>
      </main>
    );
  }

  return (
    <main className="portal-shell">
      <PageHeader
        title={payload?.title || "Report"}
        description={`Report key: ${slug}`}
        actions={
          <>
            <Link href="/admin/reports" className="btn btn-secondary">
              Back
            </Link>
            <a href={exportHref} className="btn btn-primary">
              Export CSV
            </a>
          </>
        }
      />

      <section className="detail-card glass-card section-spaced">
        <h2>Filters</h2>
        <div className="filter-row" style={{ marginTop: "0.75rem" }}>
          <label>
            Date From
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </label>
          <label>
            Date To
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </label>
        </div>
      </section>

      {error ? <p className="inline-error">{error}</p> : null}

      <section className="kpi-grid">
        {(payload?.kpis || []).slice(0, 4).map((kpi) => (
          <StatCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            helper={kpi.helper || ""}
          />
        ))}
      </section>

      <section className="table-wrap glass-card section-spaced">
        <table className="data-table">
          <thead>
            <tr>
              {(payload?.columns || []).map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="loading-row">
                <td
                  colSpan={Math.max((payload?.columns || []).length, 1)}
                  style={{ textAlign: "center", padding: "2rem" }}
                >
                  Loading report...
                </td>
              </tr>
            ) : (payload?.rows || []).length === 0 ? (
              <tr>
                <td colSpan={Math.max((payload?.columns || []).length, 1)}>
                  <div className="empty-state">No data in selected range.</div>
                </td>
              </tr>
            ) : (
              (payload?.rows || []).map((row, index) => (
                <tr key={`${index}-${String(row[(payload?.columns || [])[0]?.key || "row"])}`}>
                  {(payload?.columns || []).map((column) => (
                    <td key={column.key}>{String(row[column.key] ?? "")}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
