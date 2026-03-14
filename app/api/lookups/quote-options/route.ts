import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";

export async function GET() {
  try {
    const supabase = createRouteClient();

    const [organizationsRes, agentsRes, policyholdersRes] = await Promise.all([
      supabase
        .from("organizations")
        .select("id, name, slug")
        .order("name", { ascending: true })
        .limit(200),
      supabase
        .from("agents")
        .select("id, organization_id, full_name, is_active")
        .eq("is_active", true)
        .order("full_name", { ascending: true })
        .limit(500),
      supabase
        .from("policyholders")
        .select("id, organization_id, full_name, line_of_business")
        .order("full_name", { ascending: true })
        .limit(1000),
    ]);

    const firstError = [
      organizationsRes.error,
      agentsRes.error,
      policyholdersRes.error,
    ].find(Boolean);

    if (firstError) {
      return NextResponse.json({ error: firstError.message }, { status: 400 });
    }

    return NextResponse.json({
      data: {
        organizations: organizationsRes.data || [],
        agents: agentsRes.data || [],
        policyholders: policyholdersRes.data || [],
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
