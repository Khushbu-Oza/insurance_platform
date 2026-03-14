import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";
import { CLAIM_STATUSES, ClaimStatus, isClaimStatus } from "@/lib/claims/status";

type CreateClaimBody = {
  organization_id: string;
  policy_id: string;
  claim_number?: string;
  status?: ClaimStatus;
  incident_date: string;
  reported_date?: string;
  loss_description: string;
  loss_location?: string | null;
  adjuster_user_id?: string | null;
  severity?: "low" | "medium" | "high" | "critical";
  reserve_amount?: number;
  incurred_amount?: number;
  paid_amount?: number;
  coverage_selection?: string[];
  metadata?: Record<string, unknown>;
};

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteClient();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const policyId = searchParams.get("policy_id");
    const adjusterUserId = searchParams.get("adjuster_user_id");
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");
    const limit = Number(searchParams.get("limit") || 50);

    let query = supabase
      .from("claims")
      .select(
        "id, claim_number, status, incident_date, reported_date, severity, reserve_amount, incurred_amount, paid_amount, policy_id, adjuster_user_id, created_at, policies(policy_number)",
      )
      .order("created_at", { ascending: false })
      .limit(Math.min(limit, 200));

    if (status) query = query.eq("status", status);
    if (policyId) query = query.eq("policy_id", policyId);
    if (adjusterUserId) query = query.eq("adjuster_user_id", adjusterUserId);
    if (dateFrom) query = query.gte("incident_date", dateFrom);
    if (dateTo) query = query.lte("incident_date", dateTo);

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
    const body = (await request.json()) as CreateClaimBody;
    const status = body.status || "open";

    if (
      !body.organization_id ||
      !body.policy_id ||
      !body.incident_date ||
      !body.loss_description
    ) {
      return NextResponse.json(
        {
          error:
            "organization_id, policy_id, incident_date, and loss_description are required.",
        },
        { status: 400 },
      );
    }

    if (!isClaimStatus(status)) {
      return NextResponse.json(
        {
          error: `Invalid claim status. Allowed values: ${CLAIM_STATUSES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const claimNumber =
      body.claim_number ||
      `CLM-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Math.floor(
        1000 + Math.random() * 9000,
      )}`;

    const supabase = createRouteClient();
    const { data: rows, error } = await supabase
      .from("claims")
      .insert({
        organization_id: body.organization_id,
        policy_id: body.policy_id,
        claim_number: claimNumber,
        status,
        incident_date: body.incident_date,
        reported_date: body.reported_date || new Date().toISOString().slice(0, 10),
        loss_description: body.loss_description,
        loss_location: body.loss_location ?? null,
        adjuster_user_id: body.adjuster_user_id ?? null,
        severity: body.severity || "medium",
        reserve_amount: body.reserve_amount ?? 0,
        incurred_amount: body.incurred_amount ?? 0,
        paid_amount: body.paid_amount ?? 0,
        coverage_selection: body.coverage_selection ?? [],
        metadata: body.metadata ?? {},
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
