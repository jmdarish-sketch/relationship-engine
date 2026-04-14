import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api/auth";
import { ok, badRequest, unauthorized } from "@/lib/api/response";

// PUT /api/user/settings
const schema = z.object({
  omi_webhook_url: z.string().url().nullable().optional(),
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
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation failed", parsed.error.flatten());
  }

  const d = parsed.data;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(d.omi_webhook_url !== undefined && {
        omiWebhookUrl: d.omi_webhook_url,
      }),
      ...(d.omi_api_key !== undefined && { omiApiKey: d.omi_api_key }),
    },
    select: {
      id: true,
      omiWebhookUrl: true,
      omiApiKey: true,
    },
  });

  return ok(user);
}
