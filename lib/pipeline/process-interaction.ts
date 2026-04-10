import type { SupabaseClient } from "@supabase/supabase-js";
import { filterRelevance } from "@/lib/ai/relevance-filter";
import { extractFromTranscript } from "@/lib/ai/extraction";
import { resolveSpeakers } from "./speaker-resolver";
import type { ExtractionResult } from "@/lib/types";

interface ProcessResult {
  interaction_id: string;
  is_relevant: boolean;
  relevance_score: number;
  speakers_resolved: number;
  details_stored: number;
  insights_stored: number;
  action_items_stored: number;
}

/**
 * Full pipeline: relevance filter → extraction → speaker resolution → storage.
 */
export async function processInteraction(
  supabase: SupabaseClient,
  interactionId: string,
  userId: string,
  transcript: string
): Promise<ProcessResult> {
  // Step 1: Relevance filter (Haiku)
  const relevance = await filterRelevance(transcript);

  if (!relevance.is_relevant || relevance.confidence < 0.4) {
    await supabase
      .from("interactions")
      .update({
        is_relevant: false,
        relevance_score: relevance.confidence,
      })
      .eq("id", interactionId);

    return {
      interaction_id: interactionId,
      is_relevant: false,
      relevance_score: relevance.confidence,
      speakers_resolved: 0,
      details_stored: 0,
      insights_stored: 0,
      action_items_stored: 0,
    };
  }

  // Step 2: Full extraction (Sonnet)
  const extraction = await extractFromTranscript(transcript);

  // Double-check: extraction can also flag as irrelevant
  if (!extraction.is_relevant) {
    await supabase
      .from("interactions")
      .update({
        is_relevant: false,
        relevance_score: extraction.relevance_score,
      })
      .eq("id", interactionId);

    return {
      interaction_id: interactionId,
      is_relevant: false,
      relevance_score: extraction.relevance_score,
      speakers_resolved: 0,
      details_stored: 0,
      insights_stored: 0,
      action_items_stored: 0,
    };
  }

  // Mark interaction as relevant
  await supabase
    .from("interactions")
    .update({
      is_relevant: true,
      relevance_score: extraction.relevance_score,
    })
    .eq("id", interactionId);

  // Step 3: Resolve speakers to Person records
  const resolvedSpeakers = await resolveSpeakers(
    supabase,
    userId,
    interactionId,
    extraction.speakers
  );

  // Build a name→person_id map for storing details
  const speakerPersonMap = new Map<string, string>();
  for (const rs of resolvedSpeakers) {
    const speaker = extraction.speakers.find((s) => s.speaker_id === rs.speaker_id);
    if (speaker) {
      speakerPersonMap.set(rs.speaker_id, rs.person_id);
      if (speaker.detected_name) {
        speakerPersonMap.set(speaker.detected_name.toLowerCase(), rs.person_id);
      }
    }
  }

  // Step 4: Store extracted details
  const detailsStored = await storeExtractedDetails(
    supabase,
    interactionId,
    extraction,
    speakerPersonMap
  );

  // Step 5: Store cross-references as insights
  const insightsStored = await storeCrossReferences(
    supabase,
    userId,
    interactionId,
    extraction,
    speakerPersonMap
  );

  // Step 6: Store action items as extracted_details with detail_type='action_item'
  const actionItemsStored = await storeActionItems(
    supabase,
    interactionId,
    extraction,
    speakerPersonMap
  );

  return {
    interaction_id: interactionId,
    is_relevant: true,
    relevance_score: extraction.relevance_score,
    speakers_resolved: resolvedSpeakers.length,
    details_stored: detailsStored,
    insights_stored: insightsStored,
    action_items_stored: actionItemsStored,
  };
}

function resolvePersonId(
  personRef: string,
  speakerPersonMap: Map<string, string>
): string | null {
  // Try exact match on speaker_id (e.g. "SPEAKER_00")
  const byId = speakerPersonMap.get(personRef);
  if (byId) return byId;

  // Try lowercase name match
  const byName = speakerPersonMap.get(personRef.toLowerCase());
  if (byName) return byName;

  // Try partial match
  for (const [key, id] of speakerPersonMap) {
    if (
      key.toLowerCase().includes(personRef.toLowerCase()) ||
      personRef.toLowerCase().includes(key.toLowerCase())
    ) {
      return id;
    }
  }

  return null;
}

async function storeExtractedDetails(
  supabase: SupabaseClient,
  interactionId: string,
  extraction: ExtractionResult,
  speakerPersonMap: Map<string, string>
): Promise<number> {
  const rows = extraction.extracted_details
    .map((detail) => {
      const personId = resolvePersonId(detail.person, speakerPersonMap);
      if (!personId) return null;
      return {
        interaction_id: interactionId,
        person_id: personId,
        detail_type: detail.detail_type,
        content: detail.content,
        importance_score: detail.importance_score,
        source_quote: detail.source_quote,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (rows.length === 0) return 0;

  await supabase.from("extracted_details").insert(rows);
  return rows.length;
}

async function storeCrossReferences(
  supabase: SupabaseClient,
  userId: string,
  interactionId: string,
  extraction: ExtractionResult,
  speakerPersonMap: Map<string, string>
): Promise<number> {
  const rows = extraction.cross_references
    .map((ref) => {
      const sourcePersonId = resolvePersonId(ref.mentioned_by, speakerPersonMap);
      if (!sourcePersonId) return null;
      return {
        user_id: userId,
        source_person_id: sourcePersonId,
        interaction_id: interactionId,
        insight_type: "cross_reference",
        content: `${ref.mentioned_person}: ${ref.context} (${ref.relationship_to_speaker}${ref.actionable ? ", actionable" : ""})`,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (rows.length === 0) return 0;

  await supabase.from("insights").insert(rows);
  return rows.length;
}

async function storeActionItems(
  supabase: SupabaseClient,
  interactionId: string,
  extraction: ExtractionResult,
  speakerPersonMap: Map<string, string>
): Promise<number> {
  const rows = extraction.action_items
    .map((item) => {
      const personId = resolvePersonId(item.owner, speakerPersonMap);
      if (!personId) return null;
      const deadlineStr = item.deadline_mentioned
        ? ` (deadline: ${item.deadline_mentioned})`
        : "";
      return {
        interaction_id: interactionId,
        person_id: personId,
        detail_type: "action_item",
        content: `${item.description}${deadlineStr}`,
        importance_score: item.importance,
        source_quote: null,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (rows.length === 0) return 0;

  await supabase.from("extracted_details").insert(rows);
  return rows.length;
}
