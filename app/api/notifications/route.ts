import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";

type CreateNotificationBody = {
  organization_id: string;
  recipient_user_id?: string | null;
  type?: string;
  title: string;
  message: string;
  entity_type?: string | null;
  entity_id?: string | null;
  metadata?: Record<string, unknown>;
};

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteClient();
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unread_only") === "true";
    const limit = Math.min(Number(searchParams.get("limit") || 20), 100);

    let query = supabase
      .from("notifications")
      .select(
        "id, organization_id, recipient_user_id, type, title, message, entity_type, entity_id, is_read, read_at, metadata, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq("is_read", false);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const unreadCount = (data || []).filter((item) => item.is_read === false).length;
    return NextResponse.json({ data, unread_count: unreadCount });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateNotificationBody;

    if (!body.organization_id || !body.title || !body.message) {
      return NextResponse.json(
        { error: "organization_id, title, and message are required." },
        { status: 400 },
      );
    }

    const supabase = createRouteClient();
    const { data: rows, error } = await supabase
      .from("notifications")
      .insert({
        organization_id: body.organization_id,
        recipient_user_id: body.recipient_user_id ?? null,
        type: body.type || "system",
        title: body.title,
        message: body.message,
        entity_type: body.entity_type ?? null,
        entity_id: body.entity_id ?? null,
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
