import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/people?user_id=...
 * Returns all people for a user, ordered by last_seen desc.
 */
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("user_id");
  if (!userId) {
    return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("people")
    .select(
      "id, first_name, last_name, display_label, interaction_count, last_seen, relationship_strength, evolving_profile"
    )
    .eq("user_id", userId)
    .eq("is_merged", false)
    .order("last_seen", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ people: data });
}
