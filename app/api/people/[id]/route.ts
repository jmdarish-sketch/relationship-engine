import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/people/:id
 * Returns a full person profile with details, signals, interactions, and insights.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  // Fetch person record
  const { data: person, error: personError } = await supabase
    .from("people")
    .select("*")
    .eq("id", id)
    .single();

  if (personError || !person) {
    return NextResponse.json({ error: "Person not found" }, { status: 404 });
  }

  // Fetch all related data in parallel
  const [detailsRes, signalsRes, interactionLinksRes, insightsRes] =
    await Promise.all([
      supabase
        .from("extracted_details")
        .select("*")
        .eq("person_id", id)
        .order("importance_score", { ascending: false }),
      supabase
        .from("identity_signals")
        .select("*")
        .eq("person_id", id)
        .order("confidence", { ascending: false }),
      supabase
        .from("interaction_people")
        .select("interaction_id, speaker_id, confidence")
        .eq("person_id", id),
      supabase
        .from("insights")
        .select("*")
        .or(`source_person_id.eq.${id},target_person_id.eq.${id}`)
        .order("created_at", { ascending: false }),
    ]);

  // Fetch the actual interactions for the linked interaction_ids
  const interactionIds = (interactionLinksRes.data ?? []).map(
    (l) => l.interaction_id
  );

  let interactions: unknown[] = [];
  if (interactionIds.length > 0) {
    const { data } = await supabase
      .from("interactions")
      .select("id, omi_conversation_id, started_at, finished_at, omi_summary, category")
      .in("id", interactionIds)
      .order("started_at", { ascending: false });
    interactions = data ?? [];
  }

  return NextResponse.json({
    person,
    extracted_details: detailsRes.data ?? [],
    identity_signals: signalsRes.data ?? [],
    interactions,
    insights: insightsRes.data ?? [],
  });
}
