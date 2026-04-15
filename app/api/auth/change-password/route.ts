import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api/auth";
import { ok, badRequest, unauthorized } from "@/lib/api/response";
import { hashPassword, verifyPassword } from "@/lib/auth";

const schema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8, "New password must be at least 8 characters"),
});

/**
 * POST /api/auth/change-password
 * Verify current password, then hash and store a new one.
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

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) return badRequest("User not found");

  const matches = await verifyPassword(parsed.data.current_password, user.passwordHash);
  if (!matches) return badRequest("Current password is incorrect");

  const passwordHash = await hashPassword(parsed.data.new_password);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  return ok({ success: true });
}
