import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllOmiConversations } from "@/lib/omi/client";
import { formatTranscript } from "@/lib/omi/transcript";
import { processInteraction } from "@/lib/pipeline";

/**
 * POST /api/sync/omi
 *
 * Backfills conversations from the Omi REST API.
 * Fetches all conversations, skips duplicates (by omi_conversation_id),
 * and processes new ones through the pipeline.
 *
 * Body: { user_id: string }
 * (Called internally or by authenticated user)
 */
export async function POST(request: NextRequest) {
  const supabase = createAdminClient();

  const { user_id } = await request.json();
  if (!user_id) {
    return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
  }

  // Fetch user to get their Omi API key
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, omi_api_key")
    .eq("id", user_id)
    .single();

  if (userError || !user || !user.omi_api_key) {
    return NextResponse.json(
      { error: "User not found or missing Omi API key" },
      { status: 404 }
    );
  }

  // Fetch existing omi_conversation_ids to skip duplicates
  const { data: existingInteractions } = await supabase
    .from("interactions")
    .select("omi_conversation_id")
    .eq("user_id", user_id)
    .not("omi_conversation_id", "is", null);

  const existingIds = new Set(
    (existingInteractions ?? []).map((i) => i.omi_conversation_id)
  );

  // Fetch all conversations from Omi
  let conversations;
  try {
    conversations = await fetchAllOmiConversations(user.omi_api_key);
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to fetch from Omi API",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 502 }
    );
  }

  const results = {
    total_fetched: conversations.length,
    skipped_duplicates: 0,
    skipped_discarded: 0,
    processed: 0,
    errors: 0,
    details: [] as { omi_id: string; status: string }[],
  };

  for (const conv of conversations) {
    // Skip duplicates
    if (existingIds.has(conv.id)) {
      results.skipped_duplicates++;
      continue;
    }

    // Skip discarded
    if (conv.discarded) {
      results.skipped_discarded++;
      continue;
    }

    const transcript = formatTranscript(conv.transcript_segments ?? []);

    // Store the interaction
    const { data: interaction, error: insertError } = await supabase
      .from("interactions")
      .insert({
        user_id: user_id,
        omi_conversation_id: conv.id,
        raw_transcript: transcript,
        omi_summary: conv.structured?.overview ?? null,
        category: conv.structured?.category ?? null,
        geolocation: conv.geolocation ?? null,
        started_at: conv.started_at ?? null,
        finished_at: conv.finished_at ?? null,
      })
      .select("id")
      .single();

    if (insertError || !interaction) {
      results.errors++;
      results.details.push({ omi_id: conv.id, status: "insert_error" });
      continue;
    }

    // Skip empty transcripts
    if (!transcript) {
      await supabase
        .from("interactions")
        .update({ is_relevant: false, relevance_score: 0 })
        .eq("id", interaction.id);

      results.details.push({ omi_id: conv.id, status: "no_transcript" });
      continue;
    }

    // Process through pipeline
    try {
      const result = await processInteraction(
        supabase,
        interaction.id,
        user_id,
        transcript
      );

      results.processed++;
      results.details.push({
        omi_id: conv.id,
        status: result.is_relevant ? "processed" : "not_relevant",
      });
    } catch (err) {
      results.errors++;
      results.details.push({
        omi_id: conv.id,
        status: `pipeline_error: ${err instanceof Error ? err.message : "unknown"}`,
      });
    }
  }

  return NextResponse.json({
    success: true,
    ...results,
  });
}
