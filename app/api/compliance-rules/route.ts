import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";

type CreateComplianceRuleBody = {
  organization_id: string;
  rule_code: string;
  rule_name: string;
  category: string;
  jurisdiction?: string;
  severity?: "low" | "medium" | "high" | "critical";
  description?: string | null;
  is_enabled?: boolean;
  effective_date?: string;
  metadata?: Record<string, unknown>;
};

type UpdateComplianceRuleBody = {
  id: string;
  is_enabled?: boolean;
  severity?: "low" | "medium" | "high" | "critical";
  description?: string | null;
  metadata?: Record<string, unknown>;
};

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteClient();
    const { searchParams } = new URL(request.url);

    const category = searchParams.get("category");
    const jurisdiction = searchParams.get("jurisdiction");
    const enabled = searchParams.get("enabled");
    const limit = Math.min(Number(searchParams.get("limit") || 200), 500);

    let query = supabase
      .from("compliance_rules")
      .select(
        "id, organization_id, rule_code, rule_name, category, jurisdiction, severity, description, is_enabled, effective_date, metadata, created_at, updated_at",
      )
      .order("category", { ascending: true })
      .order("rule_code", { ascending: true })
      .limit(limit);

    if (category) query = query.eq("category", category);
    if (jurisdiction) query = query.eq("jurisdiction", jurisdiction);
    if (enabled === "true") query = query.eq("is_enabled", true);
    if (enabled === "false") query = query.eq("is_enabled", false);

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
    const body = (await request.json()) as CreateComplianceRuleBody;
    if (
      !body.organization_id ||
      !body.rule_code ||
      !body.rule_name ||
      !body.category
    ) {
      return NextResponse.json(
        {
          error:
            "organization_id, rule_code, rule_name, and category are required.",
        },
        { status: 400 },
      );
    }

    const supabase = createRouteClient();
    const { data: rows, error } = await supabase
      .from("compliance_rules")
      .insert({
        organization_id: body.organization_id,
        rule_code: body.rule_code,
        rule_name: body.rule_name,
        category: body.category,
        jurisdiction: body.jurisdiction || "US",
        severity: body.severity || "medium",
        description: body.description ?? null,
        is_enabled: body.is_enabled ?? true,
        effective_date: body.effective_date || new Date().toISOString().slice(0, 10),
        metadata: body.metadata ?? {},
      })
      .select("*");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data: rows?.[0] ?? null }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as UpdateComplianceRuleBody;
    if (!body.id) {
      return NextResponse.json({ error: "id is required." }, { status: 400 });
    }

    const updatePayload = {
      ...(typeof body.is_enabled !== "undefined"
        ? { is_enabled: body.is_enabled }
        : {}),
      ...(typeof body.severity !== "undefined" ? { severity: body.severity } : {}),
      ...(typeof body.description !== "undefined"
        ? { description: body.description }
        : {}),
      ...(typeof body.metadata !== "undefined" ? { metadata: body.metadata } : {}),
      updated_at: new Date().toISOString(),
    };

    const supabase = createRouteClient();
    const { data: rows, error } = await supabase
      .from("compliance_rules")
      .update(updatePayload)
      .eq("id", body.id)
      .select("*");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const data = rows?.[0] ?? null;
    if (!data) {
      return NextResponse.json({ error: "Rule not found." }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
