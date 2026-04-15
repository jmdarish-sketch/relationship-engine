import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api/auth";
import { ok, badRequest, unauthorized } from "@/lib/api/response";

const schema = z.object({
  school: z.string().optional(),
  graduation_year: z.number().int().optional(),
  major: z.string().optional(),
  career_interests: z.array(z.string()).optional(),
  current_role: z.string().optional(),
  networking_goals: z.string().optional(),
  personal_interests: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
});

/**
 * POST /api/user/onboarding
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
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation failed", parsed.error.flatten());
  }

  const d = parsed.data;

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

  const profileParts = [
    d.current_role ? `Current role: ${d.current_role}` : null,
    d.school ? `School: ${d.school}` : null,
    d.major ? `Major: ${d.major}` : null,
    d.career_interests?.length
      ? `Interested in ${d.career_interests.join(", ")}`
      : null,
  ].filter(Boolean);

  const profileSummary = profileParts.length > 0
    ? `${profileParts.join(". ")}.`
    : null;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      profileData,
      profileSummary,
      onboardingCompleted: true,
    },
    omit: { passwordHash: true },
  });

  return ok(user);
}
