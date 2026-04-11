import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processInteraction } from "@/lib/pipeline";

/**
 * POST /api/reprocess
 * Body: { interaction_id }
 * Re-runs the pipeline on an existing interaction that failed.
 */
export async function POST(request: NextRequest) {
  const { interaction_id } = await request.json();

  if (!interaction_id) {
    return NextResponse.json(
      { error: "Missing interaction_id" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data: interaction, error } = await supabase
    .from("interactions")
    .select("id, user_id, raw_transcript, pipeline_status")
    .eq("id", interaction_id)
    .single();

  if (error || !interaction) {
    return NextResponse.json(
      { error: "Interaction not found" },
      { status: 404 }
    );
  }

  if (!interaction.raw_transcript) {
    return NextResponse.json(
      { error: "No transcript to process" },
      { status: 400 }
    );
  }

  // Clear old pipeline artifacts for this interaction before reprocessing
  await Promise.all([
    supabase
      .from("extracted_details")
      .delete()
      .eq("interaction_id", interaction_id),
    supabase
      .from("identity_signals")
      .delete()
      .eq("interaction_id", interaction_id),
    supabase
      .from("interaction_people")
      .delete()
      .eq("interaction_id", interaction_id),
    supabase
      .from("insights")
      .delete()
      .eq("interaction_id", interaction_id),
    supabase
      .from("disambiguation_queue")
      .delete()
      .eq("interaction_id", interaction_id),
  ]);

  // Reset status
  await supabase
    .from("interactions")
    .update({ pipeline_status: "reprocessing" })
    .eq("id", interaction_id);

  try {
    const result = await processInteraction(
      supabase,
      interaction_id,
      interaction.user_id,
      interaction.raw_transcript
    );

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("[reprocess] Pipeline error:", err);
    return NextResponse.json(
      {
        error: "Pipeline failed",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
