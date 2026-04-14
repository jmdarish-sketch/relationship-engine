import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api/auth";
import { ok, unauthorized } from "@/lib/api/response";

// GET /api/disambiguation
export async function GET(request: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId(request);
  } catch {
    return unauthorized();
  }

  const items = await prisma.disambiguationQueue.findMany({
    where: { userId, status: "pending" },
    orderBy: { createdAt: "desc" },
    include: {
      interaction: {
        select: { id: true, interactionDate: true, summary: true },
      },
    },
  });

  // Fetch candidate people details for each item
  const allCandidateIds = [
    ...new Set(items.flatMap((i) => i.candidatePersonIds)),
  ];

  const candidates =
    allCandidateIds.length > 0
      ? await prisma.person.findMany({
          where: { id: { in: allCandidateIds }, userId },
          select: { id: true, displayName: true, fingerprint: true },
        })
      : [];

  const candidateMap = new Map(candidates.map((c) => [c.id, c]));

  const data = items.map((item) => ({
    id: item.id,
    speakerLabel: item.speakerLabel,
    candidatePersonIds: item.candidatePersonIds,
    identitySignalsSnapshot: item.identitySignalsSnapshot,
    status: item.status,
    createdAt: item.createdAt,
    interaction: item.interaction,
    candidatePeople: item.candidatePersonIds
      .map((pid) => candidateMap.get(pid))
      .filter(Boolean),
  }));

  return ok(data);
}
