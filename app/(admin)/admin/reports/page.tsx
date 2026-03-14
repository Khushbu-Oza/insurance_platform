import Link from "next/link";
import { FileBarChart2, ShieldCheck, FileWarning, ReceiptText, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";

const REPORTS = [
  {
    slug: "underwriting",
    title: "Underwriting Pipeline",
    description:
      "Quote-to-bind velocity, premium concentration, and workload distribution by product/agent.",
    icon: ShieldCheck,
  },
  {
    slug: "claims",
    title: "Claims Performance",
    description:
      "Open-claim load, incurred trends, reserve adequacy, and settlement ratio by severity.",
    icon: FileWarning,
  },
  {
    slug: "billing",
    title: "Billing & Collections",
    description:
      "Invoice aging, posted collections, and outstanding premium trends across the selected period.",
    icon: ReceiptText,
  },
  {
    slug: "agents",
    title: "Agent Production",
    description:
      "Commissionable premium, earned commissions, and weighted commission rates by agent.",
    icon: Users,
  },
];

export default function ReportsLibraryPage() {
  return (
    <main className="portal-shell">
      <PageHeader
        title="Report Library"
        description="Pre-built operational reports for underwriting, claims, billing, and agent performance."
      />

      <section className="dashboard-grid section-spaced">
        {REPORTS.map((report) => {
          const Icon = report.icon;
          return (
            <article key={report.slug} className="detail-card glass-card">
              <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span className="quick-action-icon">
                  <Icon size={14} />
                </span>
                {report.title}
              </h2>
              <p>{report.description}</p>
              <div className="row-actions" style={{ marginTop: "0.7rem" }}>
                <Link href={`/admin/reports/${report.slug}`} className="btn btn-primary btn-sm">
                  Open Report
                </Link>
              </div>
            </article>
          );
        })}
      </section>

      <section className="detail-card glass-card section-spaced">
        <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span className="quick-action-icon">
            <FileBarChart2 size={14} />
          </span>
          Usage Notes
        </h2>
        <p>Each report supports date range filtering and CSV export from the detail view.</p>
      </section>
    </main>
  );
}
