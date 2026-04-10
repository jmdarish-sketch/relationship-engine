import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatTranscript } from "@/lib/omi/transcript";
import { processInteraction } from "@/lib/pipeline";

/**
 * POST /api/webhook/omi
 *
 * Receives Omi's memory creation webhook. Validates, deduplicates,
 * stores the interaction, and runs the processing pipeline.
 *
 * Omi sends: { id, created_at, started_at, finished_at,
 *   transcript_segments, structured, geolocation, discarded }
 */
export async function POST(request: NextRequest) {
  const supabase = createAdminClient();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Omi conversation ID
  const omiConversationId = body.id as string | undefined;
  if (!omiConversationId) {
    return NextResponse.json(
      { error: "Missing conversation id" },
      { status: 400 }
    );
  }

  // Authenticate via uid query param (Omi sends the user's id directly)
  // or fall back to Bearer token matched against omi_api_key
  const uid = request.nextUrl.searchParams.get("uid");
  const bearerToken = request.headers.get("authorization")?.replace("Bearer ", "");

  if (!uid && !bearerToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: user, error: userError } = uid
    ? await supabase.from("users").select("id").eq("id", uid).single()
    : await supabase.from("users").select("id").eq("omi_api_key", bearerToken!).single();

  if (userError || !user) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  // Check for duplicates
  const { data: existing } = await supabase
    .from("interactions")
    .select("id")
    .eq("omi_conversation_id", omiConversationId)
    .single();

  if (existing) {
    return NextResponse.json({
      success: true,
      interaction_id: existing.id,
      status: "duplicate",
    });
  }

  // Skip discarded conversations
  if (body.discarded === true) {
    return NextResponse.json({
      success: true,
      status: "discarded",
    });
  }

  // Format transcript from segments
  const segments = body.transcript_segments as
    | { text: string; speaker: string; speaker_id: number; is_user: boolean; start: number; end: number }[]
    | undefined;
  const transcript = segments ? formatTranscript(segments) : "";

  // Build summary from structured data
  const structured = body.structured as
    | { title?: string; overview?: string; category?: string }
    | undefined;

  // Store the interaction
  const { data: interaction, error: insertError } = await supabase
    .from("interactions")
    .insert({
      user_id: user.id,
      omi_conversation_id: omiConversationId,
      raw_transcript: transcript,
      omi_summary: structured?.overview ?? null,
      category: structured?.category ?? null,
      geolocation: body.geolocation ?? null,
      started_at: body.started_at ?? null,
      finished_at: body.finished_at ?? null,
    })
    .select("id")
    .single();

  if (insertError || !interaction) {
    console.error("Failed to store interaction:", insertError);
    return NextResponse.json(
      { error: "Failed to store interaction" },
      { status: 500 }
    );
  }

  // If no transcript, skip processing
  if (!transcript) {
    await supabase
      .from("interactions")
      .update({ is_relevant: false, relevance_score: 0 })
      .eq("id", interaction.id);

    return NextResponse.json({
      success: true,
      interaction_id: interaction.id,
      status: "no_transcript",
    });
  }

  // Run the processing pipeline
  try {
    const result = await processInteraction(
      supabase,
      interaction.id,
      user.id,
      transcript
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error("Pipeline error:", err);
    // Still return success since the interaction is stored
    return NextResponse.json({
      success: true,
      interaction_id: interaction.id,
      status: "pipeline_error",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
