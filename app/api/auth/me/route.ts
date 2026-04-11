import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const userId =
    request.headers.get("x-user-id") ??
    request.nextUrl.searchParams.get("user_id");

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: user, error } = await supabase
    .from("users")
    .select(
      "id, email, name, school, graduation_year, major, career_interests, user_current_role, networking_goals, personal_interests, skills, onboarding_completed, profile_summary"
    )
    .eq("id", userId)
    .single();

  if (error || !user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}
