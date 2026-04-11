import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropicClient } from "@/lib/ai/client";
import {
  SYNTHESIS_SYSTEM_PROMPT,
  SYNTHESIS_USER_PROMPT,
} from "@/lib/prompts/synthesis";
import { fetchUserProfile } from "@/lib/api/user-profile";

/**
 * POST /api/prep
 * Body: { user_id, person_id, context?: string, goals?: string }
 */
export async function POST(request: NextRequest) {
  const { user_id, person_id, context, goals } = await request.json();

  if (!user_id || !person_id) {
    return NextResponse.json(
      { error: "Missing user_id or person_id" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const [person_res, userProfile] = await Promise.all([
    supabase
      .from("people")
      .select(
        "display_label, first_name, last_name, evolving_profile, identity_fingerprint, relationship_strength"
      )
      .eq("id", person_id)
      .single(),
    fetchUserProfile(user_id),
  ]);

  const person = person_res.data;
  if (!person) {
    return NextResponse.json({ error: "Person not found" }, { status: 404 });
  }

  const [interactionLinksRes, detailsRes, insightsRes] = await Promise.all([
    supabase
      .from("interaction_people")
      .select("interaction_id")
      .eq("person_id", person_id),
    supabase
      .from("extracted_details")
      .select("detail_type, content, importance_score, source_quote")
      .eq("person_id", person_id)
      .order("importance_score", { ascending: false }),
    supabase
      .from("insights")
      .select("insight_type, content, created_at")
      .or(
        `source_person_id.eq.${person_id},target_person_id.eq.${person_id}`
      )
      .order("created_at", { ascending: false }),
  ]);

  const interactionIds = (interactionLinksRes.data ?? []).map(
    (l) => l.interaction_id
  );

  let lastInteractionDate = "No prior interactions";
  if (interactionIds.length > 0) {
    const { data: interactions } = await supabase
      .from("interactions")
      .select("started_at, omi_summary")
      .in("id", interactionIds)
      .order("started_at", { ascending: false })
      .limit(10);

    if (interactions && interactions.length > 0 && interactions[0].started_at) {
      lastInteractionDate = interactions[0].started_at;
    }
  }

  const detailsHistory = (detailsRes.data ?? [])
    .map(
      (d) =>
        `[${d.detail_type}] ${d.content}${d.source_quote ? ` ("${d.source_quote}")` : ""} (importance: ${d.importance_score})`
    )
    .join("\n");

  const insightsText = (insightsRes.data ?? [])
    .map((i) => `[${i.insight_type}] ${i.content}`)
    .join("\n");

  const displayLabel =
    person.display_label ??
    ([person.first_name, person.last_name].filter(Boolean).join(" ") ||
      "Unknown");

  let filledPrompt = SYNTHESIS_USER_PROMPT.replace(
    "{person_display_label}",
    displayLabel
  )
    .replace(
      "{relationship_strength}",
      person.relationship_strength ?? "unknown"
    )
    .replace("{last_interaction_date}", lastInteractionDate)
    .replace(
      "{identity_fingerprint}",
      JSON.stringify(person.identity_fingerprint ?? {}, null, 2)
    )
    .replace(
      "{evolving_profile}",
      JSON.stringify(person.evolving_profile ?? {}, null, 2)
    )
    .replace(
      "{extracted_details_history}",
      detailsHistory || "No details extracted yet"
    )
    .replace("{relevant_insights}", insightsText || "No cross-references yet")
    .replace("{user_goals}", goals || "No specific goals stated");

  // Add user profile context
  if (userProfile?.profile_summary) {
    filledPrompt = `About the user: ${userProfile.profile_summary}\n\n${filledPrompt}`;
  }

  // Insert meeting context line before user goals if provided
  if (context) {
    filledPrompt = filledPrompt.replace(
      "User's stated goals for this meeting:",
      `Meeting context: ${context}\n\nUser's stated goals for this meeting:`
    );
  }

  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: SYNTHESIS_SYSTEM_PROMPT,
    messages: [{ role: "user", content: filledPrompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return NextResponse.json(
      { error: "Failed to parse prep response" },
      { status: 500 }
    );
  }

  const prep = JSON.parse(jsonMatch[0]);
  return NextResponse.json({ prep });
}
