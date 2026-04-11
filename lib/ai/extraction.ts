import { getAnthropicClient } from "./client";
import { EXTRACTION_SYSTEM_PROMPT, EXTRACTION_USER_PROMPT } from "@/lib/prompts";
import type { ExtractionResult } from "@/lib/types";

const EMPTY_EXTRACTION: ExtractionResult = {
  is_relevant: false,
  relevance_score: 0,
  speakers: [],
  extracted_details: [],
  cross_references: [],
  action_items: [],
  relational_tone: {
    overall_vibe: "neutral",
    speakers_dynamic: "",
    topics_to_revisit: [],
    topics_to_avoid: [],
  },
};

function safeParseJson(raw: string): ExtractionResult | null {
  // Try the raw string first
  try {
    return JSON.parse(raw) as ExtractionResult;
  } catch {
    // ignore
  }

  // Try extracting between first { and last }
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(raw.slice(start, end + 1)) as ExtractionResult;
    } catch {
      // ignore
    }
  }

  return null;
}

/**
 * Full extraction using Claude Sonnet.
 * Extracts speakers, details, cross-references, action items, and relational tone.
 */
export async function extractFromTranscript(
  transcript: string
): Promise<ExtractionResult> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `${EXTRACTION_USER_PROMPT}${transcript}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  const result = safeParseJson(text);
  if (!result) {
    console.error("[extraction] Failed to parse response:", text);
    return EMPTY_EXTRACTION;
  }

  return result;
}
