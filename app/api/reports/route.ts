import { NextRequest, NextResponse } from "next/server";
import { buildExecutiveMetrics } from "@/lib/analytics/metrics";
import { createRouteClient } from "@/lib/supabase/route";

type ReportSlug = "underwriting" | "claims" | "billing" | "agents";

type ReportColumn = {
  key: string;
  label: string;
};

type ReportKpi = {
  label: string;
  value: string;
  helper?: string;
};

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function defaultDateRange() {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 90);
  return { dateFrom: toIsoDate(start), dateTo: toIsoDate(end) };
}

function parseDateRange(searchParams: URLSearchParams) {
  const defaults = defaultDateRange();
  const dateFrom = searchParams.get("date_from") || defaults.dateFrom;
  const dateTo = searchParams.get("date_to") || defaults.dateTo;
  return { dateFrom, dateTo };
}

function csvEscape(value: unknown) {
  if (value === null || typeof value === "undefined") return "";
  const asText = String(value);
  if (/[",\n]/.test(asText)) {
    return `"${asText.replaceAll('"', '""')}"`;
  }
  return asText;
}

function asCurrency(value: number) {
  return `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function asPercent(value: number) {
  return `${Number(value || 0).toFixed(2)}%`;
}

function asNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function buildCsv(columns: ReportColumn[], rows: Record<string, unknown>[]) {
  const header = columns.map((column) => csvEscape(column.label)).join(",");
  const lines = rows.map((row) =>
    columns.map((column) => csvEscape(row[column.key])).join(","),
  );
  return [header, ...lines].join("\n");
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug") as ReportSlug | null;
    const format = searchParams.get("format");
    const { dateFrom, dateTo } = parseDateRange(searchParams);

    if (!slug || !["underwriting", "claims", "billing", "agents"].includes(slug)) {
      return NextResponse.json(
        {
          error:
            "Invalid or missing slug. Allowed values: underwriting, claims, billing, agents.",
        },
        { status: 400 },
      );
    }

    const supabase = createRouteClient();

    const [policiesRes, claimsRes, invoicesRes, paymentsRes, commissionsRes] =
      await Promise.all([
        supabase
          .from("policies")
          .select("id, policy_number, status, product, written_premium, effective_date, created_at, agents(full_name)")
          .gte("created_at", `${dateFrom}T00:00:00.000Z`)
          .lte("created_at", `${dateTo}T23:59:59.999Z`)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("claims")
          .select(
            "id, claim_number, status, severity, reserve_amount, incurred_amount, paid_amount, incident_date, created_at, policies(policy_number)",
          )
          .gte("incident_date", dateFrom)
          .lte("incident_date", dateTo)
          .order("incident_date", { ascending: false })
          .limit(500),
        supabase
          .from("invoices")
          .select(
            "id, invoice_number, status, due_date, issue_date, total_amount, amount_paid, amount_due, created_at, policies(policy_number)",
          )
          .gte("issue_date", dateFrom)
          .lte("issue_date", dateTo)
          .order("issue_date", { ascending: false })
          .limit(500),
        supabase
          .from("payments")
          .select("id, invoice_id, payment_number, payment_method, payment_type, status, amount, payment_date, created_at")
          .gte("payment_date", dateFrom)
          .lte("payment_date", dateTo)
          .order("payment_date", { ascending: false })
          .limit(500),
        supabase
          .from("commissions")
          .select(
            "id, status, commission_rate, written_premium, amount, earned_date, paid_date, agents(full_name), policies(policy_number), invoices(invoice_number)",
          )
          .gte("earned_date", dateFrom)
          .lte("earned_date", dateTo)
          .order("earned_date", { ascending: false })
          .limit(500),
      ]);

    const firstError = [
      policiesRes.error,
      claimsRes.error,
      invoicesRes.error,
      paymentsRes.error,
      commissionsRes.error,
    ].find(Boolean);

    if (firstError) {
      return NextResponse.json({ error: firstError.message }, { status: 400 });
    }

    const policies = policiesRes.data || [];
    const claims = claimsRes.data || [];
    const invoices = invoicesRes.data || [];
    const payments = paymentsRes.data || [];
    const commissions = commissionsRes.data || [];

    const executive = buildExecutiveMetrics({
      policies,
      claims,
      invoices,
      payments,
      daysInWindow: 90,
    });

    let columns: ReportColumn[] = [];
    let rows: Record<string, unknown>[] = [];
    let kpis: ReportKpi[] = [];
    let title = "";

    if (slug === "underwriting") {
      title = "Underwriting Pipeline Report";
      columns = [
        { key: "policy_number", label: "Policy #" },
        { key: "status", label: "Status" },
        { key: "product", label: "Product" },
        { key: "written_premium", label: "Written Premium" },
        { key: "effective_date", label: "Effective Date" },
        { key: "assigned_agent", label: "Assigned Agent" },
      ];
      rows = policies.map((policy) => {
        const agent = Array.isArray(policy.agents) ? policy.agents[0] : policy.agents;
        return {
          policy_number: policy.policy_number,
          status: policy.status,
          product: policy.product || "N/A",
          written_premium: asNumber(policy.written_premium).toFixed(2),
          effective_date: policy.effective_date || "",
          assigned_agent:
            agent && typeof agent.full_name === "string" ? agent.full_name : "N/A",
        };
      });
      const quoteCount = policies.filter((policy) => policy.status === "quote").length;
      const boundCount = policies.filter((policy) => policy.status === "bound").length;
      const avgPremium =
        policies.length > 0
          ? policies.reduce((sum, policy) => sum + asNumber(policy.written_premium), 0) /
            policies.length
          : 0;
      kpis = [
        { label: "Quotes", value: `${quoteCount}`, helper: "Awaiting decisions" },
        { label: "Bound", value: `${boundCount}`, helper: "Approved in period" },
        { label: "Avg Premium", value: asCurrency(avgPremium), helper: "Per policy" },
        {
          label: "Collection Rate",
          value: asPercent(executive.collectionRate),
          helper: "Cross-portfolio",
        },
      ];
    }

    if (slug === "claims") {
      title = "Claims Performance Report";
      columns = [
        { key: "claim_number", label: "Claim #" },
        { key: "status", label: "Status" },
        { key: "severity", label: "Severity" },
        { key: "policy_number", label: "Policy #" },
        { key: "reserve_amount", label: "Reserve" },
        { key: "incurred_amount", label: "Incurred" },
        { key: "paid_amount", label: "Paid" },
        { key: "incident_date", label: "Incident Date" },
      ];
      rows = claims.map((claim) => {
        const policy = Array.isArray(claim.policies) ? claim.policies[0] : claim.policies;
        return {
          claim_number: claim.claim_number,
          status: claim.status,
          severity: claim.severity,
          policy_number:
            policy && typeof policy.policy_number === "string"
              ? policy.policy_number
              : "N/A",
          reserve_amount: asNumber(claim.reserve_amount).toFixed(2),
          incurred_amount: asNumber(claim.incurred_amount).toFixed(2),
          paid_amount: asNumber(claim.paid_amount).toFixed(2),
          incident_date: claim.incident_date,
        };
      });
      const openClaims = claims.filter((claim) => claim.status !== "closed").length;
      kpis = [
        { label: "Open Claims", value: `${openClaims}`, helper: "Not closed" },
        {
          label: "Incurred Losses",
          value: asCurrency(executive.incurredLosses),
          helper: "Date window total",
        },
        {
          label: "Loss Ratio",
          value: asPercent(executive.lossRatio),
          helper: "Incurred / earned premium",
        },
        {
          label: "Combined Ratio",
          value: asPercent(executive.combinedRatio),
          helper: "Loss + expense",
        },
      ];
    }

    if (slug === "billing") {
      title = "Billing and Collections Report";
      columns = [
        { key: "invoice_number", label: "Invoice #" },
        { key: "policy_number", label: "Policy #" },
        { key: "status", label: "Status" },
        { key: "issue_date", label: "Issue Date" },
        { key: "due_date", label: "Due Date" },
        { key: "total_amount", label: "Total Amount" },
        { key: "amount_paid", label: "Amount Paid" },
        { key: "amount_due", label: "Amount Due" },
      ];
      rows = invoices.map((invoice) => {
        const policy = Array.isArray(invoice.policies)
          ? invoice.policies[0]
          : invoice.policies;
        return {
          invoice_number: invoice.invoice_number,
          policy_number:
            policy && typeof policy.policy_number === "string"
              ? policy.policy_number
              : "N/A",
          status: invoice.status,
          issue_date: invoice.issue_date,
          due_date: invoice.due_date,
          total_amount: asNumber(invoice.total_amount).toFixed(2),
          amount_paid: asNumber(invoice.amount_paid).toFixed(2),
          amount_due: asNumber(invoice.amount_due).toFixed(2),
        };
      });
      const overdue = invoices.filter(
        (invoice) =>
          invoice.status === "overdue" ||
          (invoice.due_date < dateTo && asNumber(invoice.amount_due) > 0),
      ).length;
      kpis = [
        { label: "Invoices", value: `${invoices.length}`, helper: "Issued in range" },
        { label: "Overdue", value: `${overdue}`, helper: "Needs collection" },
        {
          label: "Billed",
          value: asCurrency(executive.billedAmount),
          helper: "Total invoiced amount",
        },
        {
          label: "Collection Rate",
          value: asPercent(executive.collectionRate),
          helper: "Posted / billed",
        },
      ];
    }

    if (slug === "agents") {
      title = "Agent Production & Commission Report";
      const groupedByAgent = new Map<
        string,
        { agent_name: string; premium: number; commission: number; policies: Set<string> }
      >();
      commissions.forEach((commission) => {
        const agent = Array.isArray(commission.agents)
          ? commission.agents[0]
          : commission.agents;
        const policy = Array.isArray(commission.policies)
          ? commission.policies[0]
          : commission.policies;
        const agentName =
          agent && typeof agent.full_name === "string" ? agent.full_name : "Unassigned";
        const policyNumber =
          policy && typeof policy.policy_number === "string"
            ? policy.policy_number
            : "Unknown";
        if (!groupedByAgent.has(agentName)) {
          groupedByAgent.set(agentName, {
            agent_name: agentName,
            premium: 0,
            commission: 0,
            policies: new Set<string>(),
          });
        }
        const current = groupedByAgent.get(agentName)!;
        current.premium += asNumber(commission.written_premium);
        current.commission += asNumber(commission.amount);
        current.policies.add(policyNumber);
      });

      columns = [
        { key: "agent_name", label: "Agent" },
        { key: "policy_count", label: "Policies" },
        { key: "written_premium", label: "Written Premium" },
        { key: "commission_amount", label: "Commission Amount" },
        { key: "avg_commission_rate", label: "Avg Commission %" },
      ];
      rows = [...groupedByAgent.values()]
        .map((item) => ({
          agent_name: item.agent_name,
          policy_count: item.policies.size,
          written_premium: round(item.premium).toFixed(2),
          commission_amount: round(item.commission).toFixed(2),
          avg_commission_rate:
            item.premium > 0 ? round((item.commission / item.premium) * 100).toFixed(2) : "0.00",
        }))
        .sort((a, b) => Number(b.commission_amount) - Number(a.commission_amount));

      const totalCommissions = commissions.reduce(
        (sum, commission) => sum + asNumber(commission.amount),
        0,
      );
      const totalPremium = commissions.reduce(
        (sum, commission) => sum + asNumber(commission.written_premium),
        0,
      );
      kpis = [
        { label: "Agents", value: `${rows.length}`, helper: "Active commission earners" },
        {
          label: "Written Premium",
          value: asCurrency(totalPremium),
          helper: "Commission basis",
        },
        {
          label: "Total Commission",
          value: asCurrency(totalCommissions),
          helper: "Earned in range",
        },
        {
          label: "Avg Commission Rate",
          value: asPercent(totalPremium ? (totalCommissions / totalPremium) * 100 : 0),
          helper: "Weighted average",
        },
      ];
    }

    if (format === "csv") {
      const csv = buildCsv(columns, rows);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename=\"${slug}-report-${dateFrom}-to-${dateTo}.csv\"`,
        },
      });
    }

    return NextResponse.json({
      data: {
        slug,
        title,
        date_from: dateFrom,
        date_to: dateTo,
        columns,
        rows,
        kpis,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
}

function round(value: number, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}
