import { getAnthropicClient } from "./client";
import { RELEVANCE_FILTER_PROMPT } from "@/lib/prompts";
import type { RelevanceFilterResult } from "@/lib/types";

const DEFAULT_RESULT: RelevanceFilterResult = {
  is_relevant: false,
  confidence: 0,
  reason: "Failed to parse LLM response",
};

function safeParseJson(raw: string): RelevanceFilterResult | null {
  // Try the raw string first
  try {
    return JSON.parse(raw) as RelevanceFilterResult;
  } catch {
    // ignore
  }

  // Try extracting between first { and last }
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(raw.slice(start, end + 1)) as RelevanceFilterResult;
    } catch {
      // ignore
    }
  }

  return null;
}

/**
 * Lightweight relevance check using Claude Haiku.
 * Returns whether a transcript has relationship/networking value.
 */
export async function filterRelevance(
  transcript: string
): Promise<RelevanceFilterResult> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: `${RELEVANCE_FILTER_PROMPT}\n\nTRANSCRIPT:\n${transcript}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  const result = safeParseJson(text);
  if (!result) {
    console.error("[relevance-filter] Failed to parse response:", text);
    return DEFAULT_RESULT;
  }

  return result;
}
