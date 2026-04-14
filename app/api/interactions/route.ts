import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api/auth";
import { ok, badRequest, unauthorized } from "@/lib/api/response";

// GET /api/interactions
export async function GET(request: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId(request);
  } catch {
    return unauthorized();
  }

  const params = request.nextUrl.searchParams;
  const personId = params.get("person_id") ?? undefined;
  const source = params.get("source") ?? undefined;
  const status = params.get("status") ?? undefined;
  const sort = params.get("sort") ?? "date";
  const limit = Math.min(parseInt(params.get("limit") ?? "50"), 100);
  const offset = parseInt(params.get("offset") ?? "0");

  const where = {
    userId,
    ...(source && { source }),
    ...(status && { processingStatus: status }),
    ...(personId && {
      interactionPeople: { some: { personId } },
    }),
  };

  const orderBy =
    sort === "date"
      ? { interactionDate: "desc" as const }
      : { createdAt: "desc" as const };

  const [interactions, total] = await Promise.all([
    prisma.interaction.findMany({
      where,
      orderBy,
      take: limit,
      skip: offset,
      include: {
        interactionPeople: {
          include: {
            person: {
              select: { id: true, displayName: true },
            },
          },
        },
      },
    }),
    prisma.interaction.count({ where }),
  ]);

  // Flatten people onto each interaction
  const data = interactions.map((i) => {
    const { interactionPeople, ...rest } = i;
    return {
      ...rest,
      people: interactionPeople.map((ip) => ({
        id: ip.person.id,
        displayName: ip.person.displayName,
        confidenceScore: ip.confidenceScore,
        speakerLabel: ip.speakerLabel,
      })),
    };
  });

  return ok(data, { total, limit, offset });
}

// POST /api/interactions (manual creation)
const createSchema = z.object({
  transcript: z.string().optional(),
  interaction_date: z.string().datetime(),
  person_ids: z.array(z.string().uuid()).default([]),
  location: z.string().optional(),
  notes: z.string().optional(),
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

  const interaction = await prisma.interaction.create({
    data: {
      userId,
      source: "manual",
      rawTranscript: d.transcript ?? null,
      summary: d.notes ?? null,
      interactionDate: new Date(d.interaction_date),
      location: d.location ?? null,
      processingStatus: "pending",
      interactionPeople: {
        create: d.person_ids.map((personId) => ({
          personId,
        })),
      },
    },
    include: {
      interactionPeople: {
        include: {
          person: { select: { id: true, displayName: true } },
        },
      },
    },
  });

  return ok(interaction);
}
