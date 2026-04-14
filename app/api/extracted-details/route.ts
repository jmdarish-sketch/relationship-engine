import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api/auth";
import { ok, badRequest, unauthorized } from "@/lib/api/response";

// GET /api/extracted-details?person_id=&interaction_id=&category=
export async function GET(request: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId(request);
  } catch {
    return unauthorized();
  }

  const params = request.nextUrl.searchParams;
  const personId = params.get("person_id") ?? undefined;
  const interactionId = params.get("interaction_id") ?? undefined;
  const category = params.get("category") ?? undefined;

  const details = await prisma.extractedDetail.findMany({
    where: {
      interaction: { userId },
      ...(personId && { personId }),
      ...(interactionId && { interactionId }),
      ...(category && { category }),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return ok(details);
}

// POST /api/extracted-details
const createSchema = z.object({
  person_id: z.string().uuid(),
  interaction_id: z.string().uuid().optional(),
  category: z.string().min(1),
  detail_key: z.string().min(1),
  detail_value: z.string().min(1),
  confidence: z.number().min(0).max(1).optional(),
});

export async function POST(request: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId(request);
  } catch {
    return unauthorized();
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation failed", parsed.error.flatten());
  }

  const d = parsed.data;

  // Verify person belongs to user
  const person = await prisma.person.findFirst({
    where: { id: d.person_id, userId },
  });
  if (!person) {
    return badRequest("Person not found or does not belong to you");
  }

  // If interaction_id provided, verify it belongs to user
  let interactionId = d.interaction_id;
  if (interactionId) {
    const interaction = await prisma.interaction.findFirst({
      where: { id: interactionId, userId },
    });
    if (!interaction) {
      return badRequest("Interaction not found");
    }
  } else {
    // Create a placeholder manual interaction for manual details
    const interaction = await prisma.interaction.create({
      data: {
        userId,
        source: "manual",
        interactionDate: new Date(),
        processingStatus: "completed",
      },
    });
    interactionId = interaction.id;
  }

  const detail = await prisma.extractedDetail.create({
    data: {
      interactionId,
      personId: d.person_id,
      category: d.category,
      detailKey: d.detail_key,
      detailValue: d.detail_value,
      confidence: d.confidence ?? null,
    },
  });

  return ok(detail);
}
