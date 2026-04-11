import { NextRequest, NextResponse } from "next/server";
import { getAnthropicClient } from "@/lib/ai/client";
import { fetchPersonContext } from "@/lib/api/person-context";
import { fetchUserProfile } from "@/lib/api/user-profile";

/**
 * POST /api/overview
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

  let userContent = `Person being described: ${ctx.displayLabel}

Known details:
Identity: ${JSON.stringify(ctx.person.identity_fingerprint ?? {}, null, 2)}

Profile: ${JSON.stringify(ctx.person.evolving_profile ?? {}, null, 2)}

Extracted details:
${ctx.detailsFormatted || "None yet"}

Cross-references and insights:
${ctx.insightsFormatted || "None yet"}

Last interaction: ${ctx.lastInteractionDate}`;

  if (userProfile?.profile_summary) {
    userContent = `About the user: ${userProfile.profile_summary}\n\n${userContent}`;
  }

  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    system: `You are summarizing everything the user knows about a specific person from their conversation history. Write about this person in THIRD PERSON using their name. Use second person ('you') ONLY when referring to the user themselves — for example 'You promised to send Zach referrals' or 'Zach asked if you know anyone at Centerview.' The summary should capture: who this person is and what they do, what they're currently working on or dealing with, any commitments between them and the user, and any notable connections to other people in the user's network. Be specific and concrete — never generic. 3-5 sentences. If there's not much data, keep it short rather than padding.`,
    messages: [{ role: "user", content: userContent }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  return NextResponse.json({ overview: text.trim() });
}
