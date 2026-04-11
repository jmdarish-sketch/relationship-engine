import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Fetches all context about a person needed for LLM prompts:
 * person record, extracted details, insights, interaction history.
 */
export async function fetchPersonContext(personId: string) {
  const supabase = createAdminClient();

  const { data: person, error: personError } = await supabase
    .from("people")
    .select(
      "id, display_label, first_name, last_name, evolving_profile, identity_fingerprint, relationship_strength"
    )
    .eq("id", personId)
    .single();

  if (personError || !person) return null;

  const [detailsRes, insightsRes, interactionLinksRes] = await Promise.all([
    supabase
      .from("extracted_details")
      .select("detail_type, content, importance_score, source_quote")
      .eq("person_id", personId)
      .order("importance_score", { ascending: false }),
    supabase
      .from("insights")
      .select("insight_type, content, created_at")
      .or(`source_person_id.eq.${personId},target_person_id.eq.${personId}`)
      .order("created_at", { ascending: false }),
    supabase
      .from("interaction_people")
      .select("interaction_id")
      .eq("person_id", personId),
  ]);

  const interactionIds = (interactionLinksRes.data ?? []).map(
    (l) => l.interaction_id
  );

  let lastInteractionDate = "No prior interactions";
  let interactions: { started_at: string | null; omi_summary: string | null }[] = [];

  if (interactionIds.length > 0) {
    const { data } = await supabase
      .from("interactions")
      .select("started_at, omi_summary")
      .in("id", interactionIds)
      .order("started_at", { ascending: false })
      .limit(10);

    interactions = data ?? [];
    if (interactions.length > 0 && interactions[0].started_at) {
      lastInteractionDate = interactions[0].started_at;
    }
  }

  const displayLabel =
    person.display_label ??
    ([person.first_name, person.last_name].filter(Boolean).join(" ") || "Unknown");

  const details = detailsRes.data ?? [];
  const insights = insightsRes.data ?? [];

  const detailsFormatted = details
    .map(
      (d) =>
        `[${d.detail_type}] ${d.content}${d.source_quote ? ` ("${d.source_quote}")` : ""}`
    )
    .join("\n");

  const insightsFormatted = insights
    .map((i) => `[${i.insight_type}] ${i.content}`)
    .join("\n");

  return {
    person,
    displayLabel,
    details,
    detailsFormatted,
    insights,
    insightsFormatted,
    interactions,
    lastInteractionDate,
  };
}
