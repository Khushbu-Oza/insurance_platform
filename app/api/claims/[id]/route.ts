import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";
import {
  CLAIM_STATUSES,
  ClaimStatus,
  canTransitionClaimStatus,
  isClaimStatus,
} from "@/lib/claims/status";

type UpdateClaimBody = {
  status?: ClaimStatus;
  loss_description?: string;
  loss_location?: string | null;
  adjuster_user_id?: string | null;
  severity?: "low" | "medium" | "high" | "critical";
  reserve_amount?: number;
  incurred_amount?: number;
  paid_amount?: number;
  metadata?: Record<string, unknown>;
  new_note?: {
    author_user_id?: string | null;
    note: string;
    visibility?: "internal" | "external";
  };
  new_payment?: {
    amount: number;
    payment_date?: string;
    payment_type?: "indemnity" | "expense" | "medical";
    status?: "pending" | "issued" | "cleared" | "void";
    payee_name: string;
    reference_no?: string;
  };
  new_document?: {
    file_name: string;
    file_path: string;
    mime_type?: string;
    uploaded_by?: string | null;
  };
};

export async function GET(
  _request: NextRequest,
  context: { params: { id: string } },
) {
  try {
    const { id } = context.params;
    const supabase = createRouteClient();

    const { data, error } = await supabase
      .from("claims")
      .select(
        "*, policies(id, policy_number, status), claim_notes(*), claim_payments(*), claim_documents(*)",
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (!data) {
      return NextResponse.json({ error: "Claim not found." }, { status: 404 });
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
    const { id } = context.params;
    const body = (await request.json()) as UpdateClaimBody;
    const supabase = createRouteClient();

    const { data: currentClaim, error: currentClaimError } = await supabase
      .from("claims")
      .select("id, status")
      .eq("id", id)
      .maybeSingle();

    if (currentClaimError) {
      return NextResponse.json(
        { error: currentClaimError.message },
        { status: 400 },
      );
    }
    if (!currentClaim) {
      return NextResponse.json({ error: "Claim not found." }, { status: 404 });
    }

    if (body.status) {
      if (!isClaimStatus(body.status)) {
        return NextResponse.json(
          {
            error: `Invalid claim status. Allowed values: ${CLAIM_STATUSES.join(", ")}`,
          },
          { status: 400 },
        );
      }

      const currentStatus = currentClaim.status as ClaimStatus;
      if (!canTransitionClaimStatus(currentStatus, body.status)) {
        return NextResponse.json(
          {
            error: `Invalid status transition from '${currentStatus}' to '${body.status}'.`,
          },
          { status: 400 },
        );
      }
    }

    if (body.new_note?.note) {
      const { error } = await supabase.from("claim_notes").insert({
        claim_id: id,
        author_user_id: body.new_note.author_user_id ?? null,
        note: body.new_note.note,
        visibility: body.new_note.visibility || "internal",
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    if (body.new_payment?.amount && body.new_payment?.payee_name) {
      const { error } = await supabase.from("claim_payments").insert({
        claim_id: id,
        amount: body.new_payment.amount,
        payment_date:
          body.new_payment.payment_date || new Date().toISOString().slice(0, 10),
        payment_type: body.new_payment.payment_type || "indemnity",
        status: body.new_payment.status || "pending",
        payee_name: body.new_payment.payee_name,
        reference_no: body.new_payment.reference_no || null,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    if (body.new_document?.file_name && body.new_document?.file_path) {
      const { error } = await supabase.from("claim_documents").insert({
        claim_id: id,
        file_name: body.new_document.file_name,
        file_path: body.new_document.file_path,
        mime_type: body.new_document.mime_type || null,
        uploaded_by: body.new_document.uploaded_by ?? null,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    const updatePayload = {
      ...(body.status ? { status: body.status } : {}),
      ...(typeof body.loss_description !== "undefined"
        ? { loss_description: body.loss_description }
        : {}),
      ...(typeof body.loss_location !== "undefined"
        ? { loss_location: body.loss_location }
        : {}),
      ...(typeof body.adjuster_user_id !== "undefined"
        ? { adjuster_user_id: body.adjuster_user_id }
        : {}),
      ...(typeof body.severity !== "undefined" ? { severity: body.severity } : {}),
      ...(typeof body.reserve_amount !== "undefined"
        ? { reserve_amount: body.reserve_amount }
        : {}),
      ...(typeof body.incurred_amount !== "undefined"
        ? { incurred_amount: body.incurred_amount }
        : {}),
      ...(typeof body.paid_amount !== "undefined"
        ? { paid_amount: body.paid_amount }
        : {}),
      ...(typeof body.metadata !== "undefined" ? { metadata: body.metadata } : {}),
      updated_at: new Date().toISOString(),
    };

    if (Object.keys(updatePayload).length > 1) {
      const { error } = await supabase
        .from("claims")
        .update(updatePayload)
        .eq("id", id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    // Re-fetch after update — use maybeSingle() to avoid coercion errors
    const { data, error } = await supabase
      .from("claims")
      .select(
        "*, policies(id, policy_number, status), claim_notes(*), claim_payments(*), claim_documents(*)",
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (!data) {
      return NextResponse.json({ error: "Claim not found after update." }, { status: 404 });
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

    const { error } = await supabase.from("claims").delete().eq("id", id);
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
