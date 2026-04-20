import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { callSonnet, parseStructuredResponse } from "./anthropic";
import { prepBriefPrompt, outreachPrompt } from "./prompts";

// ---------------------------------------------------------------------------
// Fetch shared context for a person (enriched for prep briefs)
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
      userCurrentRole: true,
      firstName: true,
      lastName: true,
    },
  });

  if (!person) throw new Error("Person not found");

  const [details, interactions, insights, user] = await Promise.all([
    prisma.extractedDetail.findMany({
      where: { personId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        category: true,
        detailKey: true,
        detailValue: true,
        confidence: true,
        createdAt: true,
      },
    }),
    prisma.interaction.findMany({
      where: {
        interactionPeople: { some: { personId } },
        processingStatus: "completed",
      },
      orderBy: { interactionDate: "desc" },
      take: 20,
      select: {
        id: true,
        summary: true,
        interactionDate: true,
        source: true,
        rawTranscript: true,
      },
    }),
    prisma.insight.findMany({
      where: { personId, userId, insightType: { not: "prep_brief" } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { insightType: true, content: true, createdAt: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { profileSummary: true, fullName: true, profileData: true },
    }),
  ]);

  return {
    person,
    details: details.map((d) => ({
      category: d.category,
      key: d.detailKey,
      value: d.detailValue,
      confidence: d.confidence,
      createdAt: d.createdAt,
    })),
    interactions: interactions.map((i) => ({
      id: i.id,
      summary: i.summary,
      date: i.interactionDate,
      source: i.source,
      transcript: i.rawTranscript,
    })),
    insights,
    profileSummary: user?.profileSummary ?? null,
    profileData: (user?.profileData as Record<string, unknown> | null) ?? null,
    userName: user?.fullName ?? null,
  };
}

// ---------------------------------------------------------------------------
// Prep brief
// ---------------------------------------------------------------------------

export interface PrepBrief {
  meeting_purpose: string;
  since_last_contact: {
    time_since_last_interaction: string;
    whats_new_for_them: string[];
  };
  what_they_know_about_you: string[];
  open_loops: Array<{
    thread: string;
    status: "user_owes" | "they_owe" | "mutual" | "dormant";
    age: string;
    suggested_move: string;
  }>;
  conversation_hooks: Array<{
    hook: string;
    grounded_in: string;
    why_it_lands: string;
  }>;
  watch_outs: string[];
  the_ask: {
    has_ask: boolean;
    what_you_want: string | null;
    how_to_raise_it: string | null;
  } | null;
}

export async function generatePrepBrief(personId: string, userId: string) {
  const ctx = await getPersonContext(personId, userId);

  const { system, user } = prepBriefPrompt(
    ctx.person,
    ctx.details,
    ctx.interactions,
    ctx.insights,
    ctx.profileSummary,
    ctx.profileData,
    ctx.userName
  );

  const raw = await callSonnet(system, user);
  const parsed = parseStructuredResponse<PrepBrief>(raw);

  const content = parsed ? JSON.stringify(parsed) : raw;

  await prisma.insight.deleteMany({
    where: { personId, userId, insightType: "prep_brief" },
  });

  const insight = await prisma.insight.create({
    data: {
      userId,
      personId,
      insightType: "prep_brief",
      content,
      metadata: parsed ? (parsed as unknown as Prisma.InputJsonValue) : undefined,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  return { insight, parsed };
}

// ---------------------------------------------------------------------------
// Outreach suggestion
// ---------------------------------------------------------------------------

export interface OutreachStrategy {
  id: string;
  name: string;
  one_liner: string;
  channel: "email" | "linkedin" | "text" | "whatsapp";
  tone: "casual" | "professional" | "warm";
  message: { subject: string | null; body: string };
  why_this_works: string;
  grounded_in: string[];
}

export interface OutreachDraft {
  strategies: OutreachStrategy[];
  context_note: string | null;
}

export async function generateOutreachSuggestion(
  personId: string,
  userId: string
) {
  const ctx = await getPersonContext(personId, userId);

  const { system, user } = outreachPrompt(
    ctx.person,
    ctx.details,
    ctx.interactions,
    ctx.insights,
    ctx.profileSummary,
    ctx.profileData,
    ctx.userName
  );

  const raw = await callSonnet(system, user);
  const parsed = parseStructuredResponse<OutreachDraft>(raw);

  const content = parsed ? JSON.stringify(parsed) : raw;

  await prisma.insight.deleteMany({
    where: { personId, userId, insightType: "outreach_suggestion" },
  });

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
