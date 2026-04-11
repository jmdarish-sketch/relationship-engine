import { NextRequest, NextResponse } from "next/server";
import { getAnthropicClient } from "@/lib/ai/client";
import { fetchPersonContext } from "@/lib/api/person-context";

/**
 * POST /api/overview
 * Body: { user_id, person_id }
 * Generates a natural-language overview paragraph about a person.
 */
export async function POST(request: NextRequest) {
  const { person_id } = await request.json();

  if (!person_id) {
    return NextResponse.json(
      { error: "Missing person_id" },
      { status: 400 }
    );
  }

  const ctx = await fetchPersonContext(person_id);
  if (!ctx) {
    return NextResponse.json({ error: "Person not found" }, { status: 404 });
  }

  const userContent = `Person: ${ctx.displayLabel}

Identity: ${JSON.stringify(ctx.person.identity_fingerprint ?? {}, null, 2)}

Profile: ${JSON.stringify(ctx.person.evolving_profile ?? {}, null, 2)}

Extracted details:
${ctx.detailsFormatted || "None yet"}

Cross-references and insights:
${ctx.insightsFormatted || "None yet"}

Last interaction: ${ctx.lastInteractionDate}`;

  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    system: `You are summarizing everything known about a person from the user's conversation history. Write a natural, readable paragraph (3-5 sentences) that captures who this person is, what they're working on, what they care about, any commitments between them and the user, and any notable cross-references to other people. Write in second person ("You promised to send him..."). Be specific and concrete — never generic. If there's not much data, keep it short rather than padding with fluff.`,
    messages: [{ role: "user", content: userContent }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  return NextResponse.json({ overview: text.trim() });
}
