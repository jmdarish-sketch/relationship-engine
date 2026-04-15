import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api/auth";
import { ok, badRequest, notFound, unauthorized } from "@/lib/api/response";

function maskKey(key: string | null): string | null {
  if (!key) return null;
  if (key.length <= 4) return "•".repeat(key.length);
  return "•".repeat(Math.max(8, key.length - 4)) + key.slice(-4);
}

// GET /api/user/profile
export async function GET(request: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId(request);
  } catch {
    return unauthorized();
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      profileData: true,
      profileSummary: true,
      onboardingCompleted: true,
      omiApiKey: true,
      createdAt: true,
    },
  });

  if (!user) return notFound("User not found");

  return ok({
    id: user.id,
    email: user.email,
    full_name: user.fullName,
    profile_data: user.profileData,
    profile_summary: user.profileSummary,
    onboarding_completed: user.onboardingCompleted,
    omi_api_key: user.omiApiKey,
    omi_api_key_masked: maskKey(user.omiApiKey),
    omi_api_key_has_value: !!user.omiApiKey,
    created_at: user.createdAt,
  });
}

// PUT /api/user/profile
const updateSchema = z.object({
  full_name: z.string().min(1).optional(),
  profile_summary: z.string().nullable().optional(),
  omi_api_key: z.string().nullable().optional(),
});

export async function PUT(request: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId(request);
  } catch {
    return unauthorized();
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation failed", parsed.error.flatten());
  }

  const d = parsed.data;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(d.full_name && { fullName: d.full_name }),
      ...(d.profile_summary !== undefined && {
        profileSummary: d.profile_summary,
      }),
      ...(d.omi_api_key !== undefined && { omiApiKey: d.omi_api_key }),
    },
    omit: { passwordHash: true },
  });

  return ok(user);
}
