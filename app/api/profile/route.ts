import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api/auth";
import { ok, badRequest, unauthorized } from "@/lib/api/response";
import { callSonnet } from "@/lib/ai/anthropic";
import { profileSummaryPrompt } from "@/lib/ai/prompts";

const schema = z.object({
  full_name: z.string().min(1).optional(),
  school: z.string().nullable().optional(),
  graduation_year: z.number().int().nullable().optional(),
  major: z.string().nullable().optional(),
  current_role: z.string().nullable().optional(),
  career_interests: z.array(z.string()).optional(),
  networking_goals: z.string().nullable().optional(),
  personal_interests: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
});

/**
 * POST /api/profile
 * Update the user's onboarding profile fields and regenerate profile_summary.
 * Writes both the structured profile_data JSON and a freshly regenerated summary.
 */
export async function POST(request: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId(request);
  } catch {
    return unauthorized();
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation failed", parsed.error.flatten());
  }

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { fullName: true },
  });
  if (!existing) return badRequest("User not found");

  const d = parsed.data;
  const fullName = d.full_name ?? existing.fullName;

  const profileData = {
    school: d.school ?? null,
    graduation_year: d.graduation_year ?? null,
    major: d.major ?? null,
    current_role: d.current_role ?? null,
    career_interests: d.career_interests ?? [],
    networking_goals: d.networking_goals ?? null,
    personal_interests: d.personal_interests ?? [],
    skills: d.skills ?? [],
  };

  let profileSummary: string | null = null;
  try {
    const { system, user: userPrompt } = profileSummaryPrompt({
      fullName,
      currentRole: profileData.current_role,
      school: profileData.school,
      major: profileData.major,
      graduationYear: profileData.graduation_year,
      careerInterests: profileData.career_interests,
      networkingGoals: profileData.networking_goals,
      personalInterests: profileData.personal_interests,
      skills: profileData.skills,
    });
    const raw = await callSonnet(system, userPrompt);
    profileSummary = raw.trim() || null;
  } catch (err) {
    console.error("[profile] Summary regeneration failed:", err);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(d.full_name && { fullName: d.full_name }),
      profileData,
      profileSummary,
    },
    omit: { passwordHash: true },
  });

  return ok(updated);
}
