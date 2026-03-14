import { NextRequest, NextResponse } from "next/server";
import {
  BillingFrequency,
  calculateCommissionAmount,
  generateBillingSchedule,
} from "@/lib/billing/scheduler";
import { createRouteClient } from "@/lib/supabase/route";

type CreateBillingBody = {
  organization_id: string;
  policy_id: string;
  total_amount: number;
  frequency?: BillingFrequency;
  installment_count?: number;
  start_date?: string;
  issue_date?: string;
  due_day_offset?: number;
  create_commissions?: boolean;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function randomSuffix() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteClient();
    const { searchParams } = new URL(request.url);

    const resource = searchParams.get("resource") || "invoices";
    const status = searchParams.get("status");
    const policyId = searchParams.get("policy_id");
    const agentId = searchParams.get("agent_id");
    const invoiceId = searchParams.get("invoice_id");
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");
    const limit = Number(searchParams.get("limit") || 50);

    if (resource === "commissions") {
      let query = supabase
        .from("commissions")
        .select(
          "id, organization_id, agent_id, policy_id, invoice_id, commission_rate, written_premium, amount, status, earned_date, paid_date, created_at, agents(id, full_name), policies(id, policy_number), invoices(id, invoice_number, due_date, status)",
        )
        .order("earned_date", { ascending: false })
        .limit(Math.min(limit, 200));

      if (status) query = query.eq("status", status);
      if (agentId) query = query.eq("agent_id", agentId);
      if (policyId) query = query.eq("policy_id", policyId);
      if (dateFrom) query = query.gte("earned_date", dateFrom);
      if (dateTo) query = query.lte("earned_date", dateTo);

      const { data, error } = await query;
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ data });
    }

    let query = supabase
      .from("invoices")
      .select(
        "id, organization_id, policy_id, invoice_number, status, billing_period_start, billing_period_end, issue_date, due_date, total_amount, amount_paid, amount_due, created_at, policies(id, policy_number, status), payments(id, amount, payment_date, status, payment_method, payment_type, reference_no, created_at)",
      )
      .order("due_date", { ascending: true })
      .limit(Math.min(limit, 200));

    if (invoiceId) query = query.eq("id", invoiceId);
    if (status) query = query.eq("status", status);
    if (policyId) query = query.eq("policy_id", policyId);
    if (dateFrom) query = query.gte("due_date", dateFrom);
    if (dateTo) query = query.lte("due_date", dateTo);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateBillingBody;

    if (!body.organization_id || !body.policy_id || !body.total_amount) {
      return NextResponse.json(
        {
          error: "organization_id, policy_id, and total_amount are required.",
        },
        { status: 400 },
      );
    }
    if (!Number.isFinite(body.total_amount) || body.total_amount <= 0) {
      return NextResponse.json(
        { error: "total_amount must be a positive number." },
        { status: 400 },
      );
    }

    const issueDate = body.issue_date || todayIso();
    const schedule = generateBillingSchedule({
      totalAmount: body.total_amount,
      startDate: body.start_date || issueDate,
      frequency: body.frequency || "monthly",
      installmentCount: body.installment_count,
      dueDayOffset: body.due_day_offset ?? 0,
    });

    const numberBase = `${issueDate.replaceAll("-", "")}-${randomSuffix()}`;
    const supabase = createRouteClient();

    const insertRows = schedule.map((item) => ({
      organization_id: body.organization_id,
      policy_id: body.policy_id,
      invoice_number: `INV-${numberBase}-${String(item.installmentNumber).padStart(2, "0")}`,
      status: "issued",
      billing_period_start: item.periodStart,
      billing_period_end: item.periodEnd,
      issue_date: issueDate,
      due_date: item.dueDate,
      total_amount: item.amount,
      amount_paid: 0,
      amount_due: item.amount,
    }));

    const { data: invoiceRows, error: invoiceError } = await supabase
      .from("invoices")
      .insert(insertRows)
      .select("*");

    if (invoiceError) {
      return NextResponse.json({ error: invoiceError.message }, { status: 400 });
    }

    let createdCommissions = 0;
    if (body.create_commissions !== false && invoiceRows?.length) {
      const { data: policyRow, error: policyError } = await supabase
        .from("policies")
        .select("id, agent_id, agents(id, commission_rate)")
        .eq("id", body.policy_id)
        .maybeSingle();

      if (!policyError && policyRow) {
        const agentRel = Array.isArray(policyRow.agents)
          ? policyRow.agents[0]
          : policyRow.agents;
        const commissionRate =
          agentRel && typeof agentRel.commission_rate === "number"
            ? agentRel.commission_rate
            : null;
        const agentId = agentRel && typeof agentRel.id === "string" ? agentRel.id : null;

        if (commissionRate !== null && agentId) {
          const commissionRows = invoiceRows.map((invoice) => ({
            organization_id: invoice.organization_id,
            agent_id: agentId,
            policy_id: invoice.policy_id,
            invoice_id: invoice.id,
            commission_rate: commissionRate,
            written_premium: invoice.total_amount,
            amount: calculateCommissionAmount(Number(invoice.total_amount), commissionRate),
            status: "pending",
            earned_date: invoice.issue_date,
          }));

          const { error: commissionError } = await supabase
            .from("commissions")
            .insert(commissionRows);

          if (commissionError) {
            return NextResponse.json(
              { error: commissionError.message },
              { status: 400 },
            );
          }
          createdCommissions = commissionRows.length;
        }
      }
    }

    return NextResponse.json(
      { data: invoiceRows ?? [], commissions_created: createdCommissions },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
