import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Fetches user profile fields needed for prompt context.
 */
export async function fetchUserProfile(userId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("users")
    .select(
      "id, name, profile_summary, personal_interests, skills, career_interests, user_current_role"
    )
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  return data;
}
