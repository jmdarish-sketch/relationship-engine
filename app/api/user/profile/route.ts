import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api/auth";
import { ok, badRequest, notFound, unauthorized } from "@/lib/api/response";

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
    omit: { passwordHash: true },
  });

  if (!user) return notFound("User not found");

  return ok(user);
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
