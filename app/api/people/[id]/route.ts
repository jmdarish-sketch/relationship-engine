import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requireUserId } from "@/lib/api/auth";
import { ok, badRequest, notFound, unauthorized } from "@/lib/api/response";
import { buildFingerprint, buildDisplayName } from "@/lib/api/fingerprint";

// GET /api/people/[id]
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

  const person = await prisma.person.findFirst({
    where: { id, userId },
    include: {
      _count: { select: { interactionPeople: true } },
      interactionPeople: {
        take: 20,
        orderBy: { interaction: { interactionDate: "desc" } },
        include: {
          interaction: {
            select: {
              id: true,
              source: true,
              summary: true,
              rawTranscript: true,
              interactionDate: true,
              processingStatus: true,
              location: true,
            },
          },
        },
      },
      extractedDetails: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      identitySignals: {
        orderBy: { confidence: "desc" },
        take: 30,
      },
      insights: {
        where: {
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!person) return notFound("Person not found");

  // Flatten interactions from the join table
  const interactions = person.interactionPeople.map((ip) => ({
    ...ip.interaction,
    confidenceScore: ip.confidenceScore,
    speakerLabel: ip.speakerLabel,
  }));

  const { interactionPeople: _, ...rest } = person;

  return ok({ ...rest, interactions });
}

// PUT /api/people/[id]
const updateSchema = z.object({
  display_name: z.string().min(1).optional(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  employer: z.string().nullable().optional(),
  user_current_role: z.string().nullable().optional(),
  school: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  linkedin_url: z.string().url().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function PUT(
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
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation failed", parsed.error.flatten());
  }

  // Verify ownership
  const existing = await prisma.person.findFirst({
    where: { id, userId },
  });
  if (!existing) return notFound("Person not found");

  const d = parsed.data;

  // Merge updated fields with existing for fingerprint/display_name rebuild
  const merged = {
    firstName: d.first_name !== undefined ? d.first_name : existing.firstName,
    lastName: d.last_name !== undefined ? d.last_name : existing.lastName,
    employer: d.employer !== undefined ? d.employer : existing.employer,
    userCurrentRole:
      d.user_current_role !== undefined
        ? d.user_current_role
        : existing.userCurrentRole,
    school: d.school !== undefined ? d.school : existing.school,
    email: d.email !== undefined ? d.email : existing.email,
  };

  const fingerprint = buildFingerprint(merged);

  // Auto-regenerate display_name if identity fields changed and no explicit override
  const displayName =
    d.display_name ??
    (d.first_name !== undefined ||
    d.last_name !== undefined ||
    d.employer !== undefined ||
    d.school !== undefined
      ? buildDisplayName(merged)
      : undefined);

  const person = await prisma.person.update({
    where: { id },
    data: {
      ...(d.first_name !== undefined && { firstName: d.first_name }),
      ...(d.last_name !== undefined && { lastName: d.last_name }),
      ...(d.employer !== undefined && { employer: d.employer }),
      ...(d.user_current_role !== undefined && {
        userCurrentRole: d.user_current_role,
      }),
      ...(d.school !== undefined && { school: d.school }),
      ...(d.email !== undefined && { email: d.email }),
      ...(d.phone !== undefined && { phone: d.phone }),
      ...(d.linkedin_url !== undefined && { linkedinUrl: d.linkedin_url }),
      ...(d.notes !== undefined && { notes: d.notes }),
      ...(displayName && { displayName }),
      fingerprint: Object.keys(fingerprint).length > 0 ? fingerprint : Prisma.DbNull,
    },
    include: {
      _count: { select: { interactionPeople: true } },
    },
  });

  return ok(person);
}

// DELETE /api/people/[id]  — hard delete with cascade
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

  const existing = await prisma.person.findFirst({
    where: { id, userId },
  });
  if (!existing) return notFound("Person not found");

  await prisma.person.delete({ where: { id } });

  return ok({ deleted: true });
}
