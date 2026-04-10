import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/disambiguation/resolve
 * Body: { queue_item_id, resolved_person_id?, create_new?: boolean }
 */
export async function POST(request: NextRequest) {
  const { queue_item_id, resolved_person_id, create_new } =
    await request.json();

  if (!queue_item_id) {
    return NextResponse.json(
      { error: "Missing queue_item_id" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Fetch the queue item
  const { data: item, error: itemError } = await supabase
    .from("disambiguation_queue")
    .select("*")
    .eq("id", queue_item_id)
    .single();

  if (itemError || !item) {
    return NextResponse.json(
      { error: "Queue item not found" },
      { status: 404 }
    );
  }

  let finalPersonId: string;

  if (create_new) {
    // Create a new person from the extracted context
    const context = item.extracted_context as {
      speaker_id?: string;
      identity_signals?: { signal_type: string; signal_value: string; confidence: number }[];
    };

    const fingerprint: Record<string, string> = {};
    for (const signal of context.identity_signals ?? []) {
      if (signal.confidence >= 0.5) {
        fingerprint[signal.signal_type] = signal.signal_value;
      }
    }

    const nameParts = (item.detected_name ?? "").split(" ");
    const { data: newPerson, error: createError } = await supabase
      .from("people")
      .insert({
        user_id: item.user_id,
        first_name: nameParts[0] ?? null,
        last_name: nameParts.length > 1 ? nameParts.slice(1).join(" ") : null,
        display_label: item.detected_name,
        identity_fingerprint: fingerprint,
        interaction_count: 1,
      })
      .select("id")
      .single();

    if (createError || !newPerson) {
      return NextResponse.json(
        { error: "Failed to create person" },
        { status: 500 }
      );
    }

    finalPersonId = newPerson.id;
  } else if (resolved_person_id) {
    finalPersonId = resolved_person_id;
  } else {
    return NextResponse.json(
      { error: "Must provide resolved_person_id or set create_new" },
      { status: 400 }
    );
  }

  // Re-link the interaction_people record from the old tentative link
  // to the resolved person
  const oldCandidates = (item.candidate_people_ids ?? []) as string[];
  if (oldCandidates.length > 0) {
    // Update any interaction_people link for this interaction that points
    // to one of the candidates
    await supabase
      .from("interaction_people")
      .update({ person_id: finalPersonId })
      .eq("interaction_id", item.interaction_id)
      .in("person_id", oldCandidates);
  }

  // Mark queue item resolved
  await supabase
    .from("disambiguation_queue")
    .update({
      resolution_status: "resolved",
      resolved_person_id: finalPersonId,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", queue_item_id);

  return NextResponse.json({
    success: true,
    resolved_person_id: finalPersonId,
  });
}
