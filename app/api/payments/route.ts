import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";

type CreatePaymentBody = {
  organization_id: string;
  invoice_id: string;
  amount: number;
  payment_date?: string;
  payment_method?: "ach" | "card" | "check" | "wire" | "cash" | "other";
  payment_type?: "premium" | "claim_settlement" | "commission";
  status?: "pending" | "posted" | "failed" | "refunded" | "void";
  reference_no?: string | null;
  metadata?: Record<string, unknown>;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function paymentNumber() {
  return `PMT-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Math.floor(
    1000 + Math.random() * 9000,
  )}`;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteClient();
    const { searchParams } = new URL(request.url);

    const invoiceId = searchParams.get("invoice_id");
    const status = searchParams.get("status");
    const paymentType = searchParams.get("payment_type");
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");
    const limit = Number(searchParams.get("limit") || 100);

    let query = supabase
      .from("payments")
      .select(
        "id, organization_id, invoice_id, payment_number, payment_type, payment_method, status, amount, payment_date, reference_no, metadata, created_at, invoices(id, invoice_number, policy_id, status)",
      )
      .order("payment_date", { ascending: false })
      .limit(Math.min(limit, 300));

    if (invoiceId) query = query.eq("invoice_id", invoiceId);
    if (status) query = query.eq("status", status);
    if (paymentType) query = query.eq("payment_type", paymentType);
    if (dateFrom) query = query.gte("payment_date", dateFrom);
    if (dateTo) query = query.lte("payment_date", dateTo);

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
    const body = (await request.json()) as CreatePaymentBody;

    if (!body.organization_id || !body.invoice_id || !body.amount) {
      return NextResponse.json(
        {
          error: "organization_id, invoice_id, and amount are required.",
        },
        { status: 400 },
      );
    }
    if (!Number.isFinite(body.amount) || body.amount <= 0) {
      return NextResponse.json(
        { error: "amount must be a positive number." },
        { status: 400 },
      );
    }

    const supabase = createRouteClient();
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("id, organization_id, status, total_amount, amount_paid, amount_due")
      .eq("id", body.invoice_id)
      .maybeSingle();

    if (invoiceError) {
      return NextResponse.json({ error: invoiceError.message }, { status: 400 });
    }
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    }
    if (invoice.status === "void") {
      return NextResponse.json(
        { error: "Cannot post payments to a void invoice." },
        { status: 400 },
      );
    }
    if (invoice.organization_id !== body.organization_id) {
      return NextResponse.json(
        { error: "Payment organization does not match invoice organization." },
        { status: 400 },
      );
    }

    const outstanding = Number(invoice.amount_due || 0);
    if (body.amount - outstanding > 0.01) {
      return NextResponse.json(
        {
          error: `Payment amount (${body.amount}) exceeds outstanding amount (${outstanding.toFixed(2)}).`,
        },
        { status: 400 },
      );
    }

    const paymentStatus = body.status || "posted";
    const { data: paymentRows, error: paymentError } = await supabase
      .from("payments")
      .insert({
        organization_id: body.organization_id,
        invoice_id: body.invoice_id,
        payment_number: paymentNumber(),
        payment_type: body.payment_type || "premium",
        payment_method: body.payment_method || "ach",
        status: paymentStatus,
        amount: body.amount,
        payment_date: body.payment_date || todayIso(),
        reference_no: body.reference_no ?? null,
        metadata: body.metadata ?? {},
      })
      .select("*");

    if (paymentError) {
      return NextResponse.json({ error: paymentError.message }, { status: 400 });
    }

    const payment = paymentRows?.[0] ?? null;
    if (!payment) {
      return NextResponse.json(
        { error: "Payment was not returned after insert." },
        { status: 400 },
      );
    }

    if (paymentStatus === "posted") {
      const totalAmount = Number(invoice.total_amount || 0);
      const amountPaid = Number(invoice.amount_paid || 0) + Number(body.amount);
      const roundedPaid = Math.round(amountPaid * 100) / 100;
      const amountDue = Math.max(0, Math.round((totalAmount - roundedPaid) * 100) / 100);

      let nextStatus = "issued";
      if (amountDue <= 0) {
        nextStatus = "paid";
      } else if (roundedPaid > 0) {
        nextStatus = "partially_paid";
      }

      const { error: invoiceUpdateError } = await supabase
        .from("invoices")
        .update({
          amount_paid: roundedPaid,
          amount_due: amountDue,
          status: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.invoice_id);

      if (invoiceUpdateError) {
        return NextResponse.json({ error: invoiceUpdateError.message }, { status: 400 });
      }
    }

    return NextResponse.json({ data: payment }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
