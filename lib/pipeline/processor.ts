import { prisma } from "@/lib/prisma";
import { callHaiku, callSonnet, parseStructuredResponse } from "@/lib/ai/anthropic";
import { relevanceFilterPrompt, extractionPrompt } from "@/lib/ai/prompts";
import { resolveSpeakers, type ExtractedSpeaker } from "./speaker-resolver";

// ---------------------------------------------------------------------------
// Types for extraction response
// ---------------------------------------------------------------------------

interface ExtractionResult {
  is_relevant: boolean;
  conversation_summary: string;
  relational_tone: string;
  speakers: ExtractedSpeaker[];
  extracted_details: {
    speaker_label: string;
    category: string;
    key: string;
    value: string;
    confidence: number;
  }[];
  action_items: {
    description: string;
    assignee_label: string;
    deadline: string | null;
  }[];
  cross_references: {
    mentioned_by: string;
    person_name: string;
    context: string;
    relationship: string;
  }[];
}

interface RelevanceResult {
  is_relevant: boolean;
  confidence: number;
  reason: string;
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

/**
 * Process a single interaction through the full pipeline:
 * 1. Relevance filter (Haiku)
 * 2. Extraction (Sonnet)
 * 3. Speaker resolution
 * 4. Storage
 */
export async function processInteraction(interactionId: string) {
  // Fetch interaction + user profile
  const interaction = await prisma.interaction.findUnique({
    where: { id: interactionId },
    include: {
      user: { select: { id: true, profileSummary: true } },
    },
  });

  if (!interaction) {
    throw new Error(`Interaction ${interactionId} not found`);
  }

  const userId = interaction.userId;
  const transcript = interaction.rawTranscript;

  if (!transcript || transcript.trim().length === 0) {
    await markStatus(interactionId, "completed", "No transcript");
    return;
  }

  await markStatus(interactionId, "processing");

  // --- Stage 1: Relevance filter ---
  let relevance: RelevanceResult;
  try {
    const { system, user } = relevanceFilterPrompt(transcript);
    const raw = await callHaiku(system, user);
    relevance = parseStructuredResponse<RelevanceResult>(raw) ?? {
      is_relevant: false,
      confidence: 0,
      reason: "Failed to parse relevance response",
    };
  } catch (err) {
    await markFailed(interactionId, "relevance_filter", err);
    return;
  }

  if (!relevance.is_relevant || relevance.confidence < 0.4) {
    await markStatus(interactionId, "completed", relevance.reason);
    return;
  }

  // --- Stage 2: Extraction ---
  let extraction: ExtractionResult;
  try {
    const { system, user } = extractionPrompt(
      transcript,
      interaction.user.profileSummary
    );
    const raw = await callSonnet(system, user);
    const parsed = parseStructuredResponse<ExtractionResult>(raw);
    if (!parsed) {
      await markFailed(interactionId, "extraction", new Error("JSON parse failed"));
      return;
    }
    extraction = parsed;
  } catch (err) {
    await markFailed(interactionId, "extraction", err);
    return;
  }

  // Extraction can also flag as irrelevant
  if (!extraction.is_relevant) {
    await markStatus(interactionId, "completed", "Extraction deemed irrelevant");
    return;
  }

  // --- Stage 3: Speaker resolution ---
  let resolvedSpeakers;
  try {
    resolvedSpeakers = await resolveSpeakers(
      userId,
      interactionId,
      extraction.speakers
    );
  } catch (err) {
    await markFailed(interactionId, "speaker_resolution", err);
    return;
  }

  // Build speaker_label → personId mapping
  const speakerMap = new Map<string, string>();
  for (const rs of resolvedSpeakers) {
    speakerMap.set(rs.label, rs.personId);
    // Also map by probable name
    const speaker = extraction.speakers.find((s) => s.label === rs.label);
    if (speaker?.probable_name) {
      speakerMap.set(speaker.probable_name.toLowerCase(), rs.personId);
    }
  }

  // --- Stage 4: Storage ---
  try {
    // Store extracted details
    const detailRows = extraction.extracted_details
      .map((d) => {
        const personId = resolvePersonId(d.speaker_label, speakerMap);
        return {
          interactionId,
          personId,
          category: d.category,
          detailKey: d.key,
          detailValue: d.value,
          confidence: d.confidence,
        };
      })
      .filter((r) => r.personId !== null) as {
        interactionId: string;
        personId: string;
        category: string;
        detailKey: string;
        detailValue: string;
        confidence: number;
      }[];

    if (detailRows.length > 0) {
      await prisma.extractedDetail.createMany({ data: detailRows });
    }

    // Store action items as extracted_details with category "action_item"
    const actionRows = extraction.action_items
      .map((a) => {
        const personId = resolvePersonId(a.assignee_label, speakerMap);
        return {
          interactionId,
          personId,
          category: "action_item",
          detailKey: "follow_up",
          detailValue: `${a.description}${a.deadline ? ` (by ${a.deadline})` : ""}`,
          confidence: 0.9,
        };
      })
      .filter((r) => r.personId !== null) as {
        interactionId: string;
        personId: string;
        category: string;
        detailKey: string;
        detailValue: string;
        confidence: number;
      }[];

    if (actionRows.length > 0) {
      await prisma.extractedDetail.createMany({ data: actionRows });
    }

    // Store cross-references as insights
    const crossRefRows = extraction.cross_references
      .map((cr) => {
        const personId = resolvePersonId(cr.mentioned_by, speakerMap);
        if (!personId) return null;
        return {
          userId,
          personId,
          insightType: "cross_reference",
          content: `${cr.person_name}: ${cr.context} (${cr.relationship})`,
        };
      })
      .filter(Boolean) as {
        userId: string;
        personId: string;
        insightType: string;
        content: string;
      }[];

    if (crossRefRows.length > 0) {
      await prisma.insight.createMany({ data: crossRefRows });
    }

    // Update interaction with summary and status
    await prisma.interaction.update({
      where: { id: interactionId },
      data: {
        summary: extraction.conversation_summary,
        processedTranscript: transcript, // Could be enriched later
        processingStatus: "completed",
      },
    });
  } catch (err) {
    await markFailed(interactionId, "storage", err);
    return;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolvePersonId(
  label: string,
  speakerMap: Map<string, string>
): string | null {
  // Try exact match
  const direct = speakerMap.get(label);
  if (direct) return direct;

  // Try lowercase
  const lower = speakerMap.get(label.toLowerCase());
  if (lower) return lower;

  // Try partial match
  for (const [key, id] of speakerMap) {
    if (
      key.toLowerCase().includes(label.toLowerCase()) ||
      label.toLowerCase().includes(key.toLowerCase())
    ) {
      return id;
    }
  }

  return null;
}

async function markStatus(
  interactionId: string,
  status: string,
  summary?: string
) {
  await prisma.interaction.update({
    where: { id: interactionId },
    data: {
      processingStatus: status,
      ...(summary && { summary }),
    },
  });
}

async function markFailed(
  interactionId: string,
  stage: string,
  error: unknown
) {
  const message =
    error instanceof Error ? error.message : String(error);
  console.error(`[pipeline] ${stage} failed for ${interactionId}:`, message);

  await prisma.interaction.update({
    where: { id: interactionId },
    data: {
      processingStatus: "failed",
      summary: `Pipeline failed at ${stage}: ${message}`,
    },
  });
}
