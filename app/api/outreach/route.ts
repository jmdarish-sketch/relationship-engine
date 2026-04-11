import { NextRequest, NextResponse } from "next/server";
import { getAnthropicClient } from "@/lib/ai/client";
import { fetchPersonContext } from "@/lib/api/person-context";
import { fetchUserProfile } from "@/lib/api/user-profile";

/**
 * POST /api/outreach
 * Body: { user_id, person_id }
 */
export async function POST(request: NextRequest) {
  const { user_id, person_id } = await request.json();

  if (!person_id) {
    return NextResponse.json(
      { error: "Missing person_id" },
      { status: 400 }
    );
  }

  const [ctx, userProfile] = await Promise.all([
    fetchPersonContext(person_id),
    user_id ? fetchUserProfile(user_id) : Promise.resolve(null),
  ]);

  if (!ctx) {
    return NextResponse.json({ error: "Person not found" }, { status: 404 });
  }

  // Build user context section
  let userContextBlock = "";
  if (userProfile) {
    const parts = [
      userProfile.profile_summary
        ? `About the user: ${userProfile.profile_summary}`
        : null,
      (userProfile.personal_interests as string[])?.length
        ? `User's interests: ${(userProfile.personal_interests as string[]).join(", ")}`
        : null,
      (userProfile.skills as string[])?.length
        ? `User's skills: ${(userProfile.skills as string[]).join(", ")}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");
    if (parts) userContextBlock = parts + "\n\n";
  }

  const userContent = `${userContextBlock}Person: ${ctx.displayLabel}
Relationship strength: ${ctx.person.relationship_strength ?? "unknown"}
Last interaction: ${ctx.lastInteractionDate}

Identity: ${JSON.stringify(ctx.person.identity_fingerprint ?? {}, null, 2)}

Profile: ${JSON.stringify(ctx.person.evolving_profile ?? {}, null, 2)}

Extracted details:
${ctx.detailsFormatted || "None yet"}

Cross-references and insights:
${ctx.insightsFormatted || "None yet"}

Return JSON with this exact structure:
{
  "strategies": [
    {
      "channel": "linkedin" | "text" | "email",
      "rationale": "why this approach and timing",
      "subject": "email subject line, only for email channel, omit for others",
      "message": "the ready-to-send message",
      "tone": "warm" | "professional" | "casual"
    }
  ]
}`;

  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: `You are a networking strategist helping the user maintain and deepen a professional relationship. Based on what's known about this person and the user's history with them, suggest 3 outreach strategies across different channels. For each strategy, provide: the channel (LinkedIn message, text message, or email), why this channel and timing makes sense, and a ready-to-send sample message. The sample messages should be natural, not salesy or over-eager. They should reference specific things from past conversations to show the user was paying attention. Keep messages short — LinkedIn messages under 100 words, texts under 50 words, emails under 150 words with a subject line. If there are open commitments or follow-ups the user owes this person, prioritize those. If there's cross-conversation intel that could be valuable to share, weave it in naturally.`,
    messages: [{ role: "user", content: userContent }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) {
    return NextResponse.json(
      { error: "Failed to parse outreach response" },
      { status: 500 }
    );
  }

  try {
    const result = JSON.parse(text.slice(start, end + 1));
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to parse outreach response" },
      { status: 500 }
    );
  }
}
