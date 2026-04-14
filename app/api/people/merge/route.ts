import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requireUserId } from "@/lib/api/auth";
import { ok, badRequest, notFound, unauthorized } from "@/lib/api/response";
import { buildDisplayName } from "@/lib/api/fingerprint";

const schema = z.object({
  primaryPersonId: z.string().uuid(),
  secondaryPersonId: z.string().uuid(),
});

/**
 * POST /api/people/merge
 * Merge secondaryPerson into primaryPerson.
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

  const { primaryPersonId, secondaryPersonId } = parsed.data;

  if (primaryPersonId === secondaryPersonId) {
    return badRequest("Cannot merge a person with themselves");
  }

  // Verify both belong to this user
  const [primary, secondary] = await Promise.all([
    prisma.person.findFirst({ where: { id: primaryPersonId, userId } }),
    prisma.person.findFirst({ where: { id: secondaryPersonId, userId } }),
  ]);

  if (!primary) return notFound("Primary person not found");
  if (!secondary) return notFound("Secondary person not found");

  await prisma.$transaction(async (tx) => {
    // Reassign interaction_people
    await tx.interactionPerson.updateMany({
      where: { personId: secondaryPersonId },
      data: { personId: primaryPersonId },
    });

    // Reassign extracted_details
    await tx.extractedDetail.updateMany({
      where: { personId: secondaryPersonId },
      data: { personId: primaryPersonId },
    });

    // Reassign identity_signals
    await tx.identitySignal.updateMany({
      where: { personId: secondaryPersonId },
      data: { personId: primaryPersonId },
    });

    // Reassign insights
    await tx.insight.updateMany({
      where: { personId: secondaryPersonId },
      data: { personId: primaryPersonId },
    });

    // Reassign disambiguation resolved references
    await tx.disambiguationQueue.updateMany({
      where: { resolvedPersonId: secondaryPersonId },
      data: { resolvedPersonId: primaryPersonId },
    });

    // Merge fingerprints — primary wins on conflicts
    const primaryFp =
      (primary.fingerprint as Record<string, unknown>) ?? {};
    const secondaryFp =
      (secondary.fingerprint as Record<string, unknown>) ?? {};
    const mergedFp = { ...secondaryFp, ...primaryFp };

    // Fill in any null fields on primary from secondary
    const mergedFirstName = primary.firstName ?? secondary.firstName;
    const mergedLastName = primary.lastName ?? secondary.lastName;
    const mergedEmployer = primary.employer ?? secondary.employer;
    const mergedSchool = primary.school ?? secondary.school;
    const mergedEmail = primary.email ?? secondary.email;
    const mergedPhone = primary.phone ?? secondary.phone;
    const mergedLinkedin = primary.linkedinUrl ?? secondary.linkedinUrl;
    const mergedRole = primary.userCurrentRole ?? secondary.userCurrentRole;

    const displayName = buildDisplayName({
      firstName: mergedFirstName,
      lastName: mergedLastName,
      employer: mergedEmployer,
      school: mergedSchool,
    });

    // Update primary with merged data
    await tx.person.update({
      where: { id: primaryPersonId },
      data: {
        displayName,
        firstName: mergedFirstName,
        lastName: mergedLastName,
        employer: mergedEmployer,
        school: mergedSchool,
        email: mergedEmail,
        phone: mergedPhone,
        linkedinUrl: mergedLinkedin,
        userCurrentRole: mergedRole,
        fingerprint:
          Object.keys(mergedFp).length > 0
            ? (mergedFp as Prisma.InputJsonValue)
            : Prisma.DbNull,
        notes: [primary.notes, secondary.notes]
          .filter(Boolean)
          .join("\n---\n") || null,
      },
    });

    // Delete secondary
    await tx.person.delete({ where: { id: secondaryPersonId } });
  });

  // Fetch the updated primary
  const merged = await prisma.person.findUnique({
    where: { id: primaryPersonId },
    include: {
      _count: { select: { interactionPeople: true } },
    },
  });

  return ok(merged);
}
