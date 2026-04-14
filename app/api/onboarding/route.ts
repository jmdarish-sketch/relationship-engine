import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api/auth";
import { ok, badRequest, unauthorized } from "@/lib/api/response";
import { callSonnet } from "@/lib/ai/anthropic";
import { profileSummaryPrompt } from "@/lib/ai/prompts";

/**
 * POST /api/onboarding
 * Save onboarding data and generate profile summary.
 */
export async function POST(request: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId(request);
  } catch {
    return unauthorized();
  }

  const body = await request.json();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fullName: true },
  });

  if (!user) return badRequest("User not found");

  // Generate profile summary with Claude
  let profileSummary: string | null = null;
  try {
    const { system, user: userPrompt } = profileSummaryPrompt({
      fullName: user.fullName,
      currentRole: body.current_role,
      school: body.school,
      major: body.major,
      graduationYear: body.graduation_year,
      careerInterests: body.career_interests,
      skills: body.skills,
    });

    const raw = await callSonnet(system, userPrompt);
    profileSummary = raw.trim() || null;
  } catch (err) {
    console.error("[onboarding] Profile summary generation failed:", err);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      profileSummary,
      onboardingCompleted: true,
    },
    omit: { passwordHash: true },
  });

  return ok(updated);
}
