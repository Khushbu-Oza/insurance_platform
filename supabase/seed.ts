import { createClient } from "@supabase/supabase-js";

type BasicRow = Record<string, unknown>;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing SUPABASE env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const roles = [
  { role_key: "super_admin", role_label: "Super Admin" },
  { role_key: "carrier_admin", role_label: "Carrier Admin" },
  { role_key: "underwriter", role_label: "Underwriter" },
  { role_key: "claims_adjuster", role_label: "Claims Adjuster" },
  { role_key: "agent", role_label: "Agent" },
  { role_key: "policyholder", role_label: "Policyholder" },
];

const organizations = [
  { name: "Atlas Regional Insurance", slug: "atlas-regional", org_type: "carrier" },
  { name: "North Ridge MGA", slug: "north-ridge-mga", org_type: "mga" },
];

const claimStatuses = ["open", "investigating", "settled", "closed"] as const;
const claimSeverities = ["low", "medium", "high", "critical"] as const;
const paymentMethods = ["ach", "card", "check", "wire"] as const;

function nowIso() {
  return new Date().toISOString();
}

function isoDateDaysFromNow(dayOffset: number) {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + dayOffset);
  return value.toISOString().slice(0, 10);
}

function pick<T>(items: readonly T[], index: number) {
  return items[index % items.length];
}

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function tableExists(tableName: string) {
  const { error } = await supabase.from(tableName).select("*").limit(1);
  return !error || !error.message.includes("relation");
}

async function insertRowsIfTableExists(
  tableName: string,
  rows: BasicRow[],
  selectColumns = "id",
) {
  if (!(await tableExists(tableName))) {
    console.log(`[skip] table '${tableName}' does not exist yet.`);
    return [] as BasicRow[];
  }
  if (!rows.length) {
    return [] as BasicRow[];
  }

  const { data, error } = await supabase
    .from(tableName)
    .insert(rows)
    .select(selectColumns);

  if (error) {
    throw new Error(`Failed to seed ${tableName}: ${error.message}`);
  }

  console.log(`[ok] seeded ${rows.length} rows into '${tableName}'.`);
  return ((data as unknown as BasicRow[]) || []) as BasicRow[];
}

async function upsertRowsIfTableExists(
  tableName: string,
  rows: BasicRow[],
  onConflict: string,
  selectColumns = "id",
) {
  if (!(await tableExists(tableName))) {
    console.log(`[skip] table '${tableName}' does not exist yet.`);
    return [] as BasicRow[];
  }
  if (!rows.length) {
    return [] as BasicRow[];
  }

  const { data, error } = await supabase
    .from(tableName)
    .upsert(rows, { onConflict })
    .select(selectColumns);

  if (error) {
    throw new Error(`Failed to seed ${tableName}: ${error.message}`);
  }

  console.log(`[ok] upserted ${rows.length} rows into '${tableName}'.`);
  return ((data as unknown as BasicRow[]) || []) as BasicRow[];
}

function buildAgents(count: number, organizationId: string) {
  return Array.from({ length: count }, (_, index) => {
    const sequence = index + 1;
    return {
      organization_id: organizationId,
      full_name: `Demo Agent ${sequence}`,
      email: `agent${sequence}@insureflow-demo.com`,
      npn: `NPN-${100000 + sequence}`,
      commission_rate: 0.1 + ((sequence % 3) * 0.01),
      created_at: nowIso(),
      updated_at: nowIso(),
    };
  });
}

function buildPolicyholders(count: number, organizationId: string) {
  return Array.from({ length: count }, (_, index) => {
    const sequence = index + 1;
    return {
      organization_id: organizationId,
      full_name: `Demo Policyholder ${sequence}`,
      email: `policyholder${sequence}@insureflow-demo.com`,
      line_of_business: sequence % 2 === 0 ? "personal_auto" : "homeowners",
      city: sequence % 2 === 0 ? "San Francisco" : "Los Angeles",
      state_code: "CA",
      postal_code: `9${String(1000 + sequence).slice(-4)}`,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
  });
}

function buildPolicies(
  count: number,
  organizationId: string,
  agentIds: string[],
  policyholderIds: string[],
) {
  const statuses = ["quote", "bound", "active", "expired", "cancelled"] as const;

  return Array.from({ length: count }, (_, index) => {
    const sequence = index + 1;
    const effectiveOffset = -90 + (index % 120);
    return {
      organization_id: organizationId,
      policy_number: `IF-${String(sequence).padStart(6, "0")}`,
      status: pick(statuses, index),
      product: index % 2 === 0 ? "personal_auto" : "homeowners",
      agent_id: agentIds[index % agentIds.length],
      policyholder_id: policyholderIds[index % policyholderIds.length],
      effective_date: isoDateDaysFromNow(effectiveOffset),
      expiration_date: isoDateDaysFromNow(effectiveOffset + 365),
      written_premium: 650 + ((index % 30) * 45),
      rating_snapshot: {
        territory: index % 2 === 0 ? "urban" : "suburban",
        score_band: pick(["A", "B", "C"] as const, index),
      },
      created_at: nowIso(),
      updated_at: nowIso(),
    };
  });
}

function buildClaims(
  count: number,
  organizationId: string,
  policies: BasicRow[],
) {
  if (!policies.length) return [];

  return Array.from({ length: count }, (_, index) => {
    const policy = policies[index % policies.length];
    const status = pick(claimStatuses, index);
    const incidentOffset = -120 + (index * 2);
    const reserve = 2500 + ((index % 10) * 600);
    const incurred = status === "open" ? reserve * 0.4 : reserve * 0.75;
    const paid = status === "closed" || status === "settled" ? incurred * 0.7 : incurred * 0.25;

    return {
      organization_id: organizationId,
      policy_id: String(policy.id),
      claim_number: `CLM-${String(200000 + index).padStart(6, "0")}`,
      status,
      incident_date: isoDateDaysFromNow(incidentOffset),
      reported_date: isoDateDaysFromNow(incidentOffset + 1),
      loss_description: `Loss event ${index + 1} requiring investigation.`,
      loss_location: pick(["Los Angeles, CA", "San Diego, CA", "Sacramento, CA"] as const, index),
      severity: pick(claimSeverities, index),
      reserve_amount: Math.round(reserve * 100) / 100,
      incurred_amount: Math.round(incurred * 100) / 100,
      paid_amount: Math.round(paid * 100) / 100,
      coverage_selection: ["liability", "property_damage"],
      metadata: { source: "seed", phase: 8 },
      created_at: nowIso(),
      updated_at: nowIso(),
    };
  });
}

function buildInvoices(count: number, organizationId: string, policies: BasicRow[]) {
  if (!policies.length) return [];

  return Array.from({ length: count }, (_, index) => {
    const policy = policies[index % policies.length];
    const total = 140 + ((index % 18) * 25);
    const statusCycle = index % 5;

    let status: string = "issued";
    let amountPaid = 0;
    if (statusCycle === 0) {
      status = "paid";
      amountPaid = total;
    } else if (statusCycle === 1) {
      status = "partially_paid";
      amountPaid = Math.round(total * 0.5 * 100) / 100;
    } else if (statusCycle === 3) {
      status = "overdue";
    }

    const amountDue = Math.max(0, Math.round((total - amountPaid) * 100) / 100);
    const issueOffset = -150 + index;
    const dueOffset = issueOffset + 20;

    return {
      organization_id: organizationId,
      policy_id: String(policy.id),
      invoice_number: `INV-${String(300000 + index).padStart(8, "0")}`,
      status,
      billing_period_start: isoDateDaysFromNow(issueOffset),
      billing_period_end: isoDateDaysFromNow(issueOffset + 29),
      issue_date: isoDateDaysFromNow(issueOffset),
      due_date: isoDateDaysFromNow(dueOffset),
      total_amount: total,
      amount_paid: amountPaid,
      amount_due: amountDue,
      metadata: { source: "seed", cadence: "monthly" },
      created_at: nowIso(),
      updated_at: nowIso(),
    };
  });
}

function buildPayments(invoices: BasicRow[]) {
  if (!invoices.length) return [];

  return invoices.map((invoice, index) => {
    const amountPaid = toNumber(invoice.amount_paid);
    const total = toNumber(invoice.total_amount);

    const posted = amountPaid > 0;
    const amount = posted ? amountPaid : Math.round(total * 0.3 * 100) / 100;

    return {
      organization_id: String(invoice.organization_id),
      invoice_id: String(invoice.id),
      payment_number: `PMT-${String(400000 + index).padStart(8, "0")}`,
      payment_type: "premium",
      payment_method: pick(paymentMethods, index),
      status: posted ? "posted" : index % 2 === 0 ? "pending" : "failed",
      amount,
      payment_date: String(invoice.issue_date),
      reference_no: `REF-${400000 + index}`,
      metadata: { source: "seed", invoice_status: String(invoice.status) },
      created_at: nowIso(),
    };
  });
}

function buildCommissions(invoices: BasicRow[], policies: BasicRow[]) {
  if (!invoices.length || !policies.length) return [];

  const policyMap = new Map<string, BasicRow>(
    policies.map((policy) => [String(policy.id), policy]),
  );

  return invoices
    .map((invoice, index) => {
      const policy = policyMap.get(String(invoice.policy_id));
      if (!policy || !policy.agent_id) return null;

      const writtenPremium = toNumber(invoice.total_amount);
      const commissionRate = 0.1 + ((index % 3) * 0.01);
      const amount = Math.round(writtenPremium * commissionRate * 100) / 100;
      const paid = String(invoice.status) === "paid";

      return {
        organization_id: String(invoice.organization_id),
        agent_id: String(policy.agent_id),
        policy_id: String(policy.id),
        invoice_id: String(invoice.id),
        commission_rate: commissionRate,
        written_premium: writtenPremium,
        amount,
        status: paid ? "paid" : index % 4 === 0 ? "approved" : "pending",
        earned_date: String(invoice.issue_date),
        paid_date: paid ? String(invoice.issue_date) : null,
        metadata: { source: "seed" },
        created_at: nowIso(),
        updated_at: nowIso(),
      };
    })
    .filter(Boolean) as BasicRow[];
}

function buildReinsuranceTreaties(organizationId: string) {
  return [
    {
      organization_id: organizationId,
      treaty_name: "Atlas Quota Share 2026",
      reinsurer_name: "Pacific Re",
      treaty_type: "quota_share",
      attachment_point: 0,
      limit_amount: 5000000,
      ceding_commission_rate: 0.22,
      effective_date: isoDateDaysFromNow(-60),
      expiration_date: isoDateDaysFromNow(305),
      is_active: true,
      metadata: { source: "seed" },
      created_at: nowIso(),
      updated_at: nowIso(),
    },
    {
      organization_id: organizationId,
      treaty_name: "Atlas XOL Cat Layer",
      reinsurer_name: "Summit Re",
      treaty_type: "excess_of_loss",
      attachment_point: 1000000,
      limit_amount: 10000000,
      ceding_commission_rate: 0.05,
      effective_date: isoDateDaysFromNow(-45),
      expiration_date: isoDateDaysFromNow(320),
      is_active: true,
      metadata: { source: "seed" },
      created_at: nowIso(),
      updated_at: nowIso(),
    },
  ];
}

function buildWorkflows(organizationId: string) {
  return [
    {
      organization_id: organizationId,
      workflow_key: "uw_quote_to_bind",
      name: "Underwriting Quote Approval",
      description: "Escalates high premium quotes to senior underwriter.",
      trigger_event: "policy.quote.created",
      config: { escalation_threshold: 5000, approver_role: "underwriter" },
      is_active: true,
      created_at: nowIso(),
      updated_at: nowIso(),
    },
    {
      organization_id: organizationId,
      workflow_key: "claims_severity_escalation",
      name: "Claims Severity Escalation",
      description: "Escalates critical claims to claims leadership.",
      trigger_event: "claim.created",
      config: { severity: "critical", notify_role: "claims_adjuster" },
      is_active: true,
      created_at: nowIso(),
      updated_at: nowIso(),
    },
    {
      organization_id: organizationId,
      workflow_key: "billing_overdue_reminder",
      name: "Overdue Billing Reminder",
      description: "Sends reminder notifications for overdue invoices.",
      trigger_event: "invoice.overdue",
      config: { reminder_days: [1, 7, 14] },
      is_active: true,
      created_at: nowIso(),
      updated_at: nowIso(),
    },
  ];
}

function buildComplianceRules(organizationId: string) {
  return [
    {
      organization_id: organizationId,
      rule_code: "UW-CA-001",
      rule_name: "California Underwriting File Completeness",
      category: "underwriting",
      jurisdiction: "CA",
      severity: "high",
      description: "Submission must include complete risk questionnaire and prior loss history.",
      is_enabled: true,
      effective_date: isoDateDaysFromNow(-30),
      metadata: { source: "seed" },
      created_at: nowIso(),
      updated_at: nowIso(),
    },
    {
      organization_id: organizationId,
      rule_code: "CLM-CA-010",
      rule_name: "Claims Contact SLA",
      category: "claims",
      jurisdiction: "CA",
      severity: "critical",
      description: "Initial policyholder contact within 24 hours of FNOL.",
      is_enabled: true,
      effective_date: isoDateDaysFromNow(-40),
      metadata: { source: "seed" },
      created_at: nowIso(),
      updated_at: nowIso(),
    },
    {
      organization_id: organizationId,
      rule_code: "BIL-US-002",
      rule_name: "Premium Refund Handling",
      category: "billing",
      jurisdiction: "US",
      severity: "medium",
      description: "Refund transactions must include reference and approval metadata.",
      is_enabled: true,
      effective_date: isoDateDaysFromNow(-20),
      metadata: { source: "seed" },
      created_at: nowIso(),
      updated_at: nowIso(),
    },
  ];
}

function buildNotifications(organizationId: string, policies: BasicRow[], claims: BasicRow[]) {
  return Array.from({ length: 40 }, (_, index) => {
    const isClaimNotice = index % 2 === 0;
    const entity = isClaimNotice ? claims[index % Math.max(claims.length, 1)] : policies[index % Math.max(policies.length, 1)];
    const title = isClaimNotice ? "Claim status updated" : "Policy moved in workflow";

    return {
      organization_id: organizationId,
      recipient_user_id: null,
      type: isClaimNotice ? "claim" : "policy",
      title,
      message: isClaimNotice
        ? `Claim ${String(entity?.claim_number || "")} moved to ${String(entity?.status || "open")}.`
        : `Policy ${String(entity?.policy_number || "")} changed to ${String(entity?.status || "quote")}.`,
      entity_type: isClaimNotice ? "claim" : "policy",
      entity_id: entity?.id ? String(entity.id) : null,
      is_read: index % 4 === 0,
      read_at: index % 4 === 0 ? nowIso() : null,
      metadata: { source: "seed", priority: index % 5 === 0 ? "high" : "normal" },
      created_at: nowIso(),
    };
  });
}

function buildAuditLogs(
  organizationId: string,
  policies: BasicRow[],
  claims: BasicRow[],
  invoices: BasicRow[],
) {
  const rows: BasicRow[] = [];

  policies.slice(0, 40).forEach((policy, index) => {
    rows.push({
      organization_id: organizationId,
      actor_user_id: null,
      entity_type: "policy",
      entity_id: String(policy.id),
      action: index % 3 === 0 ? "status_change" : "created",
      metadata: {
        policy_number: policy.policy_number,
        status: policy.status,
        source: "seed",
      },
      created_at: nowIso(),
    });
  });

  claims.slice(0, 30).forEach((claim, index) => {
    rows.push({
      organization_id: organizationId,
      actor_user_id: null,
      entity_type: "claim",
      entity_id: String(claim.id),
      action: index % 2 === 0 ? "updated" : "created",
      metadata: {
        claim_number: claim.claim_number,
        severity: claim.severity,
        source: "seed",
      },
      created_at: nowIso(),
    });
  });

  invoices.slice(0, 30).forEach((invoice, index) => {
    rows.push({
      organization_id: organizationId,
      actor_user_id: null,
      entity_type: "invoice",
      entity_id: String(invoice.id),
      action: index % 2 === 0 ? "issued" : "payment_applied",
      metadata: {
        invoice_number: invoice.invoice_number,
        status: invoice.status,
        source: "seed",
      },
      created_at: nowIso(),
    });
  });

  return rows;
}

async function seedCoreTables() {
  await supabase.from("roles").upsert(roles, { onConflict: "role_key" });
  const { data: orgRows, error: orgError } = await supabase
    .from("organizations")
    .upsert(organizations, { onConflict: "slug" })
    .select("id, name");

  if (orgError || !orgRows?.length) {
    throw new Error(`Failed to seed organizations: ${orgError?.message || "unknown error"}`);
  }

  return (orgRows as unknown as BasicRow[]) || [];
}

async function main() {
  const orgRows = await seedCoreTables();
  const primaryOrgId = String(orgRows[0].id);

  const agentRows = await insertRowsIfTableExists(
    "agents",
    buildAgents(10, primaryOrgId),
    "id, organization_id, full_name, commission_rate",
  );
  const policyholderRows = await insertRowsIfTableExists(
    "policyholders",
    buildPolicyholders(50, primaryOrgId),
    "id",
  );

  const agentIds = agentRows.map((row) => String(row.id));
  const policyholderIds = policyholderRows.map((row) => String(row.id));

  const policies =
    agentIds.length && policyholderIds.length
      ? await upsertRowsIfTableExists(
          "policies",
          buildPolicies(100, primaryOrgId, agentIds, policyholderIds),
          "policy_number",
          "id, organization_id, policy_number, status, agent_id, written_premium",
        )
      : [];

  const claims = policies.length
    ? await upsertRowsIfTableExists(
        "claims",
        buildClaims(30, primaryOrgId, policies),
        "claim_number",
        "id, claim_number, status, severity, reserve_amount, incurred_amount, paid_amount",
      )
    : [];

  const invoices = policies.length
    ? await upsertRowsIfTableExists(
        "invoices",
        buildInvoices(200, primaryOrgId, policies),
        "invoice_number",
        "id, organization_id, policy_id, invoice_number, status, issue_date, due_date, total_amount, amount_paid, amount_due",
      )
    : [];

  const payments = invoices.length
    ? await upsertRowsIfTableExists(
        "payments",
        buildPayments(invoices),
        "payment_number",
        "id",
      )
    : [];

  const commissions = invoices.length
    ? await insertRowsIfTableExists("commissions", buildCommissions(invoices, policies), "id")
    : [];

  await insertRowsIfTableExists(
    "reinsurance_treaties",
    buildReinsuranceTreaties(primaryOrgId),
    "id",
  );
  await upsertRowsIfTableExists(
    "workflows",
    buildWorkflows(primaryOrgId),
    "organization_id,workflow_key",
    "id",
  );
  await upsertRowsIfTableExists(
    "compliance_rules",
    buildComplianceRules(primaryOrgId),
    "organization_id,rule_code",
    "id",
  );
  await insertRowsIfTableExists(
    "notifications",
    buildNotifications(primaryOrgId, policies, claims),
    "id",
  );
  await insertRowsIfTableExists(
    "audit_logs",
    buildAuditLogs(primaryOrgId, policies, claims, invoices),
    "id",
  );

  console.log("[done] Comprehensive seed complete.");
  console.log(
    JSON.stringify(
      {
        organizations: orgRows.length,
        agents: agentRows.length,
        policyholders: policyholderRows.length,
        policies: policies.length,
        claims: claims.length,
        invoices: invoices.length,
        payments: payments.length,
        commissions: commissions.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
