import { NextRequest, NextResponse } from "next/server";
import {
  PolicyStatus,
  POLICY_STATUSES,
  canTransitionPolicyStatus,
  isPolicyStatus,
} from "@/lib/policies/status";
import { createRouteClient } from "@/lib/supabase/route";

type UpdatePolicyBody = {
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

const POLICY_MUTATION_ROLES = new Set([
  "super_admin",
  "carrier_admin",
  "underwriter",
  "agent",
]);

export async function GET(
  _request: NextRequest,
  context: { params: { id: string } },
) {
  try {
    const supabase = createRouteClient();
    const { id } = context.params;

    const { data, error } = await supabase
      .from("policies")
      .select(
        "*, agents(id, full_name, email, npn), policyholders(id, full_name, email), coverages(*), endorsements(*)",
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (!data) {
      return NextResponse.json({ error: "Policy not found." }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } },
) {
  try {
    const body = (await request.json()) as UpdatePolicyBody;
    const { id } = context.params;

    // Always use the route client so the user's session cookie is forwarded
    // to Supabase — this lets RLS policies validate correctly.
    const supabase = createRouteClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "You must be signed in to update policies." },
        { status: 401 },
      );
    }

    const metadataRole =
      typeof user.user_metadata?.role === "string"
        ? user.user_metadata.role
        : null;
    let effectiveRole = metadataRole;
    const { data: roleFromDb, error: roleLookupError } = await supabase.rpc(
      "current_user_role_key",
    );
    if (!roleLookupError && typeof roleFromDb === "string" && roleFromDb) {
      effectiveRole = roleFromDb;
    }

    if (!effectiveRole || !POLICY_MUTATION_ROLES.has(effectiveRole)) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to approve this underwriting record.",
        },
        { status: 403 },
      );
    }

    let currentOrgId: string | null = null;
    const { data: orgFromDb, error: orgLookupError } = await supabase.rpc(
      "current_user_org_id",
    );
    if (!orgLookupError && typeof orgFromDb === "string" && orgFromDb) {
      currentOrgId = orgFromDb;
    }

    // Fetch current status — use maybeSingle() to avoid coercion errors
    const { data: currentPolicy, error: currentPolicyError } = await supabase
      .from("policies")
      .select("id, status, organization_id")
      .eq("id", id)
      .maybeSingle();

    if (currentPolicyError) {
      return NextResponse.json(
        { error: currentPolicyError.message },
        { status: 400 },
      );
    }
    if (!currentPolicy) {
      return NextResponse.json({ error: "Policy not found." }, { status: 404 });
    }

    if (effectiveRole !== "super_admin") {
      if (!currentOrgId) {
        return NextResponse.json(
          {
            error:
              "Your account profile is missing organization access. Contact an administrator.",
          },
          { status: 403 },
        );
      }
      if (currentPolicy.organization_id !== currentOrgId) {
        return NextResponse.json(
          {
            error:
              "You do not have permission to modify policies outside your organization.",
          },
          { status: 403 },
        );
      }
    }

    if (body.status) {
      if (!isPolicyStatus(body.status)) {
        return NextResponse.json(
          {
            error: `Invalid policy status. Allowed values: ${POLICY_STATUSES.join(", ")}`,
          },
          { status: 400 },
        );
      }

      const currentStatus = currentPolicy.status as PolicyStatus;
      if (!canTransitionPolicyStatus(currentStatus, body.status)) {
        return NextResponse.json(
          {
            error: `Invalid status transition from '${currentStatus}' to '${body.status}'.`,
          },
          { status: 400 },
        );
      }
    }

    const updatePayload = {
      ...(body.status ? { status: body.status } : {}),
      ...(typeof body.product_id !== "undefined"
        ? { product_id: body.product_id }
        : {}),
      ...(typeof body.product !== "undefined" ? { product: body.product } : {}),
      ...(typeof body.policyholder_id !== "undefined"
        ? { policyholder_id: body.policyholder_id }
        : {}),
      ...(typeof body.agent_id !== "undefined"
        ? { agent_id: body.agent_id }
        : {}),
      ...(typeof body.effective_date !== "undefined"
        ? { effective_date: body.effective_date }
        : {}),
      ...(typeof body.expiration_date !== "undefined"
        ? { expiration_date: body.expiration_date }
        : {}),
      ...(typeof body.written_premium !== "undefined"
        ? { written_premium: body.written_premium }
        : {}),
      ...(typeof body.rating_snapshot !== "undefined"
        ? { rating_snapshot: body.rating_snapshot }
        : {}),
      updated_at: new Date().toISOString(),
    };

    // IMPORTANT: Never use .single() on an update with RLS — if the policy is
    // not visible to the user after update, PostgREST throws
    // "Cannot coerce the result to a single JSON object".
    // Use .select() and take rows[0] instead.
    const { data: rows, error } = await supabase
      .from("policies")
      .update(updatePayload)
      .eq("id", id)
      .select("*");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const data = rows?.[0] ?? null;
    if (!data) {
      return NextResponse.json(
        {
          error:
            "Update blocked by database policy. Verify your profile role and organization mapping.",
        },
        { status: 403 },
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: { id: string } },
) {
  try {
    const { id } = context.params;
    const supabase = createRouteClient();

    const { error } = await supabase.from("policies").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
