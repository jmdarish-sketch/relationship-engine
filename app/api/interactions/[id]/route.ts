import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api/auth";
import { ok, notFound, unauthorized } from "@/lib/api/response";

// GET /api/interactions/[id]
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

  const interaction = await prisma.interaction.findFirst({
    where: { id, userId },
    include: {
      interactionPeople: {
        include: {
          person: { select: { id: true, displayName: true } },
        },
      },
      extractedDetails: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!interaction) return notFound("Interaction not found");

  const { interactionPeople, ...rest } = interaction;

  return ok({
    ...rest,
    people: interactionPeople.map((ip) => ({
      id: ip.person.id,
      displayName: ip.person.displayName,
      confidenceScore: ip.confidenceScore,
      speakerLabel: ip.speakerLabel,
    })),
  });
}

// DELETE /api/interactions/[id]
export async function DELETE(
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

  const existing = await prisma.interaction.findFirst({
    where: { id, userId },
  });
  if (!existing) return notFound("Interaction not found");

  await prisma.interaction.delete({ where: { id } });

  return ok({ deleted: true });
}
