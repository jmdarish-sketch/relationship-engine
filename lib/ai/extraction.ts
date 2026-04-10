import { getAnthropicClient } from "./client";
import { EXTRACTION_SYSTEM_PROMPT, EXTRACTION_USER_PROMPT } from "@/lib/prompts";
import type { ExtractionResult } from "@/lib/types";

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

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse extraction response from LLM");
  }

  return JSON.parse(jsonMatch[0]) as ExtractionResult;
}
