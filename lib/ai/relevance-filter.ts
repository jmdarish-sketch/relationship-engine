import { getAnthropicClient } from "./client";
import { RELEVANCE_FILTER_PROMPT } from "@/lib/prompts";
import type { RelevanceFilterResult } from "@/lib/types";

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

  // Extract JSON from response (handle potential markdown wrapping)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { is_relevant: false, confidence: 0, reason: "Failed to parse LLM response" };
  }

  return JSON.parse(jsonMatch[0]) as RelevanceFilterResult;
}
