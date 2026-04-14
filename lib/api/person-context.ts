import { prisma } from "@/lib/prisma";

/**
 * Fetches all context about a person needed for LLM prompts.
 */
export async function fetchPersonContext(personId: string) {
  const person = await prisma.person.findUnique({
    where: { id: personId },
    select: {
      id: true,
      displayName: true,
      firstName: true,
      lastName: true,
      employer: true,
      school: true,
      fingerprint: true,
      userCurrentRole: true,
    },
  });

  if (!person) return null;

  const [details, insights, interactionLinks] = await Promise.all([
    prisma.extractedDetail.findMany({
      where: { personId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        category: true,
        detailKey: true,
        detailValue: true,
        confidence: true,
      },
    }),
    prisma.insight.findMany({
      where: { personId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { insightType: true, content: true, createdAt: true },
    }),
    prisma.interactionPerson.findMany({
      where: { personId },
      orderBy: { interaction: { interactionDate: "desc" } },
      take: 10,
      include: {
        interaction: {
          select: { interactionDate: true, summary: true },
        },
      },
    }),
  ]);

  const interactions = interactionLinks.map((ip) => ip.interaction);
  const lastInteractionDate =
    interactions[0]?.interactionDate?.toISOString() ?? "No prior interactions";

  const displayLabel =
    person.displayName ??
    ([person.firstName, person.lastName].filter(Boolean).join(" ") ||
      "Unknown");

  const detailsFormatted = details
    .map(
      (d) => `[${d.category}/${d.detailKey}] ${d.detailValue}`
    )
    .join("\n");

  const insightsFormatted = insights
    .map((i) => `[${i.insightType}] ${i.content}`)
    .join("\n");

  return {
    person,
    displayLabel,
    details,
    detailsFormatted,
    insights,
    insightsFormatted,
    interactions,
    lastInteractionDate,
  };
}
