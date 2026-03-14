import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";

type UpdateNotificationBody = {
  is_read?: boolean;
};

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } },
) {
  try {
    const { id } = context.params;
    const body = (await request.json()) as UpdateNotificationBody;

    if (typeof body.is_read !== "boolean") {
      return NextResponse.json(
        { error: "is_read (boolean) is required." },
        { status: 400 },
      );
    }

    const supabase = createRouteClient();
    const updatePayload = {
      is_read: body.is_read,
      read_at: body.is_read ? new Date().toISOString() : null,
    };

    const { data: rows, error } = await supabase
      .from("notifications")
      .update(updatePayload)
      .eq("id", id)
      .select("*");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const data = rows?.[0] ?? null;
    if (!data) {
      return NextResponse.json({ error: "Notification not found." }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
