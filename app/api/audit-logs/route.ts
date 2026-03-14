import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteClient();
    const { searchParams } = new URL(request.url);

    const entityType = searchParams.get("entity_type");
    const action = searchParams.get("action");
    const actorUserId = searchParams.get("actor_user_id");
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");
    const limit = Math.min(Number(searchParams.get("limit") || 200), 500);

    let query = supabase
      .from("audit_logs")
      .select(
        "id, organization_id, actor_user_id, entity_type, entity_id, action, metadata, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (entityType) query = query.eq("entity_type", entityType);
    if (action) query = query.eq("action", action);
    if (actorUserId) query = query.eq("actor_user_id", actorUserId);
    if (dateFrom) query = query.gte("created_at", `${dateFrom}T00:00:00.000Z`);
    if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59.999Z`);

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
