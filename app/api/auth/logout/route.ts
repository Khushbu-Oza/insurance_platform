import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";

export async function POST() {
  try {
    const supabase = createRouteClient();
    const { error } = await supabase.auth.signOut();
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
