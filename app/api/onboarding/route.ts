import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropicClient } from "@/lib/ai/client";

export async function POST(request: NextRequest) {
  const {
    user_id,
    school,
    graduation_year,
    major,
    career_interests,
    user_current_role,
    networking_goals,
    personal_interests,
    skills,
  } = await request.json();

  if (!user_id) {
    return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Fetch user name for the profile summary
  const { data: existingUser } = await supabase
    .from("users")
    .select("name")
    .eq("id", user_id)
    .single();

  // Generate profile summary with Claude
  const profileInput = [
    existingUser?.name ? `Name: ${existingUser.name}` : null,
    user_current_role ? `Current role: ${user_current_role}` : null,
    school ? `School: ${school}` : null,
    graduation_year ? `Graduation year: ${graduation_year}` : null,
    major ? `Major: ${major}` : null,
    career_interests?.length
      ? `Career interests: ${career_interests.join(", ")}`
      : null,
    networking_goals ? `Networking goals: ${networking_goals}` : null,
    personal_interests?.length
      ? `Personal interests: ${personal_interests.join(", ")}`
      : null,
    skills?.length ? `Skills: ${skills.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  let profile_summary: string | null = null;

  try {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 256,
      system:
        "Summarize this person's professional profile in 2-3 sentences. Include their current situation, career goals, and key interests. This summary will be used as context when generating networking recommendations and outreach messages for them. Write in third person.",
      messages: [{ role: "user", content: profileInput }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    profile_summary = text.trim() || null;
  } catch (err) {
    console.error("[onboarding] Failed to generate profile summary:", err);
  }

  // Update user record
  const { data: user, error } = await supabase
    .from("users")
    .update({
      school,
      graduation_year,
      major,
      career_interests: career_interests ?? [],
      user_current_role,
      networking_goals,
      personal_interests: personal_interests ?? [],
      skills: skills ?? [],
      onboarding_completed: true,
      profile_summary,
    })
    .eq("id", user_id)
    .select(
      "id, email, name, school, graduation_year, major, career_interests, user_current_role, networking_goals, personal_interests, skills, onboarding_completed, profile_summary"
    )
    .single();

  if (error || !user) {
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }

  return NextResponse.json({ user });
}
