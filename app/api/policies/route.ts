import { NextRequest, NextResponse } from "next/server";
import {
  PolicyStatus,
  POLICY_STATUSES,
  isPolicyStatus,
} from "@/lib/policies/status";
import { createRouteClient } from "@/lib/supabase/route";

type CreatePolicyBody = {
  organization_id: string;
  policy_number: string;
  status?: PolicyStatus;
  product_id?: string | null;
  product?: string | null;
  policyholder_id?: string | null;
  agent_id?: string | null;
  effective_date?: string | null;
  expiration_date?: string | null;
  written_premium?: number;
  rating_snapshot?: Record<string, unknown>;
};

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteClient();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const agentId = searchParams.get("agent_id");
    const product = searchParams.get("product");
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");
    const limit = Number(searchParams.get("limit") || 50);

    let query = supabase
      .from("policies")
      .select(
        "id, organization_id, policy_number, status, product, written_premium, effective_date, expiration_date, created_at, agents(id, full_name), policyholders(id, full_name)",
      )
      .order("created_at", { ascending: false })
      .limit(Math.min(limit, 200));

    if (status) query = query.eq("status", status);
    if (agentId) query = query.eq("agent_id", agentId);
    if (product) query = query.ilike("product", `%${product}%`);
    if (dateFrom) query = query.gte("effective_date", dateFrom);
    if (dateTo) query = query.lte("effective_date", dateTo);

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
    const body = (await request.json()) as CreatePolicyBody;
    const status = body.status || "quote";

    if (!body.organization_id || !body.policy_number) {
      return NextResponse.json(
        { error: "organization_id and policy_number are required." },
        { status: 400 },
      );
    }

    if (!isPolicyStatus(status)) {
      return NextResponse.json(
        {
          error: `Invalid policy status. Allowed values: ${POLICY_STATUSES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const supabase = createRouteClient();
    const { data: rows, error } = await supabase
      .from("policies")
      .insert({
        organization_id: body.organization_id,
        policy_number: body.policy_number,
        status,
        product_id: body.product_id ?? null,
        product: body.product ?? null,
        policyholder_id: body.policyholder_id ?? null,
        agent_id: body.agent_id ?? null,
        effective_date: body.effective_date ?? null,
        expiration_date: body.expiration_date ?? null,
        written_premium: body.written_premium ?? 0,
        rating_snapshot: body.rating_snapshot ?? {},
      })
      .select("*");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const data = rows?.[0] ?? null;
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
