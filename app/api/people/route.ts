import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/people?user_id=...
 * Returns all people for a user with a preview detail, ordered by last_seen desc.
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

  // Fetch the most recent extracted detail for each person for preview
  const people = data ?? [];
  if (people.length > 0) {
    const ids = people.map((p) => p.id);
    const { data: details } = await supabase
      .from("extracted_details")
      .select("person_id, content")
      .in("person_id", ids)
      .order("extracted_at", { ascending: false });

    // Build a map of person_id → first (most recent) detail
    const previewMap = new Map<string, string>();
    for (const d of details ?? []) {
      if (!previewMap.has(d.person_id)) {
        previewMap.set(d.person_id, d.content);
      }
    }

    const enriched = people.map((p) => ({
      ...p,
      preview: previewMap.get(p.id) ?? null,
    }));

    return NextResponse.json({ people: enriched });
  }

  return NextResponse.json({ people });
}
