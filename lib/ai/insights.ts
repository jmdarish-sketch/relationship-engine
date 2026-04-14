import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { callSonnet, parseStructuredResponse } from "./anthropic";
import { prepBriefPrompt, outreachPrompt } from "./prompts";

// ---------------------------------------------------------------------------
// Fetch shared context for a person
// ---------------------------------------------------------------------------

async function getPersonContext(personId: string, userId: string) {
  const person = await prisma.person.findFirst({
    where: { id: personId, userId },
    select: {
      id: true,
      displayName: true,
      fingerprint: true,
      employer: true,
      school: true,
    },
  });

  if (!person) throw new Error("Person not found");

  const [details, insights, user] = await Promise.all([
    prisma.extractedDetail.findMany({
      where: { personId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { category: true, detailKey: true, detailValue: true },
    }),
    prisma.insight.findMany({
      where: { personId, userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { content: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { profileSummary: true },
    }),
  ]);

  return {
    person,
    details: details.map((d) => ({
      category: d.category,
      key: d.detailKey,
      value: d.detailValue,
    })),
    insights,
    profileSummary: user?.profileSummary ?? null,
  };
}

// ---------------------------------------------------------------------------
// Prep brief
// ---------------------------------------------------------------------------

interface PrepBrief {
  headline: string;
  key_context: string;
  talking_points: { topic: string; opener: string; why: string }[];
  open_loops: { description: string; owner: string; approach: string }[];
  tone_guidance: string;
}

export async function generatePrepBrief(personId: string, userId: string) {
  const ctx = await getPersonContext(personId, userId);

  const { system, user } = prepBriefPrompt(
    ctx.person,
    ctx.details,
    ctx.insights,
    ctx.profileSummary
  );

  const raw = await callSonnet(system, user);
  const parsed = parseStructuredResponse<PrepBrief>(raw);

  const content = parsed
    ? JSON.stringify(parsed)
    : raw;

  const insight = await prisma.insight.create({
    data: {
      userId,
      personId,
      insightType: "prep_brief",
      content,
      metadata: parsed ? (parsed as unknown as Prisma.InputJsonValue) : undefined,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
    },
  });

  return { insight, parsed };
}

// ---------------------------------------------------------------------------
// Outreach suggestion
// ---------------------------------------------------------------------------

interface OutreachResult {
  strategies: {
    channel: string;
    rationale: string;
    subject?: string;
    message: string;
    tone: string;
  }[];
}

export async function generateOutreachSuggestion(
  personId: string,
  userId: string
) {
  const ctx = await getPersonContext(personId, userId);

  const { system, user } = outreachPrompt(
    ctx.person,
    ctx.details,
    ctx.profileSummary
  );

  const raw = await callSonnet(system, user);
  const parsed = parseStructuredResponse<OutreachResult>(raw);

  const content = parsed
    ? JSON.stringify(parsed)
    : raw;

  const insight = await prisma.insight.create({
    data: {
      userId,
      personId,
      insightType: "outreach_suggestion",
      content,
      metadata: parsed ? (parsed as unknown as Prisma.InputJsonValue) : undefined,
    },
  });

  return { insight, parsed };
}

// ---------------------------------------------------------------------------
// Relationship summary
// ---------------------------------------------------------------------------

export async function generateRelationshipSummary(
  personId: string,
  userId: string
) {
  const ctx = await getPersonContext(personId, userId);

  const system = `You are summarizing everything the user knows about a specific person from their conversation history. Write about this person in THIRD PERSON using their name. Use second person ('you') ONLY when referring to the user. Be specific and concrete. 3-5 sentences.`;

  const detailsText = ctx.details
    .map((d) => `[${d.category}/${d.key}] ${d.value}`)
    .join("\n");

  const userPrompt = `${ctx.profileSummary ? `About the user: ${ctx.profileSummary}\n\n` : ""}Person: ${ctx.person.displayName}
Employer: ${ctx.person.employer ?? "Unknown"}
School: ${ctx.person.school ?? "Unknown"}
Fingerprint: ${JSON.stringify(ctx.person.fingerprint)}

Known details:\n${detailsText || "None yet"}`;

  const raw = await callSonnet(system, userPrompt);

  const insight = await prisma.insight.create({
    data: {
      userId,
      personId,
      insightType: "relationship_summary",
      content: raw.trim(),
    },
  });

  return { insight, content: raw.trim() };
}
