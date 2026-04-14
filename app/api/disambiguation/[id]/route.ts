import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api/auth";
import { ok, notFound, unauthorized } from "@/lib/api/response";

// GET /api/disambiguation/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let userId: string;
  try {
    userId = await requireUserId(request);
  } catch {
    return unauthorized();
  }

  const { id } = await params;

  const item = await prisma.disambiguationQueue.findFirst({
    where: { id, userId },
    include: {
      interaction: {
        select: { id: true, interactionDate: true, summary: true },
      },
    },
  });

  if (!item) return notFound("Disambiguation item not found");

  return ok(item);
}
