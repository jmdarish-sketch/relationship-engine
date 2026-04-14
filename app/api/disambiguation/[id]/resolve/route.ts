import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api/auth";
import { ok, badRequest, notFound, unauthorized } from "@/lib/api/response";
import { buildFingerprint, buildDisplayName } from "@/lib/api/fingerprint";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("resolve"),
    resolved_person_id: z.string().uuid(),
  }),
  z.object({
    action: z.literal("create_new"),
    person_data: z.object({
      first_name: z.string().optional(),
      last_name: z.string().optional(),
      employer: z.string().optional(),
      school: z.string().optional(),
      display_name: z.string().optional(),
    }),
  }),
  z.object({
    action: z.literal("skip"),
  }),
]);

/**
 * POST /api/disambiguation/[id]/resolve
 */
export async function POST(
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
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation failed", parsed.error.flatten());
  }

  const item = await prisma.disambiguationQueue.findFirst({
    where: { id, userId, status: "pending" },
  });
  if (!item) return notFound("Disambiguation item not found or already resolved");

  const action = parsed.data;

  if (action.action === "skip") {
    await prisma.disambiguationQueue.update({
      where: { id },
      data: { status: "skipped", resolvedAt: new Date() },
    });
    return ok({ status: "skipped" });
  }

  let resolvedPersonId: string;

  if (action.action === "resolve") {
    const person = await prisma.person.findFirst({
      where: { id: action.resolved_person_id, userId },
    });
    if (!person) return notFound("Resolved person not found");
    resolvedPersonId = person.id;
  } else {
    const pd = action.person_data;
    const fingerprint = buildFingerprint({
      firstName: pd.first_name,
      lastName: pd.last_name,
      employer: pd.employer,
      school: pd.school,
    });
    const displayName =
      pd.display_name ??
      buildDisplayName({
        firstName: pd.first_name,
        lastName: pd.last_name,
        employer: pd.employer,
        school: pd.school,
      });

    const newPerson = await prisma.person.create({
      data: {
        userId,
        displayName,
        firstName: pd.first_name ?? null,
        lastName: pd.last_name ?? null,
        employer: pd.employer ?? null,
        school: pd.school ?? null,
        fingerprint: Object.keys(fingerprint).length > 0 ? fingerprint : undefined,
      },
    });
    resolvedPersonId = newPerson.id;
  }

  if (item.candidatePersonIds.length > 0) {
    await prisma.interactionPerson.updateMany({
      where: {
        interactionId: item.interactionId,
        personId: { in: item.candidatePersonIds },
      },
      data: { personId: resolvedPersonId, confidenceScore: 1.0 },
    });
  } else {
    await prisma.interactionPerson.create({
      data: {
        interactionId: item.interactionId,
        personId: resolvedPersonId,
        confidenceScore: 1.0,
        speakerLabel: item.speakerLabel,
      },
    });
  }

  await prisma.disambiguationQueue.update({
    where: { id },
    data: {
      status: "resolved",
      resolvedPersonId,
      resolvedAt: new Date(),
    },
  });

  return ok({ status: "resolved", resolvedPersonId });
}